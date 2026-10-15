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

  it('6글자 모드를 켜지 않은 서비스(이직운)는 시간 모름이면 기존처럼 보류한다', async () => {
    const res = await analyze({ ...input, serviceKey: 'work_move', context: { serviceKey: 'work_move' } }, 'six-char-work-move')
    assert.equal(res.status, 200, JSON.stringify(res.json))
    assert.notEqual(res.json.uncertainty?.mode, 'six_char')
    assert.equal(res.json.elements, undefined)
    assert.equal(res.json.dayMaster.strength, undefined)
    const stored = await store.getReportRecord(res.json.report.reportId, { id: 'six-char-work-move' } as any)
    assert.equal(stored?.context.birthTimeReading, undefined)
  })

  it('시간을 알면 그대로 8글자다', async () => {
    const res = await analyze({ ...input, hour: 20, minute: 0, birthTimeKnown: true }, 'six-char-known')
    assert.equal(res.status, 200, JSON.stringify(res.json))
    assert.equal(res.json.uncertainty, undefined)
    assert.ok(res.json.pillars.hour)
  })
})
