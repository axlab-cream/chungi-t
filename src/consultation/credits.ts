import { getPaymentOrder, hasApprovalEvidence, listConsultationPaymentOrders, type PaymentOrder } from '../payment/order-store.js'
import { ConsultationError } from './provider.js'
import { isPaymentTestMode } from '../payment/test-mode.js'
import { hasBlockingRefundRequest } from '../payment/refund-store.js'
import { getDiscountForOrder, listConsultationCoupons } from '../coupons/store.js'
import type { WalletCoupon } from '../coupons/contracts.js'

export const CONSULTATION_PRODUCT = 'cheonmyeong_consultation'
export interface CreditLedger { freeUsed: boolean; usedByOrder: Record<string, number>; usedByCoupon?: Record<string, number> }
export interface CreditDependencies {
  paymentOrders?: (ownerId: string) => Promise<PaymentOrder[]>
  paymentOrder?: typeof getPaymentOrder
  refundBlocked?: typeof hasBlockingRefundRequest
  couponGrants?: (ownerId: string) => Promise<WalletCoupon[]>
  discountForOrder?: (ownerId: string, orderId: string) => Promise<WalletCoupon | null>
}
export interface ConsultationAccess {
  freeRemaining: number; couponRemaining: number; paidRemaining: number; remaining: number
  packQuestions: number; packAmount: number; checkoutUrl: string
}
export function validCreditOrder(order: PaymentOrder | null, ownerId: string, discount: WalletCoupon | null = null): order is PaymentOrder {
  return !!order && order.ownerId === ownerId && order.productKey === CONSULTATION_PRODUCT && validPackAmount(order, ownerId, discount) &&
    (order.status === 'paid' || order.status === 'viewed') && hasApprovalEvidence(order) &&
    (isPaymentTestMode() || !(order.payMethod === 'TEST' || order.tid?.startsWith('TEST-') || order.approvalCode?.startsWith('TEST-')))
}
export function validPackAmount(order: PaymentOrder, ownerId: string, discount: WalletCoupon | null = null): boolean {
  if (order.amount === 4900) return true
  return Number.isInteger(order.amount) && order.amount >= 1 && order.amount < 4900 && !!discount &&
    (discount.kind === 'amount_off' || discount.kind === 'percent_off') && discount.ownerId === ownerId &&
    discount.orderId === order.orderId && discount.productKey === CONSULTATION_PRODUCT &&
    discount.originalAmount === 4900 && discount.payableAmount === order.amount
}
export async function creditCoupons(ownerId: string, options: CreditDependencies): Promise<WalletCoupon[]> {
  try {
    const now = Date.now()
    const grants = await (options.couponGrants ?? listConsultationCoupons)(ownerId)
    return [...new Map(grants.filter(grant => grant.ownerId === ownerId && grant.kind === 'consultation_questions' &&
      grant.productKey === CONSULTATION_PRODUCT && grant.enabled && Number.isInteger(grant.value) && grant.value >= 1 && grant.value <= 100 &&
      Date.parse(grant.expiresAt) > now).map(grant => [grant.id, grant])).values()]
      .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt) || a.id.localeCompare(b.id))
  } catch { throw new ConsultationError('CONSULTATION_CREDITS_UNAVAILABLE') }
}
/** Discover every eligible pack and re-read previously recorded packs to catch refunds. */
export async function creditOrders(ownerId: string, credits: CreditLedger, options: CreditDependencies): Promise<PaymentOrder[]> {
  try {
    const orders = new Map((await (options.paymentOrders ?? listConsultationPaymentOrders)(ownerId)).map(order => [order.orderId, order]))
    for (const id of Object.keys(credits.usedByOrder)) {
      const order = await (options.paymentOrder ?? getPaymentOrder)(id)
      if (order) orders.set(id, order)
      else orders.delete(id)
    }
    const eligible: PaymentOrder[] = []
    for (const order of orders.values()) {
      const discount = order.amount < 4900 ? await (options.discountForOrder ?? getDiscountForOrder)(ownerId, order.orderId) : null
      if (validCreditOrder(order, ownerId, discount) && !await (options.refundBlocked ?? hasBlockingRefundRequest)(order.orderId)) eligible.push(order)
    }
    return eligible.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.orderId.localeCompare(b.orderId))
  } catch { throw new ConsultationError('CONSULTATION_CREDITS_UNAVAILABLE') }
}
export function consultationAccess(credits: CreditLedger, orders: PaymentOrder[], coupons: WalletCoupon[] = []): ConsultationAccess {
  const freeRemaining = credits.freeUsed ? 0 : 1
  const paidRemaining = orders.reduce((sum, order) => sum + Math.max(0, 5 - (credits.usedByOrder[order.orderId] ?? 0)), 0)
  const couponRemaining = coupons.filter(coupon => coupon.enabled && Date.parse(coupon.expiresAt) > Date.now()).reduce((sum, coupon) => sum + Math.max(0, coupon.value - (credits.usedByCoupon?.[coupon.id] ?? 0)), 0)
  return { freeRemaining, couponRemaining, paidRemaining, remaining: freeRemaining + couponRemaining + paidRemaining, packQuestions: 5, packAmount: 4900, checkoutUrl: '/payment?product=cheonmyeong_consultation' }
}
export class ConsultationPaymentRequired extends ConsultationError {
  constructor(public access: ConsultationAccess) { super('CONSULTATION_PAYMENT_REQUIRED', 402) }
}
export function requireCredit(credits: CreditLedger, orders: PaymentOrder[], coupons: WalletCoupon[] = []): void {
  const access = consultationAccess(credits, orders, coupons)
  if (!access.remaining) throw new ConsultationPaymentRequired(access)
}
/** Called in the same CAS mutation that saves the successful substantive answer. */
export function consumeCredit(credits: CreditLedger, orders: PaymentOrder[], coupons: WalletCoupon[] = []): void {
  requireCredit(credits, orders, coupons)
  if (!credits.freeUsed) { credits.freeUsed = true; return }
  const coupon = coupons.find(coupon => coupon.enabled && Date.parse(coupon.expiresAt) > Date.now() && (credits.usedByCoupon?.[coupon.id] ?? 0) < coupon.value)
  if (coupon) {
    credits.usedByCoupon ??= {}
    credits.usedByCoupon[coupon.id] = (credits.usedByCoupon[coupon.id] ?? 0) + 1
    return
  }
  const order = orders.find(order => (credits.usedByOrder[order.orderId] ?? 0) < 5)!
  credits.usedByOrder[order.orderId] = (credits.usedByOrder[order.orderId] ?? 0) + 1
}
