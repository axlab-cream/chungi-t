import type { PaymentOrder } from './order-store.js'
import { updatePaymentOrder } from './order-store.js'
import { recordApprovedFinancialEvent } from './financial-events.js'

export type ApprovedPayment = { provider: string; sourceRef: string; tid?: string; payMethod?: string; approvalCode?: string; message?: string }
type ProjectionDependencies = {
  record: typeof recordApprovedFinancialEvent
  update: typeof updatePaymentOrder
}

const runtimeDependencies: ProjectionDependencies = { record: recordApprovedFinancialEvent, update: updatePaymentOrder }

export async function projectApprovedPayment(order: PaymentOrder, approval: ApprovedPayment, dependencies = runtimeDependencies, onEvidenceRecorded?: () => void): Promise<PaymentOrder | null> {
  await dependencies.record({ orderId: order.orderId, provider: approval.provider, sourceRef: approval.sourceRef, amount: order.amount })
  onEvidenceRecorded?.()
  return dependencies.update(order.orderId, { status: 'paid', tid: approval.tid, payMethod: approval.payMethod, approvalCode: approval.approvalCode, message: approval.message })
}
