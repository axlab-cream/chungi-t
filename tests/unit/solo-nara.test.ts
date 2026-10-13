import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import express from 'express'
import { readFileSync } from 'node:fs'
import { axisResult, calculateSoloResult, parseSoloInput, simulate, structureErrors, type SoloPole, type SoloSpec } from '../../src/play/solo-nara.js'
import { soloNaraRouter } from '../../src/play/solo-nara-route.js'

const load = () => JSON.parse(readFileSync(new URL('../../data/solo-nara-spec.json', import.meta.url), 'utf8')) as SoloSpec
/** 원하는 극을 고르는 답 번호. 문항마다 4개 답이 4개 조합을 하나씩 갖는다. */
const pickFor = (spec: SoloSpec, want: Record<string, SoloPole>) => spec.questions.map(q => q.answers.findIndex(a => q.axes.every(x => a.pick[x] === want[x])))

test('spec is valid and every one of the 8 types is reachable with an even share', () => {
  const spec = load()
  assert.deepEqual(structureErrors(spec), [])
  const result = simulate(spec)
  assert.equal(Object.values(result.counts).reduce((a, b) => a + b, 0), 4 ** 10)
  for (const share of Object.values(result.shares)) assert.ok(share > 0.1 && share < 0.15, String(share))
})

test('structure check catches broken answer tables, codes, match targets and a missing tie-break', () => {
  const spec = load()
  spec.questions[0].answers[1].pick = { ...spec.questions[0].answers[0].pick }
  spec.types[1].code = spec.types[0].code
  spec.types[2].danger.type = 'nobody'
  spec.tieBreak = {}
  const errors = structureErrors(spec).join('\n')
  assert.match(errors, /q1: the 4 answers must cover/)
  assert.match(errors, /code must be a unique/)
  assert.match(errors, /unknown nobody/)
  assert.match(errors, /needs tieBreak/)
})

test('input must answer all ten questions within A~D; gender is no longer needed', () => {
  assert.throws(() => parseSoloInput({ answers: [0, 0, 0, 0, 0, 0, 0, 0, 0] }))
  assert.throws(() => parseSoloInput({ answers: [0, 0, 0, 0, 0, 0, 0, 0, 0, 4] }))
  assert.throws(() => parseSoloInput({ answers: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1.5] }))
  assert.deepEqual(parseSoloInput({ answers: [3, 2, 1, 0, 3, 2, 1, 0, 3, 2], gender: 'female' }), { answers: [3, 2, 1, 0, 3, 2, 1, 0, 3, 2] })
})

test('a clean answer pattern lands on its own type with 100/0 scores', () => {
  const spec = load()
  for (const t of spec.types) {
    const want = Object.fromEntries(spec.axes.map((a, i) => [a.id, t.code[i] as SoloPole]))
    const r = calculateSoloResult(spec, { answers: pickFor(spec, want) })
    assert.equal(r.type, t.typeId)
    assert.deepEqual(r.scores, Object.fromEntries(spec.axes.map((a, i) => [a.id, t.code[i] === 'a' ? 100 : 0])))
  }
})

test('a 3:3 split on the heart axis follows the tie-break question', () => {
  const spec = load()
  const heart = spec.questions.map((q, i) => ({ q, i })).filter(({ q }) => q.axes.includes('heart'))
  const tb = spec.questions.findIndex(q => q.questionId === spec.tieBreak.heart)
  for (const tbPole of ['a', 'b'] as const) {
    const answers = pickFor(spec, { lead: 'a', reveal: 'a', heart: 'b' })
    // The tie-break question gets tbPole; then fill the other heart questions until it is 3:3.
    let aCount = 0
    for (const { q, i } of heart) {
      const pole: SoloPole = i === tb ? tbPole : (aCount + (tbPole === 'a' ? 1 : 0) < 3 ? 'a' : 'b')
      if (i !== tb && pole === 'a') aCount++
      answers[i] = q.answers.findIndex(a => a.pick.heart === pole && q.axes.every(x => x === 'heart' || a.pick[x] === 'a'))
    }
    const { scores, poles } = axisResult(spec, answers)
    assert.equal(scores.heart, 50)
    assert.equal(poles.heart, tbPole)
  }
})

test('route enforces auth, validates input and never caches results', async () => {
  const spec = load()
  const app = express(); app.use(express.json())
  app.use('/r', soloNaraRouter({ spec, authenticate: async (req, res) => { if (req.headers.authorization !== 'Bearer ok') { res.status(401).json({}); return null } return { id: 'u' } } }))
  const server = app.listen(0); const port = (server.address() as { port: number }).port
  const post = (body: unknown, auth = 'Bearer ok') => fetch(`http://127.0.0.1:${port}/r/result`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: auth }, body: JSON.stringify(body) })
  try {
    assert.equal((await post({ answers: new Array(10).fill(0) }, 'Bearer no')).status, 401)
    assert.equal((await post({ answers: [0] })).status, 400)
    const ok = await post({ answers: new Array(10).fill(0) })
    assert.equal(ok.status, 200)
    assert.equal(ok.headers.get('cache-control'), 'no-store')
    const data = await ok.json() as { type: string }
    assert.ok(spec.types.some(t => t.typeId === data.type))
  } finally { server.close() }
})
