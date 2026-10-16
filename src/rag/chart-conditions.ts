import type { Element, RagChartCondition, RagTenGodName, SajuAnalysis, TenGod } from '../types/index.js'

/**
 * 참고서 블록의 "조건 → 뜻" 갈래를 그 사람 계산값과 맞춰 보는 판정(2026-10-16).
 *
 * 10/15 A/B 에서 블록을 통째로 주니 약한 일간에게 "강한 일간" 조각이 섞이고 세 사람 결론이 비슷해졌다.
 * 그래서 맞지 않는 갈래·블록은 AI 에게 보내기 전에 코드에서 뺀다. 판정은 계산값만 보고, 문장은 보지 않는다.
 *
 * 규칙: 조건의 항목끼리는 모두 맞아야 하고(그리고), 한 항목 안의 값은 하나만 맞아도 된다(또는).
 * 계산값을 쓰지 않는 경우(시간 모름 보류 모드 등)에는 명식 조건이 있는 갈래·블록을 모두 뺀다.
 */

const TEN_GOD_GROUPS: Record<string, TenGod[]> = {
  비겁: ['비견', '겁재'],
  식상: ['식신', '상관'],
  재성: ['편재', '정재'],
  관성: ['편관', '정관'],
  인성: ['편인', '정인'],
}

/** 오행 개수(겉 여덟 글자, 시주를 모르면 여섯 글자)가 이 값 이상이면 "많음"으로 본다. */
export const ELEMENT_MANY_COUNT = 3
/** 십신이 겉 천간·지지 본기 자리에 이 수 이상이면 "많음"으로 본다. */
export const TEN_GOD_MANY_COUNT = 3

export interface ChartFacts {
  dayMaster: SajuAnalysis['dayMaster']
  dayMasterElement: Element
  dayMasterStrength: SajuAnalysis['dayMasterStrength']
  dominantElement: Element
  weakElement: Element
  elementCount: SajuAnalysis['elementCount']
  usefulGod: Element | null
  /** 겉 천간과 지장간 어디든 있는 십신 */
  presentTenGods: Set<TenGod>
  /** 겉 천간 + 지지 본기 자리의 십신 개수 */
  mainTenGodCount: Map<TenGod, number>
  season?: string
  temperature?: string
  gyeokgukTenGod?: TenGod
  interactionTypes: Set<string>
  hasFlowBridge: boolean
}

export function chartFacts(saju: SajuAnalysis): ChartFacts {
  const meta = saju.manseryeok
  const surface: TenGod[] = meta?.tenGodPlacements.map((item) => item.tenGod) ?? saju.tenGods
  const hidden = meta?.hiddenStems ?? []
  const main = hidden
    .map((item) => [...item.stems].sort((a, b) => b.weight - a.weight)[0]?.tenGod)
    .filter((tenGod): tenGod is TenGod => Boolean(tenGod))
  const all = [...surface, ...hidden.flatMap((item) => item.stems.map((stem) => stem.tenGod))]
    .filter((tenGod): tenGod is TenGod => Boolean(tenGod))
  const mainTenGodCount = new Map<TenGod, number>()
  for (const tenGod of [...surface, ...main]) mainTenGodCount.set(tenGod, (mainTenGodCount.get(tenGod) ?? 0) + 1)
  return {
    dayMaster: saju.dayMaster,
    dayMasterElement: saju.dayMasterElement,
    dayMasterStrength: saju.dayMasterStrength,
    dominantElement: saju.dominantElement,
    weakElement: saju.weakElement,
    elementCount: saju.elementCount,
    usefulGod: saju.usefulGod,
    presentTenGods: new Set(all),
    mainTenGodCount,
    season: meta?.climate.season,
    temperature: meta?.climate.temperature,
    gyeokgukTenGod: meta?.gyeokguk.tenGod,
    interactionTypes: new Set(meta?.interactions.map((item) => item.type) ?? []),
    hasFlowBridge: (meta?.flowBridges.length ?? 0) > 0,
  }
}

function tenGodsOf(name: RagTenGodName): TenGod[] {
  return TEN_GOD_GROUPS[name] ?? [name as TenGod]
}

function groupCount(facts: ChartFacts, name: RagTenGodName): number {
  return tenGodsOf(name).reduce((total, tenGod) => total + (facts.mainTenGodCount.get(tenGod) ?? 0), 0)
}

function some<T>(values: T[] | undefined, test: (value: T) => boolean): boolean {
  return values === undefined || values.some(test)
}

const CHART_KEYS: Array<keyof RagChartCondition> = [
  'dayMaster', 'dayMasterElement', 'dayMasterStrength', 'dominantElement', 'weakElement',
  'elementMany', 'elementMissing', 'tenGodPresent', 'tenGodAbsent', 'tenGodMany', 'usefulGod',
  'season', 'temperature', 'gyeokgukTenGod', 'interaction', 'flowBridge',
]

export const RAG_CONDITION_KEYS: Array<keyof RagChartCondition> = [...CHART_KEYS, 'birthTimeKnown']

export function usesChartValues(condition: RagChartCondition): boolean {
  return CHART_KEYS.some((key) => condition[key] !== undefined)
}

/**
 * 조건이 이 사람에게 맞는지. facts 가 null 이면 명식을 읽지 않는 경우라, 명식 조건이 하나라도 있으면 맞지 않는다.
 */
export function matchesChartCondition(
  condition: RagChartCondition | undefined,
  facts: ChartFacts | null,
  birthTimeKnown: boolean,
): boolean {
  if (!condition) return true
  // 모르는 조건 키(오타 등)는 맞지 않는 것으로 본다. 그냥 두면 조건이 없는 셈이 되어 누구에게나 간다.
  if (Object.keys(condition).some((key) => !RAG_CONDITION_KEYS.includes(key as keyof RagChartCondition))) return false
  if (condition.birthTimeKnown !== undefined && condition.birthTimeKnown !== birthTimeKnown) return false
  if (!usesChartValues(condition)) return true
  if (!facts) return false
  return some(condition.dayMaster, (value) => facts.dayMaster === value)
    && some(condition.dayMasterElement, (value) => facts.dayMasterElement === value)
    && some(condition.dayMasterStrength, (value) => facts.dayMasterStrength === value)
    && some(condition.dominantElement, (value) => facts.dominantElement === value)
    && some(condition.weakElement, (value) => facts.weakElement === value)
    && some(condition.elementMany, (value) => facts.elementCount[value] >= ELEMENT_MANY_COUNT)
    && some(condition.elementMissing, (value) => facts.elementCount[value] === 0)
    && some(condition.tenGodPresent, (value) => tenGodsOf(value).some((tenGod) => facts.presentTenGods.has(tenGod)))
    && some(condition.tenGodAbsent, (value) => tenGodsOf(value).every((tenGod) => !facts.presentTenGods.has(tenGod)))
    && some(condition.tenGodMany, (value) => groupCount(facts, value) >= TEN_GOD_MANY_COUNT)
    && some(condition.usefulGod, (value) => facts.usefulGod === value)
    && some(condition.season, (value) => facts.season === value)
    && some(condition.temperature, (value) => facts.temperature === value)
    && some(condition.gyeokgukTenGod, (value) => Boolean(facts.gyeokgukTenGod && tenGodsOf(value).includes(facts.gyeokgukTenGod)))
    && some(condition.interaction, (value) => facts.interactionTypes.has(value))
    && (condition.flowBridge === undefined || condition.flowBridge === facts.hasFlowBridge)
}
