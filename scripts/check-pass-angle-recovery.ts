/**
 * Recover one synthetic pass_angle section from its last saved attempt.
 * This disables provider configuration, performs no generation, and proves
 * predecessor, attempt, identity, and later-section immutability.
 *
 * npx tsx scripts/check-pass-angle-recovery.ts --version=<existing> --section=<id>
 */
import { config } from 'dotenv'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { isolateLiveCheckEnvironment } from './reading-live-environment.js'

config({ quiet: true })
config({ path: '.env.local', override: true, quiet: true })
isolateLiveCheckEnvironment(process.env)
process.env.NODE_ENV = 'test'
process.env.REPORT_STORAGE_DIR = resolve('.cache/reading-live-20260907')
delete process.env.OPENAI_API_KEY

const { analyzeSaju } = await import('../src/saju/analyzer.js')
const { recoverReportSectionFromLatestAttempt } = await import('../src/report/report-queue.js')
const { createReportId, getReportRecord } = await import('../src/report/report-store.js')

const version = process.argv.find((item) => item.startsWith('--version='))?.slice('--version='.length)
const sectionId = process.argv.find((item) => item.startsWith('--section='))?.slice('--section='.length)
if (!version || !sectionId) throw new Error('--version and --section are required')

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
const reportId = createReportId(birth, context, `live-qa-${version}`)
const before = await getReportRecord(reportId)
if (!before) throw new Error(`Existing synthetic record not found: ${version}`)
const targetIndex = before.report.sections.findIndex((item) => item.id === sectionId)
assert.ok(targetIndex >= 0, 'Recovery target must exist')
const targetBefore = before.report.sections[targetIndex]
assert.equal(targetBefore.status, 'failed', 'Recovery target must be failed before the first run')
assert.ok(targetBefore.attempts?.at(-1)?.raw, 'Recovery target must retain its last raw response')
assert.ok(before.report.sections.slice(0, targetIndex).every((item) => item.status === 'complete'), 'Every predecessor must be complete')
assert.ok(before.report.sections.slice(targetIndex + 1).every((item) => !item.attempts?.length), 'Later items must be untouched')

const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const invariants = {
  identities: hash({ reportId: before.reportId, resultId: before.resultId, publicId: before.report.publicId, birth: before.birth, context: before.context, analysis: before.analysis }),
  predecessors: hash(before.report.sections.slice(0, targetIndex)),
  attempts: hash(targetBefore.attempts),
  attemptRaw: targetBefore.attempts!.map((attempt) => attempt.raw ? createHash('sha256').update(attempt.raw).digest('hex') : null),
  later: hash(before.report.sections.slice(targetIndex + 1)),
}
const beforeRevision = before.revision ?? 0

const recovered = await Promise.all([
  recoverReportSectionFromLatestAttempt({ reportId, sectionId }),
  recoverReportSectionFromLatestAttempt({ reportId, sectionId }),
])
assert.ok(recovered.every((item) => item.status === 'complete'), 'Concurrent recovery callers must observe completion')
await recoverReportSectionFromLatestAttempt({ reportId, sectionId })

const after = await getReportRecord(reportId)
if (!after) throw new Error('Recovered record disappeared')
const targetAfter = after.report.sections[targetIndex]
assert.equal(targetAfter.status, 'complete')
assert.equal(after.revision, beforeRevision + 1, 'Concurrent and repeated recovery must commit exactly once')
assert.equal(after.report.progress?.complete, targetIndex + 1)
assert.equal(after.report.progress?.total, after.report.sections.length)
assert.equal(after.status, 'generating')
assert.equal(after.report.status, 'generating')
assert.equal(hash({ reportId: after.reportId, resultId: after.resultId, publicId: after.report.publicId, birth: after.birth, context: after.context, analysis: after.analysis }), invariants.identities)
assert.equal(hash(after.report.sections.slice(0, targetIndex)), invariants.predecessors)
assert.equal(hash(targetAfter.attempts), invariants.attempts)
assert.deepEqual(targetAfter.attempts!.map((attempt) => attempt.raw ? createHash('sha256').update(attempt.raw).digest('hex') : null), invariants.attemptRaw)
assert.equal(hash(after.report.sections.slice(targetIndex + 1)), invariants.later)
assert.ok(after.report.sections.slice(targetIndex + 1).every((item) => !item.attempts?.length))

console.log(JSON.stringify({
  version,
  syntheticOnly: true,
  providerConfigured: false,
  reportId,
  resultId: after.resultId,
  recoveredSection: { id: targetAfter.id, order: targetAfter.order, status: targetAfter.status, attempts: targetAfter.attempts?.length },
  progress: after.report.progress,
  recordStatus: after.status,
  revisionBefore: beforeRevision,
  revisionAfter: after.revision,
  invariants,
  laterAttemptCount: after.report.sections.slice(targetIndex + 1).reduce((sum, item) => sum + (item.attempts?.length ?? 0), 0),
}, null, 2))
