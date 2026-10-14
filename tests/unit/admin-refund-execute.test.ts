import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'

/**
 * 2026-10-14: 관리자 환불이 이니시스 결제 취소까지 이어진다. 결제사 호출은 가짜 어댑터로 바꿔
 * 결과별(성공·이미 취소됨·거절·응답 없음)로 환불 기록과 주문 상태가 어떻게 남는지 확인한다.
 */
const previousEnv = { ...process.env }
process.env.NODE_ENV = 'test'
for (const name of Object.keys(process.env)) {
  if (/DATABASE|SUPABASE|INICIS|PAYMENT|VERCEL|REPORT_STORAGE/.test(name)) delete process.env[name]
}

const refunds = await import('../../src/payment/refund-store.js')
const { executeInicisRefund, refundUnsupportedReason } = await import('../../src/payment/inicis-refund.js')
const { INICIS_LIVE_API_BASE_URL, createInicisSandboxAdapter, formatInicisApiTimestamp } = await import('../../src/payment/inicis.js')
type PaymentOrder = import('../../src/payment/order-store.js').PaymentOrder
type CancelResult = Awaited<ReturnType<ReturnType<typeof createInicisSandboxAdapter>['cancel']>>

test.after(() => { Object.assign(process.env, previousEnv) })

function order(orderId: string, extra: Partial<PaymentOrder> = {}): PaymentOrder {
  return {
    orderId, ownerId: 'member-1', buyerEmail: 'buyer@synthetic.invalid', buyerTel: '01012345678',
    productKey: 'job_choice', productTitle: '직장 선택', amount: 9900, status: 'paid',
    tid: `tid-${orderId}`, payMethod: 'Card', createdAt: '', updatedAt: '', revision: 0, ...extra,
  }
}

async function processing(orderId: string) {
  const requested = await refunds.createRefundRequest({ orderId, amount: 9900, reason: 'customer_request: 고객 요청', actorEmail: 'staff@synthetic.invalid', idempotencyKey: `key-${orderId}`, orderAmount: 9900, orderRevision: 0 })
  return refunds.startRefundExecution({ refundId: requested.id, actorEmail: 'staff@synthetic.invalid', expectedRevision: requested.revision })
}

function run(target: PaymentOrder, cancel: () => Promise<CancelResult>) {
  const orderUpdates: string[] = []
  const deps = {
    adapter: () => ({ inquire: async () => { throw new Error('unused') }, cancel }),
    finish: refunds.finishRefundExecution,
    updateOrder: async (orderId: string, patch: { status?: string }) => { orderUpdates.push(`${orderId}:${patch.status}`); return { ...target, status: 'cancelled' as const } },
  }
  return { orderUpdates, deps }
}

const ok = (extra: Partial<CancelResult> = {}): CancelResult => ({ success: true, duplicate: false, terminal: true, resultCode: '00', resultMessage: '성공', raw: {}, ...extra })

test('이니시스 카드 결제만 취소 대상이다', () => {
  assert.equal(refundUnsupportedReason(order('a')), null)
  assert.equal(refundUnsupportedReason(order('b', { payMethod: 'GOOGLE_PLAY' })), 'REFUND_PROVIDER_UNSUPPORTED')
  assert.equal(refundUnsupportedReason(order('c', { payMethod: 'TEST' })), 'REFUND_PROVIDER_UNSUPPORTED')
  assert.equal(refundUnsupportedReason(order('d', { tid: undefined })), 'REFUND_TID_MISSING')
})

test('취소에 성공하면 환불은 succeeded, 주문은 cancelled 가 된다', async () => {
  const target = order('refund-ok')
  const refund = await processing(target.orderId)
  assert.equal(refund.state, 'processing')
  assert.equal(refund.approvedByEmail, 'staff@synthetic.invalid')
  const { orderUpdates, deps } = run(target, async () => ok())
  const result = await executeInicisRefund({ refund, order: target }, deps as never)
  assert.equal(result.outcome, 'succeeded')
  assert.equal(result.refund.state, 'succeeded')
  assert.deepEqual(orderUpdates, ['refund-ok:cancelled'])
})

test('이니시스 상점관리자에서 먼저 취소한 결제(500626)도 succeeded 로 맞춘다', async () => {
  const target = order('refund-dup')
  const refund = await processing(target.orderId)
  const { orderUpdates, deps } = run(target, async () => ok({ success: false, duplicate: true, resultCode: '500626' }))
  const result = await executeInicisRefund({ refund, order: target }, deps as never)
  assert.equal(result.outcome, 'succeeded')
  assert.match(result.message, /이미 취소/)
  assert.deepEqual(orderUpdates, ['refund-dup:cancelled'])
})

test('이니시스가 거절하면 failed 이고 주문은 그대로다', async () => {
  const target = order('refund-declined')
  const refund = await processing(target.orderId)
  const { orderUpdates, deps } = run(target, async () => ok({ success: false, terminal: false, resultCode: '01', resultMessage: '취소 불가 거래' }))
  const result = await executeInicisRefund({ refund, order: target }, deps as never)
  assert.equal(result.outcome, 'failed')
  assert.equal(result.refund.state, 'failed')
  assert.match(result.message, /취소 불가 거래/)
  assert.deepEqual(orderUpdates, [])
})

test('응답을 받지 못하면 unknown 으로 남기고 다시 보내지 않는다', async () => {
  const target = order('refund-timeout')
  const refund = await processing(target.orderId)
  let calls = 0
  const { orderUpdates, deps } = run(target, async () => { calls += 1; throw new Error('INICIS_SANDBOX_TIMEOUT') })
  const originalError = console.error
  console.error = () => {}
  try {
    const result = await executeInicisRefund({ refund, order: target }, deps as never)
    assert.equal(result.outcome, 'unknown')
    assert.equal(result.refund.state, 'unknown')
  } finally { console.error = originalError }
  assert.equal(calls, 1)
  assert.deepEqual(orderUpdates, [])
})

test('같은 환불을 두 번 실행 상태로 잠글 수 없다(결제사 호출은 한 번)', async () => {
  const requested = await refunds.createRefundRequest({ orderId: 'refund-twice', amount: 9900, reason: 'other: 테스트', actorEmail: 'staff@synthetic.invalid', idempotencyKey: 'key-refund-twice', orderAmount: 9900, orderRevision: 0 })
  await refunds.startRefundExecution({ refundId: requested.id, actorEmail: 'staff@synthetic.invalid', expectedRevision: requested.revision })
  await assert.rejects(() => refunds.startRefundExecution({ refundId: requested.id, actorEmail: 'staff@synthetic.invalid', expectedRevision: requested.revision }), /REFUND_NOT_REQUESTED/)
  await assert.rejects(() => refunds.startRefundExecution({ refundId: requested.id, actorEmail: 'other@synthetic.invalid', expectedRevision: requested.revision + 1 }), /REFUND_NOT_REQUESTED/)
})

test('요청한 관리자가 직접 실행할 수 있다(한 사람 처리)', async () => {
  const refund = await processing('refund-self')
  assert.equal(refund.requestedByEmail, refund.approvedByEmail)
})

test('운영 INIAPI 전체취소 주소와 해시 규칙으로 요청한다', async () => {
  const now = new Date('2026-10-14T07:00:00Z')
  let called = ''
  let sent: Record<string, unknown> = {}
  const adapter = createInicisSandboxAdapter({
    mid: 'testmid', iniApiKey: 'test-iniapi-key', clientIp: '10.0.0.1', baseUrl: INICIS_LIVE_API_BASE_URL, now: () => now,
    transport: async ({ url, init }) => { called = url; sent = JSON.parse(String(init.body)); return Response.json({ resultCode: '00', resultMsg: '정상처리' }) },
  })
  const result = await adapter.cancel({ tid: 'INIAPI-TID', reason: '고객 요청' })
  assert.equal(called, 'https://iniapi.inicis.com/v2/pg/refund')
  assert.equal(result.success, true)
  const timestamp = formatInicisApiTimestamp(now)
  const data = JSON.stringify({ tid: 'INIAPI-TID', msg: '고객 요청' })
  assert.equal(sent.hashData, createHash('sha512').update(`test-iniapi-keytestmidrefund${timestamp}${data}`).digest('hex'))
  assert.equal(sent.type, 'refund')
  assert.equal(sent.clientIp, '10.0.0.1')
})
