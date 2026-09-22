import type { BirthInput, EarthlyBranch, FortuneCycle } from '../types/index.js'
import { buildPillar, calculateStemBranchIndices, getDaewoonStartInfo, resolveBirthDate } from './calculator.js'

function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}

const SAMJAE_GROUPS: Array<{ birth: EarthlyBranch[]; period: EarthlyBranch[] }> = [
  { birth: ['申', '子', '辰'], period: ['寅', '卯', '辰'] },
  { birth: ['寅', '午', '戌'], period: ['申', '酉', '戌'] },
  { birth: ['亥', '卯', '未'], period: ['巳', '午', '未'] },
  { birth: ['巳', '酉', '丑'], period: ['亥', '子', '丑'] },
]
const EARTHLY_BRANCHES: EarthlyBranch[] = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

/**
 * 출생 년주의 지지와 절기 기준 해의 지지로 삼재 기간만 계산한다.
 * 좋고 나쁜 사건·점수는 만들지 않으며, 화면은 이 결과를 전통적인 연도 분류로만 안내한다.
 */
export function calculateSamjaeCycle(birthBranch: EarthlyBranch, pillarYear: number): NonNullable<FortuneCycle['samjae']> {
  const group = SAMJAE_GROUPS.find((item) => item.birth.includes(birthBranch))
  if (!group) throw new Error(`Unsupported birth branch: ${birthBranch}`)

  const currentBranchIndex = mod(pillarYear - 4, 12)
  const periodBranchIndex = EARTHLY_BRANCHES.indexOf(group.period[0])
  const difference = mod(currentBranchIndex - periodBranchIndex, 12)
  const active = difference <= 2
  const periodStartYear = active ? pillarYear - difference : pillarYear + (12 - difference)

  return {
    status: active ? 'current' : 'next',
    phase: active ? (['entering', 'middle', 'leaving'] as const)[difference] : null,
    periodStartYear,
    periodEndYear: periodStartYear + 2,
    branches: group.period,
  }
}

/** O(n) — 절기 기반 대운 흐름 */
export function calculateFortuneCycle(birth: BirthInput): FortuneCycle {
  const indices = calculateStemBranchIndices(birth)
  const resolved = resolveBirthDate(birth)
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentIndices = calculateStemBranchIndices({
    year: currentYear,
    month: now.getMonth() + 1,
    day: now.getDate(),
    hour: 12,
    gender: birth.gender,
    calendar: 'solar',
  })
  const yearPillar = buildPillar(currentIndices.year.stemIdx, currentIndices.year.branchIdx)

  const isYangYear = indices.year.stemIdx % 2 === 0
  const isForward = (birth.gender === 'male' && isYangYear) || (birth.gender === 'female' && !isYangYear)
  const direction: FortuneCycle['direction'] = isForward ? 'forward' : 'backward'
  const startInfo = getDaewoonStartInfo(birth, isForward)
  const startAge = startInfo.age
  const daewoon: FortuneCycle['daewoon'] = []

  for (let i = 0; i < 10; i++) {
    const step = isForward ? i + 1 : -(i + 1)
    const mStem = mod(indices.month.stemIdx + step, 10)
    const mBranch = mod(indices.month.branchIdx + step, 12)
    const p = buildPillar(mStem, mBranch)
    const ageStart = startAge + i * 10
    const ageEnd = ageStart + 9
    daewoon.push({
      age: `${ageStart}~${ageEnd}세`,
      ageStart,
      ageEnd,
      startYear: resolved.solarYear + ageStart,
      pillar: `${p.stem}${p.branch}`,
    })
  }

  const age = currentYear - resolved.solarYear
  const daewoonIdx = Math.min(Math.max(Math.floor((age - startAge) / 10), 0), daewoon.length - 1)
  const currentDaewoon = daewoon[daewoonIdx]?.pillar ?? daewoon[0].pillar

  return {
    currentYear,
    yearPillar: `${yearPillar.stem}${yearPillar.branch}`,
    daewoon,
    currentDaewoon,
    samjae: calculateSamjaeCycle(buildPillar(indices.year.stemIdx, indices.year.branchIdx).branch, currentIndices.pillarYear),
    direction,
    startAge,
    startAgeText: startInfo.text,
  }
}

export function formatFortuneForPrompt(fortune: FortuneCycle): string {
  return [
    `올해(${fortune.currentYear}) 세운: ${fortune.yearPillar}`,
    `대운 방향: ${fortune.direction === 'forward' ? '순행' : '역행'}, 시작 나이: ${fortune.startAgeText ?? `약 ${fortune.startAge ?? '-'}세`}`,
    `현재 대운: ${fortune.currentDaewoon}`,
    `대운 흐름: ${fortune.daewoon.map((d) => `${d.age}(${d.startYear ?? '-'}년~) ${d.pillar}`).join(' → ')}`,
  ].join('\n')
}
