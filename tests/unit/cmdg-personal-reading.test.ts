import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import { sectionPrompt } from '../../src/report/report-generator.js'
import type { BirthInput, SajuReportSection } from '../../src/types/index.js'
import { reviewCmdgStoryStructure, CMDG_CHAPTER_QUESTIONS } from '../../src/report/cmdg-reading-contract.js'
import { buildTemplateSajuReport } from '../../src/report/report-generator.js'
import { isBlockingIssue } from '../../src/report/tone-v2-review.js'

const birth: BirthInput = { year: 1994, month: 3, day: 11, hour: 9, gender: 'female', calendar: 'solar' }
const section: SajuReportSection = { id: 'love-loop', order: 10, category: '연애', categoryEn: 'Love', classification: '나에게 편안한 관계', hook: '', interpretation: '', imageKey: '', imageSrc: '', imageAlt: '', ragTopics: [], patternKeys: [] }
test('천명사주 연애 장은 이직 고정 판정을 강제받지 않고 자신의 질문과 계산으로 쓴다', () => {
  const messages = sectionPrompt(analyzeSaju(birth), birth, { serviceKey: 'saju_master', concern: '이직 고민' }, section, [], undefined, { statement: '이직 보류', rankedChoices: ['HOLD'], decidedAt: '' })
  const payload = JSON.parse(messages[1].content)
  assert.equal(payload.evidenceLayers.fixedVerdict, undefined)
  assert.match(payload.instruction, /현재 장의 질문/)
  assert.match(payload.instruction, /단순 개수.*가중/)
  assert.match(payload.instruction, /밑줄/)
  assert.ok(payload.evidenceLayers.verifiedCalculations.calculation.pillars.day)
  assert.equal(payload.evidenceLayers.userFacts.context.concern, undefined)
})
test('네 단계는 모든 회원에게 동일한 순서를 적용하고 누락·중복은 잡는다', () => {
  const text = ['지금의 답', '내 사주에서 읽히는 이유', '달라지는 조건', '내가 할 일'].map(title => '### ' + title + '\n개인의 실제 근거와 질문에 따른 본문입니다.').join('\n\n')
  assert.deepEqual(reviewCmdgStoryStructure(text), [])
  assert.equal(reviewCmdgStoryStructure(text.replace('### 내가 할 일', '### 지금의 답')).length, 1)
  assert.equal(reviewCmdgStoryStructure('같은 행동 조언만 반복').length, 1)
  assert.equal(isBlockingIssue(reviewCmdgStoryStructure('같은 행동 조언만 반복')[0]), true)
})

test('실제 천명사주 목차마다 서로 다른 고민과 풀이 범위를 지정한다', () => {
  const sections = buildTemplateSajuReport(analyzeSaju(birth), birth, { serviceKey: 'saju_master' }).sections
  const questions = sections.map(item => CMDG_CHAPTER_QUESTIONS[item.id])
  assert.ok(questions.every(Boolean))
  assert.equal(new Set(questions).size, sections.length)
})
