import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { analyzeSaju } from '../saju/analyzer.js'
import { prepareConversation } from '../conversation/engine.js'
import { chatWithOpenAI, isOpenAiConfigured } from '../llm/openai-adapter.js'
import { buildTemplateSajuReport } from '../report/report-generator.js'
import { generateReportSectionNow, preGenerateReport, startReportPreGeneration } from '../report/report-queue.js'
import {
  createOrGetReportRecord,
  createReportId,
  getReportRecord,
  toClientReport,
  updateReportChatHistory,
} from '../report/report-store.js'
import type { BirthInput, ConversationTurn, SajuAnalysis, SajuReport, SajuReportContext } from '../types/index.js'
import type { ReportRecord } from '../report/report-store.js'
import { ELEMENT_KO, STEM_KO, BRANCH_KO } from '../saju/analyzer-helpers.js'
import runtimeConfig from '../../data/runtime-config.json' with { type: 'json' }

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = join(__dirname, '../..')
const SAJU_UI = join(ROOT, '사주', '사주')
const SAJU_ROOT = join(ROOT, '사주')
const PORT = Number(process.env.PORT ?? 8790)

const app = express()
app.use(cors())
app.use(express.json())

app.use('/assets', express.static(join(SAJU_UI, 'assets')))
app.use('/css', express.static(join(SAJU_ROOT, 'css')))
app.use('/js', express.static(join(SAJU_ROOT, 'js')))
app.use(express.static(SAJU_UI))
app.use(express.static(SAJU_ROOT))

function parseBirth(body: Record<string, unknown>): BirthInput {
  return {
    year: Number(body.year),
    month: Number(body.month),
    day: Number(body.day),
    hour: Number(body.hour ?? 12),
    minute: Number(body.minute ?? 0),
    gender: (body.gender === 'female' ? 'female' : 'male') as BirthInput['gender'],
    calendar: (body.calendar === 'lunar' ? 'lunar' : 'solar') as BirthInput['calendar'],
    isLeapMonth: Boolean(body.isLeapMonth),
  }
}

function parseReportContext(body: Record<string, unknown>): SajuReportContext {
  const context = (body.context ?? {}) as Record<string, unknown>
  const value = (key: string): string | undefined => {
    const raw = context[key] ?? body[key]
    return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined
  }

  return {
    name: value('name'),
    target: value('target'),
    concern: value('concern'),
    relationship: value('relationship'),
    orientation: value('orientation'),
    work: value('work'),
  }
}

async function toUiAnalysis(birth: BirthInput, context: SajuReportContext = {}) {
  const analysis = analyzeSaju(birth)
  const reportId = createReportId(birth, context)
  const templateReport = buildTemplateSajuReport(analysis, birth, context)
  const { record } = await createOrGetReportRecord({
    reportId,
    birth,
    context,
    templateReport,
  })

  if (record.status !== 'complete') {
    startReportPreGeneration({ reportId, analysis, birth, context })
  }

  return buildUiAnalysisPayload(analysis, birth, toClientReport(record))
}

function buildUiAnalysisPayload(analysis: SajuAnalysis, birth: BirthInput, report: SajuReport) {
  const p = analysis.fourPillars
  return {
    birth,
    pillars: {
      year: { hanja: `${p.year.stem}${p.year.branch}`, ko: `${STEM_KO[p.year.stem]}${BRANCH_KO[p.year.branch]}` },
      month: { hanja: `${p.month.stem}${p.month.branch}`, ko: `${STEM_KO[p.month.stem]}${BRANCH_KO[p.month.branch]}` },
      day: { hanja: `${p.day.stem}${p.day.branch}`, ko: `${STEM_KO[p.day.stem]}${BRANCH_KO[p.day.branch]}` },
      hour: { hanja: `${p.hour.stem}${p.hour.branch}`, ko: `${STEM_KO[p.hour.stem]}${BRANCH_KO[p.hour.branch]}` },
    },
    dayMaster: {
      hanja: analysis.dayMaster,
      ko: STEM_KO[analysis.dayMaster],
      element: ELEMENT_KO[analysis.dayMasterElement],
      strength: analysis.dayMasterStrength,
    },
    elements: analysis.elementCount,
    dominantElement: ELEMENT_KO[analysis.dominantElement],
    weakElement: ELEMENT_KO[analysis.weakElement],
    usefulGod: analysis.usefulGod ? ELEMENT_KO[analysis.usefulGod] : null,
    tenGods: analysis.tenGods,
    fortune: analysis.fortune,
    preview: analysis.preview,
    report,
    summary: analysis.summary,
  }
}

function toUiAnalysisFromRecord(record: ReportRecord) {
  const analysis = analyzeSaju(record.birth)
  return buildUiAnalysisPayload(analysis, record.birth, toClientReport(record))
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, openai: isOpenAiConfigured() })
})

app.post('/api/saju/analyze', async (req, res) => {
  try {
    const birth = parseBirth(req.body)
    const context = parseReportContext(req.body)
    if (!birth.year || !birth.month || !birth.day) {
      res.status(400).json({ error: '생년월일을 입력해 주세요.' })
      return
    }
    res.json(await toUiAnalysis(birth, context))
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '분석 실패' })
  }
})

app.get('/api/report/:reportId', async (req, res) => {
  try {
    const reportId = String(req.params.reportId ?? '').trim()
    const record = await getReportRecord(reportId)
    if (!record) {
      res.status(404).json({ error: '저장된 리포트를 찾지 못했습니다.' })
      return
    }
    const analysis = toUiAnalysisFromRecord(record)
    res.json({
      report: analysis.report,
      birth: record.birth,
      context: record.context,
      analysis,
      chatHistory: record.chatHistory ?? [],
    })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '리포트 조회 실패' })
  }
})

function parseConversationHistory(value: unknown): ConversationTurn[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((turn): turn is ConversationTurn => (
      turn
      && (turn.role === 'user' || turn.role === 'assistant')
      && typeof turn.content === 'string'
      && turn.content.trim().length > 0
    ))
    .map((turn) => ({
      role: turn.role,
      content: turn.content.trim(),
    }))
}

app.post('/api/report/chat-history', async (req, res) => {
  try {
    const reportId = String(req.body.reportId ?? '').trim()
    const history = parseConversationHistory(req.body.history)
    if (!reportId) {
      res.status(400).json({ error: 'reportId가 필요합니다.' })
      return
    }
    const record = await updateReportChatHistory(reportId, history)
    if (!record) {
      res.status(404).json({ error: '저장된 리포트를 찾지 못했습니다.' })
      return
    }
    res.json({
      ok: true,
      reportId,
      savedAt: record.updatedAt,
      chatHistory: record.chatHistory ?? [],
    })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '상담 저장 실패' })
  }
})

app.post('/api/report/section', async (req, res) => {
  try {
    const birth = parseBirth(req.body.birth ?? req.body)
    const context = parseReportContext(req.body)
    const sectionId = String(req.body.sectionId ?? '').trim()
    const reportId = String(req.body.reportId ?? createReportId(birth, context)).trim()

    if (!birth.year || !birth.month || !birth.day) {
      res.status(400).json({ error: '생년월일을 입력해 주세요.' })
      return
    }
    if (!sectionId) {
      res.status(400).json({ error: 'sectionId가 필요합니다.' })
      return
    }

    const analysis = analyzeSaju(birth)
    const templateReport = buildTemplateSajuReport(analysis, birth, context)
    const { record } = await createOrGetReportRecord({
      reportId,
      birth,
      context,
      templateReport,
    })
    const storedSection = record.report.sections.find((section) => section.id === sectionId)

    if (storedSection?.status === 'complete') {
      res.json({
        section: storedSection,
        report: toClientReport(record),
        generatedBy: storedSection.generatedBy ?? 'template',
        model: storedSection.model ?? 'template',
      })
      return
    }

    if (record.status !== 'complete') {
      startReportPreGeneration({ reportId, analysis, birth, context })
    }

    const section = await generateReportSectionNow({ reportId, analysis, birth, context, sectionId })
    const latest = await getReportRecord(reportId)
    res.json({
      section,
      report: latest ? toClientReport(latest) : undefined,
      generatedBy: section.generatedBy ?? (isOpenAiConfigured() ? 'openai' : 'template'),
      model: section.model ?? 'template',
    })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '리포트 생성 실패' })
  }
})

app.post('/api/report/prewarm', async (req, res) => {
  try {
    const birth = parseBirth(req.body.birth ?? req.body)
    const context = parseReportContext(req.body)
    const reportId = String(req.body.reportId ?? createReportId(birth, context)).trim()

    if (!birth.year || !birth.month || !birth.day) {
      res.status(400).json({ error: '생년월일을 입력해 주세요.' })
      return
    }

    const analysis = analyzeSaju(birth)
    const templateReport = buildTemplateSajuReport(analysis, birth, context)
    await createOrGetReportRecord({
      reportId,
      birth,
      context,
      templateReport,
    })

    const record = await preGenerateReport({ reportId, analysis, birth, context })
    if (!record) {
      res.status(404).json({ error: '리포트 사전 생성 대상을 찾지 못했습니다.' })
      return
    }

    res.json({ report: toClientReport(record) })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '리포트 사전 생성 실패' })
  }
})

app.post('/api/chat', async (req, res) => {
  try {
    const birth = parseBirth(req.body.birth ?? req.body)
    const message = String(req.body.message ?? '').trim()
    const history = (req.body.history ?? []) as ConversationTurn[]

    if (!message) {
      res.status(400).json({ error: '메시지를 입력해 주세요.' })
      return
    }

    if (!isOpenAiConfigured()) {
      res.status(503).json({ error: 'OPENAI_API_KEY가 설정되지 않았습니다. .env 파일에 API 키를 추가하세요.' })
      return
    }

    const prepared = prepareConversation({ birth, message, history })
    const reply = await chatWithOpenAI(prepared.messages, {
      maxTokens: runtimeConfig.conversation?.maxTokens ?? 1800,
    })

    res.json({
      reply,
      intent: prepared.intent,
      sajuSummary: prepared.sajuAnalysis.summary,
    })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '상담 실패' })
  }
})

app.get('/chat.html', (_req, res) => {
  res.sendFile(join(SAJU_ROOT, 'chat.html'))
})

app.get('/result.html', (_req, res) => {
  res.sendFile(join(SAJU_ROOT, 'result.html'))
})

app.get('/', (_req, res) => {
  res.sendFile(join(SAJU_UI, 'index.html'))
})

export default app

const isDirectRun = process.argv[1] ? resolve(process.argv[1]) === resolve(__filename) : false

if (isDirectRun) {
  app.listen(PORT, () => {
    console.log(`천명대공(天命大公) 서버: http://localhost:${PORT}`)
    console.log(`사주 입력: http://localhost:${PORT}/index.html`)
    console.log(`OpenAI: ${isOpenAiConfigured() ? '연결됨' : 'API 키 필요 (.env)'}`)
  })
}
