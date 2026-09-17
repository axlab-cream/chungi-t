import { test } from 'node:test'
import assert from 'node:assert/strict'
import { reviewReportVerdictConsistency } from '../../src/report/tone-v2-review.js'
import { parseReportSummary, parseReportVerdict, sectionPrompt, summaryPrompt } from '../../src/report/report-generator.js'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import type { BirthInput, SajuReportSection } from '../../src/types/index.js'

const birth: BirthInput = { year: 1994, month: 3, day: 11, hour: 9, gender: 'female', calendar: 'solar' }
const section: SajuReportSection = {
  id: 'item', order: 1, imageKey: '', imageSrc: '', imageAlt: '',
  category: '판단', categoryEn: '', classification: '지금 자리',
  hook: '', interpretation: '', patternKeys: [], ragTopics: [], status: 'pending',
}

test('normal: texts that keep the first ranked choice pass', () => {
  const review = reviewReportVerdictConsistency({
    verdict: { statement: '지금은 타이밍을 조정하는 쪽이다.', rankedChoices: ['타이밍 조정', 'HOLD', 'GO'] },
    texts: ['1순위는 타이밍 조정이다. HOLD는 다음 후보다.'],
  })
  assert.equal(review.passed, true)
  assert.deepEqual(review.issues, [])
})

test('boundary: a single ranked choice still passes', () => {
  const review = reviewReportVerdictConsistency({
    verdict: { statement: '지금은 보류다.', rankedChoices: ['HOLD'] },
    texts: ['1순위는 HOLD다. 조건을 먼저 확인해요.'],
  })
  assert.equal(review.passed, true)
})

test('error: promoting a lower choice to first rank fails', () => {
  const review = reviewReportVerdictConsistency({
    verdict: { statement: '지금은 보류다.', rankedChoices: ['HOLD', 'GO'] },
    texts: ['요약: 1순위는 GO다.', '하이라이트: GO가 1순위다.'],
  })
  assert.equal(review.passed, false)
  assert.match(review.issues.join(' '), /GO/)
})

test('regression: stored reports without a verdict keep previous behaviour', () => {
  const review = reviewReportVerdictConsistency({
    texts: ['1순위는 GO다.', '다른 항목은 HOLD를 1순위로 말한다.'],
  })
  assert.equal(review.passed, true)
  assert.deepEqual(review.issues, [])
})

test('section prompts omit fixedVerdict when the report has none', () => {
  const payload = JSON.parse(sectionPrompt(analyzeSaju(birth), birth, { serviceKey: 'quit_fortune' }, section)[1].content)
  assert.equal(payload.evidenceLayers.fixedVerdict, undefined)
  assert.doesNotMatch(payload.instruction, /fixedVerdict/)
})

test('section prompts inject the stored verdict into every later call', () => {
  const verdict = { statement: '지금은 타이밍을 조정하는 쪽이다.', rankedChoices: ['타이밍 조정', 'HOLD'], decidedAt: '2026-09-17T00:00:00.000Z' }
  const payload = JSON.parse(sectionPrompt(analyzeSaju(birth), birth, { serviceKey: 'quit_fortune' }, section, [], undefined, verdict)[1].content)
  assert.deepEqual(payload.evidenceLayers.fixedVerdict, { statement: verdict.statement, rankedChoices: verdict.rankedChoices })
  assert.match(payload.instruction, /고정 결론/)
})

test('parseReportVerdict keeps the first ranked choice and the statement', () => {
  const parsed = parseReportVerdict('{"statement":"지금은 보류다.","rankedChoices":["HOLD","GO"]}')
  assert.equal(parsed.statement, '지금은 보류다.')
  assert.deepEqual(parsed.rankedChoices, ['HOLD', 'GO'])
  assert.match(parsed.decidedAt, /^\d{4}-\d{2}-\d{2}T/)
})

test('summary prompts carry the fixed verdict and parse the text body', () => {
  const verdict = { statement: '지금은 보류다.', rankedChoices: ['HOLD', 'GO'], decidedAt: '2026-09-17T00:00:00.000Z' }
  const payload = JSON.parse(summaryPrompt(analyzeSaju(birth), birth, { serviceKey: 'quit_fortune' }, verdict)[1].content)
  assert.deepEqual(payload.evidenceLayers.fixedVerdict, { statement: verdict.statement, rankedChoices: verdict.rankedChoices })
  const parsed = parseReportSummary('{"text":"지금은 보류다. 조건을 먼저 확인해요."}')
  assert.equal(parsed.status, 'complete')
  assert.match(parsed.text, /보류/)
})

test('a summary that promotes a lower choice fails the verdict gate', () => {
  const review = reviewReportVerdictConsistency({
    verdict: { statement: '지금은 보류다.', rankedChoices: ['HOLD', 'GO'] },
    texts: ['전체 요약: 1순위는 GO다.'],
  })
  assert.equal(review.passed, false)
})
