import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { test } from 'node:test'
import { summarizeFunnelRows } from '../../src/analytics/funnel-store.js'

/**
 * 2026-10-08 구매 퍼널 9단계: 소개 → 입력 시작 → 입력 완료 → 무료 결과 → 잠긴 목차 → 구매 버튼 → 결제 화면 → 결제창 → 결제 완료.
 * 입력 완료~결제창은 수집기의 `funnel:` 표시로 센다. 서비스 화면마다 고치지 않고 공통 이름표로 감지한다.
 */
const read = (p: string) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8')
const row = (session: string, event: string, extra: Record<string, unknown> = {}) =>
  ({ event, service_key: null, step: null, target: null, session_id: session, user_id: null, route: '/x', ...extra })

test('funnel markers fill the new stages per service, and stay out of the button table', () => {
  const rows = [
    row('a', 'step_view', { service_key: 'couple_signal', step: 'entry' }),
    row('a', 'cta_click', { service_key: 'couple_signal', target: 'funnel:input_done' }),
    row('a', 'cta_click', { service_key: 'couple_signal', target: 'funnel:locked_view' }),
    row('a', 'cta_click', { service_key: 'couple_signal', target: 'funnel:buy_click' }),
    row('a', 'cta_click', { service_key: 'couple_signal', target: 'funnel:checkout' }),
    row('a', 'cta_click', { service_key: 'couple_signal', target: 'funnel:pay_open' }),
    row('b', 'cta_click', { service_key: 'couple_signal', target: 'funnel:buy_click' }),
    row('c', 'cta_click', { service_key: 'solo_nara', target: 'funnel:buy_click' }),
    row('d', 'cta_click', { service_key: 'couple_signal', target: 'funnel:unknown_marker' }),
  ]
  const summary = summarizeFunnelRows(rows, 'day', '2026-10-01T00:00:00.000Z')
  assert.equal(summary.purchase.stages.inputDone, 1)
  assert.equal(summary.purchase.stages.locked, 1)
  assert.equal(summary.purchase.stages.buy, 2)
  assert.equal(summary.purchase.stages.checkout, 1)
  assert.equal(summary.purchase.stages.payOpen, 1)
  const signal = summary.purchase.services.find((item) => item.serviceKey === 'couple_signal')
  assert.deepEqual(signal && [signal.buy, signal.checkout, signal.payOpen], [2, 1, 1])
  assert.equal(summary.purchase.services.some((item) => item.serviceKey === 'solo_nara'), false)
  assert.equal(summary.ctas.length, 0)
})

function tracker(pathname: string) {
  const requests: any[] = []
  const listeners: Record<string, Function[]> = {}
  const ctx: any = {
    URL, Blob, Date, Math, JSON, Number, Promise,
    location: { href: 'https://umsh.kr' + pathname, origin: 'https://umsh.kr', pathname },
    navigator: {}, localStorage: { getItem() { return null }, setItem() {} }, crypto: { randomUUID() { return 's' } },
    document: { referrer: 'https://umsh.kr/', readyState: 'complete', body: null, addEventListener(name: string, fn: Function) { (listeners[name] ||= []).push(fn) } },
    addEventListener() {}, setTimeout() { return 1 }, clearTimeout() {},
    fetch(_url: string, options: any) { requests.push(JSON.parse(options.body)); return Promise.resolve({ ok: true }) },
  }
  ctx.window = ctx
  runInNewContext(read('사주/js/umsh-track.js'), ctx)
  const fire = (name: string, event: any = {}) => (listeners[name] || []).forEach((fn) => fn(event))
  const targets = async () => { await ctx.UMSHTrack.flush(); return requests.flatMap((r) => r.events).map((e: any) => [e.target, e.serviceKey]) }
  return { ctx, fire, targets }
}

test('input submit counts as input done only on the last input page', async () => {
  const single = tracker('/love/signal/02-step-2-saju-input/index.html')
  single.fire('submit'); single.fire('submit')
  assert.deepEqual((await single.targets()).filter(([t]) => String(t).startsWith('funnel:')), [['funnel:input_done', 'couple_signal']])
  // 합격각은 입력이 두 장이다. 첫 장 제출은 아직 입력 완료가 아니다.
  const twoStep = tracker('/me/pass-angle/02-step-2-saju-input/index.html')
  twoStep.fire('submit')
  assert.deepEqual((await twoStep.targets()).filter(([t]) => String(t).startsWith('funnel:')), [])
})

test('quit fortune input is one page now, so its first page submit is input done', async () => {
  // 2026-10-13: 퇴사운 03 은 02 로 돌려보내는 빈 화면이 됐는데 두 장 입력으로 남아 있어 입력 완료가 늘 0이었다.
  assert.doesNotMatch(read('사주/work/quit/03-step-3-service-input/index.html'), /<form/)
  const quit = tracker('/work/quit/02-step-2-saju-input/index.html')
  quit.fire('submit')
  assert.deepEqual((await quit.targets()).filter(([t]) => String(t).startsWith('funnel:')), [['funnel:input_done', 'quit_fortune']])
})

test('signup funnel shows real new accounts next to the screen-recorded completes', () => {
  const admin = read('admin-ui/index.html')
  assert.ok(admin.includes("'같은 기간 실제로 새로 만든 계정(회원 목록 기준): '"))
})

test('a link to the payment page from a service screen counts as a buy click, once', async () => {
  const page = tracker('/love/signal/04-step-4-report/index.html')
  const link = { getAttribute: (k: string) => (k === 'href' ? '/payment?product=couple_signal&reportId=PRIVATE' : null), closest: (sel: string) => (sel === 'a[href]' ? link : null) }
  const other = { getAttribute: () => '/vault', closest: (sel: string) => (sel === 'a[href]' ? other : null) }
  page.fire('click', { target: other }); page.fire('click', { target: link }); page.fire('click', { target: link })
  const marks = (await page.targets()).filter(([t]) => String(t).startsWith('funnel:'))
  assert.deepEqual(marks, [['funnel:buy_click', 'couple_signal']])
  assert.doesNotMatch(JSON.stringify(marks), /PRIVATE/)
})

test('payment page and cmdg report their stages with the product key', () => {
  const payment = read('사주/js/payment.js')
  assert.ok(payment.includes("trackFunnel('checkout');") && payment.includes("trackFunnel('pay_open');"))
  assert.ok(payment.includes("const item = { target: 'funnel:' + name, serviceKey: product?.key };"))
  const cmdg = read('사주/사주/index.html')
  assert.ok(cmdg.includes('const FUNNEL_MARKS = { loading: "input_done", purchase: "buy_click" };'))
})

test('cmdg counts input from any input scene and the price card as its locked stage', () => {
  // 2026-10-13 운영 숫자: 입력 시작 1 < 입력 완료 4, 무료 결과 4인데 잠긴 목차 0. 프로필 손님은 생년월일 장면을 건너뛰고, 결과에는 잠긴 목차 대신 복채 안내가 있다.
  const cmdg = read('사주/사주/index.html')
  assert.ok(cmdg.includes('const FUNNEL_SCENES = { name: "02-input", birth: "02-input", concern: "02-input", result: "04-report" };'))
  assert.ok(read('사주/js/umsh-track.js').includes('.cmdg-master-teaser .package-card'))
  assert.ok(read('사주/js/cmdg-master-teaser.js').includes('class=\\"package-card\\"'), 'teaser still renders the price card the tracker watches')
})

test('service performance highlights the weakest stage and greys out small samples', () => {
  const admin = read('admin-ui/index.html')
  assert.ok(admin.includes("var SMALL_SAMPLE = 10;"))
  assert.ok(admin.includes("if (index === worst) td.className = 'is-worst';"))
  assert.ok(admin.includes("if (item.intro < SMALL_SAMPLE) tr.className = 'is-small-sample';"))
  assert.ok(admin.includes("var STAGE_KEYS = ['intro', 'input', 'inputDone', 'teaser', 'locked', 'buy', 'checkout', 'payOpen'];"))
})
