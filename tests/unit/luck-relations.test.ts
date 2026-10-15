import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSaju, buildSajuFeatureJson, sixCharAnalysis } from '../../src/saju/analyzer.js'
import { luckRelations } from '../../src/saju/relations.js'
import { groundedReportFeatures } from '../../src/report/report-generator.js'
import type { BirthInput, EarthlyBranch, HeavenlyStem } from '../../src/types/index.js'

/**
 * 3번(2026-10-15): 대운·세운 글자가 원국과 만드는 합·충·형을 AI 재료에 붙인다.
 * 참고 PDF 사례(丁卯 丙午 庚寅, 시간 미상 → 6글자)로 확인한다.
 */
const PDF_BIRTH: BirthInput = { year: 1987, month: 6, day: 10, hour: 20, minute: 0, gender: 'female', calendar: 'solar' }
const chart = (...gz: string[]) => gz.map((p, i) => ({ label: ['연', '월', '일', '시'][i], stem: p[0] as HeavenlyStem, branch: p[1] as EarthlyBranch }))

describe('운(대운·세운) × 원국 관계', () => {
  it('세운 丙午: 卯와 파, 午와 자형, 寅과 반합(화)', () => {
    assert.deepEqual(luckRelations('丙午', chart('丁卯', '丙午', '庚寅')), ['파 午↔연지 卯', '자형 午↔월지 午', '반합 午↔일지 寅(화)'])
  })

  it('세운 庚戌: 卯와 육합, 午와 반합, 원국 寅午와 함께 삼합(화)을 완성한다', () => {
    assert.deepEqual(luckRelations('庚戌', chart('丁卯', '丙午', '庚寅')), ['육합 戌↔연지 卯', '반합 戌↔월지 午(화)', '삼합 寅午戌(화, 운 戌)'])
  })

  it('천간도 본다(천간합·천간충), 원국에 이미 있는 삼합은 운 탓으로 다시 쓰지 않는다', () => {
    const lines = luckRelations('甲子', chart('庚申', '己丑', '戊辰', '壬子'))
    assert.ok(lines.includes('천간충 甲↔연간 庚'))
    assert.ok(lines.includes('천간합 甲↔월간 己'))
    assert.ok(lines.some((l) => l.startsWith('삼합 申子辰')) === false, '申子辰은 원국에 이미 있음')
  })

  it('AI 재료: 시간 모름 6글자면 시주를 빼고 붙이고, 시간을 알면 시주까지 본다', () => {
    const six = buildSajuFeatureJson(sixCharAnalysis(analyzeSaju(PDF_BIRTH)))
    assert.deepEqual(six.timing?.yearlyFlow?.find((f) => f.pillar === '庚戌')?.withChart, ['육합 戌↔연지 卯', '반합 戌↔월지 午(화)', '삼합 寅午戌(화, 운 戌)'])
    const known = buildSajuFeatureJson(analyzeSaju(PDF_BIRTH))
    // 20시 丙戌: 원국에 이미 寅午戌 삼합이 있어 운 戌이 만든 것으로 다시 쓰지 않고, 시지 戌과는 같은 글자라 관계 없음
    assert.deepEqual(known.timing?.yearlyFlow?.find((f) => f.pillar === '庚戌')?.withChart, ['육합 戌↔연지 卯', '반합 戌↔월지 午(화)'])
    assert.ok(known.timing?.daewoonList?.every((d) => Array.isArray(d.withChart)))
  })

  it('시간 미상 보류 모드는 임시 시각 원국 기준이라 원국 관계를 넘기지 않는다', () => {
    const grounded = groundedReportFeatures(analyzeSaju({ ...PDF_BIRTH, hour: 12 }), { serviceKey: 'love_this_year', birthTimeKnown: false }) as { timing?: { yearlyFlow?: Array<Record<string, unknown>>; daewoonList?: Array<Record<string, unknown>> } }
    assert.ok(grounded.timing?.yearlyFlow?.length)
    assert.ok(grounded.timing!.yearlyFlow!.every((f) => !('withChart' in f)))
    assert.ok(grounded.timing!.daewoonList!.every((d) => !('withChart' in d)))
  })
})
