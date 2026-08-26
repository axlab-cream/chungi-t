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
  | 'balance'
  | 'trap'
  | 'careerMoney'
  | 'love'
  | 'future'
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
    id: 'balance',
    category: '네 기운의 분포',
    categoryEn: 'The Balance',
    focus: 'balance',
    query: '오행 강한 기운 부족한 기운 용신 희신 기신',
  },
  {
    id: 'trap',
    category: '네가 빠지는 함정',
    categoryEn: 'The Trap',
    focus: 'trap',
    query: '십신 비겁 식상 관성 재성 인성 반복 고민 합충형파해',
  },
  {
    id: 'career-money',
    category: '일과 돈의 결',
    categoryEn: 'Work & Money',
    focus: 'careerMoney',
    query: '직업 재물 정재 편재 식신 상관 관성 돈 흐름',
  },
  {
    id: 'love-loop',
    category: '인연의 반복 패턴',
    categoryEn: 'The Love Loop',
    focus: 'love',
    query: '연애 관계 배우자궁 일지 관성 재성 도화 인연',
  },
  {
    id: 'future-flow',
    category: '앞으로 흘러갈 큰 운',
    categoryEn: 'The Flow',
    focus: 'future',
    query: '대운 세운 운 흐름 용신 기신 시기 전환',
  },
  {
    id: 'action-guide',
    category: '지금 붙잡아야 할 신호',
    categoryEn: 'The Signal',
    focus: 'action',
    query: '사주 조언 용신 행동 기준 현재 고민 앞으로',
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

function classificationFor(focus: ReportFocus, analysis: SajuAnalysis): string {
  const p = analysis.fourPillars
  const dayPillar = pillarLabel(p.day)
  const monthPillar = pillarLabel(p.month)
  const dominant = ELEMENT_KO[analysis.dominantElement]
  const weak = ELEMENT_KO[analysis.weakElement]
  const useful = analysis.usefulGod ? ELEMENT_KO[analysis.usefulGod] : '보완 기운'
  const tenGod = analysis.tenGods[0] ?? '십신'

  const labels: Record<ReportFocus, string> = {
    profile: `${dayPillar} 일주 · ${STEM_KO[analysis.dayMaster]}${ELEMENT_KO[analysis.dayMasterElement].charAt(0)} 일간`,
    balance: `${dominant} 과다 · ${weak} 보완 · ${useful} 중심`,
    trap: `${tenGod} 패턴 · 월주 ${monthPillar}의 사회 결`,
    careerMoney: `${analysis.tenGods.filter((g) => g.includes('재') || g.includes('식') || g.includes('상')).join(' · ') || '식상/재성 확인'} 흐름`,
    love: `일지 ${BRANCH_KO[p.day.branch]}(${p.day.branch}) · 관계궁의 신호`,
    future: `${analysis.fortune?.currentDaewoon ?? '대운'} · ${analysis.fortune?.yearPillar ?? '세운'} 흐름`,
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
    balance: `${dominant} 기운이 먼저 치고 올라옵니다`,
    trap: `${concern} 때문에 여기까지 온 이유가 있습니다`,
    careerMoney: '돈길과 일길은 따로 보지 않습니다',
    love: '오래 남는 사람은 따로 보입니다',
    future: '큰 운은 이미 방향을 틀고 있습니다',
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

  const sections: Record<ReportFocus, string> = {
    profile: [
      `흠... ${name}님 사주의 중심은 ${dayPillar} 일주, 그중에서도 ${dayMaster} 일간입니다. 이 일간은 겉으로 드러나는 태도보다 속에서 먼저 판단하고, 작은 신호를 놓치지 않으려는 결을 갖습니다. ${strengthText} 팔자라서 마음이 움직이기 전까지는 쉽게 방향을 바꾸지 않지만, 한 번 흐름이 잡히면 생각보다 깊게 파고듭니다.`,
      `년주 ${pillarLabel(p.year)}, 월주 ${monthPillar}, 시주 ${pillarLabel(p.hour)}를 같이 놓고 보면 ${dominant} 기운이 먼저 보입니다. ${ELEMENT_TRAIT[analysis.dominantElement]}이 사주의 앞쪽으로 올라와 있어, 남들이 보기에는 담담해 보여도 안쪽에서는 이미 많은 계산과 감지가 끝나 있는 사람입니다. ${analysis.dayMasterAdvice}`,
      `${ragLine} 그러니 ${name}님은 단순히 성격이 예민한 사람이 아닙니다. 사주가 먼저 주변의 온도를 읽고, 그 다음에 행동을 고르는 구조입니다. 이걸 장점으로 쓰면 직관이 되고, 눌러두면 혼자만 알아차린 피로가 됩니다.`,
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
    careerMoney: [
      `${work}의 흐름을 사주에 얹어보면 일과 돈은 따로 움직이지 않습니다. 재성은 돈만 뜻하지 않고 현실을 붙드는 감각이며, 식상은 내가 만들어내는 결과물입니다. ${name}님 사주에서 ${analysis.tenGods.join(' · ') || '십신'}이 보이는 만큼, 돈은 운 좋게 떨어지는 것보다 내가 어떤 방식으로 능력을 꺼내느냐에 따라 열립니다.`,
      `${dominant} 기운이 강한 사람은 일에서 자신만의 방식이 생기면 속도가 붙습니다. 다만 ${weak} 기운이 약한 쪽에서 관리가 새면 돈도 같이 샐 수 있습니다. 큰 기회보다 먼저 봐야 할 건 반복 수입, 관계 비용, 감정적으로 쓰는 돈입니다. 여기가 정리되면 재물운은 훨씬 선명하게 붙습니다.`,
      `${ragLine} 올해 흐름은 ${analysis.fortune?.yearPillar ?? '세운'}이 함께 움직입니다. 좋은 말만 하자면 기회가 보입니다. 하지만 더 정확히 말하자면, 기준 없이 넓히는 일은 조심해야 합니다. 돈길은 열리되, 새는 구멍을 막는 사람이 결국 흐름을 잡습니다.`,
    ].join('\n\n'),
    love: [
      `${relation}으로 관계를 보면, 일지 ${BRANCH_KO[p.day.branch]}(${p.day.branch}) 자리가 먼저 눈에 들어옵니다. 일지는 내가 가장 가까운 사람을 어떻게 받아들이는지, 오래 남는 인연 앞에서 어떤 반응을 보이는지 보여주는 자리입니다. ${name}님은 가볍게 시작한 관계보다 마음의 깊이를 확인한 뒤 오래 가는 쪽에 더 맞습니다.`,
      `남명은 재성, 여명은 관성이 배우자 흐름을 보는데, 지금 사주에서는 ${analysis.tenGods.join(' · ') || '십신'}의 조합을 같이 봐야 합니다. 끌림은 빠르게 올 수 있어도, 진짜 남는 사람은 ${useful} 기운을 살리는 사람입니다. 말이 많은 사람보다 내 흐름을 안정시키는 사람, 자극보다 기준을 세워주는 사람이 더 오래 남습니다.`,
      `${ragLine} 그러니 인연운은 누가 나타나느냐만 보는 풀이가 아닙니다. 내가 어떤 상태일 때 좋은 사람을 알아보는지도 같이 봐야 합니다. 지금 ${name}님에게 필요한 건 사랑을 더 세게 잡는 게 아니라, 나를 흐리게 만드는 관계와 나를 선명하게 만드는 관계를 구별하는 눈입니다.`,
    ].join('\n\n'),
    future: [
      `앞으로의 흐름은 대운 ${analysis.fortune?.currentDaewoon ?? '대운'}과 올해 세운 ${analysis.fortune?.yearPillar ?? '세운'}을 같이 봅니다. 대운은 10년짜리 큰 물길이고, 세운은 그 물길 위에 올라오는 올해의 파도입니다. 둘이 같은 방향이면 일이 빨리 풀리고, 서로 어긋나면 속도보다 조정이 먼저 필요합니다.`,
      `${name}님의 원국에서는 ${dominant} 기운이 강하고 ${weak} 기운이 약합니다. 운에서 ${useful}이 살아나는 시기에는 사람, 일, 돈이 한 방향으로 모일 수 있습니다. 반대로 강한 ${dominant}만 더 몰리는 시기에는 자신감은 생기지만 과속도 같이 들어옵니다. 이때는 좋은 제안도 한 번 더 확인해야 합니다.`,
      `${ragLine} 흐름은 확정된 운명이 아니라 읽어야 할 날씨에 가깝습니다. 우산을 들고 나가면 비도 길이 됩니다. 지금부터 봐야 할 신호는 갑자기 커지는 제안, 오래 미뤄둔 관계의 정리, 그리고 돈이 들어오기 전 먼저 생기는 지출입니다.`,
    ].join('\n\n'),
    action: [
      `마지막으로 지금 붙잡아야 할 신호를 보겠습니다. ${name}님 사주에서 답은 거창한 결심보다 ${useful} 기운을 살리는 작은 반복에 있습니다. 강한 ${dominant}은 이미 충분합니다. 이제는 부족한 ${weak}을 채워야 판이 안정됩니다.`,
      `${concern} 때문에 마음이 흔들린다면, 먼저 기준을 하나만 세우세요. 당장 모든 걸 바꾸려 하지 말고, 이번 달에 지킬 수 있는 약속 하나, 끊어낼 소비 하나, 정리할 관계 하나를 정하는 겁니다. 사주는 방향을 보여주지만, 운을 붙드는 건 결국 반복입니다.`,
      `${ragLine} 천기 선생님 식으로 말하면 이렇습니다. 좋은 운은 기다리는 사람에게 오는 게 아니라, 들어왔을 때 담을 그릇을 만들어둔 사람에게 남습니다. 지금 ${name}님에게 필요한 건 더 많은 예언이 아니라, 이미 보이는 신호를 놓치지 않는 일입니다.`,
    ].join('\n\n'),
  }

  return sections[focus]
}

export function buildTemplateSajuReport(
  analysis: SajuAnalysis,
  birth: BirthInput,
  context: SajuReportContext = {},
): SajuReport {
  const keys = patternKeys(analysis, birth)
  const name = cleanContextValue(context.name, cleanContextValue(context.target, '당신'))
  const sections: SajuReportSection[] = REPORT_BLUEPRINTS.map((blueprint, index) => {
    const chunks = retrieveRagChunks(blueprint.query, analysis, runtimeConfig.report?.ragTopK ?? 4)
    const ragTopics = chunks.map((c) => c.topic)

    return {
      id: blueprint.id,
      order: index + 1,
      imageKey: 'common-mystic',
      imageSrc: COMMON_IMAGE_SRC,
      imageAlt: `${blueprint.category} 공통 이미지`,
      category: blueprint.category,
      categoryEn: blueprint.categoryEn,
      classification: classificationFor(blueprint.focus, analysis),
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
      const chunks = retrieveRagChunks(`${section.category} ${section.classification}`, analysis, runtimeConfig.report?.ragTopK ?? 4)
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
        instruction: 'baseReport의 섹션 수와 id/order/imageKey/category/categoryEn/classification/patternKeys/ragTopics는 유지하고, hook과 interpretation만 더 밀도 있게 보강하세요. interpretation은 섹션마다 한국어 900~1400자 정도, 2~4문단입니다.',
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
  const chunks = retrieveRagChunks(`${section.category} ${section.classification}`, analysis, runtimeConfig.report?.ragTopK ?? 4)
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
        instruction: '현재 section 하나만 보강하세요. id/order/imageKey/imageSrc/category/categoryEn/classification/patternKeys/ragTopics는 유지합니다. hook은 짧게, interpretation은 한국어 900~1400자 정도의 2~4문단으로 작성하세요.',
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
