import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import {
  buildMarryMatchContext,
  buildMarryMatchReport,
  createMarryMatchReportId,
  parseMarryMatchRequest,
} from '../../src/match/marry-service.js'
import type { BirthInput } from '../../src/types/index.js'

const userBirth: BirthInput = {
  year: 1992,
  month: 8,
  day: 20,
  hour: 12,
  minute: 0,
  gender: 'male',
  calendar: 'solar',
}

test('marry match service builds a dedicated marriage compatibility report', () => {
  const input = parseMarryMatchRequest({
    partnerName: '김하나',
    partnerBirthText: '19940912',
    partnerBirth: {
      gender: 'female',
      calendar: 'solar',
    },
    relationshipStage: '결혼 이야기 중',
    marriagePlan: '1년 안',
    concern: '가족과 현실 문제까지 괜찮을지 궁금합니다.',
  })
  const userAnalysis = analyzeSaju(userBirth)
  const partnerAnalysis = analyzeSaju(input.partnerBirth)
  const context = buildMarryMatchContext('홍길동', input, partnerAnalysis)
  const reportId = createMarryMatchReportId('user-1', userBirth, input)
  const report = buildMarryMatchReport(userAnalysis, partnerAnalysis, userBirth, context, input, reportId)

  assert.equal(report.reportId, reportId)
  assert.equal(report.title, '결혼궁합 해석문')
  assert.equal(report.sections.length, 21)
  assert.deepEqual(Array.from(new Set(report.sections.map((section) => section.category))), [
    '연애 말고, 결혼까지 갈 수 있는가',
    '두 사람의 배우자궁이 만나는 자리',
    '대운과 세운이 여는 결혼 타이밍',
    '돈, 가족, 책임에서 갈리는 궁합',
    '결혼을 밀어도 되는 관계인지',
  ])
  assert.match(report.sections[0].interpretation, /배우자궁|대운|합충|결혼/)
  assert.match(report.sections[0].interpretation, /김하나/)
})

test('marry match request validates partner birth date', () => {
  assert.throws(() => parseMarryMatchRequest({ partnerBirthText: '' }), /생년월일/)
  assert.throws(() => parseMarryMatchRequest({ partnerBirthText: '1994091A' }), /8자리/)
  assert.throws(() => parseMarryMatchRequest({ partnerBirthText: '19940230', partnerBirth: { gender: 'female', calendar: 'solar' } }), /날짜/)
  assert.throws(() => parseMarryMatchRequest({ partnerBirthText: '18991231', partnerBirth: { gender: 'female', calendar: 'solar' } }), /연도/)
})
