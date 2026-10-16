import bank from '../../data/teaser/free-preview-saju-master.json' with { type: 'json' }
import runtimeConfig from '../../data/runtime-config.json' with { type: 'json' }
import { normalizeServiceKey } from '../prompt/service-system.js'
import { chartFacts } from '../rag/chart-conditions.js'
import { getTenGod } from '../saju/analyzer.js'
import { BRANCH_ELEMENT } from '../saju/analyzer-helpers.js'
import type { BirthInput, EarthlyBranch, Element, HeavenlyStem, SajuAnalysis, TenGod } from '../types/index.js'

/**
 * 무료 미리보기 개인 문단(2026-10-16 확정). AI 없이 미리 써 둔 문장 묶음에서 칸마다 계산값으로 한 문장씩 고른다.
 *
 * - 같은 사람은 늘 같은 문장을 받는다(출생값으로 정한 씨앗). 올해 칸은 씨앗에 해를 넣어 해가 바뀌면 바뀐다.
 * - 올해·요즘·대운 칸은 그날 기준 계산값(analysis.fortune)을 쓴다. 해 경계는 계산기가 정한 입춘.
 * - 시간을 모르면 대운 시점이 흔들려 대운 칸 대신 올해 기운으로 고른다.
 * - 연애 첫 줄 화자는 기본/여성 둘. 켜고 끄는 값은 data/runtime-config.json freePreview.loveSpeaker.
 */

export const GROUPS = ['관성', '재성', '식상', '비겁', '인성'] as const
export type TenGodGroup = typeof GROUPS[number]
export type LoveSpeaker = 'base' | 'female'
export type LuckStage = 'new' | 'early' | 'mid' | 'late'
type Bank = typeof bank

const GROUP_OF: Record<TenGod, TenGodGroup> = {
  비견: '비겁', 겁재: '비겁', 식신: '식상', 상관: '식상', 편재: '재성', 정재: '재성', 편관: '관성', 정관: '관성', 편인: '인성', 정인: '인성',
}
/** 반합·삼합으로 일지가 다른 기운으로 모일 때의 기운. 연애 첫 결(start 칸)은 모인 기운으로 본다. */
const TRIAD_ELEMENT: Array<[EarthlyBranch[], Element]> = [
  [['申', '子', '辰'], 'water'], [['亥', '卯', '未'], 'wood'], [['寅', '午', '戌'], 'fire'], [['巳', '酉', '丑'], 'metal'],
]
/** 대운에 들어선 뒤 몇 해째인지로 나눈 시점. 0해 막 바뀜 / 1~2해 초입 / 3~7해 한창 / 8해부터 끝 무렵. */
const STAGE_EARLY_FROM = 1
const STAGE_MID_FROM = 3
const STAGE_LATE_FROM = 8

export interface FreePreviewFacts {
  dayMaster: HeavenlyStem
  strength: SajuAnalysis['dayMasterStrength']
  element: Element
  topGroup: TenGodGroup
  weakGroup: TenGodGroup
  /** 지금 운의 기운. 시간을 알면 대운 천간, 모르면 올해 천간 기준. */
  luckGroup: TenGodGroup
  /** 시간을 모르면 null(대운 시점이 흔들린다). */
  luckStage: LuckStage | null
  yearGroup: TenGodGroup
  moneyBowl: keyof Bank['money']['bowl']
  loveElement: Element
  currentYear: number
}

export interface FreePreview {
  version: string
  speaker: LoveSpeaker
  /** 문단 목록. 연애 첫 문단에는 {이름} 자리가 남아 있다(이름이 없으면 화면에서 "{이름}, "째로 뺀다). */
  now: string[]
  luck: string[]
  money: string[]
  love: string[]
}

function stemGroup(dayMaster: HeavenlyStem, stem: string): TenGodGroup | null {
  return /^[甲乙丙丁戊己庚辛壬癸]$/.test(stem) ? GROUP_OF[getTenGod(dayMaster, stem as HeavenlyStem)] : null
}

export function freePreviewFacts(analysis: SajuAnalysis, birthTimeKnown: boolean): FreePreviewFacts | null {
  const fortune = analysis.fortune
  const yearGroup = fortune ? stemGroup(analysis.dayMaster, fortune.yearPillar.charAt(0)) : null
  if (!fortune || !yearGroup) return null
  const facts = chartFacts(analysis)
  const count = (group: TenGodGroup) => [...facts.mainTenGodCount].reduce((total, [tenGod, n]) => total + (GROUP_OF[tenGod] === group ? n : 0), 0)
  const present = (group: TenGodGroup) => [...facts.presentTenGods].some((tenGod) => GROUP_OF[tenGod] === group)
  // 동점이면 GROUPS 순서. 가장 많은 기운이 하나뿐이어도(최대 1개) 그 묶음을 쓴다.
  const topGroup = GROUPS.reduce((best, group) => (count(group) > count(best) ? group : best), GROUPS[0])
  const rest = GROUPS.filter((group) => group !== topGroup)
  const weakGroup = rest.find((group) => !present(group)) ?? rest.reduce((low, group) => (count(group) < count(low) ? group : low), rest[0])

  let luckGroup = yearGroup
  let luckStage: LuckStage | null = null
  const current = birthTimeKnown ? fortune.daewoon.find((row) => row.pillar === fortune.currentDaewoon) : undefined
  const daewoonGroup = current ? stemGroup(analysis.dayMaster, current.pillar.charAt(0)) : null
  if (current && daewoonGroup && Number.isFinite(current.startYear)) {
    const years = fortune.currentYear - (current.startYear as number)
    luckGroup = daewoonGroup
    luckStage = years >= STAGE_LATE_FROM ? 'late' : years >= STAGE_MID_FROM ? 'mid' : years >= STAGE_EARLY_FROM ? 'early' : 'new'
  }

  const wealth = count('재성')
  const shown = (analysis.manseryeok?.tenGodPlacements ?? []).some((item) => GROUP_OF[item.tenGod] === '재성')
  const moneyBowl = !present('재성') ? 'none' : `${wealth >= 3 ? 'many' : 'some'}_${shown ? 'shown' : 'hidden'}` as const

  const dayBranch = analysis.fourPillars.day.branch
  const triad = (analysis.manseryeok?.interactions ?? [])
    .filter((item) => (item.type === '반합' || item.type === '삼합') && item.pillars.includes('일주'))
    .map((item) => TRIAD_ELEMENT.find(([members]) => item.signs.every((sign) => members.includes(sign as EarthlyBranch)))?.[1])
    .find(Boolean)

  return {
    dayMaster: analysis.dayMaster,
    strength: analysis.dayMasterStrength,
    element: analysis.dayMasterElement,
    topGroup,
    weakGroup,
    luckGroup,
    luckStage,
    yearGroup,
    moneyBowl,
    loveElement: triad ?? BRANCH_ELEMENT[dayBranch],
    currentYear: fortune.currentYear,
  }
}

/** FNV-1a. 같은 입력이면 같은 수(서버를 다시 띄워도 같다). */
function hash(text: string): number {
  let value = 0x811c9dc5
  for (const char of text) {
    value ^= char.codePointAt(0) ?? 0
    value = Math.imul(value, 0x01000193) >>> 0
  }
  return value
}

export function birthSeed(birth: Pick<BirthInput, 'year' | 'month' | 'day' | 'hour' | 'minute' | 'gender'>, birthTimeKnown: boolean): string {
  return [birth.year, birth.month, birth.day, birthTimeKnown ? birth.hour : '', birthTimeKnown ? birth.minute : '', birth.gender].join('-')
}

export function buildFreePreview(analysis: SajuAnalysis, seed: string, birthTimeKnown: boolean, speaker: LoveSpeaker): FreePreview | null {
  const facts = freePreviewFacts(analysis, birthTimeKnown)
  if (!facts) return null
  const pick = <T>(list: readonly T[], slot: string): T => list[hash(`${seed}|${slot}`) % list.length]
  const index = (size: number, slot: string) => hash(`${seed}|${slot}`) % size
  const yearSlot = (slot: string) => `${slot}|${facts.currentYear}`

  // 대운·재물 끝맺음은 한 화면에서 겹치지 않게, 첫 낱말도 다르게("거기서부턴 ~" 두 줄이 같이 나오지 않게).
  const endings = bank.endings
  const luckEnd = index(endings.length, yearSlot('end'))
  const firstWord = (text: string) => text.split(' ')[0]
  const moneyChoices = endings.filter((text) => firstWord(text) !== firstWord(endings[luckEnd]))
  const moneyEnding = moneyChoices[index(moneyChoices.length, yearSlot('end2'))]

  // 박스 안 문단 나누기(2026-10-16): 지금 너는 = 겉과 속 / 습관+마음 / 요즘.
  const now = [
    [bank.now.outer[facts.dayMaster][facts.strength]],
    [pick(bank.now.habit[facts.topGroup], 'habit'), pick(bank.now.want[facts.weakGroup], 'want')],
    [pick(bank.now.lately[facts.luckGroup], yearSlot('lately'))],
  ]

  // 대운 = 팔자 그림+시점 / 강점+그림 / 질문 / 끝맺음(끝맺음은 따로 한 줄).
  const luck = [
    [pick(bank.luck.open[facts.element], 'open'), facts.luckStage ? bank.luck.phase[facts.luckStage][facts.luckGroup] : bank.luck.phaseYear[facts.yearGroup]],
    [pick(bank.luck.strength[facts.element], 'strength'), pick(bank.luck.picture[facts.luckGroup], 'picture')],
    [pick(bank.luck.ask, yearSlot('luck-ask'))],
    [endings[luckEnd]],
  ]

  const bowl = pick(bank.money.bowl[facts.moneyBowl], 'bowl')
  const tease = index(bank.money.tease.length, 'tease')
  // 재물 = 돈 그릇(+새는 데) / 질문 / 끝맺음.
  const money = facts.moneyBowl === 'none'
    ? [[bowl], [pick(bank.money.ask.none, 'money-ask')], [moneyEnding]]
    : [[bowl, bank.money.tease[tease]], [bank.money.ask.has[tease]], [moneyEnding]]

  // 어긋난 행동(act)과 마지막 질문(ask)은 같은 변형 번호를 쓴다(짝).
  const act = index(bank.love.act[facts.topGroup].length, 'act')
  const love = [
    [pick(bank.love.open[speaker][facts.topGroup], 'love-open'), pick(bank.love.start[facts.loveElement], 'love-start')],
    [bank.love.act[facts.topGroup][act]],
    [pick(bank.love.hole[facts.topGroup], 'hole'), pick(bank.love.year[facts.yearGroup], yearSlot('love-year'))],
    [bank.love.ask[facts.topGroup][act]],
  ]

  const paragraph = (lines: string[]) => lines.join(' ')
  return { version: bank.version, speaker, now: now.map(paragraph), luck: luck.map(paragraph), money: money.map(paragraph), love: love.map(paragraph) }
}

/** 켠 서비스(runtime-config freePreview.services)만 무료 미리보기 문단을 만든다. 화자도 같은 설정에서 고른다. */
export function freePreviewForService(
  analysis: SajuAnalysis,
  birth: Pick<BirthInput, 'year' | 'month' | 'day' | 'hour' | 'minute' | 'gender'>,
  context: { serviceKey?: string | null; birthTimeKnown?: boolean },
): FreePreview | undefined {
  const config = runtimeConfig.freePreview
  // 천명은 서비스 키 없이 오기도 한다(빈 키 = saju_master).
  if (!config.services.includes(normalizeServiceKey(context.serviceKey))) return undefined
  const known = context.birthTimeKnown !== false
  const speaker: LoveSpeaker = config.loveSpeaker === 'female' ? 'female' : 'base'
  return buildFreePreview(analysis, birthSeed(birth, known), known, speaker) ?? undefined
}
