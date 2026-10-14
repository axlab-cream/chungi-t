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

/** 출생 시각 없이도 정해지는 운만 고른다: 조회 연도와 그 해의 간지. */
function timeIndependentFortune(fortune: Record<string, unknown>): Record<string, unknown> | undefined {
  const picked: Record<string, unknown> = {}
  for (const key of ['currentYear', 'yearPillar']) if (fortune[key] !== undefined) picked[key] = fortune[key]
  return Object.keys(picked).length ? picked : undefined
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
    // 올해 기운(세운)은 출생 시각과 무관해 남긴다. 대운 시작·전환처럼 시각에 흔들리는 값은 모두 뺀다.
    fortune: timeIndependentFortune(object(payload.fortune)),
    preview: undefined,
    summary: undefined,
    uncertainty: {
      code: 'BIRTH_TIME_UNKNOWN',
      excluded: ['hourPillar', 'fullElementBalance', 'strength', 'usefulGod', 'tenGods', 'personalFortuneTiming'],
      calendarBoundaryMayVary: true,
    },
  } as T
}
