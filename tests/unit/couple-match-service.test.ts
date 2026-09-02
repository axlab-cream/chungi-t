import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import {
  buildCoupleMatchContext,
  buildCoupleMatchReport,
  createCoupleMatchReportId,
  parseCoupleMatchRequest,
} from '../../src/match/couple-service.js'
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

test('couple match service builds a dedicated compatibility report', () => {
  const input = parseCoupleMatchRequest({
    partnerName: '김하나',
    partnerBirthText: '19940912',
    partnerBirth: {
      gender: 'female',
      calendar: 'solar',
    },
    relationshipStage: '연애 중',
    conflictPattern: '연락 속도와 빈도',
    concern: '좋아하는 마음은 큰데 같은 문제로 자꾸 다툽니다.',
  })
  const userAnalysis = analyzeSaju(userBirth)
  const partnerAnalysis = analyzeSaju(input.partnerBirth)
  const context = buildCoupleMatchContext('홍길동', input, partnerAnalysis)
  const reportId = createCoupleMatchReportId('user-1', userBirth, input)
  const report = buildCoupleMatchReport(userAnalysis, partnerAnalysis, userBirth, context, input, reportId)

  assert.equal(context.serviceKey, 'match_couple')
  assert.equal(report.reportId, reportId)
  assert.equal(report.title, '커플궁합 해석문')
  assert.equal(report.sections.length, 21)
  assert.deepEqual(Array.from(new Set(report.sections.map((section) => section.category))), [
    '처음엔 잘 맞는데, 왜 자꾸 엇갈리는가',
    '사랑의 속도가 다른 데는 이유가 있습니다',
    '일지는 숨겨 둔 연애 습관을 보여줍니다',
    '오래 가는 커플은 싸우는 법이 다릅니다',
    '우리 둘, 계속 가도 되는 관계인가',
  ])
  assert.match(report.sections[0].interpretation, /오행|일지|궁합|관계/)
  assert.match(report.sections[0].interpretation, /김하나/)
  assert.match(report.sections[0].interpretation, /연락 속도와 빈도/)
})

test('couple match request validates partner birth date', () => {
  assert.throws(() => parseCoupleMatchRequest({ partnerBirthText: '' }), /생년월일/)
  assert.throws(() => parseCoupleMatchRequest({ partnerBirthText: '1994091A' }), /8자리/)
  assert.throws(() => parseCoupleMatchRequest({ partnerBirthText: '19940230', partnerBirth: { gender: 'female', calendar: 'solar' } }), /날짜/)
  assert.throws(() => parseCoupleMatchRequest({ partnerBirthText: '18991231', partnerBirth: { gender: 'female', calendar: 'solar' } }), /연도/)
})
