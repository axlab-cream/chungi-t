/**
 * 2026-10-14 관리자 전 화면 날짜 검색. 화면마다 따로 쓰던 기간 해석을 한곳에 모은다.
 *
 * 경계는 `from` 포함, `to` 제외(자정이 두 날에 겹치지 않게). 둘 다 ISO 시각이다.
 * 기간을 안 주면 null — 각 목록은 예전처럼 최근 것부터 보여 준다.
 */
export type AdminRange = { from: string; to: string }

export const ADMIN_RANGE_MAX_DAYS = 400

/** `?from&to` 를 읽는다. 하나만 있거나, 순서가 거꾸로거나, 최대 일수를 넘으면 'invalid'. */
export function parseAdminRange(query: Record<string, unknown> | undefined, maxDays = ADMIN_RANGE_MAX_DAYS): AdminRange | null | 'invalid' {
  const raw = (key: string) => (typeof query?.[key] === 'string' ? (query[key] as string).trim() : '')
  const fromText = raw('from'); const toText = raw('to')
  if (!fromText && !toText) return null
  const fromMs = Date.parse(fromText); const toMs = Date.parse(toText)
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || fromMs >= toMs || toMs - fromMs > maxDays * 86_400_000) return 'invalid'
  return { from: new Date(fromMs).toISOString(), to: new Date(toMs).toISOString() }
}

/** PostgREST 주소에 `column >= from AND column < to` 를 붙인다. */
export function applyRange(url: URL, column: string, range?: AdminRange | null): URL {
  if (!range) return url
  url.searchParams.append(column, `gte.${range.from}`)
  url.searchParams.append(column, `lt.${range.to}`)
  return url
}

/** 메모리 저장소·서버 후처리용. 시각 문자열이 기간 안에 있는가. */
export function inRange(iso: string | null | undefined, range?: AdminRange | null): boolean {
  if (!range) return true
  const at = Date.parse(iso ?? '')
  return Number.isFinite(at) && at >= Date.parse(range.from) && at < Date.parse(range.to)
}

export const INVALID_RANGE_BODY = { code: 'INVALID_RANGE', error: '조회 기간을 확인해 주세요(시작이 끝보다 앞, 최대 400일).' }
