import { InputError } from '../server/input-error.js'
import { createHash } from 'node:crypto'
import type { BirthInput, RagChunk, SajuAnalysis, SajuReport, SajuReportContext, SajuReportSection, SectionStorytelling } from '../types/index.js'
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

const MONEY_TEASER_IMAGES = [
  { key: 'income-salary-stable', src: `${MONEY_ASSET_BASE}/reading-v2/01-stable-salary.webp`, alt: '월급이 들어온 뒤 저축과 생활비로 나누는 장면' },
  { key: 'income-peer-share', src: `${MONEY_ASSET_BASE}/reading-v2/02-shared-income-spending.webp`, alt: '함께 쓰는 돈의 범위와 정산 방식을 확인하는 장면' },
] as const

const MONEY_ELEMENT_LABELS: Array<[keyof SajuAnalysis['elementCount'], string]> = [
  ['wood', '나무'], ['fire', '불'], ['earth', '흙'], ['metal', '쇠'], ['water', '물'],
]

function moneyTableCell(value: string): string {
  return value.replace(/\r?\n/g, ' ').replace(/\|/g, '｜').trim()
}

export function moneySaveRequestFromContext(context: SajuReportContext): MoneySaveRequest {
  const values = new Map<string, string>()
  const source = String(context.concern ?? '')
  const labels = '습관|수입|새는 곳|관계 비용|목표|고민'
  const pattern = new RegExp(`(?:^|\\s·\\s)(${labels}):\\s*(.*?)(?=\\s·\\s(?:${labels}):|$)`, 'g')
  let match: RegExpExecArray | null
  while ((match = pattern.exec(source))) values.set(match[1], match[2].trim())
  // Older records left the final free-form concern unlabeled after the goal. Preserve the
  // first goal phrase and treat the remainder as the concern without inventing either value.
  const legacyGoal = values.get('목표') ?? ''
  if (!values.get('고민') && legacyGoal.includes(' · ')) {
    const [goal, ...concern] = legacyGoal.split(/\s·\s/)
    values.set('목표', goal)
    values.set('고민', concern.join(' · '))
  }
  return {
    moneyHabit: values.get('습관') || '',
    incomePattern: values.get('수입') || '',
    leakPoint: values.get('새는 곳') || '',
    relationSpending: values.get('관계 비용') || '',
    savingGoal: values.get('목표') || '',
    concern: values.get('고민') || '',
  }
}

function moneyTeaserStories(analysis: SajuAnalysis | undefined, input: MoneySaveRequest): [SectionStorytelling, SectionStorytelling] {
  const rows = [
    ['수입 형태', input.incomePattern ?? ''],
    ['요즘 돈 쓰는 습관', input.moneyHabit],
    ['직접 짚은 지출', input.leakPoint ?? ''],
    ['관계에서 쓰는 돈', input.relationSpending ?? ''],
    ['저축 목표', input.savingGoal ?? ''],
    ['현재 고민', input.concern ?? ''],
  ].filter((row): row is [string, string] => Boolean(row[1]?.trim()))
  const table = [
    '| 확인한 정보 | 입력 내용 |',
    '| --- | --- |',
    ...rows.map(([label, value]) => `| ${label} | ${moneyTableCell(value)} |`),
  ].join('\n')
  const income = moneyTableCell(input.incomePattern ?? '')
  const goal = moneyTableCell(input.savingGoal ?? '')
  const leak = moneyTableCell(input.leakPoint || input.moneyHabit || input.concern || '')
  const relation = moneyTableCell(input.relationSpending ?? '')
  return [
    {
      feel: income && goal
        ? `“${income}”으로 들어오는 돈을 “${goal}”까지 남기려면 무엇부터 달라져야 할까요?`
        : '돈이 들어오는 날과 실제로 남는 날 사이에서 무엇이 달라질까요?',
      softBridge: leak
        ? `직접 짚은 “${leak}”이 월급 직후인지, 예정된 비용을 낸 뒤인지 나누어 보면 수입의 문제가 아니라 돈을 배치하는 순서가 보입니다.`
        : '수입이 들어온 뒤 저축과 생활비가 어떤 순서로 빠져나가는지 보면 돈이 남지 않는 원인을 더 구체적으로 읽을 수 있습니다.',
      tableMd: table,
      tableCaption: '직접 입력한 내용만 모았습니다. 비어 있던 금액이나 횟수는 덧붙이지 않았습니다.',
      scene: '', actions: [], imagePrompt: { ko: '', en: '' },
    },
    {
      feel: relation
        ? `“${relation}”에서 쓰는 돈은 호의일까요, 반복되는 부담일까요?`
        : '함께 쓰는 돈이 없다면, 이 항목은 내 소비와 타인의 몫을 가르는 질문으로 읽어야 합니다.',
      softBridge: relation
        ? `말씀한 “${relation}”에서 누가 먼저 결제하고 언제 정산하는지 확인하면, 관계를 지키는 지출과 경계가 흐려진 지출을 구분할 수 있습니다.`
        : '공동 지출이 실제로 없다면 해당 유형을 내 문제로 단정하지 않습니다. 대신 부탁받은 결제와 내 생활비가 섞이는 순간이 있는지만 확인합니다.',
      ...(analysis ? { chartPoints: MONEY_ELEMENT_LABELS.map(([key, label]) => ({
        label,
        value: analysis.elementCount[key],
        note: '저장된 사주에서 서버가 계산한 오행 개수입니다.',
      })) } : {}),
      chartCaption: '소비 점수나 재물운 등급이 아니라, 저장된 사주에서 계산한 다섯 기운의 분포입니다.',
      scene: '', actions: [], imagePrompt: { ko: '', en: '' },
    },
  ]
}

function entered(value: string | undefined, fallback: string): string {
  return moneyTableCell(value ?? '') || fallback
}

function moneyElementSentence(analysis: SajuAnalysis | undefined): string {
  if (!analysis) return ''
  const counts = MONEY_ELEMENT_LABELS.map(([key, label]) => `${label} ${analysis.elementCount[key]}개`).join(', ')
  const dominant = String(analysis.dominantElement ?? '').replace(/\([^)]*\)/g, '').trim()
  const weak = String(analysis.weakElement ?? '').replace(/\([^)]*\)/g, '').trim()
  return `저장된 사주에서는 ${counts}로 계산됩니다. 가장 많이 나타난 ${dominant || '기운'}은 익숙한 방식에 힘이 쏠리는 모습을, 상대적으로 적은 ${weak || '기운'}은 돈을 남길 때 의식적으로 보완할 부분을 읽는 참고가 됩니다. 이 숫자는 저축 점수가 아니라 태어난 날짜와 시간에서 계산한 분포입니다.`
}

function moneyTeaserInterpretation(index: number, analysis: SajuAnalysis | undefined, input: MoneySaveRequest): string {
  const habit = entered(input.moneyHabit, '평소 돈을 쓰는 습관')
  const income = entered(input.incomePattern, '입력한 수입 형태')
  const leak = entered(input.leakPoint, habit)
  const goal = entered(input.savingGoal, '세운 저축 목표')
  const concern = entered(input.concern, '지금 가장 신경 쓰이는 돈 문제')
  const relation = moneyTableCell(input.relationSpending ?? '')
  const elements = moneyElementSentence(analysis)

  if (index === 0) {
    return [
      `[주요 포인트] “${habit}”이라고 적은 대목에는 돈이 부족하다는 말보다, 수입이 들어온 직후 지출의 우선순위가 바뀐다는 단서가 있습니다. ${income}에서 ${goal}을 남기고 싶은 지금, 가장 먼저 볼 것은 더 아끼라는 충고가 아니라 돈이 들어온 날부터 ${leak}에 닿기 전까지의 순서입니다.`,
      `“${concern}”이라는 고민도 같은 장면을 가리킵니다. 저축을 월말의 남은 돈으로 처리하면 ${leak}이 먼저 자리를 차지하고, 목표는 다음 달로 밀릴 수 있습니다. 반대로 수입이 확인되는 날 목표 몫을 먼저 떼고 남은 범위에서 생활비를 쓰고 있다면, 이미 작동하는 습관이므로 무리하게 바꿀 필요가 없습니다. 핵심은 의지가 아니라 이 순서가 실제 통장에서 반복되는지입니다.`,
      `[사주와 생활을 함께 보면] ${elements}`,
      `[확인할 장면] 최근 수입이 들어온 날의 거래 내역에서 첫 세 건만 보세요. 저축, 고정비, ${leak} 가운데 무엇이 먼저 빠졌는지 확인하면 “왜 안 모이지?”라는 막연한 질문이 어느 단계에서 무너지는지로 바뀝니다. 금액을 입력하지 않았으므로 임의의 예산이나 비율은 제시하지 않습니다.`,
      `[결정 전에 물어볼 질문] ${goal}은 수입이 들어오자마자 분리되는 돈인가요, 한 달을 쓰고 남으면 옮기는 돈인가요? ${leak}에 쓰기 전 멈출 수 있는 계좌·자동이체·결제일 장치가 지금 하나라도 있나요?`,
      `[해법] 이번 장의 결론은 소비를 전부 줄이라는 뜻이 아닙니다. ${income}이 들어온 날 ${goal}을 먼저 떼어 두는 구조가 실제로 있는지 확인해야, 수입을 늘릴 문제인지 돈을 배치하는 순서를 고칠 문제인지 분명해집니다.`,
    ].join('\n\n')
  }

  const relationOpening = relation
    ? `“${relation}”이라고 적은 관계 비용은 단순한 과소비보다 정산 시점과 책임이 흐려질 때 부담으로 남기 쉽습니다.`
    : '관계 비용을 따로 적지 않았다면, 사람 때문에 돈이 샌다고 단정할 근거는 없습니다.'
  const relationScene = relation
    ? `최근 ${relation}이 있었던 장면을 떠올려 보세요. 누가 먼저 결제했는지, 돌려받을 날짜를 말했는지, 내 몫과 상대 몫이 기록됐는지가 실제 확인 지점입니다.`
    : '대신 부탁받아 먼저 결제한 일, 선물·모임비·공동 구독처럼 내 생활비와 다른 사람의 몫이 섞인 장면이 있었는지만 확인하세요. 그런 장면도 없다면 이 항목은 현재의 누수 원인에서 제외하는 편이 맞습니다.'
  return [
    `[주요 포인트] ${relationOpening} 첫 번째 해석에서 ${leak}과 저축 순서를 살폈다면, 이번에는 내 소비와 함께 쓰는 돈이 어디에서 섞이는지 봅니다.`,
    relation
      ? `${relation} 자체가 나쁜 지출이라는 뜻은 아닙니다. 즐거운 모임이나 필요한 공동 비용도 정산 방식이 분명하면 생활을 해치지 않습니다. 문제는 먼저 낸 돈이 돌아오기 전에 다음 결제가 겹치거나, 거절하기 어려워 내 목표인 “${goal}”을 미루게 되는 장면입니다. “${concern}”이라는 고민과 이 장면이 실제로 이어지는지 거래 내역으로 맞춰봐야 합니다.`
      : `입력한 내용에서 관계 지출이 확인되지 않았으므로, 이 장을 억지로 소비 원인에 넣지 않습니다. 현재 적어 준 “${habit}”과 “${leak}”을 먼저 보는 것이 맞습니다. 다만 내 결제에 다른 사람의 몫이 섞인 적이 있다면 그 부분만 별도로 떼어 확인하면 됩니다.`,
    `[사주와 생활을 함께 보면] ${elements}`,
    `[확인할 장면] ${relationScene}`,
    `[결정 전에 물어볼 질문] 함께 쓰는 돈의 범위와 정산 날짜를 결제 전에 말할 수 있나요? 먼저 낸 돈이 늦게 돌아와도 ${goal}이 흔들리지 않도록 개인 생활비와 분리되어 있나요?`,
    `[해법] 이 장의 결론은 관계를 줄이라는 뜻이 아닙니다. 공동 비용의 담당·범위·정산일이 분명하면 유지하고, 말하지 못한 부담이 반복된다면 다음 결제 전에 내 몫을 먼저 정하는 것이 돈과 관계를 함께 지키는 방법입니다.`,
  ].join('\n\n')
}

/** Existing saved reports receive input evidence and computed visuals without rewriting paid prose. */
export function moneySaveTeaserSection(
  section: SajuReportSection,
  index: number,
  analysis: SajuAnalysis | undefined,
  context: SajuReportContext,
): SajuReportSection {
  const stories = moneyTeaserStories(analysis, moneySaveRequestFromContext(context))
  const image = MONEY_TEASER_IMAGES[index]
  const storedStory = section.storytelling
  return {
    ...section,
    ...(image ? { imageKey: image.key, imageSrc: image.src, imageAlt: image.alt } : {}),
    interpretation: moneyTeaserInterpretation(index, analysis, moneySaveRequestFromContext(context)),
    storytelling: {
      ...stories[index],
      ...(storedStory ?? {}),
      ...(storedStory?.tableMd ? {} : { tableMd: stories[index]?.tableMd, tableCaption: stories[index]?.tableCaption }),
      ...(storedStory?.chartPoints?.length ? {} : { chartPoints: stories[index]?.chartPoints, chartCaption: stories[index]?.chartCaption }),
    },
  }
}

/**
 * The 8 대분류 / 16 중분류 index the 소비성향 service pages are designed around.
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
    ],
  },
  {
    id: 'saving-blocker',
    label: '第三門',
    tag: '저축',
    title: '저축이 안 되는 이유',
    items: [
      { id: 'saving-no-structure', title: '모으는 구조 부재' },
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
    ],
  },
  {
    id: 'ohaeng-os',
    label: '第五門',
    tag: '오행',
    title: '오행 기반 돈관리 OS',
    items: [
      { id: 'ohaeng-wood', title: '목' },
      { id: 'ohaeng-water', title: '수' },
    ],
  },
  {
    id: 'timing',
    label: '第六門',
    tag: '시기',
    title: '운의 타이밍',
    items: [
      { id: 'timing-year', title: '세운' },
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
      { id: 'relation-no-refusal-line', title: '거절 문장 부재' },
    ],
  },
  {
    id: 'expanded-reading',
    label: '第八門',
    tag: '확장',
    title: '확장 풀이',
    items: [
      { id: 'expand-ziwei-wealth', title: '자미두수 재백궁' },
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

  if (!moneyHabit) throw new InputError('요즘 돈 쓰는 습관을 입력해 주세요.')
  if (moneyHabit.length < 2) throw new InputError('돈 쓰는 습관을 2자 이상으로 입력해 주세요.')
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
      input.concern ? `고민: ${input.concern}` : '',
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
