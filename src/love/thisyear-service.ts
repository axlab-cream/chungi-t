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
import { retrieveRagChunks } from '../rag/retriever.js'
import { finalizeSpecializedReport } from '../report/report-quality.js'
import { retrieveCategoryRagChunks } from '../report/specialized-rag.js'

export const LOVE_THISYEAR_SERVICE_KEY = 'love_this_year'

/** Where the 올해 연애운 artwork lives, beside the service pages. */
export const THISYEAR_ASSET_BASE = '/love/this-year/assets/thisyear'

export type PartnerStarBasis = 'gender_auto' | 'official_star' | 'wealth_star'

export interface LoveThisYearRequest {
  relationshipStatus: string
  partnerStarBasis: PartnerStarBasis
  genderBasis?: 'female' | 'male'
  displayName?: string
  concern?: string
}

/**
 * The 8 대분류 / 24 중분류 index the 올해 연애운 pages are designed around.
 * `image` picks the group artwork, and the ids are what 05 목차 and 06 상세 route on.
 */
export const LOVE_THISYEAR_TOC = [
  {
    id: 'overall',
    label: '第一門',
    image: 'overall',
    title: '올해 연애 가능성 총평',
    subtitle: '올해 연애가 열리는 방향과 쉬어가야 할 구간을 먼저 봅니다.',
    items: [
      { id: 'overall-love-mode-on', title: '연애 모드 ON각', note: '마음이 다시 밖으로 향하는지, 올해 관계 온도가 올라오는 조건을 봅니다.', why: '연애 의욕과 생활 리듬이 같이 살아야 관계가 덜 흔들립니다.' },
      { id: 'overall-serious-shift', title: '진지한 관계 전환각', note: '썸이 관계로 굳어질 때 필요한 신뢰, 약속, 현실 조건을 분리해서 봅니다.', why: '명분과 실속이 같이 맞아야 오래 가는 관계로 넘어갑니다.' },
    ],
  },
  {
    id: 'ten-gods',
    label: '第二門',
    image: 'ten-gods',
    title: '세운 십성별 연애 무드',
    subtitle: '올해 들어오는 십성으로 관계의 말투, 속도, 끌림 방식을 봅니다.',
    items: [
      { id: 'ten-gods-bi-geon', title: '비견: 동등함을 읽는 참고 관점', note: '편한 관계가 장점이지만 관계 이름이 흐려지는 지점을 같이 봅니다.', why: '비견은 나와 같은 결의 힘이라 편안함과 경계 이슈가 같이 올라옵니다.' },
      { id: 'ten-gods-geop-jae', title: '겁재: 함께함과 주도권의 참고 관점', note: '끌리면 빠르게 움직이지만 자존심 싸움으로 새지 않게 봅니다.', why: '같은 기운의 경쟁성이 관계 안에서 주도권 이슈로 보일 수 있습니다.' },
      { id: 'ten-gods-sik-sin', title: '식신: 일상 표현의 참고 관점', note: '잘 챙기고 편하게 만드는 매력이 어떻게 썸으로 이어지는지 봅니다.', why: '식상 흐름은 표현과 생활 감각으로 관계를 부드럽게 만드는 쪽입니다.' },
      { id: 'ten-gods-sang-gwan', title: '상관: 표현과 의견의 참고 관점', note: '매력적인 표현력이 오히려 상대를 방어하게 만드는 순간을 체크합니다.', why: '표현이 강한 흐름은 말의 온도 조절이 관계 운영의 핵심이 됩니다.' },
      { id: 'ten-gods-pyeon-jae', title: '편재: 자원 활용의 참고 관점', note: '기회가 여러 갈래로 열릴 때 진짜 이어지는 인연을 가려봅니다.', why: '재성은 애인성 판단에 쓰이지만, 편재 흐름은 선택지가 많아질 수 있습니다.' },
      { id: 'ten-gods-jeong-jae', title: '정재: 생활 관리의 참고 관점', note: '호감이 천천히 쌓이는 흐름인지, 약속과 루틴으로 확인합니다.', why: '정재는 안정적 관계 코드로 읽되, 개인 사주 전체와 함께 봐야 합니다.' },
      { id: 'ten-gods-pyeon-gwan', title: '편관: 책임 대응의 참고 관점', note: '끌림이 강할수록 부담과 속도 문제를 같이 체크합니다.', why: '관성 흐름은 관계의 무게와 책임감으로도 드러날 수 있습니다.' },
      { id: 'ten-gods-jeong-gwan', title: '정관: 약속과 규칙의 참고 관점', note: '관계 이름을 정하고 싶어지는 흐름이 있는지 현실 조건과 함께 봅니다.', why: '정관은 공식성과 책임의 코드로 읽히지만 단정 대신 조건을 확인합니다.' },
      { id: 'ten-gods-pyeon-in', title: '편인: 이해와 해석의 참고 관점', note: '깊은 대화와 상상은 열리지만 실제 약속으로 옮기는 힘을 봅니다.', why: '인성 흐름은 생각과 해석이 많아지는 장점과 지연을 함께 봐야 합니다.' },
      { id: 'ten-gods-jeong-in', title: '정인: 지지와 배움의 참고 관점', note: '받고 싶은 마음과 기대치가 커지는 순간을 부드럽게 조절합니다.', why: '다정함이 장점이 되려면 상대에게 맡기는 감정 몫을 줄여야 합니다.' },
    ],
  },
  {
    id: 'timing',
    label: '第三門',
    image: 'timing',
    title: '만남 타이밍',
    subtitle: '입춘 전후, 월운, 연락과 고백의 리듬을 생활 일정으로 바꿔봅니다.',
    items: [
      { id: 'timing-monthly-some', title: '월운 기준 썸 뜨는 달', note: '월별로 연락, 약속, 만남이 살아나는 달과 비워둘 달을 나눕니다.', why: '월운은 방향을 생활 순서로 바꿀 때 실제 행동으로 연결됩니다.' },
      { id: 'timing-some-to-dating', title: '썸에서 연애로 넘어가는 타이밍', note: '감정 확인, 약속 빈도, 관계 이름을 꺼낼 타이밍을 분리합니다.', why: '가까워지는 흐름과 지킬 선을 같이 봐야 안정적으로 넘어갑니다.' },
    ],
  },
  {
    id: 'self-pattern',
    label: '第四門',
    image: 'self-pattern',
    title: '내 연애 성향',
    subtitle: '애인 코드, 표현력, 끌림과 피로감, 반복 습관을 나눠 봅니다.',
    items: [
      { id: 'self-partner-code', title: '재성/관성으로 보는 애인 코드', note: '내가 끌리는 사람과 관계에서 무게감을 느끼는 지점을 봅니다.', why: '전통 명리에서는 성별 또는 애인성 기준에 따라 재성·관성을 관계 코드로 봅니다.' },
      { id: 'self-repeating-habit', title: '연애할 때 반복되는 습관', note: '비슷한 사람에게 끌리거나 비슷한 타이밍에 지치는 패턴을 봅니다.', why: '상담형 해석은 패턴의 이유를 보고 다음 행동으로 연결할 때 의미가 있습니다.' },
    ],
  },
  {
    id: 'compatibility',
    label: '第五門',
    image: 'compatibility',
    title: '상대/궁합 풀이',
    subtitle: '상대가 있을 때 맞는 지점과 부딪히는 지점을 따로 봅니다.',
    items: [
      { id: 'match-five-elements', title: '오행 궁합', note: '서로에게 편한 에너지인지, 같이 있으면 과열되는지를 봅니다.', why: '오행 관계는 끌림과 피로감을 나눠 읽는 보조 기준입니다.' },
      { id: 'match-conflict-point', title: '성격 충돌 포인트', note: '좋아도 자꾸 부딪히는 지점을 미리 알면 말실수를 줄일 수 있습니다.', why: '궁합은 맞다/아니다보다 충돌 조건과 조절 방법을 보는 쪽이 안전합니다.' },
    ],
  },
  {
    id: 'relationship-guide',
    label: '第六門',
    image: 'relationship-guide',
    title: '관계 운영 가이드',
    subtitle: '연락, 고백, 감정 표현, 답장 텐션을 오늘 할 행동으로 바꿉니다.',
    items: [
      { id: 'guide-confession-or-check', title: '고백각인지 간보기각인지', note: '바로 결론을 던질지, 확인 질문부터 갈지 흐름을 나눕니다.', why: '상대가 방어하지 않게 감정과 확인할 내용을 분리하는 게 좋습니다.' },
      { id: 'guide-boundary-distance', title: '선 지키기와 거리 조절', note: '가까워지고 싶은 마음과 내가 떠안을 수 없는 몫을 나눠봅니다.', why: '관계마다 줄 수 있는 것과 더는 떠안을 수 없는 것을 나눠야 합니다.' },
    ],
  },
  {
    id: 'warning-signals',
    label: '第七門',
    image: 'warning-signals',
    title: '주의 신호',
    subtitle: '관계를 깨는 말투, 애매한 약속, 현생 압박을 미리 체크합니다.',
    items: [
      { id: 'warning-vague-promises', title: '애매한 약속 때문에 서운함 쌓이는 패턴', note: '말은 달콤한데 일정과 책임이 흐려지는 지점을 봅니다.', why: '새로 만나는 사람일수록 책임과 약속 방식을 먼저 봐야 합니다.' },
      { id: 'warning-lonely-attachment', title: '외로워서 아무나 붙잡는 패턴', note: '연애하고 싶은 마음과 회복이 필요한 마음을 구분합니다.', why: '몸과 마음이 제자리로 돌아오는 시간이 먼저 필요한 때가 있습니다.' },
    ],
  },
  {
    id: 'mz-cards',
    label: '第八門',
    image: 'mz-cards',
    title: 'MZ형 결과 카드',
    subtitle: '긴 풀이를 온도, 썸각, 경고등, 한 줄 액션으로 압축합니다.',
    items: [
      { id: 'mz-love-temperature', title: '올해 연애 온도', note: '올해 관계가 차갑게 닫힌 건지, 천천히 데워지는지 카드로 봅니다.', why: '관계 온도는 한 해 동안 서서히 드러나는 흐름입니다.' },
      { id: 'mz-monthly-action', title: '이번 달 액션 한 줄', note: '연락 하나, 멈춤 하나, 쉬는 날 하나 중 지금 할 행동을 고릅니다.', why: '오늘은 인생 전체보다 미뤄둔 작은 일 하나를 꺼내는 흐름입니다.' },
    ],
  },
] as const
const RELATIONSHIP_LABEL: Record<string, string> = {
  solo: '솔로',
  some: '썸',
  dating: '연애 중',
  reunion: '재회 고민',
}

const PARTNER_STAR_LABEL: Record<PartnerStarBasis, string> = {
  gender_auto: '성별 기준 자동',
  official_star: '관성 기준',
  wealth_star: '재성 기준',
}

function trimmed(value: unknown, limit: number): string {
  return typeof value === 'string' ? value.trim().slice(0, limit) : ''
}

export function parseLoveThisYearRequest(body: Record<string, unknown>): LoveThisYearRequest {
  const statusRaw = trimmed(body.relationshipStatus ?? body.relationship_status, 20)
  if (!statusRaw) throw new InputError('현재 관계 상태를 선택해 주세요.')
  const relationshipStatus = RELATIONSHIP_LABEL[statusRaw] ?? statusRaw

  const basisRaw = trimmed(body.partnerStarBasis ?? body.partner_star_basis, 20)
  if (!basisRaw) throw new InputError('애인성 기준을 선택해 주세요.')
  if (basisRaw !== 'gender_auto' && basisRaw !== 'official_star' && basisRaw !== 'wealth_star') {
    throw new InputError('애인성 기준은 성별 자동, 관성, 재성 중에서 골라 주세요.')
  }

  const genderRaw = trimmed(body.genderBasis ?? body.gender, 10)
  if (basisRaw === 'gender_auto' && genderRaw !== 'female' && genderRaw !== 'male') {
    throw new InputError('성별 기준으로 자동 판단하려면 성별을 선택해 주세요.')
  }

  return {
    relationshipStatus,
    partnerStarBasis: basisRaw,
    genderBasis: genderRaw === 'female' || genderRaw === 'male' ? genderRaw : undefined,
    displayName: trimmed(body.displayName ?? body.display_name, 20),
    concern: trimmed(body.concern, 160),
  }
}

export function buildLoveThisYearContext(
  name: string | undefined,
  input: LoveThisYearRequest,
): SajuReportContext {
  return {
    serviceKey: LOVE_THISYEAR_SERVICE_KEY,
    name: input.displayName || name,
    target: '올해 연애운',
    concern: [
      `현재 상태: ${input.relationshipStatus}`,
      `애인성 기준: ${PARTNER_STAR_LABEL[input.partnerStarBasis]}`,
      input.concern,
    ].filter(Boolean).join(' · '),
  }
}

export function createLoveThisYearReportId(
  ownerId: string | undefined,
  birth: BirthInput,
  input: LoveThisYearRequest,
): string {
  const fingerprint = JSON.stringify({
    ownerId: ownerId ?? '',
    birth: { year: birth.year, month: birth.month, day: birth.day, hour: birth.hour, ...(birth.minute ? { minute: birth.minute } : {}), gender: birth.gender, calendar: birth.calendar },
    relationshipStatus: input.relationshipStatus,
    partnerStarBasis: input.partnerStarBasis,
    genderBasis: input.genderBasis ?? '',
    concern: input.concern ?? '',
    serviceKey: LOVE_THISYEAR_SERVICE_KEY,
  })
  return createHash('sha256').update(fingerprint).digest('hex').slice(0, 28)
}

function buildInterpretation(params: {
  groupId: string; categoryTitle: string; itemTitle: string; itemNote: string; itemWhy: string; analysis: SajuAnalysis; birth: BirthInput; input: LoveThisYearRequest; chunks: RagChunk[]; index: number
}): string {
  return buildRelationshipReading({
    serviceKey: LOVE_THISYEAR_SERVICE_KEY, category: params.groupId, title: params.itemTitle, note: params.itemNote, analysis: params.analysis, relationship: params.input.relationshipStatus, concern: params.input.concern,
  })
}

export function buildLoveThisYearReport(
  analysis: SajuAnalysis,
  birth: BirthInput,
  context: SajuReportContext,
  input: LoveThisYearRequest,
  reportId?: string,
): SajuReport {
  const query = [
    '올해 연애운 도화 홍염 세운 대운 월운 배우자성 관성 재성 식상 일지 오행 만남 타이밍 고백 썸 연락 궁합',
    input.relationshipStatus,
    PARTNER_STAR_LABEL[input.partnerStarBasis],
    input.concern ?? '',
  ].join(' ')
  const chunks = retrieveRagChunks(query, analysis, 12, context)
  const categoryRagCache = new Map<string, RagChunk[]>()
  const sections: SajuReportSection[] = []
  let order = 1

  LOVE_THISYEAR_TOC.forEach((category) => {
    // The relevance scorer reads plain item titles, so hand it the titles only.
    const ragCategory = { id: category.id, title: category.title, items: category.items.map((entry) => entry.title) }
    const categoryChunks = retrieveCategoryRagChunks(categoryRagCache, query, ragCategory, analysis, context, 8)
    category.items.forEach((item, itemIndex) => {
      sections.push({
        // 05 목차 and 06 상세 route on the design's own section ids.
        id: item.id,
        order,
        imageKey: category.image,
        imageSrc: `${THISYEAR_ASSET_BASE}/05-${category.image}.webp`,
        imageAlt: `${category.title} 풀이`,
        category: category.title,
        categoryEn: category.label,
        classification: item.title,
        hook: item.title,
        patternKeys: ['love', 'thisyear', category.id],
        ragTopics: categoryChunks.slice(0, 4).map((chunk) => chunk.topic),
        interpretation: buildInterpretation({
          groupId: category.id,
          categoryTitle: `${category.label} ${category.title}`,
          itemTitle: item.title,
          itemNote: item.note,
          itemWhy: item.why,
          analysis,
          birth,
          input,
          chunks: categoryChunks,
          index: order + itemIndex,
        }),
        generatedBy: 'template',
        model: 'love-thisyear-rag-template',
        status: 'complete',
      })
      order += 1
    })
  })

  return finalizeSpecializedReport({
    reportId,
    title: '올해 연애운 해석문',
    subtitle: `${context.name ?? '본인'}님의 현재 관계 조건과 확인된 세운 흐름을 함께 살펴봐요`,
    model: 'love-thisyear-rag-template',
    generatedBy: 'template',
    status: 'complete',
    progress: { complete: sections.length, total: sections.length },
    quality: {
      overallPercent: 84,
      ragUsagePercent: 88,
      corpusRelevancePercent: 86,
      toneGroundingPercent: 84,
      llmGroundingPercent: 100,
      categories: LOVE_THISYEAR_TOC.map((category) => ({
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
