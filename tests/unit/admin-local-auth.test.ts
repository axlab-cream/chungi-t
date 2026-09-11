import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import type { Server } from 'node:http'

const previousEnv = { ...process.env }
process.env.NODE_ENV = 'test'
process.env.UMSH_LOCAL_ADMIN_EMAIL = 'operator@synthetic.invalid'
process.env.UMSH_LOCAL_ADMIN_PASSWORD = 'fixture-local-password'
process.env.UMSH_LOCAL_ADMIN_SESSION_SECRET = 'fixture-local-session-secret-that-is-long-enough'
delete process.env.SUPABASE_URL
delete process.env.SUPABASE_PUBLISHABLE_KEY
const { default: app } = await import('../../src/server/app.js')

let server: Server
let origin = ''

async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(origin + path, { redirect: 'manual', ...init })
  return { response, text: await response.text() }
}

before(async () => {
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
  for (const name of Object.keys(process.env)) if (!(name in previousEnv)) delete process.env[name]
  Object.assign(process.env, previousEnv)
})

describe('관리자 자체 비밀번호 로그인', { concurrency: false }, () => {
  it('올바른 비밀번호만 보안 쿠키 세션을 발급한다', async () => {
    const rejected = await request('/api/admin/v1/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'operator@synthetic.invalid', password: 'wrong-password' }),
    })
    assert.equal(rejected.response.status, 401)
    assert.equal(JSON.parse(rejected.text).code, 'LOCAL_LOGIN_FAILED')
    assert.equal(rejected.response.headers.get('set-cookie'), null)

    const accepted = await request('/api/admin/v1/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'OPERATOR@synthetic.invalid', password: 'fixture-local-password' }),
    })
    assert.equal(accepted.response.status, 200)
    const cookie = accepted.response.headers.get('set-cookie')
    assert.ok(cookie)
    assert.match(cookie, /HttpOnly/)
    assert.match(cookie, /Secure/)
    assert.match(cookie, /SameSite=Strict/)
    assert.match(cookie, /Path=\//)

    const me = await request('/api/admin/v1/me', { headers: { Cookie: cookie.split(';')[0] } })
    assert.equal(me.response.status, 200)
    assert.equal(JSON.parse(me.text).email, 'operator@synthetic.invalid')
  })

  it('유효한 쿠키가 없으면 Supabase로 폴백하지 않는다', async () => {
    const me = await request('/api/admin/v1/me')
    assert.equal(me.response.status, 401)
    assert.equal(JSON.parse(me.text).code, 'AUTH_REQUIRED')
    const detail = await request('/api/admin/v1/orders/does-not-matter')
    assert.equal(detail.response.status, 401)
  })

  it('로그아웃이 자체 세션 쿠키를 만료한다', async () => {
    const logout = await request('/api/admin/v1/logout', { method: 'POST' })
    assert.equal(logout.response.status, 204)
    assert.match(logout.response.headers.get('set-cookie') ?? '', /Max-Age=0/)
  })
})
