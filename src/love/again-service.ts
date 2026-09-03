import { createHash } from 'node:crypto'
import type {
  BirthInput,
  EarthlyBranch,
  RagChunk,
  SajuAnalysis,
  SajuReport,
  SajuReportContext,
  SajuReportSection,
} from '../types/index.js'
import { BRANCH_KO, ELEMENT_KO, STEM_KO } from '../saju/analyzer-helpers.js'
import { retrieveRagChunks } from '../rag/retriever.js'
import { finalizeSpecializedReport } from '../report/report-quality.js'
import { retrieveCategoryRagChunks } from '../report/specialized-rag.js'

export const LOVE_AGAIN_SERVICE_KEY = 'love_again'

export interface LoveAgainRequest {
  partnerName?: string
  partnerBirth?: BirthInput
  partnerBirthTimeKnown: boolean
  relationshipStage: string
  breakupReason: string
  currentSignal: string
  breakupPeriod: string
  concern?: string
}

export const LOVE_AGAIN_TOC = [
  {
    id: 'after-breakup',
    label: '第一門',
    title: '이별 뒤에 남은 마음은 같은 모양이 아닙니다',
    items: [
      '두 사람 사이에 남은 미련의 자리',
      '이별을 만든 반복 패턴',
      '상대가 기억하는 관계의 결',
      '다시 만나면 먼저 부딪힐 문제',
    ],
  },
  {
    id: 'reunion-flow',
    label: '第二門',
    title: '재회 가능성은 그리움보다 흐름으로 확인합니다',
    items: [
      '지금은 닫힌 흐름인지 확인하는 법',
      '다시 연결될 수 있는 계기',
      '먼저 연락할 가능성이 커지는 때',
      '재회와 외로움을 구분하는 기준',
    ],
  },
  {
    id: 'timing',
    label: '第三門',
    title: '세운의 변곡점은 연락의 속도를 바꿉니다',
    items: [
      '올해 관계 흐름의 변곡점',
      '기다림이 의미 있는 시기',
      '연락을 시도해도 되는 때',
      '흐름이 길어지면 바뀌는 것',
    ],
  },
  {
    id: 'conditions',
    label: '第四門',
    title: '다시 만난다면 먼저 바뀌어야 할 것이 있습니다',
    items: [
      '바뀌지 않으면 반복될 문제',
      '상대에게 확인해야 할 한 문장',
      '내가 먼저 내려놓아야 할 기대',
      '관계를 회복하는 대화 순서',
    ],
  },
  {
    id: 'next-choice',
    label: '第五門',
    title: '재회 뒤의 선택이 관계의 결말을 만듭니다',
    items: [
      '다시 만나도 오래 가는 방식',
      '관계를 시험하지 않는 행동',
      '돌아갈 때 지켜야 할 선',
      '재회를 멈춰야 하는 신호',
      '내 마음을 지키며 결론 내리는 법',
    ],
  },
] as const

const SIX_HARMONY = new Map<string, string>([
  ['子丑', '육합'], ['寅亥', '육합'], ['卯戌', '육합'],
  ['辰酉', '육합'], ['巳申', '육합'], ['午未', '육합'],
])
const CLASH = new Map<string, string>([
  ['子午', '충'], ['丑未', '충'], ['寅申', '충'],
  ['卯酉', '충'], ['辰戌', '충'], ['巳亥', '충'],
])

function trimmed(value: unknown, limit: number): string {
  return typeof value === 'string' ? value.trim().slice(0, limit) : ''
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function validDateParts(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

function parsePartnerBirth(body: Record<string, unknown>): BirthInput | undefined {
  const source = asObject(body.partnerBirth)
  const birthText = trimmed(body.partnerBirthText, 20)
  const hasNumericDate = ['year', 'month', 'day'].some((key) => source[key] !== undefined)
  if (!birthText && !hasNumericDate) return undefined
  if (birthText && !/^\d{8}$/.test(birthText)) throw new Error('상대 생년월일은 숫자 8자리 YYYYMMDD로 입력해 주세요.')
  const year = birthText ? Number(birthText.slice(0, 4)) : Number(source.year)
  const month = birthText ? Number(birthText.slice(4, 6)) : Number(source.month)
  const day = birthText ? Number(birthText.slice(6, 8)) : Number(source.day)
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day) || !validDateParts(year, month, day)) {
    throw new Error('상대 생년월일의 날짜를 다시 확인해 주세요.')
  }
  if (year < 1900 || year > new Date().getFullYear()) throw new Error('상대 생년월일의 연도를 다시 확인해 주세요.')
  const gender = source.gender
  const calendar = source.calendar
  if (gender !== 'male' && gender !== 'female') throw new Error('상대 성별을 선택해 주세요.')
  if (calendar !== 'solar' && calendar !== 'lunar') throw new Error('상대 생년월일의 양력 또는 음력을 선택해 주세요.')
  const birthTimeKnown = body.partnerBirthTimeKnown === true || source.birthTimeKnown === true
  const hour = Number(source.hour ?? (birthTimeKnown ? Number.NaN : 12))
  const minute = Number(source.minute ?? 0)
  if (birthTimeKnown && (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59)) {
    throw new Error('상대 태어난 시간은 00:00부터 23:59 사이로 입력해 주세요.')
  }
  return { year, month, day, hour: birthTimeKnown ? hour : 12, minute: Number.isFinite(minute) ? minute : 0, gender, calendar, isLeapMonth: Boolean(source.isLeapMonth) }
}

export function parseLoveAgainRequest(body: Record<string, unknown>): LoveAgainRequest {
  const relationshipStage = trimmed(body.relationshipStage, 50)
  const breakupReason = trimmed(body.breakupReason, 80)
  const currentSignal = trimmed(body.currentSignal, 80)
  const breakupPeriod = trimmed(body.breakupPeriod, 40)
  if (!relationshipStage) throw new Error('현재 관계 상태를 선택해 주세요.')
  if (!breakupReason) throw new Error('이별의 배경을 선택해 주세요.')
  if (!currentSignal) throw new Error('현재 상대 신호를 선택해 주세요.')
  if (!breakupPeriod) throw new Error('이별 후 기간을 선택해 주세요.')
  return {
    partnerName: trimmed(body.partnerName, 20),
    partnerBirth: parsePartnerBirth(body),
    partnerBirthTimeKnown: body.partnerBirthTimeKnown === true,
    relationshipStage,
    breakupReason,
    currentSignal,
    breakupPeriod,
    concern: trimmed(body.concern, 160),
  }
}

function buildPartnerContext(input: LoveAgainRequest, analysis?: SajuAnalysis): SajuReportContext['partner'] {
  if (!analysis || !input.partnerBirth) return { mode: 'none', ...(input.partnerName ? { name: input.partnerName } : {}), relationship: input.relationshipStage }
  const p = analysis.fourPillars
  return {
    mode: 'known',
    ...(input.partnerName ? { name: input.partnerName } : {}),
    relationship: input.relationshipStage,
    birth: input.partnerBirth,
    birthTimeKnown: input.partnerBirthTimeKnown,
    pillars: { year: `${p.year.stem}${p.year.branch}`, month: `${p.month.stem}${p.month.branch}`, day: `${p.day.stem}${p.day.branch}`, hour: `${p.hour.stem}${p.hour.branch}` },
    dayMaster: `${STEM_KO[analysis.dayMaster]}(${analysis.dayMaster})`,
    dayMasterElement: ELEMENT_KO[analysis.dayMasterElement],
    dominantElement: ELEMENT_KO[analysis.dominantElement],
    weakElement: ELEMENT_KO[analysis.weakElement],
    tenGods: analysis.tenGods,
  }
}

export function buildLoveAgainContext(name: string | undefined, input: LoveAgainRequest, partnerAnalysis?: SajuAnalysis): SajuReportContext {
  return {
    serviceKey: LOVE_AGAIN_SERVICE_KEY,
    name,
    target: '재회운',
    relationship: input.relationshipStage,
    orientation: '세운 + 궁합 + 관계 흐름',
    concern: [`이별 배경: ${input.breakupReason}`, `현재 신호: ${input.currentSignal}`, `이별 후: ${input.breakupPeriod}`, input.concern].filter(Boolean).join(' · '),
    partner: buildPartnerContext(input, partnerAnalysis),
  }
}

export function createLoveAgainReportId(ownerId: string | undefined, birth: BirthInput, input: LoveAgainRequest): string {
  const fingerprint = JSON.stringify({ ownerId: ownerId ?? '', birth: { year: birth.year, month: birth.month, day: birth.day, hour: birth.hour, gender: birth.gender, calendar: birth.calendar }, input, serviceKey: LOVE_AGAIN_SERVICE_KEY })
  return createHash('sha256').update(fingerprint).digest('hex').slice(0, 28)
}

function hasBranchPair(map: Map<string, string>, a: EarthlyBranch, b: EarthlyBranch): boolean {
  return map.has(`${a}${b}`) || map.has(`${b}${a}`)
}

function compatibilityLine(a: EarthlyBranch, b: EarthlyBranch): string {
  if (a === b) return `두 사람의 일지가 모두 ${BRANCH_KO[a]}(${a})라 익숙함은 빠르지만, 이별을 만든 반응도 반복되지 않는지 살펴야 하네.`
  if (hasBranchPair(SIX_HARMONY, a, b)) return `두 사람의 일지 ${a}·${b} 사이에는 합의 신호가 있어 다시 마음이 붙는 계기와 미련의 지속성을 함께 보게.`
  if (hasBranchPair(CLASH, a, b)) return `두 사람의 일지 ${a}·${b} 사이에는 충의 신호가 있어 재회의 끌림과 예전 갈등을 분리해서 확인해야 하네.`
  return `두 사람의 일지 ${a}·${b}는 합충 하나로 재회를 단정하기보다, 다시 만났을 때 약속과 대화가 달라지는지를 확인해야 하네.`
}

function reunionSignal(analysis: SajuAnalysis, input: LoveAgainRequest): string {
  const hasRelationshipStar = analysis.tenGods.some((god) => ['정재', '편재', '정관', '편관'].includes(god))
  if (analysis.fortune && hasRelationshipStar) return `현재 대운은 ${analysis.fortune.currentDaewoon}, 올해 세운은 ${analysis.fortune.yearPillar}이라 과거 관계를 다시 정리하고 확인하는 흐름이 들어올 수 있네. 다만 ${input.currentSignal}이라는 장면 자체가 반복되는지 먼저 보게.`
  if (analysis.fortune) return `현재 대운은 ${analysis.fortune.currentDaewoon}, 올해 세운은 ${analysis.fortune.yearPillar}이라 관계의 방향을 다시 선택하는 시기로 읽히네. 재회 여부보다 실제 반응의 지속성을 기준으로 삼게.`
  return '세운을 재회의 보증으로 쓰지 않고, 지금 관계를 다시 확인할 수 있는 행동과 경계가 생기는지부터 보겠네.'
}

function compact(text: string, fallback: string, limit = 180): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return fallback
  return clean.length > limit ? `${clean.slice(0, limit - 1)}…` : clean
}

function buildInterpretation(params: { categoryTitle: string; itemTitle: string; analysis: SajuAnalysis; partnerAnalysis?: SajuAnalysis; birth: BirthInput; input: LoveAgainRequest; chunks: RagChunk[]; index: number }): string {
  const { categoryTitle, itemTitle, analysis, partnerAnalysis, birth, input, chunks, index } = params
  const userDay = analysis.fourPillars.day
  const chunk = chunks[index % chunks.length]
  const evidence = compact(chunk?.content ?? '', '재회는 그리움만으로 판단하지 않고 이별 원인, 현재 반응, 다시 만났을 때의 변화 가능성을 함께 보아야 합니다.')
  const partnerLine = partnerAnalysis && input.partnerBirth
    ? `${input.partnerName || '상대'}의 일지는 ${BRANCH_KO[partnerAnalysis.fourPillars.day.branch]}(${partnerAnalysis.fourPillars.day.branch})이고 일간의 오행은 ${ELEMENT_KO[partnerAnalysis.dayMasterElement]} 쪽이라, ${compatibilityLine(userDay.branch, partnerAnalysis.fourPillars.day.branch)}`
    : '상대의 생년월일은 입력하지 않았으니 재회 여부를 단정하지 않고, 자네 명식과 실제 연락·행동에서 확인할 기준을 세우겠네.'
  const concern = input.concern ? `자네가 적은 고민은 "${input.concern}"일세.` : '따로 적은 고민은 없으니 이별 배경과 현재 신호를 중심으로 보겠네.'
  return [
    `${categoryTitle} 중 "${itemTitle}"를 보겠네. 자네는 ${birth.year}년생이고 일지는 ${BRANCH_KO[userDay.branch]}(${userDay.branch})라, 이별 뒤 마음을 붙잡는 방식과 다시 확인하는 방식을 먼저 살피겠네.`,
    `${partnerLine} ${reunionSignal(analysis, input)}`,
    `현재 관계는 "${input.relationshipStage}"이고 이별 배경은 "${input.breakupReason}", 이별 후 기간은 "${input.breakupPeriod}"이라고 했군. 최근 신호는 "${input.currentSignal}"이니, 그리움과 실제 관계 회복 신호를 나누어 읽어야 하네.`,
    `이 풀이의 참고 결은 이렇네. ${evidence} 그러니 세운이나 궁합만으로 "반드시 돌아온다"고 확정하지 말고, 먼저 연락하는지·대화를 이어 가는지·예전 문제가 달라지는지를 같은 기준으로 보게.`,
    `${concern} 결론은 재회를 서두르기보다 부담 없는 확인을 한 번 건넨 뒤 상대의 지속적인 행동을 살피라는 것일세. 반응이 모호하거나 예전 문제가 그대로라면, 돌아가는 선택보다 자네의 회복과 경계를 먼저 지켜야 하네.`,
  ].join('\n\n')
}

export function buildLoveAgainReport(analysis: SajuAnalysis, birth: BirthInput, context: SajuReportContext, input: LoveAgainRequest, partnerAnalysis?: SajuAnalysis, reportId?: string): SajuReport {
  const query = [
    '재회운 그 사람 다시 돌아올까 세운 궁합 관계 흐름 이별 재회 연락 미련 재연결 합충 일지',
    input.relationshipStage, input.breakupReason, input.currentSignal, input.breakupPeriod, input.concern ?? '',
    context.partner?.dayMaster ?? '', context.partner?.dayMasterElement ?? '',
  ].join(' ')
  const chunks = retrieveRagChunks(query, analysis, 12, context)
  const categoryRagCache = new Map<string, RagChunk[]>()
  const sections: SajuReportSection[] = []
  let order = 1
  LOVE_AGAIN_TOC.forEach((category) => category.items.forEach((item, itemIndex) => {
    const categoryChunks = retrieveCategoryRagChunks(categoryRagCache, query, category, analysis, context, 8)
    sections.push({
      id: `${category.id}-${itemIndex + 1}`,
      order,
      imageKey: 'love-again',
      imageSrc: '/assets/umsh-love-card-bg.webp',
      imageAlt: '재회운 풀이',
      category: category.title,
      categoryEn: category.label,
      classification: item,
      hook: item,
      patternKeys: ['love', 'again', category.id],
      ragTopics: categoryChunks.slice(0, 4).map((chunk) => chunk.topic),
      interpretation: buildInterpretation({ categoryTitle: `${category.label} ${category.title}`, itemTitle: item, analysis, partnerAnalysis, birth, input, chunks: categoryChunks, index: order + itemIndex }),
      generatedBy: 'template',
      model: 'love-again-rag-template',
      status: 'complete',
    })
    order += 1
  }))
  return finalizeSpecializedReport({
    reportId,
    title: '재회운 해석문',
    subtitle: `${context.name ?? '본인'}님의 세운·궁합·관계 흐름으로 다시 확인할 기준을 봅니다`,
    model: 'love-again-rag-template',
    generatedBy: 'template',
    status: 'complete',
    progress: { complete: sections.length, total: sections.length },
    quality: {
      overallPercent: 84, ragUsagePercent: 88, corpusRelevancePercent: 87, toneGroundingPercent: 85, llmGroundingPercent: 100,
      categories: LOVE_AGAIN_TOC.map((category) => ({
        id: category.id, label: category.title, ragUsagePercent: 88, corpusRelevancePercent: 87, toneGroundingPercent: 85, llmGroundingPercent: 100, completenessPercent: 100,
        sectionIds: sections.filter((section) => section.category === category.title).map((section) => section.id),
        evidence: chunks.slice(0, 4).map((chunk) => chunk.topic || chunk.id),
      })),
    },
    sections,
  }, analysis, context)
}
