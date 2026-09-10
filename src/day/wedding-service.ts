import { createHash } from 'node:crypto'
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
  STEM_ELEMENT,
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
  partnerBirthTimeKnown?: boolean
  birthTimeKnown?: boolean
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
      { id: '1-2', title: '유리한 조건', note: '합이 서는 자리와 용신에 맞는 자리를 찾습니다.', why: '유리한 조건이 몇 개인지 알아야 후보끼리 비교됩니다.' },
      { id: '1-3', title: '확인할 조건', note: '충·파·해가 서는 자리를 그대로 보여줍니다.', why: '걸리는 자리를 숨기면 비교 자체가 무의미해집니다.' },
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
      { id: '2-1', title: '각자의 사주와 비교', note: '두 명식 각각에 대해 같은 날을 따로 봅니다.', why: '같은 날의 관계가 두 사람에게 다르게 나타날 수 있습니다.' },
      { id: '2-2', title: '일반적인 기준과 다른 이유', note: '일반 택일과 개인 명식 기준의 차이를 설명합니다.', why: '왜 결과가 다른지 알면 남의 말에 흔들리지 않습니다.' },
      { id: '2-3', title: '함께 참고할 조건', note: '두 사람에게 공통으로 맞는 결을 찾습니다.', why: '공통 결이 있으면 후보를 좁히기 쉽습니다.' },
    ],
  },
  {
    id: 'better',
    number: 3,
    image: '01-scene-02-empathy',
    title: '더 나은 날 없어?',
    subtitle: '입력한 후보를 비교하고, 새 후보를 추가할 때의 기준을 살펴봅니다.',
    items: [
      { id: '3-1', title: '같은 달의 후보 비교', note: '입력한 후보 중 같은 달에 있는 날짜를 비교합니다.', why: '예식장 사정상 달을 못 바꾸는 경우가 많습니다.' },
      { id: '3-2', title: '다음 달 후보를 고를 때', note: '다음 달의 날짜를 후보로 추가할 때 확인할 기준을 안내합니다.', why: '입력하지 않은 날짜는 계산 결과에 포함하지 않습니다.' },
      { id: '3-3', title: '예약 전에 확인할 것', note: '계약 전에 확인할 구간을 표시합니다.', why: '계약 후에는 날짜를 바꾸기 어렵습니다.' },
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
      { id: '5-1', title: '시간대', note: '예식 시간과 이동·대기 시간을 함께 조율할 기준을 봅니다.', why: '같은 날도 시간대에 따라 체감이 다릅니다.' },
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
      { id: '6-1', title: '예식 뒤 생활 정리', note: '예식 뒤 일정과 생활을 정리할 기준을 봅니다.', why: '신혼의 사건이나 관계 변화를 예측하지 않습니다.' },
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

function parseTime(raw: unknown): { hour: number; minute: number; known: boolean } {
  if (typeof raw === 'string') {
    const m = /^(\d{1,2}):(\d{2})$/.exec(raw.trim())
    if (m) {
      const hour = Number(m[1])
      const minute = Number(m[2])
      // 한 자리 시각('9:30')도 유효하다. 확인 여부는 이 파싱 결과 하나만 근거로 쓴다.
      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) return { hour, minute, known: true }
    }
  }
  // 시간을 모르면 정오로 둔다. 시주는 이 서비스의 판정에 쓰지 않는다.
  return { hour: 12, minute: 0, known: false }
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
    ...(partnerBirth ? { partnerBirth, partnerBirthTimeKnown: parseTime(body.partnerTime).known } : {}),
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
  usefulGodKnown: boolean
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

function sideView(label: string, analysis: SajuAnalysis, dayStem: HeavenlyStem, dayBranch: EarthlyBranch, birthTimeKnown = true): SideView {
  const own = analysis.fourPillars.day.branch
  const relation = branchRelation(dayBranch, own)
  return {
    label,
    dayBranch: own,
    relation: relation.kind,
    relationNote: relation.note,
    tenGod: getTenGod(analysis.dayMaster, dayStem),
    usefulGodKnown: birthTimeKnown,
    matchesUsefulGod: birthTimeKnown && analysis.usefulGod != null && analysis.usefulGod === STEM_ELEMENT[dayStem],
  }
}

/**
 * 후보일 하나를 두 사람 기준으로 재 본다.
 *
 * 세는 것은 네 가지뿐이다. 합이 서면 유리, 충이 서면 주의, 파·해는 약한 주의, 그 날의
 * 일간이 용신 오행이면 유리. 여기 없는 규칙으로 점수를 올리거나 내리지 않는다.
 */
export function judgeCandidate(iso: string, sides: Array<{ label: string; analysis: SajuAnalysis; birthTimeKnown?: boolean }>): CandidateView | null {
  const parsed = parseIsoDate(iso)
  if (!parsed) return null
  const idx = getDayIndices(parsed.year, parsed.month, parsed.day)
  const pillar = buildPillar(idx.stemIdx, idx.branchIdx)

  const views = sides.map((side) => sideView(side.label, side.analysis, pillar.stem, pillar.branch, side.birthTimeKnown))
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
  const sides: Array<{ label: string; analysis: SajuAnalysis; birthTimeKnown?: boolean }> = [{ label: '본인', analysis, birthTimeKnown: input.birthTimeKnown }]
  if (input.partnerBirth) {
    sides.push({ label: '상대', analysis: analyzeSaju(input.partnerBirth), birthTimeKnown: input.partnerBirthTimeKnown })
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

// ------------------------------------------------------------------ 문장

function readerName(context: SajuReportContext): string {
  const raw = typeof context.name === 'string' ? context.name.trim() : ''
  return raw || '고객'
}

function candidateLines(frame: WeddingFrame): string[] {
  return frame.candidates.map((c) => {
    const per = c.sides.map((s) => {
      const rel = s.relation === '무관' ? '충·합·파·해 없음' : `${s.relation}(${BRANCH_KO[s.dayBranch]} 일지 기준)`
      const useful = !s.usefulGodKnown ? ', 출생시간 미상으로 용신 일치 판단 제외' : s.matchesUsefulGod ? ', 용신 오행 일치' : ''
      return `${topic(s.label)} ${rel}, 십신은 ${s.tenGod}${useful}`
    }).join(' / ')
    return `${c.label}\n${c.pillar}일 · ${c.termName} 구간\n${per}\n유리 조건 ${c.favourable}개 · 확인할 조건 ${c.cautions}개`
  })
}

function sectionBody(
  groupId: string, frame: WeddingFrame, _analysis: SajuAnalysis, name: string, _chunk: RagChunk | undefined,
): string[] {
  const best = frame.best
  const candidates = candidateLines(frame)
  const basis = candidates.length ? candidates.join('\n\n') : '비교할 후보일이 아직 없습니다.'
  const bestLine = best ? `입력한 후보 중 ${best.label}은 유리 조건 ${best.favourable}개, 확인할 조건 ${best.cautions}개로 계산됐습니다. 이는 정해 둔 전통적 관계를 센 값이며 실제 결혼 생활의 결과를 뜻하지 않습니다.` : '후보일을 입력하면 같은 기준으로 비교합니다.'
  const scope = frame.hasPartner ? '본인과 상대의 일지를 각각 비교했습니다.' : '현재는 본인 기준입니다. 상대 정보가 없어 두 사람의 공통 조건은 판단하지 않습니다.'
  const general = '아래 준비 조언은 사주로 예측한 결과가 아니라, 일정 조율을 위한 일반적인 참고 사항입니다.'
  const blocks: Record<string, string[]> = {
    verdict: [
      `[비교 결과] ${name}님, ${bestLine}\n\n[비교 범위] ${scope} 입력한 ${frame.candidates.length}개 후보만 비교하며, 같은 조건 수의 날짜는 우열을 단정하지 않습니다.\n\n[날짜별 근거] ${basis}`,
      `[유리한 조건] 후보일과 각자의 일지가 합 관계인지, 후보일의 일간 오행이 각자 용신과 일치하는지를 셉니다. 용신은 사주에서 균형을 돕는다고 해석하는 오행입니다.\n\n[계산 결과] ${bestLine}\n\n[읽는 방법] 조건이 많다고 결혼의 성공 가능성이 높다는 뜻은 아닙니다. 가능한 일정 안에서 비교할 참고 기준으로 읽어 주세요.`,
      `[확인할 조건] 충·파·해는 지지 사이의 전통적 관계 이름입니다. 사고나 갈등이 생긴다는 예고로 해석하지 않습니다.\n\n[날짜별 근거] ${basis}\n\n[결정할 때] 주의 조건을 이유로 이미 합의한 날짜를 급히 바꾸지 마세요. 두 사람의 의사와 실제 준비 가능 여부를 먼저 확인해 주세요.`,
      `[한 줄 요약] ${bestLine}\n\n[두 사람이 함께 볼 것] ${scope} 관계의 종류와 조건 수를 보고, 일정과 준비 부담을 따로 적어 비교해 보세요.\n\n[판단의 한계] 손 없는 날이나 삼재는 계산에 사용하지 않았습니다. 길일·흉일을 선고하지 않습니다.`,
    ],
    ours: [
      `[각자의 기준] ${scope} 같은 후보일이 본인과 상대에게 어떤 관계로 계산됐는지 따로 읽는 항목입니다.\n\n[확인한 근거] ${basis}\n\n[함께 결정하기] 한쪽의 조건 수만 보고 날짜를 정하지 마세요. 서로 중요하게 생각하는 준비 조건을 나란히 적어 보세요.`,
      `[기준이 다른 이유] 누구에게나 적용하는 관습과 개인 사주를 비교하는 방식은 서로 다릅니다. 이 서비스는 입력한 후보일의 일주와 각자의 일지 관계를 계산합니다.\n\n[이번 비교] ${scope} ${bestLine}\n\n[참고 범위] 이 차이가 특정 관습의 옳고 그름을 증명하지는 않습니다. 두 사람이 동의하는 기준으로 사용해 주세요.`,
      `[함께 참고할 조건] ${bestLine}\n\n[각자 확인하기] ${basis}\n\n[공통점을 찾는 방법] 합이나 용신 일치 여부가 서로 같지 않아도 잘못된 날짜는 아닙니다. 한쪽만 양보하게 되는 결정은 아닌지 함께 확인해 보세요.`,
    ],
    better: [
      `[같은 달의 후보] ${best ? `${best.label}은 ${best.termName} 절기 구간에 포함됩니다.` : '후보일이 있어야 절기 구간을 확인할 수 있습니다.'} 달력의 월과 절기 구간은 시작일이 다를 수 있습니다.\n\n[현재 비교 범위] ${basis}\n\n[다른 날도 궁금하다면] 원하는 날짜를 새 후보로 넣어 비교해 주세요. 입력하지 않은 날짜 중에서 최적의 날을 자동으로 찾은 결과는 아닙니다.`,
      '[범위를 넓힐 때] 다음 달로 옮기는 것만으로 조건이 좋아지는 것은 아닙니다. 실제로 가능한 날짜를 먼저 정해 후보에 추가해 주세요.\n\n[비교 순서] 장소와 양가 일정을 확인한 다음, 기존 후보와 새 후보를 같은 기준으로 비교해 보세요.\n\n[이번 해석의 한계] 다음 달 전체 날짜를 계산하거나 예약 가능 여부를 확인한 결과는 아닙니다.',
      `[예약 전 확인] ${general}\n\n[확인할 순서] 후보일별로 장소의 가능 시간, 이동 거리, 참석해야 할 가족의 일정을 확인해 보세요.\n\n[비교 결과 활용] ${bestLine} 이 결과만으로 예약·변경 여부를 결정하지 않는 것이 좋습니다.`,
      `[양가 일정] 입력한 상황은 "${frame.familyLimit || '미입력'}"입니다. 구체적인 가족 일정은 제공되지 않았으므로 가능한 날짜를 확정할 수는 없습니다.\n\n[조율 순서] 양쪽에서 꼭 피해야 할 날짜를 먼저 모은 뒤, 남은 후보를 비교해 보세요.\n\n[함께 확인] 전통적 조건과 실제 일정은 다른 기준입니다. 어느 한쪽을 이유로 일방적인 결정을 내리지 않도록 해 주세요.`,
    ],
    before: [
      `[미리 확정할 것] 예식 형태는 "${frame.format || '미입력'}"입니다. ${general}\n\n[준비 목록] ${frame.format === '혼인신고만' ? '신고에 필요한 사항은 관할 기관에 직접 확인하고, 가족에게 알릴 시점을 함께 정해 주세요.' : '참석 인원, 장소, 식사, 진행 순서를 목록으로 정리해 보세요. 확정된 일과 아직 상의할 일을 나누면 도움이 됩니다.'}\n\n[이번 주 할 일] 결정이 필요한 항목 하나를 골라 담당자와 확인 날짜를 정해 보세요.`,
      '[먼저 상의할 것] 비용을 누가 어떤 방식으로 확인할지, 준비 업무를 어떻게 나눌지 이야기해 보세요.\n\n[정리 방법] 서로의 희망 사항과 꼭 지키고 싶은 기준을 구분해 적어 두면 좋습니다.\n\n[참고 범위] 이 내용은 실제 갈등이 있다는 진단이 아닙니다. 이미 합의가 되어 있다면 그 기준을 유지하셔도 됩니다.',
      '[알릴 내용] 날짜와 장소 중 확정된 것만 같은 내용으로 전달해 보세요. 아직 정하지 않은 부분은 상의 중이라고 구분해 주세요.\n\n[알릴 순서] 두 사람이 먼저 합의한 뒤, 양쪽 가족에게 무리 없는 시점을 함께 정해 보세요.\n\n[남길 기록] 전달한 내용과 추가로 확인할 질문을 간단히 적어 두면 반복 설명을 줄이는 데 도움이 됩니다.',
    ],
    onday: [
      '[시간대 조율] 이 서비스는 길한 시각을 계산하거나 추천하지 않습니다. 예식 시간은 장소의 가능 시간과 이동·대기 시간을 기준으로 조율해 주세요.\n\n[확인할 간격] 준비, 이동, 식사, 예식 시작 사이에 필요한 시간을 따로 적어 보세요.\n\n[마지막 확인] 너무 촘촘한 일정이 있다면 담당자와 여유 시간을 상의해 보세요.',
      '[이동 동선] 장소별 이동 방법과 대기 위치를 간단히 정리해 보세요. 실제 장소 정보가 없어 이동 시간을 계산한 것은 아닙니다.\n\n[확인할 사람] 가족이나 진행 담당자 중 안내를 맡을 사람을 정하면 좋습니다.\n\n[줄일 부담] 여러 사람이 한꺼번에 확인해야 하는 일이 있다면 연락 창구를 하나로 정리해 보세요.',
      '[전날 준비] 새로 결정할 일을 줄이고, 다음 날 필요한 물건을 미리 모아 두세요.\n\n[당일 일정] 식사와 쉬는 시간을 어디에 둘지 확인해 보세요.\n\n[참고 범위] 건강 상태나 당일 컨디션을 사주로 진단한 결과가 아닙니다. 각자의 평소 생활과 필요에 맞춰 조정해 주세요.',
      '[덜어낼 일] 당일 꼭 해야 하는 일과 미뤄도 되는 일을 나누어 보세요.\n\n[선택 기준] 두 사람에게 중요하지 않은 순서가 준비 부담만 늘리는지 살펴보세요.\n\n[함께 결정] 필요한 순서를 일괄적으로 줄이기보다 담당자와 가능한 범위를 확인해 주세요.',
    ],
    after: [
      '[예식 뒤 생활] 결혼 날짜만으로 신혼의 사건이나 관계 변화를 예측하지 않습니다. 이 항목은 일상으로 돌아오는 준비를 위한 안내입니다.\n\n[정리할 순서] 예식 뒤 남은 일정과 휴식, 집안일 분담을 두 사람이 함께 확인해 보세요.\n\n[무리 없는 시작] 이미 정한 생활 기준이 있다면 새로운 규칙을 한꺼번에 추가할 필요는 없습니다.',
      '[양가와의 소통] 연락이나 방문의 빈도에 정답은 없습니다. 두 사람이 편안한 범위를 먼저 상의해 보세요.\n\n[함께 전하기] 어느 한쪽의 요구로 보이지 않도록 합의한 내용을 같은 표현으로 전달하면 도움이 됩니다.\n\n[참고 범위] 현재 서운함이나 갈등이 있다는 뜻은 아닙니다. 실제 상황에 필요한 부분만 참고해 주세요.',
      '[남은 일 정리] 준비하면서 남은 물품·연락·정산 항목을 한 목록으로 모아 보세요.\n\n[확인 방법] 완료 여부와 확인할 사람을 표시하고, 두 사람에게 무리 없는 시점에 점검해 주세요.\n\n[참고 범위] 비용 규모나 계약에 대한 전문 판단을 제공하는 항목은 아닙니다.',
    ],
  }
  return blocks[groupId] || [bestLine]
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
  const fingerprint = createHash('sha256').update(JSON.stringify({ birth, input })).digest('hex').slice(0, 20)
  return `wedding-${stamp}-${p.day.stem}${p.day.branch}-${dates}-${fingerprint}`
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
        hook: itemIndex === 0 ? groupHook : (mine || item.note).replace(/^\[[^\]]+\]\s*/, '').split(/\n|(?<=[.!?])\s/)[0],
        patternKeys: [`service:${WEDDING_SERVICE_KEY}`, group.id, ...(frame.best ? [`pillar:${frame.best.pillar}`] : [])],
        ragTopics: assigned[groupIndex]?.topic ? [String(assigned[groupIndex]?.topic)] : [],
        interpretation: [...(mine ? [mine] : []), ...leftover].filter(Boolean).join('\n\n'),
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
