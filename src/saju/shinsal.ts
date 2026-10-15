import { EARTHLY_BRANCHES, HEAVENLY_STEMS } from './calculator.js'
import type { EarthlyBranch, HeavenlyStem, Pillar, ShinsalInfo, ShinsalResult, TenGodPlacement } from '../types/index.js'

/**
 * 신살 계산(2026-10-15). 기준은 자료 조사로 정한 13개 결정(analysis/shinsal-research.html 5장)을 따른다.
 * - 12신살: 연지·일지 둘 다 기준, 결과에 기준을 붙이고 기준 자리 자체(지살·장성·화개)도 센다. 도화는 삼합 기준(연살)만.
 * - 귀인·학당·문창·홍염·양인: 일간 기준. 홍염 乙은 午(이설 申), 양인은 양간만(음간 녹전일지는 이설).
 * - 괴강: 일주 庚辰 庚戌 壬辰 戊戌. 귀문·원진: 일지와 다른 기둥의 짝. 천덕(천간·지지)·월덕(천간): 월지 기준 사주 전체.
 * - 현침: 甲·辛 천간, 卯·午·申 지지. 공망: 일주 기준, 공망 자리의 길신은 약화·흉신은 해소.
 * - 경중은 신살이 걸린 자리로(일·시 무거움, 월 보통, 연 가벼움). 시간을 모르면 연·월·일 3주로만 계산한다.
 */

type PillarKey = TenGodPlacement['pillar']
type ChartPillar = [PillarKey, Pillar]
type Nature = ShinsalInfo['nature']

const TWELVE_SHINSAL: Array<[string, Nature]> = [
  ['겁살', 'bad'], ['재살', 'bad'], ['천살', 'bad'], ['지살', 'neutral'], ['도화(연살)', 'neutral'], ['월살', 'bad'],
  ['망신', 'bad'], ['장성', 'good'], ['반안', 'good'], ['역마', 'good'], ['육해', 'bad'], ['화개', 'neutral'],
]
/** 삼합의 첫 글자(생지) = 지살. 겁살은 지살 세 칸 앞에서 시작한다. */
const TRINE_START: Record<EarthlyBranch, EarthlyBranch> = {
  申: '申', 子: '申', 辰: '申', 寅: '寅', 午: '寅', 戌: '寅', 巳: '巳', 酉: '巳', 丑: '巳', 亥: '亥', 卯: '亥', 未: '亥',
}
const NOBLE: Record<HeavenlyStem, EarthlyBranch[]> = {
  甲: ['丑', '未'], 戊: ['丑', '未'], 庚: ['丑', '未'], 乙: ['子', '申'], 己: ['子', '申'],
  丙: ['亥', '酉'], 丁: ['亥', '酉'], 辛: ['寅', '午'], 壬: ['巳', '卯'], 癸: ['巳', '卯'],
}
/** 학당귀인 = 일간의 장생지(음간은 음생양사). */
const ACADEMY: Record<HeavenlyStem, EarthlyBranch> = { 甲: '亥', 乙: '午', 丙: '寅', 丁: '酉', 戊: '寅', 己: '酉', 庚: '巳', 辛: '子', 壬: '申', 癸: '卯' }
const LITERARY: Record<HeavenlyStem, EarthlyBranch> = { 甲: '巳', 乙: '午', 丙: '申', 丁: '酉', 戊: '申', 己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯' }
const RED_FLAME: Record<HeavenlyStem, EarthlyBranch> = { 甲: '午', 乙: '午', 丙: '寅', 丁: '未', 戊: '辰', 己: '辰', 庚: '戌', 辛: '酉', 壬: '子', 癸: '申' }
const RED_FLAME_VARIANT: Partial<Record<HeavenlyStem, EarthlyBranch>> = { 乙: '申' }
const YANG_BLADE: Partial<Record<HeavenlyStem, EarthlyBranch>> = { 甲: '卯', 丙: '午', 戊: '午', 庚: '酉', 壬: '子' }
/** 음간 양인 이설: 녹 앞 한 지지. */
const YIN_BLADE_VARIANT: Partial<Record<HeavenlyStem, EarthlyBranch>> = { 乙: '辰', 丁: '未', 己: '未', 辛: '戌', 癸: '丑' }
const GOEGANG = new Set(['庚辰', '庚戌', '壬辰', '戊戌'])
const GHOST_GATE: Array<[EarthlyBranch, EarthlyBranch]> = [['子', '酉'], ['丑', '午'], ['寅', '未'], ['卯', '申'], ['辰', '亥'], ['巳', '戌']]
const WONJIN: Array<[EarthlyBranch, EarthlyBranch]> = [['子', '未'], ['丑', '午'], ['寅', '酉'], ['卯', '申'], ['辰', '亥'], ['巳', '戌']]
/** 천덕: 월지별로 찾는 글자(천간 또는 지지). */
const HEAVENLY_VIRTUE: Record<EarthlyBranch, HeavenlyStem | EarthlyBranch> = {
  寅: '丁', 卯: '申', 辰: '壬', 巳: '辛', 午: '亥', 未: '甲', 申: '癸', 酉: '寅', 戌: '丙', 亥: '乙', 子: '巳', 丑: '庚',
}
/** 월덕: 월지 삼합별 천간. */
const MONTHLY_VIRTUE: Record<EarthlyBranch, HeavenlyStem> = {
  寅: '丙', 午: '丙', 戌: '丙', 申: '壬', 子: '壬', 辰: '壬', 亥: '甲', 卯: '甲', 未: '甲', 巳: '庚', 酉: '庚', 丑: '庚',
}
const NEEDLE_STEMS = new Set<HeavenlyStem>(['甲', '辛'])
const NEEDLE_BRANCHES = new Set<EarthlyBranch>(['卯', '午', '申'])

const PILLAR_LABEL: Record<PillarKey, string> = { year: '연', month: '월', day: '일', hour: '시' }
const WEIGHT: Record<PillarKey, ShinsalInfo['weight']> = { year: 'light', month: 'normal', day: 'heavy', hour: 'heavy' }
export const SHINSAL_HOUR_UNKNOWN_NOTE = '출생 시각을 몰라 시주 자리 신살, 일지-시지 귀문·원진, 시지 공망은 판정 불가'

const branchIdx = (b: EarthlyBranch) => EARTHLY_BRANCHES.indexOf(b)

function twelveShinsalName(base: EarthlyBranch, target: EarthlyBranch): [string, Nature] {
  const robbery = (branchIdx(TRINE_START[base]) - 3 + 12) % 12
  return TWELVE_SHINSAL[(branchIdx(target) - robbery + 12) % 12]
}

function pairMatch(pairs: Array<[EarthlyBranch, EarthlyBranch]>, a: EarthlyBranch, b: EarthlyBranch): boolean {
  return pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a))
}

/** 일주의 순(旬)에서 빠진 두 지지. */
export function kongmangBranches(dayStem: HeavenlyStem, dayBranch: EarthlyBranch): [EarthlyBranch, EarthlyBranch] {
  const offset = (branchIdx(dayBranch) - HEAVENLY_STEMS.indexOf(dayStem) + 12) % 12
  return [EARTHLY_BRANCHES[(offset + 10) % 12], EARTHLY_BRANCHES[(offset + 11) % 12]]
}

export function calculateShinsal(chart: ChartPillar[], hourKnown: boolean): ShinsalResult {
  const byKey = Object.fromEntries(chart) as Partial<Record<PillarKey, Pillar>>
  const day = byKey.day!
  const month = byKey.month!
  const items: Array<ShinsalInfo & { onBranch: boolean }> = []
  const add = (item: Omit<ShinsalInfo, 'weight'>, onBranch: boolean) => items.push({ ...item, weight: WEIGHT[item.pillar], onBranch })

  // 12신살: 연지·일지 기준 각각, 모든 기둥(기준 자리 자체 포함)
  for (const baseKey of ['year', 'day'] as const) {
    const base = byKey[baseKey]
    if (!base) continue
    for (const [key, p] of chart) {
      const [name, nature] = twelveShinsalName(base.branch, p.branch)
      add({ name, pillar: key, sign: p.branch, basis: `${PILLAR_LABEL[baseKey]}지 ${base.branch}`, nature, ...(key === baseKey ? { self: true } : {}) }, true)
    }
  }

  // 일간 기준 지지 신살
  const dm = day.stem
  for (const [key, p] of chart) {
    const basis = `일간 ${dm}`
    if (NOBLE[dm].includes(p.branch)) add({ name: '천을귀인', pillar: key, sign: p.branch, basis, nature: 'good' }, true)
    if (ACADEMY[dm] === p.branch) add({ name: '학당귀인', pillar: key, sign: p.branch, basis, nature: 'good' }, true)
    if (LITERARY[dm] === p.branch) add({ name: '문창귀인', pillar: key, sign: p.branch, basis, nature: 'good' }, true)
    if (RED_FLAME[dm] === p.branch) add({ name: '홍염', pillar: key, sign: p.branch, basis, nature: 'neutral' }, true)
    if (RED_FLAME_VARIANT[dm] === p.branch) add({ name: '홍염', pillar: key, sign: p.branch, basis, nature: 'neutral', variant: `${dm} 홍염을 ${p.branch}로 보는 이설` }, true)
    if (YANG_BLADE[dm] === p.branch) add({ name: '양인', pillar: key, sign: p.branch, basis, nature: 'bad' }, true)
    if (YIN_BLADE_VARIANT[dm] === p.branch) add({ name: '양인', pillar: key, sign: p.branch, basis, nature: 'bad', variant: '음간 양인(녹 앞 한 지지) 이설' }, true)
  }

  // 괴강: 일주에서만
  if (GOEGANG.has(`${day.stem}${day.branch}`)) add({ name: '괴강', pillar: 'day', sign: `${day.stem}${day.branch}`, basis: '일주', nature: 'neutral' }, false)

  // 귀문관·원진: 일지와 다른 기둥의 짝
  for (const [key, p] of chart) {
    if (key === 'day') continue
    const basis = `일지 ${day.branch}와 짝`
    if (pairMatch(GHOST_GATE, day.branch, p.branch)) add({ name: '귀문관', pillar: key, sign: p.branch, basis, nature: 'bad' }, true)
    if (pairMatch(WONJIN, day.branch, p.branch)) add({ name: '원진', pillar: key, sign: p.branch, basis, nature: 'bad' }, true)
  }

  // 천덕(천간·지지)·월덕(천간): 월지 기준 사주 전체. 일간에 걸리면 정격.
  const heavenly = HEAVENLY_VIRTUE[month.branch]
  const monthly = MONTHLY_VIRTUE[month.branch]
  for (const [key, p] of chart) {
    const basis = `월지 ${month.branch}`
    if (p.stem === heavenly) add({ name: '천덕귀인', pillar: key, sign: p.stem, basis, nature: 'good', ...(key === 'day' ? { strongGrade: true } : {}) }, false)
    if (p.branch === heavenly) add({ name: '천덕귀인', pillar: key, sign: p.branch, basis, nature: 'good' }, true)
    if (p.stem === monthly) add({ name: '월덕귀인', pillar: key, sign: p.stem, basis, nature: 'good', ...(key === 'day' ? { strongGrade: true } : {}) }, false)
  }

  // 현침: 글자마다
  for (const [key, p] of chart) {
    if (NEEDLE_STEMS.has(p.stem)) add({ name: '현침', pillar: key, sign: p.stem, basis: '천간 글자', nature: 'neutral' }, false)
    if (NEEDLE_BRANCHES.has(p.branch)) add({ name: '현침', pillar: key, sign: p.branch, basis: '지지 글자', nature: 'neutral' }, true)
  }

  // 공망: 일주 기준. 공망 자리 지지에 걸린 길신·중립은 약화, 흉신은 해소.
  const kongmang = kongmangBranches(day.stem, day.branch)
  const voidPillars = chart.filter(([key, p]) => key !== 'day' && kongmang.includes(p.branch)).map(([key]) => key)
  const result: ShinsalInfo[] = items.map(({ onBranch, ...item }) =>
    onBranch && voidPillars.includes(item.pillar) ? { ...item, voidEffect: item.nature === 'bad' ? 'resolved' : 'weakened' } : item,
  )

  return {
    items: result,
    kongmang: { branches: kongmang, pillars: voidPillars },
    ...(hourKnown ? {} : { undetermined: SHINSAL_HOUR_UNKNOWN_NOTE }),
  }
}

/**
 * 글에 쓰인 신살 이름 가운데 계산 목록에 없는 것(2026-10-15 검수 규칙). 일상어와 겹치는 이름은
 * '살'을 붙인 꼴만 잡는다(망신→망신살, 장성→장성살 등). 계산값이 없으면(시간 미상 보류 등) 모든 신살 이름이 대상이다.
 */
const SHINSAL_MENTIONS: Array<[RegExp, string | null]> = [
  [/겁살/, '겁살'], [/재살/, '재살'], [/천살/, '천살'], [/지살/, '지살'], [/월살/, '월살'],
  [/도화(?!지)|연살/, '도화(연살)'], [/망신살/, '망신'], [/장성살/, '장성'], [/반안살/, '반안'], [/역마/, '역마'],
  [/육해살/, '육해'], [/화개/, '화개'], [/천을귀인|천을 ?귀인/, '천을귀인'], [/학당귀인/, '학당귀인'], [/문창/, '문창귀인'],
  [/홍염/, '홍염'], [/(?<![서동])양인(?!들)/, '양인'], [/괴강/, '괴강'], [/귀문/, '귀문관'], [/원진/, '원진'],
  [/천덕/, '천덕귀인'], [/월덕/, '월덕귀인'], [/현침/, '현침'],
  // 계산하지 않는 신살: 쓰면 항상 지어낸 것
  [/백호살|백호대살/, null], [/고신살/, null], [/과숙살/, null], [/급각살/, null],
]

/** computed: 계산된 신살 이름 목록(ShinsalResult 또는 이름 배열). 없으면 모든 신살 이름이 지어낸 것이다. */
export function inventedShinsalNames(text: string, computed?: ShinsalResult | string[]): string[] {
  const names = new Set(Array.isArray(computed) ? computed : computed?.items.map((item) => item.name) ?? [])
  return SHINSAL_MENTIONS
    .filter(([pattern, name]) => pattern.test(text) && (name === null || !names.has(name)))
    .map(([pattern]) => text.match(pattern)![0])
}
