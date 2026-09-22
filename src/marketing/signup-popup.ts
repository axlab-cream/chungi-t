export const SIGNUP_POPUP_PLACEMENT = 'home/signup-benefit-popup'

export interface SignupPopupPayload {
  title: string
  body: string
  href: string
  headline: string
  subheadline: string
  imageSrc: string
  ctaLabel: string
  campaignEndAt: string
}

export interface ActiveSignupPopup {
  id: string
  startsAt: string
  endsAt: string
  title: string
  body: string
  headline: string
  subheadline: string
  imageSrc: string
  ctaLabel: string
  href: string
}

export const DEFAULT_SIGNUP_POPUP: ActiveSignupPopup = {
  id: 'builtin-2026-09-today-fortune',
  startsAt: '2026-09-22T00:00:00.000+09:00',
  endsAt: '2026-10-01T23:59:59.999+09:00',
  title: '천명보살의 오늘운',
  headline: '오늘, 밀어붙일까요?',
  subheadline: '한 번 더 지켜볼까요?',
  body: '마음은 기울었는데, 아직 망설여진다면. 당신의 사주와 오늘의 흐름을 함께 살펴보세요.',
  imageSrc: '/assets/signup-benefit-popup-default-2026-09-22.png',
  ctaLabel: '내 사주로 오늘운 무료 보기',
  href: '/signup?entry=today&returnTo=%2Ftoday%2Ffree%3Fstart%3D1#login',
}

function stringField(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized.length > 0 && normalized.length <= max && !/[<>]/.test(normalized) ? normalized : null
}

function dateField(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null
}

/** 팝업은 첫 페이지의 고정 회원가입 흐름으로만 연결한다. */
export function normalizeSignupPopupPayload(input: unknown, startsAt: unknown): SignupPopupPayload {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : null
  const start = dateField(startsAt)
  const title = source && stringField(source.title, 120)
  const body = source && stringField(source.body, 500)
  const headline = source && stringField(source.headline, 120)
  const subheadline = source && stringField(source.subheadline, 120)
  const imageSrc = source && stringField(source.imageSrc, 300)
  const ctaLabel = source && stringField(source.ctaLabel, 80)
  const campaignEndAt = source && dateField(source.campaignEndAt)
  if (!start || !title || !body || !headline || !subheadline || !imageSrc || !ctaLabel || !campaignEndAt) throw new Error('SIGNUP_POPUP_PAYLOAD_INVALID')
  if (!/^\/assets\/[A-Za-z0-9_./-]+(?:\?[^\s<>"']*)?$/.test(imageSrc)) throw new Error('SIGNUP_POPUP_PAYLOAD_INVALID')
  if (Date.parse(campaignEndAt) <= Date.parse(start)) throw new Error('SIGNUP_POPUP_PERIOD_INVALID')
  return { title, body, headline, subheadline, imageSrc, ctaLabel, campaignEndAt, href: DEFAULT_SIGNUP_POPUP.href }
}

export function signupPopupIsActive(popup: Pick<ActiveSignupPopup, 'startsAt' | 'endsAt'>, now = Date.now()): boolean {
  return Date.parse(popup.startsAt) <= now && now <= Date.parse(popup.endsAt)
}
