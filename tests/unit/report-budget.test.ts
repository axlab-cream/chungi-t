import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import { groundedReportFeatures, sectionLengthPlan, sectionPrompt } from '../../src/report/report-generator.js'
import {
  lengthBudgetForRole,
  reviewEngineLabelExposure,
  reviewLengthBudget,
  strengthMeaning,
  twoPassBudget,
} from '../../src/report/report-budget.js'
import type { BirthInput, SajuReportSection } from '../../src/types/index.js'

const birth: BirthInput = { year: 1994, month: 3, day: 11, hour: 9, gender: 'female', calendar: 'solar' }
const section: SajuReportSection = {
  id: 'item', order: 2, imageKey: '', imageSrc: '', imageAlt: '',
  category: '판단', categoryEn: '', classification: '지금 자리',
  hook: '', interpretation: '', patternKeys: [], ragTopics: [], status: 'pending',
}

test('budgets are two-pass values from the current pipeline bands, not copied handoff tiers', () => {
  assert.deepEqual(twoPassBudget(450, 700), { min: 405, max: 945 })
  assert.deepEqual(twoPassBudget(1200, 1600), { min: 1080, max: 2160 })
  assert.deepEqual(twoPassBudget(1100, 1500), { min: 990, max: 2025 })
  const summary = lengthBudgetForRole('summary')
  const opening = lengthBudgetForRole('sectionOpening')
  assert.equal(summary.min, twoPassBudget(450, 700).min)
  assert.equal(summary.max, twoPassBudget(450, 700).max)
  assert.equal(opening.min, twoPassBudget(1200, 1600).min)
  assert.equal(opening.max, twoPassBudget(1200, 1600).max)
  assert.equal(sectionLengthPlan({ order: 1, category: '', classification: '' }).min, 1200)
})

test('in-range copy is not a regenerate target', () => {
  const text = '가'.repeat(500)
  const review = reviewLengthBudget(text, 'summary')
  assert.equal(review.passed, true)
  assert.equal(review.regenerate, false)
  assert.deepEqual(review.issues, [])
})

test('under and over budget ask for regenerate instead of a first-pass fail', () => {
  const shortReview = reviewLengthBudget('짧다.', 'summary')
  assert.equal(shortReview.passed, true)
  assert.equal(shortReview.regenerate, true)
  assert.match(shortReview.issues.join(' '), /미달/)
  const longReview = reviewLengthBudget('가'.repeat(2000), 'summary')
  assert.equal(longReview.passed, true)
  assert.equal(longReview.regenerate, true)
  assert.match(longReview.issues.join(' '), /초과/)
})

test('raw engine labels are rejected and meaning-language is allowed', () => {
  assert.equal(reviewEngineLabelExposure('지금은 돈 낮음이라 지출을 줄여요.').passed, false)
  assert.equal(reviewEngineLabelExposure('관성 높음이 조직을 말해요.').passed, false)
  assert.equal(reviewEngineLabelExposure('지금은 힘을 덜 받는 쪽이라 지출 항목을 먼저 봐요.').passed, true)
  assert.equal(strengthMeaning('weak'), '힘을 덜 받는 쪽')
})

test('prompt features send strength as meaning, not a raw grade', () => {
  const features = groundedReportFeatures(analyzeSaju(birth), { serviceKey: 'quit_fortune' }) as {
    calculation: { dayMasterStrength?: string; dayMasterForce?: string }
  }
  assert.equal(features.calculation.dayMasterStrength, undefined)
  assert.match(String(features.calculation.dayMasterForce), /힘/)
  const payload = JSON.parse(sectionPrompt(analyzeSaju(birth), birth, { serviceKey: 'quit_fortune' }, section)[1].content)
  assert.equal(payload.evidenceLayers.verifiedCalculations.calculation.dayMasterStrength, undefined)
  assert.match(payload.instruction, /분량 예산/)
})
