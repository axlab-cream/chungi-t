/** Isolated, paid synthetic wedding_day full-outline provider check. */
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
process.env.REPORT_SECTION_MAX_TOKENS = '4200'
process.env.OPENAI_REASONING_EFFORT = 'low'

const { analyzeSaju } = await import('../src/saju/analyzer.js')
const { buildWeddingContext, buildWeddingReport, parseWeddingRequest, WEDDING_SERVICE_KEY } = await import('../src/day/wedding-service.js')
const { reviewGeneratedSajuReportSection } = await import('../src/report/report-generator.js')
const { generateReportSectionNow, recoverReportSectionFromLatestAttempt } = await import('../src/report/report-queue.js')
const { createOrGetReportRecord, createReportId, getReportRecord, toClientReport } = await import('../src/report/report-store.js')

const version = process.argv.find((arg) => arg.startsWith('--version='))?.slice(10)
if (!version) throw new Error('A unique --version is required')
const shouldGenerate = process.argv.includes('--generate')
const shouldResume = process.argv.includes('--resume')
const requireFresh = process.argv.includes('--fresh')
const recoverSectionId = process.argv.find((arg) => arg.startsWith('--recover-section='))?.slice(18)
const retrySectionId = process.argv.find((arg) => arg.startsWith('--retry-section='))?.slice(16)
if (requireFresh && !shouldGenerate) throw new Error('--fresh requires --generate')
if (shouldResume && !shouldGenerate) throw new Error('--resume requires --generate')
if (recoverSectionId && shouldGenerate) throw new Error('--recover-section cannot be combined with --generate')
if (retrySectionId && (shouldGenerate || recoverSectionId)) throw new Error('--retry-section cannot be combined with --generate or --recover-section')
const rawLimit = process.argv.find((arg) => arg.startsWith('--limit='))?.slice(8)
const maxSections = rawLimit === undefined ? 20 : Number(rawLimit)
if (!Number.isInteger(maxSections) || maxSections < 1 || maxSections > 20) throw new Error('--limit must be an integer from 1 through 20')

const birth = { year: 1991, month: 4, day: 18, hour: 11, gender: 'female' as const, calendar: 'solar' as const }
const input = parseWeddingRequest({ candidateDate1: '2027-04-11', candidateDate2: '2027-05-23', candidateDate3: '2027-10-18', partnerBirth: '1989-03-11', format: '예식장', familyLimit: '5월 넷째 주 가족 일정' })
const analysis = analyzeSaju(birth)
const context = buildWeddingContext('합성 결혼 택일 전체 목차 점검', input, analysis)
const reportId = createReportId(birth, context, `live-qa-${version}`)
let record = await getReportRecord(reportId)
if (requireFresh && record) throw new Error(`Fresh wedding_day outline version already exists: ${version}`)

if (shouldGenerate) {
  const templateReport = buildWeddingReport(analysis, birth, context, input, reportId)
  assert.equal(templateReport.sections.length, 20)
  const created = await createOrGetReportRecord({ reportId, birth, context, analysis, templateReport })
  if (requireFresh && !created.created) throw new Error(`Fresh wedding_day outline did not create a new record: ${version}`)
  console.log(JSON.stringify({ phase: 'saved-before-model', version, resultId: created.record.resultId, total: 20, created: created.created }))
  for (const section of created.record.report.sections.slice(0, maxSections)) {
    const stored = (await getReportRecord(reportId))?.report.sections.find((item) => item.id === section.id)
    if (!stored || stored.status === 'complete') continue
    if (stored.status === 'failed' && !shouldResume) break
    const generated = await generateReportSectionNow({ reportId, birth, context, analysis, sectionId: section.id, retry: stored.status === 'failed' })
    const complete = (await getReportRecord(reportId))?.report.sections.filter((item) => item.status === 'complete').length ?? 0
    console.log(JSON.stringify({ phase: 'section-finished', order: section.order, id: section.id, status: generated.status, complete, total: 20, attempts: generated.attempts?.length ?? 0 }))
    if (generated.status !== 'complete') break
  }
  record = await getReportRecord(reportId)
}

if (recoverSectionId) {
  if (!record) throw new Error(`Cannot recover a missing wedding_day outline version: ${version}`)
  delete process.env.OPENAI_API_KEY
  const recovered = await recoverReportSectionFromLatestAttempt({ reportId, sectionId: recoverSectionId })
  console.log(JSON.stringify({ phase: 'saved-attempt-recovered', id: recovered.id, order: recovered.order, status: recovered.status, providerConfigured: false }))
  record = await getReportRecord(reportId)
}
if (retrySectionId) {
  if (!record) throw new Error(`Cannot retry a missing wedding_day outline version: ${version}`)
  const retried = await generateReportSectionNow({ reportId, birth, context, analysis, sectionId: retrySectionId, retry: true })
  console.log(JSON.stringify({ phase: 'section-retried', id: retried.id, order: retried.order, status: retried.status, attempts: retried.attempts?.length ?? 0 }))
  record = await getReportRecord(reportId)
}
if (!record) {
  console.log(JSON.stringify({ version, service: WEDDING_SERVICE_KEY, status: 'not-generated' }))
  process.exit(0)
}

const client = toClientReport(record)
const failedIndex = record.report.sections.findIndex((section) => section.status === 'failed')
const requestedCompleted = record.report.sections.slice(0, maxSections).filter((section) => section.status === 'complete')
if (shouldGenerate || (!retrySectionId && !recoverSectionId)) assertRequestedPrefixComplete({ firstFailureIndex: failedIndex, completedInRequestedPrefix: requestedCompleted.length, requestedPrefixSize: maxSections })
if (failedIndex < 0 && maxSections === 20 && (shouldGenerate || (!retrySectionId && !recoverSectionId))) assert.equal(client.progress.complete, 20)
const attemptedAfterFailure = failedIndex < 0 ? [] : record.report.sections.slice(failedIndex + 1).filter((section) => (section.attempts?.length ?? 0) > 0)
assert.equal(attemptedAfterFailure.length, 0, 'No section after the first failure may be attempted')
const attemptedOutsideLimit = record.report.sections.slice(maxSections).filter((section) => (section.attempts?.length ?? 0) > 0)
assert.equal(attemptedOutsideLimit.length, 0, 'No section outside the requested limit may be attempted')

const sections = record.report.sections.map((section, index) => {
  const previous = record!.report.sections.slice(0, index).filter((item) => item.status === 'complete')
  const replay = section.status === 'complete' ? reviewGeneratedSajuReportSection({ analysis: record!.analysis ?? analysis, birth: record!.birth, context: record!.context, section, hook: section.hook, interpretation: section.interpretation, siblings: previous, corpusSnapshot: record!.corpus }) : undefined
  return {
    id: section.id, order: section.order, category: section.category, classification: section.classification,
    status: section.status, model: section.model, hookLength: section.hook.length, interpretationLength: section.interpretation.length,
    proseSha256: section.status === 'complete' ? createHash('sha256').update(`${section.hook}\n${section.interpretation}`).digest('hex') : undefined,
    replay: replay ? { passed: replay.passed, issues: replay.issues, characters: replay.characters, paragraphs: replay.paragraphs } : undefined,
    attempts: section.attempts?.map((attempt) => ({ id: attempt.id, status: attempt.status, model: attempt.model, finishReason: attempt.finishReason, usage: attempt.tokenUsage, error: attempt.error, rawSha256: attempt.raw ? createHash('sha256').update(attempt.raw).digest('hex') : undefined })),
  }
})
const replayFailures = sections.filter((section) => section.status === 'complete' && section.replay && !section.replay.passed).map((section) => ({ id: section.id, order: section.order, issues: section.replay?.issues.map((issue) => typeof issue === 'string' ? issue : issue.code) ?? [] }))
if (replayFailures.length) console.error(JSON.stringify({ phase: 'replay-failures', sections: replayFailures }))
assert.equal(replayFailures.length, 0, 'Every completed section must pass production-equivalent replay')
console.log(JSON.stringify({ version, service: WEDDING_SERVICE_KEY, requestedLimit: maxSections, syntheticOnly: true, isolatedStorage: process.env.REPORT_STORAGE_DIR, reportId, resultId: client.resultId, recordStatus: record.status, progress: client.progress, firstFailure: failedIndex < 0 ? null : { order: record.report.sections[failedIndex].order, id: record.report.sections[failedIndex].id }, attemptedAfterFailure: attemptedAfterFailure.length, attemptedOutsideLimit: attemptedOutsideLimit.length, recordSha256: createHash('sha256').update(JSON.stringify(record)).digest('hex'), sections }, null, 2))
