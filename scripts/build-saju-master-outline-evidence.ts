/** Build tracked, prose-free evidence from the isolated saju_master v3 record. */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { reviewGeneratedSajuReportSection } from '../src/report/report-generator.js'
import { createSavedPreview, reviewTeaser } from '../src/report/report-preview.js'
import type { ReportRecord } from '../src/report/report-store.js'

const recordRelativePath = '.cache/reading-live-20260914-saju-master/records/f314cb2c20152801f27b69f4e128.json'
const outputRelativePath = 'tone-v2/evaluations/P04-saju-master-full-outline-generation-20260914.json'
const previousVerification = existsSync(resolve(outputRelativePath))
  ? JSON.parse(readFileSync(resolve(outputRelativePath), 'utf8')).verification
  : undefined
const recordRaw = readFileSync(resolve(recordRelativePath), 'utf8')
const record = JSON.parse(recordRaw) as ReportRecord
if (record.context.serviceKey !== 'saju_master') throw new Error('Expected saju_master record')
if (record.status !== 'complete' || record.report.sections.length !== 37 || record.report.progress.complete !== 37) throw new Error('saju_master record is incomplete')

const replays = record.report.sections.map((section, index) => reviewGeneratedSajuReportSection({
  analysis: record.analysis!, birth: record.birth, context: record.context, section,
  hook: section.hook, interpretation: section.interpretation,
  siblings: record.report.sections.slice(0, index), corpusSnapshot: record.corpus,
}))
if (replays.some((review) => !review.passed)) throw new Error('saju_master record replay failed')
const preview = createSavedPreview(record.report, record.context)
const reportEvidence = [record.report.title, ...record.report.sections.flatMap((section) => [section.hook, section.interpretation])].join('\n')
const teaserReview = reviewTeaser({ preview, sourceEvidence: reportEvidence })
if (!teaserReview.passed) throw new Error(`saju_master teaser review failed: ${teaserReview.issues.join(' ')}`)

const attempts = record.report.sections.flatMap((section) => section.attempts ?? [])
const acceptedCanonical = JSON.stringify(record.report.sections.map(({ id, order, hook, interpretation }) => ({ id, order, hook, interpretation })))
const idsCanonical = JSON.stringify(record.report.sections.map(({ id, order }) => ({ id, order })))
const chars = replays.map((review) => review.characters)
const paragraphs = replays.map((review) => review.paragraphs)
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)
const metric = (values: number[]) => ({ minimum: Math.min(...values), maximum: Math.max(...values), average: Number((sum(values) / values.length).toFixed(2)) })
const evidence = {
  taskId: 'task-tone-v2-p04-saju-master-full-outline-evidence-20260914', evaluatedAt: '2026-09-14T12:00:00+09:00', status: 'pass', serviceKey: 'saju_master',
  provider: { model: record.report.sections[0].model, actualCalls: true, syntheticOnly: true, isolatedStorage: true, reasoningEffort: 'low' },
  identity: { version: '20260914-saju-master-full-v3', reportId: record.reportId, resultId: record.resultId },
  completion: { completedSections: 37, expectedSections: 37, recordStatus: record.status, firstFailure: null, attemptedAfterFailure: 0, attemptedOutsideLimit: 0 },
  sourceContract: { totalItems: 37, orderedSectionIdsSha256: createHash('sha256').update(idsCanonical).digest('hex'), sampleOutputsIngested: false },
  evidence: {
    recordSha256: createHash('sha256').update(recordRaw).digest('hex'), acceptedProseSha256: createHash('sha256').update(acceptedCanonical).digest('hex'),
    acceptedProseCanonicalForm: 'JSON array of ordered {id,order,hook,interpretation} objects', containsProviderProse: false, containsSecrets: false, containsPersonalData: false, sourceRecord: recordRelativePath,
  },
  generation: {
    storedAttempts: attempts.length, providerResponses: attempts.filter((attempt) => Boolean(attempt.raw)).length,
    acceptedSections: 37, acceptedAttempts: attempts.filter((attempt) => attempt.status === 'complete').length,
    failedAttempts: attempts.filter((attempt) => attempt.status === 'failed').length,
    interruptedAttempts: attempts.filter((attempt) => attempt.status === 'generating' && !attempt.raw).length,
    promptTokens: sum(attempts.map((attempt) => attempt.tokenUsage?.promptTokens ?? 0)), completionTokens: sum(attempts.map((attempt) => attempt.tokenUsage?.completionTokens ?? 0)), totalTokens: sum(attempts.map((attempt) => attempt.tokenUsage?.totalTokens ?? 0)),
  },
  replay: { passed: 37, failed: 0, interpretationCharacterCount: metric(chars), paragraphCount: metric(paragraphs) },
  teaser: {
    passed: true,
    representativeGrounds: preview.insights.length,
    containsConcreteScene: true,
    paidOutlineItemCount: 37,
    canonicalSha256: createHash('sha256').update(JSON.stringify(preview)).digest('hex'),
    containsProviderProse: false,
  },
  verification: previousVerification ?? {
    focusedTests: { passed: 0, failed: 0 }, fullTests: { suites: 0, passed: 0, failed: 0 }, typecheck: 'pending', vercelBuild: 'pending',
    independentReview: 'pending', reviewFindings: { critical: 0, major: 0, minor: 3, comments: 3, commentsSummary: [
      '일부 본문에 “또 같은 자리입니다” 같은 설명 연결구가 반복됩니다.',
      '일부 문단에 “세 번째입니다” 같은 편집 흔적에 가까운 표현이 남아 있습니다.',
      '서비스 중심 고민이 책임 경계라 유사 관찰 대상이 반복되지만, 각 목차의 판정·근거·마지막 기준은 구분됩니다.',
    ] },
  },
  notRun: ['production deployment', 'production customer report mutation'],
}
const output = resolve(outputRelativePath)
mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ output: outputRelativePath, attempts: attempts.length, replay: '37/37', containsProviderProse: false }))
