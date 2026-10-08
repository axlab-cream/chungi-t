import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { test } from 'node:test'
import { summarizeBuyers, summarizeFunnelRows, summarizePaidOrders } from '../../src/analytics/funnel-store.js'
import { countSignups } from '../../src/admin/live-data.js'

/**
 * 2026-10-08 2단계: 유입 채널, 가입 퍼널, 날짜·시간 직접 선택, 천명사주 장면 단계.
 */
const read = (p: string) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8')
const row = (session: string, event: string, extra: Record<string, unknown> = {}) =>
  ({ event, service_key: null, step: null, target: null, session_id: session, user_id: null, route: '/x', ...extra })

test('channel = earliest source marker of the visit, followed through funnel and signup', () => {
  // 행은 최신순으로 온다.
  const rows = [
    row('a', 'cta_click', { target: 'signup:complete:kakao' }),
    row('a', 'step_view', { service_key: 'couple_signal', step: '04-report' }),
    row('a', 'step_view', { service_key: 'couple_signal', step: '02-input' }),
    row('a', 'cta_click', { target: 'source:instagram' }),
    row('b', 'step_view', { service_key: 'couple_signal', step: 'entry' }),
    row('b', 'cta_click', { target: 'source:direct' }),
    row('c', 'cta_click', { target: 'source:direct' }),
  ]
  const summary = summarizeFunnelRows(rows, 'day', '2026-10-01T00:00:00.000Z')
  assert.deepEqual(summary.acquisition, [
    { channel: 'direct', visits: 2, input: 0, teaser: 0, checkout: 0, signups: 0 },
    { channel: 'instagram', visits: 1, input: 1, teaser: 1, checkout: 0, signups: 1 },
  ])
  // 유입·가입 표시는 버튼 클릭 표에 섞이지 않는다.
  assert.equal(summary.ctas.length, 0)
})

test('signup funnel counts visits per stage and per method', () => {
  const rows = [
    row('a', 'cta_click', { target: 'signup:wall' }), row('a', 'cta_click', { target: 'signup:wall' }),
    row('a', 'cta_click', { target: 'signup:click:kakao' }), row('a', 'cta_click', { target: 'signup:complete:kakao' }),
    row('b', 'cta_click', { target: 'signup:wall' }), row('b', 'cta_click', { target: 'signup:click:google' }),
    row('c', 'cta_click', { target: 'signup:wall' }),
  ]
  const { signupFunnel } = summarizeFunnelRows(rows, 'day', '2026-10-01T00:00:00.000Z')
  assert.deepEqual({ wall: signupFunnel.wall, click: signupFunnel.click, complete: signupFunnel.complete }, { wall: 3, click: 2, complete: 1 })
  assert.deepEqual(signupFunnel.methods, [{ method: 'kakao', clicks: 1, completes: 1 }, { method: 'google', clicks: 1, completes: 0 }])
})

test('free fortune and free tests stay out of the purchase funnel', () => {
  const rows = ['today_fortune', 'solo_nara', 'love_speed'].map((service, i) => row('s' + i, 'step_view', { service_key: service, step: 'entry' }))
  assert.equal(summarizeFunnelRows(rows, 'day', '2026-10-01T00:00:00.000Z').purchase.stages.intro, 0)
})

test('custom window end is exclusive for orders, buyers and signups', () => {
  const since = '2026-10-01T00:00:00.000Z'
  const until = '2026-10-05T00:00:00.000Z'
  const order = (ownerId: string, createdAt: string) => ({ ownerId, productKey: 'couple_signal', amount: 9900, status: 'paid', createdAt })
  const orders = [order('a', '2026-10-02T00:00:00.000Z'), order('b', '2026-10-05T00:00:00.000Z'), order('c', '2026-10-06T00:00:00.000Z')]
  assert.equal(summarizePaidOrders(orders, since, until).orders, 1)
  assert.equal(summarizeBuyers(orders, since, until).buyers, 1)
  assert.equal(countSignups([{ created_at: '2026-10-02T00:00:00.000Z' }, { created_at: '2026-10-05T00:00:00.000Z' }], since, until).signups, 1)
})

function trackerContext(href: string, extra: Record<string, unknown> = {}) {
  const ctx: any = {
    URL, Blob, Date, Math, JSON, Number, Promise,
    location: { href, origin: 'https://umsh.kr', pathname: new URL(href).pathname },
    navigator: {}, localStorage: { getItem() { return null }, setItem() {} }, crypto: { randomUUID() { return 's' } },
    document: { referrer: '', readyState: 'complete', addEventListener() {} },
    addEventListener() {}, setTimeout() { return 1 }, clearTimeout() {},
    ...extra,
  }
  ctx.window = ctx
  return ctx
}

test('client classifies channels from utm first, then referrer host, never keeping full addresses', () => {
  const ctx = trackerContext('https://umsh.kr/', { document: { referrer: '', readyState: 'loading', addEventListener() {} } })
  runInNewContext(read('사주/js/umsh-track.js'), ctx)
  const ch = ctx.UMSHTrack.channelOf
  const o = 'https://umsh.kr'
  assert.equal(ch('https://umsh.kr/?utm_source=IG', '', o), 'instagram')
  assert.equal(ch('https://umsh.kr/?utm_source=kakao_channel', 'https://www.google.com/', o), 'kakao')
  assert.equal(ch('https://umsh.kr/?utm_source=a%20b%3Cscript', '', o), 'other')
  assert.equal(ch('https://umsh.kr/?gclid=x', '', o), 'google_ads')
  assert.equal(ch('https://umsh.kr/', 'https://www.google.co.kr/search?q=PRIVATE', o), 'google')
  assert.equal(ch('https://umsh.kr/', 'https://m.search.naver.com/x', o), 'naver')
  assert.equal(ch('https://umsh.kr/', 'https://l.instagram.com/', o), 'instagram')
  assert.equal(ch('https://umsh.kr/', 'https://some.blog/PRIVATE', o), 'other')
  assert.equal(ch('https://umsh.kr/', '', o), 'direct')
  assert.equal(ch('https://umsh.kr/', 'https://umsh.kr/love/', o), null)
})

test('new visit records one source marker; signup steps queued before the collector are sent', async () => {
  const requests: any[] = []
  const ctx = trackerContext('https://umsh.kr/?utm_source=instagram', {
    fetch(_url: string, options: any) { requests.push(JSON.parse(options.body)); return Promise.resolve({ ok: true }) },
    __umshTrackQueue: ['signup:complete:kakao', 42],
  })
  runInNewContext(read('사주/js/umsh-track.js'), ctx)
  await ctx.UMSHTrack.flush()
  const targets = requests.flatMap((r) => r.events).map((e: any) => e.target)
  assert.deepEqual(targets.filter(Boolean), ['source:instagram', 'signup:complete:kakao'])
})

test('cmdg reports in-page scenes and admin wires the new views, range and Clarity links', () => {
  // 운영 /cmdg/ 는 사주/사주/index.html 을 내보낸다(scripts/prepare-vercel-public.mjs).
  const cmdg = read('사주/사주/index.html')
  const admin = read('admin-ui/index.html')
  const app = read('src/server/app.ts')
  assert.ok(cmdg.includes('const FUNNEL_SCENES = { birth: "02-input", result: "04-report" };'))
  assert.ok(cmdg.includes('trackFunnelScene(scene);'))
  assert.ok(admin.includes("['signup', '가입 퍼널'], ['acquisition', '유입 채널']"))
  assert.ok(admin.includes('<option value="custom">직접 선택</option>'))
  assert.ok(admin.includes('clarity.microsoft.com/projects/view/ytxpdvt9bu/heatmaps'))
  assert.ok(app.includes("code: 'INVALID_FUNNEL_WINDOW'"))
})
