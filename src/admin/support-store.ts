import { configuredEnv } from '../env/load.js'

type Row = Record<string, unknown>
const baseUrl = configuredEnv(process.env.SUPABASE_URL)?.replace(/\/$/, '')
const serviceKey = configuredEnv(process.env.SUPABASE_SERVICE_ROLE_KEY)

function table(name: string): string {
  if (!baseUrl || !serviceKey) throw new Error('SUPPORT_STORE_UNAVAILABLE')
  return `${baseUrl}/rest/v1/${name}`
}
function headers(): Record<string, string> {
  if (!serviceKey) throw new Error('SUPPORT_STORE_UNAVAILABLE')
  const result: Record<string, string> = { apikey: serviceKey }
  if (!serviceKey.startsWith('sb_secret_') && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(serviceKey)) result.authorization = `Bearer ${serviceKey}`
  return result
}

export const SUPPORT_CATEGORIES = ['payment', 'generation', 'interpretation', 'access', 'privacy', 'other'] as const
export const SUPPORT_STATUSES = ['received', 'triaged', 'assigned', 'investigating', 'awaiting_customer', 'resolved', 'closed', 'reopened'] as const
export const SUPPORT_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const
export const SUPPORT_NOTE_KINDS = ['internal', 'customer_reply_draft'] as const
export type SupportCategory = typeof SUPPORT_CATEGORIES[number]
export type SupportStatus = typeof SUPPORT_STATUSES[number]
export type SupportPriority = typeof SUPPORT_PRIORITIES[number]
export type SupportNoteKind = typeof SUPPORT_NOTE_KINDS[number]
export type SupportCase = { id: string; memberId: string | null; orderId: string | null; reportId: string | null; category: SupportCategory; status: SupportStatus; assigneeEmail: string | null; priority: SupportPriority; resolutionCode: string | null; revision: number; createdAt: string; updatedAt: string }
export type SupportNote = { id: string; caseId: string; author: string; kind: SupportNoteKind; text: string; createdAt: string }

function supportCase(row: Row): SupportCase {
  return { id: String(row.id), memberId: row.member_id ? String(row.member_id) : null, orderId: row.order_id ? String(row.order_id) : null, reportId: row.report_id ? String(row.report_id) : null, category: String(row.category) as SupportCategory, status: String(row.status) as SupportStatus, assigneeEmail: row.assignee_email ? String(row.assignee_email) : null, priority: String(row.priority) as SupportPriority, resolutionCode: row.resolution_code ? String(row.resolution_code) : null, revision: Number(row.revision), createdAt: String(row.created_at), updatedAt: String(row.updated_at) }
}
function note(row: Row): SupportNote { return { id: String(row.id), caseId: String(row.case_id), author: String(row.author_email), kind: String(row.kind) as SupportNoteKind, text: String(row.text), createdAt: String(row.created_at) } }

export async function listSupportCases(): Promise<SupportCase[]> {
  const request = new URL(table('support_cases')); request.searchParams.set('select', 'id,member_id,order_id,report_id,category,status,assignee_email,priority,resolution_code,revision,created_at,updated_at'); request.searchParams.set('order', 'updated_at.desc'); request.searchParams.set('limit', '100')
  const response = await fetch(request, { headers: headers() }); if (!response.ok) throw new Error('SUPPORT_CASE_LOOKUP_FAILED')
  return (await response.json() as Row[]).map(supportCase)
}
export async function createSupportCase(input: { category: SupportCategory; priority: SupportPriority; memberId?: string; orderId?: string; reportId?: string; actorEmail: string }): Promise<SupportCase> {
  const response = await fetch(table('support_cases'), { method: 'POST', headers: { ...headers(), 'content-type': 'application/json', prefer: 'return=representation' }, body: JSON.stringify({ category: input.category, priority: input.priority, member_id: input.memberId || null, order_id: input.orderId || null, report_id: input.reportId || null, created_by_email: input.actorEmail.toLowerCase() }) })
  if (!response.ok) throw new Error('SUPPORT_CASE_CREATE_FAILED'); const rows = await response.json() as Row[]; if (!rows[0]) throw new Error('SUPPORT_CASE_CREATE_FAILED'); return supportCase(rows[0])
}
export async function updateSupportCase(input: { id: string; expectedRevision: number; status: SupportStatus; priority: SupportPriority; assigneeEmail: string | null; resolutionCode: string | null }): Promise<SupportCase | null> {
  const request = new URL(table('support_cases')); request.searchParams.set('id', `eq.${input.id}`); request.searchParams.set('revision', `eq.${input.expectedRevision}`)
  const response = await fetch(request, { method: 'PATCH', headers: { ...headers(), 'content-type': 'application/json', prefer: 'return=representation' }, body: JSON.stringify({ status: input.status, priority: input.priority, assignee_email: input.assigneeEmail, resolution_code: input.resolutionCode, revision: input.expectedRevision + 1, updated_at: new Date().toISOString() }) })
  if (!response.ok) throw new Error('SUPPORT_CASE_UPDATE_FAILED'); const rows = await response.json() as Row[]; return rows[0] ? supportCase(rows[0]) : null
}
export async function listSupportNotes(caseId: string): Promise<SupportNote[]> {
  const request = new URL(table('support_notes')); request.searchParams.set('case_id', `eq.${caseId}`); request.searchParams.set('select', 'id,case_id,author_email,kind,text,created_at'); request.searchParams.set('order', 'created_at.asc')
  const response = await fetch(request, { headers: headers() }); if (!response.ok) throw new Error('SUPPORT_NOTE_LOOKUP_FAILED'); return (await response.json() as Row[]).map(note)
}
export async function createSupportNote(input: { caseId: string; kind: SupportNoteKind; text: string; actorEmail: string }): Promise<SupportNote> {
  const response = await fetch(table('support_notes'), { method: 'POST', headers: { ...headers(), 'content-type': 'application/json', prefer: 'return=representation' }, body: JSON.stringify({ case_id: input.caseId, kind: input.kind, text: input.text.trim(), author_email: input.actorEmail.toLowerCase() }) })
  if (!response.ok) throw new Error('SUPPORT_NOTE_CREATE_FAILED'); const rows = await response.json() as Row[]; if (!rows[0]) throw new Error('SUPPORT_NOTE_CREATE_FAILED'); return note(rows[0])
}
