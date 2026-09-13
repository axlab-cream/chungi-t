import { randomUUID } from 'node:crypto'
import type { BirthInput, SajuAnalysis, SajuReportContext, SajuReportSection } from '../types/index.js'
import { isOpenAiConfigured } from '../llm/openai-adapter.js'
import { buildOpenAiSajuReportSection, getReportModel, parseGeneratedSajuReportSection, reviewGeneratedSajuReportSection } from './report-generator.js'
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

/**
 * Promote a previously rejected section only when its last persisted raw response
 * passes today's production review. The attempt remains immutable historical evidence.
 */
export async function recoverReportSectionFromLatestAttempt(params: {
  reportId: string
  sectionId: string
  owner?: ReportOwner
}): Promise<SajuReportSection> {
  const record = await mutateReportRecord(params.reportId, params.owner, (current) => {
    const section = current.report.sections.find((item) => item.id === params.sectionId)
    if (!section) throw new Error('리포트 섹션을 찾지 못했습니다.')
    if (section.status === 'complete') return false
    if (section.status !== 'failed') throw new Error('복구할 실패 항목이 아닙니다.')
    if (section.generationLease) {
      const leaseExpiry = Date.parse(section.generationLease.expiresAt)
      if (!Number.isFinite(leaseExpiry) || leaseExpiry > Date.now()) {
        throw new Error('현재 생성 중인 항목은 복구할 수 없습니다.')
      }
    }
    const position = current.report.sections.indexOf(section)
    if (current.report.sections.slice(0, position).some((item) => item.status !== 'complete')) {
      throw new Error('선행 항목이 완료되지 않아 복구할 수 없습니다.')
    }
    const changedLaterSection = current.report.sections.slice(position + 1).some((item) =>
      item.status !== 'pending' || (item.attempts?.length ?? 0) > 0,
    )
    if (changedLaterSection) {
      throw new Error('후속 항목이 이미 변경되어 이전 실패 항목을 안전하게 복구할 수 없습니다.')
    }
    const attempt = [...(section.attempts ?? [])]
      .reverse()
      .find((item) => item.status === 'failed' && Boolean(item.raw))
    if (!attempt || !attempt.raw) {
      throw new Error('복구할 마지막 실패 시도의 저장 원문이 없습니다.')
    }
    if (!current.analysis) throw new Error('저장된 계산 근거가 없어 복구할 수 없습니다.')

    const parsed = parseGeneratedSajuReportSection(attempt.raw, section.id)
    const review = reviewGeneratedSajuReportSection({
      analysis: current.analysis,
      birth: current.birth,
      context: current.context,
      section,
      hook: parsed.hook,
      interpretation: parsed.interpretation,
      siblings: current.report.sections.slice(0, position).filter((item) => item.status === 'complete'),
      corpusSnapshot: current.corpus,
    })
    if (!review.passed) throw new InterpretationQualityError(review)

    section.hook = parsed.hook
    section.interpretation = parsed.interpretation
    section.generatedAt = attempt.finishedAt ?? current.updatedAt
    section.tokenUsage = attempt.tokenUsage
    section.generatedBy = 'openai'
    section.model = attempt.model
    section.status = 'complete'
    delete section.generationLease
    delete section.error

    const complete = current.report.sections.filter((item) => item.status === 'complete').length
    current.report.progress = { complete, total: current.report.sections.length }
    current.status = current.report.status = complete === current.report.sections.length
      ? 'complete'
      : current.report.sections.some((item) => item.status === 'failed') ? 'failed' : 'generating'
    if (current.status !== 'failed') delete current.error
    if (complete === current.report.sections.length) {
      current.report.generatedBy = 'openai'
      current.report.model = attempt.model
    }
  })
  const section = record?.report.sections.find((item) => item.id === params.sectionId)
  if (!section) throw new Error('리포트 섹션을 찾지 못했습니다.')
  return section
}

/** Complete interpretations are immutable; pending work has a persisted cross-instance lease. */
export async function generateReportSectionNow(params: GenerationParams & { sectionId: string; retry?: boolean }): Promise<SajuReportSection> {
  const leaseId = randomUUID()
  let claimed = false
  const record = await mutateReportRecord(params.reportId, params.owner, (current) => {
    claimed = false
    const section = current.report.sections.find((item) => item.id === params.sectionId)
    if (!section) throw new Error('리포트 섹션을 찾지 못했습니다.')
    if (current.status === 'complete' || section.status === 'complete' || (section.status === 'failed' && !params.retry)) return false
    const position = current.report.sections.indexOf(section)
    if (current.report.sections.slice(0, position).some(item => item.status !== 'complete')) return false
    if (params.retry && section.status === 'failed' && current.report.sections.slice(position + 1).some((item) =>
      item.status !== 'pending' || (item.attempts?.length ?? 0) > 0,
    )) return false
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
  const priorFailure = params.retry
    ? [...(storedSection.attempts ?? [])].reverse().find((attempt) => attempt.status === 'failed' && attempt.error)?.error
    : undefined
  let issues: string[] = params.retry ? [priorFailure ?? '이전 검수 실패를 다시 확인하세요.'] : []
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
          corpusSnapshot: record.corpus,
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
        if (section.status === 'complete') continue
        if (section.status === 'failed') break
        const result = await generateReportSectionNow({ ...params, sectionId: section.id })
        if (result.status !== 'complete') break
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
