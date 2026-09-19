import { createHash } from 'node:crypto'
import { configuredEnv } from '../env/load.js'
import { listAdminServiceDirectory } from '../server/service-directory.js'

/**
 * T24: 고객 화면 문안(안내·배너·FAQ·서비스 카드·랜딩 문구·약관 링크)의 편집·발행.
 *
 * 표는 T22 가 만들어 둔 `content_versions` 그대로다. service_role 에 DELETE 권한이 없다 —
 * 행은 지우지 않고 archived 로 내린다. RPC 가 없으므로 revision CAS 는 PostgREST 필터
 * (`revision=eq.N`)로 건다(admin-account-store 와 같은 방식). 게시본 유일성은 표의 부분
 * 유니크 인덱스(content_type, service_key, placement)가 최종적으로 막는다.
 *
 * 구조화 필드만 받는다(06-SCREENS S03). 원문 HTML 은 받지 않는다.
 */

export const CONTENT_TYPES = ['service_card', 'landing_copy', 'faq', 'notice', 'banner', 'legal_link'] as const
export type ContentType = (typeof CONTENT_TYPES)[number]

export interface ContentPayload {
  title: string
  body: string
  href?: string
}

export interface ContentVersion {
  id: string
  contentType: ContentType
  serviceKey: string | null
  placement: string
  payload: ContentPayload
  checksum: string
  state: 'draft' | 'published' | 'archived'
  authorEmail: string
  reviewNote: string | null
  revision: number
  scheduledAt: string | null
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface AdminContentSnapshot {
  items: ContentVersion[]
  versionStore: 'ready' | 'unavailable'
  asOf: string
}

type Row = Record<string, unknown>

const supabaseUrl = configuredEnv(process.env.SUPABASE_URL)?.replace(/\/$/, '')
const serviceRoleKey = configuredEnv(process.env.SUPABASE_SERVICE_ROLE_KEY)

export function contentStoreAvailable(): boolean {
  return Boolean(supabaseUrl && serviceRoleKey)
}

function headers(): Record<string, string> {
  if (!serviceRoleKey) throw new Error('CONTENT_STORE_UNAVAILABLE')
  const result: Record<string, string> = { apikey: serviceRoleKey, 'content-type': 'application/json' }
  if (!serviceRoleKey.startsWith('sb_secret_') && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(serviceRoleKey)) {
    result.authorization = `Bearer ${serviceRoleKey}`
  }
  return result
}

function tableUrl(): URL {
  if (!supabaseUrl || !serviceRoleKey) throw new Error('CONTENT_STORE_UNAVAILABLE')
  return new URL(`${supabaseUrl}/rest/v1/content_versions`)
}

const SELECT = 'id,content_type,service_key,placement,payload,checksum,state,author_email,review_note,revision,scheduled_at,published_at,created_at,updated_at'

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b))
    return `{${entries.map(([itemKey, item]) => `${JSON.stringify(itemKey)}:${stableJson(item)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

export function contentChecksum(payload: ContentPayload): string {
  return createHash('sha256').update(stableJson(payload)).digest('hex')
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length >= 1 && trimmed.length <= max ? trimmed : null
}

/** 구조화 필드만. 태그 문자가 들어오면 통째로 거절한다 — HTML 정제기는 이번 범위에 없다. */
function noMarkup(value: string): boolean {
  return !/[<>]/.test(value)
}

export function isContentType(value: unknown): value is ContentType {
  return typeof value === 'string' && (CONTENT_TYPES as readonly string[]).includes(value)
}

export function normalizeContentPayload(input: unknown): ContentPayload {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : null
  if (!source) throw new Error('CONTENT_PAYLOAD_INVALID')
  const title = text(source.title, 120)
  const body = text(source.body, 4000)
  if (!title || !body || !noMarkup(title) || !noMarkup(body)) throw new Error('CONTENT_PAYLOAD_INVALID')
  const payload: ContentPayload = { title, body }
  if (source.href !== undefined && source.href !== null && String(source.href).trim() !== '') {
    const href = text(source.href, 300)
    if (!href || !/^(?:\/[^\s<>"']*|https:\/\/[^\s<>"']+)$/.test(href)) throw new Error('CONTENT_PAYLOAD_INVALID')
    payload.href = href
  }
  return payload
}

export function normalizePlacement(value: unknown): string {
  const placement = text(value, 120)
  if (!placement || !/^[\p{L}\p{N}][\p{L}\p{N} _.:/-]{0,119}$/u.test(placement)) throw new Error('CONTENT_PLACEMENT_INVALID')
  return placement
}

/** 대상 서비스는 비울 수 있다. 채우면 실제 카탈로그 키여야 한다 — 없는 서비스의 문안을 만들지 않는다. */
export function normalizeServiceKey(value: unknown): string | null {
  if (value === undefined || value === null || String(value).trim() === '') return null
  const key = text(value, 80)
  if (!key || !listAdminServiceDirectory().some((service) => service.key === key)) throw new Error('CONTENT_SERVICE_UNKNOWN')
  return key
}

function normalizeScheduledAt(value: unknown): string | null {
  if (value === undefined || value === null || String(value).trim() === '') return null
  const at = Date.parse(String(value))
  if (!Number.isFinite(at)) throw new Error('CONTENT_PAYLOAD_INVALID')
  return new Date(at).toISOString()
}

function normalizeReviewNote(value: unknown): string | null {
  if (value === undefined || value === null || String(value).trim() === '') return null
  const note = text(value, 500)
  if (!note || !noMarkup(note)) throw new Error('CONTENT_PAYLOAD_INVALID')
  return note
}

function normalizeAuthor(value: string): string {
  const email = value.trim().toLowerCase()
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('CONTENT_PAYLOAD_INVALID')
  return email
}

function fromRow(row: Row): ContentVersion {
  return {
    id: String(row.id),
    contentType: row.content_type as ContentType,
    serviceKey: typeof row.service_key === 'string' ? row.service_key : null,
    placement: String(row.placement),
    payload: row.payload as ContentPayload,
    checksum: String(row.checksum),
    state: String(row.state) as ContentVersion['state'],
    authorEmail: String(row.author_email),
    reviewNote: typeof row.review_note === 'string' ? row.review_note : null,
    revision: Number(row.revision),
    scheduledAt: typeof row.scheduled_at === 'string' ? row.scheduled_at : null,
    publishedAt: typeof row.published_at === 'string' ? row.published_at : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

async function readRows(url: URL): Promise<Row[]> {
  const response = await fetch(url, { headers: headers() })
  if (!response.ok) throw new Error('CONTENT_LOOKUP_FAILED')
  return await response.json() as Row[]
}

export async function getAdminContentSnapshot(limit = 200): Promise<AdminContentSnapshot> {
  if (!contentStoreAvailable()) return { items: [], versionStore: 'unavailable', asOf: new Date().toISOString() }
  const url = tableUrl()
  url.searchParams.set('select', SELECT)
  url.searchParams.set('state', 'in.(draft,published)')
  url.searchParams.set('order', 'updated_at.desc')
  url.searchParams.set('limit', String(Math.min(Math.max(limit, 1), 500)))
  const rows = await readRows(url)
  return { items: rows.map(fromRow), versionStore: 'ready', asOf: new Date().toISOString() }
}

export async function getContentVersion(id: string): Promise<ContentVersion | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const url = tableUrl()
  url.searchParams.set('select', SELECT)
  url.searchParams.set('id', `eq.${id}`)
  url.searchParams.set('limit', '1')
  const rows = await readRows(url)
  return rows[0] ? fromRow(rows[0]) : null
}

export async function createContentDraft(input: {
  contentType: unknown
  serviceKey?: unknown
  placement: unknown
  payload: unknown
  scheduledAt?: unknown
  reviewNote?: unknown
  authorEmail: string
}): Promise<ContentVersion> {
  if (!isContentType(input.contentType)) throw new Error('CONTENT_TYPE_INVALID')
  const payload = normalizeContentPayload(input.payload)
  const row = {
    content_type: input.contentType,
    service_key: normalizeServiceKey(input.serviceKey),
    placement: normalizePlacement(input.placement),
    payload,
    checksum: contentChecksum(payload),
    state: 'draft',
    author_email: normalizeAuthor(input.authorEmail),
    review_note: normalizeReviewNote(input.reviewNote),
    scheduled_at: normalizeScheduledAt(input.scheduledAt),
    revision: 0,
  }
  const response = await fetch(tableUrl(), { method: 'POST', headers: { ...headers(), prefer: 'return=representation' }, body: JSON.stringify(row) })
  if (!response.ok) throw new Error('CONTENT_DRAFT_FAILED')
  const rows = await response.json() as Row[]
  if (!rows[0]) throw new Error('CONTENT_DRAFT_FAILED')
  return fromRow(rows[0])
}

/** 초안만 고친다. revision 이 다르면 0행이 바뀌고, 그것을 충돌로 알린다 — 나중 저장이 앞선 저장을 덮지 않는다. */
export async function updateContentDraft(input: {
  id: string
  expectedRevision: number
  payload: unknown
  scheduledAt?: unknown
  reviewNote?: unknown
  authorEmail: string
}): Promise<ContentVersion> {
  const current = await getContentVersion(input.id)
  if (!current) throw new Error('CONTENT_NOT_FOUND')
  if (current.state !== 'draft') throw new Error('CONTENT_NOT_DRAFT')
  if (current.revision !== input.expectedRevision) throw new Error('CONTENT_REVISION_CONFLICT')
  const payload = normalizeContentPayload(input.payload)
  const url = tableUrl()
  url.searchParams.set('id', `eq.${input.id}`)
  url.searchParams.set('state', 'eq.draft')
  url.searchParams.set('revision', `eq.${input.expectedRevision}`)
  const response = await fetch(url, {
    method: 'PATCH', headers: { ...headers(), prefer: 'return=representation' },
    body: JSON.stringify({
      payload, checksum: contentChecksum(payload), author_email: normalizeAuthor(input.authorEmail),
      review_note: normalizeReviewNote(input.reviewNote), scheduled_at: normalizeScheduledAt(input.scheduledAt),
      revision: input.expectedRevision + 1, updated_at: new Date().toISOString(),
    }),
  })
  if (!response.ok) throw new Error('CONTENT_DRAFT_FAILED')
  const rows = await response.json() as Row[]
  if (!rows[0]) throw new Error('CONTENT_REVISION_CONFLICT')
  return fromRow(rows[0])
}

/**
 * 게시. 검토한 체크섬이 저장된 초안과 같을 때만 된다. 같은 자리(type·service·placement)의
 * 기존 게시본은 archived 로 내린 뒤 올린다 — 자리당 게시본 하나라는 유니크 인덱스가 있다.
 */
export async function publishContentVersion(input: { id: string; expectedRevision: number; checksum: string; authorEmail: string }): Promise<ContentVersion> {
  const target = await getContentVersion(input.id)
  if (!target) throw new Error('CONTENT_NOT_FOUND')
  if (target.state !== 'draft') throw new Error('CONTENT_NOT_DRAFT')
  if (target.revision !== input.expectedRevision) throw new Error('CONTENT_REVISION_CONFLICT')
  if (target.checksum !== input.checksum) throw new Error('CONTENT_CHECKSUM_MISMATCH')
  const now = new Date().toISOString()

  const archive = tableUrl()
  archive.searchParams.set('content_type', `eq.${target.contentType}`)
  archive.searchParams.set('placement', `eq.${target.placement}`)
  archive.searchParams.set('service_key', target.serviceKey ? `eq.${target.serviceKey}` : 'is.null')
  archive.searchParams.set('state', 'eq.published')
  const archived = await fetch(archive, { method: 'PATCH', headers: { ...headers(), prefer: 'return=minimal' }, body: JSON.stringify({ state: 'archived', updated_at: now }) })
  if (!archived.ok) throw new Error('CONTENT_PUBLISH_FAILED')

  const url = tableUrl()
  url.searchParams.set('id', `eq.${input.id}`)
  url.searchParams.set('state', 'eq.draft')
  url.searchParams.set('revision', `eq.${input.expectedRevision}`)
  const response = await fetch(url, {
    method: 'PATCH', headers: { ...headers(), prefer: 'return=representation' },
    body: JSON.stringify({ state: 'published', published_at: now, author_email: normalizeAuthor(input.authorEmail), revision: input.expectedRevision + 1, updated_at: now }),
  })
  if (response.status === 409) throw new Error('CONTENT_PUBLISH_CONFLICT')
  if (!response.ok) throw new Error('CONTENT_PUBLISH_FAILED')
  const rows = await response.json() as Row[]
  if (!rows[0]) throw new Error('CONTENT_REVISION_CONFLICT')
  return fromRow(rows[0])
}

/** "삭제"에 해당한다. DELETE 권한이 없고 이력을 남겨야 하므로 archived 로 내린다. */
export async function archiveContentVersion(input: { id: string; expectedRevision: number }): Promise<ContentVersion> {
  const target = await getContentVersion(input.id)
  if (!target) throw new Error('CONTENT_NOT_FOUND')
  if (target.state === 'archived') return target
  if (target.revision !== input.expectedRevision) throw new Error('CONTENT_REVISION_CONFLICT')
  const url = tableUrl()
  url.searchParams.set('id', `eq.${input.id}`)
  url.searchParams.set('revision', `eq.${input.expectedRevision}`)
  const response = await fetch(url, {
    method: 'PATCH', headers: { ...headers(), prefer: 'return=representation' },
    body: JSON.stringify({ state: 'archived', revision: input.expectedRevision + 1, updated_at: new Date().toISOString() }),
  })
  if (!response.ok) throw new Error('CONTENT_ARCHIVE_FAILED')
  const rows = await response.json() as Row[]
  if (!rows[0]) throw new Error('CONTENT_REVISION_CONFLICT')
  return fromRow(rows[0])
}
