export type BirthTimeDisambiguation = 'earlier' | 'later'

export function assertBirthTimeZone(zone: string): string {
  try { new Intl.DateTimeFormat('en', {timeZone: zone}).format(0) } catch { throw new Error('INVALID_BIRTH_TIME_ZONE') }
  return zone
}

/**
 * Recorded birthplace civil clock, not a language/browser-zone guess. No solar-time correction here.
 * 한국(Asia/Seoul)은 2026-10-15 규칙부터 국제 시간대 자료의 옛 서머타임(1948~51·1955~60·1987~88)과
 * UTC+8:30 표준시(1954~61)를 반영한다(정부 기록과 대조: analysis/saju-engine-comparison.html 6-2장).
 * timeRule 'legacy' 는 그 전처럼 늘 UTC+9 — 저장된 리포트를 다시 계산할 때만 쓴다.
 */
export function civilUtcMs(year: number, month: number, day: number, hour = 0, minute = 0, timeZone = 'Asia/Seoul', disambiguation?: BirthTimeDisambiguation, timeRule?: 'legacy' | 'kr2026'): number {
  const wall = Date.UTC(year, month - 1, day, hour, minute)
  const check = new Date(wall)
  if (![year, month, day, hour, minute].every(Number.isInteger) || check.getUTCFullYear() !== year || check.getUTCMonth() + 1 !== month || check.getUTCDate() !== day || hour < 0 || hour > 23 || minute < 0 || minute > 59) throw new Error('INVALID_BIRTH_DATE_TIME')
  const seoul = timeZone === 'Asia/Seoul'
  if (seoul && timeRule === 'legacy') return wall - 9 * 3600000
  assertBirthTimeZone(timeZone)
  const fmt = new Intl.DateTimeFormat('en-US', {timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'})
  const localWall = (instant: number) => {
    const parts = fmt.formatToParts(instant)
    const n = (type: string) => Number(parts.find(p => p.type === type)?.value)
    return Date.UTC(n('year'), n('month') - 1, n('day'), n('hour'), n('minute'), n('second'))
  }
  const offsets = new Set<number>()
  // Sample both sides of a civil-clock transition, including 30-minute DST shifts.
  for (let hours = -48; hours <= 48; hours += 6) {
    const sample = wall + hours * 3600000
    offsets.add(localWall(sample) - sample)
  }
  const matches = [...offsets].map(offset => wall - offset).filter(instant => localWall(instant) === wall).sort((a,b) => a-b)
  // 한국 옛 서머타임 경계의 없는/겹치는 시각은 고객에게 되물을 수 없으므로 정해진 값으로 읽는다:
  // 없는 시각(시계를 앞당긴 1시간)은 바뀌기 전 표준시로, 겹치는 시각(되돌린 1시간)은 앞쪽(서머타임)으로.
  // 다만 입력에 겹치는 시각 선택(birthTimeDisambiguation)이 직접 들어오면 그 선택을 따른다.
  if (!matches.length && seoul) {
    const before = wall - 48 * 3600000
    return wall - (localWall(before) - before)
  }
  if (!matches.length) throw new Error('NONEXISTENT_BIRTH_LOCAL_TIME')
  if (matches.length > 1 && !disambiguation && !seoul) throw new Error('AMBIGUOUS_BIRTH_LOCAL_TIME')
  return disambiguation === 'later' ? matches[matches.length - 1] : matches[0]
}
