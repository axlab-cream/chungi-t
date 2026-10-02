import { it } from 'node:test'
import assert from 'node:assert/strict'
import { geminiConsultationProvider } from '../../src/consultation/provider.js'

it('records bounded provider error codes without key, prompt or upstream messages', async () => {
  const originalFetch = globalThis.fetch
  const originalWarn = console.warn
  const key = process.env.GEMINI_API_KEY
  const logs: string[] = []
  process.env.GEMINI_API_KEY = 'test-private-key'
  console.warn = (...args) => { logs.push(args.join(' ')) }
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { status: 'PERMISSION_DENIED', message: 'test-private-key customer-private-text', details: [{ reason: 'API_KEY_INVALID' }, { reason: 'customer-private-text' }] } }), { status: 403 })
  try {
    await assert.rejects(geminiConsultationProvider().reply('customer-private-text', [], 'private question'), { code: 'PROVIDER_UNAVAILABLE', status: 503 })
    assert.match(logs.join(''), /PERMISSION_DENIED/)
    assert.match(logs.join(''), /API_KEY_INVALID/)
    assert.doesNotMatch(logs.join(''), /test-private-key|customer-private-text|private question/)
  } finally {
    globalThis.fetch = originalFetch
    console.warn = originalWarn
    if (key === undefined) delete process.env.GEMINI_API_KEY
    else process.env.GEMINI_API_KEY = key
  }
})
