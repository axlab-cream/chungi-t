import { randomUUID } from 'node:crypto'
import { configuredEnv } from '../env/load.js'

export type RefundState = 'requested' | 'approved' | 'processing' | 'succeeded' | 'failed' | 'unknown' | 'rejected'
export type RefundRequest = { id: string, orderId: string, amount: number, reason: string, state: RefundState, requestedByEmail: string, approvedByEmail?: string, idempotencyKey: string, revision: number, createdAt: string, updatedAt: string, approvedAt?: string }

const base = configuredEnv(process.env.SUPABASE_URL)?.replace(/\/$/, '')
const key = configuredEnv(process.env.SUPABASE_SERVICE_ROLE_KEY)
const testRequests = new Map<string, RefundRequest>()
let testMode = false

function canUseTestStore(): boolean { return process.env.NODE_ENV === 'test' || testMode }

function headers(): Record<string, string> {
  if (!base || !key) throw new Error('REFUND_STORE_UNAVAILABLE')
  const result: Record<string, string> = { apikey: key, 'content-type': 'application/json' }
  if (!key.startsWith('sb_secret_') && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)) result.authorization = `Bearer ${key}`
  return result
}
function fromRow(row: Record<string, unknown>): RefundRequest {
  return { id: String(row.id), orderId: String(row.order_id), amount: Number(row.amount), reason: String(row.reason), state: String(row.state) as RefundState, requestedByEmail: String(row.requested_by_email), approvedByEmail: row.approved_by_email ? String(row.approved_by_email) : undefined, idempotencyKey: String(row.idempotency_key), revision: Number(row.revision), createdAt: String(row.created_at), updatedAt: String(row.updated_at), approvedAt: row.approved_at ? String(row.approved_at) : undefined }
}
function valid(input: { orderId: string, amount: number, reason: string, actorEmail: string, idempotencyKey: string, orderAmount: number, orderRevision: number }) {
  if (!input.orderId.trim() || !Number.isSafeInteger(input.amount) || input.amount <= 0 || !Number.isSafeInteger(input.orderAmount) || input.orderAmount <= 0 || !Number.isInteger(input.orderRevision) || input.orderRevision < 0 || !input.reason.trim() || input.reason.trim().length > 240 || !/^\S+@\S+\.\S+$/.test(input.actorEmail) || input.idempotencyKey.trim().length < 8) throw new Error('REFUND_INPUT_INVALID')
}

export async function createRefundRequest(input: { orderId: string, amount: number, reason: string, actorEmail: string, idempotencyKey: string, orderAmount: number, orderRevision: number }): Promise<RefundRequest> {
  valid(input)
  const actorEmail = input.actorEmail.trim().toLowerCase(); const idempotencyKey = input.idempotencyKey.trim(); const reason = input.reason.trim()
  if (base && key) {
    const response = await fetch(`${base}/rest/v1/rpc/create_refund_request`, { method: 'POST', headers: headers(), body: JSON.stringify({ p_order_id: input.orderId, p_amount: input.amount, p_reason: reason, p_requested_by_email: actorEmail, p_idempotency_key: idempotencyKey, p_expected_order_revision: input.orderRevision }) })
    if (!response.ok) throw new Error(await response.text() || 'REFUND_REQUEST_CREATE_FAILED')
    return fromRow(await response.json() as Record<string, unknown>)
  }
  if (!canUseTestStore()) throw new Error('REFUND_STORE_UNAVAILABLE')
  const mapKey = `${actorEmail}:${idempotencyKey}`; const existing = testRequests.get(mapKey)
  if (existing) { if (existing.orderId !== input.orderId || existing.amount !== input.amount || existing.reason !== reason) throw new Error('REFUND_IDEMPOTENCY_CONFLICT'); return { ...existing } }
  const reserved = Array.from(testRequests.values()).filter((value) => value.orderId === input.orderId && ['requested', 'approved', 'processing', 'unknown', 'succeeded'].includes(value.state)).reduce((sum, value) => sum + value.amount, 0)
  if (input.amount > input.orderAmount - reserved) throw new Error('REFUND_AMOUNT_EXCEEDS_REMAINING')
  const now = new Date().toISOString(); const result: RefundRequest = { id: `test-${randomUUID()}`, orderId: input.orderId, amount: input.amount, reason, state: 'requested', requestedByEmail: actorEmail, idempotencyKey, revision: 0, createdAt: now, updatedAt: now }
  testRequests.set(mapKey, result); return { ...result }
}

export async function approveRefundRequest(input: { refundId: string, actorEmail: string, expectedRevision: number }): Promise<RefundRequest> {
  if (!input.refundId || !/^\S+@\S+\.\S+$/.test(input.actorEmail) || !Number.isInteger(input.expectedRevision) || input.expectedRevision < 0) throw new Error('REFUND_INPUT_INVALID')
  const actorEmail = input.actorEmail.trim().toLowerCase()
  if (base && key) {
    const response = await fetch(`${base}/rest/v1/rpc/approve_refund_request`, { method: 'POST', headers: headers(), body: JSON.stringify({ p_refund_id: input.refundId, p_approved_by_email: actorEmail, p_expected_revision: input.expectedRevision }) })
    if (!response.ok) throw new Error(await response.text() || 'REFUND_APPROVE_FAILED')
    return fromRow(await response.json() as Record<string, unknown>)
  }
  if (!canUseTestStore()) throw new Error('REFUND_STORE_UNAVAILABLE')
  const found = Array.from(testRequests.entries()).find(([, value]) => value.id === input.refundId)
  if (!found) throw new Error('REFUND_NOT_FOUND'); const [mapKey, current] = found
  if (current.revision !== input.expectedRevision) throw new Error('REFUND_REVISION_CONFLICT')
  if (current.requestedByEmail === actorEmail) throw new Error('REFUND_SELF_APPROVAL_FORBIDDEN')
  if (current.state !== 'requested') throw new Error('REFUND_NOT_REQUESTED')
  const next = { ...current, state: 'approved' as const, approvedByEmail: actorEmail, approvedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), revision: current.revision + 1 }
  testRequests.set(mapKey, next); return { ...next }
}

export function resetRefundStoreForTests(): void { testMode = true; testRequests.clear() }
