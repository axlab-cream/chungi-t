import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import type { Server } from 'node:http'
import type { UserBirthProfile } from '../../src/user/profile-store.js'

/**
 * 2026-10-14: 결제 완료 화면에서 브라우저 뒤로 가기를 누르면 결제 화면이 다시 열리고, 같은
 * 풀이를 한 번 더 결제할 수 있었다. 결제 라우트를 실제로 띄워서 막히는지 확인한다.
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
const orders = await import('../../src/payment/order-store.js')

process.env.SUPABASE_URL = 'https://already-paid.synthetic.invalid'
process.env.SUPABASE_PUBLISHABLE_KEY = 'synthetic-public-fixture-only'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_synthetic_already_paid'
process.env.PAYMENT_TEST_MODE = '1'


const nativeFetch = globalThis.fetch
let origin = ''
const unexpected: string[] = []
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  if (url.href.startsWith('https://already-paid.synthetic.invalid/auth/v1/user')) {
    const token = new Headers(init?.headers).get('authorization')?.replace(/^Bearer /, '')
    return new Response(JSON.stringify({ id: token, email: `${token}@synthetic.invalid` }), {
      status: token ? 200 : 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  if (url.pathname === '/rest/v1/service_config_versions') {
    return new Response('[]', { headers: { 'Content-Type': 'application/json' } })
  }
  if (origin && url.origin === origin) return nativeFetch(input, init)
  unexpected.push(url.href)
  throw new Error(`이 스위트는 허용하지 않은 외부 요청을 보냈습니다: ${url.href}`)
}) as typeof fetch

const { default: app } = await import('../../src/server/app.js')
let server: Server

const OWNER = 'already-paid-owner'
const profile: UserBirthProfile = {
  userId: OWNER,
  name: '합성점검',
  birth: { year: 1990, month: 5, day: 1, hour: 10, minute: 0, gender: 'female', calendar: 'solar' },
  birthTimeKnown: true,
  context: {},
  createdAt: '2026-09-19T00:00:00Z',
  updatedAt: '2026-09-19T00:00:00Z',
}

async function orderRequest(productKey: string, reportId: string) {
  const response = await fetch(`${origin}/api/payment/orders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${OWNER}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ productKey, reportId, buyerEmail: 'fixture@synthetic.invalid', buyerTel: '01000000000' }),
  })
  const payload = await response.json().catch(() => ({}))
  return { status: response.status, payload: payload as Record<string, unknown> }
}


async function purchaseStatus(productKey: string, reportId: string) {
  const params = new URLSearchParams({ productKey, reportId })
  const response = await fetch(`${origin}/api/payment/purchase-status?${params}`, { headers: { Authorization: `Bearer ${OWNER}` } })
  return { status: response.status, payload: await response.json() as Record<string, unknown> }
}

function paidOrder(orderId: string, ownerId: string, reportId: string, status: 'paid' | 'viewed' | 'failed' = 'paid') {
  const now = '2026-10-14T00:00:00Z'
  return {
    orderId, ownerId, buyerEmail: 'fixture@synthetic.invalid', buyerTel: '01000000000',
    productKey: 'job_choice', productTitle: '직장 선택', amount: 9900, status,
    reportId, tid: `tid-${orderId}`, createdAt: now, updatedAt: now,
  }
}

describe('이미 결제한 풀이는 다시 결제하지 않는다', () => {
  before(async () => {
    await profiles.saveUserBirthProfile(profile as never, { id: OWNER } as never)
    await orders.savePaymentOrder(paidOrder('UMSHALREADYPAID1', OWNER, 'report-paid') as never)
    await orders.savePaymentOrder(paidOrder('UMSHFAILEDORDER1', OWNER, 'report-failed', 'failed') as never)
    await orders.savePaymentOrder(paidOrder('UMSHOTHEROWNER01', 'someone-else', 'report-other') as never)
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

  // 2026-10-16 대표 결정: 같은 풀이도 다시 결제할 수 있다(이전에는 409 ALREADY_PAID 로 막았다).
  it('결제 완료된 풀이도 다시 주문을 만들 수 있다', async () => {
    const result = await orderRequest('job_choice', 'report-paid')
    assert.equal(result.status, 200)
    assert.notEqual(result.payload.code, 'ALREADY_PAID')
  })

  it('결제 화면은 열릴 때 이미 결제한 풀이인지 알 수 있다', async () => {
    assert.deepEqual((await purchaseStatus('job_choice', 'report-paid')).payload, { paid: true, orderId: 'UMSHALREADYPAID1' })
    assert.deepEqual((await purchaseStatus('job_choice', 'report-new')).payload, { paid: false })
    assert.deepEqual((await purchaseStatus('cheonmyeong_consultation', 'report-paid')).payload, { paid: false })
  })

  it('실패한 주문, 다른 사람의 주문, 새 풀이는 막지 않는다', async () => {
    assert.equal((await orderRequest('job_choice', 'report-failed')).status, 200)
    assert.equal((await orderRequest('job_choice', 'report-other')).status, 200)
    assert.equal((await orderRequest('job_choice', 'report-new')).status, 200)
  })

  it('로그인하지 않으면 결제 여부를 알려 주지 않는다', async () => {
    const response = await fetch(`${origin}/api/payment/purchase-status?productKey=job_choice&reportId=report-paid`)
    assert.equal(response.status, 401)
  })
})
