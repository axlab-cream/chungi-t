import { randomUUID } from 'node:crypto'
import { mkdir, open, readFile, readdir, rename, rm, stat } from 'node:fs/promises'
import { isAbsolute, join, resolve } from 'node:path'
import type { ReportRecord } from './report-store.js'

export interface FileReportStorageOptions {
  directory: string
  lockTimeoutMs?: number
  retryMs?: number
  staleLockMs?: number
}

function storageError(code: string): Error & { code: string } {
  return Object.assign(new Error(code), { code })
}

function errorCode(error: unknown): string | undefined {
  return error && typeof error === 'object' && 'code' in error ? String(error.code) : undefined
}

function assertId(id: string): void {
  if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,160}$/.test(id)) throw storageError('FILE_REPORT_INVALID_ID')
}

function clean(record: ReportRecord): ReportRecord {
  const value = JSON.parse(JSON.stringify(record)) as ReportRecord
  if (value.owner) delete value.owner.accessToken
  return value
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b))
    return `{${entries.map(([name, item]) => `${JSON.stringify(name)}:${stable(item)}`).join(',')}}`
  }
  return JSON.stringify(value) ?? 'undefined'
}

function retainsSnapshot(current: ReportRecord, next: ReportRecord): boolean {
  if (current.resultId !== next.resultId || current.report.publicId !== next.report.publicId || current.owner?.id !== next.owner?.id) return false
  if (stable(current.birth) !== stable(next.birth) || stable(current.context) !== stable(next.context)) return false
  if (current.status === 'complete' && (next.status !== 'complete' || stable(current.report) !== stable(next.report) || stable(current.auxiliary) !== stable(next.auxiliary))) return false
  return current.report.sections.every(section => section.status !== 'complete'
    || stable(section) === stable(next.report.sections.find(item => item.id === section.id)))
}

/**
 * Optional LOCAL durable storage. The caller must disable this backend in production.
 * All writes use per-ID mkdir locks plus temp-file/fsync/rename atomic replacement.
 * Stale/crashed locks FAIL CLOSED: they are never automatically deleted or stolen.
 * After confirming all writers have exited, an operator may remove that one .lock
 * directory. Automatic stale unlink would race a newly acquired process lock.
 * Readers ignore .tmp files and see either the previous or the next complete JSON.
 */
export class FileReportStorage {
  readonly directory: string
  private readonly recordsDirectory: string
  private readonly locksDirectory: string
  private readonly lockTimeoutMs: number
  private readonly retryMs: number
  private readonly staleLockMs: number

  constructor(options: string | FileReportStorageOptions) {
    const config = typeof options === 'string' ? { directory: options } : options
    if (!config.directory?.trim() || !isAbsolute(config.directory)) throw storageError('FILE_REPORT_ABSOLUTE_DIRECTORY_REQUIRED')
    this.directory = resolve(config.directory)
    this.recordsDirectory = join(this.directory, 'records')
    this.locksDirectory = join(this.directory, 'locks')
    this.lockTimeoutMs = Math.max(1, config.lockTimeoutMs ?? 4_000)
    this.retryMs = Math.max(1, config.retryMs ?? 20)
    this.staleLockMs = Math.max(1, config.staleLockMs ?? 30_000)
  }

  private async prepare(): Promise<void> {
    await mkdir(this.recordsDirectory, { recursive: true, mode: 0o700 })
    await mkdir(this.locksDirectory, { recursive: true, mode: 0o700 })
  }

  private recordPath(id: string): string {
    assertId(id)
    return join(this.recordsDirectory, `${id}.json`)
  }

  async read(id: string): Promise<ReportRecord | null> {
    const filename = this.recordPath(id)
    let text: string
    try { text = await readFile(filename, 'utf8') } catch (error) {
      if (errorCode(error) === 'ENOENT') return null
      throw error
    }
    let record: ReportRecord
    try { record = JSON.parse(text) as ReportRecord } catch { throw storageError('FILE_REPORT_CORRUPT_RECORD') }
    if (record?.reportId !== id || !record.report || !Array.isArray(record.report.sections)) throw storageError('FILE_REPORT_CORRUPT_RECORD')
    return clean(record)
  }

  async list(): Promise<ReportRecord[]> {
    let names: string[]
    try { names = await readdir(this.recordsDirectory) } catch (error) {
      if (errorCode(error) === 'ENOENT') return []
      throw error
    }
    const records: ReportRecord[] = []
    for (const name of names.sort()) {
      if (!/^[a-zA-Z0-9_-]{1,160}\.json$/.test(name)) continue
      const record = await this.read(name.slice(0, -5))
      if (record) records.push(record)
    }
    return records
  }

  private async staleLock(lock: string): Promise<boolean> {
    try {
      const info = await stat(lock)
      if (Date.now() - info.mtimeMs < this.staleLockMs) return false
      let owner: { pid?: number }
      try { owner = JSON.parse(await readFile(join(lock, 'owner.json'), 'utf8')) } catch { return true }
      if (!Number.isInteger(owner.pid) || Number(owner.pid) <= 0) return true
      try { process.kill(Number(owner.pid), 0); return false } catch (error) { return errorCode(error) === 'ESRCH' }
    } catch (error) {
      if (errorCode(error) === 'ENOENT') return false
      throw error
    }
  }

  private async locked<T>(id: string, change: () => Promise<T>): Promise<T> {
    assertId(id)
    await this.prepare()
    const lock = join(this.locksDirectory, `${id}.lock`)
    const token = randomUUID()
    const deadline = Date.now() + this.lockTimeoutMs
    for (;;) {
      try { await mkdir(lock, { mode: 0o700 }); break } catch (error) {
        if (errorCode(error) !== 'EEXIST') throw error
        if (await this.staleLock(lock)) throw storageError('FILE_REPORT_LOCK_STALE')
        if (Date.now() >= deadline) throw storageError('FILE_REPORT_LOCK_TIMEOUT')
        await new Promise(resolve => setTimeout(resolve, Math.min(this.retryMs, Math.max(1, deadline - Date.now()))))
      }
    }
    try {
      await this.writeExclusive(join(lock, 'owner.json'), JSON.stringify({ token, pid: process.pid, startedAt: new Date().toISOString() }))
      return await change()
    } finally {
      // The lock was created by this invocation; a token prevents deleting a lock
      // replaced manually by an operator while this invocation was running.
      let owned = false
      try { owned = JSON.parse(await readFile(join(lock, 'owner.json'), 'utf8')).token === token } catch { /* fail closed */ }
      if (owned) await rm(lock, { recursive: true, force: true })
    }
  }

  private async writeExclusive(filename: string, text: string): Promise<void> {
    const handle = await open(filename, 'wx', 0o600)
    try { await handle.writeFile(text, 'utf8'); await handle.sync() } finally { await handle.close() }
  }

  private async atomicWrite(record: ReportRecord): Promise<void> {
    const target = this.recordPath(record.reportId)
    const temporary = join(this.recordsDirectory, `.${record.reportId}.${randomUUID()}.tmp`)
    try {
      await this.writeExclusive(temporary, `${JSON.stringify(clean(record))}\n`)
      await rename(temporary, target)
    } finally {
      await rm(temporary, { force: true })
    }
  }

  async insert(record: ReportRecord): Promise<ReportRecord> {
    return this.locked(record.reportId, async () => {
      const existing = await this.read(record.reportId)
      if (existing) return existing
      const saved = clean({ ...record, revision: record.revision ?? 0 })
      await this.atomicWrite(saved)
      return clean(saved)
    })
  }

  async compareAndSwap(record: ReportRecord, expectedRevision: number | undefined): Promise<boolean> {
    return this.locked(record.reportId, async () => {
      const current = await this.read(record.reportId)
      const expected = expectedRevision ?? 0
      if (!current || (current.revision ?? 0) !== expected || record.revision !== expected + 1) return false
      const next = clean(record)
      if (!retainsSnapshot(current, next)) return false
      await this.atomicWrite(next)
      return true
    })
  }

  async delete(id: string): Promise<boolean> {
    return this.locked(id, async () => {
      try { await rm(this.recordPath(id)); return true } catch (error) {
        if (errorCode(error) === 'ENOENT') return false
        throw error
      }
    })
  }
}
