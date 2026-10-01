export type CouponKind = 'service_free' | 'consultation_questions' | 'amount_off' | 'percent_off'
export interface CreateCampaignInput {
  code: string; title: string; kind: CouponKind; productKey: string; value: number
  maxClaims: number; startsAt: string; expiresAt: string
}
export interface CouponCampaign extends CreateCampaignInput {
  id: string; enabled: boolean; createdAt: string; actor: string
}
export type Campaign = CouponCampaign
export interface WalletCoupon {
  id: string; ownerId: string; campaignId: string; title: string; kind: CouponKind
  productKey: string; value: number; expiresAt: string; enabled: boolean; claimedAt: string
  reportId?: string; orderId?: string; originalAmount?: number; payableAmount?: number
}
export class CouponError extends Error {
  constructor(public code: string, public status = 503) { super(code); this.name = 'CouponError' }
}
