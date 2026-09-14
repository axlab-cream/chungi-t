import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { analyzeSaju } from '../src/saju/analyzer.js'
import { buildTemplateSajuReport } from '../src/report/report-generator.js'
import { SERVICE_VOICE_CONTRACTS } from '../src/prompt/service-voice-contracts.js'
import * as thisyear from '../src/love/thisyear-service.js'
import * as mind from '../src/love/mind-service.js'
import * as again from '../src/love/again-service.js'
import * as spouse from '../src/love/spouse-service.js'
import * as signal from '../src/love/signal-service.js'
import * as couple from '../src/match/couple-service.js'
import * as marry from '../src/match/marry-service.js'
import * as money from '../src/money/save-service.js'
import * as job from '../src/work/job-service.js'
import * as jobChoice from '../src/work/jobchoice-service.js'
import * as cat from '../src/pet/cat-service.js'
import type { BirthInput, SajuReport, SajuReportContext, SajuReportSection } from '../src/types/index.js'

type SourceKind = 'provider-verified' | 'deterministic-verified' | 'production-template-qa'
type ExportSection = Pick<SajuReportSection, 'id' | 'order' | 'category' | 'classification' | 'hook' | 'interpretation'>

interface ExportedService {
  serviceKey: string
  serviceTitle: string
  reportTitle: string
  promise: string
  sourceKind: SourceKind
  sourceLabel: string
  evidenceNote: string
  recordSha256?: string
  corpus?: { version?: string; contentHash?: string; registryVersion?: string }
  sections: ExportSection[]
}

const outputPath = resolve(process.argv[2] ?? 'tmp/pdfs/final-service-reports.json')
const root = resolve('.')
const actualRecords: Record<string, { path: string; sourceKind: SourceKind; sourceLabel: string; evidenceNote: string }> = {
  today_fortune: { path: '.cache/today-fortune-full-outline-20260913/records/d3e09ce02c76e9fd7cbffd8572f8.json', sourceKind: 'deterministic-verified', sourceLabel: '실제 규칙 엔진 저장·재생 검증', evidenceNote: 'daily-rules-v3 저장 결과, 7/7 필드와 5개 관계·12개 띠 분기 검증 완료' },
  lucky_color: { path: '.cache/reading-live-20260907/records/5a2c98670ab4d5a26c2cff6a834b.json', sourceKind: 'provider-verified', sourceLabel: '실제 provider 생성·저장·재생 검증', evidenceNote: '24/24 전체 목차 완료 및 production-equivalent replay 통과' },
  quit_fortune: { path: '.cache/reading-live-20260907/records/42e1185b6d6fb84dc4a98f830e2d.json', sourceKind: 'provider-verified', sourceLabel: '실제 provider 생성·저장·재생 검증', evidenceNote: '48/48 전체 목차 완료 및 production-equivalent replay 통과' },
  pass_angle: { path: '.cache/reading-live-20260907/records/d69bb13bcb4041d87c1b45027be5.json', sourceKind: 'provider-verified', sourceLabel: '실제 provider 생성·저장·재생 검증', evidenceNote: '52/52 전체 목차 완료 및 production-equivalent replay 통과' },
  newyear_flow: { path: '.cache/reading-live-20260907/records/6d8f803aa124d4b1e74338d767d2.json', sourceKind: 'provider-verified', sourceLabel: '실제 provider 생성·저장·재생 검증', evidenceNote: '36/36 전체 목차 완료 및 production-equivalent replay 통과' },
  wedding_day: { path: '.cache/reading-live-20260907/records/aa873d319ba79520285271cac79e.json', sourceKind: 'provider-verified', sourceLabel: '실제 provider 생성·저장·재생 검증', evidenceNote: '20/20 전체 목차 완료 및 production-equivalent replay 통과' },
}

const userBirth: BirthInput = { year: 1992, month: 8, day: 20, hour: 12, minute: 0, gender: 'male', calendar: 'solar' }
const partnerBirth: BirthInput = { year: 1994, month: 9, day: 12, hour: 12, minute: 0, gender: 'female', calendar: 'solar' }
const userAnalysis = analyzeSaju(userBirth)
const partnerAnalysis = analyzeSaju(partnerBirth)

function buildGeneratedReports(): Record<string, SajuReport> {
  const relationshipBody = {
    relationship_status: 'dating', partner_star_basis: 'wealth_star', relationshipStatus: '연애 중', relationshipStage: '연애 중',
    partnerName: '합성 상대', partnerBirthText: '19940912', partnerBirth, partnerBirthTimeKnown: true,
    conflictPattern: '일정 조율', marriagePlan: '아직 정하지 않았어요', signalFocus: '연락 방식',
    contactPattern: '서로 편한 때 연락해요', recentSignal: '약속을 함께 정해요', breakupReason: '일정 차이',
    currentSignal: '서로 안부만 나눠요', breakupPeriod: '3개월', marriagePriority: '생활과 책임감',
    meetingRoute: '소개와 지인 모임', concern: '약속을 정할 때 서로 가능한 시간을 알고 싶어요.',
  }
  const loveThisYear = thisyear.parseLoveThisYearRequest(relationshipBody)
  const loveMind = mind.parseLoveMindRequest(relationshipBody)
  const loveAgain = again.parseLoveAgainRequest(relationshipBody)
  const loveSpouse = spouse.parseLoveSpouseRequest(relationshipBody)
  const loveSignal = signal.parseLoveSignalRequest(relationshipBody)
  const matchCouple = couple.parseCoupleMatchRequest(relationshipBody)
  const marryMatch = marry.parseMarryMatchRequest(relationshipBody)
  const moneyInput = money.parseMoneySaveRequest({ moneyHabit: '월급날 이후 일주일에 많이 씁니다', incomePattern: '고정 월급', leakPoint: '모임과 선물', relationSpending: '거절이 어려운 편', savingGoal: '비상금', concern: '월말이면 돈이 남지 않습니다.' })
  const jobInput = job.parseWorkJobRequest({ currentJob: '브랜드 마케팅', workStyle: '기획과 표현이 많은 일', mainStress: '평가와 인정 부족', wantedDirection: '성과가 보이는 일', concern: '지금 일이 나와 맞는지 확인하고 싶습니다.' })
  const jobChoiceInput = jobChoice.parseJobChoiceRequest({ companyName: 'A회사 최종 오퍼', roleName: '콘텐츠 기획', workMode: 'hybrid', commute: '왕복 90분, 주 2회 재택', salaryFeeling: 'low', decisionDate: '2026-09-20', concernPoint: '상사 스타일이 강해 보이고 역할 범위가 애매합니다.' })
  const catInput = cat.parseCatCompatRequest({ cat_nickname: '나비', cat_household: 'single_cat', cat_age_band: 'adult', cat_behavior_tags: ['shy', 'sensitive', 'night_runner'], cat_touch_style: 'short_touch', cat_play_energy: 'night', routine_flags: ['sleep_conflict', 'food_rhythm'], focus_area: 'distance', upcoming_event: 'clinic', free_note: '밤에 자꾸 깨워서 잠을 못 자요.' })
  const masterContext: SajuReportContext = { serviceKey: 'saju_master', name: '검증 사용자', target: '본인', concern: '직장과 관계의 반복 패턴을 이해하고 싶어요.', relationship: '연애 중', work: '브랜드 마케팅', birthTimeKnown: true }
  const workMoveContext: SajuReportContext = { serviceKey: 'work_move', name: '검증 사용자', target: '이직운', concern: '서면 오퍼 조건과 현재 역할을 비교하고 싶어요.', workMove: { decisionMode: 'compare', currentCompanySignal: 'role_blur', targetCompanyName: 'B회사', targetRole: '서비스 기획', workType: 'hybrid', commuteLocation: '왕복 70분', salaryFeeling: 'similar', decisionDate: '2026-10-01', discomfortPoint: '역할 범위가 모호함', priority: '성장과 생활 균형', realityChecks: ['resume_ready', 'offer_terms_checked'] } }
  const homeContext: SajuReportContext = { serviceKey: 'home_fit', name: '검증 사용자', target: '집 풍수', concern: '현재 집에서 수면과 집중이 잘 맞는지 확인하고 싶어요.', home: { addressOrBuilding: '서울시 합성 테스트 주거', buildingType: '아파트', livingPeriod: '1년 이상', mainPurpose: '휴식과 재택근무', stayDecision: '당분간 거주', painPoints: ['수면', '집중'], entranceFlow: '현관 수납이 복잡함', bedroomFeel: '아침 빛은 좋지만 밤 소음이 있음', deskPosition: '창가 옆', outsideFlow: '도로와 공원이 함께 보임', extraNote: '검증용 합성 입력' } }
  return {
    saju_master: buildTemplateSajuReport(userAnalysis, userBirth, masterContext),
    love_this_year: thisyear.buildLoveThisYearReport(userAnalysis, userBirth, thisyear.buildLoveThisYearContext('검증 사용자', loveThisYear), loveThisYear, 'final-love-this-year'),
    job_choice: jobChoice.buildJobChoiceReport(userAnalysis, userBirth, jobChoice.buildJobChoiceContext('검증 사용자', jobChoiceInput), jobChoiceInput, 'final-job-choice'),
    money_save: money.buildMoneySaveReport(userAnalysis, userBirth, money.buildMoneySaveContext('검증 사용자', moneyInput), moneyInput, 'final-money-save'),
    cat_compatibility: cat.buildCatCompatReport(userAnalysis, userBirth, cat.buildCatCompatContext('검증 사용자', catInput), catInput, 'final-cat-compatibility'),
    match_couple: couple.buildCoupleMatchReport(userAnalysis, partnerAnalysis, userBirth, couple.buildCoupleMatchContext('검증 사용자', matchCouple, partnerAnalysis), matchCouple, 'final-match-couple'),
    marry_match: marry.buildMarryMatchReport(userAnalysis, partnerAnalysis, userBirth, marry.buildMarryMatchContext('검증 사용자', marryMatch, partnerAnalysis), marryMatch, 'final-marry-match'),
    couple_signal: signal.buildLoveSignalReport(userAnalysis, partnerAnalysis, userBirth, signal.buildLoveSignalContext('검증 사용자', loveSignal, partnerAnalysis), loveSignal, 'final-couple-signal'),
    work_move: buildTemplateSajuReport(userAnalysis, userBirth, workMoveContext),
    work_job: job.buildWorkJobReport(userAnalysis, userBirth, job.buildWorkJobContext('검증 사용자', jobInput), jobInput, 'final-work-job'),
    love_mind: mind.buildLoveMindReport(userAnalysis, userBirth, mind.buildLoveMindContext('검증 사용자', loveMind, partnerAnalysis), loveMind, partnerAnalysis, 'final-love-mind'),
    love_again: again.buildLoveAgainReport(userAnalysis, userBirth, again.buildLoveAgainContext('검증 사용자', loveAgain, partnerAnalysis), loveAgain, partnerAnalysis, 'final-love-again'),
    love_spouse: spouse.buildLoveSpouseReport(userAnalysis, userBirth, spouse.buildLoveSpouseContext('검증 사용자', loveSpouse), loveSpouse, 'final-love-spouse'),
    home_fit: buildTemplateSajuReport(userAnalysis, userBirth, homeContext),
  }
}

function digest(raw: string): string { return createHash('sha256').update(raw).digest('hex') }
function corpusOf(report: SajuReport, serviceKey: string): ExportedService['corpus'] {
  const pack = report.corpus?.activePacks?.find((candidate) => candidate.serviceKey === serviceKey)
  return { registryVersion: report.corpus?.registryVersion, version: pack?.version, contentHash: pack?.contentHash }
}
function cleanSections(report: SajuReport, serviceKey: string): ExportSection[] {
  if (!Array.isArray(report.sections) || report.sections.length === 0) throw new Error(`${serviceKey}: no sections`)
  const ids = new Set<string>()
  return report.sections.map((section, index) => {
    if (!section.id || ids.has(section.id)) throw new Error(`${serviceKey}: invalid or duplicate section id ${section.id}`)
    ids.add(section.id)
    const hook = String(section.hook ?? '').trim()
    const interpretation = String(section.interpretation ?? '').trim()
    if (!hook || interpretation.length < 40) throw new Error(`${serviceKey}/${section.id}: incomplete customer copy`)
    return { id: section.id, order: section.order ?? index + 1, category: String(section.category ?? '상세 해석'), classification: String(section.classification ?? '해석'), hook, interpretation }
  })
}

const generatedReports = buildGeneratedReports()
const services: ExportedService[] = Object.keys(SERVICE_VOICE_CONTRACTS).map((serviceKey) => {
  const contract = SERVICE_VOICE_CONTRACTS[serviceKey as keyof typeof SERVICE_VOICE_CONTRACTS]
  const actual = actualRecords[serviceKey]
  if (actual) {
    const raw = readFileSync(resolve(root, actual.path), 'utf8')
    const stored = JSON.parse(raw) as { report: SajuReport }
    if (!stored.report) throw new Error(`${serviceKey}: stored report missing`)
    return { serviceKey, serviceTitle: contract.serviceTitle, reportTitle: stored.report.title, promise: contract.promise, sourceKind: actual.sourceKind, sourceLabel: actual.sourceLabel, evidenceNote: actual.evidenceNote, recordSha256: digest(raw), corpus: corpusOf(stored.report, serviceKey), sections: cleanSections(stored.report, serviceKey) }
  }
  const report = generatedReports[serviceKey]
  if (!report) throw new Error(`${serviceKey}: report builder is not connected`)
  return { serviceKey, serviceTitle: contract.serviceTitle, reportTitle: report.title, promise: contract.promise, sourceKind: 'production-template-qa', sourceLabel: '운영 코드·코퍼스·RAG 기반 합성 QA', evidenceNote: '고객 데이터 없이 현재 production-equivalent 빌더로 생성. provider 전체 목차 독립 검수는 미부착 상태', corpus: corpusOf(report, serviceKey), sections: cleanSections(report, serviceKey) }
})
if (services.length !== 20 || new Set(services.map((service) => service.serviceKey)).size !== 20) throw new Error(`expected 20 unique services, got ${services.length}`)
const payload = {
  documentTitle: '운명상회 전체 서비스 최종 해석 산출물', generatedAt: '2026-09-13', environment: 'production-equivalent / synthetic QA only',
  privacy: '고객 개인정보와 운영 고객 레코드를 포함하지 않음',
  releaseDecision: 'NO_GO - 전체 서비스의 provider·전체 목차·시각 증거가 모두 부착되기 전까지 최종 릴리스 승인으로 사용하지 않음',
  summary: { services: services.length, sections: services.reduce((sum, service) => sum + service.sections.length, 0), providerVerified: services.filter((service) => service.sourceKind === 'provider-verified').length, deterministicVerified: services.filter((service) => service.sourceKind === 'deterministic-verified').length, productionTemplateQa: services.filter((service) => service.sourceKind === 'production-template-qa').length },
  services,
}
mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ outputPath, ...payload.summary }))
