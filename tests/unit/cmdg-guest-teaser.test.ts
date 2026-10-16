import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { Server } from 'node:http'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, before, describe, it } from 'node:test'

/**
 * 천명사주는 가입 전에도 결제 유도 화면(티저)까지 볼 수 있고, 가입은 "운명 거래하기"를 누를 때 받는다.
 *
 * 서버: 비회원 티저는 계산값만 돌려주고 아무것도 저장하지 않는다. 다른 서비스와 일반 요청은 그대로 로그인을 요구한다.
 * 화면: 분석 시작 → 비회원이면 티저, 결제 진입 → 비회원이면 가입·로그인, 로그인 뒤 → 결제 화면.
 */
const previousEnv = { ...process.env }
process.env.NODE_ENV = 'test'
for (const name of Object.keys(process.env)) {
  if (/DATABASE|SUPABASE|OPENAI|ANTHROPIC|INICIS|PAYMENT|VERCEL|REPORT_STORAGE|ADMIN_EMAIL/.test(name)) delete process.env[name]
}
const nativeFetch = globalThis.fetch
let origin = ''
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  if (url.href === 'https://synthetic-auth.invalid/auth/v1/user') {
    const token = new Headers(init?.headers).get('authorization')?.replace(/^Bearer /, '')
    return new Response(JSON.stringify({ id: token, email: `${token}@synthetic.invalid` }), {
      status: token ? 200 : 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  if (origin && url.origin === origin) return nativeFetch(input, init)
  throw new Error(`External requests are forbidden in this test: ${url.origin}${url.pathname}`)
}) as typeof fetch

const store = await import('../../src/report/report-store.js')
const profiles = await import('../../src/user/profile-store.js')
process.env.SUPABASE_URL = 'https://synthetic-auth.invalid'
process.env.SUPABASE_PUBLISHABLE_KEY = 'synthetic-public-fixture-only'
const { default: app } = await import('../../src/server/app.js')
let server: Server

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const source = readFileSync(join(root, '사주', '사주', 'index.html'), 'utf8')

const input = {
  year: 1987, month: 6, day: 10, hour: 20, minute: 0,
  calendar: 'solar', gender: 'female', name: '나혜연', concern: '이직이 맞는지 궁금해요', birthTimeKnown: true,
}

async function analyze(body: Record<string, unknown>, token?: string) {
  const response = await fetch(`${origin}/api/saju/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  })
  return { status: response.status, headers: response.headers, json: await response.json() as Record<string, any> }
}

before(async () => {
  assert.equal(store.getReportStorageMode(), 'memory')
  assert.equal(profiles.getUserProfileStorageMode(), 'memory')
  server = await new Promise<Server>((resolve, reject) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance))
    instance.once('error', reject)
  })
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  origin = `http://127.0.0.1:${address.port}`
})

after(async () => {
  server.closeAllConnections()
  await new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())))
  globalThis.fetch = nativeFetch
  process.env = previousEnv
})

describe('비회원 티저 API', () => {
  it('guestTeaser 요청은 로그인 없이 사주표·오행·대운을 돌려주고 리포트를 만들지 않는다', async () => {
    const res = await analyze({ ...input, guestTeaser: true })
    assert.equal(res.status, 200)
    assert.equal(res.json.guestPreview, true)
    assert.equal(res.json.report.reportId, '')
    assert.equal(res.json.report.resultId, '')
    assert.deepEqual(res.json.report.sections, [])
    assert.ok(res.json.pillars.day.hanja, '일주가 있어야 티저가 그려진다')
    assert.ok(res.json.dayMaster && res.json.elements, '일간과 오행이 있어야 티저가 그려진다')
    assert.ok(Array.isArray(res.json.fortune?.daewoon) && res.json.fortune.daewoon.length > 0)
    assert.match(res.headers.get('cache-control') ?? '', /no-store/)
    // 입력한 고민·이름은 응답에 되돌려 보내지 않는다.
    assert.ok(!JSON.stringify(res.json).includes(input.concern))
  })

  it('표시 없이 로그인 없이 보낸 요청은 그대로 401 이다', async () => {
    const res = await analyze(input)
    assert.equal(res.status, 401)
  })

  it('다른 서비스는 guestTeaser 로도 열리지 않는다', async () => {
    const res = await analyze({ ...input, guestTeaser: true, serviceKey: 'love_this_year', context: { serviceKey: 'love_this_year' } })
    assert.notEqual(res.status, 200)
    assert.ok(!res.json.guestPreview)
  })

  it('로그인한 회원은 기존처럼 소유 리포트를 받는다', async () => {
    const res = await analyze(input, 'guest-teaser-member')
    assert.equal(res.status, 200, JSON.stringify(res.json))
    assert.ok(res.json.report.reportId, '회원 분석에는 리포트 ID 가 있다')
    assert.ok(!res.json.guestPreview)
  })
})

describe('결제 진입 화면 연결', () => {
  const fn = (name: string, endMarker: string) => {
    const start = source.indexOf(`function ${name}(`)
    assert.notEqual(start, -1, `${name} 을 찾지 못했습니다`)
    return source.slice(start, source.indexOf(endMarker, start))
  }

  it('분석을 시작할 때 비회원이면 가입 화면 대신 티저를 만든다(연애운은 기존 그대로)', () => {
    const begin = fn('beginAnalysisAfterAuth', 'sessionStorage.removeItem(AUTH_PENDING_KEY)')
    assert.match(begin, /isGuestTeaserFlow\(\)/)
    assert.match(begin, /beginGuestTeaser\(\)/)
    assert.match(source, /function isGuestTeaserFlow\(\) \{\s*return !isLoveThisYearService\(\);/)
    const guest = fn('beginGuestTeaser', 'async function openPurchaseOrAuth')
    assert.match(guest, /analyzeBirth\(\{ guest: true \}\)/)
    assert.doesNotMatch(guest, /fetchUserProfile|hydrateProfileFromCache/, '비회원은 저장된 프로필을 불러오지 않는다')
  })

  it('비회원 분석은 계정 프로필을 저장하지 않고 guestTeaser 로 요청한다', () => {
    const analyzeBirth = fn('analyzeBirth', 'function sourceImg')
    assert.match(analyzeBirth, /if \(!guest\) await saveCurrentUserProfile\(\)/)
    assert.match(analyzeBirth, /guest \? \{ guestTeaser: true \} : \{\}/)
  })

  it('운명 거래하기·결제하기는 비회원이면 가입·로그인 화면을 띄우고, 로그인하면 결제로 이어 준다', () => {
    assert.match(source, /if \(action === "open-purchase"\) openPurchaseOrAuth\(\)/)
    const openChat = source.slice(source.indexOf('if (action === "open-chat")'), source.indexOf('if (action === "open-settings")'))
    assert.match(openChat, /openPurchaseOrAuth\(\)/)
    assert.doesNotMatch(openChat, /go\("purchase"\)/, '로그인 확인 없이 결제 화면으로 가면 안 된다')
    const gate = fn('openPurchaseOrAuth', 'async function beginAnalysisAfterAuth')
    assert.match(gate, /sessionStorage\.setItem\(AUTH_PURCHASE_KEY, "1"\)/)
    assert.match(gate, /showAuthGate\(/)
    assert.match(gate, /persistAuthFormState\(\)/, '입력값을 보관해야 로그인 뒤 다시 입력하지 않는다')
    // 2026-10-16 대표 결정: 저장 시트에서 로그인하고 돌아오면 풀이의 운명 거래하기 위치로 데려가고 결제 시트를 바로 올린다.
    // 연애운(올해)은 예전대로.
    const after = source.slice(source.indexOf('if (purchase && usesTradeSheets()) {'), source.indexOf('go(purchase ? "purchase" : "result")'))
    assert.match(after, /go\("result"\);[\s\S]*?scrollToTradeCta\(\);[\s\S]*?openTradePaySheet\(\)/)
    assert.match(after, /removeItem\(TRADE_LOGIN_KEY\)/)
    assert.match(source, /go\(purchase \? "purchase" : "result"\)/)
    assert.match(gate, /if \(usesTradeSheets\(\) && window\.UMSHGuestSaveSheet\?\.open\) \{[\s\S]*?openTradeLoginSheet\(\);\s*return;/, '비회원은 풀화면 로그인 대신 동의+로그인 바텀시트')
    const checkout = fn('startCheckout', 'const config = await loadPaymentConfig()')
    assert.match(checkout, /openPurchaseOrAuth\(\)/, '결제 주소로 직접 들어와도 비회원은 결제를 시작하지 못한다')
  })

  it('가입 화면을 닫으면 결과(티저)로 돌아간다', () => {
    // 결과가 없으면 입력으로 돌아간다. 천명사주는 세 문항이 비어 있으면 그 문항부터(concernOrLifeScene).
    assert.match(source, /backToResult \? "result" : concernOrLifeScene\(\)/)
  })
})

// 2026-10-16 대표 결정: 평생운 티저(비회원)는 맨 아래 운명 거래하기가 보이면 "로그인하고 내 운명부를 저장하세요." 시트가 올라오고,
// 떠 있는 운명 거래하기 버튼을 시트 위로 밀어 올린다. 로그인 도중 뒤로 가기·취소하면 같은 풀이 맨 아래로 돌아오고 결제 대기 표시를 지운다.
describe('천명사주 운명 거래하기 저장 시트 (2026-10-16)', () => {
  const source = readFileSync(new URL('../../사주/사주/index.html', import.meta.url), 'utf8')
  const block = source.slice(source.indexOf('const TRADE_LOGIN_KEY'), source.indexOf('const TRADE_ORIGIN_AMOUNT'))

  it('문구는 저장 안내이고, 결제로 이어진다는 말은 없다', () => {
    assert.match(block, /title: "로그인하고 내 운명부를 저장하세요\."/)
    assert.match(block, /sub: "지금 보신 풀이를 안전하게 보관하고, 언제든 다시 확인해 보세요\."/)
    assert.doesNotMatch(block, /바로 결제로 이어져요/)
  })

  it('맨 아래(운명 거래하기)에 닿으면 비회원에게만 한 번 올라오고, 버튼을 시트 위로 밀어 올린다', () => {
    assert.match(block, /stage\.scrollTop < max - 40/)
    assert.match(block, /if \(session\?\.access_token\) return;\s*openTradeLoginSheet\(\);/)
    assert.match(block, /onOpen: \(sheet\) => liftTradeCta\(sheet\)/)
    assert.match(block, /onClose: \(\) => \{ tradeSheetOpen = false; liftTradeCta\(null\); \}/)
    const guest = source.slice(source.indexOf('function beginGuestTeaser()'), source.indexOf('async function registerGuestVisit'))
    assert.match(guest, /armTradeLoginSheet\(\)/)
    assert.doesNotMatch(source, /offerGuestSave/, '같은 화면에 "저장할까요?" 카드를 따로 두지 않는다')
  })

  it('로그인하러 간 표시를 남기고, 로그인 없이 돌아오면(뒤로 가기·취소) 지우고 맨 아래로 데려간다', () => {
    assert.match(block, /sessionStorage\.setItem\(TRADE_LOGIN_KEY, String\(Date\.now\(\)\)\)/)
    const consume = block.slice(block.indexOf('function consumeTradeLoginReturn()'))
    for (const key of ['TRADE_LOGIN_KEY', 'AUTH_PURCHASE_KEY', 'AUTH_PENDING_KEY']) assert.ok(consume.includes(`removeItem(${key})`), key)
    assert.match(source, /if \(!initialReportId && isAuthReturn && sessionStorage\.getItem\(TRADE_LOGIN_KEY\)\) \{\s*beginAnalysisAfterAuth\(\);/, '카카오 화면에서 취소하고 돌아와도 질문 화면에 멈추지 않는다')
    assert.match(source, /window\.addEventListener\("pageshow", \(event\) => \{\s*if \(!event\.persisted \|\| !sessionStorage\.getItem\(TRADE_LOGIN_KEY\)\) return;/)
  })
})
