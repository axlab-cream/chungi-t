import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'

const previousEnv = { ...process.env }
process.env.SUPABASE_URL = 'https://service-versions.synthetic.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_synthetic_service_versions'
const ALL_ROWS = [
  { service_key: 'cmdg', version: 2, state: 'published', revision: 4, updated_at: '2026-09-10T00:00:00Z', payload: { title: 'A', tagline: 'a', summary: 'a', category: '종합', discoveryVisible: true } },
  { service_key: 'cmdg', version: 3, state: 'draft', revision: 1, updated_at: '2026-09-11T00:00:00Z', payload: { title: 'B', tagline: 'b', summary: 'b', category: '종합', discoveryVisible: true } },
  { service_key: 'cmdg', version: 1, state: 'draft', revision: 8, updated_at: '2026-09-09T00:00:00Z', payload: { title: 'C', tagline: 'c', summary: 'c', category: '종합', discoveryVisible: true } },
  { service_key: 'unknown_service', version: 1, state: 'published', revision: 0, updated_at: '2026-09-08T00:00:00Z' },
  { service_key: 'love_mind', version: 1, state: 'published', revision: 0, updated_at: '2026-09-08T00:00:00Z', payload: { title: '그 사람도 나를 생각할까', tagline: 't', summary: 's', category: '연애', discoveryVisible: false, saleAvailable: false } },
]
const calls: Array<{ url: URL, headers: Headers }> = []
const nativeFetch = globalThis.fetch
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  calls.push({ url, headers: new Headers(init?.headers) })
  if (url.pathname.endsWith('/rest/v1/service_config_versions')) {
    let rows = ALL_ROWS
    const stateFilter = url.searchParams.get('state')
    if (stateFilter === 'eq.published') rows = rows.filter((row) => row.state === 'published')
    else if (stateFilter?.startsWith('in.')) {
      const allowed = stateFilter.slice(4, -1).split(',')
      rows = rows.filter((row) => allowed.includes(row.state))
    }
    const keyFilter = url.searchParams.get('service_key')
    if (keyFilter?.startsWith('eq.')) rows = rows.filter((row) => row.service_key === keyFilter.slice(3))
    const limit = Number(url.searchParams.get('limit') ?? Infinity)
    return new Response(JSON.stringify(rows.slice(0, limit)), { headers: { 'content-type': 'application/json' } })
  }
  return new Response(JSON.stringify({ message: 'unexpected' }), { status: 404 })
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
    assert.equal(calls[0]?.url.searchParams.get('select'), 'service_key,version,state,revision,updated_at,payload')
    assert.equal(calls[0]?.headers.get('apikey'), 'sb_secret_synthetic_service_versions')
  })

  it('숨김 서비스도 운영 목록에서 삭제하지 않고 상태로 표시한다', async () => {
    const snapshot = await store.getAdminServiceVersionSnapshot()
    assert.equal(snapshot.services.find((service) => service.canonicalKey === 'love_mind')?.discoveryVisible, false)
  })

  it('초안이 있으면 초안 원문을, 없으면 발행본 원문을 currentPayload 로 노출하고, saleAvailable 은 실제 값을 반영한다', async () => {
    const snapshot = await store.getAdminServiceVersionSnapshot()
    const cmdg = snapshot.services.find((service) => service.canonicalKey === 'cmdg')
    assert.equal(cmdg?.currentPayload?.title, 'B') // 최신 초안(v3)이 발행본(v2)보다 우선한다.
    assert.equal(cmdg?.saleAvailable, true) // payload 에 saleAvailable 이 없으면 기본값 true.
    const loveMind = snapshot.services.find((service) => service.canonicalKey === 'love_mind')
    assert.equal(loveMind?.saleAvailable, false) // 발행본이 명시적으로 판매를 중단했다.
  })

  it('판매 가능 여부는 발행본의 saleAvailable 을 기준으로 하고, 발행본이 없으면 막지 않는다', async () => {
    assert.equal(await store.isServiceSaleAvailable('love_mind'), false)
    assert.equal(await store.isServiceSaleAvailable('cmdg'), true) // 발행본(v2)엔 saleAvailable 이 없다 = 기본 판매 가능.
    assert.equal(await store.isServiceSaleAvailable('job_choice'), true) // 이 서비스는 발행본 자체가 없다.
  })
})
