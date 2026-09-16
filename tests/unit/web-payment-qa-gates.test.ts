import assert from 'node:assert/strict'
import type { Server } from 'node:http'
import { after, before, describe, it } from 'node:test'

const previousEnv = { ...process.env }
process.env.NODE_ENV = 'test'
for (const name of Object.keys(process.env)) {
  if (/DATABASE|SUPABASE|OPENAI|ANTHROPIC|INICIS|PAYMENT|VERCEL|REPORT_STORAGE|ADMIN_EMAIL/.test(name)) {
    delete process.env[name]
  }
}
process.env.SUPABASE_URL = 'https://synthetic-auth.invalid'
process.env.SUPABASE_PUBLISHABLE_KEY = 'synthetic-public-fixture-only'
delete process.env.PAYMENT_TEST_MODE

const { default: app } = await import('../../src/server/app.js')

let server: Server
let origin = ''

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
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  }
  for (const name of Object.keys(process.env)) {
    if (!(name in previousEnv)) delete process.env[name]
  }
  Object.assign(process.env, previousEnv)
})

describe('웹 결제·서비스 경로 QA 게이트', { concurrency: false }, () => {
  it('운영에서 /payment/test 는 404 (앱 Google Play 경로와 분리)', async () => {
    const response = await fetch(`${origin}/payment/test`)
    assert.equal(response.status, 404)
  })

  it('서비스 단계 디렉터리 URL은 index.html 을 연다', async () => {
    const response = await fetch(`${origin}/love/this-year/01-step-1-story/`)
    assert.equal(response.status, 200)
    const body = await response.text()
    assert.match(body, /연애|스토리|운명상회/)
  })
})
