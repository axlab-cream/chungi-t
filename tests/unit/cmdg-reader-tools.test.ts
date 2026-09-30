import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildReaderQuestionPrompt, parseReaderAnswer, buildPartnerSketchPrompt, validateReaderQuestion } from '../../src/report/cmdg-reader-tools.js'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import type { ReportRecord } from '../../src/report/report-store.js'

const birth = { year: 1994, month: 3, day: 11, hour: 9, gender: 'female' as const, calendar: 'solar' as const }
const record = { reportId: 'test', birth, analysis: analyzeSaju(birth), context: { serviceKey: 'saju_master', name: '개인실명', concern: '회사기밀' }, report: { sections: [{ id: 'destiny-partner', classification: '편안한 관계', interpretation: '대화를 편하게 주고받는 관계', status: 'complete' }] } } as ReportRecord
test('장별 추가 질문은 실제 계산과 해당 질문·회원 생활 정보에 연결된다', () => {
  const messages = buildReaderQuestionPrompt(record, record.report.sections[0], '답장이 늦으면 불안해요', { relationship: '주말에 만나요', work: '일과 무관' })
  const data = JSON.parse(messages[1].content)
  assert.equal(data.question, '답장이 늦으면 불안해요')
  assert.equal(data.lifeContext.relationship, '주말에 만나요')
  assert.equal(data.lifeContext.work, undefined)
  assert.ok(data.calculations.calculation.pillars.day)
  assert.match(messages[0].content, /네 단계/)
})
test('빈 질문과 긴 질문, 불완전 답변은 거부한다', () => {
  assert.throws(() => validateReaderQuestion('   '))
  assert.throws(() => validateReaderQuestion('가'.repeat(801)))
  assert.throws(() => parseReaderAnswer('{"answer":"답만 있음"}'))
  const answer = parseReaderAnswer(JSON.stringify({ answer: '핵심 답입니다.', basis: '개인 근거입니다.', turn: '달라지는 조건입니다.', action: '오늘 확인할 일입니다.', question: '어떤 약속이 바뀌었나요?' }))
  assert.equal(answer.question, '어떤 약속이 바뀌었나요?')
})
test('스케치는 개인 계산 분위기만 전달하며 실명·생년 원문·고민과 회사는 보내지 않는다', () => {
  const prompt = buildPartnerSketchPrompt(record, 'neutral')
  assert.doesNotMatch(prompt, /개인실명|회사기밀|1994|1994-03/)
  assert.match(prompt, /fictional adult/)
  assert.match(prompt, /not a prediction/)
  assert.throws(() => buildPartnerSketchPrompt({ ...record, context: { serviceKey: 'work_move' } }, 'neutral'))
})
