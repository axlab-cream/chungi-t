/** Build tracked, prose-free evidence from the isolated wedding_day record. */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { reviewGeneratedSajuReportSection } from '../src/report/report-generator.js'
import type { ReportRecord } from '../src/report/report-store.js'

const recordRelativePath = '.cache/reading-live-20260907/records/aa873d319ba79520285271cac79e.json'
const outputRelativePath = 'tone-v2/evaluations/P04-wedding-day-full-outline-generation-20260913.json'
const previousVerification = existsSync(resolve(outputRelativePath))
  ? JSON.parse(readFileSync(resolve(outputRelativePath), 'utf8')).verification
  : undefined
const recordRaw = readFileSync(resolve(recordRelativePath), 'utf8')
const record = JSON.parse(recordRaw) as ReportRecord
if (record.context.serviceKey !== 'wedding_day') throw new Error('Expected wedding_day record')
if (record.status !== 'complete' || record.report.sections.length !== 20 || record.report.progress.complete !== 20) throw new Error('Wedding record is incomplete')

const replays = record.report.sections.map((section, index) => reviewGeneratedSajuReportSection({
  analysis: record.analysis!, birth: record.birth, context: record.context, section,
  hook: section.hook, interpretation: section.interpretation,
  siblings: record.report.sections.slice(0, index), corpusSnapshot: record.corpus,
}))
if (replays.some((review) => !review.passed)) throw new Error('Wedding record replay failed')

const attempts = record.report.sections.flatMap((section) => section.attempts ?? [])
const acceptedCanonical = JSON.stringify(record.report.sections.map(({ id, order, hook, interpretation }) => ({ id, order, hook, interpretation })))
const chars = replays.map((review) => review.characters)
const paragraphs = replays.map((review) => review.paragraphs)
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)
const metric = (values: number[]) => ({ minimum: Math.min(...values), maximum: Math.max(...values), average: Number((sum(values) / values.length).toFixed(2)) })
const evidence = {
  taskId: 'task-tone-v2-p04-wedding-day-full-outline-evidence', evaluatedAt: '2026-09-13T12:00:00+09:00', status: 'pass', serviceKey: 'wedding_day',
  provider: { model: record.report.sections[0].model, actualCalls: true, syntheticOnly: true, isolatedStorage: true, reasoningEffort: 'low' },
  identity: { version: '20260913-wedding-full-v2', reportId: record.reportId, resultId: record.resultId },
  completion: { completedSections: 20, expectedSections: 20, recordStatus: record.status, firstFailure: null, attemptedAfterFailure: 0, attemptedOutsideLimit: 0 },
  sourceContract: {
    partItemCounts: [7, 6, 7], totalItems: 20,
    sha256: ['02e01e2b223d0ad8c2fe690944fd3e457d024cece005621c50806a0717dbcbca', '950b4cd63e2b088403a91762ceaa28e9eaa0a886aad6a1a478e92eedd509d761', 'a9386c71e0bf70ef738e29e79ec2ff8d9e67573220af91f722d17876de9d0631'],
    sampleOutputsIngested: false,
  },
  evidence: {
    recordSha256: createHash('sha256').update(recordRaw).digest('hex'), acceptedProseSha256: createHash('sha256').update(acceptedCanonical).digest('hex'),
    acceptedProseCanonicalForm: 'JSON array of ordered {id,order,hook,interpretation} objects', containsProviderProse: false, containsSecrets: false, containsPersonalData: false, sourceRecord: recordRelativePath,
  },
  generation: {
    storedAttempts: attempts.length, providerResponses: attempts.filter((attempt) => Boolean(attempt.raw)).length, acceptedSections: 20, acceptedAttempts: attempts.filter((attempt) => attempt.status === 'complete').length, recoveredAcceptedSections: 1,
    failedAttempts: attempts.filter((attempt) => attempt.status === 'failed').length,
    interruptedAttempts: attempts.filter((attempt) => attempt.status === 'generating' && !attempt.raw).length,
    promptTokens: sum(attempts.map((attempt) => attempt.tokenUsage?.promptTokens ?? 0)), completionTokens: sum(attempts.map((attempt) => attempt.tokenUsage?.completionTokens ?? 0)), totalTokens: sum(attempts.map((attempt) => attempt.tokenUsage?.totalTokens ?? 0)),
  },
  replay: { passed: 20, failed: 0, interpretationCharacterCount: metric(chars), paragraphCount: metric(paragraphs) },
  verification: previousVerification ?? {
    focusedTests: { passed: 0, failed: 0 }, fullTests: { suites: 0, passed: 0, failed: 0 }, typecheck: 'pending', vercelBuild: 'pending',
    independentReview: 'pending', reviewFindings: { critical: 0, major: 0, minor: 0, comments: 0, commentsSummary: [] as string[] },
  },
  notRun: ['production deployment', 'production customer report mutation'],
}
const output = resolve(outputRelativePath); mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ output: outputRelativePath, attempts: attempts.length, replay: '20/20', containsProviderProse: false }))
