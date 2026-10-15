import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { calculateFourPillars } from '../../src/saju/analyzer.js'
import { calculateStemBranchIndices } from '../../src/saju/calculator.js'
import { calculateZiwei } from '../../src/saju/ziwei.js'
import type { BirthInput } from '../../src/types/index.js'

/**
 * 출생 시각 읽는 규칙(2026-10-15 결정, analysis/saju-engine-comparison.html 6-1·6-2장):
 *  A. 한국 옛 서머타임(1948~51·1955~60·1987~88)·UTC+8:30 표준시(1954~61) 반영
 *  B. 시주는 동경 127.5도(UTC+8:30) 기준 사주 시각 — 자시 23:30~01:29
 *  C. 사주 시각 23시(시계로 보통 23:30)부터 다음 날 일주
 * 산 사람이 아직 없어 "예전 규칙 보존" 장치는 두지 않는다(2026-10-15 결정). 계산이 바뀌면 풀이 세대(cacheEpoch)를 올린다.
 */
const b = (y: number, m: number, d: number, hour: number, minute: number, extra: Partial<BirthInput> = {}): BirthInput =>
  ({ year: y, month: m, day: d, hour, minute, gender: 'female', calendar: 'solar', ...extra })
const label = (birth: BirthInput) => {
  const p = calculateFourPillars(birth)
  return { day: p.day.stem + p.day.branch, hour: p.hour.stem + p.hour.branch }
}

describe('출생 시각 규칙', () => {
  it('B. 평소엔 30분 늦춘 경계: 07:10 → 卯시(정시 경계면 辰시), 07:40 → 辰시', () => {
    assert.equal(label(b(1995, 3, 15, 7, 10)).hour[1], '卯')
    assert.equal(label(b(1995, 3, 15, 7, 40)).hour[1], '辰')
    assert.equal(calculateStemBranchIndices(b(1995, 3, 15, 7, 10)).clock.correctionMinutes, -30)
  })

  it('A. 1988 서머타임 첫날 03:47 → 丑시(실제 KST 02:47, 사주 시각 02:17), 보정 -90분', () => {
    assert.equal(label(b(1988, 5, 8, 3, 47)).hour[1], '丑')
    assert.equal(calculateStemBranchIndices(b(1988, 5, 8, 3, 47)).clock.correctionMinutes, -90)
  })

  it('A. 1954~61 UTC+8:30 시기는 보정 0분: 1957-01-24 09:30 → 巳시', () => {
    assert.equal(label(b(1957, 1, 24, 9, 30)).hour[1], '巳')
    assert.equal(calculateStemBranchIndices(b(1957, 1, 24, 9, 30)).clock.correctionMinutes, 0)
  })

  it('A. 서머타임으로 없는 시각·겹치는 시각도 오류 없이 읽는다(1987 시작일 02:30, 종료일 02:30)', () => {
    assert.doesNotThrow(() => calculateFourPillars(b(1987, 5, 10, 2, 30)))
    assert.doesNotThrow(() => calculateFourPillars(b(1987, 10, 11, 2, 30)))
  })

  it('C. 23:10은 그날 亥시, 23:40은 다음 날 일주의 子시, 다음 날 00:20도 같은 일주의 子시', () => {
    const before = label(b(1995, 3, 15, 23, 10))
    const late = label(b(1995, 3, 15, 23, 40))
    const nextEarly = label(b(1995, 3, 16, 0, 20))
    const nextNoon = label(b(1995, 3, 16, 12, 0))
    assert.equal(before.hour[1], '亥')
    assert.notEqual(before.day, late.day)
    assert.equal(late.day, nextNoon.day, '23:40은 다음 날 일주')
    assert.equal(late.hour, nextEarly.hour, '같은 자시, 같은 천간(다음 날 기준)')
    assert.equal(late.hour[1], '子')
  })

  it('자미두수도 사주와 같은 사주 시각으로 시진을 정한다 — 07:10은 卯시, 07:40은 辰시 명반', () => {
    const at = (hour: number, minute: number) => calculateZiwei(b(1995, 3, 15, hour, minute), true)
    const mao = at(7, 10)
    const maoEarlier = at(6, 40)
    const chen = at(7, 40)
    assert.ok(mao.available && maoEarlier.available && chen.available)
    assert.match(mao.convention, /사주 시각/)
    assert.deepEqual(mao.palaces, maoEarlier.palaces, '같은 卯시')
    assert.notDeepEqual(mao.palaces, chen.palaces)
  })
})
