import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import { after, before, describe, it } from 'node:test'
import type { Server } from 'node:http'

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
  if (origin && url.origin === origin) return nativeFetch(input, init)
  unexpected.push(url.origin)
  throw new Error('External requests are forbidden in this suite')
}) as typeof fetch

process.env.SUPABASE_URL = 'https://synthetic-auth.invalid'
process.env.SUPABASE_PUBLISHABLE_KEY = 'synthetic-public-fixture-only'
const { default: app } = await import('../../src/server/app.js')
let server: Server

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
  globalThis.fetch = nativeFetch
  for (const name of Object.keys(process.env)) if (!(name in previousEnv)) delete process.env[name]
  Object.assign(process.env, previousEnv)
  assert.deepEqual(unexpected, [])
})

const iconRoot = new URL('../../사주/', import.meta.url)
const portalPath = new URL('../../사주/portal.html', import.meta.url)
const manifestPath = new URL('../../사주/manifest.json', import.meta.url)

describe('앱 아이콘과 즐겨찾기 진입', () => {
  it('심플 운 마크가 16·32·192·512와 ICO로 준비된다', async () => {
    const files = ['favicon.svg', 'favicon.ico', 'favicon-16x16.png', 'favicon-32x32.png', 'favicon-48x48.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-512-maskable.png']
    for (const name of files) {
      const info = await stat(new URL(name, iconRoot))
      assert.ok(info.size > 300, `${name} 이 비어 있다`)
    }
    const svg = await readFile(new URL('favicon.svg', iconRoot), 'utf8')
    assert.match(svg, /viewBox="0 0 32 32"/)
    assert.match(svg, /#D8BA72/)
    assert.match(svg, /#0C0B0A/)
    assert.doesNotMatch(svg, /<image /)
  })

  it('포털은 SVG 파비콘을 먼저 걸고 16x16 PNG를 쓰지 않는다', async () => {
    const portal = await readFile(portalPath, 'utf8')
    assert.match(portal, /rel="icon" href="\/favicon\.svg\?v=20260917-icon"/)
    assert.match(portal, /rel="manifest" href="\/manifest\.json\?v=20260917-icon"/)
    assert.doesNotMatch(portal, /favicon-16x16/)
  })

  it('웹 매니페스트는 스플래시 다음 메인(/)으로 시작한다', async () => {
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
      start_url: string
      display: string
      icons: Array<{ src: string; sizes: string }>
    }
    assert.equal(manifest.start_url, '/')
    assert.equal(manifest.display, 'standalone')
    assert.ok(manifest.icons.some((icon) => icon.sizes === '192x192'))
    assert.ok(manifest.icons.some((icon) => icon.sizes === '512x512'))
  })

  it('아이콘·매니페스트 URL이 200으로 열린다', async () => {
    const paths = ['/favicon.svg', '/favicon.ico', '/favicon-32x32.png', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/manifest.json']
    for (const path of paths) {
      const response = await fetch(origin + path)
      assert.equal(response.status, 200, `${path} 가 ${response.status} 다`)
    }
    const manifest = await fetch(origin + '/manifest.json')
    assert.match(manifest.headers.get('content-type') ?? '', /manifest\+json|json/)
  })
})
