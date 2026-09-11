import { configuredEnv } from '../env/load.js'

type RestRow = Record<string, unknown>

export type AdminMemberSummary = {
  memberId: string
  name: string
  createdAt: string
  updatedAt: string
}

export type AdminReportSummary = {
  reportId: string
  member: string
  serviceKey: string
  status: string
  createdAt: string
  updatedAt: string
}

const supabaseUrl = configuredEnv(process.env.SUPABASE_URL)?.replace(/\/$/, '')
const serviceRoleKey = configuredEnv(process.env.SUPABASE_SERVICE_ROLE_KEY)

function serviceHeaders(): Record<string, string> {
  if (!serviceRoleKey) throw new Error('LIVE_DATA_STORE_UNAVAILABLE')
  const headers: Record<string, string> = { apikey: serviceRoleKey }
  if (!serviceRoleKey.startsWith('sb_secret_') && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(serviceRoleKey)) {
    headers.authorization = `Bearer ${serviceRoleKey}`
  }
  return headers
}

function tableUrl(table: string): string {
  if (!supabaseUrl) throw new Error('LIVE_DATA_STORE_UNAVAILABLE')
  return `${supabaseUrl}/rest/v1/${table}`
}

async function countRows(table: string, key: string): Promise<number> {
  const url = new URL(tableUrl(table))
  url.searchParams.set('select', key)
  url.searchParams.set('limit', '1')
  const response = await fetch(url, { headers: { ...serviceHeaders(), prefer: 'count=exact' } })
  if (!response.ok) throw new Error('LIVE_DATA_COUNT_FAILED')
  const total = response.headers.get('content-range')?.split('/')[1]
  if (total && /^\d+$/.test(total)) return Number(total)
  return (await response.json() as unknown[]).length
}

function clipped(value: unknown, fallback: string): string {
  const text = typeof value === 'string' ? value.trim() : ''
  return text ? text.slice(0, 120) : fallback
}

function maskIdentifier(value: unknown): string {
  const text = clipped(value, '')
  if (!text) return '연결되지 않음'
  return text.length <= 8 ? `${text.slice(0, 2)}•••` : `${text.slice(0, 6)}••••`
}

function maskName(value: unknown): string {
  const text = clipped(value, '')
  if (!text) return '이름 미등록'
  return text.length === 1 ? '•' : `${text.slice(0, 1)}•`
}

function maskEmail(value: unknown): string {
  const email = clipped(value, '')
  const at = email.indexOf('@')
  if (at <= 0) return maskIdentifier(email)
  return `${email.slice(0, 1)}•••${email.slice(at)}`
}

function reportServiceKey(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '기록 없음'
  const context = (payload as Record<string, unknown>).context
  return context && typeof context === 'object'
    ? clipped((context as Record<string, unknown>).serviceKey, '기록 없음')
    : '기록 없음'
}

export async function listLiveMembers(limit = 100): Promise<AdminMemberSummary[]> {
  const url = new URL(tableUrl('cheongi_user_profiles'))
  url.searchParams.set('select', 'user_id,name,created_at,updated_at')
  url.searchParams.set('order', 'updated_at.desc')
  url.searchParams.set('limit', String(Math.min(Math.max(limit, 1), 100)))
  const response = await fetch(url, { headers: serviceHeaders() })
  if (!response.ok) throw new Error('LIVE_MEMBER_LOOKUP_FAILED')
  return (await response.json() as RestRow[]).map((row) => ({
    memberId: maskIdentifier(row.user_id),
    name: maskName(row.name),
    createdAt: clipped(row.created_at, ''),
    updatedAt: clipped(row.updated_at, ''),
  }))
}

export function countLiveMembers(): Promise<number> {
  return countRows('cheongi_user_profiles', 'user_id')
}

export async function listLiveReports(limit = 100): Promise<AdminReportSummary[]> {
  const url = new URL(tableUrl('cheongi_reports'))
  url.searchParams.set('select', 'report_id,user_email,admin_status,payload,created_at,updated_at')
  url.searchParams.set('order', 'updated_at.desc')
  url.searchParams.set('limit', String(Math.min(Math.max(limit, 1), 100)))
  const response = await fetch(url, { headers: serviceHeaders() })
  if (!response.ok) throw new Error('LIVE_REPORT_LOOKUP_FAILED')
  return (await response.json() as RestRow[]).map((row) => ({
    reportId: maskIdentifier(row.report_id),
    member: maskEmail(row.user_email),
    serviceKey: reportServiceKey(row.payload),
    status: clipped(row.admin_status, 'new'),
    createdAt: clipped(row.created_at, ''),
    updatedAt: clipped(row.updated_at, ''),
  }))
}

export function countLiveReports(): Promise<number> {
  return countRows('cheongi_reports', 'report_id')
}
