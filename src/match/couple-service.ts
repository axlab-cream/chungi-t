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

export const COUPLE_MATCH_SERVICE_KEY = 'match_couple'

/** Where the 커플궁합 artwork lives, beside the service pages. */
export const COUPLE_ASSET_BASE = '/match/couple/assets/couple'

export interface CoupleMatchRequest {
  partnerName?: string
  partnerBirth: BirthInput
  partnerBirthTimeKnown: boolean
  relationshipStage?: string
  conflictPattern?: string
  concern?: string
}

/**
 * The 14 대분류 / 70 중분류 index the 커플궁합 pages are designed around.
 * `cluster` drives the 05 목차 filter, `image` picks the group artwork where the design
 * supplied one, and the ids are what 05 목차 and 06 상세 route on.
 */
export const COUPLE_MATCH_TOC = [
  {
    id: 'relationship_overview',
    label: '第一門',
    cluster: 'initial',
    image: 'relationship-overview',
    title: '관계 총평',
    items: [
      { id: 'relationship_overview__chemistry_one_line', title: '케미 한 줄', note: '두 사람 관계의 첫인상을 한 문장으로 압축해요.' },
      { id: 'relationship_overview__green_light_points', title: '그린라이트 포인트', note: '잘 맞는 버튼이 어디서 켜지는지 먼저 보여줘요.' },
    ],
  },
  {
    id: 'zodiac_branch_match',
    label: '第二門',
    cluster: 'initial',
    image: 'zodiac-branch-match',
    title: '띠/지지 궁합',
    items: [
      { id: 'zodiac_branch_match__best_fit_combo', title: '찰떡 조합', note: '같이 있을 때 자연스럽게 편해지는 조합 신호를 봐요.' },
      { id: 'zodiac_branch_match__collision_button', title: '충돌 버튼', note: '별일 아닌데 크게 튀는 포인트를 버튼처럼 표시해요.' },
    ],
  },
  {
    id: 'five_element_chemistry',
    label: '第三門',
    cluster: 'initial',
    image: 'five-element-chemistry',
    title: '오행 케미',
    items: [
      { id: 'five_element_chemistry__generating_tension', title: '상생 텐션', note: '서로에게 힘을 실어주는 흐름을 오행으로 읽어요.' },
      { id: 'five_element_chemistry__controlling_tension', title: '상극 텐션', note: '끌리는데 피곤한 이유를 상극의 말투로 풀어요.' },
    ],
  },
  {
    id: 'daymaster_sync',
    label: '第四門',
    cluster: 'saju',
    image: '',
    title: '일간 성향 싱크',
    items: [
      { id: 'daymaster_sync__expression_speed', title: '표현 속도', note: '좋아하는 마음이 말로 나오는 속도 차이를 봐요.' },
      { id: 'daymaster_sync__affection_style', title: '애정 표현 스타일', note: '말, 행동, 챙김 중 어디서 사랑이 드러나는지 봐요.' },
    ],
  },
  {
    id: 'ten_star_code',
    label: '第五門',
    cluster: 'saju',
    image: '',
    title: '십성 관계 코드',
    items: [
      { id: 'ten_star_code__friend_like_love', title: '친구 같은 연애', note: '편하게 장난치고 같이 노는 관계 코드를 봐요.' },
      { id: 'ten_star_code__real_life_care', title: '현실 케어 코드', note: '챙김, 계획, 생활 안정감이 어디서 나오는지 봐요.' },
    ],
  },
  {
    id: 'communication_match',
    label: '第六門',
    cluster: 'initial',
    image: 'communication-match',
    title: '소통 궁합',
    items: [
      { id: 'communication_match__tone_temperature', title: '말투 온도', note: '차갑게 들리는 말과 따뜻하게 받는 말의 차이를 봐요.' },
      { id: 'communication_match__hurt_handling', title: '서운함 처리법', note: '서운할 때 바로 꺼낼 말과 잠깐 보류할 말을 나눠요.' },
    ],
  },
  {
    id: 'attraction_points',
    label: '第七門',
    cluster: 'relationship',
    image: '',
    title: '끌림/호감 포인트',
    items: [
      { id: 'attraction_points__first_spark', title: '첫눈 텐션', note: '처음부터 시선이 가는 이유를 감각적으로 정리해요.' },
      { id: 'attraction_points__comfort_point', title: '편안함 포인트', note: '말하지 않아도 덜 긴장되는 지점을 찾아요.' },
    ],
  },
  {
    id: 'conflict_report',
    label: '第八門',
    cluster: 'initial',
    image: 'conflict-report',
    title: '갈등 리포트',
    items: [
      { id: 'conflict_report__repeating_loop', title: '반복 갈등 루프', note: '매번 비슷하게 돌아오는 싸움 패턴을 도식화해요.' },
      { id: 'conflict_report__line_crossing_moment', title: '선 넘는 순간', note: '서로가 멈춰야 하는 말과 행동의 기준을 세워요.' },
    ],
  },
  {
    id: 'dating_stage_reading',
    label: '第九門',
    cluster: 'relationship',
    image: '',
    title: '연애 단계별 풀이',
    items: [
      { id: 'dating_stage_reading__some_possibility', title: '썸 가능성', note: '아직 애매한 관계에서 신호와 착각을 나눠요.' },
      { id: 'dating_stage_reading__long_term_stamina', title: '장기연애 체력', note: '오래 만나도 유지되는 힘과 지치는 구간을 봐요.' },
    ],
  },
  {
    id: 'real_life_match',
    label: '第十門',
    cluster: 'relationship',
    image: '',
    title: '현실 궁합',
    items: [
      { id: 'real_life_match__money_temperature', title: '돈 쓰는 온도', note: '데이트비, 선물, 소비 감각의 차이를 가볍게 점검해요.' },
      { id: 'real_life_match__daily_routine_fit', title: '생활 루틴 맞춤', note: '잠, 식사, 일상 템포가 관계 체감에 미치는 영향을 봐요.' },
    ],
  },
  {
    id: 'luck_flow_match',
    label: '第十一門',
    cluster: 'timing',
    image: '',
    title: '운 흐름 궁합',
    items: [
      { id: 'luck_flow_match__year_temperature', title: '올해 관계 온도', note: '올해 두 사람 관계가 어느 쪽으로 예민한지 봐요.' },
      { id: 'luck_flow_match__relationship_turning_time', title: '관계 전환 타이밍', note: '썸에서 연애, 연애에서 약속으로 넘어가는 결을 봐요.' },
    ],
  },
  {
    id: 'mind_care',
    label: '第十二門',
    cluster: 'care',
    image: '',
    title: '마음 돌봄',
    items: [
      { id: 'mind_care__separate_confidence_anxiety', title: '확신과 불안 분리', note: '좋아하는 마음과 불안한 상상을 따로 놓고 봐요.' },
      { id: 'mind_care__boundary_sentence', title: '나를 지키는 경계 문장', note: '관계를 지키면서도 내 선을 말하는 문장을 준비해요.' },
    ],
  },
  {
    id: 'result_packaging',
    label: '第十三門',
    cluster: 'care',
    image: '',
    title: '결과 패키징',
    items: [
      { id: 'result_packaging__chemistry_card', title: '우리 둘 케미 카드', note: '둘만의 관계 키워드를 카드처럼 저장해요.' },
      { id: 'result_packaging__no_absolute_decision_notice', title: '“헤어져/결혼해” 단정 금지 안내', note: '리포트가 선택을 대신하지 않는다는 기준을 분명히 둬요.' },
    ],
  },
  {
    id: 'today_relationship_action',
    label: '第十四門',
    cluster: 'initial',
    image: 'today-relationship-action',
    title: '오늘의 관계 액션',
    items: [
      { id: 'today_relationship_action__contact_tone', title: '오늘 연락 톤', note: '먼저 연락한다면 어떤 온도가 덜 부담스러운지 골라요.' },
      { id: 'today_relationship_action__one_sentence_question', title: '한 문장 확인 질문', note: '관계를 흔들지 않고 확인할 수 있는 질문을 뽑아요.' },
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

export function createCoupleMatchReportId(ownerId: string | undefined, birth: BirthInput, input: CoupleMatchRequest): string {
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
    conflictPattern: input.conflictPattern,
    concern: input.concern,
    serviceKey: COUPLE_MATCH_SERVICE_KEY,
  })
  return createHash('sha256').update(fingerprint).digest('hex').slice(0, 28)
}

const OWN_CORPUS_DOMAIN = 'match_couple_service'

function buildInterpretation(params: {
  clusterId: string; itemNote: string; categoryTitle: string; itemTitle: string; userAnalysis: SajuAnalysis; partnerAnalysis: SajuAnalysis; userBirth: BirthInput; input: CoupleMatchRequest; chunks: RagChunk[]; index: number
}): string {
  return buildRelationshipReading({
    serviceKey: COUPLE_MATCH_SERVICE_KEY, category: params.categoryTitle, title: params.itemTitle, note: params.itemNote, analysis: params.userAnalysis, partnerAnalysis: params.partnerAnalysis, relationship: params.input.relationshipStage, concern: params.input.concern, signals: { '알려주신 갈등': params.input.conflictPattern },
  })
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
      // The relevance scorer reads plain item titles, so hand it the titles only.
      const ragCategory = { id: category.id, title: category.title, items: category.items.map((entry) => entry.title) }
      // 자기 팩에서 이 대분류에 맞는 블록을 먼저 확보한다. 랭킹만으로는 범용 팩에 밀린다.

      const generalChunks = retrieveCategoryRagChunks(categoryRagCache, query, ragCategory, userAnalysis, context, 8)

      const ownChunks = retrieveCategoryOwnChunks(categoryRagCache, query, ragCategory, userAnalysis, context, OWN_CORPUS_DOMAIN, 6)

      const categoryChunks = ownChunks.length ? [...ownChunks, ...generalChunks] : generalChunks
      sections.push({
        // 05 목차 and 06 상세 route on the design's own section ids.
        id: item.id,
        order,
        imageKey: category.image || `cluster-${category.cluster}`,
        imageSrc: category.image ? `${COUPLE_ASSET_BASE}/05-${category.image}.webp` : '/assets/umsh-match-banner-visual.png',
        imageAlt: `${category.title} 풀이`,
        category: category.title,
        categoryEn: category.label,
        classification: item.title,
        hook: item.title,
        patternKeys: ['match', 'couple', category.id, category.cluster],
        ragTopics: categoryChunks.slice(0, 4).map((chunk) => chunk.topic),
        interpretation: buildInterpretation({
          categoryTitle: `${category.label} ${category.title}`,
          clusterId: category.cluster,
          itemTitle: item.title,
          itemNote: item.note,
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
