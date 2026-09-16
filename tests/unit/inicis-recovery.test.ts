import assert from 'node:assert/strict'
import test from 'node:test'
import { recoverInicisPostApprovalFailure } from '../../src/payment/inicis-recovery.js'
import type { PaymentOrder } from '../../src/payment/order-store.js'

const order = { orderId: 'order-recovery', ownerId: 'owner-1', buyerEmail: 'buyer@synthetic.invalid', buyerTel: '01012345678', productKey: 'home_pungsu', productTitle: '집 풍수', amount: 19900, status: 'approving', createdAt: '', updatedAt: '' } as PaymentOrder
const cancellation = { mode: 'pc' as const, order, idcName: 'fc', authToken: 'auth-token', cancelUrl: 'https://fcstdpay.inicis.com/stdpay/netCancel' }

test('승인 후 저장 실패에서 망취소·취소 원장·cancelled 상태를 순서대로 기록한다', async () => {
  const steps: string[] = []
  const result = await recoverInicisPostApprovalFailure({ order, sourceRef: 'approved-tid', cancellation }, {
    cancel: async () => { steps.push('provider:net-cancel'); return { success: true, resultCode: '0000', resultMessage: 'ok', raw: {} } },
    record: async (input) => { steps.push(`event:${input.sourceRef}`); return { id: 'event-1', orderId: input.orderId, kind: 'payment_net_cancelled', provider: input.provider, sourceRef: input.sourceRef, amount: input.amount, occurredAt: '', createdAt: '' } },
    update: async (_orderId, patch) => { steps.push(`order:${patch.status}`); return { ...order, ...patch } },
  })
  assert.deepEqual(steps, ['provider:net-cancel', 'event:approved-tid', 'order:cancelled'])
  assert.equal(result.status, 'cancelled')
})

test('망취소 결과가 불확실하면 과금 가능 주문을 failed로 내리지 않는다', async () => {
  const statuses: string[] = []
  const result = await recoverInicisPostApprovalFailure({ order, sourceRef: 'approved-tid', cancellation }, {
    cancel: async () => ({ success: false, resultCode: 'UNKNOWN', resultMessage: 'timeout', raw: {} }),
    record: async () => { throw new Error('must not record') },
    update: async (_orderId, patch) => { statuses.push(String(patch.status)); return { ...order, ...patch } },
  })
  assert.deepEqual(statuses, ['approving'])
  assert.equal(result.status, 'approving')
})
