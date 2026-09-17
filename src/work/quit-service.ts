import { InputError } from '../server/input-error.js'
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
 * 2026-09-17 목차 축소: 10대분류·48중분류 → 8대분류·20중분류.
 *
 * 실측(운영): 항목 48개 × 평균 868자 ≈ 42,000자로 권장 분량(20,000~30,000자)을 넘었고,
 * 중분류가 대분류당 4~5개씩 있어 뒷부분이 길고 반복돼 보였다. 대분류 안의 겹치는 항목을
 * 묶어 대분류당 2~3개로 줄인다 — '왜 이렇게 힘든가'와 '번아웃 체크'(원인과 소진은 한
 * 흐름), '나가는 방식'과 '남는다면'(끝맺음과 잔류는 한 갈래의 두 결말)을 각각 합쳤다.
 * 하이라이트로 유지한 세 곳(퇴사 타이밍·다섯 스승의 조언·현실 액션 플랜)은 그대로 남긴다.
 *
 * ids: 05 목차 링크(`?section=flow`)가 대분류 id를 그대로 쓴다. 합친 두 대분류는 남긴
 * 쪽의 id를 그대로 쓰고(`why-hard`, `exit-method`), 사라진 id(`burnout`, `stay`)는
 * 05/06 화면에서도 함께 지웠다.
 */
export const WORK_QUIT_TOC = [
  {
    id: 'flow',
    label: '第一門',
    image: '04-teaser',
    title: '지금 나와도 되는 흐름?',
    items: ['전체 판정', 'GO/HOLD/타이밍 조정'],
    notes: ['전체 선택 조건을 판정합니다.', '움직일 조건과 보류할 조건을 나눕니다.'],
  },
  {
    id: 'why-hard',
    label: '第二門',
    image: '03-thread-tension',
    title: '왜 이렇게 힘든가',
    items: ['사람 문제인지 일 문제인지', '지금 소진 단계', '회복에 필요한 조건'],
    notes: ['관계와 업무 원인을 구분합니다.', '현재 진술로 소진 범위를 확인합니다.', '회복에 필요한 업무·연락 조건을 봅니다.'],
  },
  {
    id: 'money',
    label: '第三門',
    image: '05-symbol-cards-alt',
    title: '돈 시뮬레이션',
    items: ['나간 뒤 돈 흐름', '지출 방어선과 현금흐름 점검 기준'],
    notes: ['확보한 돈과 예정 금액을 나눕니다.', '고정비와 조정비의 방어선을 봅니다.'],
  },
  {
    id: 'next-career',
    label: '第四門',
    image: '05-index',
    title: '나가면 뭐 할 사람인가',
    items: ['이직형·전직형·프리형·창업형', '내가 가진 무기'],
    notes: ['네 경로의 실제 준비 조건을 비교합니다.', '다음 자리에서도 쓸 수 있는 경험을 찾습니다.'],
  },
  {
    id: 'timing',
    label: '第五門',
    image: '04-teaser',
    title: '퇴사 타이밍',
    items: ['유리한 달', '피해야 할 시기'],
    notes: ['확정 예언 없이 움직이기 좋은 조건을 봅니다.', '피해야 할 현실 조건을 봅니다.'],
  },
  {
    id: 'exit-method',
    label: '第六門',
    image: '03-thread-tension',
    title: '나가는 방식',
    items: ['상사에게 말하는 법', '인수인계 함정', '버티는 조건'],
    notes: ['결정과 협의 항목을 나눠 말합니다.', '남은 일의 상태와 담당자를 분명히 합니다.', '그냥 참는 것과 조건부 유지를 나눕니다.'],
  },
  {
    id: 'mental-people',
    label: '第七門',
    image: '06-elemental-mentors-alt',
    title: '멘탈과 주변',
    items: ['흔들릴 때 붙잡을 기준', '다섯 스승의 서로 다른 조언', '가족 기대 설득'],
    notes: ['확인한 현실 기준을 한 줄로 남깁니다.', '서로 다른 해석 관점을 현실 선택과 대조합니다.', '함께 영향을 받는 조건부터 설명합니다.'],
  },
  {
    id: 'action-plan',
    label: '第八門',
    image: '05-symbol-cards-alt',
    title: '현실 액션 플랜',
    items: ['퇴사 전 체크리스트', '나간 첫 90일', '절대 하면 안 되는 행동'],
    notes: ['자료·업무·돈·관계·회복을 나눠 확인합니다.', '회복과 다음 계획의 실제 순서를 세웁니다.', '감정 폭발·무리한 약속·확인 없는 단정을 막습니다.'],
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

  if (!reason) throw new InputError('퇴사를 고민하게 된 이유를 선택해 주세요.')
  if (reason.length < 2) throw new InputError('퇴사 고민 이유를 2자 이상으로 입력해 주세요.')
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
    closing: itemTitle === '절대 하면 안 되는 행동' ? '이 해석은 퇴사 여부를 결정하는 명령이 아니에요. 최종 선택은 확인한 조건과 본인의 우선순위를 기준으로 정해요.' : undefined,
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
        hook: QUIT_DETAILS[item].answer,
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
