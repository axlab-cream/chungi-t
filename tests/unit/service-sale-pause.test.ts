import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import type { Server } from 'node:http'
import type { UserBirthProfile } from '../../src/user/profile-store.js'

/**
 * 2026-09-19: 서비스 카탈로그 개정에 saleAvailable 이 추가됐다 — 발행본이 false 면 결제
 * 생성 자체를 막는다. 코드로 관리되는 카탈로그는 실제로 지울 수 없으므로, 이 게이트가
 * 관리자 화면의 "삭제"에 해당한다. 결제 라우트를 실제로 띄워서 확인한다.
 */
const previousEnv = { ...process.env }
process.env.NODE_ENV = 'test'
for (const name of Object.keys(process.env)) {
  if (/DATABASE|SUPABASE|OPENAI|ANTHROPIC|INICIS|PAYMENT|VERCEL|REPORT_STORAGE|ADMIN_EMAIL/.test(name)) {
    delete process.env[name]
  }
}

// order-store/profile-store/report-store 는 가져올 때 SUPABASE 설정을 한 번만 읽어 저장
// 방식을 굳힌다. SUPABASE_URL 을 켜기 전에 먼저 가져와야 이 스위트가 메모리 저장소로 남는다.
await import('../../src/report/report-store.js')
const profiles = await import('../../src/user/profile-store.js')
await import('../../src/payment/order-store.js')

process.env.SUPABASE_URL = 'https://sale-pause.synthetic.invalid'
process.env.SUPABASE_PUBLISHABLE_KEY = 'synthetic-public-fixture-only'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_synthetic_sale_pause'
process.env.PAYMENT_TEST_MODE = '1'

/** service_config_versions 의 발행본만 흉내 낸다 — 서비스별로 saleAvailable 을 갈아 끼운다. */
const publishedRows = new Map<string, { saleAvailable: boolean }>()

const nativeFetch = globalThis.fetch
let origin = ''
const unexpected: string[] = []
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  if (url.href.startsWith('https://sale-pause.synthetic.invalid/auth/v1/user')) {
    const token = new Headers(init?.headers).get('authorization')?.replace(/^Bearer /, '')
    return new Response(JSON.stringify({ id: token, email: `${token}@synthetic.invalid` }), {
      status: token ? 200 : 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  if (url.pathname === '/rest/v1/service_config_versions') {
    const serviceKey = url.searchParams.get('service_key')?.replace(/^eq\./, '')
    const row = serviceKey ? publishedRows.get(serviceKey) : undefined
    const rows = row ? [{ id: `v-${serviceKey}`, service_key: serviceKey, version: 1, state: 'published', payload: { title: serviceKey, tagline: 't', summary: 's', category: 'c', discoveryVisible: true, saleAvailable: row.saleAvailable }, checksum: 'x'.repeat(64), author_email: 'ops@synthetic.invalid', revision: 0, created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z' }] : []
    return new Response(JSON.stringify(rows), { headers: { 'Content-Type': 'application/json' } })
  }
  if (origin && url.origin === origin) return nativeFetch(input, init)
  unexpected.push(url.href)
  throw new Error(`이 스위트는 허용하지 않은 외부 요청을 보냈습니다: ${url.href}`)
}) as typeof fetch

const { default: app } = await import('../../src/server/app.js')
let server: Server

const OWNER = 'sale-pause-owner'
const profile: UserBirthProfile = {
  userId: OWNER,
  name: '합성점검',
  birth: { year: 1990, month: 5, day: 1, hour: 10, minute: 0, gender: 'female', calendar: 'solar' },
  birthTimeKnown: true,
  context: {},
  createdAt: '2026-09-19T00:00:00Z',
  updatedAt: '2026-09-19T00:00:00Z',
}

async function orderRequest(productKey: string) {
  const response = await fetch(`${origin}/api/payment/orders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${OWNER}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ productKey, buyerEmail: 'fixture@synthetic.invalid', buyerTel: '01000000000' }),
  })
  const payload = await response.json().catch(() => ({}))
  return { status: response.status, payload: payload as Record<string, unknown> }
}

describe('발행본이 판매를 중단한 서비스는 결제 생성을 막는다', () => {
  before(async () => {
    await profiles.saveUserBirthProfile(profile as never, { id: OWNER } as never)
    server = app.listen(0, '127.0.0.1')
    await new Promise<void>((resolve) => server.once('listening', () => resolve()))
    const address = server.address()
    origin = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`
  })

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
    globalThis.fetch = nativeFetch
    Object.assign(process.env, previousEnv)
    assert.deepEqual(unexpected, [], `허용하지 않은 외부 요청: ${unexpected.join(', ')}`)
  })

  it('발행본이 saleAvailable=false 면 409 SERVICE_SALE_PAUSED 로 막는다', async () => {
    publishedRows.set('cmdg', { saleAvailable: false })
    const result = await orderRequest('cmdg')
    assert.equal(result.status, 409)
    assert.equal(result.payload.code, 'SERVICE_SALE_PAUSED')
  })

  it('발행본이 없는 서비스는 막지 않고 평소대로 주문을 만든다', async () => {
    const result = await orderRequest('match_couple')
    assert.equal(result.status, 200)
    assert.equal(result.payload.testMode, true)
  })

  it('발행본이 saleAvailable=true 면 막지 않는다', async () => {
    publishedRows.set('money_save', { saleAvailable: true })
    const result = await orderRequest('money_save')
    assert.equal(result.status, 200)
  })
})
