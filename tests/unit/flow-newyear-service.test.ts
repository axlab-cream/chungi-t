import assert from 'node:assert/strict'
import test from 'node:test'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import {
  NEWYEAR_TARGET_YEAR,
  NEWYEAR_TOC,
  buildNewYearContext,
  buildNewYearFrame,
  buildNewYearReport,
  buildNewYearTeaser,
  parseNewYearRequest,
} from '../../src/flow/newyear-service.js'
import type { BirthInput } from '../../src/types/index.js'

/** as const 목차의 중분류를 한 줄로 펼친다. 대분류마다 튜플 타입이 달라 여기서 넓힌다. */
type TocItem = { id: string; title: string; note: string; why: string }
const allItems: TocItem[] = NEWYEAR_TOC.flatMap((group) => group.items as readonly TocItem[])

const BIRTH: BirthInput = {
  year: 1975, month: 9, day: 26, hour: 5, minute: 0,
  gender: 'male', calendar: 'solar', isLeapMonth: false,
}

test('신년운세 목차는 10 대분류 36 중분류를 유지한다', () => {
  assert.equal(NEWYEAR_TOC.length, 10)
  const items = allItems
  assert.equal(items.length, 36)
  // 05 목차와 06 상세가 이 id 로 라우팅하므로 중복이 있으면 상세가 엉뚱한 항목을 연다.
  assert.equal(new Set(items.map((item) => item.id)).size, 36)
  for (const group of NEWYEAR_TOC) {
    for (const item of group.items as readonly TocItem[]) {
      assert.match(item.id, new RegExp(`^${group.number}-\\d+$`))
    }
  }
})

test('2027년 뼈대는 절기와 육십갑자로 계산된다', () => {
  const frame = buildNewYearFrame(analyzeSaju(BIRTH))
  assert.equal(frame.year, NEWYEAR_TARGET_YEAR)
  // 2027년 입춘은 2월 4일이고, 세운은 육십갑자로 丁未다.
  assert.equal(frame.ipchun.getMonth() + 1, 2)
  assert.equal(frame.ipchun.getDate(), 4)
  assert.equal(frame.yearPillar, '丁未')
  // 乙 일간에 丁 은 목생화 같은 음간이라 식신, 작년 丙 은 양간이라 상관.
  assert.equal(frame.yearTenGod, '식신')
  assert.equal(frame.prevTenGod, '상관')
})

test('열두 달은 절기 경계로 끊기고 월간은 五虎遁을 따른다', () => {
  const frame = buildNewYearFrame(analyzeSaju(BIRTH))
  assert.equal(frame.months.length, 12)
  assert.equal(frame.months[0].termName, '입춘')
  // 丁壬년의 첫 달은 壬寅월이다.
  assert.equal(frame.months[0].pillar, '壬寅')
  // 지지는 寅부터 열두 개가 한 바퀴 돌고, 시작 날짜는 앞의 달보다 늦다.
  const branches = frame.months.map((m) => m.pillar.slice(-1))
  assert.equal(new Set(branches).size, 12)
  for (let i = 1; i < 11; i += 1) {
    assert.ok(frame.months[i].from.getTime() > frame.months[i - 1].from.getTime(), `${i}번째 달 경계가 역순`)
  }
})

test('대운 교차는 명식의 대운 목록에서만 읽는다', () => {
  const analysis = analyzeSaju(BIRTH)
  const frame = buildNewYearFrame(analysis)
  const crossing = (analysis.fortune?.daewoon ?? []).some((d) => d.startYear === NEWYEAR_TARGET_YEAR)
  assert.equal(frame.daewoonShift.happens, crossing)
  if (!crossing) assert.equal(frame.daewoonShift.startYear, null)
})

test('리포트는 중분류마다 섹션 하나를 채운다', () => {
  const analysis = analyzeSaju(BIRTH)
  const context = buildNewYearContext('정재용', {})
  const report = buildNewYearReport(analysis, BIRTH, context, {})
  assert.equal(report.sections.length, 36)
  assert.equal(report.generatedBy, 'template')
  const ids = report.sections.map((section) => section.id)
  assert.deepEqual(ids, allItems.map((item) => item.id))
  for (const section of report.sections) {
    assert.equal(section.status, 'complete')
    assert.ok(section.interpretation.length > 60, `${section.id} 해석이 너무 짧다`)
    assert.ok(section.category, `${section.id} 대분류 없음`)
    assert.ok(section.classification, `${section.id} 중분류 없음`)
    // 고객 문장에 내부 용어가 새지 않아야 한다.
    for (const banned of ['RAG', 'KMS', 'LLM', '코퍼스', '지식 블록', 'interpretation:']) {
      assert.ok(!section.interpretation.includes(banned), `${section.id} 에 ${banned} 노출`)
    }
  }
})

test('리포트는 겁주는 단정 표현을 쓰지 않는다', () => {
  const report = buildNewYearReport(analyzeSaju(BIRTH), BIRTH, buildNewYearContext('정재용', {}), {})
  const text = report.sections.map((s) => `${s.hook} ${s.interpretation}`).join(' ')
  for (const banned of ['무조건', '반드시', '100%', '망한다', '확정입니다']) {
    assert.ok(!text.includes(banned), `${banned} 가 문장에 있다`)
  }
})

test('무료 티저는 계산된 사실만 앞세우고 유료 범위를 숨기지 않는다', () => {
  const teaser = buildNewYearTeaser(analyzeSaju(BIRTH), buildNewYearContext('정재용', {}))
  assert.match(teaser.headline, /2027년/)
  assert.ok(teaser.lines.length >= 4)
  assert.ok(teaser.lines.some((line) => line.includes('입춘')))
  assert.ok(teaser.lines.some((line) => line.includes('丁未')))
  assert.equal(teaser.scope.length, 10)
  assert.equal(teaser.scope.reduce((n, group) => n + group.items.length, 0), 36)
})

test('요청은 표시 이름만 받고 길이를 자른다', () => {
  assert.deepEqual(parseNewYearRequest({}), {})
  assert.deepEqual(parseNewYearRequest({ displayName: '  정재용  ' }), { displayName: '정재용' })
  assert.deepEqual(parseNewYearRequest({ name: '홍길동' }), { displayName: '홍길동' })
  const long = parseNewYearRequest({ displayName: '가'.repeat(40) })
  assert.equal(long.displayName?.length, 20)
})
