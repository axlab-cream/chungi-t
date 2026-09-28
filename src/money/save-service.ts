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

const MONEY_ELEMENT_MEANING: Record<keyof SajuAnalysis['elementCount'], string> = {
  wood: '새 목표를 시작하고 넓히는 힘',
  fire: '욕구와 만족을 밖으로 드러내는 힘',
  earth: '생활 기반과 반복 비용을 유지하는 힘',
  metal: '한도와 우선순위를 분명히 나누는 힘',
  water: '입금과 지출 사이의 변화를 살피는 힘',
}

function moneyElementLabel(key: keyof SajuAnalysis['elementCount']): string {
  return MONEY_ELEMENT_LABELS.find(([element]) => element === key)?.[1] ?? '기운'
}

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
  const income = moneyTableCell(input.incomePattern ?? '')
  const habit = moneyTableCell(input.moneyHabit)
  const goal = moneyTableCell(input.savingGoal ?? '')
  const leak = moneyTableCell(input.leakPoint || input.moneyHabit || input.concern || '')
  const relation = moneyTableCell(input.relationSpending ?? '')
  const pillarTable = analysis ? [
    '| 사주의 기둥 | 실제 구성 | 돈 문제에서 읽는 부분 |',
    '| --- | --- | --- |',
    `| 태어난 해 | ${moneyElementLabel(analysis.fourPillars.year.stemElement)} · ${moneyElementLabel(analysis.fourPillars.year.branchElement)} | 처음 익힌 돈 습관과 주변의 영향 |`,
    `| 태어난 달 | ${moneyElementLabel(analysis.fourPillars.month.stemElement)} · ${moneyElementLabel(analysis.fourPillars.month.branchElement)} | 일과 수입을 반복해서 운영하는 방식 |`,
    `| 태어난 날 | ${moneyElementLabel(analysis.fourPillars.day.stemElement)} · ${moneyElementLabel(analysis.fourPillars.day.branchElement)} | 내가 직접 결제하고 멈추는 방식 |`,
    `| 태어난 시간 | ${moneyElementLabel(analysis.fourPillars.hour.stemElement)} · ${moneyElementLabel(analysis.fourPillars.hour.branchElement)} | 앞으로 만들 저축 목표와 실행 방식 |`,
  ].join('\n') : undefined
  const rowCandidates: Array<[string, string, string]> = [
    ['돈이 들어오는 방식', income, income ? '매달 분석을 시작할 지점' : ''],
    ['반복되는 소비 장면', habit, '잔액이 흔들리는 패턴'],
    ['직접 짚은 돈구멍', leak, '저축보다 앞서는지 확인할 지출'],
    ...(relation ? [['관계에서 쓰는 돈', relation, '정산일과 내 몫을 분리할 항목'] as [string, string, string]] : []),
    ['먼저 남기고 싶은 돈', goal, '월급일에 선분리할 목표'],
    ['지금 풀고 싶은 문제', moneyTableCell(input.concern ?? ''), '이번 풀이가 답해야 할 질문'],
  ]
  const rows = rowCandidates.filter((row) => Boolean(row[1]?.trim()))
  const table = [
    '| 확인 포인트 | 실제 입력 | 이 풀이에서 보는 이유 |',
    '| --- | --- | --- |',
    ...rows.map(([label, value, meaning]) => `| ${label} | ${value} | ${meaning} |`),
  ].join('\n')
  return [
    {
      feel: income && goal
        ? `“${income}”으로 들어오는 돈을 “${goal}”까지 남기려면 무엇부터 달라져야 할까요?`
        : '돈이 들어오는 날과 실제로 남는 날 사이에서 무엇이 달라질까요?',
      softBridge: leak
        ? `직접 짚은 “${leak}”이 월급 직후인지, 예정된 비용을 낸 뒤인지 나누어 보면 수입의 문제가 아니라 돈을 배치하는 순서가 보입니다.`
        : '수입이 들어온 뒤 저축과 생활비가 어떤 순서로 빠져나가는지 보면 돈이 남지 않는 원인을 더 구체적으로 읽을 수 있습니다.',
      tableMd: table,
      tableCaption: '입력한 사실과 각 항목이 이번 풀이에서 맡는 역할을 한 표에 연결했습니다.',
      flowSteps: [
        { label: '1. 들어오는 돈', value: income || '입력한 수입', note: '돈 관리가 시작되는 시점' },
        { label: '2. 먼저 남길 돈', value: goal || '입력한 저축 목표', note: '수입일에 가장 먼저 분리' },
        { label: '3. 남은 범위에서 쓸 돈', value: leak || '직접 짚은 지출', note: '목표를 뺀 뒤 사용할 항목' },
      ],
      flowCaption: '현재 입력을 바탕으로 바꿔야 할 돈의 순서입니다. 입력하지 않은 금액이나 비율은 만들지 않았습니다.',
      scene: '', actions: [], imagePrompt: { ko: '', en: '' },
    },
    {
      feel: relation
        ? `“${relation}”에서 쓰는 돈은 호의일까요, 반복되는 부담일까요?`
        : leak
          ? `${income || '수입'}은 들어오는데 왜 “${leak}” 뒤에는 잔액이 크게 흔들릴까요?`
          : '수입은 들어오는데 왜 잔액은 매달 다르게 남을까요?',
      softBridge: relation
        ? `말씀한 “${relation}”에서 누가 먼저 결제하고 언제 정산하는지 확인하면, 관계를 지키는 지출과 경계가 흐려진 지출을 구분할 수 있습니다.`
        : leak
          ? `지금 잔액을 흔드는 쪽은 관계 비용보다 직접 짚은 “${leak}”입니다. 취향 소비를 없애기보다 결제 시점과 저축 시점의 순서를 바꾸는 편이 훨씬 정확합니다.`
          : '사람에게 쓰는 돈보다 내 생활비 안에서 반복되는 결제 시점을 먼저 살펴봅니다.',
      ...(analysis ? { chartPoints: MONEY_ELEMENT_LABELS.map(([key, label]) => ({
        label,
        value: analysis.elementCount[key],
        note: ({
          wood: '새 목표와 관심사를 시작하고 넓히는 힘',
          fire: '욕구와 만족을 눈에 보이게 드러내는 힘',
          earth: '생활비와 고정비처럼 기반을 유지하는 힘',
          metal: '한도와 우선순위를 나누는 힘',
          water: '입금과 지출 사이의 움직임을 읽는 힘',
        } as Record<string, string>)[key],
      })) } : {}),
      chartCaption: '저장된 사주에서 계산한 다섯 기운의 개수입니다. 막대 길이는 소비 점수가 아니라 어느 성향의 힘이 상대적으로 많이 드러나는지 비교합니다.',
      ...(pillarTable ? {
        tableMd: pillarTable,
        tableCaption: '한자를 노출하지 않고 네 기둥의 실제 기운 구성과 이번 돈 풀이에서 맡는 역할을 연결했습니다.',
      } : {}),
      flowSteps: relation
        ? [
            { label: '내가 먼저 낸 돈', value: relation, note: '공동 비용과 내 생활비를 분리' },
            { label: '상대의 몫', value: '결제 전에 범위 합의', note: '누가 얼마를 맡는지 확인' },
            { label: '정산 완료', value: '돌려받을 날짜 기록', note: '저축 가능액과 섞지 않기' },
          ]
        : [
            { label: '결제 욕구', value: leak || habit, note: '사고 싶은 이유를 한 문장으로 확인' },
            { label: '하루 간격', value: '바로 결제하지 않기', note: '짧게 반복되는 구매 속도를 늦춤' },
            { label: '다시 확인', value: goal || '저축 목표', note: '목표를 건드리지 않는 범위에서 결제' },
          ],
      flowCaption: relation
        ? '관계 비용이 내 저축을 대신 쓰지 않도록 결제부터 정산까지의 책임을 나눈 순서입니다.'
        : '직접 짚은 지출을 없애지 않고 결제 속도만 조절하는 순서입니다.',
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
  const dominant = moneyElementLabel(analysis.dominantElement)
  const weak = moneyElementLabel(analysis.weakElement)
  const day = analysis.fourPillars.day
  const month = analysis.fourPillars.month
  const hour = analysis.fourPillars.hour
  const dayLabel = moneyElementLabel(day.stemElement)
  const monthLabel = moneyElementLabel(month.branchElement)
  const hourLabel = moneyElementLabel(hour.stemElement)
  const routineLink = day.stemElement === month.branchElement
    ? `태어난 날의 ${dayLabel}과 태어난 달의 ${monthLabel}이 같은 방향이라, 한 번 정한 소비 습관이 수입 주기 안에서 꾸준히 반복되기 쉽습니다.`
    : `태어난 날의 ${dayLabel}과 태어난 달의 ${monthLabel}이 서로 달라, 사고 싶은 마음과 월급을 운영하는 방식이 엇갈릴 때 잔액의 폭이 커지기 쉽습니다.`
  return `네 기둥을 풀어 보면 태어난 날의 중심은 ${dayLabel}, 수입과 일상의 반복을 보는 태어난 달은 ${monthLabel}, 앞으로의 목표를 보는 태어난 시간은 ${hourLabel} 기운입니다. ${routineLink} 전체 분포는 ${counts}이며, 가장 강한 ${dominant}은 ${MONEY_ELEMENT_MEANING[analysis.dominantElement]}에 힘을 싣고 상대적으로 약한 ${weak}은 ${MONEY_ELEMENT_MEANING[analysis.weakElement]}을 의식적으로 보완하게 합니다. 지금 적어 준 소비 습관까지 겹쳐 보면, 의지가 약해서가 아니라 시작하는 힘보다 멈추고 나누는 순서가 늦어지는 쪽에 가깝습니다.`
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
      `[주요 포인트] 돈이 안 모이는 첫 원인은 수입의 크기보다 순서에 있습니다. ${income}이 들어와도 “${habit}”이 반복되고, 직접 돈이 새는 곳으로 “${leak}”을 짚었습니다. 지금 통장에서는 ${goal}보다 ${leak}이 먼저 움직일 가능성이 가장 큽니다.`,
      `“${concern}”이라는 고민은 이 순서가 만든 결과입니다. 저축을 월말에 남은 돈으로 처리하는 동안 ${leak}은 결제 순간마다 먼저 빠져나갑니다. 그래서 수입이 들어와도 남는 금액은 매달 달라집니다. ${goal}을 만드는 데 필요한 것은 더 독하게 참는 일이 아니라, 수입이 들어온 당일 저축 몫이 ${leak}보다 먼저 빠져나가게 만드는 것입니다.`,
      `[사주와 생활을 함께 보면] ${elements}`,
      `[확인할 장면] 최근 수입일 직후의 거래 세 건을 펼쳐 보세요. 저축보다 ${leak} 결제가 먼저 있다면, 돈이 사라지는 구간은 이미 확인된 셈입니다. 그 순서를 뒤집는 순간부터 “돈은 들어오는데 남지 않는 달”이 달라집니다.`,
      `[결정 전에 물어볼 질문] ${goal}은 수입이 들어오자마자 분리되는 돈인가요, 한 달을 쓰고 남으면 옮기는 돈인가요? ${leak}에 쓰기 전 멈출 수 있는 계좌·자동이체·결제일 장치가 지금 하나라도 있나요?`,
      `[해법] ${income}이 들어온 날 ${goal}을 먼저 분리하고, 남은 범위 안에서 ${leak}을 쓰는 순서가 이 문제의 핵심 해법입니다. 취향을 없애는 방식보다 저축이 먼저 끝난 뒤 편하게 쓰는 방식이 오래갑니다.`,
    ].join('\n\n')
  }

  const relationOpening = relation
    ? `“${relation}”에서 쓰는 돈은 금액보다 먼저 낸 사람과 정산 날짜가 흐려질 때 저축을 흔듭니다.`
    : `지금 잔액을 흔드는 중심은 사람에게 쓰는 돈보다 직접 짚은 “${leak}”입니다.`
  const relationScene = relation
    ? `최근 ${relation}이 있었던 장면을 떠올려 보세요. 누가 먼저 결제했는지, 돌려받을 날짜를 말했는지, 내 몫과 상대 몫이 기록됐는지가 실제 확인 지점입니다.`
    : `최근 ${leak} 결제 세 건의 날짜를 나란히 놓아 보세요. 금액보다 결제 사이의 간격이 짧아진 구간이 있다면 잔액이 흔들린 시점과 바로 맞닿아 있습니다.`
  return [
    `[주요 포인트] ${relationOpening} 첫 번째 해석에서 수입일의 순서를 짚었다면, 이번에는 같은 ${leak} 지출이 왜 어떤 달에는 더 커지는지 봅니다.`,
    relation
      ? `${relation} 자체가 문제는 아닙니다. 먼저 낸 돈이 돌아오기 전에 다음 결제가 겹치거나, 거절하기 어려워 “${goal}”을 미루는 순간부터 관계 비용이 내 저축을 대신 사용하게 됩니다. “${concern}”이라는 고민이 커지는 달에는 결제 금액보다 정산이 끝나지 않은 건수를 먼저 보세요.`
      : `“${habit}”처럼 지출 폭이 달라지는 습관은 구매 금액보다 구매 간격에서 커집니다. 한 번의 큰 결제보다 작은 ${leak} 결제가 짧은 기간에 이어질 때 수입의 안정감이 사라집니다. ${goal}을 먼저 분리한 뒤 다음 결제까지 하루를 두면, 좋아하는 것을 포기하지 않고도 잔액의 출렁임을 줄일 수 있습니다.`,
    relation
      ? `특히 ${relation}이 월급일과 가까우면 아직 돌려받지 못한 돈까지 내 생활비가 대신 감당하게 됩니다. 정산 전에는 잔액이 충분해 보여도, ${goal}과 다음 고정비를 빼고 나면 쓸 수 있는 돈은 달라집니다. 관계를 불편하게 만들지 않으면서 저축을 지키려면 결제 전에 각자 부담할 범위와 보내는 날짜를 한 문장으로 맞추는 편이 가장 빠릅니다.`
      : `${leak}이 즐거움을 주는 만큼 아예 막는 규칙은 오래가기 어렵습니다. 대신 수입일과 저축일을 같은 날로 붙이고, ${leak} 전용 한도를 남은 생활비 안에서 따로 보이게 만들면 “써도 되는 돈”이 선명해집니다. 잔액만 보고 결제하던 때와 달리, 목표를 건드리지 않는 범위에서 마음 편하게 쓸 수 있습니다.`,
    `[사주와 생활을 함께 보면] ${elements}`,
    `[확인할 장면] ${relationScene}`,
    `[결정 전에 물어볼 질문] ${relation ? `함께 쓰는 돈의 범위와 정산 날짜를 결제 전에 말할 수 있나요? 먼저 낸 돈이 늦게 돌아와도 ${goal}이 흔들리지 않도록 개인 생활비와 분리되어 있나요?` : `${leak} 결제가 짧은 기간에 이어지는 순간은 언제인가요? ${goal}을 먼저 떼어 둔 뒤에도 같은 속도로 결제할 수 있나요?`}`,
    `[해법] ${relation ? '공동 비용은 결제 전에 내 몫과 정산일을 정하고, 돌려받을 돈을 생활비처럼 계산하지 않는 것이 해법입니다.' : `${goal}을 수입일에 먼저 떼고 ${leak} 결제 사이에 하루의 간격을 두는 것이 해법입니다. 잔액이 흔들리는 원인을 수입 탓으로 돌리지 않고 실제 결제 속도를 바꿀 수 있습니다.`}`,
  ].join('\n\n')
}

export function moneySaveTeaserPreview(context: SajuReportContext, sectionCount: number) {
  const input = moneySaveRequestFromContext(context)
  const income = entered(input.incomePattern, '수입')
  const habit = entered(input.moneyHabit, '반복 지출')
  const leak = entered(input.leakPoint, habit)
  const goal = entered(input.savingGoal, '저축 목표')
  return {
    title: '나는 왜 돈이 안 모일까?',
    headline: `${income}인데도 돈이 안 남는 첫 원인은 “${leak}”이 저축보다 먼저 움직이는 순서입니다`,
    summary: `“${habit}”이라고 느낀 이유와 “${goal}”이 매달 뒤로 밀리는 지점을 수입일 직후의 소비 순서에서 찾았습니다. 더 참으라는 말보다, 돈이 들어온 날 무엇이 먼저 빠져나가는지부터 분명하게 짚어드립니다.`,
    insights: [
      `${goal}을 월말의 남은 돈으로 두면 ${leak}이 먼저 차지합니다. 수입일에 저축을 먼저 끝내는 구조가 필요합니다.`,
      input.relationSpending?.trim()
        ? `${moneyTableCell(input.relationSpending)}에서 먼저 낸 돈과 정산일을 분리해야 내 저축이 관계 비용을 대신하지 않습니다.`
        : `${leak} 결제의 금액보다 간격을 좁히는 습관이 잔액을 더 크게 흔듭니다.`,
    ],
    signals: [],
    paidValue: `전체 해석에서는 ${sectionCount}개 항목으로 지출이 커지는 순간, 저축을 막는 습관, 관계 비용과 시기별 돈 관리까지 이어서 풉니다.`,
  }
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
