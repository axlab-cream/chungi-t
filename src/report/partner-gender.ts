import type { SajuReportContext } from '../types/index.js'

export type Gender = 'male' | 'female'

export function asGender(value: unknown): Gender | undefined {
  return value === 'male' || value === 'female' ? value : undefined
}

/**
 * 천명사주의 `orientationFromLoveTarget` 과 같은 문자열을 만든다.
 * 같은 성별이면 "동성", 다르면 "이성" 관계 중심 · 연애 상대 남자/여자. 본인 성별을 모르면 "관계 패턴 중심".
 * 상대 성별을 모르면 아무것도 지어내지 않고 `label` 만 돌려준다(AI 는 이때 상대를 성별 없이 쓴다).
 * 서비스 고유의 관계 기준(`label`)이 있으면 그 뒤에 붙인다.
 */
export function loveTargetOrientation(self: unknown, partner: unknown, label = ''): string {
  const target = asGender(partner)
  if (!target) return label
  const mine = asGender(self)
  const relation = !mine ? '관계 패턴 중심' : mine === target ? '동성 관계 중심' : '이성 관계 중심'
  const text = `${relation} · 연애 상대 ${target === 'male' ? LOVE_TARGETS[0] : LOVE_TARGETS[1]}`
  return label ? `${label} · ${text}` : text
}

/** 천명사주가 묻는 "연애 상대는요?" 선택지. 다른 서비스도 같은 값을 쓴다. */
export const LOVE_TARGETS = ['남자', '여자', '둘 다·상관없음'] as const
export type LoveTarget = (typeof LOVE_TARGETS)[number]

/**
 * 천명사주의 AI 지시 문장(원본). 천명사주 읽기 규약(cmdg-reading-contract)과 다른 서비스가 이 한 문장을 같이 쓴다.
 * 문장을 고치려면 여기만 고친다.
 */
export const LOVE_TARGET_RULE = '연애 상대의 성별은 입력된 관계 기준에 적힌 "연애 상대 남자/여자"를 따르세요. "성별 무관"이거나 입력이 없으면 상대를 성별 없이 그 사람·상대로 쓰고, 본인 성별로 상대 성별을 짐작하지 마세요.'

/**
 * 상대나 연애 상대가 등장하는 문맥에만 공통 지시를 붙인다. 상대가 없는 서비스의 프롬프트는 그대로 둔다.
 * 천명사주(saju_master)는 읽기 규약에 이미 같은 문장이 있어 다시 붙이지 않는다.
 */
export function needsPartnerGenderRule(context: SajuReportContext): boolean {
  if (context.serviceKey === 'saju_master') return false
  const partner = context.partner
  return partner?.mode === 'known'
    || /연애 상대/.test(`${context.orientation ?? ''} ${context.concern ?? ''}`)
}
