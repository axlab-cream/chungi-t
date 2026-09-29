import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import express from 'express'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { calculateLoveResult, parseLoveInput } from '../../src/play/love-speed.js'
import { loveSpeedRouter } from '../../src/play/love-speed-route.js'

test('sharing sends only the public type; cancellation never falls back to clipboard', async () => {
  const source = readFileSync(new URL('../../사주/play/love-speed/app.js', import.meta.url), 'utf8')
  const shareSource = source.slice(source.indexOf('  async function share(data)'), source.indexOf('  function sampleResult'))
  let payload: any
  let copied = 0
  const context: any = { types: { spark: { name: '불꽃급랭형' } }, navigator: { share: async (data: unknown) => { payload = data }, clipboard: { writeText: async () => { copied++ } } }, notice() {} }
  runInNewContext(shareSource, context)
  await context.share({ type: 'spark', name: 'PRIVATE', mbti: 'ENFP', answers: [0,1,2,3,0], birth: 'PRIVATE' })
  assert.equal(payload.url, 'https://umsh.kr/play/love-speed/?type=spark')
  assert.deepEqual(Object.keys(payload), ['title','text','url'])
  assert.ok(!JSON.stringify(payload).includes('PRIVATE'))
  assert.ok(!JSON.stringify(payload).includes('ENFP'))
  context.navigator.share = async () => { throw Object.assign(Error(), { name: 'AbortError' }) }
  await context.share({ type: 'spark' })
  assert.equal(copied, 0)
  delete context.navigator.share
  await context.share({ type: 'spark' })
  assert.equal(copied, 1)
})

test('all 1024 answer combinations produce bounded scores and reach all four types', () => {
  const types = new Set()
  for (let i = 0; i < 1024; i++) {
    const answers = Array.from({ length: 5 }, (_, j) => (i >> (j * 2)) & 3)
    const r = calculateLoveResult({ answers, mbti: null })
    types.add(r.type)
    for (const n of Object.values(r.stats)) assert.ok(Number.isInteger(n) && n >= 0 && n <= 100)
  }
  assert.equal(types.size, 4)
})
test('invalid answers and MBTI are rejected; unknown accepted', () => {
  for (const input of [null, {}, { answers: [0,0,0,0] }, { answers: [0,0,0,0,4] }, { answers: [0,0,0,0,NaN] }, { answers: [0,0,0,0,0], mbti: '<script>' }]) assert.throws(() => parseLoveInput(input))
  assert.equal(parseLoveInput({ answers: [0,0,0,0,0], mbti: null }).mbti, null)
})
test('sa ju and MBTI supply context without fabricating probabilities or leaking profile', () => {
  const input = { answers: [0,0,0,0,0], mbti: 'ENFP', name: 'PRIVATE', birth: 'PRIVATE' }
  const r = calculateLoveResult(input, { dayMasterElement: 'fire' }, false)
  assert.ok(r.sajuNote.includes('출생 시간은 미상'))
  assert.ok(r.mbtiNote.includes('ENFP'))
  assert.ok(!JSON.stringify(r).includes('PRIVATE'))
  assert.deepEqual(r.stats, calculateLoveResult({ ...input, mbti: null }).stats)
})
test('route enforces auth, validates input, uses owner context and fails closed', async () => {
  let mode = 'anonymous'
  let calls = 0
  const app = express().use(express.json()).use('/api/play/love-speed', loveSpeedRouter({
    authenticate: async (_req, res) => { if (mode === 'anonymous') { res.status(401).json({ error: 'login' }); return null }; return { id: 'owner' } },
    context: async owner => { calls++; assert.equal(owner.id, 'owner'); if (mode === 'failure') throw Error('private details'); return { saju: null, birthTimeKnown: false } },
  }))
  const server = app.listen(0, '127.0.0.1')
  await new Promise<void>(resolve => server.once('listening', resolve))
  const address = server.address() as { port: number }
  const post = (body: unknown) => fetch(`http://127.0.0.1:${address.port}/api/play/love-speed/result`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  try {
    assert.equal((await post({ answers: [0,0,0,0,0] })).status, 401)
    assert.equal(calls, 0)
    mode = 'member'
    assert.equal((await post({ answers: [0] })).status, 400)
    const response = await post({ answers: [0,0,0,0,0] })
    assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.equal((await response.json()).type, 'spark')
    mode = 'failure'
    const failed = await post({ answers: [0,0,0,0,0] })
    assert.equal(failed.status, 503)
    assert.ok(!(await failed.text()).includes('private details'))
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) }
})
