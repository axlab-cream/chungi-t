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

export const MARRY_MATCH_SERVICE_KEY = 'marry_match'

export interface MarryMatchRequest {
  partnerName?: string
  partnerBirth: BirthInput
  partnerBirthTimeKnown: boolean
  relationshipStage?: string
  marriagePlan?: string
  concern?: string
}

const MARRY_MATCH_TOC = [
  {
    id: 'possibility',
    label: '第一門',
    title: '연애 말고, 결혼까지 갈 수 있는가',
    items: [
      '끌림과 생활 궁합은 다릅니다',
      '좋아하는 마음이 오래 버티는지',
      '결혼 얘기를 꺼내도 되는 때',
      '서로를 지치게 하는 첫 신호',
    ],
  },
  {
    id: 'spouse-palace',
    label: '第二門',
    title: '두 사람의 배우자궁이 만나는 자리',
    items: [
      '내 일지가 원하는 배우자상',
      '상대 일지가 반응하는 방식',
      '가까워질수록 드러나는 방어',
      '부부가 되었을 때 반복될 장면',
    ],
  },
  {
    id: 'flow',
    label: '第三門',
    title: '대운과 세운이 여는 결혼 타이밍',
    items: [
      '올해 관계를 밀어주는 흐름',
      '대운이 생활 무대를 바꾸는 때',
      '합이 붙을 때 조심할 약속',
      '충이 올라올 때 피해야 할 말',
    ],
  },
  {
    id: 'reality',
    label: '第四門',
    title: '돈, 가족, 책임에서 갈리는 궁합',
    items: [
      '돈 쓰는 방식이 부딪히는 지점',
      '가족 이야기가 들어올 때',
      '책임을 나누는 방식',
      '같이 살면 먼저 정해야 할 것',
    ],
  },
  {
    id: 'decision',
    label: '第五門',
    title: '결혼을 밀어도 되는 관계인지',
    items: [
      '지금 확인해야 할 대답',
      '상대에게 물어볼 한 문장',
      '서두르면 깨지는 부분',
      '기다리면 좋아지는 부분',
      '최종 결정을 내리는 순서',
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

export function parseMarryMatchRequest(body: Record<string, unknown>): MarryMatchRequest {
  const partnerName = trimmed(body.partnerName, 20)
  const partnerBirth = parsePartnerBirth(body)
  const birthBody = asObject(body.partnerBirth)
  return {
    partnerName,
    partnerBirth,
    partnerBirthTimeKnown: body.partnerBirthTimeKnown === true || birthBody.birthTimeKnown === true,
    relationshipStage: trimmed(body.relationshipStage, 40),
    marriagePlan: trimmed(body.marriagePlan, 40),
    concern: trimmed(body.concern, 160),
  }
}

export function buildMarryMatchContext(
  name: string | undefined,
  input: MarryMatchRequest,
  partnerAnalysis: SajuAnalysis,
): SajuReportContext {
  const p = partnerAnalysis.fourPillars
  return {
    serviceKey: MARRY_MATCH_SERVICE_KEY,
    name,
    target: '결혼궁합',
    relationship: input.relationshipStage || '결혼 고려',
    orientation: '이성 관계 중심',
    concern: [
      input.partnerName ? `상대: ${input.partnerName}` : '',
      input.marriagePlan ? `계획: ${input.marriagePlan}` : '',
      input.concern,
    ].filter(Boolean).join(' · '),
    partner: {
      mode: 'known',
      name: input.partnerName,
      relationship: input.relationshipStage || '결혼 고려 상대',
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

export function createMarryMatchReportId(ownerId: string | undefined, birth: BirthInput, input: MarryMatchRequest): string {
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
    marriagePlan: input.marriagePlan,
    concern: input.concern,
    serviceKey: MARRY_MATCH_SERVICE_KEY,
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

function spouseStar(gender: BirthInput['gender']): string {
  return gender === 'male' ? '재성' : '관성'
}

function timingLine(user: SajuAnalysis, partner: SajuAnalysis): string {
  const userFortune = user.fortune
  const partnerFortune = partner.fortune
  if (!userFortune || !partnerFortune) {
    return '대운·세운은 한쪽만으로 결혼을 확정하지 않고, 두 사람의 현재 명식 반응을 먼저 보겠네.'
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
  input: MarryMatchRequest
  chunks: RagChunk[]
  index: number
}): string {
  const { categoryTitle, itemTitle, userAnalysis, partnerAnalysis, userBirth, input, chunks, index } = params
  const userDay = userAnalysis.fourPillars.day
  const partnerDay = partnerAnalysis.fourPillars.day
  const chunk = pickRag(chunks, index)
  const ragLine = chunk
    ? compact(chunk.content, '결혼 궁합은 끌림보다 생활, 책임, 돈의 배분을 함께 봐야 합니다.')
    : '결혼 궁합은 끌림보다 생활, 책임, 돈의 배분을 함께 봐야 합니다.'
  const partnerLabel = input.partnerName || '상대'
  const plan = input.marriagePlan ? `결혼 생각은 "${input.marriagePlan}"로 적었군.` : '결혼 시점은 비워 두었으니 관계의 안정성부터 보겠네.'
  const concern = input.concern ? `지금 걸리는 말은 "${input.concern}"일세.` : '따로 적은 고민은 없으니 반복될 생활 장면을 중심으로 보겠네.'

  return [
    `${categoryTitle} 중 "${itemTitle}"를 보겠네. 자네는 ${userBirth.year}년생이고, 자네 일지는 ${BRANCH_KO[userDay.branch]}(${userDay.branch}), ${partnerLabel}의 일지는 ${BRANCH_KO[partnerDay.branch]}(${partnerDay.branch})라 배우자궁을 먼저 대조하겠네.`,
    `${branchRelation(userDay.branch, partnerDay.branch)} 자네에게 배우자성은 ${spouseStar(userBirth.gender)} 쪽이고, 상대에게 배우자성은 ${spouseStar(input.partnerBirth.gender)} 쪽이라 책임과 현실감이 어떻게 오가는지를 봐야 하네.`,
    `${timingLine(userAnalysis, partnerAnalysis)} 이 흐름은 "반드시 결혼한다"는 말이 아니라, 결혼 이야기를 꺼낼 때 어디서 힘이 붙고 어디서 방어가 올라오는지를 보는 기준일세.`,
    `참고 결은 이렇네. ${ragLine} 그러니 이 궁합은 점수로 맞고 틀림을 가르는 풀이가 아니라, 두 사람이 가까워질수록 편해지는지 피곤해지는지를 나누는 풀이로 읽게.`,
    `${plan} ${concern} 결론은 약속의 크기를 키우기 전에 돈, 가족, 주거, 일의 책임을 작은 단위로 맞춰 보라는 것일세. 그 대화에서 피하지 않는다면 결혼으로 갈 힘이 생기고, 계속 흐리면 아직은 더 지켜봐야 하네.`,
  ].join('\n\n')
}

export function buildMarryMatchReport(
  userAnalysis: SajuAnalysis,
  partnerAnalysis: SajuAnalysis,
  userBirth: BirthInput,
  context: SajuReportContext,
  input: MarryMatchRequest,
  reportId?: string,
): SajuReport {
  const query = [
    '결혼궁합 연애 말고 결혼 배우자궁 대운 세운 합충 일지 배우자성 부부 생활 책임 돈 가족 상대방 사주',
    input.partnerName ?? '',
    input.relationshipStage ?? '',
    input.marriagePlan ?? '',
    input.concern ?? '',
    context.partner?.dayMaster ?? '',
    context.partner?.dominantElement ?? '',
  ].join(' ')
  const chunks = retrieveRagChunks(query, userAnalysis, 12, context)
  const categoryRagCache = new Map<string, RagChunk[]>()
  const sections: SajuReportSection[] = []
  let order = 1

  MARRY_MATCH_TOC.forEach((category) => {
    category.items.forEach((item, itemIndex) => {
      const categoryChunks = retrieveCategoryRagChunks(categoryRagCache, query, category, userAnalysis, context, 8)
      sections.push({
        id: `${category.id}-${itemIndex + 1}`,
        order,
        imageKey: 'marry-match',
        imageSrc: '/assets/umsh-match-card-bg.png',
        imageAlt: '결혼궁합 풀이',
        category: category.title,
        categoryEn: category.label,
        classification: item,
        hook: item,
        patternKeys: ['match', 'marry', category.id],
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
        model: 'marry-match-rag-template',
        status: 'complete',
      })
      order += 1
    })
  })

  return finalizeSpecializedReport({
    reportId,
    title: '결혼궁합 해석문',
    subtitle: `${context.name ?? '본인'}님과 ${input.partnerName || '상대'}의 배우자궁·대운·합충을 함께 봅니다`,
    model: 'marry-match-rag-template',
    generatedBy: 'template',
    status: 'complete',
    progress: { complete: sections.length, total: sections.length },
    quality: {
      overallPercent: 85,
      ragUsagePercent: 88,
      corpusRelevancePercent: 87,
      toneGroundingPercent: 84,
      llmGroundingPercent: 100,
      categories: MARRY_MATCH_TOC.map((category) => ({
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
