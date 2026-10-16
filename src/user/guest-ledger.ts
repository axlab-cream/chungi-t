import { createHash } from 'node:crypto'

import { configuredEnv } from '../env/load.js'
import type { ReportOwner } from '../report/report-store.js'
import { deleteOwnAccount } from './account-deletion.js'
import { updateNotificationPrefs } from './hub-store.js'
import { listPaymentOrders } from '../payment/order-store.js'
import type { UserBirthProfile } from './profile-store.js'

/**
 * 비회원 관리·약관 동의 기록(2026-10-15, docs/auth/guest-member-plan.md).
 * 표는 supabase/migrations/20261015120000_guest_people_and_consents.sql 에서 만든다. 마이그레이션 전에는
 * PostgREST 가 404 를 돌려주는데, 그때는 LEDGER_NOT_READY 로 바꿔 화면이 막히지 않게 한다.
 *
 * 비회원 한 사람 = umsh_guest_people 한 줄. 같은 기기(브라우저 기기 번호) + 같은 사주면 같은 사람으로 보고
 * 방문(익명 계정) 수만 올린다. 다른 기기면 이름·생일이 같아도 합치지 않는다(대표 결정 2026-10-15).
 */

type Row = Record<string, unknown>

/** 약관·개인정보처리방침을 고치면 올린다. 회원은 다음 로그인 때 다시 동의한다. */
export const CONSENT_VERSION = '2026-10-15'
export const CONSENT_SOURCES = ['guest-sheet', 'login', 'reconsent'] as const
export type ConsentSource = typeof CONSENT_SOURCES[number]
/** 마지막 방문 뒤 이 기간이 지나면 정리 대상(처리방침과 같은 값). */
export const GUEST_RETENTION_DAYS = 30

export class LedgerError extends Error {
  constructor(public code: string, public status = 400) { super(code); this.name = 'LedgerError' }
}

function base(): string {
  const url = configuredEnv(process.env.SUPABASE_URL)?.replace(/\/$/, '')
  if (!url || !configuredEnv(process.env.SUPABASE_SERVICE_ROLE_KEY)) throw new LedgerError('LEDGER_STORE_UNAVAILABLE', 503)
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
  // 2026-10-16 결제 표시(paid_at)는 마이그레이션 20261016120000 뒤에 생긴다. 그 전에는 그 열을 빼고 한 번 더 묻는다.
  if (response.status === 400 && url.search.includes('paid_at')) {
    const retry = new URL(url)
    for (const key of [...retry.searchParams.keys()]) if (key === 'paid_at') retry.searchParams.delete(key)
    const select = retry.searchParams.get('select')
    if (select) retry.searchParams.set('select', select.split(',').filter((column) => column !== 'paid_at').join(','))
    return call(retry, init)
  }
  if (response.status === 404) throw new LedgerError('LEDGER_NOT_READY', 503)
  if (!response.ok) throw new LedgerError('LEDGER_STORE_FAILED', 503)
  return response
}

const rows = async (url: URL, init?: RequestInit) => await (await call(url, init)).json() as Row[]

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** 브라우저가 만든 무작위 기기 번호. 개인 정보가 아니다. 모양만 확인한다. */
const DEVICE_ID = /^[A-Za-z0-9-]{8,64}$/

function str(value: unknown): string | null { return typeof value === 'string' && value ? value : null }
function num(value: unknown): number | null { return typeof value === 'number' && Number.isFinite(value) ? value : null }

/* ───────────── 약관 동의 ───────────── */

export interface ConsentInput { marketing: boolean; source: ConsentSource; deviceId: string | null }

/** 필수 세 가지(이용약관·개인정보·만 14세 이상)가 모두 true 여야 한다. 화면이 보여 준 버전이 지금 버전과 달라도 받지 않는다. */
export function parseConsentInput(body: unknown): ConsentInput {
  const source = body && typeof body === 'object' ? body as Row : {}
  if (source.version !== CONSENT_VERSION) throw new LedgerError('CONSENT_VERSION_MISMATCH', 409)
  if (source.terms !== true || source.privacy !== true || source.age14 !== true) throw new LedgerError('CONSENT_REQUIRED', 400)
  const from = CONSENT_SOURCES.includes(source.source as ConsentSource) ? source.source as ConsentSource : 'login'
  const deviceId = typeof source.deviceId === 'string' && DEVICE_ID.test(source.deviceId) ? source.deviceId : null
  return { marketing: source.marketing === true, source: from, deviceId }
}

export async function recordConsent(owner: ReportOwner, input: ConsentInput, now = new Date()): Promise<void> {
  if (!UUID.test(owner.id)) throw new LedgerError('CONSENT_OWNER_INVALID', 400)
  await call(table('umsh_consents'), {
    method: 'POST',
    headers: { 'content-type': 'application/json', prefer: 'return=minimal' },
    body: JSON.stringify({
      user_id: owner.id,
      is_guest: owner.isAnonymous === true,
      version: CONSENT_VERSION,
      terms: true,
      privacy: true,
      age_over_14: true,
      marketing: input.marketing,
      source: input.source,
      device_id: input.deviceId,
      agreed_at: now.toISOString(),
    }),
  })
  if (owner.isAnonymous) {
    // 비회원 관리 화면의 "동의" 칸. 이 방문이 아직 장부에 없으면(결과 시트보다 먼저 동의) 다음 방문 기록 때 채운다.
    const url = table('umsh_guest_people')
    url.searchParams.set('guest_user_ids', `cs.{${owner.id}}`)
    await call(url, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', prefer: 'return=minimal' },
      body: JSON.stringify({ consented_at: now.toISOString(), marketing_consented: input.marketing }),
    })
    return
  }
  // 회원이 마케팅 수신에 동의하면 마이페이지 알림 설정(이벤트 알림)도 켠다. 끄는 건 마이페이지에서만 한다.
  if (input.marketing) await updateNotificationPrefs(owner.id, { marketingPush: true }, now)
}

/** 이 계정이 지금 버전 약관에 동의한 기록이 있는지. */
export async function hasCurrentConsent(userId: string): Promise<boolean> {
  if (!UUID.test(userId)) return false
  const url = table('umsh_consents')
  url.searchParams.set('select', 'id')
  url.searchParams.set('user_id', `eq.${userId}`)
  url.searchParams.set('version', `eq.${CONSENT_VERSION}`)
  url.searchParams.set('limit', '1')
  return (await rows(url)).length > 0
}

export interface ConsentRecord { version: string; marketing: boolean; source: string; isGuest: boolean; agreedAt: string }

/** 어드민 회원 상세 › 동의 이력. */
export async function listConsents(userId: string): Promise<ConsentRecord[]> {
  if (!UUID.test(userId)) return []
  const url = table('umsh_consents')
  url.searchParams.set('select', 'version,marketing,source,is_guest,agreed_at')
  url.searchParams.set('user_id', `eq.${userId}`)
  url.searchParams.set('order', 'agreed_at.desc')
  url.searchParams.set('limit', '50')
  return (await rows(url)).map((row) => ({
    version: str(row.version) ?? '',
    marketing: row.marketing === true,
    source: str(row.source) ?? '',
    isGuest: row.is_guest === true,
    agreedAt: str(row.agreed_at) ?? '',
  }))
}

/** 회원 목록의 "약관 동의" 칸: 이 회원들 중 지금 버전에 동의한 사람과 그 시각. */
export async function currentConsentTimes(userIds: string[]): Promise<Map<string, string>> {
  const valid = [...new Set(userIds.filter((id) => UUID.test(id)).map((id) => id.toLowerCase()))]
  const result = new Map<string, string>()
  if (!valid.length) return result
  const url = table('umsh_consents')
  url.searchParams.set('select', 'user_id,agreed_at')
  url.searchParams.set('user_id', `in.(${valid.join(',')})`)
  url.searchParams.set('version', `eq.${CONSENT_VERSION}`)
  url.searchParams.set('order', 'agreed_at.asc')
  for (const row of await rows(url)) {
    const id = String(row.user_id ?? '').toLowerCase()
    if (!result.has(id) && str(row.agreed_at)) result.set(id, str(row.agreed_at)!)
  }
  return result
}

/* ───────────── 비회원 장부 ───────────── */

/** 같은 사주인지 보는 값. 원문 대신 해시를 키로 쓴다. 사주 정보가 없으면(서브 콘텐츠만 본 경우) 빈 값. */
export function sajuKey(profile: Pick<UserBirthProfile, 'name' | 'birth'> | null): string {
  if (!profile) return ''
  const b = profile.birth
  const name = profile.name.replace(/\s+/g, '').toLowerCase()
  const plain = [name, b.year, b.month, b.day, b.hour, b.minute ?? 0, b.gender, b.calendar, b.isLeapMonth ? 1 : 0].join('|')
  return createHash('sha256').update(plain).digest('hex').slice(0, 32)
}

function profileColumns(profile: UserBirthProfile | null): Row {
  if (!profile) return {}
  return {
    name: profile.name,
    birth_year: profile.birth.year,
    birth_month: profile.birth.month,
    birth_day: profile.birth.day,
    birth_hour: profile.birth.hour,
    birth_minute: profile.birth.minute ?? 0,
    gender: profile.birth.gender,
    calendar: profile.birth.calendar,
    is_leap_month: Boolean(profile.birth.isLeapMonth),
    birth_time_known: profile.birthTimeKnown,
    anonymized_at: null,
  }
}

function cleanService(value: unknown): string {
  const text = typeof value === 'string' ? value.trim() : ''
  return text.replace(/[^\w/\-가-힣]/g, '').slice(0, 60)
}

async function patchPerson(id: string, values: Row): Promise<void> {
  const url = table('umsh_guest_people')
  url.searchParams.set('id', `eq.${id}`)
  await call(url, { method: 'PATCH', headers: { 'content-type': 'application/json', prefer: 'return=minimal' }, body: JSON.stringify(values) })
}

async function findPerson(filters: Record<string, string>): Promise<Row | undefined> {
  const url = table('umsh_guest_people')
  url.searchParams.set('select', 'id,saju_key,guest_user_ids,services,visits')
  for (const [column, filter] of Object.entries(filters)) url.searchParams.set(column, filter)
  url.searchParams.set('limit', '1')
  return (await rows(url))[0]
}

/**
 * 비회원 결과 화면에서 한 번 부른다. 방문(익명 계정)이 이미 장부에 있으면 본 서비스·마지막 방문만 고치고,
 * 처음 보는 방문이면 같은 기기 + 같은 사주 줄에 붙여 방문 수를 올리고, 없으면 새 줄을 만든다.
 */
export async function recordGuestVisit(params: { guest: ReportOwner; deviceId: unknown; service: unknown; profile: UserBirthProfile | null; consented?: boolean }, now = new Date()): Promise<void> {
  const { guest, profile } = params
  if (!guest.isAnonymous || !UUID.test(guest.id)) return
  const deviceId = typeof params.deviceId === 'string' && DEVICE_ID.test(params.deviceId) ? params.deviceId : `account:${guest.id}`
  const service = cleanService(params.service)
  const key = sajuKey(profile)
  const seen = now.toISOString()
  const withService = (current: unknown) => {
    const list = Array.isArray(current) ? current.filter((item): item is string => typeof item === 'string') : []
    return service && !list.includes(service) ? [...list, service].slice(-30) : list
  }

  // 2026-10-16 비회원 계정이 기기에 오래 남아(1시간 정책 폐지) 한 기기를 여러 사람이 번갈아 쓰면 같은 계정으로 들어온다.
  // 그래서 "이 계정 + 이 사주" 줄을 먼저 찾는다. 사주가 다르면 다른 사람이니 아래에서 그 사주 줄을 찾거나 새로 만든다.
  const own = key
    ? await findPerson({ guest_user_ids: `cs.{${guest.id}}`, saju_key: `eq.${key}` })
    : await findPerson({ guest_user_ids: `cs.{${guest.id}}` })
  if (own) {
    await patchPerson(String(own.id), { services: withService(own.services), last_seen_at: seen })
    return
  }
  if (key) {
    // 서브 콘텐츠만 보다가 사주를 넣은 경우: 같은 방문이니 사주가 빈 이 계정 줄에 사주를 채운다. 같은 기기에 그 사주 줄이 이미 있으면 그쪽으로 간다.
    const blank = await findPerson({ guest_user_ids: `cs.{${guest.id}}`, saju_key: 'eq.' })
    const other = blank ? await findPerson({ device_id: `eq.${deviceId}`, saju_key: `eq.${key}` }) : undefined
    if (blank && !other) {
      await patchPerson(String(blank.id), { services: withService(blank.services), last_seen_at: seen, saju_key: key, ...profileColumns(profile) })
      return
    }
  }

  const same = await findPerson({ device_id: `eq.${deviceId}`, saju_key: `eq.${key}` })
  if (same) {
    const ids = Array.isArray(same.guest_user_ids) ? same.guest_user_ids as string[] : []
    // 원래 사람이 같은 기기로 돌아오면 같은 계정일 수 있다(계정을 다시 붙이지 않고 방문 수만 늘린다).
    await patchPerson(String(same.id), {
      guest_user_ids: ids.includes(guest.id) ? ids : [...ids, guest.id],
      visits: (num(same.visits) ?? ids.length) + 1,
      services: withService(same.services),
      last_seen_at: seen,
      ...profileColumns(profile),
      ...(params.consented ? { consented_at: seen } : {}),
    })
    return
  }

  await call(table('umsh_guest_people'), {
    method: 'POST',
    headers: { 'content-type': 'application/json', prefer: 'return=minimal,resolution=ignore-duplicates' },
    body: JSON.stringify({
      device_id: deviceId,
      saju_key: key,
      guest_user_ids: [guest.id],
      services: service ? [service] : [],
      visits: 1,
      first_seen_at: seen,
      last_seen_at: seen,
      ...profileColumns(profile),
      ...(params.consented ? { consented_at: seen } : {}),
    }),
  })
}

/** SNS 로그인으로 비회원 기록을 이어받으면 그 비회원 줄에 회원 계정을 적는다. 이미 다른 회원으로 옮겼으면 덮지 않는다. */
export async function markGuestConverted(guestId: string, memberId: string, now = new Date(), onlySajuKey?: string): Promise<void> {
  if (!UUID.test(guestId) || !UUID.test(memberId)) return
  const url = table('umsh_guest_people')
  url.searchParams.set('guest_user_ids', `cs.{${guestId}}`)
  url.searchParams.set('converted_to', 'is.null')
  // 2026-10-16 한 기기를 여러 사람이 쓰면 같은 방문 계정이 여러 줄에 걸린다. 옮긴 사람(사주) 줄만 전환으로 표시한다.
  if (onlySajuKey) url.searchParams.set('saju_key', `eq.${onlySajuKey}`)
  await call(url, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', prefer: 'return=minimal' },
    body: JSON.stringify({ converted_to: memberId, converted_at: now.toISOString() }),
  })
}

/** 비회원이 산 주문이 결제 완료되면 그 비회원 줄에 표시한다(처음 한 번). 30일 정리에서 빠지고 "결제함" 필터에 보인다. */
export async function markGuestPaid(guestId: string, now = new Date()): Promise<void> {
  if (!UUID.test(guestId)) return
  const url = table('umsh_guest_people')
  url.searchParams.set('guest_user_ids', `cs.{${guestId}}`)
  url.searchParams.set('paid_at', 'is.null')
  await call(url, { method: 'PATCH', headers: { 'content-type': 'application/json', prefer: 'return=minimal' }, body: JSON.stringify({ paid_at: now.toISOString() }) })
}

/* ───────────── 어드민: 비회원 관리 ───────────── */

export type GuestFilter = 'all' | 'open' | 'converted' | 'paid' | 'stale'

export interface AdminGuestPerson {
  id: string
  name: string | null
  birthYear: number | null
  gender: string | null
  hasSaju: boolean
  services: string[]
  visits: number
  firstSeenAt: string
  lastSeenAt: string
  consentedAt: string | null
  marketingConsented: boolean
  convertedTo: string | null
  convertedAt: string | null
  anonymizedAt: string | null
  /** 2026-10-16 이 비회원(기기 + 사주)이 결제한 적이 있으면 처음 결제한 시각. */
  paidAt: string | null
  /** 마지막 방문에서 30일이 지났고 아직 정리하지 않았다. */
  stale: boolean
}

function staleBefore(now: Date): string {
  return new Date(now.getTime() - GUEST_RETENTION_DAYS * 86_400_000).toISOString()
}

function filterParams(filter: GuestFilter, now: Date): Array<[string, string]> {
  if (filter === 'open') return [['converted_to', 'is.null']]
  if (filter === 'converted') return [['converted_to', 'not.is.null']]
  if (filter === 'paid') return [['paid_at', 'not.is.null']]
  // 결제한 비회원은 거래 기록 보관 기간(5년) 동안 정리하지 않는다.
  if (filter === 'stale') return [['last_seen_at', `lt.${staleBefore(now)}`], ['anonymized_at', 'is.null'], ['paid_at', 'is.null']]
  return []
}

function personFromRow(row: Row, now: Date): AdminGuestPerson {
  const lastSeenAt = str(row.last_seen_at) ?? ''
  const anonymizedAt = str(row.anonymized_at)
  return {
    id: String(row.id ?? ''),
    name: str(row.name),
    birthYear: num(row.birth_year),
    gender: str(row.gender),
    hasSaju: Boolean(str(row.saju_key)),
    services: Array.isArray(row.services) ? row.services.filter((item): item is string => typeof item === 'string') : [],
    visits: num(row.visits) ?? 1,
    firstSeenAt: str(row.first_seen_at) ?? '',
    lastSeenAt,
    consentedAt: str(row.consented_at),
    marketingConsented: row.marketing_consented === true,
    convertedTo: str(row.converted_to),
    convertedAt: str(row.converted_at),
    anonymizedAt,
    paidAt: str(row.paid_at),
    stale: !anonymizedAt && !str(row.paid_at) && Boolean(lastSeenAt) && lastSeenAt < staleBefore(now),
  }
}

const GUEST_SORTS = { recent: 'last_seen_at.desc', first: 'first_seen_at.desc', visits: 'visits.desc', name: 'name.asc' } as const
export type GuestSort = keyof typeof GUEST_SORTS

export async function listGuestPeople(query: { filter?: GuestFilter; q?: string; sort?: GuestSort; limit?: number; offset?: number } = {}, now = new Date()): Promise<{ guests: AdminGuestPerson[]; total: number }> {
  const url = table('umsh_guest_people')
  url.searchParams.set('select', 'id,name,birth_year,gender,saju_key,services,visits,first_seen_at,last_seen_at,consented_at,marketing_consented,converted_to,converted_at,anonymized_at,paid_at')
  url.searchParams.set('order', GUEST_SORTS[query.sort ?? 'recent'] ?? GUEST_SORTS.recent)
  for (const [column, value] of filterParams(query.filter ?? 'all', now)) url.searchParams.append(column, value)
  const name = (query.q ?? '').replace(/[(),.*%\\:"']/g, '').trim().slice(0, 40)
  if (name) url.searchParams.set('name', `ilike.*${name}*`)
  const limit = Math.min(Math.max(Math.trunc(query.limit ?? 20) || 20, 1), 100)
  const offset = Math.max(Math.trunc(query.offset ?? 0) || 0, 0)
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('offset', String(offset))
  const response = await call(url, { headers: { prefer: 'count=exact' } })
  const list = await response.json() as Row[]
  const range = response.headers.get('content-range')?.split('/')[1]
  return { guests: list.map((row) => personFromRow(row, now)), total: range && /^\d+$/.test(range) ? Number(range) : offset + list.length }
}

/** 회원 상세: 이 회원으로 옮겨 온 비회원 시절 기록(기기별 한 줄). */
export async function listGuestPeopleForMember(memberId: string, now = new Date()): Promise<AdminGuestPerson[]> {
  if (!UUID.test(memberId)) return []
  const url = table('umsh_guest_people')
  url.searchParams.set('select', 'id,name,birth_year,gender,saju_key,services,visits,first_seen_at,last_seen_at,consented_at,marketing_consented,converted_to,converted_at,anonymized_at,paid_at')
  url.searchParams.set('converted_to', 'eq.' + memberId)
  url.searchParams.set('order', 'first_seen_at.asc')
  url.searchParams.set('limit', '20')
  return (await rows(url)).map((row) => personFromRow(row, now))
}

async function countWhere(params: Array<[string, string]>): Promise<number> {
  const url = table('umsh_guest_people')
  url.searchParams.set('select', 'id')
  url.searchParams.set('limit', '1')
  for (const [column, value] of params) url.searchParams.append(column, value)
  const response = await call(url, { headers: { prefer: 'count=exact' } })
  const range = response.headers.get('content-range')?.split('/')[1]
  if (range && /^\d+$/.test(range)) return Number(range)
  return (await response.json() as Row[]).length
}

/** 비회원 관리 필터 버튼 숫자. 전체 = 회원으로 옮기지 않은 + 옮긴. */
export async function countGuestPeople(now = new Date()): Promise<Record<GuestFilter, number>> {
  const [all, open, converted, paid, stale] = await Promise.all((['all', 'open', 'converted', 'paid', 'stale'] as const).map((filter) => countWhere(filterParams(filter, now))))
  return { all, open, converted, paid, stale }
}

/** 대시보드: 기간 안에 처음 온 비회원(사람). */
export function countGuestPeopleCreated(from: Date, to: Date): Promise<number> {
  return countWhere([['first_seen_at', `gte.${from.toISOString()}`], ['first_seen_at', `lt.${to.toISOString()}`]])
}

/** 대시보드: 기간 안에 SNS 로그인해 회원이 된 비회원(사람). */
export function countGuestPeopleConverted(from: Date, to: Date): Promise<number> {
  return countWhere([['converted_at', `gte.${from.toISOString()}`], ['converted_at', `lt.${to.toISOString()}`]])
}

/** 대시보드 배지: 마지막 방문 30일이 지나 정리를 기다리는 비회원. */
export function countStaleGuests(now = new Date()): Promise<number> {
  return countWhere(filterParams('stale', now))
}

/**
 * 30일 지난 비회원 정리(대표 결정 2026-10-15: 운영자가 원할 때 누른다, 통계는 남긴다).
 * - 장부 줄: 이름·생일(월·일)·태어난 시·사주 키를 비우고 출생 연도·성별·서비스·방문 수·날짜만 남긴다.
 * - 방문마다 생긴 익명 계정: 프로필·리포트·익명 로그인 계정까지 지운다(탈퇴와 같은 경로). 회원으로 옮긴 리포트는 이미 회원 것이라 남는다.
 * ids 를 주면 그중 정리 대상만, 없으면 대상 전부(한 번에 최대 200명).
 */
export async function anonymizeStaleGuests(
  ids: string[] | null,
  now = new Date(),
  deleteAccount: (userId: string) => Promise<unknown> = deleteOwnAccount,
  hasOrders: (userId: string) => Promise<boolean> = async (userId) => (await listPaymentOrders(userId, 1)).length > 0,
): Promise<{ people: number; accounts: number; failedAccounts: number; keptPaid: number }> {
  const url = table('umsh_guest_people')
  url.searchParams.set('select', 'id,guest_user_ids')
  for (const [column, value] of filterParams('stale', now)) url.searchParams.append(column, value)
  if (ids) {
    const valid = ids.filter((id) => UUID.test(id))
    if (!valid.length) return { people: 0, accounts: 0, failedAccounts: 0, keptPaid: 0 }
    url.searchParams.set('id', `in.(${valid.slice(0, 200).join(',')})`)
  }
  url.searchParams.set('limit', '200')
  const targets = await rows(url)
  let accounts = 0
  let failedAccounts = 0
  let keptPaid = 0
  for (const row of targets) {
    // 2026-10-16 결제 표시(paid_at)가 아직 없던 때의 줄도 있으니, 지우기 직전에 주문이 있는지 한 번 더 본다. 있으면 결제한 비회원으로 표시하고 건너뛴다.
    const ids = Array.isArray(row.guest_user_ids) ? row.guest_user_ids as string[] : []
    let paid = false
    for (const guestId of ids) { if (await hasOrders(guestId).catch(() => true)) { paid = true; break } }
    if (paid) { keptPaid += 1; await patchPerson(String(row.id), { paid_at: now.toISOString() }).catch(() => undefined); continue }
    const failed: string[] = []
    for (const guestId of Array.isArray(row.guest_user_ids) ? row.guest_user_ids as string[] : []) {
      try { await deleteAccount(guestId); accounts += 1 } catch { failed.push(guestId); failedAccounts += 1 }
    }
    // 이름·생일은 바로 지운다. 지우지 못한 계정이 남으면 정리 완료로 표시하지 않아, 다시 누를 때 그 계정만 다시 지운다.
    await patchPerson(String(row.id), {
      name: null, birth_month: null, birth_day: null, birth_hour: null, birth_minute: null, is_leap_month: null, birth_time_known: null,
      saju_key: `anon:${String(row.id)}`,
      guest_user_ids: failed,
      anonymized_at: failed.length ? null : now.toISOString(),
    })
  }
  return { people: targets.length - keptPaid, accounts, failedAccounts, keptPaid }
}

/** 운영자 수동 합치기(2026-10-16): 비회원 한 줄과 그 줄에 묶인 방문(익명 계정)들. */
export async function getGuestPerson(id: string): Promise<{ id: string; guestUserIds: string[]; name: string | null; convertedTo: string | null } | null> {
  if (!UUID.test(id)) return null
  const url = table('umsh_guest_people')
  url.searchParams.set('select', 'id,guest_user_ids,name,converted_to')
  url.searchParams.set('id', `eq.${id}`)
  url.searchParams.set('limit', '1')
  const row = (await rows(url))[0]
  if (!row) return null
  return {
    id: String(row.id),
    guestUserIds: Array.isArray(row.guest_user_ids) ? row.guest_user_ids.filter((item): item is string => typeof item === 'string') : [],
    name: str(row.name),
    convertedTo: str(row.converted_to),
  }
}
