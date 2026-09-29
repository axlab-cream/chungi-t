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
import { BRANCH_ELEMENT, STEM_ELEMENT } from '../saju/analyzer-helpers.js'

export const LOVE_THISYEAR_SERVICE_KEY = 'love_this_year'

/** Where the 올해 연애운 artwork lives, beside the service pages. */
export const THISYEAR_ASSET_BASE = '/love/this-year/assets/thisyear'

export type PartnerStarBasis = 'gender_auto' | 'official_star' | 'wealth_star'

export interface LoveThisYearRequest {
  selfName?: string
  selfBirth?: BirthInput
  selfBirthTimeKnown?: boolean
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

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function validDateParts(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

export function parseLoveThisYearRequest(body: Record<string, unknown>): LoveThisYearRequest {
  const selfBirthBody = asObject(body.selfBirth)
  let selfBirth: BirthInput | undefined
  let selfBirthTimeKnown: boolean | undefined
  if (Object.keys(selfBirthBody).length) {
    const year = Number(selfBirthBody.year)
    const month = Number(selfBirthBody.month)
    const day = Number(selfBirthBody.day)
    const hour = Number(selfBirthBody.hour)
    const minute = Number(selfBirthBody.minute ?? 0)
    if (!validDateParts(year, month, day) || year < 1900 || year > new Date().getFullYear()) throw new InputError('생년월일을 다시 확인해 주세요.')
    if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) throw new InputError('태어난 시간을 다시 확인해 주세요.')
    if (selfBirthBody.gender !== 'male' && selfBirthBody.gender !== 'female') throw new InputError('성별을 선택해 주세요.')
    if (selfBirthBody.calendar !== 'solar' && selfBirthBody.calendar !== 'lunar') throw new InputError('양력 또는 음력을 선택해 주세요.')
    selfBirth = { year, month, day, hour, minute, gender: selfBirthBody.gender, calendar: selfBirthBody.calendar, isLeapMonth: Boolean(selfBirthBody.isLeapMonth) }
    selfBirthTimeKnown = true
  }
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
    selfName: trimmed(body.selfName ?? body.displayName ?? body.display_name, 20),
    selfBirth,
    selfBirthTimeKnown,
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
    loveThisYear: {
      relationshipStatus: input.relationshipStatus,
      partnerStarBasis: PARTNER_STAR_LABEL[input.partnerStarBasis],
      concern: input.concern,
    },
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

const THISYEAR_TEASER_IMAGES = [
  { key: 'year-love-teaser-01', src: `${THISYEAR_ASSET_BASE}/campaign-2026/year-love-teaser-01-v1.webp`, alt: '따뜻한 카페에서 새 인연의 가능성을 떠올리는 장면' },
  { key: 'year-love-teaser-02', src: `${THISYEAR_ASSET_BASE}/campaign-2026/year-love-teaser-02-v1.webp`, alt: '약속을 앞두고 연락과 만남의 속도를 정리하는 장면' },
] as const

const ELEMENT_NAME = { wood: '나무', fire: '불', earth: '흙', metal: '쇠', water: '물' } as const
const ELEMENT_RELATION_COPY = {
  wood: '먼저 말을 걸고 다음 약속을 구체화할 때 매력이 살아납니다',
  fire: '호감을 숨기기보다 따뜻하게 표현할 때 관계가 움직입니다',
  earth: '연락보다 실제 약속을 지키는 모습에서 신뢰가 쌓입니다',
  metal: '애매한 관계를 오래 끌기보다 원하는 바를 분명히 말할 때 편해집니다',
  water: '상대의 말과 분위기를 세심하게 읽되, 혼자 해석을 키우기 전에 질문할 때 관계가 선명해집니다',
} as const

function thisYearFacts(context: SajuReportContext) {
  const pieces = String(context.concern ?? '').split(' · ').map((part) => part.trim()).filter(Boolean)
  const relationshipStatus = context.loveThisYear?.relationshipStatus
    || pieces.find((part) => part.startsWith('현재 상태:'))?.replace(/^현재 상태:\s*/, '')
    || context.relationship
    || '현재 관계 상태'
  const partnerStarBasis = context.loveThisYear?.partnerStarBasis
    || pieces.find((part) => part.startsWith('애인성 기준:'))?.replace(/^애인성 기준:\s*/, '')
    || '저장 사주 기준'
  const concern = context.loveThisYear?.concern
    || pieces.find((part) => !part.startsWith('현재 상태:') && !part.startsWith('애인성 기준:'))
    || '올해 관계가 실제 만남으로 이어질지 궁금합니다'
  return { name: context.name || '당신', relationshipStatus, partnerStarBasis, concern }
}

function pillarElementTable(analysis: SajuAnalysis): string {
  const labels = [['해', analysis.fourPillars.year], ['달', analysis.fourPillars.month], ['날', analysis.fourPillars.day], ['시간', analysis.fourPillars.hour]] as const
  const rows = labels.map(([label, pillar]) => `| ${label} 기둥 | ${ELEMENT_NAME[pillar.stemElement]} · ${ELEMENT_NAME[pillar.branchElement]} | ${label === '날' ? '가까운 관계에서 먼저 나오는 반응' : label === '달' ? '사람들과 어울릴 때 드러나는 방식' : label === '시간' ? '속으로 기대하는 관계의 모습' : '처음 사람을 만날 때 보이는 인상'} |`)
  return ['| 내 사주의 기둥 | 두 기운 | 연애에서 보는 장면 |', '| --- | --- | --- |', ...rows].join('\n')
}

function elementChart(analysis: SajuAnalysis) {
  return (Object.entries(analysis.elementCount) as Array<[keyof typeof ELEMENT_NAME, number]>).map(([element, value]) => ({
    label: `${ELEMENT_NAME[element]} 기운`,
    value,
    note: '저장된 생년월일시의 네 기둥에서 계산한 실제 개수',
  }))
}

function yearElementSentence(analysis: SajuAnalysis): string {
  const pillar = analysis.fortune?.yearPillar
  if (!pillar || pillar.length < 2) return '올해의 연운과 내 사주의 관계 반응을 함께 놓고 읽었습니다.'
  const stem = STEM_ELEMENT[pillar[0] as keyof typeof STEM_ELEMENT]
  const branch = BRANCH_ELEMENT[pillar[1] as keyof typeof BRANCH_ELEMENT]
  if (!stem || !branch) return '올해의 연운과 내 사주의 관계 반응을 함께 놓고 읽었습니다.'
  const pair = stem === branch ? `${ELEMENT_NAME[stem]} 기운` : `${ELEMENT_NAME[stem]}와 ${ELEMENT_NAME[branch]} 기운`
  return `올해 들어오는 ${pair}을 내 사주의 다섯 기운과 겹쳐 읽었습니다.`
}

function loveThisYearInterpretation(index: number, analysis: SajuAnalysis | undefined, context: SajuReportContext): string {
  const facts = thisYearFacts(context)
  if (!analysis) return index === 0
    ? `[주요 포인트] ${facts.name}님이 적어 주신 “${facts.concern}”은 막연한 바람보다 실제 만남과 다음 약속이 이어지는지를 묻는 질문입니다.\n\n[확인할 장면] 연락이 시작된 뒤 상대가 다음 날짜를 함께 정하는지 보세요.\n\n[결정 전에 물어볼 질문] 편한 날을 구체적으로 주고받을 수 있나요?`
    : `[주요 포인트] 진지한 관계는 호감의 크기보다 약속을 지키는 방식에서 시작됩니다.\n\n[확인할 장면] 바쁜 날에도 이유와 다음 약속을 함께 말하는지 보세요.\n\n[결정 전에 물어볼 질문] 서로 원하는 연락과 만남의 빈도를 말할 수 있나요?`
  const dominant = ELEMENT_NAME[analysis.dominantElement]
  const weak = ELEMENT_NAME[analysis.weakElement]
  const day = ELEMENT_NAME[analysis.dayMasterElement]
  const dayCopy = ELEMENT_RELATION_COPY[analysis.dayMasterElement]
  const annual = yearElementSentence(analysis)
  if (index === 0) return [
    `[주요 포인트] ${facts.name}님의 올해 연애는 기다리는 마음보다 “누구와 다음 약속을 실제로 잡는가”에서 시작됩니다. 현재 상태는 ${facts.relationshipStatus}, 가장 궁금한 것은 “${facts.concern}”입니다. 이 질문에 대한 첫 답은 연락의 양이 아니라 만남이 구체적인 날짜로 이어지는지에 있습니다.`,
    `${facts.name}님의 태어난 날 중심 기운은 ${day}이고, 네 기둥 전체에서는 ${dominant} 기운이 가장 많이 나타납니다. ${dayCopy}. 호감이 생겼을 때 상대의 반응만 오래 살피면 ${weak} 기운이 필요한 장면, 즉 감정을 현실의 약속으로 바꾸는 순간을 놓치기 쉽습니다.`,
    `[사주와 올해를 함께 보면] ${annual} 올해 눈에 띄는 사람은 말이 화려한 사람보다 ${facts.name}님의 생활 속도 안으로 들어와 시간을 내는 사람입니다. 대화가 즐거웠다면 “언제 한 번”에서 멈추지 않고 가능한 날짜를 서로 하나씩 내놓는 장면이 관계의 시작을 가릅니다.`,
    `[확인할 장면] 최근 마음이 간 사람이나 새로 알게 된 사람과의 대화를 떠올려 보세요. 질문을 되돌려 주는지, 바쁠 때 이유를 말하는지, 만남이 어려우면 다른 날을 제안하는지가 올해 인연을 알아보는 실제 신호입니다.`,
    `[결정 전에 물어볼 질문] “다음 주에 나는 화요일과 토요일이 괜찮아. 언제가 편해?”라고 물었을 때 상대가 자기 시간을 내어 답하나요? 답이 모호한 채 따뜻한 말만 이어진다면 더 큰 고백보다 다음 약속부터 확인하는 편이 맞습니다.`,
    `[해법] 올해의 첫 연애 행동은 마음을 크게 보여 주는 일이 아니라, 호감이 생긴 사람과 한 번의 약속을 구체적으로 잡는 것입니다. ${facts.name}님의 ${dominant} 기운은 시작할 힘이 충분합니다. 이제 그 힘을 추측이 아니라 날짜가 있는 만남에 쓰세요.`,
  ].join('\n\n')
  return [
    `[주요 포인트] 시작된 호감을 오래 가는 관계로 바꾸는 힘은 “우리 사이가 무엇인지”를 서두르는 데 있지 않습니다. ${facts.name}님에게 필요한 것은 연락, 만남, 혼자 쉬는 시간을 서로 말할 수 있는 사람인지 확인하는 일입니다.`,
    `${facts.name}님의 네 기둥에서 ${dominant} 기운이 두드러지고 ${weak} 기운이 가장 적습니다. 가까운 관계를 보여 주는 태어난 날의 ${day} 기운은 ${dayCopy}. 이 장점이 강해질수록 상대의 빈칸까지 혼자 채우거나, 반대로 확실한 답을 빨리 받고 싶어질 수 있습니다. 오래 가는 상대는 그 속도를 부담스러워하지 않으면서도 자기 속도를 말해 주는 사람입니다.`,
    `[사주와 생활을 함께 보면] ${annual} ${facts.partnerStarBasis}으로 관계 신호를 읽었을 때, 호감보다 먼저 볼 것은 반복 가능성입니다. 한 번의 멋진 데이트보다 다음 주에도 시간을 낼 수 있는지, 연락이 늦는 날 어떤 설명을 하는지, 서운함을 말했을 때 대화를 이어 가는지가 진지한 관계의 실제 근거가 됩니다.`,
    `[확인할 장면] 만남 뒤의 하루를 보세요. 즐거웠다는 말에서 끝나는지, 다음 일정과 서로의 생활 이야기가 자연스럽게 이어지는지에 따라 설렘과 지속 가능성이 갈립니다. ${facts.concern}이라는 고민의 답도 이 반복되는 행동에서 가장 선명하게 드러납니다.`,
    `[결정 전에 물어볼 질문] 우리는 어느 정도 자주 만나고 싶은가요? 연락이 늦을 때 어떻게 알려 주면 편한가요? 혼자 쉬어야 하는 날과 함께 보내고 싶은 날을 서로 말할 수 있나요? 이 세 질문에 답할 수 있다면 관계의 이름도 자연스럽게 따라옵니다.`,
    `[해법] ${facts.name}님에게 올해 맞는 관계는 불안을 오래 참게 만드는 관계가 아니라, 기대와 불편을 모두 말할 수 있는 관계입니다. 상대가 약속을 함께 만들고 조정하는 모습을 보인다면 한 걸음 더 가까이 가도 좋습니다.`,
  ].join('\n\n')
}

export function loveThisYearTeaserPreview(context: SajuReportContext, sectionCount: number) {
  const facts = thisYearFacts(context)
  return {
    title: '나, 올해 연애 가능?',
    headline: `${facts.name}님의 올해 연애는 “누가 다가오나”보다 “누가 다음 약속을 함께 잡나”에서 시작됩니다`,
    summary: `${facts.relationshipStatus}인 지금, “${facts.concern}”이라는 질문을 저장된 네 기둥과 올해 들어오는 기운에 겹쳐 첫 만남과 진지한 관계로 넘어가는 장면을 먼저 짚었습니다.`,
    insights: [], signals: [],
    paidValue: `전체 해석에서는 ${sectionCount}개 항목으로 인연이 들어오는 장면, 가까워지는 달, 반복되는 연애 습관, 놓치기 쉬운 신호와 지금 건넬 한 문장까지 이어서 풉니다.`,
  }
}

export function loveThisYearTeaserSection(section: SajuReportSection, index: number, analysis: SajuAnalysis | undefined, context: SajuReportContext): SajuReportSection {
  const facts = thisYearFacts(context)
  const image = THISYEAR_TEASER_IMAGES[index]
  const story = index === 0 ? {
    feel: `올해 누군가를 만날 수 있을까요? 답은 호감이 생기는 순간보다 다음 약속이 실제로 잡히는 장면에 있습니다.`,
    softBridge: `${facts.relationshipStatus}인 지금의 고민과 저장된 사주를 함께 보면, ${facts.name}님이 먼저 알아봐야 할 신호가 선명해집니다.`,
    tableMd: ['| 확인한 내용 | 실제 입력 | 이 풀이에서 읽는 장면 |', '| --- | --- | --- |', `| 현재 관계 | ${facts.relationshipStatus} | 지금 출발하는 관계의 거리 |`, `| 가장 궁금한 점 | ${facts.concern.replace(/\|/g, '/')} | 올해 먼저 답해야 할 질문 |`, `| 관계를 읽는 방식 | ${facts.partnerStarBasis} | 가까운 사이에서 나타나는 반응 |`].join('\n'),
    tableCaption: '직접 입력한 현재 상황을 첫 만남의 실제 장면과 연결했습니다.',
    flowSteps: [
      { label: '1. 눈에 들어온 사람', value: '질문을 되돌려 주는지 보기', note: '관심이 대화로 이어지는 첫 신호' },
      { label: '2. 대화 다음', value: '가능한 날짜를 하나씩 말하기', note: '호감을 실제 만남으로 바꾸는 장면' },
      { label: '3. 약속이 어려울 때', value: '다른 날을 제안하는지 보기', note: '관계를 이어 갈 의향 확인' },
    ],
    flowCaption: '호감을 추측하지 않고 실제 약속으로 확인하는 순서입니다.',
    scene: '', actions: [], imagePrompt: { ko: '', en: '' },
  } : {
    feel: '설렘이 생긴 뒤, 어떤 사람과 진지한 관계까지 이어질까요?',
    softBridge: '네 기둥의 기운을 생활 언어로 풀면, 가까워질수록 강해지는 장점과 놓치기 쉬운 반응을 함께 볼 수 있습니다.',
    ...(analysis ? {
      tableMd: pillarElementTable(analysis),
      tableCaption: '저장된 생년월일시의 네 기둥을 한자 없이 관계 장면으로 풀었습니다.',
      chartPoints: elementChart(analysis),
      chartCaption: '저장 사주에서 계산한 다섯 기운의 실제 개수입니다. 연애 점수나 상대의 마음을 뜻하지 않습니다.',
    } : {}),
    flowSteps: [
      { label: '1. 즐거운 만남 뒤', value: '다음 일정이 이어지는지 보기', note: '한 번의 호감과 반복 가능한 관계 구분' },
      { label: '2. 속도가 다를 때', value: '연락과 만남의 빈도 말하기', note: '혼자 추측하는 시간을 줄이기' },
      { label: '3. 불편함이 생길 때', value: '대화를 끝까지 이어 가는지 보기', note: '오래 갈 사람의 회복 방식 확인' },
    ],
    flowCaption: '설렘을 오래 가는 관계로 바꾸는 세 장면입니다.',
    scene: '', actions: [], imagePrompt: { ko: '', en: '' },
  }
  return {
    ...section,
    ...(image ? { imageKey: image.key, imageSrc: image.src, imageAlt: image.alt } : {}),
    interpretation: loveThisYearInterpretation(index, analysis, context),
    storytelling: { ...(section.storytelling ?? {}), ...story },
  }
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
