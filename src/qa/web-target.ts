/** 고객 웹 Production. Android 패키지 `kr.umsh.app`과 혼동하지 않는다. */
export const WEB_PRODUCTION_ORIGIN = 'https://umsh.kr'

export function isWebProductionOrigin(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && (url.hostname === 'umsh.kr' || url.hostname === 'www.umsh.kr')
  } catch {
    return false
  }
}
