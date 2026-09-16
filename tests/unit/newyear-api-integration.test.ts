import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import type { Server } from 'node:http'
import type { UserBirthProfile } from '../../src/user/profile-store.js'

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
process.env.PAYMENT_TEST_MODE = 'true'
const { default: app } = await import('../../src/server/app.js')
let server: Server
const profile: UserBirthProfile = {
  userId: 'newyear-owner-a', name: '합성점검',
  birth: { year: 1975, month: 9, day: 26, hour: 5, minute: 0, gender: 'male', calendar: 'solar' },
  birthTimeKnown: true, context: {}, createdAt: '2026-09-07T00:00:00Z', updatedAt: '2026-09-07T00:00:00Z',
}

async function request(path: string, body?: unknown, owner = 'newyear-owner-a') {
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
  for (const owner of ['newyear-owner-a', 'newyear-owner-b']) await profiles.saveUserBirthProfile({ ...profile, userId: owner }, { id: owner })
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

describe('newyear preview, ownership and saved-result integration', { concurrency: false }, () => {
  it('holds every customer entry path on the homepage', async () => {
    for (const alias of ['', '/', '/index.html', '/input', '/report', '/chat', '/detail']) {
      const response = await fetch(`${origin}/flow/newyear${alias}`, { redirect: 'manual' })
      assert.equal(response.status, 302, alias)
      assert.equal(response.headers.get('location'), '/')
    }
  })

  it('requires authentication and then refuses generation while the service is paused', async () => {
    assert.equal((await request('/api/flow/newyear/analyze', { preview: true }, '')).response.status, 401)
    const paused = await request('/api/flow/newyear/analyze', { preview: true })
    assert.equal(paused.response.status, 404)
    assert.match(String(paused.payload.error ?? ''), /공개하지 않는/)
  })
})
