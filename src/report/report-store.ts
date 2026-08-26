import { createHash } from 'node:crypto'
import { Pool } from 'pg'
import { getCorpusSnapshot } from '../rag/corpus-registry.js'
import type { BirthInput, ConversationTurn, CorpusSnapshot, SajuReport, SajuReportContext, SajuReportSection } from '../types/index.js'

export type ReportStatus = 'pending' | 'generating' | 'complete' | 'failed'
export type ReportStorageMode = 'postgres' | 'memory'

export interface ReportRecord {
  reportId: string
  birth: BirthInput
  context: SajuReportContext
  corpus?: CorpusSnapshot
  report: SajuReport
  status: ReportStatus
  createdAt: string
  updatedAt: string
  chatHistory?: ConversationTurn[]
  error?: string
}

const connectionString = process.env.DATABASE_URL
const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: /localhost|127\.0\.0\.1/i.test(connectionString) ? false : { rejectUnauthorized: false },
    })
  : null

const memoryReports = new Map<string, ReportRecord>()
let dbReady: Promise<void> | null = null

function storageMode(): ReportStorageMode {
  return pool ? 'postgres' : 'memory'
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
  })
  return createHash('sha256').update(fingerprint).digest('hex').slice(0, 28)
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
    `).then(() => undefined)
  }
  await dbReady
}

function cloneRecord(record: ReportRecord): ReportRecord {
  return JSON.parse(JSON.stringify(record)) as ReportRecord
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

export async function getReportRecord(reportId: string): Promise<ReportRecord | null> {
  if (!pool) {
    const record = memoryReports.get(reportId)
    return record ? cloneRecord(record) : null
  }

  await ensureDb()
  const result = await pool.query<{ payload: ReportRecord }>(
    'SELECT payload FROM cheongi_reports WHERE report_id = $1',
    [reportId],
  )
  return result.rows[0]?.payload ? cloneRecord(result.rows[0].payload) : null
}

export async function saveReportRecord(record: ReportRecord): Promise<ReportRecord> {
  const updated: ReportRecord = {
    ...record,
    updatedAt: nowIso(),
  }

  if (!pool) {
    memoryReports.set(updated.reportId, cloneRecord(updated))
    return cloneRecord(updated)
  }

  await ensureDb()
  await pool.query(
    `
      INSERT INTO cheongi_reports (report_id, payload, created_at, updated_at)
      VALUES ($1, $2::jsonb, NOW(), NOW())
      ON CONFLICT (report_id)
      DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()
    `,
    [updated.reportId, JSON.stringify(updated)],
  )
  return cloneRecord(updated)
}

export async function createOrGetReportRecord(params: {
  reportId: string
  birth: BirthInput
  context: SajuReportContext
  templateReport: SajuReport
}): Promise<{ record: ReportRecord; created: boolean }> {
  const existing = await getReportRecord(params.reportId)
  if (existing) return { record: existing, created: false }

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
): Promise<ReportRecord | null> {
  const record = await getReportRecord(reportId)
  if (!record) return null
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
): Promise<ReportRecord | null> {
  const record = await getReportRecord(reportId)
  if (!record) return null
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
): Promise<ReportRecord | null> {
  const record = await getReportRecord(reportId)
  if (!record) return null
  record.chatHistory = chatHistory.map((turn) => ({
    role: turn.role,
    content: turn.content,
  }))
  return saveReportRecord(record)
}

export function getReportStorageMode(): ReportStorageMode {
  return storageMode()
}
