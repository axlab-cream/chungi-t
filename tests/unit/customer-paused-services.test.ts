import assert from 'node:assert/strict'
import type { Server } from 'node:http'
import { after, before, test } from 'node:test'
import app from '../../src/server/app.js'
import { CUSTOMER_PAUSED_PRODUCT_KEYS, listAdminServiceDirectory, listServiceDirectory } from '../../src/server/service-directory.js'

const PAUSED_PATHS = [
  '/place/home/01-step-1-story/index.html',
  '/me/lucky/01-step-1-story/index.html',
  '/me/pass-angle/01-step-1-story/index.html',
  '/flow/newyear/01-step-1-story/index.html',
  '/day/wedding/01-step-1-story/index.html',
]

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
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
})

test('보류 서비스는 검색·결제에서 빠지고 관리자 목록에는 남는다', async () => {
  const publicKeys = listServiceDirectory().map((service) => service.key)
  const admin = listAdminServiceDirectory()
  for (const key of CUSTOMER_PAUSED_PRODUCT_KEYS) {
    assert.ok(!publicKeys.includes(key), `${key}가 공개 검색 목록에 남아 있습니다`)
    const row = admin.find((service) => service.key === key)
    assert.ok(row, `${key}가 관리자 목록에서 사라졌습니다`)
    assert.equal(row.discoveryVisible, false)
  }

  const directory = await (await fetch(`${origin}/api/services`)).json() as { services: Array<{ key: string }> }
  const payment = await (await fetch(`${origin}/api/payment/config`)).json() as { catalog: Array<{ key: string }> }
  for (const key of CUSTOMER_PAUSED_PRODUCT_KEYS) {
    assert.ok(!directory.services.some((service) => service.key === key), `${key}가 /api/services 에 노출됩니다`)
    assert.ok(!payment.catalog.some((product) => product.key === key), `${key}가 결제 카탈로그에 노출됩니다`)
  }
})

test('보류 서비스 직접 경로는 홈으로 돌려보낸다', async () => {
  for (const path of PAUSED_PATHS) {
    const response = await fetch(`${origin}${path}`, { redirect: 'manual' })
    assert.equal(response.status, 302, `${path} → ${response.status}`)
    assert.equal(response.headers.get('location'), '/')
  }
})

test('포털 화면에는 보류 서비스 링크가 보이지 않는다', async () => {
  const portal = await (await fetch(`${origin}/`)).text()
  const visible = portal.replace(/<!--\s*[\s\S]*?-->/g, '')
  for (const href of ['/place/home', '/me/lucky', '/me/pass-angle', '/flow/newyear', '/day/wedding']) {
    assert.ok(!visible.includes(`href="${href}"`), `포털에 ${href} 가 남아 있습니다`)
  }
  assert.ok(!visible.includes('data-filter="풍수"'))
  assert.ok(!visible.includes('곧 다가올 운명'))
})
