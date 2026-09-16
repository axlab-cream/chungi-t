import { configuredEnv } from '../env/load.js'

export type FinancialEvent = {
  id: string
  orderId: string
  kind: 'payment_approved' | 'payment_net_cancelled'
  provider: string
  sourceRef: string
  amount: number
  occurredAt: string
  createdAt: string
}

const base = configuredEnv(process.env.SUPABASE_URL)?.replace(/\/$/, '')
const key = configuredEnv(process.env.SUPABASE_SERVICE_ROLE_KEY)
const testEvents = new Map<string, FinancialEvent>()

function headers(): Record<string, string> {
  if (!base || !key) throw new Error('FINANCIAL_EVENT_STORE_UNAVAILABLE')
  const result: Record<string, string> = { apikey: key, 'content-type': 'application/json' }
  if (!key.startsWith('sb_secret_') && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)) result.authorization = `Bearer ${key}`
  return result
}

function fromRow(row: Record<string, unknown>): FinancialEvent {
  return {
    id: String(row.id), orderId: String(row.order_id), kind: String(row.kind) as FinancialEvent['kind'], provider: String(row.provider),
    sourceRef: String(row.source_ref), amount: Number(row.amount), occurredAt: String(row.occurred_at), createdAt: String(row.created_at),
  }
}

type FinancialEventInput = { orderId: string; provider: string; sourceRef: string; amount: number }

async function recordFinancialEvent(kind: FinancialEvent['kind'], input: FinancialEventInput): Promise<FinancialEvent> {
  const orderId = input.orderId.trim(); const provider = input.provider.trim(); const sourceRef = input.sourceRef.trim()
  if (!orderId || !provider || !sourceRef || !Number.isSafeInteger(input.amount) || input.amount <= 0) throw new Error('FINANCIAL_EVENT_INPUT_INVALID')
  if (!base || !key) return recordTestEvent(kind, { orderId, provider, sourceRef, amount: input.amount })
  const row = { order_id: orderId, kind, provider, source_ref: sourceRef, amount: input.amount }
  const response = await fetch(`${base}/rest/v1/financial_events?on_conflict=provider,source_ref`, {
    method: 'POST', headers: { ...headers(), prefer: 'resolution=ignore-duplicates,return=representation' }, body: JSON.stringify(row),
  })
  if (!response.ok) throw new Error('FINANCIAL_EVENT_WRITE_FAILED')
  const inserted = await response.json() as Array<Record<string, unknown>>
  const event = inserted[0] ? fromRow(inserted[0]) : await findFinancialEvent(provider, sourceRef)
  if (!event || event.kind !== kind || event.orderId !== orderId || event.amount !== input.amount) throw new Error('FINANCIAL_EVENT_SOURCE_CONFLICT')
  return event
}

export function recordApprovedFinancialEvent(input: FinancialEventInput): Promise<FinancialEvent> {
  return recordFinancialEvent('payment_approved', input)
}

export function recordNetworkCancelledFinancialEvent(input: FinancialEventInput): Promise<FinancialEvent> {
  return recordFinancialEvent('payment_net_cancelled', { ...input, sourceRef: `netcancel:${input.sourceRef}` })
}

function recordTestEvent(kind: FinancialEvent['kind'], input: FinancialEventInput): FinancialEvent {
  if (process.env.NODE_ENV !== 'test') throw new Error('FINANCIAL_EVENT_STORE_UNAVAILABLE')
  const key = `${input.provider}:${input.sourceRef}`
  const existing = testEvents.get(key)
  if (existing) {
    if (existing.orderId !== input.orderId || existing.amount !== input.amount) throw new Error('FINANCIAL_EVENT_SOURCE_CONFLICT')
    return existing
  }
  const now = new Date().toISOString()
  const event: FinancialEvent = { id: `test-${testEvents.size + 1}`, orderId: input.orderId, kind, provider: input.provider, sourceRef: input.sourceRef, amount: input.amount, occurredAt: now, createdAt: now }
  testEvents.set(key, event)
  return event
}

async function findFinancialEvent(provider: string, sourceRef: string): Promise<FinancialEvent | null> {
  const url = new URL(`${base}/rest/v1/financial_events`)
  url.searchParams.set('provider', `eq.${provider}`); url.searchParams.set('source_ref', `eq.${sourceRef}`)
  url.searchParams.set('select', 'id,order_id,kind,provider,source_ref,amount,occurred_at,created_at'); url.searchParams.set('limit', '1')
  const response = await fetch(url, { headers: headers() })
  if (!response.ok) throw new Error('FINANCIAL_EVENT_LOOKUP_FAILED')
  const rows = await response.json() as Array<Record<string, unknown>>
  return rows[0] ? fromRow(rows[0]) : null
}
