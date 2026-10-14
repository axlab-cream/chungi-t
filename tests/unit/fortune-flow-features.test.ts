import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import { groundedReportFeatures } from '../../src/report/report-generator.js'

/**
 * 1단계: 계산은 이미 했는데 AI 에 지금 대운·올해 세운만 넘기던 것을 대운 전 구간과 10년 세운으로 넘긴다.
 * 참고 PDF의 "49세(2036) 신해 대운", "2029년 역전의 해" 같은 서술을 우리 계산값으로 받치기 위함이다.
 */
const birth = { year: 1987, month: 6, day: 10, hour: 20, minute: 0, calendar: 'solar', gender: 'female' } as const
type Timing = { daewoonList: Array<{ pillar: string; ageStart?: number; startYear?: number; approxAgeStart?: number }>; yearlyFlow: Array<{ year: number; pillar: string; age: number }> }
const timingOf = (hour: number, known = true) =>
  (groundedReportFeatures(analyzeSaju({ ...birth, hour }), { serviceKey: 'saju_master', birthTimeKnown: known }) as { timing: Timing }).timing

describe('AI 재료의 운 흐름', () => {
  it('대운 10구간 전부와 올해부터 10년 세운을 넘긴다', () => {
    const timing = timingOf(20)
    assert.equal(timing.daewoonList.length, 10)
    assert.deepEqual(timing.daewoonList[4], { age: '49~58세', pillar: '辛亥', ageStart: 49, startYear: 2036 })
    assert.equal(timing.yearlyFlow.length, 10)
    const currentYear = new Date().getFullYear()
    assert.equal(timing.yearlyFlow[0].year, currentYear)
    const byYear = new Map(timing.yearlyFlow.map((item) => [item.year, item.pillar]))
    // 연도 간지는 (연도 - 4) 의 60갑자 위치와 같다. 참고 PDF가 틀렸던 2035 을묘를 확인한다.
    if (byYear.has(2035)) assert.equal(byYear.get(2035), '乙卯')
    if (byYear.has(2026)) assert.equal(byYear.get(2026), '丙午')
  })

  it('시간을 몰라도 대운 간지 순서와 세운은 넘기고, 시작 나이는 근사값으로 표시한다', () => {
    const timing = timingOf(12, false)
    assert.equal(timing.daewoonList.length, 10)
    assert.ok(timing.daewoonList.every((item) => 'approxAgeStart' in item && !('ageStart' in item)))
    assert.equal(timing.yearlyFlow.length, 10)
  })

  it('세운은 태어난 시간에 따라 바뀌지 않는다(0~23시)', () => {
    const base = JSON.stringify(timingOf(0).yearlyFlow)
    for (let hour = 1; hour < 24; hour++) assert.equal(JSON.stringify(timingOf(hour).yearlyFlow), base, `${hour}시`)
  })
})
