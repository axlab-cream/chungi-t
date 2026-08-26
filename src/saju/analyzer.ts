import type {
  BirthInput,
  Element,
  ElementCount,
  EarthlyBranch,
  FourPillars,
  Gender,
  HeavenlyStem,
  HiddenStemInfo,
  SajuAnalysis,
  SajuInteraction,
  SajuPreview,
  TenGod,
  TenGodPlacement,
} from '../types/index.js'
import { buildPillar, calculateStemBranchIndices, pillarLabel } from './calculator.js'
import { calculateFortuneCycle, formatFortuneForPrompt } from './fortune-cycle.js'
import {
  BRANCH_CLASH_PAIRS,
  BRANCH_COMBINATION_PAIRS,
  BRANCH_HARM_PAIRS,
  BRANCH_KO,
  BRANCH_BREAK_PAIRS,
  createPillarFromStemBranch,
  DAY_MASTER_ADVICE,
  ELEMENT_KO,
  HIDDEN_STEMS,
  STEM_ELEMENT,
  STEM_COMBINATION_PAIRS,
  STEM_KO,
} from './analyzer-helpers.js'

const HEAVENLY_STEMS: HeavenlyStem[] = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']

export function calculateFourPillars(birth: BirthInput): FourPillars {
  const idx = calculateStemBranchIndices(birth)
  const y = buildPillar(idx.year.stemIdx, idx.year.branchIdx)
  const m = buildPillar(idx.month.stemIdx, idx.month.branchIdx)
  const d = buildPillar(idx.day.stemIdx, idx.day.branchIdx)
  const h = buildPillar(idx.hour.stemIdx, idx.hour.branchIdx)
  return {
    year: createPillarFromStemBranch(y.stem, y.branch),
    month: createPillarFromStemBranch(m.stem, m.branch),
    day: createPillarFromStemBranch(d.stem, d.branch),
    hour: createPillarFromStemBranch(h.stem, h.branch),
  }
}

function countElements(pillars: FourPillars): ElementCount {
  const count: ElementCount = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 }
  for (const p of [pillars.year, pillars.month, pillars.day, pillars.hour]) {
    count[p.stemElement]++
    count[p.branchElement]++
  }
  return count
}

function getDominantAndWeak(count: ElementCount): { dominant: Element; weak: Element } {
  const entries = Object.entries(count) as [Element, number][]
  entries.sort((a, b) => b[1] - a[1])
  return { dominant: entries[0][0], weak: entries[entries.length - 1][0] }
}

function getTenGod(dayMaster: HeavenlyStem, target: HeavenlyStem): TenGod {
  const dmElement = STEM_ELEMENT[dayMaster]
  const targetElement = STEM_ELEMENT[target]
  const dmIdx = HEAVENLY_STEMS.indexOf(dayMaster)
  const targetIdx = HEAVENLY_STEMS.indexOf(target)
  const samePolarity = (dmIdx % 2) === (targetIdx % 2)
  const generates: Record<Element, Element> = {
    wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood',
  }
  const controls: Record<Element, Element> = {
    wood: 'earth', fire: 'metal', earth: 'water', metal: 'wood', water: 'fire',
  }

  if (dmElement === targetElement) return samePolarity ? '비견' : '겁재'
  if (generates[dmElement] === targetElement) return samePolarity ? '식신' : '상관'
  if (controls[dmElement] === targetElement) return samePolarity ? '편재' : '정재'
  if (controls[targetElement] === dmElement) return samePolarity ? '편관' : '정관'
  return samePolarity ? '편인' : '정인'
}

function inferUsefulGod(
  strength: SajuAnalysis['dayMasterStrength'],
  weak: Element,
  dmElement: Element,
): Element | null {
  if (strength === 'weak') {
    const generates: Record<Element, Element> = {
      wood: 'water', fire: 'wood', earth: 'fire', metal: 'earth', water: 'metal',
    }
    return generates[dmElement] ?? weak
  }
  if (strength === 'strong') {
    const drains: Record<Element, Element> = {
      wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood',
    }
    return drains[dmElement] ?? weak
  }
  return weak
}

function weightedElementCount(pillars: FourPillars): ElementCount {
  const count: ElementCount = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 }
  for (const p of [pillars.year, pillars.month, pillars.day, pillars.hour]) {
    count[p.stemElement] += 1
    for (const hidden of HIDDEN_STEMS[p.branch]) {
      count[STEM_ELEMENT[hidden.stem]] += hidden.weight
    }
  }
  return count
}

function buildHiddenStems(pillars: FourPillars, dayMaster: HeavenlyStem): HiddenStemInfo[] {
  return [pillars.year, pillars.month, pillars.day, pillars.hour].map((p) => ({
    branch: p.branch,
    stems: HIDDEN_STEMS[p.branch].map((hidden) => ({
      stem: hidden.stem,
      element: STEM_ELEMENT[hidden.stem],
      weight: hidden.weight,
      tenGod: getTenGod(dayMaster, hidden.stem),
    })),
  }))
}

function buildTenGodPlacements(pillars: FourPillars, dayMaster: HeavenlyStem): TenGodPlacement[] {
  return [
    ['year', pillars.year.stem],
    ['month', pillars.month.stem],
    ['day', pillars.day.stem],
    ['hour', pillars.hour.stem],
  ].filter(([, stem]) => stem !== dayMaster).map(([pillar, stem]) => ({
    pillar: pillar as TenGodPlacement['pillar'],
    stem: stem as HeavenlyStem,
    tenGod: getTenGod(dayMaster, stem as HeavenlyStem),
  }))
}

function pairExists(a: string, b: string, targetA: string, targetB: string): boolean {
  return (a === targetA && b === targetB) || (a === targetB && b === targetA)
}

function buildInteractions(pillars: FourPillars): SajuInteraction[] {
  const entries = [
    ['년주', pillars.year],
    ['월주', pillars.month],
    ['일주', pillars.day],
    ['시주', pillars.hour],
  ] as const
  const interactions: SajuInteraction[] = []

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const [aName, a] = entries[i]
      const [bName, b] = entries[j]

      const stemCombo = STEM_COMBINATION_PAIRS.find(([x, y]) => pairExists(a.stem, b.stem, x, y))
      if (stemCombo) {
        interactions.push({
          type: '천간합',
          pillars: [aName, bName],
          signs: [a.stem, b.stem],
          meaning: stemCombo[2],
        })
      }

      const branchChecks: Array<[SajuInteraction['type'], Array<[EarthlyBranch, EarthlyBranch, string]>]> = [
        ['육합', BRANCH_COMBINATION_PAIRS],
        ['충', BRANCH_CLASH_PAIRS],
        ['파', BRANCH_BREAK_PAIRS],
        ['해', BRANCH_HARM_PAIRS],
      ]
      for (const [type, pairs] of branchChecks) {
        const found = pairs.find(([x, y]) => pairExists(a.branch, b.branch, x, y))
        if (found) {
          interactions.push({
            type,
            pillars: [aName, bName],
            signs: [a.branch, b.branch],
            meaning: found[2],
          })
        }
      }
    }
  }

  const branches = entries.map(([, p]) => p.branch)
  if (['寅', '巳', '申'].every((branch) => branches.includes(branch as EarthlyBranch))) {
    interactions.push({ type: '형', pillars: ['원국'], signs: ['寅', '巳', '申'], meaning: '寅巳申 삼형: 시작·압박·정리가 꼬이며 갑작스러운 방향 전환이 생길 수 있습니다.' })
  }
  if (['丑', '戌', '未'].every((branch) => branches.includes(branch as EarthlyBranch))) {
    interactions.push({ type: '형', pillars: ['원국'], signs: ['丑', '戌', '未'], meaning: '丑戌未 삼형: 책임·고집·생활 기반이 엉켜 오래 묵은 문제가 드러날 수 있습니다.' })
  }

  return interactions
}

function buildPreview(analysis: Omit<SajuAnalysis, 'preview' | 'fortune'>, gender: Gender): SajuPreview {
  const hasWealth = analysis.tenGods.some((g) => g.includes('재'))
  const hasLove = gender === 'male'
    ? analysis.tenGods.some((g) => g.includes('재'))
    : analysis.tenGods.some((g) => g.includes('관'))
  const strengthText = analysis.dayMasterStrength === 'strong'
    ? '기운이 강한'
    : analysis.dayMasterStrength === 'weak'
      ? '섬세한'
      : '균형 잡힌'
  const incomeFlow = analysis.dominantElement === 'earth' || analysis.dominantElement === 'metal'
    ? '안정적으로 쌓아 올리는'
    : '움직임 속에서 열리는'

  return {
    personality: `${STEM_KO[analysis.dayMaster]}${ELEMENT_KO[analysis.dayMasterElement].charAt(0)} 일간으로 ${strengthText} 성향입니다. 흥미롭네요. 겉으로 보이는 모습보다 안쪽의 결이 더 선명합니다. ${analysis.dayMasterAdvice}`,
    elementBalance: `오행을 펼쳐보니 목${analysis.elementCount.wood}·화${analysis.elementCount.fire}·토${analysis.elementCount.earth}·금${analysis.elementCount.metal}·수${analysis.elementCount.water}입니다. ${ELEMENT_KO[analysis.dominantElement]} 기운이 먼저 보이고, ${ELEMENT_KO[analysis.weakElement]} 기운이 빈자리로 남아 있습니다. 이 빈자리를 어떻게 채우느냐가 흐름을 바꿉니다.`,
    loveFortune: hasLove
      ? `일지 ${BRANCH_KO[analysis.fourPillars.day.branch]}(${analysis.fourPillars.day.branch}) 자리에 인연의 기운이 보입니다. 스쳐 지나가는 만남보다, ${analysis.usefulGod ? `${ELEMENT_KO[analysis.usefulGod]} 기운을 살리는 사람` : '마음을 천천히 열게 하는 사람'}에게 흐름이 붙습니다. 관계는 급히 잡지 말고 결을 보세요.`
      : `관계운은 지금 바깥보다 안쪽을 먼저 보라고 말합니다. 혼자 버티는 시간이 길수록 마음의 문이 늦게 열릴 수 있습니다. 자신을 돌본 뒤에야 인연의 흐름도 선명해집니다.`,
    wealthFortune: hasWealth
      ? `재성(財星) 기운이 사주 안에 들어 있습니다. 돈의 감각이 없는 팔자는 아닙니다. 다만 ${incomeFlow} 흐름이 보입니다. 크게 움직이기 전에는 타이밍과 기준을 먼저 보셔야 합니다.`
      : `재물운은 한 번에 터지는 쪽보다 실력과 표현에서 열리는 흐름이 보입니다. 꾸준히 쌓은 전문성이 돈길을 붙드는 열쇠입니다. 조급하게 잡으려 하면 오히려 새는 돈이 생깁니다.`,
  }
}

export function analyzeSaju(birth: BirthInput): SajuAnalysis {
  const idx = calculateStemBranchIndices(birth)
  const y = buildPillar(idx.year.stemIdx, idx.year.branchIdx)
  const m = buildPillar(idx.month.stemIdx, idx.month.branchIdx)
  const d = buildPillar(idx.day.stemIdx, idx.day.branchIdx)
  const h = buildPillar(idx.hour.stemIdx, idx.hour.branchIdx)

  const fourPillars: FourPillars = {
    year: createPillarFromStemBranch(y.stem, y.branch),
    month: createPillarFromStemBranch(m.stem, m.branch),
    day: createPillarFromStemBranch(d.stem, d.branch),
    hour: createPillarFromStemBranch(h.stem, h.branch),
  }

  const dayMaster = fourPillars.day.stem
  const dayMasterElement = STEM_ELEMENT[dayMaster]
  const elementCount = countElements(fourPillars)
  const weightedElements = weightedElementCount(fourPillars)
  const { dominant: dominantElement, weak: weakElement } = getDominantAndWeak(elementCount)

  const stems = [fourPillars.year.stem, fourPillars.month.stem, fourPillars.day.stem, fourPillars.hour.stem]
  const tenGods = stems.filter((s) => s !== dayMaster).map((s) => getTenGod(dayMaster, s))
  const hiddenStems = buildHiddenStems(fourPillars, dayMaster)
  const tenGodPlacements = buildTenGodPlacements(fourPillars, dayMaster)
  const interactions = buildInteractions(fourPillars)

  const monthSupport = fourPillars.month.branchElement === dayMasterElement ? 0.8 : 0
  const dmCount = weightedElements[dayMasterElement] + monthSupport
  const total = Object.values(weightedElements).reduce((a, b) => a + b, 0) + monthSupport
  const ratio = dmCount / total

  let dayMasterStrength: SajuAnalysis['dayMasterStrength'] = 'balanced'
  if (ratio >= 0.32) dayMasterStrength = 'strong'
  else if (ratio <= 0.18) dayMasterStrength = 'weak'

  const usefulGod = inferUsefulGod(dayMasterStrength, weakElement, dayMasterElement)
  const fortune = calculateFortuneCycle(birth)

  const summary = [
    `사주: ${pillarLabel(fourPillars.year)} ${pillarLabel(fourPillars.month)} ${pillarLabel(fourPillars.day)} ${pillarLabel(fourPillars.hour)}`,
    `양력 기준일: ${idx.resolved.solarYear}-${String(idx.resolved.solarMonth).padStart(2, '0')}-${String(idx.resolved.solarDay).padStart(2, '0')} ${String(idx.resolved.hour).padStart(2, '0')}:${String(idx.resolved.minute).padStart(2, '0')} KST${idx.resolved.originalCalendar === 'lunar' ? ` (음력 ${idx.resolved.lunarYear}-${idx.resolved.lunarMonth}-${idx.resolved.lunarDay}${idx.resolved.isLeapMonth ? ' 윤달' : ''} 변환)` : ''}`,
    `절기 기준: 년주 ${idx.pillarYear}년 입춘 기준, 월주 ${idx.month.termName} 이후`,
    `일간(日干): ${dayMaster}(${STEM_KO[dayMaster]}·${ELEMENT_KO[dayMasterElement]}) — ${dayMasterStrength === 'strong' ? '강' : dayMasterStrength === 'weak' ? '약' : '중화'}`,
    `오행: 목${elementCount.wood} 화${elementCount.fire} 토${elementCount.earth} 금${elementCount.metal} 수${elementCount.water}`,
    `지장간 가중 오행: 목${weightedElements.wood.toFixed(1)} 화${weightedElements.fire.toFixed(1)} 토${weightedElements.earth.toFixed(1)} 금${weightedElements.metal.toFixed(1)} 수${weightedElements.water.toFixed(1)}`,
    `강한 오행: ${ELEMENT_KO[dominantElement]}, 부족한 오행: ${ELEMENT_KO[weakElement]}`,
    usefulGod ? `용신(用神) 추정: ${ELEMENT_KO[usefulGod]}` : '',
    `십신: ${tenGods.join(', ')}`,
    tenGodPlacements.length > 0 ? `십신 위치: ${tenGodPlacements.map((p) => `${p.pillar}:${p.tenGod}`).join(', ')}` : '',
    hiddenStems.length > 0 ? `지장간: ${hiddenStems.map((h) => `${h.branch}[${h.stems.map((s) => `${s.stem}/${s.tenGod}`).join('·')}]`).join(', ')}` : '',
    interactions.length > 0 ? `합충형파해: ${interactions.map((i) => `${i.type}(${i.signs.join('')})`).join(', ')}` : '합충형파해: 주요 원국 충돌 신호 약함',
    formatFortuneForPrompt(fortune),
  ].filter(Boolean).join('\n')

  const base = {
    fourPillars,
    dayMaster,
    dayMasterElement,
    elementCount,
    dominantElement,
    weakElement,
    tenGods,
    usefulGod,
    dayMasterStrength,
    summary,
    dayMasterAdvice: DAY_MASTER_ADVICE[dayMaster],
    manseryeok: {
      resolvedBirth: idx.resolved,
      pillarYear: idx.pillarYear,
      monthTerm: idx.month.termName,
      hiddenStems,
      tenGodPlacements,
      interactions,
      weightedElements,
      calculationNotes: [
        '년주와 월주는 절기(입춘 및 월절) 기준으로 계산합니다.',
        '24절기 시각은 lunar-typescript 절기 테이블의 중국 표준시 표기를 UTC로 환산한 뒤 KST 출생 시각과 비교합니다.',
        '음력 입력은 KARI 기준 한국 음력 변환 테이블을 사용합니다.',
        '일간 강약은 천간·지장간 가중 오행과 월령 보정을 함께 반영한 추정입니다.',
        '대운 시작 나이는 출생 시각과 인접 절기 간격을 3일=1년으로 환산한 근사값입니다.',
        '23시 자시의 일주 변경 관례는 현재 옵션화 전이며, 날짜 기준 일주를 기본값으로 사용합니다.',
      ],
    },
    fortune,
  }

  return {
    ...base,
    preview: buildPreview(base, birth.gender),
  }
}

export function formatSajuForPrompt(analysis: SajuAnalysis): string {
  return `<personal_saju>\n${analysis.summary}\n\n일간 조언: ${analysis.dayMasterAdvice}\n</personal_saju>`
}

export { STEM_ELEMENT, ELEMENT_KO, STEM_KO, BRANCH_KO }
