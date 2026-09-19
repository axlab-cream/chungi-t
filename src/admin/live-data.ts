import { configuredEnv } from '../env/load.js'

type RestRow = Record<string, unknown>

export type AdminMemberSummary = {
  memberId: string
  name: string
  createdAt: string
  updatedAt: string
}

export type AdminReportSummary = {
  reportId: string
  member: string
  serviceKey: string
  status: string
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

function maskName(value: unknown): string {
  const text = clipped(value, '')
  if (!text) return '이름 미등록'
  return text.length === 1 ? '•' : `${text.slice(0, 1)}•`
}

function maskEmail(value: unknown): string {
  const email = clipped(value, '')
  const at = email.indexOf('@')
  if (at <= 0) return maskIdentifier(email)
  return `${email.slice(0, 1)}•••${email.slice(at)}`
}

function reportServiceKey(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '기록 없음'
  const context = (payload as Record<string, unknown>).context
  return context && typeof context === 'object'
    ? clipped((context as Record<string, unknown>).serviceKey, '기록 없음')
    : '기록 없음'
}

export async function listLiveMembers(limit = 100): Promise<AdminMemberSummary[]> {
  const url = new URL(tableUrl('cheongi_user_profiles'))
  url.searchParams.set('select', 'user_id,name,created_at,updated_at')
  url.searchParams.set('order', 'updated_at.desc')
  url.searchParams.set('limit', String(Math.min(Math.max(limit, 1), 100)))
  const response = await fetch(url, { headers: serviceHeaders() })
  if (!response.ok) throw new Error('LIVE_MEMBER_LOOKUP_FAILED')
  return (await response.json() as RestRow[]).map((row) => ({
    memberId: maskIdentifier(row.user_id),
    name: maskName(row.name),
    createdAt: clipped(row.created_at, ''),
    updatedAt: clipped(row.updated_at, ''),
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
  return row ? { memberId: maskIdentifier(row.user_id), name: maskName(row.name), createdAt: clipped(row.created_at, ''), updatedAt: clipped(row.updated_at, '') } : null
}

export async function listLiveReports(limit = 100): Promise<AdminReportSummary[]> {
  const url = new URL(tableUrl('cheongi_reports'))
  url.searchParams.set('select', 'report_id,user_email,admin_status,payload,created_at,updated_at')
  url.searchParams.set('order', 'updated_at.desc')
  url.searchParams.set('limit', String(Math.min(Math.max(limit, 1), 100)))
  const response = await fetch(url, { headers: serviceHeaders() })
  if (!response.ok) throw new Error('LIVE_REPORT_LOOKUP_FAILED')
  return (await response.json() as RestRow[]).map((row) => ({
    reportId: maskIdentifier(row.report_id),
    member: maskEmail(row.user_email),
    serviceKey: reportServiceKey(row.payload),
    status: clipped(row.admin_status, 'new'),
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
  url.searchParams.set('report_id', `eq.${reportId}`); url.searchParams.set('select', 'report_id,user_email,admin_status,payload,created_at,updated_at'); url.searchParams.set('limit', '1')
  const response = await fetch(url, { headers: serviceHeaders() }); if (!response.ok) throw new Error('LIVE_REPORT_LOOKUP_FAILED')
  const row = (await response.json() as RestRow[])[0]
  return row ? { reportId: maskIdentifier(row.report_id), member: maskEmail(row.user_email), serviceKey: reportServiceKey(row.payload), status: clipped(row.admin_status, 'new'), createdAt: clipped(row.created_at, ''), updatedAt: clipped(row.updated_at, '') } : null
}
