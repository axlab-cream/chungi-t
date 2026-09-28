import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import {
  buildMoneySaveContext,
  buildMoneySaveReport,
  createMoneySaveReportId,
  MONEY_SAVE_TOC,
  moneySaveRequestFromContext,
  moneySaveTeaserSection,
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
  // 2026-09-17 목차 축소: 8대분류·41중분류 → 8대분류·16중분류(대분류당 2개).
  assert.equal(report.sections.length, 16)
  assert.deepEqual(Array.from(new Set(report.sections.map((section) => section.category))), [
    '돈이 들어오는 방식',
    '돈이 새는 패턴',
    '저축이 안 되는 이유',
    '사주 균형과 관리 방식',
    '오행 기반 돈관리 OS',
    '운의 타이밍',
    '관계/계약 돈문제',
    '확장 풀이',
  ])
  assert.match(report.sections[0].interpretation, /재성|비겁|돈구멍|소비/)
  assert.match(report.sections[0].interpretation, /월급날/)
  assert.equal(report.sections[0].id, 'income-salary-stable')
  assert.equal(report.sections.at(-1)!.id, 'expand-fengshui')

  // Each 대분류 opens on its own angle, so the 05 목차 never shows eight copies of one line.
  const firstOfEachGroup = MONEY_SAVE_TOC.map((group) => report.sections.find((section) => section.category === group.title)!)
  assert.equal(new Set(firstOfEachGroup.map((section) => section.interpretation.split('\n\n')[0])).size, 8)
  firstOfEachGroup.forEach((section, index) => assert.ok(section.patternKeys.includes(MONEY_SAVE_TOC[index].tag)))

  // Corpus scaffolding must never reach the page.
  report.sections.forEach((section) => assert.doesNotMatch(section.interpretation, /concept:|condition:|Feature JSON|출력하지|사용자/))
})

test('money save request requires money habit', () => {
  assert.throws(() => parseMoneySaveRequest({ moneyHabit: '' }), /돈 쓰는 습관/)
  assert.throws(() => parseMoneySaveRequest({ moneyHabit: '돈' }), /2자 이상/)
})

test('saved money teaser adds only entered facts, distinct images and computed five-element evidence', () => {
  const input = parseMoneySaveRequest({
    moneyHabit: '월급 뒤 쇼핑비가 커집니다',
    incomePattern: '고정 월급',
    leakPoint: '쇼핑과 취향',
    relationSpending: '친구 모임에서 먼저 결제',
    savingGoal: '매달 비상금',
    concern: '정산이 늦으면 계획이 흔들립니다.',
  })
  const analysis = analyzeSaju(birth)
  const context = buildMoneySaveContext('테스트', input)
  const report = buildMoneySaveReport(analysis, birth, context, input, 'money-teaser')
  const parsed = moneySaveRequestFromContext(context)
  const first = moneySaveTeaserSection(report.sections[0], 0, analysis, context)
  const second = moneySaveTeaserSection(report.sections[1], 1, analysis, context)

  assert.deepEqual(parsed, input)
  assert.notEqual(first.imageSrc, second.imageSrc)
  assert.match(first.imageSrc!, /01-stable-salary\.webp$/)
  assert.match(second.imageSrc!, /02-shared-income-spending\.webp$/)
  assert.match(first.storytelling!.tableMd!, /고정 월급/)
  assert.match(first.storytelling!.tableMd!, /쇼핑과 취향/)
  assert.match(first.storytelling!.tableMd!, /매달 비상금/)
  assert.doesNotMatch(first.storytelling!.tableMd!, /월 수입|지출 금액|만원/)
  assert.ok(first.interpretation.length > 900)
  assert.ok(second.interpretation.length > 800)
  assert.match(first.interpretation, /월급 뒤 쇼핑비가 커집니다/)
  assert.match(first.interpretation, /정산이 늦으면 계획이 흔들립니다/)
  assert.match(second.interpretation, /친구 모임에서 먼저 결제/)
  assert.doesNotMatch(`${first.interpretation}\n${second.interpretation}`, /기본 QA|가상 입력|샘플 데이터|작업실 예시|실제 회원의 결과가 아닙니다/)
  assert.doesNotMatch(`${first.interpretation}\n${second.interpretation}`, /[木火土金水]\)/)
  assert.deepEqual(second.storytelling!.chartPoints!.map((point) => point.value), [
    analysis.elementCount.wood,
    analysis.elementCount.fire,
    analysis.elementCount.earth,
    analysis.elementCount.metal,
    analysis.elementCount.water,
  ])
})
