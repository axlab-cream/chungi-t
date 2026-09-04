import runtimeConfig from '../../data/runtime-config.json' with { type: 'json' }
import type {
  BirthInput,
  Element,
  LlmMessage,
  SajuAnalysis,
  SajuReport,
  SajuReportContext,
  SajuReportSection,
  TenGod,
} from '../types/index.js'
import { chatWithOpenAI } from '../llm/openai-adapter.js'
import { formatRagForPrompt, retrieveRagChunks } from '../rag/retriever.js'
import { buildSajuFeatureJson } from '../saju/analyzer.js'
import { pillarLabel } from '../saju/calculator.js'
import { BRANCH_KO, ELEMENT_KO, STEM_KO } from '../saju/analyzer-helpers.js'
import { evaluateReportQuality } from './report-quality.js'
import {
  buildLoveThisYearStoryBeat,
  formatStoryInterpretation,
  toStorytellingPayload,
} from './storytelling.js'

const COMMON_IMAGE_SRC = '/assets/hero-mystic.webp'
const CHEONMYEONG_TONE_GUIDE = [
  '천명사주는 조선 후기의 노련한 관상가·명리학자 같은 말투로 말합니다.',
  '직접 부를 때는 "자네", 강조할 때는 "자네 말이야", 큰 운명을 짚을 때는 "자네라는 사람은..."을 씁니다.',
  '점괘를 설명할 때는 주어를 자주 생략하고, 같은 호칭을 문장마다 반복하지 않습니다.',
  '문장 끝은 "~하게", "~일세", "~군", "~보게", "~걸세"를 중심으로 씁니다.',
  '"당신", "너", "{이름}님"을 반복하지 말고, 이름은 제목이나 확인 문장에만 제한적으로 씁니다.',
  '예: "자네, 요즘 마음에 걸리는 일이 있지 않은가.", "허허... 자네 사주에 재미있는 것이 하나 보이는군.", "잠시 있어 보게. 자네의 명을 조금 더 살펴보겠네."',
].join('\n')
const REPORT_MODEL = process.env.REPORT_OPENAI_MODEL ?? runtimeConfig.report?.model ?? 'gpt-5.5'
const LOVE_THIS_YEAR_SERVICE_KEY = 'love_this_year'
const HOME_FIT_SERVICE_KEY = 'home_fit'
const WORK_MOVE_SERVICE_KEY = 'work_move'
const PASS_ANGLE_SERVICE_KEY = 'pass_angle'

type ReportFocus =
  | 'profile'
  | 'target'
  | 'balance'
  | 'trap'
  | 'relationshipContext'
  | 'workContext'
  | 'careerMoney'
  | 'moneyLeak'
  | 'love'
  | 'destiny'
  | 'future'
  | 'timingPlace'
  | 'reportDepth'
  | 'action'

interface ReportBlueprint {
  id: string
  category: string
  categoryEn: string
  focus: ReportFocus
  query: string
}

const REPORT_BLUEPRINTS: ReportBlueprint[] = [
  {
    id: 'profile',
    category: '나의 매력 기본 스펙',
    categoryEn: 'The Profile',
    focus: 'profile',
    query: '일간 성격 오행 사주팔자 기본 성향',
  },
  {
    id: 'target-context',
    category: '누구의 사주인가',
    categoryEn: 'The Target',
    focus: 'target',
    query: '본인 가족 연인 친구 기타 대상 선택 상담 방향',
  },
  {
    id: 'pillars-structure',
    category: '명식의 뼈대',
    categoryEn: 'The Four Pillars',
    focus: 'profile',
    query: '명식 사주팔자 년주 월주 일주 시주 구조 기둥',
  },
  {
    id: 'year-pillar',
    category: '년주에 남은 배경',
    categoryEn: 'Year Pillar',
    focus: 'profile',
    query: '년주 초년운 배경 첫인상 환경 가족',
  },
  {
    id: 'month-pillar',
    category: '월주가 만든 사회 얼굴',
    categoryEn: 'Month Pillar',
    focus: 'trap',
    query: '월주 월령 사회성 직업 반복 고민 무대',
  },
  {
    id: 'day-pillar',
    category: '일주와 가까운 관계',
    categoryEn: 'Day Pillar',
    focus: 'love',
    query: '일주 일간 일지 배우자궁 가까운 관계',
  },
  {
    id: 'hour-pillar',
    category: '시주에 숨은 후반부',
    categoryEn: 'Hour Pillar',
    focus: 'future',
    query: '시주 잠재력 후반부 노년 숨은 욕망',
  },
  {
    id: 'day-master-strength',
    category: '일간의 힘과 버티는 방식',
    categoryEn: 'Day Master Strength',
    focus: 'profile',
    query: '일간 강약 신강 신약 기질 버티는 방식',
  },
  {
    id: 'hidden-personality',
    category: '숨겨진 진짜 성격',
    categoryEn: 'Hidden Self',
    focus: 'trap',
    query: '숨겨진 진짜 성격 지장간 내면 반복 고민',
  },
  {
    id: 'balance',
    category: '나의 기운의 분포',
    categoryEn: 'The Balance',
    focus: 'balance',
    query: '오행 강한 기운 부족한 기운 용신 희신 기신',
  },
  {
    id: 'dominant-element',
    category: '가장 먼저 치고 올라오는 기운',
    categoryEn: 'Dominant Element',
    focus: 'balance',
    query: 'dominant element 강한 오행 과다 목 화 토 금 수',
  },
  {
    id: 'weak-element',
    category: '비어 있는 기운의 자리',
    categoryEn: 'Weak Element',
    focus: 'balance',
    query: '부족한 오행 약한 기운 보완 목 화 토 금 수',
  },
  {
    id: 'ten-gods-overview',
    category: '십신이 말하는 관계성',
    categoryEn: 'Ten Gods',
    focus: 'trap',
    query: '십신 관계성 비겁 식상 재성 관성 인성',
  },
  {
    id: 'ten-gods-position',
    category: '십신이 놓인 자리',
    categoryEn: 'Ten Gods Position',
    focus: 'trap',
    query: '십신 위치 년주 월주 일주 시주 해석',
  },
  {
    id: 'useful-god-eokbu',
    category: '용신 1차 판단',
    categoryEn: 'Useful God',
    focus: 'balance',
    query: '용신 억부 신강 신약 보완 균형',
  },
  {
    id: 'useful-god-johu',
    category: '조후와 온도의 보완',
    categoryEn: 'Climate Balance',
    focus: 'balance',
    query: '용신 조후 온도 한난조습 계절 월령',
  },
  {
    id: 'trap',
    category: '네가 빠지는 함정',
    categoryEn: 'The Trap',
    focus: 'trap',
    query: '십신 비겁 식상 관성 재성 인성 반복 고민 합충형파해',
  },
  {
    id: 'concern-loop',
    category: '현재 고민이 반복되는 이유',
    categoryEn: 'Concern Loop',
    focus: 'trap',
    query: '현재 고민 반복 고민 패턴 마음 사주 연결',
  },
  {
    id: 'relationship-orientation',
    category: '관계 해석 기준',
    categoryEn: 'Orientation',
    focus: 'relationshipContext',
    query: '이성 관계 중심 동성 관계 중심 배우자성 비겁 관계 기준',
  },
  {
    id: 'relationship-status',
    category: '지금 관계 상태',
    categoryEn: 'Relationship Status',
    focus: 'relationshipContext',
    query: '솔로 마음에 둔 사람 연애 중 이별 직후 결혼 관계 상태',
  },
  {
    id: 'career-money',
    category: '일과 돈의 결',
    categoryEn: 'Work & Money',
    focus: 'careerMoney',
    query: '직업 재물 정재 편재 식신 상관 관성 돈 흐름',
  },
  {
    id: 'work-context',
    category: '요즘 일상의 운',
    categoryEn: 'Work Context',
    focus: 'workContext',
    query: '학생 일을 찾고 직장 사업 프리랜서 쉬고 있어요 일상 상태',
  },
  {
    id: 'career-transition',
    category: '버틸지 옮길지의 기준',
    categoryEn: 'Career Turn',
    focus: 'careerMoney',
    query: '이직 퇴사 직장 고민 버틸 옮길 직업 전환',
  },
  {
    id: 'wealth-flow',
    category: '돈이 들어오는 방식',
    categoryEn: 'Wealth Flow',
    focus: 'careerMoney',
    query: '재물운 돈 재성 정재 편재 식상 수입 기회',
  },
  {
    id: 'money-leak',
    category: '돈이 새는 구멍',
    categoryEn: 'Money Leak',
    focus: 'moneyLeak',
    query: '돈구멍 돈이 새는 지출 겁재 상관 관계 비용',
  },
  {
    id: 'wealth-timing',
    category: '재물 기회가 붙는 때',
    categoryEn: 'Wealth Timing',
    focus: 'careerMoney',
    query: '재물 기회 재물 시기 용신 재성 대운 세운',
  },
  {
    id: 'love-loop',
    category: '인연의 반복 패턴',
    categoryEn: 'The Love Loop',
    focus: 'love',
    query: '연애 관계 배우자궁 일지 관성 재성 도화 인연',
  },
  {
    id: 'destiny-partner',
    category: '운명의 상대가 가진 분위기',
    categoryEn: 'Destiny Partner',
    focus: 'destiny',
    query: '운명의 상대 인연 상대 성향 직업적 분위기 관계 패턴',
  },
  {
    id: 'avoid-relationship',
    category: '멀리해야 할 관계',
    categoryEn: 'Avoid Pattern',
    focus: 'relationshipContext',
    query: '멀리해야 할 관계 관계 함정 기신 연애 반복 관계 반복',
  },
  {
    id: 'love-timing',
    category: '인연이 드러나는 시기',
    categoryEn: 'Love Timing',
    focus: 'destiny',
    query: '인연 시기 연애 시기 도화 합 세운 대운 신호',
  },
  {
    id: 'future-flow',
    category: '앞으로 흘러갈 큰 운',
    categoryEn: 'The Flow',
    focus: 'future',
    query: '대운 세운 운 흐름 용신 기신 시기 전환',
  },
  {
    id: 'daewoon-detail',
    category: '대운이 바꾸는 무대',
    categoryEn: 'Daewoon',
    focus: 'future',
    query: '대운 10년 큰 흐름 전환 운세 시기',
  },
  {
    id: 'sewoon-detail',
    category: '올해 세운의 신호',
    categoryEn: 'Sewoon',
    focus: 'future',
    query: '세운 올해 올해운 연도 운세 신호',
  },
  {
    id: 'turning-years',
    category: '인생 전환 구간',
    categoryEn: 'Turning Years',
    focus: 'future',
    query: '인생 전환 전환 시기 특정 연도 변곡점 대운 전환 세운',
  },
  {
    id: 'timing-place',
    category: '시기와 장소의 신호',
    categoryEn: 'Timing & Place',
    focus: 'timingPlace',
    query: '시기와 장소 인연 장소 사건 장소 오행 생활 공간',
  },
  {
    id: 'action-guide',
    category: '지금 붙잡아야 할 신호',
    categoryEn: 'The Signal',
    focus: 'action',
    query: '사주 조언 용신 행동 기준 현재 고민 앞으로',
  },
  {
    id: 'long-report-depth',
    category: '긴 리포트의 읽는 법',
    categoryEn: 'Report Depth',
    focus: 'reportDepth',
    query: '긴 리포트 장문 5만 자 상세 풀이 근거 섹션 95점',
  },
]

const LOVE_THIS_YEAR_BLUEPRINTS: ReportBlueprint[] = [
  {
    id: 'love-year-possibility',
    category: '올해 연애 가능성',
    categoryEn: 'Love Possibility',
    focus: 'love',
    query: '올해 연애 가능성 도화 세운 배우자성 성사 조건',
  },
  {
    id: 'love-attraction-pattern',
    category: '내 연애 성향과 끌림 구조',
    categoryEn: 'Attraction Pattern',
    focus: 'relationshipContext',
    query: '연애 성향 끌림 구조 일지 관계 패턴 마음의 반응',
  },
  {
    id: 'love-dohwa-months',
    category: '도화가 강하게 들어오는 시기',
    categoryEn: 'Dohwa Timing',
    focus: 'timingPlace',
    query: '도화 들어오는 달 월운 세운 합 인연 타이밍',
  },
  {
    id: 'love-spouse-star',
    category: '배우자성으로 보는 인연 유형',
    categoryEn: 'Spouse Star',
    focus: 'destiny',
    query: '배우자성 남명 재성 여명 관성 인연 유형 관계 기준',
  },
  {
    id: 'love-monthly-flow',
    category: '만남이 생기기 쉬운 월별 흐름',
    categoryEn: 'Monthly Flow',
    focus: 'future',
    query: '올해 월별 연애 흐름 만남 생기는 달 세운 월운',
  },
  {
    id: 'love-progress-timing',
    category: '관계가 진전되는 타이밍',
    categoryEn: 'Progress Timing',
    focus: 'timingPlace',
    query: '관계 진전 고백 연락 약속 타이밍 합충 도화',
  },
  {
    id: 'love-missed-signals',
    category: '놓치기 쉬운 신호와 실수 패턴',
    categoryEn: 'Missed Signals',
    focus: 'relationshipContext',
    query: '연애 놓치는 신호 실수 패턴 마음 급함 관계 경계',
  },
  {
    id: 'love-partner-compatibility',
    category: '상대방 사주 입력 시 궁합 흐름',
    categoryEn: 'Partner Compatibility',
    focus: 'destiny',
    query: '상대방 사주 궁합 흐름 일간 일지 오행 감정 속도',
  },
  {
    id: 'love-emotion-temperature',
    category: '상대와 나의 감정 온도 차이',
    categoryEn: 'Emotion Temperature',
    focus: 'relationshipContext',
    query: '상대와 나 감정 온도 차이 관계 속도 표현 거리감',
  },
  {
    id: 'love-action-strategy',
    category: '연애 성사 전략',
    categoryEn: 'Action Strategy',
    focus: 'action',
    query: '연애 성사 행동 전략 지금 할 일 기회 관계 유지',
  },
]

const HOME_FIT_BLUEPRINTS: ReportBlueprint[] = [
  {
    id: 'home-fit-overall',
    category: '이 집, 나랑 찐으로 결 맞아?',
    categoryEn: 'Home Fit Overall',
    focus: 'target',
    query: '집 풍수 현재 사는 집 나와 맞는지 생활 목적 사주 오행 핏',
  },
  {
    id: 'house-energy',
    category: '집의 기본 기운',
    categoryEn: 'House Energy',
    focus: 'timingPlace',
    query: '집 기본 기운 현관 채광 통풍 동선 앞열림 뒤받침 풍수',
  },
  {
    id: 'saju-house-ohaeng',
    category: '내 사주 × 집 오행 핏',
    categoryEn: 'Saju House Elements',
    focus: 'balance',
    query: '사주 오행 집 공간 목 화 토 금 수 침실 책상 현관 보완',
  },
  {
    id: 'sleep-recovery',
    category: '잠·회복·멘탈 리듬',
    categoryEn: 'Sleep Recovery',
    focus: 'action',
    query: '침실 수면 회복 멘탈 소음 빛 압박감 안정 집 풍수',
  },
  {
    id: 'entrance-flow',
    category: '현관·동선 에너지',
    categoryEn: 'Entrance Flow',
    focus: 'timingPlace',
    query: '현관 동선 문 앞 신발장 통로 에너지 흐름 집 풍수',
  },
  {
    id: 'remote-focus',
    category: '재택·공부·일 집중력',
    categoryEn: 'Remote Focus',
    focus: 'workContext',
    query: '재택 공부 책상 등 뒤 문 창 집중력 업무 공간 배치',
  },
  {
    id: 'money-living',
    category: '돈·살림·소비 흐름',
    categoryEn: 'Money Living',
    focus: 'careerMoney',
    query: '돈 살림 소비 수납 주방 결제 충동 지출 집 풍수',
  },
  {
    id: 'relationship-cohabitation',
    category: '관계·가족·동거 케미',
    categoryEn: 'Relationship Cohabitation',
    focus: 'relationshipContext',
    query: '관계 가족 동거 사생활 공용공간 거리감 집 풍수',
  },
  {
    id: 'spatial-fix',
    category: '공간별 손질 처방',
    categoryEn: 'Spatial Fix',
    focus: 'action',
    query: '공간별 처방 커튼 조명 수납 배치 환기 침구 풍수 개선',
  },
  {
    id: 'reality-action',
    category: '현실 체크 & 액션 플랜',
    categoryEn: 'Reality Action',
    focus: 'reportDepth',
    query: '이사 여부 현실 체크 7일 테스트 집 적합도 액션 플랜',
  },
]

const WORK_MOVE_BLUEPRINTS: ReportBlueprint[] = [
  {
    id: 'work-move-decision',
    category: '지금 회사, 옮길 각인가',
    categoryEn: 'Move Decision',
    focus: 'target',
    query: '이직운 이직각 존버각 준비각 보류각 조건부 환승각 대운 세운 관성',
  },
  {
    id: 'current-company-signal',
    category: '현 회사에서 걸리는 신호',
    categoryEn: 'Current Company Signal',
    focus: 'workContext',
    query: '현 회사 역할 흐림 결정권 상사 압박 동료 경쟁 인정 번아웃 관성',
  },
  {
    id: 'career-constitution',
    category: '내 커리어 체질',
    categoryEn: 'Career Constitution',
    focus: 'balance',
    query: '일간 오행 신강 신약 용신 커리어 체질 감당력 직업',
  },
  {
    id: 'role-fit',
    category: '직무 핏과 일의 결',
    categoryEn: 'Role Fit',
    focus: 'careerMoney',
    query: '직무 핏 비견 겁재 식신 상관 재성 관성 인성 역할 업무',
  },
  {
    id: 'new-company-fit',
    category: '새 회사 궁합',
    categoryEn: 'New Company Fit',
    focus: 'timingPlace',
    query: '새 회사 궁합 관록궁 천이궁 재백궁 근무지 조직 이동 환경',
  },
  {
    id: 'money-terms',
    category: '연봉과 계약 조건',
    categoryEn: 'Money Terms',
    focus: 'moneyLeak',
    query: '연봉 조건 계약서 업무범위 성과급 수입 지출 버퍼 재성',
  },
  {
    id: 'timing-daewoon-sewoon',
    category: '움직여도 되는 타이밍',
    categoryEn: 'Move Timing',
    focus: 'future',
    query: '대운 세운 월운 택일 입춘 이직 타이밍 퇴사 입사 전환',
  },
  {
    id: 'risk-brake',
    category: '멈춰 봐야 할 브레이크',
    categoryEn: 'Risk Brake',
    focus: 'trap',
    query: '공망 충 형 파 해 번아웃 계약 리스크 과속 보류 이직 위험',
  },
  {
    id: 'ninety-day-action',
    category: '90일 현실 액션',
    categoryEn: '90 Day Action',
    focus: 'action',
    query: '90일 테스트 이력서 포트폴리오 면접 퇴사 대화 연봉 협상 체크리스트',
  },
  {
    id: 'final-checklist',
    category: '결정 전 마지막 체크',
    categoryEn: 'Final Checklist',
    focus: 'reportDepth',
    query: '이직운 최종 체크리스트 의사결정 계약 조건 멘탈 성장 안정',
  },
]

const ELEMENT_TRAIT: Record<Element, string> = {
  wood: '자라나려는 힘, 새 판을 여는 감각, 멈춰 있는 것을 견디기 어려운 기운',
  fire: '드러나는 힘, 표현과 확신, 사람의 시선을 끌어오는 기운',
  earth: '붙들어 매는 힘, 현실 감각, 오래 책임지려는 기운',
  metal: '가르는 힘, 기준과 판단, 흐트러진 것을 정리하는 기운',
  water: '스며드는 힘, 직관과 기억, 보이지 않는 흐름을 읽는 기운',
}

const TEN_GOD_NOTE: Record<TenGod, string> = {
  비견: '내 기준을 지키려는 힘이 강해서 남에게 쉽게 끌려가지 않습니다',
  겁재: '경쟁과 비교가 들어오면 평소보다 마음이 빠르게 흔들릴 수 있습니다',
  식신: '꾸준히 만들어내고 먹고사는 길을 안정시키는 재능이 있습니다',
  상관: '틀을 깨고 표현하는 힘이 있어 답답한 구조를 오래 견디기 어렵습니다',
  편재: '기회와 사람, 돈의 흐름을 빠르게 잡는 감각이 있습니다',
  정재: '현실 감각과 관리 능력이 살아날수록 재물 흐름이 단단해집니다',
  편관: '압박 속에서 버티는 힘이 있으나, 무리하면 몸과 마음이 먼저 신호를 보냅니다',
  정관: '질서와 책임의 별이 있어 사회적 신뢰를 쌓는 쪽에 힘이 붙습니다',
  편인: '남들이 보지 못한 각도에서 해석하는 감각이 강합니다',
  정인: '배움과 보호의 별이 있어 안정된 기반을 얻을수록 실력이 드러납니다',
}

function cleanContextValue(value: string | undefined, fallback: string): string {
  const next = value?.trim()
  return next && next.length > 0 ? next : fallback
}

const HOME_VALUE_LABELS: Record<string, Record<string, string>> = {
  buildingType: {
    apartment: '아파트',
    officetel: '오피스텔',
    villa: '빌라·연립',
    studio: '원룸',
    house: '단독·다가구',
    other: '기타 주거형',
  },
  livingPeriod: {
    under_3m: '3개월 미만',
    '3m_1y': '3개월~1년',
    '1y_3y': '1~3년',
    over_3y: '3년 이상',
  },
  mainPurpose: {
    rest: '잠·회복',
    work: '재택·공부 집중',
    money: '돈·살림 안정',
    relationship: '동거·가족·관계',
    move: '계약 유지·이사 판단',
  },
  stayDecision: {
    stay: '계속 살 각인지',
    fix: '손보면 괜찮은지',
    compare: '이사 후보와 비교할지',
    unknown: '일단 이유가 궁금함',
  },
  painPoints: {
    sleep: '잠·피로',
    entrance: '현관·동선',
    focus: '집중력',
    money: '돈·살림',
    relationship: '관계·동거',
    move: '이사·계약 판단',
  },
  entranceFlow: {
    direct: '현관에서 안쪽이 한 줄로 보임',
    bent: '동선이 중간에 꺾임',
    blocked: '문·가구로 가려짐',
  },
  bedroomFeel: {
    quiet: '안쪽이고 조용한 침실',
    window_road: '창밖 소음·시선이 있는 침실',
    door_line: '문·복도 자극이 있는 침실',
    too_bright: '빛이 강해 쉬기 어려운 침실',
  },
  deskPosition: {
    back_wall: '등 뒤가 벽이라 안정적인 책상',
    back_window: '등 뒤가 창이라 들뜨는 책상',
    face_door: '문을 정면으로 보는 책상',
    mixed_rest: '쉬는 자리와 섞인 책상',
  },
  outsideFlow: {
    open: '앞이 트인 창밖',
    pressed: '건물 압박감이 있는 창밖',
    road_noise: '큰길·골목 소음이 있는 창밖',
    balanced: '무난하고 안정적인 창밖',
  },
}

function homeValueLabel(field: string, value?: string): string {
  if (!value) return ''
  return HOME_VALUE_LABELS[field]?.[value] ?? value
}

function homePainLabels(context: SajuReportContext): string[] {
  return (context.home?.painPoints ?? []).map((value) => homeValueLabel('painPoints', value)).filter(Boolean)
}

function homeContextSummary(context: SajuReportContext): string {
  const home = context.home
  if (!home) return '집 정보 미입력'
  return [
    home.addressOrBuilding,
    home.sido,
    home.sigungu,
    home.bname,
    home.buildingName,
    homeValueLabel('buildingType', home.buildingType),
    homeValueLabel('livingPeriod', home.livingPeriod),
    homeValueLabel('mainPurpose', home.mainPurpose),
    homeValueLabel('stayDecision', home.stayDecision),
    ...homePainLabels(context),
  ].filter(Boolean).join(' · ') || '집 정보 미입력'
}

function homeContextQuery(context: SajuReportContext): string {
  const home = context.home
  if (!home) return '집 풍수 주거 공간 현관 침실 책상 창밖'
  return [
    '집 풍수 주거 공간 현관 침실 책상 창밖 오행 핏',
    home.addressOrBuilding,
    home.roadAddress,
    home.jibunAddress,
    home.zonecode,
    home.sido,
    home.sigungu,
    home.bname,
    home.buildingName,
    homeValueLabel('buildingType', home.buildingType),
    homeValueLabel('livingPeriod', home.livingPeriod),
    homeValueLabel('mainPurpose', home.mainPurpose),
    homeValueLabel('stayDecision', home.stayDecision),
    ...homePainLabels(context),
    homeValueLabel('entranceFlow', home.entranceFlow),
    homeValueLabel('bedroomFeel', home.bedroomFeel),
    homeValueLabel('deskPosition', home.deskPosition),
    homeValueLabel('outsideFlow', home.outsideFlow),
    home.extraNote,
  ].filter(Boolean).join(' ')
}

function homePatternKeys(context: SajuReportContext): string[] {
  const home = context.home
  if (!home) return []
  return [
    home.buildingType ? `home:buildingType:${home.buildingType}` : '',
    home.livingPeriod ? `home:livingPeriod:${home.livingPeriod}` : '',
    home.mainPurpose ? `home:mainPurpose:${home.mainPurpose}` : '',
    home.stayDecision ? `home:stayDecision:${home.stayDecision}` : '',
    ...(home.painPoints ?? []).map((point) => `home:pain:${point}`),
    home.entranceFlow ? `home:entranceFlow:${home.entranceFlow}` : '',
    home.bedroomFeel ? `home:bedroomFeel:${home.bedroomFeel}` : '',
    home.deskPosition ? `home:deskPosition:${home.deskPosition}` : '',
    home.outsideFlow ? `home:outsideFlow:${home.outsideFlow}` : '',
  ].filter((value): value is string => Boolean(value))
}

const WORK_MOVE_VALUE_LABELS: Record<string, Record<string, string>> = {
  decisionMode: {
    move_considering: '이직을 고민 중',
    offer_review: '오퍼를 받은 상태',
    resignation_timing: '퇴사 타이밍 고민',
    internal_transfer: '부서 이동·직무 전환 고민',
    job_search_start: '이력서부터 시작할지 고민',
  },
  currentCompanySignal: {
    role_blur: '역할이 흐림',
    authority_blur: '결정권이 애매함',
    boss_pressure: '상사 압박이 큼',
    peer_competition: '동료·경쟁 스트레스',
    recognition_gap: '인정받는 느낌이 부족함',
    burnout: '번아웃 신호가 있음',
  },
  workType: {
    office: '사무실 출근',
    hybrid: '하이브리드',
    remote: '원격 중심',
    shift: '교대·스케줄 근무',
    field: '현장·외근 중심',
    unknown: '아직 모름',
  },
  salaryFeeling: {
    clear_up: '확실히 상승',
    slight_up: '조금 상승',
    similar: '비슷함',
    down_for_growth: '성장 때문에 낮아져도 고민',
    unclear: '아직 조건이 불명확함',
  },
  priority: {
    money: '돈 조건',
    growth: '성장',
    mental: '멘탈',
    timing: '타이밍',
    people: '사람',
    stability: '안정감',
  },
  realityChecks: {
    resume_ready: '이력서·포트폴리오 정리됨',
    offer_terms_checked: '오퍼·계약 조건 확인',
    buffer_ready: '퇴사 전 현금 버퍼 확인',
    exit_script_ready: '퇴사·이동 대화 준비',
  },
}

function workMoveValueLabel(field: string, value?: string): string {
  if (!value) return ''
  return WORK_MOVE_VALUE_LABELS[field]?.[value] ?? value
}

function workMoveRealityLabels(context: SajuReportContext): string[] {
  return (context.workMove?.realityChecks ?? []).map((value) => workMoveValueLabel('realityChecks', value)).filter(Boolean)
}

function workMoveContextSummary(context: SajuReportContext): string {
  const workMove = context.workMove
  if (!workMove) return '이직 입력값 미입력'
  return [
    workMoveValueLabel('decisionMode', workMove.decisionMode),
    workMoveValueLabel('currentCompanySignal', workMove.currentCompanySignal),
    workMove.targetCompanyName,
    workMove.targetRole,
    workMoveValueLabel('workType', workMove.workType),
    workMove.commuteLocation,
    workMoveValueLabel('salaryFeeling', workMove.salaryFeeling),
    workMove.decisionDate,
    workMoveValueLabel('priority', workMove.priority),
    workMove.discomfortPoint,
    ...workMoveRealityLabels(context),
  ].filter(Boolean).join(' · ') || '이직 입력값 미입력'
}

function workMoveContextQuery(context: SajuReportContext): string {
  const workMove = context.workMove
  if (!workMove) return '이직운 회사 이동 판단 대운 세운 관성 연봉 계약 직무 핏'
  return [
    '이직운 회사 이동 판단 대운 세운 관성 식상 재성 직무 핏 연봉 계약',
    workMoveValueLabel('decisionMode', workMove.decisionMode),
    workMoveValueLabel('currentCompanySignal', workMove.currentCompanySignal),
    workMove.targetCompanyName,
    workMove.targetRole,
    workMoveValueLabel('workType', workMove.workType),
    workMove.commuteLocation,
    workMoveValueLabel('salaryFeeling', workMove.salaryFeeling),
    workMove.decisionDate,
    workMoveValueLabel('priority', workMove.priority),
    workMove.discomfortPoint,
    ...workMoveRealityLabels(context),
  ].filter(Boolean).join(' ')
}

function workMovePatternKeys(context: SajuReportContext): string[] {
  const workMove = context.workMove
  if (!workMove) return []
  return [
    workMove.decisionMode ? `workMove:decisionMode:${workMove.decisionMode}` : '',
    workMove.currentCompanySignal ? `workMove:currentCompanySignal:${workMove.currentCompanySignal}` : '',
    workMove.targetRole ? `workMove:targetRole:${workMove.targetRole}` : '',
    workMove.workType ? `workMove:workType:${workMove.workType}` : '',
    workMove.salaryFeeling ? `workMove:salaryFeeling:${workMove.salaryFeeling}` : '',
    workMove.priority ? `workMove:priority:${workMove.priority}` : '',
    ...(workMove.realityChecks ?? []).map((check) => `workMove:realityCheck:${check}`),
  ].filter((value): value is string => Boolean(value))
}

function patternKeys(analysis: SajuAnalysis, birth: BirthInput): string[] {
  const p = analysis.fourPillars
  return [
    `birth:${birth.calendar}:${birth.year}-${birth.month}-${birth.day}:${birth.hour}`,
    `yearPillar:${pillarLabel(p.year)}`,
    `monthPillar:${pillarLabel(p.month)}`,
    `dayPillar:${pillarLabel(p.day)}`,
    `hourPillar:${pillarLabel(p.hour)}`,
    `dayMaster:${analysis.dayMaster}`,
    `dayMasterElement:${analysis.dayMasterElement}`,
    `dayMasterStrength:${analysis.dayMasterStrength}`,
    `dominantElement:${analysis.dominantElement}`,
    `weakElement:${analysis.weakElement}`,
    `usefulGod:${analysis.usefulGod ?? 'none'}`,
    ...analysis.tenGods.map((g) => `tenGod:${g}`),
  ]
}

function contextLabel(context: SajuReportContext): string {
  return [
    context.target,
    context.orientation,
    context.relationship,
    context.work,
    context.serviceKey === HOME_FIT_SERVICE_KEY ? homeContextSummary(context) : undefined,
    context.serviceKey === WORK_MOVE_SERVICE_KEY ? workMoveContextSummary(context) : undefined,
    context.serviceKey === PASS_ANGLE_SERVICE_KEY ? examContextSummary(context) : undefined,
    context.partner?.mode === 'known' ? '상대방 사주 포함' : undefined,
  ].filter(Boolean).join(' · ') || '기본 상담'
}

function partnerContextQuery(context: SajuReportContext): string {
  const partner = context.partner
  if (partner?.mode !== 'known') return '특정 상대 없음 새 인연 가능성'
  return [
    '상대방 사주 궁합',
    partner.name,
    partner.relationship,
    partner.dayMaster,
    partner.dayMasterElement,
    partner.dominantElement,
    partner.weakElement,
    ...(partner.tenGods ?? []),
  ].filter(Boolean).join(' ')
}

function reportContextQuery(context: SajuReportContext): string {
  return [
    context.serviceKey === LOVE_THIS_YEAR_SERVICE_KEY ? '올해 연애 가능성 도화 세운 배우자성 궁합 상대방 사주' : undefined,
    context.serviceKey === HOME_FIT_SERVICE_KEY ? homeContextQuery(context) : undefined,
    context.serviceKey === WORK_MOVE_SERVICE_KEY ? workMoveContextQuery(context) : undefined,
    context.serviceKey === PASS_ANGLE_SERVICE_KEY ? examContextQuery(context) : undefined,
    context.target,
    context.orientation,
    context.relationship,
    context.work,
    context.concern,
    context.serviceKey === LOVE_THIS_YEAR_SERVICE_KEY ? partnerContextQuery(context) : undefined,
  ].filter(Boolean).join(' ')
}

function isLoveThisYearContext(context: SajuReportContext): boolean {
  return context.serviceKey === LOVE_THIS_YEAR_SERVICE_KEY
}

function isHomeFitContext(context: SajuReportContext): boolean {
  return context.serviceKey === HOME_FIT_SERVICE_KEY
}

function isWorkMoveContext(context: SajuReportContext): boolean {
  return context.serviceKey === WORK_MOVE_SERVICE_KEY
}

const PASS_ANGLE_BLUEPRINTS: ReportBlueprint[] = [
  {
    id: 'pass-angle-verdict',
    category: '나, 붙을 각이야?',
    categoryEn: 'Pass Verdict',
    focus: 'target',
    query: '시험운 합격운 인성 정인 편인 관성 세운 대운 문서운 학업 판정',
  },
  {
    id: 'study-style',
    category: '내 머리 쓰는 법',
    categoryEn: 'Study Style',
    focus: 'balance',
    query: '일간 오행 신강 신약 용신 암기 이해 집중력 공부 방식 식신 상관 인성',
  },
  {
    id: 'exam-type-fit',
    category: '나랑 맞는 시험',
    categoryEn: 'Exam Type Fit',
    focus: 'careerMoney',
    query: '객관식 서술형 전문직 어학 실기 면접 구술 십신 관성 식상 적성 시험 유형',
  },
  {
    id: 'pass-timing',
    category: '붙는 타이밍',
    categoryEn: 'Pass Timing',
    focus: 'future',
    query: '대운 세운 월운 시험 접수 시기 재도전 택일 문서운 합격 타이밍',
  },
  {
    id: 'mental-stamina',
    category: '버티는 몸과 멘탈',
    categoryEn: 'Mental Stamina',
    focus: 'trap',
    query: '번아웃 수면 회복 리듬 불안 비교 자기 의심 집중 누수 편인 상관 과부하',
  },
  {
    id: 'exam-day-routine',
    category: '시험 날 택일과 컨디션',
    categoryEn: 'Exam Day Routine',
    focus: 'timingPlace',
    query: '시험 당일 컨디션 일진 택일 이동 동선 긴장 루틴 준비물 시간대',
  },
  {
    id: 'action-plan',
    category: '현실 액션 플랜',
    categoryEn: 'Action Plan',
    focus: 'action',
    query: 'D-100 D-30 D-7 기출 오답 회독 계획 포기할 것 실전 전략 체크리스트',
  },
]

const EXAM_TYPE_AFFINITY: Record<string, string> = {
  목: '이해형 정리와 장문 서술에 강하고, 범위를 넓게 잡을수록 살아납니다',
  화: '순간 집중과 실전 감각이 좋아 객관식·면접처럼 빠른 판단이 필요한 시험에 붙습니다',
  토: '반복과 누적이 무기라 자격·전문직처럼 회독이 점수로 바뀌는 시험에 맞습니다',
  금: '기준이 명확한 문제를 잘 끊어내 어학·인증형처럼 정답이 뚜렷한 시험에 유리합니다',
  수: '자료를 모아 구조를 짜는 데 강해 논술·연구형 과제에서 힘을 냅니다',
}

function isPassAngleContext(context: SajuReportContext): boolean {
  return context.serviceKey === PASS_ANGLE_SERVICE_KEY
}

function examPatternKeys(context: SajuReportContext): string[] {
  const exam = context.exam
  if (!exam) return []
  return [
    exam.examName ? `exam:name:${exam.examName}` : '',
    exam.examDate ? `exam:date:${exam.examDate}` : '',
    exam.examType ? `exam:type:${exam.examType}` : '',
    exam.priority ? `exam:priority:${exam.priority}` : '',
  ].filter((value): value is string => Boolean(value))
}

function examContextSummary(context: SajuReportContext): string {
  const exam = context.exam
  if (!exam) return ''
  return [exam.examName, exam.examType, exam.priority].filter(Boolean).join(' · ')
}

function examContextQuery(context: SajuReportContext): string {
  const exam = context.exam
  return [
    '시험운 합격 공부 인성 관성 문서운 세운',
    exam?.examName,
    exam?.examType,
    exam?.priority,
    exam?.worry,
  ].filter(Boolean).join(' ')
}

/** Days until the exam, when a parsable future date was supplied. */
function examDaysLeft(context: SajuReportContext): number | undefined {
  const raw = context.exam?.examDate?.trim()
  if (!raw) return undefined
  const target = new Date(`${raw}T00:00:00`)
  if (Number.isNaN(target.getTime())) return undefined
  const today = new Date()
  const days = Math.round((target.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86400000)
  return days >= 0 ? days : undefined
}

function examCountdownLabel(context: SajuReportContext): string {
  const days = examDaysLeft(context)
  if (days === undefined) return '시험일 미입력'
  if (days === 0) return '시험 당일'
  return `D-${days}`
}

function passAngleClassificationFor(sectionId: string, analysis: SajuAnalysis, context: SajuReportContext): string {
  const p = analysis.fourPillars
  const dayPillar = pillarLabel(p.day)
  const monthPillar = pillarLabel(p.month)
  const dominant = ELEMENT_KO[analysis.dominantElement]
  const weak = ELEMENT_KO[analysis.weakElement]
  const useful = analysis.usefulGod ? ELEMENT_KO[analysis.usefulGod] : weak
  const exam = context.exam
  const examName = exam?.examName || '시험 미입력'
  const examType = exam?.examType || '유형 미입력'
  const countdown = examCountdownLabel(context)
  const yearPillar = analysis.fortune?.yearPillar ?? '올해 세운'
  const daewoon = analysis.fortune?.currentDaewoon ?? '현재 대운'

  const labels: Record<string, string> = {
    'pass-angle-verdict': `${dayPillar} 일주 · ${yearPillar} 세운 · ${examName}`,
    'study-style': `${dominant} 과다 · ${weak} 보완 · ${useful} 기운으로 공부 체질 점검`,
    'exam-type-fit': `${examType} · ${analysis.tenGods.join(' · ') || '십신'} 기반 시험 궁합`,
    'pass-timing': `${daewoon} · ${yearPillar} · ${countdown}`,
    'mental-stamina': `월주 ${monthPillar} · 집중 누수와 회복 리듬`,
    'exam-day-routine': `${countdown} · 시험 당일 컨디션과 동선`,
    'action-plan': `${countdown} · 남은 기간 기준 실행표`,
  }

  return labels[sectionId] ?? `${examContextSummary(context) || '시험 준비'} · ${dominant}/${weak} 공부 핏`
}

function passAngleHookFor(sectionId: string, analysis: SajuAnalysis, context: SajuReportContext): string {
  const weak = ELEMENT_KO[analysis.weakElement]
  const countdown = examCountdownLabel(context)
  const hooks: Record<string, string> = {
    'pass-angle-verdict': '붙을지 말지가 아니라, 지금 방식으로 밀어도 되는지를 먼저 봅니다',
    'study-style': `${weak} 기운이 비면 공부량보다 공부 순서가 점수를 가릅니다`,
    'exam-type-fit': '같은 노력도 시험 유형이 맞으면 점수로 바뀌는 속도가 다릅니다',
    'pass-timing': `${countdown} 기준으로 밀 구간과 조일 구간을 나눠보겠습니다`,
    'mental-stamina': '무너지는 지점은 의지가 아니라 회복 리듬에서 먼저 옵니다',
    'exam-day-routine': '당일 컨디션은 운이 아니라 전날 동선에서 결정됩니다',
    'action-plan': '합격각은 결심이 아니라 남은 날짜에 맞춘 실행표에서 나옵니다',
  }
  return hooks[sectionId] ?? '시험은 운과 준비 조건을 같이 봐야 판정이 섭니다'
}

function blueprintsForContext(context: SajuReportContext): ReportBlueprint[] {
  if (isLoveThisYearContext(context)) return LOVE_THIS_YEAR_BLUEPRINTS
  if (isHomeFitContext(context)) return HOME_FIT_BLUEPRINTS
  if (isWorkMoveContext(context)) return WORK_MOVE_BLUEPRINTS
  if (isPassAngleContext(context)) return PASS_ANGLE_BLUEPRINTS
  return REPORT_BLUEPRINTS
}

function homeClassificationFor(sectionId: string, analysis: SajuAnalysis, context: SajuReportContext): string {
  const p = analysis.fourPillars
  const dayPillar = pillarLabel(p.day)
  const dominant = ELEMENT_KO[analysis.dominantElement]
  const weak = ELEMENT_KO[analysis.weakElement]
  const useful = analysis.usefulGod ? ELEMENT_KO[analysis.usefulGod] : weak
  const home = context.home
  const building = homeValueLabel('buildingType', home?.buildingType) || '주거 형태 미입력'
  const purpose = homeValueLabel('mainPurpose', home?.mainPurpose) || '생활 목적 미입력'
  const decision = homeValueLabel('stayDecision', home?.stayDecision) || '판단 고민 미입력'
  const pains = homePainLabels(context).join(' · ') || '체감 신호 미입력'
  const entrance = homeValueLabel('entranceFlow', home?.entranceFlow) || '현관 미확인'
  const bedroom = homeValueLabel('bedroomFeel', home?.bedroomFeel) || '침실 미확인'
  const desk = homeValueLabel('deskPosition', home?.deskPosition) || '책상 미확인'
  const outside = homeValueLabel('outsideFlow', home?.outsideFlow) || '창밖 미확인'

  const labels: Record<string, string> = {
    'home-fit-overall': `${dayPillar} 일주 · ${building} · ${purpose} · ${decision}`,
    'house-energy': `${entrance} · ${outside} · 집의 앞열림/뒤받침 점검`,
    'saju-house-ohaeng': `${dominant} 과다 · ${weak} 보완 · ${useful} 기운으로 공간 조율`,
    'sleep-recovery': `${bedroom} · ${pains} · 회복 리듬 점검`,
    'entrance-flow': `${entrance} · 들어오는 기운과 빠져나가는 동선`,
    'remote-focus': `${desk} · ${context.work ?? '재택·공부·일상'} 집중 기준`,
    'money-living': `${purpose} · ${pains} · 돈·살림 동선`,
    'relationship-cohabitation': `${context.relationship ?? '관계 상태 미입력'} · ${pains} · 공용/사적 공간 거리감`,
    'spatial-fix': `${useful} 보완 · 현관/침실/책상/창가 손질 우선순위`,
    'reality-action': `${decision} · 7일 체감 테스트 · 이사보다 먼저 볼 현실 기준`,
  }

  return labels[sectionId] ?? `${homeContextSummary(context)} · ${dominant}/${weak} 오행 핏`
}

function workMoveClassificationFor(sectionId: string, analysis: SajuAnalysis, context: SajuReportContext): string {
  const p = analysis.fourPillars
  const dayPillar = pillarLabel(p.day)
  const monthPillar = pillarLabel(p.month)
  const dominant = ELEMENT_KO[analysis.dominantElement]
  const weak = ELEMENT_KO[analysis.weakElement]
  const useful = analysis.usefulGod ? ELEMENT_KO[analysis.usefulGod] : weak
  const workMove = context.workMove
  const decision = workMoveValueLabel('decisionMode', workMove?.decisionMode) || '이직 상황 미입력'
  const signal = workMoveValueLabel('currentCompanySignal', workMove?.currentCompanySignal) || '현 회사 신호 미입력'
  const role = workMove?.targetRole || '희망 직무 미입력'
  const workType = workMoveValueLabel('workType', workMove?.workType) || '근무 형태 미입력'
  const salary = workMoveValueLabel('salaryFeeling', workMove?.salaryFeeling) || '돈 조건 미입력'
  const priority = workMoveValueLabel('priority', workMove?.priority) || '우선순위 미입력'
  const checks = workMoveRealityLabels(context).join(' · ') || '현실 체크 미완료'

  const labels: Record<string, string> = {
    'work-move-decision': `${dayPillar} 일주 · ${decision} · ${priority}`,
    'current-company-signal': `${signal} · 월주 ${monthPillar}의 직장 반응`,
    'career-constitution': `${dominant} 과다 · ${weak} 보완 · ${useful} 기운으로 감당력 점검`,
    'role-fit': `${role} · ${analysis.tenGods.join(' · ') || '십신'} 기반 직무 핏`,
    'new-company-fit': `${workType} · ${workMove?.commuteLocation || '근무지 미입력'} · 새 환경 적응`,
    'money-terms': `${salary} · 계약·업무범위·성과 기준 확인`,
    'timing-daewoon-sewoon': `${analysis.fortune?.currentDaewoon ?? '현재 대운'} · ${analysis.fortune?.yearPillar ?? '올해 세운'} · ${workMove?.decisionDate || '날짜 미정'}`,
    'risk-brake': `${signal} · ${workMove?.discomfortPoint || '찝찝한 지점 미입력'}`,
    'ninety-day-action': `${checks} · 90일 테스트`,
    'final-checklist': `${priority} · 돈/역할/멘탈/타이밍 최종 점검`,
  }

  return labels[sectionId] ?? `${workMoveContextSummary(context)} · ${dominant}/${weak} 커리어 핏`
}

function classificationFor(focus: ReportFocus, analysis: SajuAnalysis, context: SajuReportContext, sectionId = ''): string {
  if (isHomeFitContext(context)) return homeClassificationFor(sectionId, analysis, context)
  if (isWorkMoveContext(context)) return workMoveClassificationFor(sectionId, analysis, context)
  if (isPassAngleContext(context)) return passAngleClassificationFor(sectionId, analysis, context)

  const p = analysis.fourPillars
  const dayPillar = pillarLabel(p.day)
  const monthPillar = pillarLabel(p.month)
  const dominant = ELEMENT_KO[analysis.dominantElement]
  const weak = ELEMENT_KO[analysis.weakElement]
  const useful = analysis.usefulGod ? ELEMENT_KO[analysis.usefulGod] : '보완 기운'
  const tenGod = analysis.tenGods[0] ?? '십신'
  const gyeokguk = analysis.manseryeok?.gyeokguk.name
  const climate = analysis.manseryeok?.climate

  const labels: Record<ReportFocus, string> = {
    profile: `${dayPillar} 일주 · ${STEM_KO[analysis.dayMaster]}${ELEMENT_KO[analysis.dayMasterElement].charAt(0)} 일간`,
    target: `${context.target ?? '본인'} 기준 · ${contextLabel(context)}`,
    balance: `${dominant} 과다 · ${weak} 보완 · ${useful} 중심${gyeokguk ? ` · ${gyeokguk}` : ''}${climate ? ` · 조후 ${climate.temperature}` : ''}`,
    trap: `${tenGod} 패턴 · 월주 ${monthPillar}의 사회 결`,
    relationshipContext: `${context.orientation ?? '관계 기준'} · ${context.relationship ?? '관계 상태 미입력'}`,
    workContext: `${context.work ?? '일상 상태 미입력'} · 월주 ${monthPillar}`,
    careerMoney: `${analysis.tenGods.filter((g) => g.includes('재') || g.includes('식') || g.includes('상')).join(' · ') || '식상/재성 확인'} 흐름`,
    moneyLeak: `${analysis.tenGods.includes('겁재') ? '겁재 비용' : '지출 패턴'} · ${weak} 관리`,
    love: `일지 ${BRANCH_KO[p.day.branch]}(${p.day.branch}) · 관계궁의 신호`,
    destiny: `${context.orientation ?? '관계 기준'} · ${useful} 기운을 살리는 상대`,
    future: `${analysis.fortune?.currentDaewoon ?? '대운'} · ${analysis.fortune?.yearPillar ?? '세운'} 흐름`,
    timingPlace: `${analysis.fortune?.yearPillar ?? '세운'} · ${useful} 기운의 장소 신호`,
    reportDepth: `${contextLabel(context)} · 95점 상세 풀이 기준`,
    action: `${useful} 기운을 살리는 선택`,
  }

  return labels[focus]
}

function homeHookFor(sectionId: string, analysis: SajuAnalysis, context: SajuReportContext): string {
  const home = context.home
  const purpose = homeValueLabel('mainPurpose', home?.mainPurpose) || '집에서 제일 중요한 목적'
  const decision = homeValueLabel('stayDecision', home?.stayDecision) || '지금의 판단'
  const weak = ELEMENT_KO[analysis.weakElement]
  const dominant = ELEMENT_KO[analysis.dominantElement]
  const hooks: Record<string, string> = {
    'home-fit-overall': `${purpose} 기준으로 보면 이 집의 결이 먼저 드러나는군`,
    'house-energy': '현관과 창밖의 흐름이 집의 첫인상을 만들고 있네',
    'saju-house-ohaeng': `${dominant}은 이미 강하고 ${weak}을 공간에서 보완해야 하네`,
    'sleep-recovery': '잠이 편해야 집의 기운도 내 편이 되는 법일세',
    'entrance-flow': '들어오는 길이 복잡하면 마음도 먼저 걸리는군',
    'remote-focus': '책상 자리 하나가 집중력의 절반을 가져가네',
    'money-living': '돈과 살림은 주방보다 동선과 수납에서 먼저 새는군',
    'relationship-cohabitation': '같이 사는 결은 넓이보다 거리감에서 갈리는군',
    'spatial-fix': '큰 공사보다 먼저 손댈 작은 자리가 있네',
    'reality-action': `${decision}은 7일 체감으로 먼저 가려보게`,
  }
  return hooks[sectionId] ?? '집은 운을 바꾸는 마법보다 생활 리듬을 비추는 거울일세'
}

function workMoveHookFor(sectionId: string, analysis: SajuAnalysis, context: SajuReportContext): string {
  const workMove = context.workMove
  const decision = workMoveValueLabel('decisionMode', workMove?.decisionMode) || '지금 상황'
  const signal = workMoveValueLabel('currentCompanySignal', workMove?.currentCompanySignal) || '현 회사 신호'
  const priority = workMoveValueLabel('priority', workMove?.priority) || '우선순위'
  const weak = ELEMENT_KO[analysis.weakElement]
  const hooks: Record<string, string> = {
    'work-move-decision': `${decision}, 지금은 결론보다 조건을 먼저 봐야 하네`,
    'current-company-signal': `${signal}이 단순 불만인지 반복 신호인지 가르겠습니다`,
    'career-constitution': `${weak} 기운을 보완해야 새 판을 오래 버틸 수 있네`,
    'role-fit': '직무가 맞으면 버티고, 역할이 흐리면 같은 피로가 반복되네',
    'new-company-fit': '새 회사는 이름보다 일상 구조와 책임 범위가 먼저일세',
    'money-terms': '연봉이 올라도 계약서가 흐리면 이직운은 흔들립니다',
    'timing-daewoon-sewoon': '움직일 때는 대운과 세운의 속도를 같이 봐야 하네',
    'risk-brake': '찝찝한 지점은 작을 때 잡아야 뒤탈이 적습니다',
    'ninety-day-action': '이직운은 결심보다 90일 준비표에서 현실이 됩니다',
    'final-checklist': `${priority} 기준으로 마지막 판단선을 세워보겠습니다`,
  }
  return hooks[sectionId] ?? '회사 이동은 운과 현실 조건을 같이 봐야 맞습니다'
}

function hookFor(focus: ReportFocus, analysis: SajuAnalysis, context: SajuReportContext, sectionId = ''): string {
  if (isHomeFitContext(context)) return homeHookFor(sectionId, analysis, context)
  if (isWorkMoveContext(context)) return workMoveHookFor(sectionId, analysis, context)
  if (isPassAngleContext(context)) return passAngleHookFor(sectionId, analysis, context)

  const concern = cleanContextValue(context.concern, '요즘 마음에 걸리는 문제')
  const dominant = ELEMENT_KO[analysis.dominantElement]
  const weak = ELEMENT_KO[analysis.weakElement]

  const hooks: Record<ReportFocus, string> = {
    profile: '자네의 진짜 결이 이제 보이는군',
    target: `${context.target ?? '이 대상'}으로 본 이유가 풀이의 방향을 바꾸는군`,
    balance: `${dominant} 기운이 먼저 치고 올라오는군`,
    trap: `${concern} 때문에 여기까지 온 이유가 있네`,
    relationshipContext: `${context.relationship ?? '관계 상태'}의 결부터 보겠네`,
    workContext: `${context.work ?? '요즘 일상'} 안에서 운이 움직이는군`,
    careerMoney: '돈길과 일길은 따로 보지 않는 법일세',
    moneyLeak: '돈이 새는 자리가 먼저 보이는군',
    love: '오래 남는 사람은 따로 있는 법일세',
    destiny: '운명의 상대는 자극보다 결을 안정시키는군',
    future: '큰 운은 이미 방향을 틀고 있네',
    timingPlace: '시기와 장소는 작은 신호로 먼저 오는 법일세',
    reportDepth: '이 리포트는 한 줄 예언이 아니라 근거의 층일세',
    action: `${weak} 기운을 채우는 순간 흐름이 바뀌는군`,
  }

  return hooks[focus]
}

function tenGodSentence(analysis: SajuAnalysis): string {
  const notes = analysis.tenGods.slice(0, 3).map((g) => `${g}은 ${TEN_GOD_NOTE[g]}.`)
  return notes.join(' ')
}

function daewoonWindow(analysis: SajuAnalysis): string {
  const fortune = analysis.fortune
  if (!fortune) return '현재 대운'
  const current = fortune.daewoon.find((d) => d.pillar === fortune.currentDaewoon)
  if (!current) return `${fortune.currentDaewoon} 대운`
  const start = current.startYear ? `${current.startYear}년부터 열린 ` : ''
  return `${start}${current.age} ${current.pillar} 대운`
}

function timingRiskNote(focus: ReportFocus, analysis: SajuAnalysis): string {
  const riskyInteraction = analysis.manseryeok?.interactions.find((i) => ['충', '형', '파', '해'].includes(i.type))
  const daewoon = daewoonWindow(analysis)
  const yearPillar = analysis.fortune?.yearPillar ?? '올해 세운'
  const useful = analysis.usefulGod ? ELEMENT_KO[analysis.usefulGod] : ELEMENT_KO[analysis.weakElement]
  const signal = riskyInteraction
    ? `${riskyInteraction.type}(${riskyInteraction.signs.join('')}) 신호`
    : `${ELEMENT_KO[analysis.dominantElement]} 과다와 ${ELEMENT_KO[analysis.weakElement]} 부족 신호`

  if (['relationshipContext', 'love', 'destiny'].includes(focus)) {
    return `시기적으로는 ${daewoon}과 ${yearPillar} 세운에서 이 ${signal}가 관계의 말투, 거리감, 재회·정리 문제로 먼저 튀어나올 수 있습니다. 풀 방법은 감정이 커지는 때 바로 결론 내리지 말고, ${useful} 기운이 살아나는 느린 확인과 경계선부터 세우는 겁니다.`
  }

  if (['careerMoney', 'moneyLeak', 'workContext'].includes(focus)) {
    return `시기적으로는 ${daewoon}과 ${yearPillar} 세운에서 이 ${signal}가 일의 확장, 계약, 지출, 사람 비용으로 먼저 드러날 수 있습니다. 풀 방법은 큰 결정보다 계약서·반복 수입·지출 상한선을 먼저 잠그는 겁니다.`
  }

  if (['future', 'timingPlace', 'action'].includes(focus)) {
    return `시기적으로는 ${daewoon}과 ${yearPillar} 세운이 맞물릴 때 이 ${signal}가 전환 신호로 올라옵니다. 풀 방법은 들어오는 제안을 바로 잡는 게 아니라, ${useful} 기운이 살아나는 방향인지 한 번 걸러서 움직이는 겁니다.`
  }

  return `시기적으로는 ${daewoon}과 ${yearPillar} 세운에서 이 ${signal}가 반복 고민의 모양으로 올라올 수 있습니다. 풀 방법은 좋은 흐름을 기다리는 게 아니라, ${useful} 기운을 살리는 루틴으로 먼저 균형을 잡는 겁니다.`
}

function conditionalRiskNote(focus: ReportFocus, analysis: SajuAnalysis, context: SajuReportContext): string {
  const riskyGods = analysis.tenGods.filter((g) => ['겁재', '상관', '편관', '편인'].includes(g))
  const weak = ELEMENT_KO[analysis.weakElement]
  const dominant = ELEMENT_KO[analysis.dominantElement]
  const useful = analysis.usefulGod ? ELEMENT_KO[analysis.usefulGod] : weak
  const weakCount = analysis.elementCount[analysis.weakElement]
  const relationship = context.relationship ?? ''
  const work = context.work ?? ''
  const concern = context.concern?.trim()

  const timedClose = `${timingRiskNote(focus, analysis)} 이건 확정 예언이 아니라, 그 신호가 보일 때 한 번 멈춰 보라는 사전 경고일세.`

  if (focus === 'balance' && weakCount === 0) {
    return `좋은 말만 하지는 않겠네. ${weak} 기운이 완전히 비어 있으면 그 영역은 평소엔 티가 덜 나다가, 일이 몰릴 때 회피·소진·판단 지연으로 꽤 못나게 드러날 수 있네. ${dominant}을 더 키우기보다 ${useful}을 살리는 루틴을 먼저 잡아야 하네. ${timedClose}`
  }

  if (focus === 'trap' && riskyGods.length > 0) {
    return `안 좋은 건 이렇게 보이는군. 이 대목은 위험하네. ${riskyGods.join(' · ')} 흐름이 강하게 드러날 때는 사람과 비교, 말의 충돌, 과한 책임, 혼자만의 해석이 고민을 키울 수 있네. ${concern ? `"${concern}" 문제에서는 ` : ''}좋은 말보다 먼저 반복되는 장면을 끊어야 하네. 방치하면 같은 문제가 사람만 바꿔 다시 만날 가능성이 크네. ${timedClose}`
  }

  if (['relationshipContext', 'love', 'destiny'].includes(focus)) {
    if (relationship.includes('이별') || relationship.includes('마음에 둔') || riskyGods.some((g) => ['겁재', '상관', '편관'].includes(g))) {
      return `관계에서는 조심할 지점이 선명합니다. 이 관계 패턴은 위험 신호가 있습니다. 끌림이 강할수록 확인 없이 마음을 키우거나, 서운함을 말로 세게 밀어붙이거나, 책임을 혼자 떠안는 흐름을 경계해야 합니다. 좋아하는 것과 맞는 건 다릅니다. 이걸 못 끊으면 설레는 사람에게 끌리고, 결국 나를 흐리게 만드는 패턴으로 돌아갈 수 있습니다. ${timedClose}`
    }
  }

  if (['careerMoney', 'moneyLeak'].includes(focus)) {
    if (work.includes('사업') || work.includes('프리랜서') || work.includes('직장') || riskyGods.some((g) => ['겁재', '상관'].includes(g))) {
      return `일과 돈에서는 미리 막아야 할 위험한 구멍이 있습니다. 기준 없는 확장, 말로 생기는 충돌, 사람 때문에 나가는 비용, 계약 없이 시작하는 일은 작아 보여도 나중에 크게 돌아올 수 있습니다. 돈길을 보려면 먼저 돈구멍, 새는 문부터 닫아야 합니다. 이건 듣기 좋은 말보다 중요한 현실 경고입니다. ${timedClose}`
    }
  }

  if (['future', 'timingPlace', 'action'].includes(focus)) {
    return `앞으로의 걱정도 하나 짚겠습니다. 운이 바뀔 때는 좋은 기회보다 먼저 생활 반경, 사람의 결, 지출 방식이 흔들립니다. 제안이 갑자기 커지거나 오래 미룬 관계가 다시 올라오면 바로 달려들지 말고, ${useful} 기운이 살아나는 선택인지 확인하세요. 이 구간은 위험 관리를 해야 합니다. 과속하면 운이 열리는 게 아니라 사고가 먼저 납니다. ${timedClose}`
  }

  return ''
}

function buildLoveThisYearInterpretation(
  sectionId: string,
  focus: ReportFocus,
  analysis: SajuAnalysis,
  context: SajuReportContext,
  ragTopics: string[],
  birth?: BirthInput,
): string {
  const beat = buildLoveThisYearStoryBeat(sectionId, analysis, context, ragTopics, birth)
  const riskNote = conditionalRiskNote(focus, analysis, context)
  // Risk notes stay available for generation depth, but keep the surface emotional:
  // append only a short soft caution if present, stripped of textbook tone.
  if (!riskNote) return formatStoryInterpretation(beat)
  const softRisk = riskNote
    .split(/(?<=\.)\s+/)
    .slice(0, 2)
    .join(' ')
    .replace(/시기적으로는/g, '그즈음엔')
    .replace(/풀 방법은/g, '그때는')
  return `${formatStoryInterpretation(beat)}

[주의할 점] ${softRisk}`
}

function buildHomeFitInterpretation(
  sectionId: string,
  focus: ReportFocus,
  analysis: SajuAnalysis,
  context: SajuReportContext,
  ragTopics: string[],
): string {
  const name = cleanContextValue(context.name, '자네')
  const home = context.home
  const p = analysis.fourPillars
  const dayPillar = pillarLabel(p.day)
  const monthPillar = pillarLabel(p.month)
  const dayMaster = `${STEM_KO[analysis.dayMaster]}(${analysis.dayMaster})`
  const dominant = ELEMENT_KO[analysis.dominantElement]
  const weak = ELEMENT_KO[analysis.weakElement]
  const useful = analysis.usefulGod ? ELEMENT_KO[analysis.usefulGod] : weak
  const building = homeValueLabel('buildingType', home?.buildingType) || '주거 형태 미입력'
  const living = homeValueLabel('livingPeriod', home?.livingPeriod) || '거주 기간 미입력'
  const purpose = homeValueLabel('mainPurpose', home?.mainPurpose) || '집에서 제일 중요한 목적 미입력'
  const decision = homeValueLabel('stayDecision', home?.stayDecision) || '판단 고민 미입력'
  const painText = homePainLabels(context).join(' · ') || '아직 고른 체감 신호 없음'
  const entrance = homeValueLabel('entranceFlow', home?.entranceFlow) || '현관 동선 미확인'
  const bedroom = homeValueLabel('bedroomFeel', home?.bedroomFeel) || '침실 체감 미확인'
  const desk = homeValueLabel('deskPosition', home?.deskPosition) || '책상 위치 미확인'
  const outside = homeValueLabel('outsideFlow', home?.outsideFlow) || '창밖 흐름 미확인'
  const address = home?.addressOrBuilding ? `${home.addressOrBuilding} 기준` : '현재 집 기준'
  const daewoon = analysis.fortune?.currentDaewoon ?? '현재 대운'
  const yearPillar = analysis.fortune?.yearPillar ?? '올해 세운'
  const ragLine = ragTopics.length > 0
    ? `이번 장은 ${ragTopics.join(', ')}의 공간 기준을 함께 대조했습니다.`
    : '이번 장은 집의 체감 신호와 사주 오행 기준을 함께 대조했습니다.'
  const caution = '이 풀이는 이사를 강요하거나 명당·흉지를 확정하는 말이 아닙니다. 몸 상태, 재산, 계약 결과를 단정하지 않고 생활에서 확인할 수 있는 신호와 손질 순서를 잡는 데 둡니다.'
  const houseLine = `${address}, ${building}, ${living}, 핵심 목적은 ${purpose}, 지금 고민은 ${decision}입니다. 신경 쓰이는 지점은 ${painText}로 들어왔습니다.`

  const sections: Record<string, string> = {
    'home-fit-overall': [
      `흠... ${name}님의 집 풍수는 ${dayPillar} 일주와 ${dayMaster} 일간, 그리고 지금 집의 체감 신호를 겹쳐서 봅니다. ${houseLine} 집이 맞는지 아닌지는 한마디로 자를 일이 아닙니다. 이 집이 자네의 잠, 일, 돈, 관계 리듬을 얼마나 덜 흔들고 얼마나 잘 받쳐주는지가 먼저입니다.`,
      `[주요 포인트] 원국에서는 ${dominant} 기운이 먼저 올라오고 ${weak} 기운이 보완 자리로 남습니다. 그래서 이 집이 ${dominant}을 더 과하게 밀어붙이는지, 아니면 ${useful} 기운을 살려 중심을 잡아주는지가 핵심입니다. ${ragLine}`,
      `무료 맛보기로 먼저 말하자면, 이 집은 "${purpose}" 목적에 맞춰 볼 때 현관·침실·책상·창밖 중 어디가 자네의 기운을 먼저 빼앗는지 확인해야 합니다. ${daewoon}과 ${yearPillar} 흐름에서는 큰 이사 결정보다 7일 체감 테스트가 먼저입니다. ${caution}`,
    ].join('\n\n'),
    'house-energy': [
      `집의 기본 기운은 현관, 창밖, 동선에서 먼저 잡힙니다. 입력된 현관은 ${entrance}, 창밖은 ${outside}입니다. 전통 풍수의 말로는 앞이 열리고 뒤가 받치는가를 보지만, 생활 언어로 풀면 들어오는 길이 답답하지 않은지, 앉고 쉬는 자리가 과하게 노출되지 않는지를 보는 겁니다.`,
      `[주목할 점] ${name}님 사주는 ${dominant} 기운이 빨리 반응하므로, 집 안으로 들어오자마자 시선과 동선이 한 번에 몰리면 마음도 덩달아 급해질 수 있습니다. 반대로 통로가 너무 막히면 ${weak} 기운이 더 비어 피로가 쌓일 수 있네. 이건 미신적 단정이 아니라 매일 반복되는 자극의 문제입니다.`,
      `${ragLine} 먼저 할 일은 현관 바닥을 비우고, 문을 열었을 때 바로 보이는 물건을 한 단계 줄이는 겁니다. 창밖 압박이나 소음이 있다면 커튼, 식물, 조명처럼 시선을 부드럽게 끊는 장치부터 보세요. 큰 공사보다 집의 첫 호흡을 정리하는 쪽이 먼저입니다.`,
    ].join('\n\n'),
    'saju-house-ohaeng': [
      `${name}님의 오행은 ${dominant}이 먼저 강하고 ${weak}이 보완점입니다. 집 풍수에서 오행은 색 하나를 붙인다고 끝나는 처방이 아닙니다. 목은 성장과 환기, 화는 빛과 표현, 토는 안정과 수납, 금은 정리와 기준, 수는 휴식과 흐름처럼 생활 장면으로 읽어야 합니다.`,
      `[주요 포인트] ${dayPillar} 일주와 월주 ${monthPillar}를 같이 보면, 이 집은 자네에게 ${useful} 기운을 살리는 방식으로 써야 합니다. ${purpose}가 중요하다면 공간도 그 목적에 맞게 우선순위를 가져야 합니다. 잠이 목적이면 침실, 일이 목적이면 책상, 돈과 살림이면 주방과 수납, 관계면 공용공간과 사생활 경계가 먼저입니다.`,
      `${ragLine} 오행 보완은 과한 색상 처방보다 반복 루틴이 정확합니다. 부족한 ${weak}을 채우려면 ${home?.extraNote ? `특히 "${home.extraNote}"라고 적은 체감까지 같이 보고, ` : ''}빛·소리·물건 밀도·앉는 방향을 한 번에 바꾸지 말고 하나씩 조정해야 합니다. 그래야 어떤 변화가 자네에게 맞는지 분명히 보입니다.`,
    ].join('\n\n'),
    'sleep-recovery': [
      `잠과 회복은 집 풍수에서 가장 먼저 봐야 할 자리입니다. 침실 입력은 ${bedroom}입니다. ${name}님 사주에서 ${dominant} 기운이 바깥으로 많이 쓰이면, 밤에는 오히려 ${weak} 기운이 받쳐줘야 회복이 됩니다. 침실이 밝거나 시끄럽거나 문·복도 자극을 받으면 머리가 쉬지 못할 수 있습니다.`,
      `[주의할 점] 이 대목은 건강 진단이 아닙니다. 다만 잠들기 전 눈에 걸리는 물건, 창밖 소음, 침대에서 바로 보이는 문, 침구 색과 조명의 강도는 멘탈 리듬에 영향을 줍니다. ${daewoon}과 ${yearPillar} 흐름에서 일이 많아질수록 침실은 더 단순해야 합니다.`,
      `${ragLine} 7일 동안 먼저 해볼 처방은 세 가지입니다. 침대 주변 바닥을 비우고, 자기 전 강한 빛을 줄이고, 문이나 창이 바로 압박하는 느낌이면 시선을 끊는 얇은 가림을 둡니다. 잠자리가 안정되면 집 전체 판단도 덜 감정적으로 보입니다.`,
    ].join('\n\n'),
    'entrance-flow': [
      `현관·동선 에너지는 집으로 들어오는 첫 문장입니다. 현재 입력은 ${entrance}입니다. 현관에서 안쪽이 너무 곧게 보이면 기운이 빨리 들어와 빨리 빠지는 느낌을 만들 수 있고, 지나치게 막히면 들어올 일도 답답하게 느껴질 수 있습니다.`,
      `[주요 포인트] ${name}님은 ${dayPillar} 일주의 반응 속도와 ${dominant} 기운이 함께 움직입니다. 그래서 현관이 복잡하면 작은 일도 먼저 거슬리고, 현관이 너무 노출되면 쉬기 전에 방어가 올라올 수 있습니다. 풍수의 핵심은 복을 부르는 물건보다 막힘과 과속을 줄이는 데 있습니다.`,
      `${ragLine} 신발, 택배, 우산, 거울 위치를 먼저 보세요. 문을 열었을 때 한 번에 눈에 들어오는 물건을 줄이고, 꺾이는 동선이면 어두운 코너에 약한 조명을 둡니다. 이 정도만 해도 집에 들어올 때의 마음 속도가 달라질 수 있습니다.`,
    ].join('\n\n'),
    'remote-focus': [
      `재택·공부·일 집중력은 책상 위치에서 크게 갈립니다. 현재 책상 입력은 ${desk}입니다. ${context.work ?? '일상 흐름'} 상태에서 ${purpose}가 중요하다면, 책상은 단순한 가구가 아니라 자네의 월주 ${monthPillar}가 현실에서 작동하는 자리입니다.`,
      `[해법] 등 뒤가 벽이면 기준이 잡히기 쉽고, 등 뒤가 창이면 마음이 뜰 수 있습니다. 문을 정면으로 보면 통제감은 생기지만 긴장이 올라갈 수 있고, 쉬는 자리와 섞이면 일과 회복이 서로 침범합니다. ${dominant}이 강한 사람일수록 책상 위 물건 수를 줄여야 판단이 맑아집니다.`,
      `${ragLine} 7일 테스트는 간단합니다. 책상 위에 지금 하는 일 하나만 남기고, 등 뒤 자극을 줄이고, 쉬는 물건과 일하는 물건을 분리하세요. 이사나 방 변경 전에도 집중 시간, 산만함, 끝낸 일의 개수가 달라지는지 먼저 확인할 수 있습니다.`,
    ].join('\n\n'),
    'money-living': [
      `돈·살림·소비 흐름은 재물운을 집 안에서 보는 장입니다. ${purpose} 목적과 ${painText} 신호를 같이 놓으면, 돈은 단순히 들어오고 나가는 숫자가 아니라 물건이 쌓이는 방식, 주방과 수납의 흐름, 결제 습관으로 먼저 드러납니다.`,
      `[주의할 점] ${name}님 사주에 ${analysis.tenGods.join(' · ') || '십신'} 흐름이 있으니 돈을 읽을 때도 재성만 보지 않습니다. ${dominant}이 과하게 움직이면 충동 구매나 사람 비용이 빨라질 수 있고, ${weak}이 비면 정리·기록·반복 관리가 밀릴 수 있습니다. 이건 수익 보장이 아니라 새는 지점을 먼저 찾는 풀이입니다.`,
      `${ragLine} 먼저 냉장고, 현관 옆 수납, 결제 알림, 자주 두는 영수증 자리를 보세요. 돈길보다 돈구멍이 먼저 보이는 법입니다. 작은 바구니 하나, 주 1회 비우기, 자동결제 목록 점검처럼 토대가 잡히면 살림의 기운도 안정됩니다.`,
    ].join('\n\n'),
    'relationship-cohabitation': [
      `관계·가족·동거 케미는 집의 넓이보다 거리감에서 갈립니다. 현재 관계 문맥은 ${context.relationship ?? '관계 상태 미입력'}, 핵심 목적은 ${purpose}, 체감 신호는 ${painText}입니다. 같이 사는 사람이 있든 없든 공용공간과 혼자 숨 쉬는 자리의 균형이 필요합니다.`,
      `[주목할 점] ${dayPillar} 일주는 가까운 사람 앞에서 더 선명하게 반응합니다. ${dominant}이 강하면 내 방식이 맞다고 느끼기 쉽고, ${weak}이 비면 상대의 리듬을 기다리는 힘이 부족해질 수 있습니다. 그래서 이 집에서는 말로 푸는 것보다 각자의 자리와 동선을 분리하는 것이 먼저일 수 있습니다.`,
      `${ragLine} 가족이나 동거인이 있다면 식탁, 소파, 침실 문 앞에 물건이 쌓이는지 보세요. 혼자 산다면 사람을 들인 뒤 피곤해지는 자리, 오래 통화하는 자리, 쉬는 공간과 일하는 공간이 섞이는 지점을 봐야 합니다. 관계운은 공간의 경계에서 현실이 됩니다.`,
    ].join('\n\n'),
    'spatial-fix': [
      `공간별 손질 처방은 큰 비용을 쓰기 전에 하는 작은 조정입니다. ${name}님에게는 ${useful} 기운을 살리는 쪽이 우선입니다. 현관은 ${entrance}, 침실은 ${bedroom}, 책상은 ${desk}, 창밖은 ${outside}로 들어왔으니 네 곳을 한꺼번에 바꾸지 말고 순서를 잡아야 합니다.`,
      `[해법] 첫째 현관은 바닥을 비우고 들어오는 시선을 정리합니다. 둘째 침실은 빛과 소리를 낮추고 잠드는 쪽을 단순하게 만듭니다. 셋째 책상은 등 뒤와 물건 수를 조정합니다. 넷째 창밖 압박은 커튼, 식물, 조명으로 부드럽게 끊습니다. 이 네 가지가 집 풍수의 현실 처방입니다.`,
      `${ragLine} 색 처방은 마지막입니다. 먼저 물건 밀도, 빛, 소리, 동선을 조절해야 자네 사주의 오행 보완이 실제 체감으로 이어집니다. 고친 뒤에는 하루 기분보다 7일 평균을 보세요. 공간은 하루 반응보다 반복 반응이 더 정확합니다.`,
    ].join('\n\n'),
    'reality-action': [
      `현실 체크의 결론은 ${decision}입니다. 이사할지, 고쳐 살지, 후보와 비교할지는 운세 한 줄로 정할 일이 아닙니다. ${name}님의 명식, ${daewoon}, ${yearPillar}, 그리고 현재 집의 현관·침실·책상·창밖 신호를 7일 단위로 확인해야 합니다.`,
      `[주요 포인트] 7일 테스트 기준은 네 가지입니다. 집에 들어올 때 마음이 가라앉는가, 잠에서 깬 뒤 회복감이 있는가, 책상에서 한 가지 일을 끝내는가, 돈과 물건이 덜 새는가. 이 네 가지 중 두 가지 이상이 좋아지면 이 집은 손봐서 쓸 여지가 있습니다. 반대로 손질해도 같은 지점이 반복되면 비교 후보를 열어둘 수 있습니다.`,
      `${ragLine} 마지막으로 다시 말하겠습니다. 이 풀이는 계약, 건강, 재산 결과를 보장하지 않습니다. 다만 지금 집이 자네의 기운을 돕는지 방해하는지, 어디부터 손보면 판단이 선명해지는지 알려주는 지도입니다. 큰 결정은 감정이 아니라 반복 관찰 뒤에 내려야 합니다.`,
    ].join('\n\n'),
  }

  return sections[sectionId] ?? [
    `${name}님의 집 풍수는 ${focus} 기준으로 봅니다. ${dayPillar} 일주와 ${dominant}/${weak} 오행, 그리고 ${homeContextSummary(context)}을 함께 놓고 해석합니다.`,
    `${ragLine} 이 풀이는 확정 예언이 아니라 집과 생활 리듬의 맞물림을 확인하는 기준입니다.`,
  ].join('\n\n')
}

function buildWorkMoveInterpretation(
  sectionId: string,
  focus: ReportFocus,
  analysis: SajuAnalysis,
  context: SajuReportContext,
  ragTopics: string[],
): string {
  const name = cleanContextValue(context.name, '자네')
  const workMove = context.workMove
  const p = analysis.fourPillars
  const dayPillar = pillarLabel(p.day)
  const monthPillar = pillarLabel(p.month)
  const dayMaster = `${STEM_KO[analysis.dayMaster]}(${analysis.dayMaster})`
  const dominant = ELEMENT_KO[analysis.dominantElement]
  const weak = ELEMENT_KO[analysis.weakElement]
  const useful = analysis.usefulGod ? ELEMENT_KO[analysis.usefulGod] : weak
  const decision = workMoveValueLabel('decisionMode', workMove?.decisionMode) || '이직 상황 미입력'
  const signal = workMoveValueLabel('currentCompanySignal', workMove?.currentCompanySignal) || '현 회사 신호 미입력'
  const role = workMove?.targetRole || '희망·제안 직무 미입력'
  const company = workMove?.targetCompanyName || '새 회사명 미입력'
  const workType = workMoveValueLabel('workType', workMove?.workType) || '근무 형태 미입력'
  const commute = workMove?.commuteLocation || '근무지 체감 미입력'
  const salary = workMoveValueLabel('salaryFeeling', workMove?.salaryFeeling) || '연봉·조건 미입력'
  const decisionDate = workMove?.decisionDate || '결정일 미정'
  const priority = workMoveValueLabel('priority', workMove?.priority) || '우선순위 미입력'
  const discomfort = workMove?.discomfortPoint || '찝찝한 포인트 미입력'
  const checks = workMoveRealityLabels(context)
  const checkText = checks.join(' · ') || '아직 확인된 현실 체크 없음'
  const daewoon = analysis.fortune?.currentDaewoon ?? '현재 대운'
  const yearPillar = analysis.fortune?.yearPillar ?? '올해 세운'
  const tenGods = analysis.tenGods.join(' · ') || '십신'
  const ragLine = ragTopics.length > 0
    ? `이번 장은 ${ragTopics.join(', ')}의 이직 판단 기준을 함께 대조했습니다.`
    : '이번 장은 KMS 코퍼스의 이직 판단 기준과 사주 계산값을 함께 대조했습니다.'
  const caution = '이 풀이는 퇴사, 합격, 연봉 상승, 채용 결과를 확정하지 않습니다. 운의 신호와 현실 조건을 나눠서 확인하는 의사결정 보조 자료입니다.'
  const contextLine = `${decision}, 현 회사 신호는 ${signal}, 새 후보는 ${company}, 직무는 ${role}, 근무 형태는 ${workType}, 조건 체감은 ${salary}, 우선순위는 ${priority}입니다.`

  const sections: Record<string, string> = {
    'work-move-decision': [
      `흠... ${name}님의 이직운은 ${dayPillar} 일주와 ${dayMaster} 일간, 그리고 지금 입력한 회사 이동 상황을 겹쳐서 봅니다. ${contextLine} 지금은 "옮겨도 된다, 안 된다"로 단정할 때가 아니라, 이직각·존버각·준비각·보류각·조건부 환승각 중 어디에 가까운지 먼저 가르는 흐름입니다.`,
      `[주요 포인트] 원국에서는 ${dominant} 기운이 먼저 올라오고 ${weak} 기운이 보완 자리로 남습니다. 직장 판단에서는 관성이 책임과 조직, 식상이 결과물, 재성이 돈 조건으로 드러납니다. ${tenGods} 흐름을 보면 지금 선택은 마음의 불만보다 역할, 계약, 감당력의 문제로 봐야 합니다.`,
      `${ragLine} 무료 맛보기 결론으로는 ${signal} 때문에 움직이고 싶은 마음이 생겼지만, ${priority} 기준을 만족하는지 확인해야 합니다. ${daewoon}과 ${yearPillar} 흐름에서는 큰 결심보다 조건 확인이 먼저입니다. ${caution}`,
    ].join('\n\n'),
    'current-company-signal': [
      `현 회사에서 걸리는 신호는 ${signal}입니다. 이 신호는 단순한 짜증일 수도 있지만, 월주 ${monthPillar}가 사회에서 반복해서 부딪히는 패턴일 수도 있습니다. ${name}님은 ${dominant} 기운이 먼저 반응하므로, 같은 압박이 반복되면 마음보다 몸이 먼저 지칠 수 있습니다.`,
      `[주의할 점] 현 회사를 싫어하는 감정과 실제로 옮겨야 할 구조는 다릅니다. 역할이 흐린지, 결정권이 부족한지, 상사 압박인지, 동료 경쟁인지, 인정 욕구인지, 번아웃인지에 따라 해법이 달라집니다. 관성은 책임을 만들지만 과하면 압박이 되고, 식상은 결과물을 만들지만 과하면 반발이 됩니다.`,
      `${ragLine} 지금 입력한 찝찝한 지점은 "${discomfort}"입니다. 이 문장을 현 회사 안에서 해결할 수 있는 문제와 새 회사에서도 반복될 문제로 나누세요. 구분이 안 되면 이직은 해방이 아니라 같은 피로의 장소 이동이 될 수 있습니다.`,
    ].join('\n\n'),
    'career-constitution': [
      `${name}님의 커리어 체질은 ${dayPillar} 일주, ${dominant} 과다, ${weak} 보완으로 읽습니다. 이직운에서 오행은 직업을 하나로 맞히는 도구가 아닙니다. 목은 성장과 시작, 화는 표현과 노출, 토는 안정과 운영, 금은 기준과 판단, 수는 정보와 흐름으로 실제 일의 방식에 번역됩니다.`,
      `[주요 포인트] ${useful} 기운을 살리는 환경에서는 새 역할을 오래 감당하기 쉽습니다. 반대로 ${dominant}만 더 몰아붙이는 회사라면 처음엔 속도가 붙어도 번아웃이 빨리 올 수 있습니다. 신강·신약 감당력은 압박을 버티는 힘만이 아니라 회복 루틴을 만들 수 있는지까지 봐야 합니다.`,
      `${ragLine} ${role} 직무가 맞는지 보려면 재능보다 하루 반복을 봐야 합니다. 출근, 회의, 산출물, 피드백, 평가 방식이 ${name}님의 기운을 살리는지 확인하세요. 체질에 맞는 일은 성과만 내는 일이 아니라 회복 후 다시 들어갈 수 있는 일입니다.`,
    ].join('\n\n'),
    'role-fit': [
      `직무 핏은 "${role}" 기준으로 봅니다. 십신으로 보면 비견·겁재는 주체성과 경쟁, 식신·상관은 산출과 개선, 정재·편재는 돈과 시장, 정관·편관은 책임과 압박, 정인·편인은 문서·학습·해석의 결을 만듭니다. ${name}님 사주에는 ${tenGods} 흐름이 먼저 보입니다.`,
      `[주목할 점] 새 직무가 내 강점을 쓰게 하는지, 약한 기운을 계속 방치하게 하는지가 핵심입니다. ${dominant}이 강하면 새 판을 빠르게 읽지만, ${weak}이 비면 반복 운영이나 회복에서 흔들릴 수 있습니다. 직무명보다 실제 업무범위와 평가 기준을 먼저 확인해야 합니다.`,
      `${ragLine} ${company}의 역할 설명이 넓고 멋있게 들려도, 실제로는 누구에게 보고하고 어떤 결과물을 언제까지 내는지가 이직운의 현실 근거입니다. 이 부분이 흐리면 좋은 운도 불안한 자리로 들어갈 수 있습니다.`,
    ].join('\n\n'),
    'new-company-fit': [
      `새 회사 궁합은 회사 이름보다 일상 구조를 봅니다. 후보는 ${company}, 근무 형태는 ${workType}, 출퇴근·근무지 체감은 ${commute}입니다. 천이궁식으로 말하면 이동과 외부 환경이 바뀌는 자리이고, 생활 언어로는 몸이 매일 감당할 거리와 리듬입니다.`,
      `[주요 포인트] ${dayPillar} 일주의 사람은 새 공간에서 처음엔 ${dominant} 기운으로 적응하지만, 오래 버티는 힘은 ${useful} 기운이 받쳐야 합니다. 원격, 하이브리드, 사무실, 교대, 현장근무는 모두 다른 피로를 만듭니다. 새 회사가 좋아 보여도 생활 리듬이 맞지 않으면 만족도가 오래 가지 않습니다.`,
      `${ragLine} 면접이나 오퍼 단계에서는 조직 문화보다 먼저 하루 흐름을 물어보세요. 회의 밀도, 의사결정 속도, 보고 라인, 재택 가능성, 야근 패턴을 확인하면 새 회사 궁합이 훨씬 선명해집니다.`,
    ].join('\n\n'),
    'money-terms': [
      `연봉과 계약 조건은 ${salary}로 들어왔습니다. 재성은 돈만 뜻하지 않고 현실을 붙드는 감각입니다. 그래서 이직운에서 돈은 액수보다 구조로 봐야 합니다. 기본급, 성과급, 수습, 업무범위, 평가 기준, 출퇴근 비용, 장비·생활비 증가를 나눠야 합니다.`,
      `[주의할 점] 연봉이 올라도 계약서가 흐리면 돈 조건은 아직 완성된 것이 아닙니다. ${name}님 사주에서 ${tenGods} 흐름이 돈과 책임을 동시에 건드리므로, 역할이 넓어지는 만큼 보상이 실제로 따라오는지 확인해야 합니다. ${priority}가 돈 조건이라면 더더욱 문서가 기준입니다.`,
      `${ragLine} 현실 체크는 ${checkText}입니다. 오퍼레터와 계약서의 연봉·업무범위를 확인하지 않았다면 지금은 조건부 환승각에 가깝습니다. 돈길은 열릴 수 있지만, 돈구멍과 책임구멍을 먼저 막아야 합니다.`,
    ].join('\n\n'),
    'timing-daewoon-sewoon': [
      `타이밍은 ${daewoon}과 ${yearPillar} 세운을 같이 봅니다. 대운은 큰 방향이고 세운은 올해 실제로 올라오는 사건의 결입니다. 결정 예정일은 ${decisionDate}로 들어왔습니다. 날짜 하나로 합격이나 퇴사를 확정하지 않고, 그 시기의 압박과 준비 상태를 같이 봐야 합니다.`,
      `[주요 포인트] 대운 교차기나 세운의 충·형·파·해가 강한 때에는 이동 욕구가 빨라질 수 있습니다. 반대로 관성이 안정적으로 작동하면 책임이 늘어도 공식 역할을 얻을 수 있습니다. 지금 필요한 것은 좋은 날 찾기가 아니라 움직임이 과속인지, 준비된 전환인지 판단하는 것입니다.`,
      `${ragLine} 면접, 연봉 협상, 퇴사 통보는 한 번에 몰지 마세요. 최소한 이력서·오퍼·현금 버퍼·퇴사 대화 순서를 나눠야 합니다. 타이밍은 운의 문제이면서 동시에 순서의 문제입니다.`,
    ].join('\n\n'),
    'risk-brake': [
      `멈춰 봐야 할 브레이크는 "${discomfort}"입니다. 사주에서 충·형·파·해, 공망, 과한 상관, 과한 편관 같은 신호는 사건을 확정하는 말이 아니라 과속할 때 흔들리는 지점을 알려주는 경고입니다. 지금 이직운에서는 ${signal}이 그 경고의 입구입니다.`,
      `[위험 신호] 좋은 말만 하지는 않겠습니다. 번아웃 상태에서 도망치듯 움직이거나, 계약 조건을 확인하지 않거나, 역할 범위를 애매하게 두거나, 사람 때문에 급히 결정하면 새 회사에서도 같은 피로가 반복될 수 있습니다. 특히 ${weak} 기운이 비어 있는 부분은 회복과 정리에서 먼저 무너질 수 있습니다.`,
      `${ragLine} 브레이크는 포기하라는 뜻이 아닙니다. 멈춰서 확인해야 좋은 이동이 됩니다. 찝찝한 지점을 한 문장으로 적고, 그 문장이 계약서·업무범위·팀 문화·출퇴근 중 어디에 걸리는지 표시하세요. 표시가 안 되면 아직 정보가 부족한 겁니다.`,
    ].join('\n\n'),
    'ninety-day-action': [
      `90일 현실 액션은 이직운을 실제 선택으로 바꾸는 구간입니다. 현재 체크된 항목은 ${checkText}입니다. 운이 좋아도 이력서, 포트폴리오, 오퍼 조건, 현금 버퍼, 퇴사 대화가 준비되지 않으면 좋은 흐름을 담을 그릇이 약합니다.`,
      `[해법] 첫 30일은 이력서와 포트폴리오를 정리하고, 다음 30일은 면접과 역할 범위 질문을 준비하며, 마지막 30일은 연봉·계약·퇴사 대화를 문서화하세요. ${priority}를 기준으로 돈, 성장, 멘탈, 타이밍, 사람, 안정감 중 하나를 최우선 판단선으로 세워야 흔들리지 않습니다.`,
      `${ragLine} ${name}님에게 필요한 건 무작정 버티기나 바로 런이 아닙니다. ${useful} 기운을 살리는 준비표입니다. 준비표가 채워지면 이직각인지, 준비각인지, 조건부 환승각인지가 훨씬 분명해집니다.`,
    ].join('\n\n'),
    'final-checklist': [
      `마지막 체크는 ${priority} 기준입니다. ${contextLine} 이 입력값을 놓고 보면 결정 전에는 네 줄을 반드시 확인해야 합니다. 돈 조건, 역할 범위, 멘탈 회복, 타이밍입니다. 하나라도 빈칸이면 확정이 아니라 추가 확인입니다.`,
      `[최종 기준] 돈은 연봉 액수보다 계약 구조, 역할은 직무명보다 실제 책임, 멘탈은 설렘보다 회복 가능성, 타이밍은 날짜보다 준비 순서입니다. 사주는 ${dayPillar} 일주와 ${dominant}/${weak} 오행, 관성·식상·재성의 흐름으로 이 네 기준을 읽어줍니다.`,
      `${ragLine} 결론은 단정이 아니라 판단선입니다. ${company}로 움직일지 말지는 이 기준을 통과한 뒤 결정하세요. ${caution}`,
    ].join('\n\n'),
  }

  return sections[sectionId] ?? [
    `${name}님의 이직운은 ${focus} 기준으로 봅니다. ${dayPillar} 일주와 ${dominant}/${weak} 오행, 그리고 ${workMoveContextSummary(context)}을 함께 놓고 해석합니다.`,
    `${ragLine} 이 풀이는 확정 예언이 아니라 회사 이동 판단 기준을 정리하는 데 초점을 둡니다.`,
  ].join('\n\n')
}

function buildPassAngleInterpretation(
  sectionId: string,
  focus: ReportFocus,
  analysis: SajuAnalysis,
  context: SajuReportContext,
  ragTopics: string[],
): string {
  const name = cleanContextValue(context.name, '자네')
  const p = analysis.fourPillars
  const dayPillar = pillarLabel(p.day)
  const monthPillar = pillarLabel(p.month)
  const dayMaster = `${STEM_KO[analysis.dayMaster]}(${analysis.dayMaster})`
  const dominant = ELEMENT_KO[analysis.dominantElement]
  const weak = ELEMENT_KO[analysis.weakElement]
  const useful = analysis.usefulGod ? ELEMENT_KO[analysis.usefulGod] : weak
  const strong = analysis.dayMasterStrength === 'strong'
  const tenGods = analysis.tenGods ?? []
  const hasSeal = tenGods.some((god) => ['정인', '편인'].includes(god))
  const hasOfficer = tenGods.some((god) => ['정관', '편관'].includes(god))
  const hasOutput = tenGods.some((god) => ['식신', '상관'].includes(god))
  const hasRival = tenGods.some((god) => ['비견', '겁재'].includes(god))
  const yearPillar = analysis.fortune?.yearPillar ?? '올해 세운'
  const daewoon = analysis.fortune?.currentDaewoon ?? '현재 대운'
  const exam = context.exam
  const examName = cleanContextValue(exam?.examName, '준비 중인 시험')
  const examType = cleanContextValue(exam?.examType, '시험 유형 미선택')
  const examLast = examName.charCodeAt(examName.length - 1)
  const examAndType = `${examName}${examLast >= 0xac00 && examLast <= 0xd7a3 && (examLast - 0xac00) % 28 !== 0 ? '과' : '와'} ${examType}`
  const priority = cleanContextValue(exam?.priority, '지금 가장 필요한 것 미선택')
  const worry = cleanContextValue(exam?.worry, '아직 적지 않은 고민')
  const countdown = examCountdownLabel(context)
  const days = examDaysLeft(context)
  const affinity = EXAM_TYPE_AFFINITY[dominant] ?? '기준이 분명한 문제부터 끊어내는 방식이 맞습니다'
  // Corpus topics carry internal labels ('95점 번들: ...'), so surface only the readable tail.
  const readableTopics = [...new Set(ragTopics.map((topic) => topic.split(':').pop()?.trim() ?? topic))]
    .filter((topic) => topic && !/^[a-z_]+$/i.test(topic))
    .slice(0, 3)
  const ragLine = readableTopics.length > 0
    ? `이번 장은 ${readableTopics.join(', ')} 흐름을 함께 대조했습니다.`
    : ''

  // Seal(印) carries study and paperwork, Officer(官) carries certification.
  const sealLine = hasSeal
    ? '사주에 인성이 자리해 자료를 모으고 정리하는 힘이 기본값으로 있습니다. 다만 인성이 과하면 계획만 늘고 실전이 밀릴 수 있습니다.'
    : '인성이 뚜렷하지 않아 자료를 쌓는 방식보다, 문제를 먼저 풀고 부족한 부분만 채우는 역순 공부가 더 잘 붙습니다.'
  const officerLine = hasOfficer
    ? '관성이 있어 기준과 마감이 정해진 시험에서 집중이 살아납니다. 시험일과 제출 기한을 눈에 보이게 두세요.'
    : '관성이 약해 스스로 정한 마감은 쉽게 밀립니다. 외부 일정, 스터디, 모의고사처럼 강제력이 있는 장치가 필요합니다.'

  const phase = days === undefined
    ? '시험일을 넣으면 남은 기간에 맞춰 구간을 더 좁혀 드립니다.'
    : days > 100
      ? '아직 기초를 다시 잡을 여유가 있는 구간입니다. 범위를 넓게 한 번 훑고 버릴 단원을 먼저 정하세요.'
      : days > 30
        ? '기출과 오답으로 무게추를 옮길 구간입니다. 새 교재를 늘리는 선택이 가장 위험합니다.'
        : days > 7
          ? '점수 변동폭을 줄이는 구간입니다. 아는 문제를 확실히 맞히는 쪽으로 시간을 몰아야 합니다.'
          : '새 범위를 여는 시기가 아닙니다. 수면과 컨디션을 고정하고 이미 아는 것만 정리하세요.'

  const sections: Record<string, string> = {
    'pass-angle-verdict': [
      `흠... ${name}님의 ${examName} 흐름은 ${dayPillar} 일주와 ${yearPillar} 세운을 먼저 놓고 봅니다. 합격은 "된다, 안 된다"로 자를 문제가 아닙니다. 지금 방식 그대로 밀어도 되는지, 아니면 순서를 바꿔야 하는지가 먼저입니다.`,
      `[주요 포인트] ${sealLine} ${officerLine} 현재 ${countdown} 기준으로 보면, ${phase}`,
      `사주에서 시험은 문서와 자격의 자리로 봅니다. ${name}님은 ${dominant} 기운이 앞서고 ${weak} 기운이 비어 있어, 한쪽으로 힘이 쏠릴 때 성과가 크게 갈립니다. ${useful} 기운을 살리는 쪽으로 하루 순서를 짜면 같은 시간을 써도 남는 양이 달라집니다. 반대로 비어 있는 자리를 의지로만 메우려 하면 초반에는 되는 것처럼 보여도 중반에 흔들립니다.`,
      `[주목할 점] 지금 흐름에서 유리한 것은 범위를 넓히는 공부가 아니라 기준을 세우는 공부입니다. 무엇을 버릴지 정하지 않으면 남은 기간이 아무리 길어도 늘 부족하게 느껴집니다. 하루 안에서 가장 머리가 맑은 두 시간을 먼저 확보하고, 그 시간에는 가장 어려운 과목만 두세요.`,
      `${ragLine} 지금 적어주신 고민은 "${worry}"입니다. ${priority}에 무게를 두고 읽으시면 됩니다. 이 판정은 확정 예언이 아니라, 남은 기간에 무엇을 버리고 무엇을 남길지 정하는 기준입니다. 흐름이 유리해도 준비가 비면 결과는 흔들리고, 흐름이 빡빡해도 순서를 맞추면 붙는 경우가 많습니다.`,
    ].join('\n\n'),

    'study-style': [
      `${name}님의 공부 체질은 ${dayMaster} 일간에서 먼저 드러납니다. ${strong ? '기운이 단단한 편이라 한 번 방향이 잡히면 오래 밀고 갑니다. 대신 방향이 틀렸을 때 되돌리는 데 시간이 걸립니다.' : '기운이 예민한 편이라 컨디션에 따라 집중 편차가 큽니다. 대신 흐름을 타면 짧은 시간에 많이 흡수합니다.'}`,
      `[주목할 점] ${dominant} 기운이 앞서고 ${weak} 기운이 비어 있습니다. ${hasOutput ? '식상이 있어 배운 것을 말이나 글로 꺼낼 때 이해가 굳어집니다. 백지 복습과 설명하기를 루틴에 넣으세요.' : '식상이 약해 눈으로만 읽으면 기억이 오래 가지 않습니다. 손으로 쓰거나 소리 내어 정리하는 과정을 빠뜨리지 말고 끼워 넣으세요.'}`,
      `암기와 이해 중 어느 쪽이 먼저인지도 갈립니다. ${hasSeal ? '인성이 받쳐주니 개념을 먼저 잡고 문제로 확인하는 순서가 잘 맞습니다. 다만 정리 노트를 예쁘게 만드는 데 시간을 뺏기지 않도록 분량을 정해두세요.' : '개념서를 오래 붙잡기보다 문제를 먼저 풀고 틀린 자리만 개념으로 돌아가는 역순이 잘 맞습니다. 처음부터 완벽히 이해하려 들면 진도가 멈춥니다.'} 회독은 얇게 여러 번이 두껍게 한 번보다 유리합니다.`,
      `[해법] 하루 단위보다 주 단위로 계획을 잡으세요. 컨디션이 무너지는 날을 미리 한 칸 비워두면 밀렸다는 감각 없이 회복할 수 있습니다. ${strong ? '한 번 잡은 방식을 오래 유지하는 편이라, 2주에 한 번은 점수로 방향이 맞는지 점검해야 합니다.' : '방식을 자주 바꾸고 싶어지는 편이라, 최소 3주는 같은 방식을 유지하고 판단하세요.'}`,
      `${hasRival ? '비겁이 있어 같이 공부하는 사람이 있을 때 페이스가 올라갑니다. 다만 비교가 시작되면 오히려 흔들리니, 진도만 공유하고 점수는 공유하지 않는 편이 낫습니다.' : '비겁이 약해 혼자 공부하는 환경이 더 맞습니다. 스터디는 정보 수집용으로만 짧게 쓰세요.'} ${ragLine}`,
    ].join('\n\n'),

    'exam-type-fit': [
      `${examType} 기준으로 ${name}님의 시험 궁합을 봅니다. ${dominant} 기운이 중심이라 ${affinity}`,
      `[주요 포인트] ${hasOfficer ? '관성이 있어 자격·전문직처럼 기준이 정해진 시험에서 유리합니다.' : '관성이 약해 규정이 촘촘한 시험은 암기 부담이 크게 느껴질 수 있습니다. 요약본을 먼저 만들고 시작하세요.'} ${hasOutput ? '식상이 있어 서술형과 면접처럼 표현이 들어가는 형식에서 점수를 더 받습니다.' : '식상이 약해 장문 서술과 구술은 따로 훈련이 필요합니다. 답안 틀을 미리 외워두는 쪽이 안전합니다.'}`,
      `시험 형식별로 준비 방식도 달라집니다. 객관식은 오답 선지의 이유까지 적어야 점수가 오르고, 서술형은 결론을 먼저 쓰는 훈련이 먼저입니다. 어학·인증형은 기출 반복이 가장 정직하게 통하고, 실기는 손이 기억할 때까지 반복 횟수를 채워야 합니다. 면접·구술은 내용보다 말의 속도와 눈맞춤이 인상을 만듭니다.`,
      `[주의할 점] 잘 맞는 형식이라고 방심하면 오히려 실수가 나옵니다. 유리한 형식일수록 시간 관리에서 점수가 갈리니, 실전과 같은 시간 제한을 두고 푸는 연습을 마지막 한 달에는 빠뜨리지 마세요.`,
      `${ragLine} 시험 유형이 나와 맞지 않아도 떨어진다는 뜻은 아닙니다. 맞지 않는 형식일수록 준비 방식을 형식에 맞춰 바꾸면 됩니다. ${useful} 기운을 살리는 방향으로 공부 루틴을 조정하세요.`,
    ].join('\n\n'),

    'pass-timing': [
      `타이밍은 ${daewoon} 위에 ${yearPillar} 세운이 올라오고, 그 위에 월운이 실제 시험 일정으로 드러납니다. 한 달마다 운이 뒤집히는 것이 아니라, 큰 흐름 위에서 밀 구간과 조일 구간이 갈립니다.`,
      `[주요 포인트] 현재 ${countdown}입니다. ${phase} ${hasSeal ? '인성이 받쳐주는 구간에는 자료 정리와 개념 재정비가 잘 먹힙니다.' : '개념 정리보다 문제 풀이에서 감이 먼저 올라오는 편입니다.'}`,
      `월별로는 계절의 결을 따라 갑니다. 봄에는 새로 시작한 방식이 자리를 잡고, 여름에는 밀어붙이는 힘이 올라오지만 체력이 먼저 새기 쉽습니다. 가을에는 정리와 확정이 잘 되고, 겨울에는 마무리와 점검에 힘이 실립니다. ${monthPillar} 월주를 함께 놓고 보면 ${name}님은 몰아치는 구간보다 일정한 리듬을 유지할 때 점수가 안정적으로 올라옵니다.`,
      `[해법] 접수 시기와 시험일 사이에 적어도 한 번은 실전과 같은 조건으로 모의고사를 치르세요. 그 결과로 남은 기간의 배분을 다시 잡는 것이 계획을 처음부터 다시 세우는 것보다 훨씬 정확합니다.`,
      `[주의할 점] 재도전을 고민 중이라면 성적표보다 회복 상태를 먼저 보세요. 같은 방식으로 바로 다시 붙는 것은 흐름을 이어가는 게 아니라 소진을 이어가는 선택이 될 수 있습니다. ${ragLine}`,
    ].join('\n\n'),

    'mental-stamina': [
      `무너지는 지점은 대부분 실력이 아니라 리듬에서 옵니다. ${name}님은 월주 ${monthPillar}의 결을 따라 ${strong ? '버티는 힘은 있지만 한 번 지치면 회복이 늦는' : '회복은 빠르지만 자주 흔들리는'} 편입니다.`,
      `[위험 신호] 조심할 패턴은 세 가지입니다. 첫째, 계획을 더 크게 세워 불안을 덮는 것. 둘째, SNS와 합격 후기로 자기 상태를 재는 것. 셋째, 잠을 줄여 시간을 만드는 것입니다. ${hasSeal ? '인성이 강할수록 첫 번째 패턴이 잘 나옵니다.' : '인성이 약할수록 세 번째 패턴으로 기울기 쉽습니다.'}`,
      `번아웃은 갑자기 오지 않고 신호를 먼저 보냅니다. 같은 지문을 세 번 읽어도 들어오지 않을 때, 책상에 앉기까지 걸리는 시간이 길어질 때, 주말에 쉬어도 월요일이 무거울 때가 그 신호입니다. 이때 필요한 것은 더 강한 의지가 아니라 수면 시간의 회복입니다. 여섯 시간 아래로 내려가면 암기 효율이 먼저 떨어집니다.`,
      `[해법] 흔들릴 때는 계획표를 키우지 말고 수면 시간과 하루 첫 40분만 고정하세요. ${useful} 기운을 살리는 쪽은 더 하는 것이 아니라 덜어내는 쪽입니다. 산책, 짧은 운동, 정해진 식사 시간처럼 몸을 규칙적으로 만드는 것이 멘탈 관리의 실제 내용입니다.`,
      `불안이 올라올 때 붙잡을 문장을 하나 정해두세요. "오늘 몫만 한다" 정도면 충분합니다. 결과를 미리 계산하는 시간이 길어질수록 실제 공부 시간이 줄어듭니다. ${ragLine}`,
    ].join('\n\n'),

    'exam-day-routine': [
      `시험 당일은 실력보다 변수 관리가 점수를 지킵니다. ${countdown} 기준으로 지금부터 당일 동선을 미리 정해두면 긴장도가 눈에 띄게 떨어집니다.`,
      `[주요 포인트] 전날에는 새 자료를 열지 않습니다. 이미 정리한 오답 노트와 요약본만 봅니다. 이동 경로, 도착 시각, 준비물, 식사 시간까지 미리 적어두면 당일 판단에 쓰는 힘을 아낄 수 있습니다.`,
      `당일 아침은 평소와 같아야 합니다. 기상 시각, 식사량, 카페인 양을 시험 2주 전부터 고정해두면 몸이 그 시각에 맞춰 깨어납니다. 시험장에는 여유 있게 도착해 자리에 앉아 한 번 둘러보세요. 낯선 공간이 익숙해지는 데 필요한 시간은 생각보다 짧습니다.`,
      `[해법] 시험 중에는 모르는 문제에서 버티지 마세요. 표시해두고 넘어간 뒤 돌아오는 편이 총점에 유리합니다. 쉬는 시간에는 방금 본 과목을 복기하지 않습니다. 이미 끝난 과목이 남은 과목의 집중을 갉아먹습니다.`,
      `${strong ? '기운이 단단한 편이라 당일 긴장보다 전날 과부하가 더 위험합니다. 마지막 날은 의도적으로 일찍 덮으세요.' : '컨디션 편차가 있는 편이라 당일 아침 루틴을 고정하는 것이 가장 효과가 큽니다. 기상 시각과 첫 문제 푸는 시각을 평소와 같게 맞추세요.'} ${ragLine}`,
    ].join('\n\n'),

    'action-plan': [
      `마지막으로 남은 기간에 맞춘 실행표를 봅니다. ${countdown} 기준이며, ${examAndType}에 맞춰 조정했습니다.`,
      `[해법] D-100 구간에는 범위를 끝까지 훑고 버릴 단원을 먼저 정합니다. D-30 구간에는 기출과 오답으로 점수 변동폭을 줄입니다. D-7 구간에는 새 자료를 금지하고 수면과 동선을 고정합니다. ${phase}`,
      `주 단위로는 이렇게 씁니다. 평일 다섯 날은 진도와 문제 풀이에 쓰고, 하루는 그 주에 틀린 것만 다시 봅니다. 남은 하루는 비워두세요. 밀린 것을 메우는 날이자, 아무것도 밀리지 않았으면 쉬는 날입니다. 이 한 칸이 있어야 계획이 무너지지 않습니다.`,
      `[주의할 점] 버려야 할 것도 정해야 합니다. 출제 비중이 낮은 단원, 세 번 봐도 안 붙는 개념, 남들이 한다고 따라 산 교재는 과감히 뒤로 미루세요. 다 하려는 계획은 실제로는 아무것도 끝내지 못하는 계획입니다.`,
      `[주요 포인트] 지금 우선순위는 "${priority}"입니다. 여기에 맞지 않는 공부는 과감히 뒤로 미루세요. ${ragLine} 합격각은 더 오래 앉아 있는 데서 나오지 않고, 남은 날짜에 맞는 것만 남기는 데서 나옵니다.`,
    ].join('\n\n'),
  }

  return sections[sectionId] ?? [
    `${name}님의 시험 흐름은 ${focus} 기준으로 봅니다. ${dayPillar} 일주와 ${yearPillar} 세운, ${countdown} 일정을 함께 놓고 해석합니다.`,
    `${ragLine} 이 풀이는 합격을 확정하는 예언이 아니라, 남은 기간의 선택 기준입니다.`,
  ].join('\n\n')
}

function buildInterpretation(
  focus: ReportFocus,
  analysis: SajuAnalysis,
  context: SajuReportContext,
  ragTopics: string[],
  sectionId = '',
  birth?: BirthInput,
): string {
  const name = cleanContextValue(context.name, cleanContextValue(context.target, '자네'))
  const concern = cleanContextValue(context.concern, '말하지 못한 고민')
  const work = cleanContextValue(context.work, '지금 하고 있는 일')
  const relation = [context.relationship, context.orientation].filter(Boolean).join(' · ') || '관계의 기준'
  const p = analysis.fourPillars
  const dayPillar = pillarLabel(p.day)
  const monthPillar = pillarLabel(p.month)
  const dayMaster = `${STEM_KO[analysis.dayMaster]}(${analysis.dayMaster})`
  const dominant = ELEMENT_KO[analysis.dominantElement]
  const weak = ELEMENT_KO[analysis.weakElement]
  const useful = analysis.usefulGod ? ELEMENT_KO[analysis.usefulGod] : weak
  const strengthText = analysis.dayMasterStrength === 'strong'
    ? '기운이 강하게 서 있는'
    : analysis.dayMasterStrength === 'weak'
      ? '섬세하게 반응하는'
      : '중심을 맞추려는'
  const ragLine = ragTopics.length > 0 ? `이번 장은 ${ragTopics.join(', ')}의 흐름을 같이 대조했습니다.` : ''
  const target = cleanContextValue(context.target, '본인')
  const orientation = cleanContextValue(context.orientation, '관계 기준 미선택')
  const relationship = cleanContextValue(context.relationship, '관계 상태 미입력')
  const gyeokguk = analysis.manseryeok?.gyeokguk
  const climate = analysis.manseryeok?.climate
  const bridge = analysis.manseryeok?.flowBridges[0]
  const advancedLine = [
    gyeokguk ? `월령 기준으로는 ${gyeokguk.name} 렌즈가 잡힙니다` : '',
    climate ? `조후는 ${climate.temperature}/${climate.moisture} 쪽으로 읽힙니다` : '',
    bridge ? `통관은 ${ELEMENT_KO[bridge.bridge]} 기운이 ${ELEMENT_KO[bridge.conflict[0]]}와 ${ELEMENT_KO[bridge.conflict[1]]} 사이를 풀어주는 후보일세` : '',
  ].filter(Boolean).join('. ')
  const manseryeokLine = analysis.manseryeok
    ? `만세력 계산은 ${analysis.manseryeok.monthTerm} 절기 이후의 월주, 지장간, ${analysis.manseryeok.dayBoundaryRule === 'zi_hour_next_day' ? '23시 자시 다음 날 일주 옵션' : '날짜 기준 자시'}을 바탕으로 잡았습니다. ${advancedLine ? `${advancedLine}.` : ''}`
    : advancedLine

  if (isLoveThisYearContext(context)) {
    return buildLoveThisYearInterpretation(sectionId, focus, analysis, context, ragTopics, birth)
  }

  if (isHomeFitContext(context)) {
    return buildHomeFitInterpretation(sectionId, focus, analysis, context, ragTopics)
  }

  if (isWorkMoveContext(context)) {
    return buildWorkMoveInterpretation(sectionId, focus, analysis, context, ragTopics)
  }

  if (isPassAngleContext(context)) {
    return buildPassAngleInterpretation(sectionId, focus, analysis, context, ragTopics)
  }

  const sections: Partial<Record<ReportFocus, string>> = {
    profile: [
      `흠... ${name} 사주의 중심은 ${dayPillar} 일주, 그중에서도 ${dayMaster} 일간일세. 이 일간은 겉으로 드러나는 태도보다 속에서 먼저 판단하고, 작은 신호를 놓치지 않으려는 결을 갖는군. 이건 성향이자 기질의 기본값일세. 일간 강약으로는 신강·신약이라는 딱지보다 월령과 지장간이 더 중요하네. 자네라는 사람은 ${strengthText} 팔자라서 마음이 움직이기 전까지는 쉽게 방향을 바꾸지 않지만, 한 번 흐름이 잡히면 생각보다 깊게 파고드는 편일세.`,
      `년주 ${pillarLabel(p.year)}, 월주 ${monthPillar}, 시주 ${pillarLabel(p.hour)}를 같이 놓고 보면 ${dominant} 기운이 먼저 보이는군. ${ELEMENT_TRAIT[analysis.dominantElement]}이 사주의 앞쪽으로 올라와 있어, 남들이 보기에는 담담해 보여도 안쪽에서는 이미 많은 계산과 감지가 끝나 있는 사람일세. ${analysis.dayMasterAdvice}`,
      `${manseryeokLine ? `${manseryeokLine} ` : ''}${ragLine} 그러니 단순히 성격이 예민한 사람이 아니네. 사주가 먼저 주변의 온도를 읽고, 그 다음에 행동을 고르는 구조일세. 이걸 장점으로 쓰면 직관이 되고, 눌러두면 혼자만 알아차린 피로가 되는 법이지.`,
    ].join('\n\n'),
    target: [
      `이번 풀이는 ${target} 사주로 열렸습니다. 같은 명식이라도 본인을 보는지, 가족을 보는지, 연인이나 친구를 보는지에 따라 질문의 중심이 달라집니다. ${target} 기준에서는 사주의 좋은 말보다 먼저 '이 사람을 어떤 거리에서 이해해야 하는가'가 중요합니다.`,
      target.includes('가족')
        ? `가족 사주는 상대를 고치려는 해석이 아니라 덜 부딪히는 사용법을 찾는 해석입니다. 년주와 월주의 배경, 반복되는 책임감, 서로에게 기대하는 역할을 조심스럽게 봐야 합니다.`
        : target.includes('연인')
          ? `연인 사주는 끌림과 오래 남는 안정감을 나눠 봐야 합니다. 일지와 배우자궁, 현재 관계 상태가 같이 움직이므로 감정의 크기만으로 판단하면 빗나갈 수 있습니다.`
          : target.includes('친구')
            ? `친구 사주는 비견과 겁재, 비교와 거리감의 언어가 중요합니다. 가까워질수록 힘이 되는 관계인지, 에너지와 돈이 새는 관계인지 따로 봐야 합니다.`
            : `본인 또는 기타 대상의 사주는 확정적 평가보다 현재 선택 기준을 잡는 쪽으로 풀어야 합니다. 사주는 사람을 가두는 틀이 아니라 흐름을 다루는 지도입니다.`,
      `${ragLine} 그래서 이 리포트는 ${contextLabel(context)}을 먼저 붙잡고, 그 위에 일간·오행·십신·대운의 근거를 얹어 해석합니다.`,
    ].join('\n\n'),
    balance: [
      `오행을 펼쳐보니 목${analysis.elementCount.wood}·화${analysis.elementCount.fire}·토${analysis.elementCount.earth}·금${analysis.elementCount.metal}·수${analysis.elementCount.water}입니다. 여기서 ${dominant} 기운이 먼저 솟고, ${weak} 기운은 빈자리로 남습니다. 이 빈자리가 작아 보여도 실제 선택의 순간에는 꽤 크게 작동합니다.`,
      `${dominant}이 강하면 ${ELEMENT_TRAIT[analysis.dominantElement]}이 자연스럽게 앞섭니다. 반대로 ${weak}이 약하면 그 기운이 맡는 영역에서 망설임, 과로, 반복되는 미루기가 생길 수 있습니다. 용신으로는 ${useful} 흐름을 보는데, 이 기운이 들어올 때는 무리해서 밀어붙이는 것보다 균형을 되찾는 선택이 먼저입니다.`,
      `${advancedLine ? `${advancedLine}. ` : ''}${ragLine} 좋은 팔자는 강한 것만 많은 팔자가 아닙니다. 강한 기운을 어디에 쓰고, 빈 기운을 어떻게 채우는지가 더 중요합니다. ${name}님은 지금 강한 기운을 더 세게 만드는 것보다, 비어 있는 ${weak}의 자리를 생활 속에서 천천히 살려야 흐름이 안정됩니다.`,
    ].join('\n\n'),
    trap: [
      `${concern}. 이 고민이 그냥 우연히 올라온 건 아닙니다. 사주 안의 십신을 보면 ${analysis.tenGods.join(' · ') || '십신'} 흐름이 보이고, 여기서 반복되는 반응 패턴이 있습니다. 십신은 비겁·식상·재성·관성·인성으로 사람, 돈, 일, 표현, 보호의 방향을 읽는 관계 언어입니다. ${tenGodSentence(analysis)}`,
      `특히 월주 ${monthPillar}는 사회에서 드러나는 얼굴을 말합니다. 이 자리에 걸린 기운이 강하면, 혼자 있을 때의 나와 사람들 앞에서 버티는 내가 달라질 수 있습니다. 그래서 ${name}님은 괜찮은 척은 잘하지만, 정작 마음 깊은 곳에서는 이미 선을 넘었는지 아닌지를 계속 재고 있을 가능성이 큽니다.`,
      `${advancedLine ? `${advancedLine}. ` : ''}${ragLine} 함정은 늘 비슷합니다. 너무 빨리 읽어버리고, 너무 오래 참아버리고, 마지막에는 갑자기 끊어내는 식입니다. 이 패턴을 알면 피할 수 있습니다. 지금 필요한 건 더 세게 버티는 것이 아니라, 어떤 순간에 내가 무너지는지 정확히 이름 붙이는 일입니다.`,
    ].join('\n\n'),
    relationshipContext: [
      `관계 기준은 ${orientation}, 현재 상태는 ${relationship}입니다. 이 두 선택지는 연애운의 렌즈를 바꿉니다. 이성 관계 중심이면 일지와 배우자성, 도화와 합을 더 보고, 동성 관계 중심이면 비겁·인성·식상처럼 비슷한 사람과의 거리감, 보호, 표현 방식을 더 봅니다.`,
      relationship.includes('솔로')
        ? `솔로 상태는 비어 있는 시간이 아니라 내 기운을 정리하는 자리일 수 있습니다. 지금은 누가 들어오느냐보다 어떤 사람을 오래 남길 수 있는 상태인지가 먼저입니다.`
        : relationship.includes('마음에 둔')
          ? `마음에 둔 사람이 있다면 끌림과 실제 안정감을 나눠 봐야 합니다. 도화와 합은 마음을 당기지만, 일지가 불편하면 가까워질수록 방어가 올라올 수 있습니다.`
          : relationship.includes('연애 중')
            ? `연애 중이라면 만남 자체보다 반복 갈등의 구조가 중요합니다. 누가 더 좋아하느냐보다 어떤 장면에서 말이 어긋나고 책임이 몰리는지를 봐야 합니다.`
            : relationship.includes('이별')
              ? `이별 직후라면 재회 여부보다 마음이 같은 해석을 반복하는 방식을 먼저 봐야 합니다. 인성은 곱씹고, 비겁은 비교하며, 관성은 책임을 떠안을 수 있습니다.`
              : `결혼이나 장기 관계에서는 끌림보다 생활, 돈, 책임 배분이 핵심입니다. 관계운은 감정만이 아니라 같이 살아가는 구조까지 봐야 선명합니다.`,
      `${ragLine} 관계운은 상대를 맞히는 기술이 아닙니다. ${name}님이 어떤 관계에서 선명해지고 어떤 관계에서 흐려지는지 보는 일입니다.`,
    ].join('\n\n'),
    workContext: [
      `요즘 일상은 "${work}"로 들어왔습니다. 이 선택은 직업운의 출발점입니다. 학생이면 인성과 식상, 구직이면 관성과 시장성, 직장이면 월주와 관성, 사업이면 편재와 식상, 프리랜서면 계약과 반복 수입, 쉬는 중이면 회복과 재정비를 먼저 봐야 합니다.`,
      work.includes('학생')
        ? `학생의 운은 직업을 당장 확정하는 것보다 어떤 방식으로 실력을 꺼내는지가 중요하네. 공부, 시험, 진로는 인성이 받치고 식상이 결과물로 나와야 흐름이 붙네.`
        : work.includes('찾고')
          ? `일을 찾는 중이라면 운보다 기준이 먼저일세. 관성이 주는 자리, 식상이 보여줄 결과물, 재성이 반응할 시장을 나눠 준비해야 하네.`
          : work.includes('직장')
            ? `직장 흐름에서는 버티는 힘과 소모되는 지점을 같이 보겠네. 관성이 살아 있으면 신뢰를 얻지만, 상관이 강하면 규칙이 답답하게 느껴질 수 있네.`
            : work.includes('사업')
              ? `사업은 편재의 기회와 식상의 결과물이 만나야 열리네. 다만 사람 리스크, 지출, 동업 문제까지 같이 보지 않으면 재물운 해석이 가벼워지네.`
              : work.includes('프리랜서')
                ? `프리랜서는 자유보다 구조가 중요하네. 계약 기준, 반복 수입, 소진을 막는 루틴이 있어야 식상과 재성이 돈길로 이어지네.`
                : `쉬는 중이라면 운이 멈춘 것이 아니라 회복과 방향 재설정의 구간일 수 있네. 조급하게 움직이기보다 다시 움직일 기준을 먼저 잡아야 하네.`,
      `${ragLine} 일상 선택지는 사주 풀이의 현실 좌표일세. 같은 재물운도 ${work} 상태에서는 돈이 들어오는 방식과 새는 지점이 다르게 드러나네.`,
    ].join('\n\n'),
    careerMoney: [
      `${work}의 흐름을 사주에 얹어보면 일과 돈은 따로 움직이지 않네. 재성은 돈만 뜻하지 않고 현실을 붙드는 감각이며, 식상은 내가 만들어내는 결과물일세. ${name}님 사주에서 ${analysis.tenGods.join(' · ') || '십신'}이 보이는 만큼, 돈은 운 좋게 떨어지는 것보다 내가 어떤 방식으로 능력을 꺼내느냐에 따라 열리네.`,
      `${dominant} 기운이 강한 사람은 일에서 자신만의 방식이 생기면 속도가 붙네. 다만 ${weak} 기운이 약한 쪽에서 관리가 새면 돈도 같이 샐 수 있네. 큰 기회보다 먼저 봐야 할 건 반복 수입, 관계 비용, 감정적으로 쓰는 돈일세. 여기가 정리되면 재물운은 훨씬 선명하게 붙네.`,
      `${ragLine} 올해 흐름은 ${analysis.fortune?.yearPillar ?? '세운'}이 함께 움직이네. 좋은 말만 하자면 기회가 보이는군. 하지만 더 정확히 말하자면, 기준 없이 넓히는 일은 조심해야 하네. 돈길은 열리되, 새는 구멍을 막는 사람이 결국 흐름을 잡는 법일세.`,
    ].join('\n\n'),
    moneyLeak: [
      `돈이 새는 자리는 재성이 약해서만 생기지 않네. ${analysis.tenGods.join(' · ') || '십신'} 중에서 비겁이 강하면 사람과 비교 때문에, 상관이 강하면 즉흥과 반발 때문에, 인성이 과하면 준비와 공부에 오래 묶여 돈이 새기 쉽네.`,
      `${name}님에게 먼저 필요한 건 더 큰 기회를 찾는 일보다 현재의 돈구멍을 막는 일일세. 반복 지출, 관계 비용, 기분에 따라 쓰는 돈, 기준 없이 넓히는 제안을 분리해 봐야 하네. ${weak} 기운이 약한 쪽에서는 관리 장치가 부족해질 수 있으니 계좌, 일정, 계약 기준을 작게라도 세워야 하네.`,
      `${ragLine} 재물운은 겁주는 풀이가 아닐세. 돈이 들어오는 문과 새는 문을 같이 봐야 진짜 돈길이 보이는군.`,
    ].join('\n\n'),
    love: [
      `${relation}으로 관계를 보면, 일지 ${BRANCH_KO[p.day.branch]}(${p.day.branch}) 자리가 먼저 눈에 들어오는군. 일지는 내가 가장 가까운 사람을 어떻게 받아들이는지, 오래 남는 인연 앞에서 어떤 반응을 보이는지 보여주는 자리일세. ${name}님은 가볍게 시작한 관계보다 마음의 깊이를 확인한 뒤 오래 가는 쪽에 더 맞네.`,
      `남명은 재성, 여명은 관성이 배우자 흐름을 보는데, 지금 사주에서는 ${analysis.tenGods.join(' · ') || '십신'}의 조합을 같이 봐야 하네. 끌림은 빠르게 올 수 있어도, 진짜 남는 사람은 ${useful} 기운을 살리는 사람일세. 말이 많은 사람보다 내 흐름을 안정시키는 사람, 자극보다 기준을 세워주는 사람이 더 오래 남네.`,
      `${ragLine} 그러니 인연운은 누가 나타나느냐만 보는 풀이가 아닐세. 내가 어떤 상태일 때 좋은 사람을 알아보는지도 같이 봐야 하네. 지금 ${name}님에게 필요한 건 사랑을 더 세게 잡는 게 아니라, 나를 흐리게 만드는 관계와 나를 선명하게 만드는 관계를 구별하는 눈일세.`,
    ].join('\n\n'),
    destiny: [
      `운명의 상대를 본다면 특정 이름이나 외형을 단정할 수는 없네. 대신 ${name}님의 일지와 ${useful} 기운을 기준으로 오래 남는 사람의 분위기는 볼 수 있네. 자극이 센 사람보다 내 흐름을 안정시키는 사람, 불안을 키우기보다 기준을 세워주는 사람이 더 오래 가는 법일세.`,
      `${useful} 기운이 살아나는 상대는 ${name}님이 평소 과하게 쓰던 ${dominant} 기운을 부드럽게 조절하게 하네. 직업적 분위기로 보면 전문성, 생활 리듬, 말의 온도, 돈과 책임을 다루는 방식에서 신호가 오네. 운명의 상대는 갑자기 떨어지는 정답이 아니라 내 사주의 빈자리를 무리 없이 채워주는 사람일세.`,
      `${ragLine} 그래서 인연은 '누가 나타나는가'와 동시에 '내가 어떤 상태일 때 알아보는가'를 같이 봐야 하네.`,
    ].join('\n\n'),
    future: [
      `앞으로의 흐름은 대운 ${analysis.fortune?.currentDaewoon ?? '대운'}과 올해 세운 ${analysis.fortune?.yearPillar ?? '세운'}을 같이 보겠네. 대운은 10년짜리 큰 물길이고, 세운은 그 물길 위에 올라오는 올해의 파도일세. 둘이 같은 방향이면 일이 빨리 풀리고, 서로 어긋나면 속도보다 조정이 먼저 필요하네.`,
      `${name}님의 원국에서는 ${dominant} 기운이 강하고 ${weak} 기운이 약하군. 운에서 ${useful}이 살아나는 시기에는 사람, 일, 돈이 한 방향으로 모일 수 있네. 반대로 강한 ${dominant}만 더 몰리는 시기에는 자신감은 생기지만 과속도 같이 들어오네. 이때는 좋은 제안도 한 번 더 확인해야 하네.`,
      `${ragLine} 흐름은 확정된 운명이 아니라 읽어야 할 날씨에 가깝네. 우산을 들고 나가면 비도 길이 되는 법일세. 지금부터 봐야 할 신호는 갑자기 커지는 제안, 오래 미뤄둔 관계의 정리, 그리고 돈이 들어오기 전 먼저 생기는 지출일세.`,
    ].join('\n\n'),
    timingPlace: [
      `시기와 장소는 날짜를 찍는 방식보다 신호를 읽는 방식이 더 정확하네. 대운과 세운이 움직일 때 사람은 먼저 생활 반경이 바뀌고, 만나는 사람의 결이 달라지고, 돈과 관계의 제안이 특정 공간에서 반복되네.`,
      `${useful} 기운이 목이면 배움과 성장의 자리, 화이면 모임과 노출, 토이면 생활 기반과 일상 공간, 금이면 계약과 전문성의 자리, 수이면 이동·온라인·정보의 공간이 신호가 되네. ${name}님에게 사건이 드러나는 곳은 사주가 이미 쓰고 있는 오행의 언어와 연결되는군.`,
      `${ragLine} 그러니 인연이나 전환의 장소는 '그곳에 반드시 간다'가 아니라, 어떤 성격의 공간에서 내 운이 먼저 반응하는지 보는 기준일세.`,
    ].join('\n\n'),
    reportDepth: [
      `긴 리포트는 같은 말을 길게 늘리는 글이 아닐세. 명식 구조, 일간, 오행, 십신, 용신, ${contextLabel(context)}, 현재 고민, 대운과 세운, 재물, 직업, 연애, 인연, 시기와 장소를 각각 다른 근거로 쌓아야 하네.`,
      `95점짜리 풀이가 되려면 각 장마다 세 가지가 들어가야 하네. 첫째, 실제 사주 근거. 둘째, 사용자가 선택한 대상·관계·일상 상태와의 연결. 셋째, 지금 당장 볼 수 있는 행동 기준일세. 여기에 격국·조후·통관의 내부 근거와 생활 장면이 같이 붙어야 말이 그럴듯한 수준에서 끝나지 않네.`,
      `${ragLine} 그래서 이 리포트는 ${name}님을 한 문장으로 가두지 않고, 선택지마다 달라지는 해석의 초점을 따라가며 깊게 펼치는 구조로 설계되네.`,
    ].join('\n\n'),
    action: [
      `마지막으로 지금 붙잡아야 할 신호를 보겠네. ${name}님 사주에서 답은 거창한 결심보다 ${useful} 기운을 살리는 작은 반복에 있네. 강한 ${dominant}은 이미 충분하군. 이제는 부족한 ${weak}을 채워야 판이 안정되네.`,
      `${concern} 때문에 마음이 흔들린다면, 먼저 기준을 하나만 세워보게. 당장 모든 걸 바꾸려 하지 말고, 이번 달에 지킬 수 있는 약속 하나, 끊어낼 소비 하나, 정리할 관계 하나를 정하는 걸세. 사주는 방향을 보여주지만, 운을 붙드는 건 결국 반복일세.`,
      `${ragLine} 천명사주 식으로 말하면 이렇네. 좋은 운은 기다리는 사람에게 오는 게 아니라, 들어왔을 때 담을 그릇을 만들어둔 사람에게 남는 법일세. 지금 ${name}님에게 필요한 건 더 많은 예언이 아니라, 이미 보이는 신호를 놓치지 않는 일일세.`,
    ].join('\n\n'),
  }

  const base = sections[focus] ?? [
    `${name}님 사주의 ${focus} 흐름을 보겠네. ${dayPillar} 일주와 ${dominant} 기운, ${weak}의 빈자리를 함께 놓고 보면 지금 봐야 할 기준이 보이는군.`,
    `${ragLine} 이 장은 단정적인 예언보다 명식 근거와 선택지 맥락을 연결하는 데 초점을 두네. 같은 사주라도 ${contextLabel(context)}에 따라 읽어야 할 자리가 달라지는 법일세.`,
  ].join('\n\n')

  const riskNote = conditionalRiskNote(focus, analysis, context)
  return riskNote ? `${base}\n\n${riskNote}` : base
}

export function buildTemplateSajuReport(
  analysis: SajuAnalysis,
  birth: BirthInput,
  context: SajuReportContext = {},
): SajuReport {
  const isLoveThisYear = isLoveThisYearContext(context)
  const isWorkMove = isWorkMoveContext(context)
  const isPassAngle = isPassAngleContext(context)
  const keys = [
    ...(context.serviceKey ? [`service:${context.serviceKey}`] : []),
    ...patternKeys(analysis, birth),
    ...(context.target ? [`target:${context.target}`] : []),
    ...(context.orientation ? [`orientation:${context.orientation}`] : []),
    ...(context.relationship ? [`relationship:${context.relationship}`] : []),
    ...(context.work ? [`work:${context.work}`] : []),
    ...(context.concern ? [`concern:${context.concern}`] : []),
    ...(context.partner?.mode ? [`partner:${context.partner.mode}`] : []),
    ...(context.partner?.relationship ? [`partnerRelationship:${context.partner.relationship}`] : []),
    ...(context.partner?.dayMaster ? [`partnerDayMaster:${context.partner.dayMaster}`] : []),
    ...(context.partner?.dominantElement ? [`partnerDominant:${context.partner.dominantElement}`] : []),
    ...homePatternKeys(context),
    ...workMovePatternKeys(context),
    ...examPatternKeys(context),
    ...(analysis.manseryeok?.gyeokguk ? [`gyeokguk:${analysis.manseryeok.gyeokguk.name}`] : []),
    ...(analysis.manseryeok?.climate ? [`climate:${analysis.manseryeok.climate.season}:${analysis.manseryeok.climate.temperature}`] : []),
    ...(analysis.manseryeok?.flowBridges.map((bridge) => `flowBridge:${bridge.bridge}`) ?? []),
  ]
  const name = cleanContextValue(context.name, cleanContextValue(context.target, '자네'))
  const sections: SajuReportSection[] = blueprintsForContext(context).map((blueprint, index) => {
    const chunks = retrieveRagChunks(
      `${blueprint.query} ${reportContextQuery(context)}`,
      analysis,
      runtimeConfig.report?.ragTopK ?? 4,
      context,
    )
    const ragTopics = chunks.map((c) => c.topic)
    // cmdg-style emotional beats: emotion first, mechanics under the hood.
    const loveStory = isLoveThisYear
      ? toStorytellingPayload(buildLoveThisYearStoryBeat(blueprint.id, analysis, context, ragTopics, birth))
      : undefined

    return {
      id: blueprint.id,
      order: index + 1,
      imageKey: 'common-mystic',
      imageSrc: COMMON_IMAGE_SRC,
      imageAlt: `${blueprint.category} 공통 이미지`,
      category: blueprint.category,
      categoryEn: blueprint.categoryEn,
      classification: classificationFor(blueprint.focus, analysis, context, blueprint.id),
      hook: hookFor(blueprint.focus, analysis, context, blueprint.id),
      patternKeys: keys,
      ragTopics,
      interpretation: buildInterpretation(blueprint.focus, analysis, context, ragTopics, blueprint.id, birth),
      ...(loveStory ? { storytelling: loveStory } : {}),
    }
  })

  const report: SajuReport = {
    title: isLoveThisYear
      ? `${name}님의 올해 연애운 리포트`
      : isHomeFitContext(context)
        ? `${name}님의 집 풍수 리포트`
        : isWorkMove
          ? `${name}님의 이직운 리포트`
          : isPassAngle
            ? `${name}님의 합격각 리포트`
            : `${name}님의 사주 리포트`,
    subtitle: isLoveThisYear
      ? '도화, 세운, 배우자성의 신호로 올해 연애 가능성과 놓치기 쉬운 타이밍을 봅니다.'
      : isHomeFitContext(context)
        ? '현관, 침실, 책상, 창밖 체감과 사주 오행 리듬을 겹쳐 지금 집의 핏을 봅니다.'
        : isWorkMove
          ? '대운, 세운, 관성, 식상, 재성 흐름과 입력한 회사 이동 조건을 겹쳐 이직 판단선을 봅니다.'
          : isPassAngle
            ? '인성, 관성, 세운 흐름과 입력한 시험 조건을 겹쳐 합격각과 공부 전략을 봅니다.'
            : '사주 기둥과 오행, 십신, 대운 흐름을 기준으로 순차 해석합니다.',
    model: 'template',
    generatedBy: 'template',
    sections,
  }
  report.quality = evaluateReportQuality(report, analysis, context)
  return report
}

function reportPrompt(
  analysis: SajuAnalysis,
  birth: BirthInput,
  context: SajuReportContext,
  baseReport: SajuReport,
): LlmMessage[] {
  const featureJson = buildSajuFeatureJson(analysis, context)
  const ragBySection = baseReport.sections
    .map((section) => {
      const chunks = retrieveRagChunks(
        `${section.category} ${section.classification} ${reportContextQuery(context)}`,
        analysis,
        runtimeConfig.report?.ragTopK ?? 4,
        context,
      )
      return `## ${section.id}\n${formatRagForPrompt(chunks)}`
    })
    .join('\n\n')

  return [
    {
      role: 'system',
      content: [
        '당신은 천명사주 사주 리포트 작성 엔진입니다.',
        '작성 흐름은 명식 계산 → Feature JSON → RAG 검색 → Interpretation → User Copy입니다.',
        '입력된 사주 기둥, 오행, 십신, 용신, 대운, 내부 지식 블록을 근거로 장문 풀이를 씁니다.',
        'Feature JSON에 격국·조후·통관·지장간·합충형파해·자시 계산 규칙이 있으면 해당 섹션의 판단 근거로 연결합니다.',
        '내부 지식 블록은 그대로 복붙하지 말고, 각 섹션의 선택지·고민·명식 근거와 연결해 성향·실제 행동·위험·기회·조언으로 해석합니다.',
        '최종 interpretation에는 “RAG”, “코퍼스”, “검색된 지식”, “지식 블록” 같은 내부 처리 용어를 쓰지 않습니다.',
        CHEONMYEONG_TONE_GUIDE,
        '내용은 중학생도 이해할 수 있게 씁니다. 일간·십신·용신·대운 같은 말은 쓴 뒤 바로 쉬운 생활 언어로 풀어 설명합니다.',
        '문단은 3~5줄 정도로 짧게 끊고, 한 문단 안에는 하나의 핵심만 담습니다. 긴 문장은 둘로 나눕니다.',
        '각 분류는 얕은 요약으로 끝내지 말고, 왜 그런 해석이 나오는지, 실제 생활에서 어떻게 드러나는지, 무엇을 조심하고 무엇을 하면 좋은지까지 풍부하게 풉니다.',
        '각 섹션에는 중요한 문단 2~4개를 골라 문단 첫머리에 [주요 포인트], [주목할 점], [주의할 점], [위험 신호], [위기 신호], [해법] 중 하나를 붙입니다. 표식은 남발하지 말고 실제로 강조가 필요한 문단에만 씁니다.',
        '논리 전개는 명식 근거 → 성향/상황 해석 → 좋은점 → 주의할점/위험/위기 → 구체적인 행동 기준이 보이게 씁니다.',
        '좋은 흐름과 안 좋은 함정을 둘 다 말합니다. 안 좋은 패턴은 “이 대목은 위험하네”, “방치하면 반복될 수 있네”, “돈길보다 돈구멍이 먼저 보이는군”처럼 선명하게 말하되 공포를 팔지 않습니다.',
        '각 섹션에 억지 경고를 넣지는 말되, 겁재·상관·편관, 합충형파해, 과다/부족 오행, 대운·세운 충돌, 사용자의 고민에서 위험 신호가 드러나면 반드시 주의할 것·피해야 할 선택·드러나는 시기·풀 행동 기준을 함께 알려줍니다.',
        'serviceKey가 home_fit이면 집 풍수 단일 상품입니다. home.addressOrBuilding, buildingType, livingPeriod, mainPurpose, stayDecision, painPoints, entranceFlow, bedroomFeel, deskPosition, outsideFlow, extraNote를 사주 오행과 대운·세운에 겹쳐 해석합니다.',
        'home_fit에서는 명당/흉지, 강제 이사, 건강·재산·계약 결과를 확정하지 말고, 현관·침실·책상·창밖·수납·동선에서 7일 동안 확인할 수 있는 현실 조정과 판단 기준을 씁니다.',
        '확정 예언, 질병 진단, 투자 수익 보장, 법률 판단은 금지합니다.',
        '반드시 JSON만 출력하세요. Markdown 코드블록을 쓰지 마세요.',
      ].join('\n'),
    },
    {
      role: 'user',
      content: JSON.stringify({
        instruction: 'baseReport의 섹션 수와 id/order/imageKey/category/categoryEn/classification/patternKeys/ragTopics는 유지하고, hook과 interpretation만 더 밀도 있게 보강하세요. interpretation은 섹션마다 한국어 1800~2600자 정도로 풍부하게 쓰고, 문단은 6~9개로 나누되 각 문단은 화면에서 3~5줄 정도로 읽히게 짧게 끊으세요. 내부 지식 블록은 최종 문장이 아니라 판단 재료입니다. 전문용어는 꼭 필요할 때만 한 번 쓰고 즉시 사용자 언어로 번역하세요. 중요한 문단 2~4개는 [주요 포인트], [주목할 점], [주의할 점], [위험 신호], [위기 신호], [해법] 표식을 문단 첫머리에 붙이세요. 반드시 target/orientation/relationship/work/concern/partner/home 선택지를 해당 섹션에 맞게 반영하세요. serviceKey가 love_this_year이면 올해 연애 가능성, 도화 시기, 배우자성, 상대방 사주 입력 여부, 궁합 흐름, 감정 온도 차이를 중심으로 씁니다. serviceKey가 home_fit이면 집 풍수 상품이므로 현관·침실·책상·창밖·수납·동선·7일 체감 테스트와 사주 오행 핏을 중심으로 씁니다. 좋은 말과 안 좋은 경고를 균형 있게 쓰고, 위험 신호는 대운·세운·전환 시기와 해법까지 연결하세요. 최종 사용자 문장에는 RAG/코퍼스/검색된 지식/지식 블록이라는 말을 쓰지 마세요.',
        outputShape: {
          title: 'string',
          subtitle: 'string',
          sections: [
            {
              id: 'string',
              hook: 'string',
              interpretation: 'string',
            },
          ],
        },
        birth,
        context,
        featureJson,
        sajuSummary: analysis.summary,
        baseReport,
        ragBySection,
      }),
    },
  ]
}

function sectionPrompt(
  analysis: SajuAnalysis,
  birth: BirthInput,
  context: SajuReportContext,
  section: SajuReportSection,
): LlmMessage[] {
  const featureJson = buildSajuFeatureJson(analysis, context)
  const chunks = retrieveRagChunks(
    `${section.category} ${section.classification} ${reportContextQuery(context)}`,
    analysis,
    runtimeConfig.report?.ragTopK ?? 4,
    context,
  )
  return [
    {
      role: 'system',
      content: [
        '당신은 천명사주 사주 리포트의 한 페이지를 작성합니다.',
        '한 번에 전체 리포트를 쓰지 말고, 사용자가 선택한 현재 페이지 섹션만 작성합니다.',
        '작성 흐름은 명식 계산 → Feature JSON → RAG 검색 → Interpretation → User Copy입니다.',
        '사주 기둥, 오행, 십신, 용신, 대운, 내부 지식 블록을 근거로 하되 기계적으로 나열하지 않습니다.',
        'Feature JSON의 격국·조후·통관·지장간·합충형파해 근거가 현재 섹션과 관련되면 반드시 해석에 녹입니다.',
        '내부 지식 블록은 문장 안에 복사하지 말고 현재 고민, 선택지, 명식 근거와 연결해 의미만 사용합니다.',
        '최종 interpretation에는 “RAG”, “코퍼스”, “검색된 지식”, “지식 블록” 같은 내부 처리 용어를 쓰지 않습니다.',
        CHEONMYEONG_TONE_GUIDE,
        '내용은 중학생도 이해할 수 있게 씁니다. 전문용어는 쉬운 말로 바로 풀고, 어려운 한자어만 나열하지 않습니다.',
        '문단은 3~5줄 정도로 짧게 끊고, 한 문단 안에는 하나의 핵심만 담습니다. 긴 문장은 둘로 나눕니다.',
        '해석은 풍부해야 합니다. 근거, 실제 생활 장면, 주의할 점, 바로 해볼 행동 기준을 함께 씁니다.',
        '중요한 문단 2~4개는 [주요 포인트], [주목할 점], [주의할 점], [위험 신호], [위기 신호], [해법] 표식을 문단 첫머리에 붙입니다. 실제 강조가 필요한 곳에만 씁니다.',
        '논리 전개는 명식 근거 → 성향/상황 해석 → 좋은점 → 주의할점/위험/위기 → 구체적인 행동 기준이 보이게 씁니다.',
        '이 섹션의 근거에서 위험 신호가 드러날 때만 주의할 것·피해야 할 선택·미래에 먼저 흔들릴 지점을 선명하게 덧붙입니다. 억지로 모든 섹션에 경고를 넣지 않습니다.',
        '안 좋은 패턴을 말할 때는 반드시 대운·세운·전환 신호처럼 드러나는 시기와, 사용자가 그 흐름을 풀 행동 기준을 함께 제시합니다.',
        'serviceKey가 home_fit이면 집 풍수 단일 상품입니다. home 입력값을 중심으로 현관·침실·책상·창밖·수납·동선·7일 체감 테스트를 다루고, 명당/흉지나 강제 이사처럼 확정적인 표현은 쓰지 않습니다.',
        '확정 예언, 질병 진단, 투자 수익 보장, 법률 판단은 금지합니다.',
        '반드시 JSON만 출력하세요. Markdown 코드블록을 쓰지 마세요.',
      ].join('\n'),
    },
    {
      role: 'user',
      content: JSON.stringify({
        instruction: '현재 section 하나만 보강하세요. id/order/imageKey/imageSrc/category/categoryEn/classification/patternKeys/ragTopics는 유지합니다. hook은 짧게, interpretation은 한국어 1800~2600자 정도로 작성하세요. 문단은 6~9개로 나누고 각 문단은 화면에서 3~5줄 정도로 읽히게 짧게 끊으세요. 내부 지식 블록은 복사하지 말고 의미만 뽑아 Feature JSON과 연결하세요. 일간·십신·대운·용신 같은 용어는 꼭 필요할 때만 한 번 쓰고 바로 쉬운 말로 풀어주세요. 중요한 문단 2~4개는 [주요 포인트], [주목할 점], [주의할 점], [위험 신호], [위기 신호], [해법] 표식을 문단 첫머리에 붙이세요. target/orientation/relationship/work/concern/partner/home 선택지 중 이 섹션과 직접 관련된 값은 반드시 문장 속에 녹이세요. serviceKey가 love_this_year이면 올해 연애 가능성, 도화 시기, 배우자성, 상대방 사주 입력 여부, 궁합 흐름, 감정 온도 차이를 중심으로 씁니다. serviceKey가 home_fit이면 현관·침실·책상·창밖·수납·동선·7일 체감 테스트와 사주 오행 핏을 중심으로 씁니다. 위험 신호가 있으면 좋은 말로 덮지 말고, 드러나는 시기와 해법까지 말하세요. 최종 사용자 문장에는 RAG/코퍼스/검색된 지식/지식 블록이라는 말을 쓰지 마세요.',
        outputShape: {
          id: section.id,
          hook: 'string',
          interpretation: 'string',
        },
        birth,
        context,
        featureJson,
        sajuSummary: analysis.summary,
        section,
        rag: formatRagForPrompt(chunks),
      }),
    },
  ]
}

function extractJsonObject(raw: string): unknown {
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end < start) throw new Error('리포트 JSON을 찾지 못했습니다.')
  return JSON.parse(cleaned.slice(start, end + 1)) as unknown
}

function mergeOpenAiReport(
  baseReport: SajuReport,
  rawReport: unknown,
  analysis: SajuAnalysis,
  context: SajuReportContext,
): SajuReport {
  const parsed = rawReport as {
    title?: unknown
    subtitle?: unknown
    sections?: Array<{ id?: unknown; hook?: unknown; interpretation?: unknown }>
  }
  const generatedSections = Array.isArray(parsed.sections) ? parsed.sections : []
  const sections = baseReport.sections.map((section) => {
    const next = generatedSections.find((item) => item.id === section.id)
    const hook = typeof next?.hook === 'string' && next.hook.trim() ? next.hook.trim() : section.hook
    const interpretation = typeof next?.interpretation === 'string' && next.interpretation.trim()
      ? next.interpretation.trim()
      : section.interpretation

    return {
      ...section,
      hook,
      interpretation,
    }
  })

  const report: SajuReport = {
    ...baseReport,
    title: typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : baseReport.title,
    subtitle: typeof parsed.subtitle === 'string' && parsed.subtitle.trim() ? parsed.subtitle.trim() : baseReport.subtitle,
    model: REPORT_MODEL,
    generatedBy: 'openai',
    sections,
  }
  report.quality = evaluateReportQuality(report, analysis, context)
  return report
}

export async function buildOpenAiSajuReport(
  analysis: SajuAnalysis,
  birth: BirthInput,
  context: SajuReportContext = {},
): Promise<SajuReport> {
  const baseReport = buildTemplateSajuReport(analysis, birth, context)
  const raw = await chatWithOpenAI(reportPrompt(analysis, birth, context, baseReport), {
    model: REPORT_MODEL,
    maxTokens: runtimeConfig.report?.maxTokens ?? 9000,
  })
  return mergeOpenAiReport(baseReport, extractJsonObject(raw), analysis, context)
}

export async function buildOpenAiSajuReportSection(
  analysis: SajuAnalysis,
  birth: BirthInput,
  sectionId: string,
  context: SajuReportContext = {},
): Promise<SajuReportSection> {
  const baseReport = buildTemplateSajuReport(analysis, birth, context)
  const section = baseReport.sections.find((item) => item.id === sectionId) ?? baseReport.sections[0]
  const raw = await chatWithOpenAI(sectionPrompt(analysis, birth, context, section), {
    model: REPORT_MODEL,
    maxTokens: runtimeConfig.report?.sectionMaxTokens ?? 3000,
  })
  const parsed = extractJsonObject(raw) as { hook?: unknown; interpretation?: unknown }

  return {
    ...section,
    hook: typeof parsed.hook === 'string' && parsed.hook.trim() ? parsed.hook.trim() : section.hook,
    interpretation: typeof parsed.interpretation === 'string' && parsed.interpretation.trim()
      ? parsed.interpretation.trim()
      : section.interpretation,
  }
}

export function getReportModel(): string {
  return REPORT_MODEL
}
