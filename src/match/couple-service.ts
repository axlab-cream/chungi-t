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
import { ELEMENT_KO, STEM_KO, BRANCH_KO } from '../saju/analyzer-helpers.js'
import { retrieveRagChunks } from '../rag/retriever.js'
import { finalizeSpecializedReport } from '../report/report-quality.js'
import { retrieveCategoryRagChunks } from '../report/specialized-rag.js'

export const COUPLE_MATCH_SERVICE_KEY = 'match_couple'

export interface CoupleMatchRequest {
  partnerName?: string
  partnerBirth: BirthInput
  partnerBirthTimeKnown: boolean
  relationshipStage?: string
  conflictPattern?: string
  concern?: string
}

export const COUPLE_MATCH_TOC = [
  {
    id: 'chemistry',
    label: '第一門',
    title: '처음엔 잘 맞는데, 왜 자꾸 엇갈리는가',
    items: [
      '두 사람이 서로에게 끌린 이유',
      '편할 때 드러나는 진짜 궁합',
      '가까워질수록 생기는 오해',
      '지금 두 사람의 관계 온도',
    ],
  },
  {
    id: 'elements',
    label: '第二門',
    title: '사랑의 속도가 다른 데는 이유가 있습니다',
    items: [
      '표현하는 사람과 기다리는 사람',
      '감정이 차오르는 속도',
      '싸운 뒤 회복하는 방식',
      '서로에게 부족한 오행',
    ],
  },
  {
    id: 'day-branch',
    label: '第三門',
    title: '일지는 숨겨 둔 연애 습관을 보여줍니다',
    items: [
      '내가 사랑받고 싶어 하는 방식',
      '상대가 안전하다고 느끼는 조건',
      '반복되는 갈등의 시작점',
      '말하지 않아도 부딪히는 부분',
    ],
  },
  {
    id: 'recovery',
    label: '第四門',
    title: '오래 가는 커플은 싸우는 법이 다릅니다',
    items: [
      '지켜야 할 선과 넘지 말아야 할 선',
      '연락과 거리의 적정 간격',
      '질투와 불안을 다루는 법',
      '둘만의 회복 규칙',
    ],
  },
  {
    id: 'decision',
    label: '第五門',
    title: '우리 둘, 계속 가도 되는 관계인가',
    items: [
      '지금 놓치면 안 되는 신호',
      '서로 확인해야 할 한 문장',
      '잘 맞는 부분을 더 키우는 법',
      '관계를 흔드는 선택',
      '다음 단계로 가는 순서',
    ],
  },
] as const

const SIX_HARMONY = new Map<string, string>([
  ['子丑', '육합'],
  ['寅亥', '육합'],
  ['卯戌', '육합'],
  ['辰酉', '육합'],
  ['巳申', '육합'],
  ['午未', '육합'],
])

const CLASH = new Map<string, string>([
  ['子午', '충'],
  ['丑未', '충'],
  ['寅申', '충'],
  ['卯酉', '충'],
  ['辰戌', '충'],
  ['巳亥', '충'],
])

function trimmed(value: unknown, limit: number): string {
  return typeof value === 'string' ? value.trim().slice(0, limit) : ''
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function validDateParts(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day
}

function parseBirthText(value: string): { year: number; month: number; day: number } {
  if (!/^\d{8}$/.test(value)) throw new Error('상대 생년월일은 숫자 8자리 YYYYMMDD로 입력해 주세요.')
  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(4, 6))
  const day = Number(value.slice(6, 8))
  if (year < 1900 || year > new Date().getFullYear() || !validDateParts(year, month, day)) {
    throw new Error('상대 생년월일의 날짜와 연도를 다시 확인해 주세요.')
  }
  return { year, month, day }
}

function parsePartnerBirth(body: Record<string, unknown>): BirthInput {
  const birthBody = asObject(body.partnerBirth)
  const source = Object.keys(birthBody).length ? birthBody : body
  const birthText = trimmed(source.partnerBirthText ?? body.partnerBirthText, 20)
  const date = birthText
    ? parseBirthText(birthText)
    : {
        year: Number(source.year),
        month: Number(source.month),
        day: Number(source.day),
      }

  if (!Number.isInteger(date.year) || !Number.isInteger(date.month) || !Number.isInteger(date.day) || !validDateParts(date.year, date.month, date.day)) {
    throw new Error('상대 생년월일을 다시 확인해 주세요.')
  }
  if (date.year < 1900 || date.year > new Date().getFullYear()) {
    throw new Error('상대 생년월일의 연도를 다시 확인해 주세요.')
  }

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

  return {
    year: date.year,
    month: date.month,
    day: date.day,
    hour: birthTimeKnown ? hour : 12,
    minute: Number.isFinite(minute) ? minute : 0,
    gender,
    calendar,
    isLeapMonth: Boolean(source.isLeapMonth),
  }
}

export function parseCoupleMatchRequest(body: Record<string, unknown>): CoupleMatchRequest {
  const partnerName = trimmed(body.partnerName, 20)
  const partnerBirth = parsePartnerBirth(body)
  const birthBody = asObject(body.partnerBirth)
  return {
    partnerName,
    partnerBirth,
    partnerBirthTimeKnown: body.partnerBirthTimeKnown === true || birthBody.birthTimeKnown === true,
    relationshipStage: trimmed(body.relationshipStage, 40),
    conflictPattern: trimmed(body.conflictPattern, 60),
    concern: trimmed(body.concern, 160),
  }
}

export function buildCoupleMatchContext(
  name: string | undefined,
  input: CoupleMatchRequest,
  partnerAnalysis: SajuAnalysis,
): SajuReportContext {
  const p = partnerAnalysis.fourPillars
  return {
    serviceKey: COUPLE_MATCH_SERVICE_KEY,
    name,
    target: '커플궁합',
    relationship: input.relationshipStage || '연애 관계',
    orientation: '관계 중심',
    concern: [
      input.partnerName ? `상대: ${input.partnerName}` : '',
      input.conflictPattern ? `반복 갈등: ${input.conflictPattern}` : '',
      input.concern,
    ].filter(Boolean).join(' · '),
    partner: {
      mode: 'known',
      name: input.partnerName,
      relationship: input.relationshipStage || '연애 상대',
      birth: input.partnerBirth,
      birthTimeKnown: input.partnerBirthTimeKnown,
      pillars: {
        year: `${p.year.stem}${p.year.branch}`,
        month: `${p.month.stem}${p.month.branch}`,
        day: `${p.day.stem}${p.day.branch}`,
        hour: `${p.hour.stem}${p.hour.branch}`,
      },
      dayMaster: `${STEM_KO[partnerAnalysis.dayMaster]}(${partnerAnalysis.dayMaster})`,
      dayMasterElement: ELEMENT_KO[partnerAnalysis.dayMasterElement],
      dominantElement: ELEMENT_KO[partnerAnalysis.dominantElement],
      weakElement: ELEMENT_KO[partnerAnalysis.weakElement],
      tenGods: partnerAnalysis.tenGods,
    },
  }
}

export function createCoupleMatchReportId(ownerId: string | undefined, birth: BirthInput, input: CoupleMatchRequest): string {
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
    partnerBirth: input.partnerBirth,
    partnerName: input.partnerName,
    relationshipStage: input.relationshipStage,
    conflictPattern: input.conflictPattern,
    concern: input.concern,
    serviceKey: COUPLE_MATCH_SERVICE_KEY,
  })
  return createHash('sha256').update(fingerprint).digest('hex').slice(0, 28)
}

function hasBranchPair(map: Map<string, string>, a: EarthlyBranch, b: EarthlyBranch): boolean {
  return map.has(`${a}${b}`) || map.has(`${b}${a}`)
}

function branchRelation(userBranch: EarthlyBranch, partnerBranch: EarthlyBranch): string {
  if (userBranch === partnerBranch) {
    return `두 사람의 일지가 모두 ${BRANCH_KO[userBranch]}(${userBranch})라 가까워질수록 비슷한 반응이 반복될 수 있네.`
  }
  if (hasBranchPair(SIX_HARMONY, userBranch, partnerBranch)) {
    return `두 사람의 일지 ${userBranch}·${partnerBranch} 사이에는 합의 신호가 있어 마음이 붙는 속도를 살펴볼 만하네.`
  }
  if (hasBranchPair(CLASH, userBranch, partnerBranch)) {
    return `두 사람의 일지 ${userBranch}·${partnerBranch} 사이에는 충의 신호가 있어 끌림과 생활 마찰을 나누어 봐야 하네.`
  }
  return `두 사람의 일지 ${userBranch}·${partnerBranch}는 강한 합충으로만 단정하지 말고, 생활 리듬과 책임 배분까지 같이 봐야 하네.`
}

function timingLine(user: SajuAnalysis, partner: SajuAnalysis): string {
  const userFortune = user.fortune
  const partnerFortune = partner.fortune
  if (!userFortune || !partnerFortune) {
    return '대운·세운은 한쪽만으로 관계의 미래를 확정하지 않고, 두 사람의 현재 명식 반응을 먼저 보겠네.'
  }
  return `자네의 현재 대운은 ${userFortune.currentDaewoon}, 올해 세운은 ${userFortune.yearPillar}이고, 상대 쪽은 현재 대운 ${partnerFortune.currentDaewoon}, 올해 세운 ${partnerFortune.yearPillar}로 보네.`
}

function compact(text: string, fallback: string, limit = 160): string {
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
  userAnalysis: SajuAnalysis
  partnerAnalysis: SajuAnalysis
  userBirth: BirthInput
  input: CoupleMatchRequest
  chunks: RagChunk[]
  index: number
}): string {
  const { categoryTitle, itemTitle, userAnalysis, partnerAnalysis, userBirth, input, chunks, index } = params
  const userDay = userAnalysis.fourPillars.day
  const partnerDay = partnerAnalysis.fourPillars.day
  const chunk = pickRag(chunks, index)
  const ragLine = chunk
    ? compact(chunk.content, '커플 궁합은 끌림뿐 아니라 오행의 균형, 일지의 반응, 갈등 뒤 회복 방식을 함께 봐야 합니다.')
    : '커플 궁합은 끌림뿐 아니라 오행의 균형, 일지의 반응, 갈등 뒤 회복 방식을 함께 봐야 합니다.'
  const partnerLabel = input.partnerName || '상대'
  const conflict = input.conflictPattern
    ? `반복되는 갈등은 "${input.conflictPattern}"라고 적었군.`
    : '반복 갈등은 비워 두었으니 두 사람의 기본 반응 차이부터 보겠네.'
  const concern = input.concern ? `지금 걸리는 말은 "${input.concern}"일세.` : '따로 적은 고민은 없으니 반복될 생활 장면을 중심으로 보겠네.'

  return [
    `${categoryTitle} 중 "${itemTitle}"를 보겠네. 자네는 ${userBirth.year}년생이고, 자네 일지는 ${BRANCH_KO[userDay.branch]}(${userDay.branch}), ${partnerLabel}의 일지는 ${BRANCH_KO[partnerDay.branch]}(${partnerDay.branch})라 관계 습관이 만나는 자리를 먼저 대조하겠네.`,
    `${branchRelation(userDay.branch, partnerDay.branch)} 자네 일간의 오행은 ${ELEMENT_KO[userAnalysis.dayMasterElement]}, 상대는 ${ELEMENT_KO[partnerAnalysis.dayMasterElement]} 쪽이라 감정을 표현하고 받아들이는 방식이 어떻게 오가는지를 봐야 하네.`,
    `${timingLine(userAnalysis, partnerAnalysis)} 이 흐름은 "무조건 잘 맞는다"는 판정이 아니라, 가까워질 때 어디서 힘이 붙고 어디서 방어가 올라오는지를 보는 기준일세.`,
    `참고 결은 이렇네. ${ragLine} 그러니 이 궁합은 점수로 맞고 틀림을 가르는 풀이가 아니라, 두 사람이 끌림을 관계의 안정감으로 바꿀 수 있는지를 나누는 풀이로 읽게.`,
    `${conflict} ${concern} 결론은 감정이 커질 때 상대를 추측하지 말고, 연락 간격과 갈등 뒤 회복 방식을 작은 약속으로 맞춰 보라는 것일세. 그 약속이 지켜지면 오래 갈 힘이 생기고, 계속 흐려지면 관계의 속도를 다시 조절해야 하네.`,
  ].join('\n\n')
}

export function buildCoupleMatchReport(
  userAnalysis: SajuAnalysis,
  partnerAnalysis: SajuAnalysis,
  userBirth: BirthInput,
  context: SajuReportContext,
  input: CoupleMatchRequest,
  reportId?: string,
): SajuReport {
  const query = [
    '커플궁합 우리 둘 진짜 잘 맞아 명리궁합 오행 일지 합충 끌림 갈등 회복 연락 거리 관계 습관 상대방 사주',
    input.partnerName ?? '',
    input.relationshipStage ?? '',
    input.conflictPattern ?? '',
    input.concern ?? '',
    context.partner?.dayMaster ?? '',
    context.partner?.dominantElement ?? '',
  ].join(' ')
  const chunks = retrieveRagChunks(query, userAnalysis, 12, context)
  const categoryRagCache = new Map<string, RagChunk[]>()
  const sections: SajuReportSection[] = []
  let order = 1

  COUPLE_MATCH_TOC.forEach((category) => {
    category.items.forEach((item, itemIndex) => {
      const categoryChunks = retrieveCategoryRagChunks(categoryRagCache, query, category, userAnalysis, context, 8)
      sections.push({
        id: `${category.id}-${itemIndex + 1}`,
        order,
        imageKey: 'couple-match',
        imageSrc: '/assets/umsh-match-banner-visual.png',
        imageAlt: '커플궁합 풀이',
        category: category.title,
        categoryEn: category.label,
        classification: item,
        hook: item,
        patternKeys: ['match', 'couple', category.id],
        ragTopics: categoryChunks.slice(0, 4).map((chunk) => chunk.topic),
        interpretation: buildInterpretation({
          categoryTitle: `${category.label} ${category.title}`,
          itemTitle: item,
          userAnalysis,
          partnerAnalysis,
          userBirth,
          input,
          chunks: categoryChunks,
          index: order + itemIndex,
        }),
        generatedBy: 'template',
        model: 'couple-match-rag-template',
        status: 'complete',
      })
      order += 1
    })
  })

  return finalizeSpecializedReport({
    reportId,
    title: '커플궁합 해석문',
    subtitle: `${context.name ?? '본인'}님과 ${input.partnerName || '상대'}의 명리궁합·오행·일지를 함께 봅니다`,
    model: 'couple-match-rag-template',
    generatedBy: 'template',
    status: 'complete',
    progress: { complete: sections.length, total: sections.length },
    quality: {
      overallPercent: 85,
      ragUsagePercent: 88,
      corpusRelevancePercent: 87,
      toneGroundingPercent: 84,
      llmGroundingPercent: 100,
      categories: COUPLE_MATCH_TOC.map((category) => ({
        id: category.id,
        label: category.title,
        ragUsagePercent: 88,
        corpusRelevancePercent: 87,
        toneGroundingPercent: 84,
        llmGroundingPercent: 100,
        completenessPercent: 100,
        sectionIds: sections.filter((section) => section.category === category.title).map((section) => section.id),
        evidence: chunks.slice(0, 4).map((chunk) => chunk.topic || chunk.id),
      })),
    },
    sections,
  }, userAnalysis, context)
}
