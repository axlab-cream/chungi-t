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
const profile: UserBirthProfile = {
  userId: OWNER, name: '합성점검',
  birth: { year: 1975, month: 9, day: 26, hour: 5, minute: 0, gender: 'male', calendar: 'solar' },
  birthTimeKnown: true, context: {}, createdAt: '2026-09-07T00:00:00Z', updatedAt: '2026-09-07T00:00:00Z',
}

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
  it('고객 진행을 막아 비로그인은 401, 로그인도 생성을 거절한다', async () => {
    assert.equal((await request('/api/day/wedding/analyze', INPUT, null)).response.status, 401)
    const paused = await request('/api/day/wedding/analyze', INPUT)
    assert.equal(paused.response.status, 404)
    assert.match(String(paused.payload.error ?? ''), /공개하지 않는/)
  })

  it('직접 진입 경로는 홈으로 돌려보낸다', async () => {
    const response = await fetch(`${origin}/day/wedding/01-step-1-story/index.html`, { redirect: 'manual' })
    assert.equal(response.status, 302)
    assert.equal(response.headers.get('location'), '/')
  })
})
