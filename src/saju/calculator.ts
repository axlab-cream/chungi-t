import type { BirthInput, EarthlyBranch, HeavenlyStem, Pillar } from '../types/index.js'

const HEAVENLY_STEMS: HeavenlyStem[] = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const EARTHLY_BRANCHES: EarthlyBranch[] = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

/** 양력 월 → 지지 (1월=丑, 2월=寅 …) */
const SOLAR_MONTH_BRANCH: EarthlyBranch[] = ['丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子']

function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}

/** Julian Day Number — O(1) */
export function toJulianDay(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12)
  const y = year + 4800 - a
  const m = month + 12 * a - 3
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045
}

/** 2024-01-01 = 甲子日 기준 일주 계산 */
export function getDayIndices(year: number, month: number, day: number): { stemIdx: number; branchIdx: number } {
  const jd = toJulianDay(year, month, day)
  const anchorJd = toJulianDay(2024, 1, 1)
  const diff = jd - anchorJd
  return {
    stemIdx: mod(diff, 10),
    branchIdx: mod(diff, 12),
  }
}

/** 五虎遁 — 년간 기준 월간 */
function getMonthStemIndex(yearStemIdx: number, monthBranchIdx: number): number {
  const firstMonthStem = [2, 4, 6, 8, 0][mod(yearStemIdx, 5)]
  return mod(firstMonthStem + (monthBranchIdx - 2), 10)
}

/** 五鼠遁 — 일간 기준 시간 */
function getHourStemIndex(dayStemIdx: number, hourBranchIdx: number): number {
  const ziHourStem = [0, 2, 4, 6, 8][mod(dayStemIdx, 5)]
  return mod(ziHourStem + hourBranchIdx, 10)
}

export function getHourBranchIndex(hour: number): number {
  if (hour === 23 || hour === 0) return 0
  return mod(Math.floor((hour + 1) / 2), 12)
}

export function buildPillar(stemIdx: number, branchIdx: number): { stem: HeavenlyStem; branch: EarthlyBranch } {
  return {
    stem: HEAVENLY_STEMS[mod(stemIdx, 10)],
    branch: EARTHLY_BRANCHES[mod(branchIdx, 12)],
  }
}

export function calculateStemBranchIndices(birth: BirthInput): {
  year: { stemIdx: number; branchIdx: number }
  month: { stemIdx: number; branchIdx: number }
  day: { stemIdx: number; branchIdx: number }
  hour: { stemIdx: number; branchIdx: number }
} {
  const yearStemIdx = mod(birth.year - 4, 10)
  const yearBranchIdx = mod(birth.year - 4, 12)

  const monthBranchIdx = EARTHLY_BRANCHES.indexOf(SOLAR_MONTH_BRANCH[birth.month - 1])
  const monthStemIdx = getMonthStemIndex(yearStemIdx, monthBranchIdx)

  const day = getDayIndices(birth.year, birth.month, birth.day)
  const hourBranchIdx = getHourBranchIndex(birth.hour)
  const hourStemIdx = getHourStemIndex(day.stemIdx, hourBranchIdx)

  return {
    year: { stemIdx: yearStemIdx, branchIdx: yearBranchIdx },
    month: { stemIdx: monthStemIdx, branchIdx: monthBranchIdx },
    day,
    hour: { stemIdx: hourStemIdx, branchIdx: hourBranchIdx },
  }
}

export function pillarLabel(p: Pillar): string {
  return `${p.stem}${p.branch}`
}

export { HEAVENLY_STEMS, EARTHLY_BRANCHES, SOLAR_MONTH_BRANCH }
