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
  const midnight = calculateZiwei({ ...birth, hour: 23, dayBoundaryRule: 'midnight' })
  const next = calculateZiwei({ ...birth, hour: 23, dayBoundaryRule: 'zi_hour_next_day' })
  assert.notDeepEqual(midnight, next)
  assert.equal(astro.getConfig().dayDivide, before)
})
test('음력 입력은 기존 만세력과 같은 양력 변환을 사용한다', () => {
  assert.deepEqual(calculateZiwei(birth), calculateZiwei({ ...birth, month: 7, day: 17, calendar: 'lunar' }))
})
