import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'

const previousEnv = { ...process.env }
process.env.SUPABASE_URL = 'https://service-versions.synthetic.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_synthetic_service_versions'
const calls: Array<{ url: URL, headers: Headers }> = []
const nativeFetch = globalThis.fetch
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  calls.push({ url, headers: new Headers(init?.headers) })
  return new Response(JSON.stringify([
    { service_key: 'cmdg', version: 2, state: 'published', revision: 4, updated_at: '2026-09-10T00:00:00Z' },
    { service_key: 'cmdg', version: 3, state: 'draft', revision: 1, updated_at: '2026-09-11T00:00:00Z' },
    { service_key: 'cmdg', version: 1, state: 'draft', revision: 8, updated_at: '2026-09-09T00:00:00Z' },
    { service_key: 'unknown_service', version: 1, state: 'published', revision: 0, updated_at: '2026-09-08T00:00:00Z' },
  ]), { headers: { 'content-type': 'application/json' } })
}) as typeof fetch

const store = await import('../../src/admin/service-version-store.js')

after(() => {
  globalThis.fetch = nativeFetch
  for (const key of Object.keys(process.env)) if (!(key in previousEnv)) delete process.env[key]
  Object.assign(process.env, previousEnv)
})

describe('서비스 버전 관리자 조회', { concurrency: false }, () => {
  it('실제 카탈로그에 최신 발행/초안 메타데이터만 결합한다', async () => {
    const snapshot = await store.getAdminServiceVersionSnapshot()
    const cmdg = snapshot.services.find((service) => service.canonicalKey === 'cmdg')
    assert.equal(snapshot.versionStore, 'ready')
    assert.equal(snapshot.services.length, 19)
    assert.deepEqual({ published: cmdg?.publishedVersion, draft: cmdg?.draftVersion, revision: cmdg?.revision }, { published: 2, draft: 3, revision: 1 })
    assert.ok(!snapshot.services.some((service) => service.canonicalKey === 'unknown_service'))
    assert.equal(calls[0]?.url.searchParams.get('select'), 'service_key,version,state,revision,updated_at')
    assert.equal(calls[0]?.headers.get('apikey'), 'sb_secret_synthetic_service_versions')
  })

  it('숨김 서비스도 운영 목록에서 삭제하지 않고 상태로 표시한다', async () => {
    const snapshot = await store.getAdminServiceVersionSnapshot()
    assert.equal(snapshot.services.find((service) => service.canonicalKey === 'love_mind')?.discoveryVisible, false)
  })
})
