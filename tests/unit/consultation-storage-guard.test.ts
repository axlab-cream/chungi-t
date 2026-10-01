import { it } from 'node:test'
import assert from 'node:assert/strict'

it('production consultation fails closed unless the database confirms ledger protection', async () => {
  const keys = ['NODE_ENV', 'DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'REPORT_STORAGE_DIR', 'VERCEL']
  const saved = new Map(keys.map(key => [key, process.env[key]]))
  const originalFetch = globalThis.fetch
  try {
    for (const key of keys) delete process.env[key]
    Object.assign(process.env, { NODE_ENV: 'test', SUPABASE_URL: 'https://consultation-qa.invalid', SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_fixture' })
    const { assertConsultationLedgerProtection } = await import('../../src/consultation/storage-guard.js')
    process.env.NODE_ENV = 'production'
    globalThis.fetch = (async (url, init) => {
      assert.equal(url, 'https://consultation-qa.invalid/rest/v1/rpc/consultation_ledger_protection_ready')
      assert.equal(init?.method, 'POST')
      assert.equal(new Headers(init?.headers).get('authorization'), null)
      return Response.json(true)
    }) as typeof fetch
    await assertConsultationLedgerProtection()
    for (const value of [false, 'true', {}, null]) {
      globalThis.fetch = async () => Response.json(value)
      await assert.rejects(assertConsultationLedgerProtection(), /CONSULTATION_STORAGE_PROTECTION_REQUIRED/)
    }
    globalThis.fetch = async () => new Response('', { status: 404 })
    await assert.rejects(assertConsultationLedgerProtection(), /CONSULTATION_STORAGE_PROTECTION_REQUIRED/)
  } finally {
    globalThis.fetch = originalFetch
    for (const [key, value] of saved) { if (value === undefined) delete process.env[key]; else process.env[key] = value }
  }
})
