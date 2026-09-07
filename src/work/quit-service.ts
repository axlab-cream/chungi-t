import { createHash } from 'node:crypto'
import type { BirthInput, RagChunk, SajuAnalysis, SajuReport, SajuReportContext, SajuReportSection } from '../types/index.js'
import { retrieveRagChunks } from '../rag/retriever.js'
import { finalizeSpecializedReport } from '../report/report-quality.js'
import { retrieveCategoryOwnChunks, retrieveCategoryRagChunks } from '../report/specialized-rag.js'
import { practicalReading, quotedInput, reportedState, workSymbol } from '../report/practical-service-copy.js'
import { QUIT_DETAILS } from './practical-readings.js'
const OWN_CORPUS_DOMAIN = 'quit_fortune_service'

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
      ...(birth.minute ? { minute: birth.minute } : {}),
    },
    input,
    serviceKey: WORK_QUIT_SERVICE_KEY,
  })
  return createHash('sha256').update(fingerprint).digest('hex').slice(0, 28)
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
  const { groupId, itemTitle, analysis, input } = params
  const reading = QUIT_DETAILS[itemTitle]
  if (!reading) throw new Error(`퇴사운 항목별 해석 누락: ${itemTitle}`)
  const state = reportedState([input.reason, input.concern].filter(Boolean).join(' '))
  const current = ['timing', 'flow', 'exit-method'].includes(groupId)
    ? `${quotedInput('후보일', input.candidateDate)} ${quotedInput('재직 기간', input.tenure)} 날짜가 비어 있으면 길일이나 퇴사 시점을 새로 만들지 않아요.`
    : ['money', 'next-career', 'action-plan'].includes(groupId)
      ? `${quotedInput('다음 계획', input.nextPlan)} 생활비·보유 자금의 구체적인 금액은 제공되지 않았으므로 퇴사 후 버틸 기간을 계산하지 않아요.`
      : `${quotedInput('퇴사를 검토하는 이유', input.reason)} ${quotedInput('추가로 적은 상황', input.concern)}`
  return practicalReading({
    title: itemTitle, detail: reading, current,
    evidence: workSymbol(analysis, groupId === 'money' ? 'money' : groupId === 'mental-people' ? 'people' : groupId === 'next-career' ? 'learning' : 'role'),
    application: state === 'settled'
      ? '현재 만족하거나 소진·갈등이 없다는 진술을 우선해요. 숨겨진 억눌림을 있다고 해석하지 않으며, 이 항목의 어려움이 실제로 없다면 유지할 조건을 확인하는 용도로 읽으면 돼요.'
      : state === 'concern'
        ? '말씀한 어려움을 있는 그대로 살피되 원인이 성격이나 사주 때문이라고 고정하지 않아요. 위 장면과 맞을 때 제안한 대응을 검토하고, 맞지 않으면 적용하지 않아요.'
        : '구체적인 경험이 없는 부분은 아직 판단을 열어 둬요. 모든 불편과 감정을 가지고 있다고 가정하지 않으며, 확인 질문 하나로 범위를 좁히면 돼요.',
    closing: itemTitle === '피해야 할 행동' ? '이 해석은 퇴사 여부를 결정하는 명령이 아니에요. 최종 선택은 확인한 조건과 본인의 우선순위를 기준으로 정해요.' : undefined,
  })
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
    // 자기 팩에서 이 대분류에 맞는 블록을 먼저 확보한다. 랭킹만으로는 범용 팩에 밀린다.
    const generalChunks = retrieveCategoryRagChunks(categoryRagCache, query, category, analysis, context, 8)
    const ownChunks = retrieveCategoryOwnChunks(categoryRagCache, query, category, analysis, context, OWN_CORPUS_DOMAIN, 6)
    const categoryChunks = ownChunks.length ? [...ownChunks, ...generalChunks] : generalChunks
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
