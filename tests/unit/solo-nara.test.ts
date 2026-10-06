import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import express from 'express'
import { readFileSync } from 'node:fs'
import { SOLO_NAMES, calculateSoloResult, designIssues, distributionIssues, parseSoloInput, rankCandidates, simulate, structureErrors, type SoloSpec } from '../../src/play/solo-nara.js'
import { soloNaraRouter } from '../../src/play/solo-nara-route.js'

// Numbers-only fixture; real copy arrives in data/solo-nara-spec.json and must pass the same checks.
const load = () => JSON.parse(readFileSync(new URL('../fixtures/solo-nara-spec.fixture.json', import.meta.url), 'utf8')) as SoloSpec

test('fixture spec passes structure, design rules and the exhaustive distribution criteria', () => {
  const spec = load()
  assert.deepEqual(structureErrors(spec), [])
  assert.deepEqual(designIssues(spec), [])
  for (const gender of ['female', 'male'] as const) {
    const result = simulate(spec, gender)
    assert.equal(Object.values(result.counts).reduce((a, b) => a + b, 0), 65536)
    assert.ok(Object.values(result.counts).every(n => n > 0), `${gender}: every character must appear`)
    assert.deepEqual(distributionIssues(spec, gender, result), [])
  }
})

test('structure check rejects a stale axisRange, unknown match targets and wrong name sets', () => {
  const spec = load()
  spec.axisRange.direct.max += 1
  spec.characters[0].best = 'nobody'
  spec.characters[1].name = '민지'
  const errors = structureErrors(spec).join('\n')
  assert.match(errors, /axisRange\.direct/)
  assert.match(errors, /unknown nobody/)
  assert.match(errors, /female names/)
})

test('design check catches asymmetric pairs, extreme vectors and crowded characters', () => {
  const spec = load()
  const [a, b] = spec.characters.filter(c => c.gender === 'female')
  spec.characters.find(c => c.typeId === a.best)!.best = spec.characters.find(c => c.gender === 'female' && c.typeId !== a.typeId && c.best !== a.best)!.best
  a.vector.direct = 95
  b.vector = { ...a.vector, express: a.vector.express - 1 }
  const issues = designIssues(spec).join('\n')
  assert.match(issues, /not symmetric/)
  assert.match(issues, /outside 20~80/)
  assert.match(issues, /distance .* < 25/)
})

test('input must name a gender and answer all eight questions within A~D', () => {
  assert.throws(() => parseSoloInput({ answers: [0, 0, 0, 0, 0, 0, 0, 0] }))
  assert.throws(() => parseSoloInput({ gender: 'other', answers: [0, 0, 0, 0, 0, 0, 0, 0] }))
  assert.throws(() => parseSoloInput({ gender: 'female', answers: [0, 0, 0, 0, 0, 0, 0] }))
  assert.throws(() => parseSoloInput({ gender: 'female', answers: [0, 0, 0, 0, 0, 0, 0, 4] }))
  assert.throws(() => parseSoloInput({ gender: 'female', answers: [0, 0, 0, 0, 0, 0, 0, 1.5] }))
  assert.deepEqual(parseSoloInput({ gender: 'male', answers: [3, 2, 1, 0, 3, 2, 1, 0], extra: 'ignored' }), { gender: 'male', answers: [3, 2, 1, 0, 3, 2, 1, 0] })
})

test('results stay within the chosen gender and expose opposite-gender matches only', () => {
  const spec = load()
  for (const gender of ['female', 'male'] as const) {
    const other = gender === 'female' ? 'male' : 'female'
    for (const answers of [[0, 0, 0, 0, 0, 0, 0, 0], [3, 3, 3, 3, 3, 3, 3, 3], [0, 1, 2, 3, 0, 1, 2, 3]]) {
      const result = calculateSoloResult(spec, { gender, answers })
      assert.ok(SOLO_NAMES[gender].includes(result.name))
      assert.ok(SOLO_NAMES[other].includes(result.best.name))
      assert.ok(SOLO_NAMES[other].includes(result.danger.name))
      assert.ok(Object.values(result.scores).every(n => n >= 0 && n <= 100))
      assert.ok(!('answers' in result) && !('gender' in result))
    }
  }
})

test('near-ties prefer the closer primary axis, then the fixed order', () => {
  const spec = load()
  const female = spec.characters.filter(c => c.gender === 'female')
  const [a, b] = female
  for (const c of female.slice(2)) c.vector = { direct: 20, express: 20, stability: 20, independence: 20 }
  a.vector = { direct: 50, express: 50, stability: 40, independence: 50 }
  b.vector = { direct: 50, express: 50, stability: 60, independence: 50 }
  // b is 0.4 closer overall (inside epsilon 0.5), but a's primary axis matches exactly, so a wins.
  a.primaryAxis = 'direct'; b.primaryAxis = 'stability'
  const near = { direct: 50, express: 50, stability: 50.2, independence: 50 }
  const ranked = rankCandidates(spec, 'female', near)
  assert.equal(ranked.tied, true)
  assert.equal(ranked.ranked[0].character.typeId, a.typeId)
  // Outside epsilon the plain distance decides.
  assert.equal(rankCandidates(spec, 'female', { ...near, stability: 51 }).ranked[0].character.typeId, b.typeId)
  // Equal distance and equal primary-axis gaps fall back to tieBreak.order.
  a.primaryAxis = 'stability'
  const even = { ...near, stability: 50 }
  spec.tieBreak.order = [b.typeId, ...spec.tieBreak.order.filter(id => id !== b.typeId)]
  assert.equal(rankCandidates(spec, 'female', even).ranked[0].character.typeId, b.typeId)
  spec.tieBreak.order = [a.typeId, ...spec.tieBreak.order.filter(id => id !== a.typeId)]
  assert.equal(rankCandidates(spec, 'female', even).ranked[0].character.typeId, a.typeId)
})

test('route enforces auth, validates input, refuses invalid specs and never caches results', async () => {
  assert.throws(() => soloNaraRouter({ authenticate: async () => ({}), spec: { ...load(), questions: [] } }))
  let member = false
  const app = express().use(express.json()).use('/api/play/solo-nara', soloNaraRouter({
    authenticate: async (_req, res) => { if (!member) { res.status(401).json({ error: 'login' }); return null }; return { id: 'owner' } },
    spec: load(),
  }))
  const server = app.listen(0, '127.0.0.1')
  await new Promise<void>(resolve => server.once('listening', resolve))
  const { port } = server.address() as { port: number }
  const post = (body: unknown) => fetch(`http://127.0.0.1:${port}/api/play/solo-nara/result`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  try {
    assert.equal((await post({ gender: 'female', answers: [0, 0, 0, 0, 0, 0, 0, 0] })).status, 401)
    member = true
    assert.equal((await post({ gender: 'female', answers: [0] })).status, 400)
    const response = await post({ gender: 'male', answers: [3, 3, 3, 3, 3, 3, 3, 3] })
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.ok(SOLO_NAMES.male.includes((await response.json()).name))
  } finally {
    server.close()
  }
})
