import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, readFile, readdir, rm, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { after, before, describe, it } from 'node:test'
import { FileReportStorage } from '../../src/report/file-report-storage.js'
import type { ReportRecord } from '../../src/report/report-store.js'

let directory: string
const fixture = (id: string = randomUUID()): ReportRecord => ({
  reportId: id, resultId: `result-${id}`, revision: 0,
  birth: { year: 1994, month: 3, day: 11, hour: 9, gender: 'female', calendar: 'solar' },
  context: { serviceKey: 'local-fixture', concern: '실고객 정보가 없는 합성 기록' },
  owner: { id: 'synthetic-owner', accessToken: 'TOKEN_MUST_NOT_BE_PERSISTED' },
  report: { publicId: `result-${id}`, title: '합성 해석', subtitle: '', generatedBy: 'template', model: 'fixture', status: 'pending', sections: [{
    id: 'section', generationId: `section-${id}`, order: 1, imageKey: '', imageSrc: '', imageAlt: '', category: '장', categoryEn: 'Chapter', classification: '항목', hook: '핵심', patternKeys: [], ragTopics: [], interpretation: 'FIRST_SNAPSHOT', status: 'pending',
  }] },
  status: 'pending', createdAt: '2026-09-07T00:00:00.000Z', updatedAt: '2026-09-07T00:00:00.000Z',
})
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

before(async () => { directory = await mkdtemp(join(tmpdir(), 'umsh-file-report-test-')) })
after(async () => {
  const absolute = resolve(directory)
  assert.ok(absolute.startsWith(resolve(tmpdir()) + '\\') || absolute.startsWith(resolve(tmpdir()) + '/'))
  assert.ok(absolute.includes('umsh-file-report-test-'))
  await rm(absolute, { recursive: true, force: true })
})

async function child(operation: 'insert' | 'read' | 'cas', record: ReportRecord): Promise<any> {
  const moduleUrl = new URL('../../src/report/file-report-storage.ts', import.meta.url).href
  const script = `import {FileReportStorage} from ${JSON.stringify(moduleUrl)};
const store=new FileReportStorage(process.argv[1]);const record=JSON.parse(process.argv[2]);
const result=${operation === 'insert' ? 'await store.insert(record)' : operation === 'read' ? 'await store.read(record.reportId)' : 'await store.compareAndSwap(record,0)'};
process.stdout.write(JSON.stringify(result));`
  return new Promise((resolveResult, reject) => {
    const processChild = spawn(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script, directory, JSON.stringify(record)], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    let output = '', error = ''
    processChild.stdout.on('data', chunk => { output += String(chunk) })
    processChild.stderr.on('data', chunk => { error += String(chunk) })
    processChild.once('error', reject)
    processChild.once('exit', code => {
      if (code !== 0) reject(new Error(`Local fixture child exited ${code}: ${error}`))
      else { try { resolveResult(JSON.parse(output)) } catch (failure) { reject(failure) } }
    })
  })
}

describe('optional durable local report storage', { concurrency: false }, () => {
  it('persists a record through a writer process exit and reader process restart', async () => {
    const record = fixture()
    const inserted = await child('insert', record)
    const loaded = await child('read', record)
    assert.deepEqual(loaded, inserted)
    assert.equal(loaded.report.sections[0].interpretation, 'FIRST_SNAPSHOT')
    assert.equal(loaded.owner.accessToken, undefined)
    assert.doesNotMatch(await readFile(join(directory, 'records', `${record.reportId}.json`), 'utf8'), /TOKEN_MUST_NOT_BE_PERSISTED/)
  })

  it('concurrent process inserts keep the first complete snapshot', async () => {
    const first = fixture()
    const second = clone(first)
    second.report.sections[0].interpretation = 'SECOND_CANDIDATE'
    const results = await Promise.all([child('insert', first), child('insert', second)])
    assert.deepEqual(results[0], results[1])
    assert.ok(['FIRST_SNAPSHOT', 'SECOND_CANDIDATE'].includes(results[0].report.sections[0].interpretation))
    const fresh = new FileReportStorage(directory)
    assert.deepEqual(await fresh.read(first.reportId), results[0])
  })

  it('cross-process CAS allows exactly one writer with the expected revision', async () => {
    const storage = new FileReportStorage(directory)
    const record = await storage.insert(fixture())
    const first = clone(record), second = clone(record)
    first.revision = second.revision = 1
    first.report.sections[0].interpretation = 'CAS_A'
    second.report.sections[0].interpretation = 'CAS_B'
    const results = await Promise.all([child('cas', first), child('cas', second)])
    assert.equal(results.filter(Boolean).length, 1)
    const saved = await storage.read(record.reportId)
    assert.equal(saved?.revision, 1)
    assert.ok(['CAS_A', 'CAS_B'].includes(saved!.report.sections[0].interpretation))
    assert.equal(await storage.compareAndSwap(first, 0), false)
    const files = await readdir(join(directory, 'records'))
    assert.ok(files.every(name => !name.endsWith('.tmp')))
  })

  it('never changes a completed interpretation but permits independent chat metadata', async () => {
    const storage = new FileReportStorage(directory)
    const record = fixture()
    record.status = record.report.status = record.report.sections[0].status = 'complete'
    const saved = await storage.insert(record)
    const changed = clone(saved)
    changed.revision = 1
    changed.report.sections[0].interpretation = 'FORBIDDEN_OVERWRITE'
    assert.equal(await storage.compareAndSwap(changed, 0), false)
    const metadata = clone(saved)
    metadata.revision = 1
    metadata.chatHistory = [{ role: 'user', content: '합성 상담 이력' }]
    assert.equal(await storage.compareAndSwap(metadata, 0), true)
    assert.equal((await storage.read(record.reportId))?.report.sections[0].interpretation, 'FIRST_SNAPSHOT')
  })

  it('rejects path traversal and invalid directories before filesystem mutation', async () => {
    assert.throws(() => new FileReportStorage('relative-directory'), /ABSOLUTE_DIRECTORY_REQUIRED/)
    const storage = new FileReportStorage(directory)
    for (const id of ['../escape', '..\\escape', '/absolute', 'a/b', 'a.json', '', 'x'.repeat(161)]) {
      await assert.rejects(storage.read(id), /FILE_REPORT_INVALID_ID/)
      await assert.rejects(storage.insert(fixture(id)), /FILE_REPORT_INVALID_ID/)
      await assert.rejects(storage.delete(id), /FILE_REPORT_INVALID_ID/)
    }
  })

  it('bounds live-lock waiting and fails closed on a stale crashed lock', async () => {
    const record = fixture()
    const storage = new FileReportStorage({ directory, lockTimeoutMs: 45, retryMs: 5, staleLockMs: 20 })
    await storage.insert(record)
    const lock = join(directory, 'locks', `${record.reportId}.lock`)
    await mkdir(lock)
    await writeFile(join(lock, 'owner.json'), JSON.stringify({ pid: process.pid, token: 'synthetic-live-lock' }))
    const started = Date.now()
    await assert.rejects(storage.insert(record), /FILE_REPORT_LOCK_TIMEOUT/)
    assert.ok(Date.now() - started < 1_000)
    await writeFile(join(lock, 'owner.json'), JSON.stringify({ pid: 2147483647, token: 'synthetic-dead-lock' }))
    const old = new Date(Date.now() - 1_000)
    await utimes(lock, old, old)
    await assert.rejects(storage.insert(record), /FILE_REPORT_LOCK_STALE/)
    assert.equal((await storage.read(record.reportId))?.report.sections[0].interpretation, 'FIRST_SNAPSHOT')
    assert.match(await readFile(join(lock, 'owner.json'), 'utf8'), /synthetic-dead-lock/)
    await rm(lock, { recursive: true, force: true })
  })

  it('lists committed records only and deletes one exact ID recoverably from its fixture', async () => {
    const storage = new FileReportStorage(directory)
    const record = await storage.insert(fixture())
    await writeFile(join(directory, 'records', '.interrupted-write.tmp'), '{partial')
    assert.ok((await storage.list()).some(item => item.reportId === record.reportId))
    assert.equal(await storage.delete(record.reportId), true)
    assert.equal(await storage.read(record.reportId), null)
    assert.equal(await storage.delete(record.reportId), false)
    assert.equal((await storage.insert(record)).reportId, record.reportId)
  })
})
