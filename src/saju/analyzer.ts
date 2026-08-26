import type {
  BirthInput,
  Element,
  ElementCount,
  EarthlyBranch,
  FlowBridgeInfo,
  FourPillars,
  Gender,
  GyeokgukInfo,
  HeavenlyStem,
  HiddenStemInfo,
  ClimateBalanceInfo,
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
const ELEMENT_ORDER: Element[] = ['wood', 'fire', 'earth', 'metal', 'water']

const TEN_GOD_GYEOK: Record<TenGod, string> = {
  비견: '비견격',
  겁재: '겁재격',
  식신: '식신격',
  상관: '상관격',
  편재: '편재격',
  정재: '정재격',
  편관: '편관격',
  정관: '정관격',
  편인: '편인격',
  정인: '정인격',
}

const GENERATES: Record<Element, Element> = {
  wood: 'fire',
  fire: 'earth',
  earth: 'metal',
  metal: 'water',
  water: 'wood',
}

const CONTROLS: Record<Element, Element> = {
  wood: 'earth',
  fire: 'metal',
  earth: 'water',
  metal: 'wood',
  water: 'fire',
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
  const dmElement = STEM_ELEMENT[dayMaster]
  const targetElement = STEM_ELEMENT[target]
  const dmIdx = HEAVENLY_STEMS.indexOf(dayMaster)
  const targetIdx = HEAVENLY_STEMS.indexOf(target)
  const samePolarity = (dmIdx % 2) === (targetIdx % 2)

  if (dmElement === targetElement) return samePolarity ? '비견' : '겁재'
  if (GENERATES[dmElement] === targetElement) return samePolarity ? '식신' : '상관'
  if (CONTROLS[dmElement] === targetElement) return samePolarity ? '편재' : '정재'
  if (CONTROLS[targetElement] === dmElement) return samePolarity ? '편관' : '정관'
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

function buildGyeokguk(pillars: FourPillars, dayMaster: HeavenlyStem): GyeokgukInfo {
  const monthHidden = HIDDEN_STEMS[pillars.month.branch]
  const mainHidden = monthHidden[0]
  const tenGod = getTenGod(dayMaster, mainHidden.stem)
  const monthStemTenGod = pillars.month.stem === dayMaster ? null : getTenGod(dayMaster, pillars.month.stem)
  const sameSignal = monthStemTenGod === tenGod
  const confidence = Math.min(95, Math.round((mainHidden.weight * 100) + (sameSignal ? 22 : 12)))

  return {
    name: TEN_GOD_GYEOK[tenGod],
    basis: `월지 ${pillars.month.branch}의 주기운 ${mainHidden.stem}(${tenGod}) 기준`,
    tenGod,
    confidence,
    note: `${TEN_GOD_GYEOK[tenGod]}은 월령에서 가장 먼저 올라오는 사회적 작동 방식입니다. 확정 격국이 아니라 리포트 해석의 1차 렌즈로 사용합니다.`,
  }
}

function seasonOf(branch: EarthlyBranch): ClimateBalanceInfo['season'] {
  if (['寅', '卯', '辰'].includes(branch)) return 'spring'
  if (['巳', '午', '未'].includes(branch)) return 'summer'
  if (['申', '酉', '戌'].includes(branch)) return 'autumn'
  return 'winter'
}

function buildClimateBalance(pillars: FourPillars, weighted: ElementCount): ClimateBalanceInfo {
  const season = seasonOf(pillars.month.branch)
  const table: Record<ClimateBalanceInfo['season'], Omit<ClimateBalanceInfo, 'season'>> = {
    spring: {
      temperature: 'warm',
      moisture: weighted.water >= 2 ? 'damp' : 'balanced',
      usefulElements: ['fire', 'earth'],
      cautionElements: ['wood'],
      note: '봄 명식은 자라는 힘이 먼저 올라옵니다. 화로 드러내고 토로 현실화해야 생각만 무성해지는 흐름을 줄일 수 있습니다.',
    },
    summer: {
      temperature: 'hot',
      moisture: weighted.water >= 2 ? 'balanced' : 'dry',
      usefulElements: ['water', 'metal'],
      cautionElements: ['fire'],
      note: '여름 명식은 열과 속도가 강합니다. 수로 식히고 금으로 기준을 세워야 과열, 말의 충돌, 과속 결정을 줄일 수 있습니다.',
    },
    autumn: {
      temperature: 'cool',
      moisture: weighted.water >= 2 ? 'balanced' : 'dry',
      usefulElements: ['water', 'fire'],
      cautionElements: ['metal'],
      note: '가을 명식은 판단과 정리가 빨라집니다. 수로 유연성을 만들고 화로 온도를 보태야 관계가 차갑게 굳지 않습니다.',
    },
    winter: {
      temperature: 'cold',
      moisture: 'damp',
      usefulElements: ['fire', 'wood'],
      cautionElements: ['water'],
      note: '겨울 명식은 속으로 응축되는 힘이 강합니다. 화로 온도를 올리고 목으로 시작점을 만들어야 멈춤과 걱정이 길어지지 않습니다.',
    },
  }

  return { season, ...table[season] }
}

function buildFlowBridges(weighted: ElementCount): FlowBridgeInfo[] {
  const total = Object.values(weighted).reduce((sum, value) => sum + value, 0)
  const threshold = total * 0.18
  const bridges: FlowBridgeInfo[] = []

  for (const controller of ELEMENT_ORDER) {
    const controlled = CONTROLS[controller]
    if (weighted[controller] < threshold || weighted[controlled] < threshold) continue
    const bridge = GENERATES[controller]
    const strength = Math.min(98, Math.round(((weighted[controller] + weighted[controlled]) / total) * 100))
    bridges.push({
      conflict: [controller, controlled],
      bridge,
      strength,
      note: `${ELEMENT_KO[controller]}이 ${ELEMENT_KO[controlled]}을 누르는 구조는 ${ELEMENT_KO[bridge]} 기운으로 통관해야 흐름이 부드러워집니다.`,
    })
  }

  return bridges.sort((a, b) => b.strength - a.strength)
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

  const gyeokguk = buildGyeokguk(fourPillars, dayMaster)
  const climate = buildClimateBalance(fourPillars, weightedElements)
  const flowBridges = buildFlowBridges(weightedElements)
  const usefulGod = flowBridges[0]?.bridge ?? climate.usefulElements[0] ?? inferUsefulGod(dayMasterStrength, weakElement, dayMasterElement)
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
    `격국 렌즈: ${gyeokguk.name} (${gyeokguk.basis}, 신뢰 ${gyeokguk.confidence}%)`,
    `조후 판단: ${climate.season}/${climate.temperature}/${climate.moisture} — ${climate.note}`,
    flowBridges.length > 0 ? `통관 후보: ${flowBridges.map((b) => `${ELEMENT_KO[b.conflict[0]]}-${ELEMENT_KO[b.conflict[1]]} 사이 ${ELEMENT_KO[b.bridge]}`).join(', ')}` : '통관 후보: 강한 상극 축은 약함',
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
      dayBoundaryRule: idx.dayBoundaryRule,
      dayCalculationDate: idx.dayCalculationDate,
      hiddenStems,
      tenGodPlacements,
      interactions,
      weightedElements,
      gyeokguk,
      climate,
      flowBridges,
      calculationNotes: [
        '년주와 월주는 절기(입춘 및 월절) 기준으로 계산합니다.',
        '24절기 시각은 lunar-typescript 절기 테이블의 중국 표준시 표기를 UTC로 환산한 뒤 KST 출생 시각과 비교합니다.',
        '음력 입력은 KARI 기준 한국 음력 변환 테이블을 사용합니다.',
        '일간 강약은 천간·지장간 가중 오행과 월령 보정을 함께 반영한 추정입니다.',
        '격국은 월지 주기운의 십신을 기준으로 1차 렌즈를 산출합니다.',
        '조후는 월지 계절과 가중 오행의 온도·습도 균형으로 추정합니다.',
        '통관은 강하게 부딪히는 오행 쌍 사이의 상생 중재 오행을 후보로 산출합니다.',
        '대운 시작 나이는 출생 시각과 인접 절기 간격을 3일=1년으로 환산한 근사값입니다.',
        idx.dayBoundaryRule === 'zi_hour_next_day'
          ? '23시 자시는 다음 날 일주로 계산하는 옵션을 적용했습니다.'
          : '23시 자시는 날짜 기준 일주를 기본값으로 사용합니다. 필요하면 zi_hour_next_day 옵션으로 바꿀 수 있습니다.',
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
