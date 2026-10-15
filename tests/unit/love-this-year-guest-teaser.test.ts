import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { Server } from 'node:http'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Script } from 'node:vm'
import { after, before, describe, it } from 'node:test'

/**
 * 올해 연애 가능?(love/this-year)도 천명사주처럼 가입 전에 입력하고 티저까지 본다. 가입은 04 의 결제 버튼에서 받는다.
 * 직장 선택(job-choice-guest-teaser.test.ts)과 같은 구조다. 이 서비스는 요청 속 selfBirth 로 사주를 받으므로 계정 저장이 필요 없다.
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
const read = (...parts: string[]) => readFileSync(join(root, ...parts), 'utf8')
const gate = read('사주', 'js', 'umsh-funnel-auth-gate.js')
const service = read('사주', 'js', 'thisyear-service.js')
const inputPage = read('사주', 'love', 'this-year', '02-step-2-saju-input', 'index.html')
const teaserPage = read('사주', 'love', 'this-year', '04-step-4-report', 'index.html')

const selfBirth = { year: 1990, month: 2, day: 3, hour: 14, minute: 30, gender: 'female', calendar: 'solar' }
const guestBody = {
  selfName: '나혜연', selfBirth, selfBirthTimeKnown: true,
  relationshipStatus: 'solo', partnerStarBasis: 'gender_auto', gender: 'female', concern: '올해 인연이 올까',
  preview: true, guestTeaser: true,
}

async function analyze(body: Record<string, unknown>, token?: string) {
  const response = await fetch(`${origin}/api/love/this-year/analyze`, {
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

describe('올해 연애운 비회원 티저 API', () => {
  it('guestTeaser + preview 는 로그인 없이 앞 두 항목과 목차를 돌려주고 결제·리포트 식별자는 비운다', async () => {
    const res = await analyze(guestBody)
    assert.equal(res.status, 200, JSON.stringify(res.json))
    assert.equal(res.json.guestPreview, true)
    assert.equal(res.json.previewOnly, true)
    assert.equal(res.json.entitled, false)
    assert.equal(res.json.reportId, '')
    assert.equal(res.json.paymentUrl, undefined)
    assert.equal(res.json.teaserSections?.length, 2)
    assert.equal(res.json.report, undefined, '전체 리포트는 비회원에게 가지 않는다')
    assert.ok(res.json.toc.length > 2)
    assert.match(res.headers.get('cache-control') ?? '', /no-store/)
  })

  it('시간 모름은 시각 없이 보내도 받는다', async () => {
    const { hour: _hour, minute: _minute, ...noClock } = selfBirth
    const res = await analyze({ ...guestBody, selfBirth: noClock, selfBirthTimeKnown: false })
    assert.equal(res.status, 200, JSON.stringify(res.json))
    assert.equal(res.json.guestPreview, true)
  })

  it('시각을 안다고 했는데 시각이 없으면 400 이다', async () => {
    const { hour: _hour, ...noHour } = selfBirth
    assert.equal((await analyze({ ...guestBody, selfBirth: noHour })).status, 400)
  })

  it('표시가 모자란 요청과 토큰 있는 요청은 비회원 경로를 타지 않는다', async () => {
    assert.equal((await analyze({ ...guestBody, guestTeaser: undefined })).status, 401)
    assert.equal((await analyze({ ...guestBody, preview: undefined })).status, 401, 'preview 없이 guestTeaser 만으로는 열리지 않는다')
    const member = await analyze({ ...guestBody, selfBirth: undefined }, 'love-this-year-member')
    assert.equal(member.status, 409, '토큰이 있으면 회원 경로가 계정 사주를 요구한다')
    assert.equal(member.json.code, 'PROFILE_REQUIRED')
  })

  it('직접 입력한 사주가 없으면 비회원은 400 이다(계정 사주를 쓸 수 없다)', async () => {
    assert.equal((await analyze({ ...guestBody, selfBirth: undefined })).status, 400)
  })

  it('잘못된 생년월일·성별·관계 상태는 400 이다', async () => {
    assert.equal((await analyze({ ...guestBody, selfBirth: { ...selfBirth, month: 2, day: 31 } })).status, 400)
    assert.equal((await analyze({ ...guestBody, selfBirth: { ...selfBirth, gender: '' } })).status, 400)
    assert.equal((await analyze({ ...guestBody, relationshipStatus: '' })).status, 400)
  })

  it('로그인한 회원의 직접 입력은 기존처럼 소유 리포트 미리보기를 받는다', async () => {
    const res = await analyze({ ...guestBody, guestTeaser: undefined }, 'love-this-year-member')
    assert.equal(res.status, 200, JSON.stringify(res.json))
    assert.ok(res.json.reportId, '회원 분석에는 리포트 ID 가 있다')
    assert.ok(!res.json.guestPreview)
  })
})

describe('화면 연결', () => {
  it('수정한 브라우저 스크립트는 문법 오류 없이 컴파일된다', () => {
    for (const [name, code] of [['umsh-funnel-auth-gate.js', gate], ['thisyear-service.js', service]]) assert.doesNotThrow(() => new Script(code, { filename: name }), name)
  })

  it('02·04 는 data-guest-teaser 로 게이트에 비회원 통과를 알리고, draft 가 있으면 가입 직후 04 를 되돌리지 않는다', () => {
    for (const page of [inputPage, teaserPage]) {
      assert.match(page, /umsh-funnel-auth-gate\.js[^>]*data-guest-teaser="umsh:love_thisyear:session_draft"/)
    }
    assert.match(gate, /if \(hasLocalGuestProfile\(\)\) \{[^}]*return reveal\(\); \}/)
  })

  it('02 제출: 비회원은 로그인으로 보내지 않고 04 로 간다(직접 입력이 모자라면 안내)', () => {
    const create = service.slice(service.indexOf('async function createPreviewFromDraft'), service.indexOf('/** 비회원은 계정 사주가 없으니'))
    assert.doesNotMatch(create, /location\.assign\(loginUrl\(\)\)/)
    assert.match(create, /buildGuestRequest\(draft\)/)
    assert.match(create, /location\.assign\(teaserUrl\(''\)\)/)
  })

  it('04: 비회원은 guestTeaser 로 요청하고 05·06 은 로그인을 요구한다', () => {
    assert.match(service, /return loadGuestTeaser\(\)/)
    assert.match(service, /guestTeaser: true/)
    assert.match(service, /reportPromise = null;\s*return \{ reason: 'login' \}/)
  })

  it('04: 결제 링크는 비회원이면 가입으로, 가입 뒤에는 결제로 이어 준다', () => {
    assert.match(service, /\.umsh-preview-checkout, #umsh-preview-checkout/)
    assert.match(service, /location\.assign\(loginUrl\(\)\)/)
    assert.match(service, /purchaseAfterAuth/)
  })
})
