/**
 * 앱 푸시의 입력 규격과 검증.
 *
 * 관리자 화면·앱·발송기가 같은 규칙을 보도록 한 곳에 둔다. DB CHECK 제약
 * (supabase/migrations/20261002170000_push_notifications.sql)과 숫자를 맞춘다.
 */

export class PushError extends Error {
  constructor(public readonly code: string, public readonly status = 422) { super(code) }
}

export const PUSH_TITLE_LIMIT = 100
export const PUSH_BODY_LIMIT = 500
/** Android 알림이 접힌 상태에서 잘리지 않고 보이는 대략의 글자 수. 화면 경고에만 쓴다. */
export const PUSH_TITLE_VISIBLE = 40
export const PUSH_BODY_VISIBLE = 60
export const PUSH_DEEP_LINK_LIMIT = 500
/** 특정 사용자 발송에서 한 번에 고를 수 있는 사람 수. */
export const PUSH_USER_TARGET_LIMIT = 100
export const PUSH_DAYS_LIMIT = 365

export const PUSH_TARGET_TYPES = ['all', 'logged_in', 'guests', 'active_days', 'signup_days', 'users'] as const
export type PushTargetType = (typeof PUSH_TARGET_TYPES)[number]
export const PUSH_STATUSES = ['draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled'] as const
export type PushStatus = (typeof PUSH_STATUSES)[number]

export type PushTarget =
  | { type: 'all' | 'logged_in' | 'guests' }
  | { type: 'active_days' | 'signup_days'; days: number }
  | { type: 'users'; userIds: string[] }

export interface PushDraftInput {
  title: string
  body: string
  deepLink: string
  target: PushTarget
  /** draft: 저장만. now: 바로 보냄. scheduled: at 에 보냄. */
  schedule: { mode: 'draft' | 'now' } | { mode: 'scheduled'; at: string }
}

export interface PushNotificationRecord {
  id: string
  title: string
  body: string
  deepLink: string
  targetType: PushTargetType
  targetFilter: Record<string, unknown>
  targetLabel: string | null
  status: PushStatus
  scheduledAt: string | null
  startedAt: string | null
  sentAt: string | null
  preparedAt: string | null
  totalCount: number
  successCount: number
  failureCount: number
  clickCount: number
  lastError: string | null
  createdBy: string
  cancelledBy: string | null
  cancelledAt: string | null
  createdAt: string
  updatedAt: string
}

export interface PushDeviceInput {
  token: string
  platform: 'android' | 'ios'
  appVersion: string | null
  deviceName: string | null
  userId: string | null
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID.test(value)

/** 줄바꿈은 본문에 남기고, 그 밖의 제어문자는 지운다. 알림 문구에 들어올 이유가 없다. */
function cleanText(value: unknown, keepNewlines: boolean): string {
  if (typeof value !== 'string') return ''
  const stripped = keepNewlines
    ? value.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '')
    : value.replace(/[\u0000-\u001F\u007F]/g, ' ')
  return stripped.trim()
}

/**
 * 앱 안으로만 이동하게 한다. 외부 주소, 프로토콜 상대 주소("//evil"), 역슬래시 우회,
 * 관리자·API 경로를 거른다. 셸(MainActivity.isInternalPath)과 /api/push/open 이 같은 판정을 한다.
 */
export function normalizeDeepLink(value: unknown): string | null {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) return '/'
  if (text.length > PUSH_DEEP_LINK_LIMIT) return null
  if (!text.startsWith('/') || text.startsWith('//') || text.includes('\\')) return null
  if (/[\u0000-\u001F\u007F\s]/.test(text)) return null
  let parsed: URL
  try { parsed = new URL(text, 'https://umsh.kr') } catch { return null }
  if (parsed.origin !== 'https://umsh.kr') return null
  if (/^\/(api|ops)(\/|$)/i.test(parsed.pathname)) return null
  return `${parsed.pathname}${parsed.search}${parsed.hash}`
}

export function parseTarget(value: unknown): PushTarget {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const type = raw.type
  if (type === 'all' || type === 'logged_in' || type === 'guests') return { type }
  if (type === 'active_days' || type === 'signup_days') {
    const days = Number(raw.days)
    if (!Number.isInteger(days) || days < 1 || days > PUSH_DAYS_LIMIT) throw new PushError('PUSH_TARGET_DAYS_INVALID')
    return { type, days }
  }
  if (type === 'users') {
    const ids = Array.isArray(raw.userIds) ? [...new Set(raw.userIds.filter(isUuid).map((id) => id.toLowerCase()))] : []
    if (!ids.length) throw new PushError('PUSH_TARGET_USERS_REQUIRED')
    if (ids.length > PUSH_USER_TARGET_LIMIT) throw new PushError('PUSH_TARGET_USERS_TOO_MANY')
    return { type, userIds: ids }
  }
  throw new PushError('PUSH_TARGET_INVALID')
}

export function targetLabel(target: PushTarget): string {
  switch (target.type) {
    case 'all': return '앱 설치 기기 전체'
    case 'logged_in': return '로그인한 기기'
    case 'guests': return '로그인하지 않은 기기'
    case 'active_days': return `최근 ${target.days}일 안에 앱을 연 기기`
    case 'signup_days': return `최근 ${target.days}일 안에 가입한 회원`
    case 'users': return `특정 회원 ${target.userIds.length}명`
  }
}

export function targetFilter(target: PushTarget): Record<string, unknown> {
  if (target.type === 'active_days' || target.type === 'signup_days') return { days: target.days }
  if (target.type === 'users') return { userIds: target.userIds }
  return {}
}

export function targetFromRecord(record: Pick<PushNotificationRecord, 'targetType' | 'targetFilter'>): PushTarget {
  return parseTarget({ type: record.targetType, ...record.targetFilter })
}

/** 예약은 지금부터 1분 뒤 ~ 90일 안. 지난 시각으로 예약하면 즉시 발송과 구분이 안 된다. */
export const PUSH_SCHEDULE_MIN_LEAD_MS = 60_000
export const PUSH_SCHEDULE_MAX_DAYS = 90

export function parseDraft(value: unknown, now = Date.now()): PushDraftInput {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const title = cleanText(raw.title, false)
  const body = cleanText(raw.body, true)
  if (!title) throw new PushError('PUSH_TITLE_REQUIRED')
  if (title.length > PUSH_TITLE_LIMIT) throw new PushError('PUSH_TITLE_TOO_LONG')
  if (!body) throw new PushError('PUSH_BODY_REQUIRED')
  if (body.length > PUSH_BODY_LIMIT) throw new PushError('PUSH_BODY_TOO_LONG')
  const deepLink = normalizeDeepLink(raw.deepLink)
  if (!deepLink) throw new PushError('PUSH_DEEP_LINK_INVALID')
  const target = parseTarget(raw.target)
  const schedule = (raw.schedule && typeof raw.schedule === 'object' ? raw.schedule : {}) as Record<string, unknown>
  if (schedule.mode === 'draft' || schedule.mode === 'now') return { title, body, deepLink, target, schedule: { mode: schedule.mode } }
  if (schedule.mode === 'scheduled') {
    const at = typeof schedule.at === 'string' ? Date.parse(schedule.at) : NaN
    if (!Number.isFinite(at)) throw new PushError('PUSH_SCHEDULE_INVALID')
    if (at < now + PUSH_SCHEDULE_MIN_LEAD_MS) throw new PushError('PUSH_SCHEDULE_TOO_SOON')
    if (at > now + PUSH_SCHEDULE_MAX_DAYS * 86_400_000) throw new PushError('PUSH_SCHEDULE_TOO_FAR')
    return { title, body, deepLink, target, schedule: { mode: 'scheduled', at: new Date(at).toISOString() } }
  }
  throw new PushError('PUSH_SCHEDULE_INVALID')
}

export function parseDevice(value: unknown, userId: string | null): PushDeviceInput {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const token = typeof raw.token === 'string' ? raw.token.trim() : ''
  // FCM 토큰은 영숫자와 :-_ 로 된 150자 남짓의 문자열이다. 넉넉히 받되 모양은 확인한다.
  if (!/^[A-Za-z0-9:_-]{20,4096}$/.test(token)) throw new PushError('PUSH_DEVICE_TOKEN_INVALID')
  const platform = raw.platform === 'ios' ? 'ios' : raw.platform === 'android' ? 'android' : null
  if (!platform) throw new PushError('PUSH_DEVICE_PLATFORM_INVALID')
  const short = (input: unknown, limit: number) => {
    const text = cleanText(input, false)
    return text ? text.slice(0, limit) : null
  }
  return { token, platform, appVersion: short(raw.appVersion, 40), deviceName: short(raw.deviceName, 80), userId }
}

export const PUSH_ERROR_MESSAGES: Record<string, string> = {
  PUSH_TITLE_REQUIRED: '제목을 입력해 주세요.',
  PUSH_TITLE_TOO_LONG: `제목은 ${PUSH_TITLE_LIMIT}자 이하로 써 주세요.`,
  PUSH_BODY_REQUIRED: '메시지를 입력해 주세요.',
  PUSH_BODY_TOO_LONG: `메시지는 ${PUSH_BODY_LIMIT}자 이하로 써 주세요.`,
  PUSH_DEEP_LINK_INVALID: '이동할 페이지는 /로 시작하는 운명상회 안의 주소만 쓸 수 있습니다.',
  PUSH_TARGET_INVALID: '발송 대상을 골라 주세요.',
  PUSH_TARGET_DAYS_INVALID: `기간은 1~${PUSH_DAYS_LIMIT}일 사이로 정해 주세요.`,
  PUSH_TARGET_USERS_REQUIRED: '보낼 회원을 한 명 이상 골라 주세요.',
  PUSH_TARGET_USERS_TOO_MANY: `특정 회원 발송은 한 번에 ${PUSH_USER_TARGET_LIMIT}명까지입니다.`,
  PUSH_SCHEDULE_INVALID: '발송 시점을 확인해 주세요.',
  PUSH_SCHEDULE_TOO_SOON: '예약 시각은 지금부터 1분 뒤 이후로 정해 주세요.',
  PUSH_SCHEDULE_TOO_FAR: `예약은 ${PUSH_SCHEDULE_MAX_DAYS}일 안으로만 할 수 있습니다.`,
  PUSH_NOT_FOUND: '해당 푸시를 찾지 못했습니다.',
  PUSH_NOT_CANCELLABLE: '이미 발송을 마쳤거나 취소된 푸시입니다.',
  PUSH_DEVICE_TOKEN_INVALID: '기기 토큰 형식이 올바르지 않습니다.',
  PUSH_DEVICE_PLATFORM_INVALID: '기기 종류를 확인해 주세요.',
  PUSH_STORE_UNAVAILABLE: '푸시 저장소에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  PUSH_SEARCH_INVALID: '이름 두 글자 이상 또는 회원 ID를 입력해 주세요.',
}
