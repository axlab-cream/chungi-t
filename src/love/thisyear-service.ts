import { createHash } from 'node:crypto'
import type {
  BirthInput,
  EarthlyBranch,
  RagChunk,
  SajuAnalysis,
  SajuReport,
  SajuReportContext,
  SajuReportSection,
  TenGod,
} from '../types/index.js'
import { BRANCH_KO, ELEMENT_KO, STEM_KO } from '../saju/analyzer-helpers.js'
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
 * The 8 대분류 / 48 중분류 index the 올해 연애운 pages are designed around.
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
      { id: 'overall-new-connection', title: '새 인연 유입각', note: '새로 들어오는 사람의 설렘보다 약속 방식과 책임감을 먼저 확인합니다.', why: '새 인연일수록 가까워지는 속도보다 지킬 선이 중요합니다.' },
      { id: 'overall-old-some-restart', title: '기존 썸 재가동각', note: '끊긴 흐름이 다시 이어질 때 말투와 확인 방식이 판을 바꿉니다.', why: '처음부터 결론을 던지기보다 느낀 것과 확인할 것을 나눠야 합니다.' },
      { id: 'overall-serious-shift', title: '진지한 관계 전환각', note: '썸이 관계로 굳어질 때 필요한 신뢰, 약속, 현실 조건을 분리해서 봅니다.', why: '명분과 실속이 같이 맞아야 오래 가는 관계로 넘어갑니다.' },
      { id: 'overall-recovery-first', title: '올해는 회복 먼저인 쉬어가는 각', note: '관계를 밀기보다 답장, 약속, 감정 소모를 줄여야 하는 구간을 봅니다.', why: '지친 상태에서는 좋은 달도 몸과 마음이 따라오지 못할 수 있습니다.' },
    ],
  },
  {
    id: 'ten-gods',
    label: '第二門',
    image: 'ten-gods',
    title: '세운 십성별 연애 무드',
    subtitle: '올해 들어오는 십성으로 관계의 말투, 속도, 끌림 방식을 봅니다.',
    items: [
      { id: 'ten-gods-bi-geon', title: '비견: 친구 같은 연애, 선 넘으면 애매해지는 바이브', note: '편한 관계가 장점이지만 관계 이름이 흐려지는 지점을 같이 봅니다.', why: '비견은 나와 같은 결의 힘이라 편안함과 경계 이슈가 같이 올라옵니다.' },
      { id: 'ten-gods-geop-jae', title: '겁재: 직진력은 있는데 기싸움 주의', note: '끌리면 빠르게 움직이지만 자존심 싸움으로 새지 않게 봅니다.', why: '같은 기운의 경쟁성이 관계 안에서 주도권 이슈로 보일 수 있습니다.' },
      { id: 'ten-gods-sik-sin', title: '식신: 편안함, 케어, 일상 데이트 강점', note: '잘 챙기고 편하게 만드는 매력이 어떻게 썸으로 이어지는지 봅니다.', why: '식상 흐름은 표현과 생활 감각으로 관계를 부드럽게 만드는 쪽입니다.' },
      { id: 'ten-gods-sang-gwan', title: '상관: 말빨·플러팅 좋지만 말 세게 나갈 수 있음', note: '매력적인 표현력이 오히려 상대를 방어하게 만드는 순간을 체크합니다.', why: '표현이 강한 흐름은 말의 온도 조절이 관계 운영의 핵심이 됩니다.' },
      { id: 'ten-gods-pyeon-jae', title: '편재: 썸 기회 많지만 약속이 흩어질 수 있음', note: '기회가 여러 갈래로 열릴 때 진짜 이어지는 인연을 가려봅니다.', why: '재성은 애인성 판단에 쓰이지만, 편재 흐름은 선택지가 많아질 수 있습니다.' },
      { id: 'ten-gods-jeong-jae', title: '정재: 안정형 연애, 신뢰 쌓기 좋음', note: '호감이 천천히 쌓이는 흐름인지, 약속과 루틴으로 확인합니다.', why: '정재는 안정적 관계 코드로 읽되, 개인 사주 전체와 함께 봐야 합니다.' },
      { id: 'ten-gods-pyeon-gwan', title: '편관: 강한 끌림, 압박감·속도 조절 필요', note: '끌림이 강할수록 부담과 속도 문제를 같이 체크합니다.', why: '관성 흐름은 관계의 무게와 책임감으로도 드러날 수 있습니다.' },
      { id: 'ten-gods-jeong-gwan', title: '정관: 공식 연애·진지한 만남 가능성', note: '관계 이름을 정하고 싶어지는 흐름이 있는지 현실 조건과 함께 봅니다.', why: '정관은 공식성과 책임의 코드로 읽히지만 단정 대신 조건을 확인합니다.' },
      { id: 'ten-gods-pyeon-in', title: '편인: 딥토크는 좋은데 현실 대화가 늦을 수 있음', note: '깊은 대화와 상상은 열리지만 실제 약속으로 옮기는 힘을 봅니다.', why: '인성 흐름은 생각과 해석이 많아지는 장점과 지연을 함께 봐야 합니다.' },
      { id: 'ten-gods-jeong-in', title: '정인: 다정함은 좋지만 의존·기대 과다 주의', note: '받고 싶은 마음과 기대치가 커지는 순간을 부드럽게 조절합니다.', why: '다정함이 장점이 되려면 상대에게 맡기는 감정 몫을 줄여야 합니다.' },
    ],
  },
  {
    id: 'timing',
    label: '第三門',
    image: 'timing',
    title: '만남 타이밍',
    subtitle: '입춘 전후, 월운, 연락과 고백의 리듬을 생활 일정으로 바꿔봅니다.',
    items: [
      { id: 'timing-ipchun-shift', title: '입춘 전후 연애 흐름 전환', note: '새해 기운이 바뀌는 시점에 관계 태도가 어떻게 달라지는지 봅니다.', why: '연간 흐름은 갑자기 결론보다 전환 신호와 조건을 확인하는 방식이 맞습니다.' },
      { id: 'timing-monthly-some', title: '월운 기준 썸 뜨는 달', note: '월별로 연락, 약속, 만남이 살아나는 달과 비워둘 달을 나눕니다.', why: '월운은 방향을 생활 순서로 바꿀 때 실제 행동으로 연결됩니다.' },
      { id: 'timing-contact-window', title: '연락하기 좋은 타이밍', note: '먼저 연락할지 기다릴지, 말문을 여는 작은 문장을 잡습니다.', why: '관계 대화는 결론보다 느낀 것과 확인할 것을 나눠야 방어가 줄어듭니다.' },
      { id: 'timing-some-to-dating', title: '썸에서 연애로 넘어가는 타이밍', note: '감정 확인, 약속 빈도, 관계 이름을 꺼낼 타이밍을 분리합니다.', why: '가까워지는 흐름과 지킬 선을 같이 봐야 안정적으로 넘어갑니다.' },
      { id: 'timing-past-cleanup', title: '전 인연·오래된 감정 정리 타이밍', note: '붙잡을 마음과 내려놓을 감정을 나눠 새 흐름이 들어올 자리를 봅니다.', why: '회복 구간을 놓치면 좋은 기회도 감정 소모에 묻힐 수 있습니다.' },
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
      { id: 'self-expression-charm', title: '식상으로 보는 매력·표현력·끼', note: '내가 어떻게 매력을 드러내고, 플러팅에서 어떤 말투가 살아나는지 봅니다.', why: '식상은 표현과 활동성의 흐름으로 해석하되 사주 전체와 함께 봐야 합니다.' },
      { id: 'self-five-elements-attraction', title: '오행 상생/상극으로 보는 끌림과 피로감', note: '끌리는 이유와 같이 있으면 지치는 이유를 오행 흐름으로 구분합니다.', why: '오행과 십성의 상생·상극은 관계의 편안함과 부담을 설명하는 보조 기준입니다.' },
      { id: 'self-liked-vs-likes-me', title: '내가 좋아하는 사람 vs 나를 좋아하는 사람 패턴', note: '내가 쫓는 관계와 나에게 오는 관계의 온도 차이를 봅니다.', why: '관계 온도는 가까워지는 속도와 지킬 선이 다르게 드러날 수 있습니다.' },
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
      { id: 'match-zodiac-branches', title: '띠·지지 궁합', note: '띠와 지지의 맞물림을 관계 분위기의 참고값으로 봅니다.', why: '궁합 자료는 의사소통과 충돌 포인트를 상담형으로 연결합니다.' },
      { id: 'match-five-elements', title: '오행 궁합', note: '서로에게 편한 에너지인지, 같이 있으면 과열되는지를 봅니다.', why: '오행 관계는 끌림과 피로감을 나눠 읽는 보조 기준입니다.' },
      { id: 'match-communication-fit', title: '의사소통 잘 맞는지', note: '말이 잘 통하는지보다 오해가 생겼을 때 풀리는 방식을 봅니다.', why: '좋은 흐름도 말의 온도와 확인 방식이 맞아야 관계가 이어집니다.' },
      { id: 'match-conflict-point', title: '성격 충돌 포인트', note: '좋아도 자꾸 부딪히는 지점을 미리 알면 말실수를 줄일 수 있습니다.', why: '궁합은 맞다/아니다보다 충돌 조건과 조절 방법을 보는 쪽이 안전합니다.' },
      { id: 'match-love-vs-marriage', title: '연애는 좋은데 결혼은 다른지', note: '설렘과 생활 기준이 같은 방향인지, 책임감의 온도를 따로 봅니다.', why: '관계가 깊어질수록 감정보다 약속 방식과 현실 조건이 중요해집니다.' },
      { id: 'match-adjustable-relation', title: '맞춰갈 수 있는 관계인지', note: '완벽히 맞는지보다 서로 조정 가능한 영역이 있는지 봅니다.', why: '관계 해석은 결론을 대신 정하지 않고 선택 가능한 행동으로 이어져야 합니다.' },
    ],
  },
  {
    id: 'relationship-guide',
    label: '第六門',
    image: 'relationship-guide',
    title: '관계 운영 가이드',
    subtitle: '연락, 고백, 감정 표현, 답장 텐션을 오늘 할 행동으로 바꿉니다.',
    items: [
      { id: 'guide-first-contact', title: '먼저 연락해도 되는지', note: '연락을 보낼지 말지보다 어떤 톤으로 시작할지 잡습니다.', why: '작은 연락 하나를 밖으로 꺼내는 행동이 흐름 전환점이 될 수 있습니다.' },
      { id: 'guide-confession-or-check', title: '고백각인지 간보기각인지', note: '바로 결론을 던질지, 확인 질문부터 갈지 흐름을 나눕니다.', why: '상대가 방어하지 않게 감정과 확인할 내용을 분리하는 게 좋습니다.' },
      { id: 'guide-emotion-expression', title: '감정 표현은 어디까지 해야 하는지', note: '솔직함과 부담의 선을 나눠 지금 할 말의 크기를 정합니다.', why: '관계에서 중요한 것은 숨기기보다 작게 꺼내는 방식입니다.' },
      { id: 'guide-read-reply-tension', title: '읽씹·답장 텐션 해석', note: '답장 하나로 결론 내기 전에 상대의 패턴과 내 과몰입을 나눕니다.', why: '답장, 약속, 생각을 줄여야 흐름이 회복되는 달도 있습니다.' },
      { id: 'guide-boundary-distance', title: '선 지키기와 거리 조절', note: '가까워지고 싶은 마음과 내가 떠안을 수 없는 몫을 나눠봅니다.', why: '관계마다 줄 수 있는 것과 더는 떠안을 수 없는 것을 나눠야 합니다.' },
      { id: 'guide-overfocus-routine', title: '과몰입 방지 루틴', note: '상대 반응에 하루가 끌려가지 않게 비워둘 시간과 루틴을 잡습니다.', why: '쉬는 날은 뒤처지는 시간이 아니라 다음 흐름을 받는 자리입니다.' },
    ],
  },
  {
    id: 'warning-signals',
    label: '第七門',
    image: 'warning-signals',
    title: '주의 신호',
    subtitle: '관계를 깨는 말투, 애매한 약속, 현생 압박을 미리 체크합니다.',
    items: [
      { id: 'warning-sharp-words', title: '말이 날카로워져 관계 깨지는 패턴', note: '좋아해서 확인하려는 말이 공격처럼 들리는 순간을 봅니다.', why: '처음부터 결론을 던지면 상대가 방어할 수 있습니다.' },
      { id: 'warning-vague-promises', title: '애매한 약속 때문에 서운함 쌓이는 패턴', note: '말은 달콤한데 일정과 책임이 흐려지는 지점을 봅니다.', why: '새로 만나는 사람일수록 책임과 약속 방식을 먼저 봐야 합니다.' },
      { id: 'warning-life-pressure', title: '돈·일·현생 압박 때문에 연애가 밀리는 패턴', note: '연애 문제가 아니라 생활 페이스 문제일 수 있는 구간을 봅니다.', why: '올해는 강한 달뿐 아니라 지치는 구간을 미리 알아야 합니다.' },
      { id: 'warning-lonely-attachment', title: '외로워서 아무나 붙잡는 패턴', note: '연애하고 싶은 마음과 회복이 필요한 마음을 구분합니다.', why: '몸과 마음이 제자리로 돌아오는 시간이 먼저 필요한 때가 있습니다.' },
      { id: 'warning-many-some-low-stability', title: '썸은 많은데 안정감이 약한 패턴', note: '기회는 있는데 관계가 쌓이지 않는 이유를 약속과 선에서 봅니다.', why: '관계 온도는 서서히 드러나므로 안정감을 확인하는 시간이 필요합니다.' },
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
      { id: 'mz-some-check', title: '올해 썸각 점검', note: '연락, 약속, 표현 중 어디가 썸 신호인지 짧게 체크합니다.', why: '월운과 생활 순서를 같이 봐야 실제 썸 흐름이 보입니다.' },
      { id: 'mz-flirting-point', title: '플러팅 포인트', note: '내가 자연스럽게 매력 있어 보이는 말투와 행동을 봅니다.', why: '감정 표현은 작게 꺼내고 확인할 말을 나누면 부담이 줄어듭니다.' },
      { id: 'mz-red-light', title: '관계 경고등', note: '서운함이 쌓이기 전에 먼저 봐야 할 빨간불을 정리합니다.', why: '관계는 가까워지는 일과 선을 지키는 일을 함께 봐야 합니다.' },
      { id: 'mz-monthly-action', title: '이번 달 액션 한 줄', note: '연락 하나, 멈춤 하나, 쉬는 날 하나 중 지금 할 행동을 고릅니다.', why: '오늘은 인생 전체보다 미뤄둔 작은 일 하나를 꺼내는 흐름입니다.' },
      { id: 'mz-say-or-not', title: '지금 할 말 / 하지 말 말 가이드', note: '보내도 되는 말과 잠깐 참아야 할 말을 나눠서 정리합니다.', why: '내가 느낀 것과 확인하고 싶은 것을 나누면 관계 대화가 덜 날카로워집니다.' },
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
  if (!statusRaw) throw new Error('현재 관계 상태를 선택해 주세요.')
  const relationshipStatus = RELATIONSHIP_LABEL[statusRaw] ?? statusRaw

  const basisRaw = trimmed(body.partnerStarBasis ?? body.partner_star_basis, 20)
  if (!basisRaw) throw new Error('애인성 기준을 선택해 주세요.')
  if (basisRaw !== 'gender_auto' && basisRaw !== 'official_star' && basisRaw !== 'wealth_star') {
    throw new Error('애인성 기준은 성별 자동, 관성, 재성 중에서 골라 주세요.')
  }

  const genderRaw = trimmed(body.genderBasis ?? body.gender, 10)
  if (basisRaw === 'gender_auto' && genderRaw !== 'female' && genderRaw !== 'male') {
    throw new Error('성별 기준으로 자동 판단하려면 성별을 선택해 주세요.')
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
    birth: { year: birth.year, month: birth.month, day: birth.day, hour: birth.hour, gender: birth.gender, calendar: birth.calendar },
    relationshipStatus: input.relationshipStatus,
    partnerStarBasis: input.partnerStarBasis,
    genderBasis: input.genderBasis ?? '',
    concern: input.concern ?? '',
    serviceKey: LOVE_THISYEAR_SERVICE_KEY,
  })
  return createHash('sha256').update(fingerprint).digest('hex').slice(0, 28)
}

/** Korean particles depend on the last syllable's final consonant. */
function hasFinalConsonant(word: string): boolean {
  const last = word.replace(/[^가-힣]/g, '').slice(-1)
  if (!last) return false
  const code = last.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return true
  return (code - 0xac00) % 28 !== 0
}

const topic = (word: string): string => `${word}${hasFinalConsonant(word) ? '은' : '는'}`
const subject = (word: string): string => `${word}${hasFinalConsonant(word) ? '이' : '가'}`
const copula = (word: string): string => `${word}${hasFinalConsonant(word) ? '이라' : '라'}`

/**
 * 도화 sits on the 자오묘유 axis, and which one counts depends on the 삼합 group the
 * 일지 (or 연지) belongs to. Whether that branch actually shows up in the chart is what
 * decides how much of this year's 연애 flow arrives on its own.
 */
const DOHWA_BY_TRIO: Array<{ trio: EarthlyBranch[]; dohwa: EarthlyBranch }> = [
  { trio: ['寅', '午', '戌'], dohwa: '卯' },
  { trio: ['申', '子', '辰'], dohwa: '酉' },
  { trio: ['巳', '酉', '丑'], dohwa: '午' },
  { trio: ['亥', '卯', '未'], dohwa: '子' },
]

function dohwaBranch(dayBranch: EarthlyBranch, yearBranch: EarthlyBranch): EarthlyBranch | undefined {
  const match = DOHWA_BY_TRIO.find((entry) => entry.trio.includes(dayBranch))
    ?? DOHWA_BY_TRIO.find((entry) => entry.trio.includes(yearBranch))
  return match?.dohwa
}

function dohwaLine(analysis: SajuAnalysis): string {
  const pillars = analysis.fourPillars
  const branches: EarthlyBranch[] = [pillars.year.branch, pillars.month.branch, pillars.day.branch, pillars.hour.branch]
  const dohwa = dohwaBranch(pillars.day.branch, pillars.year.branch)
  if (!dohwa) return '도화는 원국에서 한 갈래로 잡히지 않으니, 올해 흐름은 사람이 몰리는 자리보다 자네가 움직이는 자리에서 열리네.'
  const owned = branches.filter((branch) => branch === dohwa).length
  const label = `${BRANCH_KO[dohwa]}(${dohwa})`
  if (owned >= 2) {
    return `자네 원국의 도화는 ${label}이고 그 자리가 ${owned}번 겹치네. 가만히 있어도 사람이 붙는 편이라, 올해는 만남의 수보다 고르는 기준이 더 중요하네.`
  }
  if (owned === 1) {
    return `자네 원국의 도화는 ${label}이고 그 자리가 하나 들어 있네. 필요한 만큼은 눈에 띄는 결이라, 올해는 자리에 나가면 반응이 오는 쪽일세.`
  }
  return `자네 원국의 도화는 ${label}인데 원국에는 그 자리가 비어 있네. 저절로 몰리기보다 자네가 먼저 약속을 잡을 때 흐름이 열리는 쪽일세.`
}

const OFFICIAL_STARS: TenGod[] = ['정관', '편관']
const WEALTH_STARS: TenGod[] = ['정재', '편재']
const EXPRESSION_STARS: TenGod[] = ['식신', '상관']

function partnerStarSet(input: LoveThisYearRequest, birth: BirthInput): { label: string; stars: TenGod[] } {
  if (input.partnerStarBasis === 'official_star') return { label: '관성', stars: OFFICIAL_STARS }
  if (input.partnerStarBasis === 'wealth_star') return { label: '재성', stars: WEALTH_STARS }
  const gender = input.genderBasis ?? birth.gender
  return gender === 'female'
    ? { label: '관성', stars: OFFICIAL_STARS }
    : { label: '재성', stars: WEALTH_STARS }
}

function partnerStarLine(analysis: SajuAnalysis, input: LoveThisYearRequest, birth: BirthInput): string {
  const { label, stars } = partnerStarSet(input, birth)
  const owned = analysis.tenGods.filter((god) => stars.includes(god))
  const basis = input.partnerStarBasis === 'gender_auto' ? '성별 기준으로 잡은' : '자네가 고른'
  if (!owned.length) {
    return `${basis} 애인성은 ${label}인데 원국에 ${subject(label)} 드러나 있지 않네. 사람이 없다는 뜻이 아니라, 관계가 우연보다 자네의 선택으로 만들어지는 구조일세.`
  }
  const unique = Array.from(new Set(owned))
  return `${basis} 애인성은 ${label}이고 원국에는 ${unique.join('·')}이 잡히네. 애인 자리를 ${unique[0]}의 결로 읽으면 올해 끌리는 사람의 성향이 선명해지네.`
}

function expressionLine(analysis: SajuAnalysis): string {
  const owned = analysis.tenGods.filter((god) => EXPRESSION_STARS.includes(god))
  if (!owned.length) {
    return '식상이 얇아 마음이 있어도 표현이 늦게 나가는 편이니, 올해는 감정보다 약속을 먼저 말하는 쪽이 편하네.'
  }
  return `식상은 ${Array.from(new Set(owned)).join('·')}으로 잡히니, 말과 분위기로 먼저 다가가는 힘이 있네. 다만 말이 앞서면 상대가 속도를 못 따라올 수 있네.`
}

function timingLine(analysis: SajuAnalysis): string {
  const fortune = analysis.fortune
  if (!fortune) return '세운과 대운은 단정하지 않고, 지금 원국에 드러난 연애 조건을 기준으로 보겠네.'
  return `올해 세운은 ${fortune.yearPillar}이고 자네의 현재 대운은 ${fortune.currentDaewoon}일세. 올해 한 해의 무드는 세운이 열고, 그 무드를 버티는 체력은 대운이 대네.`
}

/**
 * Corpus entries are written for the model, not the reader: many carry `concept:` /
 * `condition:` field labels and instructions such as "원문 문장을 출력하지 말고".
 * Pasting those verbatim would put internal scaffolding on a paid page.
 */
const RAG_FIELD_LABEL = /(^|\s)(concept|condition|interpretation|guide|output|tone|caution|source|evidence)\s*:\s*/gi
const RAG_INSTRUCTION = /(Feature\s*JSON|청크|프롬프트|출력하지|출력한다|적용한다|키워드가 현재 질문|답변에 필요한|문장으로 작성|보조 근거|단정하는 것|명식 계산)/

function compact(text: string, fallback: string, limit = 160): string {
  const stripped = text
    .replace(RAG_FIELD_LABEL, ' ')
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => sentence.trim() && !RAG_INSTRUCTION.test(sentence))
    .join(' ')
  const clean = stripped.replace(/\s+/g, ' ').trim()
  if (clean.length < 12) return fallback
  return clean.length > limit ? `${clean.slice(0, limit - 1)}…` : clean
}

/** Corpus prose calls the reader 사용자; swapping in 본인 changes the particle too. */
const READER_PARTICLES: Array<[RegExp, string]> = [
  [/사용자를/g, '본인을'],
  [/사용자가/g, '본인이'],
  [/사용자는/g, '본인은'],
  [/사용자와/g, '본인과'],
  [/사용자의/g, '본인의'],
  [/사용자에게/g, '본인에게'],
  [/사용자/g, '본인'],
]

function humanize(line: string): string {
  return READER_PARTICLES.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), line)
}

/** Only a knowledge block's interpretation/advice/opportunity read as prose. */
function ragLineFrom(chunk: RagChunk | undefined, fallback: string): string {
  if (!chunk) return fallback
  const block = chunk.knowledge
  const candidates = block ? [block.interpretation, block.advice, block.opportunity] : [chunk.content]
  for (const candidate of candidates) {
    const line = compact(candidate ?? '', '', 160)
    if (line) return humanize(line)
  }
  return fallback
}

/**
 * The angle each 대분류 reads its item from. Without it all 48 items would open on the
 * same 일지 sentence, so the group id decides what leads and what the closing line is.
 */
const GROUP_LENS: Record<string, { focus: string; close: string }> = {
  overall: {
    focus: '먼저 올해 연애가 열리는 방향부터 보네. 가능성은 사람의 수가 아니라 자네의 생활 리듬에서 갈리네.',
    close: '총평은 판정이 아니라 출발점일세. 여기서 잡은 방향을 아래 항목으로 좁혀 가게.',
  },
  'ten-gods': {
    focus: '올해 세운의 십성으로 연애 무드를 보네. 같은 사람도 어떤 기운이 도느냐에 따라 다르게 움직이네.',
    close: '무드는 성격이 아니라 이번 해의 옷일세. 옷에 맞게 말투와 속도를 고르면 되네.',
  },
  timing: {
    focus: '언제 움직이면 덜 어긋나는지를 보네. 타이밍은 달력보다 자네의 일정에서 먼저 정해지네.',
    close: '좋은 달을 기다리기보다, 그 달에 쓸 약속 하나를 미리 정해 두게.',
  },
  'self-pattern': {
    focus: '자네의 연애 방식을 보네. 상대를 보기 전에 자네가 반복하는 자리를 먼저 아는 편이 빠르네.',
    close: '성향은 고칠 대상이 아니라 알고 쓰는 도구일세. 알면 같은 실수에서 한 걸음 빨리 나오네.',
  },
  compatibility: {
    focus: '상대와 만나는 자리를 보네. 끌림과 오래 감은 다른 조건에서 갈리네.',
    close: '궁합은 합격과 불합격이 아니라, 어디를 맞춰야 덜 지치는지를 알려 주는 지도일세.',
  },
  'relationship-guide': {
    focus: '관계를 어떻게 운영할지를 보네. 마음보다 순서가 관계를 살리는 경우가 많네.',
    close: '한 번에 다 말하려 하지 말고, 오늘 할 수 있는 한 문장부터 고르게.',
  },
  'warning-signals': {
    focus: '관계가 깨지는 자리를 미리 보네. 경고는 겁을 주려는 것이 아니라 피할 곳을 알려 주는 것일세.',
    close: '신호를 알아채면 사고가 사건이 되기 전에 멈출 수 있네. 그 정도면 충분하네.',
  },
  'mz-cards': {
    focus: '지금까지 본 것을 한 장의 카드로 묶네. 라벨은 판정이 아니라 부르기 쉬운 이름일세.',
    close: '카드는 이번 구간의 상태일세. 조건이 바뀌면 카드도 바뀌니 가볍게 쥐게.',
  },
}

const DEFAULT_LENS = {
  focus: '올해의 기본값과 흐름을 같이 놓고 보네.',
  close: '결론을 서두르지 말고 확인할 것을 하나씩 줄여 가게.',
}

/**
 * Which piece of the chart each 대분류 leads with. Without this every item would open on
 * the same 도화 sentence, and the 8 groups would read as one long repeat.
 */
type ChartAngle = 'dohwa' | 'partnerStar' | 'expression'

const GROUP_CHART_ANGLE: Record<string, ChartAngle> = {
  overall: 'dohwa',
  'ten-gods': 'expression',
  timing: 'dohwa',
  'self-pattern': 'expression',
  compatibility: 'partnerStar',
  'relationship-guide': 'partnerStar',
  'warning-signals': 'expression',
  'mz-cards': 'partnerStar',
}

function pickRag(chunks: RagChunk[], index: number): RagChunk | undefined {
  if (!chunks.length) return undefined
  return chunks[index % chunks.length]
}

function buildInterpretation(params: {
  groupId: string
  categoryTitle: string
  itemTitle: string
  itemNote: string
  itemWhy: string
  analysis: SajuAnalysis
  birth: BirthInput
  input: LoveThisYearRequest
  chunks: RagChunk[]
  index: number
}): string {
  const { groupId, categoryTitle, itemTitle, itemNote, itemWhy, analysis, birth, input, chunks, index } = params
  const lens = GROUP_LENS[groupId] ?? DEFAULT_LENS
  const day = analysis.fourPillars.day
  const dominant = ELEMENT_KO[analysis.dominantElement]
  const weak = ELEMENT_KO[analysis.weakElement]
  const ragLine = ragLineFrom(
    pickRag(chunks, index),
    '올해 연애 흐름은 한 장면으로 단정하지 말고 도화의 자리, 세운의 결, 생활 리듬을 함께 봐야 합니다.',
  )
  const worry = input.concern
    ? `지금 걸리는 말은 "${input.concern}"일세.`
    : '따로 적은 문장은 없으니 반복되는 장면을 중심으로 보겠네.'

  const angle = GROUP_CHART_ANGLE[groupId] ?? 'dohwa'
  const dohwa = dohwaLine(analysis)
  const partnerStar = partnerStarLine(analysis, input, birth)
  const expression = expressionLine(analysis)
  const lead = angle === 'partnerStar' ? partnerStar : angle === 'expression' ? expression : dohwa
  const rest = angle === 'partnerStar'
    ? `${dohwa} ${expression}`
    : angle === 'expression'
      ? `${dohwa} ${partnerStar}`
      : `${partnerStar} ${expression}`

  return [
    `${categoryTitle} 중 "${itemTitle}"일세. 자네는 ${birth.year}년생이고 일간은 ${STEM_KO[analysis.dayMaster]}(${analysis.dayMaster}), 일지는 ${copula(`${BRANCH_KO[day.branch]}(${day.branch})`)} 올해 연애의 기본값을 여기서부터 보겠네.`,
    `${itemNote} ${lead} ${lens.focus}`,
    `${rest} 자네는 ${dominant} 기운이 앞서고 ${topic(weak)} 얇으니, 관계에서 몰리는 자리와 비는 자리가 여기서 갈리네.`,
    `${timingLine(analysis)} 지금은 "${input.relationshipStatus}" 자리에서 보고 있으니, 같은 운이라도 확인할 것이 달라지네. ${itemWhy}`,
    `이 대목에서 함께 볼 결은 이렇네. ${ragLine} 그러니 이 풀이는 올해 연애의 성사 여부를 점치는 자리가 아니라, 어디를 열고 어디를 쉬어야 덜 어긋나는지를 고르는 자리일세.`,
    `${worry} ${lens.close} 사람의 마음은 예언이 아니라 대화에서 확인되니, 마지막 확인은 반드시 직접 말로 마무리하게.`,
  ].join('\n\n')
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
    subtitle: `${context.name ?? '본인'}님의 올해 도화와 세운 흐름을 ${input.relationshipStatus} 자리에서 봅니다`,
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
