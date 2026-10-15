import type {
  BirthInput,
  Element,
  ElementCount,
  EarthlyBranch,
  FlowBridgeInfo,
  FourPillars,
  GyeokgukInfo,
  HeavenlyStem,
  HiddenStemInfo,
  ClimateBalanceInfo,
  ManseryeokMeta,
  Pillar,
  SajuAnalysis,
  SajuFeatureJson,
  SajuReportContext,
  SajuInteraction,
  ShinsalInfo,
  ShinsalResult,
  SajuPreview,
  TenGod,
  TenGodPlacement,
} from '../types/index.js'
import { buildPillar, calculateStemBranchIndices, pillarLabel } from './calculator.js'
import { calculateFortuneCycle, formatFortuneForPrompt } from './fortune-cycle.js'
import { calculateShinsal } from './shinsal.js'
import { groupRelations, luckRelations, pairRelations } from './relations.js'
import {
  BRANCH_KO,
  createPillarFromStemBranch,
  DAY_MASTER_ADVICE,
  ELEMENT_KO,
  HIDDEN_STEMS,
  STEM_ELEMENT,
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

/** 나를 생해 주는 오행(인성). GENERATES 의 반대 방향. */
const GENERATED_BY = Object.fromEntries(Object.entries(GENERATES).map(([from, to]) => [to, from])) as Record<Element, Element>

const CONTROLS: Record<Element, Element> = {
  wood: 'earth',
  fire: 'metal',
  earth: 'water',
  metal: 'wood',
  water: 'fire',
}

type ChartPillarKey = TenGodPlacement['pillar']
type ChartPillar = [ChartPillarKey, Pillar]
const CHART_PILLAR_LABEL: Record<ChartPillarKey, string> = { year: '년주', month: '월주', day: '일주', hour: '시주' }
const SHINSAL_PILLAR: Record<ChartPillarKey, string> = { year: '연', month: '월', day: '일', hour: '시' }

/** 해석에 쓰는 기둥. 출생 시각을 모르면 시주를 빼고 연·월·일 6글자만 쓴다(2026-10-15 결정). */
function chartPillars(pillars: FourPillars, hourKnown: boolean): ChartPillar[] {
  const keys: ChartPillarKey[] = hourKnown ? ['year', 'month', 'day', 'hour'] : ['year', 'month', 'day']
  return keys.map((key) => [key, pillars[key]])
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

function countElements(chart: ChartPillar[]): ElementCount {
  const count: ElementCount = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 }
  for (const [, p] of chart) {
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

export function getTenGod(dayMaster: HeavenlyStem, target: HeavenlyStem): TenGod {
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

/** 월지 오행이 일간을 돕는(같거나 생해 주는) 경우의 득령 가산. */
const MONTH_COMMAND_BONUS = 0.8
/**
 * 돕는 힘(비겁 + 인성) 비율의 강약 경계. 0.5가 돕는 힘과 빼는 힘(식상·재·관)이 반반인 지점이고,
 * 그 위아래 0.05는 중화로 본다. 무작위 3,000명(1950~2009년생) 기준 강·중화·약이 35%·25%·40%로 나뉜다(2026-10-15 측정).
 */
const STRENGTH_THRESHOLD = { strong: 0.55, weak: 0.45 } as const
/** 조후가 억부보다 앞서는 계절: 한여름 열기·한겨울 냉기를 더 키우는 억부 선택은 조후로 바꾼다(한목향양·조토윤습). */
const EXTREME_CLIMATE_SEASONS: ReadonlyArray<ClimateBalanceInfo['season']> = ['summer', 'winter']

type UsefulGodBasis = NonNullable<ManseryeokMeta['usefulGodBasis']>

function inferUsefulGod(
  strength: SajuAnalysis['dayMasterStrength'],
  weak: Element,
  dmElement: Element,
): Element | null {
  if (strength === 'weak') {
    return GENERATED_BY[dmElement] ?? weak
  }
  if (strength === 'strong') {
    return GENERATES[dmElement] ?? weak
  }
  return weak
}

/**
 * 용신 고르는 순서(2026-10-15 수정): 강약이 분명하면 억부가 먼저다. 다만 한여름·한겨울에 억부가 고른 기운이
 * 계절의 과한 기운(조후 주의 오행)이면 조후를 쓴다. 강약이 중화일 때만 통관 → 조후 순으로 본다.
 * 이전에는 통관·조후가 항상 먼저 정해져 강약 계산이 용신에 전혀 반영되지 않았다.
 */
function chooseUsefulGod(
  strength: SajuAnalysis['dayMasterStrength'],
  weak: Element,
  dmElement: Element,
  climate: ClimateBalanceInfo,
  flowBridges: FlowBridgeInfo[],
): { usefulGod: Element | null; usefulGodBasis: UsefulGodBasis } {
  if (strength !== 'balanced') {
    const eokbu = inferUsefulGod(strength, weak, dmElement)
    if (eokbu && EXTREME_CLIMATE_SEASONS.includes(climate.season) && climate.cautionElements.includes(eokbu)) {
      return { usefulGod: climate.usefulElements[0] ?? eokbu, usefulGodBasis: '조후' }
    }
    return { usefulGod: eokbu, usefulGodBasis: '억부' }
  }
  if (flowBridges[0]) return { usefulGod: flowBridges[0].bridge, usefulGodBasis: '통관' }
  return { usefulGod: climate.usefulElements[0] ?? weak, usefulGodBasis: '조후' }
}

function weightedElementCount(chart: ChartPillar[]): ElementCount {
  const count: ElementCount = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 }
  for (const [, p] of chart) {
    count[p.stemElement] += 1
    for (const hidden of HIDDEN_STEMS[p.branch]) {
      count[STEM_ELEMENT[hidden.stem]] += hidden.weight
    }
  }
  return count
}

function buildHiddenStems(chart: ChartPillar[], dayMaster: HeavenlyStem): HiddenStemInfo[] {
  return chart.map(([pillar, p]) => ({
    pillar,
    branch: p.branch,
    stems: HIDDEN_STEMS[p.branch].map((hidden) => ({
      stem: hidden.stem,
      element: STEM_ELEMENT[hidden.stem],
      weight: hidden.weight,
      tenGod: getTenGod(dayMaster, hidden.stem),
    })),
  }))
}

function buildTenGodPlacements(chart: ChartPillar[], dayMaster: HeavenlyStem): TenGodPlacement[] {
  return chart.filter(([, p]) => p.stem !== dayMaster).map(([pillar, p]) => ({
    pillar,
    stem: p.stem,
    tenGod: getTenGod(dayMaster, p.stem),
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

function buildInteractions(chart: ChartPillar[]): SajuInteraction[] {
  const entries = chart.map(([key, p]) => ({ label: CHART_PILLAR_LABEL[key], stem: p.stem, branch: p.branch }))
  const interactions: SajuInteraction[] = []
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) interactions.push(...pairRelations(entries[i], entries[j]))
  }
  interactions.push(...groupRelations(entries.map((p) => p.branch)))
  return interactions
}

/** 운(대운·세운)과 원국의 관계 줄. 시간을 모르면(6글자) 시주는 빼고 본다. */
function luckWithChart(analysis: SajuAnalysis): (pillar: string) => string[] {
  const chart = chartPillars(analysis.fourPillars, !analysis.manseryeok?.hourPillarExcluded)
    .map(([key, p]) => ({ label: SHINSAL_PILLAR[key], stem: p.stem, branch: p.branch }))
  return (pillar) => luckRelations(pillar, chart)
}

function buildPreview(analysis: Omit<SajuAnalysis, 'preview' | 'fortune'>): SajuPreview {
  const weakCount = analysis.elementCount[analysis.weakElement]
  return {
    personality: `일간은 ${STEM_KO[analysis.dayMaster]}(${analysis.dayMaster}, 태어난 날의 천간)입니다. 전통 명리에서 다른 기운과의 관계를 읽는 기준점이며, 실제 성격은 경험과 현재 상황을 함께 살펴야 합니다.`,
    elementBalance: `오행(五行, 목·화·토·금·수의 다섯 상징)의 단순 개수는 목 ${analysis.elementCount.wood}, 화 ${analysis.elementCount.fire}, 토 ${analysis.elementCount.earth}, 금 ${analysis.elementCount.metal}, 수 ${analysis.elementCount.water}입니다. ${ELEMENT_KO[analysis.weakElement]} 기운은 ${weakCount}개로, ${weakCount === 0 ? '이 개수표에는 없지만 능력이나 인격의 결핍을 뜻하지 않습니다' : '상대적으로 적다는 뜻이지 없는 기운은 아닙니다'}.`,
    loveFortune: `일지(日支, 태어난 날의 지지)는 ${BRANCH_KO[analysis.fourPillars.day.branch]}(${analysis.fourPillars.day.branch})입니다. 가까운 관계를 살피는 전통적 자리로 참고하되, 실제 관계 상태와 상대의 행동을 확인한 뒤 해석합니다. 특정한 인연 날짜나 상대의 외모는 이 정보만으로 알 수 없습니다.`,
    wealthFortune: '재성(財星, 일간이 다루는 기운과의 관계)은 전통적으로 자원과 현실 활동을 살피는 상징입니다. 실제 수입·지출 자료가 없으면 돈이 새거나 큰 수입이 생긴다고 판단하지 않습니다. 상세에서는 확인된 생활 조건과 구분해 읽습니다.',
  }
}

/** 기둥 목록에서 오행·십신·강약·용신처럼 기둥에 따라 바뀌는 값을 한 번에 계산한다. */
function deriveChart(fourPillars: FourPillars, hourKnown: boolean) {
  const chart = chartPillars(fourPillars, hourKnown)
  const dayMaster = fourPillars.day.stem
  const dayMasterElement = STEM_ELEMENT[dayMaster]
  const elementCount = countElements(chart)
  const weightedElements = weightedElementCount(chart)
  const { dominant: dominantElement, weak: weakElement } = getDominantAndWeak(elementCount)

  const tenGods = chart.map(([, p]) => p.stem).filter((s) => s !== dayMaster).map((s) => getTenGod(dayMaster, s))
  const hiddenStems = buildHiddenStems(chart, dayMaster)
  const tenGodPlacements = buildTenGodPlacements(chart, dayMaster)
  const interactions = buildInteractions(chart)

  // 돕는 힘 = 비겁(같은 오행) + 인성(생해 주는 오행). 이전에는 비겁만 세어 신약이 적게 나왔다.
  const supportElement = GENERATED_BY[dayMasterElement]
  const monthElement = fourPillars.month.branchElement
  const monthSupport = monthElement === dayMasterElement || monthElement === supportElement ? MONTH_COMMAND_BONUS : 0
  const dmCount = weightedElements[dayMasterElement] + weightedElements[supportElement] + monthSupport
  const total = Object.values(weightedElements).reduce((a, b) => a + b, 0) + monthSupport
  const ratio = dmCount / total

  let dayMasterStrength: SajuAnalysis['dayMasterStrength'] = 'balanced'
  if (ratio >= STRENGTH_THRESHOLD.strong) dayMasterStrength = 'strong'
  else if (ratio <= STRENGTH_THRESHOLD.weak) dayMasterStrength = 'weak'

  const gyeokguk = buildGyeokguk(fourPillars, dayMaster)
  const climate = buildClimateBalance(fourPillars, weightedElements)
  const flowBridges = buildFlowBridges(weightedElements)
  const { usefulGod, usefulGodBasis } = chooseUsefulGod(dayMasterStrength, weakElement, dayMasterElement, climate, flowBridges)
  const shinsal = calculateShinsal(chart, hourKnown)

  return {
    dayMaster,
    dayMasterElement,
    elementCount,
    weightedElements,
    dominantElement,
    weakElement,
    tenGods,
    hiddenStems,
    tenGodPlacements,
    interactions,
    dayMasterStrength,
    gyeokguk,
    climate,
    flowBridges,
    usefulGod,
    usefulGodBasis,
    shinsal,
  }
}

type DerivedChart = ReturnType<typeof deriveChart>
type ChartCalendar = Pick<ManseryeokMeta, 'resolvedBirth' | 'pillarYear' | 'monthTerm' | 'sajuClock'>

function chartSummary(fourPillars: FourPillars, derived: DerivedChart, calendar: ChartCalendar | undefined, fortune: SajuAnalysis['fortune'], hourKnown: boolean): string {
  const { dayMaster, dayMasterElement, dayMasterStrength, elementCount, weightedElements, dominantElement, weakElement, usefulGod, usefulGodBasis, shinsal, gyeokguk, climate, flowBridges, tenGods, tenGodPlacements, hiddenStems, interactions } = derived
  const resolved = calendar?.resolvedBirth
  const shownPillars = chartPillars(fourPillars, hourKnown).map(([, p]) => pillarLabel(p)).join(' ')
  return [
    hourKnown ? `사주: ${shownPillars}` : `사주(시주 제외 6글자): ${shownPillars}`,
    resolved
      ? `양력 기준일: ${resolved.solarYear}-${String(resolved.solarMonth).padStart(2, '0')}-${String(resolved.solarDay).padStart(2, '0')}${hourKnown ? ` ${String(resolved.hour).padStart(2, '0')}:${String(resolved.minute).padStart(2, '0')} KST` : ' (출생 시각 미상)'}${resolved.originalCalendar === 'lunar' ? ` (음력 ${resolved.lunarYear}-${resolved.lunarMonth}-${resolved.lunarDay}${resolved.isLeapMonth ? ' 윤달' : ''} 변환)` : ''}`
      : '',
    calendar?.sajuClock && calendar.sajuClock.correctionMinutes !== 0 && hourKnown
      ? `사주 시각: ${String(calendar.sajuClock.hour).padStart(2, '0')}:${String(calendar.sajuClock.minute).padStart(2, '0')} (${calendar.sajuClock.correctionMinutes}분 보정 — 서머타임·표준시·동경 127.5도 기준)`
      : '',
    calendar ? `절기 기준: 년주 ${calendar.pillarYear}년 입춘 기준, 월주 ${calendar.monthTerm} 이후` : '',
    `일간(日干): ${dayMaster}(${STEM_KO[dayMaster]}·${ELEMENT_KO[dayMasterElement]}) — ${dayMasterStrength === 'strong' ? '강' : dayMasterStrength === 'weak' ? '약' : '중화'}`,
    `오행: 목${elementCount.wood} 화${elementCount.fire} 토${elementCount.earth} 금${elementCount.metal} 수${elementCount.water}`,
    `지장간 가중 오행: 목${weightedElements.wood.toFixed(1)} 화${weightedElements.fire.toFixed(1)} 토${weightedElements.earth.toFixed(1)} 금${weightedElements.metal.toFixed(1)} 수${weightedElements.water.toFixed(1)}`,
    `강한 오행: ${ELEMENT_KO[dominantElement]}, 부족한 오행: ${ELEMENT_KO[weakElement]}`,
    usefulGod ? `용신(用神) 추정: ${ELEMENT_KO[usefulGod]} (근거: ${usefulGodBasis})` : '',
    `격국 렌즈: ${gyeokguk.name} (${gyeokguk.basis}, 신뢰 ${gyeokguk.confidence}%)`,
    `조후 판단: ${climate.season}/${climate.temperature}/${climate.moisture} — ${climate.note}`,
    flowBridges.length > 0 ? `통관 후보: ${flowBridges.map((b) => `${ELEMENT_KO[b.conflict[0]]}-${ELEMENT_KO[b.conflict[1]]} 사이 ${ELEMENT_KO[b.bridge]}`).join(', ')}` : '통관 후보: 강한 상극 축은 약함',
    `십신: ${tenGods.join(', ')}`,
    tenGodPlacements.length > 0 ? `십신 위치: ${tenGodPlacements.map((p) => `${p.pillar}:${p.tenGod}`).join(', ')}` : '',
    hiddenStems.length > 0 ? `지장간: ${hiddenStems.map((h) => `${h.branch}[${h.stems.map((s) => `${s.stem}/${s.tenGod}`).join('·')}]`).join(', ')}` : '',
    shinsal.items.length > 0 ? `신살: ${shinsal.items.map((s) => `${s.name}(${SHINSAL_PILLAR[s.pillar]} ${s.sign}, ${s.basis}${s.self ? '·기준 자리' : ''}${s.voidEffect ? (s.voidEffect === 'resolved' ? '·공망 해소' : '·공망 약화') : ''}${s.variant ? '·이설' : ''})`).join(', ')}` : '신살: 없음',
    `공망: ${shinsal.kongmang.branches.join('')}${shinsal.kongmang.pillars.length ? ` (${shinsal.kongmang.pillars.map((k) => SHINSAL_PILLAR[k]).join('·')}에 걸림)` : ''}${shinsal.undetermined ? ` — ${shinsal.undetermined}` : ''}`,
    interactions.length > 0 ? `합충형파해: ${interactions.map((i) => `${i.type}(${i.signs.join('')})`).join(', ')}` : '합충형파해: 주요 원국 충돌 신호 약함',
    // 대운 시작 나이는 출생 시각에 따라 1세 안팎 흔들리므로, 시각을 모르면 요약에 싣지 않는다.
    hourKnown && fortune ? formatFortuneForPrompt(fortune) : '',
  ].filter(Boolean).join('\n')
}

const SIX_CHAR_NOTE = '출생 시각 미상: 시주를 빼고 연·월·일 6글자로 오행·강약·용신·십신·합충을 계산했습니다.'

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

  const derived = deriveChart(fourPillars, true)
  const { dayMaster, dayMasterElement, elementCount, dominantElement, weakElement, tenGods, usefulGod, dayMasterStrength } = derived
  const fortune = calculateFortuneCycle(birth)
  const summary = chartSummary(fourPillars, derived, { resolvedBirth: idx.resolved, pillarYear: idx.pillarYear, monthTerm: idx.month.termName, sajuClock: idx.clock }, fortune, true)

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
      sajuClock: idx.clock,
      hiddenStems: derived.hiddenStems,
      tenGodPlacements: derived.tenGodPlacements,
      interactions: derived.interactions,
      weightedElements: derived.weightedElements,
      gyeokguk: derived.gyeokguk,
      climate: derived.climate,
      flowBridges: derived.flowBridges,
      usefulGodBasis: derived.usefulGodBasis,
      shinsal: derived.shinsal,
      calculationNotes: [
        '년주와 월주는 절기(입춘 및 월절) 기준으로 계산합니다.',
        '24절기 시각은 lunar-typescript 절기 테이블의 중국 표준시 표기를 UTC로 환산한 뒤 KST 출생 시각과 비교합니다.',
        '음력 입력은 KARI 기준 한국 음력 변환 테이블을 사용합니다.',
        '일간 강약은 천간·지장간 가중 오행에서 돕는 힘(비겁+인성)의 비율과 월령 보정으로 추정합니다.',
        '용신은 강약이 분명하면 억부, 한여름·한겨울에 억부가 계절의 과한 기운을 키우면 조후, 중화면 통관·조후 순으로 고릅니다.',
        '격국은 월지 주기운의 십신을 기준으로 1차 렌즈를 산출합니다.',
        '신살은 12신살(연지·일지 기준), 일간 기준 귀인·학당·문창·홍염·양인, 일주 괴강, 일지 짝 귀문·원진, 월지 기준 천덕·월덕, 현침, 일주 공망으로 계산합니다.',
        '조후는 월지 계절과 가중 오행의 온도·습도 균형으로 추정합니다.',
        '통관은 강하게 부딪히는 오행 쌍 사이의 상생 중재 오행을 후보로 산출합니다.',
        '합충형파해는 천간합·천간충·육합·충·형(두 글자·자형·삼형)·파·해·반합(왕지 포함)·삼합·방합을 보고, 대운·세운 글자와 원국 사이도 같은 표로 계산합니다.',
        '대운 시작 나이는 출생 시각과 인접 절기 간격을 3일=1년으로 환산한 근사값입니다.',
        '한국 출생은 옛 서머타임·표준시를 반영한 실제 시각을 동경 127.5도 기준(UTC+8:30)으로 읽어 일주·시주를 정합니다(자시 23:30~01:29).',
        idx.dayBoundaryRule === 'zi_hour_next_day'
          ? '자시(사주 시각 23시, 시계로 보통 23:30)부터 다음 날 일주로 계산합니다.'
          : '23시 자시는 날짜 기준 일주를 사용합니다.',
      ],
    },
    fortune,
  }

  return {
    ...base,
    preview: buildPreview(base),
  }
}

/**
 * 출생 시각을 모를 때의 풀이 재료(3단계, 2026-10-15). 임시 시각(12시)으로 계산된 명식에서
 * 시주를 빼고 연·월·일 6글자만으로 오행·강약·용신·십신·합충을 다시 계산한다.
 * 같은 날 태어났다면 몇 시를 넣었든 결과가 같다(절기 바뀌는 날은 그날 임시 시각 기준 — 보류하지 않는다).
 * fourPillars.hour 는 타입상 남지만 계산에는 쓰지 않으니, 밖으로 내보낼 때는 시주를 빼야 한다.
 */
export function sixCharAnalysis(analysis: SajuAnalysis): SajuAnalysis {
  if (analysis.manseryeok?.hourPillarExcluded) return analysis
  const derived = deriveChart(analysis.fourPillars, false)
  const { dayMaster, dayMasterElement, elementCount, dominantElement, weakElement, tenGods, usefulGod, dayMasterStrength } = derived
  const manseryeok: ManseryeokMeta | undefined = analysis.manseryeok
    ? {
        ...analysis.manseryeok,
        hiddenStems: derived.hiddenStems,
        tenGodPlacements: derived.tenGodPlacements,
        interactions: derived.interactions,
        weightedElements: derived.weightedElements,
        gyeokguk: derived.gyeokguk,
        climate: derived.climate,
        flowBridges: derived.flowBridges,
        usefulGodBasis: derived.usefulGodBasis,
        shinsal: derived.shinsal,
        // 사주 시각은 임시 시각(12시)에서 나온 값이라 6글자에서는 쓰지 않는다.
        sajuClock: undefined,
        hourPillarExcluded: true,
        calculationNotes: [...analysis.manseryeok.calculationNotes, SIX_CHAR_NOTE],
      }
    : undefined
  const base = {
    ...analysis,
    dayMaster,
    dayMasterElement,
    elementCount,
    dominantElement,
    weakElement,
    tenGods,
    usefulGod,
    dayMasterStrength,
    summary: chartSummary(analysis.fourPillars, derived, analysis.manseryeok, analysis.fortune, false),
    manseryeok,
    // 대운(지금 대운 포함)은 그대로 둔다. 10/15 결정: 시간을 몰라도 대운은 참고 PDF처럼 단정해서 쓴다.
  }
  return { ...base, preview: buildPreview(base) }
}

/**
 * 지장간을 AI에게 넘기는 모양(2026-10-15). 계산은 있었지만 리포트 프롬프트에 빠져 있어,
 * AI가 "지장간 값이 제공되지 않았어"라고 고객에게 쓰거나 스스로 계산했다.
 * 24편 비교에서 넘기면 자리별 숨은 글자를 정확히 인용했고(틀림 0), 필요 없는 장에는 영향이 없었다.
 */
// 중기·여기는 비중이 아니라 절기 안의 순서로 정해져(辰·丑·未·戌·巳는 비중 순서와 반대) 비중으로 붙이면 틀린다.
// 비중이 가장 큰 본기만 표시한다(2026-10-15 Codex 리뷰).
function hiddenStemsForPrompt(hiddenStems: HiddenStemInfo[]): SajuFeatureJson['relationshipSignals']['hiddenStems'] {
  return hiddenStems.map(({ pillar, branch, stems }) => ({
    pillar,
    branch,
    stems: [...stems]
      .sort((a, b) => b.weight - a.weight)
      .map(({ stem, tenGod, weight }, index) => ({ stem, tenGod, weight, main: index === 0 })),
  }))
}

/**
 * 신살을 AI에게 넘기는 모양(2026-10-15): 한 줄에 '이름 · 자리 · 기준 · 길흉 · 덧붙임'. 객체로 넘기면
 * 장마다 약 1,500자가 늘어 줄였다. 검수도 같은 목록의 첫 칸(이름)으로 판정한다.
 */
const SHINSAL_NATURE: Record<ShinsalInfo['nature'], string> = { good: '길', bad: '흉', neutral: '중립' }
const SHINSAL_WEIGHT: Record<ShinsalInfo['weight'], string> = { heavy: '무거움', normal: '', light: '가벼움' }
export const SHINSAL_PROMPT_SEPARATOR = ' · '
function shinsalForPrompt(result: ShinsalResult): NonNullable<SajuFeatureJson['relationshipSignals']['shinsal']> {
  const items = result.items.map((s) => [
    s.name,
    `${SHINSAL_PILLAR[s.pillar]}${/^[甲乙丙丁戊己庚辛壬癸]$/.test(s.sign) ? '간' : s.sign.length > 1 ? '주' : '지'} ${s.sign}`,
    s.basis.startsWith('일지') && s.basis.endsWith('짝') ? s.basis : `${s.basis} 기준`,
    SHINSAL_NATURE[s.nature],
    SHINSAL_WEIGHT[s.weight],
    s.self ? '기준 자리 자체' : '',
    s.voidEffect ? (s.voidEffect === 'resolved' ? '공망으로 해소' : '공망으로 약화') : '',
    s.strongGrade ? '정격' : '',
    s.variant ? `이설: ${s.variant}` : '',
  ].filter(Boolean).join(SHINSAL_PROMPT_SEPARATOR))
  const { branches, pillars } = result.kongmang
  return {
    items,
    kongmang: `${branches.join('')}${pillars.length ? ` (${pillars.map((k) => SHINSAL_PILLAR[k]).join('·')}에 걸림)` : ''}`,
    ...(result.undetermined ? { undetermined: result.undetermined } : {}),
  }
}

export function buildSajuFeatureJson(
  analysis: SajuAnalysis,
  context?: SajuReportContext,
): SajuFeatureJson {
  const p = analysis.fourPillars
  const withChart = luckWithChart(analysis)
  return {
    calculation: {
      pillars: {
        year: pillarLabel(p.year),
        month: pillarLabel(p.month),
        day: pillarLabel(p.day),
        hour: pillarLabel(p.hour),
      },
      dayMaster: analysis.dayMaster,
      dayMasterElement: analysis.dayMasterElement,
      dayMasterStrength: analysis.dayMasterStrength,
      dayBoundaryRule: analysis.manseryeok?.dayBoundaryRule,
    },
    balance: {
      elementCount: analysis.elementCount,
      weightedElements: analysis.manseryeok?.weightedElements,
      dominantElement: analysis.dominantElement,
      weakElement: analysis.weakElement,
      usefulElement: analysis.usefulGod,
      usefulElementBasis: analysis.manseryeok?.usefulGodBasis,
      climate: analysis.manseryeok?.climate
        ? {
            season: analysis.manseryeok.climate.season,
            temperature: analysis.manseryeok.climate.temperature,
            moisture: analysis.manseryeok.climate.moisture,
            usefulElements: analysis.manseryeok.climate.usefulElements,
            cautionElements: analysis.manseryeok.climate.cautionElements,
          }
        : undefined,
      flowBridges: analysis.manseryeok?.flowBridges.map((bridge) => ({
        conflict: bridge.conflict,
        bridge: bridge.bridge,
        strength: bridge.strength,
      })) ?? [],
    },
    relationshipSignals: {
      tenGods: analysis.tenGods,
      placements: analysis.manseryeok?.tenGodPlacements ?? [],
      hiddenStems: hiddenStemsForPrompt(analysis.manseryeok?.hiddenStems ?? []),
      interactions: analysis.manseryeok?.interactions ?? [],
      shinsal: analysis.manseryeok?.shinsal ? shinsalForPrompt(analysis.manseryeok.shinsal) : undefined,
      gyeokguk: analysis.manseryeok?.gyeokguk
        ? {
            name: analysis.manseryeok.gyeokguk.name,
            basis: analysis.manseryeok.gyeokguk.basis,
            tenGod: analysis.manseryeok.gyeokguk.tenGod,
            confidence: analysis.manseryeok.gyeokguk.confidence,
          }
        : undefined,
    },
    timing: analysis.fortune
      ? {
          currentYear: analysis.fortune.currentYear,
          yearPillar: analysis.fortune.yearPillar,
          currentDaewoon: analysis.fortune.currentDaewoon,
          direction: analysis.fortune.direction,
          startAge: analysis.fortune.startAge,
          // 1단계(2026-10-14): 계산은 이미 했는데 AI 에 지금 대운·올해 세운만 넘기던 것을 전 구간으로 넘긴다.
          // 3번(2026-10-15): 대운·세운마다 원국과의 합·충·형을 붙인다(연도별 풀이의 근거).
          daewoonList: analysis.fortune.daewoon.map(({ age, pillar, ageStart, startYear }) => ({ age, pillar, ageStart, startYear, withChart: withChart(pillar) })),
          yearlyFlow: analysis.fortune.yearlyFlow?.map((flow) => ({ ...flow, withChart: withChart(flow.pillar) })),
        }
      : undefined,
    userContext: context,
    guardrails: {
      dataPriority: [
        'calculation',
        'timing',
        'interpretation_rules',
        'rag_knowledge_blocks',
        'style_corpus',
      ],
      copyRule: 'Feature JSON is factual input. RAG blocks are judgment hints. Final user copy must be newly written in everyday language.',
      forbiddenClaims: [
        '확정 예언',
        '투자 수익 보장',
        '질병 진단',
        '법률 판단',
        '코퍼스 개인 사례 복사',
      ],
    },
  }
}

export function formatSajuForPrompt(
  analysis: SajuAnalysis,
  context?: SajuReportContext,
): string {
  return [
    '<personal_saju>',
    '<calculation_summary>',
    analysis.summary,
    '',
    `일간 조언: ${analysis.dayMasterAdvice}`,
    '</calculation_summary>',
    '<feature_json>',
    JSON.stringify(buildSajuFeatureJson(analysis, context), null, 2),
    '</feature_json>',
    '</personal_saju>',
  ].join('\n')
}

export { STEM_ELEMENT, ELEMENT_KO, STEM_KO, BRANCH_KO }
