import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, link, writeFile, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { TRANSLATION_VERSION, createStoredTranslationRequest, generateTranslate, projectStoredTranslation, type ResultLocale, type StoredTranslationProvider, type StoredTranslationSnapshot, type TranslationAccess } from './stored-result-translation.js'

export interface LocaleCopyIdentity {
  ownerId: string; reportId: string; sourceHash: string; locale: ResultLocale; access: TranslationAccess; version: typeof TRANSLATION_VERSION
}
export interface LocaleCopyRecord { key: string; identity: LocaleCopyIdentity; snapshot: Readonly<StoredTranslationSnapshot>; createdAt: string }
export interface LocaleCopyStore {
  readonly durable: boolean
  get(identity: LocaleCopyIdentity, authorizedOwnerId: string): Promise<LocaleCopyRecord | null>
  put(record: LocaleCopyRecord, authorizedOwnerId: string): Promise<void>
}
function assertIdentity(identity: LocaleCopyIdentity, actor: string): void {
  if (!actor || actor !== identity.ownerId || !identity.reportId || !/^[a-f0-9]{64}$/.test(identity.sourceHash) || !['en', 'ja'].includes(identity.locale) || !['paid', 'preview'].includes(identity.access) || identity.version !== TRANSLATION_VERSION) throw new Error('TRANSLATION_ACCESS_DENIED')
}
/** No raw owner or report identifier becomes a path, URL key, or provider field. */
export function localeCopyKey(identity: LocaleCopyIdentity): string {
  assertIdentity(identity, identity.ownerId)
  return createHash('sha256').update(JSON.stringify([identity.ownerId, identity.reportId, identity.sourceHash, identity.locale, identity.access, identity.version])).digest('hex')
}
function checkedRecord(record: LocaleCopyRecord, identity: LocaleCopyIdentity): LocaleCopyRecord {
  const key = localeCopyKey(identity)
  if (record.key !== key || localeCopyKey(record.identity) !== key || record.snapshot.sourceHash !== identity.sourceHash || record.snapshot.locale !== identity.locale || record.snapshot.access !== identity.access || record.snapshot.schemaVersion !== identity.version) throw new Error('CORRUPT_TRANSLATION_COPY')
  return JSON.parse(JSON.stringify(record)) as LocaleCopyRecord
}
export class MemoryLocaleCopyStore implements LocaleCopyStore {
  readonly durable = false
  private records = new Map<string, LocaleCopyRecord>()
  async get(identity: LocaleCopyIdentity, actor: string): Promise<LocaleCopyRecord | null> {
    assertIdentity(identity, actor)
    const row = this.records.get(localeCopyKey(identity))
    return row ? checkedRecord(row, identity) : null
  }
  async put(record: LocaleCopyRecord, actor: string): Promise<void> {
    assertIdentity(record.identity, actor)
    const checked = checkedRecord(record, record.identity)
    if (!this.records.has(record.key)) this.records.set(record.key, checked)
  }
}
/** Isolated locale-copy folder. Never points at original report-snapshot files. Not durable on serverless local disks. */
export class FileLocaleCopyStore implements LocaleCopyStore {
  readonly durable = true
  constructor(private readonly directory: string) {}
  async get(identity: LocaleCopyIdentity, actor: string): Promise<LocaleCopyRecord | null> {
    assertIdentity(identity, actor)
    try { return checkedRecord(JSON.parse(await readFile(join(this.directory, localeCopyKey(identity) + '.json'), 'utf8')), identity) }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error }
  }
  async put(record: LocaleCopyRecord, actor: string): Promise<void> {
    assertIdentity(record.identity, actor)
    const checked = checkedRecord(record, record.identity)
    await mkdir(this.directory, { recursive: true })
    const dest = join(this.directory, record.key + '.json')
    if (await this.get(record.identity, actor)) return
    const temporary = dest + '.' + randomUUID() + '.tmp'
    try {
      await writeFile(temporary, JSON.stringify(checked), { encoding: 'utf8', mode: 0o600, flag: 'wx' })
      try { await link(temporary, dest) } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error }
    } finally { await unlink(temporary).catch(() => {}) }
  }
}

export interface SupabaseLocaleCopyOptions { url: string; serviceKey: string; fetch?: typeof fetch }
/** Server-only. The separately provisioned table has RLS enabled and no public/authenticated policies. */
export class SupabaseLocaleCopyStore implements LocaleCopyStore {
  readonly durable = true
  private readonly base: string
  private readonly headers: Record<string, string>
  private readonly request: typeof fetch
  constructor(options: SupabaseLocaleCopyOptions) {
    const url = new URL(options.url)
    if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('INSECURE_TRANSLATION_STORE')
    if (!options.serviceKey) throw new Error('TRANSLATION_STORE_SERVER_KEY_REQUIRED')
    this.base = options.url.replace(/\/$/, '') + '/rest/v1/cheongi_report_locale_copies'
    this.headers = { apikey: options.serviceKey, 'content-type': 'application/json' }
    if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(options.serviceKey)) this.headers.authorization = 'Bearer ' + options.serviceKey
    this.request = options.fetch ?? fetch
  }
  async get(identity: LocaleCopyIdentity, actor: string): Promise<LocaleCopyRecord | null> {
    assertIdentity(identity, actor)
    const query = new URLSearchParams({ copy_key: 'eq.' + localeCopyKey(identity), owner_id: 'eq.' + identity.ownerId, original_report_id: 'eq.' + identity.reportId, select: 'copy_key,owner_id,original_report_id,source_hash,locale,access_scope,translation_version,snapshot,created_at', limit: '1' })
    const response = await this.request(this.base + '?' + query, { headers: this.headers, signal: AbortSignal.timeout(15000) })
    if (!response.ok) throw new Error('TRANSLATION_STORE_READ_FAILED_' + response.status)
    const rows = await response.json() as Array<Record<string, any>>
    if (!Array.isArray(rows)) throw new Error('CORRUPT_TRANSLATION_STORE_RESPONSE')
    if (!rows.length) return null
    const row = rows[0]
    return checkedRecord({ key: row.copy_key, identity: { ownerId: row.owner_id, reportId: row.original_report_id, sourceHash: row.source_hash, locale: row.locale, access: row.access_scope, version: row.translation_version }, snapshot: row.snapshot, createdAt: row.created_at }, identity)
  }
  async put(record: LocaleCopyRecord, actor: string): Promise<void> {
    assertIdentity(record.identity, actor)
    const row = checkedRecord(record, record.identity)
    const response = await this.request(this.base + '?on_conflict=copy_key', { method: 'POST', headers: { ...this.headers, prefer: 'resolution=ignore-duplicates,return=minimal' }, signal: AbortSignal.timeout(15000), body: JSON.stringify({ copy_key: row.key, owner_id: row.identity.ownerId, original_report_id: row.identity.reportId, source_hash: row.identity.sourceHash, locale: row.identity.locale, access_scope: row.identity.access, translation_version: row.identity.version, snapshot: row.snapshot, created_at: row.createdAt }) })
    if (!response.ok) throw new Error('TRANSLATION_STORE_WRITE_FAILED_' + response.status)
  }
}

/** Complete authorized DTO in, separate stored locale snapshot out. Read paths must set generate=false. */
export async function localizedStoredResult(input: {
  source: Record<string, any>; reportId: string; ownerId: string; authorizedOwnerId: string;
  locale: ResultLocale; access: TranslationAccess; store: LocaleCopyStore;
  generate?: boolean; provider?: StoredTranslationProvider; signal?: AbortSignal; protectedQuotes?: readonly string[]
}): Promise<{ state: 'translated'; result: Record<string, any>; created: boolean; durable: boolean } | { state: 'missing'; sourceLocale: 'ko'; resultLocale: ResultLocale }> {
  const request = createStoredTranslationRequest({ source: input.source, locale: input.locale, ownerId: input.ownerId, authorizedOwnerId: input.authorizedOwnerId, access: input.access, ...(input.protectedQuotes ? { protectedQuotes: input.protectedQuotes } : {}) })
  if (input.source.reportId && input.source.reportId !== input.reportId) throw new Error('TRANSLATION_ORIGINAL_ID_MISMATCH')
  const identity: LocaleCopyIdentity = { ownerId: input.ownerId, reportId: input.reportId, sourceHash: request.sourceHash, locale: input.locale, access: input.access, version: TRANSLATION_VERSION }
  const existing = await input.store.get(identity, input.authorizedOwnerId)
  if (existing) return { state: 'translated', result: projectStoredTranslation(input.source, existing.snapshot), created: false, durable: input.store.durable }
  if (!input.generate) return { state: 'missing', sourceLocale: 'ko', resultLocale: input.locale }
  if (!input.provider) throw new Error('TRANSLATION_PROVIDER_REQUIRED')
  const snapshot = await generateTranslate({ request, provider: input.provider, ...(input.signal ? { signal: input.signal } : {}) })
  const row: LocaleCopyRecord = { key: localeCopyKey(identity), identity, snapshot, createdAt: new Date().toISOString() }
  await input.store.put(row, input.authorizedOwnerId)
  // Use the persisted winner so simultaneous jobs never return divergent copies of the same source.
  const winner = await input.store.get(identity, input.authorizedOwnerId)
  if (!winner) throw new Error('TRANSLATION_COPY_NOT_PERSISTED')
  return { state: 'translated', result: projectStoredTranslation(input.source, winner.snapshot), created: true, durable: input.store.durable }
}
