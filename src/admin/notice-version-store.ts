import { createHash } from 'node:crypto'
import { configuredEnv } from '../env/load.js'
import { safeNoticeDraftFields, type NoticeDraftFields } from './notice-content.js'

type Row = Record<string, unknown>

export type AdminSupportNoticeVersion = {
  id: string
  fields: NoticeDraftFields
  reviewNote: string
  revision: number
  state: 'draft' | 'published'
  updatedAt: string
  publishedAt: string | null
}

export type PublicSupportNotice = {
  title: string
  body: string
  publishedAt: string
}

const supabaseUrl = configuredEnv(process.env.SUPABASE_URL)?.replace(/\/$/, '')
const serviceRoleKey = configuredEnv(process.env.SUPABASE_SERVICE_ROLE_KEY)

function headers(): Record<string, string> {
  if (!serviceRoleKey) throw new Error('NOTICE_VERSION_STORE_UNAVAILABLE')
  const result: Record<string, string> = { apikey: serviceRoleKey }
  if (!serviceRoleKey.startsWith('sb_secret_') && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(serviceRoleKey)) {
    result.authorization = `Bearer ${serviceRoleKey}`
  }
  return result
}

function tableUrl(): string {
  if (!supabaseUrl || !serviceRoleKey) throw new Error('NOTICE_VERSION_STORE_UNAVAILABLE')
  return `${supabaseUrl}/rest/v1/content_versions`
}

function rpcUrl(name: string): string {
  if (!supabaseUrl || !serviceRoleKey) throw new Error('NOTICE_VERSION_STORE_UNAVAILABLE')
  return `${supabaseUrl}/rest/v1/rpc/${name}`
}

export function noticeVersionStoreAvailable(): boolean {
  return Boolean(supabaseUrl && serviceRoleKey)
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`
  return JSON.stringify(value)
}

function checksum(fields: NoticeDraftFields): string {
  return createHash('sha256').update(stableJson(fields)).digest('hex')
}

function versionFromRow(row: Row | undefined): AdminSupportNoticeVersion | null {
  if (!row || typeof row.id !== 'string' || row.content_type !== 'notice' || row.placement !== 'support_top') return null
  if (row.state !== 'draft' && row.state !== 'published') return null
  const fields = safeNoticeDraftFields(row.payload)
  const revision = Number(row.revision)
  if (!fields || !Number.isSafeInteger(revision) || revision < 0 || typeof row.updated_at !== 'string') return null
  const publishedAt = typeof row.published_at === 'string' ? row.published_at : null
  if (row.state === 'published' && !publishedAt) return null
  return {
    id: row.id,
    fields,
    reviewNote: typeof row.review_note === 'string' ? row.review_note : '',
    revision,
    state: row.state,
    updatedAt: row.updated_at,
    publishedAt,
  }
}

async function loadRows(): Promise<Row[]> {
  const request = new URL(tableUrl())
  request.searchParams.set('select', 'id,content_type,placement,payload,review_note,state,revision,created_at,updated_at,published_at')
  request.searchParams.set('content_type', 'eq.notice')
  request.searchParams.set('placement', 'eq.support_top')
  request.searchParams.set('service_key', 'is.null')
  request.searchParams.set('state', 'in.(draft,published)')
  request.searchParams.set('order', 'created_at.desc')
  request.searchParams.set('limit', '20')
  const response = await fetch(request, { headers: headers(), signal: AbortSignal.timeout(2500) })
  if (!response.ok) throw new Error('NOTICE_VERSION_LOOKUP_FAILED')
  return await response.json() as Row[]
}

function newest(rows: Row[], state: 'draft' | 'published'): AdminSupportNoticeVersion | null {
  for (const row of rows) {
    if (row.state !== state) continue
    const value = versionFromRow(row)
    if (value) return value
  }
  return null
}

export async function getAdminSupportNoticeSnapshot(): Promise<{ draft: AdminSupportNoticeVersion | null, published: AdminSupportNoticeVersion | null, store: 'ready' | 'unavailable', asOf: string }> {
  if (!noticeVersionStoreAvailable()) return { draft: null, published: null, store: 'unavailable', asOf: new Date().toISOString() }
  const rows = await loadRows()
  return { draft: newest(rows, 'draft'), published: newest(rows, 'published'), store: 'ready', asOf: new Date().toISOString() }
}

export async function getPublishedSupportNotice(): Promise<PublicSupportNotice | null> {
  if (!noticeVersionStoreAvailable()) return null
  const published = newest(await loadRows(), 'published')
  if (!published?.publishedAt) return null
  return { ...published.fields, publishedAt: published.publishedAt }
}

async function parseVersionResponse(response: Response, failureCode: string, conflictCode = failureCode): Promise<AdminSupportNoticeVersion> {
  if (!response.ok) throw new Error(response.status === 409 ? conflictCode : failureCode)
  const value = versionFromRow((await response.json() as Row[])[0])
  if (!value) throw new Error(failureCode)
  return value
}

export async function createAdminSupportNoticeDraft(input: { fields: NoticeDraftFields, reviewNote: string, authorEmail: string }): Promise<AdminSupportNoticeVersion> {
  const response = await fetch(rpcUrl('create_support_notice_draft'), {
    method: 'POST',
    headers: { ...headers(), 'content-type': 'application/json' },
    body: JSON.stringify({ p_payload: input.fields, p_checksum: checksum(input.fields), p_review_note: input.reviewNote, p_author_email: input.authorEmail.toLowerCase() }),
  })
  return parseVersionResponse(response, 'SUPPORT_NOTICE_DRAFT_CREATE_FAILED', 'SUPPORT_NOTICE_DRAFT_EXISTS')
}

export async function updateAdminSupportNoticeDraft(input: { id: string, expectedRevision: number, fields: NoticeDraftFields, reviewNote: string }): Promise<AdminSupportNoticeVersion | null> {
  const request = new URL(tableUrl())
  request.searchParams.set('id', `eq.${input.id}`)
  request.searchParams.set('content_type', 'eq.notice')
  request.searchParams.set('placement', 'eq.support_top')
  request.searchParams.set('service_key', 'is.null')
  request.searchParams.set('state', 'eq.draft')
  request.searchParams.set('revision', `eq.${input.expectedRevision}`)
  request.searchParams.set('select', 'id,content_type,placement,payload,review_note,state,revision,created_at,updated_at,published_at')
  const response = await fetch(request, {
    method: 'PATCH',
    headers: { ...headers(), 'content-type': 'application/json', prefer: 'return=representation' },
    body: JSON.stringify({ payload: input.fields, checksum: checksum(input.fields), review_note: input.reviewNote || null, revision: input.expectedRevision + 1, updated_at: new Date().toISOString() }),
  })
  if (!response.ok) throw new Error('SUPPORT_NOTICE_DRAFT_UPDATE_FAILED')
  const row = (await response.json() as Row[])[0]
  return row ? versionFromRow(row) : null
}

export async function publishAdminSupportNoticeDraft(input: { id: string, expectedRevision: number, actorEmail: string }): Promise<AdminSupportNoticeVersion> {
  const response = await fetch(rpcUrl('publish_support_notice_draft'), {
    method: 'POST',
    headers: { ...headers(), 'content-type': 'application/json' },
    body: JSON.stringify({ p_draft_id: input.id, p_expected_revision: input.expectedRevision, p_actor_email: input.actorEmail.toLowerCase() }),
  })
  return parseVersionResponse(response, 'SUPPORT_NOTICE_DRAFT_PUBLISH_FAILED', 'SUPPORT_NOTICE_DRAFT_REVISION_CONFLICT')
}
