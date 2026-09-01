import KoreanLunarCalendar from 'korean-lunar-calendar'
import { Solar } from 'lunar-typescript'
import type { BirthInput, DayBoundaryRule, EarthlyBranch, HeavenlyStem, Pillar, ResolvedBirthDate, SolarTermName } from '../types/index.js'

type KoreanLunarCalendarCtor = new () => {
  setLunarDate(lunarYear: number, lunarMonth: number, lunarDay: number, isIntercalation: boolean): boolean
  getSolarCalendar(): { year: number; month: number; day: number }
}

const LunarCalendar = KoreanLunarCalendar as unknown as KoreanLunarCalendarCtor

const HEAVENLY_STEMS: HeavenlyStem[] = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const EARTHLY_BRANCHES: EarthlyBranch[] = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

const MONTH_BOUNDARIES: Array<{
  name: SolarTermName
  chineseName: string
  branch: EarthlyBranch
}> = [
  { name: '소한', chineseName: '小寒', branch: '丑' },
  { name: '입춘', chineseName: '立春', branch: '寅' },
  { name: '경칩', chineseName: '惊蛰', branch: '卯' },
  { name: '청명', chineseName: '清明', branch: '辰' },
  { name: '입하', chineseName: '立夏', branch: '巳' },
  { name: '망종', chineseName: '芒种', branch: '午' },
  { name: '소서', chineseName: '小暑', branch: '未' },
  { name: '입추', chineseName: '立秋', branch: '申' },
  { name: '백로', chineseName: '白露', branch: '酉' },
  { name: '한로', chineseName: '寒露', branch: '戌' },
  { name: '입동', chineseName: '立冬', branch: '亥' },
  { name: '대설', chineseName: '大雪', branch: '子' },
]

function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}

function kstDateUtcMs(year: number, month: number, day: number, hour = 0, minute = 0): number {
  return Date.UTC(year, month - 1, day, hour - 9, minute, 0, 0)
}

export function getSolarTermUtcMs(year: number, name: SolarTermName): number {
  const term = MONTH_BOUNDARIES.find((item) => item.name === name)
  if (!term) throw new Error(`지원하지 않는 절기입니다: ${name}`)

  const jieQiTable = Solar.fromYmdHms(year, 6, 1, 0, 0, 0).getLunar().getJieQiTable()
  const solar = jieQiTable[term.chineseName]
  if (!solar) throw new Error(`절기 테이블에서 ${name}(${term.chineseName})을 찾지 못했습니다.`)

  return Date.UTC(
    solar.getYear(),
    solar.getMonth() - 1,
    solar.getDay(),
    solar.getHour() - 8,
    solar.getMinute(),
    solar.getSecond(),
    0,
  )
}

export function getSolarTermKstDate(year: number, name: SolarTermName): Date {
  return new Date(getSolarTermUtcMs(year, name))
}

export function resolveBirthDate(birth: BirthInput): ResolvedBirthDate {
  const hour = Number.isFinite(birth.hour) ? birth.hour : 12
  const minute = Number.isFinite(birth.minute ?? 0) ? birth.minute ?? 0 : 0

  if (birth.calendar !== 'lunar') {
    return {
      originalCalendar: birth.calendar,
      solarYear: birth.year,
      solarMonth: birth.month,
      solarDay: birth.day,
      hour,
      minute,
      isLeapMonth: false,
    }
  }

  const calendar = new LunarCalendar()
  const ok = calendar.setLunarDate(birth.year, birth.month, birth.day, Boolean(birth.isLeapMonth))
  if (!ok) {
    throw new Error('지원 범위를 벗어났거나 존재하지 않는 음력 날짜입니다.')
  }
  const solar = calendar.getSolarCalendar()

  return {
    originalCalendar: birth.calendar,
    solarYear: solar.year,
    solarMonth: solar.month,
    solarDay: solar.day,
    hour,
    minute,
    isLeapMonth: Boolean(birth.isLeapMonth),
    lunarYear: birth.year,
    lunarMonth: birth.month,
    lunarDay: birth.day,
  }
}

export function birthUtcMs(birth: BirthInput): number {
  const resolved = resolveBirthDate(birth)
  return kstDateUtcMs(resolved.solarYear, resolved.solarMonth, resolved.solarDay, resolved.hour, resolved.minute)
}

/** Julian Day Number — O(1), calendar date only */
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

function nextSolarDate(year: number, month: number, day: number): { solarYear: number; solarMonth: number; solarDay: number } {
  const next = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0))
  return {
    solarYear: next.getUTCFullYear(),
    solarMonth: next.getUTCMonth() + 1,
    solarDay: next.getUTCDate(),
  }
}

function resolveDayCalculationDate(resolved: ResolvedBirthDate, rule: DayBoundaryRule): {
  solarYear: number
  solarMonth: number
  solarDay: number
} {
  if (rule === 'zi_hour_next_day' && resolved.hour === 23) {
    return nextSolarDate(resolved.solarYear, resolved.solarMonth, resolved.solarDay)
  }
  return {
    solarYear: resolved.solarYear,
    solarMonth: resolved.solarMonth,
    solarDay: resolved.solarDay,
  }
}

/** 五虎遁 — 년간 기준 월간 */
function getMonthStemIndex(yearStemIdx: number, monthBranchIdx: number): number {
  const firstMonthStem = [2, 4, 6, 8, 0][mod(yearStemIdx, 5)]
  return mod(firstMonthStem + mod(monthBranchIdx - 2, 12), 10)
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

function getYearIndicesByIpchun(resolved: ResolvedBirthDate): { stemIdx: number; branchIdx: number; pillarYear: number } {
  const birthMs = kstDateUtcMs(resolved.solarYear, resolved.solarMonth, resolved.solarDay, resolved.hour, resolved.minute)
  const ipchunMs = getSolarTermUtcMs(resolved.solarYear, '입춘')
  const pillarYear = birthMs < ipchunMs ? resolved.solarYear - 1 : resolved.solarYear
  return {
    stemIdx: mod(pillarYear - 4, 10),
    branchIdx: mod(pillarYear - 4, 12),
    pillarYear,
  }
}

export function getMonthBoundary(resolved: ResolvedBirthDate): {
  termName: SolarTermName
  branchIdx: number
  branch: EarthlyBranch
  utcMs: number
} {
  const birthMs = kstDateUtcMs(resolved.solarYear, resolved.solarMonth, resolved.solarDay, resolved.hour, resolved.minute)
  const boundaries = [
    {
      name: '대설' as SolarTermName,
      branch: '子' as EarthlyBranch,
      utcMs: getSolarTermUtcMs(resolved.solarYear - 1, '대설'),
    },
    ...MONTH_BOUNDARIES.map((term) => ({
      name: term.name,
      branch: term.branch,
      utcMs: getSolarTermUtcMs(resolved.solarYear, term.name),
    })),
    {
      name: '소한' as SolarTermName,
      branch: '丑' as EarthlyBranch,
      utcMs: getSolarTermUtcMs(resolved.solarYear + 1, '소한'),
    },
  ].sort((a, b) => a.utcMs - b.utcMs)

  let selected = boundaries[0]
  for (const boundary of boundaries) {
    if (birthMs >= boundary.utcMs) selected = boundary
    else break
  }

  return {
    termName: selected.name,
    branch: selected.branch,
    branchIdx: EARTHLY_BRANCHES.indexOf(selected.branch),
    utcMs: selected.utcMs,
  }
}

export function calculateStemBranchIndices(birth: BirthInput): {
  year: { stemIdx: number; branchIdx: number }
  month: { stemIdx: number; branchIdx: number; termName: SolarTermName }
  day: { stemIdx: number; branchIdx: number }
  hour: { stemIdx: number; branchIdx: number }
  resolved: ResolvedBirthDate
  pillarYear: number
  dayBoundaryRule: DayBoundaryRule
  dayCalculationDate: { solarYear: number; solarMonth: number; solarDay: number }
} {
  const resolved = resolveBirthDate(birth)
  const dayBoundaryRule = birth.dayBoundaryRule ?? 'midnight'
  const dayCalculationDate = resolveDayCalculationDate(resolved, dayBoundaryRule)
  const year = getYearIndicesByIpchun(resolved)
  const monthBoundary = getMonthBoundary(resolved)
  const monthStemIdx = getMonthStemIndex(year.stemIdx, monthBoundary.branchIdx)
  const day = getDayIndices(dayCalculationDate.solarYear, dayCalculationDate.solarMonth, dayCalculationDate.solarDay)
  const hourBranchIdx = getHourBranchIndex(resolved.hour)
  const hourStemIdx = getHourStemIndex(day.stemIdx, hourBranchIdx)

  return {
    year: { stemIdx: year.stemIdx, branchIdx: year.branchIdx },
    month: { stemIdx: monthStemIdx, branchIdx: monthBoundary.branchIdx, termName: monthBoundary.termName },
    day,
    hour: { stemIdx: hourStemIdx, branchIdx: hourBranchIdx },
    resolved,
    pillarYear: year.pillarYear,
    dayBoundaryRule,
    dayCalculationDate,
  }
}

export function getDaewoonStartAge(birth: BirthInput, isForward: boolean): number {
  return getDaewoonStartInfo(birth, isForward).age
}

export function getDaewoonStartInfo(birth: BirthInput, isForward: boolean): {
  age: number
  years: number
  months: number
  days: number
  text: string
} {
  const resolved = resolveBirthDate(birth)
  const birthMs = kstDateUtcMs(resolved.solarYear, resolved.solarMonth, resolved.solarDay, resolved.hour, resolved.minute)
  const terms = [
    ...MONTH_BOUNDARIES.map((term) => getSolarTermUtcMs(resolved.solarYear - 1, term.name)),
    ...MONTH_BOUNDARIES.map((term) => getSolarTermUtcMs(resolved.solarYear, term.name)),
    ...MONTH_BOUNDARIES.map((term) => getSolarTermUtcMs(resolved.solarYear + 1, term.name)),
  ].sort((a, b) => a - b)

  const targetTerm = isForward
    ? terms.find((term) => term > birthMs) ?? terms[terms.length - 1]
    : [...terms].reverse().find((term) => term < birthMs) ?? terms[0]

  const days = Math.abs(targetTerm - birthMs) / 86400000
  const totalMonths = days * 4
  const years = Math.floor(totalMonths / 12)
  const months = Math.floor(totalMonths % 12)
  const restDays = Math.round((totalMonths - Math.floor(totalMonths)) * 30)
  const age = Math.max(1, Math.round(days / 3))
  const textParts = [
    years > 0 ? `${years}년` : '',
    months > 0 ? `${months}개월` : '',
    restDays > 0 ? `${restDays}일` : '',
  ].filter(Boolean)

  return {
    age,
    years,
    months,
    days: restDays,
    text: textParts.length > 0 ? `약 ${textParts.join(' ')}` : '약 1세 전후',
  }
}

export function pillarLabel(p: Pillar): string {
  return `${p.stem}${p.branch}`
}

export { HEAVENLY_STEMS, EARTHLY_BRANCHES }
