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

const COMMON_IMAGE_SRC = '/assets/hero-mystic.png'
const REPORT_MODEL = process.env.REPORT_OPENAI_MODEL ?? runtimeConfig.report?.model ?? 'gpt-5.5'

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

  const labels: Record<ReportFocus, string> = {
    profile: `${dayPillar} 일주 · ${STEM_KO[analysis.dayMaster]}${ELEMENT_KO[analysis.dayMasterElement].charAt(0)} 일간`,
    target: `${context.target ?? '본인'} 기준 · ${contextLabel(context)}`,
    balance: `${dominant} 과다 · ${weak} 보완 · ${useful} 중심`,
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

function hookFor(focus: ReportFocus, analysis: SajuAnalysis, context: SajuReportContext): string {
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

  return hooks[focus]
}

function tenGodSentence(analysis: SajuAnalysis): string {
  const notes = analysis.tenGods.slice(0, 3).map((g) => `${g}은 ${TEN_GOD_NOTE[g]}.`)
  return notes.join(' ')
}

function buildInterpretation(
  focus: ReportFocus,
  analysis: SajuAnalysis,
  context: SajuReportContext,
  ragTopics: string[],
): string {
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
  const ragLine = ragTopics.length > 0 ? `이번 장은 ${ragTopics.join(', ')}의 흐름을 같이 대조했습니다.` : ''
  const target = cleanContextValue(context.target, '본인')
  const orientation = cleanContextValue(context.orientation, '관계 기준 미선택')
  const relationship = cleanContextValue(context.relationship, '관계 상태 미입력')

  const sections: Partial<Record<ReportFocus, string>> = {
    profile: [
      `흠... ${name}님 사주의 중심은 ${dayPillar} 일주, 그중에서도 ${dayMaster} 일간입니다. 이 일간은 겉으로 드러나는 태도보다 속에서 먼저 판단하고, 작은 신호를 놓치지 않으려는 결을 갖습니다. ${strengthText} 팔자라서 마음이 움직이기 전까지는 쉽게 방향을 바꾸지 않지만, 한 번 흐름이 잡히면 생각보다 깊게 파고듭니다.`,
      `년주 ${pillarLabel(p.year)}, 월주 ${monthPillar}, 시주 ${pillarLabel(p.hour)}를 같이 놓고 보면 ${dominant} 기운이 먼저 보입니다. ${ELEMENT_TRAIT[analysis.dominantElement]}이 사주의 앞쪽으로 올라와 있어, 남들이 보기에는 담담해 보여도 안쪽에서는 이미 많은 계산과 감지가 끝나 있는 사람입니다. ${analysis.dayMasterAdvice}`,
      `${ragLine} 그러니 ${name}님은 단순히 성격이 예민한 사람이 아닙니다. 사주가 먼저 주변의 온도를 읽고, 그 다음에 행동을 고르는 구조입니다. 이걸 장점으로 쓰면 직관이 되고, 눌러두면 혼자만 알아차린 피로가 됩니다.`,
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
      `${ragLine} 좋은 팔자는 강한 것만 많은 팔자가 아닙니다. 강한 기운을 어디에 쓰고, 빈 기운을 어떻게 채우는지가 더 중요합니다. ${name}님은 지금 강한 기운을 더 세게 만드는 것보다, 비어 있는 ${weak}의 자리를 생활 속에서 천천히 살려야 흐름이 안정됩니다.`,
    ].join('\n\n'),
    trap: [
      `${concern}. 이 고민이 그냥 우연히 올라온 건 아닙니다. 사주 안의 십신을 보면 ${analysis.tenGods.join(' · ') || '십신'} 흐름이 보이고, 여기서 반복되는 반응 패턴이 있습니다. ${tenGodSentence(analysis)}`,
      `특히 월주 ${monthPillar}는 사회에서 드러나는 얼굴을 말합니다. 이 자리에 걸린 기운이 강하면, 혼자 있을 때의 나와 사람들 앞에서 버티는 내가 달라질 수 있습니다. 그래서 ${name}님은 괜찮은 척은 잘하지만, 정작 마음 깊은 곳에서는 이미 선을 넘었는지 아닌지를 계속 재고 있을 가능성이 큽니다.`,
      `${ragLine} 함정은 늘 비슷합니다. 너무 빨리 읽어버리고, 너무 오래 참아버리고, 마지막에는 갑자기 끊어내는 식입니다. 이 패턴을 알면 피할 수 있습니다. 지금 필요한 건 더 세게 버티는 것이 아니라, 어떤 순간에 내가 무너지는지 정확히 이름 붙이는 일입니다.`,
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
      `95점짜리 풀이가 되려면 각 장마다 세 가지가 들어가야 합니다. 첫째, 실제 사주 근거. 둘째, 사용자가 선택한 대상·관계·일상 상태와의 연결. 셋째, 지금 당장 볼 수 있는 행동 기준입니다. 이 세 가지가 없으면 말은 그럴듯해도 개인화가 약해집니다.`,
      `${ragLine} 그래서 이 리포트는 ${name}님을 한 문장으로 가두지 않고, 선택지마다 달라지는 해석의 초점을 따라가며 깊게 펼치는 구조로 설계됩니다.`,
    ].join('\n\n'),
    action: [
      `마지막으로 지금 붙잡아야 할 신호를 보겠습니다. ${name}님 사주에서 답은 거창한 결심보다 ${useful} 기운을 살리는 작은 반복에 있습니다. 강한 ${dominant}은 이미 충분합니다. 이제는 부족한 ${weak}을 채워야 판이 안정됩니다.`,
      `${concern} 때문에 마음이 흔들린다면, 먼저 기준을 하나만 세우세요. 당장 모든 걸 바꾸려 하지 말고, 이번 달에 지킬 수 있는 약속 하나, 끊어낼 소비 하나, 정리할 관계 하나를 정하는 겁니다. 사주는 방향을 보여주지만, 운을 붙드는 건 결국 반복입니다.`,
      `${ragLine} 천기 선생님 식으로 말하면 이렇습니다. 좋은 운은 기다리는 사람에게 오는 게 아니라, 들어왔을 때 담을 그릇을 만들어둔 사람에게 남습니다. 지금 ${name}님에게 필요한 건 더 많은 예언이 아니라, 이미 보이는 신호를 놓치지 않는 일입니다.`,
    ].join('\n\n'),
  }

  return sections[focus] ?? [
    `${name}님 사주의 ${focus} 흐름을 보겠습니다. ${dayPillar} 일주와 ${dominant} 기운, ${weak}의 빈자리를 함께 놓고 보면 지금 봐야 할 기준이 보입니다.`,
    `${ragLine} 이 장은 단정적인 예언보다 명식 근거와 선택지 맥락을 연결하는 데 초점을 둡니다. 같은 사주라도 ${contextLabel(context)}에 따라 읽어야 할 자리가 달라집니다.`,
  ].join('\n\n')
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
  ]
  const name = cleanContextValue(context.name, cleanContextValue(context.target, '당신'))
  const sections: SajuReportSection[] = REPORT_BLUEPRINTS.map((blueprint, index) => {
    const chunks = retrieveRagChunks(
      `${blueprint.query} ${reportContextQuery(context)}`,
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
      hook: hookFor(blueprint.focus, analysis, context),
      patternKeys: keys,
      ragTopics,
      interpretation: buildInterpretation(blueprint.focus, analysis, context, ragTopics),
    }
  })

  return {
    title: `${name}님의 사주 리포트`,
    subtitle: '사주 기둥과 오행, 십신, 대운 흐름을 기준으로 순차 해석합니다.',
    model: 'template',
    generatedBy: 'template',
    sections,
  }
}

function reportPrompt(
  analysis: SajuAnalysis,
  birth: BirthInput,
  context: SajuReportContext,
  baseReport: SajuReport,
): LlmMessage[] {
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
        '당신은 천기 선생님 사주 리포트 작성 엔진입니다.',
        '입력된 사주 기둥, 오행, 십신, 용신, 대운, RAG 지식을 근거로 장문 풀이를 씁니다.',
        '말투는 “흠...”, “보입니다”, “그 이유가 있습니다”, “좋은 말만 하지는 않겠습니다” 계열의 천기 선생님 말투를 유지합니다.',
        '확정 예언, 질병 진단, 투자 수익 보장, 법률 판단은 금지합니다.',
        '반드시 JSON만 출력하세요. Markdown 코드블록을 쓰지 마세요.',
      ].join('\n'),
    },
    {
      role: 'user',
      content: JSON.stringify({
        instruction: 'baseReport의 섹션 수와 id/order/imageKey/category/categoryEn/classification/patternKeys/ragTopics는 유지하고, hook과 interpretation만 더 밀도 있게 보강하세요. interpretation은 섹션마다 한국어 1200~1800자 정도, 3~5문단입니다. 반드시 target/orientation/relationship/work/concern 선택지를 해당 섹션에 맞게 반영하세요.',
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
        '당신은 천기 선생님 사주 리포트의 한 페이지를 작성합니다.',
        '한 번에 전체 리포트를 쓰지 말고, 사용자가 선택한 현재 페이지 섹션만 작성합니다.',
        '사주 기둥, 오행, 십신, 용신, 대운, RAG 지식을 근거로 하되 기계적으로 나열하지 않습니다.',
        '말투는 “흠...”, “보입니다”, “그 이유가 있습니다”, “좋은 말만 하지는 않겠습니다” 계열의 천기 선생님 말투입니다.',
        '확정 예언, 질병 진단, 투자 수익 보장, 법률 판단은 금지합니다.',
        '반드시 JSON만 출력하세요. Markdown 코드블록을 쓰지 마세요.',
      ].join('\n'),
    },
    {
      role: 'user',
      content: JSON.stringify({
        instruction: '현재 section 하나만 보강하세요. id/order/imageKey/imageSrc/category/categoryEn/classification/patternKeys/ragTopics는 유지합니다. hook은 짧게, interpretation은 한국어 1200~1800자 정도의 3~5문단으로 작성하세요. target/orientation/relationship/work/concern 선택지 중 이 섹션과 직접 관련된 값은 반드시 문장 속에 녹이세요.',
        outputShape: {
          id: section.id,
          hook: 'string',
          interpretation: 'string',
        },
        birth,
        context,
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

function mergeOpenAiReport(baseReport: SajuReport, rawReport: unknown): SajuReport {
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

  return {
    ...baseReport,
    title: typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : baseReport.title,
    subtitle: typeof parsed.subtitle === 'string' && parsed.subtitle.trim() ? parsed.subtitle.trim() : baseReport.subtitle,
    model: REPORT_MODEL,
    generatedBy: 'openai',
    sections,
  }
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
  return mergeOpenAiReport(baseReport, extractJsonObject(raw))
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
