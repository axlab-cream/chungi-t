import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { Server } from 'node:http'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Script } from 'node:vm'
import { after, before, describe, it } from 'node:test'

/**
 * 직장 선택·올해 연애 외 공개 서비스 7곳(재물·퇴사·이직·연애신호·고양이·커플·결혼궁합)도 천명사주처럼
 * 가입 전에 입력하고 티저까지 본다. 가입은 04 의 결제 링크에서 받는다.
 *
 * 서버: 토큰 없는 guestTeaser + preview 요청만 앞 두 항목·목차를 받고 아무것도 저장하지 않는다. 그 밖의 요청은 그대로 로그인을 요구한다.
 * 화면: 02 에서 직접 입력 → 04 비회원 티저 → 결제 링크 → 가입 → 결제. 게이트는 옵트인한 서비스에서만 비회원을 통과시킨다.
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

const birth = { year: 1990, month: 2, day: 3, hour: 14, minute: 30, gender: 'female', calendar: 'solar' }
const guest = { preview: true, guestTeaser: true }
const partner = { partnerName: '민수', partnerBirthText: '19890510', partnerBirth: { gender: 'male', calendar: 'solar' }, partnerBirthTimeKnown: false }
const self = { selfName: '나혜연', selfBirth: birth, selfBirthTimeKnown: true }
const workMove = {
  decisionMode: 'move_considering', currentCompanySignal: 'role_blur', targetCompanyName: '가나다 테크', targetRole: '백엔드 개발자',
  workType: 'hybrid', commuteLocation: '판교', salaryFeeling: 'slight_up', decisionDate: '', discomfortPoint: '평가가 불투명해요', priority: 'growth', realityChecks: [],
}

interface Service {
  name: string
  slug: string
  path: string
  /** 비회원이 보내는 본문(guestTeaser 제외). */
  body: Record<string, unknown>
  /** 직접 입력한 사주가 필요한 서비스는 사주가 빠지면 400. */
  selfKey?: string
  js: string
  gateKey: string
  flagKey: string
  pages: string[]
}

const SERVICES: Service[] = [
  {
    name: '재물', slug: 'money/save', path: '/api/money/save/analyze', js: 'save-service.js', gateKey: 'umsh_save_step2_payload_v1', flagKey: 'umsh:money-save:purchase-after-auth',
    body: { moneyHabit: '남는 돈 없음 · 관계/정산', incomePattern: '월급 중심', leakPoint: '관계/정산', relationSpending: '모임 비용', savingGoal: '비상금 만들기', concern: '돈이 금방 사라져요', name: '나혜연', birth, birthTimeKnown: true },
    pages: ['02-step-2-saju-input', '04-step-4-report'],
  },
  {
    name: '퇴사', slug: 'work/quit', path: '/api/work/quit/analyze', js: 'quit-service.js', gateKey: 'umsh_quit_input_payload_v1', flagKey: 'umsh:work-quit:purchase-after-auth',
    body: { reason: '사람', name: '나혜연', birth, birthTimeKnown: true },
    pages: ['02-step-2-saju-input', '04-step-4-report'],
  },
  {
    name: '연애신호', slug: 'love/signal', path: '/api/love/signal/analyze', js: 'signal-service.js', gateKey: 'umsh:report-input:couple_signal', flagKey: 'umsh:love-signal:purchase-after-auth', selfKey: 'selfBirth',
    body: { ...self, ...partner, relationshipStage: '연인', signalFocus: 'contact_change', concern: '연락이 줄었어요' },
    pages: ['02-step-2-saju-input', '04-step-4-report'],
  },
  {
    name: '고양이궁합', slug: 'match/cat', path: '/api/match/cat/analyze', js: 'cat-service.js', gateKey: 'cat_compatibility_step2_payload', flagKey: 'umsh:match-cat:purchase-after-auth', selfKey: 'selfBirth',
    body: { ...self, catName: '나비', household: 'single_cat', ageBand: 'adult', behaviorTags: ['shy', 'touch_friendly'], touchStyle: 'short_touch', playEnergy: 'medium', routineFlags: ['none'], focusArea: 'distance', upcomingEvent: 'none', note: '' },
    pages: ['02-step-2-saju-input', '04-step-4-report'],
  },
  {
    name: '커플궁합', slug: 'match/couple', path: '/api/match/couple/analyze', js: 'couple-service.js', gateKey: 'umsh:couple-match:input', flagKey: 'umsh:match-couple:purchase-after-auth', selfKey: 'selfBirth',
    body: { ...self, ...partner, relationshipStage: 'dating', focus: 'overall', relationshipTemperature: 'warm', concern: '자주 다퉈요' },
    pages: ['02-step-2-saju-input', '04-step-4-report'],
  },
  {
    name: '결혼궁합', slug: 'match/marry', path: '/api/match/marry/analyze', js: 'marry-service.js', gateKey: 'umsh_marry_input_payload', flagKey: 'umsh:match-marry:purchase-after-auth', selfKey: 'selfBirth',
    body: { ...self, ...partner, relationshipStage: '연애 중', marriagePlan: '결혼 신호', concern: '결혼 시기' },
    pages: ['02-step-2-saju-input', '04-step-4-report'],
  },
]

const MOVE_BODY = {
  ...birth, birth, birthTimeKnown: true, serviceKey: 'work_move', service_key: 'work_move',
  context: { serviceKey: 'work_move', name: '나혜연', target: '본인', relationship: '직장·회사 이동', orientation: '이직 판단', work: '이직을 고민 중', concern: '평가가 불투명해요', birthTimeKnown: true, workMove },
  workMove, input: workMove,
}

async function post(path: string, body: Record<string, unknown>, token?: string) {
  const response = await fetch(`${origin}${path}`, {
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

function expectGuestPreview(res: Awaited<ReturnType<typeof post>>, opening = true) {
  assert.equal(res.status, 200, JSON.stringify(res.json))
  assert.equal(res.json.guestPreview, true)
  assert.equal(res.json.previewOnly, true)
  assert.equal(res.json.entitled, false)
  assert.equal(res.json.reportId, '')
  assert.equal(res.json.paymentUrl, undefined)
  // 이직은 로그인한 사람에게도 앞 두 항목 본문이 따로 오지 않고 동결 미리보기(preview)만 온다.
  if (opening) assert.equal(res.json.teaserSections?.length, 2, '앞 두 항목이 있어야 04 티저가 그려진다')
  else assert.ok(res.json.preview?.headline || res.json.preview?.summary, '동결 미리보기가 있어야 04 티저가 그려진다')
  // 이직은 로그인 사용자와 같은 모양으로 섹션이 빈 report 껍데기가 함께 온다. 어느 쪽이든 본문 섹션은 가지 않는다.
  assert.ok(!res.json.report || (res.json.report.sections ?? []).length === 0, '전체 리포트 본문은 비회원에게 가지 않는다')
  assert.match(res.headers.get('cache-control') ?? '', /no-store/)
}

for (const service of SERVICES) {
  describe(`${service.name}(${service.slug}) 비회원 티저 API`, () => {
    it('guestTeaser + preview 는 로그인 없이 앞 두 항목과 목차만 돌려주고 결제·리포트 식별자는 비운다', async () => {
      const res = await post(service.path, { ...service.body, ...guest })
      expectGuestPreview(res)
      assert.ok((res.json.toc as unknown[]).length > 2, '목차는 전체를 보여 준다')
    })

    it('표시가 모자란 요청은 그대로 401 이다', async () => {
      assert.equal((await post(service.path, { ...service.body, preview: true })).status, 401)
      assert.equal((await post(service.path, { ...service.body, guestTeaser: true })).status, 401, 'preview 없이 guestTeaser 만으로는 열리지 않는다')
      assert.equal((await post(service.path, service.body)).status, 401)
    })

    it('토큰이 있으면 비회원 경로를 타지 않는다(저장된 사주가 없으면 회원 경로가 거절한다)', async () => {
      const member = await post(service.path, { ...service.body, ...guest, selfBirth: undefined, birth: undefined }, 'specialized-guest-member')
      assert.notEqual(member.status, 200, '토큰이 있는데 비회원 응답이 나오면 안 된다')
      assert.ok(!member.json.guestPreview)
    })

    if (service.selfKey) {
      it('직접 입력한 사주가 없으면 비회원은 400 이다(계정 사주를 쓸 수 없다)', async () => {
        assert.equal((await post(service.path, { ...service.body, ...guest, selfBirth: undefined })).status, 400)
      })
    } else {
      it('잘못된 생년월일은 400 이다', async () => {
        assert.equal((await post(service.path, { ...service.body, ...guest, birth: { ...birth, month: 2, day: 31 } })).status, 400)
      })
    }
  })
}

describe('이직(work/move) 비회원 티저 API', () => {
  it('guestTeaser + preview 는 /api/saju/analyze 에서 동결 미리보기를 돌려주고 아무것도 저장하지 않는다', async () => {
    const res = await post('/api/saju/analyze', { ...MOVE_BODY, ...guest })
    expectGuestPreview(res, false)
  })

  it('표시가 모자라면 401 이다', async () => {
    assert.equal((await post('/api/saju/analyze', { ...MOVE_BODY, preview: true })).status, 401)
    assert.equal((await post('/api/saju/analyze', { ...MOVE_BODY, guestTeaser: true })).status, 401)
  })

  it('다른 서비스키는 guestTeaser 로도 열리지 않는다', async () => {
    const res = await post('/api/saju/analyze', { ...MOVE_BODY, ...guest, serviceKey: 'love_this_year', service_key: 'love_this_year', context: { serviceKey: 'love_this_year' } })
    assert.notEqual(res.status, 200)
    assert.ok(!res.json.guestPreview)
  })
})

describe('아직 열지 않은 서비스', () => {
  it('재회운은 guestTeaser 로도 열리지 않는다', async () => {
    const res = await post('/api/love/again/analyze', { ...guest, ...partner })
    assert.equal(res.status, 401)
  })
})

describe('화면 연결', () => {
  const JS = [...SERVICES.map(service => ({ name: service.name, js: service.js })), { name: '이직', js: 'work-move-service.js' }]

  it('수정한 브라우저 스크립트는 문법 오류 없이 컴파일된다', () => {
    for (const { js } of [...JS, { js: 'umsh-funnel-auth-gate.js' }]) {
      assert.doesNotThrow(() => new Script(read('사주', 'js', js), { filename: js }), js)
    }
  })

  for (const service of SERVICES) {
    it(`${service.name}: 02·04 는 data-guest-teaser 로 게이트에 비회원 통과를 알린다`, () => {
      for (const page of service.pages) {
        const html = read('사주', ...service.slug.split('/'), page, 'index.html')
        assert.ok(html.includes(`data-guest-teaser="${service.gateKey}"`), `${service.slug}/${page}`)
      }
    })

    it(`${service.name}: 04 는 비회원이면 guestTeaser 로 요청하고 결제 링크를 가입으로 보내며, 가입 뒤 결제로 잇는다`, () => {
      const code = read('사주', 'js', service.js)
      assert.match(code, /guestTeaser: true/)
      assert.match(code, /loadGuestTeaser\(/)
      assert.match(code, /\.umsh-preview-checkout/)
      assert.ok(code.includes(service.flagKey), '가입 뒤 결제로 잇는 표시가 없다')
      assert.match(code, /location\.assign\(loginUrl\(\)\)/)
      assert.doesNotMatch(code, /로그인 후 저장된 사주로 무료 해석을 볼 수 있습니다/, '02 제출에서 비회원을 막는 문구가 남아 있다')
    })
  }

  it('이직: 비회원 요청에 guestTeaser 를 싣고, 번호 없는 04 에서 다시 요청하며, 결제 링크를 가입으로 보낸다', () => {
    const code = read('사주', 'js', 'work-move-service.js')
    assert.match(code, /session\?\.access_token \? \{\} : \{ guestTeaser: true \}/)
    assert.match(code, /async function ensureTeaserWithoutId\(\)/)
    assert.match(code, /\.umsh-preview-checkout, #umsh-preview-checkout, \[data-action="purchase"\]/)
    assert.ok(code.includes('umsh:work-move:purchase-after-auth'))
    for (const page of ['02-step-2-saju-input', '04-step-4-report']) {
      assert.ok(read('사주', 'work', 'move', page, 'index.html').includes('data-guest-teaser="umsh_work_move_input_payload_v1"'))
    }
  })

  it('게이트는 옵트인하지 않은 서비스에서는 그대로 비회원을 로그인으로 보낸다', () => {
    assert.match(gate, /if \(guestTeaser\) return reveal\(\);/)
    assert.match(gate, /global\.location\.replace\(loginUrl\(\)\)/)
    // 옵트인하지 않은 공개 서비스가 없는지: 이 테스트가 다루는 서비스와 직장 선택·올해 연애 외에는 태그가 없어야 한다.
    const optedIn = new Set([...SERVICES.map(service => service.slug), 'work/move', 'work/job-choice', 'love/this-year'])
    for (const slug of ['place/home', 'me/lucky', 'me/pass-angle', 'flow/newyear', 'day/wedding']) {
      assert.ok(!optedIn.has(slug))
      for (const page of ['02-step-2-saju-input', '04-step-4-report']) {
        assert.ok(!read('사주', ...slug.split('/'), page, 'index.html').includes('data-guest-teaser'), `${slug}/${page} 은 일시 중단 서비스라 옵트인하지 않는다`)
      }
    }
  })
})
