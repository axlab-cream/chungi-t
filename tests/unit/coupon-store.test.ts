import { test, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { createCampaign, listCampaigns, claimCoupon, listWallet, disableCampaign, bindFreeCoupon, hasCouponReportAccess, reserveDiscount, getDiscountForOrder, listConsultationCoupons, configureCouponStorageForTests, createMemoryCouponStorageForTests } from '../../src/coupons/store.js'
import type { CreateCampaignInput } from '../../src/coupons/contracts.js'
process.env.NODE_ENV = 'test'
const input = (extra: Partial<CreateCampaignInput> = {}): CreateCampaignInput => ({ code: 'WELCOME1', title: '환영 쿠폰', kind: 'service_free', productKey: 'cmdg', value: 1, maxClaims: 2, startsAt: '2020-01-01T00:00:00Z', expiresAt: '2099-01-01T00:00:00Z', ...extra })
beforeEach(() => configureCouponStorageForTests(createMemoryCouponStorageForTests()))
after(() => configureCouponStorageForTests(null))
test('claim limit and same-owner registration remain atomic under contention', async () => {
  await createCampaign(input(), 'admin', 'create-1')
  const claimed = await Promise.all(Array.from({ length: 10 }, () => claimCoupon('a', 'welcome1')))
  assert.equal(new Set(claimed.map(c => c.id)).size, 1)
  const races = await Promise.allSettled(['b', 'c', 'd'].map(id => claimCoupon(id, 'WELCOME1')))
  assert.equal(races.filter(r => r.status === 'fulfilled').length, 1)
  assert.equal((await listWallet('a')).length, 1)
})
test('free binding has one winner, owner isolation, and permanent entitlement', async () => {
  const c = await createCampaign(input(), 'admin', 'create-1')
  const w = await claimCoupon('a', c.code)
  await assert.rejects(bindFreeCoupon('b', w.id, 'cmdg', 'report-1'), /COUPON_NOT_FOUND/)
  const races = await Promise.allSettled(['report-1', 'report-2'].map(r => bindFreeCoupon('a', w.id, 'cmdg', r)))
  assert.equal(races.filter(r => r.status === 'fulfilled').length, 1)
  const bound = (await listWallet('a'))[0]
  await disableCampaign(c.id, 'admin')
  assert.equal(await hasCouponReportAccess('a', 'cmdg', bound.reportId!), true)
  assert.equal(await hasCouponReportAccess('b', 'cmdg', bound.reportId!), false)
  assert.equal((await bindFreeCoupon('a', w.id, 'cmdg', bound.reportId!)).reportId, bound.reportId)
})
test('discount reservation is immutable and retry reuses its original order', async () => {
  await createCampaign(input({ kind: 'percent_off', value: 100 }), 'admin', 'create-1')
  const w = await claimCoupon('a', 'WELCOME1')
  const first = await reserveDiscount('a', w.id, 'cmdg', 49900, 'order-1')
  assert.equal(first.payableAmount, 1)
  assert.equal((await reserveDiscount('a', w.id, 'cmdg', 49900, 'order-2')).orderId, 'order-1')
  await assert.rejects(reserveDiscount('a', w.id, 'cmdg', 500, 'order-2'), /COUPON_ORDER_CONFLICT/)
  assert.equal(await getDiscountForOrder('b', 'order-1'), null)
  assert.equal((await getDiscountForOrder('a', 'order-1'))?.payableAmount, 1)
})
test('disabled and expired coupons refuse new usage and consultation grants', async () => {
  const c = await createCampaign(input({ kind: 'consultation_questions', productKey: 'cheonmyeong_consultation', value: 5 }), 'admin', 'create-1')
  await claimCoupon('a', 'WELCOME1')
  assert.equal((await listConsultationCoupons('a'))[0].value, 5)
  await disableCampaign(c.id, 'admin')
  assert.equal((await listConsultationCoupons('a')).length, 0)
  await assert.rejects(claimCoupon('b', 'WELCOME1'), /COUPON_INACTIVE/)
  await createCampaign(input({ code: 'EXPIRED1', expiresAt: '2021-01-01T00:00:00Z' }), 'admin', 'create-2')
  await assert.rejects(claimCoupon('a', 'EXPIRED1'), /COUPON_INACTIVE/)
})
test('create replay is bound to actor and exact payload, codes unique, unsupported kinds rejected', async () => {
  const c = await createCampaign(input(), 'admin', 'create-1')
  assert.equal((await createCampaign(input(), 'admin', 'create-1')).id, c.id)
  await assert.rejects(createCampaign(input({ title: 'changed' }), 'admin', 'create-1'), /COUPON_REQUEST_CONFLICT/)
  await assert.rejects(createCampaign(input(), 'admin', 'create-2'), /COUPON_CODE_EXISTS/)
  await assert.rejects(createCampaign(input({ kind: 'unknown' as never }), 'admin', 'create-3'), /COUPON_INPUT_INVALID/)
})
test('administrator email actor and aggregate counts are preserved', async () => {
  const c = await createCampaign(input(), 'admin@example.test', 'email-1')
  const w = await claimCoupon('a', c.code)
  await bindFreeCoupon('a', w.id, 'cmdg', 'report:1.0')
  const listed = (await listCampaigns())[0]
  assert.equal(listed.actor, 'admin@example.test')
  assert.equal(listed.claimCount, 1)
  assert.equal(listed.usedCount, 1)
  assert.equal(listed.reservedCount, 0)
  await disableCampaign(c.id, 'admin@example.test')
})
test('expiration blocks unused binding but preserves a previously bound report', async () => {
  const expiresAt = new Date(Date.now() + 100000).toISOString()
  await createCampaign(input({ expiresAt }), 'admin', 'expires-1')
  const first = await claimCoupon('a', 'WELCOME1')
  const second = await claimCoupon('b', 'WELCOME1')
  await bindFreeCoupon('a', first.id, 'cmdg', 'report-1')
  const now = Date.now
  Date.now = () => Date.parse(expiresAt) + 1
  try {
    await assert.rejects(bindFreeCoupon('b', second.id, 'cmdg', 'report-2'), /COUPON_INACTIVE/)
    assert.equal(await hasCouponReportAccess('a', 'cmdg', 'report-1'), true)
  } finally { Date.now = now }
})
test('a second free coupon is not wasted on a report already unlocked by a coupon', async () => {
  await createCampaign(input(), 'admin', 'first')
  await createCampaign(input({code:'SECOND01'}), 'admin', 'second')
  const a=await claimCoupon('owner','WELCOME1'), b=await claimCoupon('owner','SECOND01')
  await bindFreeCoupon('owner',a.id,'cmdg','report-1')
  await assert.rejects(bindFreeCoupon('owner',b.id,'cmdg','report-1'),/COUPON_REPORT_ALREADY_UNLOCKED/)
  assert.equal((await listWallet('owner')).find(w=>w.id===b.id)?.reportId,undefined)
})
