import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { test } from 'node:test'
import { summarizeFunnelRows } from '../../src/analytics/funnel-store.js'

const trackSource = readFileSync(new URL('../../사주/js/umsh-track.js', import.meta.url), 'utf8')

test('서비스별 페이지뷰는 같은 방문이 여러 단계를 봐도 방문 한 건으로 집계한다', () => {
  const summary = summarizeFunnelRows([
    { event: 'step_view', service_key: 'work_move', step: '01-story', target: null, session_id: 's1', user_id: null },
    { event: 'step_view', service_key: 'work_move', step: '02-input', target: null, session_id: 's1', user_id: 'u1' },
    { event: 'step_view', service_key: 'work_move', step: '04-report', target: null, session_id: 's2', user_id: 'u1' },
    { event: 'step_view', service_key: 'money_save', step: '01-story', target: null, session_id: 's2', user_id: 'u1' },
    { event: 'cta_click', service_key: 'work_move', step: '04-report', target: 'purchase', session_id: 's2', user_id: 'u1' },
  ], 'week', '2026-09-21T00:00:00.000Z')

  assert.deepEqual(summary.overview, { views: 4, sessions: 2, signedInUsers: 1 })
  assert.equal(summary.services[0].serviceKey, 'work_move')
  assert.equal(summary.services[0].views, 3)
  assert.equal(summary.services[0].sessions, 2)
  assert.deepEqual(summary.services[0].steps, { '01-story': 1, '02-input': 1, '04-report': 1 })
  assert.equal(summary.ctas[0].clicks, 1)
  assert.equal(summary.truncated, false)
})

test('자체 방문 ID는 탭이 아니라 브라우저 공용 저장소에서 30분 활동 기준으로 갱신된다', async () => {
  let now = 1_000_000
  let sequence = 0
  const storage = new Map<string, string>()
  const payloads: Array<{ sessionId: string }> = []
  class ClockDate extends Date { static override now() { return now } }
  const context: Record<string, any> = {
    Date: ClockDate,
    Math,
    Blob,
    JSON,
    Number,
    location: { pathname: '/work/move/04-step-4-report/index.html' },
    navigator: {},
    crypto: { randomUUID: () => `session-${++sequence}` },
    localStorage: {
      getItem(key: string) { return storage.get(key) ?? null },
      setItem(key: string, value: string) { storage.set(key, value) },
    },
    document: { readyState: 'complete', addEventListener() {} },
    addEventListener() {},
    setTimeout() { return 1 },
    clearTimeout() {},
    fetch(_url: string, options: { body: string }) { payloads.push(JSON.parse(options.body)); return Promise.resolve({ ok: true }) },
  }
  context.window = context
  runInNewContext(trackSource, context)

  await context.UMSHTrack.flush()
  now += 10 * 60 * 1000
  context.UMSHTrack.push('step_view')
  await context.UMSHTrack.flush()
  now += 31 * 60 * 1000
  context.UMSHTrack.push('step_view')
  await context.UMSHTrack.flush()

  assert.equal(payloads[0].sessionId, 'session-1')
  assert.equal(payloads[1].sessionId, 'session-1')
  assert.equal(payloads[2].sessionId, 'session-2')
  assert.equal(context.UMSHTrack.sessionTimeoutMs, 30 * 60 * 1000)
})

test('로그인 세션이 있으면 퍼널 요청에 Bearer 토큰을 실어 고유 회원 방문을 집계한다', async () => {
  const requests: Array<{ url: string; options?: { headers?: Record<string, string> } }> = []
  const context: Record<string, any> = {
    Date,
    Math,
    Blob,
    JSON,
    Number,
    Promise,
    Object,
    location: { pathname: '/money/save/04-step-4-report/index.html' },
    navigator: {},
    crypto: { randomUUID: () => 'signed-session' },
    localStorage: { getItem() { return null }, setItem() {} },
    document: { readyState: 'complete', addEventListener() {} },
    addEventListener() {},
    setTimeout() { return 1 },
    clearTimeout() {},
    supabase: {},
    UMSHAuthSession: {
      resolveLiveSession() { return Promise.resolve({ session: { access_token: 'member-token' } }) },
    },
    fetch(url: string, options?: { headers?: Record<string, string> }) {
      requests.push({ url, options })
      if (url === '/api/auth/config') return Promise.resolve({ ok: true, json: () => Promise.resolve({ enabled: true }) })
      return Promise.resolve({ ok: true })
    },
  }
  context.window = context
  runInNewContext(trackSource, context)

  await context.UMSHTrack.flush()

  const eventRequest = requests.find((request) => request.url === '/api/events')
  assert.equal(eventRequest?.options?.headers?.Authorization, 'Bearer member-token')
})
