import { cancelInicisApproval, type InicisCancellationContext } from './inicis.js'
import { recordNetworkCancelledFinancialEvent } from './financial-events.js'
import { updatePaymentOrder, type PaymentOrder } from './order-store.js'

type RecoveryDependencies = {
  cancel: typeof cancelInicisApproval
  record: typeof recordNetworkCancelledFinancialEvent
  update: typeof updatePaymentOrder
}

const runtimeDependencies: RecoveryDependencies = {
  cancel: cancelInicisApproval,
  record: recordNetworkCancelledFinancialEvent,
  update: updatePaymentOrder,
}

export async function recoverInicisPostApprovalFailure(params: {
  order: PaymentOrder
  sourceRef: string
  cancellation: InicisCancellationContext
}, dependencies = runtimeDependencies): Promise<{ status: 'cancelled' | 'approving'; message: string }> {
  try {
    const cancelled = await dependencies.cancel(params.cancellation)
    if (!cancelled.success) throw new Error(cancelled.resultMessage)
    await dependencies.record({ orderId: params.order.orderId, provider: 'inicis', sourceRef: params.sourceRef, amount: params.order.amount })
    const message = '승인 처리 중 오류가 발생해 결제가 자동 취소되었습니다.'
    const saved = await dependencies.update(params.order.orderId, { status: 'cancelled', message })
    if (!saved) throw new Error('망취소 상태를 저장하지 못했습니다.')
    return { status: 'cancelled', message }
  } catch {
    const message = '결제 승인 결과를 확인 중입니다. 중복 결제하지 말고 고객센터로 문의해 주세요.'
    await dependencies.update(params.order.orderId, { status: 'approving', message }).catch(() => undefined)
    return { status: 'approving', message }
  }
}
