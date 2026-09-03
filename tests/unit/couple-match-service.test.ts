import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import {
  buildCoupleMatchContext,
  buildCoupleMatchReport,
  createCoupleMatchReportId,
  COUPLE_MATCH_TOC,
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
  assert.equal(report.sections.length, 70)
  assert.deepEqual(Array.from(new Set(report.sections.map((section) => section.category))), [
    '관계 총평',
    '띠/지지 궁합',
    '오행 케미',
    '일간 성향 싱크',
    '십성 관계 코드',
    '소통 궁합',
    '끌림/호감 포인트',
    '갈등 리포트',
    '연애 단계별 풀이',
    '현실 궁합',
    '운 흐름 궁합',
    '마음 돌봄',
    '결과 패키징',
    '오늘의 관계 액션',
  ])
  assert.match(report.sections[0].interpretation, /오행|일지|궁합|관계/)
  assert.match(report.sections[0].interpretation, /김하나/)
  assert.match(report.sections[0].interpretation, /연락 속도와 빈도/)

  // 05 목차 and 06 상세 route on the design's own section ids.
  assert.equal(report.sections[0].id, 'relationship_overview__chemistry_one_line')
  COUPLE_MATCH_TOC.forEach((group) => {
    const owned = report.sections.filter((section) => group.items.some((item) => item.id === section.id))
    assert.equal(owned.length, 5, `${group.id} 는 다섯 개의 중분류를 가져야 합니다`)
    const bodies = owned.map((section) => section.interpretation.split('\n\n')[1])
    assert.equal(new Set(bodies).size, 5, `${group.id} 의 다섯 항목은 서로 다르게 읽혀야 합니다`)
  })

  // Corpus scaffolding must never reach the page.
  report.sections.forEach((section) => {
    assert.doesNotMatch(section.interpretation, /concept:|condition:|Feature JSON|출력하지|사용자/)
  })
})

test('couple match request validates partner birth date', () => {
  assert.throws(() => parseCoupleMatchRequest({ partnerBirthText: '' }), /생년월일/)
  assert.throws(() => parseCoupleMatchRequest({ partnerBirthText: '1994091A' }), /8자리/)
  assert.throws(() => parseCoupleMatchRequest({ partnerBirthText: '19940230', partnerBirth: { gender: 'female', calendar: 'solar' } }), /날짜/)
  assert.throws(() => parseCoupleMatchRequest({ partnerBirthText: '18991231', partnerBirth: { gender: 'female', calendar: 'solar' } }), /연도/)
})
