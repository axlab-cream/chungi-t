export type CouponKind = 'service_free' | 'consultation_questions' | 'amount_off' | 'percent_off'
export interface CreateCampaignInput {
  code: string; title: string; kind: CouponKind; productKey: string; value: number
  maxClaims: number; startsAt: string; expiresAt: string
  /** 회원 지급 전용: 고객이 코드를 입력해 등록할 수 없고, 관리자가 회원 상세에서 지급만 한다(2026-10-12). */
  grantOnly?: boolean
}
export interface CouponCampaign extends CreateCampaignInput {
  id: string; enabled: boolean; createdAt: string; actor: string
}
export type Campaign = CouponCampaign
export interface WalletCoupon {
  id: string; ownerId: string; campaignId: string; title: string; kind: CouponKind
  productKey: string; value: number; expiresAt: string; enabled: boolean; claimedAt: string
  reportId?: string; orderId?: string; originalAmount?: number; payableAmount?: number
  /** 관리자가 회원 상세에서 직접 지급한 쿠폰. 누가 줬는지는 고객에게 보이지 않게 감사 기록에만 남긴다. */
  granted?: boolean
}
export class CouponError extends Error {
  constructor(public code: string, public status = 503) { super(code); this.name = 'CouponError' }
}
