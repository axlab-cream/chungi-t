import { createHash, randomUUID } from 'node:crypto'
import '../env/load.js'
import { Pool } from 'pg'
import { getCorpusSnapshot } from '../rag/corpus-registry.js'
import type { BirthInput, ConversationTurn, CorpusSnapshot, SajuReport, SajuReportContext, SajuReportSection } from '../types/index.js'
import { applyAdminReportUnlock } from '../auth/admin.js'

export type ReportStatus = 'pending' | 'generating' | 'complete' | 'failed'
export type ReportStorageMode = 'postgres' | 'supabase' | 'memory'

export interface ReportRecord {
  reportId: string
  /** Unique public discriminator (UUID). Source of truth for /r/{publicId}. */
  publicId?: string
  birth: BirthInput
  context: SajuReportContext
  owner?: ReportOwner
  corpus?: CorpusSnapshot
  report: SajuReport
  status: ReportStatus
  createdAt: string
  updatedAt: string
  chatHistory?: ConversationTurn[]
  error?: string
  /** Optional paid order that unlocked this report. */
  orderId?: string
}

export interface ReportOwner {
  id: string
  email?: string
  provider?: string
  accessToken?: string
}

const connectionString = process.env.DATABASE_URL
const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: /localhost|127\.0\.0\.1/i.test(connectionString) ? false : { rejectUnauthorized: false },
    })
  : null
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? ''
const supabasePublicKey =
  process.env.SUPABASE_PUBLISHABLE_KEY
  ?? process.env.SUPABASE_ANON_KEY
  ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ?? process.env.VITE_SUPABASE_ANON_KEY
  ?? ''
const supabaseRestUrl = supabaseUrl
  ? `${supabaseUrl.replace(/\/$/, '')}/rest/v1/cheongi_reports`
  : ''

const memoryReports = new Map<string, ReportRecord>()
let dbReady: Promise<void> | null = null

function storageMode(): ReportStorageMode {
  if (pool) return 'postgres'
  if (supabaseRestUrl && supabasePublicKey) return 'supabase'
  return 'memory'
}

function nowIso(): string {
  return new Date().toISOString()
}

export function createReportPublicId(): string {
  return randomUUID().replace(/-/g, '')
}

function ensurePublicId(record: ReportRecord): ReportRecord {
  if (record.publicId) {
    if (record.report) record.report.publicId = record.publicId
    return record
  }
  const publicId = createReportPublicId()
  record.publicId = publicId
  if (record.report) record.report.publicId = publicId
  return record
}

async function ensurePublicIdPersisted(record: ReportRecord | null): Promise<ReportRecord | null> {
  if (!record) return null
  const before = record.publicId
  const ensured = ensurePublicId(record)
  if (!before) {
    return saveReportRecord(ensured)
  }
  return ensured
}

function serviceKeyOf(record: ReportRecord): string {
  return String(record.context?.serviceKey ?? '').trim()
}

function adminColumns(record: ReportRecord) {
  const progress = progressFor(record.report)
  return {
    public_id: record.publicId,
    service_key: serviceKeyOf(record) || null,
    status: record.status,
    progress_complete: progress.complete,
    progress_total: progress.total,
    order_id: record.orderId ?? null,
    input_fingerprint: record.reportId,
  }
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

export function createReportId(
  birth: BirthInput,
  context: SajuReportContext,
  corpusFingerprint = getCorpusSnapshot().fingerprint,
  ownerId?: string,
): string {
  const fingerprint = stableJson({
    birth: {
      year: birth.year,
      month: birth.month,
      day: birth.day,
      hour: birth.hour,
      minute: birth.minute ?? 0,
      gender: birth.gender,
      calendar: birth.calendar,
      isLeapMonth: birth.isLeapMonth ?? false,
    },
    corpusFingerprint,
    context,
    ownerId: ownerId ?? '',
  })
  return createHash('sha256').update(fingerprint).digest('hex').slice(0, 28)
}

async function ensureReportOwnerColumns(): Promise<void> {
  if (!pool) return
  await pool.query(`
    ALTER TABLE cheongi_reports
      ADD COLUMN IF NOT EXISTS user_id TEXT,
      ADD COLUMN IF NOT EXISTS user_email TEXT,
      ADD COLUMN IF NOT EXISTS auth_provider TEXT,
      ADD COLUMN IF NOT EXISTS admin_status TEXT NOT NULL DEFAULT 'new',
      ADD COLUMN IF NOT EXISTS public_id TEXT,
      ADD COLUMN IF NOT EXISTS service_key TEXT,
      ADD COLUMN IF NOT EXISTS status TEXT,
      ADD COLUMN IF NOT EXISTS progress_complete INTEGER,
      ADD COLUMN IF NOT EXISTS progress_total INTEGER,
      ADD COLUMN IF NOT EXISTS order_id TEXT,
      ADD COLUMN IF NOT EXISTS input_fingerprint TEXT
  `)
  await pool.query(`
    CREATE INDEX IF NOT EXISTS cheongi_reports_user_id_idx
      ON cheongi_reports (user_id)
  `)
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS cheongi_reports_public_id_uidx
      ON cheongi_reports (public_id)
      WHERE public_id IS NOT NULL
  `)
  await pool.query(`
    CREATE INDEX IF NOT EXISTS cheongi_reports_service_created_idx
      ON cheongi_reports (service_key, created_at DESC)
  `)
  await pool.query(`
    CREATE INDEX IF NOT EXISTS cheongi_reports_status_updated_idx
      ON cheongi_reports (status, updated_at DESC)
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

function progressFor(report: SajuReport): { complete: number; total: number } {
  const total = report.sections.length
  const complete = report.sections.filter((section) => section.status === 'complete').length
  return { complete, total }
}

export function toClientReport(record: ReportRecord): SajuReport {
  const ensured = ensurePublicId(cloneRecord(record))
  const report = ensured.report
  report.reportId = ensured.reportId
  report.publicId = ensured.publicId
  report.status = ensured.status
  report.storage = storageMode()
  report.corpus = ensured.corpus ?? report.corpus
  report.progress = progressFor(report)
  return applyAdminReportUnlock(report, ensured.owner)
}

function supabaseHeaders(accessToken?: string): Record<string, string> {
  const headers: Record<string, string> = {
    apikey: supabasePublicKey,
  }
  if (accessToken) headers.authorization = `Bearer ${accessToken}`
  return headers
}

export async function getReportRecord(reportId: string, accessToken?: string): Promise<ReportRecord | null> {
  if (storageMode() === 'memory') {
    const record = memoryReports.get(reportId)
    return ensurePublicIdPersisted(record ? cloneRecord(record) : null)
  }

  if (storageMode() === 'supabase') {
    if (!accessToken) return null
    const response = await fetch(`${supabaseRestUrl}?report_id=eq.${encodeURIComponent(reportId)}&select=payload`, {
      headers: supabaseHeaders(accessToken),
    })
    if (!response.ok) {
      const message = await response.text().catch(() => '')
      console.error('[cheongi_reports] get failed', response.status, message)
      const cached = memoryReports.get(reportId)
      return cached ? ensurePublicId(cloneRecord(cached)) : null
    }
    const rows = await response.json() as Array<{ payload?: ReportRecord }>
    return ensurePublicIdPersisted(rows[0]?.payload ? cloneRecord(rows[0].payload) : null)
  }

  if (!pool) return null
  await ensureDb()
  const result = await pool.query<{ payload: ReportRecord }>(
    'SELECT payload FROM cheongi_reports WHERE report_id = $1',
    [reportId],
  )
  return ensurePublicIdPersisted(result.rows[0]?.payload ? cloneRecord(result.rows[0].payload) : null)
}

export async function getReportByPublicId(publicId: string, accessToken?: string): Promise<ReportRecord | null> {
  const id = String(publicId ?? '').trim()
  if (!id) return null

  if (storageMode() === 'memory') {
    const record = Array.from(memoryReports.values()).find((item) => item.publicId === id)
    return ensurePublicIdPersisted(record ? cloneRecord(record) : null)
  }

  if (storageMode() === 'supabase') {
    if (!accessToken) return null
    const response = await fetch(`${supabaseRestUrl}?public_id=eq.${encodeURIComponent(id)}&select=payload`, {
      headers: supabaseHeaders(accessToken),
    })
    if (!response.ok) {
      throw new Error('Supabase 공개 리포트 조회에 실패했습니다.')
    }
    const rows = await response.json() as Array<{ payload?: ReportRecord }>
    return ensurePublicIdPersisted(rows[0]?.payload ? cloneRecord(rows[0].payload) : null)
  }

  if (!pool) return null
  await ensureDb()
  const result = await pool.query<{ payload: ReportRecord }>(
    'SELECT payload FROM cheongi_reports WHERE public_id = $1 LIMIT 1',
    [id],
  )
  return ensurePublicIdPersisted(result.rows[0]?.payload ? cloneRecord(result.rows[0].payload) : null)
}

export async function listReportRecords(owner: ReportOwner, limit = 50): Promise<ReportRecord[]> {
  const safeLimit = Math.min(Math.max(Number.isInteger(limit) ? limit : 50, 1), 100)

  if (storageMode() === 'memory') {
    return Array.from(memoryReports.values())
      .filter((record) => record.owner?.id === owner.id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, safeLimit)
      .map(cloneRecord)
  }

  if (storageMode() === 'supabase') {
    if (!owner.accessToken) return []
    const url = new URL(supabaseRestUrl)
    url.searchParams.set('user_id', `eq.${owner.id}`)
    url.searchParams.set('select', 'payload,user_id,user_email,auth_provider,created_at,updated_at')
    url.searchParams.set('order', 'updated_at.desc')
    url.searchParams.set('limit', String(safeLimit))

    const response = await fetch(url, {
      headers: supabaseHeaders(owner.accessToken),
    })
    if (!response.ok) {
      const message = await response.text().catch(() => '')
      throw new Error(message || 'Supabase 리포트 목록 조회에 실패했습니다.')
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
  if (storageMode() === 'memory') {
    const record = memoryReports.get(reportId)
    if (!record || record.owner?.id !== owner.id) return false
    return memoryReports.delete(reportId)
  }

  if (storageMode() === 'supabase') {
    if (!owner.accessToken) return false
    const url = new URL(supabaseRestUrl)
    url.searchParams.set('report_id', `eq.${reportId}`)
    url.searchParams.set('user_id', `eq.${owner.id}`)
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        ...supabaseHeaders(owner.accessToken),
        prefer: 'return=representation',
      },
    })
    if (!response.ok) {
      const message = await response.text().catch(() => '')
      throw new Error(message || 'Supabase 리포트 삭제에 실패했습니다.')
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

export async function saveReportRecord(record: ReportRecord): Promise<ReportRecord> {
  const updated = ensurePublicId({
    ...record,
    updatedAt: nowIso(),
  })
  const accessToken = updated.owner?.accessToken
  const stored = recordForStorage(updated)

  if (storageMode() === 'memory') {
    memoryReports.set(stored.reportId, cloneRecord(stored))
    return cloneRecord(stored)
  }

  if (storageMode() === 'supabase') {
    if (!accessToken || !stored.owner?.id) {
      throw new Error('회원 인증 정보가 없어 리포트를 저장하지 못했습니다.')
    }
    const upsertUrl = `${supabaseRestUrl}?on_conflict=report_id`
    const response = await fetch(upsertUrl, {
      method: 'POST',
      headers: {
        ...supabaseHeaders(accessToken),
        'content-type': 'application/json',
        prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify({
        report_id: stored.reportId,
        user_id: stored.owner.id,
        user_email: stored.owner.email ?? null,
        auth_provider: stored.owner.provider ?? null,
        payload: stored,
        ...adminColumns(stored),
      }),
    })
    if (!response.ok) {
      const message = await response.text().catch(() => '')
      console.error('[cheongi_reports] save failed; falling back to memory', response.status, message)
      stored.report.storage = 'memory'
      memoryReports.set(stored.reportId, cloneRecord(stored))
      return cloneRecord(stored)
    }
    return cloneRecord(stored)
  }

  if (!pool) throw new Error('Postgres 저장소가 설정되지 않았습니다.')
  await ensureDb()
  const admin = adminColumns(stored)
  await pool.query(
    `
      INSERT INTO cheongi_reports (
        report_id, payload, user_id, user_email, auth_provider,
        public_id, service_key, status, progress_complete, progress_total, order_id, input_fingerprint,
        created_at, updated_at
      )
      VALUES ($1, $2::jsonb, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      ON CONFLICT (report_id)
      DO UPDATE SET
        payload = EXCLUDED.payload,
        user_id = COALESCE(EXCLUDED.user_id, cheongi_reports.user_id),
        user_email = COALESCE(EXCLUDED.user_email, cheongi_reports.user_email),
        auth_provider = COALESCE(EXCLUDED.auth_provider, cheongi_reports.auth_provider),
        public_id = COALESCE(EXCLUDED.public_id, cheongi_reports.public_id),
        service_key = COALESCE(EXCLUDED.service_key, cheongi_reports.service_key),
        status = EXCLUDED.status,
        progress_complete = EXCLUDED.progress_complete,
        progress_total = EXCLUDED.progress_total,
        order_id = COALESCE(EXCLUDED.order_id, cheongi_reports.order_id),
        input_fingerprint = COALESCE(EXCLUDED.input_fingerprint, cheongi_reports.input_fingerprint),
        updated_at = NOW()
    `,
    [
      stored.reportId,
      JSON.stringify(stored),
      stored.owner?.id ?? null,
      stored.owner?.email ?? null,
      stored.owner?.provider ?? null,
      admin.public_id,
      admin.service_key,
      admin.status,
      admin.progress_complete,
      admin.progress_total,
      admin.order_id,
      admin.input_fingerprint,
    ],
  )
  return cloneRecord(stored)
}

export async function createOrGetReportRecord(params: {
  reportId: string
  birth: BirthInput
  context: SajuReportContext
  templateReport: SajuReport
  owner?: ReportOwner
  orderId?: string
}): Promise<{ record: ReportRecord; created: boolean }> {
  const existing = await getReportRecord(params.reportId, params.owner?.accessToken)
  if (existing) {
    let dirty = false
    if (params.owner && !existing.owner?.id) {
      existing.owner = params.owner
      dirty = true
    }
    if (!existing.publicId) {
      ensurePublicId(existing)
      dirty = true
    }
    if (params.orderId && !existing.orderId) {
      existing.orderId = params.orderId
      dirty = true
    }
    if (dirty) {
      return { record: await saveReportRecord(existing), created: false }
    }
    return { record: ensurePublicId(existing), created: false }
  }

  const timestamp = nowIso()
  const corpus = getCorpusSnapshot()
  const publicId = createReportPublicId()
  const report: SajuReport = {
    ...params.templateReport,
    reportId: params.reportId,
    publicId,
    status: 'pending',
    storage: storageMode(),
    corpus,
    progress: { complete: 0, total: params.templateReport.sections.length },
    sections: params.templateReport.sections.map((section) => ({
      ...section,
      generatedBy: 'template',
      model: section.model ?? 'template',
      status: 'pending',
    })),
  }
  const record: ReportRecord = {
    reportId: params.reportId,
    publicId,
    birth: params.birth,
    context: params.context,
    owner: params.owner,
    corpus,
    report,
    status: 'pending',
    createdAt: timestamp,
    updatedAt: timestamp,
    orderId: params.orderId,
  }
  return { record: await saveReportRecord(record), created: true }
}

export async function markReportStatus(
  reportId: string,
  status: ReportStatus,
  error?: string,
  owner?: ReportOwner,
): Promise<ReportRecord | null> {
  const record = await getReportRecord(reportId, owner?.accessToken)
  if (!record) return null
  if (owner) record.owner = { ...record.owner, ...owner }
  record.status = status
  record.error = error
  record.report.status = status
  if (error) record.error = error
  return saveReportRecord(record)
}

export async function updateReportSection(
  reportId: string,
  section: SajuReportSection,
  params: { generatedBy: 'template' | 'openai'; model: string; status?: ReportStatus; error?: string },
  owner?: ReportOwner,
): Promise<ReportRecord | null> {
  const record = await getReportRecord(reportId, owner?.accessToken)
  if (!record) return null
  if (owner) record.owner = { ...record.owner, ...owner }
  record.report.sections = record.report.sections.map((item) => {
    if (item.id !== section.id) return item
    return {
      ...section,
      generatedBy: params.generatedBy,
      model: params.model,
      status: params.status ?? 'complete',
      error: params.error,
    }
  })

  const progress = progressFor(record.report)
  record.report.progress = progress
  record.status = progress.complete >= progress.total ? 'complete' : 'generating'
  record.report.status = record.status
  return saveReportRecord(record)
}

export async function updateReportChatHistory(
  reportId: string,
  chatHistory: ConversationTurn[],
  owner?: ReportOwner,
): Promise<ReportRecord | null> {
  const record = await getReportRecord(reportId, owner?.accessToken)
  if (!record) return null
  if (owner) record.owner = { ...record.owner, ...owner }
  record.chatHistory = chatHistory.map((turn) => ({
    role: turn.role,
    content: turn.content,
  }))
  return saveReportRecord(record)
}

export function getReportStorageMode(): ReportStorageMode {
  return storageMode()
}
