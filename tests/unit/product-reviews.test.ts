import { test } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { productReviewRouter, REVIEW_MIN_VISIBLE, reviewDateLabel } from '../../src/reviews/router.js'
import { configureReviewStorageForTests, createMemoryReviewStorageForTests, maskDisplayName, normalizeReviewBody, ReviewError } from '../../src/reviews/store.js'
process.env.NODE_ENV = 'test'

const BODY = '돈이 왜 안 모이는지 딱 짚어줘서 소름 돋았어요. 소비 습관까지 맞췄어요.'

async function harness(options: { rewardOffered?: boolean; rewardFails?: boolean } = {}) {
  configureReviewStorageForTests(createMemoryReviewStorageForTests())
  const granted: string[] = []
  const app = express(); app.use(express.json())
  app.use('/reviews', productReviewRouter({
    authenticate: async (req, res) => { const id = req.header('x-member'); if (!id) { res.sendStatus(401); return null } return { id } },
    // alice 는 r1~r9 를 결제했다. bob 은 결제한 풀이가 없다.
    resolveEligibility: async (owner, productKey, reportId) => owner.id === 'alice' && productKey === 'cmdg' && /^r\d$/.test(reportId)
      ? { orderId: `order-${reportId}`, reportId, name: '박지현', ilju: '을해' } : null,
    rewardOffered: () => options.rewardOffered === true,
    grantReward: async (_owner, _productKey, reviewId) => {
      if (options.rewardFails) throw new Error('coupon store down')
      granted.push(reviewId); return { walletId: `w-${reviewId}`, title: '연애운 15% 할인권', expiresAt: '2026-10-30T15:00:00.000Z' }
    },
  }))
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>((r) => server.once('listening', r))
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`
  const call = (path: string, body?: object, headers: Record<string, string> = {}) =>
    fetch(base + path, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined })
  const close = async () => { await new Promise<void>((r) => server.close(() => r())); configureReviewStorageForTests(null) }
  return { call, close, granted }
}

test('only the family name is shown, body rules block short text and contact details', () => {
  assert.equal(maskDisplayName('박지현'), '박**')
  assert.equal(maskDisplayName('  이  '), '이**')
  assert.equal(maskDisplayName(''), '손님')
  assert.equal(maskDisplayName(undefined), '손님')
  assert.equal(normalizeReviewBody(`  ${BODY}\n\n`), BODY)
  for (const [value, code] of [
    ['너무 좋아요', 'REVIEW_BODY_TOO_SHORT'], ['가'.repeat(301), 'REVIEW_BODY_TOO_LONG'],
    [`${BODY} 010-1234-5678`, 'REVIEW_PERSONAL_INFO'], [`${BODY} me@example.com`, 'REVIEW_PERSONAL_INFO'],
    [`${BODY} https://example.com`, 'REVIEW_LINK_NOT_ALLOWED'], [42, 'REVIEW_BODY_INVALID'],
  ] as const) assert.throws(() => normalizeReviewBody(value), (e: unknown) => e instanceof ReviewError && e.code === code)
  assert.equal(reviewDateLabel('2026-10-14T16:30:00.000Z'), '2026.10.15')
})

test('paid member writes once per order; list stays hidden until enough reviews exist', async () => {
  const { call, close } = await harness()
  try {
    assert.equal((await call('/reviews/mine?product=cmdg&reportId=r1')).status, 401)
    assert.equal((await call('/reviews', { product: 'cmdg', reportId: 'r1', body: BODY })).status, 401)
    const bob = await call('/reviews', { product: 'cmdg', reportId: 'r1', body: BODY }, { 'x-member': 'bob' })
    assert.equal(bob.status, 403); assert.equal((await bob.json()).code, 'REVIEW_NOT_ELIGIBLE')
    assert.equal((await call('/reviews', { product: 'love_this_year', reportId: 'r1', body: BODY }, { 'x-member': 'alice' })).status, 400)

    const mine = await (await call('/reviews/mine?product=cmdg&reportId=r1', undefined, { 'x-member': 'alice' })).json()
    assert.deepEqual(mine, { eligible: true, reviewed: false, review: null, preview: { name: '박**', ilju: '을해일주' }, rewardOffered: false })

    const created = await call('/reviews', { product: 'cmdg', reportId: 'r1', body: BODY }, { 'x-member': 'alice' })
    assert.equal(created.status, 201)
    const json = await created.json()
    assert.equal(json.reward, null)
    assert.equal(json.review.name, '박**'); assert.equal(json.review.ilju, '을해일주'); assert.equal(json.review.product, '천명사주')
    assert.equal(json.review.verified, true)
    assert.equal(JSON.stringify(json).includes('박지현'), false)
    assert.equal(JSON.stringify(json).includes('order-r1'), false)
    assert.equal((await call('/reviews', { product: 'cmdg', reportId: 'r1', body: BODY }, { 'x-member': 'alice' })).status, 409)
    assert.equal((await (await call('/reviews/mine?product=cmdg&reportId=r1', undefined, { 'x-member': 'alice' })).json()).reviewed, true)

    // 후기가 기준보다 적으면 공개 목록은 비어 있다.
    const hidden = await (await call('/reviews?product=cmdg')).json()
    assert.deepEqual(hidden, { product: 'cmdg', visible: false, total: 0, items: [] })
    for (let i = 2; i <= REVIEW_MIN_VISIBLE; i++) assert.equal((await call('/reviews', { product: 'cmdg', reportId: `r${i}`, body: `${BODY} ${i}번째` }, { 'x-member': 'alice' })).status, 201)
    const shown = await call('/reviews?product=cmdg')
    assert.equal(shown.headers.get('cache-control'), 'public, max-age=60, s-maxage=60')
    const list = await shown.json()
    assert.equal(list.visible, true); assert.equal(list.total, REVIEW_MIN_VISIBLE); assert.equal(list.items.length, REVIEW_MIN_VISIBLE)
    assert.deepEqual(Object.keys(list.items[0]).sort(), ['body', 'date', 'id', 'ilju', 'name', 'product', 'verified'])
    assert.equal((await call('/reviews?product=nope')).status, 400)
  } finally { await close() }
})

test('reward coupon is granted when configured, and a failed grant never loses the review', async () => {
  const ok = await harness({ rewardOffered: true })
  try {
    assert.equal((await (await ok.call('/reviews/mine?product=cmdg&reportId=r1', undefined, { 'x-member': 'alice' })).json()).rewardOffered, true)
    const json = await (await ok.call('/reviews', { product: 'cmdg', reportId: 'r1', body: BODY }, { 'x-member': 'alice' })).json()
    assert.deepEqual(json.reward, { title: '연애운 15% 할인권', expiresAt: '2026-10-30T15:00:00.000Z' })
    assert.equal(ok.granted.length, 1)
  } finally { await ok.close() }
  const broken = await harness({ rewardOffered: true, rewardFails: true })
  try {
    const response = await broken.call('/reviews', { product: 'cmdg', reportId: 'r1', body: BODY }, { 'x-member': 'alice' })
    assert.equal(response.status, 201)
    assert.equal((await response.json()).reward, null)
    assert.equal((await (await broken.call('/reviews/mine?product=cmdg&reportId=r1', undefined, { 'x-member': 'alice' })).json()).reviewed, true)
  } finally { await broken.close() }
})

test('reviews received outside the app show without a badge, mixed newest first with app reviews', async () => {
  const { CURATED_REVIEWS, curatedReviewsFor } = await import('../../src/reviews/curated.js')
  for (const review of CURATED_REVIEWS) assert.equal(normalizeReviewBody(review.body), review.body)
  assert.equal(curatedReviewsFor('cmdg').length, 10)
  configureReviewStorageForTests(createMemoryReviewStorageForTests())
  const app = express(); app.use(express.json())
  app.use('/reviews', productReviewRouter({
    authenticate: async () => ({ id: 'alice' }),
    resolveEligibility: async (_owner, _productKey, reportId) => ({ orderId: `order-${reportId}`, reportId, name: '한지민', ilju: '갑오' }),
    rewardOffered: () => false,
    grantReward: async () => null,
    curatedReviews: curatedReviewsFor,
  }))
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>((r) => server.once('listening', r))
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`
  try {
    const first = await (await fetch(`${base}/reviews?product=cmdg&limit=5`)).json()
    assert.equal(first.visible, true); assert.equal(first.total, 10); assert.equal(first.items.length, 5)
    assert.deepEqual(first.items.map((r: { name: string }) => r.name), ['박**', '김**', '이**', '최**', '장**'])
    assert.equal(first.items[0].verified, false); assert.equal(first.items[0].ilju, '을해일주'); assert.equal(first.items[0].date, '2026.10.14')
    const rest = await (await fetch(`${base}/reviews?product=cmdg&offset=5&limit=20`)).json()
    assert.equal(rest.items.length, 5); assert.equal(rest.items[4].ilju, '계미일주')

    assert.equal((await fetch(`${base}/reviews`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ product: 'cmdg', reportId: 'r1', body: BODY }) })).status, 201)
    const mixed = await (await fetch(`${base}/reviews?product=cmdg`)).json()
    assert.equal(mixed.total, 11); assert.equal(mixed.items.length, 11)
    assert.equal(mixed.items[0].name, '한**'); assert.equal(mixed.items[0].verified, true)
    assert.equal(mixed.items.filter((r: { verified: boolean }) => r.verified).length, 1)
  } finally { await new Promise<void>((r) => server.close(() => r())); configureReviewStorageForTests(null) }
})
