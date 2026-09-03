import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import {
  buildMarryMatchContext,
  buildMarryMatchReport,
  createMarryMatchReportId,
  MARRY_MATCH_TOC,
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
  assert.equal(report.sections.length, 70)
  assert.deepEqual(Array.from(new Set(report.sections.map((section) => section.category))), [
    '내 연애 기본값',
    '상대 연애 캐릭터',
    '둘의 케미 궁합',
    '연애 말고 결혼각',
    '결혼 타이밍 운',
    '레드플래그 체크',
    '현실 동거·결혼 생활 시뮬레이션',
    '관계 회복과 마음 돌봄',
    '오늘 바로 써먹는 액션',
    '한눈에 보는 결과 라벨',
  ])
  assert.match(report.sections[0].interpretation, /배우자궁|대운|합충|결혼/)
  assert.match(report.sections[0].interpretation, /김하나/)
  assert.equal(report.sections[0].id, 'marry-01-01')
  assert.equal(report.sections.at(-1)!.id, 'marry-10-08')

  // Each 대분류 carries its own artwork and its own reading angle, so the 05 list and
  // the 06 detail never show ten copies of the same card or the same opening sentence.
  const firstOfEachGroup = MARRY_MATCH_TOC.map((group) => report.sections.find((section) => section.category === group.title)!)
  assert.equal(new Set(firstOfEachGroup.map((section) => section.imageSrc)).size, 10)
  assert.equal(new Set(firstOfEachGroup.map((section) => section.interpretation.split('\n\n')[0])).size, 10)
  firstOfEachGroup.forEach((section, index) => {
    assert.equal(section.imageSrc, `/match/marry/assets/marry/05-marry-section-${String(index + 1).padStart(2, '0')}.webp`)
    assert.ok(section.patternKeys.includes(MARRY_MATCH_TOC[index].tag))
  })
})

test('marry match request validates partner birth date', () => {
  assert.throws(() => parseMarryMatchRequest({ partnerBirthText: '' }), /생년월일/)
  assert.throws(() => parseMarryMatchRequest({ partnerBirthText: '1994091A' }), /8자리/)
  assert.throws(() => parseMarryMatchRequest({ partnerBirthText: '19940230', partnerBirth: { gender: 'female', calendar: 'solar' } }), /날짜/)
  assert.throws(() => parseMarryMatchRequest({ partnerBirthText: '18991231', partnerBirth: { gender: 'female', calendar: 'solar' } }), /연도/)
})
