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

  return {
    personality: `${STEM_KO[analysis.dayMaster]}${ELEMENT_KO[analysis.dayMasterElement].charAt(0)} 일간으로 ${analysis.dayMasterStrength === 'strong' ? '기운이 강한' : analysis.dayMasterStrength === 'weak' ? '섬세한' : '균형 잡힌'} 성향입니다. ${analysis.dayMasterAdvice}`,
    elementBalance: `오행 분포 — 목${analysis.elementCount.wood}·화${analysis.elementCount.fire}·토${analysis.elementCount.earth}·금${analysis.elementCount.metal}·수${analysis.elementCount.water}. ${ELEMENT_KO[analysis.dominantElement]} 기운이 두드러지고 ${ELEMENT_KO[analysis.weakElement]} 기운을 보완하면 좋습니다.`,
    loveFortune: hasLove
      ? `일지 ${BRANCH_KO[analysis.fourPillars.day.branch]}(${analysis.fourPillars.day.branch}) 자리에 따뜻한 인연이 기운이 있습니다. ${analysis.usefulGod ? `${ELEMENT_KO[analysis.usefulGod]} 기운을 살리는 만남이 순탄할 수 있습니다.` : '마음을 열고 천천히 다가가면 좋은 인연이 이어질 수 있습니다.'}`
      : `인성(印星) 기운이 두드러져 내면 성찰의 시간이 필요할 수 있습니다. 자신을 돌본 뒤 인연이 자연스럽게 찾아올 수 있습니다.`,
    wealthFortune: hasWealth
      ? `재성(財星) 기운이 사주에 있어 현실적 수입과 재물 관리에 감각이 있습니다. ${analysis.dominantElement === 'earth' || analysis.dominantElement === 'metal' ? '안정적 축적형' : '활동적 수입형'} 흐름으로 보입니다.`
      : `식상(食傷)이나 관성 흐름으로 재물은 노력과 표현에서 열릴 수 있습니다. 꾸준한 전문성이 재물운을 붙드는 열쇠입니다.`,
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
