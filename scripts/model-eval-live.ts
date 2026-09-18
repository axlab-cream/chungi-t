/**
 * Model cost/quality evaluation harness. Synthetic inputs only; never touches production storage.
 *
 *   npx tsx scripts/model-eval-live.ts                       # dry run: prompt sizes only, zero API calls
 *   npx tsx scripts/model-eval-live.ts --live --model=gpt-4o-mini --services=marry_match,money_save,couple_signal --sections=2
 *
 * Flags
 *   --model=<id>        REPORT_OPENAI_MODEL for this run (default: current code default)
 *   --services=a,b      subset of marry_match | money_save | couple_signal | match_couple (default: all four)
 *   --sections=N        first N sections per service (default 2)
 *   --live              actually call the model (otherwise dry run)
 *   --version=<tag>     isolated storage tag; a new tag forces fresh generation
 *
 * 2026-09-18: gpt-5.5 cost ~22.8K input tokens per call and marry_match failed 87% of first-pass calls.
 * Before switching models or trimming prompts we measure pass rate, attempts and tokens here, locally.
 */
import { config } from 'dotenv'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { isolateLiveCheckEnvironment } from './reading-live-environment.js'

config({ quiet: true })
config({ path: '.env.local', override: true, quiet: true })
isolateLiveCheckEnvironment(process.env)

const arg = (name: string) => process.argv.find((item) => item.startsWith(`--${name}=`))?.slice(name.length + 3)
const live = process.argv.includes('--live')
const model = arg('model')
const version = arg('version') ?? 'v1'
const perService = Math.max(1, Number(arg('sections') ?? 2) || 2)
const requested = (arg('services') ?? 'marry_match,money_save,couple_signal,match_couple').split(',').map((item) => item.trim()).filter(Boolean)

// REPORT_MODEL is read once at module load, so the override must land before the dynamic imports below.
if (model) process.env.REPORT_OPENAI_MODEL = model
process.env.NODE_ENV = 'test'
process.env.REPORT_STORAGE_DIR = resolve(`.cache/model-eval-${version}`)
mkdirSync(process.env.REPORT_STORAGE_DIR, { recursive: true })
if (live && !process.env.OPENAI_API_KEY) throw new Error('--live requires OPENAI_API_KEY in the local environment')

const { analyzeSaju } = await import('../src/saju/analyzer.js')
const { getReportModel, sectionPrompt } = await import('../src/report/report-generator.js')
const { createOrGetReportRecord, createReportId, getReportRecord } = await import('../src/report/report-store.js')
const { generateReportSectionNow } = await import('../src/report/report-queue.js')
const { buildMarryMatchContext, buildMarryMatchReport, parseMarryMatchRequest } = await import('../src/match/marry-service.js')
const { buildCoupleMatchContext, buildCoupleMatchReport, parseCoupleMatchRequest } = await import('../src/match/couple-service.js')
const { buildLoveSignalContext, buildLoveSignalReport, parseLoveSignalRequest } = await import('../src/love/signal-service.js')
const { buildMoneySaveContext, buildMoneySaveReport, parseMoneySaveRequest } = await import('../src/money/save-service.js')
type SajuReport = import('../src/types/index.js').SajuReport
type SajuReportContext = import('../src/types/index.js').SajuReportContext

const birth = { year: 1992, month: 8, day: 20, hour: 12, minute: 0, gender: 'female' as const, calendar: 'solar' as const }
const analysis = analyzeSaju(birth)
const partnerBody = { partnerName: '합성 상대', partnerBirthText: '19940912', partnerBirth: { gender: 'male', calendar: 'solar' } }

function synthetic(serviceKey: string): { context: SajuReportContext; report: SajuReport } {
  if (serviceKey === 'marry_match') {
    const input = parseMarryMatchRequest({ ...partnerBody, relationshipStage: '결혼 이야기가 나오는 사이', marriagePlan: '1년 안', concern: '돈 관리 방식이 달라서 걱정이에요.' })
    const partner = analyzeSaju(input.partnerBirth)
    const context = buildMarryMatchContext('합성 A', input, partner)
    return { context, report: buildMarryMatchReport(analysis, partner, birth, context, input) }
  }
  if (serviceKey === 'match_couple') {
    const input = parseCoupleMatchRequest({ ...partnerBody, relationshipStage: '연애 중', concern: '주말 약속을 정하는 방식이 자꾸 어긋나요.' })
    const partner = analyzeSaju(input.partnerBirth)
    const context = buildCoupleMatchContext('합성 B', input, partner)
    return { context, report: buildCoupleMatchReport(analysis, partner, birth, context, input) }
  }
  if (serviceKey === 'couple_signal') {
    const input = parseLoveSignalRequest({ ...partnerBody, relationshipStage: '연애 중', signalFocus: '연락 온도차', concern: '요즘 답장이 느려져서 자꾸 신경이 쓰여요.' })
    const partner = analyzeSaju(input.partnerBirth)
    const context = buildLoveSignalContext('합성 C', input, partner)
    return { context, report: buildLoveSignalReport(analysis, partner, birth, context, input) }
  }
  if (serviceKey === 'money_save') {
    const input = parseMoneySaveRequest({ moneyHabit: '월급 받으면 첫 주에 절반이 사라져요', incomePattern: '고정 월급', leakPoint: '배달과 구독', savingGoal: '1년에 500만 원', concern: '왜 모이지 않는지 모르겠어요.' })
    const context = buildMoneySaveContext('합성 D', input)
    return { context, report: buildMoneySaveReport(analysis, birth, context, input) }
  }
  throw new Error(`Unknown synthetic service: ${serviceKey}`)
}

interface SectionResult {
  service: string
  sectionId: string
  promptChars: number
  status?: string
  attempts?: number
  failedAttempts?: number
  promptTokens?: number
  completionTokens?: number
  chars?: number
  seconds?: number
  issues?: string[]
}

const results: SectionResult[] = []
console.log(JSON.stringify({ mode: live ? 'live' : 'dry-run', model: getReportModel(), services: requested, sectionsPerService: perService, storage: process.env.REPORT_STORAGE_DIR }))

for (const serviceKey of requested) {
  const { context, report } = synthetic(serviceKey)
  const chosen = report.sections.slice(0, perService)
  const reportId = createReportId(birth, context, `model-eval-${version}`)
  const templateReport: SajuReport = { ...report, sections: chosen }
  await createOrGetReportRecord({ reportId, birth, context, templateReport, analysis })

  for (const section of chosen) {
    const before = await getReportRecord(reportId)
    const siblings = (before?.report.sections ?? []).filter((item) => item.id !== section.id && item.status === 'complete')
    const promptChars = sectionPrompt(analysis, birth, context, section, siblings).reduce((sum, message) => sum + message.content.length, 0)
    const row: SectionResult = { service: serviceKey, sectionId: section.id, promptChars }
    if (live) {
      const started = Date.now()
      const generated = await generateReportSectionNow({ reportId, birth, context, analysis, sectionId: section.id })
      const attempts = generated.attempts ?? []
      row.status = generated.status
      row.attempts = attempts.length
      row.failedAttempts = attempts.filter((attempt) => attempt.status === 'failed').length
      row.promptTokens = attempts.reduce((sum, attempt) => sum + (attempt.tokenUsage?.promptTokens ?? 0), 0)
      row.completionTokens = attempts.reduce((sum, attempt) => sum + (attempt.tokenUsage?.completionTokens ?? 0), 0)
      row.chars = generated.interpretation?.length ?? 0
      row.seconds = Math.round((Date.now() - started) / 100) / 10
      row.issues = attempts.filter((attempt) => attempt.status === 'failed' && attempt.error).map((attempt) => String(attempt.error).slice(0, 90))
    }
    results.push(row)
    console.log(JSON.stringify(row))
  }
}

const totals = results.reduce((sum, row) => ({
  sections: sum.sections + 1,
  complete: sum.complete + (row.status === 'complete' ? 1 : 0),
  attempts: sum.attempts + (row.attempts ?? 0),
  failed: sum.failed + (row.failedAttempts ?? 0),
  promptTokens: sum.promptTokens + (row.promptTokens ?? 0),
  completionTokens: sum.completionTokens + (row.completionTokens ?? 0),
  promptChars: sum.promptChars + row.promptChars,
}), { sections: 0, complete: 0, attempts: 0, failed: 0, promptTokens: 0, completionTokens: 0, promptChars: 0 })

const summary = {
  model: getReportModel(),
  mode: live ? 'live' : 'dry-run',
  ...totals,
  avgPromptChars: Math.round(totals.promptChars / Math.max(1, totals.sections)),
  ...(live ? {
    firstPassRate: totals.sections ? Math.round((results.filter((row) => row.attempts === 1 && row.status === 'complete').length / totals.sections) * 100) : 0,
    completeRate: totals.sections ? Math.round((totals.complete / totals.sections) * 100) : 0,
    avgAttempts: totals.sections ? Math.round((totals.attempts / totals.sections) * 100) / 100 : 0,
    avgPromptTokensPerCall: totals.attempts ? Math.round(totals.promptTokens / totals.attempts) : 0,
    avgCompletionTokensPerCall: totals.attempts ? Math.round(totals.completionTokens / totals.attempts) : 0,
  } : {}),
}
console.log(JSON.stringify({ summary }, null, 2))
writeFileSync(resolve(process.env.REPORT_STORAGE_DIR, `summary-${model ?? 'default'}-${Date.now()}.json`), JSON.stringify({ summary, results }, null, 2))
