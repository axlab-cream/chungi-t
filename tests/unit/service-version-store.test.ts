import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'

const previousEnv = { ...process.env }
process.env.SUPABASE_URL = 'https://service-versions.synthetic.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_synthetic_service_versions'
const calls: Array<{ url: URL, headers: Headers, method: string, body: unknown }> = []
const nativeFetch = globalThis.fetch
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  const method = init?.method ?? 'GET'
  const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
  calls.push({ url, headers: new Headers(init?.headers), method, body })
  if (url.pathname.endsWith('/rpc/create_service_config_draft')) {
    return new Response(JSON.stringify([{ id: 'draft-new', service_key: 'cmdg', version: 4, state: 'draft', revision: 0, payload: body?.p_payload, checksum: body?.p_checksum, updated_at: '2026-09-12T00:00:00Z' }]), { headers: { 'content-type': 'application/json' } })
  }
  if (method === 'PATCH') {
    return new Response(JSON.stringify([{ id: 'draft-3', service_key: 'cmdg', version: 3, state: 'draft', revision: 2, payload: body?.payload, checksum: body?.checksum, updated_at: '2026-09-12T01:00:00Z' }]), { headers: { 'content-type': 'application/json' } })
  }
  return new Response(JSON.stringify([
    { id: 'live-2', service_key: 'cmdg', version: 2, state: 'published', revision: 4, payload: {}, updated_at: '2026-09-10T00:00:00Z' },
    { id: 'draft-3', service_key: 'cmdg', version: 3, state: 'draft', revision: 1, payload: { title: '편집 중인 천명사주', tagline: '초안 한줄', summary: '초안 요약', category: '종합', discoveryVisible: false, landingPath: '/cmdg/' }, updated_at: '2026-09-11T00:00:00Z' },
    { id: 'draft-1', service_key: 'cmdg', version: 1, state: 'draft', revision: 8, payload: {}, updated_at: '2026-09-09T00:00:00Z' },
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
    assert.equal(cmdg?.draft?.id, 'draft-3')
    assert.equal(cmdg?.draft?.fields.title, '편집 중인 천명사주')
    assert.equal(calls[0]?.url.searchParams.get('select'), 'id,service_key,version,state,revision,payload,updated_at')
    assert.equal(calls[0]?.headers.get('apikey'), 'sb_secret_synthetic_service_versions')
  })

  it('숨김 서비스도 운영 목록에서 삭제하지 않고 상태로 표시한다', async () => {
    const snapshot = await store.getAdminServiceVersionSnapshot()
    assert.equal(snapshot.services.find((service) => service.canonicalKey === 'love_mind')?.discoveryVisible, false)
  })

  it('새 초안은 RPC로 생성하며 checksum과 작성자를 서버 요청에 포함한다', async () => {
    const fields = { title: '천명사주', tagline: '한줄', summary: '요약', category: '종합', discoveryVisible: true, landingPath: '/cmdg/' }
    const draft = await store.createAdminServiceDraft({ canonicalKey: 'cmdg', fields, authorEmail: 'operator@example.com' })
    assert.equal(draft.id, 'draft-new')
    const call = calls.find((item) => item.url.pathname.endsWith('/rpc/create_service_config_draft'))
    assert.equal(call?.method, 'POST')
    assert.equal((call?.body as Record<string, unknown>).p_author_email, 'operator@example.com')
    assert.match(String((call?.body as Record<string, unknown>).p_checksum), /^[a-f0-9]{64}$/)
  })

  it('기존 초안은 id와 expected revision을 조건으로 한 번만 갱신한다', async () => {
    const fields = { title: '천명사주 수정', tagline: '한줄', summary: '요약', category: '종합', discoveryVisible: true, landingPath: '/cmdg/' }
    const draft = await store.updateAdminServiceDraft({ id: 'draft-3', canonicalKey: 'cmdg', expectedRevision: 1, fields })
    assert.equal(draft?.revision, 2)
    const call = calls.find((item) => item.method === 'PATCH')
    assert.equal(call?.url.searchParams.get('id'), 'eq.draft-3')
    assert.equal(call?.url.searchParams.get('service_key'), 'eq.cmdg')
    assert.equal(call?.url.searchParams.get('revision'), 'eq.1')
    assert.equal((call?.body as Record<string, unknown>).revision, 2)
  })
})
