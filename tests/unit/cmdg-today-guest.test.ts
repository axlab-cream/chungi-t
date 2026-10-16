import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

// 2026-10-14 운영 버그: 비회원이 천명사주 화면(/cmdg/?entry=today)에서 사주를 다 입력한 뒤
// "오늘의 운을 보려면 먼저 가입해주세요"에 막혔다. 이 화면의 회원 판정은 localStorage 만 보고,
// 비회원 세션은 공용 클라이언트(sessionStorage)에만 있다. 운영 원본은 사주/사주/index.html 이다.
const html = readFileSync(new URL('../../사주/사주/index.html', import.meta.url), 'utf8')

function body(name: string): string {
  const start = html.indexOf(`async function ${name}(`)
  assert.ok(start > 0, `${name} 가 있어야 한다`)
  const next = html.indexOf('\n      async function ', start + 10)
  const nextPlain = html.indexOf('\n      function ', start + 10)
  const end = Math.min(...[next, nextPlain].filter((index) => index > 0))
  return html.slice(start, end)
}

test('오늘운은 회원 세션이 없으면 비회원 세션으로 이어 가고, 그것도 없을 때만 가입 화면을 띄운다', () => {
  const today = body('beginTodayAfterAuth')
  const guestAt = today.indexOf('todayGuestSession()')
  const gateAt = today.indexOf('showAuthGate("오늘의 운을 보려면 먼저 가입해주세요.")')
  assert.ok(guestAt > 0 && gateAt > guestAt, '가입 화면보다 비회원 세션을 먼저 시도한다')
  assert.match(today, /Authorization: `Bearer \$\{session\.access_token\}`/, '오늘운 요청은 회원·비회원 중 고른 세션의 토큰을 쓴다')
  assert.match(today, /claimGuestNow/, '로그인한 회원은 비회원 기록을 먼저 이어받는다')
  // 2026-10-16: 오늘 운세(메인 콘텐츠)는 로그인·저장을 권하지 않는다.
  assert.doesNotMatch(today, /UMSHGuestSaveSheet\?\.openWhenSeen/, '메인 콘텐츠에는 저장 권유 없음')
})

test('비회원 세션은 서버가 비회원 로그인을 켜 둔 경우에만 만든다', () => {
  const guest = body('todayGuestSession')
  assert.match(guest, /authConfigData\?\.guestSignIn/)
  assert.match(guest, /ensureGuestSession/)
})

test('사주 입력을 마치면 비회원 계정에도 사주 정보를 저장한 뒤 오늘운을 부른다', () => {
  const complete = body('completeTodayProfileFromInput')
  const registerAt = complete.indexOf('registerGuestVisit()')
  const todayAt = complete.indexOf('beginTodayAfterAuth()')
  assert.ok(registerAt > 0 && todayAt > registerAt)
})

test('천명사주 화면은 공용 로그인 모듈과 저장 바텀시트를 싣는다', () => {
  assert.match(html, /<script src="\/js\/umsh-auth-session\.js"><\/script>/)
  assert.match(html, /<script src="\/js\/umsh-guest-save-sheet\.js\?v=/)
})

test('오늘운 다음 평생운 티저도 비회원 세션으로 이어 가고, 비회원 자기 프로필만 읽는다', () => {
  const lifelong = body('beginLifelongTeaserAfterAuth')
  const guestAt = lifelong.indexOf('todayGuestSession()')
  const gateAt = lifelong.indexOf('showAuthGate("평생운을 보려면 먼저 로그인해주세요.")')
  assert.ok(guestAt > 0 && gateAt > guestAt)
  assert.match(lifelong, /isGuestSession\?\.\(session\)/)
})
