import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { purchaseStageOf, summarizeFunnelRows, summarizePaidOrders } from '../../src/analytics/funnel-store.js'

/**
 * 2026-10-07 관리자 구매 퍼널.
 * 소개 → 입력 → 무료 결과 → 결제 화면을 방문 단위로, 결제 완료를 주문 건수로 센다.
 * GA4 퍼널과 같은 단계라 두 화면을 나란히 비교할 수 있어야 한다.
 */
const view = (session: string, service: string | null, step: string, route = '/x') =>
  ({ event: 'step_view', service_key: service, step, target: null, session_id: session, user_id: null, route })

test('steps map to the same stages as the GA4 funnel', () => {
  assert.equal(purchaseStageOf({ step: 'entry' }), 'intro')
  assert.equal(purchaseStageOf({ step: '01-story' }), 'intro')
  assert.equal(purchaseStageOf({ step: '02-input' }), 'input')
  assert.equal(purchaseStageOf({ step: '03-service-input' }), 'input')
  assert.equal(purchaseStageOf({ step: '04-report' }), 'teaser')
  assert.equal(purchaseStageOf({ step: 'payment', route: '/payment/' }), 'checkout')
  assert.equal(purchaseStageOf({ step: 'payment', route: '/payment/index.html' }), 'checkout')
  // 결과·테스트 화면은 결제 화면이 아니다.
  assert.equal(purchaseStageOf({ step: 'payment', route: '/payment/result' }), null)
  assert.equal(purchaseStageOf({ step: 'payment', route: '/payment/test' }), null)
  assert.equal(purchaseStageOf({ step: 'home' }), null)
  assert.equal(purchaseStageOf({ step: '06-detail' }), null)
})

test('stages count distinct visits, not page views', () => {
  const rows = [
    view('a', 'couple_signal', 'entry'), view('a', 'couple_signal', 'entry'), view('a', 'couple_signal', '02-input'),
    view('a', 'couple_signal', '04-report'), view('a', null, 'payment', '/payment/'),
    view('b', 'couple_signal', 'entry'), view('b', 'couple_signal', '02-input'),
    view('c', 'cat_compatibility', '01-story'),
    view('d', null, 'payment', '/payment/result'),
    // 무료 테스트는 결제 상품이 아니라 구매 퍼널에 넣지 않는다.
    view('e', 'solo_nara', 'entry'), view('f', 'love_speed', 'entry'),
  ]
  const { purchase } = summarizeFunnelRows(rows, 'day', '2026-10-06T00:00:00.000Z')
  assert.deepEqual(purchase.stages, { intro: 3, input: 2, teaser: 1, checkout: 1 })
  assert.deepEqual(purchase.services[0], { serviceKey: 'couple_signal', intro: 2, input: 2, teaser: 1 })
  assert.deepEqual(purchase.services[1], { serviceKey: 'cat_compatibility', intro: 1, input: 0, teaser: 0 })
  assert.equal(purchase.paid, undefined, 'paid orders are attached by the server only with order scope')
})

test('paid orders count only confirmed payments inside the period, grouped by product', () => {
  const since = '2026-10-01T00:00:00.000Z'
  const order = (productKey: string, amount: number, status: string, createdAt = '2026-10-05T00:00:00.000Z') => ({ productKey, amount, status, createdAt, orderId: 'PRIVATE', ownerId: 'PRIVATE' })
  const paid = summarizePaidOrders([
    order('couple_signal', 9900, 'paid'), order('couple_signal', 4900, 'viewed'), order('cat_compatibility', 12900, 'paid'),
    order('couple_signal', 9900, 'ready'), order('couple_signal', 9900, 'failed'), order('couple_signal', 9900, 'paid', '2026-09-20T00:00:00.000Z'),
  ], since)
  assert.equal(paid.orders, 3)
  assert.equal(paid.amount, 27700)
  assert.deepEqual(paid.byProduct[0], { productKey: 'couple_signal', orders: 2, amount: 14800 })
  assert.doesNotMatch(JSON.stringify(paid), /PRIVATE/)
})

test('admin dashboard renders the purchase funnel and the server gates paid orders by scope', () => {
  const admin = readFileSync(new URL('../../admin-ui/index.html', import.meta.url), 'utf8')
  const app = readFileSync(new URL('../../src/server/app.ts', import.meta.url), 'utf8')
  assert.ok(admin.includes('appendPurchaseFunnel(payload.purchase)'))
  // 2026-10-08: 표를 한 화면에 쌓지 않고 보기 버튼으로 하나씩 고른다. 구매 퍼널이 첫 보기다.
  // 2026-10-08: 요약이 첫 보기다(숫자 카드 8개 + 구매 퍼널 + 인기 서비스 + 가입 방식).
  assert.ok(admin.includes("['summary', '요약'], ['purchase', '구매 퍼널']"))
  assert.ok(admin.includes("var funnelState = { view: 'summary'"))
  assert.ok(admin.includes('function appendSummary(payload)'))
  assert.ok(app.includes("staff.scopes.includes('members:read')"))
  assert.ok(admin.includes('function funnelBars(rows)'))
  assert.ok(app.includes("staff.scopes.includes('orders:read')"))
})

test('buyers, first buyers and revenue count only confirmed payments and never return account ids', async () => {
  const { summarizeBuyers } = await import('../../src/analytics/funnel-store.js')
  const since = '2026-10-01T00:00:00.000Z'
  const order = (ownerId: string, amount: number, status: string, createdAt: string) => ({ ownerId, amount, status, createdAt })
  const result = summarizeBuyers([
    order('PRIVATE-a', 9900, 'paid', '2026-09-20T00:00:00.000Z'), // a 는 기간 전에 산 적이 있다
    order('PRIVATE-a', 4900, 'paid', '2026-10-03T00:00:00.000Z'),
    order('PRIVATE-b', 12900, 'viewed', '2026-10-04T00:00:00.000Z'),
    order('PRIVATE-b', 9900, 'paid', '2026-10-05T00:00:00.000Z'),
    order('PRIVATE-c', 9900, 'ready', '2026-10-05T00:00:00.000Z'),
    order('PRIVATE-d', 9900, 'refunded', '2026-10-05T00:00:00.000Z'),
  ], since)
  assert.deepEqual(result, { buyers: 2, firstBuyers: 1, orders: 3, revenue: 27700 })
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE/)
})

test('signups count accounts created in the period by provider, naver merged', async () => {
  const { countSignups } = await import('../../src/admin/live-data.js')
  const user = (created_at: string, provider?: string) => ({ created_at, app_metadata: provider ? { provider } : {} })
  const result = countSignups([
    user('2026-10-02T00:00:00.000Z', 'kakao'), user('2026-10-03T00:00:00.000Z', 'kakao'), user('2026-10-03T00:00:00.000Z', 'google'),
    user('2026-10-04T00:00:00.000Z', 'custom:naver'), user('2026-10-04T00:00:00.000Z'), user('2026-09-01T00:00:00.000Z', 'kakao'), user('', 'kakao'),
  ], '2026-10-01T00:00:00.000Z')
  assert.deepEqual(result, { signups: 5, byProvider: { kakao: 2, google: 1, naver: 1, unknown: 1 } })
})
