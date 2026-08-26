import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { analyzeSaju } from '../saju/analyzer.js'
import { prepareConversation } from '../conversation/engine.js'
import { chatWithOpenAI, isOpenAiConfigured } from '../llm/openai-adapter.js'
import type { BirthInput, ConversationTurn } from '../types/index.js'
import { ELEMENT_KO, STEM_KO, BRANCH_KO } from '../saju/analyzer-helpers.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
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

function toUiAnalysis(birth: BirthInput) {
  const analysis = analyzeSaju(birth)
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
    summary: analysis.summary,
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, openai: isOpenAiConfigured() })
})

app.post('/api/saju/analyze', (req, res) => {
  try {
    const birth = parseBirth(req.body)
    if (!birth.year || !birth.month || !birth.day) {
      res.status(400).json({ error: '생년월일을 입력해 주세요.' })
      return
    }
    res.json(toUiAnalysis(birth))
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '분석 실패' })
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
    const reply = await chatWithOpenAI(prepared.messages)

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

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`천기 선생님 서버: http://localhost:${PORT}`)
    console.log(`사주 입력: http://localhost:${PORT}/index.html`)
    console.log(`OpenAI: ${isOpenAiConfigured() ? '연결됨' : 'API 키 필요 (.env)'}`)
  })
}
