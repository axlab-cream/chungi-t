import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calculateZiwei, ziweiSection } from '../../src/saju/ziwei.js'
import { astro } from 'iztro'
const birth = { year: 2000, month: 8, day: 16, hour: 3, gender: 'female' as const, calendar: 'solar' as const }
test('자미두수 공식 예시와 동일한 열두 궁·주성, 다른 시간은 다른 명반', () => {
  const actual = calculateZiwei(birth)
  assert.equal(actual.available, true)
  if (!actual.available) return
  const expected = astro.bySolar('2000-8-16', 2, 'female', true, 'ko-KR')
  assert.equal(actual.palaces.length, 12)
  assert.deepEqual(actual.palaces.map(p => p.stars.map(s => s.name)), expected.palaces.map(p => p.majorStars.map(s => s.name)))
  assert.notDeepEqual(actual, calculateZiwei({ ...birth, hour: 13 }))
  assert.ok(actual.palaces.some(p => p.body))
  assert.doesNotMatch(JSON.stringify(actual.palaces), /[\u4e00-\u9fff]/)
})
test('시간 미상은 명반을 만들지 않고, 날짜 경계 설정은 요청 뒤 복구된다', () => {
  assert.equal(calculateZiwei(birth, false).available, false)
  assert.equal(ziweiSection(birth, false), undefined)
  const before = astro.getConfig().dayDivide
  // 지금 규칙은 사주 시각(시계 -30분)으로 보므로 사주 시각 23시대가 되도록 23:40을 쓴다.
  const midnight = calculateZiwei({ ...birth, hour: 23, minute: 40, dayBoundaryRule: 'midnight' })
  const next = calculateZiwei({ ...birth, hour: 23, minute: 40, dayBoundaryRule: 'zi_hour_next_day' })
  assert.notDeepEqual(midnight, next)
  assert.equal(astro.getConfig().dayDivide, before)
})
test('음력 입력은 기존 만세력과 같은 양력 변환을 사용한다', () => {
  assert.deepEqual(calculateZiwei(birth), calculateZiwei({ ...birth, month: 7, day: 17, calendar: 'lunar' }))
})
// 2026-10-16 결정: 한국에서 태어난 사람은 한국 음력(KASI)으로 명반을 만든다(analysis/ziwei-lunar-calendar-research.md).
const ziweiConfig = { algorithm: 'default', yearDivide: 'normal', horoscopeDivide: 'normal', ageDivide: 'normal', dayDivide: 'current' } as const
const majorStars = (chart: { palaces: Array<{ majorStars: Array<{ name: string }> }> }) => chart.palaces.map(p => p.majorStars.map(s => s.name))
test('한국 출생: 한중 음력이 다른 날은 한국 음력 날짜로 명반을 만든다', () => {
  // 1995-07-28 은 한국 음력 7월 1일, 중국 음력 7월 2일. 중국 음력 7월 1일은 양력 7월 27일이다.
  const korean = calculateZiwei({ year: 1995, month: 7, day: 28, hour: 12, minute: 40, gender: 'female', calendar: 'solar' })
  assert.equal(korean.available, true)
  if (!korean.available) return
  assert.match(korean.convention, /한국 음력/)
  const lunarJuly1 = astro.withOptions({ type: 'solar', dateStr: '1995-7-27', timeIndex: 6, gender: 'female', fixLeap: true, language: 'ko-KR', config: ziweiConfig })
  const chineseJuly2 = astro.withOptions({ type: 'solar', dateStr: '1995-7-28', timeIndex: 6, gender: 'female', fixLeap: true, language: 'ko-KR', config: ziweiConfig })
  assert.deepEqual(korean.palaces.map(p => p.stars.map(s => s.name)), majorStars(lunarJuly1))
  assert.notDeepEqual(majorStars(lunarJuly1), majorStars(chineseJuly2))
})
test('다른 나라 출생은 중국 음력 그대로다', () => {
  const abroad = calculateZiwei({ year: 1995, month: 7, day: 28, hour: 12, minute: 40, gender: 'female', calendar: 'solar', birthTimeZone: 'America/New_York' })
  assert.equal(abroad.available, true)
  if (!abroad.available) return
  assert.match(abroad.convention, /중국 음력/)
  const chineseJuly2 = astro.withOptions({ type: 'solar', dateStr: '1995-7-28', timeIndex: 6, gender: 'female', fixLeap: true, language: 'ko-KR', config: ziweiConfig })
  assert.deepEqual(abroad.palaces.map(p => p.stars.map(s => s.name)), majorStars(chineseJuly2))
})
test('한국 음력 30일인데 중국 음력은 29일까지인 날(1988년 설날 등)은 중국 음력 그대로 둔다', () => {
  // 1988-02-17: 한국 음력 1987-12-30 / 중국 음력 1988-01-01. 도구가 한국 음력 30일을 받지 않는다.
  const chart = calculateZiwei({ year: 1988, month: 2, day: 17, hour: 12, minute: 40, gender: 'female', calendar: 'solar' })
  assert.equal(chart.available, true)
  if (!chart.available) return
  assert.match(chart.convention, /중국 음력/)
  const chinese = astro.withOptions({ type: 'solar', dateStr: '1988-2-17', timeIndex: 6, gender: 'female', fixLeap: true, language: 'ko-KR', config: ziweiConfig })
  assert.deepEqual(chart.palaces.map(p => p.stars.map(s => s.name)), majorStars(chinese))
})
// 명반 전체(궁 위치·신궁·주성·사화·오행국)를 비교한다. 주성 이름만 보면 다른 값이 틀려도 통과하므로.
const fullFromOurs = (chart: ReturnType<typeof calculateZiwei>) => {
  assert.equal(chart.available, true)
  if (!chart.available) return ''
  return JSON.stringify({ five: chart.fiveElementsClass, palaces: chart.palaces.map(p => [p.name, p.branch, p.body, p.stars.map(s => [s.name, s.brightness, s.change]), p.transformations.map(t => [t.star, t.meaning])]) })
}
const solarFull = (dateStr: string, timeIndex: number) => {
  const c = astro.withOptions({ type: 'solar', dateStr, timeIndex, gender: 'female', fixLeap: true, language: 'ko-KR', config: ziweiConfig })
  const meaning: Record<string, string> = { 록: '도움이나 보상을 얻는 데 눈길이 갑니다.', 권: '스스로 결정하고 책임지려는 마음이 커집니다.', 과: '실력을 인정받고 믿음을 쌓는 일이 중요해집니다.', 기: '마음이 오래 쓰이거나 부담을 느끼는 부분을 돌아봅니다.' }
  return JSON.stringify({ five: c.fiveElementsClass, palaces: c.palaces.map(p => [p.name, p.earthlyBranch, p.isBodyPalace, p.majorStars.map(s => [s.name, s.brightness || '', meaning[s.mutagen || ''] || '']), [...p.majorStars, ...p.minorStars].filter(s => s.mutagen).map(s => [s.name, meaning[s.mutagen!] || s.mutagen])]) })
}
const at = (year: number, month: number, day: number, extra: Record<string, unknown> = {}) => calculateZiwei({ year, month, day, hour: 12, minute: 40, gender: 'female', calendar: 'solar', ...extra })

test('한중 음력이 같은 날은 평달·윤달 모두 예전 명반과 전부 같고, 서울을 직접 적어도 같다', () => {
  // 2020 은 한국·중국 모두 윤4월. 2020-06-01 은 윤4월 10일.
  for (const [y, m, d] of [[2000, 8, 16], [2020, 6, 1], [1984, 2, 2]] as const) {
    assert.equal(fullFromOurs(at(y, m, d)), solarFull(`${y}-${m}-${d}`, 6))
    assert.equal(fullFromOurs(at(y, m, d, { birthTimeZone: 'Asia/Seoul' })), fullFromOurs(at(y, m, d)))
  }
})
test('한중 윤달 위치가 다른 해(2012 한국 윤3월·중국 윤4월)는 중국 음력 그대로 둔다', () => {
  // 2012-04-21: 한국 윤3월 1일 / 중국 4월 1일. 중국 음력에는 윤3월이 없다.
  const chart = at(2012, 4, 21)
  assert.equal(chart.available, true)
  if (!chart.available) return
  assert.match(chart.convention, /중국 음력/)
  assert.equal(fullFromOurs(chart), solarFull('2012-4-21', 6))
})
test('한국 음력으로 바뀌는 날은 명반 전체가 그 한국 음력 날짜의 명반과 같다', () => {
  assert.equal(fullFromOurs(at(1995, 7, 28)), solarFull('1995-7-27', 6))
})
test('밤 11시대 월말 출생: 다음 날 자시 규칙과 자정 규칙을 각각 따른다', () => {
  // 1995-07-27 23:40(사주 시각 23시대). 다음 날로 보면 7-28 = 한국 음력 7월 1일 → 중국 음력 7월 1일인 7-27 의 자시.
  const nextDay = calculateZiwei({ year: 1995, month: 7, day: 27, hour: 23, minute: 40, gender: 'female', calendar: 'solar', dayBoundaryRule: 'zi_hour_next_day' })
  assert.equal(fullFromOurs(nextDay), solarFull('1995-7-27', 0))
  // 자정 규칙이면 그날(7-27 = 한국 음력 6월 30일, 중국은 6월이 29일까지)이라 중국 음력 그대로 늦은 자시.
  const midnight = calculateZiwei({ year: 1995, month: 7, day: 27, hour: 23, minute: 40, gender: 'female', calendar: 'solar', dayBoundaryRule: 'midnight' })
  assert.equal(fullFromOurs(midnight), solarFull('1995-7-27', 12))
})
