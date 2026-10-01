import { it } from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { synthesizeConsultation, validatedVoicePayload } from '../../src/consultation/voice.js'
import { DEFAULT_CONSULTATION_SETTINGS } from '../../src/consultation/settings.js'

it('voice relay signs the current deployment request instead of crossing into production', async () => {
  const keys = ['VERCEL', 'VERCEL_URL', 'VERCEL_PROJECT_PRODUCTION_URL', 'CONSULTATION_VOICE_SECRET']
  const original = new Map(keys.map(key => [key, process.env[key]]))
  const originalFetch = globalThis.fetch
  try {
    Object.assign(process.env, { VERCEL: '1', VERCEL_URL: 'preview.example.invalid', VERCEL_PROJECT_PRODUCTION_URL: 'production.example.invalid', CONSULTATION_VOICE_SECRET: 'synthetic-test-secret' })
    globalThis.fetch = (async (url, init) => {
      assert.equal(url, 'https://preview.example.invalid/api/consultation-voice')
      const body = String(init?.body)
      const headers = new Headers(init?.headers)
      assert.equal(headers.get('x-consultation-signature'), createHmac('sha256', 'synthetic-test-secret').update(body).digest('hex'))
      assert.equal(JSON.parse(body).profile.voiceName, 'ko-KR-InJoonNeural')
      assert.ok(JSON.parse(body).expires > Date.now() / 1000)
      return Response.json({ audio: 'YWJjZA==', audioMime: 'audio/mpeg', saved: false, text: 'untrusted' })
    }) as typeof fetch
    assert.deepEqual(await synthesizeConsultation('합성 테스트 문장', { ...DEFAULT_CONSULTATION_SETTINGS }), { audio: 'YWJjZA==', audioMime: 'audio/mpeg' })
    assert.throws(() => validatedVoicePayload({ audio: '<script>', audioMime: 'audio/mpeg' }), /VOICE_UNAVAILABLE/)
    globalThis.fetch = async () => new Response('', { status: 401 })
    await assert.rejects(synthesizeConsultation('합성 테스트', { ...DEFAULT_CONSULTATION_SETTINGS }), /VOICE_UNAVAILABLE/)
  } finally {
    globalThis.fetch = originalFetch
    for (const [key, value] of original) { if (value === undefined) delete process.env[key]; else process.env[key] = value }
  }
})
