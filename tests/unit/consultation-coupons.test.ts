import { after, it } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import type { WalletCoupon } from '../../src/coupons/contracts.js'
import type { PaymentOrder } from '../../src/payment/order-store.js'
const names = ['NODE_ENV','DATABASE_URL','SUPABASE_URL','NEXT_PUBLIC_SUPABASE_URL','VITE_SUPABASE_URL','REPORT_STORAGE_DIR','VERCEL']
const env = new Map(names.map(k => [k,process.env[k]]))
for (const k of names) delete process.env[k]
process.env.NODE_ENV = 'test'
after(() => { for(const [k,v] of env) { if(v === undefined) delete process.env[k]; else process.env[k] = v } })
const { consultationChat, getConsultationAccess, getConsultationCouponUsage, reserveConsultationCheckout } = await import('../../src/consultation/backend.js')
const { creditOrders, validCreditOrder } = await import('../../src/consultation/credits.js')
const { DEFAULT_CONSULTATION_SETTINGS } = await import('../../src/consultation/settings.js')
const { listReportRecords, mutateReportRecord } = await import('../../src/report/report-store.js')
function setup() {
  const owner = { id: randomUUID() }
  const grant: WalletCoupon = { id:randomUUID(), ownerId:owner.id, campaignId:'isolated', title:'질문권',kind:'consultation_questions',productKey:'cheonmyeong_consultation',value:2,enabled:true,claimedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+60000).toISOString() }
  const order: PaymentOrder = { orderId:randomUUID(),ownerId:owner.id,buyerEmail:'',buyerTel:'',productKey:grant.productKey,productTitle:'질문5회',amount:4900,status:'paid',tid:'REAL-EVIDENCE',createdAt:'',updatedAt:'' }
  const provider = { transcribe:async()=> '질문',extract:async()=>({requested:false}),reply:async()=> '답변' }
  const options = { provider, profile: async()=>({userId:owner.id,name:'격리 테스트',birth:{year:1994,month:3,day:11,hour:9,gender:'female' as const,calendar:'solar' as const},birthTimeKnown:true,context:{},createdAt:'',updatedAt:''}), settings:async()=>({...DEFAULT_CONSULTATION_SETTINGS}),paymentOrders:async()=>[order],paymentOrder:async()=>order,refundBlocked:async()=>false,couponGrants:async()=>[structuredClone(grant)] }
  const ask = (requestId=randomUUID())=>consultationChat(owner,{requestId,text:'직장 질문'},options)
  return {owner,grant,order,provider,options,ask}
}
it('spends free, coupon, then paid and replay preserves exactly one coupon charge',async()=>{
  const s=setup()
  const free=await s.ask(); assert.equal(free.access.couponRemaining,2); assert.equal(free.access.paidRemaining,5)
  const requestId=randomUUID(); const coupon=await s.ask(requestId); assert.equal(coupon.access.couponRemaining,1)
  await s.ask(requestId); assert.deepEqual(await getConsultationCouponUsage(s.owner),{[s.grant.id]:1})
  await s.ask(); const paid=await s.ask(); assert.equal(paid.access.couponRemaining,0); assert.equal(paid.access.paidRemaining,4)
  assert.deepEqual(await getConsultationCouponUsage(s.owner),{[s.grant.id]:2})
})
it('filters other owner, expired, disabled and duplicate grants',async()=>{
  const s=setup()
  s.options.couponGrants=async()=>[s.grant,s.grant,{...s.grant,id:'other',ownerId:'another'},{...s.grant,id:'expired',expiresAt:'2020-01-01T00:00:00Z'},{...s.grant,id:'disabled',enabled:false}]
  assert.equal((await getConsultationAccess(s.owner,s.options)).couponRemaining,2)
})
it('rechecks grants before saved answer, rejecting revocation and expiry during generation',async()=>{
  for(const mode of ['disabled','expired']) {
    const s=setup(); s.options.paymentOrders=async()=>[]; await s.ask()
    s.provider.reply=async()=>{ if(mode==='disabled') s.grant.enabled=false; else s.grant.expiresAt='2020-01-01T00:00:00Z'; return '미저장' }
    await assert.rejects(s.ask(),/CONSULTATION_PAYMENT_REQUIRED/)
    assert.deepEqual(await getConsultationCouponUsage(s.owner),{})
    const state=((await listReportRecords(s.owner))[0].auxiliary as any).consultation
    assert.equal(state.sessions.reduce((n:number,v:any)=>n+v.history.length,0),2)
  }
})
it('failed final save and provider failure consume no coupon; lookup errors fail closed',async()=>{
  const s=setup(); await s.ask()
  s.provider.reply=async()=>{ const r=(await listReportRecords(s.owner))[0]; await mutateReportRecord(r.reportId,s.owner,r=>{(r.auxiliary as any).consultation.lease.until=0}); return '미저장' }
  await assert.rejects(s.ask(),/GENERATION_EXPIRED/); assert.deepEqual(await getConsultationCouponUsage(s.owner),{})
  s.provider.reply=async()=>{throw new Error('provider failure')}
  await assert.rejects(s.ask(),/provider failure/); assert.deepEqual(await getConsultationCouponUsage(s.owner),{})
  s.options.couponGrants=async()=>{throw new Error('storage failure')}
  await assert.rejects(s.ask(),/CONSULTATION_CREDITS_UNAVAILABLE/)
})
it('clarification answers do not consume coupons',async()=>{
  const s=setup(); await s.ask(); s.provider.extract=async()=>({requested:true})
  await s.ask(); assert.deepEqual(await getConsultationCouponUsage(s.owner),{})
})
it('discounted approved packs need matching immutable order reservation and retain refund checks',async()=>{
  const s=setup(); s.order.amount=2900
  const discount:WalletCoupon={...s.grant,kind:'amount_off',value:2000,orderId:s.order.orderId,originalAmount:4900,payableAmount:2900,enabled:false,expiresAt:'2020-01-01T00:00:00Z'}
  const options={...s.options,discountForOrder:async()=>discount}
  const ledger={freeUsed:true,usedByOrder:{}}
  assert.equal((await creditOrders(s.owner.id,ledger,options)).length,1)
  for(const patch of [{ownerId:'another'},{orderId:'other'},{productKey:'other'},{originalAmount:5000},{payableAmount:1},{kind:'consultation_questions' as const}]) assert.equal(validCreditOrder(s.order,s.owner.id,{...discount,...patch}),false)
  assert.equal(validCreditOrder(s.order,s.owner.id),false)
  assert.equal(validCreditOrder({...s.order,amount:0},s.owner.id,{...discount,payableAmount:0}),false)
  assert.equal(validCreditOrder({...s.order,tid:undefined},s.owner.id,discount),false)
  assert.equal((await creditOrders(s.owner.id,ledger,{...options,refundBlocked:async()=>true})).length,0)
  await assert.rejects(creditOrders(s.owner.id,ledger,{...options,discountForOrder:async()=>{throw new Error('db')}}),/CONSULTATION_CREDITS_UNAVAILABLE/)
})
it('checkout retry accepts only a server-verified discounted existing reservation',async()=>{
  const s=setup(); s.options.paymentOrders=async()=>[]; s.options.couponGrants=async()=>[]
  await s.ask(); const reserved=await reserveConsultationCheckout(s.owner,'coupon-checkout',s.options)
  const order={...s.order,orderId:reserved.orderId,amount:2900,status:'ready' as const,tid:undefined}
  const discount:WalletCoupon={...s.grant,kind:'amount_off',value:2000,orderId:order.orderId,originalAmount:4900,payableAmount:2900}
  const options={...s.options,paymentOrder:async()=>order,discountForOrder:async()=>discount}
  assert.equal((await reserveConsultationCheckout(s.owner,'second',options)).orderId,reserved.orderId)
  await assert.rejects(reserveConsultationCheckout(s.owner,'third',{...options,discountForOrder:async()=>null}),/STORAGE_INVALID/)
})
