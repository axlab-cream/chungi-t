import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { calculateFourPillars } from '../../src/saju/analyzer.js'
import { calculateStemBranchIndices } from '../../src/saju/calculator.js'
import { calculateZiwei } from '../../src/saju/ziwei.js'
import { createOrGetReportRecord, createReportId, createReportLineageId, getReportRecord } from '../../src/report/report-store.js'
import { birthForIdentity } from '../../src/saju/birth-location.js'
import { buildTemplateSajuReport } from '../../src/report/report-generator.js'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import type { BirthInput } from '../../src/types/index.js'

/**
 * 출생 시각 읽는 규칙(2026-10-15 결정, analysis/saju-engine-comparison.html 6-1·6-2장):
 *  A. 한국 옛 서머타임(1948~51·1955~60·1987~88)·UTC+8:30 표준시(1954~61) 반영
 *  B. 시주는 동경 127.5도(UTC+8:30) 기준 사주 시각 — 자시 23:30~01:29
 *  C. 사주 시각 23시(시계로 보통 23:30)부터 다음 날 일주
 *  D. 새 주문부터: 예전에 저장된 리포트는 예전 규칙(legacy)으로 다시 계산
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

  it('D. 예전 규칙(legacy)은 그대로: 정시 경계·UTC+9·자정', () => {
    const legacy = (birth: BirthInput) => label({ ...birth, timeRule: 'legacy' })
    assert.equal(legacy(b(1995, 3, 15, 7, 10)).hour[1], '辰')
    assert.equal(legacy(b(1988, 5, 8, 3, 47)).hour[1], '寅')
    assert.equal(legacy(b(1995, 3, 15, 23, 40)).day, legacy(b(1995, 3, 15, 12, 0)).day, '자정까지 그날')
    assert.equal(calculateStemBranchIndices({ ...b(1995, 3, 15, 7, 10), timeRule: 'legacy' }).clock.correctionMinutes, 0)
  })

  it('자미두수도 사주와 같은 사주 시각으로 시진을 정한다 — 07:10은 卯시 명반(예전 규칙은 辰시)', () => {
    const now = calculateZiwei(b(1995, 3, 15, 7, 10), true)
    const legacy = calculateZiwei({ ...b(1995, 3, 15, 7, 10), timeRule: 'legacy' }, true)
    const sameAsMao = calculateZiwei({ ...b(1995, 3, 15, 6, 0), timeRule: 'legacy' }, true)
    assert.ok(now.available && legacy.available && sameAsMao.available)
    assert.match(now.convention, /사주 시각/)
    assert.notDeepEqual(now.palaces, legacy.palaces)
    assert.deepEqual(now.palaces, sameAsMao.palaces, '예전 규칙의 卯시(06:00)와 같은 명반')
  })

  it('D. 새로 저장하는 리포트는 지금 규칙 표시가 붙는다', async () => {
    const owner = { id: `owner-time-rule-${randomUUID()}`, email: 'a@b.c', provider: 'test' }
    const birth = b(1990, 6, 1, 7, 10)
    const context = { serviceKey: 'saju_master' }
    const analysis = analyzeSaju(birth)
    const created = await createOrGetReportRecord({
      reportId: createReportId(birth, context, 'time-rule', owner.id),
      birth, context, templateReport: buildTemplateSajuReport(analysis, birth, context), analysis, owner,
    })
    assert.equal(created.record.birth.timeRule, 'kr2026')
    assert.equal((await getReportRecord(created.record.reportId, owner))?.birth.timeRule, 'kr2026')
  })

  it('D. 규칙 표시는 리포트 ID·계보·지문에 들어가지 않는다(같은 사람·같은 입력이면 같은 ID)', () => {
    const birth = b(1990, 6, 1, 7, 10)
    const context = { serviceKey: 'saju_master' }
    for (const rule of ['legacy', 'kr2026'] as const) {
      assert.equal(createReportId({ ...birth, timeRule: rule }, context, 'fp', 'o'), createReportId(birth, context, 'fp', 'o'))
      assert.equal(createReportLineageId({ ...birth, timeRule: rule }, context, 'o'), createReportLineageId(birth, context, 'o'))
      assert.deepEqual(birthForIdentity({ ...birth, timeRule: rule }), birthForIdentity(birth))
    }
  })
})
