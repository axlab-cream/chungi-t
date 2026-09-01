import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import {
  buildLoveAgainContext,
  buildLoveAgainReport,
  createLoveAgainReportId,
  parseLoveAgainRequest,
} from '../../src/love/again-service.js'
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

test('love again service builds a reunion report without partner birth', () => {
  const input = parseLoveAgainRequest({
    relationshipStage: '가끔 연락함',
    breakupReason: '연락과 표현 차이',
    currentSignal: '가끔 안부가 와요',
    breakupPeriod: '1~3개월',
    concern: '다시 연락해도 같은 이유로 멀어질까 봐 걱정돼요.',
  })
  const analysis = analyzeSaju(userBirth)
  const context = buildLoveAgainContext('홍길동', input)
  const reportId = createLoveAgainReportId('user-1', userBirth, input)
  const report = buildLoveAgainReport(analysis, userBirth, context, input, undefined, reportId)

  assert.equal(context.serviceKey, 'love_again')
  assert.equal(context.partner?.mode, 'none')
  assert.equal(report.reportId, reportId)
  assert.equal(report.title, '재회운 해석문')
  assert.equal(report.sections.length, 21)
  assert.deepEqual(Array.from(new Set(report.sections.map((section) => section.category))), [
    '이별 뒤에 남은 마음은 같은 모양이 아닙니다',
    '재회 가능성은 그리움보다 흐름으로 확인합니다',
    '세운의 변곡점은 연락의 속도를 바꿉니다',
    '다시 만난다면 먼저 바뀌어야 할 것이 있습니다',
    '재회 뒤의 선택이 관계의 결말을 만듭니다',
  ])
  assert.match(report.sections[0].interpretation, /재회|이별|관계|연락/)
  assert.match(report.sections[0].interpretation, /단정하지 않거나|확인할 기준/)
})

test('love again service uses optional partner birth for compatibility context', () => {
  const input = parseLoveAgainRequest({
    partnerName: '김하나',
    partnerBirthText: '19940912',
    partnerBirth: { gender: 'female', calendar: 'solar' },
    relationshipStage: '다시 만날지 고민 중',
    breakupReason: '반복되는 다툼',
    currentSignal: '다시 만나자는 말이 있어요',
    breakupPeriod: '3~6개월',
  })
  const analysis = analyzeSaju(userBirth)
  const partnerAnalysis = analyzeSaju(input.partnerBirth!)
  const context = buildLoveAgainContext('홍길동', input, partnerAnalysis)
  const report = buildLoveAgainReport(analysis, userBirth, context, input, partnerAnalysis)

  assert.equal(input.partnerBirth?.year, 1994)
  assert.equal(context.partner?.mode, 'known')
  assert.match(report.sections[0].interpretation, /김하나/)
  assert.match(report.sections[0].interpretation, /일지/)
})

test('love again request validates required reunion signals and optional date', () => {
  assert.throws(() => parseLoveAgainRequest({ breakupReason: '이별' }), /현재 관계/)
  assert.throws(() => parseLoveAgainRequest({ relationshipStage: '썸', breakupReason: '이별', currentSignal: '신호', breakupPeriod: '기간', partnerBirthText: '19940230', partnerBirth: { gender: 'female', calendar: 'solar' } }), /날짜/)
  assert.throws(() => parseLoveAgainRequest({ relationshipStage: '썸', breakupReason: '이별', currentSignal: '신호', breakupPeriod: '기간', partnerBirthText: '1994091A', partnerBirth: { gender: 'female', calendar: 'solar' } }), /8자리/)
})
