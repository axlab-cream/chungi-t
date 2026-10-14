import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { Server } from 'node:http'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Script } from 'node:vm'
import { after, before, describe, it } from 'node:test'

/**
 * 직장 선택(work/job-choice)도 천명사주처럼 가입 전에 입력하고 티저까지 본다. 가입은 04 의 결제 버튼에서 받는다.
 *
 * 서버: 토큰 없는 guestTeaser + preview 요청만 계산값을 돌려주고 아무것도 저장하지 않는다. 그 밖의 요청은 그대로 로그인을 요구한다.
 * 화면: 02 에서 사주를 직접 입력 → 04 비회원 티저 → 결제 버튼 → 가입 → 결제. 로그인 게이트는 이 서비스에서 비회원을 보내지 않는다.
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
const service = read('사주', 'js', 'jobchoice-service.js')
const inputPage = read('사주', 'work', 'job-choice', '02-step-2-saju-input', 'index.html')
const teaserPage = read('사주', 'work', 'job-choice', '04-step-4-report', 'index.html')

const offer = {
  companyName: '가나다 테크', roleName: '백엔드 개발자', workMode: 'hybrid',
  commute: '판교 · 편도 50분', salaryFeeling: 'high', concernPoint: '야근이 잦다는 후기',
}
const birth = { year: 1987, month: 6, day: 10, hour: 20, minute: 0, gender: 'female', calendar: 'solar' }
const guestBody = { ...offer, name: '나혜연', birth, birthTimeKnown: true, preview: true, guestTeaser: true }

async function analyze(body: Record<string, unknown>, token?: string) {
  const response = await fetch(`${origin}/api/work/job-choice/analyze`, {
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

describe('직장 선택 비회원 티저 API', () => {
  it('guestTeaser + preview 는 로그인 없이 앞 두 항목과 목차를 돌려주고 결제·리포트 식별자는 비운다', async () => {
    const res = await analyze(guestBody)
    assert.equal(res.status, 200, JSON.stringify(res.json))
    assert.equal(res.json.guestPreview, true)
    assert.equal(res.json.previewOnly, true)
    assert.equal(res.json.entitled, false)
    assert.equal(res.json.reportId, '')
    assert.equal(res.json.resultId, '')
    assert.equal(res.json.paymentUrl, undefined)
    assert.equal(res.json.teaserSections?.length, 2, '앞 두 항목이 있어야 04 티저가 그려진다')
    assert.ok(res.json.preview?.headline || res.json.preview?.summary)
    assert.match(res.headers.get('cache-control') ?? '', /no-store/)
  })

  it('티저 응답에는 세 번째 이후 본문이 실리지 않는다', async () => {
    const res = await analyze(guestBody)
    const all = res.json.toc as Array<{ id: string }>
    assert.ok(all.length > 2, '목차는 전체를 보여 준다')
    const bodies = (res.json.teaserSections as Array<{ id: string }>).map(section => section.id)
    assert.equal(bodies.length, 2)
    assert.equal(res.json.report, undefined, '전체 리포트는 비회원에게 가지 않는다')
  })

  it('입력 없이 비회원 요청을 보내면 계정에 저장하지 않고 토큰 없는 일반 요청은 401 이다', async () => {
    assert.equal((await analyze({ ...offer, preview: true })).status, 401)
    assert.equal((await analyze({ ...offer, guestTeaser: true })).status, 401, 'preview 없이 guestTeaser 만으로는 열리지 않는다')
    assert.equal((await analyze({ ...offer })).status, 401)
  })

  it('토큰이 있으면(위조·만료 포함) 비회원 경로를 타지 않는다', async () => {
    const res = await analyze(guestBody, '')
    assert.equal(res.status, 200, '빈 토큰은 토큰 없음과 같다')
    const member = await analyze({ ...offer, preview: true, guestTeaser: true }, 'job-choice-member')
    assert.equal(member.status, 409, '토큰이 있으면 회원 경로가 계정 사주를 요구한다')
    assert.equal(member.json.code, 'PROFILE_REQUIRED')
  })

  it('잘못된 생년월일·누락된 오퍼는 400 이다', async () => {
    assert.equal((await analyze({ ...guestBody, birth: { ...birth, month: 2, day: 31 } })).status, 400)
    assert.equal((await analyze({ ...guestBody, birth: { ...birth, year: 1800 } })).status, 400)
    assert.equal((await analyze({ ...guestBody, companyName: '' })).status, 400)
  })

  it('다른 서비스는 guestTeaser 로도 열리지 않는다', async () => {
    const res = await fetch(`${origin}/api/love/again/analyze`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(guestBody),
    })
    assert.equal(res.status, 401)
  })
})

describe('로그인 게이트 옵트인', () => {
  it('02·04 는 data-guest-teaser 로 게이트에 비회원 통과를 알린다', () => {
    for (const page of [inputPage, teaserPage]) {
      assert.match(page, /umsh-funnel-auth-gate\.js[^>]*data-guest-teaser="umsh_job_choice_profile"/)
    }
  })

  it('게이트는 옵트인한 서비스에서만 비회원을 통과시키고, 다른 서비스는 그대로 로그인으로 보낸다', () => {
    assert.match(gate, /hasAttribute\('data-guest-teaser'\)/)
    assert.match(gate, /if \(guestTeaser\) return reveal\(\);\s*\/\/ 판정을 포기한/)
    assert.match(gate, /global\.location\.replace\(loginUrl\(\)\)/)
  })

  it('가입 직후 로컬 입력이 있으면 04 를 02 로 되돌리지 않는다', () => {
    assert.match(gate, /if \(onTeaser && !\(await hasSajuProfile\(session\)\)\) \{\s*\/\/[^\n]*\n\s*if \(hasLocalGuestProfile\(\)\) return reveal\(\);/)
  })
})

describe('화면 연결', () => {
  it('수정한 브라우저 스크립트는 문법 오류 없이 컴파일된다', () => {
    for (const [name, code] of [['umsh-funnel-auth-gate.js', gate], ['jobchoice-service.js', service]]) assert.doesNotThrow(() => new Script(code, { filename: name }), name)
  })

  it('02: 가입 전에는 사주 입력칸을 열고, 성별을 추측해 채우지 않는다', () => {
    assert.match(inputPage, /umsh-jobchoice-local-profile/)
    assert.match(inputPage, /localProfileMode \? readProfileFromForm\(\) : stored\.profile/)
    assert.match(inputPage, /성별을 선택해 주세요/)
    assert.match(service, /const openLocalInput = \(\) => window\.dispatchEvent\(new CustomEvent\('umsh-jobchoice-local-profile'\)\)/)
  })

  it('04: 비회원은 guestTeaser 로 요청하고 05·06 은 로그인을 요구한다', () => {
    assert.match(service, /if \(teaserPage\) return loadGuestTeaser\(request\)/)
    assert.match(service, /preview: true, guestTeaser: true/)
    assert.match(service, /reportPromise = null;\s*return \{ reason: 'login' \}/)
  })

  it('04: 결제 버튼은 비회원이면 가입으로, 가입 뒤에는 결제로 이어 준다', () => {
    assert.match(service, /if \(outcome\.guest\) \{[\s\S]*?location\.assign\(loginUrl\(\)\)/)
    assert.match(service, /purchaseAfterAuth/)
    assert.match(service, /error\.code === 'PROFILE_REQUIRED' && await saveLocalProfileToAccount\(\)/)
  })
})
