import { createHash, randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { FileReportStorage } from './file-report-storage.js'
import { configuredEnv } from '../env/load.js'
import { Pool } from 'pg'
import { corpusCacheSalt, getCorpusSnapshot } from '../rag/corpus-registry.js'
import { createSavedPreview, type ReportPreview } from './report-preview.js'
import type { TodayFortune } from '../saju/today-fortune.js'
import type { BirthInput, ConversationTurn, CorpusSnapshot, SajuAnalysis, SajuReport, SajuReportContext, SajuReportSection } from '../types/index.js'

export type ReportStatus = 'pending' | 'generating' | 'complete' | 'failed'
export type ReportStorageMode = 'postgres' | 'supabase' | 'file' | 'memory'
export interface ReportStorageReadiness {
  mode: ReportStorageMode
  ok: boolean
  durable: boolean
  keyKind: 'secret' | 'legacy-jwt' | 'missing' | 'unknown' | 'none'
  httpStatus?: number
  errorCode?: string
  /** Local claim comparisons only; these are not JWT signature verification. */
  jwtRoleMatches?: boolean
  jwtProjectMatches?: boolean
}
export interface ReportRecord {
  reportId: string
  resultId?: string
  revision?: number
  analysis?: SajuAnalysis
  preview?: ReportPreview
  auxiliary?: { todayFortune?: TodayFortune }
  birth: BirthInput
  context: SajuReportContext
  owner?: ReportOwner
  corpus?: CorpusSnapshot
  /**
   * 코퍼스 내용과 무관한 해석 계보 키. 같은 사람·같은 입력이면 코퍼스가 바뀌어도 같다.
   * 캐시 승계와 결제 권한 판정이 이 키를 따른다. 도입 이전 레코드에는 없다.
   */
  lineageId?: string
  /** 이 레코드를 만든 캐시 세대. 비어 있으면 도입 이전이거나 기준 세대다. */
  cacheEpoch?: string
  report: SajuReport
  status: ReportStatus
  createdAt: string
  updatedAt: string
  chatHistory?: ConversationTurn[]
  /**
   * 사용자가 이 해석을 신고한 기록.
   *
   * 생성형 AI 결과에는 앱을 나가지 않고 신고할 수 있는 경로가 있어야 한다.
   * 신고 내용을 리포트에 함께 두면 어떤 문장을 두고 한 신고인지 대조할 수 있다.
   */
  flags?: Array<{
    id: string
    sectionId?: string
    reason: string
    detail?: string
    createdAt: string
  }>
  error?: string
}

export interface ReportOwner {
  id: string
  email?: string
  provider?: string
  accessToken?: string
}

const connectionString = configuredEnv(process.env.DATABASE_URL)
const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: /localhost|127\.0\.0\.1/i.test(connectionString) ? false : { rejectUnauthorized: false },
    })
  : null
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? ''
const supabaseServiceRoleKey = configuredEnv(process.env.SUPABASE_SERVICE_ROLE_KEY)
const supabaseRestUrl = supabaseUrl
  ? `${supabaseUrl.replace(/\/$/, '')}/rest/v1/cheongi_reports`
  : ''

const memoryReports = new Map<string, ReportRecord>()
const isTestStorage = process.env.NODE_ENV === 'test' || process.env.npm_lifecycle_event === 'test' || process.argv.includes('--test')
const isProductionStorage = Boolean(process.env.VERCEL) || process.env.NODE_ENV === 'production'
const localFiles = !isProductionStorage && (process.env.REPORT_STORAGE_DIR || (!isTestStorage && !pool && !supabaseRestUrl))
  ? new FileReportStorage(resolve(process.env.REPORT_STORAGE_DIR || '.cache/report-snapshots')) : null
let dbReady: Promise<void> | null = null

function storageMode(): ReportStorageMode {
  if (localFiles) return 'file'
  if (pool) return 'postgres'
  // A configured URL with a missing server key is a configuration error, not a
  // reason to silently create an ephemeral result or use a browser credential.
  if (supabaseRestUrl) return 'supabase'
  return 'memory'
}

export function assertDurableReportStorage(): void {
  if (storageMode() === 'supabase') assertSupabaseServerKey()
  if (storageMode() === 'memory' && (process.env.VERCEL || process.env.NODE_ENV === 'production')) {
    throw new Error('영구 리포트 저장소가 설정되지 않아 생성을 시작할 수 없습니다.')
  }
}

export function assertReportOwner(record: ReportRecord, owner?: ReportOwner): void {
  if (record.owner?.id && record.owner.id !== owner?.id) throw new Error('REPORT_ACCESS_DENIED')
  if (!record.owner?.id && owner?.id) throw new Error('REPORT_ACCESS_DENIED')
}

function nowIso(): string {
  return new Date().toISOString()
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined && v !== '')
      .sort(([a], [b]) => a.localeCompare(b))
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableJson(v)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function birthKey(birth: BirthInput): Record<string, unknown> {
  return {
    year: birth.year,
    month: birth.month,
    day: birth.day,
    hour: birth.hour,
    minute: birth.minute ?? 0,
    gender: birth.gender,
    calendar: birth.calendar,
    isLeapMonth: birth.isLeapMonth ?? false,
  }
}

export function createReportId(
  birth: BirthInput,
  context: SajuReportContext,
  corpusFingerprint = getCorpusSnapshot().fingerprint,
  ownerId?: string,
): string {
  // stableJson 은 빈 문자열 항목을 버린다. 기준 세대(cacheEpoch = "")에서는
  // 아래 객체가 도입 전과 완전히 같아지므로 기존 리포트 ID가 그대로 유지된다.
  const fingerprint = stableJson({
    birth: birthKey(birth),
    cacheEpoch: corpusCacheSalt(),
    corpusFingerprint,
    context,
    ownerId: ownerId ?? '',
  })
  return createHash('sha256').update(fingerprint).digest('hex').slice(0, 28)
}

/**
 * 코퍼스 내용에 의존하지 않는 계보 키.
 *
 * `createReportId` 는 코퍼스 지문을 포함한다 — 코퍼스를 한 글자만 고쳐도 ID가 바뀌고,
 * 그러면 (1) LLM 이 처음부터 다시 돌고 (2) 그 ID에 묶인 결제 주문이 열쇠를 잃는다.
 * 계보 키는 생년월일·맥락·소유자만 보므로 코퍼스 개정을 건너뛴다.
 * 세대를 올렸을 때만 함께 바뀌어, 의도한 무효화는 그대로 동작한다.
 */
export function createReportLineageId(
  birth: BirthInput,
  context: SajuReportContext,
  ownerId?: string,
): string {
  const seed = stableJson({
    birth: birthKey(birth),
    cacheEpoch: corpusCacheSalt(),
    context,
    lineage: '1',
    ownerId: ownerId ?? '',
  })
  return createHash('sha256').update(seed).digest('hex').slice(0, 28)
}

/** Preserve existing known-time IDs while separating an explicitly unknown birth time. */
export function withReportBirthCertainty(reportId: string, birthTimeKnown: boolean): string {
  return birthTimeKnown ? reportId : createHash('sha256').update(`${reportId}:birth-time-unknown`).digest('hex').slice(0, 28)
}

async function ensureReportOwnerColumns(): Promise<void> {
  if (!pool) return
  await pool.query(`
    ALTER TABLE cheongi_reports
      ADD COLUMN IF NOT EXISTS user_id TEXT,
      ADD COLUMN IF NOT EXISTS user_email TEXT,
      ADD COLUMN IF NOT EXISTS auth_provider TEXT,
      ADD COLUMN IF NOT EXISTS admin_status TEXT NOT NULL DEFAULT 'new'
  `)
  await pool.query(`
    CREATE INDEX IF NOT EXISTS cheongi_reports_user_id_idx
      ON cheongi_reports (user_id)
  `)
}

async function ensureDb(): Promise<void> {
  if (!pool) return
  if (!dbReady) {
    dbReady = pool.query(`
      CREATE TABLE IF NOT EXISTS cheongi_reports (
        report_id TEXT PRIMARY KEY,
        payload JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
      .then(() => ensureReportOwnerColumns())
      .then(() => undefined)
  }
  await dbReady
}

function cloneRecord(record: ReportRecord): ReportRecord {
  return JSON.parse(JSON.stringify(record)) as ReportRecord
}

function recordForStorage(record: ReportRecord): ReportRecord {
  const stored = cloneRecord(record)
  if (stored.owner?.accessToken) {
    delete stored.owner.accessToken
  }
  return stored
}

/**
 * 목록용 진행률. 레코드를 복제하지 않고 읽기만 한다.
 *
 * `toClientReport` 는 리포트 전체를 JSON 으로 복제한 뒤 진행률을 센다 — 항목이 41개인
 * 리포트면 수십 KB 를 매 행마다 직렬화한다. 보관함 목록은 숫자 두 개만 필요하므로
 * 복제 없이 센다. 판정 규칙은 `toClientReport` 와 같다(보이는 목차가 다 되면 완성).
 */
export function reportProgressOf(record: ReportRecord): { complete: number; total: number; status: ReportStatus } {
  const sections: SajuReport['sections'] = record.report?.sections ?? []
  const total = sections.length
  const done = sections.filter((section) => section.status === 'complete').length
  const complete = record.status === 'complete' || (total > 0 && done >= total) ? total : done
  const status: ReportStatus = total > 0 && complete >= total ? 'complete' : record.status
  return { complete, total, status }
}

function progressFor(report: SajuReport): { complete: number; total: number } {
  const total = report.sections.length
  const complete = report.status === 'complete' ? total : report.sections.filter((section) => section.status === 'complete').length
  return { complete, total }
}

export function sectionGenerationId(record: ReportRecord, section: SajuReportSection): string {
  return section.generationId ?? `legacy_${createHash('sha256').update(`${record.reportId}:${section.id}`).digest('hex').slice(0, 28)}`
}

export function toClientReport(record: ReportRecord): SajuReport {
  const report = cloneRecord(record).report
  report.reportId = record.reportId
  report.status = record.status
  report.storage = storageMode()
  report.corpus = record.corpus ?? report.corpus
  report.progress = progressFor(report)
  report.resultId = record.resultId ?? report.publicId ?? record.reportId
  report.publicId = report.resultId
  report.publicUrl = `/r/${encodeURIComponent(report.resultId)}`
  report.serviceKey = record.context.serviceKey ?? 'saju_master'
  report.sections = report.sections.map(({ attempts: _attempts, generationLease: _lease, ...section }) => ({ ...section, generationId: sectionGenerationId(record, section), status: record.status === 'complete' ? 'complete' : section.status }))
  return report
}

function assertSupabaseServerKey(): void {
  if (!supabaseServiceRoleKey) throw new Error('서버 전용 리포트 저장소 키가 설정되지 않았습니다.')
}

function isLegacyJwtKey(key: string): boolean {
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)
}

/** Full snapshots include private prompts/raw generations: never use a user JWT. */
function supabaseHeaders(): Record<string, string> {
  assertSupabaseServerKey()
  const headers: Record<string, string> = { apikey: supabaseServiceRoleKey! }
  // Hosted Supabase secret keys are opaque API keys, not JWTs. Sending one as
  // Bearer causes JWT validation to reject an otherwise valid server credential.
  if (!supabaseServiceRoleKey!.startsWith('sb_secret_') && isLegacyJwtKey(supabaseServiceRoleKey!)) {
    headers.authorization = `Bearer ${supabaseServiceRoleKey}`
  }
  return headers
}

function safeKeyDiagnostics(): Pick<ReportStorageReadiness, 'keyKind' | 'jwtRoleMatches' | 'jwtProjectMatches'> {
  if (!supabaseServiceRoleKey) return { keyKind: 'missing' }
  if (supabaseServiceRoleKey.startsWith('sb_secret_')) return { keyKind: 'secret' }
  if (!isLegacyJwtKey(supabaseServiceRoleKey)) return { keyKind: 'unknown' }
  const diagnostics: ReturnType<typeof safeKeyDiagnostics> = { keyKind: 'legacy-jwt' }
  try {
    const claims = JSON.parse(Buffer.from(supabaseServiceRoleKey.split('.')[1], 'base64url').toString('utf8')) as Record<string, unknown>
    diagnostics.jwtRoleMatches = claims.role === 'service_role'
    const hostname = new URL(supabaseUrl).hostname
    if (hostname.endsWith('.supabase.co')) diagnostics.jwtProjectMatches = claims.ref === hostname.split('.')[0]
  } catch {
    // Never surface the token, decoded claims or parser's error message.
  }
  return diagnostics
}

let readinessCache: { expiresAt: number; result: ReportStorageReadiness } | undefined
let readinessInFlight: Promise<ReportStorageReadiness> | undefined

/** Read-only, zero-row probe. Only fixed diagnostic codes/booleans leave here. */
export async function checkReportStorageReadiness(): Promise<ReportStorageReadiness> {
  if (readinessCache && Date.now() < readinessCache.expiresAt) return { ...readinessCache.result }
  if (readinessInFlight) return { ...await readinessInFlight }
  readinessInFlight = (async () => {
    const mode = storageMode()
    const base: ReportStorageReadiness = { mode, ok: false, durable: mode !== 'memory', keyKind: 'none' }
    if (mode === 'memory') return { ...base, errorCode: 'REPORT_STORAGE_NOT_DURABLE' }
    // File mode is local durable storage configuration, not a write-permission
    // test. Health requests must not create/delete files or enumerate reports.
    if (mode === 'file') return { ...base, ok: true }
    if (mode === 'supabase') {
      Object.assign(base, safeKeyDiagnostics())
      if (!supabaseServiceRoleKey) return { ...base, errorCode: 'REPORT_STORAGE_KEY_MISSING' }
    }
    const controller = new AbortController()
    let timedOut = false
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      const probe = (async (): Promise<ReportStorageReadiness> => {
        if (mode === 'postgres') {
          await pool!.query('SELECT 1')
          return { ...base, ok: true }
        }
        const url = new URL(supabaseRestUrl)
        url.searchParams.set('select', 'report_id')
        url.searchParams.set('limit', '0')
        const response = await fetch(url, { headers: supabaseHeaders(), signal: controller.signal })
        // Deliberately do not parse response text/JSON: neither rows nor database
        // error messages should enter this public readiness contract.
        await response.body?.cancel().catch(() => undefined)
        const result = { ...base, httpStatus: response.status }
        if (!response.ok) return { ...result, errorCode: response.status === 401 || response.status === 403 ? 'REPORT_STORAGE_AUTH_REJECTED' : response.status === 404 ? 'REPORT_STORAGE_NOT_FOUND' : 'REPORT_STORAGE_HTTP_ERROR' }
        if (base.jwtRoleMatches === false) return { ...result, errorCode: 'REPORT_STORAGE_KEY_ROLE_MISMATCH' }
        if (base.jwtProjectMatches === false) return { ...result, errorCode: 'REPORT_STORAGE_KEY_PROJECT_MISMATCH' }
        return { ...result, ok: true }
      })()
      return await Promise.race([
        probe,
        new Promise<ReportStorageReadiness>((resolve) => {
          timer = setTimeout(() => {
            timedOut = true
            controller.abort()
            resolve({ ...base, errorCode: 'REPORT_STORAGE_TIMEOUT' })
          }, 3_000)
        }),
      ])
    } catch {
      return { ...base, errorCode: timedOut ? 'REPORT_STORAGE_TIMEOUT' : 'REPORT_STORAGE_UNAVAILABLE' }
    } finally {
      if (timer) clearTimeout(timer)
    }
  })()
  try {
    const result = await readinessInFlight
    readinessCache = { expiresAt: Date.now() + 30_000, result: { ...result } }
    return { ...result }
  } finally {
    readinessInFlight = undefined
  }
}

function assertSupabaseOwner(owner?: ReportOwner): asserts owner is ReportOwner {
  assertSupabaseServerKey()
  if (!owner || typeof owner.id !== 'string' || !owner.id.trim()) throw new Error('REPORT_ACCESS_DENIED')
}

export async function getReportRecord(reportId: string, owner?: ReportOwner): Promise<ReportRecord | null> {
  if (localFiles) return localFiles.read(reportId)
  if (storageMode() === 'memory') {
    const record = memoryReports.get(reportId)
    return record ? cloneRecord(record) : null
  }

  if (storageMode() === 'supabase') {
    assertSupabaseOwner(owner)
    const url = new URL(supabaseRestUrl)
    url.searchParams.set('report_id', `eq.${reportId}`)
    url.searchParams.set('user_id', `eq.${owner.id}`)
    url.searchParams.set('select', 'payload')
    const response = await fetch(url, { headers: supabaseHeaders() })
    if (!response.ok) {
      throw new Error('Supabase 리포트 조회에 실패했습니다.')
    }
    const rows = await response.json() as Array<{ payload?: ReportRecord }>
    const record = rows[0]?.payload ? cloneRecord(rows[0].payload) : null
    if (record) assertReportOwner(record, owner)
    return record
  }

  if (!pool) return null
  await ensureDb()
  const result = await pool.query<{ payload: ReportRecord }>(
    'SELECT payload FROM cheongi_reports WHERE report_id = $1',
    [reportId],
  )
  return result.rows[0]?.payload ? cloneRecord(result.rows[0].payload) : null
}

/** Lookup an immutable result UUID without recomputing inputs or running the LLM. */
export async function findReportRecord(id: string, owner?: ReportOwner): Promise<ReportRecord | null> {
  if (!/^[a-zA-Z0-9_-]{1,160}$/.test(id)) return null
  let record = await getReportRecord(id, owner)
  if (!record && storageMode() === 'memory') {
    record = Array.from(memoryReports.values()).find((item) => item.resultId === id || item.report.publicId === id) ?? null
  } else if (!record && localFiles) {
    record = (await localFiles.list()).find((item) => item.resultId === id || item.report.publicId === id) ?? null
  } else if (!record && storageMode() === 'supabase') {
    assertSupabaseOwner(owner)
    const url = new URL(supabaseRestUrl)
    url.searchParams.set('user_id', `eq.${owner.id}`)
    url.searchParams.set('or', `(payload->>resultId.eq.${id},payload->report->>publicId.eq.${id})`)
    url.searchParams.set('select', 'payload')
    url.searchParams.set('limit', '1')
    const response = await fetch(url, { headers: supabaseHeaders() })
    if (!response.ok) throw new Error('저장된 결과 조회에 실패했습니다.')
    const rows = await response.json() as Array<{ payload: ReportRecord }>
    record = rows[0]?.payload ?? null
  } else if (!record && pool) {
    await ensureDb()
    const rows = await pool.query<{ payload: ReportRecord }>(
      "SELECT payload FROM cheongi_reports WHERE (payload->>'resultId' = $1 OR payload->'report'->>'publicId' = $1) AND user_id = $2 LIMIT 1",
      [id, owner?.id ?? null],
    )
    record = rows.rows[0]?.payload ?? null
  }
  if (record) assertReportOwner(record, owner)
  return record ? cloneRecord(record) : null
}

/**
 * 아직 끝나지 않은 리포트의 식별자만 모은다. 영속 큐에 다시 태우기 위한 것이라 본문은
 * 읽지 않는다 — 백필 한 번에 수백 건의 해석 전문을 메모리에 올릴 이유가 없다.
 *
 * 큐가 도입되기 전에 만들어진 리포트는 작업이 없어서 스스로 이어지지 않는다. 2026-09-17
 * 운영 계정 한 곳에서만 13건 중 12건이 미완성이었다.
 */
export interface IncompleteReportRef {
  reportId: string
  ownerId?: string
  serviceKey?: string
  updatedAt: string
}

/**
 * 미완성 리포트를 소유자·서비스와 함께 돌려준다.
 *
 * 저장소에는 같은 서비스를 여러 번 시험한 기록이 쌓인다(운영 계정: 천명사주 9건, 오늘운
 * 8건). 보관함은 결제분을 모두 보여 주고 결제되지 않은 것은 서비스당 최신 하나만 보여
 * 준다. 만들 대상도 그 기준을 따라야 화면에 없는 중복까지 만들지 않는다.
 */
export async function listIncompleteReportRefs(limit = 200): Promise<IncompleteReportRef[]> {
  const safeLimit = Math.min(Math.max(Number.isInteger(limit) ? limit : 200, 1), 500)
  const fromRecord = (record: ReportRecord): IncompleteReportRef => ({
    reportId: record.reportId,
    ownerId: record.owner?.id,
    serviceKey: record.context?.serviceKey,
    updatedAt: record.updatedAt,
  })
  const incomplete = (record: ReportRecord) => record.status !== 'complete'

  if (localFiles) {
    return (await localFiles.list()).filter(incomplete)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, safeLimit).map(fromRecord)
  }
  if (storageMode() === 'memory') {
    return Array.from(memoryReports.values()).filter(incomplete)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, safeLimit).map(fromRecord)
  }
  if (storageMode() !== 'supabase') return []

  const url = new URL(supabaseRestUrl)
  url.searchParams.set('payload->>status', 'neq.complete')
  // 본문은 읽지 않는다. 판단에 필요한 세 값만 뽑는다.
  url.searchParams.set('select', 'report_id,user_id,updated_at,serviceKey:payload->context->>serviceKey')
  url.searchParams.set('order', 'updated_at.desc')
  url.searchParams.set('limit', String(safeLimit))
  const response = await fetch(url, { headers: supabaseHeaders() })
  if (!response.ok) throw new Error('미완성 리포트 목록 조회에 실패했습니다.')
  const rows = await response.json() as Array<{ report_id?: string; user_id?: string; updated_at?: string; serviceKey?: string }>
  return rows.flatMap((row) => row.report_id
    ? [{ reportId: row.report_id, ownerId: row.user_id, serviceKey: row.serviceKey, updatedAt: row.updated_at ?? '' }]
    : [])
}

export async function listIncompleteReportIds(limit = 200): Promise<string[]> {
  const safeLimit = Math.min(Math.max(Number.isInteger(limit) ? limit : 200, 1), 500)
  const incomplete = (record: ReportRecord) => record.status !== 'complete'

  if (localFiles) {
    return (await localFiles.list()).filter(incomplete)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, safeLimit)
      .map((record) => record.reportId)
  }
  if (storageMode() === 'memory') {
    return Array.from(memoryReports.values()).filter(incomplete)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, safeLimit)
      .map((record) => record.reportId)
  }
  if (storageMode() !== 'supabase') return []

  const url = new URL(supabaseRestUrl)
  // 상태는 payload 안에 있다. 서버에서 걸러야 완료된 것까지 끌고 오지 않는다.
  url.searchParams.set('payload->>status', 'neq.complete')
  url.searchParams.set('select', 'report_id')
  url.searchParams.set('order', 'updated_at.desc')
  url.searchParams.set('limit', String(safeLimit))
  const response = await fetch(url, { headers: supabaseHeaders() })
  if (!response.ok) throw new Error('미완성 리포트 목록 조회에 실패했습니다.')
  const rows = await response.json() as Array<{ report_id?: string }>
  return rows.map((row) => row.report_id).filter((id): id is string => Boolean(id))
}

export async function listReportRecords(owner: ReportOwner, limit = 50): Promise<ReportRecord[]> {
  const safeLimit = Math.min(Math.max(Number.isInteger(limit) ? limit : 50, 1), 100)
  if (localFiles) return (await localFiles.list()).filter((item) => item.owner?.id === owner.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, safeLimit)

  if (storageMode() === 'memory') {
    return Array.from(memoryReports.values())
      .filter((record) => record.owner?.id === owner.id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, safeLimit)
      .map(cloneRecord)
  }

  if (storageMode() === 'supabase') {
    assertSupabaseOwner(owner)
    const url = new URL(supabaseRestUrl)
    url.searchParams.set('user_id', `eq.${owner.id}`)
    url.searchParams.set('select', 'payload,user_id,user_email,auth_provider,created_at,updated_at')
    url.searchParams.set('order', 'updated_at.desc')
    url.searchParams.set('limit', String(safeLimit))

    const response = await fetch(url, { headers: supabaseHeaders() })
    if (!response.ok) {
      throw new Error('Supabase 리포트 목록 조회에 실패했습니다.')
    }
    const rows = await response.json() as Array<{
      payload?: ReportRecord
      user_id?: string
      user_email?: string
      auth_provider?: string
      created_at?: string
      updated_at?: string
    }>
    return rows
      .filter((row) => row.payload?.reportId)
      .map((row) => {
        const record = cloneRecord(row.payload as ReportRecord)
        record.owner = record.owner?.id
          ? record.owner
          : {
              id: row.user_id ?? owner.id,
              email: row.user_email ?? owner.email,
              provider: row.auth_provider ?? owner.provider,
            }
        record.createdAt = record.createdAt || row.created_at || nowIso()
        record.updatedAt = record.updatedAt || row.updated_at || record.createdAt
        assertReportOwner(record, owner)
        return record
      })
  }

  if (!pool) return []
  await ensureDb()
  const result = await pool.query<{ payload: ReportRecord; user_id: string | null; user_email: string | null; auth_provider: string | null; created_at: string; updated_at: string }>(
    `
      SELECT payload, user_id, user_email, auth_provider, created_at, updated_at
      FROM cheongi_reports
      WHERE user_id = $1
      ORDER BY updated_at DESC
      LIMIT $2
    `,
    [owner.id, safeLimit],
  )
  return result.rows
    .filter((row) => row.payload?.reportId)
    .map((row) => {
      const record = cloneRecord(row.payload)
      record.owner = record.owner?.id
        ? record.owner
        : {
            id: row.user_id ?? owner.id,
            email: row.user_email ?? owner.email,
            provider: row.auth_provider ?? owner.provider,
          }
      record.createdAt = record.createdAt || row.created_at || nowIso()
      record.updatedAt = record.updatedAt || row.updated_at || record.createdAt
      return record
    })
}

export async function deleteReportRecord(reportId: string, owner: ReportOwner): Promise<boolean> {
  if (localFiles) {
    const record = await localFiles.read(reportId)
    return record?.owner?.id === owner.id ? localFiles.delete(reportId) : false
  }
  if (storageMode() === 'memory') {
    const record = memoryReports.get(reportId)
    if (!record || record.owner?.id !== owner.id) return false
    return memoryReports.delete(reportId)
  }

  if (storageMode() === 'supabase') {
    assertSupabaseOwner(owner)
    const url = new URL(supabaseRestUrl)
    url.searchParams.set('report_id', `eq.${reportId}`)
    url.searchParams.set('user_id', `eq.${owner.id}`)
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        ...supabaseHeaders(),
        prefer: 'return=representation',
      },
    })
    if (!response.ok) {
      throw new Error('Supabase 리포트 삭제에 실패했습니다.')
    }
    const rows = await response.json().catch(() => []) as unknown[]
    return rows.length > 0
  }

  if (!pool) return false
  await ensureDb()
  const result = await pool.query(
    'DELETE FROM cheongi_reports WHERE report_id = $1 AND user_id = $2',
    [reportId, owner.id],
  )
  return Number(result.rowCount ?? 0) > 0
}

export async function saveReportRecord(record: ReportRecord, insertOnly = true): Promise<ReportRecord> {
  if (!insertOnly) throw new Error('기존 리포트 변경에는 충돌 검사를 지원하는 mutateReportRecord를 사용하세요.')
  assertDurableReportStorage()
  const updated: ReportRecord = {
    ...record,
    updatedAt: nowIso(),
  }
  const stored = recordForStorage(updated)
  if (localFiles) return localFiles.insert(stored)

  if (storageMode() === 'memory') {
    if (insertOnly && memoryReports.has(stored.reportId)) return cloneRecord(memoryReports.get(stored.reportId)!)
    memoryReports.set(stored.reportId, cloneRecord(stored))
    return cloneRecord(stored)
  }

  if (storageMode() === 'supabase') {
    assertSupabaseOwner(stored.owner)
    const response = await fetch(supabaseRestUrl, {
      method: 'POST',
      headers: {
        ...supabaseHeaders(),
        'content-type': 'application/json',
        prefer: `resolution=${insertOnly ? 'ignore' : 'merge'}-duplicates,return=representation`,
      },
      body: JSON.stringify({
        report_id: stored.reportId,
        user_id: stored.owner.id,
        user_email: stored.owner.email ?? null,
        auth_provider: stored.owner.provider ?? null,
        payload: stored,
      }),
    })
    if (!response.ok) {
      throw new Error('Supabase 리포트 저장에 실패했습니다.')
    }
    const saved = await getReportRecord(stored.reportId, stored.owner)
    // An ignored duplicate owned by somebody else must not look like a new,
    // successfully persisted generation merely because its row is filtered out.
    if (!saved) throw new Error('저장된 리포트의 소유권 또는 저장 결과를 확인하지 못했습니다.')
    return saved
  }

  if (!pool) throw new Error('Postgres 저장소가 설정되지 않았습니다.')
  await ensureDb()
  await pool.query(
    `
      INSERT INTO cheongi_reports (report_id, payload, user_id, user_email, auth_provider, created_at, updated_at)
      VALUES ($1, $2::jsonb, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (report_id)
      ${insertOnly ? 'DO NOTHING' : `DO UPDATE SET
        payload = EXCLUDED.payload,
        user_id = COALESCE(EXCLUDED.user_id, cheongi_reports.user_id),
        user_email = COALESCE(EXCLUDED.user_email, cheongi_reports.user_email),
        auth_provider = COALESCE(EXCLUDED.auth_provider, cheongi_reports.auth_provider),
        updated_at = NOW()`}
    `,
    [
      stored.reportId,
      JSON.stringify(stored),
      stored.owner?.id ?? null,
      stored.owner?.email ?? null,
      stored.owner?.provider ?? null,
    ],
  )
  if (insertOnly) return (await getReportRecord(stored.reportId, stored.owner)) ?? cloneRecord(stored)
  return cloneRecord(stored)
}

/** 저장된 레코드의 계보 키. 도입 이전 레코드는 기록이 없으므로 그때만 역산한다. */
export function reportLineageId(record: ReportRecord): string {
  return record.lineageId ?? createReportLineageId(record.birth, record.context, record.owner?.id)
}

/**
 * 같은 계보의 기존 해석을 찾는다. **LLM 재호출을 막는 지점이 여기다.**
 *
 * 코퍼스를 고치면 리포트 ID가 바뀌어 캐시가 통째로 비켜간다. 세대(cacheEpoch)가 그대로라면
 * 그건 다시 뽑을 이유가 없는 개정이므로, 이미 있는 해석을 그대로 이어 쓴다.
 * 세대를 올린 경우에는 계보 키도 함께 바뀌므로 여기서 걸리지 않고 새로 생성된다.
 *
 * 로그인 사용자에 한한다 — 익명 레코드는 목록 조회 대상이 아니다.
 */
export async function findReportInLineage(lineageId: string, owner?: ReportOwner): Promise<ReportRecord | null> {
  if (!lineageId || !owner?.id) return null
  const records = await listReportRecords(owner, 100).catch(() => [] as ReportRecord[])
  const matches = records.filter((record) => (
    // 저장된 상담 기록은 같은 표를 쓰지만 해석 레코드가 아니다. 승계 대상에서 뺀다.
    !(record.context as { savedChat?: unknown }).savedChat
    && reportLineageId(record) === lineageId
  ))
  return matches.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null
}

export async function createOrGetReportRecord(params: {
  reportId: string
  birth: BirthInput
  context: SajuReportContext
  templateReport: SajuReport
  analysis?: SajuAnalysis
  owner?: ReportOwner
  /** 주면 계보 승계가 켜진다. 없으면 리포트 ID 정확 일치만 본다(기존 동작). */
  lineageId?: string
}): Promise<{ record: ReportRecord; created: boolean }> {
  const existing = await getReportRecord(params.reportId, params.owner)
  if (existing) {
    assertReportOwner(existing, params.owner)
    return { record: existing, created: false }
  }

  if (params.lineageId) {
    const inherited = await findReportInLineage(params.lineageId, params.owner)
    if (inherited) {
      assertReportOwner(inherited, params.owner)
      return { record: inherited, created: false }
    }
  }

  const timestamp = nowIso()
  const corpus = getCorpusSnapshot()
  const resultId = randomUUID()
  const report: SajuReport = {
    ...params.templateReport,
    reportId: params.reportId,
    resultId,
    publicId: resultId,
    status: 'pending',
    storage: storageMode(),
    corpus,
    quality: undefined,
    progress: { complete: 0, total: params.templateReport.sections.length },
    sections: params.templateReport.sections.map((section) => ({
      ...section,
      hook: '',
      interpretation: '',
      storytelling: undefined,
      generationId: randomUUID(),
      generatedBy: 'template',
      model: 'template',
      status: 'pending',
    })),
  }
  const record: ReportRecord = {
    reportId: params.reportId,
    resultId,
    revision: 0,
    lineageId: params.lineageId,
    cacheEpoch: corpus.cacheEpoch,
    analysis: params.analysis,
    // The paid report keeps its sections empty until generation, but the free teaser is
    // assembled from the deterministic, input-specific template before that redaction.
    preview: createSavedPreview(params.templateReport, params.context),
    birth: params.birth,
    context: params.context,
    owner: params.owner,
    corpus,
    report,
    status: 'pending',
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  const saved = await saveReportRecord(record, true)
  assertReportOwner(saved, params.owner)
  return { record: saved, created: saved.resultId === resultId }
}

/** Compare-and-swap the JSON snapshot: safe across tabs AND server instances. */
export async function mutateReportRecord(
  reportId: string,
  owner: ReportOwner | undefined,
  change: (record: ReportRecord) => boolean | void,
): Promise<ReportRecord | null> {
  for (let retry = 0; retry < 12; retry += 1) {
    const current = await getReportRecord(reportId, owner)
    if (!current) return null
    assertReportOwner(current, owner)
    const next = cloneRecord(current)
    if (change(next) === false) return current
    if (next.reportId !== current.reportId || next.resultId !== current.resultId || next.owner?.id !== current.owner?.id || next.report.publicId !== current.report.publicId || JSON.stringify(next.birth) !== JSON.stringify(current.birth) || JSON.stringify(next.context) !== JSON.stringify(current.context)) throw new Error('저장된 결과의 ID·소유자·입력은 변경할 수 없습니다.')
    if (current.status === 'complete' && (next.status !== 'complete' || JSON.stringify(next.report) !== JSON.stringify(current.report))) throw new Error('완료된 해석은 변경할 수 없습니다.')
    for (const section of current.report.sections.filter((item) => item.status === 'complete')) {
      if (JSON.stringify(next.report.sections.find((item) => item.id === section.id)) !== JSON.stringify(section)) throw new Error('완료된 항목은 변경할 수 없습니다.')
    }
    next.revision = (current.revision ?? 0) + 1
    next.updatedAt = nowIso()
    const stored = recordForStorage(next)
    if (localFiles) {
      if (await localFiles.compareAndSwap(stored, current.revision ?? 0)) return stored
      continue
    }
    if (storageMode() === 'memory') {
      if ((memoryReports.get(reportId)?.revision ?? 0) !== (current.revision ?? 0)) continue
      memoryReports.set(reportId, cloneRecord(stored))
      return stored
    }
    if (storageMode() === 'supabase') {
      assertSupabaseOwner(owner)
      const url = new URL(supabaseRestUrl)
      url.searchParams.set('report_id', `eq.${reportId}`)
      url.searchParams.set('user_id', `eq.${owner.id}`)
      url.searchParams.set('payload->>revision', current.revision === undefined ? 'is.null' : `eq.${current.revision}`)
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { ...supabaseHeaders(), 'content-type': 'application/json', prefer: 'return=representation' },
        body: JSON.stringify({ payload: stored, updated_at: stored.updatedAt }),
      })
      if (!response.ok) throw new Error('리포트 변경 저장에 실패했습니다.')
      const rows = await response.json() as unknown[]
      if (rows.length) return stored
    } else if (pool) {
      const changed = await pool.query(
        "UPDATE cheongi_reports SET payload = $2::jsonb, updated_at = NOW() WHERE report_id = $1 AND COALESCE((payload->>'revision')::int, 0) = $3",
        [reportId, JSON.stringify(stored), current.revision ?? 0],
      )
      if (changed.rowCount) return stored
    }
  }
  throw new Error('동시에 변경 중인 리포트입니다. 잠시 후 다시 조회해 주세요.')
}

export async function markReportStatus(
  reportId: string,
  status: ReportStatus,
  error?: string,
  owner?: ReportOwner,
): Promise<ReportRecord | null> {
  return mutateReportRecord(reportId, owner, (record) => {
    if (record.status === 'complete') return false
    record.status = status
    record.error = error
    record.report.status = status
  })
}

export async function updateReportSection(
  reportId: string,
  section: SajuReportSection,
  params: { generatedBy: 'template' | 'openai'; model: string; status?: ReportStatus; error?: string },
  owner?: ReportOwner,
): Promise<ReportRecord | null> {
  return mutateReportRecord(reportId, owner, (record) => {
  const existing = record.report.sections.find((item) => item.id === section.id)
  if (!existing) throw new Error('요청한 리포트 항목과 생성된 항목이 다릅니다.')
  if (record.status === 'complete' || existing.status === 'complete') return false
  record.report.sections = record.report.sections.map((item) => {
    if (item.id !== section.id) return item
    return {
      ...section,
      generationId: item.generationId ?? section.generationId ?? randomUUID(),
      generatedBy: params.generatedBy,
      model: params.model,
      status: params.status ?? 'complete',
      error: params.error,
    }
  })

  const progress = progressFor(record.report)
  record.report.progress = progress
  record.status = progress.complete >= progress.total ? 'complete' : record.report.sections.some((item) => item.status === 'failed') ? 'failed' : 'generating'
  record.report.status = record.status
  })
}

export async function updateReportChatHistory(
  reportId: string,
  chatHistory: ConversationTurn[],
  owner?: ReportOwner,
): Promise<ReportRecord | null> {
  return mutateReportRecord(reportId, owner, (record) => {
  record.chatHistory = chatHistory.map((turn) => ({
    role: turn.role,
    content: turn.content,
  }))
  })
}

export function getReportStorageMode(): ReportStorageMode {
  return storageMode()
}
