import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DEFAULT_CONSULTATION_SETTINGS, normalizeConsultationSettings, normalizeConsultationContentPayload, resolveConsultationSettings } from '../../src/consultation/settings.js'
import type { AdminContentSnapshot, ContentVersion } from '../../src/admin/content-store.js'

function snapshot(items: ContentVersion[] = []): AdminContentSnapshot { return { items, versionStore: 'ready', asOf: new Date().toISOString() } }
function version(state: ContentVersion['state'], settings = DEFAULT_CONSULTATION_SETTINGS): ContentVersion {
  return { id: 'test-only', contentType: 'notice', serviceKey: null, placement: 'cheonmyeong_consultation', payload: { title: '천명 상담 설정', body: JSON.stringify(settings) }, checksum: 'test-only', state, authorEmail: 'test@example.invalid', reviewNote: null, revision: 1, scheduledAt: null, publishedAt: null, createdAt: '', updatedAt: '' }
}
test('consultation defaults preserve the original character and voice', () => {
  assert.deepEqual(resolveConsultationSettings(snapshot()), DEFAULT_CONSULTATION_SETTINGS)
  assert.equal(normalizeConsultationSettings(DEFAULT_CONSULTATION_SETTINGS).voiceName, 'ko-KR-InJoonNeural')
  assert.equal(DEFAULT_CONSULTATION_SETTINGS.voiceRate, 0.95)
})
test('realtime voice defaults to Charon, survives older published settings and rejects unknown names', () => {
  assert.equal(DEFAULT_CONSULTATION_SETTINGS.liveVoiceName, 'Charon')
  const { liveVoiceName: _omitted, ...legacy } = DEFAULT_CONSULTATION_SETTINGS
  assert.equal(normalizeConsultationSettings(legacy).liveVoiceName, 'Charon')
  assert.equal(normalizeConsultationSettings({ ...DEFAULT_CONSULTATION_SETTINGS, liveVoiceName: 'Orus' }).liveVoiceName, 'Orus')
  for (const liveVoiceName of ['--arbitrary-option', 'charon', '', 42]) {
    assert.throws(() => normalizeConsultationSettings({ ...DEFAULT_CONSULTATION_SETTINGS, liveVoiceName }), /INVALID/)
  }
})
test('only the published global consultation record controls runtime; drafts cannot enable it', () => {
  const disabled = { ...DEFAULT_CONSULTATION_SETTINGS, enabled: false }
  const result = resolveConsultationSettings(snapshot([version('draft'), version('published', disabled)]))
  assert.equal(result.enabled, false)
  assert.ok(!('authorEmail' in result))
  assert.deepEqual(resolveConsultationSettings(snapshot([version('draft', disabled)])), DEFAULT_CONSULTATION_SETTINGS)
  assert.deepEqual(resolveConsultationSettings(snapshot([{ ...version('published', disabled), serviceKey: 'other-service' }])), DEFAULT_CONSULTATION_SETTINGS)
})
test('unavailable, malformed and conflicting published configurations fail closed', () => {
  assert.throws(() => resolveConsultationSettings({ ...snapshot(), versionStore: 'unavailable' }), /UNAVAILABLE/)
  assert.throws(() => resolveConsultationSettings(snapshot([version('published'), version('published')])), /INVALID/)
  assert.throws(() => resolveConsultationSettings(snapshot([{ ...version('published'), payload: { title: 'bad', body: '{' } }])), /INVALID/)
})
test('an archived managed configuration never resurrects the enabled default', () => {
  assert.equal(resolveConsultationSettings(snapshot([version('archived')])).enabled, false)
  assert.equal(resolveConsultationSettings(snapshot([version('draft'), version('archived')])).enabled, false)
  assert.equal(resolveConsultationSettings(snapshot([version('published'), version('archived')])).enabled, true)
})
test('configuration rejects markup, unsafe images, unapproved voices, model overrides and invalid scalars', () => {
  for (const patch of [{ personality: '<script>x</script>' }, { bannerImage: '//outside.invalid/test.png' }, { bannerImage: '/assets/../../secret.png' }, { bannerImage: 'https://outside.invalid/image.png' }, { voiceName: '--arbitrary-option' }, { voiceRate: 0 }, { voiceRate: NaN }, { enabled: 'false' }, { model: 'override' }, { speech: '' }, { questionRules: 'x'.repeat(1001) }]) {
    assert.throws(() => normalizeConsultationSettings({ ...DEFAULT_CONSULTATION_SETTINGS, ...patch }), /INVALID/)
  }
})
test('content payload validation canonicalizes title and never preserves internal extra fields', () => {
  const result = normalizeConsultationContentPayload({ title: 'ignored', body: JSON.stringify(DEFAULT_CONSULTATION_SETTINGS), authorEmail: 'not-public@example.invalid' })
  assert.equal(result.title, '천명 상담 설정')
  assert.deepEqual(Object.keys(result), ['title', 'body'])
  assert.deepEqual(JSON.parse(result.body), DEFAULT_CONSULTATION_SETTINGS)
  assert.throws(() => normalizeConsultationContentPayload({ body: '{}' }), /INVALID/)
})
test('reserved placement validates type, global scope and scheduling; bounded drafts cannot hide a published config', async () => {
  const previousUrl = process.env.SUPABASE_URL; const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY; const previousNodeEnv = process.env.NODE_ENV
  process.env.NODE_ENV = 'test'
  process.env.SUPABASE_URL = 'https://consultation-settings.synthetic.invalid'
  process.env.SUPABASE_SERVICE_ROLE_KEY = ['sb', 'secret', 'synthetic', 'settings'].join('_')
  const originalFetch = globalThis.fetch
  const calls: URL[] = []
  try {
    const store = await import('../../src/admin/content-store.js')
    const payload = { title: '천명', body: JSON.stringify(DEFAULT_CONSULTATION_SETTINGS) }
    const input = { placement: 'cheonmyeong_consultation', payload, authorEmail: 'synthetic@example.invalid' }
    globalThis.fetch = (async (input, options) => {
      assert.equal(options?.method ?? 'GET', 'GET', 'this test never writes a database')
      const url = new URL(String(input)); calls.push(url)
      assert.equal(url.hostname, 'consultation-settings.synthetic.invalid')
      assert.equal(url.searchParams.get('placement'), 'eq.cheonmyeong_consultation')
      assert.equal(url.searchParams.get('content_type'), 'eq.notice')
      assert.equal(url.searchParams.get('service_key'), 'is.null')
      const state = url.searchParams.get('state')?.replace('eq.', '')
      const count = state === 'draft' ? Number(url.searchParams.get('limit')) : state === 'published' ? 1 : 0
      const rows = Array.from({ length: count }, (_, index) => ({ id: `synthetic-${state}-${index}`, content_type: 'notice', service_key: null, placement: 'cheonmyeong_consultation', state, payload: { title: '천명', body: JSON.stringify({ ...DEFAULT_CONSULTATION_SETTINGS, enabled: state !== 'published' }) }, author_email: 'not-public@example.invalid', revision: 0, checksum: 'synthetic', created_at: '', updated_at: state === 'published' ? '2026-01-01' : '2026-10-02' }))
      return new Response(JSON.stringify(rows))
    }) as typeof fetch
    await assert.rejects(store.createContentDraft({ ...input, contentType: 'banner' }), /CONSULTATION_SETTINGS_INVALID/)
    await assert.rejects(store.createContentDraft({ ...input, contentType: 'notice', serviceKey: 'money_save' }), /CONSULTATION_SETTINGS_INVALID/)
    await assert.rejects(store.createContentDraft({ ...input, contentType: 'notice', scheduledAt: '2027-01-01' }), /CONSULTATION_SETTINGS_INVALID/)
    assert.equal(calls.length, 0, 'invalid reserved configs must be rejected before fetch')
    const loaded = await store.getConsultationContentSnapshot()
    assert.equal(resolveConsultationSettings(loaded).enabled, false)
    assert.equal(loaded.items.filter(item => item.state === 'published').length, 1)
    assert.ok(calls.some(url => url.searchParams.get('state') === 'eq.archived'))
    const id = '00000000-0000-0000-0000-000000000001'
    for (const patch of [{ content_type: 'banner' }, { service_key: 'money_save' }, { payload: { title: 'invalid', body: '{}' } }]) {
      globalThis.fetch = (async (_input, options) => {
        assert.equal(options?.method ?? 'GET', 'GET', 'invalid stored drafts must not archive the current publication')
        return new Response(JSON.stringify([{ id, content_type: 'notice', service_key: null, placement: 'cheonmyeong_consultation', state: 'draft', revision: 0, checksum: 'synthetic', payload, ...patch }]))
      }) as typeof fetch
      await assert.rejects(store.publishContentVersion({ id, expectedRevision: 0, checksum: 'synthetic', authorEmail: 'synthetic@example.invalid' }), /CONSULTATION_SETTINGS_INVALID/)
    }
    globalThis.fetch = async () => new Response('{}', { status: 503 })
    await assert.rejects(store.getConsultationContentSnapshot(), /CONTENT_LOOKUP_FAILED/)
  } finally {
    globalThis.fetch = originalFetch
    if (previousUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = previousUrl
    if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousNodeEnv
  }
})
