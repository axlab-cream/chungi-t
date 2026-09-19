import { configuredEnv } from '../env/load.js'
import { listPaymentOrders, type PaymentOrder } from '../payment/order-store.js'

type RestRow = Record<string, unknown>

export type AdminMemberSummary = {
  /** Page-relative display ordinal (offset + index + 1) — not a stored membership number, shifts if the page or sort order changes. */
  no?: number
  /** Raw, unmasked user_id — this screen is a deliberate lookup (list page or exact-ID search), not a scan-safe public listing. */
  id: string
  name: string
  email: string | null
  createdAt: string
  /** Supabase Auth's own last_sign_in_at. Null when the account has never signed in or the auth lookup failed. */
  lastSignInAt: string | null
  /** Supabase Auth app_metadata.provider (kakao/google/email/…). Null when unknown. */
  signupProvider: string | null
  /** Proxy for "완성된 사주 프로필을 등록했는가" — this app's core personal info is name + birth data, and only name is cheaply checkable here. */
  personalInfoRegistered: boolean
  /** Settled (paid/viewed) order count. */
  purchaseCount: number
  totalPurchaseAmount: number
  updatedAt: string
}

export type AdminMemberPurchase = {
  orderId: string
  productTitle: string
  amount: number
  status: string
  reportId: string | null
  /** null when the order has no bound report, or the report lookup failed. */
  reportComplete: boolean | null
  createdAt: string
}

export type AdminReportSummary = {
  reportId: string
  /** Raw, unmasked report_id — only for admin actions (e.g. the PDF button's fetch target), never rendered as visible text. */
  id: string
  member: string
  serviceKey: string
  status: string
  /** True once report.status is 'complete' — the point at which a customer-facing PDF exists to hand out. */
  pdfReady: boolean
  createdAt: string
  updatedAt: string
}

export type AdminGenerationFailure = {
  reportId: string
  member: string
  serviceKey: string
  sectionId: string
  errorSummary: string
  model: string
  occurredAt: string
}

export type AdminQualityReview = {
  reportId: string
  member: string
  serviceKey: string
  sectionId: string
  classification: string
  /** 1차(엄격 검수)를 못 넘고 2차(편집 재생성) 또는 3차(안전 검수만) 로 완성됐다는 뜻이다. */
  reviewMode: string
  reviewNotes: string
  updatedAt: string
}

const supabaseUrl = configuredEnv(process.env.SUPABASE_URL)?.replace(/\/$/, '')
const serviceRoleKey = configuredEnv(process.env.SUPABASE_SERVICE_ROLE_KEY)

function serviceHeaders(): Record<string, string> {
  if (!serviceRoleKey) throw new Error('LIVE_DATA_STORE_UNAVAILABLE')
  const headers: Record<string, string> = { apikey: serviceRoleKey }
  if (!serviceRoleKey.startsWith('sb_secret_') && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(serviceRoleKey)) {
    headers.authorization = `Bearer ${serviceRoleKey}`
  }
  return headers
}

function tableUrl(table: string): string {
  if (!supabaseUrl) throw new Error('LIVE_DATA_STORE_UNAVAILABLE')
  return `${supabaseUrl}/rest/v1/${table}`
}

async function countRows(table: string, key: string): Promise<number> {
  const url = new URL(tableUrl(table))
  url.searchParams.set('select', key)
  url.searchParams.set('limit', '1')
  const response = await fetch(url, { headers: { ...serviceHeaders(), prefer: 'count=exact' } })
  if (!response.ok) throw new Error('LIVE_DATA_COUNT_FAILED')
  const total = response.headers.get('content-range')?.split('/')[1]
  if (total && /^\d+$/.test(total)) return Number(total)
  return (await response.json() as unknown[]).length
}

function clipped(value: unknown, fallback: string): string {
  const text = typeof value === 'string' ? value.trim() : ''
  return text ? text.slice(0, 120) : fallback
}

function maskIdentifier(value: unknown): string {
  const text = clipped(value, '')
  if (!text) return '연결되지 않음'
  return text.length <= 8 ? `${text.slice(0, 2)}•••` : `${text.slice(0, 6)}••••`
}

function maskEmail(value: unknown): string {
  const email = clipped(value, '')
  const at = email.indexOf('@')
  if (at <= 0) return maskIdentifier(email)
  return `${email.slice(0, 1)}•••${email.slice(at)}`
}

/**
 * 2026-09-19: "연결되지 않음"이 회원 자체가 없다는 뜻으로 읽혔지만, 실제로는 회원 계정은
 * 있는데 이메일만 없는 경우가 섞여 있었다(가입 경로에 따라 이메일이 없을 수 있다).
 * user_id 가 있으면 그것을 마스킹해 보여준다 — 진짜로 연결이 없는 것과 구분한다.
 */
function reportMemberLabel(email: unknown, userId: unknown): string {
  const masked = maskEmail(email)
  if (masked !== '연결되지 않음') return masked
  const id = clipped(userId, '')
  return id ? `이메일 없음(회원 ${maskIdentifier(id)})` : '연결되지 않음'
}

/** payload.status (top-level ReportStatus), not admin_status and not payload.report.status. */
function reportIsComplete(payload: unknown): boolean {
  return Boolean(payload && typeof payload === 'object' && (payload as Record<string, unknown>).status === 'complete')
}

function reportServiceKey(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '기록 없음'
  const context = (payload as Record<string, unknown>).context
  return context && typeof context === 'object'
    ? clipped((context as Record<string, unknown>).serviceKey, '기록 없음')
    : '기록 없음'
}

function purchaseAmountFacts(orders: PaymentOrder[]): { purchaseCount: number; totalPurchaseAmount: number } {
  const settled = orders.filter((order) => order.status === 'paid' || order.status === 'viewed')
  return {
    purchaseCount: settled.length,
    totalPurchaseAmount: settled.reduce((sum, order) => sum + (Number.isFinite(order.amount) ? order.amount : 0), 0),
  }
}

async function memberPurchaseFacts(userId: string): Promise<{ purchaseCount: number; totalPurchaseAmount: number }> {
  const orders = await listPaymentOrders(userId, 100).catch(() => [] as PaymentOrder[])
  return purchaseAmountFacts(orders)
}

/** Best-effort — a single member's Supabase Auth lookup failing must not blank out the whole list. */
async function memberAuthFacts(userId: string): Promise<{ email: string | null; lastSignInAt: string | null; signupProvider: string | null }> {
  const authUser = await fetchAuthAdminUser(userId).catch(() => null)
  return {
    email: typeof authUser?.email === 'string' ? authUser.email : null,
    lastSignInAt: typeof authUser?.last_sign_in_at === 'string' ? authUser.last_sign_in_at : null,
    signupProvider: typeof authUser?.app_metadata?.provider === 'string' ? authUser.app_metadata.provider : null,
  }
}

/**
 * 2026-09-19: 회원 화면에 가입·최종 방문·SNS·구매 요약을 직접 보여 달라는 요청으로,
 * 행마다 Supabase Auth 조회 1회 + 주문 조회 1회가 추가로 붙는다. 페이지당 20건으로
 * 제한해 두는 이유가 이것이다 — 100건씩 불러오던 예전 기본값을 그대로 쓰면 매 조회마다
 * 최대 200회의 외부 호출이 겹친다.
 */
export async function listLiveMembers(limit = 20, offset = 0): Promise<AdminMemberSummary[]> {
  const url = new URL(tableUrl('cheongi_user_profiles'))
  url.searchParams.set('select', 'user_id,name,created_at,updated_at')
  url.searchParams.set('order', 'updated_at.desc')
  const safeLimit = Math.min(Math.max(limit, 1), 50)
  const safeOffset = Math.max(offset, 0)
  url.searchParams.set('limit', String(safeLimit))
  url.searchParams.set('offset', String(safeOffset))
  const response = await fetch(url, { headers: serviceHeaders() })
  if (!response.ok) throw new Error('LIVE_MEMBER_LOOKUP_FAILED')
  const rows = await response.json() as RestRow[]
  return Promise.all(rows.map(async (row, index) => {
    const userId = clipped(row.user_id, '')
    const [auth, purchases] = await Promise.all([memberAuthFacts(userId), memberPurchaseFacts(userId)])
    return {
      no: safeOffset + index + 1,
      id: userId,
      name: clipped(row.name, '이름 미등록'),
      email: auth.email,
      createdAt: clipped(row.created_at, ''),
      lastSignInAt: auth.lastSignInAt,
      signupProvider: auth.signupProvider,
      personalInfoRegistered: Boolean(clipped(row.name, '')),
      purchaseCount: purchases.purchaseCount,
      totalPurchaseAmount: purchases.totalPurchaseAmount,
      updatedAt: clipped(row.updated_at, ''),
    }
  }))
}

export function countLiveMembers(): Promise<number> {
  return countRows('cheongi_user_profiles', 'user_id')
}

export async function findLiveMember(memberId: string): Promise<AdminMemberSummary | null> {
  const url = new URL(tableUrl('cheongi_user_profiles'))
  url.searchParams.set('user_id', `eq.${memberId}`); url.searchParams.set('select', 'user_id,name,created_at,updated_at'); url.searchParams.set('limit', '1')
  const response = await fetch(url, { headers: serviceHeaders() }); if (!response.ok) throw new Error('LIVE_MEMBER_LOOKUP_FAILED')
  const row = (await response.json() as RestRow[])[0]
  if (!row) return null
  const userId = clipped(row.user_id, '')
  const [auth, purchases] = await Promise.all([memberAuthFacts(userId), memberPurchaseFacts(userId)])
  return {
    id: userId,
    name: clipped(row.name, '이름 미등록'),
    email: auth.email,
    createdAt: clipped(row.created_at, ''),
    lastSignInAt: auth.lastSignInAt,
    signupProvider: auth.signupProvider,
    personalInfoRegistered: Boolean(clipped(row.name, '')),
    purchaseCount: purchases.purchaseCount,
    totalPurchaseAmount: purchases.totalPurchaseAmount,
    updatedAt: clipped(row.updated_at, ''),
  }
}

/** report_id 는 우리 쪽에서 만든 값만 들어오지만, in.() 필터에 얹기 전 형태를 한 번 더 확인한다. */
async function reportCompletionByIds(reportIds: string[]): Promise<Map<string, boolean>> {
  const map = new Map<string, boolean>()
  const validIds = reportIds.filter((id) => /^[a-zA-Z0-9_-]{1,160}$/.test(id))
  if (!validIds.length) return map
  const url = new URL(tableUrl('cheongi_reports'))
  url.searchParams.set('select', 'report_id,payload')
  url.searchParams.set('report_id', `in.(${validIds.join(',')})`)
  const response = await fetch(url, { headers: serviceHeaders() })
  if (!response.ok) return map
  const rows = await response.json() as RestRow[]
  for (const row of rows) {
    if (typeof row.report_id === 'string') map.set(row.report_id, reportIsComplete(row.payload))
  }
  return map
}

/**
 * 회원 상세의 "구매 목록" — 완성 여부(PDF 받기 가능 여부)까지 함께 준다. 별도 저장소를
 * 두지 않는다: 주문은 order-store 가 이미 갖고 있고, 완성 여부는 cheongi_reports.payload.status
 * 그대로다(리포트 화면의 pdfReady 와 같은 판정).
 */
export async function listMemberPurchases(userId: string, limit = 100): Promise<{ purchases: AdminMemberPurchase[]; purchaseCount: number; totalPurchaseAmount: number }> {
  const orders = await listPaymentOrders(userId, limit)
  const reportIds = Array.from(new Set(orders.map((order) => order.reportId).filter((id): id is string => Boolean(id))))
  const completion = await reportCompletionByIds(reportIds)
  const purchases = orders.map((order) => ({
    orderId: order.orderId,
    productTitle: order.productTitle,
    amount: order.amount,
    status: order.status,
    reportId: order.reportId ?? null,
    reportComplete: order.reportId ? completion.get(order.reportId) ?? null : null,
    createdAt: order.createdAt,
  }))
  return { purchases, ...purchaseAmountFacts(orders) }
}

export async function listLiveReports(limit = 100): Promise<AdminReportSummary[]> {
  const url = new URL(tableUrl('cheongi_reports'))
  url.searchParams.set('select', 'report_id,user_id,user_email,admin_status,payload,created_at,updated_at')
  url.searchParams.set('order', 'updated_at.desc')
  url.searchParams.set('limit', String(Math.min(Math.max(limit, 1), 100)))
  const response = await fetch(url, { headers: serviceHeaders() })
  if (!response.ok) throw new Error('LIVE_REPORT_LOOKUP_FAILED')
  return (await response.json() as RestRow[]).map((row) => ({
    reportId: maskIdentifier(row.report_id),
    id: clipped(row.report_id, ''),
    member: reportMemberLabel(row.user_email, row.user_id),
    serviceKey: reportServiceKey(row.payload),
    status: clipped(row.admin_status, 'new'),
    pdfReady: reportIsComplete(row.payload),
    createdAt: clipped(row.created_at, ''),
    updatedAt: clipped(row.updated_at, ''),
  }))
}

export function countLiveReports(): Promise<number> {
  return countRows('cheongi_reports', 'report_id')
}

/**
 * "평가" 메뉴가 보여줄 실제 데이터.
 *
 * 별도의 평가 저장소를 새로 만들지 않는다 — 이미 생성 파이프라인이 각 항목에
 * `reviewMode`(strict·repaired·lenient)를 남기고 있다(2026-09-18 재검증 단계 도입).
 * `repaired`·`lenient` 는 1차 엄격 검수를 못 넘고 2·3차로 완성됐다는 뜻이라, 그 자체가
 * 실제 품질 검토 이력이다. 여기서는 그 기록을 리포트 저장소에서 그대로 뽑아 보여준다.
 */
export async function listQualityReviews(limit = 200): Promise<AdminQualityReview[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 200)
  const url = new URL(tableUrl('cheongi_reports'))
  url.searchParams.set('select', 'report_id,user_email,payload,updated_at')
  url.searchParams.set('order', 'updated_at.desc')
  url.searchParams.set('limit', String(safeLimit))
  const response = await fetch(url, { headers: serviceHeaders() })
  if (!response.ok) throw new Error('QUALITY_REVIEW_LOOKUP_FAILED')
  const rows = await response.json() as RestRow[]
  const reviews: AdminQualityReview[] = []
  for (const row of rows) {
    const payload = row.payload as Record<string, unknown> | undefined
    const report = payload?.report as Record<string, unknown> | undefined
    const sections = Array.isArray(report?.sections) ? report.sections as RestRow[] : []
    for (const section of sections) {
      const reviewMode = typeof section.reviewMode === 'string' ? section.reviewMode : ''
      if (reviewMode !== 'repaired' && reviewMode !== 'lenient') continue
      const notes = Array.isArray(section.reviewNotes) ? section.reviewNotes.map(String).join(' · ') : ''
      reviews.push({
        reportId: maskIdentifier(row.report_id),
        member: maskEmail(row.user_email),
        serviceKey: reportServiceKey(payload),
        sectionId: clipped(section.id, ''),
        classification: clipped(section.classification, ''),
        reviewMode,
        reviewNotes: notes || '기록 없음',
        updatedAt: clipped(row.updated_at, ''),
      })
    }
  }
  return reviews.slice(0, safeLimit)
}

/**
 * "로그" 메뉴가 보여줄 실제 데이터.
 *
 * 구조화된 시스템 로그 적재는 이 서비스에 아직 없다 — 앱 전체 실패 경로에 기록 훅을
 * 심어야 하는 큰 작업이라 이번 범위에서 뺐다. 대신 생성 파이프라인이 항목마다 이미
 * 남기는 시도 기록(`attempts[]`)에서 실패한 시도만 뽑는다. 잔액 소진·요청 거절·429·
 * 검수 미통과 등 실제로 무엇이 언제 왜 실패했는지가 이미 여기 있다 — 개별 리포트
 * 화면(reportDiagnostics)에서만 보이던 것을 서비스 전체에 걸쳐 시간순으로 모은다.
 */
export async function listGenerationFailureLog(limit = 200): Promise<AdminGenerationFailure[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 200)
  const url = new URL(tableUrl('cheongi_reports'))
  url.searchParams.set('select', 'report_id,user_email,payload,updated_at')
  url.searchParams.set('order', 'updated_at.desc')
  // 실패 시도는 최근에 손댄 리포트에 몰려 있다. 넉넉히 훑어 최근 실패 200건을 채운다.
  url.searchParams.set('limit', String(Math.min(safeLimit * 2, 400)))
  const response = await fetch(url, { headers: serviceHeaders() })
  if (!response.ok) throw new Error('GENERATION_LOG_LOOKUP_FAILED')
  const rows = await response.json() as RestRow[]
  const failures: AdminGenerationFailure[] = []
  for (const row of rows) {
    const payload = row.payload as Record<string, unknown> | undefined
    const report = payload?.report as Record<string, unknown> | undefined
    const sections = Array.isArray(report?.sections) ? report.sections as RestRow[] : []
    for (const section of sections) {
      const attempts = Array.isArray(section.attempts) ? section.attempts as RestRow[] : []
      for (const attempt of attempts) {
        if (attempt.status !== 'failed' || !attempt.error) continue
        failures.push({
          reportId: maskIdentifier(row.report_id),
          member: maskEmail(row.user_email),
          serviceKey: reportServiceKey(payload),
          sectionId: clipped(section.id, ''),
          errorSummary: clipped(attempt.error, ''),
          model: clipped(attempt.model, '알 수 없음'),
          occurredAt: clipped(attempt.startedAt, ''),
        })
      }
    }
  }
  failures.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
  return failures.slice(0, safeLimit)
}

export async function findLiveReport(reportId: string): Promise<AdminReportSummary | null> {
  const url = new URL(tableUrl('cheongi_reports'))
  url.searchParams.set('report_id', `eq.${reportId}`); url.searchParams.set('select', 'report_id,user_id,user_email,admin_status,payload,created_at,updated_at'); url.searchParams.set('limit', '1')
  const response = await fetch(url, { headers: serviceHeaders() }); if (!response.ok) throw new Error('LIVE_REPORT_LOOKUP_FAILED')
  const row = (await response.json() as RestRow[])[0]
  return row ? { reportId: maskIdentifier(row.report_id), id: clipped(row.report_id, ''), member: reportMemberLabel(row.user_email, row.user_id), serviceKey: reportServiceKey(row.payload), status: clipped(row.admin_status, 'new'), pdfReady: reportIsComplete(row.payload), createdAt: clipped(row.created_at, ''), updatedAt: clipped(row.updated_at, '') } : null
}

export type AdminMemberBirth = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  gender: 'male' | 'female'
  calendar: 'solar' | 'lunar'
  isLeapMonth: boolean
}

/**
 * 2026-09-19: 회원 상세·수정 화면 전용 조회다. 관리자가 목록의 "상세" 버튼이나
 * "정확 식별자 검색"으로 이미 특정 회원 한 명을 지목한 다음에만 연다.
 */
export type AdminMemberProfile = {
  userId: string
  email: string | null
  name: string | null
  birth: AdminMemberBirth | null
  birthTimeKnown: boolean | null
  createdAt: string | null
  updatedAt: string | null
  banned: boolean
  bannedUntil: string | null
  lastSignInAt: string | null
  signupProvider: string | null
}

export type AdminMemberProfileInput = {
  userId: string
  name: string
  birth: AdminMemberBirth
  birthTimeKnown: boolean
}

type AuthAdminUser = { id: string; email?: string; banned_until?: string | null; last_sign_in_at?: string | null; app_metadata?: { provider?: string } }

async function fetchMemberProfileRow(userId: string): Promise<RestRow | null> {
  const url = new URL(tableUrl('cheongi_user_profiles'))
  url.searchParams.set('select', 'user_id,name,birth_year,birth_month,birth_day,birth_hour,birth_minute,gender,calendar,is_leap_month,birth_time_known,created_at,updated_at')
  url.searchParams.set('user_id', `eq.${userId}`)
  url.searchParams.set('limit', '1')
  const response = await fetch(url, { headers: serviceHeaders() })
  if (!response.ok) throw new Error('MEMBER_PROFILE_LOOKUP_FAILED')
  return (await response.json() as RestRow[])[0] ?? null
}

async function fetchAuthAdminUser(userId: string): Promise<AuthAdminUser | null> {
  if (!supabaseUrl) throw new Error('LIVE_DATA_STORE_UNAVAILABLE')
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, { headers: serviceHeaders() })
  if (response.status === 404) return null
  if (!response.ok) throw new Error('MEMBER_AUTH_LOOKUP_FAILED')
  return await response.json() as AuthAdminUser
}

function memberIsBanned(bannedUntil: string | null | undefined): boolean {
  if (!bannedUntil) return false
  const until = Date.parse(bannedUntil)
  return Number.isFinite(until) && until > Date.now()
}

function memberProfileFromRow(userId: string, row: RestRow | null, authUser: AuthAdminUser | null): AdminMemberProfile {
  return {
    userId,
    email: typeof authUser?.email === 'string' ? authUser.email : null,
    name: row && typeof row.name === 'string' ? row.name : null,
    birth: row ? {
      year: Number(row.birth_year), month: Number(row.birth_month), day: Number(row.birth_day),
      hour: Number(row.birth_hour), minute: Number(row.birth_minute ?? 0),
      gender: row.gender === 'female' ? 'female' : 'male',
      calendar: row.calendar === 'lunar' ? 'lunar' : 'solar',
      isLeapMonth: Boolean(row.is_leap_month),
    } : null,
    birthTimeKnown: row ? Boolean(row.birth_time_known) : null,
    createdAt: typeof row?.created_at === 'string' ? row.created_at : null,
    updatedAt: typeof row?.updated_at === 'string' ? row.updated_at : null,
    banned: memberIsBanned(authUser?.banned_until),
    bannedUntil: authUser?.banned_until ?? null,
    lastSignInAt: typeof authUser?.last_sign_in_at === 'string' ? authUser.last_sign_in_at : null,
    signupProvider: typeof authUser?.app_metadata?.provider === 'string' ? authUser.app_metadata.provider : null,
  }
}

/** 프로필 행도 인증 계정도 없으면 null — 있는 쪽만으로 임의 값을 지어내지 않는다. */
export async function getAdminMemberDetail(userId: string): Promise<AdminMemberProfile | null> {
  const [row, authUser] = await Promise.all([fetchMemberProfileRow(userId), fetchAuthAdminUser(userId)])
  if (!row && !authUser) return null
  return memberProfileFromRow(userId, row, authUser)
}

export async function updateAdminMemberProfile(input: AdminMemberProfileInput): Promise<AdminMemberProfile> {
  const response = await fetch(tableUrl('cheongi_user_profiles'), {
    method: 'POST',
    headers: { ...serviceHeaders(), 'content-type': 'application/json', prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({
      user_id: input.userId,
      name: input.name,
      birth_year: input.birth.year,
      birth_month: input.birth.month,
      birth_day: input.birth.day,
      birth_hour: input.birth.hour,
      birth_minute: input.birth.minute,
      gender: input.birth.gender,
      calendar: input.birth.calendar,
      is_leap_month: input.birth.isLeapMonth,
      birth_time_known: input.birthTimeKnown,
      updated_at: new Date().toISOString(),
    }),
  })
  if (!response.ok) throw new Error('MEMBER_PROFILE_SAVE_FAILED')
  const detail = await getAdminMemberDetail(input.userId)
  if (!detail) throw new Error('MEMBER_PROFILE_SAVE_FAILED')
  return detail
}

/**
 * Supabase Auth 의 계정 정지 기능을 그대로 쓴다 — 새 컬럼·마이그레이션이 필요 없다.
 * `ban_duration: 'none'` 이 공식 해제 값이다(Supabase Auth Admin API).
 */
export async function setMemberBanned(userId: string, banned: boolean): Promise<AdminMemberProfile> {
  if (!supabaseUrl) throw new Error('LIVE_DATA_STORE_UNAVAILABLE')
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: { ...serviceHeaders(), 'content-type': 'application/json' },
    body: JSON.stringify({ ban_duration: banned ? '876000h' : 'none' }),
  })
  if (!response.ok) throw new Error('MEMBER_BAN_UPDATE_FAILED')
  const detail = await getAdminMemberDetail(userId)
  if (!detail) throw new Error('MEMBER_BAN_UPDATE_FAILED')
  return detail
}
