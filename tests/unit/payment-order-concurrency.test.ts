import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import {
  PaymentOrderConflictError,
  PaymentOrderImmutableFieldError,
  PaymentOrderTransitionError,
  canTransitionPaymentOrder,
  hasApprovalEvidence,
  getPaymentOrder,
  getPaymentStorageMode,
  mutatePaymentOrder,
  savePaymentOrder,
  updatePaymentOrder,
  type PaymentOrder,
} from '../../src/payment/order-store.js'

const BASE: Omit<PaymentOrder, 'orderId'> = {
  ownerId: 'owner-1',
  buyerEmail: 'buyer@synthetic.invalid',
  buyerTel: '00000000000',
  productKey: 'wedding_day',
  productTitle: '결혼 택일',
  amount: 24900,
  status: 'ready',
  createdAt: '2026-09-11T00:00:00.000Z',
  updatedAt: '2026-09-11T00:00:00.000Z',
}

let counter = 0
async function seed(status: PaymentOrder['status'] = 'ready'): Promise<PaymentOrder> {
  counter += 1
  return savePaymentOrder({ ...BASE, orderId: `order-${counter}`, status })
}

describe('[TASK] 주문 상태 직렬화 (U17)', () => {
  beforeEach(() => {
    assert.equal(getPaymentStorageMode(), 'memory', '이 스위트는 메모리 저장소에서만 의미가 있다')
  })

  describe('보안', () => {
    it('승인된 주문을 실패로 덮지 않는다', async () => {
      // 이니시스 콜백은 승인 **뒤에** 오류가 나면 catch 에서 주문을 failed 로 적는다
      // (`src/server/app.ts` 결제 승인 흐름). 가드가 없으면 **실제로 돈이 빠져나간 주문이
      // 실패로 기록된다.** 이것이 U17 을 P0 으로 만든 이유다.
      const order = await seed('paid')
      await assert.rejects(
        () => updatePaymentOrder(order.orderId, { status: 'failed', message: '뒤늦은 오류' }),
        PaymentOrderTransitionError,
      )
      const after = await getPaymentOrder(order.orderId)
      assert.equal(after?.status, 'paid', '승인 기록이 지워졌다')
      assert.equal(after?.message, undefined, '실패 문구가 섞여 들어갔다')
    })

    it('열람한 주문을 되돌리지 않는다', async () => {
      // `cancelled` 는 제외한다 — 환불·취소는 열람 뒤에도 일어나는 정상 전이다.
      const order = await seed('viewed')
      for (const status of ['ready', 'approving', 'paid', 'failed'] as const) {
        await assert.rejects(() => updatePaymentOrder(order.orderId, { status }), PaymentOrderTransitionError)
      }
      assert.equal((await getPaymentOrder(order.orderId))?.status, 'viewed')
    })

    it('종료된 주문을 다시 열지 않는다', async () => {
      for (const terminal of ['failed', 'cancelled'] as const) {
        const order = await seed(terminal)
        await assert.rejects(() => updatePaymentOrder(order.orderId, { status: 'paid' }), PaymentOrderTransitionError)
        assert.equal((await getPaymentOrder(order.orderId))?.status, terminal)
      }
    })
  })

  describe('정상 동작', () => {
    it('정상 결제 흐름은 그대로 진행된다', async () => {
      const order = await seed('ready')
      assert.ok(await updatePaymentOrder(order.orderId, { status: 'approving' }))
      assert.ok(await updatePaymentOrder(order.orderId, { status: 'paid', tid: 'TID-1' }))
      const viewed = await updatePaymentOrder(order.orderId, { status: 'viewed' })
      assert.equal(viewed?.status, 'viewed')
      assert.equal(viewed?.tid, 'TID-1')
    })

    it('같은 상태를 다시 적어도 실패하지 않는다', async () => {
      // 결제사 콜백은 재전송된다. 재전송이 오류가 되면 그쪽이 계속 재시도한다.
      const order = await seed('paid')
      const again = await updatePaymentOrder(order.orderId, { status: 'paid', tid: 'TID-1' })
      assert.equal(again?.status, 'paid')
      assert.equal(again?.tid, 'TID-1')
    })

    it('쓰기마다 revision 이 올라간다', async () => {
      const order = await seed('ready')
      assert.equal(order.revision ?? 0, 0)
      const approving = await updatePaymentOrder(order.orderId, { status: 'approving' })
      assert.equal(approving?.revision, 1)
      const paid = await updatePaymentOrder(order.orderId, { status: 'paid' })
      assert.equal(paid?.revision, 2)
    })

    it('없는 주문은 null 이다', async () => {
      assert.equal(await updatePaymentOrder('order-does-not-exist', { status: 'paid' }), null)
    })
  })

  describe('경계값', () => {
    it('동시 갱신이 서로를 덮지 않는다', async () => {
      // 이전 구현은 읽고-고쳐-쓰기였다. 둘이 겹치면 나중 쓰기가 앞선 것을 통째로 덮는다.
      const order = await seed('ready')

      // 두 요청이 같은 판을 읽은 상태에서 각각 다른 필드를 쓴다.
      const [first, second] = await Promise.all([
        mutatePaymentOrder(order.orderId, () => ({ status: 'approving' as const })),
        mutatePaymentOrder(order.orderId, () => ({ payMethod: 'CARD' })),
      ])

      const final = await getPaymentOrder(order.orderId)
      assert.equal(final?.status, 'approving', '상태 변경이 사라졌다')
      assert.equal(final?.payMethod, 'CARD', '결제수단 변경이 사라졌다')
      assert.equal(final?.revision, 2, `두 쓰기가 모두 반영되면 revision 은 2 다 (실제 ${final?.revision})`)
      assert.ok(first && second)
    })

    it('여러 요청이 동시에 승인해도 한 번만 반영된다', async () => {
      const order = await seed('ready')
      const results = await Promise.allSettled(
        Array.from({ length: 5 }, (_, index) =>
          mutatePaymentOrder(order.orderId, () => ({ status: 'paid' as const, tid: `TID-${index}` })),
        ),
      )
      assert.equal(results.filter((r) => r.status === 'fulfilled').length, 5, '경합이 오류로 새어 나갔다')

      const final = await getPaymentOrder(order.orderId)
      assert.equal(final?.status, 'paid')
      assert.equal(final?.revision, 5, '다섯 번의 쓰기가 모두 직렬화돼야 한다')
    })

    it('mutate 는 최신 판을 보고 판단한다', async () => {
      // 재시도할 때 낡은 판으로 다시 계산하면 같은 실수를 반복한다.
      const order = await seed('ready')
      await updatePaymentOrder(order.orderId, { status: 'paid' })

      const seen: string[] = []
      await assert.rejects(
        () => mutatePaymentOrder(order.orderId, (current) => {
          seen.push(current.status)
          return { status: 'failed' as const }
        }),
        PaymentOrderTransitionError,
      )
      assert.deepEqual(seen, ['paid'], 'mutate 가 낡은 상태를 봤다')
    })
  })

  describe('승인 증거가 있는 주문 (U22)', () => {
    it('승인 증거가 있으면 실패로 적지 못한다', async () => {
      // `approveInicisPayment` 가 돌아온 시점에 이미 돈이 움직였다. 그 사실을 먼저
      // 저장하면 주문은 `approving` + `tid` 가 되고, 그 조합은 실패가 아니다.
      const order = await seed('approving')
      await updatePaymentOrder(order.orderId, { tid: 'TID-APPROVED' })

      await assert.rejects(
        () => updatePaymentOrder(order.orderId, { status: 'failed', message: '저장 실패 후 catch' }),
        PaymentOrderTransitionError,
      )
      const after = await getPaymentOrder(order.orderId)
      assert.equal(after?.status, 'approving', '불확정 상태가 실패로 덮였다')
      assert.equal(after?.tid, 'TID-APPROVED', '승인 증거가 지워졌다')
    })

    it('증거 없는 승인 시도는 실패로 적을 수 있다', async () => {
      // 승인 요청 자체가 거부된 경우다. 이때 `failed` 는 사실이다.
      const order = await seed('approving')
      const failed = await updatePaymentOrder(order.orderId, { status: 'failed', message: '승인 거부' })
      assert.equal(failed?.status, 'failed')
    })

    it('같은 쓰기가 증거와 실패를 함께 넣어도 막는다', async () => {
      // 증거를 현재 저장분만 보면, 한 번에 tid + failed 를 쓰는 경로로 우회된다.
      const order = await seed('approving')
      await assert.rejects(
        () => updatePaymentOrder(order.orderId, { status: 'failed', tid: 'TID-LATE' }),
        PaymentOrderTransitionError,
      )
      assert.equal((await getPaymentOrder(order.orderId))?.status, 'approving')
    })

    it('불확정 주문은 정산으로 수렴한다', async () => {
      const order = await seed('approving')
      await updatePaymentOrder(order.orderId, { tid: 'TID-APPROVED', approvalCode: 'A-1' })
      const settled = await updatePaymentOrder(order.orderId, { status: 'paid' })
      assert.equal(settled?.status, 'paid')
      assert.equal(settled?.tid, 'TID-APPROVED')
    })

    it('승인 증거 판정은 tid 와 승인번호 둘 다 본다', () => {
      assert.equal(hasApprovalEvidence({ tid: 'TID-1' }), true)
      assert.equal(hasApprovalEvidence({ approvalCode: 'A-1' }), true)
      assert.equal(hasApprovalEvidence({}), false)
      assert.equal(hasApprovalEvidence({ tid: '   ' }), false, '공백만 있는 값은 증거가 아니다')
      assert.equal(canTransitionPaymentOrder('approving', 'failed'), true)
      assert.equal(canTransitionPaymentOrder('approving', 'failed', { tid: 'TID-1' }), false)
    })
  })

  describe('금액 불변 (U21)', () => {
    it('금액을 바꾸려는 갱신을 거부한다', async () => {
      // 이전 구현은 갱신에도 행 전체를 보냈고 REST 는 merge-duplicates 로 upsert 했다.
      // 금액이 매번 갱신 본문에 실렸고, 값이 같았던 것은 관례였을 뿐 규칙이 아니었다.
      const order = await seed('ready')
      await assert.rejects(
        () => updatePaymentOrder(order.orderId, { amount: 9900 }),
        (error: unknown) => {
          assert.ok(error instanceof PaymentOrderImmutableFieldError)
          assert.equal(error.field, 'amount')
          return true
        },
      )
      assert.equal((await getPaymentOrder(order.orderId))?.amount, 24900, '금액이 바뀌었다')
    })

    it('상품 키도 바꾸지 못한다', async () => {
      const order = await seed('ready')
      await assert.rejects(
        () => updatePaymentOrder(order.orderId, { productKey: 'love_mind' }),
        PaymentOrderImmutableFieldError,
      )
    })

    it('같은 금액을 다시 적는 것은 통과한다', async () => {
      // 콜백 재전송이 같은 값을 실어 오는 경우를 오류로 만들면 그쪽이 계속 재시도한다.
      const order = await seed('ready')
      const updated = await updatePaymentOrder(order.orderId, { amount: 24900, status: 'approving' })
      assert.equal(updated?.status, 'approving')
      assert.equal(updated?.amount, 24900)
    })

    it('상태 전이와 금액 변경이 함께 오면 둘 다 적용되지 않는다', async () => {
      const order = await seed('ready')
      await assert.rejects(
        () => updatePaymentOrder(order.orderId, { status: 'paid', amount: 1 }),
        PaymentOrderImmutableFieldError,
      )
      const after = await getPaymentOrder(order.orderId)
      assert.equal(after?.status, 'ready', '거부된 갱신의 상태가 반영됐다')
      assert.equal(after?.amount, 24900)
    })
  })

  describe('에러 처리', () => {
    it('전이 오류와 경합 오류를 구분한다', () => {
      // 경합은 다시 시도하면 되지만 전이 거부는 규칙 위반이라 재시도해도 같다.
      assert.notEqual(PaymentOrderTransitionError, PaymentOrderConflictError)
      assert.equal(canTransitionPaymentOrder('paid', 'failed'), false)
      assert.equal(canTransitionPaymentOrder('paid', 'viewed'), true)
      // 환불·취소는 결제 뒤에 일어나는 정상 전이다 (관리자 환불 실행 경로).
      assert.equal(canTransitionPaymentOrder('paid', 'cancelled'), true)
      assert.equal(canTransitionPaymentOrder('viewed', 'cancelled'), true)
      assert.equal(canTransitionPaymentOrder('ready', 'paid'), true)
      assert.equal(canTransitionPaymentOrder('approving', 'failed'), true)
    })

    it('전이 오류가 어느 주문의 어떤 전이인지 알려 준다', async () => {
      const order = await seed('paid')
      await assert.rejects(
        () => updatePaymentOrder(order.orderId, { status: 'failed' }),
        (error: unknown) => {
          assert.ok(error instanceof PaymentOrderTransitionError)
          assert.equal(error.orderId, order.orderId)
          assert.equal(error.from, 'paid')
          assert.equal(error.to, 'failed')
          return true
        },
      )
    })
  })
})
