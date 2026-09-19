import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import type { Server } from 'node:http'
import express from 'express'

const previousEnv = { ...process.env }
let upstream: Server
let appServer: Server
let origin = ''
let upstreamOrigin = ''

function listen(app: ReturnType<typeof express>): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server))
    server.once('error', reject)
  })
}

function addressOf(server: Server): string {
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  return `http://127.0.0.1:${address.port}`
}

async function close(server: Server | undefined) {
  if (!server) return
  server.closeAllConnections()
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
}

before(async () => {
  const mock = express()
  mock.get('/auth/v1/user', (req, res) => {
    const token = String(req.header('authorization') ?? '').replace(/^Bearer\s+/i, '')
    if (token === 'valid-admin-token') {
      res.json({ id: 'auth-user-1', email: 'operator@synthetic.invalid', app_metadata: { provider: 'email' } })
      return
    }
    if (token === 'inactive-admin-token') {
      res.json({ id: 'auth-user-2', email: 'inactive@synthetic.invalid', app_metadata: { provider: 'email' } })
      return
    }
    res.status(401).json({ error: 'invalid token' })
  })
  mock.get('/rest/v1/umsh_admin_accounts', (req, res) => {
    const emailFilter = String(req.query.email ?? '')
    if (emailFilter === 'eq.operator@synthetic.invalid') {
      res.json([{
        id: 'admin-1', email: 'operator@synthetic.invalid', password_hash: 'unused', is_active: true,
        role: 'super_admin', revision: 0, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
      }])
      return
    }
    if (emailFilter === 'eq.inactive@synthetic.invalid') {
      res.json([{
        id: 'admin-2', email: 'inactive@synthetic.invalid', password_hash: 'unused', is_active: false,
        role: 'super_admin', revision: 0, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
      }])
      return
    }
    res.json([])
  })
  upstream = await listen(mock)
  upstreamOrigin = addressOf(upstream)

  process.env.NODE_ENV = 'test'
  process.env.SUPABASE_URL = upstreamOrigin
  process.env.SUPABASE_PUBLISHABLE_KEY = 'publishable-test-key'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key'
  process.env.UMSH_ADMIN_ACCOUNT_STORE = 'enabled'
  process.env.UMSH_LOCAL_ADMIN_EMAIL = 'bootstrap@synthetic.invalid'
  process.env.UMSH_LOCAL_ADMIN_PASSWORD = 'fixture-local-password'
  process.env.UMSH_LOCAL_ADMIN_SESSION_SECRET = 'fixture-local-session-secret-that-is-long-enough'

  const { default: app } = await import('../../src/server/app.js')
  appServer = await listen(app)
  origin = addressOf(appServer)
})

after(async () => {
  await close(appServer)
  await close(upstream)
  for (const name of Object.keys(process.env)) if (!(name in previousEnv)) delete process.env[name]
  Object.assign(process.env, previousEnv)
})

describe('Supabase 관리자 세션 교환', { concurrency: false }, () => {
  it('Supabase에서 인증된 활성 관리자에게만 HttpOnly 세션을 발급한다', async () => {
    const accepted = await fetch(`${origin}/api/admin/v1/session/supabase`, {
      method: 'POST', headers: { Authorization: 'Bearer valid-admin-token' },
    })
    assert.equal(accepted.status, 200)
    const cookie = accepted.headers.get('set-cookie')
    assert.ok(cookie)
    assert.match(cookie, /HttpOnly/)
    assert.match(cookie, /SameSite=Strict/)

    const me = await fetch(`${origin}/api/admin/v1/me`, { headers: { Cookie: cookie.split(';')[0] } })
    assert.equal(me.status, 200)
    assert.equal((await me.json()).email, 'operator@synthetic.invalid')
  })

  it('비활성 관리자와 유효하지 않은 Supabase 토큰은 거부한다', async () => {
    const inactive = await fetch(`${origin}/api/admin/v1/session/supabase`, {
      method: 'POST', headers: { Authorization: 'Bearer inactive-admin-token' },
    })
    assert.equal(inactive.status, 403)
    assert.equal(inactive.headers.get('set-cookie'), null)

    const invalid = await fetch(`${origin}/api/admin/v1/session/supabase`, {
      method: 'POST', headers: { Authorization: 'Bearer invalid-token' },
    })
    assert.equal(invalid.status, 401)
    assert.equal(invalid.headers.get('set-cookie'), null)
  })
})
