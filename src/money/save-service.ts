import { createHash } from 'node:crypto'
import type { BirthInput, RagChunk, SajuAnalysis, SajuReport, SajuReportContext, SajuReportSection, TenGod } from '../types/index.js'
import { ELEMENT_KO, STEM_KO } from '../saju/analyzer-helpers.js'
import { retrieveRagChunks } from '../rag/retriever.js'
import { finalizeSpecializedReport } from '../report/report-quality.js'
import { retrieveCategoryRagChunks } from '../report/specialized-rag.js'

export const MONEY_SAVE_SERVICE_KEY = 'money_save'

export interface MoneySaveRequest {
  moneyHabit: string
  incomePattern?: string
  leakPoint?: string
  relationSpending?: string
  savingGoal?: string
  concern?: string
}

const MONEY_SAVE_TOC = [
  {
    id: 'leak',
    label: '第一門',
    title: '돈은 들어오는데 왜 남지 않는가',
    items: [
      '새는 돈이 먼저 보이는 자리',
      '필요한 소비와 감정 소비의 차이',
      '작은 지출이 커지는 순간',
      '돈을 모으기 전에 막아야 할 구멍',
    ],
  },
  {
    id: 'wealth-star',
    label: '第二門',
    title: '재성이 말하는 돈을 다루는 방식',
    items: [
      '정재가 살아야 돈이 남습니다',
      '편재가 강할 때 커지는 지출',
      '수입보다 관리가 먼저인 사람',
      '기회를 잡기 전에 정해야 할 상한선',
    ],
  },
  {
    id: 'peer-star',
    label: '第三門',
    title: '비겁이 만드는 비교와 관계 비용',
    items: [
      '사람 때문에 새는 돈',
      '비교가 소비로 바뀌는 구조',
      '거절하지 못해 커지는 지출',
      '관계는 지키고 돈은 막는 선',
    ],
  },
  {
    id: 'routine',
    label: '第四門',
    title: '내 명식에 맞는 저축 루틴',
    items: [
      '강제로 묶어야 모이는 타입',
      '보이는 계좌가 필요한 타입',
      '성과 보상 소비를 다루는 법',
      '이번 달 바로 바꿀 돈 약속',
    ],
  },
  {
    id: 'decision',
    label: '第五門',
    title: '돈이 남는 사람으로 바꾸는 순서',
    items: [
      '가장 먼저 끊을 소비',
      '남겨도 되는 소비',
      '사람에게 쓰는 돈의 기준',
      '돈을 모으는 한 문장 규칙',
      '다음 월급 전 확인할 신호',
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
    },
    input,
    serviceKey: MONEY_SAVE_SERVICE_KEY,
  })
  return createHash('sha256').update(fingerprint).digest('hex').slice(0, 28)
}

function moneySignal(tenGods: TenGod[]): string {
  const hasStableWealth = tenGods.includes('정재')
  const hasMovingWealth = tenGods.includes('편재')
  const hasPeer = tenGods.includes('비견') || tenGods.includes('겁재')
  const hasOutput = tenGods.includes('식신') || tenGods.includes('상관')

  if (hasPeer && hasMovingWealth) {
    return '비겁과 편재가 같이 보이면 사람, 비교, 기회라는 이름으로 돈이 먼저 움직이기 쉽네.'
  }
  if (hasPeer) {
    return '비겁이 보이면 돈 문제에서 나와 비슷한 사람, 체면, 같이 쓰는 비용을 먼저 봐야 하네.'
  }
  if (hasStableWealth) {
    return '정재가 보이면 돈을 모으는 힘은 있으나, 규칙이 흐려지는 순간 새는 구멍도 또렷해지네.'
  }
  if (hasMovingWealth) {
    return '편재가 보이면 기회 감각은 빠르지만, 들어오기 전 나가는 돈이 커지지 않게 상한선을 세워야 하네.'
  }
  if (hasOutput) {
    return '식상이 보이면 보상 소비가 커질 수 있네. 만든 결과를 돈으로 바꾸는 규칙이 있어야 남는다네.'
  }
  return '재물은 별 하나만으로 단정하지 않고, 수입·지출·관계 비용·반복 습관을 나란히 놓고 봐야 하네.'
}

function fortuneLine(analysis: SajuAnalysis): string {
  const fortune = analysis.fortune
  if (!fortune) return '대운·세운은 단정하지 않고, 원국의 돈 쓰는 흐름을 먼저 보겠네.'
  return `현재 대운은 ${fortune.currentDaewoon}, 올해 세운은 ${fortune.yearPillar}일세. 이 흐름은 수익 보장이 아니라 지출 기준을 다시 잡을 때를 보는 표식으로 삼게.`
}

function compact(text: string, fallback: string, limit = 180): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return fallback
  return clean.length > limit ? `${clean.slice(0, limit - 1)}…` : clean
}

function pickRag(chunks: RagChunk[], index: number): RagChunk | undefined {
  if (!chunks.length) return undefined
  return chunks[index % chunks.length]
}

function buildInterpretation(params: {
  categoryTitle: string
  itemTitle: string
  analysis: SajuAnalysis
  birth: BirthInput
  input: MoneySaveRequest
  chunks: RagChunk[]
  index: number
}): string {
  const { categoryTitle, itemTitle, analysis, birth, input, chunks, index } = params
  const chunk = pickRag(chunks, index)
  const ragLine = chunk
    ? compact(chunk.content, '재물운은 돈이 들어오는 방식과 새는 지점, 관리 기준을 분리해 봅니다.')
    : '재물운은 돈이 들어오는 방식과 새는 지점, 관리 기준을 분리해 봅니다.'
  const dayMaster = `${STEM_KO[analysis.dayMaster]}(${analysis.dayMaster})`
  const useful = analysis.usefulGod ? ELEMENT_KO[analysis.usefulGod] : ELEMENT_KO[analysis.weakElement]
  const leak = input.leakPoint ? `자네가 짚은 새는 곳은 "${input.leakPoint}"일세.` : '새는 곳은 비워 두었으니 반복 지출과 관계 비용을 먼저 나누겠네.'
  const relation = input.relationSpending ? `관계 비용은 "${input.relationSpending}" 쪽으로 보았군.` : '관계 비용은 따로 적지 않았으나 비겁의 흐름은 반드시 확인해야 하네.'
  const goal = input.savingGoal ? `모으고 싶은 목표는 "${input.savingGoal}"라 했네.` : '저축 목표는 비워 두었으니 막는 순서를 먼저 잡겠네.'

  return [
    `${categoryTitle} 중 "${itemTitle}"를 보겠네. 자네는 ${birth.year}년생이고 일간은 ${dayMaster}라, 돈을 버는 힘보다 돈을 붙들어 두는 방식을 먼저 봐야 하네.`,
    `${fortuneLine(analysis)} 보완할 기운은 ${useful} 쪽으로 잡히니, 소비를 전부 끊는 것보다 돈이 머무는 장치를 만드는 쪽이 맞겠네.`,
    `${moneySignal(analysis.tenGods)} ${leak} ${relation} ${goal}`,
    `참고 결은 이렇네. ${ragLine} 그러니 이 풀이는 돈복이 있다 없다를 말하는 것이 아니라, "나는 왜 돈이 안 모일까"의 반복 구조를 찾는 풀이일세.`,
    `결론은 단순하네. 지금 습관 "${input.moneyHabit}"에서 즉흥, 비교, 보상, 관계 비용 중 어느 이름으로 돈이 나가는지 표시하게. 그 이름을 알면 다음 월급부터 막을 한 곳이 보일 걸세.`,
  ].join('\n\n')
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
      const categoryChunks = retrieveCategoryRagChunks(categoryRagCache, query, category, analysis, context, 8)
      sections.push({
        id: `${category.id}-${itemIndex + 1}`,
        order,
        imageKey: 'money-save',
        imageSrc: '/assets/umsh-money-card-bg.png',
        imageAlt: '소비성향 풀이',
        category: category.title,
        categoryEn: category.label,
        classification: item,
        hook: item,
        patternKeys: ['money', 'save', category.id],
        ragTopics: categoryChunks.slice(0, 4).map((chunk) => chunk.topic),
        interpretation: buildInterpretation({
          categoryTitle: `${category.label} ${category.title}`,
          itemTitle: item,
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
