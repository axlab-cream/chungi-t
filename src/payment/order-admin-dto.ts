import type { PaymentOrder } from './order-store.js'
import { hasApprovalEvidence } from './order-store.js'

/**
 * 관리자 화면에 내보내는 주문 표현. **제한 DTO 다** (admin-ops 09-API `/orders`).
 *
 * 관리자는 주문을 식별하고 상태를 판단할 수 있어야 하지만, 목록 한 번에 고객
 * 연락처 원문이 다 나올 이유는 없다. 그래서 이메일·전화는 마스킹해서 내보낸다.
 * 원문이 필요한 조치(환불 연락 등)는 감사되는 별도 scope 로 다룬다 — T06 이후다.
 *
 * `buyerTel`·`buyerEmail` 은 결제사에 넘긴 값이라 고객이 직접 입력한 개인정보다.
 * 마스킹 규칙은 "같은 사람인지 확인할 수 있을 만큼만 남긴다".
 */
export interface AdminPaymentOrderDto {
  orderId: string
  ownerId: string
  ownerEmailMasked: string
  buyerEmailMasked: string
  buyerTelMasked: string
  productKey: string
  productTitle: string
  amount: number
  status: PaymentOrder['status']
  /** 승인 증거가 있는데 정산이 끝나지 않은 상태. 사람이 확인해야 한다(U22). */
  unsettled: boolean
  tidMasked?: string
  payMethod?: string
  reportId?: string
  revision: number
  createdAt: string
  updatedAt: string
}

/** `hong@example.com` → `ho***@example.com`. 도메인은 남긴다 — 연락 수단 판단에 쓰인다. */
export function maskEmail(value?: string): string {
  const email = String(value ?? '').trim()
  if (!email) return ''
  const at = email.lastIndexOf('@')
  if (at <= 0) return '***'
  const local = email.slice(0, at)
  const domain = email.slice(at)
  const keep = local.slice(0, Math.min(2, local.length))
  return `${keep}${'*'.repeat(Math.max(local.length - keep.length, 1))}${domain}`
}

/** `010-1234-5678` → `***-****-5678`. 뒤 4자리만 남긴다. */
export function maskTel(value?: string): string {
  const digits = String(value ?? '').replace(/[^0-9]/g, '')
  if (!digits) return ''
  if (digits.length <= 4) return '*'.repeat(digits.length)
  return `***-****-${digits.slice(-4)}`
}

/** 결제사 거래번호는 앞 4·뒤 4만 남긴다. 대사에는 그 정도로 충분하다. */
export function maskTid(value?: string): string | undefined {
  const tid = String(value ?? '').trim()
  if (!tid) return undefined
  if (tid.length <= 8) return `${tid.slice(0, 2)}***`
  return `${tid.slice(0, 4)}***${tid.slice(-4)}`
}

export function toAdminPaymentOrderDto(order: PaymentOrder): AdminPaymentOrderDto {
  return {
    orderId: order.orderId,
    ownerId: order.ownerId,
    ownerEmailMasked: maskEmail(order.ownerEmail),
    buyerEmailMasked: maskEmail(order.buyerEmail),
    buyerTelMasked: maskTel(order.buyerTel),
    productKey: order.productKey,
    productTitle: order.productTitle,
    amount: order.amount,
    status: order.status,
    // 승인은 됐는데 `paid` 로 넘어가지 못한 주문이다. 목록에서 바로 보여야 한다.
    unsettled: order.status === 'approving' && hasApprovalEvidence(order),
    tidMasked: maskTid(order.tid),
    ...(order.payMethod ? { payMethod: order.payMethod } : {}),
    ...(order.reportId ? { reportId: order.reportId } : {}),
    revision: order.revision ?? 0,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  }
}
