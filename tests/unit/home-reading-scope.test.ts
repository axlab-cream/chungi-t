import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { reviewInterpretation } from '../../src/report/interpretation-validation.js'
import type { SajuReportSection } from '../../src/types/index.js'

test('home writing guide separates all twelve questions and labels examples', () => {
  const guide = readFileSync('prompts/services/home_fit.md', 'utf8')
  for (const id of ['home-fit-overall','terrain-support','external-flow','light-air-noise','building-unit','entrance-flow','sleep-recovery','remote-focus','money-living','relationship-cohabitation','saju-house-ohaeng','reality-action']) assert.ok(guide.includes(id))
  assert.match(guide, /설명용 예시/)
  assert.match(guide, /억지 칭찬/)
})
test('home review catches repeated long sentences across differently grouped paragraphs', () => {
  const first = '집에 들어온 뒤 가방과 외투를 어디에 놓는지 살펴보고 동선을 막는 물건이 있다면 먼저 편한 자리로 옮겨 보세요.'
  const second = '책상 위에 물건을 많이 두는 편이라면 지금 하는 일에 필요한 것만 남기는 방법이 편한지 직접 확인해 보세요.'
  const siblings = [{ interpretation: first + '\n\n' + second }] as SajuReportSection[]
  const review = reviewInterpretation(first + ' ' + second, { serviceKey: 'home_fit' }, siblings)
  assert.ok(review.issues.some(issue => issue.includes('긴 문장 2개')))
})
