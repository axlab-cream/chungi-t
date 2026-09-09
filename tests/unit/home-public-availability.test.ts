import assert from 'node:assert/strict'
import type { Server } from 'node:http'
import { after, before, test } from 'node:test'
import app from '../../src/server/app.js'

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

test('집 풍수는 포털·검색·결제와 직접 서비스 경로에서 공개된다', async () => {
  const direct = await fetch(`${origin}/place/home/01-step-1-story/index.html`, { redirect: 'manual' })
  assert.equal(direct.status, 200)

  const portal = await (await fetch(`${origin}/`)).text()
  const visiblePortal = portal.replace(/<!--\s*[\s\S]*?-->/g, '')
  assert.ok(visiblePortal.includes('href="/place/home"'))
  assert.ok(visiblePortal.includes('data-filter="풍수"'))

  const directory = await (await fetch(`${origin}/api/services`)).json() as { services: Array<{ key: string }> }
  assert.ok(directory.services.some((service) => service.key === 'home_pungsu'))

  const payment = await (await fetch(`${origin}/api/payment/config`)).json() as { catalog: Array<{ key: string }> }
  assert.ok(payment.catalog.some((product) => product.key === 'home_pungsu'))
})
