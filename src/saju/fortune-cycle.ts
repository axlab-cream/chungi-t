import type { BirthInput, FortuneCycle } from '../types/index.js'
import { buildPillar, calculateStemBranchIndices, getDaewoonStartInfo, resolveBirthDate } from './calculator.js'

function mod(n: number, m: number): number {
  return ((n % m) + m) % m
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
