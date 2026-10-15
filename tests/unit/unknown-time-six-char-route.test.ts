import assert from 'node:assert/strict'
import type { Server } from 'node:http'
import { after, before, describe, it } from 'node:test'

/**
 * 3단계(2026-10-15): 천명사주 실제 경로(/api/saju/analyze)에서 출생 시각을 모르면 6글자 모드가 켜지는지 본다.
 * 천명사주 문맥은 서비스 키를 비워 두므로 단위 테스트만으로는 놓친다(리뷰 지적).
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


const input = { year: 1987, month: 6, day: 10, calendar: 'solar', gender: 'female', name: '테스트', concern: '이직이 맞는지 궁금해요', birthTimeKnown: false }

async function analyze(body: Record<string, unknown>, token?: string) {
  const response = await fetch(`${origin}/api/saju/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  })
  return { status: response.status, json: await response.json() as Record<string, any> }
}

function assertSixChar(json: Record<string, any>) {
  assert.equal(json.uncertainty?.mode, 'six_char', JSON.stringify(json.uncertainty))
  assert.equal(json.pillars.hour, undefined)
  assert.equal(json.birth.hour, undefined)
  assert.equal(json.fortune?.daewoon, undefined)
  assert.equal(json.summary, undefined)
  // 참고 풀이 사례(정묘·병오·경인): 6글자로 흙·물 0개.
  assert.deepEqual(json.elements, { wood: 2, fire: 3, earth: 0, metal: 1, water: 0 })
  assert.ok(json.dayMaster.strength)
  assert.ok(json.usefulGod)
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

describe('천명사주 시간 모름 6글자 모드(실제 경로)', () => {
  it('비회원 티저는 6글자 오행·강약·용신을 보여 주고 시주·출생 시각·대운 시점은 뺀다', async () => {
    const res = await analyze({ ...input, guestTeaser: true })
    assert.equal(res.status, 200, JSON.stringify(res.json))
    assertSixChar(res.json)
  })

  it('회원 리포트도 6글자 모드로 만들어지고, 기본 풀이에 시주·임시 대운이 없다', async () => {
    const res = await analyze(input, 'six-char-member')
    assert.equal(res.status, 200, JSON.stringify(res.json))
    assertSixChar(res.json)
    const stored = await store.getReportRecord(res.json.report.reportId, { id: 'six-char-member' } as any)
    assert.equal(stored?.context.birthTimeReading, 'six_char')
    assert.ok(stored!.report.sections.every((s) => s.patternKeys.includes('birthTime:six_char')))
    assert.doesNotMatch(res.json.report.subtitle ?? '', /보류/)
  })

  it('표시 없는 예전 리포트는 다시 열어도 예전 방식(보류) 그대로다 — 같은 주소, 섞이지 않음', async () => {
    // 서버가 실제로 읽은 생년월일·문맥을 얻는다.
    const probe = await analyze(input, 'six-char-probe')
    const parsed = await store.getReportRecord(probe.json.report.reportId, { id: 'six-char-probe' } as any)
    const { birthTimeReading: _marker, ...oldContext } = parsed!.context
    // 3단계 이전에 만들어진 리포트: 같은 ID 규칙, 표시 없는 문맥, 보류 방식 기본 풀이.
    const owner = { id: 'six-char-old-record' } as any
    const { analyzeSaju } = await import('../../src/saju/analyzer.js')
    const { buildTemplateSajuReport } = await import('../../src/report/report-generator.js')
    const analysis = analyzeSaju(parsed!.birth)
    const reportId = store.createReportId(parsed!.birth, oldContext, undefined, owner.id)
    await store.createOrGetReportRecord({ reportId, birth: parsed!.birth, context: oldContext, analysis, templateReport: buildTemplateSajuReport(analysis, parsed!.birth, oldContext), owner, lineageId: store.createReportLineageId(parsed!.birth, oldContext, owner.id) })
    const again = await analyze(input, owner.id)
    assert.equal(again.status, 200, JSON.stringify(again.json))
    assert.equal(again.json.report.reportId, reportId)
    assert.notEqual(again.json.uncertainty?.mode, 'six_char')
    assert.equal(again.json.elements, undefined)
    assert.equal(again.json.dayMaster.strength, undefined)
    assert.match(again.json.report.subtitle, /보류/)
  })

  it('이직운도 천명사주와 같은 6글자 모드로 만들어진다(10/15 확대)', async () => {
    const res = await analyze({ ...input, serviceKey: 'work_move', context: { serviceKey: 'work_move' } }, 'six-char-work-move')
    assert.equal(res.status, 200, JSON.stringify(res.json))
    assertSixChar(res.json)
    const stored = await store.getReportRecord(res.json.report.reportId, { id: 'six-char-work-move' } as any)
    assert.equal(stored?.context.birthTimeReading, 'six_char')
  })

  it('전문 서비스 비회원 맛보기(저축·커플 궁합): 6글자로 그리고, 시간 칸은 입력하지 않음', async () => {
    const post = async (path: string, body: Record<string, unknown>) => {
      const response = await fetch(`${origin}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      return { status: response.status, json: await response.json() as Record<string, any> }
    }
    const teaserText = (json: Record<string, any>) => JSON.stringify(json.teaserSections ?? [])
    const chartSum = (json: Record<string, any>, from = 0, to?: number) => (json.teaserSections ?? []).flatMap((t: any) => (t.storytelling?.chartPoints ?? []).slice(from, to)).reduce((sum: number, p: any) => sum + p.value, 0)
    const money = await post('/api/money/save/analyze', { ...input, guestTeaser: true, preview: true, moneyHabit: '예산대로 씁니다', incomePattern: '월급', savingGoal: '여유자금', concern: '현재 습관 확인' })
    assert.equal(money.status, 200, JSON.stringify(money.json))
    assert.ok((money.json.teaserSections ?? []).length > 0, '맛보기 항목이 있어야 검사가 의미 있다')
    assert.match(teaserText(money.json), /태어난 시간 \| 입력하지 않음/)
    assert.equal(chartSum(money.json), 6)
    const couple = await post('/api/match/couple/analyze', { guestTeaser: true, preview: true, selfName: '테스트', selfBirth: { year: 1987, month: 6, day: 10, gender: 'female', calendar: 'solar' }, selfBirthTimeKnown: false, partnerName: '합성', partnerBirthText: '19940912', partnerBirth: { gender: 'male', calendar: 'solar' }, relationshipStage: '연애 중', conflictPattern: '연락 속도와 빈도', concern: '같은 문제로 자꾸 다퉈요.' })
    assert.equal(couple.status, 200, JSON.stringify(couple.json))
    assert.ok((couple.json.teaserSections ?? []).length > 0, '맛보기 항목이 있어야 검사가 의미 있다')
    assert.match(teaserText(couple.json), /태어난 시간 \| 입력하지 않음 \| 입력하지 않음/)
    assert.equal(chartSum(couple.json, 0, 5), 6)
    assert.equal(chartSum(couple.json, 5), 6)
  })

  it('시간을 알면 그대로 8글자다', async () => {
    const res = await analyze({ ...input, hour: 20, minute: 0, birthTimeKnown: true }, 'six-char-known')
    assert.equal(res.status, 200, JSON.stringify(res.json))
    assert.equal(res.json.uncertainty, undefined)
    assert.ok(res.json.pillars.hour)
  })
})
