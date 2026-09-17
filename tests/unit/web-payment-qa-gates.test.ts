import assert from 'node:assert/strict'
import type { Server } from 'node:http'
import { after, before, describe, it } from 'node:test'

// 운영과 같은 조건을 만든다. 결제·저장 관련 환경변수가 남아 있으면
// 테스트 결제 모드가 켜진 채로 검증해서 게이트가 통과해 버린다.
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

describe('웹 결제·서비스 진입 경로', { concurrency: false }, () => {
  it('테스트 결제 화면은 승인 API 와 같은 조건에서만 열린다', async () => {
    // 승인 API 는 이미 막혀 있었는데 화면만 열려서, 고객이 결제되지 않는 폼을 봤다.
    const page = await fetch(`${origin}/payment/test`)
    assert.equal(page.status, 404)
    const approve = await fetch(`${origin}/api/payment/test/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
    assert.equal(approve.status, 404)
  })

  it('결제 화면은 계속 열린다 — 게이트가 정상 경로를 막지 않는다', async () => {
    const response = await fetch(`${origin}/payment`)
    assert.equal(response.status, 200)
  })

  it('결제 설정은 HTML 시드 별칭을 카탈로그 키로 연결한다', async () => {
    // 저축 HTML은 product=save, 커플은 couple_match. 카탈로그 정식 키와 다르면
    // 결제창이 "상품 정보를 확인하지 못했습니다"에서 멈춘다.
    const config = await (await fetch(`${origin}/api/payment/config`)).json() as {
      aliases?: Record<string, string>
      pathPrefixes?: Array<[string, string]>
    }
    assert.equal(config.aliases?.save, 'money_save')
    assert.equal(config.aliases?.couple_match, 'match_couple')
    assert.equal(config.aliases?.love_thisyear, 'love_this_year')
    assert.equal(config.aliases?.marriage_compatibility, 'marry_match')
    assert.ok(config.pathPrefixes?.some((entry) => entry[0] === '/money/save' && entry[1] === 'money_save'))
    const source = await (await fetch(`${origin}/js/payment.js`)).text()
    assert.match(source, /canonicalProductKey/)
    assert.match(source, /pausedKeys/)
  })

  it('서비스 단계 주소는 파일명을 떼도 같은 화면을 연다', async () => {
    const withFile = await fetch(`${origin}/love/this-year/01-step-1-story/index.html`)
    const withoutFile = await fetch(`${origin}/love/this-year/01-step-1-story/`)
    assert.equal(withFile.status, 200)
    assert.equal(withoutFile.status, 200)
    assert.equal(await withoutFile.text(), await withFile.text())
  })

  it('없는 주소는 그대로 404 — index 허용이 아무 경로나 열지 않는다', async () => {
    const response = await fetch(`${origin}/love/this-year/99-step-none/`)
    assert.equal(response.status, 404)
  })
})
