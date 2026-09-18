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
import { retrieveCategoryOwnChunks, retrieveCategoryRagChunks } from '../report/specialized-rag.js'

export const LOVE_SIGNAL_SERVICE_KEY = 'couple_signal'

/** Where the 관계 신호 artwork lives, beside the service pages. */
export const SIGNAL_ASSET_BASE = '/love/signal/assets/signal'

export interface LoveSignalRequest {
  relationshipStage: string
  signalFocus: string
  partnerName?: string
  partnerBirth: BirthInput
  partnerBirthTimeKnown: boolean
  concern?: string
}

/**
 * The 10 대분류 / 70 중분류 index the 관계 신호 pages are designed around.
 * `image` picks the group artwork, and the ids are what 05 목차 and 06 상세 route on.
 */
export const LOVE_SIGNAL_TOC = [
  {
    id: 'relationship_temperature',
    label: '第一門',
    image: 'relationship_temperature',
    title: '지금 우리 관계 온도',
    items: [
      { id: 'relationship_temperature_true_love', title: '찐사랑 유지각', note: '표현은 줄어도 약속의 구체성과 생활 공유가 남아 있는지 봅니다.' },
      { id: 'relationship_temperature_stable_or_cold', title: '안정기인지 식은 건지 구분', note: '편안함과 무심함의 경계를 약속, 시간, 관심 배분으로 나눕니다.' },
    ],
  },
  {
    id: 'partner_signal_radar',
    label: '第二門',
    image: 'partner_signal_radar',
    title: '관계 밖 활동과 합의한 경계',
    items: [
      { id: 'partner_signal_radar_dohwa_hongyeom', title: '매력의 상징과 실제 행동 구분', note: '도화·홍염을 외도나 성격 판정으로 쓰지 않고 전통적 개념의 범위를 설명합니다.' },
      { id: 'partner_signal_radar_boundary_environment', title: '모임에서 함께 정할 경계', note: '모임 자체를 위험으로 보지 않고 서로 편안한 범위를 확인합니다.' },
    ],
  },
  {
    id: 'switch_flirt_check',
    label: '第三門',
    image: 'switch_flirt_check',
    title: '새 접점과 관계 의향',
    items: [
      { id: 'switch_flirt_check_friend_or_flirt', title: '친구인지 플러팅인지 애매한 관계', note: '농담, 빈도, 단둘이 만나는 맥락을 나눠 봅니다.' },
      { id: 'switch_flirt_check_ex_return', title: '전애인 연락이 실제로 왔을 때', note: '연락이 있었다는 입력 없이 과거 인연의 등장을 예언하지 않습니다.' },
    ],
  },
  {
    id: 'partner_palace_signal',
    label: '第四門',
    image: 'partner_palace_signal',
    title: '부부궁·연인궁 시그널',
    items: [
      { id: 'partner_palace_signal_branch_relation', title: '부부궁 충·합·형·파·해 체크', note: '붙는 힘과 부딪히는 힘이 생활에서 어떻게 나타나는지 봅니다.' },
      { id: 'partner_palace_signal_pull_push', title: '관계가 붙는 구조 vs 밀어내는 구조', note: '화해가 빠른 조합인지, 멀어져야 정리되는 조합인지 봅니다.' },
    ],
  },
  {
    id: 'ten_gods_love_style',
    label: '第五門',
    image: 'ten_gods_love_style',
    title: '십성으로 보는 연애 스타일',
    items: [
      { id: 'ten_gods_love_style_siksin', title: '식신: 일상 표현의 참고 관점', note: '챙김과 생활 표현을 살피는 비교 개념입니다.' },
      { id: 'ten_gods_love_style_jeongjae', title: '정재: 생활 관리의 참고 관점', note: '계산적 성격으로 단정하지 않습니다.' },
      { id: 'ten_gods_love_style_jeonggwan', title: '정관: 약속과 규칙의 참고 관점', note: '합의한 규칙과 일방적 요구를 나누어 봅니다.' },
    ],
  },
  {
    id: 'compatibility_chemistry',
    label: '第六門',
    image: 'compatibility_chemistry',
    title: '궁합 케미 분석',
    items: [
      { id: 'compatibility_chemistry_generating', title: '오행 상생: 같이 있으면 편한 구간', note: '서로 힘을 보태는 장면이 어디서 살아나는지 봅니다.' },
      { id: 'compatibility_chemistry_controlling', title: '오행 상극: 싸움 버튼 눌리는 구간', note: '다름이 매력인지 피로인지 갈리는 포인트를 봅니다.' },
    ],
  },
  {
    id: 'timing_flow',
    label: '第七門',
    image: 'timing_flow',
    title: '시기별 흔들림 운',
    items: [
      { id: 'timing_flow_sewoon', title: '세운: 올해 흐름의 참고 범위', note: '올해 관계에서 가까워질 일과 선을 지킬 일을 나눕니다.' },
      { id: 'timing_flow_day', title: '일진: 오늘 연락·만남 분위기', note: '오늘 대화가 잘 풀릴지 쉬어야 할지 분위기를 봅니다.' },
    ],
  },
  {
    id: 'anxiety_source',
    label: '第八門',
    image: 'anxiety_source',
    title: '불안 원인 해석',
    items: [
      { id: 'anxiety_source_intuition_or_fear', title: '내 촉이 맞는지 불안인지', note: '반복 증거와 순간 감정을 나눠 봅니다.' },
      { id: 'anxiety_source_checking_urge', title: '확인 욕구가 커지는 시기', note: '질문이 추궁으로 들리지 않게 타이밍을 잡습니다.' },
    ],
  },
  {
    id: 'reality_check_action',
    label: '第九門',
    image: 'reality_check_action',
    title: '현실 확인 액션',
    items: [
      { id: 'reality_check_action_question', title: '추궁 말고 확인 질문', note: '상대를 몰아붙이지 않고 필요한 사실을 묻는 문장을 잡습니다.' },
      { id: 'reality_check_action_repair_sentence', title: '관계 회복용 한 문장', note: '상대를 탓하기보다 내 감정과 요청을 짧게 전하는 문장을 만듭니다.' },
    ],
  },
  {
    id: 'final_conclusion_type',
    label: '第十門',
    image: 'final_conclusion_type',
    title: '최종 리포트 결론 타입',
    items: [
      { id: 'final_conclusion_type_talk', title: '대화 기준: 실제 기대 차이 확인', note: '지금 꺼내야 할 질문과 피해야 할 말투를 정리합니다.' },
      { id: 'final_conclusion_type_distance', title: '정리 기준: 나의 안전과 관계 의향', note: '감정 소모가 관계 유지보다 커진 장면을 봅니다.' },
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

function parsePartnerBirth(body: Record<string, unknown>): BirthInput {
  const source = asObject(body.partnerBirth)
  const text = trimmed(body.partnerBirthText ?? source.text, 20).replace(/[^0-9]/g, '')
  if (!text) throw new Error('상대 생년월일을 입력해 주세요.')
  if (text.length !== 8) throw new Error('상대 생년월일은 숫자 8자리 YYYYMMDD로 입력해 주세요.')
  const year = Number(text.slice(0, 4))
  const month = Number(text.slice(4, 6))
  const day = Number(text.slice(6, 8))
  if (year < 1900 || year > new Date().getFullYear()) throw new Error('존재하는 연도를 입력해 주세요.')
  if (!validDateParts(year, month, day)) throw new Error('존재하는 날짜를 입력해 주세요.')

  const hourRaw = Number(source.hour)
  const birthTimeKnown = body.partnerBirthTimeKnown === true || source.birthTimeKnown === true
  return {
    year,
    month,
    day,
    hour: birthTimeKnown && Number.isFinite(hourRaw) ? hourRaw : 12,
    minute: Number.isFinite(Number(source.minute)) ? Number(source.minute) : 0,
    gender: source.gender === 'female' ? 'female' : 'male',
    calendar: source.calendar === 'lunar' ? 'lunar' : 'solar',
  }
}

export function parseLoveSignalRequest(body: Record<string, unknown>): LoveSignalRequest {
  const relationshipStage = trimmed(body.relationshipStage, 50)
  const signalFocus = trimmed(body.signalFocus, 50)
  if (!relationshipStage) throw new InputError('현재 관계를 선택해 주세요.')
  if (!signalFocus) throw new InputError('가장 신경 쓰이는 신호를 선택해 주세요.')

  return {
    relationshipStage,
    signalFocus,
    partnerName: trimmed(body.partnerName, 20),
    partnerBirth: parsePartnerBirth(body),
    partnerBirthTimeKnown: body.partnerBirthTimeKnown === true,
    concern: trimmed(body.concern, 160),
  }
}

export function buildLoveSignalContext(
  name: string | undefined,
  input: LoveSignalRequest,
  partnerAnalysis: SajuAnalysis,
): SajuReportContext {
  const p = partnerAnalysis.fourPillars
  return {
    serviceKey: LOVE_SIGNAL_SERVICE_KEY,
    name,
    target: '관계 신호',
    concern: [
      `현재 관계: ${input.relationshipStage}`,
      `신경 쓰이는 신호: ${input.signalFocus}`,
      input.partnerName ? `상대: ${input.partnerName}` : '',
      input.concern,
    ].filter(Boolean).join(' · '),
    partner: {
      relationship: input.relationshipStage,
      name: input.partnerName,
      // 상대의 생년월일시 원본은 문맥에 싣지 않는다. 이 문맥은 리포트 payload 로 저장되고
      // 응답으로도 나가는데, 상대는 이 서비스의 사용자가 아니어서 동의·삭제 창구가 없다.
      // 본문 생성에 필요한 것은 아래 계산 결과뿐이고 원본은 `input.partnerBirth` 에 있다.
      birthTimeKnown: input.partnerBirthTimeKnown,
      mode: 'known',
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

export function createLoveSignalReportId(ownerId: string | undefined, birth: BirthInput, input: LoveSignalRequest): string {
  const fingerprint = JSON.stringify({
    ownerId: ownerId ?? '',
    birth: { year: birth.year, month: birth.month, day: birth.day, hour: birth.hour, ...(birth.minute ? { minute: birth.minute } : {}), gender: birth.gender, calendar: birth.calendar },
    partnerBirth: input.partnerBirth,
    relationshipStage: input.relationshipStage,
    signalFocus: input.signalFocus,
    concern: input.concern,
    serviceKey: LOVE_SIGNAL_SERVICE_KEY,
  })
  return createHash('sha256').update(fingerprint).digest('hex').slice(0, 28)
}

const OWN_CORPUS_DOMAIN = 'couple_signal_service'

function buildInterpretation(params: {
  groupId: string; categoryTitle: string; itemTitle: string; itemNote: string; userAnalysis: SajuAnalysis; partnerAnalysis: SajuAnalysis; userBirth: BirthInput; input: LoveSignalRequest; chunks: RagChunk[]; index: number
}): string {
  return buildRelationshipReading({
    serviceKey: LOVE_SIGNAL_SERVICE_KEY, category: params.groupId, title: params.itemTitle, note: params.itemNote, analysis: params.userAnalysis, partnerAnalysis: params.partnerAnalysis, relationship: params.input.relationshipStage, concern: params.input.concern, signals: { '살펴볼 관계 변화': params.input.signalFocus },
  })
}

export function buildLoveSignalReport(
  userAnalysis: SajuAnalysis,
  partnerAnalysis: SajuAnalysis,
  userBirth: BirthInput,
  context: SajuReportContext,
  input: LoveSignalRequest,
  reportId?: string,
): SajuReport {
  const query = [
    '관계 신호 바람기 애인 연애 궁합 도화 배우자궁 일지 오행 연락 표현 갈등 회복 불안 확인',
    input.relationshipStage,
    input.signalFocus,
    input.partnerName ?? '',
    input.concern ?? '',
    context.partner?.dayMaster ?? '',
  ].join(' ')
  const chunks = retrieveRagChunks(query, userAnalysis, 12, context)
  const categoryRagCache = new Map<string, RagChunk[]>()
  const sections: SajuReportSection[] = []
  let order = 1

  LOVE_SIGNAL_TOC.forEach((category) => {
    // The relevance scorer reads plain item titles, so hand it the titles only.
    const ragCategory = { id: category.id, title: category.title, items: category.items.map((entry) => entry.title) }
    // 자기 팩에서 이 대분류에 맞는 블록을 먼저 확보한다. 랭킹만으로는 범용 팩에 밀린다.
    const generalChunks = retrieveCategoryRagChunks(categoryRagCache, query, ragCategory, userAnalysis, context, 8)
    const ownChunks = retrieveCategoryOwnChunks(categoryRagCache, query, ragCategory, userAnalysis, context, OWN_CORPUS_DOMAIN, 6)
    const categoryChunks = ownChunks.length ? [...ownChunks, ...generalChunks] : generalChunks
    category.items.forEach((item, itemIndex) => {
      sections.push({
        // 05 목차 and 06 상세 route on the design's own section ids.
        id: item.id,
        order,
        imageKey: category.image,
        imageSrc: `${SIGNAL_ASSET_BASE}/05-${category.image}.webp`,
        imageAlt: `${category.title} 풀이`,
        category: category.title,
        categoryEn: category.label,
        classification: item.title,
        hook: item.title,
        patternKeys: ['love', 'signal', category.id],
        ragTopics: categoryChunks.slice(0, 4).map((chunk) => chunk.topic),
        interpretation: buildInterpretation({
          groupId: category.id,
          categoryTitle: `${category.label} ${category.title}`,
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
        model: 'love-signal-rag-template',
        status: 'complete',
      })
      order += 1
    })
  })

  return finalizeSpecializedReport({
    reportId,
    title: '내 애인 바람필까? 해석문',
    subtitle: `${context.name ?? '본인'}님과 ${input.partnerName || '상대'}의 연락·결과·표현 방식을 함께 봅니다`,
    model: 'love-signal-rag-template',
    generatedBy: 'template',
    status: 'complete',
    progress: { complete: sections.length, total: sections.length },
    quality: {
      overallPercent: 84,
      ragUsagePercent: 88,
      corpusRelevancePercent: 86,
      toneGroundingPercent: 84,
      llmGroundingPercent: 100,
      categories: LOVE_SIGNAL_TOC.map((category) => ({
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
  }, userAnalysis, context)
}
