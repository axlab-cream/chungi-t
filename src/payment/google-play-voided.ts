/**
 * 구글플레이에서 환불·취소된 결제를 주문에 반영한다.
 *
 * 사용자가 Play 에서 환불을 받으면 돈은 돌아가지만 우리 주문은 그대로 "결제됨"으로 남아
 * 리포트가 계속 열려 있었다. 구글의 환불 목록을 주기적으로 읽어 같은 결제 토큰을 가진
 * 주문을 취소로 바꾼다. 리포트·질문권 열람은 모두 paid/viewed 주문만 보므로 취소로 바꾸면
 * 열람도 함께 닫힌다.
 *
 * 같은 환불을 여러 번 읽어도 결과가 같다. 이미 취소된 주문은 건드리지 않는다.
 */
import { listGooglePlayVoidedPurchases, type GooglePlayVoidedPurchase } from './google-play.js'
import { findPaymentOrderByTid, mutatePaymentOrder, type PaymentOrder } from './order-store.js'

/** 몇 번 건너뛰어도 놓치지 않도록 넉넉히 거슬러 읽는다. 구글 기본 조회 범위는 30일이다. */
export const VOIDED_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000

/** 환불 목록 API 는 하루 호출 한도가 있다. 매분 도는 cron 에서 이 간격마다만 부른다. */
export const VOIDED_SYNC_INTERVAL_MINUTES = 10

export const VOIDED_ORDER_MESSAGE = '구글플레이에서 환불 또는 취소된 결제입니다.'

type VoidedSyncDependencies = {
  list: (params: { startTimeMillis: number }) => Promise<GooglePlayVoidedPurchase[]>
  findByTid: (tid: string) => Promise<PaymentOrder | null>
  mutate: typeof mutatePaymentOrder
  now: () => number
}

const runtimeDependencies: VoidedSyncDependencies = {
  list: (params) => listGooglePlayVoidedPurchases(params),
  findByTid: findPaymentOrderByTid,
  mutate: mutatePaymentOrder,
  now: () => Date.now(),
}

export function shouldSyncVoidedPurchases(at: Date): boolean {
  return at.getUTCMinutes() % VOIDED_SYNC_INTERVAL_MINUTES === 0
}

export async function syncGooglePlayVoidedPurchases(
  dependencies: VoidedSyncDependencies = runtimeDependencies,
): Promise<{ checked: number; cancelled: string[] }> {
  const voided = await dependencies.list({ startTimeMillis: dependencies.now() - VOIDED_LOOKBACK_MS })
  const cancelled: string[] = []
  for (const item of voided) {
    const order = await dependencies.findByTid(item.purchaseToken)
    if (!order || (order.status !== 'paid' && order.status !== 'viewed')) continue
    const saved = await dependencies.mutate(order.orderId, (current) => (
      current.status === 'paid' || current.status === 'viewed'
        ? { status: 'cancelled', message: VOIDED_ORDER_MESSAGE }
        : {}
    ))
    if (saved?.status === 'cancelled') cancelled.push(order.orderId)
  }
  return { checked: voided.length, cancelled }
}
