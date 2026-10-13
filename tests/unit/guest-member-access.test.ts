import assert from 'node:assert/strict'
import { before, after, test } from 'node:test'
import type { Server } from 'node:http'

// 2026-10-13 비회원(Supabase 익명 계정): 사주 입력·무료 풀이는 쓰고, 결제·서브 콘텐츠·계정 기능은 막는다.
process.env.NODE_ENV = 'test'
for (const name of Object.keys(process.env)) if (/DATABASE|SUPABASE|OPENAI|ANTHROPIC|INICIS|PAYMENT|VERCEL|REPORT_STORAGE|ADMIN_EMAIL/.test(name)) delete process.env[name]
process.env.SUPABASE_URL = 'https://guest-auth.invalid'
process.env.SUPABASE_PUBLISHABLE_KEY = 'test-key'
process.env.PAYMENT_TEST_MODE = 'true'
const realFetch = globalThis.fetch
let origin = '', server: Server
const profileRows = new Map<string, Record<string, any>>()
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  if (url.href === 'https://guest-auth.invalid/auth/v1/user') {
    const token = new Headers(init?.headers).get('authorization')?.replace('Bearer ', '') ?? ''
    if (!token) return new Response('{}', { status: 401 })
    const guest = token.startsWith('guest-')
    return Response.json({ id: token, ...(guest ? { is_anonymous: true } : { email: `${token}@synthetic.invalid`, is_anonymous: false }) })
  }
  if (url.origin === origin) return realFetch(input, init)
  if (url.origin === 'https://guest-auth.invalid' && url.pathname === '/rest/v1/cheongi_user_profiles') {
    if (init?.method === 'POST') {
      const row = JSON.parse(String(init.body))
      profileRows.set(row.user_id, row)
      return Response.json([row])
    }
    const id = url.searchParams.get('user_id')?.replace('eq.', '') ?? ''
    return Response.json(profileRows.has(id) ? [profileRows.get(id)] : [])
  }
  throw new Error('No external requests in this test')
}) as typeof fetch
const { default: app } = await import('../../src/server/app.js')

async function call(method: string, path: string, token: string, body?: unknown) {
  const response = await fetch(origin + path, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  return { status: response.status, data: await response.json().catch(() => ({})) as Record<string, unknown> }
}

const profile = { name: '합성 손님', birth: { year: 1994, month: 3, day: 11, hour: 9, minute: 0, gender: 'female', calendar: 'solar' } }

before(async () => {
  server = app.listen(0, '127.0.0.1')
  await new Promise<void>(resolve => server.once('listening', resolve))
  origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`
})
after(async () => { globalThis.fetch = realFetch; server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) })

test('비회원도 사주 프로필을 저장하고 다시 읽으며, 저장 행에 비회원 표시가 붙는다', async () => {
  const guest = 'guest-profile-0001'
  assert.equal((await call('PUT', '/api/user/profile', guest, profile)).status, 200)
  assert.equal(profileRows.get(guest)?.profile_payload?.account_type, 'guest')
  const saved = await call('GET', '/api/user/profile', guest)
  assert.equal(saved.status, 200)
  assert.equal(JSON.stringify(saved.data).includes('합성 손님'), true)
})

test('SNS 회원으로 저장하면 비회원 표시가 없다', async () => {
  assert.equal((await call('PUT', '/api/user/profile', 'member-profile-0001', profile)).status, 200)
  assert.equal(profileRows.get('member-profile-0001')?.profile_payload?.account_type, undefined)
})

test('비회원은 결제·쿠폰·상담 채팅·계정 기능에서 MEMBER_REQUIRED 를 받는다', async () => {
  const guest = 'guest-blocked-0001'
  const blocked: Array<[string, string, unknown?]> = [
    ['POST', '/api/payment/orders', { productKey: 'cmdg' }],
    ['GET', '/api/user/orders'],
    ['GET', '/api/coupons'],
    ['GET', '/api/user/inquiries'],
    ['GET', '/api/user/notification-prefs'],
    ['DELETE', '/api/user/account'],
    ['POST', '/api/chat', { message: '안녕' }],
    ['GET', '/api/user/reader-history'],
  ]
  for (const [method, path, body] of blocked) {
    const result = await call(method, path, guest, body)
    assert.equal(result.status, 401, `${method} ${path}`)
    assert.equal(result.data.code, 'MEMBER_REQUIRED', `${method} ${path}`)
  }
})

test('SNS 회원은 같은 회원 전용 경로에서 MEMBER_REQUIRED 를 받지 않는다', async () => {
  for (const path of ['/api/coupons', '/api/user/orders', '/api/user/inquiries']) {
    const result = await call('GET', path, 'member-0001')
    assert.notEqual(result.data.code, 'MEMBER_REQUIRED', path)
  }
})

test('서브 콘텐츠(무료 테스트)는 비회원도 결과 API를 쓴다', async () => {
  for (const path of ['/api/play/solo-nara/result', '/api/play/love-speed/result']) {
    const result = await call('POST', path, 'guest-play-0001', { answers: [] })
    // 빈 답은 입력 오류(400)일 뿐, 로그인 요구(401)는 아니다.
    assert.equal(result.status, 400, path)
  }
})
