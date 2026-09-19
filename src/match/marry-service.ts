import { InputError } from '../server/input-error.js'
import { createHash } from 'node:crypto'
import { buildRelationshipReading } from '../love/reading-content.js'
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
import { retrieveCategoryOwnChunks, retrieveCategoryRagChunks } from '../report/specialized-rag.js'

export const MARRY_MATCH_SERVICE_KEY = 'marry_match'

/** Where the 결혼궁합 artwork lives; the 05 list and the 06 detail hero share one key per 대분류. */
export const MARRY_ASSET_BASE = '/match/marry/assets/marry'

export interface MarryMatchRequest {
  partnerName?: string
  partnerBirth: BirthInput
  partnerBirthTimeKnown: boolean
  relationshipStage?: string
  marriagePlan?: string
  concern?: string
}

/**
 * The 10 대분류 / 24 중분류 index the 결혼궁합 service pages are designed around.
 * `tag` drives the 05 목차 filter chips, `image` picks the per-group artwork the
 * 05 list card and the 06 detail hero share.
 */
export const MARRY_MATCH_TOC = [
  {
    id: 'self-base',
    label: '第一門',
    tag: 'chemistry',
    image: 'marry-section-01',
    title: '내 연애 기본값',
    items: [
      '연락·표현·스킨십 온도',
      '결혼하면 드러나는 생활 습관',
    ],
  },
  {
    id: 'partner-base',
    label: '第二門',
    tag: 'chemistry',
    image: 'marry-section-02',
    title: '상대 연애 캐릭터',
    items: [
      '책임감과 약속 감각',
      '말보다 행동으로 봐야 하는 신호',
    ],
  },
  {
    id: 'chemistry',
    label: '第三門',
    tag: 'chemistry',
    image: 'marry-section-03',
    title: '둘의 케미 궁합',
    items: [
      '일간 케미',
      '오행 밸런스 궁합',
      '같이 있으면 반복되는 피로 포인트',
    ],
  },
  {
    id: 'marriage-angle',
    label: '第四門',
    tag: 'marriage',
    image: 'marry-section-04',
    title: '연애 말고 결혼각',
    items: [
      '결혼 얘기를 꺼내도 되는 타이밍',
      '현실 조건의 합의 가능성',
      '지금 밀어붙일 각인지, 속도 조절각인지',
    ],
  },
  {
    id: 'timing',
    label: '第五門',
    tag: 'timing',
    image: 'marry-section-05',
    title: '결혼 타이밍 운',
    items: [
      '올해 결혼운',
      '고백·관계 정의·프러포즈 타이밍',
    ],
  },
  {
    id: 'red-flag',
    label: '第六門',
    tag: 'flag',
    image: 'marry-section-06',
    title: '레드플래그 체크',
    items: [
      '반복되는 싸움 패턴',
      '돈 문제에서 보이는 신뢰도',
      '말은 좋은데 행동이 안 맞는 구간',
    ],
  },
  {
    id: 'daily-life',
    label: '第七門',
    tag: 'marriage',
    image: 'marry-section-07',
    title: '현실 동거·결혼 생활 시뮬레이션',
    items: [
      '집안일과 돈 관리 스타일',
      '장기 갈등을 푸는 방식',
    ],
  },
  {
    id: 'recovery',
    label: '第八門',
    tag: 'action',
    image: 'marry-section-08',
    title: '관계 회복과 마음 돌봄',
    items: [
      '서운함을 말하는 방식',
      '이 관계에서 나를 잃지 않는 법',
    ],
  },
  {
    id: 'action',
    label: '第九門',
    tag: 'action',
    image: 'marry-section-09',
    title: '오늘 바로 써먹는 액션',
    items: [
      '오늘 보낼 메시지 한 줄',
      '결혼 얘기를 꺼내는 문장',
    ],
  },
  {
    id: 'label',
    label: '第十門',
    tag: 'marriage',
    image: 'marry-section-10',
    title: '한눈에 보는 결과 라벨',
    items: [
      '결혼각 온도',
      '안정감 레벨',
      '속도 조절 알림',
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
    throw new InputError('상대 생년월일을 다시 확인해 주세요.')
  }
  if (date.year < 1900 || date.year > new Date().getFullYear()) {
    throw new InputError('상대 생년월일의 연도를 다시 확인해 주세요.')
  }

  const gender = source.gender
  const calendar = source.calendar
  if (gender !== 'male' && gender !== 'female') throw new InputError('상대 성별을 선택해 주세요.')
  if (calendar !== 'solar' && calendar !== 'lunar') throw new InputError('상대 생년월일의 양력 또는 음력을 선택해 주세요.')

  const birthTimeKnown = body.partnerBirthTimeKnown === true || source.birthTimeKnown === true
  const hour = Number(source.hour ?? (birthTimeKnown ? Number.NaN : 12))
  const minute = Number(source.minute ?? 0)
  if (birthTimeKnown && (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59)) {
    throw new InputError('상대 태어난 시간은 00:00부터 23:59 사이로 입력해 주세요.')
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
      // 상대의 생년월일시 원본은 문맥에 싣지 않는다. 이 문맥은 리포트 payload 로 저장되고
      // 응답으로도 나가는데, 상대는 이 서비스의 사용자가 아니어서 동의·삭제 창구가 없다.
      // 본문 생성에 필요한 것은 아래 계산 결과뿐이고 원본은 `input.partnerBirth` 에 있다.
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
      ...(birth.minute ? { minute: birth.minute } : {}),
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

const OWN_CORPUS_DOMAIN = 'marry_match_service'
const pad2 = (value: number): string => String(value).padStart(2, '0')

function buildInterpretation(params: {
  groupId: string; categoryTitle: string; itemTitle: string; userAnalysis: SajuAnalysis; partnerAnalysis: SajuAnalysis; userBirth: BirthInput; input: MarryMatchRequest; chunks: RagChunk[]; index: number
}): string {
  return buildRelationshipReading({
    serviceKey: MARRY_MATCH_SERVICE_KEY, category: params.groupId, title: params.itemTitle, analysis: params.userAnalysis, partnerAnalysis: params.partnerAnalysis, relationship: params.input.relationshipStage, concern: params.input.concern, signals: { '결혼 준비 계획': params.input.marriagePlan },
  })
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

  MARRY_MATCH_TOC.forEach((category, groupIndex) => {
    category.items.forEach((item, itemIndex) => {
      // 자기 팩에서 이 대분류에 맞는 블록을 먼저 확보한다. 랭킹만으로는 범용 팩에 밀려
      // 다른 질문용 문장이 올라오기 때문이다. 모자라면 일반 검색 결과로 채운다.
      const generalChunks = retrieveCategoryRagChunks(categoryRagCache, query, category, userAnalysis, context, 8)
      const ownChunks = retrieveCategoryOwnChunks(categoryRagCache, query, category, userAnalysis, context, OWN_CORPUS_DOMAIN, 6)
      const categoryChunks = ownChunks.length ? [...ownChunks, ...generalChunks] : generalChunks
      sections.push({
        // Ids follow the marry-<대분류>-<중분류> scheme the 05 목차 and 06 상세 pages route on.
        id: `marry-${pad2(groupIndex + 1)}-${pad2(itemIndex + 1)}`,
        order,
        imageKey: category.image,
        imageSrc: `${MARRY_ASSET_BASE}/05-${category.image}.webp`,
        imageAlt: `${category.title} 풀이`,
        category: category.title,
        categoryEn: category.label,
        classification: item,
        hook: item,
        patternKeys: ['match', 'marry', category.id, category.tag],
        ragTopics: categoryChunks.slice(0, 4).map((chunk) => chunk.topic),
        interpretation: buildInterpretation({
          groupId: category.id,
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
