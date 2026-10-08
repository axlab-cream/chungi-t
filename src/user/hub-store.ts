import { configuredEnv } from '../env/load.js'
import {
  createSupportCase,
  createSupportNote,
  listSupportCasesForMember,
  listSupportNotes,
  type SupportCategory,
} from '../admin/support-store.js'

/**
 * 마이페이지 회원 기능(2026-10): 알림 설정, 1:1 문의.
 *
 * 표는 supabase/migrations/20261008120000_member_hub.sql 에서 만든다. 마이그레이션 전에는
 * PostgREST 가 404(PGRST205)를 돌려주는데, 그때는 HUB_NOT_READY 로 바꿔 화면이 "준비 중"을 보이게 한다.
 */

type Row = Record<string, unknown>

export class HubError extends Error {
  constructor(public code: string, public status = 400) { super(code); this.name = 'HubError' }
}

/** 회원이 답을 기다리는 문의가 이만큼 쌓이면 새 문의를 받지 않는다(중복 접수 방지). */
const MAX_OPEN_INQUIRIES = 5

function base(): string {
  const url = configuredEnv(process.env.SUPABASE_URL)?.replace(/\/$/, '')
  if (!url || !configuredEnv(process.env.SUPABASE_SERVICE_ROLE_KEY)) throw new HubError('HUB_STORE_UNAVAILABLE', 503)
  return url
}

function headers(extra: Record<string, string> = {}): Record<string, string> {
  const key = configuredEnv(process.env.SUPABASE_SERVICE_ROLE_KEY) ?? ''
  const result: Record<string, string> = { apikey: key, ...extra }
  if (!key.startsWith('sb_secret_') && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)) result.authorization = `Bearer ${key}`
  return result
}

function table(name: string): URL {
  return new URL(`${base()}/rest/v1/${name}`)
}

async function call(url: URL, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(url, { ...init, headers: headers(init.headers as Record<string, string> | undefined) })
  if (response.status === 404) throw new HubError('HUB_NOT_READY', 503)
  if (!response.ok) throw new HubError('HUB_STORE_FAILED', 503)
  return response
}

const rows = async (url: URL, init?: RequestInit) => await (await call(url, init)).json() as Row[]

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

/* ───────────── 알림 설정 ───────────── */

export interface NotificationPrefs {
  /** 풀이 완성·결제·환불처럼 이용에 필요한 알림. 기본 켜짐. */
  servicePush: boolean
  /** 광고성 정보(이벤트·할인). 정보통신망법상 사전 동의가 있어야 보낸다. 기본 꺼짐. */
  marketingPush: boolean
  marketingConsentedAt: string | null
  marketingWithdrawnAt: string | null
  updatedAt: string | null
}

const DEFAULT_PREFS: NotificationPrefs = { servicePush: true, marketingPush: false, marketingConsentedAt: null, marketingWithdrawnAt: null, updatedAt: null }

function prefsFromRow(row: Row | undefined): NotificationPrefs {
  if (!row) return { ...DEFAULT_PREFS }
  const str = (value: unknown) => typeof value === 'string' ? value : null
  return {
    servicePush: row.service_push !== false,
    marketingPush: row.marketing_push === true,
    marketingConsentedAt: str(row.marketing_consented_at),
    marketingWithdrawnAt: str(row.marketing_withdrawn_at),
    updatedAt: str(row.updated_at),
  }
}

export async function getNotificationPrefs(userId: string): Promise<NotificationPrefs> {
  const url = table('umsh_notification_prefs')
  url.searchParams.set('select', '*')
  url.searchParams.set('user_id', `eq.${userId}`)
  return prefsFromRow((await rows(url))[0])
}

/** 바뀐 값만 받는다. 광고성 동의·철회 시각은 서버가 기록한다(회원에게 처리 결과를 알려야 하므로). */
export async function updateNotificationPrefs(userId: string, input: unknown, now = new Date()): Promise<NotificationPrefs> {
  const source = input && typeof input === 'object' ? input as Record<string, unknown> : {}
  const current = await getNotificationPrefs(userId)
  const next: NotificationPrefs = { ...current }
  if (typeof source.servicePush === 'boolean') next.servicePush = source.servicePush
  if (typeof source.marketingPush === 'boolean' && source.marketingPush !== current.marketingPush) {
    next.marketingPush = source.marketingPush
    if (source.marketingPush) next.marketingConsentedAt = now.toISOString()
    else next.marketingWithdrawnAt = now.toISOString()
  }
  next.updatedAt = now.toISOString()
  const saved = await rows(table('umsh_notification_prefs'), {
    method: 'POST',
    headers: { 'content-type': 'application/json', prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({
      user_id: userId,
      service_push: next.servicePush,
      marketing_push: next.marketingPush,
      marketing_consented_at: next.marketingConsentedAt,
      marketing_withdrawn_at: next.marketingWithdrawnAt,
      updated_at: next.updatedAt,
    }),
  })
  return prefsFromRow(saved[0])
}

/**
 * 푸시 발송기용: 이 중 알림을 끈 회원. 표가 아직 없으면(마이그레이션 전) 아무도 끌 수 없었으므로 빈 집합이다.
 * 그 밖의 실패는 그대로 던진다 — 끈 사람에게 보내느니 이번 발송을 1분 미룬다.
 */
export async function optedOutUserIds(userIds: string[]): Promise<Set<string>> {
  const ids = [...new Set(userIds.filter(isUuid))]
  const result = new Set<string>()
  for (let i = 0; i < ids.length; i += 100) {
    const url = table('umsh_notification_prefs')
    url.searchParams.set('select', 'user_id')
    url.searchParams.set('service_push', 'eq.false')
    url.searchParams.set('user_id', `in.(${ids.slice(i, i + 100).join(',')})`)
    try {
      for (const row of await rows(url)) result.add(String(row.user_id))
    } catch (error) {
      if (error instanceof HubError && error.code === 'HUB_NOT_READY') return new Set()
      throw error
    }
  }
  return result
}

/** 푸시 발송기용: 이 중 이벤트·혜택 알림에 동의한 회원. 표가 없으면 동의한 사람도 없다. */
export async function marketingConsentedUserIds(userIds: string[]): Promise<Set<string>> {
  const ids = [...new Set(userIds.filter(isUuid))]
  const result = new Set<string>()
  for (let i = 0; i < ids.length; i += 100) {
    const url = table('umsh_notification_prefs')
    url.searchParams.set('select', 'user_id')
    url.searchParams.set('marketing_push', 'eq.true')
    // 이용 알림을 끈 회원에게는 광고도 보내지 않는다.
    url.searchParams.set('service_push', 'eq.true')
    url.searchParams.set('user_id', `in.(${ids.slice(i, i + 100).join(',')})`)
    try {
      for (const row of await rows(url)) result.add(String(row.user_id))
    } catch (error) {
      if (error instanceof HubError && error.code === 'HUB_NOT_READY') return new Set()
      throw error
    }
  }
  return result
}

/* ───────────── 1:1 문의 ───────────── */

export const INQUIRY_CATEGORIES: Record<SupportCategory, string> = {
  payment: '결제·환불',
  generation: '풀이가 만들어지지 않아요',
  interpretation: '풀이 내용',
  access: '로그인·이용',
  privacy: '개인정보',
  other: '기타',
}

export interface InquiryMessage { from: 'member' | 'staff'; text: string; createdAt: string }
export interface Inquiry {
  id: string
  category: SupportCategory
  categoryLabel: string
  state: 'received' | 'answered' | 'closed'
  stateLabel: string
  orderId: string | null
  messages: InquiryMessage[]
  createdAt: string
  updatedAt: string
}

/** 고객에게 보이는 기록 종류. 내부 메모와 답변 초안은 절대 내보내지 않는다. */
const CUSTOMER_KINDS = new Set(['customer_message', 'customer_reply'])

export async function listInquiries(memberId: string): Promise<Inquiry[]> {
  const cases = await listSupportCasesForMember(memberId)
  return Promise.all(cases.map(async (item) => {
    const notes = (await listSupportNotes(item.id)).filter((note) => CUSTOMER_KINDS.has(note.kind))
    const messages = notes.map((note) => ({ from: note.kind === 'customer_reply' ? 'staff' as const : 'member' as const, text: note.text, createdAt: note.createdAt }))
    const closed = item.status === 'resolved' || item.status === 'closed'
    const answered = messages.some((message) => message.from === 'staff')
    const state = closed ? 'closed' : answered ? 'answered' : 'received'
    return {
      id: item.id,
      category: item.category,
      categoryLabel: INQUIRY_CATEGORIES[item.category] ?? '기타',
      state,
      stateLabel: state === 'closed' ? '처리 완료' : state === 'answered' ? '답변 도착' : '확인 중',
      orderId: item.orderId,
      messages,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }
  }))
}

export function parseInquiry(input: unknown): { category: SupportCategory; text: string; orderId?: string } {
  const source = input && typeof input === 'object' ? input as Record<string, unknown> : {}
  const category = typeof source.category === 'string' && source.category in INQUIRY_CATEGORIES ? source.category as SupportCategory : null
  const body = typeof source.text === 'string' ? source.text.trim() : ''
  if (!category) throw new HubError('INQUIRY_CATEGORY_REQUIRED')
  if (body.length < 10 || body.length > 2000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(body)) throw new HubError('INQUIRY_TEXT_INVALID')
  const orderId = typeof source.orderId === 'string' && /^[A-Za-z0-9_-]{6,80}$/.test(source.orderId.trim()) ? source.orderId.trim() : undefined
  return { category, text: body, orderId }
}

export async function createInquiry(member: { id: string; email?: string }, input: { category: SupportCategory; text: string; orderId?: string }): Promise<void> {
  const open = (await listSupportCasesForMember(member.id)).filter((item) => item.status !== 'resolved' && item.status !== 'closed')
  if (open.length >= MAX_OPEN_INQUIRIES) throw new HubError('INQUIRY_LIMIT', 429)
  // 접수자 칸은 관리자 화면에서 이메일로 보인다. 이메일이 없는 소셜 계정은 회원 번호로 남긴다.
  const actor = member.email?.trim() || `member-${member.id}`
  const created = await createSupportCase({ category: input.category, priority: 'normal', memberId: member.id, orderId: input.orderId, actorEmail: actor })
  await createSupportNote({ caseId: created.id, kind: 'customer_message', text: input.text, actorEmail: actor })
}
