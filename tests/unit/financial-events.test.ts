import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'

const previousEnv = { ...process.env }
process.env.SUPABASE_URL = 'https://financial-events.synthetic.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_synthetic_financial_events'
const calls: Array<{ url: URL; init?: RequestInit }> = []
const rows = new Map<string, Record<string, unknown>>()
const nativeFetch = globalThis.fetch
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  calls.push({ url, init })
  if (init?.method === 'POST') {
    const row = JSON.parse(String(init.body)) as Record<string, unknown>
    const key = `${row.provider}:${row.source_ref}`
    if (rows.has(key)) return Response.json([])
    const stored = { id: `event-${rows.size + 1}`, ...row, created_at: '2026-09-11T00:00:00.000Z' }
    rows.set(key, stored); return Response.json([stored])
  }
  const provider = url.searchParams.get('provider')?.slice(3) ?? ''
  const sourceRef = url.searchParams.get('source_ref')?.slice(3) ?? ''
  const row = rows.get(`${provider}:${sourceRef}`)
  return Response.json(row ? [row] : [])
}) as typeof fetch
const events = await import('../../src/payment/financial-events.js')
after(() => { globalThis.fetch = nativeFetch; for (const key of Object.keys(process.env)) if (!(key in previousEnv)) delete process.env[key]; Object.assign(process.env, previousEnv) })

describe('금융 이벤트 원장', { concurrency: false }, () => {
  it('승인 증거는 provider/source_ref당 한 번만 저장한다', async () => {
    rows.clear(); calls.length = 0
    const first = await events.recordApprovedFinancialEvent({ orderId: 'order-a', provider: 'inicis', sourceRef: 'tid-a', amount: 24900 })
    const replay = await events.recordApprovedFinancialEvent({ orderId: 'order-a', provider: 'inicis', sourceRef: 'tid-a', amount: 24900 })
    assert.equal(first.orderId, 'order-a'); assert.equal(replay.id, first.id)
    assert.equal(calls.filter(call => call.init?.method === 'POST').length, 2)
    const headers = new Headers(calls[0].init?.headers)
    assert.equal(headers.get('apikey'), process.env.SUPABASE_SERVICE_ROLE_KEY)
    assert.equal(headers.get('prefer'), 'resolution=ignore-duplicates,return=representation')
  })

  it('같은 결제 증거를 다른 주문이나 금액으로 재사용하지 못한다', async () => {
    rows.clear()
    await events.recordApprovedFinancialEvent({ orderId: 'order-a', provider: 'google_play', sourceRef: 'token-a', amount: 9900 })
    await assert.rejects(() => events.recordApprovedFinancialEvent({ orderId: 'order-b', provider: 'google_play', sourceRef: 'token-a', amount: 9900 }), /FINANCIAL_EVENT_SOURCE_CONFLICT/)
    await assert.rejects(() => events.recordApprovedFinancialEvent({ orderId: 'order-a', provider: 'google_play', sourceRef: 'token-a', amount: 4900 }), /FINANCIAL_EVENT_SOURCE_CONFLICT/)
  })
})
