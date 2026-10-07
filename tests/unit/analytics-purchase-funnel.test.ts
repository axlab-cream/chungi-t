import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { webcrypto } from 'node:crypto'
import { test } from 'node:test'

/**
 * 2026-10-07 GA4 구매 퍼널.
 *
 * 서비스 소개 → 입력 → 무료 결과 → 결제 화면 → 결제창 → 결제 완료를 GA4 에서 이어 보기 위한 이벤트.
 * 지키는 것 —
 *  1. 단계 판정은 umsh-track.js 의 경로 규칙 하나만 쓴다
 *  2. 주문번호·reportId 는 원문 그대로 GA4 로 나가지 않는다
 *  3. 구매는 서버가 확인한 주문만, 한 주문당 한 번만 센다
 */
const read = (p: string) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8')
const analytics = read('사주/js/umsh-analytics.js')
const collector = read('사주/js/umsh-track.js')

function setup(pathname = '/love/signal/', options: { origin?: string } = {}) {
  const store = new Map<string, string>()
  const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) }
  const events: any[] = []
  const listeners: Record<string, Function[]> = {}
  const href = (options.origin || 'https://umsh.kr') + pathname + '?reportId=PRIVATE-report'
  const ctx: any = {
    URL, Blob, Date, Math, JSON, Number, Promise, Uint8Array, TextEncoder, AbortController, setTimeout() { return 1 }, clearTimeout() {},
    crypto: webcrypto,
    location: { origin: options.origin || 'https://umsh.kr', pathname, href },
    navigator: {}, sessionStorage: storage, localStorage: storage,
    fetch: async () => ({ ok: true, json: async () => ({}) }),
    addEventListener() {},
    document: { referrer: '', readyState: 'complete', createElement: () => ({}), head: { appendChild() {} }, addEventListener(name: string, fn: Function) { (listeners[name] ||= []).push(fn) } },
    gtag: (...args: any[]) => { if (args[0] === 'event') events.push(args) },
  }
  ctx.window = ctx
  runInNewContext(analytics, ctx)
  return { ctx, events, store, api: ctx.UMSHAnalytics, startCollector: () => runInNewContext(collector, ctx) }
}

const funnelEvents = (events: any[]) => events.filter(e => e[1] !== 'page_exit')

test('service pages map to funnel steps through the shared path rules', () => {
  const cases: Array<[string, string]> = [
    ['/love/signal/', 'view_item'],
    ['/love/signal/01-step-1-story/index.html', 'view_item'],
    ['/love/signal/02-step-2-saju-input/index.html', 'input_start'],
    ['/match/cat/03-step-3-service-input/index.html', 'input_start'],
    ['/love/signal/04-step-4-report/index.html', 'view_teaser'],
    ['/money/save/06-step-6_1-report-detail/index.html', 'view_full_report'],
  ]
  for (const [path, expected] of cases) {
    const { events, startCollector } = setup(path)
    startCollector()
    const sent = funnelEvents(events)
    assert.equal(sent.length, 1, path)
    assert.equal(sent[0][1], expected, path)
    assert.match(sent[0][2].service_key, /^[a-z_]+$/)
  }
})

test('pages outside a service funnel send no funnel event', () => {
  for (const path of ['/', '/vault.html', '/payment/', '/r/abc123']) {
    const { events, startCollector } = setup(path)
    startCollector()
    assert.equal(funnelEvents(events).length, 0, path)
  }
})

test('funnel events never carry report identifiers', () => {
  const { events, startCollector } = setup('/love/signal/04-step-4-report/index.html')
  startCollector()
  assert.doesNotMatch(JSON.stringify(funnelEvents(events)), /PRIVATE|reportId/)
})

test('checkout events use GA4 ecommerce fields and the coupon-adjusted amount', () => {
  const { api, events } = setup('/payment/')
  const product = { key: 'couple_signal', title: '관계 신호', amount: 9900 }
  api.beginCheckout(product)
  api.addPaymentInfo(product, 4900)
  const [begin, info] = funnelEvents(events)
  assert.equal(begin[1], 'begin_checkout')
  assert.deepEqual({ currency: begin[2].currency, value: begin[2].value }, { currency: 'KRW', value: 9900 })
  assert.equal(begin[2].items[0].item_id, 'couple_signal')
  assert.equal(info[1], 'add_payment_info')
  assert.equal(info[2].value, 4900)
})

test('malformed products are ignored instead of polluting revenue', () => {
  const { api, events } = setup('/payment/')
  api.beginCheckout(null)
  api.beginCheckout({ key: 'Bad Key!', amount: 9900 })
  api.addPaymentInfo({ key: 'couple_signal' }, 99.5)
  assert.equal(funnelEvents(events).length, 0)
})

const paidOrder = { orderId: 'UMSH-20261007-PRIVATE', productKey: 'couple_signal', productTitle: '관계 신호', amount: 9900, status: 'paid' }

test('verified purchase sends once with a hashed transaction id', async () => {
  const { api, events } = setup('/payment/result')
  await api.purchase(paidOrder)
  await api.purchase(paidOrder)
  await api.purchase({ ...paidOrder, status: 'viewed' })
  const sent = funnelEvents(events)
  assert.equal(sent.length, 1)
  assert.equal(sent[0][1], 'purchase')
  assert.equal(sent[0][2].value, 9900)
  assert.equal(sent[0][2].currency, 'KRW')
  assert.match(sent[0][2].transaction_id, /^[0-9a-f]{32}$/)
  assert.doesNotMatch(JSON.stringify(sent), /PRIVATE|UMSH-2026/)
})

test('the same order hashes to the same id so GA4 and admin can be reconciled', async () => {
  const a = setup('/payment/result'), b = setup('/payment/result')
  await a.api.purchase(paidOrder); await b.api.purchase(paidOrder)
  assert.equal(funnelEvents(a.events)[0][2].transaction_id, funnelEvents(b.events)[0][2].transaction_id)
})

test('unpaid, failed or malformed orders are not counted', async () => {
  const { api, events } = setup('/payment/result')
  for (const order of [null, { ...paidOrder, status: 'ready' }, { ...paidOrder, status: 'failed' }, { ...paidOrder, orderId: '' }, { ...paidOrder, amount: '9900' }]) await api.purchase(order)
  assert.equal(funnelEvents(events).length, 0)
})

test('measurement stays off outside production, so local QA payments never reach GA4', () => {
  assert.equal(setup('/payment/result', { origin: 'http://localhost:8790' }).api, undefined)
})

test('payment pages call the helpers and the result page verifies with the server first', () => {
  const pay = read('사주/js/payment.js'), result = read('사주/js/payment-result.js')
  assert.ok(pay.includes('UMSHAnalytics?.beginCheckout?.(product)'))
  assert.ok(pay.includes('UMSHAnalytics?.addPaymentInfo?.(product, couponAmount(selectedCoupon))'))
  assert.ok(result.includes("fetch('/api/payment/orders/' + encodeURIComponent(orderId)"))
  assert.ok(!/purchase\?\.\(\{/.test(result), 'purchase must be built from the server order, not from URL parameters')
})
