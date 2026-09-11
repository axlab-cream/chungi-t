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
