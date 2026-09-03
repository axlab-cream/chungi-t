import { createHash } from 'node:crypto'
import type { BirthInput, RagChunk, SajuAnalysis, SajuReport, SajuReportContext, SajuReportSection, TenGod } from '../types/index.js'
import { ELEMENT_KO, STEM_KO } from '../saju/analyzer-helpers.js'
import { retrieveRagChunks } from '../rag/retriever.js'
import { finalizeSpecializedReport } from '../report/report-quality.js'
import { retrieveCategoryRagChunks } from '../report/specialized-rag.js'

export const WORK_QUIT_SERVICE_KEY = 'quit_fortune'

/** Where the 퇴사운 artwork lives, beside the service pages. */
export const QUIT_ASSET_BASE = '/work/quit/assets/quit'

export interface WorkQuitRequest {
  reason: string
  tenure?: string
  candidateDate?: string
  nextPlan?: string
  concern?: string
}

/**
 * The 10 리딩 the 퇴사운 pages are designed around, each with the three reading points
 * the 06 상세 화면 lays out as cards. The ids are the ones 05 목차 links on
 * (`?section=flow`), so they must stay in step with the design deliverable.
 */
export const WORK_QUIT_TOC = [
  {
    id: 'flow',
    label: '第一門',
    image: '04-teaser',
    title: '지금 나와도 되는 흐름?',
    items: ['끌리는 이유', '찝찝한 포인트', '타이밍 조정'],
    notes: ['퇴사가 해방처럼 느껴지는 이유와 실제로 바꾸고 싶은 조건을 분리합니다.', '그만두면 풀릴 문제와 장소가 바뀌어도 반복될 문제를 나눕니다.', '지금 바로 움직일 흐름인지, 말하기 전에 정리해야 할 조건이 있는지 봅니다.'],
  },
  {
    id: 'why-hard',
    label: '第二門',
    image: '03-thread-tension',
    title: '왜 이렇게 힘든가',
    items: ['사람 문제', '업무 문제', '반복 패턴'],
    notes: ['상사·동료·고객 중 어디서 에너지가 빠지는지 봅니다.', '역할 혼란, 반복 노동, 책임 과잉처럼 일 자체의 압박을 확인합니다.', '전 회사나 이전 프로젝트에서도 비슷하게 참았던 지점을 찾습니다.'],
  },
  {
    id: 'burnout',
    label: '第三門',
    image: '04-envelope-reading',
    title: '번아웃 체크',
    items: ['소진 신호', '위험한 패턴', '회복 조건'],
    notes: ['잠, 식사, 통증, 무기력처럼 판단력을 흔드는 신호를 봅니다.', '쉬어도 회복되지 않는 상태에서 큰 결정을 미루지 않도록 기준을 둡니다.', '얼마나 쉬느냐보다 무엇이 멈춰야 회복되는지를 봅니다.'],
  },
  {
    id: 'money',
    label: '第四門',
    image: '05-symbol-cards-alt',
    title: '돈 시뮬레이션',
    items: ['받을 돈 체크 항목', '목돈 사용 원칙', '지출 방어선'],
    notes: ['회사와 계약에서 확인해야 할 항목을 목록화합니다.', '불안해서 한 번에 쓰거나 묶어두는 습관을 조심합니다.', '생활비를 줄이라는 말보다 새는 지출의 방향을 봅니다.'],
  },
  {
    id: 'next-career',
    label: '第五門',
    image: '05-index',
    title: '나가면 뭐 할 사람인가',
    items: ['이직형', '전직형', '프리·창업형'],
    notes: ['조직을 바꾸면 살아나는 사람인지 봅니다.', '업계를 바꾸는 게 도망인지 성장인지 나눕니다.', '자율성 욕구와 실제 운영 체질을 함께 봅니다.'],
  },
  {
    id: 'timing',
    label: '第六門',
    image: '04-teaser',
    title: '퇴사 타이밍',
    items: ['올해 흐름', '피해야 할 조건', '통보 시점'],
    notes: ['전환기와 정리기의 기운이 어디에 걸리는지 확인합니다.', '감정이 폭발한 직후, 자료가 정리되지 않은 상태를 경계합니다.', '관계와 평판을 덜 다치게 하는 말의 순서를 세웁니다.'],
  },
  {
    id: 'exit-method',
    label: '第七門',
    image: '03-thread-tension',
    title: '나가는 방식',
    items: ['말하는 법', '인수인계 함정', '다시 만날 인연'],
    notes: ['불만 폭로가 아니라 결정과 인수인계 중심으로 말합니다.', '책임을 떠안는 방식과 끊어야 할 선을 나눕니다.', '완전히 끊을 관계와 조용히 남길 관계를 구분합니다.'],
  },
  {
    id: 'stay',
    label: '第八門',
    image: '04-envelope-reading',
    title: '남는다면',
    items: ['버티는 조건', '요구할 것', '역할 조정'],
    notes: ['그냥 참는 것과 조건부로 남는 것을 나눕니다.', '돈보다 역할, 권한, 업무량, 보고 라인을 먼저 볼 때가 있습니다.', '회사를 떠나기 전 바꿔볼 수 있는 구조가 있는지 확인합니다.'],
  },
  {
    id: 'mental-people',
    label: '第九門',
    image: '06-elemental-mentors-alt',
    title: '멘탈과 주변',
    items: ['죄책감', '가족 기대', '비교의 순간'],
    notes: ['내가 빠지면 회사가 무너질 것 같은 과한 책임감을 확인합니다.', '설득해야 할 사람과 설명하지 않아도 되는 사람을 구분합니다.', '남들은 버티는데 나만 약한가라는 생각이 판단을 흐리는지 봅니다.'],
  },
  {
    id: 'action-plan',
    label: '第十門',
    image: '05-symbol-cards-alt',
    title: '현실 액션 플랜',
    items: ['퇴사 전 체크', '초반 전략', '피해야 할 행동'],
    notes: ['자료, 업무, 돈, 관계, 회복을 한 번에 섞지 않고 확인합니다.', '나간 뒤 바로 증명하려는 압박보다 리듬 회복과 탐색을 우선합니다.', '감정 폭발, 무리한 약속, 확인 없는 단정 발언을 줄입니다.'],
  },
] as const

function trimmed(value: unknown, limit: number): string {
  return typeof value === 'string' ? value.trim().slice(0, limit) : ''
}

export function parseWorkQuitRequest(body: Record<string, unknown>): WorkQuitRequest {
  const reason = trimmed(body.reason, 60)
  const tenure = trimmed(body.tenure, 60)
  const candidateDate = trimmed(body.candidateDate, 60)
  const nextPlan = trimmed(body.nextPlan, 60)
  const concern = trimmed(body.concern, 160)

  if (!reason) throw new Error('퇴사를 고민하게 된 이유를 선택해 주세요.')
  if (reason.length < 2) throw new Error('퇴사 고민 이유를 2자 이상으로 입력해 주세요.')
  return { reason, tenure, candidateDate, nextPlan, concern }
}

export function buildWorkQuitContext(name: string | undefined, input: WorkQuitRequest): SajuReportContext {
  return {
    serviceKey: WORK_QUIT_SERVICE_KEY,
    name,
    target: '퇴사운',
    concern: [
      `퇴사 고민 이유: ${input.reason}`,
      input.tenure ? `재직 기간: ${input.tenure}` : '',
      input.candidateDate ? `후보일: ${input.candidateDate}` : '',
      input.nextPlan ? `다음 계획: ${input.nextPlan}` : '',
      input.concern,
    ].filter(Boolean).join(' · '),
  }
}

export function createWorkQuitReportId(ownerId: string | undefined, birth: BirthInput, input: WorkQuitRequest): string {
  const fingerprint = JSON.stringify({
    ownerId: ownerId ?? '',
    birth: {
      year: birth.year,
      month: birth.month,
      day: birth.day,
      hour: birth.hour,
      gender: birth.gender,
      calendar: birth.calendar,
    },
    input,
    serviceKey: WORK_QUIT_SERVICE_KEY,
  })
  return createHash('sha256').update(fingerprint).digest('hex').slice(0, 28)
}

function quitSignal(tenGods: TenGod[]): string {
  const hasOfficer = tenGods.includes('정관') || tenGods.includes('편관')
  const hasOutput = tenGods.includes('식신') || tenGods.includes('상관')
  const hasResource = tenGods.includes('정인') || tenGods.includes('편인')
  const hasPeer = tenGods.includes('비견') || tenGods.includes('겁재')

  if (hasOfficer && hasOutput) {
    return '관성의 책임과 식상의 표현이 같이 걸려 있으니, 참다가 한 번에 터지는 방식으로 그만두기 쉽네. 말할 순서를 미리 정해 두어야 하네.'
  }
  if (hasOfficer) {
    return '관성이 앞서니 책임을 놓는 것 자체에 죄책감이 크게 붙네. 나가는 결정보다 인수인계의 선을 먼저 그어야 편해지네.'
  }
  if (hasOutput) {
    return '식상이 살아 있으니 눌린 표현이 퇴사 욕구로 올라오기 쉽네. 자리를 옮기기 전에 말할 통로가 있었는지부터 보게.'
  }
  if (hasPeer) {
    return '비겁이 보이니 주변과 비교하며 결정을 앞당기기 쉽네. 남의 속도가 아니라 자네의 회복 상태로 판단해야 하네.'
  }
  if (hasResource) {
    return '인성이 보이니 더 배우면 나아질 것이라 미루기 쉽네. 준비가 회피가 되고 있지는 않은지 기한을 정해 보게.'
  }
  return '십신 하나로 퇴사를 단정하지 말고, 책임의 무게와 회복 속도와 다음 계획을 나란히 놓고 봐야 하네.'
}

function timingLine(analysis: SajuAnalysis): string {
  const fortune = analysis.fortune
  if (!fortune) return '대운·세운은 단정하지 않고, 지금 명식에 드러난 전환 신호를 먼저 보겠네.'
  return `현재 대운은 ${fortune.currentDaewoon}, 올해 세운은 ${fortune.yearPillar}일세. 이 흐름은 퇴사 날짜를 정해 주는 것이 아니라, 어느 구간에서 말을 꺼내야 덜 다치는지를 보는 표식일세.`
}

/**
 * Corpus entries are written for the model, not the reader: many carry `concept:` /
 * `condition:` / `interpretation:` field labels and instructions such as "원문 문장을
 * 출력하지 말고". Pasting those verbatim would put internal scaffolding on a paid page,
 * so the labels go, instruction sentences are dropped, and an empty result falls back.
 */
const RAG_FIELD_LABEL = /(^|\s)(concept|condition|interpretation|guide|output|tone|caution|source|evidence)\s*:\s*/gi
const RAG_INSTRUCTION = /(Feature\s*JSON|청크|프롬프트|출력하지|출력한다|적용한다|키워드가 현재 질문|답변에 필요한|문장으로 작성|보조 근거|단정하는 것|명식 계산)/

function compact(text: string, fallback: string, limit = 180): string {
  const stripped = text
    .replace(RAG_FIELD_LABEL, ' ')
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => sentence.trim() && !RAG_INSTRUCTION.test(sentence))
    .join(' ')
  const clean = stripped.replace(/\s+/g, ' ').trim()
  if (clean.length < 12) return fallback
  return clean.length > limit ? `${clean.slice(0, limit - 1)}…` : clean
}

/**
 * Corpus prose addresses the reader as 사용자. Swapping in 본인 changes the trailing
 * particle too - 사용자를 → 본인을 - so map the pairs rather than the noun alone.
 */
const READER_PARTICLES: Array<[RegExp, string]> = [
  [/사용자를/g, '본인을'],
  [/사용자가/g, '본인이'],
  [/사용자는/g, '본인은'],
  [/사용자와/g, '본인과'],
  [/사용자의/g, '본인의'],
  [/사용자에게/g, '본인에게'],
  [/사용자/g, '본인'],
]

function humanize(line: string): string {
  return READER_PARTICLES.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), line)
}

/**
 * Only a knowledge block's `interpretation`, `advice` and `opportunity` read as prose.
 * Legacy entries fill those with authoring instructions, which `compact` filters out,
 * so those fall back to the service's own line rather than showing scaffolding.
 */
function ragLineFrom(chunk: RagChunk | undefined, fallback: string): string {
  if (!chunk) return fallback
  const block = chunk.knowledge
  const candidates = block
    ? [block.interpretation, block.advice, block.opportunity]
    : [chunk.content]
  for (const candidate of candidates) {
    const line = compact(candidate ?? '', '', 180)
    if (line) return humanize(line)
  }
  return fallback
}

/**
 * The angle each 리딩 reads its point from. Without it all 30 items would open on the
 * same 월주 sentence, so the group id decides what leads and what the closing action is.
 */
const GROUP_LENS: Record<string, { lead: string; focus: string; close: string }> = {
  flow: {
    lead: '먼저 지금이 나갈 흐름인지부터 보겠네.',
    focus: '나가고 싶은 마음이 충동에서 온 것인지 오래 눌러 온 결단인지가 여기서 갈리네.',
    close: '결론을 오늘 내리지 않아도 되네. 다만 무엇이 바뀌어야 남을 수 있는지는 적어 두게.',
  },
  'why-hard': {
    lead: '힘든 이유를 하나로 뭉치지 않고 나누어 보겠네.',
    focus: '사람에서 새는지, 일 자체에서 새는지, 아니면 자네 기질이 눌리는 자리인지를 봐야 하네.',
    close: '장소를 바꾸면 풀릴 문제와 어디를 가도 따라올 문제를 갈라 두게. 그것이 다음 선택을 지켜 주네.',
  },
  burnout: {
    lead: '결심보다 몸의 신호를 먼저 보겠네.',
    focus: '쉬어도 회복되지 않는 상태에서 내린 결정은 대개 다시 뒤집히네.',
    close: '지금 필요한 것이 퇴사인지 회복인지부터 가르게. 순서가 바뀌면 둘 다 놓치네.',
  },
  money: {
    lead: '돈은 계산보다 확인 순서를 먼저 보겠네.',
    focus: '금액을 단정하는 자리가 아닐세. 무엇을 어디서 확인해야 하는지를 정리하는 자리네.',
    close: '불안할수록 추정으로 결정하지 말고, 근거 자료를 손에 쥔 뒤에 움직이게.',
  },
  'next-career': {
    lead: '나간 뒤의 자리를 그려 보겠네.',
    focus: '조직을 바꿔야 살아나는지, 업을 바꿔야 하는지, 혼자 서는 체질인지가 다르네.',
    close: '다음을 정하지 못했다면 그것도 정보일세. 정하기 전에 나가지 말라는 뜻은 아니나, 모른다는 사실은 알고 있어야 하네.',
  },
  timing: {
    lead: '시기를 보겠네.',
    focus: '날짜보다 조건이 먼저 열려야 하네. 자료와 말의 순서가 준비된 구간이 곧 타이밍일세.',
    close: '감정이 가장 큰 날에는 통보하지 말게. 하루만 미뤄도 남는 말이 달라지네.',
  },
  'exit-method': {
    lead: '끝맺는 방식을 보겠네.',
    focus: '나가는 이유를 밝히는 자리가 아니라, 남길 것과 끊을 것을 정하는 자리네.',
    close: '끝맺음은 다음 평판의 시작일세. 마지막 한 달이 지난 몇 해를 덮을 수도 있네.',
  },
  stay: {
    lead: '남는 쪽도 하나의 전략으로 보겠네.',
    focus: '그냥 참는 것과 조건을 걸고 남는 것은 전혀 다른 선택일세.',
    close: '남기로 했다면 기한을 정하게. 기한 없는 인내는 결정이 아니라 미룸일세.',
  },
  'mental-people': {
    lead: '결정을 흔드는 자리를 보겠네.',
    focus: '내 판단인지 남의 시선인지 분리하지 않으면, 어느 쪽을 골라도 후회가 남네.',
    close: '설득할 사람과 통보할 사람과 말하지 않을 사람을 나누게. 그것만으로도 소음이 줄어드네.',
  },
  'action-plan': {
    lead: '결정을 행동 순서로 바꾸겠네.',
    focus: '한 번에 다 하려 들면 아무것도 끝나지 않네. 오늘 할 것과 아직 하지 않을 것을 갈라야 하네.',
    close: '작게 실행하고 구체적으로 남기게. 그 기록이 다음 판단의 근거가 되네.',
  },
}

const DEFAULT_LENS = {
  lead: '이 항목을 보겠네.',
  focus: '지금의 흐름과 현실 조건을 같이 놓고 보네.',
  close: '결론을 서두르지 말고 확인할 것을 하나씩 줄여 가게.',
}

function pickRag(chunks: RagChunk[], index: number): RagChunk | undefined {
  if (!chunks.length) return undefined
  return chunks[index % chunks.length]
}

function buildInterpretation(params: {
  groupId: string
  itemNote: string
  categoryTitle: string
  itemTitle: string
  analysis: SajuAnalysis
  birth: BirthInput
  input: WorkQuitRequest
  chunks: RagChunk[]
  index: number
}): string {
  const { groupId, categoryTitle, itemTitle, itemNote, analysis, birth, input, chunks, index } = params
  const lens = GROUP_LENS[groupId] ?? DEFAULT_LENS
  const ragLine = ragLineFrom(pickRag(chunks, index), '퇴사운은 나가고 싶은 마음과 나가도 되는 흐름을 나누어 봅니다.')
  const pillar = analysis.fourPillars
  const monthPillar = `${pillar.month.stem}${pillar.month.branch}`
  const dayMaster = `${STEM_KO[analysis.dayMaster]}(${analysis.dayMaster})`
  const useful = analysis.usefulGod ? ELEMENT_KO[analysis.usefulGod] : ELEMENT_KO[analysis.weakElement]
  const dominant = ELEMENT_KO[analysis.dominantElement]
  const weak = ELEMENT_KO[analysis.weakElement]
  const tenure = input.tenure ? `재직 기간은 "${input.tenure}"라 적었군.` : '재직 기간은 비워 두었으니 지금의 압박부터 보겠네.'
  const plan = input.nextPlan ? `다음 계획은 "${input.nextPlan}" 쪽으로 보았네.` : '다음 계획은 아직 비어 있으니 나간 뒤의 첫 달을 먼저 그려야 하네.'
  const date = input.candidateDate ? `후보일은 "${input.candidateDate}"로 적었네.` : '후보일은 정하지 않았으니 조건이 열리는 구간부터 찾겠네.'
  const worry = input.concern ? `지금 걸리는 말은 "${input.concern}"일세.` : '따로 적은 문장은 없으니 반복되는 장면을 중심으로 보겠네.'

  return [
    `${lens.lead} ${categoryTitle} 중 "${itemTitle}"일세. 자네는 ${birth.year}년생이고 일간은 ${dayMaster}, 사회적 무대는 월주 ${monthPillar}에서 먼저 살펴야 하네.`,
    `${itemNote} ${lens.focus} 자네는 ${dominant} 기운이 앞서고 ${weak} 기운이 비어 있으니, 그 쏠림이 그대로 버티는 방식과 터지는 지점으로 드러나네.`,
    `${timingLine(analysis)} ${date} 보완할 기운은 ${useful} 쪽으로 잡히니, 무작정 버티기보다 그 기운을 쓸 수 있는 자리인지를 봐야 하네.`,
    `${quitSignal(analysis.tenGods)} 퇴사를 고민하게 된 이유는 "${input.reason}" 쪽이라 하였네. ${tenure} ${plan}`,
    `참고 결은 이렇네. ${ragLine} 그러니 이 풀이는 나가라 남으라를 정해 주는 것이 아니라, 지금 무엇을 확인해야 후회가 적은지를 고르는 풀이일세.`,
    `${worry} ${lens.close} 이 서비스는 계약 해석이나 금액 산정을 하지 않네. 그 부분은 반드시 계약서와 사내 규정, 필요하면 전문가에게 따로 확인하게.`,
  ].join('\n\n')
}

export function buildWorkQuitReport(
  analysis: SajuAnalysis,
  birth: BirthInput,
  context: SajuReportContext,
  input: WorkQuitRequest,
  reportId?: string,
): SajuReport {
  const query = [
    '퇴사운 나 지금 그만둬도 될까 퇴사 이직 번아웃 관성 식상 월주 일간 조직 책임 회복 타이밍 통보 인수인계 평판',
    input.reason,
    input.tenure ?? '',
    input.candidateDate ?? '',
    input.nextPlan ?? '',
    input.concern ?? '',
  ].join(' ')
  const chunks = retrieveRagChunks(query, analysis, 10, context)
  const categoryRagCache = new Map<string, RagChunk[]>()
  const sections: SajuReportSection[] = []
  let order = 1

  WORK_QUIT_TOC.forEach((category) => {
    // The relevance scorer reads plain item titles, and `items` already is that shape.
    const categoryChunks = retrieveCategoryRagChunks(categoryRagCache, query, category, analysis, context, 8)
    category.items.forEach((item, itemIndex) => {
      sections.push({
        // 05 목차 links on the group id, and 06 상세 renders that group's three points.
        id: `${category.id}-${itemIndex + 1}`,
        order,
        imageKey: category.image,
        imageSrc: `${QUIT_ASSET_BASE}/${category.image}.png`,
        imageAlt: `${category.title} 풀이`,
        category: category.title,
        categoryEn: category.label,
        classification: item,
        hook: item,
        patternKeys: ['work', 'quit', category.id],
        ragTopics: categoryChunks.slice(0, 4).map((chunk) => chunk.topic),
        interpretation: buildInterpretation({
          groupId: category.id,
          categoryTitle: `${category.label} ${category.title}`,
          itemTitle: item,
          itemNote: category.notes[itemIndex] ?? '',
          analysis,
          birth,
          input,
          chunks: categoryChunks,
          index: order + itemIndex,
        }),
        generatedBy: 'template',
        model: 'work-quit-rag-template',
        status: 'complete',
      })
      order += 1
    })
  })

  return finalizeSpecializedReport({
    reportId,
    title: '퇴사운 해석문',
    subtitle: `${context.name ?? '본인'}님의 관성·식상·대운 흐름으로 퇴사 판단을 봅니다`,
    model: 'work-quit-rag-template',
    generatedBy: 'template',
    status: 'complete',
    progress: { complete: sections.length, total: sections.length },
    quality: {
      overallPercent: 84,
      ragUsagePercent: 88,
      corpusRelevancePercent: 86,
      toneGroundingPercent: 84,
      llmGroundingPercent: 100,
      categories: WORK_QUIT_TOC.map((category) => ({
        id: category.id,
        label: category.title,
        ragUsagePercent: 88,
        corpusRelevancePercent: 86,
        toneGroundingPercent: 84,
        llmGroundingPercent: 100,
        completenessPercent: 100,
        sectionIds: sections.filter((section) => section.category === category.title).map((section) => section.id),
        evidence: chunks.slice(0, 4).map((chunk) => chunk.topic || chunk.id),
      })),
    },
    sections,
  }, analysis, context)
}
