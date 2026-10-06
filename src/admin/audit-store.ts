import { configuredEnv } from '../env/load.js'
import type { AdminCommandStore, AdminCommandInput, CommandReceipt } from './admin-command.js'

type Row = Record<string, unknown>
const url = configuredEnv(process.env.SUPABASE_URL)?.replace(/\/$/, '')
const key = configuredEnv(process.env.SUPABASE_SERVICE_ROLE_KEY)

function table(name: string): string {
  if (!url) throw new Error('ADMIN_AUDIT_STORE_UNAVAILABLE')
  return `${url}/rest/v1/${name}`
}

function headers(): Record<string, string> {
  if (!key) throw new Error('ADMIN_AUDIT_STORE_UNAVAILABLE')
  const result: Record<string, string> = { apikey: key }
  if (!key.startsWith('sb_secret_') && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)) result.authorization = `Bearer ${key}`
  return result
}

function maskedEmail(value: unknown): string {
  const email = String(value ?? '').trim()
  const at = email.indexOf('@')
  return at > 0 ? `${email.slice(0, 1)}•••${email.slice(at)}` : '미기록'
}

export type AdminAuditSummary = { id: string; actor: string; action: string; targetType: string; targetId: string; result: string; createdAt: string }

export async function listAdminAuditEvents(limit = 100): Promise<AdminAuditSummary[]> {
  const request = new URL(table('admin_audit_events'))
  request.searchParams.set('select', 'id,actor_email,action,target_type,target_id,result,created_at')
  request.searchParams.set('order', 'created_at.desc')
  request.searchParams.set('limit', String(Math.min(Math.max(limit, 1), 100)))
  const response = await fetch(request, { headers: headers() })
  if (!response.ok) throw new Error('ADMIN_AUDIT_LOOKUP_FAILED')
  return (await response.json() as Row[]).map((row) => ({
    id: String(row.id), actor: maskedEmail(row.actor_email), action: String(row.action), targetType: String(row.target_type), targetId: String(row.target_id), result: String(row.result), createdAt: String(row.created_at),
  }))
}

export type AuditQuery = {
  /** 작업 이름 앞부분(영역). 예: 'member.', 'refund.' */
  area?: string
  /** 관리자 이메일 일부 */
  actor?: string
  from?: string
  to?: string
  /** 기본은 끝난 작업만. 'all' 이면 시작 기록까지 */
  result?: 'succeeded' | 'all'
  limit?: number
  offset?: number
}

const AUDIT_AREAS = new Set(['member.', 'refund.', 'report.', 'push.', 'coupon.', 'service.', 'content.', 'prompt.', 'support.', 'incident.', 'admin.', 'ops.'])

/**
 * 시스템 › 로그(2026-10 8단계). 영역·관리자·기간으로 거르고 거른 결과의 전체 수를 함께 준다.
 * 작업마다 시작·완료 두 줄이 쌓이므로 기본은 완료(succeeded)만 보여 준다.
 */
export async function searchAdminAuditEvents(query: AuditQuery = {}): Promise<{ events: AdminAuditSummary[]; total: number }> {
  const request = new URL(table('admin_audit_events'))
  request.searchParams.set('select', 'id,actor_email,action,target_type,target_id,result,created_at')
  request.searchParams.set('order', 'created_at.desc')
  const limit = Math.min(Math.max(Math.trunc(query.limit ?? 50) || 50, 1), 200)
  const offset = Math.max(Math.trunc(query.offset ?? 0) || 0, 0)
  request.searchParams.set('limit', String(limit))
  request.searchParams.set('offset', String(offset))
  if (query.area && AUDIT_AREAS.has(query.area)) request.searchParams.set('action', `like.${query.area}*`)
  const actor = (query.actor ?? '').trim().replace(/[(),*%\\:"']/g, '').slice(0, 80)
  if (actor) request.searchParams.set('actor_email', `ilike.*${actor}*`)
  if (query.result !== 'all') request.searchParams.set('result', 'eq.succeeded')
  if (query.from && Number.isFinite(Date.parse(query.from))) request.searchParams.append('created_at', `gte.${new Date(query.from).toISOString()}`)
  if (query.to && Number.isFinite(Date.parse(query.to))) request.searchParams.append('created_at', `lt.${new Date(query.to).toISOString()}`)
  const response = await fetch(request, { headers: { ...headers(), prefer: 'count=exact' } })
  if (!response.ok) throw new Error('ADMIN_AUDIT_LOOKUP_FAILED')
  const rows = await response.json() as Row[]
  const range = response.headers.get('content-range')?.split('/')[1]
  return {
    total: range && /^\d+$/.test(range) ? Number(range) : offset + rows.length,
    events: rows.map((row) => ({ id: String(row.id), actor: maskedEmail(row.actor_email), action: String(row.action), targetType: String(row.target_type), targetId: String(row.target_id), result: String(row.result), createdAt: String(row.created_at) })),
  }
}

export function postgrestAdminCommandStore(): AdminCommandStore {
  const receiptKey = (input: Pick<AdminCommandInput, 'actorEmail' | 'action' | 'idempotencyKey'>) => ({ actor_email: input.actorEmail.toLowerCase(), action: input.action, idempotency_key: input.idempotencyKey })
  return {
    async findReceipt(input): Promise<CommandReceipt | null> {
      const request = new URL(table('admin_command_receipts'))
      const rowKey = receiptKey(input)
      Object.entries(rowKey).forEach(([field, value]) => request.searchParams.set(field, `eq.${value}`))
      request.searchParams.set('select', 'request_digest,state,result'); request.searchParams.set('limit', '1')
      const response = await fetch(request, { headers: headers() }); if (!response.ok) throw new Error('ADMIN_COMMAND_LOOKUP_FAILED')
      const row = (await response.json() as Row[])[0]
      return row ? { requestDigest: String(row.request_digest), state: row.state === 'completed' ? 'completed' : 'processing', result: row.result } : null
    },
    async reserveReceipt(input): Promise<void> {
      const response = await fetch(table('admin_command_receipts'), { method: 'POST', headers: { ...headers(), 'content-type': 'application/json' }, body: JSON.stringify({ ...receiptKey(input), request_digest: input.requestDigest }) })
      if (!response.ok) throw new Error('ADMIN_COMMAND_RESERVE_FAILED')
    },
    async completeReceipt(input): Promise<void> {
      const request = new URL(table('admin_command_receipts')); Object.entries(receiptKey(input)).forEach(([field, value]) => request.searchParams.set(field, `eq.${value}`))
      const response = await fetch(request, { method: 'PATCH', headers: { ...headers(), 'content-type': 'application/json' }, body: JSON.stringify({ state: 'completed', result: input.result, updated_at: new Date().toISOString() }) })
      if (!response.ok) throw new Error('ADMIN_COMMAND_COMPLETE_FAILED')
    },
    async appendAuditEvent(input): Promise<void> {
      const response = await fetch(table('admin_audit_events'), { method: 'POST', headers: { ...headers(), 'content-type': 'application/json' }, body: JSON.stringify({ actor_email: input.actorEmail.toLowerCase(), action: input.action, target_type: input.target.type, target_id: input.target.id, result: input.result }) })
      if (!response.ok) throw new Error('ADMIN_AUDIT_APPEND_FAILED')
    },
  }
}
