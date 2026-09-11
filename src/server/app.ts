import { respondRequestFailure } from './input-error.js'
import '../env/load.js'
import type { ServerResponse } from 'node:http'
import express from 'express'
import cors from 'cors'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import type { Request, Response } from 'express'
import { analyzeSaju } from '../saju/analyzer.js'
import { isOpenAiConfigured } from '../llm/openai-adapter.js'
import { fetchPungsuTerrainEvidence } from '../pungsu/dataset-client.js'
import { generateSavedChat, isSavedChatRecord, toSavedChatResult, savedChatParentId, findSavedChatRequest } from '../report/saved-chat.js'
import { publicPartnerContext, publicReportContext } from '../report/public-context.js'
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
  mutateReportRecord,
  toClientReport,
  updateReportChatHistory,
  withReportBirthCertainty,
} from '../report/report-store.js'
import { createSavedPreview, guardPreview } from '../report/report-preview.js'
import type { BirthInput, ConversationTurn, SajuAnalysis, SajuReport, SajuReportContext } from '../types/index.js'
import type { ReportOwner, ReportRecord } from '../report/report-store.js'
import { applyAdminReportUnlock, isAdminOwner } from '../auth/admin.js'
import { staffMembership, staffMembershipConfigured, type StaffMembership } from '../auth/staff.js'
import { adminAccountCount, adminAccountStoreAvailable, adminAccountStoreEnabled, createAdminAccount, findAdminAccountByEmail, listAdminAccounts, updateAdminAccountActive, updateAdminAccountPassword } from '../auth/admin-account-store.js'
import { hashAdminPassword, verifyAdminPassword } from '../auth/admin-password.js'
import { countLiveMembers, countLiveReports, findLiveMember, findLiveReport, listLiveMembers, listLiveReports } from '../admin/live-data.js'
import { listAdminAuditEvents } from '../admin/audit-store.js'
import { executeAdminCommand, AdminCommandConflict } from '../admin/admin-command.js'
import { postgrestAdminCommandStore } from '../admin/audit-store.js'
import { SUPPORT_CATEGORIES, SUPPORT_NOTE_KINDS, SUPPORT_PRIORITIES, SUPPORT_STATUSES, createSupportCase, createSupportNote, getSupportCase, listSupportCases, listSupportNotes, updateSupportCase } from '../admin/support-store.js'
import { toAdminPaymentOrderDto } from '../payment/order-admin-dto.js'
import {
  buildUserBirthProfile,
  checkUserProfileStorageReadiness,
  getUserBirthProfile,
  getUserProfileStorageMode,
  saveUserBirthProfile,
} from '../user/profile-store.js'
import type { UserBirthProfile } from '../user/profile-store.js'
import { getPaymentProduct, listPaymentProducts, publicPaymentProduct } from '../payment/catalog.js'
import { createInicisPaymentFields, createPaymentOrderId, approveInicisPayment, publicInicisConfig } from '../payment/inicis.js'
import { isPaymentTestMode } from '../payment/test-mode.js'
import {
  PURCHASE_STATE_PENDING,
  PURCHASE_STATE_PURCHASED,
  acknowledgeGooglePlayPurchase,
  fetchGooglePlayPurchase,
  isGooglePlayConfigured,
  obfuscatedAccountId,
} from '../payment/google-play.js'
import {
  findPaymentOrderByTid,
  getPaymentOrder,
  getPaymentStorageMode,
  type PaymentStorageMode,
  listAllPaymentOrders,
  listPaymentOrders,
  PAYMENT_ORDER_STATUSES,
  checkPaymentStorageReadiness,
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
const ABOUT_PAGE = join(SAJU_ROOT, 'about.html')
const FAQ_PAGE = join(SAJU_ROOT, 'faq.html')
const ASSETLINKS_FILE = join(SAJU_ROOT, '.well-known', 'assetlinks.json')
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
    context: publicReportContext(context),
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
app.get(['/about', '/about/', '/about.html'], (_req, res) => {
  res.sendFile(ABOUT_PAGE)
})

app.get(['/faq/:group', '/faq/:group/'], (req, res, next) => {
  const group = req.params.group
  if (typeof group !== 'string' || !['use', 'payment', 'report', 'reading', 'workflow', 'fortune', 'love', 'match', 'career', 'money', 'life'].includes(group)) return next()
  res.sendFile(join(SAJU_ROOT, 'faq', group + '.html'))
})

app.get(['/faq', '/faq/', '/faq.html'], (_req, res) => {
  res.sendFile(FAQ_PAGE)
})

// 안드로이드 App Links 검증. express.static 은 dotfiles 를 기본으로 무시해서
// .well-known 이 404 가 되므로 이 주소만 따로 내보낸다. 로그인·결제를 시스템
// 브라우저에서 처리한 뒤 umsh.kr 로 돌아올 때 앱이 그 주소를 받으려면 필요하다.
app.get('/.well-known/assetlinks.json', (_req, res) => {
  res.type('application/json').sendFile(ASSETLINKS_FILE)
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

/**
 * 정적 루트에는 웹 자산이 아닌 내부 산출물이 섞여 있다 — 서비스 생성 프롬프트
 * (`PROMPT.md` 15개), 생성 결과(`*-RESULT.json`), 스크래핑·검증 스크립트(`*.py`).
 * `express.static` 은 트리를 통째로 내보내므로 2026-09-10 기준 운영에서
 * `GET /me/pass-angle/01-step-1-story/PROMPT.md` 가 200 이었다.
 *
 * 파일을 옮기는 대신 확장자로 막는다 — 이 파일들은 서비스 폴더 구조의 일부라
 * 옮기면 생성 계약(`00-SERVICE-GENERATION-CONTRACT.md`)의 경로 규칙이 깨진다.
 * 예외는 경로로 명시한다. 확장자만 보고 판단하면 `robots.txt` 까지 막힌다.
 */
const PUBLIC_STATIC_EXCEPTIONS = new Set([
  '/robots.txt',
  '/sitemap.xml',
  '/.well-known/assetlinks.json',
])
/**
 * 웹으로 내보낼 형식. **허용 목록이다** — 여기 없는 확장자는 거부한다.
 *
 * 처음에는 거부 목록(`md|py|json|…`)이었다. 그 방식은 형식을 세는 방식이라 새 형식에
 * 진다. 실제로 외부 사이트 스크래핑 결과가 `.html` 로 저장돼 있어서 목록을 지나갔다
 * (2026-09-10 Codex 리뷰 Major). 다음 생성 도구가 `.csv`·`.yaml` 을 만들면 그 순간
 * 공개된다. 그래서 기본값을 거부로 뒤집었다.
 *
 * 목록의 근거는 트리의 실제 분포다 — webp 446 · html 127 · js 61 · mp4 56 · png 52 ·
 * css 21 · woff2 9 · ttf 3 · xml 1 · jpg 1 · ico 1. 소스맵(`.map`)은 넣지 않는다.
 */
const PUBLIC_STATIC_FILE = /\.(html?|css|m?js|webp|png|jpe?g|gif|svg|avif|ico|mp4|webm|mp3|woff2?|ttf|otf|xml)$/i

/**
 * 파일 요청처럼 보이는지. 확장자가 없으면 정적 파일이 아니라 라우트가 처리하는
 * 예쁜 URL(`/privacy`, `/api/...`)이므로 통과시킨다.
 *
 * 이 전제는 "트리에 확장자 없는 파일이 없다"에 기댄다(2026-09-10 기준 0개).
 * 그 전제가 깨지면 `tests/unit/static-exposure.test.ts` 가 실패한다.
 */
const LOOKS_LIKE_FILE = /\.[A-Za-z0-9]{1,8}$/

/**
 * 중첩 폴더 `사주/사주` 는 필요한 경로에 이미 마운트돼 있다 — `/assets` 계열과
 * `index.html` 을 보내는 라우트(`SAJU_UI`). 그런데 두 번째 정적 마운트가 그 폴더를
 * `/사주/...` 라는 **두 번째 URL 공간**으로도 내보낸다.
 *
 * 그 안에는 외부 사이트 스크래핑 산출물(`extracted_decoded.html`, 121KB)과 수집·검증
 * 스크립트가 섞여 있고, 앱 페이지도 중복 URL 로 열린다. 확장자 목록으로 막는 방식은
 * `.html` 로 저장된 산출물을 놓쳤다(2026-09-10 Codex 리뷰). 그래서 URL 공간을 닫는다.
 * 저장소의 파일은 그대로 둔다 — `check_ganji.py` 등이 로컬에서 상대 경로로 읽는다.
 */
const NESTED_UI_URL_PREFIX = '/사주/'

/**
 * 정적 파일 서버가 실제로 열어 볼 후보 경로들. 확장자 검사를 이 전부에 적용한다.
 *
 * 세 가지를 놓치면 가드가 뚫린다. 전부 실제로 파일이 나갔다.
 *  - `req.path` 는 디코딩되지 않는데 `express.static` 은 디코딩한 경로로 파일을 찾는다
 *    → `PROMPT%2Emd`
 *  - `send` 는 경로 끝의 슬래시·점을 무시하고 파일을 찾는다
 *    → `PROMPT.md/` 가 원문 전체를 반환했다
 *  - Windows 는 백슬래시를 경로 구분자로 쓴다. URL 경로에는 쓸 이유가 없는 문자인데
 *    디코딩하면 경로가 한 단계 더 들어간 것처럼 해석된다
 *    → `PROMPT.md%5C` 가 원문 전체를 반환했다 (2026-09-10 Codex 리뷰 Critical)
 */
function staticPathCandidates(rawPath: string): string[] {
  let decoded = rawPath
  try { decoded = decodeURIComponent(rawPath) } catch { /* 잘못된 인코딩은 원본으로 본다 */ }
  // 백슬래시를 슬래시로 맞춰 두면 뒤의 끝문자 제거가 같은 경로를 만든다.
  const unified = [rawPath, decoded].map((value) => value.replace(/\\/g, '/'))
  const trimmed = unified.map((value) => value.replace(/[/.\s]+$/, ''))
  return [...new Set([rawPath, decoded, ...unified, ...trimmed])]
}

app.use((req, res, next) => {
  const candidates = staticPathCandidates(req.path)
  if (candidates.some((path) => PUBLIC_STATIC_EXCEPTIONS.has(path))) { next(); return }
  if (!candidates.some((path) => path.startsWith(NESTED_UI_URL_PREFIX))) {
    // 확장자가 없으면 라우트가 처리하는 URL 이다.
    if (!candidates.some((path) => LOOKS_LIKE_FILE.test(path))) { next(); return }
    // 파일로 보이는 후보 전부가 허용 형식이어야 통과한다. `PROMPT.md/` 처럼 끝문자를
    // 붙여 온 요청은 끝문자를 떼어낸 후보에서 걸린다.
    const allowed = candidates.every((path) => !LOOKS_LIKE_FILE.test(path) || PUBLIC_STATIC_FILE.test(path))
    if (allowed) { next(); return }
  }
  // 존재 여부를 알려 주지 않는다. 같은 응답으로 없는 경로와 구분되지 않게 한다.
  res.status(404).type('text/plain; charset=utf-8').send('찾을 수 없는 경로입니다.')
})

/**
 * 관리자 셸. 소스는 정적 루트 **밖**(`admin-ui/`)에 있다 — ADR-0002 D1.
 *
 * `사주/` 아래에 두면 `express.static(SAJU_ROOT)` 가 인증 검사 없이 파일을 내보낸다.
 * 그 위험은 가정이 아니다: 2026-09-10 에 서비스 생성 프롬프트 원문과 외부 사이트
 * 스크랩이 실제로 그렇게 공개되고 있었다(TASK-011·020).
 *
 * 라우트는 정적 마운트 **위에** 둔다(D2-2). 같은 경로의 정적 파일이 먼저 매칭되는
 * 경우를 원천 차단하기 위한 것이다.
 */
const ADMIN_SHELL = join(ROOT, 'admin-ui', 'index.html')

/** 관리자 응답은 색인하지 않는다(ADR-0002 D2 실패 모드 표). */
function sendAdminShell(res: Response): void {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive')
  res.setHeader('Cache-Control', 'private, no-store')
  res.sendFile(ADMIN_SHELL)
}

// 셸에는 데이터가 없다(D2-5). 그래서 미로그인에게도 같은 HTML 을 준다 —
// 목록·설정값·키가 하나도 들어 있지 않고 모든 데이터는 인증된 `/api/admin/v1/*` 로만 온다.
// **셸 HTML 자체를 미로그인에 감추려면 서버 세션 쿠키가 필요하다(U36).**
// 이 프로젝트의 인증은 `Authorization: Bearer` 하나이고 주소창 이동에는 그 헤더가 없다.
app.get(['/admin', '/admin/', '/admin/index.html'], (_req, res) => { sendAdminShell(res) })

// 딥링크는 정적 탐색으로 흘리지 않는다(D2-4). `/admin/orders` 같은 경로도 셸이 받는다.
app.get(/^\/admin\/.+/, (_req, res) => { sendAdminShell(res) })

/**
 * 자산 캐시 정책. **브라우저는 짧게, 엣지는 길게.**
 *
 * `express.static` 은 기본이 `max-age=0` 이고 그 헤더로는 Vercel CDN 이 응답을 보관하지
 * 않는다. 그래서 2026-09-10 기준 1.6MB PNG 까지 매 요청 서버리스 함수를 거쳤다
 * (`X-Vercel-Cache: MISS`, `X-Vercel-Id: icn1::iad1::…` — 서울 엣지에서 버지니아 함수 왕복).
 *
 * 브라우저에 긴 `max-age` 를 줄 수는 없다. `/css/**`·`/js/**` 참조 789건 중 `?v=` 버전
 * 쿼리가 붙은 것은 **164건(21%)** 뿐이라, 나머지는 배포 후에도 낡은 파일을 계속 쓴다.
 * 대신 엣지에 길게 준다 — Vercel 캐시는 **배포 단위로 무효화**되므로 자산 내용이 바뀌는
 * 유일한 계기에 자동으로 갱신된다.
 */
const ASSET_CACHE_CONTROL = 'public, max-age=300, s-maxage=31536000, stale-while-revalidate=86400'

/** HTML 은 기본값(`max-age=0`)을 유지한다. 배포 즉시 반영돼야 하는 쪽이다. */
function setStaticCacheHeaders(res: ServerResponse, filePath: string): void {
  if (/\.html?$/i.test(filePath)) return
  res.setHeader('Cache-Control', ASSET_CACHE_CONTROL)
}

const cachedStatic = (root: string, options: Parameters<typeof express.static>[1] = {}) =>
  express.static(root, { ...options, setHeaders: setStaticCacheHeaders })

app.use('/assets', cachedStatic(join(SAJU_UI, 'assets')))
app.use('/css', cachedStatic(join(SAJU_ROOT, 'css')))
app.use('/js', cachedStatic(join(SAJU_ROOT, 'js')))
app.use('/cmdg/assets', cachedStatic(join(SAJU_UI, 'assets')))
app.use('/love/assets', cachedStatic(join(SAJU_UI, 'assets')))
app.use('/love/mind/assets', cachedStatic(join(SAJU_UI, 'assets')))
app.use('/love/again/assets', cachedStatic(join(SAJU_UI, 'assets')))
app.use('/love/spouse/assets', cachedStatic(join(SAJU_UI, 'assets')))
app.use('/place/home/assets', cachedStatic(join(SAJU_ROOT, 'place', 'home', 'IMAGE')))
app.use('/cmdg/css', cachedStatic(join(SAJU_ROOT, 'css')))
app.use('/cmdg/js', cachedStatic(join(SAJU_ROOT, 'js')))
// `SAJU_UI`(중첩 `사주/사주` 폴더)를 통째로 마운트하지 않는다. 그 폴더 최상위에서
// 웹 확장자를 가진 파일은 `index.html`(위 라우트가 `sendFile` 로 직접 보낸다)과
// `extracted_decoded.html`(외부 사이트 스크래핑 결과)뿐이고, `assets/` 는 위에서
// 경로별로 명시 마운트했다. 즉 이 마운트는 스크랩 산출물만 추가로 공개했다 —
// 확장자 허용 목록은 `.html` 을 통과시키므로 `GET /extracted_decoded.html` 이
// 116KB 를 그대로 반환하고 있었다 (2026-09-10 Codex 리뷰 Major 확인 중 발견).
app.use(cachedStatic(SAJU_ROOT, { index: false }))

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

  // 원본은 여기서 명식을 계산하는 데만 쓰고 버린다. 이 문맥은 리포트 payload 로
  // 저장되고 응답으로도 나가므로, 남겨 두면 상대의 생년월일시가 그 범위까지 따라간다.
  // 저장된 해석을 다시 열 때 상대 입력 폼이 비어 있게 되는 것은 감수한 대가다.
  return {
    ...context,
    partner: {
      ...publicPartnerContext(context.partner),
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
    adminLocalAuth: localAdminConfigured(),
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

const LOCAL_ADMIN_COOKIE = '__Host-umsh-admin-session'
const LOCAL_ADMIN_SESSION_SECONDS = 8 * 60 * 60
const LOCAL_ADMIN_SCOPES = ['orders:read', 'members:read', 'reports:read', 'audit:read', 'settings:read', 'settings:write', 'support:read', 'support:write']

function localAdminEmail(): string {
  return String(process.env.UMSH_LOCAL_ADMIN_EMAIL ?? '').trim().toLowerCase()
}

function localAdminPassword(): string {
  // `vercel env add`의 표준입력 끝 줄바꿈만 제거한다. 사용자가 입력한 비밀번호 자체는 변형하지 않는다.
  return String(process.env.UMSH_LOCAL_ADMIN_PASSWORD ?? '').replace(/\r?\n$/, '')
}

function localAdminSessionSecret(): string {
  return String(process.env.UMSH_LOCAL_ADMIN_SESSION_SECRET ?? '').trim()
}

function localAdminConfigured(): boolean {
  return Boolean(localAdminEmail() && localAdminPassword() && localAdminSessionSecret())
}

function readCookie(req: Request, name: string): string {
  const prefix = `${name}=`
  for (const entry of String(req.headers.cookie ?? '').split(';')) {
    const value = entry.trim()
    if (value.startsWith(prefix)) return value.slice(prefix.length)
  }
  return ''
}

function signedLocalAdminSession(email: string): string {
  const payload = Buffer.from(JSON.stringify({ email, exp: Math.floor(Date.now() / 1000) + LOCAL_ADMIN_SESSION_SECONDS })).toString('base64url')
  const signature = createHmac('sha256', localAdminSessionSecret()).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

function signedLocalAdminEmail(req: Request): string | undefined {
  if (!localAdminConfigured()) return undefined
  const [payload, signature, ...extra] = readCookie(req, LOCAL_ADMIN_COOKIE).split('.')
  if (!payload || !signature || extra.length) return undefined
  const expected = createHmac('sha256', localAdminSessionSecret()).update(payload).digest('base64url')
  const suppliedBytes = Buffer.from(signature)
  const expectedBytes = Buffer.from(expected)
  if (suppliedBytes.length !== expectedBytes.length || !timingSafeEqual(suppliedBytes, expectedBytes)) return undefined
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { email?: unknown, exp?: unknown }
    if (typeof parsed.email !== 'string' || typeof parsed.exp !== 'number' || !Number.isInteger(parsed.exp) || parsed.exp <= Math.floor(Date.now() / 1000)) return undefined
    return parsed.email.trim().toLowerCase()
  } catch {
    return undefined
  }
}

function localAdminMembership(req: Request): StaffMembership | undefined {
  const email = signedLocalAdminEmail(req)
  if (!email || email !== localAdminEmail()) return undefined
  return { email, role: 'super_admin', scopes: [...LOCAL_ADMIN_SCOPES] }
}

async function persistedAdminMembership(req: Request): Promise<StaffMembership | undefined> {
  if (!adminAccountStoreEnabled()) return undefined
  const email = signedLocalAdminEmail(req)
  if (!email || !adminAccountStoreAvailable()) return undefined
  const account = await findAdminAccountByEmail(email)
  if (!account?.isActive) return undefined
  return { email: account.email, role: account.role, scopes: [...LOCAL_ADMIN_SCOPES] }
}

function localAdminCookie(value: string, maxAge: number): string {
  return `${LOCAL_ADMIN_COOKIE}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`
}

function secureStringEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left)
  const rightBytes = Buffer.from(right)
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes)
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
    ...(context.serviceKey === LOVE_THIS_YEAR_SERVICE_KEY ? { partner: publicPartnerContext(context.partner) || { mode: 'none' } } : {}),
    ...(context.serviceKey === HOME_FIT_SERVICE_KEY ? { home: context.home || {} } : {}),
    orientation: context.orientation || '',
    relationship: context.relationship || '',
    work: context.work || '',
    concern: context.concern || '',
  }
}

function clientReportContext(record: ReportRecord): SajuReportContext {
  return publicReportContext(record.context)
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

/**
 * Names the pieces still blocking checkout so operators can act without reading logs.
 * This goes to the server log only. It used to be handed to the browser as-is, which
 * printed our environment variable names on the customer's payment screen.
 */
function paymentSetupMessage(inicisReady: boolean, storage: PaymentStorageMode): string {
  const missing: string[] = []
  if (!inicisReady) missing.push('이니시스 MID·SignKey (INICIS_MID, INICIS_SIGNKEY)')
  if (storage === 'memory') missing.push('결제 주문 저장소 (SUPABASE_SERVICE_ROLE_KEY 또는 DATABASE_URL)')
  if (missing.length === 0) return ''
  return `결제 모듈 연결 전입니다. 남은 설정: ${missing.join(' / ')}.`
}

/** What the customer sees instead: why they cannot pay and what to do, nothing more. */
const PAYMENT_UNAVAILABLE_NOTICE = '지금은 결제를 열 수 없습니다. 잠시 후 다시 시도하거나 고객센터로 문의해 주세요.'

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
    // 판매 중단 게이트는 우리 쪽을 유지하고(T02 U10), 고객에게 보내는 문구는
    // origin/main 의 것을 쓴다. 이전 문구는 INICIS_MID 같은 내부 환경변수 이름을
    // 무인증 응답에 그대로 담아 고객에게 노출했다(aca0bf3).
    catalog: listPaymentProducts()
      .filter((product) => !PUBLICLY_DISABLED_PRODUCT_KEYS.has(product.key))
      .map(publicPaymentProduct),
    setupMessage: enabled || testMode ? '' : PAYMENT_UNAVAILABLE_NOTICE,
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
  // 주문·프로필 저장소도 함께 보고한다. 이 둘에는 판정 자체가 없었고, 설정이 빠지면
  // 조용히 메모리로 떨어져 결제·회원 정보가 다음 요청에서 사라진다(U20).
  const paymentStorage = req.query.storage === '1' ? checkPaymentStorageReadiness() : undefined
  const profileStorage = req.query.storage === '1' ? checkUserProfileStorageReadiness() : undefined
  const storages = [reportStorage, paymentStorage, profileStorage]
  res.setHeader('Cache-Control', 'no-store')
  res.status(storages.some((storage) => storage && !storage.ok) ? 503 : 200).json({
    ok: storages.every((storage) => !storage || storage.ok),
    openai: isOpenAiConfigured(),
    ...(reportStorage ? { reportStorage } : {}),
    ...(paymentStorage ? { paymentStorage } : {}),
    ...(profileStorage ? { profileStorage } : {}),
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

/**
 * 관리자 셸이 자기 권한을 확인하는 유일한 경로. ADR-0002 D2-1 대로 `/api` 접두어 안에
 * 있어 `Cache-Control: private, no-store` + `Vary: Authorization` 이 자동 적용된다.
 *
 * 판정 근거는 `src/auth/staff.ts` 하나다. `isAdminEmail`·`isAdminOwner` 는 **결제 없이
 * 유료 리포트를 여는 레거시 unlock 목록**이므로 운영 권한으로 절대 쓰지 않는다
 * (`plan.md`, `docs/admin-ops/T01-baseline.md`, 13-SECURITY. 초판이 실제로 그렇게
 * 열려 있었다 — 2026-09-10 Codex 리뷰 Critical).
 *
 * 권한은 배포 설정(`UMSH_ADMIN_SUPER_EMAILS`)에서만 온다. 코드 변경 없이 회수할 수
 * 있고, 설정이 비어 있으면 아무에게도 권한이 없다. T05 가 영속 membership 저장소를
 * 만들면 이 응답 형태를 유지한 채 판정만 교체한다.
 */
function adminEnvironmentLabel(): string {
  return String(process.env.VERCEL_ENV ?? '') || (process.env.NODE_ENV === 'production' ? 'production' : 'development')
}

/**
 * 관리자 API 공통 관문. 매 요청 권한을 다시 확인한다(A03).
 *
 * 셸이 열렸다는 것과 권한이 있다는 것은 다른 문제다. 셸은 데이터가 없는 HTML 이고,
 * 데이터는 이 관문을 통과한 요청에만 나간다. scope 를 인자로 받아 라우트마다
 * 필요한 권한을 명시하게 한다 — 지금은 조회 scope 뿐이다(T06 전까지 조치 없음).
 */
async function requireStaff(req: Request, res: Response, scope: string): Promise<StaffMembership | undefined> {
  let localMembership: StaffMembership | undefined
  try {
    localMembership = await persistedAdminMembership(req) ?? localAdminMembership(req)
  } catch {
    res.status(503).json({ code: 'ADMIN_ACCOUNT_STORE_UNAVAILABLE', error: '관리자 계정 저장소를 확인할 수 없습니다.' })
    return undefined
  }
  if (localMembership) {
    if (localMembership.scopes.includes(scope)) return localMembership
    res.status(403).json({ code: 'SCOPE_REQUIRED', error: '이 기능에 필요한 권한이 없습니다.' })
    return undefined
  }
  if (localAdminConfigured()) {
    res.status(401).json({ code: 'AUTH_REQUIRED', error: '로그인이 필요합니다.' })
    return undefined
  }
  let owner: ReportOwner | undefined
  try {
    owner = await verifySupabaseUser(req)
  } catch {
    res.status(401).json({ code: 'AUTH_REQUIRED', error: '로그인 후 다시 시도해 주세요.' })
    return undefined
  }
  if (!owner) {
    res.status(401).json({ code: 'AUTH_REQUIRED', error: '로그인이 필요합니다.' })
    return undefined
  }
  const membership = staffMembership(owner)
  if (!membership) {
    res.status(403).json({
      code: 'STAFF_MEMBERSHIP_REQUIRED',
      error: staffMembershipConfigured()
        ? '이 계정에는 운영 관리자 권한이 없습니다.'
        : '직원 권한 원본이 설정되지 않았습니다. 운영 담당자에게 문의해 주세요.',
    })
    return undefined
  }
  if (!membership.scopes.includes(scope)) {
    // 권한은 있지만 이 조회에 필요한 scope 가 없다. 권한 없음과 구분해 응답한다.
    res.status(403).json({ code: 'SCOPE_REQUIRED', error: '이 기능에 필요한 권한이 없습니다.' })
    return undefined
  }
  return membership
}

app.post('/api/admin/v1/login', async (req, res) => {
  if (!localAdminConfigured()) {
    res.status(503).json({ code: 'LOCAL_LOGIN_NOT_CONFIGURED', error: '관리자 로그인 설정을 확인해 주세요.' })
    return
  }
  const body = asObject(req.body)
  const email = trimmedString(body.email).toLowerCase()
  const password = typeof body.password === 'string' ? body.password : ''
  let authenticated = false
  try {
    if (adminAccountStoreEnabled()) {
      if (!adminAccountStoreAvailable()) throw new Error('ADMIN_ACCOUNT_STORE_UNAVAILABLE')
      const account = await findAdminAccountByEmail(email)
      if (account) authenticated = account.isActive && await verifyAdminPassword(password, account.passwordHash)
      // The encrypted deployment credentials bootstrap exactly one first record.
      // Once it exists, all subsequent logins use the stored scrypt hash.
      else if (secureStringEqual(email, localAdminEmail()) && secureStringEqual(password, localAdminPassword())) {
        await createAdminAccount({ email, passwordHash: await hashAdminPassword(password) })
        authenticated = true
      }
    } else {
      authenticated = secureStringEqual(email, localAdminEmail()) && secureStringEqual(password, localAdminPassword())
    }
  } catch {
    res.status(503).json({ code: 'ADMIN_ACCOUNT_STORE_UNAVAILABLE', error: '관리자 계정 저장소를 확인할 수 없습니다.' })
    return
  }
  if (!authenticated) {
    res.status(401).json({ code: 'LOCAL_LOGIN_FAILED', error: '이메일 또는 비밀번호가 올바르지 않습니다.' })
    return
  }
  res.setHeader('Set-Cookie', localAdminCookie(signedLocalAdminSession(email), LOCAL_ADMIN_SESSION_SECONDS))
  res.json({ email, role: 'super_admin', scopes: [...LOCAL_ADMIN_SCOPES], environment: adminEnvironmentLabel() })
})

app.post('/api/admin/v1/logout', (_req, res) => {
  res.setHeader('Set-Cookie', localAdminCookie('', 0))
  res.status(204).end()
})

/** 기간 인자. 형식이 틀리면 조용히 무시하지 않고 400 으로 알린다. */
function parseAdminWindow(req: Request): { from?: string; to?: string } | 'invalid' {
  const window: { from?: string; to?: string } = {}
  for (const key of ['from', 'to'] as const) {
    const raw = trimmedString(req.query?.[key])
    if (!raw) continue
    const parsed = new Date(raw)
    if (Number.isNaN(parsed.getTime())) return 'invalid'
    window[key] = parsed.toISOString()
  }
  return window
}

/**
 * 주문 목록 (T08). 마스킹된 제한 DTO + 안정 cursor.
 *
 * 구형 주문은 `reportId` 가 없다(리포트가 생기기 전에 만들어진 주문). 그것을 오류로
 * 다루지 않고 그대로 내보낸다 — 목록에서 사라지면 대사가 불가능해진다.
 */
app.get('/api/admin/v1/search', async (req, res) => {
  const kind = trimmedString(req.query?.kind); const exactId = trimmedString(req.query?.exactId)
  if (!['order', 'member', 'report', 'support'].includes(kind) || exactId.length < 3 || exactId.length > 160) { res.status(422).json({ code: 'INVALID_SEARCH_INPUT', error: '검색 종류와 정확한 식별자를 확인해 주세요.' }); return }
  const scope = kind === 'order' ? 'orders:read' : kind === 'member' ? 'members:read' : kind === 'report' ? 'reports:read' : 'support:read'
  if (!await requireStaff(req, res, scope)) return
  try {
    if (kind === 'order') { const order = await getPaymentOrder(exactId); if (!order) { res.status(404).json({ code: 'SEARCH_RESULT_NOT_FOUND', error: '검색 결과가 없습니다.' }); return }; res.json({ result: { kind, value: toAdminPaymentOrderDto(order) }, asOf: new Date().toISOString() }); return }
    if (kind === 'member') { const member = await findLiveMember(exactId); if (!member) { res.status(404).json({ code: 'SEARCH_RESULT_NOT_FOUND', error: '검색 결과가 없습니다.' }); return }; res.json({ result: { kind, value: member }, asOf: new Date().toISOString() }); return }
    if (kind === 'report') { const report = await findLiveReport(exactId); if (!report) { res.status(404).json({ code: 'SEARCH_RESULT_NOT_FOUND', error: '검색 결과가 없습니다.' }); return }; res.json({ result: { kind, value: report }, asOf: new Date().toISOString() }); return }
    const supportCase = await getSupportCase(exactId); if (!supportCase) { res.status(404).json({ code: 'SEARCH_RESULT_NOT_FOUND', error: '검색 결과가 없습니다.' }); return }; res.json({ result: { kind, value: supportCase }, asOf: new Date().toISOString() })
  } catch { res.status(503).json({ code: 'ADMIN_SEARCH_UNAVAILABLE', error: '실제 운영 검색 저장소를 불러오지 못했습니다.' }) }
})

app.get('/api/admin/v1/orders', async (req, res) => {
  // 운영 요청에 따라 목록만 공개한다. DTO는 연락처·거래식별자 원문을 포함하지 않으며,
  // 개별 주문 상세와 나머지 관리자 API는 계속 requireStaff 관문을 통과해야 한다.
  // 공개 목록은 마스킹된 DTO만 반환하므로 짧은 edge cache를 허용한다. 반복 원격 저장소
  // 조회를 줄이되, 주문 상태가 오래 보이지 않도록 10초 뒤에는 반드시 재검증한다.
  res.removeHeader('Vary')
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=10, stale-while-revalidate=30')
  const window = parseAdminWindow(req)
  if (window === 'invalid') {
    res.status(400).json({ code: 'INVALID_WINDOW', error: '조회 기간 형식을 확인해 주세요.' })
    return
  }
  const status = trimmedString(req.query?.status)
  if (status && !PAYMENT_ORDER_STATUSES.includes(status as PaymentOrder['status'])) {
    res.status(400).json({ code: 'INVALID_STATUS', error: '조회할 주문 상태를 확인해 주세요.' })
    return
  }
  try {
    const page = await listAllPaymentOrders({
      limit: Number(req.query?.limit ?? 20),
      cursor: trimmedString(req.query?.cursor) || undefined,
      status: (status || undefined) as PaymentOrder['status'] | undefined,
      ...window,
    })
    res.json({
      orders: page.orders.map(toAdminPaymentOrderDto),
      ...(page.nextCursor ? { nextCursor: page.nextCursor } : {}),
      storage: getPaymentStorageMode(),
    })
  } catch (error) {
    // 조회 위치가 깨진 cursor 는 사용자 입력 문제이므로 400 으로 돌려준다.
    const message = error instanceof Error ? error.message : ''
    if (message.includes('조회 위치')) {
      res.status(400).json({ code: 'INVALID_CURSOR', error: '조회 위치를 확인해 주세요.' })
      return
    }
    res.status(502).json({ code: 'ORDER_LOOKUP_FAILED', error: '주문 조회에 실패했습니다.' })
  }
})

/** 주문 상세. 목록과 같은 마스킹을 쓴다 — 상세라고 원문을 더 주지 않는다. */
app.get('/api/admin/v1/orders/:orderId', async (req, res) => {
  if (!await requireStaff(req, res, 'orders:read')) return
  const orderId = trimmedString(req.params.orderId)
  try {
    const order = orderId ? await getPaymentOrder(orderId) : null
    if (!order) {
      // 없는 주문과 권한 없음을 구분한다(A35).
      res.status(404).json({ code: 'ORDER_NOT_FOUND', error: '주문을 찾지 못했습니다.' })
      return
    }
    res.json({ order: toAdminPaymentOrderDto(order) })
  } catch {
    res.status(502).json({ code: 'ORDER_LOOKUP_FAILED', error: '주문 조회에 실패했습니다.' })
  }
})

/** Live, privacy-minimized member data. The service key never reaches the browser. */
app.get('/api/admin/v1/members', async (req, res) => {
  if (!await requireStaff(req, res, 'members:read')) return
  try {
    res.json({ members: await listLiveMembers(Number(req.query?.limit ?? 100)), asOf: new Date().toISOString() })
  } catch {
    res.status(503).json({ code: 'LIVE_MEMBER_LOOKUP_FAILED', error: '실제 회원 저장소를 불러오지 못했습니다.' })
  }
})

/** Live report index. Report text and birth data deliberately stay on the server. */
app.get('/api/admin/v1/reports', async (req, res) => {
  if (!await requireStaff(req, res, 'reports:read')) return
  try {
    res.json({ reports: await listLiveReports(Number(req.query?.limit ?? 100)), asOf: new Date().toISOString() })
  } catch {
    res.status(503).json({ code: 'LIVE_REPORT_LOOKUP_FAILED', error: '실제 리포트 저장소를 불러오지 못했습니다.' })
  }
})

/** Real deploy-time service and corpus configuration, not an editable mock catalog. */
app.get('/api/admin/v1/operations-snapshot', async (req, res) => {
  if (!await requireStaff(req, res, 'reports:read')) return
  try {
    const [members, reports] = await Promise.all([countLiveMembers(), countLiveReports()])
    const corpus = getCorpusSnapshot()
    res.json({
      members,
      reports,
      services: listServiceDirectory().length,
      corpusPacks: corpus.activePacks.length,
      corpusFingerprint: corpus.fingerprint,
      asOf: new Date().toISOString(),
    })
  } catch {
    res.status(503).json({ code: 'LIVE_OPERATIONS_LOOKUP_FAILED', error: '실제 운영 요약을 불러오지 못했습니다.' })
  }
})

app.get('/api/admin/v1/audit', async (req, res) => {
  if (!await requireStaff(req, res, 'audit:read')) return
  try {
    res.json({ events: await listAdminAuditEvents(Number(req.query?.limit ?? 100)), asOf: new Date().toISOString() })
  } catch {
    res.status(503).json({ code: 'ADMIN_AUDIT_LOOKUP_FAILED', error: '감사 기록 저장소를 불러오지 못했습니다.' })
  }
})

app.get('/api/admin/v1/me', async (req, res) => {
  let localMembership: StaffMembership | undefined
  try {
    localMembership = await persistedAdminMembership(req) ?? localAdminMembership(req)
  } catch {
    res.status(503).json({ code: 'ADMIN_ACCOUNT_STORE_UNAVAILABLE', error: '관리자 계정 저장소를 확인할 수 없습니다.' })
    return
  }
  if (localMembership) {
    res.json({
      email: localMembership.email,
      role: localMembership.role,
      scopes: localMembership.scopes,
      environment: adminEnvironmentLabel(),
    })
    return
  }
  if (localAdminConfigured()) {
    res.status(401).json({ code: 'AUTH_REQUIRED', error: '로그인이 필요합니다.' })
    return
  }
  let owner: ReportOwner | undefined
  try {
    owner = await verifySupabaseUser(req)
  } catch {
    // 토큰이 있으나 검증에 실패한 경우다. 만료·회수 모두 재로그인으로 안내한다.
    res.status(401).json({ code: 'AUTH_REQUIRED', error: '로그인 후 다시 시도해 주세요.' })
    return
  }
  if (!owner) {
    res.status(401).json({ code: 'AUTH_REQUIRED', error: '로그인이 필요합니다.' })
    return
  }

  const membership = staffMembership(owner)
  if (!membership) {
    // 권한 없음과 미로그인을 구분해 응답한다(A35 — 서로 다른 UI 상태여야 한다).
    // 권한이 없는 회원에게는 scope·이메일을 내려보내지 않는다.
    res.status(403).json({
      code: 'STAFF_MEMBERSHIP_REQUIRED',
      error: staffMembershipConfigured()
        ? '이 계정에는 운영 관리자 권한이 없습니다.'
        : '직원 권한 원본이 설정되지 않았습니다. 운영 담당자에게 문의해 주세요.',
    })
    return
  }

  res.json({
    email: membership.email,
    role: membership.role,
    scopes: membership.scopes,
    environment: adminEnvironmentLabel(),
  })
})

/** Actual account roster for the settings screen. Password hashes never leave the server. */
app.get('/api/admin/v1/support', async (req, res) => {
  if (!await requireStaff(req, res, 'support:read')) return
  try { res.json({ cases: await listSupportCases() }) }
  catch { res.status(503).json({ code: 'SUPPORT_CASE_LOOKUP_FAILED', error: '고객 지원 저장소를 불러오지 못했습니다.' }) }
})

app.get('/api/admin/v1/support/:id/notes', async (req, res) => {
  if (!await requireStaff(req, res, 'support:read')) return
  const id = trimmedString(req.params.id)
  if (!id) { res.status(422).json({ code: 'INVALID_SUPPORT_CASE_ID', error: '케이스 식별자를 확인해 주세요.' }); return }
  try { res.json({ notes: await listSupportNotes(id) }) }
  catch { res.status(503).json({ code: 'SUPPORT_NOTE_LOOKUP_FAILED', error: '케이스 메모를 불러오지 못했습니다.' }) }
})

app.post('/api/admin/v1/support', async (req, res) => {
  const membership = await requireStaff(req, res, 'support:write'); if (!membership) return
  const body = asObject(req.body); const category = trimmedString(body.category); const priority = trimmedString(body.priority); const idempotencyKey = trimmedString(req.header('idempotency-key'))
  if (!(SUPPORT_CATEGORIES as readonly string[]).includes(category) || !(SUPPORT_PRIORITIES as readonly string[]).includes(priority) || idempotencyKey.length < 8) { res.status(422).json({ code: 'INVALID_SUPPORT_CASE_INPUT', error: '문의 종류, 우선순위, 멱등 키를 확인해 주세요.' }); return }
  try {
    const command = await executeAdminCommand(postgrestAdminCommandStore(), { actorEmail: membership.email, action: 'support.case.create', idempotencyKey, body: { category, priority, memberId: trimmedString(body.memberId) || null, orderId: trimmedString(body.orderId) || null, reportId: trimmedString(body.reportId) || null }, target: { type: 'support_case', id: 'new' } }, async () => createSupportCase({ category: category as typeof SUPPORT_CATEGORIES[number], priority: priority as typeof SUPPORT_PRIORITIES[number], memberId: trimmedString(body.memberId) || undefined, orderId: trimmedString(body.orderId) || undefined, reportId: trimmedString(body.reportId) || undefined, actorEmail: membership.email }))
    res.status(command.replayed ? 200 : 201).json({ supportCase: command.result, replayed: command.replayed })
  } catch (error) { res.status(error instanceof AdminCommandConflict ? 409 : 503).json({ code: error instanceof Error ? error.message : 'SUPPORT_CASE_CREATE_FAILED', error: '고객 지원 케이스를 만들지 못했습니다.' }) }
})

app.patch('/api/admin/v1/support/:id', async (req, res) => {
  const membership = await requireStaff(req, res, 'support:write'); if (!membership) return
  const body = asObject(req.body); const id = trimmedString(req.params.id); const status = trimmedString(body.status); const priority = trimmedString(body.priority); const expectedRevision = Number(body.expectedRevision); const idempotencyKey = trimmedString(req.header('idempotency-key'))
  const assigneeEmail = trimmedString(body.assigneeEmail) || null; const resolutionCode = trimmedString(body.resolutionCode) || null
  if (!id || !(SUPPORT_STATUSES as readonly string[]).includes(status) || !(SUPPORT_PRIORITIES as readonly string[]).includes(priority) || !Number.isInteger(expectedRevision) || expectedRevision < 0 || idempotencyKey.length < 8) { res.status(422).json({ code: 'INVALID_SUPPORT_CASE_INPUT', error: '상태, 우선순위, revision, 멱등 키를 확인해 주세요.' }); return }
  try {
    const command = await executeAdminCommand(postgrestAdminCommandStore(), { actorEmail: membership.email, action: 'support.case.update', idempotencyKey, body: { id, status, priority, assigneeEmail, resolutionCode, expectedRevision }, target: { type: 'support_case', id } }, async () => {
      const supportCase = await updateSupportCase({ id, expectedRevision, status: status as typeof SUPPORT_STATUSES[number], priority: priority as typeof SUPPORT_PRIORITIES[number], assigneeEmail, resolutionCode }); if (!supportCase) throw new AdminCommandConflict('SUPPORT_CASE_REVISION_CONFLICT'); return supportCase
    })
    res.json({ supportCase: command.result, replayed: command.replayed })
  } catch (error) { res.status(error instanceof AdminCommandConflict ? 409 : 503).json({ code: error instanceof Error ? error.message : 'SUPPORT_CASE_UPDATE_FAILED', error: '고객 지원 케이스를 변경하지 못했습니다.' }) }
})

app.post('/api/admin/v1/support/:id/notes', async (req, res) => {
  const membership = await requireStaff(req, res, 'support:write'); if (!membership) return
  const body = asObject(req.body); const id = trimmedString(req.params.id); const kind = trimmedString(body.kind); const text = typeof body.text === 'string' ? body.text.trim() : ''; const idempotencyKey = trimmedString(req.header('idempotency-key'))
  if (!id || !(SUPPORT_NOTE_KINDS as readonly string[]).includes(kind) || text.length < 1 || text.length > 4000 || idempotencyKey.length < 8) { res.status(422).json({ code: 'INVALID_SUPPORT_NOTE_INPUT', error: '메모 종류, 내용, 멱등 키를 확인해 주세요.' }); return }
  try {
    const command = await executeAdminCommand(postgrestAdminCommandStore(), { actorEmail: membership.email, action: 'support.note.create', idempotencyKey, body: { id, kind, textLength: text.length }, target: { type: 'support_case', id } }, async () => createSupportNote({ caseId: id, kind: kind as typeof SUPPORT_NOTE_KINDS[number], text, actorEmail: membership.email }))
    res.status(command.replayed ? 200 : 201).json({ note: command.result, replayed: command.replayed })
  } catch (error) { res.status(error instanceof AdminCommandConflict ? 409 : 503).json({ code: error instanceof Error ? error.message : 'SUPPORT_NOTE_CREATE_FAILED', error: '케이스 메모를 저장하지 못했습니다.' }) }
})

app.get('/api/admin/v1/admin-accounts', async (req, res) => {
  if (!await requireStaff(req, res, 'settings:read')) return
  try {
    res.json({ accounts: await listAdminAccounts() })
  } catch {
    res.status(503).json({ code: 'ADMIN_ACCOUNT_STORE_UNAVAILABLE', error: '관리자 계정 목록을 불러오지 못했습니다.' })
  }
})

function adminCommandKey(req: Request): string {
  return trimmedString(req.header('idempotency-key'))
}

function adminAccountSummary(account: Awaited<ReturnType<typeof createAdminAccount>>) {
  const { passwordHash: _passwordHash, ...summary } = account
  return summary
}

app.post('/api/admin/v1/admin-accounts', async (req, res) => {
  const membership = await requireStaff(req, res, 'settings:write')
  if (!membership) return
  const body = asObject(req.body)
  const email = trimmedString(body.email).toLowerCase()
  const password = typeof body.password === 'string' ? body.password : ''
  const idempotencyKey = adminCommandKey(req)
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 12 || idempotencyKey.length < 8) {
    res.status(422).json({ code: 'INVALID_ADMIN_ACCOUNT_INPUT', error: '이메일, 12자 이상 비밀번호, 멱등 키를 확인해 주세요.' }); return
  }
  try {
    const command = await executeAdminCommand(postgrestAdminCommandStore(), {
      actorEmail: membership.email, action: 'admin.account.create', idempotencyKey, body: { email }, target: { type: 'admin_account', id: email },
    }, async () => adminAccountSummary(await createAdminAccount({ email, passwordHash: await hashAdminPassword(password) })))
    res.status(command.replayed ? 200 : 201).json({ account: command.result, replayed: command.replayed })
  } catch (error) {
    if (error instanceof AdminCommandConflict) { res.status(409).json({ code: error.message, error: '같은 멱등 키로 다른 변경을 요청할 수 없습니다.' }); return }
    res.status(503).json({ code: 'ADMIN_ACCOUNT_CREATE_FAILED', error: '관리자 계정을 만들지 못했습니다.' })
  }
})

app.patch('/api/admin/v1/admin-accounts/:id/password', async (req, res) => {
  const membership = await requireStaff(req, res, 'settings:write')
  if (!membership) return
  const body = asObject(req.body); const password = typeof body.password === 'string' ? body.password : ''
  const expectedRevision = Number(body.expectedRevision); const id = trimmedString(req.params.id); const idempotencyKey = adminCommandKey(req)
  if (!id || password.length < 12 || !Number.isInteger(expectedRevision) || expectedRevision < 0 || idempotencyKey.length < 8) { res.status(422).json({ code: 'INVALID_ADMIN_ACCOUNT_INPUT', error: '비밀번호, revision, 멱등 키를 확인해 주세요.' }); return }
  try {
    const command = await executeAdminCommand(postgrestAdminCommandStore(), { actorEmail: membership.email, action: 'admin.account.password.reset', idempotencyKey, body: { id, expectedRevision }, target: { type: 'admin_account', id } }, async () => {
      const account = await updateAdminAccountPassword({ id, expectedRevision, passwordHash: await hashAdminPassword(password) }); if (!account) throw new AdminCommandConflict('ADMIN_ACCOUNT_REVISION_CONFLICT'); return adminAccountSummary(account)
    })
    res.json({ account: command.result, replayed: command.replayed })
  } catch (error) { res.status(error instanceof AdminCommandConflict ? 409 : 503).json({ code: error instanceof Error ? error.message : 'ADMIN_ACCOUNT_PASSWORD_FAILED', error: '관리자 비밀번호를 변경하지 못했습니다.' }) }
})

app.patch('/api/admin/v1/admin-accounts/:id/status', async (req, res) => {
  const membership = await requireStaff(req, res, 'settings:write')
  if (!membership) return
  const body = asObject(req.body); const isActive = body.isActive; const expectedRevision = Number(body.expectedRevision); const id = trimmedString(req.params.id); const idempotencyKey = adminCommandKey(req)
  if (!id || typeof isActive !== 'boolean' || !Number.isInteger(expectedRevision) || expectedRevision < 0 || idempotencyKey.length < 8) { res.status(422).json({ code: 'INVALID_ADMIN_ACCOUNT_INPUT', error: '상태, revision, 멱등 키를 확인해 주세요.' }); return }
  try {
    const command = await executeAdminCommand(postgrestAdminCommandStore(), { actorEmail: membership.email, action: 'admin.account.status.change', idempotencyKey, body: { id, isActive, expectedRevision }, target: { type: 'admin_account', id } }, async () => {
      const accounts = await listAdminAccounts(); const target = accounts.find((account) => account.id === id)
      if (!target) throw new AdminCommandConflict('ADMIN_ACCOUNT_NOT_FOUND')
      if (!isActive && target.email === membership.email) throw new AdminCommandConflict('ADMIN_SELF_DEACTIVATION_FORBIDDEN')
      const account = await updateAdminAccountActive({ id, isActive, expectedRevision }); if (!account) throw new AdminCommandConflict('ADMIN_ACCOUNT_REVISION_CONFLICT'); return adminAccountSummary(account)
    })
    res.json({ account: command.result, replayed: command.replayed })
  } catch (error) { res.status(error instanceof AdminCommandConflict ? 409 : 503).json({ code: error instanceof Error ? error.message : 'ADMIN_ACCOUNT_STATUS_FAILED', error: '관리자 상태를 변경하지 못했습니다.' }) }
})

/** The first persistent administrator is created only by the already-signed-in bootstrap admin. */
app.post('/api/admin/v1/admin-accounts/bootstrap', async (req, res) => {
  if (!await requireStaff(req, res, 'settings:read')) return
  if (!adminAccountStoreAvailable() || !localAdminConfigured() || !localAdminMembership(req)) {
    res.status(403).json({ code: 'BOOTSTRAP_NOT_ALLOWED', error: '현재 bootstrap 관리자만 계정을 초기 등록할 수 있습니다.' })
    return
  }
  try {
    if (await adminAccountCount() > 0) {
      res.status(409).json({ code: 'ADMIN_ACCOUNT_EXISTS', error: '관리자 계정이 이미 등록되어 있습니다.' })
      return
    }
    const account = await createAdminAccount({
      email: localAdminEmail(),
      passwordHash: await hashAdminPassword(localAdminPassword()),
    })
    const { passwordHash: _passwordHash, ...summary } = account
    res.status(201).json({ account: summary })
  } catch {
    res.status(503).json({ code: 'ADMIN_ACCOUNT_STORE_UNAVAILABLE', error: '관리자 계정을 등록하지 못했습니다.' })
  }
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
    respondRequestFailure(res, err, '결제 주문 생성 실패')
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
    respondRequestFailure(res, err, '테스트 결제 승인 실패')
  }
})

/**
 * 구글플레이 인앱 결제 확인.
 *
 * 앱에서 결제가 끝나면 purchaseToken 을 들고 이 주소로 온다. 클라이언트가 보내는 상품명과
 * 금액은 근거로 쓰지 않고, 토큰을 구글에 직접 물어 확인한 값만 믿는다.
 *
 * 순서가 중요하다. 확인 통보(acknowledge)를 먼저 하고 그다음에 주문을 paid 로 바꾼다.
 * 반대로 하면 저장은 됐는데 통보가 실패한 경우 구글이 3일 뒤 자동 환불해, 돈은 돌아가고
 * 열람 권한은 남는 상태가 된다. 이 순서면 실패해도 다시 부르면 되고, 통보는 여러 번
 * 불러도 문제가 없다.
 */
app.post('/api/payment/google/verify', async (req, res) => {
  try {
    const owner = await requireSupabaseUser(req, res)
    if (!owner) return
    if (!isGooglePlayConfigured()) {
      res.status(503).json({ code: 'PAYMENT_NOT_CONFIGURED', error: PAYMENT_UNAVAILABLE_NOTICE })
      return
    }

    const orderId = trimmedString(req.body?.orderId)
    const purchaseToken = trimmedString(req.body?.purchaseToken)
    if (!orderId || !purchaseToken) {
      res.status(400).json({ code: 'INPUT_REQUIRED', error: '주문 번호와 결제 정보가 필요합니다.' })
      return
    }

    const order = await getPaymentOrder(orderId)
    if (!order || order.ownerId !== owner.id) {
      res.status(404).json({ error: '주문을 찾지 못했습니다.' })
      return
    }
    // 이미 열린 주문이면 그대로 돌려준다. 앱이 재시도해도 같은 결과가 나와야 한다.
    if (order.status === 'paid' || order.status === 'viewed') {
      res.json({ order: clientPaymentOrder(order), alreadyPaid: true })
      return
    }
    if (order.status !== 'ready' && order.status !== 'approving') {
      res.status(409).json({ error: '확인을 진행할 수 없는 주문 상태입니다.' })
      return
    }

    // Play 상품 ID 는 카탈로그 키를 그대로 쓴다. 주문이 가리키는 상품과 달라선 안 된다.
    const product = getPaymentProduct(order.productKey)
    if (!product) {
      res.status(409).json({ error: '주문의 상품 정보를 확인할 수 없습니다.' })
      return
    }
    const claimedProductId = trimmedString(req.body?.productId)
    if (claimedProductId && claimedProductId !== product.key) {
      res.status(400).json({ error: '주문과 결제 상품이 다릅니다.' })
      return
    }

    // 같은 결제 토큰으로 다른 주문을 열지 못하게 한다.
    const reused = await findPaymentOrderByTid(purchaseToken)
    if (reused && reused.orderId !== order.orderId) {
      res.status(409).json({ code: 'PURCHASE_ALREADY_USED', error: '이미 사용된 결제입니다.' })
      return
    }

    const purchase = await fetchGooglePlayPurchase({ productId: product.key, purchaseToken })

    if (purchase.purchaseState === PURCHASE_STATE_PENDING) {
      res.status(202).json({
        code: 'PAYMENT_PENDING',
        error: '결제가 아직 완료되지 않았습니다. 완료되면 다시 확인해 주세요.',
      })
      return
    }
    if (purchase.purchaseState !== PURCHASE_STATE_PURCHASED) {
      res.status(402).json({ code: 'PAYMENT_REQUIRED', error: '완료된 결제가 아닙니다.' })
      return
    }
    // 앱이 결제할 때 넘긴 계정 식별자. 값이 있으면 이 계정 것이어야 한다.
    if (purchase.obfuscatedExternalAccountId
        && purchase.obfuscatedExternalAccountId !== obfuscatedAccountId(owner.id)) {
      res.status(409).json({ code: 'PURCHASE_ACCOUNT_MISMATCH', error: '다른 계정의 결제입니다.' })
      return
    }

    if (purchase.acknowledgementState !== 1) {
      await acknowledgeGooglePlayPurchase({ productId: product.key, purchaseToken })
    }

    const paid = await updatePaymentOrder(order.orderId, {
      status: 'paid',
      tid: purchaseToken,
      payMethod: 'GOOGLE_PLAY',
      approvalCode: purchase.orderId,
      message: '구글플레이 인앱 결제로 확인되었습니다.',
    })
    if (!paid) {
      res.status(500).json({ error: '결제 확인을 저장하지 못했습니다. 다시 시도해 주세요.' })
      return
    }
    res.json({ order: clientPaymentOrder(paid) })
  } catch (err) {
    respondRequestFailure(res, err, '구글플레이 결제 확인 실패')
  }
})

/**
 * 앱이 결제를 시작할 때 필요한 값.
 *
 * Play 상품 ID 와 계정 식별자를 서버가 알려 준다. 앱이 직접 만들지 않게 하는 이유는
 * 검증 단계에서 서버가 같은 규칙으로 다시 계산해 대조하기 때문이다.
 */
app.get('/api/payment/google/product/:productKey', async (req, res) => {
  try {
    const owner = await requireSupabaseUser(req, res)
    if (!owner) return
    const product = getPaymentProduct(req.params.productKey)
    if (!product) {
      res.status(404).json({ error: '결제 상품을 확인해 주세요.' })
      return
    }
    res.json({
      productId: product.key,
      title: product.title,
      amount: product.amount,
      obfuscatedAccountId: obfuscatedAccountId(owner.id),
      configured: isGooglePlayConfigured(),
    })
  } catch (err) {
    respondRequestFailure(res, err, '구글플레이 상품 조회 실패')
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

    // 승인 증거를 최종 상태보다 **먼저** 저장한다(U22).
    //
    // `approveInicisPayment` 가 돌아온 시점에 이미 돈이 움직였다. 그런데 그 사실을
    // `paid` 와 함께 한 번에 쓰면, 그 쓰기가 실패할 때 승인 기록이 통째로 사라진다.
    // 그러면 catch 가 주문을 `failed` 로 적고 **과금된 주문이 실패로 남는다.**
    //
    // 증거를 먼저 남기면 주문은 `approving` + `tid` 가 되고, 저장소가 그 조합을
    // "승인됐으나 정산 기록이 끝나지 않음"으로 보아 `failed` 로 내려가지 못하게 막는다.
    await updatePaymentOrder(order.orderId, {
      tid: approval.tid,
      payMethod: approval.payMethod,
      approvalCode: approval.approvalCode,
      message: approval.resultMessage,
    })
    const paid = await updatePaymentOrder(order.orderId, { status: 'paid' })
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
    respondRequestFailure(res, err, '결제 주문 조회 실패')
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
    respondRequestFailure(res, err, '열람 상태 저장 실패')
  }
})

app.get('/api/user/orders', async (req, res) => {
  try {
    const owner = await requireSupabaseUser(req, res)
    if (!owner) return
    const orders = await listPaymentOrders(owner.id, parseListLimit(req.query.limit))
    res.json({ orders: orders.map(clientPaymentOrder), storage: getPaymentStorageMode() })
  } catch (err) {
    respondRequestFailure(res, err, '결제 내역 조회 실패')
  }
})


app.get('/api/user/profile', async (req, res) => {
  try {
    const owner = await requireSupabaseUser(req, res)
    if (!owner) return
    const profile = await getUserBirthProfile(owner)
    res.json(userProfilePayload(profile, owner))
  } catch (err) {
    respondRequestFailure(res, err, '사주 프로필 조회 실패')
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
    respondRequestFailure(res, err, '풀이 보관함 조회 실패')
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
    respondRequestFailure(res, err, '운명록 조회 실패')
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
    respondRequestFailure(res, err, '풀이 삭제 실패')
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
    respondRequestFailure(res, err, '오늘의 운세 생성 실패')
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
      res.json({ todayFortune: record.auxiliary.todayFortune, report: analysis.report, reportId: record.reportId, resultId: analysis.report.resultId, publicUrl: analysis.report.publicUrl, birth: record.birth, context: publicReportContext(record.context), analysis })
      return
    }
    applyReportEntitlement(analysis.report, access, owner)
    res.json({ report: analysis.report, reportId: record.reportId, resultId: analysis.report.resultId, publicUrl: analysis.report.publicUrl, birth: record.birth, context: publicReportContext(record.context), analysis, cached: true })
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
    respondRequestFailure(res, err, '소비성향 생성 실패')
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
    respondRequestFailure(res, err, '커플궁합 생성 실패')
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
    respondRequestFailure(res, err, '직업운 생성 실패')
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
    respondRequestFailure(res, err, '퇴사운 생성 실패')
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
    respondRequestFailure(res, err, '직장 선택 풀이 생성 실패')
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
    respondRequestFailure(res, err, '고양이 궁합 생성 실패')
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
    // 프로필의 출생시각 확인 여부를 입력에 실어야 judgeCandidate 가 용신 일치를
    // 확정으로 선고하지 않는다. 넘기지 않으면 기본값 true 로 취급된다.
    input.birthTimeKnown = profile.birthTimeKnown
    if (input.candidateDates.length === 0) {
      res.status(400).json({ code: 'INPUT_REQUIRED', error: '후보일을 하나 이상 골라 주세요. 날짜가 있어야 조건을 비교할 수 있습니다.' })
      return
    }
    const analysis = analyzeSaju(profile.birth)
    // 명식을 함께 넘겨야 문맥에 후보일 판정·조건 수·상대 명식이 실린다.
    const context = { ...buildWeddingContext(profile.name, input, analysis), birthTimeKnown: profile.birthTimeKnown }
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
    respondRequestFailure(res, err, '결혼 택일 풀이 생성 실패')
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
    respondRequestFailure(res, err, '2027년 흐름 풀이 생성 실패')
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
    respondRequestFailure(res, err, '색과 물건 풀이 생성 실패')
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
    respondRequestFailure(res, err, '결혼궁합 생성 실패')
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
    respondRequestFailure(res, err, '상대방 마음 생성 실패')
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
    respondRequestFailure(res, err, '관계 신호 생성 실패')
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
    respondRequestFailure(res, err, '올해 연애운 생성 실패')
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
    respondRequestFailure(res, err, '재회운 생성 실패')
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
    respondRequestFailure(res, err, '배우자운 생성 실패')
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
      res.status(400).json({ code: 'INPUT_REQUIRED', error: '이 서비스는 전용 입력 경로에서 시작해 주세요. 다른 서비스의 일반 해석으로 대체하지 않습니다.' })
      return
    }
    if (!birth.year || !birth.month || !birth.day) {
      res.status(400).json({ code: 'INPUT_REQUIRED', error: '생년월일을 입력해 주세요.' })
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
    respondRequestFailure(res, err, '분석 실패')
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
      res.json({ todayFortune: record.auxiliary.todayFortune, report: analysis.report, reportId: record.reportId, resultId: analysis.report.resultId, publicUrl: analysis.report.publicUrl, birth: record.birth, context: publicReportContext(record.context), analysis })
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
      context: publicReportContext(record.context),
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
    respondRequestFailure(res, err, '상담 저장 실패')
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

/** 신고 사유. 화면이 고정 목록에서 고르게 하고 서버가 다시 확인한다. */
const REPORT_FLAG_REASONS = new Set([
  'inaccurate',
  'harmful',
  'offensive',
  'privacy',
  'other',
])

/**
 * 생성형 AI 결과 신고.
 *
 * 정책은 앱을 나가지 않고 결과를 신고할 수 있는 경로를 요구한다. 신고는 본인이 연
 * 리포트에 대해서만 받고, 어떤 항목을 두고 한 신고인지 함께 남겨 나중에 그 문장을
 * 다시 볼 수 있게 한다.
 */
app.post('/api/report/flag', async (req, res) => {
  try {
    const owner = await requireSupabaseUser(req, res)
    if (!owner) return

    const id = trimmedString(req.body?.reportId || req.body?.resultId)
    const reason = trimmedString(req.body?.reason)
    const sectionId = trimmedString(req.body?.sectionId)
    const detail = trimmedString(req.body?.detail).slice(0, 1000)
    if (!id || !reason) {
      res.status(400).json({ code: 'INPUT_REQUIRED', error: '신고할 해석과 사유를 골라 주세요.' })
      return
    }
    if (!REPORT_FLAG_REASONS.has(reason)) {
      res.status(400).json({ code: 'INPUT_REQUIRED', error: '신고 사유를 목록에서 골라 주세요.' })
      return
    }

    const record = await findReportRecord(id, owner)
    if (!record) {
      res.status(404).json({ error: '신고할 해석을 찾지 못했습니다.' })
      return
    }

    const flag = {
      id: randomUUID(),
      ...(sectionId ? { sectionId } : {}),
      reason,
      ...(detail ? { detail } : {}),
      createdAt: new Date().toISOString(),
    }
    const saved = await mutateReportRecord(record.reportId, owner, (current: ReportRecord) => {
      current.flags = [...(current.flags ?? []), flag]
    })
    if (!saved) {
      res.status(500).json({ error: '신고를 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.' })
      return
    }

    // 운영이 알아차릴 수 있도록 한 줄 남긴다. 신고 본문은 개인 입력이 섞일 수 있어
    // 사유와 위치만 적고 내용은 리포트에서 확인한다.
    console.warn(`[report-flag] reportId=${record.reportId} section=${sectionId || '-'} reason=${reason}`)

    res.json({
      accepted: true,
      flagId: flag.id,
      message: '신고를 접수했습니다. 확인 후 개선에 반영합니다.',
    })
  } catch (err) {
    respondRequestFailure(res, err, '신고 접수 실패')
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
    // 결제가 열리지 않는 이유는 운영자만 보면 된다. 고객 화면에는 환경변수 이름 대신
    // PAYMENT_UNAVAILABLE_NOTICE 가 나간다.
    const paymentBlockers = paymentSetupMessage(publicInicisConfig().enabled, getPaymentStorageMode())
    if (paymentBlockers) console.log(`결제: ${paymentBlockers}`)
  })
}
