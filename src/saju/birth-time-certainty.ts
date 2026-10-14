/** A numeric placeholder belongs only at the internal boundary with explicit false certainty. */
export function readBirthClock(source: Record<string, unknown>, known: boolean): { hour: number; minute: number } | null {
  if (!known) return { hour: 12, minute: 0 }
  const rawHour = source.hour
  const rawMinute = source.minute === undefined ? 0 : source.minute
  if (rawHour === undefined || rawHour === null || String(rawHour).trim() === '' || rawMinute === null || String(rawMinute).trim() === '') return null
  const hour = Number(rawHour)
  const minute = Number(rawMinute)
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) return null
  return { hour, minute }
}

/** Public projection only: preserve internal/stored charts and original customer reading text. */
export function projectUnknownBirthTime<T extends Record<string, unknown>>(payload: T, known: boolean): T {
  if (known) return payload
  const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
  return {
    ...payload,
    birth: { ...object(payload.birth), hour: undefined, minute: undefined },
    birthTimeKnown: false,
    pillars: { ...object(payload.pillars), hour: undefined },
    dayMaster: { ...object(payload.dayMaster), strength: undefined },
    elements: undefined,
    elementCount: undefined,
    dominantElement: undefined,
    weakElement: undefined,
    usefulGod: undefined,
    tenGods: undefined,
    fortune: undefined,
    preview: undefined,
    summary: undefined,
    uncertainty: {
      code: 'BIRTH_TIME_UNKNOWN',
      excluded: ['hourPillar', 'fullElementBalance', 'strength', 'usefulGod', 'tenGods', 'personalFortuneTiming'],
      calendarBoundaryMayVary: true,
    },
  } as T
}
