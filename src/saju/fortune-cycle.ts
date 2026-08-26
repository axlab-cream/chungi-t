import type { BirthInput, FortuneCycle } from '../types/index.js'
import { buildPillar, calculateStemBranchIndices } from './calculator.js'

function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}

/** O(n) — 10년 단위 대운 (순행/역행) */
export function calculateFortuneCycle(birth: BirthInput): FortuneCycle {
  const indices = calculateStemBranchIndices(birth)
  const currentYear = new Date().getFullYear()
  const currentYearStemIdx = mod(currentYear - 4, 10)
  const currentYearBranchIdx = mod(currentYear - 4, 12)
  const yearPillar = buildPillar(currentYearStemIdx, currentYearBranchIdx)

  const birthYearStemIdx = mod(birth.year - 4, 10)
  const isYangYear = birthYearStemIdx % 2 === 0
  const isForward = (birth.gender === 'male' && isYangYear) || (birth.gender === 'female' && !isYangYear)

  const startAge = 3
  const daewoon: FortuneCycle['daewoon'] = []

  for (let i = 0; i < 8; i++) {
    const step = isForward ? i + 1 : -(i + 1)
    const mStem = mod(indices.month.stemIdx + step, 10)
    const mBranch = mod(indices.month.branchIdx + step, 12)
    const p = buildPillar(mStem, mBranch)
    const ageStart = startAge + i * 10
    daewoon.push({
      age: `${ageStart}~${ageStart + 9}세`,
      pillar: `${p.stem}${p.branch}`,
    })
  }

  const age = currentYear - birth.year
  const daewoonIdx = Math.min(Math.max(Math.floor((age - startAge) / 10), 0), daewoon.length - 1)
  const currentDaewoon = daewoon[daewoonIdx]?.pillar ?? daewoon[0].pillar

  return {
    currentYear,
    yearPillar: `${yearPillar.stem}${yearPillar.branch}`,
    daewoon,
    currentDaewoon,
  }
}

export function formatFortuneForPrompt(fortune: FortuneCycle): string {
  return [
    `올해(${fortune.currentYear}) 세운: ${fortune.yearPillar}`,
    `현재 대운: ${fortune.currentDaewoon}`,
    `대운 흐름: ${fortune.daewoon.map((d) => `${d.age} ${d.pillar}`).join(' → ')}`,
  ].join('\n')
}
