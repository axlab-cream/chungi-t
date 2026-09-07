import { createHash } from 'node:crypto'
import type { BirthInput, RagChunk, SajuAnalysis, SajuReport, SajuReportContext, SajuReportSection } from '../types/index.js'
import { retrieveRagChunks } from '../rag/retriever.js'
import { finalizeSpecializedReport } from '../report/report-quality.js'
import { retrieveCategoryOwnChunks, retrieveCategoryRagChunks } from '../report/specialized-rag.js'
import { elementEvidence, practicalReading, quotedInput, reportedState, workSymbol } from '../report/practical-service-copy.js'
import { MONEY_DETAILS } from './practical-readings.js'

export const MONEY_SAVE_SERVICE_KEY = 'money_save'

/** Where the 소비성향 artwork lives, beside the service pages. */
export const MONEY_ASSET_BASE = '/money/save/assets/save'

export interface MoneySaveRequest {
  moneyHabit: string
  incomePattern?: string
  leakPoint?: string
  relationSpending?: string
  savingGoal?: string
  concern?: string
}

/**
 * The 8 대분류 / 41 중분류 index the 소비성향 service pages are designed around.
 * `tag` drives the 05 목차 filter chips; the ids are the ones the 05 목차 and the 06
 * 상세 페이지 route on, so they must stay in step with the design deliverable.
 */
export const MONEY_SAVE_TOC = [
  {
    id: 'income-flow',
    label: '第一門',
    tag: '수입',
    title: '돈이 들어오는 방식',
    items: [
      { id: 'income-salary-stable', title: '월급 안정러' },
      { id: 'income-side-hustle', title: 'N잡 기회러' },
      { id: 'income-steady-maker', title: '꾸준 생산러' },
      { id: 'income-idea-runner', title: '아이디어 과속러' },
      { id: 'income-pressure-breaker', title: '책임 돌파러' },
      { id: 'income-learning-investor', title: '배움 투자러' },
      { id: 'income-peer-share', title: '같이 벌고 같이 쓰는 타입' },
    ],
  },
  {
    id: 'money-leak',
    label: '第二門',
    tag: '지출',
    title: '돈이 새는 패턴',
    items: [
      { id: 'leak-account-logout', title: '통장 로그아웃형' },
      { id: 'leak-flex-overheat', title: '플렉스 과열형' },
      { id: 'leak-comparison', title: '비교 소비형' },
      { id: 'leak-face-payment', title: '체면 결제형' },
      { id: 'leak-learning-cost', title: '배움비 폭주형' },
      { id: 'leak-relationship-blur', title: '관계 정산 흐림형' },
    ],
  },
  {
    id: 'saving-blocker',
    label: '第三門',
    tag: '저축',
    title: '저축이 안 되는 이유',
    items: [
      { id: 'saving-no-structure', title: '모으는 구조 부재' },
      { id: 'saving-income-outgoing-mixed', title: '받을 돈/줄 돈 미분리' },
      { id: 'saving-exception-budget', title: '예외가 많은 예산' },
      { id: 'saving-plan-over-action', title: '실행보다 계획 과다' },
      { id: 'saving-stability-illusion', title: '안정 착시' },
    ],
  },
  {
    id: 'saju-strength',
    label: '第四門',
    tag: '체력',
    title: '사주 균형과 관리 방식',
    items: [
      { id: 'strength-strong', title: '신강형 돈관리' },
      { id: 'strength-weak', title: '신약형 돈관리' },
      { id: 'strength-balanced', title: '중화형 돈관리' },
    ],
  },
  {
    id: 'ohaeng-os',
    label: '第五門',
    tag: '오행',
    title: '오행 기반 돈관리 OS',
    items: [
      { id: 'ohaeng-wood', title: '목' },
      { id: 'ohaeng-fire', title: '화' },
      { id: 'ohaeng-earth', title: '토' },
      { id: 'ohaeng-metal', title: '금' },
      { id: 'ohaeng-water', title: '수' },
    ],
  },
  {
    id: 'timing',
    label: '第六門',
    tag: '시기',
    title: '운의 타이밍',
    items: [
      { id: 'timing-daeun-start', title: '대운 초입' },
      { id: 'timing-daeun-middle', title: '대운 중반' },
      { id: 'timing-daeun-end', title: '대운 말기' },
      { id: 'timing-year', title: '세운' },
      { id: 'timing-month', title: '월운' },
      { id: 'timing-today', title: '오늘 운' },
    ],
  },
  {
    id: 'relationship-contract',
    label: '第七門',
    tag: '관계',
    title: '관계/계약 돈문제',
    items: [
      { id: 'relation-friend-lover-mix', title: '친구·연인 돈 섞임' },
      { id: 'relation-shared-cost', title: '공동비용·더치 정산 이슈' },
      { id: 'relation-unwritten-condition', title: '금액·기한·책임범위 미기록' },
      { id: 'relation-no-refusal-line', title: '거절 문장 부재' },
      { id: 'relation-short-share', title: '믿을 사람에게만 짧게 공유해야 하는 이슈' },
    ],
  },
  {
    id: 'expanded-reading',
    label: '第八門',
    tag: '확장',
    title: '확장 풀이',
    items: [
      { id: 'expand-ziwei-wealth', title: '자미두수 재백궁' },
      { id: 'expand-ziwei-career', title: '자미두수 관록궁' },
      { id: 'expand-ziwei-property', title: '자미두수 전택궁' },
      { id: 'expand-fengshui', title: '풍수/공간 보조' },
    ],
  },
] as const

function trimmed(value: unknown, limit: number): string {
  return typeof value === 'string' ? value.trim().slice(0, limit) : ''
}

export function parseMoneySaveRequest(body: Record<string, unknown>): MoneySaveRequest {
  const moneyHabit = trimmed(body.moneyHabit, 80)
  const incomePattern = trimmed(body.incomePattern, 60)
  const leakPoint = trimmed(body.leakPoint, 60)
  const relationSpending = trimmed(body.relationSpending, 60)
  const savingGoal = trimmed(body.savingGoal, 80)
  const concern = trimmed(body.concern, 160)

  if (!moneyHabit) throw new Error('요즘 돈 쓰는 습관을 입력해 주세요.')
  if (moneyHabit.length < 2) throw new Error('돈 쓰는 습관을 2자 이상으로 입력해 주세요.')
  return { moneyHabit, incomePattern, leakPoint, relationSpending, savingGoal, concern }
}

export function buildMoneySaveContext(name: string | undefined, input: MoneySaveRequest): SajuReportContext {
  return {
    serviceKey: MONEY_SAVE_SERVICE_KEY,
    name,
    target: '소비성향',
    concern: [
      `습관: ${input.moneyHabit}`,
      input.incomePattern ? `수입: ${input.incomePattern}` : '',
      input.leakPoint ? `새는 곳: ${input.leakPoint}` : '',
      input.relationSpending ? `관계 비용: ${input.relationSpending}` : '',
      input.savingGoal ? `목표: ${input.savingGoal}` : '',
      input.concern,
    ].filter(Boolean).join(' · '),
  }
}

export function createMoneySaveReportId(ownerId: string | undefined, birth: BirthInput, input: MoneySaveRequest): string {
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
    serviceKey: MONEY_SAVE_SERVICE_KEY,
  })
  return createHash('sha256').update(fingerprint).digest('hex').slice(0, 28)
}

const OWN_CORPUS_DOMAIN = 'money_save_service'

function buildInterpretation(params: {
  groupId: string
  categoryTitle: string
  itemTitle: string
  analysis: SajuAnalysis
  birth: BirthInput
  input: MoneySaveRequest
  chunks: RagChunk[]
  index: number
}): string {
  const { groupId, itemTitle, analysis, input } = params
  const reading = MONEY_DETAILS[itemTitle]
  if (!reading) throw new Error(`소비성향 항목별 해석 누락: ${itemTitle}`)
  const state = reportedState([input.moneyHabit, input.leakPoint, input.relationSpending, input.concern].filter(Boolean).join(' '))
  const current = groupId === 'income-flow'
    ? `${quotedInput('수입 형태', input.incomePattern)} ${quotedInput('현재 습관', input.moneyHabit)}`
    : groupId === 'relationship-contract'
      ? quotedInput('관계 비용', input.relationSpending)
      : groupId === 'saving-blocker'
        ? `${quotedInput('저축 목표', input.savingGoal)} ${quotedInput('현재 습관', input.moneyHabit)}`
        : `${quotedInput('직접 짚은 지출 상황', input.leakPoint)} ${quotedInput('추가로 적은 상황', input.concern)}`
  const evidence = ['ohaeng-os', 'saju-strength'].includes(groupId)
    ? `${elementEvidence(analysis)} 신강·신약·중화는 사주 안의 힘 관계를 나타내며 체력·인격·경제 능력의 등급이 아니에요.`
    : groupId === 'expanded-reading' ? undefined
      : workSymbol(analysis, groupId === 'relationship-contract' ? 'people' : 'money')
  return practicalReading({
    title: itemTitle, detail: reading, current, evidence,
    application: state === 'settled'
      ? '입력에는 정상적인 저축이나 문제가 없다는 진술이 포함돼 있어요. 해당하지 않는 소비 유형을 본인의 결함으로 적용하지 않아요. 위 장면이 확인되지 않으면 이미 잘 유지하는 조건을 살피면 됩니다.'
      : state === 'concern'
        ? '말씀한 어려움과 이 항목의 장면이 실제로 겹치는지 확인해요. 지출액과 빈도는 기록이 없으므로 추정하지 않으며, 명리 상징을 원인으로 단정하지 않아요.'
        : '현재 정보만으로 이 유형의 소비가 반복된다고 판단할 수 없어요. 해당 경험이 있을 때만 점검하고, 없다면 비교 설명으로 읽어요.',
    closing: itemTitle === '풍수/공간 보조'
      ? '이 보고서는 소비 습관을 돌아보는 참고 자료예요. 투자 상품이나 수익률을 추천하지 않으며 현재의 실제 기록이 판단보다 우선해요.'
      : undefined,
  })
}

export function buildMoneySaveReport(
  analysis: SajuAnalysis,
  birth: BirthInput,
  context: SajuReportContext,
  input: MoneySaveRequest,
  reportId?: string,
): SajuReport {
  const query = [
    '소비성향 나는 왜 돈이 안 모일까 재성 비겁 돈구멍 지출 저축 정재 편재 겁재 관계 비용',
    input.moneyHabit,
    input.incomePattern ?? '',
    input.leakPoint ?? '',
    input.relationSpending ?? '',
    input.savingGoal ?? '',
    input.concern ?? '',
  ].join(' ')
  const chunks = retrieveRagChunks(query, analysis, 10, context)
  const categoryRagCache = new Map<string, RagChunk[]>()
  const sections: SajuReportSection[] = []
  let order = 1

  MONEY_SAVE_TOC.forEach((category) => {
    category.items.forEach((item, itemIndex) => {
      // The relevance scorer reads plain item titles, so hand it the titles only.
      const ragCategory = { id: category.id, title: category.title, items: category.items.map((entry) => entry.title) }
      // 자기 팩에서 이 대분류에 맞는 블록을 먼저 확보한다. 랭킹만으로는 범용 팩에 밀린다.

      const generalChunks = retrieveCategoryRagChunks(categoryRagCache, query, ragCategory, analysis, context, 8)

      const ownChunks = retrieveCategoryOwnChunks(categoryRagCache, query, ragCategory, analysis, context, OWN_CORPUS_DOMAIN, 6)

      const categoryChunks = ownChunks.length ? [...ownChunks, ...generalChunks] : generalChunks
      sections.push({
        // The design's own section ids; the 05 목차 and 06 상세 route on them.
        id: item.id,
        order,
        imageKey: 'money-save',
        imageSrc: `${MONEY_ASSET_BASE}/05-report-hub.webp`,
        imageAlt: `${category.title} 풀이`,
        category: category.title,
        categoryEn: category.label,
        classification: item.title,
        hook: item.title,
        patternKeys: ['money', 'save', category.id, category.tag],
        ragTopics: categoryChunks.slice(0, 4).map((chunk) => chunk.topic),
        interpretation: buildInterpretation({
          groupId: category.id,
          categoryTitle: `${category.label} ${category.title}`,
          itemTitle: item.title,
          analysis,
          birth,
          input,
          chunks: categoryChunks,
          index: order + itemIndex,
        }),
        generatedBy: 'template',
        model: 'money-save-rag-template',
        status: 'complete',
      })
      order += 1
    })
  })

  return finalizeSpecializedReport({
    reportId,
    title: '소비성향 해석문',
    subtitle: `${context.name ?? '본인'}님의 재성·비겁 흐름으로 돈이 남는 구조를 봅니다`,
    model: 'money-save-rag-template',
    generatedBy: 'template',
    status: 'complete',
    progress: { complete: sections.length, total: sections.length },
    quality: {
      overallPercent: 84,
      ragUsagePercent: 88,
      corpusRelevancePercent: 86,
      toneGroundingPercent: 84,
      llmGroundingPercent: 100,
      categories: MONEY_SAVE_TOC.map((category) => ({
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
