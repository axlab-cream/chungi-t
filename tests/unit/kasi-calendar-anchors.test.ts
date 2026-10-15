import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  calculateStemBranchIndices,
  getSolarTermUtcMs,
  resolveBirthDate,
  HEAVENLY_STEMS,
  EARTHLY_BRANCHES,
} from '../../src/saju/calculator.js'
import type { BirthInput, SolarTermName } from '../../src/types/index.js'

/**
 * 사주 계산의 바탕(절기·일진·음력)이 국가 기준인 한국천문연구원 자료와 맞는지 지키는 검사.
 * 자료 출처·조회일은 tests/fixtures/kasi/*.json 머리에 적혀 있다.
 * 시간 경계·서머타임 같은 "출생 시각 읽는 방식"이 바뀌어도 이 검사는 그대로 통과해야 한다.
 */
const fixtures = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'kasi')
const load = <T>(name: string): T => JSON.parse(readFileSync(join(fixtures, name), 'utf8')) as T

type JeolRow = [SolarTermName, number, number, number, number, number]
type DayRow = [string, string, string, boolean]
const jeolgi = load<{ terms: JeolRow[] }>('jeolgi-1920-2059.json').terms
const days = load<{ days: DayRow[] }>('iljin.json').days

const MINUTE = 60_000
// 천문연 값은 분 단위 반올림이고 "24시 0분" 표기도 있으므로 Date.UTC 로 받는다(24시는 다음 날 0시로 넘어감).
const kasiUtcMs = ([, y, m, d, h, mi]: JeolRow) => Date.UTC(y, m - 1, d, h - 9, mi)

const TERM_BRANCH: Record<string, string> = {
  소한: '丑', 입춘: '寅', 경칩: '卯', 청명: '辰', 입하: '巳', 망종: '午',
  소서: '未', 입추: '申', 백로: '酉', 한로: '戌', 입동: '亥', 대설: '子',
}

// 1948~1961년(옛 서머타임·UTC+8:30)과 1987~1988년(서머타임)은 벽시계 시각과 실제 시각이 달라
// 출생 시각 읽는 방식에 따라 결과가 바뀌므로 벽시계 경계 검사에서 뺀다. 절기 시각 자체 검사에는 포함한다.
const HISTORICAL_CLOCK_YEARS = (y: number) => (y >= 1948 && y <= 1961) || y === 1987 || y === 1988

function kstWall(utcMs: number): Pick<BirthInput, 'year' | 'month' | 'day' | 'hour' | 'minute'> {
  const t = new Date(utcMs + 9 * 3_600_000)
  return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate(), hour: t.getUTCHours(), minute: t.getUTCMinutes() }
}

function pillarsAt(utcMs: number) {
  const idx = calculateStemBranchIndices({ ...kstWall(utcMs), gender: 'female', calendar: 'solar' })
  return {
    year: HEAVENLY_STEMS[idx.year.stemIdx] + EARTHLY_BRANCHES[idx.year.branchIdx],
    monthBranch: EARTHLY_BRANCHES[idx.month.branchIdx] as string,
  }
}

describe('천문연 기준 검사: 절기·일진·음력', () => {
  it('월주를 가르는 12절 시각이 천문연 1920~2059년 자료(1,680건)와 모두 1분 이내', () => {
    assert.equal(jeolgi.length, 1680)
    const off = jeolgi
      .map((row) => ({ row, diff: Math.abs(getSolarTermUtcMs(row[1], row[0]) - kasiUtcMs(row)) }))
      .filter(({ diff }) => diff > MINUTE)
    assert.deepEqual(off.map(({ row, diff }) => `${row.slice(0, 6).join(' ')} 차이 ${(diff / MINUTE).toFixed(2)}분`), [])
  })

  it('절입 2분 전·후 출생의 월지가 바뀌고, 입춘 전후로 연주가 바뀐다', () => {
    const wrong: string[] = []
    for (const row of jeolgi) {
      const [name, y] = row
      if (HISTORICAL_CLOCK_YEARS(y)) continue
      const yearCheck = name === '입춘'
      const at = kasiUtcMs(row)
      const before = pillarsAt(at - 2 * MINUTE)
      const after = pillarsAt(at + 2 * MINUTE)
      if (after.monthBranch !== TERM_BRANCH[name]) wrong.push(`${y} ${name} 2분 후 월지 ${after.monthBranch}`)
      if (before.monthBranch === TERM_BRANCH[name]) wrong.push(`${y} ${name} 2분 전에도 월지 ${before.monthBranch}`)
      if (yearCheck && before.year === after.year) wrong.push(`${y} 입춘 전후 연주가 같음 ${after.year}`)
    }
    assert.deepEqual(wrong, [])
  })

  it('날짜별 일진이 천문연 음양력 변환 값과 같다', () => {
    const wrong = days
      .map(([solar, iljin]) => {
        const [year, month, day] = solar.split('-').map(Number)
        const idx = calculateStemBranchIndices({ year, month, day, hour: 12, minute: 0, gender: 'male', calendar: 'solar' })
        const ours = HEAVENLY_STEMS[idx.day.stemIdx] + EARTHLY_BRANCHES[idx.day.branchIdx]
        return ours === iljin ? '' : `${solar} 천문연 ${iljin} 우리 ${ours}`
      })
      .filter(Boolean)
    assert.deepEqual(wrong, [])
  })

  it('음력 생일 → 양력 변환이 천문연(한국 음력)과 같다 — 윤달·한중 음력이 다른 날 포함', () => {
    const wrong = days
      .map(([solar, , lunar, leap]) => {
        const [year, month, day] = lunar.split('-').map(Number)
        const r = resolveBirthDate({ year, month, day, isLeapMonth: leap, hour: 12, minute: 0, gender: 'male', calendar: 'lunar' })
        const ours = `${r.solarYear}-${String(r.solarMonth).padStart(2, '0')}-${String(r.solarDay).padStart(2, '0')}`
        return ours === solar ? '' : `음력 ${lunar}${leap ? '(윤)' : ''} 천문연 ${solar} 우리 ${ours}`
      })
      .filter(Boolean)
    assert.deepEqual(wrong, [])
  })
})
