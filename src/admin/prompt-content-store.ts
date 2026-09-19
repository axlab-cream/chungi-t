import { createHash, randomUUID } from 'node:crypto'
import { configuredEnv } from '../env/load.js'
import { getToneV2AdminSnapshot } from '../prompt/admin-snapshot.js'
import { loadToneCommon, loadToneService } from '../prompt/tone-v2.js'

type Row = Record<string, unknown>

export type PromptContentType = 'common' | 'service'

export interface PromptContentVersion {
  id: string
  contentType: PromptContentType
  contentKey: string
  version: number
  body: string
  checksum: string
  state: 'draft' | 'published' | 'archived'
  authorEmail: string
  revision: number
  createdAt: string
  updatedAt: string
  publishedAt?: string
}

export interface AdminPromptContentSummary {
  contentType: PromptContentType
  contentKey: string
  label: string
  baselineBody: string
  currentBody: string
  publishedVersion: number | null
  draftVersion: number | null
  revision: number | null
  updatedAt: string | null
}

export interface AdminPromptContentSnapshot {
  items: AdminPromptContentSummary[]
  versionStore: 'ready' | 'unavailable'
  asOf: string
}

const supabaseUrl = configuredEnv(process.env.SUPABASE_URL)?.replace(/\/$/, '')
const serviceRoleKey = configuredEnv(process.env.SUPABASE_SERVICE_ROLE_KEY)

function headers(): Record<string, string> {
  if (!serviceRoleKey) throw new Error('PROMPT_CONTENT_STORE_UNAVAILABLE')
  const result: Record<string, string> = { apikey: serviceRoleKey }
  if (!serviceRoleKey.startsWith('sb_secret_') && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(serviceRoleKey)) {
    result.authorization = `Bearer ${serviceRoleKey}`
  }
  return result
}

function storeUrl(): string {
  if (!supabaseUrl || !serviceRoleKey) throw new Error('PROMPT_CONTENT_STORE_UNAVAILABLE')
  return `${supabaseUrl}/rest/v1/prompt_content_versions`
}

export function promptContentStoreAvailable(): boolean {
  return Boolean(supabaseUrl && serviceRoleKey)
}

/** 새 draft 를 만들 때 쓰는 expectedRevision. */
export const NEW_PROMPT_DRAFT_REVISION = -1

const testVersions = new Map<string, PromptContentVersion>()
let versionTestMode = false
function canUseVersionTestStore(): boolean { return process.env.NODE_ENV === 'test' || versionTestMode }
export function resetPromptContentStoreForTests(): void { versionTestMode = true; testVersions.clear() }

export function promptContentChecksum(body: string): string {
  return createHash('sha256').update(body).digest('hex')
}

/** 편집 가능한 21개 항목: 공통 규칙 1개 + tone-v2 페르소나 20개. */
function knownContentUnits(): Array<{ contentType: PromptContentType; contentKey: string; label: string }> {
  const snapshot = getToneV2AdminSnapshot()
  return [
    { contentType: 'common' as const, contentKey: 'common', label: '공통 규칙' },
    ...snapshot.personas.map((persona) => ({ contentType: 'service' as const, contentKey: persona.key, label: persona.title })),
  ]
}

function knownContentKey(contentType: PromptContentType, contentKey: string): boolean {
  return knownContentUnits().some((unit) => unit.contentType === contentType && unit.contentKey === contentKey)
}

function baselineBody(contentType: PromptContentType, contentKey: string): string {
  return contentType === 'common' ? loadToneCommon() : loadToneService(contentKey)
}

function validVersion(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

function latestByState(rows: Row[], state: 'draft' | 'published'): Map<string, Row> {
  const result = new Map<string, Row>()
  for (const row of rows) {
    if (row.state !== state || typeof row.content_type !== 'string' || typeof row.content_key !== 'string' || validVersion(row.version) === null) continue
    const key = `${row.content_type}:${row.content_key}`
    const existing = result.get(key)
    if (!existing || Number(row.version) > Number(existing.version)) result.set(key, row)
  }
  return result
}

async function loadVersionRows(): Promise<Row[]> {
  const request = new URL(storeUrl())
  request.searchParams.set('select', 'content_type,content_key,version,body,state,revision,updated_at')
  request.searchParams.set('state', 'in.(draft,published)')
  request.searchParams.set('limit', '200')
  const response = await fetch(request, { headers: headers() })
  if (!response.ok) throw new Error('PROMPT_CONTENT_LOOKUP_FAILED')
  return await response.json() as Row[]
}

export async function getAdminPromptContentSnapshot(): Promise<AdminPromptContentSnapshot> {
  let versionStore: AdminPromptContentSnapshot['versionStore'] = 'unavailable'
  let rows: Row[] = []
  if (promptContentStoreAvailable()) {
    rows = await loadVersionRows()
    versionStore = 'ready'
  }
  const drafts = latestByState(rows, 'draft')
  const published = latestByState(rows, 'published')
  const items = knownContentUnits().map((unit) => {
    const mapKey = `${unit.contentType}:${unit.contentKey}`
    const draft = drafts.get(mapKey)
    const live = published.get(mapKey)
    const current = draft ?? live
    const baseline = baselineBody(unit.contentType, unit.contentKey)
    return {
      contentType: unit.contentType,
      contentKey: unit.contentKey,
      label: unit.label,
      baselineBody: baseline,
      currentBody: typeof current?.body === 'string' ? current.body : baseline,
      publishedVersion: validVersion(live?.version),
      draftVersion: validVersion(draft?.version),
      revision: current && Number.isSafeInteger(Number(current.revision)) ? Number(current.revision) : null,
      updatedAt: typeof current?.updated_at === 'string' ? current.updated_at : null,
    }
  })
  return { items, versionStore, asOf: new Date().toISOString() }
}

function versionFromRow(row: Row): PromptContentVersion {
  return {
    id: String(row.id),
    contentType: row.content_type as PromptContentType,
    contentKey: String(row.content_key),
    version: Number(row.version),
    body: String(row.body),
    checksum: String(row.checksum),
    state: String(row.state) as PromptContentVersion['state'],
    authorEmail: String(row.author_email),
    revision: Number(row.revision),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    publishedAt: row.published_at ? String(row.published_at) : undefined,
  }
}

function versionFailure(body: string, fallback: string): Error {
  try {
    const parsed = JSON.parse(body) as { message?: unknown }
    const message = typeof parsed.message === 'string' ? parsed.message.trim() : ''
    if (/^PROMPT_CONTENT_[A-Z_]+$/.test(message)) return new Error(message)
  } catch { /* JSON 이 아니면 기본값 */ }
  return new Error(fallback)
}

async function callRpc(name: string, body: Record<string, unknown>, fallback: string): Promise<PromptContentVersion> {
  if (!supabaseUrl || !serviceRoleKey) throw new Error('PROMPT_CONTENT_STORE_UNAVAILABLE')
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { ...headers(), 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw versionFailure(await response.text(), fallback)
  return versionFromRow(await response.json() as Row)
}

function normalizeBody(value: unknown): string {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text || text.length > 20000) throw new Error('PROMPT_CONTENT_PAYLOAD_INVALID')
  return text
}

export async function saveGenerationPromptDraft(input: {
  contentType: PromptContentType
  contentKey: string
  body: unknown
  authorEmail: string
  expectedRevision: number
}): Promise<PromptContentVersion> {
  if (!knownContentKey(input.contentType, input.contentKey)) throw new Error('PROMPT_CONTENT_UNKNOWN_KEY')
  const body = normalizeBody(input.body)
  const checksum = promptContentChecksum(body)
  const authorEmail = input.authorEmail.trim().toLowerCase()
  if (!/^\S+@\S+\.\S+$/.test(authorEmail)) throw new Error('PROMPT_CONTENT_PAYLOAD_INVALID')
  if (!Number.isInteger(input.expectedRevision) || input.expectedRevision < NEW_PROMPT_DRAFT_REVISION) throw new Error('PROMPT_CONTENT_PAYLOAD_INVALID')

  if (promptContentStoreAvailable()) {
    return callRpc('save_prompt_content_draft', {
      p_content_type: input.contentType, p_content_key: input.contentKey, p_body: body, p_checksum: checksum,
      p_author_email: authorEmail, p_expected_revision: input.expectedRevision,
    }, 'PROMPT_CONTENT_DRAFT_FAILED')
  }
  if (!canUseVersionTestStore()) throw new Error('PROMPT_CONTENT_STORE_UNAVAILABLE')

  const now = new Date().toISOString()
  const existing = Array.from(testVersions.values()).find((item) => item.contentType === input.contentType && item.contentKey === input.contentKey && item.state === 'draft')
  if (existing) {
    if (input.expectedRevision === NEW_PROMPT_DRAFT_REVISION) throw new Error('PROMPT_CONTENT_DRAFT_EXISTS')
    if (existing.revision !== input.expectedRevision) throw new Error('PROMPT_CONTENT_REVISION_CONFLICT')
    const next: PromptContentVersion = { ...existing, body, checksum, authorEmail, revision: existing.revision + 1, updatedAt: now }
    testVersions.set(next.id, next)
    return { ...next }
  }
  if (input.expectedRevision !== NEW_PROMPT_DRAFT_REVISION) throw new Error('PROMPT_CONTENT_NOT_FOUND')
  const highest = Array.from(testVersions.values()).filter((item) => item.contentType === input.contentType && item.contentKey === input.contentKey).reduce((max, item) => Math.max(max, item.version), 0)
  const created: PromptContentVersion = {
    id: `test-${randomUUID()}`, contentType: input.contentType, contentKey: input.contentKey, version: highest + 1, body, checksum,
    state: 'draft', authorEmail, revision: 0, createdAt: now, updatedAt: now,
  }
  testVersions.set(created.id, created)
  return { ...created }
}

export async function publishGenerationPromptVersion(input: {
  contentType: PromptContentType
  contentKey: string
  version: number
  checksum: string
  authorEmail: string
  expectedRevision: number
}): Promise<PromptContentVersion> {
  const authorEmail = input.authorEmail.trim().toLowerCase()
  if (!knownContentKey(input.contentType, input.contentKey)) throw new Error('PROMPT_CONTENT_UNKNOWN_KEY')
  if (!Number.isSafeInteger(input.version) || input.version <= 0) throw new Error('PROMPT_CONTENT_PAYLOAD_INVALID')
  if (!/^[a-f0-9]{64}$/.test(input.checksum)) throw new Error('PROMPT_CONTENT_PAYLOAD_INVALID')
  if (!/^\S+@\S+\.\S+$/.test(authorEmail)) throw new Error('PROMPT_CONTENT_PAYLOAD_INVALID')
  if (!Number.isInteger(input.expectedRevision) || input.expectedRevision < 0) throw new Error('PROMPT_CONTENT_PAYLOAD_INVALID')

  if (promptContentStoreAvailable()) {
    return callRpc('publish_prompt_content_version', {
      p_content_type: input.contentType, p_content_key: input.contentKey, p_version: input.version, p_checksum: input.checksum,
      p_author_email: authorEmail, p_expected_revision: input.expectedRevision,
    }, 'PROMPT_CONTENT_PUBLISH_FAILED')
  }
  if (!canUseVersionTestStore()) throw new Error('PROMPT_CONTENT_STORE_UNAVAILABLE')

  const target = Array.from(testVersions.values()).find((item) => item.contentType === input.contentType && item.contentKey === input.contentKey && item.version === input.version)
  if (!target) throw new Error('PROMPT_CONTENT_NOT_FOUND')
  if (target.state !== 'draft') throw new Error('PROMPT_CONTENT_NOT_DRAFT')
  if (target.revision !== input.expectedRevision) throw new Error('PROMPT_CONTENT_REVISION_CONFLICT')
  if (target.checksum !== input.checksum) throw new Error('PROMPT_CONTENT_CHECKSUM_MISMATCH')

  const now = new Date().toISOString()
  for (const item of Array.from(testVersions.values())) {
    if (item.contentType === input.contentType && item.contentKey === input.contentKey && item.state === 'published') {
      testVersions.set(item.id, { ...item, state: 'archived', revision: item.revision + 1, updatedAt: now })
    }
  }
  const published: PromptContentVersion = { ...target, state: 'published', authorEmail, revision: target.revision + 1, updatedAt: now, publishedAt: now }
  testVersions.set(published.id, published)
  return { ...published }
}
