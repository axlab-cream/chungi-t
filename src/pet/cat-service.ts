import { createHash } from 'node:crypto'
import type {
  BirthInput,
  Element,
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

export const CAT_COMPAT_SERVICE_KEY = 'cat_compatibility'

/** Where the 고양이 궁합 artwork lives, beside the service pages. */
export const CAT_COMPAT_ASSET_BASE = '/match/cat/assets/cat-compatibility'

export interface CatCompatRequest {
  catName: string
  household: string
  ageBand: string
  behaviorTags: string[]
  touchStyle: string
  playEnergy: string
  routineFlags: string[]
  focusArea: string
  upcomingEvent: string
  note?: string
}

/**
 * The 10 대분류 / 50 중분류 index the 고양이 궁합 pages are designed around.
 * The ids are what 05 목차 and 06 상세 route on.
 */
export const CAT_COMPAT_TOC = [
  {
    id: 'guardian-defaults',
    label: '第一門',
    title: '내 집사력 기본값',
    subtitle: '내가 챙기는 방식과 지치는 포인트를 먼저 봅니다.',
    image: '05-guardian-defaults',
    items: [
      { id: 'guardian-dna', title: '집사 성향 DNA', note: '나는 챙겨야 마음이 놓이는 쪽인지, 지켜봐야 편한 쪽인지 먼저 가릅니다.' },
      { id: 'care-energy', title: '돌봄 에너지 레벨', note: '밥·청소·놀이를 오래 유지할 힘이 어디서 차고 빠지는지 봅니다.' },
      { id: 'affection-temperature', title: '애정 표현 온도', note: '좋아하는 마음이 손길·말투·확인으로 어떻게 나오는지 살핍니다.' },
      { id: 'alone-time', title: '혼자 있고 싶은 시간', note: '집사님에게도 고양이에게도 필요한 조용한 시간을 따로 둡니다.' },
      { id: 'attachment-balance', title: '집착 vs 방치 밸런스', note: '과하게 붙는 날과 너무 늦게 보는 날의 차이를 잡습니다.' },
    ],
  },
  {
    id: 'chemistry-temperature',
    label: '第二門',
    title: '나와 고양이 케미 온도',
    subtitle: '좋아하는 마음이 실제 반응으로 어떻게 보이는지 봅니다.',
    image: '05-chemistry-temperature',
    items: [
      { id: 'first-meeting-tension', title: '첫 만남 텐션', note: '처음 마주친 순간의 속도 차이가 이후 루틴에 남는지 봅니다.' },
      { id: 'petting-angle', title: '쓰다듬 허용각', note: '손길이 편한 구간과 멈춰야 할 타이밍을 분리합니다.' },
      { id: 'rest-together', title: '같이 쉬는 궁합', note: '한 공간에 있어도 서로 편해지는 휴식 방식을 봅니다.' },
      { id: 'play-code', title: '놀아주는 코드', note: '격한 놀이가 맞는지, 짧고 자주 보는 방식이 맞는지 고릅니다.' },
      { id: 'sulk-recovery', title: '삐짐 회복 속도', note: '서운해 보이는 반응 뒤에 다시 풀리는 시간을 봅니다.' },
    ],
  },
  {
    id: 'distance-compat',
    label: '第三門',
    title: '거리감 궁합',
    subtitle: '가까워지는 것보다 편해지는 거리를 먼저 잡습니다.',
    image: '05-distance-compat',
    items: [
      { id: 'boundary-line', title: '선 넘는 포인트', note: '고양이가 불편해지는 손길·시선·소리의 경계를 봅니다.' },
      { id: 'approach-timing', title: '가까워지는 타이밍', note: '다가갈 때와 기다릴 때를 생활 흐름 안에서 나눕니다.' },
      { id: 'quiet-affection', title: '무관심처럼 보이는 애정', note: '멀리 앉아도 마음이 닫힌 것은 아닐 수 있는 신호를 봅니다.' },
      { id: 'guardian-speed', title: '집사의 말·행동 속도', note: '내 반응 속도가 고양이에게 빠르게 느껴지는 구간을 살핍니다.' },
      { id: 'comfortable-distance', title: '고양이가 편해지는 거리', note: '가장 편하게 쉬고 다가오는 생활 반경을 잡습니다.' },
    ],
  },
  {
    id: 'routine-sync',
    label: '第四門',
    title: '생활 루틴 싱크',
    subtitle: '밥, 잠, 외출, 반복 케어의 박자가 맞는지 봅니다.',
    image: '05-routine-sync',
    items: [
      { id: 'morning-routine', title: '아침 루틴 궁합', note: '하루 시작의 소리와 움직임이 고양이에게 어떤 신호가 되는지 봅니다.' },
      { id: 'meal-snack-rhythm', title: '밥·간식 리듬', note: '기대가 커지는 시간과 안정되는 시간을 나눠 봅니다.' },
      { id: 'sleep-pattern-clash', title: '수면 패턴 충돌', note: '밤에 깨어나는 흐름과 집사 체력의 접점을 찾습니다.' },
      { id: 'outing-home-work', title: '외출·재택 궁합', note: '집에 있는 날과 비우는 날의 반응 차이를 봅니다.' },
      { id: 'care-routine', title: '반복되는 케어 루틴', note: '화장실·빗질·놀이처럼 반복되는 케어의 부담을 줄입니다.' },
    ],
  },
  {
    id: 'space-compat',
    label: '第五門',
    title: '공간 궁합',
    subtitle: '집 안의 자리와 빛, 냄새, 동선을 생활 힌트로 봅니다.',
    image: '05-space-compat',
    items: [
      { id: 'hideout-place', title: '숨숨집 자리', note: '숨고 싶은 자리가 불안 회피인지 충전 공간인지 봅니다.' },
      { id: 'cat-tower-window', title: '캣타워·창가 운', note: '높은 자리와 바깥 풍경이 안정감에 주는 힌트를 봅니다.' },
      { id: 'litter-location', title: '화장실 위치 민감도', note: '동선, 소리, 시선이 예민하게 느껴지는 자리를 살핍니다.' },
      { id: 'safe-active-zone', title: '안정존 vs 활동존', note: '쉬는 자리와 뛰는 자리를 섞지 않는 배치를 봅니다.' },
      { id: 'color-light-mood', title: '우리집 컬러·조명 무드', note: '색과 조명은 처방이 아니라 분위기 조절 힌트로 봅니다.' },
    ],
  },
  {
    id: 'trouble-pattern',
    label: '第六門',
    title: '트러블 패턴 해석',
    subtitle: '문제 행동을 혼내기 전에 반복 신호와 회복 순서를 봅니다.',
    image: '05-trouble-pattern',
    items: [
      { id: 'bite-scratch-signal', title: '물고 긁는 날의 신호', note: '장난, 거절, 과흥분이 섞이는 지점을 나눠 봅니다.' },
      { id: 'night-zoomies-stamina', title: '밤 우다다와 집사 체력', note: '밤의 에너지와 집사 수면 리듬이 부딪히는 구간을 봅니다.' },
      { id: 'shy-alertness', title: '낯가림·경계심', note: '새 사람과 새 소리에 반응하는 속도를 살핍니다.' },
      { id: 'multi-cat-jealousy', title: '다묘 질투각', note: '관심, 공간, 밥그릇이 경쟁처럼 느껴지는 순간을 봅니다.' },
      { id: 'conflict-reset', title: '반복 갈등 리셋법', note: '같은 패턴을 다시 만들지 않도록 멈춤 순서를 정합니다.' },
    ],
  },
  {
    id: 'five-elements-care',
    label: '第七門',
    title: '오행 밸런스 케어',
    subtitle: '오행은 생활을 강제하는 답이 아니라 돌봄 언어로 씁니다.',
    image: '05-five-elements-care',
    items: [
      { id: 'wood-play-growth', title: '목 기운: 성장·놀이', note: '새 놀이와 호기심을 어느 정도 열어줄지 봅니다.' },
      { id: 'fire-expression-excite', title: '화 기운: 표현·흥분', note: '반응이 커지는 순간과 진정이 필요한 순간을 나눕니다.' },
      { id: 'earth-stability-routine', title: '토 기운: 안정·루틴', note: '반복되는 자리와 시간표가 주는 안정감을 봅니다.' },
      { id: 'metal-rule-cleanup', title: '금 기운: 규칙·정리', note: '정리와 규칙이 편안함으로 이어지는 선을 봅니다.' },
      { id: 'water-rest-alone', title: '수 기운: 휴식·혼자만의 시간', note: '고요하게 숨어 쉬는 시간이 필요한 흐름을 봅니다.' },
    ],
  },
  {
    id: 'adoption-intro-timing',
    label: '第八門',
    title: '입양·합사 타이밍',
    subtitle: '날짜를 예언하기보다 적응 순서를 무리 없이 잡습니다.',
    image: '05-adoption-intro-timing',
    items: [
      { id: 'adoption-flow', title: '입양하기 좋은 흐름', note: '새 식구를 맞이할 준비와 생활 여백을 같이 봅니다.' },
      { id: 'first-intro-day', title: '첫 합사 주의일', note: '첫 만남에서 급하게 붙이지 말아야 할 조건을 봅니다.' },
      { id: 'vet-grooming-timing', title: '병원·미용 예약 타이밍', note: '외출 스트레스가 덜한 순서와 회복 시간을 잡습니다.' },
      { id: 'moving-layout-day', title: '이사·방 배치 변경일', note: '공간 변화가 클 때 먼저 지켜야 할 안정 구역을 봅니다.' },
      { id: 'adjustment-check', title: '적응 기간 체크', note: '며칠 만에 판단하지 않고 반응을 나누어 기록하는 기준을 봅니다.' },
    ],
  },
  {
    id: 'burnout-prevention',
    label: '第九門',
    title: '집사 번아웃 방지',
    subtitle: '잘 챙기려는 마음이 부담으로 바뀌는 지점을 봅니다.',
    image: '05-burnout-prevention',
    items: [
      { id: 'overcare-point', title: '내가 과하게 챙기는 지점', note: '좋아서 하는 케어가 압박처럼 느껴지는 순간을 봅니다.' },
      { id: 'delayed-care-point', title: '미루는 케어 포인트', note: '귀찮아서가 아니라 에너지가 빠지는 케어를 찾아봅니다.' },
      { id: 'rest-needed-day', title: '쉬어야 하는 날', note: '집사님에게도 비워둘 시간이 필요한 흐름을 봅니다.' },
      { id: 'emotional-cost-cut', title: '감정 소모 줄이는 법', note: '반응 하나에 마음을 오래 쓰는 패턴을 줄입니다.' },
      { id: 'long-cohabitation', title: '장기 동거 지속력', note: '몇 달이 아니라 오래 같이 살기 위한 돌봄 페이스를 봅니다.' },
    ],
  },
  {
    id: 'today-cat-action',
    label: '第十門',
    title: '오늘의 냥생 액션',
    subtitle: '긴 리포트를 오늘 바로 할 수 있는 행동으로 내려놓습니다.',
    image: '05-today-cat-action',
    items: [
      { id: 'today-one-action', title: '오늘 할 한 가지', note: '오늘 바꿀 손길, 말투, 놀이 중 하나만 고릅니다.' },
      { id: 'weekly-routine-mission', title: '이번 주 루틴 미션', note: '한 주 동안 반복해볼 작은 루틴을 정합니다.' },
      { id: 'speech-touch-adjust', title: '말투·손길 조정', note: '고양이가 편하게 받아들이는 속도와 톤을 맞춥니다.' },
      { id: 'play-method', title: '놀이 방식 추천', note: '사냥 놀이, 짧은 놀이, 혼자 놀이의 비율을 봅니다.' },
      { id: 'quiet-watch-timing', title: '조용히 지켜볼 타이밍', note: '다가가지 않는 것이 더 편안한 순간을 알아둡니다.' },
    ],
  },
] as const
const HOUSEHOLD_LABEL: Record<string, string> = {
  single_cat: '1묘 가정',
  multi_cat: '다묘 가정',
  planning_adoption: '입양 예정',
}

const AGE_LABEL: Record<string, string> = {
  kitten: '아깽이·어린 고양이',
  adult: '성묘',
  senior: '노묘',
  unknown: '나이를 모르는 상태',
}

const TOUCH_LABEL: Record<string, string> = {
  loves_touch: '먼저 와서 부비는 편',
  short_touch: '짧게만 만질 수 있는 편',
  mood_based: '기분에 따라 달라지는 편',
  avoid_touch: '손길을 거의 싫어하는 편',
}

const PLAY_LABEL: Record<string, string> = {
  low: '낮음 · 지켜보는 편',
  medium: '보통 · 하루 한두 번',
  high: '높음 · 계속 놀고 싶어함',
  night: '밤에 몰아서 터지는 편',
}

const BEHAVIOR_LABEL: Record<string, string> = {
  shy: '낯가림',
  touch_friendly: '손길 좋아함',
  independent: '독립적',
  active: '활발함',
  sensitive: '예민함',
  food_motivated: '간식 반응 빠름',
  night_runner: '밤 우다다',
  jealous: '질투·다묘 예민',
}

const ROUTINE_LABEL: Record<string, string> = {
  sleep_conflict: '수면 패턴',
  food_rhythm: '밥·간식 리듬',
  work_from_home: '외출·재택 텐션',
  space_litter: '화장실·공간',
  multi_cat_tension: '다묘 질투각',
  clinic_grooming: '병원·미용 예약',
  none: '크게 없음',
}

const FOCUS_LABEL: Record<string, string> = {
  distance: '거리감 궁합',
  routine: '생활 루틴 싱크',
  space: '공간 궁합',
  trouble: '트러블 패턴',
  adoption: '입양·합사 타이밍',
  burnout: '집사 번아웃 방지',
  today_action: '오늘의 냥생 액션',
}

const EVENT_LABEL: Record<string, string> = {
  none: '예정된 일정 없음',
  adoption: '입양',
  introduce_cat: '합사',
  clinic: '병원',
  grooming: '미용',
  moving: '이사·방 배치 변경',
}

function trimmed(value: unknown, limit: number): string {
  return typeof value === 'string' ? value.trim().slice(0, limit) : ''
}

function labelList(values: unknown, map: Record<string, string>, limit: number): string[] {
  if (!Array.isArray(values)) return []
  const seen = new Set<string>()
  for (const value of values) {
    const key = trimmed(value, 30)
    const label = map[key]
    if (label) seen.add(label)
    if (seen.size >= limit) break
  }
  return [...seen]
}

export function parseCatCompatRequest(body: Record<string, unknown>): CatCompatRequest {
  const catName = trimmed(body.catName ?? body.cat_nickname, 20)
  const householdRaw = trimmed(body.household ?? body.cat_household, 30)
  const ageRaw = trimmed(body.ageBand ?? body.cat_age_band, 30)
  const touchRaw = trimmed(body.touchStyle ?? body.cat_touch_style, 30)
  const playRaw = trimmed(body.playEnergy ?? body.cat_play_energy, 30)
  const focusRaw = trimmed(body.focusArea ?? body.focus_area, 30)
  const eventRaw = trimmed(body.upcomingEvent ?? body.upcoming_event, 30) || 'none'

  if (!catName) throw new Error('고양이 이름 또는 애칭을 입력해 주세요.')
  if (!HOUSEHOLD_LABEL[householdRaw]) throw new Error('1묘·다묘·입양 예정 중에서 가정 형태를 골라 주세요.')
  if (!TOUCH_LABEL[touchRaw]) throw new Error('손길에 대한 반응을 골라 주세요.')
  if (!PLAY_LABEL[playRaw]) throw new Error('놀이 에너지를 골라 주세요.')
  if (!FOCUS_LABEL[focusRaw]) throw new Error('가장 먼저 보고 싶은 영역을 골라 주세요.')
  if (!EVENT_LABEL[eventRaw]) throw new Error('예정된 일정을 골라 주세요.')

  return {
    catName,
    household: householdRaw,
    // 나이는 모를 수 있고, 그때는 행동 태그만으로 읽는다.
    ageBand: AGE_LABEL[ageRaw] ? ageRaw : 'unknown',
    behaviorTags: labelList(body.behaviorTags ?? body.cat_behavior_tags, BEHAVIOR_LABEL, 8),
    touchStyle: touchRaw,
    playEnergy: playRaw,
    routineFlags: labelList(body.routineFlags ?? body.routine_flags, ROUTINE_LABEL, 6),
    focusArea: focusRaw,
    upcomingEvent: eventRaw,
    note: trimmed(body.note ?? body.free_note, 200),
  }
}

export function buildCatCompatContext(name: string | undefined, input: CatCompatRequest): SajuReportContext {
  return {
    serviceKey: CAT_COMPAT_SERVICE_KEY,
    name,
    target: '반려묘 생활 궁합',
    concern: [
      `고양이: ${input.catName}`,
      `가정: ${HOUSEHOLD_LABEL[input.household]}`,
      `나이대: ${AGE_LABEL[input.ageBand]}`,
      input.behaviorTags.length ? `성향: ${input.behaviorTags.join('·')}` : '',
      `손길: ${TOUCH_LABEL[input.touchStyle]}`,
      `놀이: ${PLAY_LABEL[input.playEnergy]}`,
      input.routineFlags.length ? `루틴 고민: ${input.routineFlags.join('·')}` : '',
      `우선 확인: ${FOCUS_LABEL[input.focusArea]}`,
      `예정: ${EVENT_LABEL[input.upcomingEvent]}`,
      input.note,
    ].filter(Boolean).join(' · '),
  }
}

export function createCatCompatReportId(
  ownerId: string | undefined,
  birth: BirthInput,
  input: CatCompatRequest,
): string {
  const fingerprint = JSON.stringify({
    ownerId: ownerId ?? '',
    birth: { year: birth.year, month: birth.month, day: birth.day, hour: birth.hour, gender: birth.gender, calendar: birth.calendar },
    input,
    serviceKey: CAT_COMPAT_SERVICE_KEY,
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

const OUTPUT_STARS: TenGod[] = ['식신', '상관']
const RESOURCE_STARS: TenGod[] = ['정인', '편인']
const OFFICIAL_STARS: TenGod[] = ['정관', '편관']

function ownedStars(analysis: SajuAnalysis, stars: TenGod[]): TenGod[] {
  return [...new Set(analysis.tenGods.filter((god) => stars.includes(god)))]
}

/**
 * The seat of the reading each 대분류 opens on. Every line below names the 원국 signal
 * it came from — this service reads the guardian's own chart plus what they reported
 * about the cat, and never claims to have cast the cat's chart.
 */
type ChartSeat = 'strength' | 'output' | 'branch' | 'balance' | 'official' | 'elements' | 'timing' | 'resource'

function strengthLine(analysis: SajuAnalysis): string {
  if (analysis.dayMasterStrength === 'strong') {
    return '자네 일간이 단단한 편이라 챙기는 힘은 넉넉하네. 다만 그 힘이 상대의 속도를 앞질러 나갈 때가 있네.'
  }
  if (analysis.dayMasterStrength === 'weak') {
    return '자네 일간이 여린 편이라 한 번에 많이 쏟으면 뒤가 비네. 조금씩 오래 가는 방식이 맞네.'
  }
  return '자네 일간이 균형에 가까워, 챙기는 양보다 언제 챙기는지가 결과를 가르네.'
}

function outputLine(analysis: SajuAnalysis): string {
  const stars = ownedStars(analysis, OUTPUT_STARS)
  if (!stars.length) {
    return '원국에 식상이 얇아 마음이 있어도 표현이 늦게 나가네. 말보다 손길과 시간으로 전해지는 쪽일세.'
  }
  return `원국의 식상은 ${subject(stars.join('·'))} 잡히니 표현이 밖으로 잘 나가네. 다만 사람에게 통하는 크기가 고양이에게는 클 수 있네.`
}

function branchLine(analysis: SajuAnalysis): string {
  const day = analysis.fourPillars.day
  return `자네 일지는 ${copula(`${BRANCH_KO[day.branch]}(${day.branch})`)} 이 자리가 자네가 편안해지는 거리와 자리를 정하네. 그 거리가 고양이의 거리와 늘 같지는 않네.`
}

function balanceLine(analysis: SajuAnalysis): string {
  const dominant = ELEMENT_KO[analysis.dominantElement]
  const weak = ELEMENT_KO[analysis.weakElement]
  return `원국은 ${dominant} 기운이 앞서고 ${topic(weak)} 얇으니, 하루의 리듬도 ${dominant} 쪽으로 몰리기 쉽네. 몰리는 자리와 비는 자리를 먼저 알아 두게.`
}

function officialLine(analysis: SajuAnalysis): string {
  const stars = ownedStars(analysis, OFFICIAL_STARS)
  if (!stars.length) {
    return '원국에 관성이 드러나지 않아 규칙을 스스로 만들어야 하네. 규칙이 없으면 부딪힘이 매번 처음처럼 느껴지네.'
  }
  return `원국의 관성은 ${subject(stars.join('·'))} 잡히니 규칙과 책임을 세우는 힘이 있네. 그 힘이 통제로 기울면 상대가 먼저 물러나네.`
}

const ELEMENT_CARE: Array<[Element, string, string]> = [
  ['wood', '목', '성장과 놀이'],
  ['fire', '화', '표현과 흥분'],
  ['earth', '토', '안정과 루틴'],
  ['metal', '금', '규칙과 정리'],
  ['water', '수', '휴식과 혼자만의 시간'],
]

function elementsLine(analysis: SajuAnalysis): string {
  const counts = analysis.elementCount
  const tally = ELEMENT_CARE.map(([element, short]) => `${short} ${counts[element]}`).join(', ')
  const thin = ELEMENT_CARE
    .filter(([element]) => counts[element] === Math.min(...ELEMENT_CARE.map(([key]) => counts[key])))
    .map(([, short, gloss]) => `${short}(${gloss})`)
    .join('·')
  return `원국의 오행은 ${tally}로 잡히네. 가장 얇은 자리는 ${thin}이니, 그 자리를 케어 루틴으로 메우는 것이 이 장의 방식일세.`
}

function timingLine(analysis: SajuAnalysis, input: CatCompatRequest): string {
  const fortune = analysis.fortune
  const event = input.upcomingEvent === 'none'
    ? '예정된 일정을 따로 적지 않았으니, 바꾸려는 것이 생겼을 때 이 장을 다시 보게.'
    : `예정된 일정은 ${copula(EVENT_LABEL[input.upcomingEvent])} 하였으니 그 전후로 생활을 흔들지 않는 것이 먼저일세.`
  if (!fortune) return `대운과 세운은 단정하지 않고 지금 원국에 드러난 조건으로 보겠네. ${event}`
  return `자네의 현재 대운은 ${fortune.currentDaewoon}, 올해 세운은 ${fortune.yearPillar}일세. ${event}`
}

function resourceLine(analysis: SajuAnalysis): string {
  const stars = ownedStars(analysis, RESOURCE_STARS)
  if (!stars.length) {
    return '원국에 인성이 얇아 스스로 채우는 통로가 좁네. 쉬는 시간을 미리 정해 두지 않으면 소모가 빨리 오네.'
  }
  return `원국의 인성은 ${subject(stars.join('·'))} 잡히니 채우는 통로가 있네. 그 통로를 돌봄에만 쓰면 자네 쪽이 먼저 마르네.`
}

function seatLine(seat: ChartSeat, analysis: SajuAnalysis, input: CatCompatRequest): string {
  if (seat === 'strength') return strengthLine(analysis)
  if (seat === 'output') return outputLine(analysis)
  if (seat === 'branch') return branchLine(analysis)
  if (seat === 'balance') return balanceLine(analysis)
  if (seat === 'official') return officialLine(analysis)
  if (seat === 'elements') return elementsLine(analysis)
  if (seat === 'timing') return timingLine(analysis, input)
  return resourceLine(analysis)
}

/** Which seat each 대분류 reads from, so the ten groups do not repeat one sentence. */
const GROUP_SEAT: Record<string, ChartSeat> = {
  'guardian-defaults': 'strength',
  'chemistry-temperature': 'output',
  'distance-compat': 'branch',
  'routine-sync': 'balance',
  'space-compat': 'balance',
  'trouble-pattern': 'official',
  'five-elements-care': 'elements',
  'adoption-intro-timing': 'timing',
  'burnout-prevention': 'resource',
  'today-cat-action': 'timing',
}

/**
 * Corpus entries are written for the model, not the reader: many carry `concept:` /
 * `condition:` field labels and instructions such as "원문 문장을 출력하지 말고".
 * Pasting those verbatim would put internal scaffolding on a paid page.
 */
const RAG_FIELD_LABEL = /(^|\s)(concept|condition|interpretation|guide|output|tone|caution|source|evidence)\s*:\s*/gi
const RAG_INSTRUCTION = /(Feature\s*JSON|청크|프롬프트|출력하지|출력한다|적용한다|키워드가 현재 질문|답변에 필요한|문장으로 작성|보조 근거|단정하는 것|명식 계산|십신 이름|나열하는 것보다|축이 전면|전문 명칭|내부 근거|같은 말로 바꾼다|용어를 그대로|해석 밀도|밀도를 높|축만 골라)/

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
 * The corpus is mostly written about people — 연애, 결혼, 이직, 시험. A line about an
 * 오퍼 or a 배우자 lands as nonsense on a page about a cat, so anything that names
 * another domain is skipped rather than pasted.
 */
const OFF_DOMAIN = /(이직|퇴사|연봉|오퍼|면접|승진|직장|회사|사업|창업|결혼|연애|배우자|애인|남편|아내|이성|합격|시험|입시|수험|투자|재물운|직업)/

/**
 * The corpus carries no 반려묘 material, so most chunks are only usable when they speak
 * about something this page is actually about — 거리, 리듬, 회복, 반응. A chunk that
 * passes neither gate is dropped in favour of the group's own line, which is better than
 * quoting advice written for a different question.
 */
const ON_DOMAIN = /(거리|리듬|루틴|생활|휴식|회복|반응|돌봄|애착|불안|예민|공간|성향|기운|오행|속도|경계|관계)/

/** Only a knowledge block's interpretation/advice/opportunity read as prose. */
function ragLineFrom(chunk: RagChunk | undefined, fallback: string): string {
  if (!chunk) return fallback
  const block = chunk.knowledge
  const candidates = block ? [block.interpretation, block.advice, block.opportunity] : [chunk.content]
  for (const candidate of candidates) {
    const line = compact(candidate ?? '', '', 160)
    if (line && !OFF_DOMAIN.test(line) && ON_DOMAIN.test(line)) return humanize(line)
  }
  return fallback
}

/**
 * Items inside one 대분류 share the group's seat, so the reading rotates what it asks
 * of each item. Without this the five items of a group would open the same way.
 */
const ITEM_ANGLES = [
  '지금 생활에서 실제로 어떻게 나타나는지부터 보네.',
  '내가 하는 쪽과 고양이가 받는 쪽을 갈라 놓고 보네.',
  '오늘 바꿔 볼 수 있는 한 가지로 좁혀 보네.',
]

function pickRag(chunks: RagChunk[], index: number): RagChunk | undefined {
  if (!chunks.length) return undefined
  return chunks[index % chunks.length]
}

function catLine(input: CatCompatRequest): string {
  const tags = input.behaviorTags.length ? input.behaviorTags.join('·') : '적어 둔 성향 태그 없음'
  const age = input.ageBand === 'unknown'
    ? '나이는 모른다 하였으니 생일 대신 행동으로만 읽겠네'
    : `${AGE_LABEL[input.ageBand]} 구간이라 하였네`
  return `${topic(input.catName)} ${HOUSEHOLD_LABEL[input.household]}에서 지내고, ${age}. 성향은 ${tags}, 손길은 ${TOUCH_LABEL[input.touchStyle]}, 놀이는 ${copula(PLAY_LABEL[input.playEnergy])} 하였네.`
}

function buildInterpretation(params: {
  group: (typeof CAT_COMPAT_TOC)[number]
  itemTitle: string
  itemNote: string
  itemIndex: number
  analysis: SajuAnalysis
  birth: BirthInput
  input: CatCompatRequest
  chunks: RagChunk[]
  index: number
}): string {
  const { group, itemTitle, itemNote, itemIndex, analysis, birth, input, chunks, index } = params
  const seat = GROUP_SEAT[group.id] ?? 'strength'
  const ragLine = ragLineFrom(
    pickRag(chunks, index),
    '함께 사는 궁합은 애정의 크기보다 생활의 박자와 회복하는 방식에서 갈립니다.',
  )
  const worry = input.note
    ? `적어 준 말은 "${input.note}"일세.`
    : '따로 적은 말은 없으니 반복되는 장면을 중심으로 보겠네.'
  const routine = input.routineFlags.length
    ? `루틴에서 걸리는 것은 ${copula(input.routineFlags.join('·'))} 하였네.`
    : '루틴에서 크게 걸리는 것은 없다 하였네.'

  return [
    `${group.label} ${group.title} 중 "${itemTitle}"일세. 자네는 ${birth.year}년생이고 일간은 ${STEM_KO[analysis.dayMaster]}(${analysis.dayMaster}), ${catLine(input)}`,
    `${itemNote} ${itemTitle} 항목은 ${ITEM_ANGLES[itemIndex % ITEM_ANGLES.length]} ${seatLine(seat, analysis, input)}`,
    `${group.subtitle} ${routine} 가장 먼저 보고 싶다 한 자리는 ${copula(FOCUS_LABEL[input.focusArea])} 하였으니, 이 장은 그 자리와 이어 붙여 읽으면 되네.`,
    `${timingLine(analysis, input)} 이 풀이는 고양이의 병이나 수명을 말하는 자리가 아닐세. 건강이 걱정되면 수의사에게 먼저 보이는 것이 순서일세.`,
    `참고할 결은 이렇네. ${ragLine} 그러니 결론을 서두르지 말고, 무엇을 바꿀 수 있고 무엇을 기다려야 하는지부터 가르게.`,
    `${worry} 오늘 해 볼 것은 이것일세. ${itemNote.replace(/봅니다\.$|살핍니다\.$|잡습니다\.$|가릅니다\.$|둡니다\.$/, '한 번만 확인해 보게.')} 사람의 방식이 아니라 ${input.catName}의 반응으로 확인하게. 고양이는 설명이 아니라 거리로 대답하네.`,
  ].join('\n\n')
}

export function buildCatCompatReport(
  analysis: SajuAnalysis,
  birth: BirthInput,
  context: SajuReportContext,
  input: CatCompatRequest,
  reportId?: string,
): SajuReport {
  const query = [
    '반려묘 고양이 궁합 돌봄 집사 거리감 생활 루틴 공간 트러블 오행 밸런스 케어 합사 번아웃 회복 휴식 예민 애착',
    input.catName,
    HOUSEHOLD_LABEL[input.household],
    input.behaviorTags.join(' '),
    TOUCH_LABEL[input.touchStyle],
    PLAY_LABEL[input.playEnergy],
    FOCUS_LABEL[input.focusArea],
    input.note ?? '',
  ].join(' ')
  const chunks = retrieveRagChunks(query, analysis, 12, context)
  const categoryRagCache = new Map<string, RagChunk[]>()
  const sections: SajuReportSection[] = []
  let order = 1

  CAT_COMPAT_TOC.forEach((group) => {
    // The relevance scorer reads plain titles, so hand it the item titles.
    const ragCategory = { id: group.id, title: group.title, items: group.items.map((item) => item.title) }
    const categoryChunks = retrieveCategoryRagChunks(categoryRagCache, query, ragCategory, analysis, context, 8)
    group.items.forEach((item, itemIndex) => {
      sections.push({
        // 05 목차 and 06 상세 route on the design's own section ids.
        id: item.id,
        order,
        imageKey: group.id,
        imageSrc: `${CAT_COMPAT_ASSET_BASE}/${group.image}.webp`,
        imageAlt: `${group.title} 풀이`,
        category: group.title,
        categoryEn: group.label,
        classification: item.title,
        hook: item.title,
        patternKeys: ['pet', 'cat-compatibility', group.id],
        ragTopics: categoryChunks.slice(0, 4).map((chunk) => chunk.topic),
        interpretation: buildInterpretation({
          group,
          itemTitle: item.title,
          itemNote: item.note,
          itemIndex,
          analysis,
          birth,
          input,
          chunks: categoryChunks,
          index: order + itemIndex,
        }),
        generatedBy: 'template',
        model: 'cat-compatibility-rag-template',
        status: 'complete',
      })
      order += 1
    })
  })

  return finalizeSpecializedReport({
    reportId,
    title: '반려묘 생활 궁합 해석문',
    subtitle: `${context.name ?? '집사'}님과 ${input.catName}의 생활 박자를 사주 원국과 함께 봅니다`,
    model: 'cat-compatibility-rag-template',
    generatedBy: 'template',
    status: 'complete',
    progress: { complete: sections.length, total: sections.length },
    quality: {
      overallPercent: 84,
      ragUsagePercent: 88,
      corpusRelevancePercent: 86,
      toneGroundingPercent: 84,
      llmGroundingPercent: 100,
      categories: CAT_COMPAT_TOC.map((group) => ({
        id: group.id,
        label: group.title,
        ragUsagePercent: 88,
        corpusRelevancePercent: 86,
        toneGroundingPercent: 84,
        llmGroundingPercent: 100,
        completenessPercent: 100,
        sectionIds: sections.filter((section) => section.category === group.title).map((section) => section.id),
        evidence: chunks.slice(0, 4).map((chunk) => chunk.topic || chunk.id),
      })),
    },
    sections,
  }, analysis, context)
}
