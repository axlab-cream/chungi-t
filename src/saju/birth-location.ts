import { InputError } from '../server/input-error.js'
import { assertBirthTimeZone } from './civil-time.js'
import type { BirthInput } from '../types/index.js'

type BirthLocation = Pick<BirthInput, 'birthTimeZone' | 'birthTimeDisambiguation'>

/** Explicit recorded birthplace clock only. Never infer a zone from language, locale or browser. */
export function parseBirthLocation(source: Record<string, unknown>): BirthLocation {
  const zone = source.birthTimeZone
  const choice = source.birthTimeDisambiguation
  const result: BirthLocation = {}
  if (zone !== undefined && zone !== null && zone !== '') {
    if (typeof zone !== 'string' || !zone.trim()) throw new InputError('INVALID_BIRTH_TIME_ZONE')
    try { result.birthTimeZone = assertBirthTimeZone(zone.trim()) }
    catch { throw new InputError('INVALID_BIRTH_TIME_ZONE') }
  }
  if (choice !== undefined && choice !== null && choice !== '') {
    if (choice !== 'earlier' && choice !== 'later') throw new InputError('INVALID_BIRTH_TIME_DISAMBIGUATION')
    result.birthTimeDisambiguation = choice
  }
  return result
}

/** Add to existing fingerprint whitelists without changing a single legacy Korean property. */
export function birthLocationKey(birth: BirthInput): BirthLocation {
  if (!birth.birthTimeZone || birth.birthTimeZone === 'Asia/Seoul') return {}
  return parseBirthLocation(birth as unknown as Record<string, unknown>)
}

/**
 * Full-object fingerprints also omit explicit Seoul, equal to the historical implicit default.
 * 출생 시각 규칙 표시(timeRule)도 뺀다: 저장 기록에만 붙는 표시라 같은 사람·같은 입력의 지문이 달라지면 안 된다.
 */
export function birthForIdentity(birth: BirthInput): BirthInput {
  const { birthTimeZone: _zone, birthTimeDisambiguation: _choice, timeRule: _rule, ...legacy } = birth
  return { ...legacy, ...birthLocationKey(birth) }
}

export function requestBirthsForIdentity<T extends { selfBirth?: BirthInput; partnerBirth?: BirthInput }>(input: T): T {
  return {
    ...input,
    ...(input.selfBirth ? { selfBirth: birthForIdentity(input.selfBirth) } : {}),
    ...(input.partnerBirth ? { partnerBirth: birthForIdentity(input.partnerBirth) } : {}),
  }
}
