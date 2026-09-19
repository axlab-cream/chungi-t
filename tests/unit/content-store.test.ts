import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, before, describe, it } from 'node:test'

/**
 * 2026-09-19 (T24): "콘텐츠" 메뉴가 아무 로더에도 연결돼 있지 않아 화면이 비어 보였다
 * (T22 가 만든 content_versions 표는 있었지만 T24 편집 UI가 없었다). 지키는 것:
 *   1. content_versions 는 service_role 에 DELETE 권한이 없다 — archived 상태로만 내린다.
 *   2. 게시본은 자리(content_type, service_key, placement)당 하나다. RPC 가 없으므로
 *      revision CAS 는 PostgREST 필터(revision=eq.N)로 건다.
 *   3. 원문 HTML 을 받지 않는다(구조화 필드만).
 *   4. 없는 서비스 키를 대상으로 콘텐츠를 만들 수 없다.
 */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')
const previousEnv = { ...process.env }
process.env.SUPABASE_URL = 'https://content-store.synthetic.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_synthetic_content'

let rows: Array<Record<string, unknown>> = []
const calls: Array<{ method: string; url: URL; body?: unknown }> = []
const nativeFetch = globalThis.fetch
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  const method = init?.method ?? 'GET'
  const body = init?.body ? JSON.parse(String(init.body)) : undefined
  calls.push({ method, url, body })
  if (url.pathname !== '/rest/v1/content_versions') throw new Error(`Unexpected path: ${url.pathname}`)

  if (method === 'GET') {
    let filtered = rows
    const id = url.searchParams.get('id')?.replace(/^eq\./, '')
    if (id) filtered = filtered.filter((row) => row.id === id)
    const state = url.searchParams.get('state')
    if (state?.startsWith('in.')) { const allowed = state.slice(4, -1).split(','); filtered = filtered.filter((row) => allowed.includes(row.state as string)) }
    return new Response(JSON.stringify(filtered), { headers: { 'content-type': 'application/json' } })
  }
  if (method === 'POST') {
    const created = { id: `00000000-0000-0000-0000-${String(rows.length + 1).padStart(12, '0')}`, created_at: '2026-09-19T00:00:00Z', updated_at: '2026-09-19T00:00:00Z', published_at: null, scheduled_at: null, review_note: null, service_key: null, ...body }
    rows.push(created)
    return new Response(JSON.stringify([created]), { headers: { 'content-type': 'application/json' } })
  }
  if (method === 'PATCH') {
    const id = url.searchParams.get('id')?.replace(/^eq\./, '')
    const stateFilter = url.searchParams.get('state')?.replace(/^eq\./, '')
    const revisionFilter = url.searchParams.get('revision')?.replace(/^eq\./, '')
    const placementFilter = url.searchParams.get('placement')?.replace(/^eq\./, '')
    const typeFilter = url.searchParams.get('content_type')?.replace(/^eq\./, '')
    const serviceFilter = url.searchParams.get('service_key')
    const matched = rows.filter((row) => (
      (!id || row.id === id)
      && (!stateFilter || row.state === stateFilter)
      && (!revisionFilter || String(row.revision) === revisionFilter)
      && (!placementFilter || row.placement === placementFilter)
      && (!typeFilter || row.content_type === typeFilter)
      && (serviceFilter === null || serviceFilter === undefined || (serviceFilter === 'is.null' ? row.service_key == null : row.service_key === serviceFilter.replace(/^eq\./, '')))
    ))
    for (const row of matched) Object.assign(row, body)
    return new Response(JSON.stringify(matched), { headers: { 'content-type': 'application/json' } })
  }
  throw new Error(`Unexpected method: ${method}`)
}) as typeof fetch

const store = await import('../../src/admin/content-store.js')

after(() => {
  globalThis.fetch = nativeFetch
  for (const key of Object.keys(process.env)) if (!(key in previousEnv)) delete process.env[key]
  Object.assign(process.env, previousEnv)
})

describe('콘텐츠(안내·배너·FAQ) 초안·게시·보관', { concurrency: false }, () => {
  before(() => { rows = []; calls.length = 0 })

  it('원문 HTML(<,>)을 거절한다', async () => {
    await assert.rejects(store.createContentDraft({ contentType: 'notice', placement: 'home/top', payload: { title: '<b>공지</b>', body: '내용' }, authorEmail: 'a@example.com' }), /CONTENT_PAYLOAD_INVALID/)
  })

  it('카탈로그에 없는 서비스를 대상으로 만들 수 없다', async () => {
    await assert.rejects(store.createContentDraft({ contentType: 'faq', serviceKey: 'made_up_service', placement: 'faq/main', payload: { title: '질문', body: '답변' }, authorEmail: 'a@example.com' }), /CONTENT_SERVICE_UNKNOWN/)
  })

  it('초안 생성 → 수정 → 게시까지, revision 충돌을 막는다', async () => {
    const created = await store.createContentDraft({ contentType: 'notice', placement: 'home/top-banner', payload: { title: '점검 안내', body: '내일 새벽 점검이 있습니다.' }, authorEmail: 'a@example.com' })
    assert.equal(created.state, 'draft')
    assert.equal(created.revision, 0)

    await assert.rejects(store.updateContentDraft({ id: created.id, expectedRevision: 99, payload: { title: '점검 안내', body: '수정' }, authorEmail: 'a@example.com' }), /CONTENT_REVISION_CONFLICT/)

    const updated = await store.updateContentDraft({ id: created.id, expectedRevision: 0, payload: { title: '점검 안내', body: '내일 새벽 2시 점검입니다.' }, authorEmail: 'b@example.com' })
    assert.equal(updated.revision, 1)
    assert.equal(updated.payload.body, '내일 새벽 2시 점검입니다.')

    const published = await store.publishContentVersion({ id: created.id, expectedRevision: updated.revision, checksum: updated.checksum, authorEmail: 'c@example.com' })
    assert.equal(published.state, 'published')
    assert.ok(published.publishedAt)
  })

  it('검토한 체크섬이 다르면 게시되지 않는다', async () => {
    const created = await store.createContentDraft({ contentType: 'banner', placement: 'home/hero', payload: { title: '배너', body: '문구' }, authorEmail: 'a@example.com' })
    await assert.rejects(store.publishContentVersion({ id: created.id, expectedRevision: created.revision, checksum: 'f'.repeat(64), authorEmail: 'a@example.com' }), /CONTENT_CHECKSUM_MISMATCH/)
  })

  it('게시 시 같은 자리(종류·서비스·위치)의 이전 게시본을 archived 로 내린다', async () => {
    const first = await store.createContentDraft({ contentType: 'notice', serviceKey: 'money_save', placement: 'money_save/notice', payload: { title: '1판', body: '내용1' }, authorEmail: 'a@example.com' })
    const firstPublished = await store.publishContentVersion({ id: first.id, expectedRevision: first.revision, checksum: first.checksum, authorEmail: 'a@example.com' })
    assert.equal(firstPublished.state, 'published')

    const second = await store.createContentDraft({ contentType: 'notice', serviceKey: 'money_save', placement: 'money_save/notice', payload: { title: '2판', body: '내용2' }, authorEmail: 'b@example.com' })
    const secondPublished = await store.publishContentVersion({ id: second.id, expectedRevision: second.revision, checksum: second.checksum, authorEmail: 'b@example.com' })
    assert.equal(secondPublished.state, 'published')

    const reloaded = await store.getContentVersion(first.id)
    assert.equal(reloaded?.state, 'archived', '이전 게시본이 내려가지 않았다')
  })

  it('archive 는 DELETE 가 아니라 상태 전환이다 — service_role 에 DELETE 권한이 없다는 계약과 일치', async () => {
    const created = await store.createContentDraft({ contentType: 'legal_link', placement: 'footer/terms', payload: { title: '이용약관', body: '이용약관 전문 링크', href: '/legal/terms' }, authorEmail: 'a@example.com' })
    const archived = await store.archiveContentVersion({ id: created.id, expectedRevision: created.revision })
    assert.equal(archived.state, 'archived')
    assert.ok(!calls.some((call) => call.method === 'DELETE'), 'DELETE 요청을 보냈다')
    // 다시 archive 해도(멱등) 에러 없이 그대로 돌아온다.
    assert.equal((await store.archiveContentVersion({ id: created.id, expectedRevision: archived.revision })).state, 'archived')
  })

  it('href 는 절대경로나 https 만 받는다', async () => {
    assert.throws(() => store.normalizeContentPayload({ title: 't', body: 'b', href: 'javascript:alert(1)' }), /CONTENT_PAYLOAD_INVALID/)
    assert.equal(store.normalizeContentPayload({ title: 't', body: 'b', href: '/legal/terms' }).href, '/legal/terms')
    assert.equal(store.normalizeContentPayload({ title: 't', body: 'b', href: 'https://example.com/x' }).href, 'https://example.com/x')
  })
})

describe('콘텐츠 라우트는 scope 별로 나뉘고 감사 명령을 거친다', () => {
  const source = readFileSync(join(ROOT, 'src/server/app.ts'), 'utf8')
  const getRoute = source.slice(source.indexOf("app.get('/api/admin/v1/content'"), source.indexOf('const CONTENT_FAILURES'))
  const postRoute = source.slice(source.indexOf("app.post('/api/admin/v1/content',"), source.indexOf("app.patch('/api/admin/v1/content/:id'"))
  const patchRoute = source.slice(source.indexOf("app.patch('/api/admin/v1/content/:id'"), source.indexOf("app.post('/api/admin/v1/content/:id/publish'"))
  const publishRoute = source.slice(source.indexOf("app.post('/api/admin/v1/content/:id/publish'"), source.indexOf("app.post('/api/admin/v1/content/:id/archive'"))
  const archiveRoute = source.slice(source.indexOf("app.post('/api/admin/v1/content/:id/archive'"), source.indexOf("app.get('/api/admin/v1/prompts'"))

  it('조회는 content:read, 쓰기는 content:write, 게시·보관은 content:publish', () => {
    assert.match(getRoute, /requireStaff\(req, res, 'content:read'\)/)
    assert.match(postRoute, /requireStaff\(req, res, 'content:write'\)/)
    assert.match(patchRoute, /requireStaff\(req, res, 'content:write'\)/)
    assert.match(publishRoute, /requireStaff\(req, res, 'content:publish'\)/)
    assert.match(archiveRoute, /requireStaff\(req, res, 'content:publish'\)/)
  })

  it('쓰기 라우트 넷 모두 감사 명령과 멱등 키를 거친다', () => {
    for (const route of [postRoute, patchRoute, publishRoute, archiveRoute]) {
      assert.match(route, /executeAdminCommand\(/)
      assert.match(route, /adminCommandKey\(req\)/)
    }
  })

  it('scope 셋 다 SUPER_ADMIN_SCOPES 와 LOCAL_ADMIN_SCOPES 에 있다', () => {
    const staff = readFileSync(join(ROOT, 'src/auth/staff.ts'), 'utf8')
    for (const scope of ["'content:read'", "'content:write'", "'content:publish'"]) assert.match(staff, new RegExp(scope.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    const localScopesLine = source.slice(source.indexOf('const LOCAL_ADMIN_SCOPES'), source.indexOf('\n', source.indexOf('const LOCAL_ADMIN_SCOPES')))
    for (const scope of ["'content:read'", "'content:write'", "'content:publish'"]) assert.match(localScopesLine, new RegExp(scope.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  })
})
