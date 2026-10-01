import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { authenticateConsultation } from '../../src/consultation/auth.js'

const fetchOriginal = global.fetch
const oldUrl = process.env.SUPABASE_URL, oldKey = process.env.SUPABASE_PUBLISHABLE_KEY
after(() => { global.fetch = fetchOriginal; if (oldUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = oldUrl; if (oldKey === undefined) delete process.env.SUPABASE_PUBLISHABLE_KEY; else process.env.SUPABASE_PUBLISHABLE_KEY = oldKey })
test('real server auth rejects absent, invalid and anonymous tokens; provider outage is not a guest session', async () => {
  process.env.SUPABASE_URL = 'https://auth.example.invalid'
  process.env.SUPABASE_PUBLISHABLE_KEY = 'public-test-key'
  let result = new Response('{}', { status: 401 }), calls = 0
  global.fetch = async () => { calls++; return result.clone() }
  const app = express()
  app.get('/', async (req, res) => { const owner = await authenticateConsultation(req, res); if (owner) res.json({ id: owner.id }) })
  const server = app.listen(0, '127.0.0.1')
  await new Promise<void>(r => server.once('listening', r))
  const address = server.address() as { port: number }
  const get = (token?: string) => fetchOriginal(`http://127.0.0.1:${address.port}/`, { headers: token ? { authorization: `Bearer ${token}` } : {} })
  try {
    assert.equal((await get()).status, 401); assert.equal(calls, 0)
    assert.equal((await get('invalid')).status, 401)
    result = new Response(JSON.stringify({ id: 'anonymous-test', is_anonymous: true }))
    assert.equal((await get('guest')).status, 401)
    result = new Response(JSON.stringify({ id: 'registered-test', is_anonymous: false }))
    assert.deepEqual(await (await get('member')).json(), { id: 'registered-test' })
    result = new Response('{}', { status: 503 })
    assert.equal((await get('member')).status, 503)
  } finally { await new Promise<void>(r => server.close(() => r())) }
})
