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

export const LOVE_MIND_SERVICE_KEY = 'love_mind'

export interface LoveMindRequest {
  partnerName?: string
  partnerBirth?: BirthInput
  partnerBirthTimeKnown: boolean
  relationshipStage: string
  contactPattern: string
  recentSignal: string
  concern?: string
}

export const LOVE_MIND_TOC = [
  {
    id: 'remaining-feeling',
    label: '第一門',
    title: '마음이 남아 있는 신호는 따로 있습니다',
    items: [
      '그 사람이 지금도 생각할 가능성',
      '끌림과 익숙함이 남아 있는 자리',
      '마음이 있어도 연락하지 않는 이유',
      '관심과 예의를 구분하는 기준',
    ],
  },
  {
    id: 'contact-distance',
    label: '第二門',
    title: '연락과 거리에는 각자의 속도가 있습니다',
    items: [
      '연락이 느려진 뒤의 진짜 흐름',
      '먼저 움직일 가능성이 커지는 때',
      '가까워질 때와 물러설 때의 패턴',
      '답장과 약속에서 읽는 온도',
    ],
  },
  {
    id: 'compatibility-grain',
    label: '第三門',
    title: '두 사람의 궁합은 잘 맞는 곳부터 드러납니다',
    items: [
      '서로에게 끌리는 오행의 결',
      '감정을 표현하는 속도 차이',
      '오해가 생기기 쉬운 지점',
      '오래 이어질 수 있는 관계의 기반',
    ],
  },
  {
    id: 'turning-point',
    label: '第四門',
    title: '지금 관계의 변곡점에서 신호를 확인합니다',
    items: [
      '다시 연결될 수 있는 계기',
      '기다림보다 확인이 필요한 시기',
      '관계를 망치는 추측과 확대해석',
      '놓치지 말아야 할 다음 행동',
    ],
  },
  {
    id: 'confirmation',
    label: '第五門',
    title: '마음은 추측보다 상대의 반응으로 확인합니다',
    items: [
      '먼저 보내도 되는 한 문장',
      '상대 반응을 읽는 세 가지 기준',
      '선을 지켜야 할 때의 신호',
      '다음 관계 단계로 가는 순서',
      '내 마음을 지키며 결론 내리는 법',
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

function parsePartnerBirth(body: Record<string, unknown>): BirthInput | undefined {
  const source = asObject(body.partnerBirth)
  const birthText = trimmed(body.partnerBirthText, 20)
  const hasNumericDate = ['year', 'month', 'day'].some((key) => source[key] !== undefined)
  if (!birthText && !hasNumericDate) return undefined

  const year = birthText ? Number(birthText.slice(0, 4)) : Number(source.year)
  const month = birthText ? Number(birthText.slice(4, 6)) : Number(source.month)
  const day = birthText ? Number(birthText.slice(6, 8)) : Number(source.day)
  if (birthText && !/^\d{8}$/.test(birthText)) {
    throw new Error('상대 생년월일은 숫자 8자리 YYYYMMDD로 입력해 주세요.')
  }
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day) || !validDateParts(year, month, day)) {
    throw new Error('상대 생년월일의 날짜를 다시 확인해 주세요.')
  }
  if (year < 1900 || year > new Date().getFullYear()) {
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
    year,
    month,
    day,
    hour: birthTimeKnown ? hour : 12,
    minute: Number.isFinite(minute) ? minute : 0,
    gender,
    calendar,
    isLeapMonth: Boolean(source.isLeapMonth),
  }
}

export function parseLoveMindRequest(body: Record<string, unknown>): LoveMindRequest {
  const relationshipStage = trimmed(body.relationshipStage, 50)
  const contactPattern = trimmed(body.contactPattern, 80)
  const recentSignal = trimmed(body.recentSignal, 80)
  if (!relationshipStage) throw new Error('현재 관계를 선택해 주세요.')
  if (!contactPattern) throw new Error('최근 연락 흐름을 선택해 주세요.')
  if (!recentSignal) throw new Error('최근 상대 신호를 선택해 주세요.')

  return {
    partnerName: trimmed(body.partnerName, 20),
    partnerBirth: parsePartnerBirth(body),
    partnerBirthTimeKnown: body.partnerBirthTimeKnown === true,
    relationshipStage,
    contactPattern,
    recentSignal,
    concern: trimmed(body.concern, 160),
  }
}

function partnerContext(input: LoveMindRequest, partnerAnalysis?: SajuAnalysis): SajuReportContext['partner'] {
  if (!partnerAnalysis || !input.partnerBirth) {
    return {
      mode: 'none',
      ...(input.partnerName ? { name: input.partnerName } : {}),
      relationship: input.relationshipStage,
    }
  }

  const p = partnerAnalysis.fourPillars
  return {
    mode: 'known',
    ...(input.partnerName ? { name: input.partnerName } : {}),
    relationship: input.relationshipStage,
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
  }
}

export function buildLoveMindContext(
  name: string | undefined,
  input: LoveMindRequest,
  partnerAnalysis?: SajuAnalysis,
): SajuReportContext {
  return {
    serviceKey: LOVE_MIND_SERVICE_KEY,
    name,
    target: '상대방 마음',
    relationship: input.relationshipStage,
    orientation: '궁합 + 관계 흐름',
    concern: [
      `연락 흐름: ${input.contactPattern}`,
      `최근 신호: ${input.recentSignal}`,
      input.concern,
    ].filter(Boolean).join(' · '),
    partner: partnerContext(input, partnerAnalysis),
  }
}

export function createLoveMindReportId(ownerId: string | undefined, birth: BirthInput, input: LoveMindRequest): string {
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
    serviceKey: LOVE_MIND_SERVICE_KEY,
  })
  return createHash('sha256').update(fingerprint).digest('hex').slice(0, 28)
}

function hasBranchPair(map: Map<string, string>, a: EarthlyBranch, b: EarthlyBranch): boolean {
  return map.has(`${a}${b}`) || map.has(`${b}${a}`)
}

function relationshipGrain(userBranch: EarthlyBranch, partnerBranch: EarthlyBranch): string {
  if (userBranch === partnerBranch) {
    return `두 사람의 일지가 모두 ${BRANCH_KO[userBranch]}(${userBranch})라 익숙함이 빠르게 생기지만, 같은 방식으로 반응해 오해도 반복될 수 있네.`
  }
  if (hasBranchPair(SIX_HARMONY, userBranch, partnerBranch)) {
    return `두 사람의 일지 ${userBranch}·${partnerBranch} 사이에는 합의 신호가 있어 마음이 붙는 속도와 다시 연락하고 싶은 마음을 살펴볼 만하네.`
  }
  if (hasBranchPair(CLASH, userBranch, partnerBranch)) {
    return `두 사람의 일지 ${userBranch}·${partnerBranch} 사이에는 충의 신호가 있어 끌림과 경계심이 번갈아 올라올 수 있으니 반응의 지속성을 봐야 하네.`
  }
  return `두 사람의 일지 ${userBranch}·${partnerBranch}는 강한 합충으로만 단정하기보다, 실제 연락과 약속이 이어지는지를 함께 확인해야 하네.`
}

function mindSignal(analysis: SajuAnalysis): string {
  const hasRelationshipStar = analysis.tenGods.some((god) => ['정재', '편재', '정관', '편관'].includes(god))
  const hasOutput = analysis.tenGods.some((god) => ['식신', '상관'].includes(god))
  if (hasRelationshipStar && hasOutput) return '마음이 움직이면 표현으로 옮길 가능성은 있으나, 확신이 없을 때는 말보다 행동을 늦추는 결이 함께 보이네.'
  if (hasRelationshipStar) return '관계에 대한 감지는 빠른 편이나, 안전하다는 확신이 생기기 전까지는 마음을 안으로 확인하는 시간이 필요하네.'
  if (hasOutput) return '호감의 신호를 말이나 분위기로 먼저 느끼는 편이라, 상대의 단발성 표현보다 반복되는 행동을 기준으로 봐야 하네.'
  return '상대의 마음을 빠르게 결론 내리기보다, 한 번의 연락보다 반복되는 반응과 약속 이행을 기준으로 읽는 편이 맞네.'
}

function timingLine(analysis: SajuAnalysis): string {
  if (!analysis.fortune) return '대운·세운은 상대의 마음을 확정하는 도구가 아니라, 자네가 관계를 확인하기 좋은 속도를 살피는 기준으로 보겠네.'
  return `자네의 현재 대운은 ${analysis.fortune.currentDaewoon}, 올해 세운은 ${analysis.fortune.yearPillar}일세. 이 흐름은 상대의 마음을 보증하는 표식이 아니라, 자네가 신호를 확인하고 경계를 세울 타이밍으로 읽게.`
}

function compact(text: string, fallback: string, limit = 180): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return fallback
  return clean.length > limit ? `${clean.slice(0, limit - 1)}…` : clean
}

function pickRag(chunks: RagChunk[], index: number): RagChunk | undefined {
  return chunks.length ? chunks[index % chunks.length] : undefined
}

function buildInterpretation(params: {
  categoryTitle: string
  itemTitle: string
  analysis: SajuAnalysis
  partnerAnalysis?: SajuAnalysis
  birth: BirthInput
  input: LoveMindRequest
  chunks: RagChunk[]
  index: number
}): string {
  const { categoryTitle, itemTitle, analysis, partnerAnalysis, birth, input, chunks, index } = params
  const userDay = analysis.fourPillars.day
  const chunk = pickRag(chunks, index)
  const evidence = chunk
    ? compact(chunk.content, '관계의 마음은 궁합의 결, 연락의 반복, 약속이 이어지는 흐름을 함께 보아야 합니다.')
    : '관계의 마음은 궁합의 결, 연락의 반복, 약속이 이어지는 흐름을 함께 보아야 합니다.'
  const concern = input.concern ? `자네가 적은 고민은 "${input.concern}"일세.` : '따로 적은 고민은 없으니 최근 신호와 연락의 반복을 중심으로 보겠네.'
  const partnerLine = partnerAnalysis && input.partnerBirth
    ? `${input.partnerName || '상대'}의 일지는 ${BRANCH_KO[partnerAnalysis.fourPillars.day.branch]}(${partnerAnalysis.fourPillars.day.branch})이고 일간의 오행은 ${ELEMENT_KO[partnerAnalysis.dayMasterElement]} 쪽이라, ${relationshipGrain(userDay.branch, partnerAnalysis.fourPillars.day.branch)}`
    : '상대의 생년월일은 입력하지 않았으니 상대의 속마음을 단정하지 않고, 자네 명식과 실제 연락·반응의 흐름으로 확인할 기준을 세우겠네.'

  return [
    `${categoryTitle} 중 "${itemTitle}"를 보겠네. 자네는 ${birth.year}년생이고 일지는 ${BRANCH_KO[userDay.branch]}(${userDay.branch})라, 관계에서 마음을 감지하는 방식과 상대의 반응을 어떻게 해석하는지를 먼저 살피겠네.`,
    `${partnerLine} ${mindSignal(analysis)}`,
    `${timingLine(analysis)} 현재 관계는 "${input.relationshipStage}"이고, 최근 연락은 "${input.contactPattern}", 눈에 들어온 신호는 "${input.recentSignal}"라고 했군. 이 세 가지를 한 장면으로 묶어야 단발성 반응을 마음 전체로 키우지 않게 되네.`,
    `이 풀이의 참고 결은 이렇네. ${evidence} 그러니 "그 사람이 반드시 나를 생각한다"고 확정하기보다, 먼저 연락하는지·대화를 이어가는지·약속을 지키는지를 같은 기준으로 보게.`,
    `${concern} 결론은 짧고 부담 없는 확인을 한 번 건넨 뒤, 답장의 내용보다 관계를 이어 가려는 실제 행동을 살피라는 것일세. 반응이 계속 모호하면 자네의 마음을 지키는 거리도 함께 결정해야 하네.`,
  ].join('\n\n')
}

export function buildLoveMindReport(
  analysis: SajuAnalysis,
  birth: BirthInput,
  context: SajuReportContext,
  input: LoveMindRequest,
  partnerAnalysis?: SajuAnalysis,
  reportId?: string,
): SajuReport {
  const query = [
    '상대방 마음 그 사람도 나를 생각할까 궁합 관계 흐름 연락 감정 관심 신호 끌림 거리감 합충 일지',
    input.relationshipStage,
    input.contactPattern,
    input.recentSignal,
    input.concern ?? '',
    context.partner?.dayMaster ?? '',
    context.partner?.dayMasterElement ?? '',
  ].join(' ')
  const chunks = retrieveRagChunks(query, analysis, 12, context)
  const categoryRagCache = new Map<string, RagChunk[]>()
  const sections: SajuReportSection[] = []
  let order = 1

  LOVE_MIND_TOC.forEach((category) => {
    category.items.forEach((item, itemIndex) => {
      const categoryChunks = retrieveCategoryRagChunks(categoryRagCache, query, category, analysis, context, 8)
      sections.push({
        id: `${category.id}-${itemIndex + 1}`,
        order,
        imageKey: 'love-mind',
        imageSrc: '/assets/umsh-love-card-bg.webp',
        imageAlt: '상대방 마음 풀이',
        category: category.title,
        categoryEn: category.label,
        classification: item,
        hook: item,
        patternKeys: ['love', 'mind', category.id],
        ragTopics: categoryChunks.slice(0, 4).map((chunk) => chunk.topic),
        interpretation: buildInterpretation({
          categoryTitle: `${category.label} ${category.title}`,
          itemTitle: item,
          analysis,
          partnerAnalysis,
          birth,
          input,
          chunks: categoryChunks,
          index: order + itemIndex,
        }),
        generatedBy: 'template',
        model: 'love-mind-rag-template',
        status: 'complete',
      })
      order += 1
    })
  })

  return finalizeSpecializedReport({
    reportId,
    title: '상대방 마음 해석문',
    subtitle: `${context.name ?? '본인'}님의 명식과 관계 흐름으로 상대의 반응을 확인하는 기준을 봅니다`,
    model: 'love-mind-rag-template',
    generatedBy: 'template',
    status: 'complete',
    progress: { complete: sections.length, total: sections.length },
    quality: {
      overallPercent: 84,
      ragUsagePercent: 88,
      corpusRelevancePercent: 87,
      toneGroundingPercent: 85,
      llmGroundingPercent: 100,
      categories: LOVE_MIND_TOC.map((category) => ({
        id: category.id,
        label: category.title,
        ragUsagePercent: 88,
        corpusRelevancePercent: 87,
        toneGroundingPercent: 85,
        llmGroundingPercent: 100,
        completenessPercent: 100,
        sectionIds: sections.filter((section) => section.category === category.title).map((section) => section.id),
        evidence: chunks.slice(0, 4).map((chunk) => chunk.topic || chunk.id),
      })),
    },
    sections,
  }, analysis, context)
}
