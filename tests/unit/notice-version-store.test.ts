import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'

const previousEnv = { ...process.env }
process.env.SUPABASE_URL = 'https://notice-versions.synthetic.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_synthetic_notice_versions'
const calls: Array<{ url: URL, method: string, body: Record<string, unknown> | undefined }> = []
const nativeFetch = globalThis.fetch
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  const method = init?.method ?? 'GET'
  const body = typeof init?.body === 'string' ? JSON.parse(init.body) as Record<string, unknown> : undefined
  calls.push({ url, method, body })
  if (url.pathname.endsWith('/rpc/create_support_notice_draft')) {
    return Response.json([{ id: 'draft-2', content_type: 'notice', placement: 'support_top', payload: body?.p_payload, review_note: body?.p_review_note, state: 'draft', revision: 0, created_at: '2026-09-12T02:00:00Z', updated_at: '2026-09-12T02:00:00Z', published_at: null }])
  }
  if (url.pathname.endsWith('/rpc/publish_support_notice_draft')) {
    return Response.json([{ id: 'draft-2', content_type: 'notice', placement: 'support_top', payload: { title: '점검 안내', body: '점검이 완료되었습니다.' }, review_note: '검수 완료', state: 'published', revision: 2, created_at: '2026-09-12T02:00:00Z', updated_at: '2026-09-12T03:00:00Z', published_at: '2026-09-12T03:00:00Z' }])
  }
  if (method === 'PATCH') {
    return Response.json([{ id: 'draft-2', content_type: 'notice', placement: 'support_top', payload: body?.payload, review_note: body?.review_note, state: 'draft', revision: 1, created_at: '2026-09-12T02:00:00Z', updated_at: '2026-09-12T02:30:00Z', published_at: null }])
  }
  return Response.json([
    { id: 'draft-2', content_type: 'notice', placement: 'support_top', payload: { title: '점검 안내 초안', body: '초안 본문' }, review_note: '검토 중', state: 'draft', revision: 1, created_at: '2026-09-12T02:00:00Z', updated_at: '2026-09-12T02:30:00Z', published_at: null },
    { id: 'live-1', content_type: 'notice', placement: 'support_top', payload: { title: '기존 공지', body: '기존 본문' }, review_note: '내부 메모', state: 'published', revision: 3, created_at: '2026-09-11T01:00:00Z', updated_at: '2026-09-11T01:30:00Z', published_at: '2026-09-11T01:30:00Z' },
    { id: 'other', content_type: 'banner', placement: 'support_top', payload: { title: '배너' }, state: 'published', revision: 1, created_at: '2026-09-10T00:00:00Z', updated_at: '2026-09-10T00:00:00Z' },
  ])
}) as typeof fetch

const store = await import('../../src/admin/notice-version-store.js')

after(() => {
  globalThis.fetch = nativeFetch
  for (const key of Object.keys(process.env)) if (!(key in previousEnv)) delete process.env[key]
  Object.assign(process.env, previousEnv)
})

describe('지원 공지 버전 저장소', { concurrency: false }, () => {
  it('고정 위치의 실제 초안과 발행본만 조회한다', async () => {
    const snapshot = await store.getAdminSupportNoticeSnapshot()
    assert.equal(snapshot.store, 'ready')
    assert.equal(snapshot.draft?.id, 'draft-2')
    assert.equal(snapshot.published?.id, 'live-1')
    assert.equal(snapshot.draft?.fields.title, '점검 안내 초안')
    assert.equal(calls[0]?.url.searchParams.get('content_type'), 'eq.notice')
    assert.equal(calls[0]?.url.searchParams.get('placement'), 'eq.support_top')
  })

  it('공개 읽기는 발행 allowlist만 반환한다', async () => {
    const notice = await store.getPublishedSupportNotice()
    assert.deepEqual(notice, { title: '기존 공지', body: '기존 본문', publishedAt: '2026-09-11T01:30:00Z' })
    assert.ok(!('reviewNote' in (notice ?? {})))
    assert.ok(!('revision' in (notice ?? {})))
  })

  it('생성·수정·발행은 checksum, revision, 검수 메모를 보낸다', async () => {
    const fields = { title: '점검 안내', body: '점검이 완료되었습니다.' }
    await store.createAdminSupportNoticeDraft({ fields, reviewNote: '검토 중', authorEmail: 'Editor@Example.com' })
    await store.updateAdminSupportNoticeDraft({ id: 'draft-2', expectedRevision: 0, fields, reviewNote: '수정 검토' })
    await store.publishAdminSupportNoticeDraft({ id: 'draft-2', expectedRevision: 1, actorEmail: 'Publisher@Example.com' })
    const create = calls.find((call) => call.url.pathname.endsWith('/rpc/create_support_notice_draft'))
    const update = calls.find((call) => call.method === 'PATCH')
    const publish = calls.find((call) => call.url.pathname.endsWith('/rpc/publish_support_notice_draft'))
    assert.match(String(create?.body?.p_checksum), /^[a-f0-9]{64}$/)
    assert.equal(create?.body?.p_author_email, 'editor@example.com')
    assert.equal(update?.url.searchParams.get('revision'), 'eq.0')
    assert.equal(update?.body?.revision, 1)
    assert.deepEqual(publish?.body, { p_draft_id: 'draft-2', p_expected_revision: 1, p_actor_email: 'publisher@example.com' })
  })
})
