export type BirthTimeDisambiguation = 'earlier' | 'later'

export function assertBirthTimeZone(zone: string): string {
  try { new Intl.DateTimeFormat('en', {timeZone: zone}).format(0) } catch { throw new Error('INVALID_BIRTH_TIME_ZONE') }
  return zone
}

/** Recorded birthplace civil clock, not a language/browser-zone guess. No solar-time correction. */
export function civilUtcMs(year: number, month: number, day: number, hour = 0, minute = 0, timeZone = 'Asia/Seoul', disambiguation?: BirthTimeDisambiguation): number {
  const wall = Date.UTC(year, month - 1, day, hour, minute)
  const check = new Date(wall)
  if (![year, month, day, hour, minute].every(Number.isInteger) || check.getUTCFullYear() !== year || check.getUTCMonth() + 1 !== month || check.getUTCDate() !== day || hour < 0 || hour > 23 || minute < 0 || minute > 59) throw new Error('INVALID_BIRTH_DATE_TIME')
  // Preserve existing Korean calculation. Do not silently revise past Korean readings.
  if (timeZone === 'Asia/Seoul') return wall - 9 * 3600000
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
  if (!matches.length) throw new Error('NONEXISTENT_BIRTH_LOCAL_TIME')
  if (matches.length > 1 && !disambiguation) throw new Error('AMBIGUOUS_BIRTH_LOCAL_TIME')
  return disambiguation === 'later' ? matches[matches.length - 1] : matches[0]
}
