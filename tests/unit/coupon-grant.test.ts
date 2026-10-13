import { test } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { couponRouter, adminCouponRouter } from '../../src/coupons/router.js'
import { configureCouponStorageForTests, createMemoryCouponStorageForTests, listCampaigns, removeWalletsForDeletedMember } from '../../src/coupons/store.js'
process.env.NODE_ENV = 'test'

const ALICE = '11111111-1111-4111-8111-111111111111'
const BOB = '22222222-2222-4222-8222-222222222222'
const GHOST = '33333333-3333-4333-8333-333333333333'

test('admin grants a coupon straight into one member wallet, with limits, idempotency and audit', async () => {
  const storage = createMemoryCouponStorageForTests(); configureCouponStorageForTests(storage)
  const audits: Array<{ action: string; target: { type: string; id: string } }> = []
  const app = express(); app.use(express.json())
  const deps = {
    authenticate: async (req: express.Request, res: express.Response) => { const id = req.header('x-member'); if (!id) { res.sendStatus(401); return null } return { id } },
    staff: async (req: express.Request, res: express.Response, scope: string) => { if (req.header('x-scope') !== scope) { res.sendStatus(403); return null } return { email: 'operator@example.invalid' } },
    resolveReport: async () => null, queueReport: () => {}, available: async () => true, couponUsage: async () => ({}),
    audit: async (event: { action: string; target: { type: string; id: string } }) => { audits.push(event) },
    memberExists: async (id: string) => id === ALICE || id === BOB,
  }
  app.use('/admin', adminCouponRouter(deps)); app.use('/coupons', couponRouter(deps))
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(r => server.once('listening', r))
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`
  const call = (path: string, body?: object, headers: Record<string, string> = {}) => fetch(base + path, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined })
  const admin = (key: string) => ({ 'x-scope': 'content:publish', 'idempotency-key': key })
  try {
    const issued = await call('/admin', { code: 'GIFT-ABCDEFGH', title: 'CS 보상 무료 이용권', kind: 'service_free', productKey: 'cmdg', value: 1, maxClaims: 1, startsAt: '2020-01-01T00:00:00Z', expiresAt: '2099-01-01T00:00:00Z', grantOnly: true }, admin('issue-0001'))
    assert.equal(issued.status, 201)
    const { item: campaign } = await issued.json()
    assert.equal(campaign.grantOnly, true)

    // 지급 전용 쿠폰은 고객이 코드를 알아도 등록되지 않는다.
    assert.equal((await call('/coupons/claim', { code: 'GIFT-ABCDEFGH' }, { 'x-member': BOB })).status, 404)

    // 권한·입력 검사
    assert.equal((await call(`/admin/${campaign.id}/grant`, { memberId: ALICE }, { 'x-scope': 'content:read', 'idempotency-key': 'grant-0001' })).status, 403)
    assert.equal((await call(`/admin/${campaign.id}/grant`, { memberId: 'not-a-member' }, admin('grant-0001'))).status, 400)
    assert.equal((await call(`/admin/${campaign.id}/grant`, { memberId: GHOST }, admin('grant-0001'))).status, 404)

    const granted = await call(`/admin/${campaign.id}/grant`, { memberId: ALICE.toUpperCase() }, admin('grant-0001'))
    assert.equal(granted.status, 201)
    const { item } = await granted.json()
    assert.equal(item.ownerId, ALICE); assert.equal(item.granted, true); assert.equal(item.kind, 'service_free')
    assert.deepEqual(audits.map(a => [a.action, a.target.type, a.target.id]), [['coupon.campaign.create', 'coupon_campaign', campaign.id], ['coupon.wallet.grant', 'member_profile', ALICE]])

    // 같은 요청 키로 다시 보내면 같은 쿠폰을 돌려주고 두 장이 되지 않는다.
    const replay = await call(`/admin/${campaign.id}/grant`, { memberId: ALICE }, admin('grant-0001'))
    assert.equal(replay.status, 201); assert.equal((await replay.json()).item.id, item.id)
    // 새 요청 키로 같은 회원에게 다시 주면 거절한다.
    const again = await call(`/admin/${campaign.id}/grant`, { memberId: ALICE }, admin('grant-0002'))
    assert.equal(again.status, 409); assert.equal((await again.json()).code, 'COUPON_ALREADY_OWNED')
    // 같은 요청 키를 다른 회원에게 쓰면 충돌로 막는다.
    assert.equal((await call(`/admin/${campaign.id}/grant`, { memberId: BOB }, admin('grant-0001'))).status, 409)
    // 한도(1명)를 다 쓰면 다른 회원에게는 줄 수 없다.
    const full = await call(`/admin/${campaign.id}/grant`, { memberId: BOB }, admin('grant-0003'))
    assert.equal(full.status, 409); assert.equal((await full.json()).code, 'COUPON_EXHAUSTED')

    // 회원은 MY › 내 쿠폰에서 바로 본다.
    const wallet = await (await call('/coupons', undefined, { 'x-member': ALICE })).json()
    assert.equal(wallet.items.length, 1); assert.equal(wallet.items[0].id, item.id)
    assert.equal((await listCampaigns()).find(c => c.id === campaign.id)?.claimCount, 1)

    // 중단한 쿠폰은 지급할 수 없다.
    const open = await (await call('/admin', { code: 'OPEN-CODE-0001', title: '일반 쿠폰', kind: 'amount_off', productKey: 'cmdg', value: 1000, maxClaims: 10, startsAt: '2020-01-01T00:00:00Z', expiresAt: '2099-01-01T00:00:00Z' }, admin('issue-0002'))).json()
    assert.equal(open.item.grantOnly, undefined)
    assert.equal((await call(`/admin/${open.item.id}/disable`, {}, { 'x-scope': 'content:publish' })).status, 200)
    const stopped = await call(`/admin/${open.item.id}/grant`, { memberId: BOB }, admin('grant-0004'))
    assert.equal(stopped.status, 409); assert.equal((await stopped.json()).code, 'COUPON_DISABLED')

    // 탈퇴하면 쿠폰함과 함께 지급 기록의 회원 번호도 지운다.
    assert.equal(await removeWalletsForDeletedMember(ALICE), 1)
    assert.equal((await (await call('/coupons', undefined, { 'x-member': ALICE })).json()).items.length, 0)
    const { data } = await storage.read()
    const grants = data.audit.filter(a => a.action === 'grant')
    assert.equal(grants.length, 1); assert.equal(grants[0].ownerId, undefined); assert.equal(grants[0].actor, 'operator@example.invalid')
  } finally { await new Promise<void>(r => server.close(() => r())); configureCouponStorageForTests(null) }
})
