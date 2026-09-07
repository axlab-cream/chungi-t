import { randomUUID } from 'node:crypto'
import type { BirthInput, SajuAnalysis, SajuReportContext, SajuReportSection } from '../types/index.js'
import { isOpenAiConfigured } from '../llm/openai-adapter.js'
import { buildOpenAiSajuReportSection, getReportModel } from './report-generator.js'
import { InterpretationQualityError } from './interpretation-validation.js'
import { assertReportOwner, getReportRecord, mutateReportRecord, type ReportOwner, type ReportRecord } from './report-store.js'

interface GenerationParams {
  reportId: string
  analysis: SajuAnalysis
  birth: BirthInput
  context: SajuReportContext
  owner?: ReportOwner
}
const inFlightReports = new Map<string, Promise<ReportRecord | null>>()
const LEASE_MS = 6 * 60_000

/** Complete interpretations are immutable; pending work has a persisted cross-instance lease. */
export async function generateReportSectionNow(params: GenerationParams & { sectionId: string; retry?: boolean }): Promise<SajuReportSection> {
  const leaseId = randomUUID()
  let claimed = false
  const record = await mutateReportRecord(params.reportId, params.owner, (current) => {
    claimed = false
    const section = current.report.sections.find((item) => item.id === params.sectionId)
    if (!section) throw new Error('리포트 섹션을 찾지 못했습니다.')
    if (current.status === 'complete' || section.status === 'complete' || (section.status === 'failed' && !params.retry)) return false
    if (section.generationLease && Date.parse(section.generationLease.expiresAt) > Date.now()) return false
    section.generationId ??= randomUUID()
    section.generationLease = { id: leaseId, expiresAt: new Date(Date.now() + LEASE_MS).toISOString() }
    section.status = 'generating'
    section.error = undefined
    current.status = current.report.status = 'generating'
    claimed = true
  })
  const storedSection = record?.report.sections.find((item) => item.id === params.sectionId)
  if (!record || !storedSection) throw new Error('리포트 섹션을 찾지 못했습니다.')
  if (!claimed) return storedSection

  const editClaim = async (edit: (section: SajuReportSection, current: ReportRecord) => void) => mutateReportRecord(params.reportId, params.owner, (current) => {
    const section = current.report.sections.find((item) => item.id === params.sectionId)
    if (!section || section.status === 'complete' || section.generationLease?.id !== leaseId) return false
    edit(section, current)
  })
  let issues: string[] = []
  for (let index = 0; index < 2; index += 1) {
    const attemptId = randomUUID()
    await editClaim((section) => {
      section.attempts ??= []
      section.attempts.push({ id: attemptId, startedAt: new Date().toISOString(), model: getReportModel(), status: 'generating' })
      section.generationLease = { id: leaseId, expiresAt: new Date(Date.now() + LEASE_MS).toISOString() }
    })
    try {
      if (!isOpenAiConfigured()) throw new Error('GENERATION_UNAVAILABLE')
      const generated = await buildOpenAiSajuReportSection(
        record.analysis ?? params.analysis, record.birth, params.sectionId, record.context, storedSection,
        {
          siblings: record.report.sections.filter((item) => item.id !== params.sectionId && item.status === 'complete'),
          repairIssues: issues,
          onResponse: (result) => editClaim((section) => {
            const attempt = section.attempts?.find((item) => item.id === attemptId)
            if (attempt) { attempt.raw = result.text; attempt.finishReason = result.finishReason; attempt.tokenUsage = result.usage; attempt.model = result.model; attempt.finishedAt = new Date().toISOString() }
          }).then(() => undefined),
        },
      )
      const saved = await editClaim((section, current) => {
        const attempt = section.attempts?.find((item) => item.id === attemptId)
        if (attempt) { attempt.status = 'complete'; attempt.finishedAt = new Date().toISOString() }
        section.hook = generated.hook
        section.interpretation = generated.interpretation
        section.generatedAt = generated.generatedAt
        section.tokenUsage = generated.tokenUsage
        section.generatedBy = 'openai'
        section.model = generated.model ?? getReportModel()
        section.status = 'complete'
        delete section.generationLease
        delete section.error
        const complete = current.report.sections.filter((item) => item.status === 'complete').length
        current.report.progress = { complete, total: current.report.sections.length }
        current.status = current.report.status = complete === current.report.sections.length ? 'complete' : 'generating'
        if (complete === current.report.sections.length) { current.report.generatedBy = 'openai'; current.report.model = generated.model ?? getReportModel() }
      })
      return saved?.report.sections.find((item) => item.id === params.sectionId) ?? storedSection
    } catch (error) {
      issues = error instanceof InterpretationQualityError ? error.review.issues : ['해석 생성 또는 저장이 완료되지 않았습니다.']
      const retryable = error instanceof InterpretationQualityError && index === 0
      await editClaim((section, current) => {
        const attempt = section.attempts?.find((item) => item.id === attemptId)
        if (attempt) { attempt.status = 'failed'; attempt.error = issues.join(' '); attempt.finishedAt = new Date().toISOString() }
        if (!retryable) {
          section.status = 'failed'
          section.error = '완성 해석의 검수가 끝나지 않았습니다. 저장된 초안은 유지되며 재시도할 수 있습니다.'
          delete section.generationLease
          current.status = current.report.status = 'failed'
        }
      })
      if (!retryable) break
    }
  }
  const latest = await getReportRecord(params.reportId, params.owner)
  return latest?.report.sections.find((item) => item.id === params.sectionId) ?? storedSection
}

export async function preGenerateReport(params: GenerationParams): Promise<ReportRecord | null> {
  const record = await getReportRecord(params.reportId, params.owner)
  if (!record) return null
  assertReportOwner(record, params.owner)
  if (record.status === 'complete') return record
  const running = inFlightReports.get(params.reportId)
  if (running) return running
  const run = (async () => {
    try {
      for (const section of record.report.sections) {
        if (section.status === 'complete' || section.status === 'failed') continue
        const result = await generateReportSectionNow({ ...params, sectionId: section.id })
        if (result.status === 'failed') break
      }
      return await getReportRecord(params.reportId, params.owner)
    } finally { inFlightReports.delete(params.reportId) }
  })()
  inFlightReports.set(params.reportId, run)
  return run
}

export function startReportPreGeneration(params: GenerationParams): void {
  void preGenerateReport(params).catch(() => undefined)
}
