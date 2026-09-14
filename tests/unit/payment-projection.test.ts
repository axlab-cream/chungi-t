import assert from 'node:assert/strict'
import test from 'node:test'
import { projectApprovedPayment } from '../../src/payment/payment-projection.js'

test('승인 증거를 먼저 기록한 뒤에만 주문을 paid로 투영한다', async () => {
  const steps: string[] = []
  const order = { orderId: 'order-a', ownerId: 'owner-a', buyerEmail: 'buyer@synthetic.invalid', buyerTel: '01000000000', productKey: 'wedding_day', productTitle: '합성 주문', amount: 24900, status: 'approving', createdAt: '2026-09-11T00:00:00.000Z', updatedAt: '2026-09-11T00:00:00.000Z' } as const
  const projected = await projectApprovedPayment(order, { provider: 'inicis', sourceRef: 'tid-a', tid: 'tid-a', approvalCode: 'approval-a' }, {
    record: async (input) => { steps.push(`event:${input.provider}:${input.sourceRef}`); return { id: 'event-a', orderId: input.orderId, kind: 'payment_approved', provider: input.provider, sourceRef: input.sourceRef, amount: input.amount, occurredAt: '', createdAt: '' } },
    update: async (_orderId, patch) => { steps.push(`order:${patch.status}`); return { ...order, ...patch } },
  })
  assert.deepEqual(steps, ['event:inicis:tid-a', 'order:paid'])
  assert.equal(projected?.status, 'paid')
})
