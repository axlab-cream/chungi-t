import { Router, type Request, type Response } from 'express'
import type { ReportOwner } from '../report/report-store.js'
import { listPaymentProducts } from '../payment/catalog.js'
import { getPaymentOrder } from '../payment/order-store.js'
import { CouponError } from './contracts.js'
import { listWallet, claimCoupon, bindFreeCoupon, listCampaigns, createCampaign, disableCampaign } from './store.js'

type Dependencies = {
  authenticate(req: Request, res: Response): Promise<ReportOwner | null | undefined>
  staff(req: Request, res: Response, scope: string): Promise<{email: string} | null | undefined>
  reportProduct(owner: ReportOwner, reportId: string): Promise<string | null>
  queueReport(reportId: string): void
  available(productKey: string): Promise<boolean>
  couponUsage(owner: ReportOwner): Promise<Record<string, number>>
}
const text = (value: unknown) => typeof value === 'string' ? value.trim() : ''
export function couponFailure(res: Response, error: unknown): void {
  const code = error instanceof CouponError ? error.code : 'COUPON_STORE_UNAVAILABLE'
  const messages: Record<string, string> = {
    COUPON_INVALID: '쿠폰 정보를 확인해 주세요.', COUPON_NOT_FOUND: '쿠폰을 찾을 수 없습니다.',
    COUPON_EXPIRED: '사용 기간이 지난 쿠폰입니다.', COUPON_DISABLED: '발급 또는 사용이 중단된 쿠폰입니다.',
    COUPON_NOT_STARTED: '아직 사용 기간이 시작되지 않았습니다.', COUPON_EXHAUSTED: '쿠폰 등록 수량이 모두 소진되었습니다.',
    COUPON_ALREADY_USED: '이미 다른 풀이 또는 주문에 적용한 쿠폰입니다.', COUPON_CONFLICT: '쿠폰 상태가 변경되었습니다. 다시 확인해 주세요.',
    COUPON_WRONG_PRODUCT: '이 서비스에 사용할 수 없는 쿠폰입니다.', COUPON_STORE_UNAVAILABLE: '쿠폰 저장소에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    COUPON_REPORT_REQUIRED: '해당 서비스의 사주 입력을 마친 뒤 결제 화면에서 쿠폰을 적용해 주세요.',
    COUPON_SALE_PAUSED: '현재 이용을 중단한 서비스입니다.', COUPON_INPUT_INVALID: '쿠폰 종류, 혜택, 수량과 기간을 확인해 주세요.',
    COUPON_CODE_EXISTS: '이미 사용 중인 쿠폰 코드입니다.',
    COUPON_REPORT_ALREADY_UNLOCKED: '이미 쿠폰으로 연 풀이입니다. 다른 쿠폰은 사용하지 않았습니다. 보관함에서 열어 주세요.',
    COUPON_INACTIVE: '쿠폰이 중단되었거나 사용 기간이 아닙니다.',
    COUPON_PRODUCT_MISMATCH: '이 서비스에 사용할 수 없는 쿠폰입니다.',
    COUPON_STORAGE_UNAVAILABLE: '쿠폰 저장소에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    COUPON_STORAGE_CAPACITY: '쿠폰 보관 한도에 도달했습니다. 관리자에게 문의해 주세요.',
    COUPON_WEB_ONLY: '할인 쿠폰은 웹 결제에서 사용할 수 있습니다.',
    COUPON_EXISTING_CHECKOUT: '진행 중인 질문권 주문이 있습니다. 기존 결제를 확인한 뒤 쿠폰을 적용해 주세요.',
    COUPON_ORDER_CLOSED: '이미 처리된 쿠폰 주문입니다. 결제 내역을 확인하거나 고객센터에 문의해 주세요.',
    COUPON_ORDER_INVALID: '쿠폰이 적용된 주문 금액을 확인하지 못했습니다. 다시 시도해 주세요.',
    COUPON_ORDER_CONFLICT: '이 쿠폰은 다른 풀이의 주문에 연결되어 있습니다. 원래 주문에서 이어서 진행해 주세요.',
  }
  res.status(error instanceof CouponError ? error.status : 503).json({ code, error: messages[code] || '쿠폰을 처리하지 못했습니다. 사용 조건과 저장된 상태를 확인해 주세요.' })
}
export function couponRouter(deps: Dependencies): Router {
  const router = Router()
  router.use((_req,res,next) => { res.setHeader('Cache-Control','private, no-store'); next() })
  router.get('/', async (req,res) => {
    const owner = await deps.authenticate(req,res); if (!owner) return
    try {
      const items = await listWallet(owner.id)
      const usage = items.some(x => x.kind === 'consultation_questions') ? await deps.couponUsage(owner) : {}
      const wallet = await Promise.all(items.map(async item => {
        const order = item.orderId ? await getPaymentOrder(item.orderId) : null
        if (order && (order.ownerId !== owner.id || order.productKey !== item.productKey)) throw new CouponError('COUPON_ORDER_CONFLICT',409)
        return {...item, ...(order ? {orderReportId:order.reportId,orderStatus:order.status} : {}), ...(item.kind === 'consultation_questions' ? {remaining:Math.max(0,item.value-(usage[item.id] || 0))} : {})}
      }))
      res.json({ items: wallet, products: listPaymentProducts() })
    } catch (error) { couponFailure(res,error) }
  })
  router.post('/claim', async (req,res) => {
    const owner = await deps.authenticate(req,res); if (!owner) return
    try { res.json({item: await claimCoupon(owner.id,text(req.body?.code))}) }
    catch (error) { couponFailure(res,error) }
  })
  router.post('/use', async (req,res) => {
    const owner = await deps.authenticate(req,res); if (!owner) return
    try {
      const reportId = text(req.body?.reportId)
      if (!reportId || reportId.length > 200) throw new CouponError('COUPON_REPORT_REQUIRED',400)
      const productKey = await deps.reportProduct(owner,reportId)
      if (!productKey || productKey === 'cheonmyeong_consultation') throw new CouponError('COUPON_REPORT_REQUIRED',400)
      if (!await deps.available(productKey)) throw new CouponError('COUPON_SALE_PAUSED',409)
      const item = await bindFreeCoupon(owner.id,text(req.body?.couponId),productKey,reportId)
      deps.queueReport(reportId)
      res.json({item, reportId, returnTo: `/r/${encodeURIComponent(reportId)}`})
    } catch (error) { couponFailure(res,error) }
  })
  return router
}
export function adminCouponRouter(deps: Pick<Dependencies,'staff'>): Router {
  const router = Router()
  router.use((_req,res,next) => { res.setHeader('Cache-Control','private, no-store'); next() })
  router.get('/', async (req,res) => {
    if (!await deps.staff(req,res,'content:read')) return
    try { res.json({items:await listCampaigns(),products:listPaymentProducts()}) } catch (error) { couponFailure(res,error) }
  })
  // A coupon changes the effective price; issuance requires publishing permission.
  router.post('/', async (req,res) => {
    const actor = await deps.staff(req,res,'content:publish'); if (!actor) return
    try { res.status(201).json({item:await createCampaign(req.body,actor.email,text(req.header('Idempotency-Key')))}) } catch (error) { couponFailure(res,error) }
  })
  router.post('/:id/disable', async (req,res) => {
    const actor = await deps.staff(req,res,'content:publish'); if (!actor) return
    try { res.json({item:await disableCampaign(text(req.params.id),actor.email)}) } catch (error) { couponFailure(res,error) }
  })
  return router
}
