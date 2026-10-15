import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSaju, sixCharAnalysis, buildSajuFeatureJson } from '../../src/saju/analyzer.js'
import { calculateShinsal, inventedShinsalNames, kongmangBranches, SHINSAL_HOUR_UNKNOWN_NOTE } from '../../src/saju/shinsal.js'
import { reviewGeneratedSajuReportSection, buildTemplateSajuReport } from '../../src/report/report-generator.js'
import { buildPillar, HEAVENLY_STEMS, EARTHLY_BRANCHES } from '../../src/saju/calculator.js'
import { STEM_ELEMENT, BRANCH_ELEMENT } from '../../src/saju/analyzer-helpers.js'
import type { BirthInput, EarthlyBranch, HeavenlyStem, Pillar, ShinsalInfo } from '../../src/types/index.js'

/** 신살 계산이 13개 기준(analysis/shinsal-research.html 5장)대로 나오는지. */
const pillar = (gz: string): Pillar => {
  const stem = gz[0] as HeavenlyStem
  const branch = gz[1] as EarthlyBranch
  const p = buildPillar(HEAVENLY_STEMS.indexOf(stem), EARTHLY_BRANCHES.indexOf(branch))
  return { ...p, stemElement: STEM_ELEMENT[stem], branchElement: BRANCH_ELEMENT[branch] }
}
const chartOf = (...gz: string[]) => (['year', 'month', 'day', 'hour'] as const).slice(0, gz.length).map((key, i) => [key, pillar(gz[i])] as [typeof key, Pillar])
const find = (items: ShinsalInfo[], name: string, pillarKey?: string, basis?: string) =>
  items.filter((s) => s.name === name && (!pillarKey || s.pillar === pillarKey) && (!basis || s.basis === basis))

const PDF_BIRTH: BirthInput = { year: 1987, month: 6, day: 10, hour: 20, minute: 0, gender: 'female', calendar: 'solar' }

describe('신살 계산: 13개 기준', () => {
  it('참고 PDF 사례(丁卯 丙午 庚寅)가 조사 보고서의 기대값대로 나온다 — 시간 모름 3주', () => {
    const six = sixCharAnalysis(analyzeSaju(PDF_BIRTH))
    const s = six.manseryeok!.shinsal!
    // 연지 卯 기준
    assert.deepEqual(find(s.items, '장성', 'year', '연지 卯').map((x) => [x.sign, x.self]), [['卯', true]])
    assert.equal(find(s.items, '육해', 'month', '연지 卯')[0]?.sign, '午')
    assert.equal(find(s.items, '망신', 'day', '연지 卯')[0]?.sign, '寅')
    // 일지 寅 기준
    assert.deepEqual(find(s.items, '지살', 'day', '일지 寅').map((x) => x.self), [true])
    assert.equal(find(s.items, '도화(연살)', 'year', '일지 寅')[0]?.weight, 'light', '연지 자리 도화는 가볍게')
    assert.equal(find(s.items, '장성', 'month', '일지 寅')[0]?.sign, '午')
    // 없는 것
    for (const name of ['천을귀인', '문창귀인', '학당귀인', '홍염', '양인', '괴강', '천덕귀인', '역마', '화개']) assert.deepEqual(find(s.items, name), [], name)
    // 월덕(월간 丙), 현침 卯·午
    assert.deepEqual(find(s.items, '월덕귀인').map((x) => `${x.pillar}${x.sign}`), ['month丙'])
    assert.deepEqual(find(s.items, '현침').map((x) => x.sign).sort(), ['卯', '午'].sort())
    // 공망 午未 → 월지 午에 걸린 장성은 약화, 육해는 해소
    assert.deepEqual(s.kongmang, { branches: ['午', '未'], pillars: ['month'] })
    assert.equal(find(s.items, '장성', 'month')[0]?.voidEffect, 'weakened')
    assert.equal(find(s.items, '육해', 'month')[0]?.voidEffect, 'resolved')
    assert.equal(s.undetermined, SHINSAL_HOUR_UNKNOWN_NOTE)
  })

  it('시간을 알면 시주 자리도 판정한다 — 같은 사례 20시(丙戌)', () => {
    const s = analyzeSaju(PDF_BIRTH).manseryeok!.shinsal!
    assert.equal(s.undetermined, undefined)
    assert.equal(find(s.items, '홍염', 'hour')[0]?.sign, '戌', '庚 홍염 = 戌')
    assert.equal(find(s.items, '화개', 'hour', '일지 寅')[0]?.weight, 'heavy')
    assert.deepEqual(find(s.items, '월덕귀인').map((x) => x.pillar), ['month', 'hour'])
  })

  it('12신살 순서: 申子辰은 巳에서 겁살, 寅午戌은 亥에서 겁살로 시작한다', () => {
    const s = calculateShinsal(chartOf('甲子', '丙寅', '戊午', '庚申'), true)
    const fromYear = s.items.filter((x) => x.basis === '연지 子').map((x) => `${x.sign}${x.name}`)
    assert.deepEqual(fromYear, ['子장성', '寅역마', '午재살', '申지살'])
    const fromDay = s.items.filter((x) => x.basis === '일지 午').map((x) => `${x.sign}${x.name}`)
    assert.deepEqual(fromDay, ['子재살', '寅지살', '午장성', '申역마'])
  })

  it('일간 기준: 천을귀인 庚=丑未, 학당은 장생(乙=午), 홍염 乙은 午와 이설 申, 양인은 양간만(음간은 이설)', () => {
    assert.deepEqual(find(calculateShinsal(chartOf('乙丑', '癸未', '庚子', '丙戌'), true).items, '천을귀인').map((x) => x.sign), ['丑', '未'])
    const yi = calculateShinsal(chartOf('甲午', '壬申', '乙卯', '庚辰'), true).items
    assert.equal(find(yi, '학당귀인')[0]?.sign, '午')
    assert.deepEqual(find(yi, '홍염').map((x) => [x.sign, Boolean(x.variant)]), [['午', false], ['申', true]])
    assert.deepEqual(find(yi, '양인').map((x) => [x.sign, Boolean(x.variant)]), [['辰', true]])
    assert.equal(find(calculateShinsal(chartOf('甲子', '丁卯', '甲寅', '丙寅'), true).items, '양인')[0]?.variant, undefined)
  })

  it('괴강은 일주에서만, 귀문·원진은 일지와 다른 기둥의 짝', () => {
    assert.equal(find(calculateShinsal(chartOf('庚辰', '丁亥', '壬辰', '丙午'), true).items, '괴강')[0]?.pillar, 'day')
    assert.deepEqual(find(calculateShinsal(chartOf('庚辰', '丁亥', '甲子', '丙午'), true).items, '괴강'), [], '연주 庚辰은 괴강 아님')
    const pairs = calculateShinsal(chartOf('癸未', '辛酉', '甲子', '丙午'), true).items
    assert.deepEqual(find(pairs, '원진').map((x) => x.pillar), ['year'])
    assert.deepEqual(find(pairs, '귀문관').map((x) => x.pillar), ['month'])
  })

  it('천덕·월덕은 월지 기준 사주 전체, 일간에 걸리면 정격', () => {
    const s = calculateShinsal(chartOf('甲子', '丙寅', '丁卯', '丙午'), true).items
    assert.deepEqual(find(s, '천덕귀인').map((x) => [x.pillar, x.strongGrade ?? false]), [['day', true]], '寅월 천덕 丁')
    assert.deepEqual(find(s, '월덕귀인').map((x) => x.pillar), ['month', 'hour'], '寅월 월덕 丙')
  })

  it('공망은 일주 순에서 빠진 두 지지', () => {
    assert.deepEqual(kongmangBranches('甲', '子'), ['戌', '亥'])
    assert.deepEqual(kongmangBranches('甲', '午'), ['辰', '巳'])
    assert.deepEqual(kongmangBranches('癸', '亥'), ['子', '丑'])
  })

  it('AI 재료와 요약에 신살이 실린다', () => {
    const a = analyzeSaju(PDF_BIRTH)
    assert.equal(buildSajuFeatureJson(a).relationshipSignals.shinsal?.items.length, a.manseryeok!.shinsal!.items.length)
    assert.match(a.summary, /신살: .*장성\(월 午, 일지 寅·공망 약화\)/)
    assert.match(a.summary, /공망: 午未 \(월에 걸림\)/)
  })

  it('검수: 계산 목록에 없는 신살 이름을 쓰면 다시 쓰게 한다(일상어 망신·장성·서양인은 잡지 않음)', () => {
    const s = analyzeSaju(PDF_BIRTH).manseryeok!.shinsal!
    assert.deepEqual(inventedShinsalNames('장성살과 도화가 함께 있어요', s), [])
    assert.deepEqual(inventedShinsalNames('역마살이 강하고 백호살도 있어요', s), ['역마', '백호살'])
    assert.deepEqual(inventedShinsalNames('망신을 당할까 걱정했고, 장성한 자녀와 서양인 친구가 있어요', s), [])
    assert.deepEqual(inventedShinsalNames('도화가 있어요'), ['도화'], '계산값이 없으면 모든 신살 이름이 대상')
    const context = { serviceKey: 'saju_master', birthTimeKnown: true } as const
    const analysis = analyzeSaju(PDF_BIRTH)
    const section = buildTemplateSajuReport(analysis, PDF_BIRTH, context).sections.find((x) => x.id === 'profile')!
    const review = reviewGeneratedSajuReportSection({ analysis, birth: PDF_BIRTH, context, section, hook: '장점이 살아나는 조건', interpretation: '역마살이 있어 이동이 많아요.' })
    assert.ok(review.issues.some((issue) => issue.includes('계산된 신살 목록에 없는 신살(역마)')))
  })
})
