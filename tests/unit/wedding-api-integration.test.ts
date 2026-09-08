import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import type { Server } from 'node:http'
import type { UserBirthProfile } from '../../src/user/profile-store.js'

// Snapshot all storage modules in memory before enabling synthetic auth. Never
// load dotenv or allow a provider/database/payment request out of this process.
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
process.env.SUPABASE_URL = 'https://synthetic-auth.invalid'
process.env.SUPABASE_PUBLISHABLE_KEY = 'synthetic-public-fixture-only'
const { default: app } = await import('../../src/server/app.js')
let server: Server

const OWNER = 'wedding-owner-a'
const OTHER = 'wedding-owner-b'
const profile: UserBirthProfile = {
  userId: OWNER, name: '합성점검',
  birth: { year: 1975, month: 9, day: 26, hour: 5, minute: 0, gender: 'male', calendar: 'solar' },
  birthTimeKnown: true, context: {}, createdAt: '2026-09-07T00:00:00Z', updatedAt: '2026-09-07T00:00:00Z',
}

/** 02 화면이 보내는 형태. 본인 사주는 계정에서 읽으므로 후보일과 상대·예식 조건만 담는다. */
const INPUT = {
  preview: true,
  candidateDate1: '2027-05-15',
  candidateDate2: '2027-05-22',
  candidateDate3: '2027-10-09',
  partnerBirth: '1988-03-11',
  partnerTime: '14:30',
  format: '예식장',
  familyLimit: '특정 주말만 가능',
}

async function request(path: string, body?: unknown, owner: string | null = OWNER) {
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
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  }
  globalThis.fetch = nativeFetch
  for (const name of Object.keys(process.env)) if (!(name in previousEnv)) delete process.env[name]
  Object.assign(process.env, previousEnv)
  assert.deepEqual(unexpected, [])
})

describe('결혼 택일 로그인 흐름과 저장 결과', { concurrency: false }, () => {
  it('로그인과 사주 등록을 먼저 요구한다', async () => {
    assert.equal((await request('/api/day/wedding/analyze', INPUT, null)).response.status, 401)
    const missing = await request('/api/day/wedding/analyze', INPUT, OTHER)
    assert.equal(missing.response.status, 409)
    assert.equal(missing.payload.code, 'PROFILE_REQUIRED')
  })

  it('후보일이 없거나 달력에 없는 날짜면 400 으로 되돌린다', async () => {
    const empty = await request('/api/day/wedding/analyze', { ...INPUT, candidateDate1: '', candidateDate2: '', candidateDate3: '' })
    assert.equal(empty.response.status, 400)
    assert.match(empty.payload.error, /후보일/)
    assert.equal((await request('/api/day/wedding/analyze', { preview: true, candidateDate1: '2027-02-30', candidateDate2: '2027/05/22' })).response.status, 400)
  })

  it('결제 전에는 계산된 무료 미리보기만 주고 같은 입력은 같은 UUID 로 모인다', async () => {
    const first = await request('/api/day/wedding/analyze', INPUT)
    assert.equal(first.response.status, 200, `본문: ${JSON.stringify(first.payload).slice(0, 200)}`)
    assert.equal(first.payload.previewOnly, true)
    assert.equal(first.payload.report, undefined, '미리보기에 본문이 실려 나가면 안 된다')
    assert.ok(first.payload.reportId && first.payload.resultId, '저장 식별자가 없으면 04 가 열리지 않는다')

    const second = await request('/api/day/wedding/analyze', INPUT)
    assert.equal(second.payload.resultId, first.payload.resultId)
    assert.deepEqual(second.payload.preview, first.payload.preview)
  })

  it('후보일이 달라지면 다른 결과로 저장된다', async () => {
    const a = await request('/api/day/wedding/analyze', INPUT)
    const b = await request('/api/day/wedding/analyze', { ...INPUT, candidateDate1: '2027-06-05' })
    assert.notEqual(a.payload.resultId, b.payload.resultId)
  })

  it('사주가 같아도 계정이 다르면 남의 결과를 물려받지 않는다', async () => {
    await profiles.saveUserBirthProfile({ ...profile, userId: OTHER }, { id: OTHER })
    const mine = await request('/api/day/wedding/analyze', INPUT)
    const theirs = await request('/api/day/wedding/analyze', INPUT, OTHER)
    assert.equal(theirs.response.status, 200)
    assert.notEqual(theirs.payload.reportId, mine.payload.reportId, '소유자가 리포트 ID 에 반영되지 않았다')
    assert.equal((await request('/api/day/wedding/analyze', { reportId: mine.payload.resultId }, OTHER)).response.status, 403)
  })

  it('다른 서비스 ID 로는 결혼 택일 결과를 열 수 없다', async () => {
    const mine = await request('/api/day/wedding/analyze', INPUT)
    assert.equal((await request('/api/flow/newyear/analyze', { reportId: mine.payload.resultId })).response.status, 409)
    assert.equal((await request('/api/day/wedding/analyze', { reportId: 'missing-saved-id' })).response.status, 404)
  })

  it('결제하고 돌아오면 저장된 UUID 로 후보일 판정이 담긴 본문이 열린다', async () => {
    const preview = await request('/api/day/wedding/analyze', INPUT)
    await payments.savePaymentOrder({
      orderId: 'synthetic-wedding-paid', ownerId: OWNER, buyerEmail: 'fixture@synthetic.invalid', buyerTel: '00000000000',
      productKey: 'wedding_day', productTitle: 'Synthetic fixture', amount: 19900, status: 'paid', reportId: preview.payload.reportId,
      createdAt: '2026-09-07T00:00:00Z', updatedAt: '2026-09-07T00:00:00Z',
    })
    const paid = await request('/api/day/wedding/analyze', { reportId: preview.payload.resultId, orderId: 'synthetic-wedding-paid' })
    assert.equal(paid.response.status, 200, `본문: ${JSON.stringify(paid.payload).slice(0, 200)}`)
    assert.equal(paid.payload.report.isPaid, true)
    assert.equal(paid.payload.resultId, preview.payload.resultId, '결제 후 새 결과로 갈아치우면 안 된다')
    assert.equal(paid.payload.report.sections.length, 21)

    // 계정에 저장된 사주를 썼으므로 본인 생년월일을 다시 받지 않아도 판정이 선다.
    const text = JSON.stringify(paid.payload.report)
    assert.match(text, /2027년 5월 22일/, '후보일 라벨이 없다')
    assert.match(text, /甲午|辛丑|辛酉/, '후보일 일주가 문장에 없다')
    assert.match(text, /선고하지 않습니다/, '길흉을 선고하지 않는다는 문장이 없다')
  })
})
