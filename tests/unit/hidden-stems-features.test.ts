import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import { groundedReportFeatures } from '../../src/report/report-generator.js'

/**
 * 지장간(지지 속 숨은 글자)은 계산만 하고 리포트 AI 에게 넘기지 않아, AI 가 "지장간 값이 제공되지 않았어"라고
 * 고객에게 쓰거나 스스로 계산했다(2026-10-15 비교). 모든 리포트 서비스가 같은 통로로 받는다.
 */
const birth = { year: 1987, month: 6, day: 10, hour: 20, minute: 0, calendar: 'solar', gender: 'female' } as const
type Hidden = Array<{ pillar: string; branch: string; stems: Array<{ stem: string; tenGod?: string; weight: number; main: boolean }> }>
const hiddenOf = (context: Record<string, unknown>) =>
  (groundedReportFeatures(analyzeSaju(birth), { serviceKey: 'saju_master', birthTimeKnown: true, ...context }) as { relationshipSignals?: { hiddenStems: Hidden } }).relationshipSignals?.hiddenStems

describe('AI 재료의 지장간', () => {
  it('네 자리마다 숨은 글자·십신·비중을 비중 큰 순서로 넘기고, 가장 큰 것만 본기로 표시한다', () => {
    const hidden = hiddenOf({})!
    assert.deepEqual(hidden.map((item) => `${item.pillar}:${item.branch}`), ['year:卯', 'month:午', 'day:寅', 'hour:戌'])
    const day = hidden.find((item) => item.pillar === 'day')!
    assert.deepEqual(day.stems.map((item) => `${item.stem}${item.tenGod}${item.main ? '/본기' : ''}`), ['甲편재/본기', '丙편관', '戊편인'])
    for (const item of hidden) {
      assert.deepEqual(item.stems.map((stem) => stem.main), item.stems.map((_, index) => index === 0), '본기는 하나')
      assert.ok(item.stems.every((stem, index) => index === 0 || stem.weight <= item.stems[index - 1].weight))
    }
  })

  it('다른 서비스도 같은 값을 받는다', () => {
    assert.deepEqual(hiddenOf({ serviceKey: 'work_move' }), hiddenOf({}))
    assert.deepEqual(hiddenOf({ serviceKey: 'love_this_year' }), hiddenOf({}))
  })

  it('시간을 모르면 6글자 풀이에서는 연·월·일 3자리만, 보류 방식에서는 넘기지 않는다', () => {
    const sixChar = hiddenOf({ birthTimeKnown: false, birthTimeReading: 'six_char' })!
    assert.deepEqual(sixChar.map((item) => item.pillar), ['year', 'month', 'day'])
    assert.equal(hiddenOf({ serviceKey: 'work_move', birthTimeKnown: false }), undefined)
  })
})
