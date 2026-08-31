import '../env/load.js'
import express from 'express'
import cors from 'cors'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Request, Response } from 'express'
import { analyzeSaju } from '../saju/analyzer.js'
import { prepareConversation } from '../conversation/engine.js'
import { chatWithOpenAI, isOpenAiConfigured } from '../llm/openai-adapter.js'
import { buildTemplateSajuReport } from '../report/report-generator.js'
import { generateReportSectionNow, preGenerateReport, startReportPreGeneration } from '../report/report-queue.js'
import { buildTodayFortune } from '../saju/today-fortune.js'
import {
  createOrGetReportRecord,
  createReportId,
  getReportRecord,
  toClientReport,
  updateReportChatHistory,
} from '../report/report-store.js'
import type { BirthInput, ConversationTurn, SajuAnalysis, SajuReport, SajuReportContext } from '../types/index.js'
import type { ReportOwner, ReportRecord } from '../report/report-store.js'
import {
  buildUserBirthProfile,
  getUserBirthProfile,
  getUserProfileStorageMode,
  saveUserBirthProfile,
} from '../user/profile-store.js'
import type { UserBirthProfile } from '../user/profile-store.js'
import { ELEMENT_KO, STEM_KO, BRANCH_KO } from '../saju/analyzer-helpers.js'
import runtimeConfig from '../../data/runtime-config.json' with { type: 'json' }

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = join(__dirname, '../..')
const SAJU_UI = join(ROOT, '사주', '사주')
const SAJU_ROOT = join(ROOT, '사주')
const PORTAL_PAGE = join(SAJU_ROOT, 'portal.html')
const PORT = Number(process.env.PORT ?? 8790)
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? ''
const SUPABASE_PUBLIC_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY
  ?? process.env.SUPABASE_ANON_KEY
  ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ?? process.env.VITE_SUPABASE_ANON_KEY
  ?? ''
const envValue = (value: string | undefined, fallback: string): string => value?.trim() || fallback
const SUPABASE_GOOGLE_PROVIDER = envValue(process.env.SUPABASE_GOOGLE_PROVIDER, 'google')
const SUPABASE_KAKAO_PROVIDER = envValue(process.env.SUPABASE_KAKAO_PROVIDER, 'kakao')
const SUPABASE_NAVER_PROVIDER = envValue(process.env.SUPABASE_NAVER_PROVIDER, 'custom:naver')

const app = express()
app.use(cors())
app.use(express.json())

function redirectToCmdg(req: Request, res: Response) {
  const queryIndex = req.originalUrl.indexOf('?')
  const query = queryIndex >= 0 ? req.originalUrl.slice(queryIndex) : ''
  res.redirect(308, `/cmdg/${query}`)
}

app.get(['/', '/index.html'], (_req, res) => {
  res.sendFile(PORTAL_PAGE)
})
app.get(/^\/cmdg$/, redirectToCmdg)
app.get(['/cmdg/', '/cmdg/index.html'], (_req, res) => {
  res.sendFile(join(SAJU_UI, 'index.html'))
})
app.get(['/signup', '/signup/', '/signup.html'], (_req, res) => {
  res.sendFile(join(SAJU_UI, 'index.html'))
})
app.get(['/cmdg/chat.html', '/cmdg/chat'], (_req, res) => {
  res.sendFile(join(SAJU_ROOT, 'chat.html'))
})
app.get(['/cmdg/result.html', '/cmdg/result'], (_req, res) => {
  res.sendFile(join(SAJU_ROOT, 'result.html'))
})

app.use('/assets', express.static(join(SAJU_UI, 'assets')))
app.use('/css', express.static(join(SAJU_ROOT, 'css')))
app.use('/js', express.static(join(SAJU_ROOT, 'js')))
app.use('/cmdg/assets', express.static(join(SAJU_UI, 'assets')))
app.use('/cmdg/css', express.static(join(SAJU_ROOT, 'css')))
app.use('/cmdg/js', express.static(join(SAJU_ROOT, 'js')))
app.use(express.static(SAJU_UI, { index: false }))
app.use(express.static(SAJU_ROOT, { index: false }))

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

function authConfig() {
  const callbackUrl = SUPABASE_URL ? `${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/callback` : ''

  return {
    enabled: Boolean(SUPABASE_URL && SUPABASE_PUBLIC_KEY),
    url: SUPABASE_URL,
    callbackUrl,
    publishableKey: SUPABASE_PUBLIC_KEY,
    providers: {
      google: SUPABASE_GOOGLE_PROVIDER,
      kakao: SUPABASE_KAKAO_PROVIDER,
      naver: SUPABASE_NAVER_PROVIDER,
    },
  }
}

function bearerToken(req: Request): string {
  const header = req.header('authorization') ?? ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() ?? ''
}

async function verifySupabaseUser(req: Request): Promise<ReportOwner | undefined> {
  const token = bearerToken(req)
  if (!token) return undefined
  if (!SUPABASE_URL || !SUPABASE_PUBLIC_KEY) {
    throw new Error('Supabase 인증 설정이 필요합니다.')
  }

  const response = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_PUBLIC_KEY,
      authorization: `Bearer ${token}`,
    },
  })
  if (!response.ok) {
    throw new Error('회원 인증을 다시 진행해 주세요.')
  }

  const data = await response.json() as {
    id?: string
    email?: string
    app_metadata?: { provider?: string }
    identities?: Array<{ provider?: string }>
  }
  if (!data.id) throw new Error('회원 식별값을 확인하지 못했습니다.')
  return {
    id: data.id,
    email: data.email,
    provider: data.app_metadata?.provider ?? data.identities?.[0]?.provider,
    accessToken: token,
  }
}

async function requireSupabaseUser(req: Request, res: Response): Promise<ReportOwner | null> {
  try {
    const owner = await verifySupabaseUser(req)
    if (owner) return owner
  } catch (err) {
    res.status(401).json({ error: err instanceof Error ? err.message : '회원 인증을 다시 진행해 주세요.' })
    return null
  }
  res.status(401).json({ error: '회원가입 후 이용해 주세요.' })
  return null
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function trimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function validDateParts(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day
}

function parseUserProfileRequest(body: Record<string, unknown>, owner: ReportOwner): UserBirthProfile {
  const birthBody = asObject(body.birth)
  const source = Object.keys(birthBody).length ? birthBody : body
  const name = trimmedString(body.name ?? birthBody.name)
  const year = Number(source.year)
  const month = Number(source.month)
  const day = Number(source.day)
  const birthTimeKnown = body.birthTimeKnown !== false
  const hour = Number(source.hour ?? (birthTimeKnown ? Number.NaN : 12))
  const minute = Number(source.minute ?? 0)
  const gender = source.gender
  const calendar = source.calendar

  if (!/^[가-힣]{2,20}$/.test(name)) {
    throw new Error('이름은 한글 2자 이상 20자 이하로 입력해 주세요.')
  }
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day) || !validDateParts(year, month, day)) {
    throw new Error('생년월일을 다시 확인해 주세요.')
  }
  if (year < 1900 || year > new Date().getFullYear()) {
    throw new Error('생년월일의 연도를 다시 확인해 주세요.')
  }
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) {
    throw new Error('태어난 시간은 00:00부터 23:59 사이로 입력해 주세요.')
  }
  if (gender !== 'male' && gender !== 'female') {
    throw new Error('성별을 선택해 주세요.')
  }
  if (calendar !== 'solar' && calendar !== 'lunar') {
    throw new Error('양력 또는 음력을 선택해 주세요.')
  }

  const context = asObject(body.context)
  return buildUserBirthProfile({
    owner,
    name,
    birth: {
      year,
      month,
      day,
      hour,
      minute,
      gender,
      calendar,
      isLeapMonth: Boolean(source.isLeapMonth),
    },
    birthTimeKnown,
    context: {
      target: trimmedString(context.target),
      relationship: trimmedString(context.relationship),
      orientation: trimmedString(context.orientation),
      work: trimmedString(context.work),
    },
  })
}

function userProfilePayload(profile: UserBirthProfile | null) {
  return {
    profile,
    complete: Boolean(profile?.name && profile.birth.year && profile.birth.month && profile.birth.day),
    storage: getUserProfileStorageMode(),
  }
}

async function toUiAnalysis(birth: BirthInput, context: SajuReportContext = {}, owner?: ReportOwner) {
  const analysis = analyzeSaju(birth)
  const reportId = createReportId(birth, context, undefined, owner?.id)
  const templateReport = buildTemplateSajuReport(analysis, birth, context)
  const { record } = await createOrGetReportRecord({
    reportId,
    birth,
    context,
    templateReport,
    owner,
  })

  if (record.status !== 'complete') {
    startReportPreGeneration({ reportId, analysis, birth, context, owner })
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

app.get('/api/auth/config', (_req, res) => {
  res.json(authConfig())
})

app.get('/api/user/profile', async (req, res) => {
  try {
    const owner = await requireSupabaseUser(req, res)
    if (!owner) return
    const profile = await getUserBirthProfile(owner)
    res.json(userProfilePayload(profile))
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '사주 프로필 조회 실패' })
  }
})

async function saveUserProfileHandler(req: Request, res: Response) {
  try {
    const owner = await requireSupabaseUser(req, res)
    if (!owner) return
    const profile = parseUserProfileRequest(req.body, owner)
    const saved = await saveUserBirthProfile(profile, owner)
    res.json(userProfilePayload(saved))
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : '사주 프로필 저장 실패' })
  }
}

app.post('/api/user/profile', saveUserProfileHandler)
app.put('/api/user/profile', saveUserProfileHandler)

app.post('/api/today/fortune', async (req, res) => {
  try {
    const owner = await requireSupabaseUser(req, res)
    if (!owner) return
    const profile = await getUserBirthProfile(owner)
    if (!profile) {
      res.status(409).json({ code: 'PROFILE_REQUIRED', error: '오늘의 운세를 보려면 기본 사주 정보를 먼저 입력해 주세요.' })
      return
    }
    res.json({
      todayFortune: buildTodayFortune(profile),
      ...userProfilePayload(profile),
    })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '오늘의 운세 생성 실패' })
  }
})

app.post('/api/saju/analyze', async (req, res) => {
  try {
    const birth = parseBirth(req.body)
    const context = parseReportContext(req.body)
    if (!birth.year || !birth.month || !birth.day) {
      res.status(400).json({ error: '생년월일을 입력해 주세요.' })
      return
    }
    const owner = await verifySupabaseUser(req)
    if (authConfig().enabled && !owner) {
      res.status(401).json({ error: '회원가입 후 해석을 시작해 주세요.' })
      return
    }
    res.json(await toUiAnalysis(birth, context, owner))
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '분석 실패' })
  }
})

app.get('/api/report/:reportId', async (req, res) => {
  try {
    const reportId = String(req.params.reportId ?? '').trim()
    const owner = await verifySupabaseUser(req)
    const record = await getReportRecord(reportId, owner?.accessToken)
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
    const owner = await verifySupabaseUser(req)
    const record = await updateReportChatHistory(reportId, history, owner)
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
    const owner = await verifySupabaseUser(req)
    const reportId = String(req.body.reportId ?? createReportId(birth, context, undefined, owner?.id)).trim()

    if (!birth.year || !birth.month || !birth.day) {
      res.status(400).json({ error: '생년월일을 입력해 주세요.' })
      return
    }
    if (!sectionId) {
      res.status(400).json({ error: 'sectionId가 필요합니다.' })
      return
    }
    if (authConfig().enabled && !owner) {
      res.status(401).json({ error: '회원가입 후 리포트를 이어서 볼 수 있습니다.' })
      return
    }

    const analysis = analyzeSaju(birth)
    const templateReport = buildTemplateSajuReport(analysis, birth, context)
    const { record } = await createOrGetReportRecord({
      reportId,
      birth,
      context,
      templateReport,
      owner,
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
      startReportPreGeneration({ reportId, analysis, birth, context, owner })
    }

    const section = await generateReportSectionNow({ reportId, analysis, birth, context, sectionId, owner })
    const latest = await getReportRecord(reportId, owner?.accessToken)
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
    const owner = await verifySupabaseUser(req)
    const reportId = String(req.body.reportId ?? createReportId(birth, context, undefined, owner?.id)).trim()

    if (!birth.year || !birth.month || !birth.day) {
      res.status(400).json({ error: '생년월일을 입력해 주세요.' })
      return
    }
    if (authConfig().enabled && !owner) {
      res.status(401).json({ error: '회원가입 후 리포트를 생성할 수 있습니다.' })
      return
    }

    const analysis = analyzeSaju(birth)
    const templateReport = buildTemplateSajuReport(analysis, birth, context)
    await createOrGetReportRecord({
      reportId,
      birth,
      context,
      templateReport,
      owner,
    })

    const record = await preGenerateReport({ reportId, analysis, birth, context, owner })
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

export default app

const isDirectRun = process.argv[1] ? resolve(process.argv[1]) === resolve(__filename) : false

if (isDirectRun) {
  app.listen(PORT, () => {
    console.log(`천명대공(天命大公) 서버: http://localhost:${PORT}`)
    console.log(`UMSH 포탈: http://localhost:${PORT}/`)
    console.log(`천명대공 입력: http://localhost:${PORT}/cmdg/`)
    console.log(`OpenAI: ${isOpenAiConfigured() ? '연결됨' : 'API 키 필요 (.env)'}`)
  })
}
