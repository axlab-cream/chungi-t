import '../env/load.js'
import express from 'express'
import cors from 'cors'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Request, Response } from 'express'
import { analyzeSaju } from '../saju/analyzer.js'
import { isOpenAiConfigured } from '../llm/openai-adapter.js'
import { fetchPungsuTerrainEvidence } from '../pungsu/dataset-client.js'
import { generateSavedChat, isSavedChatRecord, toSavedChatResult, savedChatParentId, findSavedChatRequest } from '../report/saved-chat.js'
import { buildTemplateSajuReport } from '../report/report-generator.js'
import { beginSpecializedProgressiveReport } from '../report/specialized-progressive.js'
import { generateReportSectionNow } from '../report/report-queue.js'
import { savedDailyFortune } from '../report/daily-report.js'
import {
  checkReportStorageReadiness,
  createOrGetReportRecord,
  createReportId,
  deleteReportRecord,
  getReportStorageMode,
  findReportRecord,
  sectionGenerationId,
  listReportRecords,
  toClientReport,
  updateReportChatHistory,
  withReportBirthCertainty,
} from '../report/report-store.js'
import { createSavedPreview, guardPreview } from '../report/report-preview.js'
import type { BirthInput, ConversationTurn, SajuAnalysis, SajuReport, SajuReportContext } from '../types/index.js'
import type { ReportOwner, ReportRecord } from '../report/report-store.js'
import { applyAdminReportUnlock, isAdminOwner } from '../auth/admin.js'
import {
  buildUserBirthProfile,
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
  type PaymentStorageMode,
  listPaymentOrders,
  savePaymentOrder,
  updatePaymentOrder,
} from '../payment/order-store.js'
import type { PaymentOrder } from '../payment/order-store.js'
import { ELEMENT_KO, STEM_KO, BRANCH_KO } from '../saju/analyzer-helpers.js'
import {
  buildMoneySaveContext,
  buildMoneySaveReport,
  createMoneySaveReportId,
  parseMoneySaveRequest,
} from '../money/save-service.js'
import {
  buildCoupleMatchContext,
  buildCoupleMatchReport,
  createCoupleMatchReportId,
  parseCoupleMatchRequest,
} from '../match/couple-service.js'
import {
  buildMarryMatchContext,
  buildMarryMatchReport,
  createMarryMatchReportId,
  parseMarryMatchRequest,
} from '../match/marry-service.js'
import {
  buildWorkJobContext,
  buildWorkJobReport,
  createWorkJobReportId,
  parseWorkJobRequest,
} from '../work/job-service.js'
import {
  buildWorkQuitContext,
  buildWorkQuitReport,
  createWorkQuitReportId,
  parseWorkQuitRequest,
} from '../work/quit-service.js'
import {
  buildJobChoiceContext,
  buildJobChoiceReport,
  createJobChoiceReportId,
  parseJobChoiceRequest,
} from '../work/jobchoice-service.js'
import {
  buildCatCompatContext,
  buildCatCompatReport,
  createCatCompatReportId,
  parseCatCompatRequest,
} from '../pet/cat-service.js'
import {
  buildWeddingContext,
  buildWeddingReport,
  buildWeddingTeaser,
  createWeddingReportId,
  parseWeddingRequest,
} from '../day/wedding-service.js'
import {
  buildNewYearContext,
  buildNewYearReport,
  createNewYearReportId,
  parseNewYearRequest,
} from '../flow/newyear-service.js'
import {
  buildLuckyColorContext,
  buildLuckyColorReport,
  createLuckyColorReportId,
  parseLuckyColorRequest,
} from '../body/lucky-service.js'
import { listServiceDirectory, serviceHrefForKey } from './service-directory.js'
import { getCorpusSnapshot } from '../rag/corpus-registry.js'
import {
  buildLoveMindContext,
  buildLoveMindReport,
  createLoveMindReportId,
  parseLoveMindRequest,
} from '../love/mind-service.js'
import {
  buildLoveSignalContext,
  buildLoveSignalReport,
  createLoveSignalReportId,
  parseLoveSignalRequest,
} from '../love/signal-service.js'
import {
  buildLoveThisYearContext,
  buildLoveThisYearReport,
  createLoveThisYearReportId,
  parseLoveThisYearRequest,
} from '../love/thisyear-service.js'
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
const SEARCH_PAGE = join(SAJU_ROOT, 'search.html')
const VAULT_PAGE = join(SAJU_ROOT, 'vault.html')
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
const SUPABASE_GOOGLE_CLIENT_ID = process.env.SUPABASE_GOOGLE_CLIENT_ID?.trim() ?? ''
const SUPABASE_GOOGLE_PROVIDER = envValue(process.env.SUPABASE_GOOGLE_PROVIDER, 'google')
const SUPABASE_KAKAO_PROVIDER = envValue(process.env.SUPABASE_KAKAO_PROVIDER, 'kakao')
const SUPABASE_NAVER_PROVIDER = envValue(process.env.SUPABASE_NAVER_PROVIDER, 'custom:naver')
const LOVE_THIS_YEAR_SERVICE_KEY = 'love_this_year'
const HOME_FIT_SERVICE_KEY = 'home_fit'
const WORK_MOVE_SERVICE_KEY = 'work_move'
const PASS_ANGLE_SERVICE_KEY = 'pass_angle'
// 공개 상태를 한 곳에서 전환해 페이지·분석 경로가 서로 다른 상태가 되지 않게 한다.
const HOME_FIT_PUBLICLY_ENABLED = true
const PUBLICLY_DISABLED_PRODUCT_KEYS = new Set<string>()

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
// Interpretation/profile responses must never enter browser or shared caches.
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store')
  res.vary('Authorization')
  next()
})

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
    resultId: progressive.report.resultId,
    publicUrl: progressive.publicId ? `/r/${progressive.publicId}` : undefined,
    cached: progressive.cached,
    resumed: progressive.resumed,
    birth,
    context,
    profile,
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
// 하단 메뉴의 검색·보관함은 비로그인도 들어올 수 있는 화면이다.
app.get(['/search', '/search/', '/search.html'], (_req, res) => {
  res.sendFile(SEARCH_PAGE)
})
app.get(['/vault', '/vault/', '/vault.html'], (_req, res) => {
  res.sendFile(VAULT_PAGE)
})
app.get(['/profile', '/profile/', '/profile.html'], (_req, res) => {
  res.sendFile(PROFILE_PAGE)
})
app.get(['/refunds', '/refunds/', '/refunds.html'], (_req, res) => {
  res.sendFile(REFUNDS_PAGE)
})
// 올해 연애운 runs as the 01 → 02 → 04 → 05 → 06_1 flow; these are the readable entry points.
app.get(['/love/this-year', '/love/this-year/', '/love/this-year.html', '/love/this-year/index.html'], (req, res) => {
  // A return from the PG carries ?paid=1&orderId=..., and step 04 is the page that
  // resumes it, so keep the query and send a paid visitor to the result, not the intro.
  const forwarded = new URLSearchParams()
  for (const key of ['paid', 'orderId', 'reportId']) {
    const value = req.query[key]
    if (typeof value === 'string' && value) forwarded.set(key, value)
  }
  const query = forwarded.toString()
  const step = req.query.paid === '1' ? '04-step-4-report' : '01-step-1-story'
  res.redirect(302, `/love/this-year/${step}/index.html${query ? `?${query}` : ''}`)
})
app.get(['/love/this-year/input', '/love/this-year/input.html'], (_req, res) => {
  res.redirect(302, '/love/this-year/02-step-2-saju-input/index.html')
})
app.get(['/love/this-year/report', '/love/this-year/report.html'], (_req, res) => {
  res.redirect(302, '/love/this-year/04-step-4-report/index.html')
})
app.get(['/love/this-year/chat', '/love/this-year/chat.html'], (_req, res) => {
  res.redirect(302, '/love/this-year/05-step-5-chat/chat.html')
})
app.get(['/love/this-year/detail', '/love/this-year/detail.html'], (_req, res) => {
  res.redirect(302, '/love/this-year/06-step-6_1-report-detail/index.html')
})
app.get('/love/this-year/06-step-6_1-report-detail/index.html', (_req, res) => {
  res.sendFile(join(SAJU_ROOT, 'love', 'this-year', '06-step-6_1-report-detail', 'index.html'))
})
app.get(['/love/mind', '/love/mind/', '/love/mind/index.html'], (_req, res) => {
  res.sendFile(join(SAJU_ROOT, 'love', 'mind', 'index.html'))
})
// 관계 신호 runs as the 01 → 02 → 04 → 05 → 06_1 flow; these are the readable entry points.
app.get(['/love/signal', '/love/signal/', '/love/signal/index.html'], (req, res) => {
  // A return from the PG carries ?paid=1&orderId=..., and step 04 is the page that
  // resumes it, so keep the query and send a paid visitor to the result, not the intro.
  const forwarded = new URLSearchParams()
  for (const key of ['paid', 'orderId', 'reportId']) {
    const value = req.query[key]
    if (typeof value === 'string' && value) forwarded.set(key, value)
  }
  const query = forwarded.toString()
  const step = req.query.paid === '1' ? '04-step-4-report' : '01-step-1-story'
  res.redirect(302, `/love/signal/${step}/index.html${query ? `?${query}` : ''}`)
})
app.get(['/love/signal/input', '/love/signal/input.html'], (_req, res) => {
  res.redirect(302, '/love/signal/02-step-2-saju-input/index.html')
})
app.get(['/love/signal/report', '/love/signal/report.html'], (_req, res) => {
  res.redirect(302, '/love/signal/04-step-4-report/index.html')
})
app.get(['/love/signal/chat', '/love/signal/chat.html'], (_req, res) => {
  res.redirect(302, '/love/signal/05-step-5-chat/chat.html')
})
app.get(['/love/signal/detail', '/love/signal/detail.html'], (_req, res) => {
  res.redirect(302, '/love/signal/06-step-6_1-report-detail/index.html')
})
app.get(['/love/again', '/love/again/', '/love/again/index.html'], (_req, res) => {
  res.sendFile(join(SAJU_ROOT, 'love', 'again', 'index.html'))
})
app.get(['/love/spouse', '/love/spouse/', '/love/spouse/index.html'], (_req, res) => {
  res.sendFile(join(SAJU_ROOT, 'love', 'spouse', 'index.html'))
})
app.get(['/today/free', '/today/free/', '/today/free/index.html'], (_req, res) => {
  res.sendFile(join(SAJU_ROOT, 'today', 'free', 'index.html'))
})
app.get(['/work/job', '/work/job/', '/work/job/index.html'], (_req, res) => {
  res.sendFile(join(SAJU_ROOT, 'work', 'job', 'index.html'))
})
// 퇴사운 runs as the 01 → 02 → 03 → 04 → 05 → 06_1 flow; these are the readable entry points.
app.get(['/work/quit', '/work/quit/', '/work/quit/index.html'], (req, res) => {
  // A return from the PG carries ?paid=1&orderId=..., and step 04 is the page that
  // resumes it, so keep the query and send a paid visitor to the result, not the intro.
  const forwarded = new URLSearchParams()
  for (const key of ['paid', 'orderId', 'reportId']) {
    const value = req.query[key]
    if (typeof value === 'string' && value) forwarded.set(key, value)
  }
  const query = forwarded.toString()
  const step = req.query.paid === '1' ? '04-step-4-report' : '01-step-1-story'
  res.redirect(302, `/work/quit/${step}/index.html${query ? `?${query}` : ''}`)
})
// 자미두수 직장 선택 runs as the 01 → 02 → 04 → 05 → 06_1 flow; these are the readable entry points.
app.get(['/work/job-choice', '/work/job-choice/', '/work/job-choice/index.html'], (req, res) => {
  // A return from the PG carries ?paid=1&orderId=..., and step 04 is the page that
  // resumes it, so keep the query and send a paid visitor to the result, not the intro.
  const forwarded = new URLSearchParams()
  for (const key of ['paid', 'orderId', 'reportId']) {
    const value = req.query[key]
    if (typeof value === 'string' && value) forwarded.set(key, value)
  }
  const query = forwarded.toString()
  const step = req.query.paid === '1' ? '04-step-4-report' : '01-step-1-story'
  res.redirect(302, `/work/job-choice/${step}/index.html${query ? `?${query}` : ''}`)
})
app.get(['/work/job-choice/input', '/work/job-choice/input.html'], (_req, res) => {
  res.redirect(302, '/work/job-choice/02-step-2-saju-input/index.html')
})
app.get(['/work/job-choice/report', '/work/job-choice/report.html'], (_req, res) => {
  res.redirect(302, '/work/job-choice/04-step-4-report/index.html')
})
app.get(['/work/job-choice/chat', '/work/job-choice/chat.html'], (_req, res) => {
  res.redirect(302, '/work/job-choice/05-step-5-chat/chat.html')
})
app.get(['/work/job-choice/detail', '/work/job-choice/detail.html'], (_req, res) => {
  res.redirect(302, '/work/job-choice/06-step-6_1-report-detail/index.html')
})
app.get(['/work/quit/input', '/work/quit/input.html'], (_req, res) => {
  res.redirect(302, '/work/quit/02-step-2-saju-input/index.html')
})
app.get(['/work/quit/situation', '/work/quit/situation.html'], (_req, res) => {
  res.redirect(302, '/work/quit/03-step-3-service-input/index.html')
})
app.get(['/work/quit/report', '/work/quit/report.html'], (_req, res) => {
  res.redirect(302, '/work/quit/04-step-4-report/index.html')
})
app.get(['/work/quit/chat', '/work/quit/chat.html'], (_req, res) => {
  res.redirect(302, '/work/quit/05-step-5-chat/chat.html')
})
app.get(['/work/quit/detail', '/work/quit/detail.html'], (_req, res) => {
  res.redirect(302, '/work/quit/06-step-6_1-report-detail/index.html')
})
// 결혼궁합 runs as the 01 → 02 → 04 → 05 → 06_1 flow; these are the readable entry points.
app.get(['/match/marry', '/match/marry/', '/match/marry/index.html'], (req, res) => {
  // A return from the PG carries ?paid=1&orderId=..., and step 04 is the page that
  // resumes it, so keep the query and send a paid visitor to the result rather than the intro.
  // Only the checkout round-trip params travel on; Vercel adds its own __umsh_path
  // rewrite marker to every request and it must not surface in the address bar.
  const forwarded = new URLSearchParams()
  for (const key of ['paid', 'orderId', 'reportId']) {
    const value = req.query[key]
    if (typeof value === 'string' && value) forwarded.set(key, value)
  }
  const query = forwarded.toString()
  const step = req.query.paid === '1' ? '04-step-4-report' : '01-step-1-story'
  res.redirect(302, `/match/marry/${step}/index.html${query ? `?${query}` : ''}`)
})
app.get(['/match/marry/input', '/match/marry/input.html'], (_req, res) => {
  res.redirect(302, '/match/marry/02-step-2-saju-input/index.html')
})
app.get(['/match/marry/report', '/match/marry/report.html'], (_req, res) => {
  res.redirect(302, '/match/marry/04-step-4-report/index.html')
})
app.get(['/match/marry/chat', '/match/marry/chat.html'], (_req, res) => {
  res.redirect(302, '/match/marry/05-step-5-chat/chat.html')
})
app.get(['/match/marry/detail', '/match/marry/detail.html'], (_req, res) => {
  res.redirect(302, '/match/marry/06-step-6_1-report-detail/index.html')
})
app.use('/place/home', (_req, res, next) => {
  if (HOME_FIT_PUBLICLY_ENABLED) {
    next()
    return
  }
  res.setHeader('Cache-Control', 'no-store')
  res.redirect(302, '/')
})
// 집 풍수 공개 재개 시 위 게이트만 열면 아래 01~06 경로를 그대로 다시 쓸 수 있다.
app.get(['/place/home', '/place/home/', '/place/home/index.html'], (_req, res) => {
  res.redirect(302, '/place/home/01-step-1-story/index.html')
})
// 소비성향 runs as the 01 → 02 → 04 → 05 → 06_1 flow; these are the readable entry points.
app.get(['/money/save', '/money/save/', '/money/save/index.html'], (req, res) => {
  // A return from the PG carries ?paid=1&orderId=..., and step 04 is the page that
  // resumes it, so keep the query and send a paid visitor to the result, not the intro.
  const forwarded = new URLSearchParams()
  for (const key of ['paid', 'orderId', 'reportId']) {
    const value = req.query[key]
    if (typeof value === 'string' && value) forwarded.set(key, value)
  }
  const query = forwarded.toString()
  const step = req.query.paid === '1' ? '04-step-4-report' : '01-step-1-story'
  res.redirect(302, `/money/save/${step}/index.html${query ? `?${query}` : ''}`)
})
app.get(['/money/save/input', '/money/save/input.html'], (_req, res) => {
  res.redirect(302, '/money/save/02-step-2-saju-input/index.html')
})
app.get(['/money/save/report', '/money/save/report.html'], (_req, res) => {
  res.redirect(302, '/money/save/04-step-4-report/index.html')
})
app.get(['/money/save/chat', '/money/save/chat.html'], (_req, res) => {
  res.redirect(302, '/money/save/05-step-5-chat/chat.html')
})
app.get(['/money/save/detail', '/money/save/detail.html'], (_req, res) => {
  res.redirect(302, '/money/save/06-step-6_1-report-detail/index.html')
})
// 커플궁합 runs as the 01 → 02 → 04 → 05 → 06_1 flow; these are the readable entry points.
app.get(['/match/couple', '/match/couple/', '/match/couple/index.html'], (req, res) => {
  // A return from the PG carries ?paid=1&orderId=..., and step 04 is the page that
  // resumes it, so keep the query and send a paid visitor to the result, not the intro.
  const forwarded = new URLSearchParams()
  for (const key of ['paid', 'orderId', 'reportId']) {
    const value = req.query[key]
    if (typeof value === 'string' && value) forwarded.set(key, value)
  }
  const query = forwarded.toString()
  const step = req.query.paid === '1' ? '04-step-4-report' : '01-step-1-story'
  res.redirect(302, `/match/couple/${step}/index.html${query ? `?${query}` : ''}`)
})
// 고양이 궁합 runs as the 01 → 02 → 04 → 05 → 06_1 flow; these are the readable entry points.
app.get(['/match/cat', '/match/cat/', '/match/cat/index.html'], (req, res) => {
  // A return from the PG carries ?paid=1&orderId=..., and step 04 is the page that
  // resumes it, so keep the query and send a paid visitor to the result, not the intro.
  const forwarded = new URLSearchParams()
  for (const key of ['paid', 'orderId', 'reportId']) {
    const value = req.query[key]
    if (typeof value === 'string' && value) forwarded.set(key, value)
  }
  const query = forwarded.toString()
  const step = req.query.paid === '1' ? '04-step-4-report' : '01-step-1-story'
  res.redirect(302, `/match/cat/${step}/index.html${query ? `?${query}` : ''}`)
})
app.get(['/match/cat/input', '/match/cat/input.html'], (_req, res) => {
  res.redirect(302, '/match/cat/02-step-2-saju-input/index.html')
})
app.get(['/match/cat/report', '/match/cat/report.html'], (_req, res) => {
  res.redirect(302, '/match/cat/04-step-4-report/index.html')
})
app.get(['/match/cat/chat', '/match/cat/chat.html'], (_req, res) => {
  res.redirect(302, '/match/cat/05-step-5-chat/chat.html')
})
app.get(['/match/cat/detail', '/match/cat/detail.html'], (_req, res) => {
  res.redirect(302, '/match/cat/06-step-6_1-report-detail/index.html')
})
app.get('/match/cat/06-step-6_1-report-detail/index.html', (_req, res) => {
  res.sendFile(join(SAJU_ROOT, 'match', 'cat', '06-step-6_1-report-detail', 'index.html'))
})
// 나한테 운 붙는 색과 물건 runs as the 01 → 02 → 04 → 05 → 06_1 flow; these are the readable entry points.
app.get(['/me/lucky', '/me/lucky/', '/me/lucky/index.html'], (req, res) => {
  // A return from the PG carries ?paid=1&orderId=..., and step 04 is the page that
  // resumes it, so keep the query and send a paid visitor to the result, not the intro.
  const forwarded = new URLSearchParams()
  for (const key of ['paid', 'orderId', 'reportId']) {
    const value = req.query[key]
    if (typeof value === 'string' && value) forwarded.set(key, value)
  }
  const query = forwarded.toString()
  const step = req.query.paid === '1' ? '04-step-4-report' : '01-step-1-story'
  res.redirect(302, `/me/lucky/${step}/index.html${query ? `?${query}` : ''}`)
})
app.get(['/me/lucky/input', '/me/lucky/input.html'], (_req, res) => {
  res.redirect(302, '/me/lucky/02-step-2-saju-input/index.html')
})
app.get(['/me/lucky/report', '/me/lucky/report.html'], (_req, res) => {
  res.redirect(302, '/me/lucky/04-step-4-report/index.html')
})
app.get(['/me/lucky/chat', '/me/lucky/chat.html'], (_req, res) => {
  res.redirect(302, '/me/lucky/05-step-5-chat/chat.html')
})
app.get(['/me/lucky/detail', '/me/lucky/detail.html'], (_req, res) => {
  res.redirect(302, '/me/lucky/06-step-6_1-report-detail/index.html')
})
app.get('/me/lucky/06-step-6_1-report-detail/index.html', (_req, res) => {
  res.sendFile(join(SAJU_ROOT, 'me', 'lucky', '06-step-6_1-report-detail', 'index.html'))
})
// 내 2027년, 풀릴 각이야? runs as the 01 → 02 → 04 → 05 → 06_1 flow; these are the readable entry points.
function newYearFlowUrl(req: Request, page: string): string {
  // Forward locators only, never an external returnTo or Vercel rewrite marker.
  const forwarded = new URLSearchParams()
  for (const key of ['paid', 'orderId', 'reportId']) {
    const value = req.query[key]
    if (typeof value === 'string' && value) forwarded.set(key, value)
  }
  if (req.query.preview === '1') forwarded.set('preview', '1')
  const query = forwarded.toString()
  return `/flow/newyear/${page}${query ? `?${query}` : ''}`
}
app.get(['/flow/newyear', '/flow/newyear/', '/flow/newyear/index.html'], (req, res) => {
  const hasSavedId = typeof req.query.reportId === 'string' && Boolean(req.query.reportId)
  const step = req.query.paid === '1' || hasSavedId ? '04-step-4-report' : '01-step-1-story'
  res.redirect(302, newYearFlowUrl(req, `${step}/index.html`))
})
app.get(['/flow/newyear/input', '/flow/newyear/input.html'], (req, res) => {
  res.redirect(302, newYearFlowUrl(req, '02-step-2-saju-input/index.html'))
})
app.get(['/flow/newyear/report', '/flow/newyear/report.html'], (req, res) => {
  res.redirect(302, newYearFlowUrl(req, '04-step-4-report/index.html'))
})
app.get(['/flow/newyear/chat', '/flow/newyear/chat.html'], (req, res) => {
  res.redirect(302, newYearFlowUrl(req, '05-step-5-chat/chat.html'))
})
app.get(['/flow/newyear/detail', '/flow/newyear/detail.html'], (req, res) => {
  res.redirect(302, newYearFlowUrl(req, '06-step-6_1-report-detail/index.html'))
})
// 우리, 언제 결혼하면 좋을까? runs as the 01 → 02 → 04 → 05 → 06_1 flow; these are the readable entry points.
app.get(['/day/wedding', '/day/wedding/', '/day/wedding/index.html'], (req, res) => {
  // A return from the PG carries ?paid=1&orderId=..., and step 04 resumes it, so keep the
  // query and send a paid visitor to the result instead of the intro.
  const forwarded = new URLSearchParams()
  for (const key of ['paid', 'orderId', 'reportId']) {
    const value = req.query[key]
    if (typeof value === 'string' && value) forwarded.set(key, value)
  }
  const query = forwarded.toString()
  const step = req.query.paid === '1' ? '04-step-4-report' : '01-step-1-story'
  res.redirect(302, `/day/wedding/${step}/index.html${query ? `?${query}` : ''}`)
})
app.get(['/day/wedding/input', '/day/wedding/input.html'], (_req, res) => {
  res.redirect(302, '/day/wedding/02-step-2-saju-input/index.html')
})
app.get(['/day/wedding/report', '/day/wedding/report.html'], (_req, res) => {
  res.redirect(302, '/day/wedding/04-step-4-report/index.html')
})
app.get(['/day/wedding/chat', '/day/wedding/chat.html'], (_req, res) => {
  res.redirect(302, '/day/wedding/05-step-5-chat/chat.html')
})
app.get(['/day/wedding/detail', '/day/wedding/detail.html'], (_req, res) => {
  res.redirect(302, '/day/wedding/06-step-6_1-report-detail/index.html')
})
app.get(['/match/couple/input', '/match/couple/input.html'], (_req, res) => {
  res.redirect(302, '/match/couple/02-step-2-saju-input/index.html')
})
app.get(['/match/couple/report', '/match/couple/report.html'], (_req, res) => {
  res.redirect(302, '/match/couple/04-step-4-report/index.html')
})
app.get(['/match/couple/chat', '/match/couple/chat.html'], (_req, res) => {
  res.redirect(302, '/match/couple/05-step-5-chat/chat.html')
})
app.get(['/match/couple/detail', '/match/couple/detail.html'], (_req, res) => {
  res.redirect(302, '/match/couple/06-step-6_1-report-detail/index.html')
})
app.get(['/place/home/input', '/place/home/input.html'], (_req, res) => {
  res.redirect(302, '/place/home/02-step-2-saju-input/index.html')
})
app.get(['/place/home/report', '/place/home/report.html'], (_req, res) => {
  res.redirect(302, '/place/home/04-step-4-report/index.html')
})
app.get(['/place/home/chat', '/place/home/chat.html'], (_req, res) => {
  res.redirect(302, '/place/home/05-step-5-chat/chat.html')
})
app.get(['/place/home/detail', '/place/home/detail.html'], (_req, res) => {
  res.redirect(302, '/place/home/06-step-6_1-report-detail/index.html')
})
app.get(['/work/move', '/work/move/', '/work/move/index.html'], (_req, res) => {
  res.redirect(302, '/work/move/01-step-1-story/index.html')
})
app.get(['/work/move/input', '/work/move/input.html'], (_req, res) => {
  res.redirect(302, '/work/move/02-step-2-saju-input/index.html')
})
app.get(['/work/move/report', '/work/move/report.html'], (_req, res) => {
  res.redirect(302, '/work/move/04-step-4-report/index.html')
})
app.get(['/work/move/chat', '/work/move/chat.html'], (_req, res) => {
  res.redirect(302, '/work/move/05-step-5-chat/chat.html')
})
app.get(['/work/move/detail', '/work/move/detail.html'], (_req, res) => {
  res.redirect(302, '/work/move/06-step-6_1-report-detail/index.html')
})
app.get(['/me/pass-angle', '/me/pass-angle/', '/me/pass-angle/index.html'], (_req, res) => {
  res.redirect(302, '/me/pass-angle/01-step-1-story/index.html')
})
app.get(['/me/pass-angle/input', '/me/pass-angle/input.html'], (_req, res) => {
  res.redirect(302, '/me/pass-angle/02-step-2-saju-input/index.html')
})
app.get(['/me/pass-angle/exam', '/me/pass-angle/exam.html'], (_req, res) => {
  res.redirect(302, '/me/pass-angle/03-step-3-service-input/index.html')
})
app.get(['/me/pass-angle/report', '/me/pass-angle/report.html'], (_req, res) => {
  res.redirect(302, '/me/pass-angle/04-step-4-report/index.html')
})
app.get(['/me/pass-angle/chat', '/me/pass-angle/chat.html'], (_req, res) => {
  res.redirect(302, '/me/pass-angle/05-step-5-chat/chat.html')
})
app.get(['/me/pass-angle/detail', '/me/pass-angle/detail.html'], (_req, res) => {
  res.redirect(302, '/me/pass-angle/06-step-6_1-report-detail/index.html')
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
app.use('/love/mind/assets', express.static(join(SAJU_UI, 'assets')))
app.use('/love/again/assets', express.static(join(SAJU_UI, 'assets')))
app.use('/love/spouse/assets', express.static(join(SAJU_UI, 'assets')))
app.use('/place/home/assets', express.static(join(SAJU_ROOT, 'place', 'home', 'IMAGE')))
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

function normalizeServiceKey(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const key = value.trim().toLowerCase().replace(/\s+/g, '_')
  if ([LOVE_THIS_YEAR_SERVICE_KEY, 'love-this-year', 'love', 'year_love'].includes(key)) return LOVE_THIS_YEAR_SERVICE_KEY
  if ([HOME_FIT_SERVICE_KEY, 'home-fit', 'home', 'place-home', 'place/home'].includes(key)) return HOME_FIT_SERVICE_KEY
  if ([WORK_MOVE_SERVICE_KEY, 'work-move', 'move', 'job-change', 'career-move', 'work/move'].includes(key)) return WORK_MOVE_SERVICE_KEY
  if ([PASS_ANGLE_SERVICE_KEY, 'pass-angle', 'pass', 'exam', 'me/pass-angle'].includes(key)) return PASS_ANGLE_SERVICE_KEY
  return undefined
}

function compactStringField(source: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = trimmedString(source[key])
    if (value) return value.slice(0, 120)
  }
  return undefined
}

function parseHomePainPoints(value: unknown): string[] | undefined {
  const items = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[,\n]/)
      : []
  const points = items
    .map((item) => trimmedString(item).slice(0, 80))
    .filter(Boolean)
    .slice(0, 8)
  return points.length > 0 ? points : undefined
}

function parseCompactStringList(value: unknown): string[] | undefined {
  const items = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[,\n]/)
      : []
  const parsed = items
    .map((item) => trimmedString(item).slice(0, 80))
    .filter(Boolean)
    .slice(0, 10)
  return parsed.length > 0 ? parsed : undefined
}

function parseHomeFitContext(source: unknown): SajuReportContext['home'] | undefined {
  const home = asObject(source)
  const painPoints = parseHomePainPoints(home.painPoints ?? home.pain_points)
  const parsed = {
    addressOrBuilding: compactStringField(home, 'addressOrBuilding', 'address_or_building', 'address', 'buildingName'),
    roadAddress: compactStringField(home, 'roadAddress', 'road_address'),
    jibunAddress: compactStringField(home, 'jibunAddress', 'jibun_address'),
    zonecode: compactStringField(home, 'zonecode', 'postalCode', 'postal_code'),
    sido: compactStringField(home, 'sido', 'province'),
    sigungu: compactStringField(home, 'sigungu', 'cityDistrict'),
    bname: compactStringField(home, 'bname', 'legalDong'),
    buildingName: compactStringField(home, 'buildingName', 'building_name'),
    addressType: compactStringField(home, 'addressType', 'address_type'),
    buildingType: compactStringField(home, 'buildingType', 'building_type'),
    livingPeriod: compactStringField(home, 'livingPeriod', 'living_period'),
    mainPurpose: compactStringField(home, 'mainPurpose', 'main_purpose'),
    stayDecision: compactStringField(home, 'stayDecision', 'stay_decision'),
    painPoints,
    entranceFlow: compactStringField(home, 'entranceFlow', 'entrance_flow'),
    bedroomFeel: compactStringField(home, 'bedroomFeel', 'bedroom_feel'),
    deskPosition: compactStringField(home, 'deskPosition', 'desk_position'),
    outsideFlow: compactStringField(home, 'outsideFlow', 'outside_flow'),
    extraNote: compactStringField(home, 'extraNote', 'extra_note', 'note'),
  }
  return Object.values(parsed).some(Boolean) ? parsed : undefined
}

function parseWorkMoveContext(source: unknown): SajuReportContext['workMove'] | undefined {
  const workMove = asObject(source)
  const parsed = {
    decisionMode: compactStringField(workMove, 'decisionMode', 'decision_mode'),
    currentCompanySignal: compactStringField(workMove, 'currentCompanySignal', 'current_company_signal'),
    targetCompanyName: compactStringField(workMove, 'targetCompanyName', 'target_company_name', 'company'),
    targetRole: compactStringField(workMove, 'targetRole', 'target_role', 'role'),
    workType: compactStringField(workMove, 'workType', 'work_type'),
    commuteLocation: compactStringField(workMove, 'commuteLocation', 'commute_location'),
    salaryFeeling: compactStringField(workMove, 'salaryFeeling', 'salary_feeling'),
    decisionDate: compactStringField(workMove, 'decisionDate', 'decision_date'),
    discomfortPoint: compactStringField(workMove, 'discomfortPoint', 'discomfort_point', 'concern'),
    priority: compactStringField(workMove, 'priority'),
    realityChecks: parseCompactStringList(workMove.realityChecks ?? workMove.reality_checks),
  }
  return Object.values(parsed).some(Boolean) ? parsed : undefined
}

function parseExamContext(source: unknown): SajuReportContext['exam'] | undefined {
  const exam = asObject(source)
  const parsed = {
    examName: compactStringField(exam, 'examName', 'exam_name', 'exam'),
    examDate: compactStringField(exam, 'examDate', 'exam_date', 'date'),
    examType: compactStringField(exam, 'examType', 'exam_type', 'type'),
    priority: compactStringField(exam, 'priority', 'need'),
    worry: compactStringField(exam, 'worry', 'concern'),
  }
  return Object.values(parsed).some(Boolean) ? parsed : undefined
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
  if (context.serviceKey !== LOVE_THIS_YEAR_SERVICE_KEY || context.partner?.mode !== 'known' || !context.partner.birth) {
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

async function enrichHomeTerrainContext(context: SajuReportContext): Promise<SajuReportContext> {
  if (context.serviceKey !== HOME_FIT_SERVICE_KEY || !context.home || context.home.terrainEvidence) return context
  const address = context.home.roadAddress || context.home.jibunAddress || context.home.addressOrBuilding
  if (!address) return context
  const terrainEvidence = await fetchPungsuTerrainEvidence(address)
  return terrainEvidence ? { ...context, home: { ...context.home, terrainEvidence } } : context
}

function parseReportContext(body: Record<string, unknown>): SajuReportContext {
  const context = (body.context ?? {}) as Record<string, unknown>
  const value = (key: string): string | undefined => {
    const raw = context[key] ?? body[key]
    return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined
  }
  const rawServiceKey = context.serviceKey ?? context.service_key ?? body.serviceKey ?? body.service_key
  const serviceKey = normalizeServiceKey(rawServiceKey)

  const birthTimeKnown = body.birthTimeKnown === false || context.birthTimeKnown === false ? false : undefined
  const partner = serviceKey === LOVE_THIS_YEAR_SERVICE_KEY ? parseOptionalPartnerContext(context.partner ?? body.partner) : undefined
  const home = serviceKey === HOME_FIT_SERVICE_KEY ? parseHomeFitContext(context.home ?? body.home ?? context.input ?? body.input) : undefined
  const workMove = serviceKey === WORK_MOVE_SERVICE_KEY
    ? parseWorkMoveContext(context.workMove ?? context.work_move ?? body.workMove ?? body.work_move ?? context.input ?? body.input)
    : undefined
  const exam = serviceKey === PASS_ANGLE_SERVICE_KEY
    ? parseExamContext(context.exam ?? body.exam ?? context.input ?? body.input)
    : undefined

  return {
    serviceKey,
    name: value('name'),
    target: value('target'),
    concern: value('concern'),
    relationship: value('relationship'),
    orientation: value('orientation'),
    work: value('work'),
    ...(partner ? { partner } : {}),
    ...(home ? { home } : {}),
    ...(workMove ? { workMove } : {}),
    ...(exam ? { exam } : {}),
    ...(birthTimeKnown === false ? { birthTimeKnown } : {}),
  }
}

function authConfig() {
  const callbackUrl = SUPABASE_URL ? `${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/callback` : ''

  return {
    enabled: Boolean(SUPABASE_URL && SUPABASE_PUBLIC_KEY),
    developmentReportAccess: !SUPABASE_URL && !SUPABASE_PUBLIC_KEY && !process.env.VERCEL && process.env.NODE_ENV !== 'production',
    url: SUPABASE_URL,
    callbackUrl,
    publishableKey: SUPABASE_PUBLIC_KEY,
    googleClientId: SUPABASE_GOOGLE_CLIENT_ID,
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

function userProfilePayload(profile: UserBirthProfile | null, owner?: ReportOwner) {
  return {
    profile,
    complete: Boolean(profile?.name && profile.birth.year && profile.birth.month && profile.birth.day),
    storage: getUserProfileStorageMode(),
    admin: isAdminOwner(owner),
  }
}

async function toUiAnalysis(
  birth: BirthInput,
  context: SajuReportContext = {},
  owner?: ReportOwner,
  access?: PaidAccess,
) {
  const analysis = analyzeSaju(birth)
  const enrichedContext = await enrichHomeTerrainContext(enrichReportContext(context))
  const reportId = createReportId(birth, enrichedContext, undefined, owner?.id)
  const templateReport = buildTemplateSajuReport(analysis, birth, enrichedContext)
  const { record } = await createOrGetReportRecord({
    reportId,
    birth,
    context: enrichedContext,
    templateReport,
    analysis,
    owner,
  })

  // Creation and GET do not generate paid text. The reader requests bounded sections
  // and each generation request stays open until its result is safely stored.

  const report = toClientReport(record)
  if (access) applyReportEntitlement(report, access, owner)
  const payload = buildUiAnalysisPayload(record.analysis ?? analysis, record.birth, report)
  if (access && !access.entitled) return { ...payload, ...savedPreviewResponse(record) }
  return payload
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
  const analysis = record.analysis ?? analyzeSaju(record.birth)
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
    ...(context.serviceKey === LOVE_THIS_YEAR_SERVICE_KEY ? { partner: context.partner || { mode: 'none' } } : {}),
    ...(context.serviceKey === HOME_FIT_SERVICE_KEY ? { home: context.home || {} } : {}),
    orientation: context.orientation || '',
    relationship: context.relationship || '',
    work: context.work || '',
    concern: context.concern || '',
  }
}

function clientReportContext(record: ReportRecord): SajuReportContext {
  return Object.fromEntries(Object.entries(record.context).filter(([key]) => key !== 'savedChat'))
}

function historyEntryFromRecord(record: ReportRecord) {
  const analysis = toUiAnalysisFromRecord(record)
  // Lists are metadata, not an alternate paid-content endpoint. Open the ID for entitlement checks.
  analysis.report.sections = []
  const birthState = birthStateFromRecord(record)
  const savedAt = record.updatedAt || record.createdAt || new Date().toISOString()

  return {
    reportId: record.reportId,
    resultId: analysis.report.resultId,
    publicUrl: analysis.report.publicUrl,
    preview: guardPreview(record.preview ?? createSavedPreview(record.report, record.context), record.context),
    serviceKey: record.context?.serviceKey || 'cmdg',
    serviceHref: serviceHrefForKey(record.context?.serviceKey),
    savedAt,
    title: `${birthState.name || birthState.target || '당신'} · ${birthState.calendar} ${birthState.birth}`,
    birth: record.birth,
    birthState,
    context: clientReportContext(record),
    analysis,
    progress: analysis.report?.progress,
    storage: analysis.report?.storage,
    corpusFingerprint: analysis.report?.corpus?.fingerprint,
    chatHistory: [],
    initialConcern: record.context?.concern || '',
  }
}

/** Names the pieces still blocking checkout so operators can act without reading logs. */
function paymentSetupMessage(inicisReady: boolean, storage: PaymentStorageMode): string {
  const missing: string[] = []
  if (!inicisReady) missing.push('이니시스 MID·SignKey (INICIS_MID, INICIS_SIGNKEY)')
  if (storage === 'memory') missing.push('결제 주문 저장소 (SUPABASE_SERVICE_ROLE_KEY 또는 DATABASE_URL)')
  if (missing.length === 0) return ''
  return `결제 모듈 연결 전입니다. 남은 설정: ${missing.join(' / ')}.`
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
    storageReady: storage !== 'memory',
    catalog: listPaymentProducts()
      .filter((product) => !PUBLICLY_DISABLED_PRODUCT_KEYS.has(product.key))
      .map(publicPaymentProduct),
    setupMessage: enabled || testMode ? '' : paymentSetupMessage(inicis.enabled, storage),
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

function paymentOrderRedirect(
  orderId: string,
  state: 'paid' | 'failed' | 'cancelled',
  message?: string,
  productKey?: string,
  reportId?: string,
): string {
  const params = new URLSearchParams({ orderId, state })
  if (message) params.set('message', message.slice(0, 180))
  if (productKey) params.set('product', productKey)
  if (reportId) params.set('reportId', reportId)
  return `/payment/result?${params.toString()}`
}

/** Report serviceKey -> payment catalog product that unlocks it. */
const PRODUCT_KEY_BY_SERVICE_KEY: Record<string, string> = {
  [LOVE_THIS_YEAR_SERVICE_KEY]: 'love_this_year',
  [HOME_FIT_SERVICE_KEY]: 'home_pungsu',
  home_pungsu: 'home_pungsu',
  [WORK_MOVE_SERVICE_KEY]: 'work_move',
  [PASS_ANGLE_SERVICE_KEY]: 'pass_angle',
  money_save: 'money_save',
  match_couple: 'match_couple',
  work_job: 'work_job',
  quit_fortune: 'quit_fortune',
  job_choice: 'job_choice',
  cat_compatibility: 'cat_compatibility',
  lucky_color: 'lucky_color',
  newyear_flow: 'newyear_flow',
  wedding_day: 'wedding_day',
  couple_signal: 'couple_signal',
  marry_match: 'marry_match',
  love_mind: 'love_mind',
  love_again: 'love_again',
  love_spouse: 'love_spouse',
}
/** The full 천명사주 reading, used whenever a report carries no specialised serviceKey. */
const DEFAULT_PRODUCT_KEY = 'cmdg'

function productKeyForContext(context: SajuReportContext): string {
  const serviceKey = trimmedString(context.serviceKey)
  if (!serviceKey) return DEFAULT_PRODUCT_KEY
  return PRODUCT_KEY_BY_SERVICE_KEY[serviceKey] ?? DEFAULT_PRODUCT_KEY
}

/** Checkout link carrying the report binding, so the order unlocks exactly this reading. */
function paymentCheckoutUrl(productKey: string, reportId = ''): string {
  const product = getPaymentProduct(productKey)
  const params = new URLSearchParams({ product: productKey, returnTo: product?.returnPath || '/' })
  if (reportId) params.set('reportId', reportId)
  return `/payment?${params.toString()}`
}

/**
 * Until the PG is actually wired every reading is free: the gate stays open and reports
 * come back unlocked, so readers go straight from the preview into the full text. The
 * gate engages the moment INICIS keys (or payment test mode) land.
 */
function isCheckoutLive(): boolean {
  const config = paymentConfigPayload()
  return config.configured || config.testMode
}

/**
 * A settled order unlocks a report when it belongs to the caller, was bought for the same
 * product, and is either bound to that report or was created before any report id existed.
 */
function orderUnlocks(order: PaymentOrder, owner: ReportOwner, productKey: string, reportId: string): boolean {
  if (order.ownerId !== owner.id || order.productKey !== productKey) return false
  if (order.status !== 'paid' && order.status !== 'viewed') return false
  if (!order.reportId || !reportId) return true
  return order.reportId === reportId
}

/** Finds a settled order for this reading so a paid reader can reopen it on any later visit. */
async function findUnlockingOrder(
  owner: ReportOwner,
  productKey: string,
  reportId: string,
): Promise<PaymentOrder | null> {
  const bound = await listPaymentOrders(owner.id, 100, reportId).catch(() => [] as PaymentOrder[])
  const exact = bound.find((order) => orderUnlocks(order, owner, productKey, reportId))
  if (exact) return exact
  // Retain legacy unbound-order compatibility; current orders use the exact report ID lookup above.
  const orders = await listPaymentOrders(owner.id, 100).catch(() => [] as PaymentOrder[])
  const unlocking = orders.filter((order) => orderUnlocks(order, owner, productKey, reportId))
  return unlocking.find((order) => order.reportId === reportId) ?? unlocking[0] ?? null
}

interface PaidAccess {
  entitled: boolean
  reason: 'admin' | 'open' | 'order' | 'none'
  order?: PaymentOrder
}

async function resolvePaidAccess(
  req: Request,
  owner: ReportOwner | undefined,
  productKey: string,
  reportId = '',
): Promise<PaidAccess> {
  if (isAdminOwner(owner)) return { entitled: true, reason: 'admin' }
  if (!isCheckoutLive()) return { entitled: true, reason: 'open' }
  if (!owner) return { entitled: false, reason: 'none' }

  const orderId = trimmedString(req.body?.orderId) || trimmedString(req.query?.orderId)
  if (orderId) {
    const order = await getPaymentOrder(orderId).catch(() => null)
    if (order && orderUnlocks(order, owner, productKey, reportId)) {
      return { entitled: true, reason: 'order', order }
    }
  }
  const order = await findUnlockingOrder(owner, productKey, reportId)
  return order ? { entitled: true, reason: 'order', order } : { entitled: false, reason: 'none' }
}

/** Stamps the unlock flags the report UI reads before revealing paid chapters. */
function applyReportEntitlement(report: SajuReport, access: PaidAccess, owner?: ReportOwner): SajuReport {
  if (!access.entitled) {
    report.sections = []
    report.isPaid = report.paid = false
    return report
  }
  if (access.reason === 'admin') return applyAdminReportUnlock(report, owner)
  report.isPaid = true
  report.paid = true
  report.entitlement = 'paid'
  report.paymentStatus = 'paid'
  report.unlockReason = access.reason
  return report
}

async function ensurePaidServiceAccess(
  req: Request,
  res: Response,
  owner: ReportOwner,
  productKey: string,
  reportId = '',
): Promise<boolean> {
  if (isAdminOwner(owner)) return true
  if (!isCheckoutLive()) return true
  const config = paymentConfigPayload()
  if (!config.checkoutEnabled) {
    res.status(503).json({ code: 'PAYMENT_NOT_CONFIGURED', error: config.setupMessage })
    return false
  }
  const access = await resolvePaidAccess(req, owner, productKey, reportId)
  if (access.entitled) return true
  res.status(402).json({
    code: 'PAYMENT_REQUIRED',
    error: '결제 후 풀이를 열 수 있습니다.',
    productKey,
    reportId: reportId || undefined,
    paymentUrl: paymentCheckoutUrl(productKey, reportId),
  })
  return false
}

app.get('/api/health', async (req, res) => {
  // 배포 반영 여부를 URL 하나로 확인할 수 있게 코퍼스 지문을 같이 내려준다. 팩 목록과
  // 해시뿐이고 내용은 담지 않는다.
  const corpus = getCorpusSnapshot()
  const reportStorage = req.query.storage === '1' ? await checkReportStorageReadiness() : undefined
  res.setHeader('Cache-Control', 'no-store')
  res.status(reportStorage && !reportStorage.ok ? 503 : 200).json({
    ok: reportStorage ? reportStorage.ok : true,
    openai: isOpenAiConfigured(),
    ...(reportStorage ? { reportStorage } : {}),
    corpus: {
      registryVersion: corpus.registryVersion,
      fingerprint: corpus.fingerprint,
      packs: corpus.activePacks.map((pack) => ({ id: pack.id, version: pack.version, contentHash: pack.contentHash })),
    },
  })
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
    if (PUBLICLY_DISABLED_PRODUCT_KEYS.has(product.key)) {
      res.status(404).json({ error: '현재 공개하지 않는 서비스입니다.' })
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
      reportId: trimmedString(req.body?.reportId) || undefined,
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
      res.redirect(303, paymentOrderRedirect(order.orderId, 'paid', undefined, order.productKey, order.reportId))
      return
    }

    const resultCode = trimmedString(body.resultCode || body.P_STATUS)
    const resultMessage = trimmedString(body.resultMsg || body.P_RMESG1) || '결제가 취소되었거나 승인되지 않았습니다.'
    if (resultCode !== '0000') {
      await updatePaymentOrder(order.orderId, { status: 'failed', message: resultMessage })
      res.redirect(303, paymentOrderRedirect(order.orderId, 'failed', resultMessage, order.productKey, order.reportId))
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
    res.redirect(303, paymentOrderRedirect(order.orderId, 'paid', undefined, order.productKey, order.reportId))
  } catch (err) {
    const message = err instanceof Error ? err.message : '결제 승인에 실패했습니다.'
    await updatePaymentOrder(orderId, { status: 'failed', message }).catch(() => undefined)
    const failedOrder = await getPaymentOrder(orderId).catch(() => null)
    res.redirect(303, paymentOrderRedirect(orderId, 'failed', message, failedOrder?.productKey, failedOrder?.reportId))
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
    res.json(userProfilePayload(profile, owner))
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
    res.json(userProfilePayload(saved, owner))
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : '사주 프로필 저장 실패' })
  }
}

app.post('/api/user/profile', saveUserProfileHandler)
app.put('/api/user/profile', saveUserProfileHandler)

/** The 검색 page lists every service from here, so price and title stay in one place. */
app.get('/api/services', (_req, res) => {
  res.json({ services: listServiceDirectory() })
})

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

    const daily = await savedDailyFortune(profile, owner)
    res.json({
      userId: owner.id,
      complete: true,
      profile,
      analysis: analyzeSaju(profile.birth),
      todayFortune: { ...daily.auxiliary?.todayFortune, reportId: daily.reportId, resultId: daily.resultId, publicUrl: toClientReport(daily).publicUrl },
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
    const requestedId = trimmedString(req.body?.reportId || req.body?.resultId)
    if (requestedId) {
      const existing = await findReportRecord(requestedId, owner)
      if (!existing?.auxiliary?.todayFortune) { res.status(404).json({ error: '저장된 오늘의 운세를 찾지 못했습니다.' }); return }
      res.json({ todayFortune: existing.auxiliary.todayFortune, reportId: existing.reportId, resultId: existing.resultId, publicUrl: toClientReport(existing).publicUrl })
      return
    }
    const profile = await getUserBirthProfile(owner)
    if (!profile) {
      res.status(409).json({ code: 'PROFILE_REQUIRED', error: '오늘의 운세를 보려면 기본 사주 정보를 먼저 입력해 주세요.' })
      return
    }
    const record = await savedDailyFortune(profile, owner)
    res.json({
      todayFortune: record.auxiliary?.todayFortune,
      reportId: record.reportId, resultId: record.resultId, publicUrl: toClientReport(record).publicUrl,
      ...userProfilePayload(profile, owner),
    })
  } catch (err) {
    if (err instanceof Error && err.message === 'REPORT_ACCESS_DENIED') { res.status(403).json({ error: '다른 계정의 해석은 볼 수 없습니다.' }); return }
    res.status(500).json({ error: err instanceof Error ? err.message : '오늘의 운세 생성 실패' })
  }
})

function wantsPreview(req: Request): boolean {
  return req.body?.preview === true || req.query.preview === '1'
}

function savedPreviewResponse(record: ReportRecord) {
  const report = toClientReport(record)
  return {
    previewOnly: true,
    reportId: record.reportId,
    resultId: report.resultId,
    publicId: report.publicId,
    publicUrl: report.publicUrl,
    serviceKey: record.context.serviceKey ?? 'saju_master',
    preview: guardPreview(record.preview ?? createSavedPreview(record.report, record.context), record.context),
    paymentUrl: paymentCheckoutUrl(productKeyForContext(record.context), record.reportId),
  }
}

async function serveSavedChat(req: Request, res: Response, record: ReportRecord, owner: ReportOwner | undefined, generate = false): Promise<void> {
  if (!owner) { res.status(401).json({ error: '로그인 후 저장된 상담을 볼 수 있습니다.' }); return }
  const parentId = savedChatParentId(record)
  if (parentId) {
    const parent = await findReportRecord(parentId, owner)
    if (!parent) { res.status(404).json({ error: '상담의 원본 해석을 찾지 못했습니다.' }); return }
    if (!await ensurePaidServiceAccess(req, res, owner, productKeyForContext(parent.context), parent.reportId)) return
  }
  const result = generate ? await generateSavedChat({ resultId: record.reportId, owner, retry: req.body?.retry === true }) : toSavedChatResult(record)
  const saved = generate ? await findReportRecord(record.reportId, owner) : record
  res.status(result.status === 'failed' ? (generate ? 502 : 200) : result.status === 'complete' ? 200 : 202).json({ ...result, report: toClientReport(saved ?? record), context: clientReportContext(record), birth: record.birth })
}

async function sendSpecializedPreview(req: Request, res: Response, params: Parameters<typeof createOrGetReportRecord>[0]): Promise<boolean> {
  if (!wantsPreview(req)) return false
  const { record } = await createOrGetReportRecord(params)
  res.json(savedPreviewResponse(record))
  return true
}

// ID is a locator, never an authorization credential. This page itself has no private data.
app.get('/r/:resultId', (_req, res) => res.sendFile(resolve(SAJU_ROOT, 'report-view.html')))

const ANALYZE_SERVICES: Record<string, string> = {
  '/api/money/save/analyze': 'money_save', '/api/match/couple/analyze': 'match_couple',
  '/api/match/marry/analyze': 'marry_match', '/api/work/job/analyze': 'work_job',
  '/api/work/quit/analyze': 'quit_fortune', '/api/work/job-choice/analyze': 'job_choice',
  '/api/match/cat/analyze': 'cat_compatibility', '/api/me/lucky/analyze': 'lucky_color',
  '/api/love/mind/analyze': 'love_mind', '/api/love/signal/analyze': 'couple_signal',
  '/api/love/this-year/analyze': 'love_this_year', '/api/love/again/analyze': 'love_again',
  '/api/love/spouse/analyze': 'love_spouse',
  '/api/flow/newyear/analyze': 'newyear_flow',
  '/api/day/wedding/analyze': 'wedding_day',
}

app.post(/\/api\/.*\/analyze$/, async (req, res, next) => {
  const id = trimmedString(req.body?.reportId || req.body?.resultId)
  if (!id) { next(); return }
  try {
    const owner = await verifySupabaseUser(req)
    if (!authConfig().developmentReportAccess && !owner) { res.status(401).json({ error: '로그인이 필요합니다.' }); return }
    const record = await findReportRecord(id, owner)
    if (!record) { res.status(404).json({ error: '저장된 결과를 찾지 못했습니다. 새 결과로 대체하지 않습니다.' }); return }
    const expected = ANALYZE_SERVICES[req.path]
    if (expected && record.context.serviceKey !== expected) { res.status(409).json({ error: '다른 서비스의 결과 ID입니다.' }); return }
    if (isSavedChatRecord(record)) { await serveSavedChat(req, res, record, owner); return }
    const access = await resolvePaidAccess(req, owner, productKeyForContext(record.context), record.reportId)
    if (wantsPreview(req) || !access.entitled) { res.json(savedPreviewResponse(record)); return }
    const analysis = toUiAnalysisFromRecord(record)
    if (record.auxiliary?.todayFortune) {
      res.json({ todayFortune: record.auxiliary.todayFortune, report: analysis.report, reportId: record.reportId, resultId: analysis.report.resultId, publicUrl: analysis.report.publicUrl, birth: record.birth, context: record.context, analysis })
      return
    }
    applyReportEntitlement(analysis.report, access, owner)
    res.json({ report: analysis.report, reportId: record.reportId, resultId: analysis.report.resultId, publicUrl: analysis.report.publicUrl, birth: record.birth, context: record.context, analysis, cached: true })
  } catch (error) {
    const denied = error instanceof Error && error.message === 'REPORT_ACCESS_DENIED'
    res.status(denied ? 403 : 500).json({ error: denied ? '본인의 해석만 조회할 수 있습니다.' : '저장된 해석 조회에 실패했습니다.' })
  }
})

app.post('/api/money/save/analyze', async (req, res) => {
  try {
    const owner = await requireSupabaseUser(req, res)
    if (!owner) return
    const profile = await getUserBirthProfile(owner)
    if (!profile) {
      res.status(409).json({ code: 'PROFILE_REQUIRED', error: '소비성향을 보려면 기본 사주 정보를 먼저 등록해 주세요.' })
      return
    }

    const input = parseMoneySaveRequest(req.body)
    const context = { ...buildMoneySaveContext(profile.name, input), birthTimeKnown: profile.birthTimeKnown }
    const analysis = analyzeSaju(profile.birth)
    const reportId = withReportBirthCertainty(createMoneySaveReportId(owner.id, profile.birth, input), profile.birthTimeKnown)
    const templateReport = buildMoneySaveReport(analysis, profile.birth, context, input, reportId)
    if (await sendSpecializedPreview(req, res, { reportId, birth: profile.birth, context, templateReport, analysis, owner })) return
    if (!await ensurePaidServiceAccess(req, res, owner, 'money_save', reportId)) return
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

app.post('/api/match/couple/analyze', async (req, res) => {
  try {
    const owner = await requireSupabaseUser(req, res)
    if (!owner) return
    const profile = await getUserBirthProfile(owner)
    if (!profile) {
      res.status(409).json({ code: 'PROFILE_REQUIRED', error: '커플궁합을 보려면 기본 사주 정보를 먼저 등록해 주세요.' })
      return
    }

    const input = parseCoupleMatchRequest(req.body)
    const partnerAnalysis = analyzeSaju(input.partnerBirth)
    const context = { ...buildCoupleMatchContext(profile.name, input, partnerAnalysis), birthTimeKnown: profile.birthTimeKnown }
    const analysis = analyzeSaju(profile.birth)
    const reportId = withReportBirthCertainty(createCoupleMatchReportId(owner.id, profile.birth, input), profile.birthTimeKnown)
    const templateReport = buildCoupleMatchReport(analysis, partnerAnalysis, profile.birth, context, input, reportId)
    if (await sendSpecializedPreview(req, res, { reportId, birth: profile.birth, context, templateReport, analysis, owner })) return
    if (!await ensurePaidServiceAccess(req, res, owner, 'match_couple', reportId)) return
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

app.post('/api/work/job/analyze', async (req, res) => {
  try {
    const owner = await requireSupabaseUser(req, res)
    if (!owner) return
    const profile = await getUserBirthProfile(owner)
    if (!profile) {
      res.status(409).json({ code: 'PROFILE_REQUIRED', error: '직업운을 보려면 기본 사주 정보를 먼저 등록해 주세요.' })
      return
    }

    const input = parseWorkJobRequest(req.body)
    const context = { ...buildWorkJobContext(profile.name, input), birthTimeKnown: profile.birthTimeKnown }
    const analysis = analyzeSaju(profile.birth)
    const reportId = withReportBirthCertainty(createWorkJobReportId(owner.id, profile.birth, input), profile.birthTimeKnown)
    const templateReport = buildWorkJobReport(analysis, profile.birth, context, input, reportId)
    if (await sendSpecializedPreview(req, res, { reportId, birth: profile.birth, context, templateReport, analysis, owner })) return
    if (!await ensurePaidServiceAccess(req, res, owner, 'work_job', reportId)) return
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

app.post('/api/work/quit/analyze', async (req, res) => {
  try {
    const owner = await requireSupabaseUser(req, res)
    if (!owner) return
    const profile = await getUserBirthProfile(owner)
    if (!profile) {
      res.status(409).json({ code: 'PROFILE_REQUIRED', error: '퇴사운을 보려면 기본 사주 정보를 먼저 등록해 주세요.' })
      return
    }

    const input = parseWorkQuitRequest(req.body)
    const context = { ...buildWorkQuitContext(profile.name, input), birthTimeKnown: profile.birthTimeKnown }
    const analysis = analyzeSaju(profile.birth)
    const reportId = withReportBirthCertainty(createWorkQuitReportId(owner.id, profile.birth, input), profile.birthTimeKnown)
    const templateReport = buildWorkQuitReport(analysis, profile.birth, context, input, reportId)
    if (await sendSpecializedPreview(req, res, { reportId, birth: profile.birth, context, templateReport, analysis, owner })) return
    if (!await ensurePaidServiceAccess(req, res, owner, 'quit_fortune', reportId)) return
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
    res.status(500).json({ error: err instanceof Error ? err.message : '퇴사운 생성 실패' })
  }
})

app.post('/api/work/job-choice/analyze', async (req, res) => {
  try {
    const owner = await requireSupabaseUser(req, res)
    if (!owner) return
    const profile = await getUserBirthProfile(owner)
    if (!profile) {
      res.status(409).json({ code: 'PROFILE_REQUIRED', error: '직장 선택 풀이를 보려면 기본 사주 정보를 먼저 등록해 주세요.' })
      return
    }

    const input = parseJobChoiceRequest(req.body)
    const context = { ...buildJobChoiceContext(profile.name, input), birthTimeKnown: profile.birthTimeKnown }
    const analysis = analyzeSaju(profile.birth)
    const reportId = withReportBirthCertainty(createJobChoiceReportId(owner.id, profile.birth, input), profile.birthTimeKnown)
    const templateReport = buildJobChoiceReport(analysis, profile.birth, context, input, reportId)
    if (await sendSpecializedPreview(req, res, { reportId, birth: profile.birth, context, templateReport, analysis, owner })) return
    if (!await ensurePaidServiceAccess(req, res, owner, 'job_choice', reportId)) return
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
    res.status(500).json({ error: err instanceof Error ? err.message : '직장 선택 풀이 생성 실패' })
  }
})

app.post('/api/match/cat/analyze', async (req, res) => {
  try {
    const owner = await requireSupabaseUser(req, res)
    if (!owner) return
    const profile = await getUserBirthProfile(owner)
    if (!profile) {
      res.status(409).json({ code: 'PROFILE_REQUIRED', error: '고양이 궁합을 보려면 집사님의 기본 사주 정보를 먼저 등록해 주세요.' })
      return
    }

    const input = parseCatCompatRequest(req.body)
    const context = { ...buildCatCompatContext(profile.name, input), birthTimeKnown: profile.birthTimeKnown }
    const analysis = analyzeSaju(profile.birth)
    const reportId = withReportBirthCertainty(createCatCompatReportId(owner.id, profile.birth, input), profile.birthTimeKnown)
    const templateReport = buildCatCompatReport(analysis, profile.birth, context, input, reportId)
    if (await sendSpecializedPreview(req, res, { reportId, birth: profile.birth, context, templateReport, analysis, owner })) return
    if (!await ensurePaidServiceAccess(req, res, owner, 'cat_compatibility', reportId)) return
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
    res.status(500).json({ error: err instanceof Error ? err.message : '고양이 궁합 생성 실패' })
  }
})

app.post('/api/day/wedding/analyze', async (req, res) => {
  try {
    const owner = await requireSupabaseUser(req, res)
    if (!owner) return
    const profile = await getUserBirthProfile(owner)
    if (!profile) {
      res.status(409).json({ code: 'PROFILE_REQUIRED', error: '결혼 택일을 보려면 기본 사주 정보를 먼저 등록해 주세요.' })
      return
    }

    const input = parseWeddingRequest(req.body)
    input.birthTimeKnown = profile.birthTimeKnown
    if (input.candidateDates.length === 0) {
      res.status(400).json({ error: '후보일을 하나 이상 골라 주세요. 날짜가 있어야 조건을 비교할 수 있습니다.' })
      return
    }
    const context = { ...buildWeddingContext(profile.name, input), birthTimeKnown: profile.birthTimeKnown }
    const analysis = analyzeSaju(profile.birth)
    const reportId = withReportBirthCertainty(createWeddingReportId(analysis, profile.birth, input) + '-' + owner.id, profile.birthTimeKnown)
    const teaser = buildWeddingTeaser(analysis, input, context)
    Object.assign(context, { wedding: { facts: teaser.frame, teaser: { headline: teaser.headline, lines: teaser.lines } } })
    const templateReport = buildWeddingReport(analysis, profile.birth, context, input, reportId)
    if (await sendSpecializedPreview(req, res, { reportId, birth: profile.birth, context, templateReport, analysis, owner })) return
    if (!await ensurePaidServiceAccess(req, res, owner, 'wedding_day', reportId)) return
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
    res.status(500).json({ error: err instanceof Error ? err.message : '결혼 택일 풀이 생성 실패' })
  }
})

app.post('/api/flow/newyear/analyze', async (req, res) => {
  try {
    const owner = await requireSupabaseUser(req, res)
    if (!owner) return
    const profile = await getUserBirthProfile(owner)
    if (!profile) {
      res.status(409).json({ code: 'PROFILE_REQUIRED', error: '2027년 흐름을 보려면 기본 사주 정보를 먼저 등록해 주세요.' })
      return
    }

    const input = parseNewYearRequest(req.body)
    const analysis = analyzeSaju(profile.birth)
    const context = buildNewYearContext(profile.name, input, analysis, profile.birthTimeKnown)
    const reportId = createNewYearReportId(analysis, profile.birth, owner.id, context)
    const templateReport = buildNewYearReport(analysis, profile.birth, context, input, reportId)
    if (await sendSpecializedPreview(req, res, { reportId, birth: profile.birth, context, templateReport, analysis, owner })) return
    if (!await ensurePaidServiceAccess(req, res, owner, 'newyear_flow', reportId)) return
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
    res.status(500).json({ error: err instanceof Error ? err.message : '2027년 흐름 풀이 생성 실패' })
  }
})

app.post('/api/me/lucky/analyze', async (req, res) => {
  try {
    const owner = await requireSupabaseUser(req, res)
    if (!owner) return
    const profile = await getUserBirthProfile(owner)
    if (!profile) {
      res.status(409).json({ code: 'PROFILE_REQUIRED', error: '색과 물건을 보려면 기본 사주 정보를 먼저 등록해 주세요.' })
      return
    }

    const input = parseLuckyColorRequest(req.body)
    const context = { ...buildLuckyColorContext(profile.name, input), birthTimeKnown: profile.birthTimeKnown }
    const analysis = analyzeSaju(profile.birth)
    const reportId = withReportBirthCertainty(createLuckyColorReportId(owner.id, profile.birth, input), profile.birthTimeKnown)
    const templateReport = buildLuckyColorReport(analysis, profile.birth, context, input, reportId)
    if (await sendSpecializedPreview(req, res, { reportId, birth: profile.birth, context, templateReport, analysis, owner })) return
    if (!await ensurePaidServiceAccess(req, res, owner, 'lucky_color', reportId)) return
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
    res.status(500).json({ error: err instanceof Error ? err.message : '색과 물건 풀이 생성 실패' })
  }
})

app.post('/api/match/marry/analyze', async (req, res) => {
  try {
    const owner = await requireSupabaseUser(req, res)
    if (!owner) return
    const profile = await getUserBirthProfile(owner)
    if (!profile) {
      res.status(409).json({ code: 'PROFILE_REQUIRED', error: '결혼궁합을 보려면 기본 사주 정보를 먼저 등록해 주세요.' })
      return
    }

    const input = parseMarryMatchRequest(req.body)
    const partnerAnalysis = analyzeSaju(input.partnerBirth)
    const context = { ...buildMarryMatchContext(profile.name, input, partnerAnalysis), birthTimeKnown: profile.birthTimeKnown }
    const analysis = analyzeSaju(profile.birth)
    const reportId = withReportBirthCertainty(createMarryMatchReportId(owner.id, profile.birth, input), profile.birthTimeKnown)
    const templateReport = buildMarryMatchReport(analysis, partnerAnalysis, profile.birth, context, input, reportId)
    if (await sendSpecializedPreview(req, res, { reportId, birth: profile.birth, context, templateReport, analysis, owner })) return
    if (!await ensurePaidServiceAccess(req, res, owner, 'marry_match', reportId)) return
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

app.post('/api/love/mind/analyze', async (req, res) => {
  try {
    const owner = await requireSupabaseUser(req, res)
    if (!owner) return
    const profile = await getUserBirthProfile(owner)
    if (!profile) {
      res.status(409).json({ code: 'PROFILE_REQUIRED', error: '상대방 마음을 보려면 기본 사주 정보를 먼저 등록해 주세요.' })
      return
    }

    const input = parseLoveMindRequest(req.body)
    const partnerAnalysis = input.partnerBirth ? analyzeSaju(input.partnerBirth) : undefined
    const context = { ...buildLoveMindContext(profile.name, input, partnerAnalysis), birthTimeKnown: profile.birthTimeKnown }
    const analysis = analyzeSaju(profile.birth)
    const reportId = withReportBirthCertainty(createLoveMindReportId(owner.id, profile.birth, input), profile.birthTimeKnown)
    const templateReport = buildLoveMindReport(analysis, profile.birth, context, input, partnerAnalysis, reportId)
    if (await sendSpecializedPreview(req, res, { reportId, birth: profile.birth, context, templateReport, analysis, owner })) return
    if (!await ensurePaidServiceAccess(req, res, owner, 'love_mind', reportId)) return
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

app.post('/api/love/signal/analyze', async (req, res) => {
  try {
    const owner = await requireSupabaseUser(req, res)
    if (!owner) return
    const profile = await getUserBirthProfile(owner)
    if (!profile) {
      res.status(409).json({ code: 'PROFILE_REQUIRED', error: '관계 신호를 보려면 기본 사주 정보를 먼저 등록해 주세요.' })
      return
    }

    const input = parseLoveSignalRequest(req.body)
    const partnerAnalysis = analyzeSaju(input.partnerBirth)
    const context = { ...buildLoveSignalContext(profile.name, input, partnerAnalysis), birthTimeKnown: profile.birthTimeKnown }
    const analysis = analyzeSaju(profile.birth)
    const reportId = withReportBirthCertainty(createLoveSignalReportId(owner.id, profile.birth, input), profile.birthTimeKnown)
    const templateReport = buildLoveSignalReport(analysis, partnerAnalysis, profile.birth, context, input, reportId)
    if (await sendSpecializedPreview(req, res, { reportId, birth: profile.birth, context, templateReport, analysis, owner })) return
    if (!await ensurePaidServiceAccess(req, res, owner, 'couple_signal', reportId)) return
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
    res.status(500).json({ error: err instanceof Error ? err.message : '관계 신호 생성 실패' })
  }
})

app.post('/api/love/this-year/analyze', async (req, res) => {
  try {
    const owner = await requireSupabaseUser(req, res)
    if (!owner) return
    const profile = await getUserBirthProfile(owner)
    if (!profile) {
      res.status(409).json({ code: 'PROFILE_REQUIRED', error: '올해 연애운을 보려면 기본 사주 정보를 먼저 등록해 주세요.' })
      return
    }

    const body = { ...((req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>) }
    if (!trimmedString(body.gender) && !trimmedString(body.genderBasis) && profile.birth.gender) {
      body.gender = profile.birth.gender
    }
    const input = parseLoveThisYearRequest(body)
    const context = { ...buildLoveThisYearContext(profile.name, input), birthTimeKnown: profile.birthTimeKnown }
    const analysis = analyzeSaju(profile.birth)
    const reportId = withReportBirthCertainty(createLoveThisYearReportId(owner.id, profile.birth, input), profile.birthTimeKnown)
    const templateReport = buildLoveThisYearReport(analysis, profile.birth, context, input, reportId)
    if (await sendSpecializedPreview(req, res, { reportId, birth: profile.birth, context, templateReport, analysis, owner })) return
    if (!await ensurePaidServiceAccess(req, res, owner, 'love_this_year', reportId)) return
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
    res.status(500).json({ error: err instanceof Error ? err.message : '올해 연애운 생성 실패' })
  }
})

app.post('/api/love/again/analyze', async (req, res) => {
  try {
    const owner = await requireSupabaseUser(req, res)
    if (!owner) return
    const profile = await getUserBirthProfile(owner)
    if (!profile) {
      res.status(409).json({ code: 'PROFILE_REQUIRED', error: '재회운을 보려면 기본 사주 정보를 먼저 등록해 주세요.' })
      return
    }

    const input = parseLoveAgainRequest(req.body)
    const partnerAnalysis = input.partnerBirth ? analyzeSaju(input.partnerBirth) : undefined
    const context = { ...buildLoveAgainContext(profile.name, input, partnerAnalysis), birthTimeKnown: profile.birthTimeKnown }
    const analysis = analyzeSaju(profile.birth)
    const reportId = withReportBirthCertainty(createLoveAgainReportId(owner.id, profile.birth, input), profile.birthTimeKnown)
    const templateReport = buildLoveAgainReport(analysis, profile.birth, context, input, partnerAnalysis, reportId)
    if (await sendSpecializedPreview(req, res, { reportId, birth: profile.birth, context, templateReport, analysis, owner })) return
    if (!await ensurePaidServiceAccess(req, res, owner, 'love_again', reportId)) return
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
    const profile = await getUserBirthProfile(owner)
    if (!profile) {
      res.status(409).json({ code: 'PROFILE_REQUIRED', error: '배우자운을 보려면 기본 사주 정보를 먼저 등록해 주세요.' })
      return
    }

    const input = parseLoveSpouseRequest(req.body)
    const context = { ...buildLoveSpouseContext(profile.name, input), birthTimeKnown: profile.birthTimeKnown }
    const analysis = analyzeSaju(profile.birth)
    const reportId = withReportBirthCertainty(createLoveSpouseReportId(owner.id, profile.birth, input), profile.birthTimeKnown)
    const templateReport = buildLoveSpouseReport(analysis, profile.birth, context, input, reportId)
    if (await sendSpecializedPreview(req, res, { reportId, birth: profile.birth, context, templateReport, analysis, owner })) return
    if (!await ensurePaidServiceAccess(req, res, owner, 'love_spouse', reportId)) return
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
    const requestedServiceKey = trimmedString(req.body?.context?.serviceKey || req.body?.context?.service_key || req.body?.serviceKey || req.body?.service_key)
    if (!HOME_FIT_PUBLICLY_ENABLED && [HOME_FIT_SERVICE_KEY, 'home_pungsu', 'home', 'home-fit', 'place-home', 'place/home'].includes(requestedServiceKey)) {
      res.status(404).json({ error: '현재 공개하지 않는 서비스입니다.' })
      return
    }
    const birthBody = asObject(req.body.birth)
    const birth = parseBirth(Object.keys(birthBody).length ? birthBody : req.body)
    const context = parseReportContext(req.body)
    const suppliedKey = requestedServiceKey
    if ((suppliedKey && suppliedKey !== 'saju_master' && !context.serviceKey) || context.serviceKey === LOVE_THIS_YEAR_SERVICE_KEY) {
      res.status(400).json({ error: '이 서비스는 전용 입력 경로에서 시작해 주세요. 다른 서비스의 일반 해석으로 대체하지 않습니다.' })
      return
    }
    if (!birth.year || !birth.month || !birth.day) {
      res.status(400).json({ error: '생년월일을 입력해 주세요.' })
      return
    }
    const owner = await verifySupabaseUser(req)
    if (!authConfig().developmentReportAccess && !owner) {
      res.status(401).json({ error: '회원가입 후 해석을 시작해 주세요.' })
      return
    }
    if (owner && context.name && isValidProfileName(context.name)) {
      await saveUserBirthProfile(
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
      )
    }
    const enriched = await enrichHomeTerrainContext(enrichReportContext(context))
    if (wantsPreview(req)) {
      const analysis = analyzeSaju(birth)
      const { record } = await createOrGetReportRecord({
        reportId: createReportId(birth, enriched, undefined, owner?.id), birth, context: enriched,
        analysis, templateReport: buildTemplateSajuReport(analysis, birth, enriched), owner,
      })
      res.json({ ...buildUiAnalysisPayload(analysis, birth, { ...toClientReport(record), sections: [] }), ...savedPreviewResponse(record) })
      return
    }
    const access = await resolvePaidAccess(
      req,
      owner,
      productKeyForContext(enriched),
      createReportId(birth, enriched, undefined, owner?.id),
    )
    res.json(await toUiAnalysis(birth, context, owner, access))
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '분석 실패' })
  }
})

app.get(['/api/report/:reportId', '/api/reports/:reportId'], async (req, res) => {
  try {
    const reportId = String(req.params.reportId ?? '').trim()
    const owner = await verifySupabaseUser(req)
    if (!authConfig().developmentReportAccess && !owner) { res.status(401).json({ error: '로그인 후 저장된 해석을 볼 수 있습니다.' }); return }
    const record = await findReportRecord(reportId, owner)
    if (!record) {
      res.status(404).json({ error: '저장된 리포트를 찾지 못했습니다.' })
      return
    }
    if (isSavedChatRecord(record)) { await serveSavedChat(req, res, record, owner); return }
    const analysis = toUiAnalysisFromRecord(record)
    if (record.auxiliary?.todayFortune) {
      res.json({ todayFortune: record.auxiliary.todayFortune, report: analysis.report, reportId: record.reportId, resultId: analysis.report.resultId, publicUrl: analysis.report.publicUrl, birth: record.birth, context: record.context, analysis })
      return
    }
    if (wantsPreview(req)) { res.json(savedPreviewResponse(record)); return }
    const access = await resolvePaidAccess(req, owner, productKeyForContext(record.context), record.reportId)
    if (!access.entitled) { res.json(savedPreviewResponse(record)); return }
    applyReportEntitlement(analysis.report, access, owner)
    res.json({
      report: analysis.report,
      reportId: record.reportId,
      resultId: analysis.report.resultId,
      publicUrl: analysis.report.publicUrl,
      birth: record.birth,
      context: record.context,
      analysis,
      chatHistory: record.chatHistory ?? [],
    })
  } catch (err) {
    const denied = err instanceof Error && err.message === 'REPORT_ACCESS_DENIED'
    res.status(denied ? 403 : 500).json({ error: denied ? '본인의 해석만 조회할 수 있습니다.' : '리포트 조회 실패' })
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
    if (!authConfig().developmentReportAccess && !owner) { res.status(401).json({ error: '로그인이 필요합니다.' }); return }
    const existing = await findReportRecord(reportId, owner)
    if (!existing) { res.status(404).json({ error: '저장된 해석을 찾지 못했습니다.' }); return }
    if (isSavedChatRecord(existing)) { res.status(409).json({ error: '완료된 상담 질문과 답변은 수정할 수 없습니다.' }); return }
    const record = await updateReportChatHistory(existing.reportId, history, owner)
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
    if (err instanceof Error && err.message === 'REPORT_ACCESS_DENIED') { res.status(403).json({ error: '다른 계정의 해석은 수정할 수 없습니다.' }); return }
    res.status(500).json({ error: err instanceof Error ? err.message : '상담 저장 실패' })
  }
})

app.post('/api/report/section', async (req, res) => {
  try {
    const owner = await verifySupabaseUser(req)
    if (!authConfig().developmentReportAccess && !owner) { res.status(401).json({ error: '로그인 후 이어서 볼 수 있습니다.' }); return }
    const id = trimmedString(req.body.reportId || req.body.resultId)
    const sectionId = trimmedString(req.body.sectionId)
    if (!id || !sectionId) { res.status(400).json({ error: 'reportId와 sectionId가 필요합니다.' }); return }
    const record = await findReportRecord(id, owner)
    if (!record) { res.status(404).json({ error: '저장된 해석을 찾지 못했습니다.' }); return }
    if (isSavedChatRecord(record)) {
      const section = record.report.sections[0]
      if (section.id !== sectionId && sectionGenerationId(record, section) !== sectionId) { res.status(404).json({ error: '저장된 항목을 찾지 못했습니다.' }); return }
      await serveSavedChat(req, res, record, owner, true); return
    }
    if (owner && !await ensurePaidServiceAccess(req, res, owner, productKeyForContext(record.context), record.reportId)) return
    const section = record.report.sections.find((item) => item.id === sectionId || sectionGenerationId(record, item) === sectionId)
    if (!section) { res.status(404).json({ error: '저장된 항목을 찾지 못했습니다.' }); return }
    if (section.status !== 'complete') {
      await generateReportSectionNow({
        reportId: record.reportId, sectionId: section.id, owner, birth: record.birth,
        context: record.context, analysis: record.analysis ?? analyzeSaju(record.birth), retry: req.body.retry === true,
      })
    }
    const latest = await findReportRecord(record.reportId, owner)
    const report = latest ? toClientReport(latest) : toClientReport(record)
    const saved = report.sections.find((item) => item.id === section.id)
    res.json({ section: saved, report, reportId: record.reportId, resultId: report.resultId, generatedBy: saved?.generatedBy, model: saved?.model })
  } catch (error) {
    const denied = error instanceof Error && error.message === 'REPORT_ACCESS_DENIED'
    res.status(denied ? 403 : 500).json({ error: denied ? '본인의 해석만 볼 수 있습니다.' : '해석 생성 또는 저장을 완료하지 못했습니다.' })
  }
})

app.post('/api/report/prewarm', async (req, res) => {
  try {
    const owner = await verifySupabaseUser(req)
    if (!authConfig().developmentReportAccess && !owner) { res.status(401).json({ error: '로그인이 필요합니다.' }); return }
    const id = trimmedString(req.body.reportId || req.body.resultId)
    const record = id ? await findReportRecord(id, owner) : null
    if (!record) { res.status(404).json({ error: '저장된 해석을 먼저 선택해 주세요.' }); return }
    if (isSavedChatRecord(record)) { await serveSavedChat(req, res, record, owner, true); return }
    if (owner && !await ensurePaidServiceAccess(req, res, owner, productKeyForContext(record.context), record.reportId)) return
    const next = record.status === 'complete' ? undefined : record.report.sections.find((item) => item.status === 'pending')
    if (next) await generateReportSectionNow({ reportId: record.reportId, sectionId: next.id, birth: record.birth, context: record.context, analysis: record.analysis ?? analyzeSaju(record.birth), owner })
    const saved = next ? await findReportRecord(record.reportId, owner) : record
    res.json({ report: toClientReport(saved ?? record) })
  } catch (error) {
    const denied = error instanceof Error && error.message === 'REPORT_ACCESS_DENIED'
    res.status(denied ? 403 : 500).json({ error: denied ? '본인의 해석만 볼 수 있습니다.' : '저장된 해석을 이어서 생성하지 못했습니다.' })
  }
})

app.post('/api/chat', async (req, res) => {
  try {
    const owner = await requireSupabaseUser(req, res)
    if (!owner) return
    const requestId = trimmedString(req.body.requestId)
    if (requestId) {
      const saved = await findSavedChatRequest(owner, requestId)
      if (saved) { await serveSavedChat(req, res, saved, owner, true); return }
    }
    const resultId = trimmedString(req.body.resultId)
    if (resultId) {
      const saved = await findReportRecord(resultId, owner)
      if (!saved || !isSavedChatRecord(saved)) { res.status(404).json({ error: '저장된 상담을 찾지 못했습니다.' }); return }
      await serveSavedChat(req, res, saved, owner, true)
      return
    }
    const parentReportId = trimmedString(req.body.parentReportId || req.body.reportId)
    if (parentReportId) {
      const parent = await findReportRecord(parentReportId, owner)
      if (!parent) { res.status(404).json({ error: '원본 해석을 찾지 못했습니다.' }); return }
      if (!await ensurePaidServiceAccess(req, res, owner, productKeyForContext(parent.context), parent.reportId)) return
    }
    const result = await generateSavedChat({
      owner, parentReportId: parentReportId || undefined,
      requestId: trimmedString(req.body.requestId) || undefined,
      birth: parentReportId ? undefined : parseBirth(req.body.birth ?? req.body),
      birthTimeKnown: req.body.birthTimeKnown !== false,
      message: String(req.body.message ?? '').trim(),
      history: parseConversationHistory(req.body.history),
      serviceKey: trimmedString(req.body.serviceKey || req.body.service_key) || undefined,
      retry: req.body.retry === true,
    })
    res.status(result.status === 'failed' ? 502 : result.status === 'complete' ? 200 : 202).json(result)
  } catch (err) {
    const code = err instanceof Error ? err.message : ''
    res.status(code === 'REPORT_ACCESS_DENIED' ? 403 : /INVALID|REQUIRED/.test(code) ? 400 : 500).json({ error: code === 'REPORT_ACCESS_DENIED' ? '본인의 상담만 볼 수 있습니다.' : '상담 입력이나 저장 상태를 확인해 주세요.' })
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
