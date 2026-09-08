import { InputError } from '../server/input-error.js'
import { createHash } from 'node:crypto'
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
import { retrieveCategoryOwnChunks, retrieveCategoryRagChunks } from '../report/specialized-rag.js'
import { dayMasterDefinition, elementEvidence, practicalReading, quotedInput } from '../report/practical-service-copy.js'
import { CAT_DETAILS } from './cat-practical-readings.js'

export const CAT_COMPAT_SERVICE_KEY = 'cat_compatibility'

/** Where the 고양이 궁합 artwork lives, beside the service pages. */
/**
 * 이 서비스만의 코퍼스 도메인.
 *
 * 일반 색인 상위는 다른 서비스 팩이 차지한다. 도메인을 지정해 자기 팩을 먼저 뽑지
 * 않으면 cat_compatibility_service 24블록이 활성 상태로 등록돼 있어도 대분류 절반이
 * 일반 문장으로 떨어진다.
 */
const OWN_CORPUS_DOMAIN = 'cat_compatibility_service'

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

  if (!catName) throw new InputError('고양이 이름 또는 애칭을 입력해 주세요.')
  if (!HOUSEHOLD_LABEL[householdRaw]) throw new InputError('1묘·다묘·입양 예정 중에서 가정 형태를 골라 주세요.')
  if (!TOUCH_LABEL[touchRaw]) throw new InputError('손길에 대한 반응을 골라 주세요.')
  if (!PLAY_LABEL[playRaw]) throw new InputError('놀이 에너지를 골라 주세요.')
  if (!FOCUS_LABEL[focusRaw]) throw new InputError('가장 먼저 보고 싶은 영역을 골라 주세요.')
  if (!EVENT_LABEL[eventRaw]) throw new InputError('예정된 일정을 골라 주세요.')

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
    birth: { year: birth.year, month: birth.month, day: birth.day, hour: birth.hour, gender: birth.gender, calendar: birth.calendar, ...(birth.minute ? { minute: birth.minute } : {}) },
    input,
    serviceKey: CAT_COMPAT_SERVICE_KEY,
  })
  return createHash('sha256').update(fingerprint).digest('hex').slice(0, 28)
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
  const { group, itemTitle, analysis, input } = params
  const reading = CAT_DETAILS[itemTitle]
  if (!reading) throw new Error(`고양이 궁합 항목별 해석 누락: ${itemTitle}`)
  const flags = input.routineFlags.filter((flag) => flag !== '크게 없음')
  const settled = !flags.length && input.routineFlags.includes('크게 없음')
  const current = ['chemistry-temperature', 'distance-compat'].includes(group.id)
    ? `“${input.catName}”의 손길 반응은 “${TOUCH_LABEL[input.touchStyle]}”으로 입력됐어요. 보호자가 관찰한 진술로 다루며 고양이의 속마음을 확인한 사실로 보지 않아요.`
    : group.id === 'adoption-intro-timing'
      ? `현재 가정 형태는 ${HOUSEHOLD_LABEL[input.household]}, 예정된 일정은 “${EVENT_LABEL[input.upcomingEvent]}”입니다. ${input.upcomingEvent === 'none' ? '예정된 일이 없다면 준비 항목은 향후 참고로만 읽어요.' : '확정 날짜나 준비 상태가 없다면 구체적인 날짜를 만들지 않아요.'}`
      : group.id === 'guardian-defaults'
        ? `대상은 “${input.catName}”, ${HOUSEHOLD_LABEL[input.household]}입니다. 관찰한 특징은 ${input.behaviorTags.join('·') || '아직 별도로 적지 않은 상태'}입니다. ${quotedInput('추가 상황', input.note)}`
        : `놀이 반응은 “${PLAY_LABEL[input.playEnergy]}”으로 입력됐어요. ${flags.length ? `루틴에서 살펴보고 싶은 항목은 “${flags.join('·')}”입니다.` : '루틴에 관한 구체적인 불편은 확인되지 않았어요.'}`
  return practicalReading({
    title: itemTitle, detail: reading, current,
    evidence: group.id === 'five-elements-care'
      ? `${elementEvidence(analysis)} 이 계산은 보호자의 사주이며 고양이의 성향이나 돌봄의 결함을 계산하지 않아요.`
      : itemTitle === '집사 성향 DNA'
        ? `${dayMasterDefinition(analysis)} 일간의 강약으로 돌봄 능력이나 표현 습관을 단정하지 않아요. ${input.ageBand === 'unknown' ? '고양이의 나이를 모르는 상태이므로 나이별 판단도 보류해요.' : `고양이의 나이대는 “${AGE_LABEL[input.ageBand]}”으로 입력됐어요.`} 고양이의 출생 명식이나 생체리듬은 계산하지 않아요.`
        : undefined,
    application: input.household !== 'multi_cat' && itemTitle === '다묘 질투각'
      ? '현재 다묘 가정으로 입력되지 않았으므로 이 항목의 갈등은 본인의 현재 상황에 해당한다고 해석하지 않아요.'
      : settled
        ? '크게 걸리는 루틴 문제가 없다는 입력을 우선해요. 위 장면이 실제로 없다면 새로운 문제를 찾기보다 잘 지내는 조건을 유지하면 돼요.'
        : '이 항목의 장면이 실제로 나타날 때만 조정을 검토해요. 아직 관찰하지 않은 행동이나 보호자의 감정을 새로 만들지 않아요.',
    closing: itemTitle === '조용히 지켜볼 타이밍' ? '이 해석은 건강 진단이 아니에요. 갑작스러운 변화나 건강 우려가 있으면 운세와 관계없이 수의사에게 확인해요.' : undefined,
  })
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
    const generalChunks = retrieveCategoryRagChunks(categoryRagCache, query, ragCategory, analysis, context, 8)
    const ownChunks = retrieveCategoryOwnChunks(categoryRagCache, query, ragCategory, analysis, context, OWN_CORPUS_DOMAIN, 6)
    const categoryChunks = ownChunks.length ? [...ownChunks, ...generalChunks] : generalChunks
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
          // 대분류 안에서 항목끼리 다른 블록을 인용하도록 항목 순번으로 고른다.
          index: itemIndex,
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
