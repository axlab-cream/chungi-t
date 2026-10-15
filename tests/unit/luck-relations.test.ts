import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSaju, buildSajuFeatureJson, sixCharAnalysis } from '../../src/saju/analyzer.js'
import { luckRelations } from '../../src/saju/relations.js'
import { luckShinsalLine, namesFromLuckShinsalLines } from '../../src/saju/shinsal.js'
import { reviewGeneratedSajuReportSection, buildTemplateSajuReport } from '../../src/report/report-generator.js'
import { groundedReportFeatures } from '../../src/report/report-generator.js'
import type { BirthInput, EarthlyBranch, HeavenlyStem } from '../../src/types/index.js'

/**
 * 3번(2026-10-15): 대운·세운 글자가 원국과 만드는 합·충·형을 AI 재료에 붙인다.
 * 참고 PDF 사례(丁卯 丙午 庚寅, 시간 미상 → 6글자)로 확인한다.
 */
// 1987-06-10은 서머타임 기간이라 시계 21시 = 실제 KST 20시 = 사주 시각 19:30(丙戌시). 예전(UTC+9 고정) 20시와 같은 순간이다.
const PDF_BIRTH: BirthInput = { year: 1987, month: 6, day: 10, hour: 21, minute: 0, gender: 'female', calendar: 'solar' }
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
    // 戌: 卯(亥卯未) 기준 천살, 寅(寅午戌) 기준 화개, 庚 일간 홍염
    assert.deepEqual(six.timing?.yearlyFlow?.find((f) => f.pillar === '庚戌')?.withChart, ['육합 戌↔연지 卯', '반합 戌↔월지 午(화)', '삼합 寅午戌(화, 운 戌)', '신살 천살(연지)·화개(일지)·홍염'])
    const known = buildSajuFeatureJson(analyzeSaju(PDF_BIRTH))
    // 20시 丙戌: 원국에 이미 寅午戌 삼합이 있어 운 戌이 만든 것으로 다시 쓰지 않고, 시지 戌과는 같은 글자라 관계 없음
    assert.deepEqual(known.timing?.yearlyFlow?.find((f) => f.pillar === '庚戌')?.withChart, ['육합 戌↔연지 卯', '반합 戌↔월지 午(화)', '신살 천살(연지)·화개(일지)·홍염'])
    assert.ok(known.timing?.daewoonList?.every((d) => Array.isArray(d.withChart)))
  })

  it('시간 미상 보류 모드는 임시 시각 원국 기준이라 원국 관계를 넘기지 않는다', () => {
    const grounded = groundedReportFeatures(analyzeSaju({ ...PDF_BIRTH, hour: 12 }), { serviceKey: 'love_this_year', birthTimeKnown: false }) as { timing?: { yearlyFlow?: Array<Record<string, unknown>>; daewoonList?: Array<Record<string, unknown>> } }
    assert.ok(grounded.timing?.yearlyFlow?.length)
    assert.ok(grounded.timing!.yearlyFlow!.every((f) => !('withChart' in f)))
    assert.ok(grounded.timing!.daewoonList!.every((d) => !('withChart' in d)))
  })

  it('해마다 들어오는 신살: 참고 PDF 원국(丁卯 丙午 庚寅)에 세운 戊申 → 겁살(연지)·역마(일지)', () => {
    const chart = (['year', 'month', 'day'] as const).map((k, i) => [k, { stem: ['丁', '丙', '庚'][i], branch: ['卯', '午', '寅'][i] }] as [typeof k, { stem: HeavenlyStem; branch: EarthlyBranch }])
    // 卯(亥卯未) 기준 申 = 겁살, 寅(寅午戌) 기준 申 = 역마. 庚 일간 문창 = 亥(아님), 천을 = 丑未(아님)
    assert.equal(luckShinsalLine('戊申', chart), '신살 겁살(연지)·역마(일지)')
    // 세운 癸酉: 卯 기준 酉 = 재살, 寅 기준 酉 = 육해, 庚 양인 = 酉, 일지 寅과 酉는 원진
    assert.equal(luckShinsalLine('癸酉', chart), '신살 재살(연지)·육해(일지)·양인·원진')
    assert.deepEqual(namesFromLuckShinsalLines(['충 申↔일지 寅', '신살 도화(연살)(일지)·홍염(이설)·천을귀인']), ['도화(연살)', '홍염', '천을귀인'])
  })

  it('AI 재료의 대운·세운 줄에 신살이 붙고, 검수는 그 신살을 지어낸 것으로 보지 않는다', () => {
    const analysis = analyzeSaju(PDF_BIRTH)
    const features = buildSajuFeatureJson(analysis)
    assert.ok(features.timing?.yearlyFlow?.some((f) => f.withChart?.some((l) => l.startsWith('신살 '))))
    const context = { serviceKey: 'saju_master', birthTimeKnown: true } as const
    const section = buildTemplateSajuReport(analysis, PDF_BIRTH, context).sections.find((x) => x.id === 'sewoon-detail')!
    const luckOnly = namesFromLuckShinsalLines(features.timing!.yearlyFlow!.flatMap((f) => f.withChart ?? []))
      .find((name) => name === '역마')
    assert.equal(luckOnly, '역마', '원국에는 없고 세운에만 있는 역마')
    const review = reviewGeneratedSajuReportSection({ analysis, birth: PDF_BIRTH, context, section, hook: '올해의 변화', interpretation: '2028년에는 역마가 들어와 이동이 늘 수 있어요.' })
    assert.ok(!review.issues.some((issue) => issue.includes('계산된 신살 목록에 없는 신살')), '세운 신살은 허용')
    const profile = buildTemplateSajuReport(analysis, PDF_BIRTH, context).sections.find((x) => x.id === 'profile')!
    const timeless = reviewGeneratedSajuReportSection({ analysis, birth: PDF_BIRTH, context, section: profile, hook: '장점', interpretation: '역마살이 있어 이동이 많아요.' })
    assert.ok(timeless.issues.some((issue) => issue.includes('계산된 신살 목록에 없는 신살(역마)')), '해를 말하지 않는 문장에서는 원국에 없는 역마를 지어낸 것으로 본다')
  })
})
