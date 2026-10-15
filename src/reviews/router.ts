import { Router, type Request, type Response } from 'express'
import type { ReportOwner } from '../report/report-store.js'
import { getPaymentProduct } from '../payment/catalog.js'
import {
  ReviewError, attachReviewReward, createReview, findReviewByOrder, listPublishedReviews, maskDisplayName, normalizeReviewBody,
  type ProductReview,
} from './store.js'

/** 후기를 받는 상품. 2026-10-15: 천명사주만 먼저 연다. */
export const REVIEW_PRODUCT_KEYS = new Set(['cmdg'])
/** 후기가 이 수보다 적으면 상품 화면에 섹션을 띄우지 않는다(가짜로 채우지 않는다). */
export const REVIEW_MIN_VISIBLE = 5

export type ReviewEligibility = { orderId: string; reportId: string; name: string; ilju: string | null }
export type ReviewReward = { walletId: string; title: string; expiresAt: string }
type Dependencies = {
  authenticate(req: Request, res: Response): Promise<ReportOwner | null | undefined>
  /** 이 회원이 이 리포트를 결제(환불 안 됨)했을 때만 값을 준다. */
  resolveEligibility(owner: ReportOwner, productKey: string, reportId: string): Promise<ReviewEligibility | null>
  /** 후기 보상 쿠폰을 주는 상품인지. 설정이 없으면 보상 안내도 띄우지 않는다. */
  rewardOffered(productKey: string): boolean
  grantReward(owner: ReportOwner, productKey: string, reviewId: string): Promise<ReviewReward | null>
}

const MESSAGES: Record<string, string> = {
  REVIEW_PRODUCT_INVALID: '후기를 받지 않는 서비스예요.',
  REVIEW_REPORT_REQUIRED: '어떤 풀이에 대한 후기인지 확인하지 못했어요.',
  REVIEW_NOT_ELIGIBLE: '결제한 풀이에만 후기를 남길 수 있어요.',
  REVIEW_ALREADY_EXISTS: '이 풀이에는 이미 후기를 남겼어요.',
  REVIEW_BODY_INVALID: '후기 내용을 확인해 주세요.',
  REVIEW_BODY_TOO_SHORT: '20자 이상 적어 주세요.',
  REVIEW_BODY_TOO_LONG: '300자까지 적을 수 있어요.',
  REVIEW_PERSONAL_INFO: '연락처나 메일 주소는 빼고 적어 주세요.',
  REVIEW_LINK_NOT_ALLOWED: '링크는 넣을 수 없어요.',
  REVIEW_STORAGE_UNAVAILABLE: '후기를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.',
}
export function reviewFailure(res: Response, error: unknown): void {
  const code = error instanceof ReviewError ? error.code : 'REVIEW_STORAGE_UNAVAILABLE'
  const status = error instanceof ReviewError ? error.status : 503
  res.status(status).json({ code, error: MESSAGES[code] || MESSAGES.REVIEW_STORAGE_UNAVAILABLE })
}

const text = (value: unknown) => typeof value === 'string' ? value.trim() : ''
const reportIdValid = (value: string) => /^[A-Za-z0-9_-]{1,120}$/.test(value)
function productKeyOf(value: unknown): string {
  const key = text(value)
  if (!REVIEW_PRODUCT_KEYS.has(key)) throw new ReviewError('REVIEW_PRODUCT_INVALID', 400)
  return key
}
/** 화면에는 한국 날짜만 보인다(시각은 보이지 않는다). */
export function reviewDateLabel(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  return `${kst.getUTCFullYear()}.${String(kst.getUTCMonth() + 1).padStart(2, '0')}.${String(kst.getUTCDate()).padStart(2, '0')}`
}
/** 다른 손님에게 보이는 모양. 주문·회원·리포트 ID 는 내보내지 않는다. */
export function publicReview(review: ProductReview) {
  return {
    id: review.id,
    name: review.displayName,
    ilju: review.ilju ? `${review.ilju}일주` : null,
    product: getPaymentProduct(review.productKey)?.title || '',
    date: reviewDateLabel(review.createdAt),
    body: review.body,
    verified: true,
  }
}

export function productReviewRouter(deps: Dependencies): Router {
  const router = Router()

  // 공개 목록: 로그인 없이 본다. 후기가 적으면 비어 있는 채로 "숨김" 신호만 준다.
  router.get('/', async (req, res) => {
    try {
      const productKey = productKeyOf(req.query.product)
      const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 20))
      const offset = Math.max(0, Number(req.query.offset) || 0)
      const { total, items } = await listPublishedReviews(productKey, limit, offset)
      const visible = total >= REVIEW_MIN_VISIBLE
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60')
      res.json({ product: productKey, visible, total: visible ? total : 0, items: visible ? items.map(publicReview) : [] })
    } catch (error) { reviewFailure(res, error) }
  })

  // 내 상태: 이 풀이에 쓸 수 있는지, 이미 썼는지.
  router.get('/mine', async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store')
    const owner = await deps.authenticate(req, res); if (!owner) return
    try {
      const productKey = productKeyOf(req.query.product)
      const reportId = text(req.query.reportId)
      if (!reportIdValid(reportId)) throw new ReviewError('REVIEW_REPORT_REQUIRED', 400)
      const eligibility = await deps.resolveEligibility(owner, productKey, reportId)
      if (!eligibility) { res.json({ eligible: false, reviewed: false, rewardOffered: false }); return }
      const existing = await findReviewByOrder(eligibility.orderId)
      res.json({
        eligible: true,
        reviewed: Boolean(existing && existing.ownerId === owner.id),
        review: existing && existing.ownerId === owner.id ? publicReview(existing) : null,
        preview: { name: maskDisplayName(eligibility.name), ilju: eligibility.ilju ? `${eligibility.ilju}일주` : null },
        rewardOffered: deps.rewardOffered(productKey),
      })
    } catch (error) { reviewFailure(res, error) }
  })

  // 작성: 결제한 풀이 1건당 1번.
  router.post('/', async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store')
    const owner = await deps.authenticate(req, res); if (!owner) return
    try {
      const productKey = productKeyOf(req.body?.product)
      const reportId = text(req.body?.reportId)
      if (!reportIdValid(reportId)) throw new ReviewError('REVIEW_REPORT_REQUIRED', 400)
      const body = normalizeReviewBody(req.body?.body)
      const eligibility = await deps.resolveEligibility(owner, productKey, reportId)
      if (!eligibility) throw new ReviewError('REVIEW_NOT_ELIGIBLE', 403)
      if (await findReviewByOrder(eligibility.orderId)) throw new ReviewError('REVIEW_ALREADY_EXISTS', 409)
      const review = await createReview({
        ownerId: owner.id, orderId: eligibility.orderId, reportId: eligibility.reportId, productKey, body,
        displayName: maskDisplayName(eligibility.name), ilju: eligibility.ilju,
      })
      // 보상은 후기 저장과 따로 간다. 쿠폰 지급이 실패해도 후기는 남는다.
      let reward: ReviewReward | null = null
      if (deps.rewardOffered(productKey)) {
        try {
          reward = await deps.grantReward(owner, productKey, review.id)
          if (reward) await attachReviewReward(review.id, reward.walletId).catch(() => undefined)
        } catch { reward = null }
      }
      res.status(201).json({ review: publicReview(review), reward: reward ? { title: reward.title, expiresAt: reward.expiresAt } : null })
    } catch (error) { reviewFailure(res, error) }
  })

  return router
}
