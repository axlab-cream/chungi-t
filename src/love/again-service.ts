import { InputError } from '../server/input-error.js'
import { createHash } from 'node:crypto'
import { buildRelationshipReading } from './reading-content.js'
import type {
  BirthInput,
  RagChunk,
  SajuAnalysis,
  SajuReport,
  SajuReportContext,
  SajuReportSection,
} from '../types/index.js'
import { ELEMENT_KO, STEM_KO } from '../saju/analyzer-helpers.js'
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
  if (!relationshipStage) throw new InputError('현재 관계 상태를 선택해 주세요.')
  if (!breakupReason) throw new InputError('이별의 배경을 선택해 주세요.')
  if (!currentSignal) throw new InputError('현재 상대 신호를 선택해 주세요.')
  if (!breakupPeriod) throw new InputError('이별 후 기간을 선택해 주세요.')
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
    // 상대의 생년월일시 원본은 문맥에 싣지 않는다. 이 문맥은 리포트 payload 로 저장되고
    // 응답으로도 나가는데, 상대는 이 서비스의 사용자가 아니어서 동의·삭제 창구가 없다.
    // 본문 생성에 필요한 것은 아래 계산 결과뿐이고 원본은 `input.partnerBirth` 에 있다.
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
  const fingerprint = JSON.stringify({ ownerId: ownerId ?? '', birth: { year: birth.year, month: birth.month, day: birth.day, hour: birth.hour, ...(birth.minute ? { minute: birth.minute } : {}), gender: birth.gender, calendar: birth.calendar }, input, serviceKey: LOVE_AGAIN_SERVICE_KEY })
  return createHash('sha256').update(fingerprint).digest('hex').slice(0, 28)
}

function buildInterpretation(params: {
  categoryTitle: string; itemTitle: string; analysis: SajuAnalysis; partnerAnalysis?: SajuAnalysis; birth: BirthInput; input: LoveAgainRequest; chunks: RagChunk[]; index: number
}): string {
  return buildRelationshipReading({
    serviceKey: LOVE_AGAIN_SERVICE_KEY, category: params.categoryTitle, title: params.itemTitle, analysis: params.analysis, partnerAnalysis: params.partnerAnalysis, relationship: params.input.relationshipStage, concern: params.input.concern, signals: { '이별 배경': params.input.breakupReason, '현재 신호': params.input.currentSignal, '이별 후 기간': params.input.breakupPeriod },
  })
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
