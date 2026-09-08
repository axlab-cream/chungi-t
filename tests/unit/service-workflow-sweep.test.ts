import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import type { Server } from 'node:http'
import type { UserBirthProfile } from '../../src/user/profile-store.js'

/**
 * 소비자가 밟는 여섯 단계 — 선택 → 입력 → 로그인 → 티저 → 목록 → 해석 — 를 19개 상품
 * 전부에 대해 한 번에 확인한다. 서비스마다 개별 테스트가 있지만 단계별로 흩어져 있어,
 * 새 서비스가 어느 단계에서 빠졌는지 한눈에 드러나지 않았다(결혼택일이 티저와 저장결과
 * 서비스키 대조 없이 배포된 적이 있다).
 *
 * 외부 요청은 전부 막고 합성 인증만 통과시킨다. 저장소는 메모리 모드에서만 돈다.
 */
const previousEnv = { ...process.env }
process.env.NODE_ENV = 'test'
for (const name of Object.keys(process.env)) {
  if (/DATABASE|SUPABASE|OPENAI|ANTHROPIC|INICIS|PAYMENT|VERCEL|REPORT_STORAGE|ADMIN_EMAIL/.test(name)) delete process.env[name]
}
const nativeFetch = globalThis.fetch
let origin = ''
const unexpected: string[] = []
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
  unexpected.push(url.origin)
  throw new Error('External requests are forbidden in this sweep')
}) as typeof fetch

const store = await import('../../src/report/report-store.js')
const profiles = await import('../../src/user/profile-store.js')
const payments = await import('../../src/payment/order-store.js')
const { listPaymentProducts } = await import('../../src/payment/catalog.js')
process.env.SUPABASE_URL = 'https://synthetic-auth.invalid'
process.env.SUPABASE_PUBLISHABLE_KEY = 'synthetic-public-fixture-only'
const { default: app } = await import('../../src/server/app.js')
let server: Server

const OWNER = 'sweep-owner'
const profile: UserBirthProfile = {
  userId: OWNER,
  name: '합성점검',
  birth: { year: 1975, month: 9, day: 26, hour: 5, minute: 0, gender: 'male', calendar: 'solar' },
  birthTimeKnown: true,
  context: {},
  createdAt: '2026-09-07T00:00:00Z',
  updatedAt: '2026-09-07T00:00:00Z',
}

/**
 * /api/saju/analyze 를 공유하는 네 서비스(천명사주·집 풍수·이직운·붙을 각)는 실제 화면과
 * 같은 형태로 보낸다. 생년월일은 본문 최상위, serviceKey 는 context 안이다. 이 순서가
 * 아니면 서버가 인증 전에 입력 검증으로 400 을 돌려준다.
 */
function sharedBody(serviceKey: string): Record<string, unknown> {
  return {
    year: profile.birth.year,
    month: profile.birth.month,
    day: profile.birth.day,
    hour: profile.birth.hour,
    gender: profile.birth.gender,
    calendar: profile.birth.calendar,
    birthTimeKnown: true,
    preview: true,
    context: { serviceKey, name: profile.name },
  }
}
const SHARED_BODY = sharedBody('saju_master')

/** 상품 키 → 이 서비스의 생성 엔드포인트와 진입 경로. 코드에서 확인한 값만 적는다. */
const ROUTES: Record<string, { analyze: string; entry: string; body?: Record<string, unknown> }> = {
  cmdg: { analyze: '/api/saju/analyze', entry: '/cmdg/', body: SHARED_BODY },
  love_this_year: { analyze: '/api/love/this-year/analyze', entry: '/love/this-year' },
  wedding_day: { analyze: '/api/day/wedding/analyze', entry: '/day/wedding', body: { candidateDate1: '2027-05-15' } },
  newyear_flow: { analyze: '/api/flow/newyear/analyze', entry: '/flow/newyear' },
  home_pungsu: { analyze: '/api/saju/analyze', entry: '/place/home', body: sharedBody('home_fit') },
  work_move: { analyze: '/api/saju/analyze', entry: '/work/move', body: sharedBody('work_move') },
  work_job: { analyze: '/api/work/job/analyze', entry: '/work/job' },
  quit_fortune: { analyze: '/api/work/quit/analyze', entry: '/work/quit' },
  job_choice: { analyze: '/api/work/job-choice/analyze', entry: '/work/job-choice' },
  cat_compatibility: { analyze: '/api/match/cat/analyze', entry: '/match/cat' },
  lucky_color: { analyze: '/api/me/lucky/analyze', entry: '/me/lucky' },
  money_save: { analyze: '/api/money/save/analyze', entry: '/money/save' },
  marry_match: { analyze: '/api/match/marry/analyze', entry: '/match/marry' },
  match_couple: { analyze: '/api/match/couple/analyze', entry: '/match/couple' },
  couple_signal: { analyze: '/api/love/signal/analyze', entry: '/love/signal' },
  love_mind: { analyze: '/api/love/mind/analyze', entry: '/love/mind' },
  love_again: { analyze: '/api/love/again/analyze', entry: '/love/again' },
  love_spouse: { analyze: '/api/love/spouse/analyze', entry: '/love/spouse' },
  pass_angle: { analyze: '/api/saju/analyze', entry: '/me/pass-angle', body: sharedBody('pass_angle') },
}

async function call(path: string, body?: unknown, owner: string | null = OWNER) {
  const response = await fetch(origin + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { ...(owner ? { Authorization: `Bearer ${owner}` } : {}), 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    redirect: 'manual',
  })
  const text = await response.text()
  let payload: Record<string, unknown> = {}
  try {
    payload = JSON.parse(text) as Record<string, unknown>
  } catch {
    payload = {}
  }
  return { response, payload, text }
}

before(async () => {
  assert.equal(store.getReportStorageMode(), 'memory')
  assert.equal(profiles.getUserProfileStorageMode(), 'memory')
  assert.equal(payments.getPaymentStorageMode(), 'memory')
  await profiles.saveUserBirthProfile({ ...profile, userId: OWNER }, { id: OWNER })
  server = await new Promise<Server>((resolve, reject) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance))
    instance.once('error', reject)
  })
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  origin = `http://127.0.0.1:${address.port}`
})

after(async () => {
  if (server) {
    server.closeAllConnections()
    await new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())))
  }
  globalThis.fetch = nativeFetch
  for (const name of Object.keys(process.env)) if (!(name in previousEnv)) delete process.env[name]
  Object.assign(process.env, previousEnv)
  assert.deepEqual(unexpected, [])
})

describe('19개 상품의 소비자 6단계', { concurrency: false }, () => {
  it('카탈로그의 모든 상품이 이 점검표에 등록되어 있다', () => {
    const products = listPaymentProducts().map(item => item.key)
    assert.equal(products.length, 19, `카탈로그 상품 수가 ${products.length}개입니다. 점검표를 맞춰 주세요.`)
    for (const key of products) {
      assert.ok(ROUTES[key], `${key}: 6단계 점검표에 진입 경로와 생성 엔드포인트가 없습니다.`)
    }
  })

  it('1단계 선택: 모든 상품의 진입 경로가 자기 서비스의 첫 화면으로 도착한다', async () => {
    const broken: string[] = []
    for (const [key, route] of Object.entries(ROUTES)) {
      const { response } = await call(route.entry)
      const location = response.headers.get('location') ?? ''
      const landed = response.status === 200 || (response.status >= 300 && response.status < 400)
      if (!landed) broken.push(`${key}: ${route.entry} → ${response.status}`)
      // 리다이렉트면 같은 서비스 안으로 가야 한다. 다른 서비스로 새면 안 된다.
      if (location && !location.startsWith(route.entry) && !location.startsWith('/cmdg')) {
        broken.push(`${key}: ${route.entry} → ${location} (서비스 밖으로 이동)`)
      }
    }
    assert.deepEqual(broken, [])
  })

  it('3단계 로그인: 비로그인 생성 요청은 모두 401 로 막힌다', async () => {
    const leaks: string[] = []
    for (const [key, route] of Object.entries(ROUTES)) {
      const { response } = await call(route.analyze, route.body ?? { preview: true }, null)
      if (response.status !== 401) leaks.push(`${key}: ${route.analyze} → ${response.status}`)
    }
    assert.deepEqual(leaks, [])
  })

it('2단계 입력: 전용 입력 화면이 있는 서비스는 그 경로가 열린다', async () => {
    // 천명사주·상대방 마음·재회운·배우자운·직업운은 한 화면 안에서 입력까지 받는 구조라
    // 별도 /input 단축 경로가 없다. 나머지는 그 경로가 열려야 한다.
    const singlePage = new Set(['cmdg', 'love_mind', 'love_again', 'love_spouse', 'work_job'])
    const broken: string[] = []
    for (const [key, route] of Object.entries(ROUTES)) {
      if (singlePage.has(key)) continue
      const { response } = await call(`${route.entry}/input`)
      const ok = response.status === 200 || (response.status >= 300 && response.status < 400)
      if (!ok) broken.push(`${key}: ${route.entry}/input → ${response.status}`)
    }
    assert.deepEqual(broken, [])
  })

  it('4단계 티저: 입력이 부족하면 서버 오류가 아니라 고칠 곳을 알려 준다', async () => {
    // 입력 파서들이 '현재 관계 상태를 선택해 주세요.' 같은 문장을 Error 로 던지고 라우트가
    // 그것을 500 으로 내리고 있었다. 화면은 500 을 서버 장애로 다루므로 사용자는 어느 칸을
    // 고쳐야 하는지 알 수 없었다. 부족한 입력은 400 INPUT_REQUIRED 여야 한다.
    const wrong: string[] = []
    for (const [key, route] of Object.entries(ROUTES)) {
      const { response, payload } = await call(route.analyze, { preview: true })
      if (response.status === 200) continue
      if (response.status === 400 && payload.code === 'INPUT_REQUIRED') {
        assert.ok(String(payload.error ?? '').length > 4, `${key}: 400 에 고칠 곳 안내가 없다`)
        continue
      }
      if (response.status === 409 && payload.code === 'PROFILE_REQUIRED') continue
      wrong.push(`${key}: ${response.status} ${String(payload.code ?? payload.error ?? '').slice(0, 40)}`)
    }
    assert.deepEqual(wrong, [])
  })

  it('4단계 티저: 티저까지 닿는 서비스는 본문 없이 미리보기만 준다', async () => {
    const leaks: string[] = []
    let reached = 0
    for (const [key, route] of Object.entries(ROUTES)) {
      const { response, payload } = await call(route.analyze, { ...(route.body ?? {}), preview: true })
      if (response.status !== 200) continue
      reached += 1
      if (payload.previewOnly !== true) leaks.push(`${key}: previewOnly 아님`)
      // report 껍데기는 있을 수 있다. 결제 전에 새면 안 되는 것은 섹션 본문이다.
      const sections = ((payload.report as Record<string, unknown> | undefined)?.sections ?? []) as Array<Record<string, unknown>>
      const withBody = sections.filter(section => String(section.interpretation ?? '').trim().length > 40)
      if (withBody.length) leaks.push(`${key}: 티저에 본문 ${withBody.length}개 섹션이 실려 나감`)
      if (!(payload.reportId ?? payload.resultId)) leaks.push(`${key}: 저장 식별자 없음`)
    }
    assert.ok(reached >= 5, `티저까지 닿은 서비스가 ${reached}개뿐입니다`)
    assert.deepEqual(leaks, [])
  })

  it('5단계 목록: 같은 입력은 같은 저장 식별자로 모인다', async () => {
    const drifting: string[] = []
    for (const [key, route] of Object.entries(ROUTES)) {
      const body = { ...(route.body ?? {}), preview: true }
      const first = await call(route.analyze, body)
      const second = await call(route.analyze, body)
      if (first.response.status !== 200 || second.response.status !== 200) continue
      const id = (p: Record<string, unknown>) => p.resultId ?? p.reportId
      if (id(first.payload) !== id(second.payload)) drifting.push(`${key}: 같은 입력이 다른 결과로 갈라짐`)
    }
    assert.deepEqual(drifting, [])
  })

  it('6단계 해석: 저장된 결과는 다른 서비스의 ID 로 열 수 없다', async () => {
    // 전용 엔드포인트를 쓰는 서비스는 ANALYZE_SERVICES 에 등록돼 있어야 서비스키를 대조한다.
    const dedicated = Object.entries(ROUTES).filter(([, route]) => route.analyze !== '/api/saju/analyze')
    const missing: string[] = []
    for (const [key, route] of dedicated) {
      const { response } = await call(route.analyze, { reportId: 'missing-saved-id' })
      // 등록된 엔드포인트는 없는 ID 에 404 를, 미등록이면 다른 이유로 실패한다.
      if (response.status !== 404) missing.push(`${key}: ${route.analyze} 저장결과 조회 → ${response.status}`)
    }
    assert.deepEqual(missing, [])
  })
})
