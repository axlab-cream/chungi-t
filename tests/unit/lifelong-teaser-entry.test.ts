import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'

const html = readFileSync(new URL('../../사주/사주/index.html', import.meta.url), 'utf8')
const start = html.indexOf('      async function beginLifelongTeaserAfterAuth()')
const end = html.indexOf('      const sampleVideo =', start)
assert.ok(start >= 0 && end > start)
const source = html.slice(start, end)

function harness(options: { authenticated?: boolean; profile?: object | null; fetchError?: Error; guest?: boolean } = {}) {
  const events: string[] = []
  const state = { concern: '이전 고민', serviceKey: '이전 서비스' }
  const context = {
    clearTodayEntryPending: () => events.push('clear-today'),
    currentAuthSession: async () => options.authenticated === false ? null : { access_token: 'test-token' },
    showAuthGate: (message: string) => events.push(`auth:${message}`),
    fetchUserProfile: async (params: { apply: boolean }) => {
      events.push(`fetch-profile:${params.apply}`)
      if (options.fetchError) throw options.fetchError
      return options.profile === undefined ? { name: '검증이름', birth: {} } : options.profile
    },
    applyUserProfile: (profile: object) => { events.push('apply-profile'); return Boolean(profile) },
    isUsableProfileName: (name: string) => /^[가-힣]{2,20}$/.test(name),
    hasUsableProfileState: () => true,
    go: (scene: string) => events.push(`go:${scene}`),
    showNudge: (message: string) => events.push(`nudge:${message}`),
    beginAnalysisAfterAuth: () => events.push('analyze'),
    state,
    // 2026-10-14 비회원: 서버가 비회원 로그인을 켜 둔 경우만 비회원 세션이 생긴다(기본은 꺼짐).
    todayGuestSession: async () => options.guest ? { access_token: 'guest-token', user: { is_anonymous: true } } : null,
    window: { UMSHAuthSession: { isGuestSession: (session: { user?: { is_anonymous?: boolean } } | null) => Boolean(session?.user?.is_anonymous) } },
    fetch: async (url: string, init: { headers: Record<string, string> }) => {
      events.push(`guest-profile:${url}:${init.headers.Authorization}`)
      return { ok: true, json: async () => ({ profile: { name: '비회원이름', birth: {} } }) }
    },
  }
  const run = runInNewContext(`${source}\nbeginLifelongTeaserAfterAuth`, context) as () => Promise<void>
  return { run, events, state }
}

test('lifelong entry uses the signed-in account profile before opening the teaser analysis', async () => {
  const h = harness()
  await h.run()
  assert.deepEqual(h.events, ['clear-today', 'fetch-profile:false', 'apply-profile', 'analyze'])
  assert.equal(h.state.concern, '')
  assert.equal(h.state.serviceKey, '')
  assert.match(html, /isLifelongTeaserEntry\s*\|\|\s*initialAuthEntry === "signup"/)
  assert.match(html, /if \(isLifelongTeaserEntry\) \{\s*clearTodayEntryPending\(\);\s*if \(!initialReportId\) beginLifelongTeaserAfterAuth\(\)/)
  assert.match(html, /if \(action === "today-full-report"\) \{\s*location\.href = "\/cmdg\/\?entry=lifelong";/)
})

test('lifelong entry asks for sign-in or missing birth information without analyzing', async () => {
  const anonymous = harness({ authenticated: false })
  await anonymous.run()
  assert.match(anonymous.events.join('|'), /auth:평생운을 보려면 먼저 로그인해주세요/)
  assert.doesNotMatch(anonymous.events.join('|'), /analyze/)

  const missing = harness({ profile: null })
  await missing.run()
  assert.match(missing.events.join('|'), /go:name\|nudge:평생운을 보려면 사주 정보를 먼저 입력해주세요/)
  assert.doesNotMatch(missing.events.join('|'), /analyze/)
})

test('lifelong entry does not silently analyze with a stale cached profile after a server error', async () => {
  const h = harness({ fetchError: new Error('프로필 조회 실패') })
  await h.run()
  assert.match(h.events.join('|'), /go:name\|nudge:프로필 조회 실패/)
  assert.doesNotMatch(h.events.join('|'), /apply-profile|analyze/)
})

test('2026-10-14 비회원은 같은 탭의 비회원 계정 프로필로 평생운 티저를 연다', async () => {
  const h = harness({ authenticated: false, guest: true })
  await h.run()
  assert.deepEqual(h.events, ['clear-today', 'guest-profile:/api/user/profile:Bearer guest-token', 'apply-profile', 'analyze'])
})
