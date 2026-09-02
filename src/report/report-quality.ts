import type {
  Element,
  SajuAnalysis,
  SajuReport,
  SajuReportContext,
  SajuReportQuality,
  SajuReportQualityCategory,
  SajuReportSection,
} from '../types/index.js'
import { ELEMENT_KO } from '../saju/analyzer-helpers.js'
import { pillarLabel } from '../saju/calculator.js'
import { normalizeReportCopy } from './copy-guide.js'

interface QualityRule {
  id: string
  label: string
  sectionIds: string[]
  expectedTerms: string[]
  riskExpected?: boolean
}

const QUALITY_RULES: QualityRule[] = [
  { id: 'four-pillars', label: '사주팔자 / 명식 구조', sectionIds: ['pillars-structure', 'year-pillar', 'month-pillar', 'day-pillar', 'hour-pillar'], expectedTerms: ['사주', '년주', '월주', '일주', '시주', '명식'] },
  { id: 'manseryeok', label: '만세력 엔진', sectionIds: ['pillars-structure', 'future-flow'], expectedTerms: ['절기', '입춘', '월절', '지장간', '대운', '세운'] },
  { id: 'day-master', label: '일간 풀이', sectionIds: ['profile', 'day-master-strength'], expectedTerms: ['일간', '기질', '성향', '중심'] },
  { id: 'day-strength', label: '일간 강약', sectionIds: ['day-master-strength', 'balance'], expectedTerms: ['강약', '신강', '신약', '월령', '버티는'] },
  { id: 'elements', label: '오행 풀이', sectionIds: ['balance', 'dominant-element', 'weak-element'], expectedTerms: ['오행', '목', '화', '토', '금', '수', '기운'] },
  { id: 'ten-gods', label: '십신 풀이', sectionIds: ['ten-gods-overview', 'ten-gods-position'], expectedTerms: ['십신', '비겁', '식상', '재성', '관성', '인성'] },
  { id: 'useful-god', label: '용신 / 조후 / 통관', sectionIds: ['useful-god-eokbu', 'useful-god-johu'], expectedTerms: ['용신', '희신', '기신', '조후', '통관', '격국'] },
  { id: 'personality', label: '성격 / 기질 풀이', sectionIds: ['profile', 'hidden-personality'], expectedTerms: ['성격', '기질', '숨겨진', '매력', '반응'] },
  { id: 'concern', label: '현재 고민 풀이', sectionIds: ['trap', 'concern-loop'], expectedTerms: ['고민', '반복', '함정', '패턴', '끊어야'] },
  { id: 'fortune-cycle', label: '대운 · 세운', sectionIds: ['future-flow', 'daewoon-detail', 'sewoon-detail'], expectedTerms: ['대운', '세운', '전환', '올해', '흐름'] },
  { id: 'turning-point', label: '인생 전환 시기', sectionIds: ['turning-years', 'timing-place'], expectedTerms: ['전환', '시기', '신호', '장소', '흔들'] },
  { id: 'wealth', label: '재물운', sectionIds: ['wealth-flow', 'money-leak', 'wealth-timing'], expectedTerms: ['돈', '재물', '재성', '수입', '지출', '돈구멍'] },
  { id: 'career', label: '일 / 직업 흐름', sectionIds: ['career-money', 'work-context', 'career-transition'], expectedTerms: ['일', '직업', '직장', '사업', '계약', '전환'] },
  { id: 'love', label: '연애운', sectionIds: ['relationship-status', 'love-loop', 'love-timing'], expectedTerms: ['연애', '관계', '일지', '인연', '끌림'] },
  { id: 'destiny', label: '인연 / 운명의 상대', sectionIds: ['destiny-partner', 'love-timing'], expectedTerms: ['운명', '상대', '인연', '분위기', '오래'] },
  { id: 'relationship-loop', label: '관계 반복 패턴', sectionIds: ['love-loop', 'avoid-relationship', 'trap'], expectedTerms: ['반복', '관계', '함정', '거리감', '멀리'] },
  { id: 'same-sex-relationship', label: '동성 관계 해석', sectionIds: ['relationship-orientation', 'avoid-relationship'], expectedTerms: ['동성', '비겁', '인성', '식상', '거리감'] },
  { id: 'timing-place', label: '시기와 장소', sectionIds: ['timing-place', 'love-timing', 'wealth-timing'], expectedTerms: ['시기', '장소', '공간', '신호', '대운', '세운'] },
  { id: 'long-report', label: '긴 리포트 구조', sectionIds: ['long-report-depth', 'action-guide'], expectedTerms: ['리포트', '근거', '선택지', '행동', '구조'] },
  { id: 'rag-precision', label: 'RAG 검색 정밀도', sectionIds: ['long-report-depth', 'concern-loop', 'relationship-status'], expectedTerms: ['이번 장은', '대조', '선택지', '근거', 'RAG'] },
  { id: 'corpus-quality', label: '코퍼스 근거성', sectionIds: ['long-report-depth', 'useful-god-johu', 'ten-gods-position'], expectedTerms: ['코퍼스', '근거', '격국', '조후', '통관'] },
  { id: 'risk-tone', label: '안 좋은 말투 / 경고', sectionIds: ['trap', 'avoid-relationship', 'money-leak', 'future-flow'], expectedTerms: ['좋은 말만', '위험', '조심', '방치', '돈구멍'], riskExpected: true },
]

const LOVE_THIS_YEAR_QUALITY_RULES: QualityRule[] = [
  { id: 'love-possibility', label: '올해 연애 가능성', sectionIds: ['love-year-possibility'], expectedTerms: ['올해', '연애', '가능성', '세운', '관계'] },
  { id: 'love-attraction', label: '연애 성향 / 끌림 구조', sectionIds: ['love-attraction-pattern'], expectedTerms: ['일지', '끌림', '성향', '관계', '반응'] },
  { id: 'love-dohwa', label: '도화 시기', sectionIds: ['love-dohwa-months'], expectedTerms: ['도화', '시기', '월', '타이밍', '신호'] },
  { id: 'love-spouse-star', label: '배우자성', sectionIds: ['love-spouse-star'], expectedTerms: ['배우자성', '재성', '관성', '인연', '유형'] },
  { id: 'love-monthly-flow', label: '월별 흐름', sectionIds: ['love-monthly-flow'], expectedTerms: ['월별', '세운', '만남', '흐름', '관계'] },
  { id: 'love-progress', label: '진전 타이밍', sectionIds: ['love-progress-timing'], expectedTerms: ['진전', '타이밍', '약속', '고백', '확인'] },
  { id: 'love-risk', label: '놓치는 신호 / 실수 패턴', sectionIds: ['love-missed-signals'], expectedTerms: ['놓치', '신호', '실수', '패턴', '위험'], riskExpected: true },
  { id: 'love-partner', label: '상대 사주 / 궁합 흐름', sectionIds: ['love-partner-compatibility'], expectedTerms: ['상대', '사주', '궁합', '일간', '오행'] },
  { id: 'love-temperature', label: '감정 온도 차이', sectionIds: ['love-emotion-temperature'], expectedTerms: ['감정', '온도', '속도', '표현', '거리'] },
  { id: 'love-action', label: '연애 성사 전략', sectionIds: ['love-action-strategy'], expectedTerms: ['전략', '행동', '약속', '소개', '해법'] },
  { id: 'love-rag', label: 'LOVE RAG 근거성', sectionIds: ['love-year-possibility', 'love-dohwa-months', 'love-partner-compatibility'], expectedTerms: ['이번 장은', '대조', '관계', '시기', '상대'] },
]

const HOME_FIT_QUALITY_RULES: QualityRule[] = [
  { id: 'home-overall', label: '집 풍수 적합도', sectionIds: ['home-fit-overall'], expectedTerms: ['집', '풍수', '사주', '오행', '목적'] },
  { id: 'home-energy', label: '집의 기본 기운', sectionIds: ['house-energy'], expectedTerms: ['현관', '창밖', '동선', '앞', '뒤'] },
  { id: 'home-ohaeng', label: '사주 × 집 오행 핏', sectionIds: ['saju-house-ohaeng'], expectedTerms: ['오행', '목', '화', '토', '금', '수'] },
  { id: 'home-sleep', label: '잠·회복·멘탈 리듬', sectionIds: ['sleep-recovery'], expectedTerms: ['잠', '회복', '침실', '멘탈', '조명'], riskExpected: true },
  { id: 'home-entrance', label: '현관·동선 에너지', sectionIds: ['entrance-flow'], expectedTerms: ['현관', '동선', '문', '신발', '들어오는'] },
  { id: 'home-focus', label: '재택·공부·일 집중력', sectionIds: ['remote-focus'], expectedTerms: ['책상', '재택', '공부', '일', '집중'] },
  { id: 'home-money', label: '돈·살림·소비 흐름', sectionIds: ['money-living'], expectedTerms: ['돈', '살림', '소비', '수납', '주방'], riskExpected: true },
  { id: 'home-relationship', label: '관계·가족·동거 케미', sectionIds: ['relationship-cohabitation'], expectedTerms: ['관계', '가족', '동거', '공간', '거리감'] },
  { id: 'home-fix', label: '공간별 손질 처방', sectionIds: ['spatial-fix'], expectedTerms: ['손질', '처방', '현관', '침실', '책상'] },
  { id: 'home-action', label: '현실 체크 & 액션 플랜', sectionIds: ['reality-action'], expectedTerms: ['현실', '이사', '7일', '테스트', '판단'], riskExpected: true },
  { id: 'home-grounding', label: 'HOME RAG 근거성', sectionIds: ['home-fit-overall', 'saju-house-ohaeng', 'reality-action'], expectedTerms: ['이번 장은', '대조', '사주', '공간', '기준'] },
]

const WORK_MOVE_QUALITY_RULES: QualityRule[] = [
  { id: 'work-decision', label: '이직 최종 판단', sectionIds: ['work-move-decision'], expectedTerms: ['이직', '회사', '판단', '대운', '세운'] },
  { id: 'work-current-signal', label: '현 회사 신호', sectionIds: ['current-company-signal'], expectedTerms: ['현 회사', '역할', '관성', '신호', '반복'] },
  { id: 'work-constitution', label: '커리어 체질', sectionIds: ['career-constitution'], expectedTerms: ['일간', '오행', '신강', '신약', '용신'] },
  { id: 'work-role-fit', label: '직무 핏', sectionIds: ['role-fit'], expectedTerms: ['직무', '십신', '비견', '식상', '관성'] },
  { id: 'work-new-company', label: '새 회사 궁합', sectionIds: ['new-company-fit'], expectedTerms: ['새 회사', '근무', '이동', '환경', '책임'] },
  { id: 'work-money-terms', label: '연봉·계약 조건', sectionIds: ['money-terms'], expectedTerms: ['연봉', '계약', '업무범위', '돈', '재성'], riskExpected: true },
  { id: 'work-timing', label: '이직 타이밍', sectionIds: ['timing-daewoon-sewoon'], expectedTerms: ['대운', '세운', '타이밍', '퇴사', '입사'] },
  { id: 'work-risk', label: '리스크 브레이크', sectionIds: ['risk-brake'], expectedTerms: ['위험', '브레이크', '번아웃', '계약', '경고'], riskExpected: true },
  { id: 'work-action', label: '90일 액션', sectionIds: ['ninety-day-action'], expectedTerms: ['90일', '이력서', '포트폴리오', '면접', '퇴사'] },
  { id: 'work-grounding', label: 'WORK RAG 근거성', sectionIds: ['work-move-decision', 'money-terms', 'final-checklist'], expectedTerms: ['이번 장은', '대조', '사주', '조건', '기준'] },
]

const TONE_SIGNALS = ['흠', '보입니다', '그 이유', '좋은 말만', '위험', '조심', '시기적으로', '풀 방법', '경고', '흐름', '기운', '기준']
const RISK_SIGNALS = ['좋은 말만', '위험', '방치', '조심', '돈구멍', '과속', '경고']

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function avg(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function includesAny(text: string, terms: string[]): number {
  return terms.filter((term) => text.includes(term)).length
}

function selectedSections(report: SajuReport, ids: string[]): SajuReportSection[] {
  return ids
    .map((id) => report.sections.find((section) => section.id === id))
    .filter((section): section is SajuReportSection => Boolean(section))
}

const HOME_CONTEXT_TERMS: Record<string, string> = {
  apartment: '아파트',
  officetel: '오피스텔',
  villa: '빌라',
  studio: '원룸',
  house: '단독',
  under_3m: '3개월',
  '3m_1y': '1년',
  '1y_3y': '1~3년',
  over_3y: '3년',
  rest: '잠',
  work: '재택',
  money: '돈',
  relationship: '관계',
  move: '이사',
  stay: '계속',
  fix: '손',
  compare: '비교',
  unknown: '궁금',
  sleep: '잠',
  entrance: '현관',
  focus: '집중',
  direct: '한 줄',
  bent: '꺾',
  blocked: '가려',
  quiet: '조용',
  window_road: '소음',
  door_line: '문',
  too_bright: '빛',
  back_wall: '벽',
  back_window: '창',
  face_door: '문',
  mixed_rest: '쉬는 자리',
  open: '트여',
  pressed: '압박',
  road_noise: '소음',
  balanced: '안정',
}

function homeContextTerms(context: SajuReportContext): string[] {
  const home = context.home
  if (!home) return []
  const raw = [
    home.addressOrBuilding,
    home.roadAddress,
    home.jibunAddress,
    home.zonecode,
    home.sido,
    home.sigungu,
    home.bname,
    home.buildingName,
    home.buildingType,
    home.livingPeriod,
    home.mainPurpose,
    home.stayDecision,
    ...(home.painPoints ?? []),
    home.entranceFlow,
    home.bedroomFeel,
    home.deskPosition,
    home.outsideFlow,
    home.extraNote,
  ].filter((value): value is string => Boolean(value && value.trim()))
  return [...raw, ...raw.map((value) => HOME_CONTEXT_TERMS[value]).filter((value): value is string => Boolean(value))]
}

const WORK_MOVE_CONTEXT_TERMS: Record<string, string> = {
  move_considering: '이직',
  offer_review: '오퍼',
  resignation_timing: '퇴사',
  internal_transfer: '부서',
  job_search_start: '이력서',
  role_blur: '역할',
  authority_blur: '결정권',
  boss_pressure: '상사',
  peer_competition: '경쟁',
  recognition_gap: '인정',
  burnout: '번아웃',
  office: '사무실',
  hybrid: '하이브리드',
  remote: '원격',
  shift: '교대',
  field: '현장',
  clear_up: '상승',
  slight_up: '상승',
  similar: '비슷',
  down_for_growth: '성장',
  unclear: '불명확',
  money: '돈',
  growth: '성장',
  mental: '멘탈',
  timing: '타이밍',
  people: '사람',
  stability: '안정',
  resume_ready: '이력서',
  offer_terms_checked: '계약',
  buffer_ready: '버퍼',
  exit_script_ready: '퇴사',
}

function workMoveContextTerms(context: SajuReportContext): string[] {
  const workMove = context.workMove
  if (!workMove) return []
  const raw = [
    workMove.decisionMode,
    workMove.currentCompanySignal,
    workMove.targetCompanyName,
    workMove.targetRole,
    workMove.workType,
    workMove.commuteLocation,
    workMove.salaryFeeling,
    workMove.decisionDate,
    workMove.discomfortPoint,
    workMove.priority,
    ...(workMove.realityChecks ?? []),
  ].filter((value): value is string => Boolean(value && value.trim()))
  return [...raw, ...raw.map((value) => WORK_MOVE_CONTEXT_TERMS[value]).filter((value): value is string => Boolean(value))]
}

function contextTerms(context: SajuReportContext): string[] {
  return [
    context.serviceKey,
    context.target,
    context.orientation,
    context.relationship,
    context.work,
    context.concern,
    context.partner?.name,
    context.partner?.relationship,
    context.partner?.dayMaster,
    context.partner?.dayMasterElement,
    context.partner?.dominantElement,
    ...(context.partner?.tenGods ?? []),
    ...homeContextTerms(context),
    ...workMoveContextTerms(context),
  ].filter((value): value is string => Boolean(value && value.trim()))
}

function analysisTerms(analysis: SajuAnalysis): string[] {
  const p = analysis.fourPillars
  const elements = [
    analysis.dayMasterElement,
    analysis.dominantElement,
    analysis.weakElement,
    analysis.usefulGod,
  ].filter((value): value is Element => Boolean(value))

  return [
    pillarLabel(p.year),
    pillarLabel(p.month),
    pillarLabel(p.day),
    pillarLabel(p.hour),
    analysis.dayMaster,
    ...elements.map((element) => ELEMENT_KO[element]),
    ...analysis.tenGods,
    analysis.fortune?.currentDaewoon ?? '',
    analysis.fortune?.yearPillar ?? '',
    analysis.manseryeok?.gyeokguk.name ?? '',
    analysis.manseryeok?.climate.note ?? '',
    ...(analysis.manseryeok?.flowBridges.map((bridge) => ELEMENT_KO[bridge.bridge]) ?? []),
  ].filter(Boolean)
}

function scoreCategory(rule: QualityRule, report: SajuReport, analysis: SajuAnalysis, context: SajuReportContext): SajuReportQualityCategory {
  const sections = selectedSections(report, rule.sectionIds)
  const text = sections.map((section) => `${section.category} ${section.classification} ${section.hook} ${section.ragTopics.join(' ')} ${section.interpretation}`).join(' ')
  const ragTopics = sections.flatMap((section) => section.ragTopics)
  const expectedHits = includesAny(text, rule.expectedTerms)
  const expectedDenominator = Math.max(1, Math.min(rule.expectedTerms.length, 4))
  const expectedFullyCovered = expectedHits >= expectedDenominator
  const toneHits = includesAny(text, TONE_SIGNALS)
  const riskHits = includesAny(text, RISK_SIGNALS)
  const sectionCoverage = sections.length / Math.max(1, rule.sectionIds.length)
  const contextHit = includesAny(text, contextTerms(context))
  const analysisHit = includesAny(text, analysisTerms(analysis))

  const ragUsagePercent = clampPercent(
    (sectionCoverage * 24) +
    (Math.min(ragTopics.length, sections.length * 5) / Math.max(1, sections.length * 5) * 46) +
    (text.includes('이번 장은') ? 18 : 0) +
    (text.includes('대조') ? 12 : 0),
  )
  const corpusRelevancePercent = clampPercent(
    (sectionCoverage * 25) +
    (Math.min(expectedHits, expectedDenominator) / expectedDenominator * 50) +
    ((expectedFullyCovered || ragTopics.some((topic) => rule.expectedTerms.some((term) => topic.includes(term)))) ? 15 : 0) +
    (contextHit > 0 ? 10 : 0),
  )
  const toneGroundingPercent = clampPercent(
    (Math.min(toneHits, 5) / 5 * 56) +
    (rule.riskExpected ? Math.min(riskHits, 3) / 3 * 24 : 22) +
    (rule.riskExpected
      ? ((text.includes('시기적으로') && text.includes('풀 방법')) || (text.includes('대운') && text.includes('세운')) ? 14 : 0)
      : 14) +
    (sections.every((section) => section.interpretation.length >= 350) ? 8 : 0),
  )
  const llmGroundingPercent = clampPercent(
    (analysisHit >= 6 ? 45 : analysisHit * 7) +
    (Math.min(expectedHits, expectedDenominator) / expectedDenominator * 25) +
    (contextHit > 0 ? 12 : 0) +
    (text.includes('대운') || text.includes('세운') ? 8 : 0) +
    (text.includes('조후') || text.includes('통관') || text.includes('격국') ? 10 : 0),
  )
  const completenessPercent = clampPercent(
    ragUsagePercent * 0.28 +
    corpusRelevancePercent * 0.28 +
    toneGroundingPercent * 0.2 +
    llmGroundingPercent * 0.24,
  )

  return {
    id: rule.id,
    label: rule.label,
    ragUsagePercent,
    corpusRelevancePercent,
    toneGroundingPercent,
    llmGroundingPercent,
    completenessPercent,
    sectionIds: sections.map((section) => section.id),
    evidence: [
      `섹션 ${sections.length}/${rule.sectionIds.length}`,
      `RAG topics ${ragTopics.length}`,
      `분류 키워드 ${expectedHits}/${rule.expectedTerms.length}`,
      `명식 근거 ${analysisHit}`,
      contextHit > 0 ? `선택지/고민 반영 ${contextHit}` : '선택지/고민 직접 반영 약함',
    ],
  }
}

export function evaluateReportQuality(
  report: SajuReport,
  analysis: SajuAnalysis,
  context: SajuReportContext = {},
): SajuReportQuality {
  const rules = context.serviceKey === 'love_this_year'
    ? LOVE_THIS_YEAR_QUALITY_RULES
    : context.serviceKey === 'home_fit'
      ? HOME_FIT_QUALITY_RULES
      : context.serviceKey === 'work_move'
        ? WORK_MOVE_QUALITY_RULES
        : QUALITY_RULES
  const categories = rules.map((rule) => scoreCategory(rule, report, analysis, context))

  return {
    overallPercent: clampPercent(avg(categories.map((category) => category.completenessPercent))),
    ragUsagePercent: clampPercent(avg(categories.map((category) => category.ragUsagePercent))),
    corpusRelevancePercent: clampPercent(avg(categories.map((category) => category.corpusRelevancePercent))),
    toneGroundingPercent: clampPercent(avg(categories.map((category) => category.toneGroundingPercent))),
    llmGroundingPercent: clampPercent(avg(categories.map((category) => category.llmGroundingPercent))),
    categories,
  }
}

export function finalizeSpecializedReport(
  report: SajuReport,
  analysis: SajuAnalysis,
  context: SajuReportContext,
): SajuReport {
  const normalized = normalizeReportCopy(report)
  normalized.quality = evaluateReportQuality(normalized, analysis, context)
  return normalized
}
