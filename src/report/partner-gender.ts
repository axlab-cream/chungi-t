import type { SajuReportContext } from '../types/index.js'

export type Gender = 'male' | 'female'

export function asGender(value: unknown): Gender | undefined {
  return value === 'male' || value === 'female' ? value : undefined
}

/** 문맥에 성별 한 칸만 담는다. 알 수 없는 값은 담지 않아 짐작이 들어가지 않게 한다. */
export function genderField(birth?: { gender?: unknown }): { gender?: Gender } {
  const gender = asGender(birth?.gender)
  return gender ? { gender } : {}
}

/**
 * 두 사람의 성별로 관계 기준을 정한다. 천명사주의 `orientationFromLoveTarget` 과 같은 규칙이다:
 * 같으면 동성, 다르면 이성, 한쪽이라도 모르면 성별을 짐작하지 않고 "관계 패턴 중심"으로 둔다.
 */
export function relationOrientation(self: unknown, partner: unknown): string {
  const a = asGender(self)
  const b = asGender(partner)
  if (!a || !b) return '관계 패턴 중심'
  return a === b ? '동성 관계 중심' : '이성 관계 중심'
}

/** AI 에게 상대 성별을 어떻게 다룰지 알리는 공통 지시. 천명사주의 같은 규칙을 다른 서비스도 쓴다. */
export const PARTNER_GENDER_RULE = [
  '상대의 성별은 입력에 적힌 값을 따르세요. 상대 정보의 gender(male=남성, female=여성)나 관계 기준·고민에 적힌 "연애 상대 남자/여자"가 그 값입니다.',
  '값이 없거나 "성별 무관"·"둘 다·상관없음"이면 상대를 성별 없이 "상대"·"그 사람"으로 쓰고, 본인 성별로 상대 성별을 짐작하지 마세요.',
  '두 사람이 같은 성별이어도 이성 관계를 전제한 표현을 쓰지 마세요.',
].join(' ')

/** 상대나 연애 상대가 등장하는 문맥에만 공통 지시를 붙인다. 상대가 없는 서비스의 프롬프트는 그대로 둔다. */
export function needsPartnerGenderRule(context: SajuReportContext): boolean {
  const partner = context.partner
  return partner?.mode === 'known'
    || Boolean(partner?.gender)
    || /연애 상대/.test(`${context.orientation ?? ''} ${context.concern ?? ''}`)
}
