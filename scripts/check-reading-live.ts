/** Opt-in paid model smoke test. Synthetic inputs only; never reads/writes the production DB.
 * npx tsx scripts/check-reading-live.ts --generate [--service=pass_angle] [--serve]
 * npx tsx scripts/check-reading-live.ts --serve  (saved results only, no model call)
 */
import { config } from 'dotenv'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import type { SajuReportContext, SajuReport } from '../src/types/index.js'
import { isolateLiveCheckEnvironment } from './reading-live-environment.js'

config({ quiet: true })
config({ path: '.env.local', override: true, quiet: true })
// Keep only the approved provider credential; isolate every other credential and live integration.
isolateLiveCheckEnvironment(process.env)
process.env.NODE_ENV = 'test'
process.env.REPORT_STORAGE_DIR = resolve('.cache/reading-live-20260907')
const { analyzeSaju } = await import('../src/saju/analyzer.js')
const { buildTemplateSajuReport, reviewGeneratedSajuReportSection } = await import('../src/report/report-generator.js')
const { buildLoveMindContext, buildLoveMindReport } = await import('../src/love/mind-service.js')
const { createOrGetReportRecord, createReportId, findReportRecord, getReportRecord, toClientReport } = await import('../src/report/report-store.js')
const { generateReportSectionNow } = await import('../src/report/report-queue.js')
const { reviewPaidSectionDensity } = await import('../src/report/tone-v2-review.js')
const birth = { year: 1994, month: 4, day: 15, hour: 12, gender: 'female' as const, calendar: 'solar' as const }
const analysis = analyzeSaju(birth)
const mindInput = { relationshipStage: '헤어진 관계', contactPattern: '상대방이 차단하고 연락을 원하지 않는다고 했어요', recentSignal: '재접촉하지 않고 제 일상으로 돌아가고 싶어요', partnerBirthTimeKnown: false, concern: '상대 마음을 단정하지 말고 정리할 기준을 알고 싶어요' }
const contexts: SajuReportContext[] = [
  { serviceKey: 'saju_master', name: '합성 점검 A', concern: '직장과 관계 모두 만족하며 큰 문제 없이 지내요. 지금 잘 유지되는 조건을 이해하고 싶어요.', birthTimeKnown: true },
  buildLoveMindContext('합성 점검 B', mindInput),
  { serviceKey: 'pass_angle', name: '합성 점검 C', birthTimeKnown: false, concern: '평소 연습 점수는 목표 수준이고 큰 불안은 없어요.', exam: { examName: '합성 필기 시험', examDate: '2026-09-08', examType: 'objective', worry: '남은 하루에 무엇을 유지할지 궁금해요' } },
]
const serviceFilter = process.argv.find((item) => item.startsWith('--service='))?.slice('--service='.length)
const selectedContexts = [...contexts.entries()].filter(([, context]) => !serviceFilter || context.serviceKey === serviceFilter)
if (serviceFilter && selectedContexts.length === 0) throw new Error(`Unknown synthetic service filter: ${serviceFilter}`)

function parseAttempt(raw?: string): { parsed: { hook?: string; interpretation?: string }; status: 'parsed' | 'empty' | 'invalid' } {
  if (!raw) return { parsed: {}, status: 'empty' }
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end < start) return { parsed: {}, status: 'invalid' }
  try { return { parsed: JSON.parse(cleaned.slice(start, end + 1)), status: 'parsed' } }
  catch { return { parsed: {}, status: 'invalid' } }
}

const summary: unknown[] = []
for (const [index, context] of selectedContexts) {
  const version = process.argv.find((item) => item.startsWith('--version='))?.slice('--version='.length) ?? 'v1'
  const reportId = createReportId(birth, context, `live-qa-${version}`)
  let record = await getReportRecord(reportId)
  const requireFresh = process.argv.includes('--fresh')
  if (requireFresh && !process.argv.includes('--generate')) throw new Error('--fresh requires --generate')
  if (requireFresh && record) throw new Error(`Fresh live check version already exists: ${version}`)
  if (process.argv.includes('--generate')) {
    const full = index === 1 ? buildLoveMindReport(analysis, birth, context, mindInput, undefined, reportId) : buildTemplateSajuReport(analysis, birth, context)
    const section = index === 0 ? full.sections.find((item) => item.id === 'day-pillar') ?? full.sections[0] : index === 2 ? full.sections.find((item) => item.id === 'exam-day-routine') ?? full.sections[0] : full.sections.find((item) => item.id === 'confirmation-1') ?? full.sections[0]
    const templateReport: SajuReport = { ...full, sections: [section] }
    const created = await createOrGetReportRecord({ reportId, birth, context, templateReport, analysis })
    if (requireFresh && !created.created) throw new Error(`Fresh live check did not create a new record: ${version}`)
    console.log(JSON.stringify({ phase: 'saved-before-model', service: context.serviceKey, resultId: created.record.resultId, created: created.created }))
    const result = await generateReportSectionNow({ reportId, birth, context, analysis, sectionId: section.id })
    record = await getReportRecord(reportId)
    if (result.status === 'complete') {
      const again = await generateReportSectionNow({ reportId, birth: { ...birth, year: 2001 }, context: { concern: '다른 입력' }, analysis, sectionId: section.id, retry: true })
      assert.equal(again.interpretation, result.interpretation)
      assert.equal(again.attempts?.length, result.attempts?.length)
    }
  }
  if (!record) { summary.push({ service: context.serviceKey, status: 'not-generated' }); continue }
  const client = toClientReport(record)
  const recalled = await findReportRecord(client.resultId!)
  assert.deepEqual(recalled?.report, record.report)
  const section = record.report.sections[0]
  summary.push({ service: context.serviceKey, reportId, resultId: client.resultId, url: `http://127.0.0.1:8793${client.publicUrl}`, status: record.status, model: section.model, review: reviewGeneratedSajuReportSection({ analysis: record.analysis ?? analysis, birth: record.birth, context, section, hook: section.hook, interpretation: section.interpretation, siblings: record.report.sections.filter((item) => item.id !== section.id && item.status === 'complete') }), attempts: section.attempts?.map((item) => {
    const attemptParse = parseAttempt(item.raw)
    const parsed = attemptParse.parsed
    const prose = `${parsed.hook ?? ''}\n${parsed.interpretation ?? ''}`
    return {
      id: item.id, status: item.status, model: item.model, finishReason: item.finishReason, usage: item.tokenUsage, error: item.error,
      evidenceParseStatus: attemptParse.status,
      rawSha256: item.raw ? createHash('sha256').update(item.raw).digest('hex') : undefined,
      proseSha256: createHash('sha256').update(prose).digest('hex'),
      fullReview: reviewGeneratedSajuReportSection({ analysis: record.analysis ?? analysis, birth: record.birth, context, section, hook: parsed.hook ?? '', interpretation: parsed.interpretation ?? '', siblings: record.report.sections.filter((sibling) => sibling.id !== section.id && sibling.status === 'complete') }),
      density: reviewPaidSectionDensity({ hook: parsed.hook ?? '', question: section.classification, interpretation: parsed.interpretation ?? '', context, siblings: record.report.sections }),
      firstThreeVisibleSentences: (prose.match(/[^.!?。\n]+[.!?。]/g) ?? []).slice(0, 3).map((sentence) => sentence.trim()),
    }
  }) })
}
console.log(JSON.stringify({ isolatedStorage: process.env.REPORT_STORAGE_DIR, results: summary }, null, 2))
if (process.argv.includes('--serve')) {
  const { default: app } = await import('../src/server/app.js')
  app.listen(8793, '127.0.0.1', () => console.log('Synthetic saved-reading verification: http://127.0.0.1:8793'))
}
