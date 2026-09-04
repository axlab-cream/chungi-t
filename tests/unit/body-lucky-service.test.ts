import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import {
  buildLuckyColorContext,
  buildLuckyColorReport,
  createLuckyColorReportId,
  LUCKY_COLOR_TOC,
  parseLuckyColorRequest,
} from '../../src/body/lucky-service.js'
import type { BirthInput } from '../../src/types/index.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

const birth: BirthInput = {
  year: 1993,
  month: 7,
  day: 14,
  hour: 9,
  minute: 0,
  gender: 'female',
  calendar: 'solar',
}

function buildReport(overrides: Partial<BirthInput> = {}) {
  const subject = { ...birth, ...overrides }
  const input = parseLuckyColorRequest({ displayName: '민서' })
  const context = buildLuckyColorContext('민서', input)
  const analysis = analyzeSaju(subject)
  return buildLuckyColorReport(analysis, subject, context, input, 'test-lucky')
}

test('나한테 운 붙는 색과 물건 covers the whole designed index', () => {
  const report = buildReport()
  const expectedItems = LUCKY_COLOR_TOC.reduce((total, group) => total + group.items.length, 0)

  assert.equal(LUCKY_COLOR_TOC.length, 6)
  assert.equal(expectedItems, 24)
  assert.equal(report.sections.length, expectedItems)
  assert.equal(new Set(report.sections.map((section) => section.category)).size, 6)

  // 05 목차와 06 상세는 디자인의 `?section=1-1` 아이디로 이동한다.
  const ids = report.sections.map((section) => section.id)
  assert.deepEqual(ids.slice(0, 4), ['1-1', '1-2', '1-3', '1-4'])
  assert.equal(new Set(ids).size, ids.length)
})

test('every reading is grounded and complete, never a pending stub', () => {
  const report = buildReport()

  for (const section of report.sections) {
    assert.equal(section.status, 'complete', `${section.id} 미완성`)
    // 06 상세는 문단 여섯 개를 여섯 블록에 나눠 넣는다.
    const paragraphs = section.interpretation.split('\n\n').filter(Boolean)
    assert.ok(paragraphs.length >= 6, `${section.id} 문단 ${paragraphs.length}개`)
    assert.ok(section.interpretation.includes(section.classification), `${section.id} 항목명 누락`)
  }
})

test('the reading reads this chart, not a generic one', () => {
  const spring = buildReport({ year: 1988, month: 2, day: 20 })
  const winter = buildReport({ year: 2001, month: 12, day: 3, gender: 'male' })

  assert.notEqual(spring.subtitle, winter.subtitle)
  assert.notEqual(spring.sections[0].interpretation, winter.sections[0].interpretation)
  // 오행 분포는 원국에서 계산된 값이라 사람마다 달라야 한다.
  assert.match(spring.sections[0].interpretation, /원국의 오행 분포는/)
})

test('the 4,900원 tier stays out of prediction and out of the shops', () => {
  const report = buildReport()
  const everything = report.sections.map((section) => section.interpretation).join('\n')

  for (const banned of ['무조건', '반드시', '100%', '확정', '액운이 막', '재물이 샌']) {
    assert.ok(!everything.includes(banned), `금지 표현 "${banned}" 노출`)
  }
  // 부적이 아니라는 선은 리포트 안에서 계속 지켜져야 한다.
  assert.ok(everything.includes('물건이 액운을 막거나 재물을 부르지는 않습니다'))
})

test('the reading cites this service\'s own corpus pack', () => {
  const report = buildReport()
  const pack = JSON.parse(readFileSync(join(ROOT, 'data/corpus/lucky-color-service.json'), 'utf-8'))
  const blocks: Array<{ interpretation?: string; advice?: string; opportunity?: string }> = pack.knowledgeBlocks

  // 팩의 어떤 문장이든 실제로 인용되는지 — 한 항목도 못 쓰면 폴백만 남는다.
  const quoted = report.sections.filter((section) => blocks.some((block) => {
    const candidates = [block.interpretation, block.advice, block.opportunity].filter(Boolean) as string[]
    return candidates.some((line) => section.interpretation.includes(line.slice(0, 24)))
  }))
  assert.ok(quoted.length >= report.sections.length / 2, `전용 팩 인용 ${quoted.length}/${report.sections.length}`)
})

test('the report id is stable per person and per service', () => {
  const input = parseLuckyColorRequest({ displayName: '민서' })
  const first = createLuckyColorReportId('owner-1', birth, input)
  const same = createLuckyColorReportId('owner-1', birth, input)
  const other = createLuckyColorReportId('owner-2', birth, input)

  assert.equal(first, same)
  assert.notEqual(first, other)
  assert.equal(first.length, 28)
})

test('the request carries nothing but an optional display name', () => {
  assert.deepEqual(parseLuckyColorRequest({}), {})
  assert.deepEqual(parseLuckyColorRequest({ displayName: '  민서  ' }), { displayName: '민서' })
  assert.deepEqual(parseLuckyColorRequest({ name: '민서' }), { displayName: '민서' })
  assert.deepEqual(parseLuckyColorRequest({ displayName: 42 as unknown as string }), {})
})
