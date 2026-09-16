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
  approvalRequestedAt: string | null
  approvalRequestedBy: string | null
  approvedAt: string | null
  approvedBy: string | null
  scheduledAt: string | null
  workflowStatus: 'draft' | 'approval_requested' | 'approved' | 'scheduled' | 'published'
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
  const approvalRequestedAt = typeof row.approval_requested_at === 'string' ? row.approval_requested_at : null
  const approvalRequestedBy = typeof row.approval_requested_by === 'string' ? row.approval_requested_by : null
  const approvedAt = typeof row.approved_at === 'string' ? row.approved_at : null
  const approvedBy = typeof row.approved_by === 'string' ? row.approved_by : null
  const scheduledAt = typeof row.scheduled_at === 'string' ? row.scheduled_at : null
  const approvalCurrent = approvedAt !== null && typeof row.checksum === 'string' && row.approved_checksum === row.checksum
  const workflowStatus = row.state === 'published' ? 'published' : scheduledAt && approvalCurrent ? 'scheduled' : approvalCurrent ? 'approved' : approvalRequestedAt ? 'approval_requested' : 'draft'
  return {
    id: row.id,
    fields,
    reviewNote: typeof row.review_note === 'string' ? row.review_note : '',
    revision,
    state: row.state,
    updatedAt: row.updated_at,
    publishedAt,
    approvalRequestedAt,
    approvalRequestedBy,
    approvedAt,
    approvedBy,
    scheduledAt,
    workflowStatus,
  }
}

async function loadRows(): Promise<Row[]> {
  const request = new URL(tableUrl())
  request.searchParams.set('select', 'id,content_type,placement,payload,checksum,review_note,state,revision,created_at,updated_at,published_at,scheduled_at,approval_requested_at,approval_requested_by,approved_at,approved_by,approved_checksum')
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
  if (!value) throw new Error(conflictCode)
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
  const response = await fetch(rpcUrl('update_support_notice_draft'), {
    method: 'POST',
    headers: { ...headers(), 'content-type': 'application/json' },
    body: JSON.stringify({ p_draft_id: input.id, p_expected_revision: input.expectedRevision, p_payload: input.fields, p_checksum: checksum(input.fields), p_review_note: input.reviewNote }),
  })
  if (!response.ok) throw new Error('SUPPORT_NOTICE_DRAFT_UPDATE_FAILED')
  const row = (await response.json() as Row[])[0]
  return row ? versionFromRow(row) : null
}

async function runDraftWorkflow(name: string, input: { id: string, expectedRevision: number, actorEmail: string }, extra: Record<string, unknown> = {}): Promise<AdminSupportNoticeVersion> {
  const response = await fetch(rpcUrl(name), {
    method: 'POST',
    headers: { ...headers(), 'content-type': 'application/json' },
    body: JSON.stringify({ p_draft_id: input.id, p_expected_revision: input.expectedRevision, p_actor_email: input.actorEmail.toLowerCase(), ...extra }),
  })
  return parseVersionResponse(response, 'SUPPORT_NOTICE_WORKFLOW_FAILED', 'SUPPORT_NOTICE_DRAFT_REVISION_CONFLICT')
}

export function requestAdminSupportNoticeApproval(input: { id: string, expectedRevision: number, actorEmail: string }): Promise<AdminSupportNoticeVersion> {
  return runDraftWorkflow('request_support_notice_approval', input)
}

export function approveAdminSupportNoticeDraft(input: { id: string, expectedRevision: number, actorEmail: string }): Promise<AdminSupportNoticeVersion> {
  return runDraftWorkflow('approve_support_notice_draft', input)
}

export function scheduleAdminSupportNoticeDraft(input: { id: string, expectedRevision: number, scheduledAt: string, actorEmail: string }): Promise<AdminSupportNoticeVersion> {
  return runDraftWorkflow('schedule_support_notice_draft', input, { p_scheduled_at: input.scheduledAt })
}

export function cancelAdminSupportNoticeSchedule(input: { id: string, expectedRevision: number, actorEmail: string }): Promise<AdminSupportNoticeVersion> {
  return runDraftWorkflow('cancel_support_notice_schedule', input)
}

export async function publishDueSupportNotices(): Promise<number> {
  const response = await fetch(rpcUrl('publish_due_support_notices'), { method: 'POST', headers: { ...headers(), 'content-type': 'application/json' }, body: '{}' })
  if (!response.ok) throw new Error('SUPPORT_NOTICE_DUE_PUBLISH_FAILED')
  const rows = await response.json() as Row[]
  return rows.filter((row) => versionFromRow(row)?.state === 'published').length
}

export async function publishAdminSupportNoticeDraft(input: { id: string, expectedRevision: number, actorEmail: string }): Promise<AdminSupportNoticeVersion> {
  const response = await fetch(rpcUrl('publish_support_notice_draft'), {
    method: 'POST',
    headers: { ...headers(), 'content-type': 'application/json' },
    body: JSON.stringify({ p_draft_id: input.id, p_expected_revision: input.expectedRevision, p_actor_email: input.actorEmail.toLowerCase() }),
  })
  return parseVersionResponse(response, 'SUPPORT_NOTICE_DRAFT_PUBLISH_FAILED', 'SUPPORT_NOTICE_DRAFT_REVISION_CONFLICT')
}
