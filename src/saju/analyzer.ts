import type {
  BirthInput,
  Element,
  ElementCount,
  FourPillars,
  Gender,
  HeavenlyStem,
  SajuAnalysis,
  SajuPreview,
  TenGod,
} from '../types/index.js'
import { buildPillar, calculateStemBranchIndices, pillarLabel } from './calculator.js'
import { calculateFortuneCycle, formatFortuneForPrompt } from './fortune-cycle.js'
import {
  BRANCH_KO,
  createPillarFromStemBranch,
  DAY_MASTER_ADVICE,
  ELEMENT_KO,
  STEM_ELEMENT,
  STEM_KO,
} from './analyzer-helpers.js'

const HEAVENLY_STEMS: HeavenlyStem[] = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']

function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}

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
  const dmIdx = HEAVENLY_STEMS.indexOf(dayMaster)
  const tgIdx = HEAVENLY_STEMS.indexOf(target)
  const diff = mod(tgIdx - dmIdx, 10)
  const samePolarity = (dmIdx % 2) === (tgIdx % 2)

  if (diff === 0) return samePolarity ? '비견' : '겁재'
  if (diff === 1 || diff === 9) return samePolarity ? '겁재' : '비견'
  if (diff === 2 || diff === 8) return samePolarity ? '식신' : '상관'
  if (diff === 3 || diff === 7) return samePolarity ? '상관' : '식신'
  if (diff === 4 || diff === 6) return samePolarity ? '편재' : '정재'
  if (diff === 5) return '정재'
  return samePolarity ? '편관' : '정관'
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
      ? `재성(財星) 기운이 사주 안에 들어 있습니다. 돈의 감각이 없는 팔자는 아닙니다. 다만 ${incomeFlow} 흐름이니, 크게 움직이기 전에는 타이밍과 기준을 먼저 보셔야 합니다.`
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
  const { dominant: dominantElement, weak: weakElement } = getDominantAndWeak(elementCount)

  const stems = [fourPillars.year.stem, fourPillars.month.stem, fourPillars.day.stem, fourPillars.hour.stem]
  const tenGods = stems.filter((s) => s !== dayMaster).map((s) => getTenGod(dayMaster, s))

  const dmCount = elementCount[dayMasterElement]
  const total = Object.values(elementCount).reduce((a, b) => a + b, 0)
  const ratio = dmCount / total

  let dayMasterStrength: SajuAnalysis['dayMasterStrength'] = 'balanced'
  if (ratio >= 0.35) dayMasterStrength = 'strong'
  else if (ratio <= 0.15) dayMasterStrength = 'weak'

  const usefulGod = inferUsefulGod(dayMasterStrength, weakElement, dayMasterElement)
  const fortune = calculateFortuneCycle(birth)

  const summary = [
    `사주: ${pillarLabel(fourPillars.year)} ${pillarLabel(fourPillars.month)} ${pillarLabel(fourPillars.day)} ${pillarLabel(fourPillars.hour)}`,
    `일간(日干): ${dayMaster}(${STEM_KO[dayMaster]}·${ELEMENT_KO[dayMasterElement]}) — ${dayMasterStrength === 'strong' ? '강' : dayMasterStrength === 'weak' ? '약' : '중화'}`,
    `오행: 목${elementCount.wood} 화${elementCount.fire} 토${elementCount.earth} 금${elementCount.metal} 수${elementCount.water}`,
    `강한 오행: ${ELEMENT_KO[dominantElement]}, 부족한 오행: ${ELEMENT_KO[weakElement]}`,
    usefulGod ? `용신(用神) 추정: ${ELEMENT_KO[usefulGod]}` : '',
    `십신: ${tenGods.join(', ')}`,
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
