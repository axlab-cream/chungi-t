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
import { beginSpecializedProgressiveReport } from '../report/specialized-progressive.js'
import { generateReportSectionNow, preGenerateReport, startReportPreGeneration } from '../report/report-queue.js'
import { buildTodayFortune } from '../saju/today-fortune.js'
import {
  createOrGetReportRecord,
  createReportId,
  deleteReportRecord,
  getReportStorageMode,
  getReportByPublicId,
  getReportRecord,
  listReportRecords,
  toClientReport,
  updateReportChatHistory,
} from '../report/report-store.js'
import type { BirthInput, ConversationTurn, SajuAnalysis, SajuReport, SajuReportContext } from '../types/index.js'
import type { ReportOwner, ReportRecord } from '../report/report-store.js'
import { isAdminOwner } from '../auth/admin.js'
import {
  buildUserBirthProfile,
  deleteUserBirthProfile,
  getUserBirthProfile,
  getUserProfileStorageMode,
  saveUserBirthProfile,
} from '../user/profile-store.js'
import type { UserBirthProfile } from '../user/profile-store.js'
import { getPaymentProduct, listPaymentProducts, publicPaymentProduct } from '../payment/catalog.js'
import { createInicisPaymentFields, createPaymentOrderId, approveInicisPayment, publicInicisConfig } from '../payment/inicis.js'
import { isPaymentTestMode } from '../payment/test-mode.js'
import {
  getPaymentOrder,
  getPaymentStorageMode,
  listPaymentOrders,
  savePaymentOrder,
  updatePaymentOrder,
} from '../payment/order-store.js'
import type { PaymentOrder } from '../payment/order-store.js'
import { ELEMENT_KO, STEM_KO, BRANCH_KO } from '../saju/analyzer-helpers.js'
import {
  buildHomePungsuContext,
  buildHomePungsuReport,
  createHomePungsuReportId,
  parseHomePungsuRequest,
} from '../pungsu/home-service.js'
import {
  buildWorkMoveContext,
  buildWorkMoveReport,
  createWorkMoveReportId,
  parseWorkMoveRequest,
} from '../work/move-service.js'
import {
  buildWorkJobContext,
  buildWorkJobReport,
  createWorkJobReportId,
  parseWorkJobRequest,
} from '../work/job-service.js'
import {
  buildMoneySaveContext,
  buildMoneySaveReport,
  createMoneySaveReportId,
  parseMoneySaveRequest,
} from '../money/save-service.js'
import {
  buildMarryMatchContext,
  buildMarryMatchReport,
  createMarryMatchReportId,
  parseMarryMatchRequest,
} from '../match/marry-service.js'
import {
  buildCoupleMatchContext,
  buildCoupleMatchReport,
  createCoupleMatchReportId,
  parseCoupleMatchRequest,
} from '../match/couple-service.js'
import {
  buildLoveMindContext,
  buildLoveMindReport,
  createLoveMindReportId,
  parseLoveMindRequest,
} from '../love/mind-service.js'
import {
  buildLoveAgainContext,
  buildLoveAgainReport,
  createLoveAgainReportId,
  parseLoveAgainRequest,
} from '../love/again-service.js'
import {
  buildLoveSpouseContext,
  buildLoveSpouseReport,
  createLoveSpouseReportId,
  parseLoveSpouseRequest,
} from '../love/spouse-service.js'
import runtimeConfig from '../../data/runtime-config.json' with { type: 'json' }

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = join(__dirname, '../..')
const SAJU_UI = join(ROOT, '사주', '사주')
const SAJU_ROOT = join(ROOT, '사주')
const PORTAL_PAGE = join(SAJU_ROOT, 'portal.html')
const DESTINY_PAGE = join(SAJU_ROOT, 'destiny.html')
const TERMS_PAGE = join(SAJU_ROOT, 'terms.html')
const PRIVACY_PAGE = join(SAJU_ROOT, 'privacy.html')
const REFUND_PAGE = join(SAJU_ROOT, 'refund.html')
const SUPPORT_PAGE = join(SAJU_ROOT, 'support.html')
const PAYMENT_PAGE = join(SAJU_ROOT, 'payment', 'index.html')
const PAYMENT_RESULT_PAGE = join(SAJU_ROOT, 'payment', 'result.html')
const PAYMENT_CLOSE_PAGE = join(SAJU_ROOT, 'payment', 'close.html')
const PAYMENT_TEST_PAGE = join(SAJU_ROOT, 'payment', 'test.html')
const PAYMENT_ORDERS_PAGE = join(SAJU_ROOT, 'orders.html')
const LEAVE_PAGE = join(SAJU_ROOT, 'leave.html')
const MY_PAGE = join(SAJU_ROOT, 'my.html')
const PROFILE_PAGE = join(SAJU_ROOT, 'profile.html')
const REFUNDS_PAGE = join(SAJU_ROOT, 'refunds.html')
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
app.use(express.urlencoded({ extended: false }))

function specializedAnalyzeResponse(
  progressive: Awaited<ReturnType<typeof beginSpecializedProgressiveReport>>,
  birth: BirthInput,
  context: SajuReportContext,
  profile: UserBirthProfile,
) {
  return {
    report: progressive.report,
    reportId: progressive.reportId,
    publicId: progressive.publicId,
    publicUrl: progressive.publicId ? `/r/${progressive.publicId}` : undefined,
    cached: progressive.cached,
    resumed: progressive.resumed,
    birth,
    context,
    profile,
    storage: getReportStorageMode(),
  }
}

function redirectToCmdg(req: Request, res: Response) {
  const queryIndex = req.originalUrl.indexOf('?')
  const query = queryIndex >= 0 ? req.originalUrl.slice(queryIndex) : ''
  res.redirect(308, `/cmdg/${query}`)
}

app.get(['/', '/index.html'], (_req, res) => {
  res.sendFile(PORTAL_PAGE)
})
app.get(['/destiny', '/destiny/', '/destiny.html'], (_req, res) => {
  res.sendFile(DESTINY_PAGE)
})
app.get(['/terms', '/terms/', '/terms.html'], (_req, res) => {
  res.sendFile(TERMS_PAGE)
})
app.get(['/privacy', '/privacy/', '/privacy.html'], (_req, res) => {
  res.sendFile(PRIVACY_PAGE)
})
app.get(['/refund', '/refund/', '/refund.html'], (_req, res) => {
  res.sendFile(REFUND_PAGE)
})
app.get(['/support', '/support/', '/support.html'], (_req, res) => {
  res.sendFile(SUPPORT_PAGE)
})
app.get(['/payment', '/payment/', '/payment/index.html'], (_req, res) => {
  res.sendFile(PAYMENT_PAGE)
})
app.get(['/payment/result', '/payment/result/', '/payment/result.html'], (_req, res) => {
  res.sendFile(PAYMENT_RESULT_PAGE)
})
app.get(['/payment/close', '/payment/close/', '/payment/close.html'], (_req, res) => {
  res.sendFile(PAYMENT_CLOSE_PAGE)
})
app.get(['/payment/test', '/payment/test/', '/payment/test.html'], (_req, res) => {
  res.sendFile(PAYMENT_TEST_PAGE)
})
app.get(['/orders', '/orders/', '/orders.html'], (_req, res) => {
  res.sendFile(PAYMENT_ORDERS_PAGE)
})
app.get(['/leave', '/leave/', '/leave.html'], (_req, res) => {
  res.sendFile(LEAVE_PAGE)
})
app.get(['/my', '/my/', '/my.html'], (_req, res) => {
  res.sendFile(MY_PAGE)
})
app.get(['/profile', '/profile/', '/profile.html'], (_req, res) => {
  res.sendFile(PROFILE_PAGE)
})
app.get(['/refunds', '/refunds/', '/refunds.html'], (_req, res) => {
  res.sendFile(REFUNDS_PAGE)
})
app.get(['/r/:publicId', '/r/:publicId/'], (_req, res) => {
  res.sendFile(join(SAJU_ROOT, 'report-view.html'))
})
app.get('/api/r/:publicId', async (req, res) => {
  try {
    const owner = await requireSupabaseUser(req, res)
    if (!owner) return
    const publicId = String(req.params.publicId ?? '').trim()
    const record = await getReportByPublicId(publicId, owner.accessToken)
    if (!record || (record.owner?.id && record.owner.id !== owner.id)) {
      res.status(404).json({ error: '저장된 해석을 찾지 못했습니다.' })
      return
    }
    res.json({
      report: toClientReport(record),
      reportId: record.reportId,
      publicId: record.publicId,
      publicUrl: `/r/${record.publicId}`,
      birth: record.birth,
      context: record.context,
      chatHistory: record.chatHistory ?? [],
      storage: getReportStorageMode(),
    })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '공개 리포트 조회 실패' })
  }
})
app.get(['/love/this-year', '/love/this-year/', '/love/this-year.html'], (_req, res) => {
  res.sendFile(join(SAJU_UI, 'index.html'))
})
app.get(['/love/mind', '/love/mind/', '/love/mind/index.html'], (_req, res) => {
  res.sendFile(join(SAJU_ROOT, 'love', 'mind', 'index.html'))
})
app.get(['/love/again', '/love/again/', '/love/again/index.html'], (_req, res) => {
  res.sendFile(join(SAJU_ROOT, 'love', 'again', 'index.html'))
})
app.get(['/love/spouse', '/love/spouse/', '/love/spouse/index.html'], (_req, res) => {
  res.sendFile(join(SAJU_ROOT, 'love', 'spouse', 'index.html'))
})
app.get(['/place/home', '/place/home/', '/place/home/index.html'], (_req, res) => {
  res.sendFile(join(SAJU_ROOT, 'place', 'home', 'index.html'))
})
app.get(['/money/save', '/money/save/', '/money/save/index.html'], (_req, res) => {
  res.sendFile(join(SAJU_ROOT, 'money', 'save', 'index.html'))
})
app.get(['/work/move', '/work/move/', '/work/move/index.html'], (_req, res) => {
  res.sendFile(join(SAJU_ROOT, 'work', 'move', 'index.html'))
})
app.get(['/work/job', '/work/job/', '/work/job/index.html'], (_req, res) => {
  res.sendFile(join(SAJU_ROOT, 'work', 'job', 'index.html'))
})
app.get(['/match/marry', '/match/marry/', '/match/marry/index.html'], (_req, res) => {
  res.sendFile(join(SAJU_ROOT, 'match', 'marry', 'index.html'))
})
app.get(['/match/couple', '/match/couple/', '/match/couple/index.html'], (_req, res) => {
  res.sendFile(join(SAJU_ROOT, 'match', 'couple', 'index.html'))
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
app.use('/love/assets', express.static(join(SAJU_UI, 'assets')))
app.use('/love/this-year/assets', express.static(join(SAJU_UI, 'assets')))
app.use('/love/mind/assets', express.static(join(SAJU_UI, 'assets')))
app.use('/love/again/assets', express.static(join(SAJU_UI, 'assets')))
app.use('/love/spouse/assets', express.static(join(SAJU_UI, 'assets')))
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

function parseOptionalPartnerContext(source: unknown): SajuReportContext['partner'] | undefined {
  const partner = source && typeof source === 'object' && !Array.isArray(source)
    ? source as Record<string, unknown>
    : {}
  const mode = typeof partner.mode === 'string' && partner.mode.trim() === 'known' ? 'known' : 'none'
  const name = trimmedString(partner.name).slice(0, 20)
  const relationship = trimmedString(partner.relationship).slice(0, 40)

  if (mode !== 'known') {
    return { mode: 'none', ...(relationship ? { relationship } : {}) }
  }

  const birthSource = asObject(partner.birth)
  const year = Number(birthSource.year ?? partner.year)
  const month = Number(birthSource.month ?? partner.month)
  const day = Number(birthSource.day ?? partner.day)
  const birthTimeKnown = partner.birthTimeKnown === true
  const hour = Number(birthSource.hour ?? partner.hour ?? (birthTimeKnown ? Number.NaN : 12))
  const minute = Number(birthSource.minute ?? partner.minute ?? 0)
  const gender = birthSource.gender ?? partner.gender
  const calendar = birthSource.calendar ?? partner.calendar

  if (!validDateParts(year, month, day)) {
    return { mode: 'none', ...(name ? { name } : {}), ...(relationship ? { relationship } : {}) }
  }
  if (gender !== 'male' && gender !== 'female') {
    return { mode: 'none', ...(name ? { name } : {}), ...(relationship ? { relationship } : {}) }
  }
  if (calendar !== 'solar' && calendar !== 'lunar') {
    return { mode: 'none', ...(name ? { name } : {}), ...(relationship ? { relationship } : {}) }
  }
  if (birthTimeKnown && (!Number.isFinite(hour) || !Number.isFinite(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59)) {
    return { mode: 'none', ...(name ? { name } : {}), ...(relationship ? { relationship } : {}) }
  }

  return {
    mode: 'known',
    ...(name ? { name } : {}),
    ...(relationship ? { relationship } : {}),
    birthTimeKnown,
    birth: {
      year,
      month,
      day,
      hour: birthTimeKnown ? hour : 12,
      minute: Number.isFinite(minute) ? minute : 0,
      gender: gender as BirthInput['gender'],
      calendar: calendar as BirthInput['calendar'],
    },
  }
}

function enrichReportContext(context: SajuReportContext): SajuReportContext {
  if (context.serviceKey !== 'love_this_year' || context.partner?.mode !== 'known' || !context.partner.birth) {
    return context
  }

  const partnerAnalysis = analyzeSaju(context.partner.birth)
  const p = partnerAnalysis.fourPillars

  return {
    ...context,
    partner: {
      ...context.partner,
      pillars: {
        year: `${p.year.stem}${p.year.branch}`,
        month: `${p.month.stem}${p.month.branch}`,
        day: `${p.day.stem}${p.day.branch}`,
        hour: `${p.hour.stem}${p.hour.branch}`,
      },
      dayMaster: `${STEM_KO[partnerAnalysis.dayMaster]}(${partnerAnalysis.dayMaster})`,
      dayMasterElement: ELEMENT_KO[partnerAnalysis.dayMasterElement],
      dominantElement: ELEMENT_KO[partnerAnalysis.dominantElement],
      weakElement: ELEMENT_KO[partnerAnalysis.weakElement],
      tenGods: partnerAnalysis.tenGods,
    },
  }
}

function parseReportContext(body: Record<string, unknown>): SajuReportContext {
  const context = (body.context ?? {}) as Record<string, unknown>
  const value = (key: string): string | undefined => {
    const raw = context[key] ?? body[key]
    return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined
  }
  const rawServiceKey = context.serviceKey ?? context.service_key ?? body.serviceKey ?? body.service_key
  const serviceKey = typeof rawServiceKey === 'string' && rawServiceKey.trim() === 'love_this_year'
    ? 'love_this_year'
    : undefined

  const birthTimeKnown = body.birthTimeKnown === false ? false : undefined
  const partner = serviceKey ? parseOptionalPartnerContext(context.partner ?? body.partner) : undefined

  return {
    serviceKey,
    name: value('name'),
    target: value('target'),
    concern: value('concern'),
    relationship: value('relationship'),
    orientation: value('orientation'),
    work: value('work'),
    ...(partner ? { partner } : {}),
    ...(birthTimeKnown === false ? { birthTimeKnown } : {}),
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

function isValidProfileName(value: string): boolean {
  return /^[가-힣]{2,20}$/.test(value)
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

  if (!isValidProfileName(name)) {
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
  const enrichedContext = enrichReportContext(context)
  const reportId = createReportId(birth, enrichedContext, undefined, owner?.id)
  const templateReport = buildTemplateSajuReport(analysis, birth, enrichedContext)
  const { record } = await createOrGetReportRecord({
    reportId,
    birth,
    context: enrichedContext,
    templateReport,
    owner,
  })

  // Do not kick off full OpenAI pregen inside the analyze request.
  // On Vercel it can keep the isolate busy and make the client appear stuck on #loading.
  // Sections generate on demand via /api/report/section (and optional prewarm).

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

function parseListLimit(value: unknown, fallback = 50): number {
  const numeric = Number(Array.isArray(value) ? value[0] : value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(Math.max(Math.trunc(numeric), 1), 100)
}

function padNumber(value: number | undefined): string {
  return String(Number(value ?? 0)).padStart(2, '0')
}

function birthStateFromRecord(record: ReportRecord) {
  const birth = record.birth
  const context = record.context ?? {}
  const birthTimeKnown = context.birthTimeKnown !== false && Number.isFinite(Number(birth.hour))
  return {
    target: context.target || '본인',
    calendar: birth.calendar === 'lunar' ? '음력' : '양력',
    birth: `${birth.year}.${padNumber(birth.month)}.${padNumber(birth.day)}`,
    gender: birth.gender === 'female' ? '여자' : '남자',
    time: birthTimeKnown ? `${padNumber(birth.hour)}:${padNumber(birth.minute)}` : '모름',
    birthTimeKnown,
    name: context.name || '',
    serviceKey: context.serviceKey || '',
    ...(context.serviceKey === 'love_this_year' ? { partner: context.partner || { mode: 'none' } } : {}),
    orientation: context.orientation || '',
    relationship: context.relationship || '',
    work: context.work || '',
    concern: context.concern || '',
  }
}

function historyEntryFromRecord(record: ReportRecord) {
  const analysis = toUiAnalysisFromRecord(record)
  const birthState = birthStateFromRecord(record)
  const savedAt = record.updatedAt || record.createdAt || new Date().toISOString()

  return {
    reportId: record.reportId,
    savedAt,
    title: `${birthState.name || birthState.target || '자네'} · ${birthState.calendar} ${birthState.birth}`,
    birth: record.birth,
    birthState,
    context: record.context,
    analysis,
    progress: analysis.report?.progress,
    storage: analysis.report?.storage,
    corpusFingerprint: analysis.report?.corpus?.fingerprint,
    chatHistory: record.chatHistory ?? [],
    initialConcern: record.context?.concern || '',
  }
}

function paymentConfigPayload() {
  const inicis = publicInicisConfig()
  const storage = getPaymentStorageMode()
  const enabled = inicis.enabled && storage !== 'memory'
  const testMode = isPaymentTestMode()
  return {
    ...inicis,
    configured: inicis.enabled,
    enabled,
    checkoutEnabled: enabled || testMode,
    testMode,
    storage,
    catalog: listPaymentProducts().map(publicPaymentProduct),
    setupMessage: enabled || testMode
      ? ''
      : '결제 모듈 연결 전입니다. 운영자는 이니시스 MID, SignKey, 결제 주문 저장소를 설정해 주세요.',
  }
}

function clientPaymentOrder(order: PaymentOrder) {
  return {
    orderId: order.orderId,
    productKey: order.productKey,
    productTitle: order.productTitle,
    amount: order.amount,
    status: order.status,
    tid: order.tid,
    payMethod: order.payMethod,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  }
}

function paymentOrderRedirect(orderId: string, state: 'paid' | 'failed' | 'cancelled', message?: string, productKey?: string): string {
  const params = new URLSearchParams({ orderId, state })
  if (message) params.set('message', message.slice(0, 180))
  if (productKey) params.set('product', productKey)
  return `/payment/result?${params.toString()}`
}

async function ensurePaidServiceAccess(
  req: Request,
  res: Response,
  owner: ReportOwner,
  productKey: string,
): Promise<boolean> {
  if (isAdminOwner(owner)) return true
  const config = paymentConfigPayload()
  if (!config.configured && !config.testMode) return true
  if (!config.checkoutEnabled) {
    res.status(503).json({ code: 'PAYMENT_NOT_CONFIGURED', error: config.setupMessage })
    return false
  }
  const orderId = trimmedString(req.body?.orderId)
  if (!orderId) {
    const product = getPaymentProduct(productKey)
    res.status(402).json({
      code: 'PAYMENT_REQUIRED',
      error: '결제 후 풀이를 열 수 있습니다.',
      productKey,
      paymentUrl: `/payment?product=${encodeURIComponent(productKey)}&returnTo=${encodeURIComponent(product?.returnPath || '/')}`,
    })
    return false
  }
  const order = await getPaymentOrder(orderId)
  if (!order || order.ownerId !== owner.id || order.productKey !== productKey) {
    res.status(403).json({ code: 'PAYMENT_INVALID', error: '이 상품의 결제 주문을 확인하지 못했습니다.' })
    return false
  }
  if (order.status !== 'paid' && order.status !== 'viewed') {
    res.status(402).json({ code: 'PAYMENT_REQUIRED', error: '결제가 완료된 주문만 풀이를 열 수 있습니다.', productKey })
    return false
  }
  return true
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, openai: isOpenAiConfigured() })
})

app.get('/api/auth/config', (_req, res) => {
  res.json(authConfig())
})

app.get('/api/payment/config', (_req, res) => {
  res.json(paymentConfigPayload())
})

app.post('/api/payment/orders', async (req, res) => {
  try {
    const owner = await requireSupabaseUser(req, res)
    if (!owner) return
    const config = paymentConfigPayload()
    if (!config.checkoutEnabled) {
      res.status(503).json({ code: 'PAYMENT_NOT_CONFIGURED', error: config.setupMessage })
      return
    }

    const product = getPaymentProduct(req.body?.productKey)
    if (!product) {
      res.status(400).json({ error: '결제 상품을 확인해 주세요.' })
      return
    }
    const profile = await getUserBirthProfile(owner)
    if (!profile) {
      res.status(409).json({ code: 'PROFILE_REQUIRED', error: '결제 전에 기본 사주 프로필을 먼저 저장해 주세요.' })
      return
    }

    const buyerEmail = trimmedString(req.body?.buyerEmail) || owner.email || ''
    const buyerTel = trimmedString(req.body?.buyerTel)
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(buyerEmail)) {
      res.status(400).json({ error: '결제 안내를 받을 이메일을 입력해 주세요.' })
      return
    }
    if (!/^[0-9-]{7,20}$/.test(buyerTel)) {
      res.status(400).json({ error: '숫자와 하이픈으로 휴대폰 번호를 입력해 주세요.' })
      return
    }

    const timestamp = new Date().toISOString()
    const order: PaymentOrder = {
      orderId: createPaymentOrderId(),
      ownerId: owner.id,
      ownerEmail: owner.email,
      buyerEmail,
      buyerTel,
      productKey: product.key,
      productTitle: product.title,
      amount: product.amount,
      status: 'ready',
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    const saved = await savePaymentOrder(order)
    if (config.testMode) {
      res.json({
        order: clientPaymentOrder(saved),
        product: publicPaymentProduct(product),
        testMode: true,
      })
      return
    }
    const fields = createInicisPaymentFields({ order: saved, buyerName: profile.name })
    res.json({
      order: clientPaymentOrder(saved),
      product: publicPaymentProduct(product),
      fields,
    })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '결제 주문 생성 실패' })
  }
})

app.post('/api/payment/test/approve', async (req, res) => {
  try {
    if (!isPaymentTestMode()) {
      res.status(404).json({ error: '테스트 결제 모드가 아닙니다.' })
      return
    }
    const owner = await requireSupabaseUser(req, res)
    if (!owner) return
    const orderId = trimmedString(req.body?.orderId)
    const order = await getPaymentOrder(orderId)
    if (!order || order.ownerId !== owner.id) {
      res.status(404).json({ error: '테스트 주문을 찾지 못했습니다.' })
      return
    }
    if (order.status === 'paid' || order.status === 'viewed') {
      res.json({ order: clientPaymentOrder(order), testMode: true })
      return
    }
    if (order.status !== 'ready') {
      res.status(409).json({ error: '테스트 승인을 진행할 수 없는 주문 상태입니다.' })
      return
    }
    const paid = await updatePaymentOrder(order.orderId, {
      status: 'paid',
      tid: `TEST-${order.orderId}`,
      payMethod: 'TEST',
      approvalCode: 'TEST-0000',
      message: '개발 환경 테스트 승인입니다. 실제 결제가 발생하지 않았습니다.',
    })
    if (!paid) {
      res.status(500).json({ error: '테스트 주문 상태를 저장하지 못했습니다.' })
      return
    }
    res.json({ order: clientPaymentOrder(paid), testMode: true })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '테스트 결제 승인 실패' })
  }
})

app.post('/api/payment/inicis/return', async (req, res) => {
  const body = req.body as Record<string, unknown>
  const orderId = trimmedString(body.orderNumber || body.merchantData || body.oid)
  if (!orderId) {
    res.redirect(303, paymentOrderRedirect('', 'failed', '결제 주문번호를 확인하지 못했습니다.'))
    return
  }

  try {
    const order = await getPaymentOrder(orderId)
    if (!order) {
      res.redirect(303, paymentOrderRedirect(orderId, 'failed', '결제 주문을 찾지 못했습니다.'))
      return
    }
    if (order.status === 'paid' || order.status === 'viewed') {
      res.redirect(303, paymentOrderRedirect(order.orderId, 'paid', undefined, order.productKey))
      return
    }

    const resultCode = trimmedString(body.resultCode || body.P_STATUS)
    const resultMessage = trimmedString(body.resultMsg || body.P_RMESG1) || '결제가 취소되었거나 승인되지 않았습니다.'
    if (resultCode !== '0000') {
      await updatePaymentOrder(order.orderId, { status: 'failed', message: resultMessage })
      res.redirect(303, paymentOrderRedirect(order.orderId, 'failed', resultMessage, order.productKey))
      return
    }

    const callbackMid = trimmedString(body.mid || body.P_MID)
    if (callbackMid && callbackMid !== (process.env.INICIS_MID?.trim() ?? '')) {
      throw new Error('결제 상점 정보를 확인하지 못했습니다.')
    }
    const authToken = trimmedString(body.authToken)
    const authUrl = trimmedString(body.authUrl)
    if (!authToken || !authUrl) throw new Error('결제 승인 정보를 받지 못했습니다.')

    await updatePaymentOrder(order.orderId, { status: 'approving' })
    const approval = await approveInicisPayment({ order, authToken, authUrl })
    const paid = await updatePaymentOrder(order.orderId, {
      status: 'paid',
      tid: approval.tid,
      payMethod: approval.payMethod,
      approvalCode: approval.approvalCode,
      message: approval.resultMessage,
    })
    if (!paid) throw new Error('승인된 주문을 저장하지 못했습니다.')
    res.redirect(303, paymentOrderRedirect(order.orderId, 'paid', undefined, order.productKey))
  } catch (err) {
    const message = err instanceof Error ? err.message : '결제 승인에 실패했습니다.'
    await updatePaymentOrder(orderId, { status: 'failed', message }).catch(() => undefined)
    const failedOrder = await getPaymentOrder(orderId).catch(() => null)
    res.redirect(303, paymentOrderRedirect(orderId, 'failed', message, failedOrder?.productKey))
  }
})

app.get('/api/payment/orders/:orderId', async (req, res) => {
  try {
    const owner = await requireSupabaseUser(req, res)
    if (!owner) return
    const order = await getPaymentOrder(String(req.params.orderId ?? '').trim())
    if (!order || order.ownerId !== owner.id) {
      res.status(404).json({ error: '결제 주문을 찾지 못했습니다.' })
      return
    }
    res.json({ order: clientPaymentOrder(order) })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '결제 주문 조회 실패' })
  }
})

app.post('/api/payment/orders/:orderId/viewed', async (req, res) => {
  try {
    const owner = await requireSupabaseUser(req, res)
    if (!owner) return
    const order = await getPaymentOrder(String(req.params.orderId ?? '').trim())
    if (!order || order.ownerId !== owner.id) {
      res.status(404).json({ error: '결제 주문을 찾지 못했습니다.' })
      return
    }
    if (order.status !== 'paid' && order.status !== 'viewed') {
      res.status(409).json({ error: '결제 완료 후 열람 처리할 수 있습니다.' })
      return
    }
    const updated = await updatePaymentOrder(order.orderId, { status: 'viewed' })
    res.json({ order: updated ? clientPaymentOrder(updated) : null })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '열람 상태 저장 실패' })
  }
})

app.get('/api/user/orders', async (req, res) => {
  try {
    const owner = await requireSupabaseUser(req, res)
    if (!owner) return
    const orders = await listPaymentOrders(owner.id, parseListLimit(req.query.limit))
    res.json({ orders: orders.map(clientPaymentOrder), storage: getPaymentStorageMode() })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '결제 내역 조회 실패' })
  }
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

app.get('/api/user/reports', async (req, res) => {
  try {
    const owner = await requireSupabaseUser(req, res)
    if (!owner) return
    const records = await listReportRecords(owner, parseListLimit(req.query.limit))
    res.json({
      userId: owner.id,
      storage: getReportStorageMode(),
      reports: records.map(historyEntryFromRecord),
    })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '풀이 보관함 조회 실패' })
  }
})

app.get('/api/user/destiny', async (req, res) => {
  try {
    const owner = await requireSupabaseUser(req, res)
    if (!owner) return
    const profile = await getUserBirthProfile(owner)
    const records = await listReportRecords(owner, parseListLimit(req.query.limit, 8))
    if (!profile) {
      res.json({
        userId: owner.id,
        complete: false,
        profile: null,
        reports: records.map(historyEntryFromRecord),
        storage: getReportStorageMode(),
      })
      return
    }

    res.json({
      userId: owner.id,
      complete: true,
      profile,
      analysis: analyzeSaju(profile.birth),
      todayFortune: buildTodayFortune(profile),
      reports: records.map(historyEntryFromRecord),
      storage: getReportStorageMode(),
    })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '운명록 조회 실패' })
  }
})

app.delete('/api/user/reports/:reportId', async (req, res) => {
  try {
    const owner = await requireSupabaseUser(req, res)
    if (!owner) return
    const reportId = String(req.params.reportId ?? '').trim()
    if (!reportId) {
      res.status(400).json({ error: 'reportId가 필요합니다.' })
      return
    }
    const deleted = await deleteReportRecord(reportId, owner)
    res.json({ ok: true, reportId, deleted })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '풀이 삭제 실패' })
  }
})

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

app.delete('/api/user/account', async (req, res) => {
  try {
    const owner = await requireSupabaseUser(req, res)
    if (!owner) return
    const reports = await listReportRecords(owner, 100)
    for (const report of reports) {
      await deleteReportRecord(report.reportId, owner)
    }
    const profileDeleted = await deleteUserBirthProfile(owner)
    res.json({
      ok: true,
      profileDeleted,
      reportsDeleted: reports.length,
      paymentRecords: '법령상 보관이 필요한 결제 기록은 보관 기간 후 파기됩니다.',
    })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '회원 탈퇴 처리 실패' })
  }
})

app.post('/api/place/home/analyze', async (req, res) => {
  try {
    const owner = await requireSupabaseUser(req, res)
    if (!owner) return
    if (!await ensurePaidServiceAccess(req, res, owner, 'home_pungsu')) return
    const profile = await getUserBirthProfile(owner)
    if (!profile) {
      res.status(409).json({ code: 'PROFILE_REQUIRED', error: '집 풍수를 보려면 기본 사주 정보를 먼저 등록해 주세요.' })
      return
    }

    const input = parseHomePungsuRequest(req.body)
    const context = buildHomePungsuContext(profile.name, input)
    const analysis = analyzeSaju(profile.birth)
    const reportId = createHomePungsuReportId(owner.id, profile.birth, input)
    const templateReport = buildHomePungsuReport(analysis, profile.birth, context, input, reportId)
    const progressive = await beginSpecializedProgressiveReport({
      reportId,
      birth: profile.birth,
      context,
      templateReport,
      analysis,
      owner,
      orderId: trimmedString(req.body?.orderId) || undefined,
    })
    res.json(specializedAnalyzeResponse(progressive, profile.birth, context, profile))
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '집 풍수 생성 실패' })
  }
})

app.post('/api/work/move/analyze', async (req, res) => {
  try {
    const owner = await requireSupabaseUser(req, res)
    if (!owner) return
    if (!await ensurePaidServiceAccess(req, res, owner, 'work_move')) return
    const profile = await getUserBirthProfile(owner)
    if (!profile) {
      res.status(409).json({ code: 'PROFILE_REQUIRED', error: '이직운을 보려면 기본 사주 정보를 먼저 등록해 주세요.' })
      return
    }

    const input = parseWorkMoveRequest(req.body)
    const context = buildWorkMoveContext(profile.name, input)
    const analysis = analyzeSaju(profile.birth)
    const reportId = createWorkMoveReportId(owner.id, profile.birth, input)
    const templateReport = buildWorkMoveReport(analysis, profile.birth, context, input, reportId)
    const progressive = await beginSpecializedProgressiveReport({
      reportId,
      birth: profile.birth,
      context,
      templateReport,
      analysis,
      owner,
      orderId: trimmedString(req.body?.orderId) || undefined,
    })
    res.json(specializedAnalyzeResponse(progressive, profile.birth, context, profile))
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '이직운 생성 실패' })
  }
})

app.post('/api/work/job/analyze', async (req, res) => {
  try {
    const owner = await requireSupabaseUser(req, res)
    if (!owner) return
    if (!await ensurePaidServiceAccess(req, res, owner, 'work_job')) return
    const profile = await getUserBirthProfile(owner)
    if (!profile) {
      res.status(409).json({ code: 'PROFILE_REQUIRED', error: '직업운을 보려면 기본 사주 정보를 먼저 등록해 주세요.' })
      return
    }

    const input = parseWorkJobRequest(req.body)
    const context = buildWorkJobContext(profile.name, input)
    const analysis = analyzeSaju(profile.birth)
    const reportId = createWorkJobReportId(owner.id, profile.birth, input)
    const templateReport = buildWorkJobReport(analysis, profile.birth, context, input, reportId)
    const progressive = await beginSpecializedProgressiveReport({
      reportId,
      birth: profile.birth,
      context,
      templateReport,
      analysis,
      owner,
      orderId: trimmedString(req.body?.orderId) || undefined,
    })
    res.json(specializedAnalyzeResponse(progressive, profile.birth, context, profile))
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '직업운 생성 실패' })
  }
})

app.post('/api/money/save/analyze', async (req, res) => {
  try {
    const owner = await requireSupabaseUser(req, res)
    if (!owner) return
    if (!await ensurePaidServiceAccess(req, res, owner, 'money_save')) return
    const profile = await getUserBirthProfile(owner)
    if (!profile) {
      res.status(409).json({ code: 'PROFILE_REQUIRED', error: '소비성향을 보려면 기본 사주 정보를 먼저 등록해 주세요.' })
      return
    }

    const input = parseMoneySaveRequest(req.body)
    const context = buildMoneySaveContext(profile.name, input)
    const analysis = analyzeSaju(profile.birth)
    const reportId = createMoneySaveReportId(owner.id, profile.birth, input)
    const templateReport = buildMoneySaveReport(analysis, profile.birth, context, input, reportId)
    const progressive = await beginSpecializedProgressiveReport({
      reportId,
      birth: profile.birth,
      context,
      templateReport,
      analysis,
      owner,
      orderId: trimmedString(req.body?.orderId) || undefined,
    })
    res.json(specializedAnalyzeResponse(progressive, profile.birth, context, profile))
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '소비성향 생성 실패' })
  }
})

app.post('/api/match/marry/analyze', async (req, res) => {
  try {
    const owner = await requireSupabaseUser(req, res)
    if (!owner) return
    if (!await ensurePaidServiceAccess(req, res, owner, 'marry_match')) return
    const profile = await getUserBirthProfile(owner)
    if (!profile) {
      res.status(409).json({ code: 'PROFILE_REQUIRED', error: '결혼궁합을 보려면 기본 사주 정보를 먼저 등록해 주세요.' })
      return
    }

    const input = parseMarryMatchRequest(req.body)
    const partnerAnalysis = analyzeSaju(input.partnerBirth)
    const context = buildMarryMatchContext(profile.name, input, partnerAnalysis)
    const analysis = analyzeSaju(profile.birth)
    const reportId = createMarryMatchReportId(owner.id, profile.birth, input)
    const templateReport = buildMarryMatchReport(analysis, partnerAnalysis, profile.birth, context, input, reportId)
    const progressive = await beginSpecializedProgressiveReport({
      reportId,
      birth: profile.birth,
      context,
      templateReport,
      analysis,
      owner,
      orderId: trimmedString(req.body?.orderId) || undefined,
    })
    res.json(specializedAnalyzeResponse(progressive, profile.birth, context, profile))
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '결혼궁합 생성 실패' })
  }
})

app.post('/api/match/couple/analyze', async (req, res) => {
  try {
    const owner = await requireSupabaseUser(req, res)
    if (!owner) return
    if (!await ensurePaidServiceAccess(req, res, owner, 'match_couple')) return
    const profile = await getUserBirthProfile(owner)
    if (!profile) {
      res.status(409).json({ code: 'PROFILE_REQUIRED', error: '커플궁합을 보려면 기본 사주 정보를 먼저 등록해 주세요.' })
      return
    }

    const input = parseCoupleMatchRequest(req.body)
    const partnerAnalysis = analyzeSaju(input.partnerBirth)
    const context = buildCoupleMatchContext(profile.name, input, partnerAnalysis)
    const analysis = analyzeSaju(profile.birth)
    const reportId = createCoupleMatchReportId(owner.id, profile.birth, input)
    const templateReport = buildCoupleMatchReport(analysis, partnerAnalysis, profile.birth, context, input, reportId)
    const progressive = await beginSpecializedProgressiveReport({
      reportId,
      birth: profile.birth,
      context,
      templateReport,
      analysis,
      owner,
      orderId: trimmedString(req.body?.orderId) || undefined,
    })
    res.json(specializedAnalyzeResponse(progressive, profile.birth, context, profile))
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '커플궁합 생성 실패' })
  }
})

app.post('/api/love/mind/analyze', async (req, res) => {
  try {
    const owner = await requireSupabaseUser(req, res)
    if (!owner) return
    if (!await ensurePaidServiceAccess(req, res, owner, 'love_mind')) return
    const profile = await getUserBirthProfile(owner)
    if (!profile) {
      res.status(409).json({ code: 'PROFILE_REQUIRED', error: '상대방 마음을 보려면 기본 사주 정보를 먼저 등록해 주세요.' })
      return
    }

    const input = parseLoveMindRequest(req.body)
    const partnerAnalysis = input.partnerBirth ? analyzeSaju(input.partnerBirth) : undefined
    const context = buildLoveMindContext(profile.name, input, partnerAnalysis)
    const analysis = analyzeSaju(profile.birth)
    const reportId = createLoveMindReportId(owner.id, profile.birth, input)
    const templateReport = buildLoveMindReport(analysis, profile.birth, context, input, partnerAnalysis, reportId)
    const progressive = await beginSpecializedProgressiveReport({
      reportId,
      birth: profile.birth,
      context,
      templateReport,
      analysis,
      owner,
      orderId: trimmedString(req.body?.orderId) || undefined,
    })
    res.json(specializedAnalyzeResponse(progressive, profile.birth, context, profile))
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '상대방 마음 생성 실패' })
  }
})

app.post('/api/love/again/analyze', async (req, res) => {
  try {
    const owner = await requireSupabaseUser(req, res)
    if (!owner) return
    if (!await ensurePaidServiceAccess(req, res, owner, 'love_again')) return
    const profile = await getUserBirthProfile(owner)
    if (!profile) {
      res.status(409).json({ code: 'PROFILE_REQUIRED', error: '재회운을 보려면 기본 사주 정보를 먼저 등록해 주세요.' })
      return
    }

    const input = parseLoveAgainRequest(req.body)
    const partnerAnalysis = input.partnerBirth ? analyzeSaju(input.partnerBirth) : undefined
    const context = buildLoveAgainContext(profile.name, input, partnerAnalysis)
    const analysis = analyzeSaju(profile.birth)
    const reportId = createLoveAgainReportId(owner.id, profile.birth, input)
    const templateReport = buildLoveAgainReport(analysis, profile.birth, context, input, partnerAnalysis, reportId)
    const progressive = await beginSpecializedProgressiveReport({
      reportId,
      birth: profile.birth,
      context,
      templateReport,
      analysis,
      owner,
      orderId: trimmedString(req.body?.orderId) || undefined,
    })
    res.json(specializedAnalyzeResponse(progressive, profile.birth, context, profile))
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '재회운 생성 실패' })
  }
})

app.post('/api/love/spouse/analyze', async (req, res) => {
  try {
    const owner = await requireSupabaseUser(req, res)
    if (!owner) return
    if (!await ensurePaidServiceAccess(req, res, owner, 'love_spouse')) return
    const profile = await getUserBirthProfile(owner)
    if (!profile) {
      res.status(409).json({ code: 'PROFILE_REQUIRED', error: '배우자운을 보려면 기본 사주 정보를 먼저 등록해 주세요.' })
      return
    }

    const input = parseLoveSpouseRequest(req.body)
    const context = buildLoveSpouseContext(profile.name, input)
    const analysis = analyzeSaju(profile.birth)
    const reportId = createLoveSpouseReportId(owner.id, profile.birth, input)
    const templateReport = buildLoveSpouseReport(analysis, profile.birth, context, input, reportId)
    const progressive = await beginSpecializedProgressiveReport({
      reportId,
      birth: profile.birth,
      context,
      templateReport,
      analysis,
      owner,
      orderId: trimmedString(req.body?.orderId) || undefined,
    })
    res.json(specializedAnalyzeResponse(progressive, profile.birth, context, profile))
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '배우자운 생성 실패' })
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
    if (owner && context.name && isValidProfileName(context.name)) {
      void saveUserBirthProfile(
        buildUserBirthProfile({
          owner,
          name: context.name,
          birth,
          birthTimeKnown: context.birthTimeKnown !== false,
          context: {
            target: context.target,
            relationship: context.relationship,
            orientation: context.orientation,
            work: context.work,
          },
        }),
        owner,
      ).catch((profileErr) => {
        console.error('[analyze] profile save failed', profileErr)
      })
    }
    res.json(await toUiAnalysis(birth, context, owner))
  } catch (err) {
    console.error('[analyze] failed', err)
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
      reportId: record.reportId,
      publicId: record.publicId,
      publicUrl: record.publicId ? `/r/${record.publicId}` : undefined,
      birth: record.birth,
      context: record.context,
      analysis,
      chatHistory: record.chatHistory ?? [],
      storage: getReportStorageMode(),
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
    const context = enrichReportContext(parseReportContext(req.body))
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
    const context = enrichReportContext(parseReportContext(req.body))
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
    console.log(`천명사주 서버: http://localhost:${PORT}`)
    console.log(`UMSH 포탈: http://localhost:${PORT}/`)
    console.log(`천명사주 입력: http://localhost:${PORT}/cmdg/`)
    console.log(`OpenAI: ${isOpenAiConfigured() ? '연결됨' : 'API 키 필요 (.env)'}`)
  })
}
