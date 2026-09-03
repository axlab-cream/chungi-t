import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import {
  buildLoveMindContext,
  buildLoveMindReport,
  createLoveMindReportId,
  parseLoveMindRequest,
} from '../../src/love/mind-service.js'
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

test('love mind service builds a relationship-flow report without partner birth', () => {
  const input = parseLoveMindRequest({
    relationshipStage: '호감은 있지만 애매함',
    contactPattern: '답장은 오지만 먼저 오지 않아요',
    recentSignal: '읽고 답이 늦어요',
    concern: '연락은 오는데 마음이 있는지 모르겠어요.',
  })
  const analysis = analyzeSaju(userBirth)
  const context = buildLoveMindContext('홍길동', input)
  const reportId = createLoveMindReportId('user-1', userBirth, input)
  const report = buildLoveMindReport(analysis, userBirth, context, input, undefined, reportId)

  assert.equal(context.serviceKey, 'love_mind')
  assert.equal(context.partner?.mode, 'none')
  assert.equal(report.reportId, reportId)
  assert.equal(report.title, '상대방 마음 해석문')
  assert.equal(report.sections.length, 21)
  assert.deepEqual(Array.from(new Set(report.sections.map((section) => section.category))), [
    '마음이 남아 있는 신호는 따로 있습니다',
    '연락과 거리에는 각자의 속도가 있습니다',
    '두 사람의 궁합은 잘 맞는 곳부터 드러납니다',
    '지금 관계의 변곡점에서 신호를 확인합니다',
    '마음은 추측보다 상대의 반응으로 확인합니다',
  ])
  assert.match(report.sections[0].interpretation, /상대|관계|연락|마음/)
  assert.match(report.sections[0].interpretation, /속마음을 단정하지 않거나|확인할 기준/)
})

test('love mind service uses optional partner birth when provided', () => {
  const input = parseLoveMindRequest({
    partnerName: '김하나',
    partnerBirthText: '19940912',
    partnerBirth: { gender: 'female', calendar: 'solar' },
    relationshipStage: '연애 중',
    contactPattern: '최근 연락이 줄었어요',
    recentSignal: '만나자는 말은 있어요',
  })
  const analysis = analyzeSaju(userBirth)
  const partnerAnalysis = analyzeSaju(input.partnerBirth!)
  const context = buildLoveMindContext('홍길동', input, partnerAnalysis)
  const report = buildLoveMindReport(analysis, userBirth, context, input, partnerAnalysis)

  assert.equal(input.partnerBirth?.year, 1994)
  assert.equal(context.partner?.mode, 'known')
  assert.match(report.sections[0].interpretation, /김하나/)
  assert.match(report.sections[0].interpretation, /일지/)
})

test('love mind request validates required relationship signals and optional date', () => {
  assert.throws(() => parseLoveMindRequest({ contactPattern: '연락' }), /현재 관계/)
  assert.throws(() => parseLoveMindRequest({ relationshipStage: '썸', contactPattern: '연락', recentSignal: '신호', partnerBirthText: '19940230', partnerBirth: { gender: 'female', calendar: 'solar' } }), /날짜/)
  assert.throws(() => parseLoveMindRequest({ relationshipStage: '썸', contactPattern: '연락', recentSignal: '신호', partnerBirthText: '1994091A', partnerBirth: { gender: 'female', calendar: 'solar' } }), /8자리/)
})
