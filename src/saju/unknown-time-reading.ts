import runtimeConfig from '../../data/runtime-config.json' with { type: 'json' }
import { normalizeServiceKey } from '../prompt/service-system.js'
import type { SajuAnalysis } from '../types/index.js'
import { sixCharAnalysis } from './analyzer.js'

/**
 * 출생 시각을 모를 때 어떻게 읽을지 정하는 공용 스위치(3단계, 2026-10-15 결정).
 *  - known: 시각을 안다. 8글자 그대로.
 *  - six_char: 시주를 빼고 연·월·일 6글자로 오행·강약·용신·십신을 계산해 확정 풀이처럼 쓴다.
 *  - withhold: 기존 방식. 임시 시각에 흔들리는 값은 보류한다.
 * 켜는 서비스는 data/runtime-config.json 의 unknownBirthTime.sixCharServices 로 고른다
 * (천명사주 먼저 켜고 확인한 뒤 다른 서비스로 넓힌다).
 */
export type UnknownBirthTimeReading = 'known' | 'six_char' | 'withhold'

type ReadingContext = {
  birthTimeKnown?: boolean | null
  serviceKey?: string | null
  birthTimeReading?: 'six_char'
  partner?: { birthTimeKnown?: boolean | null } | null
}

const SIX_CHAR_SERVICES = new Set<string>(
  ((runtimeConfig as { unknownBirthTime?: { sixCharServices?: string[] } }).unknownBirthTime?.sixCharServices ?? [])
    .map((key) => normalizeServiceKey(key)),
)

export function unknownBirthTimeReading(context: ReadingContext): UnknownBirthTimeReading {
  if (context.birthTimeKnown !== false) return 'known'
  // 새로 만든 리포트에 붙은 표시와 서비스 스위치가 둘 다 있어야 6글자로 읽는다.
  // 표시는 천명사주 리포트를 만드는 곳에서만 붙으므로, 예전 리포트·다른 경로의 문맥은 보류(기존 방식)로 남는다.
  return context.birthTimeReading === 'six_char' && sixCharServiceEnabled(context.serviceKey) ? 'six_char' : 'withhold'
}

/** 천명사주 문맥은 서비스 키를 비워 둔다(app.ts parseReportContext). 키가 없으면 천명사주로 보는 관례를 따른다. */
function sixCharServiceEnabled(serviceKey?: string | null): boolean {
  return SIX_CHAR_SERVICES.has(normalizeServiceKey(serviceKey))
}

/** 리포트를 새로 만들 때만 부른다. 6글자 모드 서비스에서 본인이나 상대의 시간을 모르면 표시를 붙인다. */
export function markBirthTimeReading<T extends ReadingContext>(context: T): T & { birthTimeReading?: 'six_char' } {
  const someoneUnknown = context.birthTimeKnown === false || context.partner?.birthTimeKnown === false
  if (!someoneUnknown || !sixCharServiceEnabled(context.serviceKey)) return context
  return { ...context, birthTimeReading: 'six_char' }
}

/** 상대 시간: 본인과 같은 규칙(표시 + 서비스 스위치)으로 6글자/보류를 정한다. */
export function partnerBirthTimeReading(context: ReadingContext): UnknownBirthTimeReading {
  if (context.partner?.birthTimeKnown !== false) return 'known'
  return context.birthTimeReading === 'six_char' && sixCharServiceEnabled(context.serviceKey) ? 'six_char' : 'withhold'
}

/** 본인 시간을 몰라 임시 시각 값을 보류해야 하면 true(6글자 모드를 켜지 않은 서비스·예전 리포트). */
export function withholdsBirthTime(context: ReadingContext): boolean {
  return unknownBirthTimeReading(context) === 'withhold'
}

/**
 * 리포트를 새로 만들 때 쓸 명식(본인·상대 공통). 6글자 모드 서비스에서 시간을 모르면 시주를 뺀 계산을 쓴다.
 * 궁합처럼 명식 값이 문맥에 계산 결과로 저장되는 서비스는 문맥을 만들기 전에 이걸로 바꿔야 한다.
 */
export function analysisForNewReport(analysis: SajuAnalysis, serviceKey: string | null | undefined, birthTimeKnown: boolean | null | undefined): SajuAnalysis {
  return birthTimeKnown === false && sixCharServiceEnabled(serviceKey) ? sixCharAnalysis(analysis) : analysis
}

export function readsSixChars(context: ReadingContext): boolean {
  return unknownBirthTimeReading(context) === 'six_char'
}

/** 화면의 시간 칸에 쓰는 문구. 시간을 모르면 임시 시각의 시주 대신 이 문구를 보여 준다. */
export const UNKNOWN_HOUR_CELL = '입력하지 않음'

/** 6글자 계산(sixCharAnalysis)이면 true. fourPillars.hour 는 임시 시각 값이라 화면·문장에 쓰지 않는다. */
export function hourPillarHidden(analysis: SajuAnalysis): boolean {
  return analysis.manseryeok?.hourPillarExcluded === true
}

/** 풀이·화면에 쓸 명식. 6글자 모드면 시주를 뺀 계산으로 바꾸고, 아니면 그대로 둔다. */
export function analysisForReading(analysis: SajuAnalysis, context: ReadingContext): SajuAnalysis {
  return readsSixChars(context) ? sixCharAnalysis(analysis) : analysis
}
