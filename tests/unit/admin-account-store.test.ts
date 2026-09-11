import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'

const previousEnv = { ...process.env }
process.env.SUPABASE_URL = 'https://admin-store.synthetic.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_synthetic_admin_store'
process.env.UMSH_ADMIN_ACCOUNT_STORE = 'enabled'

const calls: Array<{ url: URL, init?: RequestInit }> = []
const nativeFetch = globalThis.fetch
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  calls.push({ url, init })
  if (init?.method === 'POST') {
    return new Response(JSON.stringify([{
      id: '11111111-1111-1111-1111-111111111111', email: 'admin@synthetic.invalid', password_hash: 'scrypt$salt$key',
      is_active: true, role: 'super_admin', revision: 0, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    }]), { status: 201, headers: { 'content-type': 'application/json' } })
  }
  return new Response(JSON.stringify([{
    id: '11111111-1111-1111-1111-111111111111', email: 'admin@synthetic.invalid', password_hash: 'scrypt$salt$key',
    is_active: true, role: 'super_admin', revision: 0, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  }]), { status: 200, headers: { 'content-type': 'application/json' } })
}) as typeof fetch

const store = await import('../../src/auth/admin-account-store.js')

after(() => {
  globalThis.fetch = nativeFetch
  for (const key of Object.keys(process.env)) if (!(key in previousEnv)) delete process.env[key]
  Object.assign(process.env, previousEnv)
})

describe('관리자 계정 저장소', { concurrency: false }, () => {
  it('서버 전용 키로 정규화된 이메일 계정을 찾는다', async () => {
    const account = await store.findAdminAccountByEmail(' ADMIN@SYNTHETIC.INVALID ')
    assert.equal(account?.email, 'admin@synthetic.invalid')
    const call = calls.at(-1)
    assert.equal(call?.url.searchParams.get('email'), 'eq.admin@synthetic.invalid')
    assert.equal(new Headers(call?.init?.headers).get('apikey'), process.env.SUPABASE_SERVICE_ROLE_KEY)
    assert.equal(new Headers(call?.init?.headers).get('authorization'), null, 'opaque server key에 Authorization을 붙이면 안 된다')
  })

  it('계정 생성 요청에는 해시만 보내고 평문 비밀번호 필드를 만들지 않는다', async () => {
    await store.createAdminAccount({ email: 'ADMIN@SYNTHETIC.INVALID', passwordHash: 'scrypt$fixture$hash' })
    const payload = JSON.parse(String(calls.at(-1)?.init?.body)) as Record<string, unknown>
    assert.deepEqual(payload, { email: 'admin@synthetic.invalid', password_hash: 'scrypt$fixture$hash', role: 'super_admin' })
    assert.equal(Object.prototype.hasOwnProperty.call(payload, 'password'), false)
  })
})
