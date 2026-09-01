import type { BirthInput, SajuAnalysis, SajuReport, SajuReportContext } from '../types/index.js'
import { startReportPreGeneration } from './report-queue.js'
import {
  createOrGetReportRecord,
  toClientReport,
  type ReportOwner,
  type ReportRecord,
} from './report-store.js'

export interface SpecializedProgressiveResult {
  record: ReportRecord
  report: SajuReport
  reportId: string
  publicId: string
  created: boolean
  /** True when a finished report was loaded from durable storage (no new LLM work). */
  cached: boolean
  resumed: boolean
}

/**
 * TOC-first specialized report flow:
 * 1) createOrGet by stable reportId (user + service + input fingerprint)
 * 2) return outline immediately
 * 3) if incomplete, generate sections sequentially in the background and persist each one
 */
export async function beginSpecializedProgressiveReport(params: {
  reportId: string
  birth: BirthInput
  context: SajuReportContext
  templateReport: SajuReport
  analysis: SajuAnalysis
  owner?: ReportOwner
  orderId?: string
}): Promise<SpecializedProgressiveResult> {
  const { record, created } = await createOrGetReportRecord({
    reportId: params.reportId,
    birth: params.birth,
    context: params.context,
    templateReport: params.templateReport,
    owner: params.owner,
    orderId: params.orderId,
  })

  const cached = !created && record.status === 'complete'
  const resumed = !created && record.status !== 'complete'

  if (record.status !== 'complete') {
    startReportPreGeneration({
      reportId: params.reportId,
      analysis: params.analysis,
      birth: params.birth,
      context: params.context,
      owner: params.owner,
    })
  }

  const report = toClientReport(record)
  const publicId = String(record.publicId || report.publicId || '')
  return {
    record,
    report,
    reportId: record.reportId,
    publicId,
    created,
    cached,
    resumed,
  }
}
