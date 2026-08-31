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
import { pillarLabel } from '../saju/calculator.js'
import { BRANCH_KO, ELEMENT_KO, STEM_KO } from '../saju/analyzer-helpers.js'
import { buildReportChapters, chapterForSectionId, chapterSearchTextForSection } from './report-chapters.js'
import { evaluateReportQuality } from './report-quality.js'

const COMMON_IMAGE_SRC = '/assets/hero-mystic.webp'
const REPORT_MODEL = process.env.REPORT_OPENAI_MODEL ?? runtimeConfig.report?.model ?? 'gpt-5.5'
const MIN_OPENAI_SECTION_CHARS = 1700

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

interface SectionBrief {
  uniqueAngle: string
  requiredSlots: string[]
  sceneAnchors: string[]
  antiRepeat: string[]
  ragQuery: string
}

const BASE_ANTI_REPEAT = [
  '같은 용신 처방 반복 금지',
  '문서 확인·하루 보류 같은 처방 남발 금지',
  '각 섹션의 마지막 결론은 서로 다르게 작성',
]

const FOCUS_SECTION_BRIEFS: Record<ReportFocus, SectionBrief> = {
  profile: {
    uniqueAngle: '겉으로 보이는 성격과 혼자 있을 때의 피로 장면을 분리',
    requiredSlots: ['겉모습', '내면 반응', '피로가 쌓이는 장면', '회복 방식'],
    sceneAnchors: ['첫인상', '혼자 집에 들어온 뒤', '결정 전 머뭇거림'],
    antiRepeat: ['성격 좋다는 칭찬만 반복 금지'],
    ragQuery: '개인 장면 성격 기질 검증 장면 숨은 피로',
  },
  target: {
    uniqueAngle: '누구의 사주를 보는지에 따라 거리와 책임의 렌즈를 변경',
    requiredSlots: ['대상 기준', '거리 조절', '책임 범위', '해석 금지선'],
    sceneAnchors: ['가족 대화', '연인 갈등', '친구 비교', '본인 선택'],
    antiRepeat: ['대상 선택지를 첫 문장에만 언급하고 끝내지 않기'],
    ragQuery: '대상 선택 본인 가족 연인 친구 상담 맥락 개인화',
  },
  balance: {
    uniqueAngle: '강한 오행의 장점과 빈 오행의 생활 결핍을 동시에 장면화',
    requiredSlots: ['강한 오행 장점', '약한 오행 결핍', '조후·통관 보완', '생활 루틴'],
    sceneAnchors: ['일이 몰리는 날', '쉬어야 하는데 못 쉬는 밤', '일정표와 공간 정리'],
    antiRepeat: ['부족한 오행을 색·방향 처방으로만 끝내지 않기'],
    ragQuery: '오행 균형 조후 통관 생활 루틴 과다 부족',
  },
  trap: {
    uniqueAngle: '반복 고민이 실제로 터지는 말·돈·관계 장면을 특정',
    requiredSlots: ['반복 패턴', '터지는 장면', '위험 신호', '끊는 행동'],
    sceneAnchors: ['메신저 답장', '회의 중 말투', '사람 부탁', '혼자 참다가 끊는 순간'],
    antiRepeat: ['위험하다는 말만 하고 해법을 생략하지 않기'],
    ragQuery: '반복 고민 함정 위험 신호 생활 장면 해법',
  },
  relationshipContext: {
    uniqueAngle: '관계 상태와 지향성에 따라 끌림·거리감·책임을 분리',
    requiredSlots: ['현재 관계 상태', '끌림과 안정감 구분', '거리감', '말투 기준'],
    sceneAnchors: ['카톡 답장 속도', '소개 자리', '약속 잡는 방식', '서운함을 꺼내는 순간'],
    antiRepeat: ['좋은 인연이 온다는 추상 결론 반복 금지'],
    ragQuery: '연애 관계 상태 동성 이성 카톡 소개 거리감',
  },
  workContext: {
    uniqueAngle: '현재 일상 상태를 월주·관성·식상·재성으로 현실 번역',
    requiredSlots: ['현재 일상', '업무 압박', '인정받는 방식', '소진 지점'],
    sceneAnchors: ['회의', '보고', '상사 피드백', '업무 분장', '퇴근 후 소진'],
    antiRepeat: ['이직 여부를 단정하지 않고 조건을 나누기'],
    ragQuery: '직장 업무 장면 회의 보고 상사 피드백 전환 기준',
  },
  careerMoney: {
    uniqueAngle: '일에서 만든 결과물이 돈으로 바뀌는 경로를 구체화',
    requiredSlots: ['수입 경로', '성과 인정', '계약 기준', '확장 조건'],
    sceneAnchors: ['월급일', '성과급', '프로젝트 제안', '계약서', '평가 면담'],
    antiRepeat: ['돈이 들어온다는 단정 대신 돈길·돈구멍 분리'],
    ragQuery: '재물운 직업운 돈길 계약 성과급 반복 수입',
  },
  moneyLeak: {
    uniqueAngle: '새는 돈의 원인을 사람·비교·계약·보상소비로 분해',
    requiredSlots: ['지출 구멍', '사람 비용', '계약 리스크', '상한선'],
    sceneAnchors: ['카드값', '경조사비', '동업 제안', '계좌 이체', '보상 소비'],
    antiRepeat: ['절약하라는 일반론 금지'],
    ragQuery: '돈구멍 관계 비용 지출 상한선 계약 리스크 겁재',
  },
  love: {
    uniqueAngle: '가까운 관계에서 반복되는 반응과 오래 남는 사람의 조건을 분리',
    requiredSlots: ['일지 반응', '끌림', '불편한 반복', '오래 남는 조건'],
    sceneAnchors: ['답장 기다림', '약속 취소', '만난 뒤 피로', '말투가 차가워지는 순간'],
    antiRepeat: ['운명의 상대를 외형·직업으로 찍지 않기'],
    ragQuery: '연애운 일지 배우자궁 관계 장면 카톡 답장 거리감',
  },
  destiny: {
    uniqueAngle: '운명의 상대를 특정 인물이 아니라 생활 리듬과 안정감으로 설명',
    requiredSlots: ['상대 분위기', '생활 리듬', '돈과 책임 태도', '알아보는 신호'],
    sceneAnchors: ['소개 자리', '일 관련 모임', '대화의 온도', '약속을 지키는 방식'],
    antiRepeat: ['곧 만난다는 예언 금지'],
    ragQuery: '운명의 상대 상대 프로필 인연 장소 생활 리듬 안정감',
  },
  future: {
    uniqueAngle: '대운·세운을 연도별로 확인 가능한 생활 변화 신호로 번역',
    requiredSlots: ['현재 연도 신호', '다음 해 확인점', '대운 무대', '피해야 할 선택'],
    sceneAnchors: ['이직 제안', '생활 반경 변화', '갑작스러운 지출', '오래 미룬 관계 정리'],
    antiRepeat: ['대박·불운 단정 금지'],
    ragQuery: '대운 세운 연도별 미래 신호 전환 구간 사건화',
  },
  timingPlace: {
    uniqueAngle: '날짜와 장소를 찍지 않고 운이 먼저 반응하는 공간 유형을 제시',
    requiredSlots: ['시기 신호', '장소 유형', '생활 반경', '확인 행동'],
    sceneAnchors: ['온라인 채널', '교육 공간', '계약 자리', '이동 동선', '모임'],
    antiRepeat: ['반드시 특정 장소라고 단정 금지'],
    ragQuery: '시기 장소 공간 유형 생활 반경 온라인 계약 모임',
  },
  reportDepth: {
    uniqueAngle: '장문 리포트가 복붙이 아니라 근거가 다른 장들의 누적임을 설명',
    requiredSlots: ['근거층', '개인화 기준', '중복 방지', '읽는 순서'],
    sceneAnchors: ['목차를 다시 펼쳐보는 장면', '중요 문단 표시', '행동 기준 확인'],
    antiRepeat: ['분량 자랑만 하지 않기'],
    ragQuery: '장문 리포트 5만자 서사 밀도 유료 리포트 중복 방지',
  },
  action: {
    uniqueAngle: '지금 바로 붙잡을 행동을 돈·관계·일상 기준으로 나누기',
    requiredSlots: ['이번 달 기준', '끊을 것', '붙잡을 것', '다시 볼 신호'],
    sceneAnchors: ['이번 달 일정표', '계좌 정리', '거절 문장', '관계 거리 조절'],
    antiRepeat: ['막연한 긍정 조언 금지'],
    ragQuery: '구체적 행동 기준 이번 달 루틴 돈 관계 직장 해법',
  },
}

const REPORT_BLUEPRINTS: ReportBlueprint[] = [
  {
    id: 'profile',
    category: '네 매력 기본 스펙',
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
    category: '네 기운의 분포',
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

const SECTION_BRIEF_OVERRIDES: Record<string, Partial<SectionBrief>> = {
  profile: {
    uniqueAngle: '첫인상과 실제 내면의 온도 차이를 사주 근거로 검증',
    requiredSlots: ['첫인상', '혼자 있을 때의 반응'],
    sceneAnchors: ['처음 만난 자리', '집에 돌아와 혼자 정리하는 시간'],
    ragQuery: '첫인상 내면 온도 차이 성격 검증 장면',
  },
  'target-context': {
    uniqueAngle: '상담 대상 선택이 풀이의 거리와 책임 범위를 바꾸는 지점',
    requiredSlots: ['대상별 해석 렌즈', '상대에게 넘기면 안 되는 책임'],
    sceneAnchors: ['본인 선택을 정리하는 장면', '상대의 말에 흔들리는 장면'],
    ragQuery: '상담 대상 선택 책임 범위 거리 조절',
  },
  'pillars-structure': {
    uniqueAngle: '년주·월주·일주·시주를 삶의 네 무대로 나눠 읽기',
    requiredSlots: ['배경', '사회 얼굴', '가까운 관계', '후반부 욕망'],
    sceneAnchors: ['가족에게서 배운 반응', '회사나 사회에서 쓰는 얼굴', '가까운 사람 앞의 태도'],
    ragQuery: '사주 네 기둥 삶의 무대 년주 월주 일주 시주',
  },
  'year-pillar': {
    uniqueAngle: '초년 환경과 가족 배경이 지금 반응에 남긴 흔적',
    requiredSlots: ['가족 배경', '초년 습관', '현재 반복'],
    sceneAnchors: ['어릴 때 익숙했던 분위기', '가족 앞에서 자동으로 나오는 말투'],
    ragQuery: '년주 초년 가족 배경 현재 반복 장면',
  },
  'month-pillar': {
    uniqueAngle: '사회에서 쓰는 얼굴과 직장 압박의 실제 장면',
    requiredSlots: ['사회적 역할', '업무 압박', '평가받는 방식'],
    sceneAnchors: ['회의', '보고', '상사 피드백', '동료 비교'],
    ragQuery: '월주 사회 얼굴 직장 장면 평가 압박',
  },
  'day-pillar': {
    uniqueAngle: '일지와 배우자궁이 가까운 관계에서 드러나는 방식',
    requiredSlots: ['가까운 관계 반응', '서운함 처리', '오래 남는 조건'],
    sceneAnchors: ['카톡 답장', '약속을 잡는 방식', '서운함을 삼키는 순간'],
    ragQuery: '일주 일지 배우자궁 카톡 관계 장면',
  },
  'hour-pillar': {
    uniqueAngle: '퇴근 후의 욕망과 후반부 삶에서 커지는 방향',
    requiredSlots: ['숨은 욕망', '후반부 무대', '혼자 준비하는 일'],
    sceneAnchors: ['퇴근 후 혼자 하는 일', '주말에 자꾸 찾는 관심사'],
    ragQuery: '시주 후반부 잠재력 퇴근 후 욕망',
  },
  'day-master-strength': {
    uniqueAngle: '강약을 칭찬·낙인이 아니라 버티는 방식으로 설명',
    requiredSlots: ['강약 근거', '버티는 방식', '무너지는 조건'],
    sceneAnchors: ['결정 직전', '부탁을 거절해야 하는 순간'],
    ragQuery: '일간 강약 버티는 방식 결정 장면',
  },
  'hidden-personality': {
    uniqueAngle: '괜찮은 척 뒤에 숨는 진짜 피로와 예민한 감지력',
    requiredSlots: ['숨은 반응', '참는 방식', '갑자기 끊는 순간'],
    sceneAnchors: ['메신저를 읽고 답을 미루는 밤', '혼자 마음속 선을 긋는 장면'],
    ragQuery: '숨은 성격 피로 감지력 메신저 장면',
  },
  balance: {
    uniqueAngle: '오행 분포를 실제 에너지 배분과 생활 루틴으로 번역',
    requiredSlots: ['오행 개수', '과다 장면', '부족 장면', '보완 루틴'],
    sceneAnchors: ['일이 몰린 날', '쉬어야 하는데 쉬지 못하는 밤'],
    ragQuery: '오행 분포 생활 루틴 과다 부족 장면',
  },
  'dominant-element': {
    uniqueAngle: '가장 강한 기운이 능력과 피로로 동시에 올라오는 장면',
    requiredSlots: ['강한 기운의 장점', '과사용 경고', '속도를 낮추는 기준'],
    sceneAnchors: ['사람들 앞에서 먼저 반응하는 순간', '혼자 과열되는 밤'],
    ragQuery: '강한 오행 과다 능력 피로 과사용',
  },
  'weak-element': {
    uniqueAngle: '빈 기운이 결핍이 아니라 의식적으로 키워야 할 기능인 이유',
    requiredSlots: ['빈 기운', '생활 결핍', '보완 행동'],
    sceneAnchors: ['정리되지 않은 일정', '미뤄둔 연락이나 서류'],
    ragQuery: '약한 오행 부족 보완 생활 결핍',
  },
  'ten-gods-overview': {
    uniqueAngle: '십신을 사람·돈·일·표현·보호의 관계 언어로 풀기',
    requiredSlots: ['주요 십신', '관계성', '좋게 쓸 때', '꼬일 때'],
    sceneAnchors: ['사람 부탁', '경쟁이 생기는 자리', '결과물을 보여주는 순간'],
    ragQuery: '십신 관계성 사람 돈 일 표현 보호',
  },
  'ten-gods-position': {
    uniqueAngle: '십신이 어느 기둥에 놓였는지에 따라 장면을 다르게 해석',
    requiredSlots: ['위치 근거', '년월일시 차이', '현실 장면'],
    sceneAnchors: ['가족 앞', '회사 안', '가까운 사람 앞', '퇴근 후'],
    ragQuery: '십신 위치 년주 월주 일주 시주 장면',
  },
  'useful-god-eokbu': {
    uniqueAngle: '억부 용신을 강약 조절과 선택 기준으로 내리기',
    requiredSlots: ['억부 판단', '강한 기운 조절', '선택 기준'],
    sceneAnchors: ['과하게 밀어붙이는 순간', '한 번 멈추고 기준을 세우는 장면'],
    ragQuery: '용신 억부 강약 조절 선택 기준',
  },
  'useful-god-johu': {
    uniqueAngle: '조후를 온도·습도·생활 리듬의 보완으로 설명',
    requiredSlots: ['계절 온도', '습도 감각', '생활 리듬 보완'],
    sceneAnchors: ['몸과 마음이 과열되는 날', '휴식 리듬을 다시 잡는 장면'],
    ragQuery: '조후 온도 습도 생활 리듬 보완',
  },
  trap: {
    uniqueAngle: '같은 고민이 사람만 바꿔 반복되는 구조',
    requiredSlots: ['반복 장면', '위험 신호', '끊는 문장'],
    sceneAnchors: ['참다가 갑자기 끊는 순간', '말이 세지는 회의'],
    ragQuery: '반복 고민 함정 사람만 바뀌는 패턴',
  },
  'concern-loop': {
    uniqueAngle: '현재 고민이 명식의 어떤 버튼을 누르는지 특정',
    requiredSlots: ['고민 원문 반영', '눌리는 십신', '반복을 끊는 순서'],
    sceneAnchors: ['고민을 다시 검색하는 밤', '같은 선택 앞에서 멈추는 장면'],
    ragQuery: '현재 고민 원문 십신 버튼 반복 루프',
  },
  'relationship-orientation': {
    uniqueAngle: '이성·동성 관계 중심에 따라 읽어야 할 십신을 변경',
    requiredSlots: ['관계 렌즈', '배우자성 또는 비겁', '거리감'],
    sceneAnchors: ['친구 같은 사람과의 편안함', '이성적 끌림이 강해지는 자리'],
    ragQuery: '이성 동성 관계 중심 배우자성 비겁 거리감',
  },
  'relationship-status': {
    uniqueAngle: '솔로·짝사랑·연애·이별·결혼 상태별로 장면을 바꾸기',
    requiredSlots: ['현재 상태', '지금 먼저 볼 장면', '피해야 할 해석'],
    sceneAnchors: ['답장을 기다리는 시간', '소개를 받는 자리', '재회 연락을 고민하는 밤'],
    ragQuery: '관계 상태 솔로 짝사랑 연애 이별 결혼 장면',
  },
  'career-money': {
    uniqueAngle: '일의 결과물이 돈으로 바뀌는 구조와 막히는 곳',
    requiredSlots: ['일의 결과물', '보상 구조', '막히는 지점'],
    sceneAnchors: ['성과를 보고하는 자리', '급여나 평가를 확인하는 순간'],
    ragQuery: '일 돈 결과물 보상 구조 평가',
  },
  'work-context': {
    uniqueAngle: '현재 일상 선택지를 직업운 해석의 출발점으로 삼기',
    requiredSlots: ['현재 상태', '월주 작동', '소진 지점'],
    sceneAnchors: ['출근길', '업무 분장', '퇴근 후 방전'],
    ragQuery: '직장 일상 월주 출근 퇴근 소진',
  },
  'career-transition': {
    uniqueAngle: '버틸 조건과 옮길 조건을 따로 제시',
    requiredSlots: ['버틸 조건', '옮길 조건', '전환 신호'],
    sceneAnchors: ['평가 면담', '이직 제안', '퇴사 버튼을 떠올리는 밤'],
    ragQuery: '이직 퇴사 버틸 조건 옮길 조건 전환 신호',
  },
  'wealth-flow': {
    uniqueAngle: '돈이 들어오는 문을 고정 수입과 기회 수입으로 나누기',
    requiredSlots: ['정재 흐름', '편재 흐름', '수입 반복성'],
    sceneAnchors: ['월급일', '성과급 제안', '새 거래 제안'],
    ragQuery: '정재 편재 월급 성과급 수입 구조',
  },
  'money-leak': {
    uniqueAngle: '돈이 새는 구멍을 사람·체면·계약·보상소비로 특정',
    requiredSlots: ['돈구멍', '지출 상한선', '거절 기준'],
    sceneAnchors: ['경조사비', '카드값', '동업 제안', '충동 구매'],
    ragQuery: '돈구멍 경조사비 카드값 동업 충동 소비',
  },
  'wealth-timing': {
    uniqueAngle: '재물 기회가 붙는 해와 먼저 새는 지출을 함께 보기',
    requiredSlots: ['재물 시기', '선행 지출', '잡아야 할 기회'],
    sceneAnchors: ['계약 제안', '큰 지출이 먼저 생기는 달', '보상 협상'],
    ragQuery: '재물 시기 선행 지출 계약 제안 보상 협상',
  },
  'love-loop': {
    uniqueAngle: '끌리는 사람과 오래 맞는 사람을 분리',
    requiredSlots: ['끌림', '불편한 반복', '오래 맞는 조건'],
    sceneAnchors: ['카톡 템포', '약속이 어긋나는 장면', '만난 뒤 마음이 편한지'],
    ragQuery: '연애 반복 카톡 템포 끌림 안정감',
  },
  'destiny-partner': {
    uniqueAngle: '운명의 상대를 생활 리듬·돈·책임 태도로 설명',
    requiredSlots: ['상대 분위기', '돈 태도', '책임 태도', '알아보는 신호'],
    sceneAnchors: ['소개 자리의 대화 온도', '약속을 지키는 방식', '일 관련 모임'],
    ragQuery: '운명의 상대 생활 리듬 돈 책임 소개 자리',
  },
  'avoid-relationship': {
    uniqueAngle: '멀리해야 할 사람을 성격 비난이 아니라 반복 장면으로 정의',
    requiredSlots: ['피해야 할 장면', '거리 조절', '초기 신호'],
    sceneAnchors: ['돈 부탁', '비교를 자극하는 말', '답을 재촉하는 연락'],
    ragQuery: '멀리해야 할 관계 돈 부탁 비교 연락 재촉',
  },
  'love-timing': {
    uniqueAngle: '인연이 드러나는 시기를 연락·공간·소개 신호로 보기',
    requiredSlots: ['인연 시기', '연락 신호', '장소 신호'],
    sceneAnchors: ['소개 연락', '모임 초대', '온라인 대화가 길어지는 순간'],
    ragQuery: '인연 시기 연락 소개 모임 온라인 신호',
  },
  'future-flow': {
    uniqueAngle: '큰 운의 방향을 확장·정리·재배치 중 무엇인지 판별',
    requiredSlots: ['대운 방향', '세운 자극', '확장 또는 정리'],
    sceneAnchors: ['생활 반경 변화', '큰 제안', '오래 미룬 정리'],
    ragQuery: '대운 방향 세운 확장 정리 재배치',
  },
  'daewoon-detail': {
    uniqueAngle: '10년짜리 무대가 바꾸는 사람·일·돈의 결',
    requiredSlots: ['현재 대운', '다음 대운 힌트', '무대 변화'],
    sceneAnchors: ['주로 만나는 사람의 변화', '일하는 방식의 변화'],
    ragQuery: '대운 10년 무대 사람 일 돈 변화',
  },
  'sewoon-detail': {
    uniqueAngle: '올해 세운이 먼저 건드리는 표면 사건',
    requiredSlots: ['올해 신호', '먼저 흔들리는 영역', '올해 피할 선택'],
    sceneAnchors: ['올해 들어 반복된 제안', '갑자기 늘어난 지출이나 연락'],
    ragQuery: '올해 세운 표면 사건 제안 지출 연락',
  },
  'turning-years': {
    uniqueAngle: '전환 구간을 연도와 생활 변화 신호로 묶기',
    requiredSlots: ['전환 연도', '변곡 신호', '준비 행동'],
    sceneAnchors: ['회사·집·관계 반경이 바뀌는 장면', '오래 잡고 있던 것을 놓는 순간'],
    ragQuery: '인생 전환 연도 변곡 생활 변화',
  },
  'timing-place': {
    uniqueAngle: '운이 먼저 반응하는 공간 유형과 이동 동선',
    requiredSlots: ['공간 유형', '이동 동선', '만남 채널'],
    sceneAnchors: ['온라인 채널', '교육 공간', '계약 자리', '이동 중 만나는 사람'],
    ragQuery: '시기 장소 공간 유형 이동 동선 온라인 교육 계약',
  },
  'action-guide': {
    uniqueAngle: '이번 달에 바로 실행할 돈·관계·일상 기준',
    requiredSlots: ['이번 달 행동', '돈 기준', '관계 기준', '일 기준'],
    sceneAnchors: ['계좌 정리', '일정표 수정', '거절 문장 준비'],
    ragQuery: '이번 달 행동 계좌 일정표 거절 문장 관계 기준',
  },
  'long-report-depth': {
    uniqueAngle: '리포트 전체를 반복 없는 유료 서사로 읽는 방법',
    requiredSlots: ['읽는 순서', '중복 방지', '다시 확인할 장'],
    sceneAnchors: ['목차를 열고 필요한 장을 다시 보는 장면', '표시된 위험 신호를 체크하는 장면'],
    ragQuery: '장문 리포트 유료 서사 반복 없는 목차 읽는 법',
  },
}

function mergeSectionBrief(base: SectionBrief, override: Partial<SectionBrief> = {}): SectionBrief {
  return {
    uniqueAngle: override.uniqueAngle ?? base.uniqueAngle,
    requiredSlots: [...base.requiredSlots, ...(override.requiredSlots ?? [])],
    sceneAnchors: [...base.sceneAnchors, ...(override.sceneAnchors ?? [])],
    antiRepeat: [...BASE_ANTI_REPEAT, ...base.antiRepeat, ...(override.antiRepeat ?? [])],
    ragQuery: [base.ragQuery, override.ragQuery].filter(Boolean).join(' '),
  }
}

function sectionBriefForBlueprint(blueprint: ReportBlueprint): SectionBrief {
  return mergeSectionBrief(FOCUS_SECTION_BRIEFS[blueprint.focus], SECTION_BRIEF_OVERRIDES[blueprint.id])
}

function sectionBriefForSection(section: Pick<SajuReportSection, 'id'>): SectionBrief {
  const blueprint = REPORT_BLUEPRINTS.find((item) => item.id === section.id)
  if (blueprint) return sectionBriefForBlueprint(blueprint)
  return mergeSectionBrief(FOCUS_SECTION_BRIEFS.reportDepth)
}

function sectionBlueprintForId(sectionId: string): ReportBlueprint | undefined {
  return REPORT_BLUEPRINTS.find((item) => item.id === sectionId)
}

function sectionBriefQuery(brief: SectionBrief): string {
  return [
    brief.uniqueAngle,
    brief.ragQuery,
    ...brief.requiredSlots,
    ...brief.sceneAnchors,
  ].join(' ')
}

const PAID_REPORT_QUALITY_CONTRACT = [
  '각 섹션은 과거 검증 장면, 현재 생활 장면, 가까운 미래 신호, 행동 처방 중 최소 3개를 포함합니다.',
  '사주 용어는 반드시 회의, 카톡, 월급일, 계좌, 계약, 소개 자리, 퇴근 후 소진처럼 사용자가 떠올릴 수 있는 장면으로 번역합니다.',
  '돈 섹션은 돈길·돈구멍·지출 상한선·계약 기준을, 관계 섹션은 답장 템포·거리감·상대의 생활 리듬을, 직장 섹션은 회의·보고·평가·업무 분장을 반드시 구체화합니다.',
  '대운·세운 섹션은 현재 연도와 다음 해를 기준으로 관찰 가능한 신호를 제시하되 확정 예언은 하지 않습니다.',
  '리포트 전체에서 같은 처방을 반복하지 말고, sectionBrief.requiredSlots와 sceneAnchors에 맞춰 섹션별 결론을 다르게 씁니다.',
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
  ].filter(Boolean).join(' · ') || '기본 상담'
}

function reportContextQuery(context: SajuReportContext): string {
  return [
    context.target,
    context.orientation,
    context.relationship,
    context.work,
    context.concern,
  ].filter(Boolean).join(' ')
}

function classificationFor(focus: ReportFocus, analysis: SajuAnalysis, context: SajuReportContext): string {
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

function hookFor(blueprint: ReportBlueprint, analysis: SajuAnalysis, context: SajuReportContext): string {
  const focus = blueprint.focus
  const concern = cleanContextValue(context.concern, '요즘 마음에 걸리는 문제')
  const dominant = ELEMENT_KO[analysis.dominantElement]
  const weak = ELEMENT_KO[analysis.weakElement]

  const hooks: Record<ReportFocus, string> = {
    profile: '너의 진짜 결이 이제 보입니다',
    target: `${context.target ?? '이 대상'}으로 본 이유가 풀이의 방향을 바꿉니다`,
    balance: `${dominant} 기운이 먼저 치고 올라옵니다`,
    trap: `${concern} 때문에 여기까지 온 이유가 있습니다`,
    relationshipContext: `${context.relationship ?? '관계 상태'}의 결부터 보겠습니다`,
    workContext: `${context.work ?? '요즘 일상'} 안에서 운이 움직입니다`,
    careerMoney: '돈길과 일길은 따로 보지 않습니다',
    moneyLeak: '돈이 새는 자리가 먼저 보입니다',
    love: '오래 남는 사람은 따로 보입니다',
    destiny: '운명의 상대는 자극보다 결을 안정시킵니다',
    future: '큰 운은 이미 방향을 틀고 있습니다',
    timingPlace: '시기와 장소는 작은 신호로 먼저 옵니다',
    reportDepth: '이 리포트는 한 줄 예언이 아니라 근거의 층입니다',
    action: `${weak} 기운을 채우는 순간 흐름이 바뀝니다`,
  }

  return `${blueprint.category}에서 ${hooks[focus]}`
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

  const timedClose = `${timingRiskNote(focus, analysis)} 이건 확정 예언이 아니라, 그 신호가 보일 때 한 번 멈춰 보라는 사전 경고입니다.`

  if (focus === 'balance' && weakCount === 0) {
    return `좋은 말만 하지는 않겠습니다. ${weak} 기운이 완전히 비어 있으면 그 영역은 평소엔 티가 덜 나다가, 일이 몰릴 때 회피·소진·판단 지연으로 꽤 못나게 드러날 수 있습니다. ${dominant}을 더 키우기보다 ${useful}을 살리는 루틴을 먼저 잡아야 합니다. ${timedClose}`
  }

  if (focus === 'trap' && riskyGods.length > 0) {
    return `안 좋은 건 이렇게 보입니다. 이 부분은 위험합니다. ${riskyGods.join(' · ')} 흐름이 강하게 드러날 때는 사람과 비교, 말의 충돌, 과한 책임, 혼자만의 해석이 고민을 키울 수 있습니다. ${concern ? `"${concern}" 문제에서는 ` : ''}좋은 말보다 먼저 반복되는 장면을 끊어야 합니다. 방치하면 같은 문제를 사람만 바꿔 다시 만날 가능성이 큽니다. ${timedClose}`
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

function reportTiming(analysis: SajuAnalysis): { currentYear: number; nextYear: number; yearPillar: string; daewoon: string } {
  const currentYear = analysis.fortune?.currentYear ?? new Date().getFullYear()
  return {
    currentYear,
    nextYear: currentYear + 1,
    yearPillar: analysis.fortune?.yearPillar ?? '올해 세운',
    daewoon: daewoonWindow(analysis),
  }
}

function compactList(items: string[], limit = 4): string {
  return items
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index)
    .slice(0, limit)
    .join(' / ')
}

function sectionSceneParagraph(
  blueprint: ReportBlueprint,
  analysis: SajuAnalysis,
  context: SajuReportContext,
  brief: SectionBrief,
): string {
  const name = cleanContextValue(context.name, cleanContextValue(context.target, '당신'))
  const work = cleanContextValue(context.work, '지금 하고 있는 일')
  const relationship = cleanContextValue(context.relationship, '관계 상태 미입력')
  const concern = cleanContextValue(context.concern, '지금 고민')
  const dominant = ELEMENT_KO[analysis.dominantElement]
  const weak = ELEMENT_KO[analysis.weakElement]
  const useful = analysis.usefulGod ? ELEMENT_KO[analysis.usefulGod] : weak
  const p = analysis.fourPillars
  const dayPillar = pillarLabel(p.day)
  const monthPillar = pillarLabel(p.month)
  const timing = reportTiming(analysis)
  const gods = compactList(analysis.tenGods, 3) || '십신'

  const scenes: Record<string, string> = {
    profile: `생활 장면으로 내리면 ${name}님은 처음 만난 자리에서 이미 사람의 온도와 말의 속도를 읽습니다. 겉으로는 담담해 보여도 집에 돌아와 혼자 있으면 그날 들은 말, 표정, 약속의 뉘앙스를 다시 정리하는 쪽입니다. 이 장면이 ${dayPillar} 일주와 ${dominant} 기운의 검증점입니다.`,
    'target-context': `${context.target ?? '본인'} 기준으로 보면 핵심은 상대를 맞히는 데 있지 않습니다. 가족이면 식탁 대화에서 역할이 몰리는 장면, 연인이면 서운함을 꺼낼 때 책임이 한쪽으로 쏠리는 장면, 친구면 비교와 부탁이 돈이나 시간으로 번지는 장면을 먼저 봐야 합니다.`,
    'pillars-structure': `네 기둥은 네 장면으로 읽으면 선명합니다. 년주는 익숙한 가족 배경, 월주 ${monthPillar}는 회사나 사회에서 쓰는 얼굴, 일주 ${dayPillar}는 가까운 사람 앞의 반응, 시주는 퇴근 후에도 포기하지 못하는 욕망입니다. 이 네 장면이 따로 놀 때 피로가 커집니다.`,
    'year-pillar': `년주는 어린 시절에 익숙해진 공기처럼 남습니다. ${name}님은 가족이나 오래된 사람 앞에서 유난히 빨리 책임을 떠안거나, 반대로 마음속 선을 먼저 긋는 장면이 생길 수 있습니다. 이 반응은 현재의 ${concern}에서도 반복될 가능성이 있습니다.`,
    'month-pillar': `월주 ${monthPillar}는 사회 얼굴입니다. 회의에서 의견을 내야 할 때, 상사 피드백을 받을 때, 동료 비교가 들어올 때 ${name}님이 쓰는 힘이 여기서 나옵니다. ${dominant}이 강하면 존재감은 생기지만, ${weak}이 비면 퇴근 후 소진이 크게 남을 수 있습니다.`,
    'day-pillar': `일주는 가까운 관계의 실제 얼굴입니다. 카톡 답장이 늦어질 때 마음이 어디까지 흔들리는지, 약속을 잡는 방식에서 안정감을 느끼는지, 서운함을 바로 말하는지 삼키는지까지 봐야 합니다. ${relationship} 상태에서는 이 장면이 관계운의 핵심 검증점입니다.`,
    'hour-pillar': `시주는 후반부와 혼자 있는 시간의 욕망입니다. 퇴근 후에도 자꾸 생각나는 일, 주말에 돈을 써서라도 배우고 싶은 것, 아직 밖으로 꺼내지 않은 재능이 이 자리에 걸립니다. ${timing.currentYear}년에는 이 욕망이 작은 준비로 먼저 드러납니다.`,
    'day-master-strength': `일간 강약은 강하다 약하다의 판정이 아닙니다. ${name}님은 결정 직전까지 오래 재다가도 기준이 서면 고집스럽게 밀고 가는 장면이 있습니다. 반대로 부탁을 거절해야 하는 순간 ${weak} 기운이 약하면 피로가 먼저 쌓입니다.`,
    'hidden-personality': `숨은 성격은 메신저를 읽고 바로 답하지 못하는 밤에 드러납니다. 겉으로는 괜찮다고 하지만 속으로는 이미 선을 넘었는지 계산하고, 참을 만큼 참은 뒤에는 갑자기 차가워질 수 있습니다. 이건 나쁜 성격이 아니라 위험 신호를 늦게 말하는 구조입니다.`,
    balance: `오행은 생활 에너지 배분표로 보면 쉽습니다. ${dominant}이 강하면 일이 몰린 날에도 앞에 서는 힘이 있지만, ${weak}이 약하면 쉬어야 하는 밤에도 마음이 정리되지 않습니다. 일정표, 수면 리듬, 돈 관리처럼 작은 장치가 용신 ${useful}을 현실로 내려줍니다.`,
    'dominant-element': `${dominant} 기운은 사람들이 ${name}님을 기억하게 만드는 힘입니다. 다만 강한 기운은 장점과 피로를 같이 만듭니다. 사람들 앞에서 먼저 반응하고, 집에 와서는 혼자 과열된 장면을 되감는다면 이미 과사용 신호가 올라온 겁니다.`,
    'weak-element': `${weak} 기운의 빈자리는 약점 낙인이 아닙니다. 정리되지 않은 일정, 미뤄둔 연락, 처리해야 할 서류가 마음 한쪽을 붙잡는 식으로 나타납니다. 이 빈자리를 채우는 방법은 거창한 처방보다 작은 기록과 반복 루틴입니다.`,
    'ten-gods-overview': `십신은 사람·돈·일·표현·보호가 어디서 꼬이는지 보여주는 언어입니다. ${gods} 흐름은 사람 부탁을 거절할 때, 경쟁이 생기는 자리에서, 결과물을 보여줘야 하는 순간에 드러납니다. 그래서 십신은 성격 설명이 아니라 생활 장면의 분류표입니다.`,
    'ten-gods-position': `십신의 위치는 장면을 바꿉니다. 년주에 있으면 가족과 오래된 배경, 월주에 있으면 회사와 사회 역할, 일지에 있으면 가까운 관계, 시주에 있으면 후반부 욕망으로 나옵니다. 같은 ${gods}라도 어디에 놓였는지에 따라 처방이 달라집니다.`,
    'useful-god-eokbu': `억부 용신은 과하게 치우친 힘을 조절하는 기준입니다. ${name}님이 과하게 밀어붙이는 순간에는 ${dominant}이 앞서고, 한 번 멈춰 기준을 세우는 순간에는 ${useful}이 살아납니다. 선택 앞에서는 빠른 확신보다 균형을 되찾는 장면을 먼저 봐야 합니다.`,
    'useful-god-johu': `조후는 사주의 온도와 습도입니다. 마음이 과열되는 날, 사람 말에 쉽게 달아오르는 날, 쉬어도 회복이 더딘 날이 조후의 현실 장면입니다. ${useful} 보완은 색 하나를 고르는 일이 아니라 생활 리듬의 온도를 다시 맞추는 일입니다.`,
    trap: `${concern}의 함정은 사람만 바뀌고 같은 장면이 반복되는 데 있습니다. 참다가 갑자기 끊는 순간, 회의에서 말이 세지는 순간, 부탁을 받고도 거절하지 못해 돈이나 시간이 새는 순간을 조심해야 합니다. 이 장면을 끊어야 다음 선택이 달라집니다.`,
    'concern-loop': `현재 고민은 명식의 특정 버튼을 누릅니다. ${name}님이 같은 선택 앞에서 검색을 반복하거나, 마음속으로 이미 결론을 냈는데도 움직이지 못한다면 ${gods} 흐름이 눌린 겁니다. 이때 해법은 더 많은 예언이 아니라 첫 행동을 작게 자르는 것입니다.`,
    'relationship-orientation': `${context.orientation ?? '관계 기준'}에서는 관계를 보는 렌즈가 달라집니다. 이성적 끌림이 강한 자리에서는 배우자성과 일지를 보고, 동성·친구형 관계에서는 비겁과 식상이 만드는 거리감을 봅니다. 편한 사람과 맞는 사람을 같은 뜻으로 보면 오판이 생깁니다.`,
    'relationship-status': `${relationship} 상태라면 지금 먼저 볼 것은 결과가 아니라 장면입니다. 솔로는 소개 자리와 온라인 대화의 질, 마음에 둔 사람은 답장 템포, 연애 중은 약속을 정하는 방식, 이별 직후는 재회 연락을 기다리는 밤이 핵심 신호가 됩니다.`,
    'career-money': `${work}에서 돈이 붙는 장면은 성과를 보고하고 평가를 받는 순간입니다. 결과물은 있는데 보상 구조가 흐리면 돈길이 막히고, 계약과 역할이 선명하면 재성의 흐름이 살아납니다. 일과 돈은 따로 보지 않고 인정받는 방식까지 같이 봐야 합니다.`,
    'work-context': `${work} 상태에서는 출근길의 몸 상태, 업무 분장 앞의 반응, 퇴근 후 방전 정도가 운의 체감 지표입니다. 월주 ${monthPillar}가 사회 얼굴이라면, 지금 직장이나 일상에서 쓰는 얼굴이 너무 오래 켜져 있는지 봐야 합니다.`,
    'career-transition': `버틸지 옮길지는 한 문장으로 정할 문제가 아닙니다. 평가 면담에서 역할과 보상이 분명해지는지, 이직 제안이 왔을 때 계약·업무 범위·성장 경로가 선명한지, 퇴사 생각이 밤마다 반복되는지 세 가지를 나눠 봐야 합니다.`,
    'wealth-flow': `돈이 들어오는 방식은 월급일처럼 반복되는 정재와 성과급·거래 제안처럼 갑자기 붙는 편재로 나뉩니다. ${name}님에게는 새 기회보다 수입이 반복되는 구조가 먼저 안정되어야 합니다. 그래야 큰 제안이 와도 돈구멍으로 새지 않습니다.`,
    'money-leak': `돈구멍은 카드값만이 아닙니다. 경조사비, 사람 부탁, 동업 제안, 기분을 달래는 보상 소비가 같은 흐름으로 묶일 수 있습니다. ${timing.currentYear}년에는 새로 들어오는 제안보다 먼저 빠져나가는 돈의 명목을 기록해야 합니다.`,
    'wealth-timing': `재물 기회는 계약 제안, 보상 협상, 새 거래처럼 먼저 신호를 냅니다. 다만 돈이 들어오기 전 큰 지출이 같이 생기면 그건 기회가 아니라 시험일 수 있습니다. ${timing.currentYear}년은 잡을 기회와 닫을 지출을 함께 보는 해입니다.`,
    'love-loop': `연애 반복은 카톡 템포에서 먼저 보입니다. 끌리는 사람은 답장을 기다리게 만들고, 오래 맞는 사람은 약속이 어긋나도 마음을 덜 소모시킵니다. ${name}님은 만난 뒤 편해지는지, 더 불안해지는지를 관계 판단의 첫 기준으로 삼아야 합니다.`,
    'destiny-partner': `운명의 상대는 소개 자리의 대화 온도, 약속을 지키는 방식, 돈과 책임을 말할 때의 태도에서 보입니다. ${useful} 기운을 살리는 사람은 ${name}님을 더 조급하게 만들지 않고 생활 리듬을 안정시킵니다. 자극보다 회복감이 더 중요한 신호입니다.`,
    'avoid-relationship': `멀리해야 할 관계는 나쁜 사람 목록이 아닙니다. 돈 부탁이 빠르거나, 비교를 자극하거나, 답을 재촉하는 연락으로 ${name}님의 기준을 흐리게 만드는 장면을 말합니다. 초기에 작은 불편함을 넘기면 나중에는 시간과 돈이 같이 샐 수 있습니다.`,
    'love-timing': `인연 시기는 소개 연락, 모임 초대, 온라인 대화가 길어지는 순간처럼 작게 옵니다. ${timing.currentYear}년에는 관계의 시작보다 그 관계가 생활 리듬을 안정시키는지 확인해야 하고, ${timing.nextYear}년에는 남길 사람과 지나갈 사람이 더 선명해집니다.`,
    'future-flow': `큰 운은 생활 반경 변화로 먼저 옵니다. 큰 제안이 들어오거나, 오래 미룬 정리가 다시 올라오거나, 만나는 사람의 결이 바뀌면 ${timing.daewoon}과 ${timing.yearPillar} 세운이 움직이는 신호입니다. 확장인지 정리인지부터 구분해야 합니다.`,
    'daewoon-detail': `대운은 10년짜리 무대입니다. 이 무대가 바뀌면 주로 만나는 사람, 일하는 방식, 돈을 쓰는 기준이 함께 달라집니다. ${name}님은 ${timing.daewoon} 안에서 익숙한 역할을 반복할지, 새로운 보상 구조로 옮길지의 갈림길을 봐야 합니다.`,
    'sewoon-detail': `${timing.currentYear}년 ${timing.yearPillar} 세운은 표면 사건으로 먼저 드러납니다. 올해 들어 제안, 지출, 연락, 업무 압박 중 무엇이 갑자기 늘었는지 확인하세요. 그 반복 항목이 올해 운이 건드리는 자리입니다.`,
    'turning-years': `전환 구간은 회사·집·관계 반경이 바뀌는 장면으로 확인됩니다. 오래 잡고 있던 것을 놓아야 하는 순간, 새로운 제안이 커지는 순간, 돈이 들어오기 전 지출이 먼저 생기는 순간이 변곡점입니다. ${timing.currentYear}년부터 ${timing.nextYear}년까지는 이 신호를 기록해야 합니다.`,
    'timing-place': `장소 신호는 특정 주소가 아니라 공간 유형입니다. 온라인 채널, 교육 공간, 계약 자리, 이동 중 만나는 사람, 자주 가는 모임에서 운이 먼저 반응할 수 있습니다. ${useful} 기운이 살아나는 공간을 알면 인연과 전환을 더 현실적으로 잡을 수 있습니다.`,
    'action-guide': `이번 달 행동은 작아야 효과가 납니다. 계좌를 한 번 정리하고, 일정표에서 미룬 일을 하나만 고르고, 부탁을 거절할 문장을 미리 준비하세요. ${concern}은 큰 결심보다 작은 기준이 생길 때 풀리기 시작합니다.`,
    'long-report-depth': `이 긴 리포트는 목차를 한 번에 읽고 끝내는 글이 아닙니다. 성격 장에서는 피로 장면을, 돈 장에서는 돈구멍을, 관계 장에서는 답장과 거리감을, 미래 장에서는 연도별 신호를 다시 확인해야 합니다. 반복 없이 다른 장면을 남겨야 진짜 장문 풀이가 됩니다.`,
  }

  return scenes[blueprint.id] ?? `${name}님에게 이 장은 ${brief.uniqueAngle}을 확인하는 자리입니다. ${compactList(brief.sceneAnchors, 3)} 같은 생활 장면에서 신호가 먼저 올라오니, 사주 용어를 추상으로 두지 말고 실제 선택 기준으로 내려야 합니다.`
}

function paidSpecificTail(
  blueprint: ReportBlueprint,
  analysis: SajuAnalysis,
  context: SajuReportContext,
  ragTopics: string[],
): string {
  const brief = sectionBriefForBlueprint(blueprint)
  const name = cleanContextValue(context.name, cleanContextValue(context.target, '당신'))
  const p = analysis.fourPillars
  const dayPillar = pillarLabel(p.day)
  const monthPillar = pillarLabel(p.month)
  const dominant = ELEMENT_KO[analysis.dominantElement]
  const weak = ELEMENT_KO[analysis.weakElement]
  const useful = analysis.usefulGod ? ELEMENT_KO[analysis.usefulGod] : weak
  const timing = reportTiming(analysis)
  const ragGrounding = ragTopics.length > 0
    ? `RAG 근거는 ${compactList(ragTopics, 3)} 쪽을 같이 붙였습니다.`
    : 'RAG 근거가 약한 장은 명식과 입력 맥락을 우선합니다.'
  const slots = compactList(brief.requiredSlots, 5)
  const anchors = compactList(brief.sceneAnchors, 4)

  return [
    `[주목할 점] ${blueprint.category} 장의 고유 질문은 ${brief.uniqueAngle}입니다. 근거는 ${dayPillar} 일주, 월주 ${monthPillar}, ${dominant} 과다와 ${weak} 보완, 용신 후보 ${useful}을 함께 놓고 봅니다. ${ragGrounding}`,
    sectionSceneParagraph(blueprint, analysis, context, brief),
    `[해법] ${name}님이 이 장에서 바로 확인할 기준은 ${slots}입니다. 생활에서는 ${anchors}을 먼저 관찰하세요. ${timing.currentYear}년 ${timing.yearPillar} 세운에는 신호가 커지기 전에 기록하고, ${timing.nextYear}년에는 남길 선택과 줄일 선택을 더 분명히 나누는 쪽이 좋습니다.`,
  ].join('\n\n')
}

function ensurePaidSectionDepth(
  section: SajuReportSection,
  analysis: SajuAnalysis,
  context: SajuReportContext,
  interpretation: string,
): string {
  const cleaned = interpretation.trim()
  if (cleaned.length >= MIN_OPENAI_SECTION_CHARS) return cleaned

  const blueprint = sectionBlueprintForId(section.id)
  if (!blueprint) return cleaned

  const brief = sectionBriefForBlueprint(blueprint)
  const name = cleanContextValue(context.name, cleanContextValue(context.target, '당신'))
  const concern = cleanContextValue(context.concern, '지금 고민')
  const timing = reportTiming(analysis)
  const anchors = compactList(brief.sceneAnchors, 4)
  const slots = compactList(brief.requiredSlots, 5)
  const topUp = [
    paidSpecificTail(blueprint, analysis, context, section.ragTopics),
    `[주의할 점] ${name}님에게 이 장이 짧게 느껴지면 결제감이 떨어집니다. 그래서 ${concern}을 추상적인 위로로 끝내지 않고, ${anchors}에서 무엇이 반복되는지 다시 확인해야 합니다. ${timing.currentYear}년 ${timing.yearPillar} 세운에는 이 신호가 작게 먼저 올라오고, ${timing.nextYear}년에는 남길 선택과 끊을 선택의 차이가 더 분명해질 수 있습니다.`,
    `[해법] 이 섹션의 결론은 ${slots}을 실제 행동으로 바꾸는 것입니다. 오늘 당장 할 일은 큰 결심이 아니라 기록 하나, 거절 기준 하나, 돈이나 관계가 새는 장면 하나를 잡는 겁니다. 이 문단까지 붙어야 49,800원 리포트에서 사용자가 “내 상황을 보고 쓴 글”이라고 느낄 수 있습니다.`,
  ].join('\n\n')

  return [cleaned, topUp].join('\n\n')
}

function buildInterpretation(
  blueprint: ReportBlueprint,
  analysis: SajuAnalysis,
  context: SajuReportContext,
  ragTopics: string[],
): string {
  const focus = blueprint.focus
  const name = cleanContextValue(context.name, cleanContextValue(context.target, '당신'))
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
  const ragLine = ragTopics.length > 0 ? `RAG 대조 근거로는 ${ragTopics.join(', ')}의 흐름을 붙였습니다.` : ''
  const target = cleanContextValue(context.target, '본인')
  const orientation = cleanContextValue(context.orientation, '관계 기준 미선택')
  const relationship = cleanContextValue(context.relationship, '관계 상태 미입력')
  const gyeokguk = analysis.manseryeok?.gyeokguk
  const climate = analysis.manseryeok?.climate
  const bridge = analysis.manseryeok?.flowBridges[0]
  const advancedLine = [
    gyeokguk ? `월령 기준으로는 ${gyeokguk.name} 렌즈가 잡힙니다` : '',
    climate ? `조후는 ${climate.temperature}/${climate.moisture} 쪽으로 읽힙니다` : '',
    bridge ? `통관은 ${ELEMENT_KO[bridge.bridge]} 기운이 ${ELEMENT_KO[bridge.conflict[0]]}와 ${ELEMENT_KO[bridge.conflict[1]]} 사이를 풀어주는 후보입니다` : '',
  ].filter(Boolean).join('. ')
  const manseryeokLine = analysis.manseryeok
    ? `만세력 계산은 ${analysis.manseryeok.monthTerm} 절기 이후의 월주, 지장간, ${analysis.manseryeok.dayBoundaryRule === 'zi_hour_next_day' ? '23시 자시 다음 날 일주 옵션' : '날짜 기준 자시'}을 바탕으로 잡았습니다. ${advancedLine ? `${advancedLine}.` : ''}`
    : advancedLine

  const sections: Partial<Record<ReportFocus, string>> = {
    profile: [
      `흠... ${name}님 사주의 중심은 ${dayPillar} 일주, 그중에서도 ${dayMaster} 일간입니다. 이 일간은 겉으로 드러나는 태도보다 속에서 먼저 판단하고, 작은 신호를 놓치지 않으려는 결을 갖습니다. 이건 성향이자 기질의 기본값입니다. 일간 강약으로는 신강·신약이라는 딱지보다 월령과 지장간이 더 중요하고, ${name}님은 ${strengthText} 팔자라서 마음이 움직이기 전까지는 쉽게 방향을 바꾸지 않지만, 한 번 흐름이 잡히면 생각보다 깊게 파고듭니다.`,
      `년주 ${pillarLabel(p.year)}, 월주 ${monthPillar}, 시주 ${pillarLabel(p.hour)}를 같이 놓고 보면 ${dominant} 기운이 먼저 보입니다. ${ELEMENT_TRAIT[analysis.dominantElement]}이 사주의 앞쪽으로 올라와 있어, 남들이 보기에는 담담해 보여도 안쪽에서는 이미 많은 계산과 감지가 끝나 있는 사람입니다. ${analysis.dayMasterAdvice}`,
      `${manseryeokLine ? `${manseryeokLine} ` : ''}${ragLine} 그러니 ${name}님은 단순히 성격이 예민한 사람이 아닙니다. 사주가 먼저 주변의 온도를 읽고, 그 다음에 행동을 고르는 구조입니다. 이걸 장점으로 쓰면 직관이 되고, 눌러두면 혼자만 알아차린 피로가 됩니다.`,
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
        ? `학생의 운은 직업을 당장 확정하는 것보다 어떤 방식으로 실력을 꺼내는지가 중요합니다. 공부, 시험, 진로는 인성이 받치고 식상이 결과물로 나와야 흐름이 붙습니다.`
        : work.includes('찾고')
          ? `일을 찾는 중이라면 운보다 기준이 먼저입니다. 관성이 주는 자리, 식상이 보여줄 결과물, 재성이 반응할 시장을 나눠 준비해야 합니다.`
          : work.includes('직장')
            ? `직장 흐름에서는 버티는 힘과 소모되는 지점을 같이 봅니다. 관성이 살아 있으면 신뢰를 얻지만, 상관이 강하면 규칙이 답답하게 느껴질 수 있습니다.`
            : work.includes('사업')
              ? `사업은 편재의 기회와 식상의 결과물이 만나야 열립니다. 다만 사람 리스크, 지출, 동업 문제까지 같이 보지 않으면 재물운 해석이 가벼워집니다.`
              : work.includes('프리랜서')
                ? `프리랜서는 자유보다 구조가 중요합니다. 계약 기준, 반복 수입, 소진을 막는 루틴이 있어야 식상과 재성이 돈길로 이어집니다.`
                : `쉬는 중이라면 운이 멈춘 것이 아니라 회복과 방향 재설정의 구간일 수 있습니다. 조급하게 움직이기보다 다시 움직일 기준을 먼저 잡아야 합니다.`,
      `${ragLine} 일상 선택지는 사주 풀이의 현실 좌표입니다. 같은 재물운도 ${work} 상태에서는 돈이 들어오는 방식과 새는 지점이 다르게 드러납니다.`,
    ].join('\n\n'),
    careerMoney: [
      `${work}의 흐름을 사주에 얹어보면 일과 돈은 따로 움직이지 않습니다. 재성은 돈만 뜻하지 않고 현실을 붙드는 감각이며, 식상은 내가 만들어내는 결과물입니다. ${name}님 사주에서 ${analysis.tenGods.join(' · ') || '십신'}이 보이는 만큼, 돈은 운 좋게 떨어지는 것보다 내가 어떤 방식으로 능력을 꺼내느냐에 따라 열립니다.`,
      `${dominant} 기운이 강한 사람은 일에서 자신만의 방식이 생기면 속도가 붙습니다. 다만 ${weak} 기운이 약한 쪽에서 관리가 새면 돈도 같이 샐 수 있습니다. 큰 기회보다 먼저 봐야 할 건 반복 수입, 관계 비용, 감정적으로 쓰는 돈입니다. 여기가 정리되면 재물운은 훨씬 선명하게 붙습니다.`,
      `${ragLine} 올해 흐름은 ${analysis.fortune?.yearPillar ?? '세운'}이 함께 움직입니다. 좋은 말만 하자면 기회가 보입니다. 하지만 더 정확히 말하자면, 기준 없이 넓히는 일은 조심해야 합니다. 돈길은 열리되, 새는 구멍을 막는 사람이 결국 흐름을 잡습니다.`,
    ].join('\n\n'),
    moneyLeak: [
      `돈이 새는 자리는 재성이 약해서만 생기지 않습니다. ${analysis.tenGods.join(' · ') || '십신'} 중에서 비겁이 강하면 사람과 비교 때문에, 상관이 강하면 즉흥과 반발 때문에, 인성이 과하면 준비와 공부에 오래 묶여 돈이 새기 쉽습니다.`,
      `${name}님에게 먼저 필요한 건 더 큰 기회를 찾는 일보다 현재의 돈구멍을 막는 일입니다. 반복 지출, 관계 비용, 기분에 따라 쓰는 돈, 기준 없이 넓히는 제안을 분리해 봐야 합니다. ${weak} 기운이 약한 쪽에서는 관리 장치가 부족해질 수 있으니 계좌, 일정, 계약 기준을 작게라도 세워야 합니다.`,
      `${ragLine} 재물운은 겁주는 풀이가 아닙니다. 돈이 들어오는 문과 새는 문을 같이 봐야 진짜 돈길이 보입니다.`,
    ].join('\n\n'),
    love: [
      `${relation}으로 관계를 보면, 일지 ${BRANCH_KO[p.day.branch]}(${p.day.branch}) 자리가 먼저 눈에 들어옵니다. 일지는 내가 가장 가까운 사람을 어떻게 받아들이는지, 오래 남는 인연 앞에서 어떤 반응을 보이는지 보여주는 자리입니다. ${name}님은 가볍게 시작한 관계보다 마음의 깊이를 확인한 뒤 오래 가는 쪽에 더 맞습니다.`,
      `남명은 재성, 여명은 관성이 배우자 흐름을 보는데, 지금 사주에서는 ${analysis.tenGods.join(' · ') || '십신'}의 조합을 같이 봐야 합니다. 끌림은 빠르게 올 수 있어도, 진짜 남는 사람은 ${useful} 기운을 살리는 사람입니다. 말이 많은 사람보다 내 흐름을 안정시키는 사람, 자극보다 기준을 세워주는 사람이 더 오래 남습니다.`,
      `${ragLine} 그러니 인연운은 누가 나타나느냐만 보는 풀이가 아닙니다. 내가 어떤 상태일 때 좋은 사람을 알아보는지도 같이 봐야 합니다. 지금 ${name}님에게 필요한 건 사랑을 더 세게 잡는 게 아니라, 나를 흐리게 만드는 관계와 나를 선명하게 만드는 관계를 구별하는 눈입니다.`,
    ].join('\n\n'),
    destiny: [
      `운명의 상대를 본다면 특정 이름이나 외형을 단정할 수는 없습니다. 대신 ${name}님의 일지와 ${useful} 기운을 기준으로 오래 남는 사람의 분위기는 볼 수 있습니다. 자극이 센 사람보다 내 흐름을 안정시키는 사람, 불안을 키우기보다 기준을 세워주는 사람이 더 오래 갑니다.`,
      `${useful} 기운이 살아나는 상대는 ${name}님이 평소 과하게 쓰던 ${dominant} 기운을 부드럽게 조절하게 합니다. 직업적 분위기로 보면 전문성, 생활 리듬, 말의 온도, 돈과 책임을 다루는 방식에서 신호가 옵니다. 운명의 상대는 갑자기 떨어지는 정답이 아니라 내 사주의 빈자리를 무리 없이 채워주는 사람입니다.`,
      `${ragLine} 그래서 인연은 '누가 나타나는가'와 동시에 '내가 어떤 상태일 때 알아보는가'를 같이 봐야 합니다.`,
    ].join('\n\n'),
    future: [
      `앞으로의 흐름은 대운 ${analysis.fortune?.currentDaewoon ?? '대운'}과 올해 세운 ${analysis.fortune?.yearPillar ?? '세운'}을 같이 봅니다. 대운은 10년짜리 큰 물길이고, 세운은 그 물길 위에 올라오는 올해의 파도입니다. 둘이 같은 방향이면 일이 빨리 풀리고, 서로 어긋나면 속도보다 조정이 먼저 필요합니다.`,
      `${name}님의 원국에서는 ${dominant} 기운이 강하고 ${weak} 기운이 약합니다. 운에서 ${useful}이 살아나는 시기에는 사람, 일, 돈이 한 방향으로 모일 수 있습니다. 반대로 강한 ${dominant}만 더 몰리는 시기에는 자신감은 생기지만 과속도 같이 들어옵니다. 이때는 좋은 제안도 한 번 더 확인해야 합니다.`,
      `${ragLine} 흐름은 확정된 운명이 아니라 읽어야 할 날씨에 가깝습니다. 우산을 들고 나가면 비도 길이 됩니다. 지금부터 봐야 할 신호는 갑자기 커지는 제안, 오래 미뤄둔 관계의 정리, 그리고 돈이 들어오기 전 먼저 생기는 지출입니다.`,
    ].join('\n\n'),
    timingPlace: [
      `시기와 장소는 날짜를 찍는 방식보다 신호를 읽는 방식이 더 정확합니다. 대운과 세운이 움직일 때 사람은 먼저 생활 반경이 바뀌고, 만나는 사람의 결이 달라지고, 돈과 관계의 제안이 특정 공간에서 반복됩니다.`,
      `${useful} 기운이 목이면 배움과 성장의 자리, 화이면 모임과 노출, 토이면 생활 기반과 일상 공간, 금이면 계약과 전문성의 자리, 수이면 이동·온라인·정보의 공간이 신호가 됩니다. ${name}님에게 사건이 드러나는 곳은 사주가 이미 쓰고 있는 오행의 언어와 연결됩니다.`,
      `${ragLine} 그러니 인연이나 전환의 장소는 '그곳에 반드시 간다'가 아니라, 어떤 성격의 공간에서 내 운이 먼저 반응하는지 보는 기준입니다.`,
    ].join('\n\n'),
    reportDepth: [
      `긴 리포트는 같은 말을 길게 늘리는 글이 아닙니다. 명식 구조, 일간, 오행, 십신, 용신, ${contextLabel(context)}, 현재 고민, 대운과 세운, 재물, 직업, 연애, 인연, 시기와 장소를 각각 다른 근거로 쌓아야 합니다.`,
      `95점짜리 풀이가 되려면 각 장마다 세 가지가 들어가야 합니다. 첫째, 실제 사주 근거. 둘째, 사용자가 선택한 대상·관계·일상 상태와의 연결. 셋째, 지금 당장 볼 수 있는 행동 기준입니다. 여기에 격국·조후·통관과 RAG 코퍼스 근거가 같이 붙어야 말이 그럴듯한 수준에서 끝나지 않습니다.`,
      `${ragLine} 그래서 이 리포트는 ${name}님을 한 문장으로 가두지 않고, 선택지마다 달라지는 해석의 초점을 따라가며 깊게 펼치는 구조로 설계됩니다.`,
    ].join('\n\n'),
    action: [
      `마지막으로 지금 붙잡아야 할 신호를 보겠습니다. ${name}님 사주에서 답은 거창한 결심보다 ${useful} 기운을 살리는 작은 반복에 있습니다. 강한 ${dominant}은 이미 충분합니다. 이제는 부족한 ${weak}을 채워야 판이 안정됩니다.`,
      `${concern} 때문에 마음이 흔들린다면, 먼저 기준을 하나만 세우세요. 당장 모든 걸 바꾸려 하지 말고, 이번 달에 지킬 수 있는 약속 하나, 끊어낼 소비 하나, 정리할 관계 하나를 정하는 겁니다. 사주는 방향을 보여주지만, 운을 붙드는 건 결국 반복입니다.`,
      `${ragLine} 천명대공(天命大公) 식으로 말하면 이렇습니다. 좋은 운은 기다리는 사람에게 오는 게 아니라, 들어왔을 때 담을 그릇을 만들어둔 사람에게 남습니다. 지금 ${name}님에게 필요한 건 더 많은 예언이 아니라, 이미 보이는 신호를 놓치지 않는 일입니다.`,
    ].join('\n\n'),
  }

  const base = sections[focus] ?? [
    `${name}님 사주의 ${focus} 흐름을 보겠습니다. ${dayPillar} 일주와 ${dominant} 기운, ${weak}의 빈자리를 함께 놓고 보면 지금 봐야 할 기준이 보입니다.`,
    `${ragLine} 이 장은 단정적인 예언보다 명식 근거와 선택지 맥락을 연결하는 데 초점을 둡니다. 같은 사주라도 ${contextLabel(context)}에 따라 읽어야 할 자리가 달라집니다.`,
  ].join('\n\n')

  const riskNote = conditionalRiskNote(focus, analysis, context)
  const paidTail = paidSpecificTail(blueprint, analysis, context, ragTopics)
  return [base, paidTail, riskNote].filter(Boolean).join('\n\n')
}

export function buildTemplateSajuReport(
  analysis: SajuAnalysis,
  birth: BirthInput,
  context: SajuReportContext = {},
): SajuReport {
  const keys = [
    ...patternKeys(analysis, birth),
    ...(context.target ? [`target:${context.target}`] : []),
    ...(context.orientation ? [`orientation:${context.orientation}`] : []),
    ...(context.relationship ? [`relationship:${context.relationship}`] : []),
    ...(context.work ? [`work:${context.work}`] : []),
    ...(context.concern ? [`concern:${context.concern}`] : []),
    ...(analysis.manseryeok?.gyeokguk ? [`gyeokguk:${analysis.manseryeok.gyeokguk.name}`] : []),
    ...(analysis.manseryeok?.climate ? [`climate:${analysis.manseryeok.climate.season}:${analysis.manseryeok.climate.temperature}`] : []),
    ...(analysis.manseryeok?.flowBridges.map((bridge) => `flowBridge:${bridge.bridge}`) ?? []),
  ]
  const name = cleanContextValue(context.name, cleanContextValue(context.target, '당신'))
  const sections: SajuReportSection[] = REPORT_BLUEPRINTS.map((blueprint, index) => {
    const brief = sectionBriefForBlueprint(blueprint)
    const chunks = retrieveRagChunks(
      `${blueprint.query} ${sectionBriefQuery(brief)} ${chapterSearchTextForSection(blueprint.id)} ${reportContextQuery(context)}`,
      analysis,
      runtimeConfig.report?.ragTopK ?? 4,
      context,
    )
    const ragTopics = chunks.map((c) => c.topic)

    return {
      id: blueprint.id,
      order: index + 1,
      imageKey: 'common-mystic',
      imageSrc: COMMON_IMAGE_SRC,
      imageAlt: `${blueprint.category} 공통 이미지`,
      category: blueprint.category,
      categoryEn: blueprint.categoryEn,
      classification: classificationFor(blueprint.focus, analysis, context),
      hook: hookFor(blueprint, analysis, context),
      patternKeys: keys,
      ragTopics,
      interpretation: buildInterpretation(blueprint, analysis, context, ragTopics),
    }
  })

  const report: SajuReport = {
    title: `${name}님의 사주 리포트`,
    subtitle: '사주 기둥과 오행, 십신, 대운 흐름을 기준으로 순차 해석합니다.',
    model: 'template',
    generatedBy: 'template',
    chapters: buildReportChapters(sections),
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
  const ragBySection = baseReport.sections
    .map((section) => {
      const brief = sectionBriefForSection(section)
      const chunks = retrieveRagChunks(
        `${section.category} ${section.classification} ${sectionBriefQuery(brief)} ${chapterSearchTextForSection(section.id)} ${reportContextQuery(context)}`,
        analysis,
        runtimeConfig.report?.ragTopK ?? 4,
        context,
      )
      return `## ${section.id}\n${formatRagForPrompt(chunks)}`
    })
    .join('\n\n')
  const sectionBriefs = Object.fromEntries(
    baseReport.sections.map((section) => [section.id, sectionBriefForSection(section)]),
  )
  const chapterBySection = Object.fromEntries(
    baseReport.sections.map((section) => [section.id, chapterForSectionId(section.id) ?? null]),
  )

  return [
    {
      role: 'system',
      content: [
        '당신은 천명대공(天命大公) 사주 리포트 작성 엔진입니다.',
        '입력된 사주 기둥, 오행, 십신, 용신, 대운, RAG 지식을 근거로 장문 풀이를 씁니다.',
        '개인 사주 요약에 격국·조후·통관·지장간·합충형파해·자시 계산 규칙이 있으면 해당 섹션의 판단 근거로 연결합니다.',
        'RAG는 그대로 복붙하지 말고, 각 섹션의 선택지·고민·명식 근거와 연결해 해석합니다.',
        '사용자에게 보이는 외부 목차는 baseReport.chapters의 20개 챕터 제목을 기준으로 합니다. 용신·십신·일주·월주·세운·대운 같은 전문용어는 제목이 아니라 해석 근거 문단으로 내립니다.',
        '각 상세 섹션은 자신이 속한 reportChapter의 제목, 부제, 표·이미지·주요대목·그래프·공식·비교 포인트를 원고 안에 자연스럽게 반영합니다.',
        '말투는 “흠...”, “보입니다”, “그 이유가 있습니다”, “좋은 말만 하지는 않겠습니다” 계열의 천명대공(天命大公) 말투를 유지합니다.',
        '내용은 중학생도 이해할 수 있게 씁니다. 일간·십신·용신·대운 같은 말은 쓴 뒤 바로 쉬운 생활 언어로 풀어 설명합니다.',
        '문단은 3~5줄 정도로 짧게 끊고, 한 문단 안에는 하나의 핵심만 담습니다. 긴 문장은 둘로 나눕니다.',
        '각 분류는 얕은 요약으로 끝내지 말고, 왜 그런 해석이 나오는지, 실제 생활에서 어떻게 드러나는지, 무엇을 조심하고 무엇을 하면 좋은지까지 풍부하게 풉니다.',
        ...PAID_REPORT_QUALITY_CONTRACT,
        '각 섹션에는 중요한 문단 2~4개를 골라 문단 첫머리에 [주요 포인트], [주목할 점], [주의할 점], [위험 신호], [위기 신호], [해법] 중 하나를 붙입니다. 표식은 남발하지 말고 실제로 강조가 필요한 문단에만 씁니다.',
        '논리 전개는 명식 근거 → 성향/상황 해석 → 좋은점 → 주의할점/위험/위기 → 구체적인 행동 기준이 보이게 씁니다.',
        '좋은 흐름과 안 좋은 함정을 둘 다 말합니다. 안 좋은 패턴은 “이 부분은 위험합니다”, “방치하면 반복됩니다”, “돈길보다 돈구멍이 먼저 보입니다”처럼 선명하게 말하되 공포를 팔지 않습니다.',
        '각 섹션에 억지 경고를 넣지는 말되, 겁재·상관·편관, 합충형파해, 과다/부족 오행, 대운·세운 충돌, 사용자의 고민에서 위험 신호가 드러나면 반드시 주의할 것·피해야 할 선택·드러나는 시기·풀 행동 기준을 함께 알려줍니다.',
        '확정 예언, 질병 진단, 투자 수익 보장, 법률 판단은 금지합니다.',
        '반드시 JSON만 출력하세요. Markdown 코드블록을 쓰지 마세요.',
      ].join('\n'),
    },
    {
      role: 'user',
      content: JSON.stringify({
        instruction: 'baseReport의 섹션 수와 id/order/imageKey/category/categoryEn/classification/patternKeys/ragTopics는 유지하고, hook과 interpretation만 더 밀도 있게 보강하세요. interpretation은 섹션마다 한국어 1800~2600자 정도로 풍부하게 쓰고, 문단은 6~9개로 나누되 각 문단은 화면에서 3~5줄 정도로 읽히게 짧게 끊으세요. 중학생도 이해할 수 있게 전문용어 뒤에는 쉬운 설명을 붙이세요. 중요한 문단 2~4개는 [주요 포인트], [주목할 점], [주의할 점], [위험 신호], [위기 신호], [해법] 표식을 문단 첫머리에 붙이세요. 반드시 target/orientation/relationship/work/concern 선택지를 해당 섹션에 맞게 반영하세요. 좋은 말과 안 좋은 경고를 균형 있게 쓰고, 위험 신호는 대운·세운·전환 시기와 해법까지 연결하세요. sectionBrief의 uniqueAngle, requiredSlots, sceneAnchors를 반드시 반영해 섹션별 결론이 서로 다르게 느껴지게 하세요. 격국·조후·통관·GBR로 올라온 RAG 주제가 있으면 해당 섹션의 근거로 녹이세요.',
        paidReportQualityContract: PAID_REPORT_QUALITY_CONTRACT,
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
        sajuSummary: analysis.summary,
        baseReport,
        reportChapters: baseReport.chapters,
        chapterBySection,
        sectionBriefs,
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
  const brief = sectionBriefForSection(section)
  const reportChapter = chapterForSectionId(section.id)
  const chunks = retrieveRagChunks(
    `${section.category} ${section.classification} ${sectionBriefQuery(brief)} ${chapterSearchTextForSection(section.id)} ${reportContextQuery(context)}`,
    analysis,
    runtimeConfig.report?.ragTopK ?? 4,
    context,
  )
  return [
    {
      role: 'system',
      content: [
        '당신은 천명대공(天命大公) 사주 리포트의 한 페이지를 작성합니다.',
        '한 번에 전체 리포트를 쓰지 말고, 사용자가 선택한 현재 페이지 섹션만 작성합니다.',
        '사주 기둥, 오행, 십신, 용신, 대운, RAG 지식을 근거로 하되 기계적으로 나열하지 않습니다.',
        '격국·조후·통관·지장간·합충형파해 근거가 현재 섹션과 관련되면 반드시 해석에 녹입니다.',
        'RAG 주제는 문장 안에서 현재 고민, 선택지, 명식 근거와 연결해 사용합니다.',
        '사용자에게 보이는 제목은 reportChapter.title입니다. 섹션 원고는 해당 챕터의 표·이미지·주요대목·그래프·공식·비교 포인트 중 관련 포인트를 최소 1개 이상 살려 씁니다.',
        '용신·십신·일주·월주·세운·대운 같은 전문용어는 제목처럼 앞세우지 말고, 왜 그런 결론이 나왔는지 설명하는 근거 문단에서 쉬운 말과 함께 씁니다.',
        '말투는 “흠...”, “보입니다”, “그 이유가 있습니다”, “좋은 말만 하지는 않겠습니다” 계열의 천명대공(天命大公) 말투입니다.',
        '내용은 중학생도 이해할 수 있게 씁니다. 전문용어는 쉬운 말로 바로 풀고, 어려운 한자어만 나열하지 않습니다.',
        '문단은 3~5줄 정도로 짧게 끊고, 한 문단 안에는 하나의 핵심만 담습니다. 긴 문장은 둘로 나눕니다.',
        '해석은 풍부해야 합니다. 근거, 실제 생활 장면, 주의할 점, 바로 해볼 행동 기준을 함께 씁니다.',
        ...PAID_REPORT_QUALITY_CONTRACT,
        '중요한 문단 2~4개는 [주요 포인트], [주목할 점], [주의할 점], [위험 신호], [위기 신호], [해법] 표식을 문단 첫머리에 붙입니다. 실제 강조가 필요한 곳에만 씁니다.',
        '논리 전개는 명식 근거 → 성향/상황 해석 → 좋은점 → 주의할점/위험/위기 → 구체적인 행동 기준이 보이게 씁니다.',
        '이 섹션의 근거에서 위험 신호가 드러날 때만 주의할 것·피해야 할 선택·미래에 먼저 흔들릴 지점을 선명하게 덧붙입니다. 억지로 모든 섹션에 경고를 넣지 않습니다.',
        '안 좋은 패턴을 말할 때는 반드시 대운·세운·전환 신호처럼 드러나는 시기와, 사용자가 그 흐름을 풀 행동 기준을 함께 제시합니다.',
        '확정 예언, 질병 진단, 투자 수익 보장, 법률 판단은 금지합니다.',
        '반드시 JSON만 출력하세요. Markdown 코드블록을 쓰지 마세요.',
      ].join('\n'),
    },
    {
      role: 'user',
      content: JSON.stringify({
        instruction: '현재 section 하나만 보강하세요. id/order/imageKey/imageSrc/category/categoryEn/classification/patternKeys/ragTopics는 유지합니다. hook은 짧게, interpretation은 한국어 1800~2600자 정도로 작성하세요. 문단은 6~9개로 나누고 각 문단은 화면에서 3~5줄 정도로 읽히게 짧게 끊으세요. 중학생도 이해할 수 있게 일간·십신·대운·용신 같은 용어는 바로 쉬운 말로 풀어주세요. 중요한 문단 2~4개는 [주요 포인트], [주목할 점], [주의할 점], [위험 신호], [위기 신호], [해법] 표식을 문단 첫머리에 붙이세요. target/orientation/relationship/work/concern 선택지 중 이 섹션과 직접 관련된 값은 반드시 문장 속에 녹이세요. sectionBrief.uniqueAngle을 장의 결론으로 삼고, requiredSlots와 sceneAnchors를 빠뜨리지 마세요. 위험 신호가 있으면 좋은 말로 덮지 말고, 드러나는 시기와 해법까지 말하세요. RAG/코퍼스 근거가 실제 판단에 쓰였다는 느낌이 나야 합니다.',
        paidReportQualityContract: PAID_REPORT_QUALITY_CONTRACT,
        outputShape: {
          id: section.id,
          hook: 'string',
          interpretation: 'string',
        },
        birth,
        context,
        sajuSummary: analysis.summary,
        section,
        reportChapter,
        sectionBrief: brief,
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
    const generatedInterpretation = typeof next?.interpretation === 'string' && next.interpretation.trim()
      ? next.interpretation.trim()
      : section.interpretation
    const interpretation = ensurePaidSectionDepth(section, analysis, context, generatedInterpretation)

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
    chapters: buildReportChapters(sections),
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

  const generatedInterpretation = typeof parsed.interpretation === 'string' && parsed.interpretation.trim()
    ? parsed.interpretation.trim()
    : section.interpretation

  return {
    ...section,
    hook: typeof parsed.hook === 'string' && parsed.hook.trim() ? parsed.hook.trim() : section.hook,
    interpretation: ensurePaidSectionDepth(section, analysis, context, generatedInterpretation),
  }
}

export function getReportModel(): string {
  return REPORT_MODEL
}
