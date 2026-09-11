import assert from 'node:assert/strict'
import test from 'node:test'
import { approveRefundRequest, createRefundRequest, getRefundRequest, listRefundRequests, resetRefundStoreForTests } from '../../src/payment/refund-store.js'

test.beforeEach(() => { resetRefundStoreForTests() })
const base = { orderId: 'ORDER-1', reason: '중복 결제', actorEmail: 'requester@example.com', idempotencyKey: 'refund-key-001', orderAmount: 19900, orderRevision: 3 }

test('같은 키·같은 환불 요청은 단일 intent를 반환하고 다른 금액은 거절한다', async () => {
  const first = await createRefundRequest({ ...base, amount: 9900 }); const replay = await createRefundRequest({ ...base, amount: 9900 })
  assert.equal(first.id, replay.id); await assert.rejects(createRefundRequest({ ...base, amount: 10000 }), /REFUND_IDEMPOTENCY_CONFLICT/)
})
test('활성 refund 예약 합계는 주문 금액을 초과할 수 없다', async () => {
  await createRefundRequest({ ...base, amount: 15000 }); await assert.rejects(createRefundRequest({ ...base, actorEmail: 'other@example.com', idempotencyKey: 'refund-key-002', amount: 5000 }), /REFUND_AMOUNT_EXCEEDS_REMAINING/)
})
test('요청자 자기승인은 거절되고 별도 직원만 승인할 수 있다', async () => {
  const requested = await createRefundRequest({ ...base, amount: 9900 }); await assert.rejects(approveRefundRequest({ refundId: requested.id, actorEmail: base.actorEmail, expectedRevision: 0 }), /REFUND_SELF_APPROVAL_FORBIDDEN/)
  const approved = await approveRefundRequest({ refundId: requested.id, actorEmail: 'approver@example.com', expectedRevision: 0 }); assert.equal(approved.state, 'approved'); assert.equal(approved.revision, 1)
})

test('환불 조회는 실제 요청 원천을 최신 변경 순으로 반환하고 없는 ID는 null이다', async () => {
  const first = await createRefundRequest({ ...base, amount: 4000 })
  const second = await createRefundRequest({ ...base, actorEmail: 'other@example.com', idempotencyKey: 'refund-key-002', amount: 5000 })
  const listed = await listRefundRequests()
  assert.deepEqual(listed.map((item) => item.id), [second.id, first.id])
  assert.equal((await getRefundRequest(first.id))?.amount, 4000)
  assert.equal(await getRefundRequest('missing-refund'), null)
})
