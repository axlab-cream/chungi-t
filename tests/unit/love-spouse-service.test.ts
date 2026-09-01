import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import {
  buildLoveSpouseContext,
  buildLoveSpouseReport,
  createLoveSpouseReportId,
  parseLoveSpouseRequest,
  spouseStar,
} from '../../src/love/spouse-service.js'
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

test('love spouse service builds a 21-section marriage partner report', () => {
  const input = parseLoveSpouseRequest({
    relationshipStatus: '싱글이에요',
    marriagePriority: '생활과 책임감',
    meetingRoute: '소개와 지인 모임',
    concern: '좋은 사람을 만나도 결혼으로 이어질지 모르겠어요.',
  })
  const analysis = analyzeSaju(userBirth)
  const context = buildLoveSpouseContext('홍길동', input)
  const reportId = createLoveSpouseReportId('user-1', userBirth, input)
  const report = buildLoveSpouseReport(analysis, userBirth, context, input, reportId)

  assert.equal(context.serviceKey, 'love_spouse')
  assert.equal(context.orientation, '배우자궁 + 자미두수')
  assert.equal(report.reportId, reportId)
  assert.equal(report.title, '배우자운 해석문')
  assert.equal(report.sections.length, 21)
  assert.deepEqual(Array.from(new Set(report.sections.map((section) => section.category))), [
    '배우자궁이 보여주는 인연의 결',
    '배우자의 성향과 현실 모습',
    '인연이 들어오는 경로',
    '자미두수 관점의 관계 흐름',
    '결혼으로 이어지는 선택',
  ])
  assert.match(report.sections[0].interpretation, /배우자궁|배우자성|자미두수/)
  assert.match(report.sections[0].interpretation, /특정 인물|결혼 날짜|단정하지 않/)
})

test('love spouse service applies gender-specific spouse star wording', () => {
  const femaleBirth: BirthInput = { ...userBirth, gender: 'female' }
  const input = parseLoveSpouseRequest({
    relationshipStatus: '결혼을 고민 중이에요',
    marriagePriority: '대화와 갈등 회복',
    meetingRoute: '일과 프로젝트',
  })
  const femaleAnalysis = analyzeSaju(femaleBirth)
  const femaleReport = buildLoveSpouseReport(femaleAnalysis, femaleBirth, buildLoveSpouseContext('김하나', input), input)

  assert.equal(spouseStar(userBirth.gender), '재성')
  assert.equal(spouseStar(femaleBirth.gender), '관성')
  assert.match(femaleReport.sections[0].interpretation, /관성/)
  assert.match(femaleReport.subtitle, /김하나/)
})

test('love spouse request validates relationship choices', () => {
  assert.throws(() => parseLoveSpouseRequest({ marriagePriority: '생활과 책임감', meetingRoute: '소개' }), /현재 관계/)
  assert.throws(() => parseLoveSpouseRequest({ relationshipStatus: '싱글', meetingRoute: '소개' }), /결혼에서 중요한 기준/)
  assert.throws(() => parseLoveSpouseRequest({ relationshipStatus: '싱글', marriagePriority: '생활', meetingRoute: '' }), /인연을 만나는 경로/)
})
