/**
 * Paid, opt-in synthetic pass_angle full-outline check.
 * It uses isolated file storage, never production DB/customer data, and stops
 * immediately after the first section that remains rejected after normal retry.
 *
 * npx tsx scripts/check-pass-angle-outline-live.ts --version=<unique> --generate --fresh [--limit=1]
 * npx tsx scripts/check-pass-angle-outline-live.ts --version=<unique> --retry-section=<section-id>
 * npx tsx scripts/check-pass-angle-outline-live.ts --version=<unique>
 */
import { config } from 'dotenv'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { isolateLiveCheckEnvironment } from './reading-live-environment.js'

config({ quiet: true })
config({ path: '.env.local', override: true, quiet: true })
isolateLiveCheckEnvironment(process.env)
process.env.NODE_ENV = 'test'
process.env.REPORT_STORAGE_DIR = resolve('.cache/reading-live-20260907')

const { analyzeSaju } = await import('../src/saju/analyzer.js')
const { buildTemplateSajuReport, reviewGeneratedSajuReportSection } = await import('../src/report/report-generator.js')
const { generateReportSectionNow, recoverReportSectionFromLatestAttempt } = await import('../src/report/report-queue.js')
const { createOrGetReportRecord, createReportId, getReportRecord, toClientReport } = await import('../src/report/report-store.js')
const { getCorpusSnapshot } = await import('../src/rag/corpus-registry.js')

const expectedCorpusPath = 'tone-v2/corpus/releases/pass-angle-service-2.1.0.json'
const expectedCorpusVersion = '2.1.0'
const expectedCorpusSha256 = '44ab5c364540b7a943ca7739bd7f176fd45758973e3804b39ac481c8c2c0d96f'
const expectedCorpusHash = expectedCorpusSha256.slice(0, 16)
const activeCorpusPack = getCorpusSnapshot().activePacks.find((item) => item.id === 'pass-angle-service')
assert.equal(activeCorpusPack?.path, expectedCorpusPath, 'Active pass_angle corpus path must be the reviewed 2.1.0 candidate')
assert.equal(activeCorpusPack?.version, expectedCorpusVersion, 'Active pass_angle corpus version must be 2.1.0')
assert.equal(activeCorpusPack?.contentHash, expectedCorpusHash, 'Active pass_angle corpus registry hash must match the reviewed candidate')
assert.equal(
  createHash('sha256').update(readFileSync(resolve('data', expectedCorpusPath))).digest('hex'),
  expectedCorpusSha256,
  'Reviewed pass_angle corpus bytes changed',
)

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
const maxSections = limitOption === undefined ? 52 : Number(limitOption)
if (!Number.isInteger(maxSections) || maxSections < 1 || maxSections > 52) throw new Error('--limit must be an integer from 1 through 52')

const birth = { year: 1994, month: 4, day: 15, hour: 12, gender: 'female' as const, calendar: 'solar' as const }
const context = {
  serviceKey: 'pass_angle',
  name: '합성 전체 목차 점검',
  birthTimeKnown: false,
  concern: '평소 연습 점수는 목표 수준이고 큰 불안은 없어요. 현재 방법을 유지하면서 전체 준비 기준을 순서대로 확인하고 싶어요.',
  exam: {
    examName: '합성 필기 시험',
    examDate: '2026-12-01',
    examType: 'objective',
    priority: '현재 점수를 유지하면서 반복 실수를 줄이는 것',
    worry: '새 자료를 늘리지 않고 오답 복기와 당일 루틴을 유지할 기준이 궁금해요.',
  },
} as const
const analysis = analyzeSaju(birth)
const reportId = createReportId(birth, context, `live-qa-${version}`)
let record = await getReportRecord(reportId)
if (requireFresh && record) throw new Error(`Fresh pass_angle outline version already exists: ${version}`)

if (shouldGenerate) {
  const templateReport = buildTemplateSajuReport(analysis, birth, context)
  assert.equal(templateReport.sections.length, 52)
  const created = await createOrGetReportRecord({ reportId, birth, context, analysis, templateReport })
  if (requireFresh && !created.created) throw new Error(`Fresh pass_angle outline did not create a new record: ${version}`)
  const recordCorpusPack = created.record.corpus.activePacks.find((item) => item.id === 'pass-angle-service')
  assert.equal(recordCorpusPack?.path, expectedCorpusPath, 'Stored record must pin the reviewed pass_angle corpus path')
  assert.equal(recordCorpusPack?.version, expectedCorpusVersion, 'Stored record must pin pass_angle corpus 2.1.0')
  assert.equal(recordCorpusPack?.contentHash, expectedCorpusHash, 'Stored record must pin the reviewed pass_angle corpus hash')
  console.log(JSON.stringify({ phase: 'saved-before-model', version, resultId: created.record.resultId, total: created.record.report.sections.length, created: created.created, corpus: { path: recordCorpusPack.path, version: recordCorpusPack.version, contentHash: recordCorpusPack.contentHash } }))

  for (const section of created.record.report.sections.slice(0, maxSections)) {
    const current = await getReportRecord(reportId)
    const stored = current?.report.sections.find((item) => item.id === section.id)
    if (!stored || stored.status === 'complete') continue
    if (stored.status === 'failed') break
    const generated = await generateReportSectionNow({ reportId, birth, context, analysis, sectionId: section.id })
    const complete = (await getReportRecord(reportId))?.report.sections.filter((item) => item.status === 'complete').length ?? 0
    console.log(JSON.stringify({ phase: 'section-finished', order: section.order, id: section.id, status: generated.status, complete, total: 52, attempts: generated.attempts?.length ?? 0 }))
    if (generated.status !== 'complete') break
  }
  record = await getReportRecord(reportId)
}

if (recoverSectionId) {
  if (!record) throw new Error(`Cannot recover a missing pass_angle outline version: ${version}`)
  delete process.env.OPENAI_API_KEY
  const recovered = await recoverReportSectionFromLatestAttempt({ reportId, sectionId: recoverSectionId })
  console.log(JSON.stringify({ phase: 'saved-attempt-recovered', id: recovered.id, order: recovered.order, status: recovered.status, providerConfigured: false }))
  record = await getReportRecord(reportId)
}

if (retrySectionId) {
  if (!record) throw new Error(`Cannot retry a missing pass_angle outline version: ${version}`)
  const retried = await generateReportSectionNow({ reportId, birth, context, analysis, sectionId: retrySectionId, retry: true })
  console.log(JSON.stringify({ phase: 'section-retried', id: retried.id, order: retried.order, status: retried.status, attempts: retried.attempts?.length ?? 0 }))
  record = await getReportRecord(reportId)
}

if (!record) {
  console.log(JSON.stringify({ version, service: 'pass_angle', status: 'not-generated' }))
  process.exit(0)
}

const client = toClientReport(record)
const completed = record.report.sections.filter((section) => section.status === 'complete')
const failedIndex = record.report.sections.findIndex((section) => section.status === 'failed')
if (failedIndex < 0) {
  const requestedCompleted = record.report.sections.slice(0, maxSections).filter((section) => section.status === 'complete')
  assert.equal(requestedCompleted.length, maxSections, 'A no-failure run must complete every section in the requested prefix')
  if (maxSections === 52) assert.equal(client.progress.complete, 52, 'The default live check must prove 52/52 completion')
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
        corpusSnapshot: record!.corpus,
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
  service: 'pass_angle',
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
  corpus: { path: expectedCorpusPath, version: expectedCorpusVersion, sha256: expectedCorpusSha256, contentHash: expectedCorpusHash },
  sections,
}, null, 2))
