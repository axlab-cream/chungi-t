import { createHash } from 'node:crypto'
import '../env/load.js'
import { Pool } from 'pg'
import { getCorpusSnapshot } from '../rag/corpus-registry.js'
import type { BirthInput, ConversationTurn, CorpusSnapshot, SajuReport, SajuReportContext, SajuReportSection } from '../types/index.js'

export type ReportStatus = 'pending' | 'generating' | 'complete' | 'failed'
export type ReportStorageMode = 'postgres' | 'supabase' | 'memory'

export interface ReportRecord {
  reportId: string
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

function progressFor(report: SajuReport): { complete: number; total: number } {
  const total = report.sections.length
  const complete = report.sections.filter((section) => section.status === 'complete').length
  return { complete, total }
}

export function toClientReport(record: ReportRecord): SajuReport {
  const report = cloneRecord(record).report
  report.reportId = record.reportId
  report.status = record.status
  report.storage = storageMode()
  report.corpus = record.corpus ?? report.corpus
  report.progress = progressFor(report)
  return report
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
    return record ? cloneRecord(record) : null
  }

  if (storageMode() === 'supabase') {
    if (!accessToken) return null
    const response = await fetch(`${supabaseRestUrl}?report_id=eq.${encodeURIComponent(reportId)}&select=payload`, {
      headers: supabaseHeaders(accessToken),
    })
    if (!response.ok) {
      throw new Error('Supabase 리포트 조회에 실패했습니다.')
    }
    const rows = await response.json() as Array<{ payload?: ReportRecord }>
    return rows[0]?.payload ? cloneRecord(rows[0].payload) : null
  }

  if (!pool) return null
  await ensureDb()
  const result = await pool.query<{ payload: ReportRecord }>(
    'SELECT payload FROM cheongi_reports WHERE report_id = $1',
    [reportId],
  )
  return result.rows[0]?.payload ? cloneRecord(result.rows[0].payload) : null
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
  const updated: ReportRecord = {
    ...record,
    updatedAt: nowIso(),
  }
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
    const response = await fetch(supabaseRestUrl, {
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
      }),
    })
    if (!response.ok) {
      const message = await response.text().catch(() => '')
      throw new Error(message || 'Supabase 리포트 저장에 실패했습니다.')
    }
    return cloneRecord(stored)
  }

  if (!pool) throw new Error('Postgres 저장소가 설정되지 않았습니다.')
  await ensureDb()
  await pool.query(
    `
      INSERT INTO cheongi_reports (report_id, payload, user_id, user_email, auth_provider, created_at, updated_at)
      VALUES ($1, $2::jsonb, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (report_id)
      DO UPDATE SET
        payload = EXCLUDED.payload,
        user_id = COALESCE(EXCLUDED.user_id, cheongi_reports.user_id),
        user_email = COALESCE(EXCLUDED.user_email, cheongi_reports.user_email),
        auth_provider = COALESCE(EXCLUDED.auth_provider, cheongi_reports.auth_provider),
        updated_at = NOW()
    `,
    [
      stored.reportId,
      JSON.stringify(stored),
      stored.owner?.id ?? null,
      stored.owner?.email ?? null,
      stored.owner?.provider ?? null,
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
}): Promise<{ record: ReportRecord; created: boolean }> {
  const existing = await getReportRecord(params.reportId, params.owner?.accessToken)
  if (existing) {
    if (params.owner && !existing.owner?.id) {
      existing.owner = params.owner
      return { record: await saveReportRecord(existing), created: false }
    }
    return { record: existing, created: false }
  }

  const timestamp = nowIso()
  const corpus = getCorpusSnapshot()
  const report: SajuReport = {
    ...params.templateReport,
    reportId: params.reportId,
    status: 'pending',
    storage: storageMode(),
    corpus,
    progress: { complete: 0, total: params.templateReport.sections.length },
    sections: params.templateReport.sections.map((section) => ({
      ...section,
      generatedBy: 'template',
      model: 'template',
      status: 'pending',
    })),
  }
  const record: ReportRecord = {
    reportId: params.reportId,
    birth: params.birth,
    context: params.context,
    owner: params.owner,
    corpus,
    report,
    status: 'pending',
    createdAt: timestamp,
    updatedAt: timestamp,
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
