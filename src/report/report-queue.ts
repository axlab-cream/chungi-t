import { randomUUID } from 'node:crypto'
import type { BirthInput, SajuAnalysis, SajuReportContext, SajuReportSection } from '../types/index.js'
import { OpenAiTruncatedError, isOpenAiConfigured } from '../llm/openai-adapter.js'
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

/**
 * 실패로 굳은 섹션을 이어서 다시 만들지 여부.
 *
 * 화면에서 부르는 경로는 끈다 — 사용자가 「다시 생성하기」를 누른 것이 아닌데 조용히
 * 다시 태우면 같은 실패를 반복하며 요금만 쓴다. 영속 큐에서 부를 때만 켠다. 큐는
 * attempts·max_attempts 로 횟수를 제한하고 지수 백오프로 물러나므로, 몇 번까지
 * 시도할지는 여기서 또 세지 않는다.
 */
export interface PreGenerationOptions {
  recoverFailed?: boolean
}

/**
 * 한 실행에서 건너뛸 수 있는 항목 수.
 *
 * 건너뛰기는 막힌 칸이 뒤를 세우지 않게 하려는 장치이지, 전부 실패하는 중에도 계속
 * 모델을 부르라는 뜻이 아니다. 이 수를 넘기면 같은 이유로 무너지는 중으로 보고 물러난다.
 */
const SKIP_LIMIT_PER_RUN = Math.min(Math.max(Number(process.env.REPORT_SKIP_LIMIT) || 3, 1), 10)
const inFlightReports = new Map<string, Promise<ReportRecord | null>>()
const LEASE_MS = 6 * 60_000

/**
 * 검수는 밀도 네 요소(직접 답·개인 근거·생활 장면·다음 판단 기준)를 각각 정규식으로 본다.
 * 두 번만 쓰게 하면 모델이 지적받은 한 요소를 고치다 다른 요소를 떨어뜨리고 그대로 실패로
 * 굳는다 — 실제로 시도마다 남는 지적이 하나씩 달랐다(2026-09-17). 한 번 더 왕복할 여유를
 * 준다. `maxDuration` 이 300초이므로 이 횟수까지는 요청 안에서 끝난다.
 */
export const SECTION_ATTEMPT_LIMIT = Math.min(Math.max(Number(process.env.REPORT_SECTION_ATTEMPTS) || 4, 2), 6)

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
    /*
     * 앞 칸이 아직 도는 중이거나 시작도 안 했으면 기다린다 — 형제 글의 순서를 지키기
     * 위해서다. 다만 앞 칸이 이미 **실패로 남은** 경우는 기다릴 이유가 없다. 그 한 칸을
     * 기다리다 뒤의 수십 개가 영영 멈췄다(2026-09-17 관계 신호 0/70).
     */
    if (current.report.sections.slice(0, position).some(item => item.status === 'pending' || item.status === 'generating')) return false
    // 되살리기는 뒤 칸이 이미 시작했더라도 막지 않는다. 막으면 건너뛴 칸을 영영 회수할 수 없다.
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
  for (let index = 0; index < SECTION_ATTEMPT_LIMIT; index += 1) {
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
      const truncated = error instanceof OpenAiTruncatedError
      // 잘림은 내용 지적이 아니다. 재작성 지시문을 붙이면 프롬프트가 더 길어져 예산을 더 깎으므로
      // 같은 프롬프트로 다시 부른다. 진단은 시도 기록에만 남긴다.
      issues = error instanceof InterpretationQualityError ? error.review.issues : []
      const diagnosis = error instanceof InterpretationQualityError
        ? error.review.issues.join(' ')
        : truncated
          ? error.message
          : '해석 생성 또는 저장이 완료되지 않았습니다.'
      const retryable = (error instanceof InterpretationQualityError || truncated) && index < SECTION_ATTEMPT_LIMIT - 1
      await editClaim((section, current) => {
        const attempt = section.attempts?.find((item) => item.id === attemptId)
        if (attempt) { attempt.status = 'failed'; attempt.error = diagnosis; attempt.finishedAt = new Date().toISOString() }
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

export async function preGenerateReport(params: GenerationParams, options: PreGenerationOptions = {}): Promise<ReportRecord | null> {
  const record = await getReportRecord(params.reportId, params.owner)
  if (!record) return null
  assertReportOwner(record, params.owner)
  if (record.status === 'complete') return record
  const running = inFlightReports.get(params.reportId)
  if (running) return running
  const run = (async () => {
    try {
      /*
       * 막힌 한 칸이 나머지 전부를 세우지 않게 한다.
       *
       * 예전에는 실패한 항목에서 루프를 끊었다. 항목이 70개인 서비스에서 첫 칸이 막히면
       * 나머지 69개가 영영 시작되지 않았다 — 2026-09-17 운영에서 관계 신호 0/70,
       * 고양이 궁합 0/50 이 정확히 그 상태였다.
       *
       * 이제 큐가 부른 실행에서는 한 번 되살려 보고, 그래도 안 되면 **건너뛰고 다음 칸으로**
       * 간다. 건너뛴 칸은 실패로 남아 다음 실행이 다시 집는다. 그때는 앞뒤 형제 글이 더
       * 쌓여 있어 성공할 여지가 커진다.
       */
      const skipped: string[] = []
      for (const section of record.report.sections) {
        if (section.status === 'complete') continue
        if (section.status === 'failed' && !options.recoverFailed) break
        const result = await generateReportSectionNow({
          ...params,
          sectionId: section.id,
          ...(section.status === 'failed' ? { retry: true } : {}),
        })
        if (result.status === 'complete') continue
        if (!options.recoverFailed) break
        skipped.push(section.id)
        // 한 실행에서 너무 많이 건너뛰면 같은 이유로 전부 실패하는 중일 가능성이 크다.
        // 모델 호출만 태우지 말고 물러나서 다음 실행에 맡긴다.
        if (skipped.length >= SKIP_LIMIT_PER_RUN) break
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
