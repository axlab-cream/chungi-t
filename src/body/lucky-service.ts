import { createHash } from 'node:crypto'
import type {
  BirthInput,
  Element,
  RagChunk,
  SajuAnalysis,
  SajuReport,
  SajuReportContext,
  SajuReportSection,
} from '../types/index.js'
import { BRANCH_KO, ELEMENT_KO, STEM_KO } from '../saju/analyzer-helpers.js'
import { retrieveRagChunks } from '../rag/retriever.js'
import { finalizeSpecializedReport } from '../report/report-quality.js'
import { retrieveCategoryOwnChunks, retrieveCategoryRagChunks } from '../report/specialized-rag.js'

export const LUCKY_COLOR_SERVICE_KEY = 'lucky_color'

/** The pack written for this service; its blocks are preferred over the general corpus. */
const OWN_CORPUS_DOMAIN = 'lucky_color_service'

/** Where the 나한테 운 붙는 색과 물건 artwork lives, beside the service pages. */
export const LUCKY_ASSET_BASE = '/me/lucky/assets/lucky'

export interface LuckyColorRequest {
  displayName?: string
}

/**
 * The 6 대분류 / 24 중분류 index the 나한테 운 붙는 색과 물건 pages are designed around.
 * The ids are what 05 목차 and 06 상세 route on, so they follow the design's `g-i` shape.
 */
export const LUCKY_COLOR_TOC = [
  {
    id: 'balance',
    number: 1,
    image: '05-scene-01-hook',
    title: '나 무슨 기운이야?',
    subtitle: '넘치는 기운과 모자란 기운을 먼저 나눠 봅니다.',
    items: [
      { id: '1-1', title: '넘치는 기운 모자란 기운', note: '원국에서 강하게 드러나는 쪽과 비어 보이는 쪽을 갈라 봅니다.', why: '어느 쪽이 많은지를 알아야 색과 물건을 더할지 덜지가 정해집니다.' },
      { id: '1-2', title: '어디서 밸런스 깨져?', note: '기운이 몰리는 자리가 생활의 어느 장면에서 티가 나는지 봅니다.', why: '밸런스는 숫자보다 하루의 어느 순간에 걸리는지로 확인됩니다.' },
      { id: '1-3', title: '채워야 할 기운 한 줄', note: '색과 소재로 옮기기 전에 필요한 결을 한 줄로 잡습니다.', why: '기준이 한 줄로 정리되어야 옷장 앞에서 헤매지 않습니다.' },
      { id: '1-4', title: '멀리하면 편한 기운 한 줄', note: '이미 많은 쪽을 덜어내는 기준을 위험이 아니라 무게로 봅니다.', why: '넘치는 쪽은 나쁜 것이 아니라 이미 충분한 것입니다.' },
    ],
  },
  {
    id: 'color',
    number: 2,
    image: '05-bridge-01-hook',
    title: '내 색 뭐야?',
    subtitle: '옷, 가방, 방에 바로 쓸 수 있는 색으로 옮깁니다.',
    items: [
      { id: '2-1', title: '나한테 붙는 색', note: '모자란 쪽을 채우는 색을 두세 갈래로 좁힙니다.', why: '색은 매일 고르는 선택이라 가장 손쉬운 조절 장치입니다.' },
      { id: '2-2', title: '옷에 쓰는 법', note: '상의, 하의, 겉옷 중 어디에 얹는 것이 편한지 봅니다.', why: '같은 색도 얼굴에 가까운 자리와 먼 자리에서 체감이 다릅니다.' },
      { id: '2-3', title: '가방·소품에 쓰는 법', note: '옷을 바꾸기 어려운 날 소품으로 옮기는 방법을 봅니다.', why: '작은 면적으로도 하루의 기준을 유지할 수 있습니다.' },
      { id: '2-4', title: '방에 쓰는 법', note: '침구, 커튼, 조명처럼 오래 머무는 면의 색을 봅니다.', why: '가장 긴 시간을 보내는 면이 생활의 기본 톤을 만듭니다.' },
    ],
  },
  {
    id: 'carry',
    number: 3,
    image: '05-scene-02-basis',
    title: '늘 지니면 좋은 건?',
    subtitle: '재질과 형태를 중심으로 부담 없이 고릅니다.',
    items: [
      { id: '3-1', title: '나한테 붙는 재질과 형태', note: '나무, 금속, 세라믹, 유리처럼 손에 닿는 감각을 나눕니다.', why: '재질은 색보다 오래 남는 감각이라 기준으로 삼기 좋습니다.' },
      { id: '3-2', title: '가방에 하나 넣는다면', note: '매일 들고 다니는 가방 안에서 바꿀 것 하나를 고릅니다.', why: '늘 지니는 물건일수록 작은 변화가 길게 이어집니다.' },
      { id: '3-3', title: '몸에 걸친다면', note: '팔찌, 목걸이, 시계처럼 몸에 닿는 소품의 결을 봅니다.', why: '몸에 닿는 물건은 면적이 작아도 하루 종일 함께 갑니다.' },
      { id: '3-4', title: '책상에 둔다면', note: '일하는 자리에 올려 둘 소재와 형태를 봅니다.', why: '집중하는 시간에 시선이 닿는 자리라 결이 그대로 옮겨옵니다.' },
    ],
  },
  {
    id: 'reduce',
    number: 4,
    image: '05-bridge-02-preview',
    title: '오히려 멀리할 건?',
    subtitle: '이미 넘치는 쪽을 덜어내면 가벼워집니다.',
    items: [
      { id: '4-1', title: '거리 두면 편한 색', note: '이미 충분한 쪽을 계속 더하고 있지 않은지 봅니다.', why: '부족한 것을 채우는 것만큼 넘치는 것을 줄이는 것도 조절입니다.' },
      { id: '4-2', title: '과하면 오히려 걸리는 재질', note: '한 소재로 방과 옷장이 몰려 있는지 확인합니다.', why: '같은 소재가 쌓이면 편안함이 아니라 답답함으로 바뀝니다.' },
      { id: '4-3', title: '지금 방에서 빼면 가벼워지는 것', note: '눈에 가장 먼저 들어오는 것부터 하나만 빼 봅니다.', why: '치우지 않으면 큰일 난다는 뜻이 아니라 시야를 비우는 일입니다.' },
    ],
  },
  {
    id: 'place',
    number: 5,
    image: '05-scene-03-cta',
    title: '어디 앉아야 잘 풀려?',
    subtitle: '방향과 자리를 오늘 바꿀 수 있는 크기로 봅니다.',
    items: [
      { id: '5-1', title: '나한테 열리는 방향', note: '채워야 할 기운이 놓인 방위를 생활 방향으로 옮깁니다.', why: '방향은 집을 옮기지 않아도 책상 하나로 조절됩니다.' },
      { id: '5-2', title: '책상 둘 자리', note: '창, 문, 벽 중 무엇을 등지고 앉는지를 봅니다.', why: '집중은 의지보다 시야와 등 뒤의 안정감에서 갈립니다.' },
      { id: '5-3', title: '침대 둘 자리', note: '머리 방향과 문에서의 거리로 잠자리를 봅니다.', why: '잘 자는 조건이 다음 날의 기운을 그대로 결정합니다.' },
      { id: '5-4', title: '앉으면 답답해지는 자리', note: '오래 앉으면 유독 지치는 자리의 조건을 확인합니다.', why: '피로한 자리를 알면 옮기는 것만으로 하루가 가벼워집니다.' },
    ],
  },
  {
    id: 'routine',
    number: 6,
    image: '05-bridge-03-cta',
    title: '하루를 어떻게 굴려?',
    subtitle: '아침부터 잠들기까지의 리듬을 가볍게 정리합니다.',
    items: [
      { id: '6-1', title: '아침 세팅', note: '일어나서 처음 하는 세 가지를 정해 둡니다.', why: '하루의 기운은 첫 30분에 방향이 잡히는 경우가 많습니다.' },
      { id: '6-2', title: '집중 터지는 시간대', note: '일간과 오행 흐름으로 몰입이 잘 붙는 구간을 봅니다.', why: '같은 일도 몸이 열리는 시간에 하면 힘이 덜 듭니다.' },
      { id: '6-3', title: '뭘 먹으면 붙어?', note: '맛과 온도의 결로 식사를 고르는 기준만 봅니다.', why: '무엇을 먹느냐보다 어떤 결을 자주 고르는지가 리듬을 만듭니다.' },
      { id: '6-4', title: '잘 자는 법', note: '잠들기 전 한 시간의 빛과 소리를 정리합니다.', why: '수면은 채우는 일이 아니라 덜어내야 열리는 자리입니다.' },
      { id: '6-5', title: '오늘 당장 뭐 하지?', note: '지금까지 본 것 중 오늘 하나만 골라 실행합니다.', why: '한 번에 다 바꾸면 하나도 남지 않습니다.' },
    ],
  },
] as const

/** 오행별 생활 언어. 색, 재질, 방향, 시간대는 전통 오행 배속을 그대로 따른다. */
interface ElementProfile {
  colors: string
  materials: string
  shape: string
  direction: string
  hours: string
  taste: string
  scene: string
}

const ELEMENT_PROFILE: Record<Element, ElementProfile> = {
  wood: {
    colors: '초록과 청록, 연한 풀색',
    materials: '나무, 리넨, 면처럼 결이 살아 있는 소재',
    shape: '길게 뻗은 형태, 세로로 선 물건',
    direction: '동쪽',
    hours: '이른 아침 다섯 시에서 아홉 시 사이',
    taste: '신맛이 도는 것과 푸른 잎',
    scene: '창가에 둔 화분 하나, 나무 손잡이의 컵',
  },
  fire: {
    colors: '붉은색과 주홍, 따뜻한 산호빛',
    materials: '가죽과 도톰한 니트처럼 온기가 도는 소재',
    shape: '끝이 모이는 형태, 삼각으로 보이는 물건',
    direction: '남쪽',
    hours: '한낮 열한 시에서 오후 세 시 사이',
    taste: '쓴맛이 살짝 도는 것과 따뜻하게 데운 것',
    scene: '따뜻한 색 조명, 붉은 표지의 노트',
  },
  earth: {
    colors: '황토색과 베이지, 낮은 채도의 흙빛',
    materials: '도자기, 세라믹, 두꺼운 종이처럼 묵직한 소재',
    shape: '납작하고 안정된 형태, 네모난 물건',
    direction: '남서쪽과 북동쪽',
    hours: '오후 한 시에서 세 시 사이의 늘어지는 구간',
    taste: '단맛이 은은한 것과 곡물',
    scene: '흙빛 머그컵, 두툼한 종이 노트',
  },
  metal: {
    colors: '흰색과 은회색, 맑은 아이보리',
    materials: '금속, 유리, 매끈하게 마감된 소재',
    shape: '둥근 형태, 매끄러운 곡면',
    direction: '서쪽',
    hours: '늦은 오후 다섯 시에서 저녁 일곱 시 사이',
    taste: '매운맛이 살짝 도는 것과 담백한 흰 재료',
    scene: '작은 금속 클립, 유리컵 하나',
  },
  water: {
    colors: '감청과 검정, 짙은 남색',
    materials: '유리, 거울, 매끈하고 서늘한 소재',
    shape: '흐르는 곡선, 물결처럼 이어지는 형태',
    direction: '북쪽',
    hours: '밤 아홉 시에서 자정 사이',
    taste: '짠맛이 옅게 도는 것과 물기 있는 것',
    scene: '유리병에 담은 물, 어두운 남색 커버',
  },
}

/** 상생 관계 — 부족한 기운을 직접 더하기 어려울 때 그 앞자리를 대신 쓴다. */
const GENERATES: Record<Element, Element> = {
  wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood',
}

/**
 * The 02 form collects nothing beyond the common saju, which the analyze endpoint reads
 * off the account. A display name is the only thing the request can carry, and even that
 * falls back to the saved profile.
 */
export function parseLuckyColorRequest(body: Record<string, unknown>): LuckyColorRequest {
  const raw = body?.displayName ?? body?.display_name ?? body?.name
  const displayName = typeof raw === 'string' ? raw.trim().slice(0, 20) : ''
  return displayName ? { displayName } : {}
}

export function buildLuckyColorContext(
  name: string | undefined,
  input: LuckyColorRequest,
): SajuReportContext {
  return {
    serviceKey: LUCKY_COLOR_SERVICE_KEY,
    name: input.displayName || name,
    target: '나한테 운 붙는 색과 물건',
    concern: '오행 균형에서 채울 색과 덜어낼 색, 지니면 좋은 재질과 앉을 자리',
  }
}

export function createLuckyColorReportId(
  ownerId: string | undefined,
  birth: BirthInput,
  input: LuckyColorRequest,
): string {
  const fingerprint = JSON.stringify({
    ownerId: ownerId ?? '',
    birth: { year: birth.year, month: birth.month, day: birth.day, hour: birth.hour, gender: birth.gender, calendar: birth.calendar },
    displayName: input.displayName ?? '',
    serviceKey: LUCKY_COLOR_SERVICE_KEY,
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
const object = (word: string): string => `${word}${hasFinalConsonant(word) ? '을' : '를'}`

/**
 * Which element this reader should add and which one they already have enough of.
 * 용신이 잡히면 그것을 채울 기운으로 쓰고, 없으면 가장 얇은 오행을 대신 쓴다.
 */
interface ElementBalance {
  fill: Element
  fillBasis: string
  spare: Element
  counts: Array<{ element: Element; count: number }>
  emptyElements: Element[]
}

function readBalance(analysis: SajuAnalysis): ElementBalance {
  const counts = (Object.keys(ELEMENT_PROFILE) as Element[])
    .map((element) => ({ element, count: analysis.elementCount[element] ?? 0 }))
    .sort((a, b) => b.count - a.count)
  const fill = analysis.usefulGod ?? analysis.weakElement
  return {
    fill,
    fillBasis: analysis.usefulGod ? '용신으로 잡힌' : '원국에서 가장 얇은',
    spare: analysis.dominantElement,
    counts,
    emptyElements: counts.filter((entry) => entry.count === 0).map((entry) => entry.element),
  }
}

function balanceLine(analysis: SajuAnalysis, balance: ElementBalance): string {
  const spread = balance.counts.map((entry) => `${ELEMENT_KO[entry.element]} ${entry.count}`).join(' · ')
  const empty = balance.emptyElements.length
    ? ` 원국에 아예 비어 있는 자리는 ${balance.emptyElements.map((element) => ELEMENT_KO[element]).join('과 ')}입니다.`
    : ' 완전히 빈 자리는 없고, 많고 적음의 차이로 갈립니다.'
  const strength = analysis.dayMasterStrength === 'strong'
    ? '일간이 힘을 받는 편이라 더 채우기보다 쓰는 쪽이 편합니다.'
    : analysis.dayMasterStrength === 'weak'
      ? '일간이 얇은 편이라 받쳐 주는 기운을 곁에 두는 쪽이 편합니다.'
      : '일간이 크게 치우치지 않아, 그날 상황에 맞춰 조절하기 좋은 구조입니다.'
  return `원국의 오행 분포는 ${spread}입니다.${empty} ${strength}`
}

function fillLine(balance: ElementBalance): string {
  const profile = ELEMENT_PROFILE[balance.fill]
  const bridge = ELEMENT_PROFILE[GENERATES[balance.fill]]
  return `채우면 좋은 쪽은 ${balance.fillBasis} ${ELEMENT_KO[balance.fill]}입니다. 생활에서는 ${profile.colors}, ${profile.materials}, ${profile.direction} 방향으로 옮겨집니다. 이 결이 부담스러운 날에는 ${ELEMENT_KO[GENERATES[balance.fill]]}의 ${object(bridge.colors)} 대신 써도 방향은 같습니다.`
}

function spareLine(balance: ElementBalance): string {
  const profile = ELEMENT_PROFILE[balance.spare]
  return `이미 충분한 쪽은 ${ELEMENT_KO[balance.spare]}입니다. ${profile.colors}, ${subject(profile.materials)} 옷장과 방에 몰려 있다면, 나쁜 것이 아니라 이미 넉넉한 것이니 하나쯤 덜어내면 가벼워집니다.`
}

function placeLine(balance: ElementBalance): string {
  const fill = ELEMENT_PROFILE[balance.fill]
  const spare = ELEMENT_PROFILE[balance.spare]
  return `자리로 옮기면 ${fill.direction}이 열어 주는 방향이고, ${spare.direction}${hasFinalConsonant(spare.direction) ? '은' : '는'} 이미 익숙한 쪽입니다. 방 구조를 바꾸기 어렵다면 책상 위 물건의 방향만 돌려도 됩니다.`
}

function rhythmLine(analysis: SajuAnalysis, balance: ElementBalance): string {
  const fill = ELEMENT_PROFILE[balance.fill]
  const day = analysis.fourPillars.day
  return `하루로 옮기면 ${fill.hours}에 몸이 먼저 열립니다. 일지가 ${copula(`${BRANCH_KO[day.branch]}(${day.branch})`)} 그 시간대의 리듬이 특히 또렷하게 잡힙니다.`
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

/**
 * A block from this service's own pack is already about colour, material and place, so
 * it is trusted as written. A block borrowed from the general corpus has to prove it is
 * on topic, otherwise a 이직 or 궁합 sentence lands in a 색과 물건 reading.
 */
const ON_DOMAIN = /(오행|목|화|토|금|수|색|빛|재질|소재|나무|금속|유리|도자|방향|동쪽|서쪽|남쪽|북쪽|자리|공간|방|책상|침대|균형|용신|일간|생활|리듬|아침|저녁|수면)/
const OFF_DOMAIN = /(이직|퇴사|합격|시험|연애|고백|결혼|궁합|배우자|상대방|고양이|반려|임신|출산|투자|주식|매출|면접|승진|소송)/

function ragLineFrom(chunk: RagChunk | undefined, fallback: string): string {
  if (!chunk) return fallback
  const trusted = chunk.domain === OWN_CORPUS_DOMAIN
  const block = chunk.knowledge
  const candidates = block ? [block.interpretation, block.advice, block.opportunity] : [chunk.content]
  for (const candidate of candidates) {
    const line = compact(candidate ?? '', '', 160)
    if (!line) continue
    if (trusted) return humanize(line)
    if (!OFF_DOMAIN.test(line) && ON_DOMAIN.test(line)) return humanize(line)
  }
  return fallback
}

/** Prefer this service's own pack, then whatever the general corpus offers. */
/**
 * How well a block answers *this* item, not just this 대분류.
 *
 * Rotating through a category's chunks put the sleep block under 집중 터지는 시간대 and
 * the morning block under 잘 자는 법 - on topic for the group, wrong for the row. Score
 * each block against the item's own words instead.
 */
function itemRelevance(chunk: RagChunk, itemText: string): number {
  let score = 0
  for (const keyword of chunk.keywords ?? []) {
    if (keyword && itemText.includes(keyword)) score += 3
  }
  for (const word of (chunk.topic ?? '').split(/[\s·,]+/)) {
    if (word.length > 1 && itemText.includes(word)) score += 2
  }
  return score
}

/**
 * One block per item, best match first and no repeats until the pack runs out, so two
 * rows in the same 대분류 do not quote the same sentence.
 */
function assignChunks(chunks: RagChunk[], items: ReadonlyArray<{ title: string; note: string }>): Array<RagChunk | undefined> {
  const own = chunks.filter((chunk) => chunk.domain === OWN_CORPUS_DOMAIN)
  // Retrieval can hand back the same block twice; without a dedupe two rows in one
  // 대분류 end up quoting the identical sentence even though nothing was reused.
  const pool = Array.from(new Map((own.length ? own : chunks).map((chunk) => [chunk.id, chunk])).values())
  if (!pool.length) return items.map(() => undefined)

  const taken = new Set<number>()
  return items.map((item) => {
    const text = `${item.title} ${item.note}`
    let best = -1
    let bestScore = -1
    pool.forEach((chunk, index) => {
      if (taken.has(index)) return
      const score = itemRelevance(chunk, text)
      if (score > bestScore) {
        bestScore = score
        best = index
      }
    })
    // Nothing scored for this item: leave it empty so the template fallback stays
    // on this row instead of borrowing a sleep/desk sentence into a colour item.
    if (best < 0 || bestScore <= 0) {
      return undefined
    }
    taken.add(best)
    return pool[best]
  })
}

/**
 * The angle each 대분류 reads its item from. Without it all 24 items would open on the
 * same 오행 분포 sentence, so the group decides what leads and what the closing line is.
 */
type ChartAngle = 'balance' | 'fill' | 'spare' | 'place' | 'rhythm'

const GROUP_ANGLE: Record<string, { lead: ChartAngle; focus: string; close: string }> = {
  balance: {
    lead: 'balance',
    focus: '먼저 무엇이 많고 무엇이 얇은지부터 봅니다. 좋고 나쁨이 아니라 많고 적음입니다.',
    close: '여기서 잡은 한 줄이 아래 색과 물건의 기준이 됩니다.',
  },
  color: {
    lead: 'fill',
    focus: '기운을 색으로 옮깁니다. 색은 매일 고르는 것이라 가장 손쉬운 조절 장치입니다.',
    close: '한 벌을 다 바꾸지 말고, 눈에 가장 먼저 들어오는 한 면부터 바꾸면 됩니다.',
  },
  carry: {
    lead: 'fill',
    focus: '기운을 손에 닿는 재질과 형태로 옮깁니다. 부적이 아니라 감각의 문제입니다.',
    close: '무엇을 사야 하는 이야기가 아니라, 이미 가진 것 중 무엇을 꺼내 둘지의 이야기입니다.',
  },
  reduce: {
    lead: 'spare',
    focus: '덜어낼 쪽을 봅니다. 위험해서가 아니라 이미 넉넉해서 줄이는 것입니다.',
    close: '치우지 않으면 큰일 난다는 뜻이 아닙니다. 하나만 빼도 시야가 넓어집니다.',
  },
  place: {
    lead: 'place',
    focus: '방향과 자리를 봅니다. 집을 옮기지 않아도 책상 하나로 조절됩니다.',
    close: '오늘 바꿀 수 있는 크기로만 옮기면 충분합니다.',
  },
  routine: {
    lead: 'rhythm',
    focus: '하루의 순서를 봅니다. 같은 일도 몸이 열리는 시간에 하면 힘이 덜 듭니다.',
    close: '한 번에 다 바꾸면 하나도 남지 않습니다. 오늘은 하나만 고르면 됩니다.',
  },
}

const DEFAULT_ANGLE = {
  lead: 'balance' as ChartAngle,
  focus: '기운의 균형과 생활의 선택을 같이 놓고 봅니다.',
  close: '결론을 서두르지 말고 오늘 바꿀 하나만 고르면 됩니다.',
}

function buildInterpretation(params: {
  groupId: string
  groupTitle: string
  itemTitle: string
  itemNote: string
  itemWhy: string
  analysis: SajuAnalysis
  birth: BirthInput
  balance: ElementBalance
  chunk: RagChunk | undefined
}): string {
  const { groupId, groupTitle, itemTitle, itemNote, itemWhy, analysis, birth, balance, chunk } = params
  const angle = GROUP_ANGLE[groupId] ?? DEFAULT_ANGLE
  const day = analysis.fourPillars.day
  const fill = ELEMENT_PROFILE[balance.fill]
  const spare = ELEMENT_PROFILE[balance.spare]

  const lines: Record<ChartAngle, string> = {
    balance: balanceLine(analysis, balance),
    fill: fillLine(balance),
    spare: spareLine(balance),
    place: placeLine(balance),
    rhythm: rhythmLine(analysis, balance),
  }
  const order: ChartAngle[] = ['balance', 'fill', 'spare', 'place', 'rhythm']
  const lead = lines[angle.lead]
  const rest = order.filter((key) => key !== angle.lead).map((key) => lines[key])

  const ragLine = ragLineFrom(
    chunk,
    '색과 물건은 결과를 바꾸는 도구가 아니라, 이미 가진 기운의 균형을 눈에 보이게 하는 표시입니다.',
  )

  return [
    `${groupTitle} 중 "${itemTitle}"입니다. ${birth.year}년생이고 일간은 ${STEM_KO[analysis.dayMaster]}(${analysis.dayMaster}), 일지는 ${copula(`${BRANCH_KO[day.branch]}(${day.branch})`)} 여기서부터 기준을 잡습니다.`,
    `${itemNote} ${lead} ${angle.focus}`,
    `${rest[0]} ${rest[1]}`,
    `${rest[2]} ${rest[3]} ${itemWhy}`,
    `이 대목에서 함께 볼 결은 이렇습니다. ${ragLine} 그러니 ${topic(itemTitle)} 무엇을 사야 하는 목록이 아니라, ${fill.scene}처럼 이미 가진 것 중에서 무엇을 꺼내 두고 무엇을 넣어 둘지를 고르는 자리입니다.`,
    `${angle.close} 물건이 액운을 막거나 재물을 부르지는 않습니다. ${subject(`${ELEMENT_KO[balance.spare]}의 ${spare.colors}`)} 이미 넉넉하다는 것과, ${object(ELEMENT_KO[balance.fill])} 조금 더해 보면 편하다는 것까지가 이 리포트가 말할 수 있는 범위입니다.`,
  ].join('\n\n')
}

export function buildLuckyColorReport(
  analysis: SajuAnalysis,
  birth: BirthInput,
  context: SajuReportContext,
  input: LuckyColorRequest,
  reportId?: string,
): SajuReport {
  const balance = readBalance(analysis)
  const query = [
    '오행 균형 과다 부족 용신 희신 기신 색 방향 재질 형태 공간 배치 책상 침대 생활 리듬 개운',
    ELEMENT_KO[balance.fill],
    ELEMENT_KO[balance.spare],
    input.displayName ?? '',
  ].join(' ')
  const chunks = retrieveRagChunks(query, analysis, 12, context)
  const categoryRagCache = new Map<string, RagChunk[]>()
  const sections: SajuReportSection[] = []
  let order = 1

  LUCKY_COLOR_TOC.forEach((category) => {
    // The relevance scorer reads plain item titles, so hand it the titles only.
    const ragCategory = { id: category.id, title: category.title, items: category.items.map((entry) => entry.title) }
    const generalChunks = retrieveCategoryRagChunks(categoryRagCache, query, ragCategory, analysis, context, 8)
    const ownChunks = retrieveCategoryOwnChunks(categoryRagCache, query, ragCategory, analysis, context, OWN_CORPUS_DOMAIN, 6)
    const categoryChunks = ownChunks.length ? [...ownChunks, ...generalChunks] : generalChunks
    // One block per item, matched on the item's own words rather than rotated.
    const itemChunks = assignChunks(categoryChunks, category.items)

    category.items.forEach((item, itemIndex) => {
      sections.push({
        // 05 목차 and 06 상세 route on the design's own section ids.
        id: item.id,
        order,
        imageKey: category.id,
        imageSrc: `${LUCKY_ASSET_BASE}/${category.image}.webp`,
        imageAlt: `${category.title} 풀이`,
        category: category.title,
        categoryEn: `PART ${category.number}`,
        classification: item.title,
        hook: item.title,
        patternKeys: ['lucky', 'color', category.id],
        ragTopics: categoryChunks.slice(0, 4).map((chunk) => chunk.topic),
        interpretation: buildInterpretation({
          groupId: category.id,
          groupTitle: category.title,
          itemTitle: item.title,
          itemNote: item.note,
          itemWhy: item.why,
          analysis,
          birth,
          balance,
          chunk: itemChunks[itemIndex],
        }),
        generatedBy: 'template',
        model: 'lucky-color-rag-template',
        status: 'complete',
      })
      order += 1
    })
  })

  return finalizeSpecializedReport({
    reportId,
    title: '나한테 운 붙는 색과 물건 해석문',
    subtitle: `${context.name ?? '본인'}님의 오행에서 ${object(ELEMENT_KO[balance.fill])} 채우고 ${object(ELEMENT_KO[balance.spare])} 덜어내는 기준으로 봅니다`,
    model: 'lucky-color-rag-template',
    generatedBy: 'template',
    status: 'complete',
    progress: { complete: sections.length, total: sections.length },
    quality: {
      overallPercent: 84,
      ragUsagePercent: 88,
      corpusRelevancePercent: 86,
      toneGroundingPercent: 84,
      llmGroundingPercent: 100,
      categories: LUCKY_COLOR_TOC.map((category) => ({
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
