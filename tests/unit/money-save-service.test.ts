import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import {
  buildMoneySaveContext,
  buildMoneySaveReport,
  createMoneySaveReportId,
  parseMoneySaveRequest,
} from '../../src/money/save-service.js'
import type { BirthInput } from '../../src/types/index.js'

const birth: BirthInput = {
  year: 1992,
  month: 8,
  day: 20,
  hour: 12,
  minute: 0,
  gender: 'male',
  calendar: 'solar',
}

test('money save service builds a dedicated spending tendency report', () => {
  const input = parseMoneySaveRequest({
    moneyHabit: '월급날 이후 일주일에 많이 씁니다',
    incomePattern: '고정 월급',
    leakPoint: '모임과 선물',
    relationSpending: '거절이 어려운 편',
    savingGoal: '비상금',
    concern: '월말이면 돈이 남지 않습니다.',
  })
  const analysis = analyzeSaju(birth)
  const context = buildMoneySaveContext('홍길동', input)
  const reportId = createMoneySaveReportId('user-1', birth, input)
  const report = buildMoneySaveReport(analysis, birth, context, input, reportId)

  assert.equal(report.reportId, reportId)
  assert.equal(report.title, '소비성향 해석문')
  assert.equal(report.sections.length, 21)
  assert.deepEqual(Array.from(new Set(report.sections.map((section) => section.category))), [
    '돈은 들어오는데 왜 남지 않는가',
    '재성이 말하는 돈을 다루는 방식',
    '비겁이 만드는 비교와 관계 비용',
    '내 명식에 맞는 저축 루틴',
    '돈이 남는 사람으로 바꾸는 순서',
  ])
  assert.match(report.sections[0].interpretation, /재성|비겁|돈구멍|소비/)
  assert.match(report.sections[0].interpretation, /월급날/)
})

test('money save request requires money habit', () => {
  assert.throws(() => parseMoneySaveRequest({ moneyHabit: '' }), /돈 쓰는 습관/)
  assert.throws(() => parseMoneySaveRequest({ moneyHabit: '돈' }), /2자 이상/)
})
