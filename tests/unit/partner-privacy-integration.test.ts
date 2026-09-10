import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import type { Server } from 'node:http'
import type { UserBirthProfile } from '../../src/user/profile-store.js'
import type { SajuReportContext } from '../../src/types/index.js'

// 저장 모듈을 메모리로 고정한 뒤 합성 인증을 켠다. dotenv 를 읽지 않고
// 제공자·데이터베이스·결제로 나가는 요청을 이 프로세스에서 금지한다.
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
    return new Response(JSON.stringify({ id: token, email: `${token}@synthetic.invalid` }), { status: token ? 200 : 401, headers: { 'Content-Type': 'application/json' } })
  }
  if (origin && url.origin === origin) return nativeFetch(input, init)
  unexpected.push(url.origin)
  throw new Error('External requests are forbidden in this integration suite')
}) as typeof fetch

const store = await import('../../src/report/report-store.js')
const profiles = await import('../../src/user/profile-store.js')
const payments = await import('../../src/payment/order-store.js')
const { analyzeSaju } = await import('../../src/saju/analyzer.js')
const { buildTemplateSajuReport } = await import('../../src/report/report-generator.js')
process.env.SUPABASE_URL = 'https://synthetic-auth.invalid'
process.env.SUPABASE_PUBLISHABLE_KEY = 'synthetic-public-fixture-only'
process.env.PAYMENT_TEST_MODE = 'true'
const { default: app } = await import('../../src/server/app.js')

let server: Server
const OWNER = 'partner-privacy-owner'
const birth = { year: 1975, month: 9, day: 26, hour: 5, minute: 0, gender: 'male' as const, calendar: 'solar' as const }
const profile: UserBirthProfile = {
  userId: OWNER, name: '합성점검', birth, birthTimeKnown: true, context: {},
  createdAt: '2026-09-07T00:00:00Z', updatedAt: '2026-09-07T00:00:00Z',
}
/** 2026-09-10 이전에 저장된 레코드를 재현한다. 상대의 생년월일시 원본이 들어 있다. */
const LEGACY_REPORT_ID = 'partner-privacy-legacy'
const PARTNER_BIRTH = { year: 1994, month: 9, day: 15, hour: 14, minute: 30, gender: 'female' as const, calendar: 'solar' as const }
const legacyContext = {
  serviceKey: 'love_this_year',
  name: '합성점검',
  partner: {
    mode: 'known' as const, name: '김하나', relationship: '연애 상대', birthTimeKnown: true,
    birth: PARTNER_BIRTH,
    pillars: { year: '甲戌', month: '癸酉', day: '丙申', hour: '乙未' },
    dayMaster: '병(丙)',
  },
} as SajuReportContext

async function request(path: string, body?: unknown, owner = OWNER) {
  const response = await fetch(origin + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { ...(owner ? { Authorization: `Bearer ${owner}` } : {}), 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  return { response, payload: await response.json() as any }
}

before(async () => {
  assert.equal(store.getReportStorageMode(), 'memory')
  assert.equal(profiles.getUserProfileStorageMode(), 'memory')
  await profiles.saveUserBirthProfile(profile, { id: OWNER })
  const analysis = analyzeSaju(birth)
  const timestamp = '2026-09-01T00:00:00Z'
  await store.saveReportRecord({
    reportId: LEGACY_REPORT_ID,
    birth,
    context: legacyContext,
    owner: { id: OWNER, email: `${OWNER}@synthetic.invalid`, provider: 'google' },
    report: buildTemplateSajuReport(analysis, birth, legacyContext),
    status: 'complete',
    createdAt: timestamp,
    updatedAt: timestamp,
  })
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
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  }
  globalThis.fetch = nativeFetch
  for (const name of Object.keys(process.env)) if (!(name in previousEnv)) delete process.env[name]
  Object.assign(process.env, previousEnv)
  assert.deepEqual(unexpected, [])
})

describe('상대 개인정보가 응답으로 나가지 않는다', { concurrency: false }, () => {
  it('과거 레코드를 조회해도 상대 생년월일시는 응답에 실리지 않는다', async () => {
    // 저장소에는 남아 있다(소급 삭제하지 않기로 했다). 응답에서만 가린다.
    const stored = await store.findReportRecord(LEGACY_REPORT_ID, { id: OWNER })
    assert.equal(stored?.context.partner?.birth?.year, PARTNER_BIRTH.year, '픽스처가 원본을 갖고 있어야 검사가 성립한다')

    // 미결제 상태의 조회 응답에는 context 가 아예 없다. 문맥 반환 경로를 검사하려면
    // 결제 완료 상태를 만들어야 한다.
    await payments.savePaymentOrder({
      orderId: 'synthetic-partner-privacy-paid', ownerId: OWNER, buyerEmail: 'fixture@synthetic.invalid',
      buyerTel: '00000000000', productKey: 'love_this_year', productTitle: 'Synthetic fixture',
      amount: 19900, status: 'paid', reportId: LEGACY_REPORT_ID,
      createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z',
    })

    const { response, payload } = await request(`/api/report/${LEGACY_REPORT_ID}`)
    assert.equal(response.status, 200)
    assert.ok(payload.context, `문맥이 응답에 없어 이 검사가 성립하지 않는다: ${JSON.stringify(payload).slice(0, 160)}`)
    const serialized = JSON.stringify(payload)
    for (const needle of ['"year":1994', '"day":15', '"hour":14', '"minute":30']) {
      assert.ok(!serialized.includes(needle), `응답에 상대 생년월일시 흔적이 남았다: ${needle}`)
    }
    // 계산 결과는 남아 있어야 한다 — 가리는 것은 원본뿐이다.
    assert.equal(payload.context?.partner?.birth, undefined)
    assert.equal(payload.context?.partner?.pillars?.year, '甲戌')
    assert.equal(payload.context?.partner?.dayMaster, '병(丙)')
  })

  it('상대 정보를 담은 일반 해석 요청은 전용 입력 경로로 되돌린다', async () => {
    // love_this_year 는 전용 라우트를 쓰므로 이 경로로 상대 정보가 들어올 수 없다.
    // 이 검사는 상대 정보 유입구가 닫혀 있음을 고정한다.
    const { response, payload } = await request('/api/saju/analyze', {
      birth,
      context: {
        serviceKey: 'love_this_year',
        partner: { mode: 'known', name: '김하나', birthTimeKnown: true, birth: PARTNER_BIRTH },
      },
    })
    assert.equal(response.status, 400)
    assert.equal(payload.code, 'INPUT_REQUIRED')
  })
it('과거 부모 해석으로 상담을 만들어도 상대 생년월일시가 다시 저장·전송되지 않는다', async () => {
    // 저장된 상담은 부모 문맥을 시스템 메시지로 직렬화하고 새 레코드로도 저장한다.
    // 부모에 원본이 남아 있으므로 그대로 복사하면 원본이 다시 퍼진다.
    const { response, payload } = await request('/api/chat', {
      parentReportId: LEGACY_REPORT_ID,
      message: '이 해석에서 상대와 다시 만날 가능성을 어떻게 봐야 하나요',
    })
    // OpenAI 가 없는 환경이므로 생성은 실패하거나 대기 상태다. 검사 대상은 저장된 문맥이다.
    assert.ok([200, 202, 502].includes(response.status), `예상 밖 상태: ${response.status}`)
    const childId = payload.resultId ?? payload.reportId
    assert.ok(childId, `상담 레코드 id 를 받지 못했다: ${JSON.stringify(payload).slice(0, 200)}`)

    const child = await store.findReportRecord(childId, { id: OWNER })
    assert.ok(child, '상담 레코드가 저장되지 않았다')
    const savedContext = JSON.stringify(child!.context)
    for (const needle of [`"year":${PARTNER_BIRTH.year}`, `"day":${PARTNER_BIRTH.day}`, `"hour":${PARTNER_BIRTH.hour}`]) {
      assert.ok(!savedContext.includes(needle), `상담 레코드에 상대 생년월일시가 저장됐다: ${needle}`)
    }
    assert.equal(child!.context.partner?.birth, undefined)
    // 모델로 나가는 메시지가 레코드에 그대로 저장되므로 프롬프트 자체를 검사할 수 있다.
    const outbound = JSON.stringify((child!.context as any).savedChat?.messages ?? [])
    assert.ok(outbound.length > 50, '저장된 프롬프트가 비어 있어 검사가 성립하지 않는다')
    for (const needle of [`"year":${PARTNER_BIRTH.year}`, `"day":${PARTNER_BIRTH.day}`, `"hour":${PARTNER_BIRTH.hour}`]) {
      assert.ok(!outbound.includes(needle), `모델 메시지에 상대 생년월일시가 실렸다: ${needle}`)
    }
  })
})
