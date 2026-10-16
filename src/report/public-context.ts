import type { SajuReportContext } from '../types/index.js'
import { asGender } from './partner-gender.js'

/**
 * 응답으로 내보낼 상대 정보. 계산 결과만 남기고 생년월일시 원본을 뺀다.
 *
 * 상대는 이 서비스의 사용자가 아니다. 동의 절차도 삭제 요청 창구도 없으므로
 * 브라우저·네트워크 응답·클라이언트 오류 로그까지 원본을 흘리지 않는다.
 * 2026-09-10 이전에 저장된 레코드에는 원본이 남아 있어(소급 삭제는 하지 않는다)
 * 읽기 경로에서 가려야 과거 기록까지 덮인다.
 */
export function publicPartnerContext(partner: SajuReportContext['partner']): SajuReportContext['partner'] {
  if (!partner || !('birth' in partner)) return partner
  const next = { ...partner }
  // 성별은 비식별 값이다. 생년월일을 지우더라도 상대 성별은 남겨 풀이가 상대를 짐작하지 않게 한다.
  const gender = asGender(next.birth?.gender)
  if (gender && !next.gender) next.gender = gender
  delete next.birth
  return next
}

/**
 * 응답으로 내보낼 리포트 문맥.
 *
 * `savedChat` 은 내부 저장 구조라 고객 응답에 넣지 않는다.
 * 상대 생년월일시는 `publicPartnerContext` 가 뺀다.
 */
export function publicReportContext(context: SajuReportContext): SajuReportContext {
  const next = Object.fromEntries(
    Object.entries(context ?? {}).filter(([key]) => key !== 'savedChat'),
  ) as SajuReportContext
  return next.partner ? { ...next, partner: publicPartnerContext(next.partner) } : next
}
