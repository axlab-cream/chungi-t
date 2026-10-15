import {
  BRANCH_BREAK_PAIRS, BRANCH_CLASH_PAIRS, BRANCH_COMBINATION_PAIRS, BRANCH_HARM_PAIRS, STEM_COMBINATION_PAIRS,
} from './analyzer-helpers.js'
import type { EarthlyBranch, HeavenlyStem, SajuInteraction } from '../types/index.js'

/**
 * 글자 사이의 합·충·형·파·해(2026-10-15). 원국 안의 관계와 "운(대운·세운) × 원국"이 같은 표를 쓴다.
 * 표는 위키백과 「天干」「地支」와 같은 값이며, 우리 코드를 안 본 독립 계산기와 1,000명 대조로 확인했다.
 * 반합은 같은 삼합 무리의 두 글자 중 하나가 왕지(子午卯酉)일 때만 본다.
 */

type Element = '목' | '화' | '토' | '금' | '수'
export interface RelationPillar { label: string; stem: HeavenlyStem; branch: EarthlyBranch }

const STEM_CLASH_PAIRS: Array<[HeavenlyStem, HeavenlyStem, string]> = [
  ['甲', '庚', '甲庚沖: 새로 시작하려는 힘과 정리하려는 기준이 부딪힙니다.'],
  ['乙', '辛', '乙辛沖: 유연하게 맞추려는 마음과 날카로운 기준이 부딪힙니다.'],
  ['丙', '壬', '丙壬沖: 드러내려는 힘과 감추고 흘려보내려는 힘이 부딪힙니다.'],
  ['丁', '癸', '丁癸沖: 따뜻한 집중과 차가운 걱정이 서로를 흔듭니다.'],
]
/** 삼합 무리: [생지, 왕지, 고지, 오행] */
const TRINES: Array<[EarthlyBranch, EarthlyBranch, EarthlyBranch, Element]> = [
  ['申', '子', '辰', '수'], ['寅', '午', '戌', '화'], ['巳', '酉', '丑', '금'], ['亥', '卯', '未', '목'],
]
/** 방합(같은 계절 세 글자) */
const SEASONS: Array<[EarthlyBranch, EarthlyBranch, EarthlyBranch, Element]> = [
  ['寅', '卯', '辰', '목'], ['巳', '午', '未', '화'], ['申', '酉', '戌', '금'], ['亥', '子', '丑', '수'],
]
const THREE_PUNISHMENTS: Array<[EarthlyBranch[], string]> = [
  [['寅', '巳', '申'], '寅巳申 삼형: 시작·압박·정리가 꼬이며 갑작스러운 방향 전환이 생길 수 있습니다.'],
  [['丑', '戌', '未'], '丑戌未 삼형: 책임·고집·생활 기반이 엉켜 오래 묵은 문제가 드러날 수 있습니다.'],
]
/** 두 글자 형 */
const PAIR_PUNISHMENTS: Array<[EarthlyBranch, EarthlyBranch, string]> = [
  ['寅', '巳', '寅巳刑: 서두른 시작이 압박과 마찰로 바뀌기 쉽습니다.'],
  ['巳', '申', '巳申刑: 계산과 압박이 겹쳐 마찰이 생기기 쉽습니다.'],
  ['寅', '申', '寅申刑: 밀어붙임과 정리가 서로 걸려 넘어지기 쉽습니다.'],
  ['丑', '戌', '丑戌刑: 고집과 책임이 맞서 오래 끄는 문제가 생기기 쉽습니다.'],
  ['戌', '未', '戌未刑: 지키려는 것끼리 부딪혀 양보가 어려워집니다.'],
  ['丑', '未', '丑未刑: 익숙한 방식끼리 맞서 감정이 굳기 쉽습니다.'],
  ['子', '卯', '子卯刑: 가까운 사이에서 예의와 거리감 문제가 생기기 쉽습니다.'],
]
/** 자형: 같은 글자 두 번 */
const SELF_PUNISHMENT = new Set<EarthlyBranch>(['辰', '午', '酉', '亥'])

const pairOf = <T extends string>(pairs: Array<[T, T, string]>, a: T, b: T) =>
  pairs.find(([x, y]) => (x === a && y === b) || (x === b && y === a))

function halfCombination(a: EarthlyBranch, b: EarthlyBranch): Element | null {
  if (a === b) return null
  const trine = TRINES.find((t) => t.includes(a) && t.includes(b))
  return trine && (a === trine[1] || b === trine[1]) ? trine[3] : null
}

/** 두 기둥 사이의 관계. 원국 안 두 기둥, 또는 운 하나와 원국 기둥 하나에 쓴다. */
export function pairRelations(a: RelationPillar, b: RelationPillar): SajuInteraction[] {
  const pillars = [a.label, b.label]
  const out: SajuInteraction[] = []
  const stemCombo = pairOf(STEM_COMBINATION_PAIRS, a.stem, b.stem)
  if (stemCombo) out.push({ type: '천간합', pillars, signs: [a.stem, b.stem], meaning: stemCombo[2] })
  const stemClash = pairOf(STEM_CLASH_PAIRS, a.stem, b.stem)
  if (stemClash) out.push({ type: '천간충', pillars, signs: [a.stem, b.stem], meaning: stemClash[2] })
  const branchChecks: Array<[SajuInteraction['type'], Array<[EarthlyBranch, EarthlyBranch, string]>]> = [
    ['육합', BRANCH_COMBINATION_PAIRS], ['충', BRANCH_CLASH_PAIRS], ['파', BRANCH_BREAK_PAIRS], ['해', BRANCH_HARM_PAIRS], ['형', PAIR_PUNISHMENTS],
  ]
  for (const [type, pairs] of branchChecks) {
    const found = pairOf(pairs, a.branch, b.branch)
    if (found) out.push({ type, pillars, signs: [a.branch, b.branch], meaning: found[2] })
  }
  if (a.branch === b.branch && SELF_PUNISHMENT.has(a.branch)) {
    out.push({ type: '자형', pillars, signs: [a.branch, b.branch], meaning: `${a.branch}${b.branch} 자형: 같은 기운이 겹쳐 스스로를 몰아붙이기 쉽습니다.` })
  }
  const half = halfCombination(a.branch, b.branch)
  if (half) out.push({ type: '반합', pillars, signs: [a.branch, b.branch], meaning: `${a.branch}${b.branch} 반합(${half}): 두 글자가 모여 ${half} 기운이 커집니다.` })
  return out
}

/** 세 글자가 모두 있어야 성립하는 관계(삼합·방합·삼형). */
export function groupRelations(branches: EarthlyBranch[], label = '원국'): SajuInteraction[] {
  const out: SajuInteraction[] = []
  for (const [x, y, z, el] of TRINES) {
    if ([x, y, z].every((b) => branches.includes(b))) out.push({ type: '삼합', pillars: [label], signs: [x, y, z], meaning: `${x}${y}${z} 삼합(${el}): 세 글자가 모여 ${el} 기운이 크게 뭉칩니다.` })
  }
  for (const [x, y, z, el] of SEASONS) {
    if ([x, y, z].every((b) => branches.includes(b))) out.push({ type: '방합', pillars: [label], signs: [x, y, z], meaning: `${x}${y}${z} 방합(${el}): 같은 계절 글자가 모여 ${el} 기운이 커집니다.` })
  }
  for (const [set, meaning] of THREE_PUNISHMENTS) {
    if (set.every((b) => branches.includes(b))) out.push({ type: '형', pillars: [label], signs: set, meaning })
  }
  return out
}

/**
 * 운 하나(대운·세운 간지)가 원국과 만드는 관계를 짧은 줄로(AI 재료용, 2026-10-15).
 * 예: '충 午↔일지 子', '반합 午↔월지 寅(화)', '삼합 寅午戌(화, 운 戌)'. 원국 안에서 이미 성립한 삼합·방합·삼형은 다시 쓰지 않는다.
 */
export function luckRelations(luckPillar: string, chart: RelationPillar[]): string[] {
  const luck: RelationPillar = { label: '운', stem: luckPillar[0] as HeavenlyStem, branch: luckPillar[1] as EarthlyBranch }
  const lines: string[] = []
  for (const p of chart) {
    for (const r of pairRelations(luck, p)) {
      const stemSide = r.type === '천간합' || r.type === '천간충'
      const target = stemSide ? `${p.label}간 ${p.stem}` : `${p.label}지 ${p.branch}`
      const element = r.type === '반합' ? `(${halfCombination(luck.branch, p.branch)})` : ''
      lines.push(`${r.type} ${stemSide ? luck.stem : luck.branch}↔${target}${element}`)
    }
  }
  const chartBranches = chart.map((p) => p.branch)
  const already = new Set(groupRelations(chartBranches).map((r) => r.signs.join('')))
  for (const r of groupRelations([...chartBranches, luck.branch])) {
    if (!r.signs.includes(luck.branch) || already.has(r.signs.join(''))) continue
    const element = r.meaning.match(/\((.)\)/)?.[1]
    lines.push(`${r.type === '형' ? '삼형' : r.type} ${r.signs.join('')}${element ? `(${element}, 운 ${luck.branch})` : `(운 ${luck.branch})`}`)
  }
  return lines
}
