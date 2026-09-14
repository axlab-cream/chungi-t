/**
 * Paid, opt-in synthetic quit_fortune full-outline check.
 * It uses isolated file storage, never production DB/customer data, and stops
 * immediately after the first section that remains rejected after normal retry.
 *
 * npx tsx scripts/check-quit-fortune-outline-live.ts --version=<unique> --generate --fresh [--limit=1]
 * npx tsx scripts/check-quit-fortune-outline-live.ts --version=<unique> --retry-section=<section-id>
 * npx tsx scripts/check-quit-fortune-outline-live.ts --version=<unique> --recover-section=<section-id>
 * npx tsx scripts/check-quit-fortune-outline-live.ts --version=<unique>
 */
import { config } from 'dotenv'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { isolateLiveCheckEnvironment } from './reading-live-environment.js'
import { assertRequestedPrefixComplete } from './reading-live-invariants.js'

config({ quiet: true })
config({ path: '.env.local', override: true, quiet: true })
isolateLiveCheckEnvironment(process.env)
process.env.NODE_ENV = 'test'
process.env.REPORT_STORAGE_DIR = resolve('.cache/reading-live-20260907')

const { analyzeSaju } = await import('../src/saju/analyzer.js')
const { reviewGeneratedSajuReportSection } = await import('../src/report/report-generator.js')
const { generateReportSectionNow, recoverReportSectionFromLatestAttempt } = await import('../src/report/report-queue.js')
const { createOrGetReportRecord, createReportId, getReportRecord, toClientReport } = await import('../src/report/report-store.js')
const {
  buildWorkQuitContext,
  buildWorkQuitReport,
  parseWorkQuitRequest,
  WORK_QUIT_SERVICE_KEY,
} = await import('../src/work/quit-service.js')

const version = process.argv.find((item) => item.startsWith('--version='))?.slice('--version='.length)
if (!version) throw new Error('A unique --version is required')
const shouldGenerate = process.argv.includes('--generate')
const requireFresh = process.argv.includes('--fresh')
const recoverSectionId = process.argv.find((item) => item.startsWith('--recover-section='))?.slice('--recover-section='.length)
const retrySectionId = process.argv.find((item) => item.startsWith('--retry-section='))?.slice('--retry-section='.length)
if (requireFresh && !shouldGenerate) throw new Error('--fresh requires --generate')
if (recoverSectionId && shouldGenerate) throw new Error('--recover-section cannot be combined with --generate')
if (retrySectionId && (shouldGenerate || recoverSectionId)) throw new Error('--retry-section cannot be combined with --generate or --recover-section')
const limitOption = process.argv.find((item) => item.startsWith('--limit='))?.slice('--limit='.length)
const maxSections = limitOption === undefined ? 48 : Number(limitOption)
if (!Number.isInteger(maxSections) || maxSections < 1 || maxSections > 48) throw new Error('--limit must be an integer from 1 through 48')

const birth = { year: 1991, month: 7, day: 18, hour: 12, gender: 'female' as const, calendar: 'solar' as const }
const input = parseWorkQuitRequest({
  reason: '현재 역할과 성장 방향을 차분히 다시 검토하고 싶어요',
  tenure: '3년',
  candidateDate: '2027-02-01',
  nextPlan: '재직 상태에서 이직 기회를 탐색하고 생활 계획을 확인해요',
  concern: '갈등이나 건강 이상을 가정하지 않고 남을 조건과 옮길 조건을 실제 정보로 비교하고 싶어요.',
})
const context = {
  ...buildWorkQuitContext('합성 퇴사운 전체 목차 점검', input),
  serviceKey: WORK_QUIT_SERVICE_KEY,
}
const analysis = analyzeSaju(birth)
const reportId = createReportId(birth, context, `live-qa-${version}`)
let record = await getReportRecord(reportId)
if (requireFresh && record) throw new Error(`Fresh quit_fortune outline version already exists: ${version}`)

if (shouldGenerate) {
  const templateReport = buildWorkQuitReport(analysis, birth, context, input, reportId)
  assert.equal(templateReport.sections.length, 48)
  const created = await createOrGetReportRecord({ reportId, birth, context, analysis, templateReport })
  if (requireFresh && !created.created) throw new Error(`Fresh quit_fortune outline did not create a new record: ${version}`)
  console.log(JSON.stringify({ phase: 'saved-before-model', version, resultId: created.record.resultId, total: created.record.report.sections.length, created: created.created }))

  for (const section of created.record.report.sections.slice(0, maxSections)) {
    const current = await getReportRecord(reportId)
    const stored = current?.report.sections.find((item) => item.id === section.id)
    if (!stored || stored.status === 'complete') continue
    if (stored.status === 'failed') break
    const generated = await generateReportSectionNow({ reportId, birth, context, analysis, sectionId: section.id })
    const complete = (await getReportRecord(reportId))?.report.sections.filter((item) => item.status === 'complete').length ?? 0
    console.log(JSON.stringify({ phase: 'section-finished', order: section.order, id: section.id, status: generated.status, complete, total: 48, attempts: generated.attempts?.length ?? 0 }))
    if (generated.status !== 'complete') break
  }
  record = await getReportRecord(reportId)
}

if (recoverSectionId) {
  if (!record) throw new Error(`Cannot recover a missing quit_fortune outline version: ${version}`)
  delete process.env.OPENAI_API_KEY
  const recovered = await recoverReportSectionFromLatestAttempt({ reportId, sectionId: recoverSectionId })
  console.log(JSON.stringify({ phase: 'saved-attempt-recovered', id: recovered.id, order: recovered.order, status: recovered.status, providerConfigured: false }))
  record = await getReportRecord(reportId)
}

if (retrySectionId) {
  if (!record) throw new Error(`Cannot retry a missing quit_fortune outline version: ${version}`)
  const retried = await generateReportSectionNow({ reportId, birth, context, analysis, sectionId: retrySectionId, retry: true })
  console.log(JSON.stringify({ phase: 'section-retried', id: retried.id, order: retried.order, status: retried.status, attempts: retried.attempts?.length ?? 0 }))
  record = await getReportRecord(reportId)
}

if (!record) {
  console.log(JSON.stringify({ version, service: WORK_QUIT_SERVICE_KEY, status: 'not-generated' }))
  process.exit(0)
}

const client = toClientReport(record)
const failedIndex = record.report.sections.findIndex((section) => section.status === 'failed')
const requestedCompleted = record.report.sections.slice(0, maxSections).filter((section) => section.status === 'complete')
assertRequestedPrefixComplete({
  firstFailureIndex: failedIndex,
  completedInRequestedPrefix: requestedCompleted.length,
  requestedPrefixSize: maxSections,
})
if (failedIndex < 0) {
  if (maxSections === 48) assert.equal(client.progress.complete, 48, 'The default live check must prove 48/48 completion')
}
const attemptedAfterFailure = failedIndex < 0
  ? []
  : record.report.sections.slice(failedIndex + 1).filter((section) => (section.attempts?.length ?? 0) > 0)
assert.equal(attemptedAfterFailure.length, 0, 'No section after the first failure may be attempted')
const attemptedOutsideLimit = record.report.sections.slice(maxSections).filter((section) => (section.attempts?.length ?? 0) > 0)
assert.equal(attemptedOutsideLimit.length, 0, 'No section outside the requested live-check limit may be attempted')

const sections = record.report.sections.map((section, index) => {
  const previous = record!.report.sections.slice(0, index).filter((item) => item.status === 'complete')
  const replay = section.status === 'complete'
    ? reviewGeneratedSajuReportSection({
        analysis: record!.analysis ?? analysis,
        birth: record!.birth,
        context: record!.context,
        section,
        hook: section.hook,
        interpretation: section.interpretation,
        siblings: previous,
      })
    : undefined
  return {
    id: section.id,
    order: section.order,
    category: section.category,
    classification: section.classification,
    status: section.status,
    model: section.model,
    hookLength: section.hook.length,
    interpretationLength: section.interpretation.length,
    proseSha256: section.status === 'complete' ? createHash('sha256').update(`${section.hook}\n${section.interpretation}`).digest('hex') : undefined,
    replay: replay ? { passed: replay.passed, issues: replay.issues, characters: replay.characters, paragraphs: replay.paragraphs } : undefined,
    attempts: section.attempts?.map((attempt) => ({
      id: attempt.id,
      status: attempt.status,
      model: attempt.model,
      finishReason: attempt.finishReason,
      usage: attempt.tokenUsage,
      error: attempt.error,
      rawSha256: attempt.raw ? createHash('sha256').update(attempt.raw).digest('hex') : undefined,
    })),
  }
})
const replayFailures = sections
  .filter((section) => section.status === 'complete' && section.replay && !section.replay.passed)
  .map((section) => ({
    id: section.id,
    order: section.order,
    issues: section.replay?.issues.map((issue) => typeof issue === 'string' ? issue : issue.code) ?? [],
  }))
if (replayFailures.length > 0) console.error(JSON.stringify({ phase: 'replay-failures', sections: replayFailures }))
assert.equal(replayFailures.length, 0, 'Every completed section must pass production-equivalent replay')

console.log(JSON.stringify({
  version,
  service: WORK_QUIT_SERVICE_KEY,
  requestedLimit: maxSections,
  syntheticOnly: true,
  isolatedStorage: process.env.REPORT_STORAGE_DIR,
  reportId,
  resultId: client.resultId,
  recordStatus: record.status,
  progress: client.progress,
  firstFailure: failedIndex < 0 ? null : { order: record.report.sections[failedIndex].order, id: record.report.sections[failedIndex].id },
  attemptedAfterFailure: attemptedAfterFailure.length,
  attemptedOutsideLimit: attemptedOutsideLimit.length,
  recordSha256: createHash('sha256').update(JSON.stringify(record)).digest('hex'),
  sections,
}, null, 2))
