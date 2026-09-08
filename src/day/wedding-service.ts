/**
 * 우리, 언제 결혼하면 좋을까? — 결혼 택일.
 *
 * 택일은 "좋은 날/나쁜 날"로 끊기 가장 쉬운 상품이라, 이 서비스는 후보일마다 **조건을
 * 비교**하는 일만 한다. 길흉을 선고하지 않고, 두 사람의 명식과 그 날의 일주 사이에
 * 어떤 관계가 서는지를 세어서 후보일들을 나란히 놓는다.
 *
 * 비교에 쓰는 값은 전부 계산된다. 후보일의 일주는 `getDayIndices`, 그 일지가 각자의
 * 일지와 맺는 충·합·파·해는 명식이 이미 쓰는 짝 표, 일간의 십신은 `getTenGod`, 그 날이
 * 어느 절기 달에 드는지는 절기표에서 읽는다. 표에 없는 규칙은 만들지 않는다.
 */
import type {
  BirthInput,
  EarthlyBranch,
  Element,
  HeavenlyStem,
  RagChunk,
  SajuAnalysis,
  SajuReport,
  SajuReportContext,
  SajuReportSection,
  TenGod,
} from '../types/index.js'
import { retrieveCategoryOwnChunks, retrieveCategoryRagChunks } from '../report/specialized-rag.js'
import { analyzeSaju, getTenGod } from '../saju/analyzer.js'
import { buildPillar, getDayIndices, getSolarTermKstDate } from '../saju/calculator.js'
import {
  BRANCH_CLASH_PAIRS,
  BRANCH_COMBINATION_PAIRS,
  BRANCH_HARM_PAIRS,
  BRANCH_BREAK_PAIRS,
  BRANCH_KO,
  ELEMENT_KO,
  STEM_ELEMENT,
  STEM_KO,
} from '../saju/analyzer-helpers.js'

export const WEDDING_SERVICE_KEY = 'wedding_day'

/** 이 서비스만의 코퍼스 도메인. 검색은 이 팩을 먼저 쓴다. */
const OWN_CORPUS_DOMAIN = 'wedding_day_service'

export const WEDDING_ASSET_BASE = '/day/wedding'

export type WeddingFormat = '예식장' | '스몰웨딩' | '혼인신고만'
export type FamilyLimit = '크게 없음' | '특정 주말만 가능' | '가족 일정 조율 필요'

export interface WeddingRequest {
  /** 후보일. 하나는 있어야 하고 최대 세 개까지 나란히 본다. */
  candidateDates: string[]
  partnerBirth?: BirthInput
  format?: WeddingFormat
  familyLimit?: FamilyLimit
  displayName?: string
}

/**
 * 6 대분류 / 21 중분류. 05 목차와 06 상세는 디자인에서 대분류 번호(`section=1`)로
 * 링크하므로, 섹션 id 는 중분류(`1-1`)로 두고 브리지가 번호도 받아 첫 항목으로 넘긴다.
 */
export const WEDDING_TOC = [
  {
    id: 'verdict',
    number: 1,
    image: '01-scene-01-hook',
    title: '이 날, 괜찮아?',
    subtitle: '후보일마다 조건이 맞는지부터 세어 봅니다.',
    items: [
      { id: '1-1', title: '후보일 판정', note: '고른 날마다 두 사람의 명식과 어떤 관계가 서는지 셉니다.', why: '판정은 등급이 아니라 조건의 개수와 종류로 나옵니다.' },
      { id: '1-2', title: '좋은 조건 맞는지', note: '합이 서는 자리와 용신에 맞는 자리를 찾습니다.', why: '유리한 조건이 몇 개인지 알아야 후보끼리 비교됩니다.' },
      { id: '1-3', title: '걸리는 거 있는지', note: '충·파·해가 서는 자리를 그대로 보여줍니다.', why: '걸리는 자리를 숨기면 비교 자체가 무의미해집니다.' },
      { id: '1-4', title: '한마디로', note: '후보일을 한 줄로 정리합니다.', why: '가족과 상의할 때 한 줄이 있어야 말이 됩니다.' },
    ],
  },
  {
    id: 'ours',
    number: 2,
    image: '01-bridge-01-hook',
    title: '나한테도 좋은 날이야?',
    subtitle: '남들이 좋다는 날과 우리 둘에게 맞는 날은 다릅니다.',
    items: [
      { id: '2-1', title: '두 사람 기운 기준으로는 어때?', note: '두 명식 각각에 대해 같은 날을 따로 봅니다.', why: '한쪽에 좋고 한쪽에 걸리는 날이 가장 흔합니다.' },
      { id: '2-2', title: '남한테 좋아도 우리한텐 다른 이유', note: '일반 택일과 개인 명식 기준의 차이를 설명합니다.', why: '왜 결과가 다른지 알면 남의 말에 흔들리지 않습니다.' },
      { id: '2-3', title: '우리한테 유리한 결', note: '두 사람에게 공통으로 맞는 결을 찾습니다.', why: '공통 결이 있으면 후보를 좁히기 쉽습니다.' },
    ],
  },
  {
    id: 'better',
    number: 3,
    image: '01-scene-02-empathy',
    title: '더 나은 날 없어?',
    subtitle: '고른 날 주변에서 조건이 더 맞는 구간을 찾습니다.',
    items: [
      { id: '3-1', title: '이 달 안에서 고르면', note: '같은 절기 달 안의 다른 날을 비교합니다.', why: '예식장 사정상 달을 못 바꾸는 경우가 많습니다.' },
      { id: '3-2', title: '다음 달까지 보면', note: '다음 절기 달까지 범위를 넓혀 봅니다.', why: '한 달만 미뤄도 조건이 크게 달라질 수 있습니다.' },
      { id: '3-3', title: '예식장 잡기 전 볼 구간', note: '계약 전에 확인할 구간을 표시합니다.', why: '계약 후에는 날짜를 바꾸기 어렵습니다.' },
      { id: '3-4', title: '양가 일정과 맞추기', note: '입력한 일정 제약을 조건과 겹쳐 봅니다.', why: '사주 조건만 맞아도 실제로 못 하면 의미가 없습니다.' },
    ],
  },
  {
    id: 'before',
    number: 4,
    image: '01-bridge-02-empathy',
    title: '그날 전에 뭐 챙겨?',
    subtitle: '날짜가 정해지면 그다음은 순서 문제입니다.',
    items: [
      { id: '4-1', title: '미리 챙길 것', note: '예식 전에 확정해 두면 편한 것을 봅니다.', why: '미룬 항목이 당일 컨디션을 깎습니다.' },
      { id: '4-2', title: '정리해 둘 것', note: '두 사람 사이에서 먼저 맞춰 둘 것을 봅니다.', why: '돈과 살림 기준은 예식 전에 정하는 편이 낫습니다.' },
      { id: '4-3', title: '양가에 알릴 순서', note: '알리는 순서와 시점을 잡습니다.', why: '순서가 어긋나면 날짜보다 감정이 문제가 됩니다.' },
    ],
  },
  {
    id: 'onday',
    number: 5,
    image: '01-scene-03-basis',
    title: '당일엔 이렇게',
    subtitle: '정한 날을 잘 쓰는 방법만 남깁니다.',
    items: [
      { id: '5-1', title: '시간대', note: '그 날 안에서 어느 시간대가 무리가 적은지 봅니다.', why: '같은 날도 시간대에 따라 체감이 다릅니다.' },
      { id: '5-2', title: '동선', note: '이동과 대기가 겹치는 지점을 미리 봅니다.', why: '동선이 꼬이면 준비한 것이 다 묻힙니다.' },
      { id: '5-3', title: '컨디션', note: '전날과 당일 아침의 리듬을 잡습니다.', why: '컨디션은 의지보다 준비로 정해집니다.' },
      { id: '5-4', title: '안 하는 게 나은 것', note: '당일에 굳이 넣지 않아도 되는 것을 덜어냅니다.', why: '덜어내는 쪽이 당일을 가장 크게 살립니다.' },
    ],
  },
  {
    id: 'after',
    number: 6,
    image: '01-bridge-03-basis',
    title: '그 뒤는 어떻게 흘러?',
    subtitle: '예식 다음이 실제 결혼 생활의 시작입니다.',
    items: [
      { id: '6-1', title: '신혼 시작 흐름', note: '예식 뒤 몇 달의 결을 봅니다.', why: '시작 구간의 리듬이 한동안 이어집니다.' },
      { id: '6-2', title: '양가 관계', note: '두 집안 사이의 거리를 어떻게 둘지 봅니다.', why: '관계는 사건보다 거리에서 갈립니다.' },
      { id: '6-3', title: '혼수·비용 마무리', note: '비용과 살림을 정리하는 순서를 봅니다.', why: '남은 정산이 신혼 초의 힘을 먼저 씁니다.' },
    ],
  },
] as const

// ------------------------------------------------------------------ 조사

function hasFinalConsonant(word: string): boolean {
  for (let i = word.length - 1; i >= 0; i -= 1) {
    const code = word.charCodeAt(i) - 0xac00
    if (code < 0 || code > 11171) continue
    return code % 28 !== 0
  }
  return false
}

const subject = (w: string): string => `${w}${hasFinalConsonant(w) ? '이' : '가'}`
const topic = (w: string): string => `${w}${hasFinalConsonant(w) ? '은' : '는'}`

// --------------------------------------------------------------- 입력 파싱

const FORMATS: WeddingFormat[] = ['예식장', '스몰웨딩', '혼인신고만']
const FAMILY_LIMITS: FamilyLimit[] = ['크게 없음', '특정 주말만 가능', '가족 일정 조율 필요']

/** `YYYY-MM-DD` 만 받는다. 달력에 없는 날은 버린다. */
function parseIsoDate(raw: unknown): { year: number; month: number; day: number } | null {
  if (typeof raw !== 'string') return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim())
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null
  const probe = new Date(Date.UTC(year, month - 1, day))
  if (probe.getUTCMonth() + 1 !== month || probe.getUTCDate() !== day) return null
  return { year, month, day }
}

function parseTime(raw: unknown): { hour: number; minute: number } {
  if (typeof raw === 'string') {
    const m = /^(\d{1,2}):(\d{2})$/.exec(raw.trim())
    if (m) {
      const hour = Number(m[1])
      const minute = Number(m[2])
      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) return { hour, minute }
    }
  }
  // 시간을 모르면 정오로 둔다. 시주는 이 서비스의 판정에 쓰지 않는다.
  return { hour: 12, minute: 0 }
}

export function parseWeddingRequest(body: Record<string, unknown>): WeddingRequest {
  const dates: string[] = []
  for (const key of ['candidateDate1', 'candidateDate2', 'candidateDate3']) {
    const parsed = parseIsoDate(body[key])
    if (parsed) {
      const iso = `${parsed.year}-${String(parsed.month).padStart(2, '0')}-${String(parsed.day).padStart(2, '0')}`
      if (!dates.includes(iso)) dates.push(iso)
    }
  }

  const partnerDate = parseIsoDate(body.partnerBirth)
  const partnerTime = parseTime(body.partnerTime)
  const partnerBirth: BirthInput | undefined = partnerDate
    ? {
        year: partnerDate.year,
        month: partnerDate.month,
        day: partnerDate.day,
        hour: partnerTime.hour,
        minute: partnerTime.minute,
        gender: 'female',
        calendar: 'solar',
        isLeapMonth: false,
      }
    : undefined

  const rawFormat = typeof body.format === 'string' ? body.format.trim() : ''
  const rawLimit = typeof body.familyLimit === 'string' ? body.familyLimit.trim() : ''
  const rawName = body.displayName ?? body.name
  const displayName = typeof rawName === 'string' ? rawName.trim().slice(0, 20) : ''

  return {
    candidateDates: dates,
    ...(partnerBirth ? { partnerBirth } : {}),
    ...(FORMATS.includes(rawFormat as WeddingFormat) ? { format: rawFormat as WeddingFormat } : {}),
    ...(FAMILY_LIMITS.includes(rawLimit as FamilyLimit) ? { familyLimit: rawLimit as FamilyLimit } : {}),
    ...(displayName ? { displayName } : {}),
  }
}

// ------------------------------------------------------------ 후보일 판정

type Relation = '합' | '충' | '파' | '해' | '무관'

function branchRelation(a: EarthlyBranch, b: EarthlyBranch): { kind: Relation; note: string } {
  const match = (pairs: Array<[EarthlyBranch, EarthlyBranch, string]>) =>
    pairs.find(([x, y]) => (x === a && y === b) || (x === b && y === a))
  const hit = match(BRANCH_COMBINATION_PAIRS)
  if (hit) return { kind: '합', note: hit[2] }
  const clash = match(BRANCH_CLASH_PAIRS)
  if (clash) return { kind: '충', note: clash[2] }
  const harm = match(BRANCH_HARM_PAIRS)
  if (harm) return { kind: '해', note: harm[2] }
  const brk = match(BRANCH_BREAK_PAIRS)
  if (brk) return { kind: '파', note: brk[2] }
  return { kind: '무관', note: '' }
}

/** 한 사람 기준의 그 날 조건. */
export interface SideView {
  label: string
  dayBranch: EarthlyBranch
  relation: Relation
  relationNote: string
  tenGod: TenGod
  /** 그 날의 일간이 이 사람의 용신 오행인지. */
  matchesUsefulGod: boolean
}

export interface CandidateView {
  iso: string
  label: string
  /** 후보일의 일주. */
  dayStem: HeavenlyStem
  dayBranch: EarthlyBranch
  pillar: string
  dayElement: Element
  /** 그 날이 드는 절기 달. */
  termName: string
  sides: SideView[]
  favourable: number
  cautions: number
  verdict: '조건이 맞는 편' | '걸리는 조건은 없는 편' | '조건이 반은 맞는 편' | '걸리는 조건이 있는 편'
  headline: string
}

const MONTH_TERMS = [
  '입춘', '경칩', '청명', '입하', '망종', '소서',
  '입추', '백로', '한로', '입동', '대설', '소한',
] as const

/**
 * 그 날이 어느 절기 달에 드는지. 달력 월이 아니라 월절 경계로 가른다.
 *
 * 경계를 목록 순서(입춘…소한)로 훑으면 같은 해 1월 초의 소한이 마지막에 걸려 언제나
 * 이긴다. 그래서 경계를 날짜순으로 세워 마지막으로 지나온 것을 고르고, 소한 이전은
 * 전년 대설이 연 子월로 넘긴다.
 */
function termOfDate(year: number, month: number, day: number): string {
  const stamp = Date.UTC(year, month - 1, day)
  const boundaries = MONTH_TERMS
    .map((term) => {
      const at = getSolarTermKstDate(year, term)
      return { term, stamp: Date.UTC(at.getFullYear(), at.getMonth(), at.getDate()) }
    })
    .sort((a, b) => a.stamp - b.stamp)
  let current = ''
  for (const entry of boundaries) {
    if (entry.stamp <= stamp) current = entry.term
  }
  return current || '대설'
}

function sideView(label: string, analysis: SajuAnalysis, dayStem: HeavenlyStem, dayBranch: EarthlyBranch): SideView {
  const own = analysis.fourPillars.day.branch
  const relation = branchRelation(dayBranch, own)
  return {
    label,
    dayBranch: own,
    relation: relation.kind,
    relationNote: relation.note,
    tenGod: getTenGod(analysis.dayMaster, dayStem),
    matchesUsefulGod: analysis.usefulGod != null && analysis.usefulGod === STEM_ELEMENT[dayStem],
  }
}

/**
 * 후보일 하나를 두 사람 기준으로 재 본다.
 *
 * 세는 것은 네 가지뿐이다. 합이 서면 유리, 충이 서면 주의, 파·해는 약한 주의, 그 날의
 * 일간이 용신 오행이면 유리. 여기 없는 규칙으로 점수를 올리거나 내리지 않는다.
 */
export function judgeCandidate(iso: string, sides: Array<{ label: string; analysis: SajuAnalysis }>): CandidateView | null {
  const parsed = parseIsoDate(iso)
  if (!parsed) return null
  const idx = getDayIndices(parsed.year, parsed.month, parsed.day)
  const pillar = buildPillar(idx.stemIdx, idx.branchIdx)

  const views = sides.map((side) => sideView(side.label, side.analysis, pillar.stem, pillar.branch))
  let favourable = 0
  let cautions = 0
  for (const view of views) {
    if (view.relation === '합') favourable += 1
    if (view.relation === '충') cautions += 1
    if (view.relation === '파' || view.relation === '해') cautions += 1
    if (view.matchesUsefulGod) favourable += 1
  }

  const verdict: CandidateView['verdict'] = cautions === 0
    ? (favourable > 0 ? '조건이 맞는 편' : '걸리는 조건은 없는 편')
    : cautions > favourable
      ? '걸리는 조건이 있는 편'
      : '조건이 반은 맞는 편'

  const day = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day))
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][day.getUTCDay()]
  const label = `${parsed.year}년 ${parsed.month}월 ${parsed.day}일(${weekday})`

  return {
    iso,
    label,
    dayStem: pillar.stem,
    dayBranch: pillar.branch,
    pillar: `${pillar.stem}${pillar.branch}`,
    dayElement: STEM_ELEMENT[pillar.stem],
    termName: termOfDate(parsed.year, parsed.month, parsed.day),
    sides: views,
    favourable,
    cautions,
    verdict,
    headline: `${label} · ${pillar.stem}${pillar.branch}일 · ${verdict}`,
  }
}

export interface WeddingFrame {
  candidates: CandidateView[]
  /** 후보 중 조건이 가장 덜 걸리는 날. 후보가 없으면 null. */
  best: CandidateView | null
  hasPartner: boolean
  format: WeddingFormat | null
  familyLimit: FamilyLimit | null
}

export function buildWeddingFrame(
  analysis: SajuAnalysis,
  input: WeddingRequest,
): WeddingFrame {
  const sides: Array<{ label: string; analysis: SajuAnalysis }> = [{ label: '본인', analysis }]
  if (input.partnerBirth) {
    sides.push({ label: '상대', analysis: analyzeSaju(input.partnerBirth) })
  }

  const candidates = input.candidateDates
    .map((iso) => judgeCandidate(iso, sides))
    .filter((view): view is CandidateView => view != null)

  const best = candidates.length > 0
    ? candidates.slice().sort((a, b) => (a.cautions - b.cautions) || (b.favourable - a.favourable))[0]
    : null

  return {
    candidates,
    best,
    hasPartner: sides.length > 1,
    format: input.format ?? null,
    familyLimit: input.familyLimit ?? null,
  }
}

// ------------------------------------------------------------------ RAG

const RAG_FIELD_LABEL = /(^|\s)(concept|condition|interpretation|guide|output|tone|caution|source|evidence|risk|opportunity|advice)\s*:\s*/gi

function chunkMeaning(chunk: RagChunk): string {
  const block = chunk.knowledge
  if (block) return [block.interpretation, block.advice, block.opportunity].filter(Boolean).join(' ')
  return chunk.content ?? ''
}

function compact(text: string, limit = 170): string {
  const clean = String(text ?? '').replace(RAG_FIELD_LABEL, ' ').replace(/\s+/g, ' ').trim()
  if (!clean) return ''
  return clean.length > limit ? `${clean.slice(0, limit - 1)}…` : clean
}

// ------------------------------------------------------------------ 문장

function readerName(context: SajuReportContext): string {
  const raw = typeof context.name === 'string' ? context.name.trim() : ''
  return raw || '고객'
}

function candidateLines(frame: WeddingFrame): string[] {
  return frame.candidates.map((c) => {
    const per = c.sides.map((s) => {
      const rel = s.relation === '무관' ? '충·합 없음' : `${s.relation}(${BRANCH_KO[s.dayBranch]} 일지 기준)`
      const useful = s.matchesUsefulGod ? ', 용신에 맞음' : ''
      return `${topic(s.label)} ${rel}, 십신은 ${s.tenGod}${useful}`
    }).join(' / ')
    return `${c.label}: ${c.pillar}일, ${c.termName} 구간. ${per}. 유리 ${c.favourable} · 주의 ${c.cautions} → ${c.verdict}`
  })
}

function sectionBody(
  groupId: string,
  frame: WeddingFrame,
  analysis: SajuAnalysis,
  name: string,
  chunk: RagChunk | undefined,
): string[] {
  const basis = chunk ? compact(chunkMeaning(chunk)) : ''
  const basisLine = basis ? `참고로 두는 기준은 이렇습니다. ${basis}` : ''
  const best = frame.best
  const dayMaster = `${STEM_KO[analysis.dayMaster]}(${analysis.dayMaster})`
  const lines = candidateLines(frame)
  const noCandidate = frame.candidates.length === 0

  const blocks: Record<string, string[]> = {
    verdict: [
      noCandidate
        ? '[해석] 아직 후보일이 들어오지 않았습니다. 날짜를 하나만 넣어도 그 날의 일주와 두 사람의 명식 사이에 어떤 관계가 서는지 바로 보여드립니다.'
        : `[해석] 먼저 말씀드리면, 이 풀이는 날을 길일·흉일로 선고하지 않습니다. 고른 날마다 두 사람의 명식과 어떤 관계가 서는지를 세어서 나란히 놓는 일만 합니다. ${name}님 일간은 ${dayMaster}입니다.`,
      ...(noCandidate ? [] : [`[후보일 비교] ${lines.join(' // ')}`]),
      ...(best ? [`[좋은 조건] 세어 본 결과 걸리는 조건이 가장 적은 쪽은 ${best.label}입니다. ${best.pillar}일이고 ${best.termName} 구간에 듭니다. 유리한 조건 ${best.favourable}개, 주의할 조건 ${best.cautions}개입니다.`] : []),
      ...(best && best.cautions > 0
        ? [`[걸리는 것] 숨기지 않고 말하면 ${best.label}에도 주의 조건이 ${best.cautions}개 있습니다. ${best.sides.filter((s) => s.relation !== '무관' && s.relation !== '합').map((s) => `${s.label} 쪽 ${s.relation}`).join(', ') || '두 사람 모두 큰 충은 없습니다'}. 조건이 걸린다고 못 하는 날이라는 뜻은 아니고, 그 날 무리를 덜 하라는 뜻입니다.`]
        : best ? ['[걸리는 것] 두 사람 모두 이 날과 충·파·해가 서지 않습니다. 조건상 걸리는 자리가 없다는 뜻이고, 그래도 당일 무리는 따로 챙겨야 합니다.'] : []),
      ...(best ? [`[한마디로] ${best.label}, ${best.verdict}입니다. 가족과 상의할 때는 이 한 줄과 아래 조건 목록을 같이 보여주세요. ${basisLine}`] : [basisLine || '후보일을 넣으면 한 줄 정리까지 만들어 드립니다.']),
    ],
    ours: [
      `[해석] 흔히 말하는 좋은 날은 누구에게나 같은 날입니다. 그런데 택일에서 실제로 갈리는 건 그 날이 ${frame.hasPartner ? '두 사람' : '본인'}의 명식과 어떻게 맞물리는지입니다.`,
      ...(noCandidate ? [] : [`[두 사람 기준] ${frame.hasPartner ? '같은 날을 각자 기준으로 따로 봤습니다.' : '상대 생년월일이 들어오면 같은 날을 상대 기준으로도 봅니다. 지금은 본인 기준만 나옵니다.'} ${lines.join(' // ')}`]),
      frame.hasPartner && best
        ? `[다른 이유] 한쪽에 합이 서고 다른 쪽에 충이 서는 날이 가장 흔합니다. ${best.label} 기준으로는 ${best.sides.map((s) => `${s.label} ${s.relation}`).join(', ')} 입니다. 같은 날이 서로 다르게 읽히는 게 이상한 일이 아닙니다.`
        : '[다른 이유] 일반 택일은 그 날 자체의 조건만 봅니다. 개인 명식 기준은 그 날이 내 일지와 어떤 관계를 맺는지까지 봅니다. 그래서 결과가 달라질 수 있습니다.',
      `[우리한테 유리한 결] ${best ? `${best.pillar}일의 일간은 ${ELEMENT_KO[best.dayElement]} 기운입니다. ${best.sides.some((s) => s.matchesUsefulGod) ? '두 사람 중 한쪽 이상의 용신에 맞습니다.' : '두 사람의 용신과 직접 맞지는 않지만, 충이 없으면 그것만으로도 조건은 무난합니다.'}` : '후보일이 들어오면 그 날의 기운이 두 사람 용신과 맞는지 확인합니다.'} ${basisLine}`,
    ],
    better: [
      `[해석] 고른 날이 최선인지 궁금하실 겁니다. 다만 날짜는 예식장과 양가 일정이 먼저 정하는 경우가 많아, 여기서는 바꿀 수 있는 범위부터 봅니다.`,
      best
        ? `[이 달 안에서] ${best.label}은 ${best.termName} 구간에 듭니다. 같은 절기 달 안에서 옮기면 월운은 그대로 두고 일주만 바뀝니다. 달을 못 바꾸는 상황이면 이 범위가 가장 현실적입니다.`
        : '[이 달 안에서] 후보일이 들어오면 그 날이 드는 절기 달을 먼저 잡고, 같은 달 안의 대안을 봅니다.',
      '[다음 달까지] 한 달을 미루면 월운 자체가 바뀝니다. 조건이 크게 달라질 수 있으니, 예식장 계약 전이라면 다음 절기 달까지 같이 보는 편이 낫습니다.',
      `[계약 전에] 예식장 계약은 되돌리기 어렵습니다. 계약 전에 후보일 두세 개를 같은 기준으로 비교해 두면, 한 곳이 안 될 때 흔들리지 않습니다.`,
      `[양가 일정] ${frame.familyLimit ? `입력하신 제약은 "${frame.familyLimit}"입니다. ${frame.familyLimit === '크게 없음' ? '제약이 적으면 조건이 맞는 날을 우선 고를 수 있습니다.' : '제약이 있으면 사주 조건보다 가능한 날을 먼저 좁히고, 그 안에서 조건을 비교하는 순서가 맞습니다.'}` : '양가 일정 제약을 넣으면 가능한 날을 먼저 좁힌 뒤 조건을 비교합니다.'} ${basisLine}`,
    ],
    before: [
      `[해석] 날짜가 정해지면 남은 건 순서입니다. ${frame.format ? `예식 형태는 "${frame.format}"으로 잡으셨습니다.` : ''} 형태에 따라 챙길 것의 무게가 달라집니다.`,
      `[미리 챙길 것] ${frame.format === '혼인신고만' ? '서류와 신고 날짜, 그리고 양가에 알리는 시점만 정리되면 대부분 끝납니다.' : frame.format === '스몰웨딩' ? '인원과 장소, 식사 방식을 먼저 확정하면 나머지가 따라옵니다. 항목이 적은 대신 하나가 밀리면 전체가 밀립니다.' : '예식장, 인원, 식순, 예복 네 가지를 먼저 확정하세요. 이 네 개가 나머지 일정을 다 끌고 갑니다.'}`,
      '[정리해 둘 것] 두 사람 사이에서 돈과 살림 기준을 예식 전에 맞춰 두세요. 예식 후로 미룬 항목이 신혼 초반의 힘을 먼저 씁니다.',
      `[양가에 알릴 순서] 순서가 어긋나면 날짜보다 감정이 문제가 됩니다. 양쪽에 같은 정보를 비슷한 시점에 전하는 것만으로 대부분 피해집니다. ${basisLine}`,
    ],
    onday: [
      `[해석] 정한 날을 잘 쓰는 방법만 남깁니다. ${best ? `${best.label}은 ${best.pillar}일입니다.` : ''} 당일은 운보다 준비가 체감을 정합니다.`,
      '[시간대] 같은 날도 오전과 오후의 체감이 다릅니다. 대기와 이동이 겹치지 않는 쪽을 고르고, 식사 시간과 예식 시간이 붙지 않게 두세요.',
      '[동선] 이동과 대기가 한 지점에 몰리면 준비한 것이 다 묻힙니다. 양가 어른의 이동 경로를 따로 그려 두면 당일이 눈에 띄게 편해집니다.',
      '[컨디션] 전날 늦게까지 확인하는 습관이 당일 표정을 결정합니다. 전날 저녁에는 확인을 끝내고, 아침에는 새로 정하는 일을 만들지 않으세요.',
      `[안 하는 게 나은 것] 넣고 싶은 순서를 하나 덜어내는 쪽이 당일을 가장 크게 살립니다. 욕심을 줄이는 게 아니라 여유를 만드는 일입니다. ${basisLine}`,
    ],
    after: [
      '[해석] 예식은 하루고 결혼 생활은 그 뒤부터입니다. 그래서 택일은 그 날 하루보다 그 뒤 몇 달의 결까지 같이 봅니다.',
      best
        ? `[신혼 시작 흐름] ${best.label} 이후는 ${best.termName} 구간에서 출발합니다. 시작 구간의 리듬이 한동안 이어지니, 첫 두세 달은 새로 벌이기보다 자리를 잡는 데 쓰는 편이 낫습니다.`
        : '[신혼 시작 흐름] 후보일이 들어오면 그 날이 드는 절기 구간부터 신혼 초반의 결을 봅니다.',
      '[양가 관계] 관계는 사건보다 거리에서 갈립니다. 연락 빈도와 방문 주기를 두 사람이 먼저 합의해 두면, 어느 쪽도 서운해지지 않습니다.',
      `[혼수·비용 마무리] 남은 정산이 신혼 초의 힘을 먼저 씁니다. 예식 후 한 달 안에 비용을 닫는 날을 미리 정해 두세요. 이 풀이는 특정 사건이나 결과를 단정하지 않습니다. ${basisLine}`,
    ],
  }

  return (blocks[groupId] ?? [
    `${name}님의 후보일을 두 사람의 명식과 나란히 놓고 봅니다.`,
    basisLine || '이 풀이는 계산된 일주와 절기 위에서만 씁니다.',
  ]).filter(Boolean)
}

function sectionHook(groupId: string, frame: WeddingFrame): string {
  const best = frame.best
  const hooks: Record<string, string> = {
    verdict: best ? `${best.label}, ${best.verdict}예요` : '후보일을 넣으면 조건부터 세어 드려요',
    ours: frame.hasPartner ? '같은 날이 두 사람에게 다르게 읽힐 수 있어요' : '상대 사주까지 넣으면 두 기준으로 봅니다',
    better: '달을 못 바꿀 때와 바꿀 수 있을 때가 다릅니다',
    before: frame.format ? `${topic(frame.format)} 챙길 순서가 다릅니다` : '날짜가 정해지면 남는 건 순서입니다',
    onday: '당일은 운보다 준비가 체감을 정합니다',
    after: '예식은 하루, 결혼 생활은 그 뒤부터입니다',
  }
  return hooks[groupId] ?? '후보일을 한 칸씩 봅니다'
}

export function createWeddingReportId(analysis: SajuAnalysis, birth: BirthInput, input: WeddingRequest): string {
  const p = analysis.fourPillars
  const stamp = `${birth.year}${String(birth.month).padStart(2, '0')}${String(birth.day).padStart(2, '0')}`
  const dates = input.candidateDates.map((d) => d.replace(/-/g, '')).join('-') || 'nodate'
  return `wedding-${stamp}-${p.day.stem}${p.day.branch}-${dates}`
}

/** 라우트가 쓰는 리포트 문맥. 서비스 키가 프롬프트 팩과 코퍼스 선택을 가른다. */
export function buildWeddingContext(name: string | undefined, input: WeddingRequest): SajuReportContext {
  return {
    serviceKey: WEDDING_SERVICE_KEY,
    name: input.displayName || name,
    target: '우리 결혼, 이날 해도 될까?',
    concern: '후보일마다 두 사람의 명식과 맞물리는 조건을 비교해 결혼 날짜를 고르는 기준',
  }
}

/** 검색 질의. 자기 코퍼스를 먼저 타도록 서비스 도메인을 앞에 둔다. */
export function weddingRagQuery(frame: WeddingFrame, analysis: SajuAnalysis): string {
  return [
    '결혼 택일 예식 날짜 고르기',
    '택일 공통 규칙 목적별 택일 두 사람 용신 월간 흐름',
    frame.best ? `${frame.best.pillar}일 ${frame.best.termName}` : '',
    `일간 ${analysis.dayMaster}`,
    frame.format ?? '',
  ].filter(Boolean).join(' ')
}

/**
 * 템플릿 리포트. 05 목차와 06 상세가 중분류 id 로 라우팅하므로 섹션도 중분류 단위로
 * 만들고, 대분류마다 계산해 둔 문단을 그 대분류의 중분류에 하나씩 배정한다.
 */
export function buildWeddingReport(
  analysis: SajuAnalysis,
  birth: BirthInput,
  context: SajuReportContext,
  input: WeddingRequest,
  reportId?: string,
): SajuReport {
  const frame = buildWeddingFrame(analysis, input)
  const name = readerName(context)
  const query = weddingRagQuery(frame, analysis)
  const ragCache = new Map<string, RagChunk[]>()
  const assigned = WEDDING_TOC.map((group) => {
    const category = { id: group.id, title: group.title, items: group.items.map((it) => it.title) }
    const own = retrieveCategoryOwnChunks(ragCache, query, category, analysis, context, OWN_CORPUS_DOMAIN, 2)
    if (own.length > 0) return own[0]
    return retrieveCategoryRagChunks(ragCache, query, category, analysis, context, 2)[0]
  })

  const sections: SajuReportSection[] = []
  let order = 1

  WEDDING_TOC.forEach((group, groupIndex) => {
    const paragraphs = sectionBody(group.id, frame, analysis, name, assigned[groupIndex])
    const groupHook = sectionHook(group.id, frame)

    group.items.forEach((item, itemIndex) => {
      const mine = paragraphs[itemIndex]
      const isLast = itemIndex === group.items.length - 1
      const leftover = isLast ? paragraphs.slice(group.items.length) : []
      sections.push({
        id: item.id,
        order,
        imageKey: group.id,
        imageSrc: `${WEDDING_ASSET_BASE}/01-step-1-story/assets/generated/wedding-day/wedding-day-${group.image}.webp`,
        imageAlt: `${group.title} 풀이`,
        category: group.title,
        categoryEn: `PART ${group.number}`,
        classification: item.title,
        hook: itemIndex === 0 ? groupHook : item.title,
        patternKeys: [`service:${WEDDING_SERVICE_KEY}`, group.id, ...(frame.best ? [`pillar:${frame.best.pillar}`] : [])],
        ragTopics: assigned[groupIndex]?.topic ? [String(assigned[groupIndex]?.topic)] : [],
        interpretation: [`${item.note} ${item.why}`, ...(mine ? [mine] : []), ...leftover].filter(Boolean).join('\n\n'),
        status: 'complete',
      })
      order += 1
    })
  })

  return {
    reportId: reportId || createWeddingReportId(analysis, birth, input),
    title: `${name}님의 결혼 택일 리포트`,
    subtitle: frame.best
      ? `후보 ${frame.candidates.length}개 비교 · ${frame.best.label} ${frame.best.verdict}`
      : '후보일을 넣으면 조건을 비교합니다',
    model: 'template',
    generatedBy: 'template',
    status: 'complete',
    progress: { complete: sections.length, total: sections.length },
    sections,
  }
}

/** 04 무료 티저. 계산된 판정만 앞세우고 유료로 열리는 목차를 숨기지 않는다. */
export function buildWeddingTeaser(analysis: SajuAnalysis, input: WeddingRequest, context: SajuReportContext = {}): {
  frame: WeddingFrame
  headline: string
  lines: string[]
  scope: Array<{ title: string; items: string[] }>
} {
  const frame = buildWeddingFrame(analysis, input)
  const name = readerName(context)
  return {
    frame,
    headline: frame.best
      ? `${frame.best.label}, ${frame.best.verdict}입니다`
      : `${name}님, 후보일을 넣으면 조건부터 세어 드립니다`,
    lines: [
      frame.candidates.length > 0
        ? `후보 ${frame.candidates.length}개를 같은 기준으로 비교했습니다.`
        : '후보일이 아직 없습니다. 하나만 넣어도 비교가 시작됩니다.',
      ...candidateLines(frame),
      frame.hasPartner
        ? '두 사람 명식을 각각 기준으로 삼아 같은 날을 두 번 봤습니다.'
        : '상대 생년월일을 넣으면 같은 날을 상대 기준으로도 봅니다.',
      '이 풀이는 길일·흉일을 선고하지 않습니다. 조건을 세어 후보를 비교하는 기준입니다.',
    ].filter(Boolean),
    scope: WEDDING_TOC.map((g) => ({ title: g.title, items: g.items.map((it) => it.title) })),
  }
}

export { OWN_CORPUS_DOMAIN as WEDDING_CORPUS_DOMAIN, subject as weddingSubject }
