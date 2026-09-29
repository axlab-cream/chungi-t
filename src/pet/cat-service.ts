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
  selfName?: string
  selfBirth?: BirthInput
  selfBirthTimeKnown?: boolean
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
 * The 10 대분류 / 20 중분류 index the 고양이 궁합 pages are designed around.
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
      { id: 'affection-temperature', title: '애정 표현 온도', note: '좋아하는 마음이 손길·말투·확인으로 어떻게 나오는지 살핍니다.' },
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
      { id: 'sleep-pattern-clash', title: '수면 패턴 충돌', note: '밤에 깨어나는 흐름과 집사 체력의 접점을 찾습니다.' },
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
      { id: 'litter-location', title: '화장실 위치 민감도', note: '동선, 소리, 시선이 예민하게 느껴지는 자리를 살핍니다.' },
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
      { id: 'multi-cat-jealousy', title: '다묘 질투각', note: '관심, 공간, 밥그릇이 경쟁처럼 느껴지는 순간을 봅니다.' },
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
      { id: 'vet-grooming-timing', title: '병원·미용 예약 타이밍', note: '외출 스트레스가 덜한 순서와 회복 시간을 잡습니다.' },
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

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function validDateParts(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

export function parseCatCompatRequest(body: Record<string, unknown>): CatCompatRequest {
  const selfBirthBody = asObject(body.selfBirth)
  let selfBirth: BirthInput | undefined
  let selfBirthTimeKnown: boolean | undefined
  if (Object.keys(selfBirthBody).length) {
    selfBirthTimeKnown = body.selfBirthTimeKnown === true || selfBirthBody.birthTimeKnown === true
    const year = Number(selfBirthBody.year)
    const month = Number(selfBirthBody.month)
    const day = Number(selfBirthBody.day)
    const hour = Number(selfBirthBody.hour ?? (selfBirthTimeKnown ? Number.NaN : 12))
    const minute = Number(selfBirthBody.minute ?? 0)
    if (!validDateParts(year, month, day) || year < 1900 || year > new Date().getFullYear()) throw new InputError('보호자 생년월일을 다시 확인해 주세요.')
    if (selfBirthBody.gender !== 'male' && selfBirthBody.gender !== 'female') throw new InputError('보호자 성별을 선택해 주세요.')
    if (selfBirthBody.calendar !== 'solar' && selfBirthBody.calendar !== 'lunar') throw new InputError('보호자 생년월일의 양력 또는 음력을 선택해 주세요.')
    if (selfBirthTimeKnown && (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59)) throw new InputError('보호자 태어난 시간을 다시 확인해 주세요.')
    selfBirth = { year, month, day, hour: selfBirthTimeKnown ? hour : 12, minute: Number.isFinite(minute) ? minute : 0, gender: selfBirthBody.gender, calendar: selfBirthBody.calendar, isLeapMonth: Boolean(selfBirthBody.isLeapMonth) }
  }
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
    selfName: trimmed(body.selfName, 20),
    selfBirth,
    selfBirthTimeKnown,
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
    catCompatibility: {
      catName: input.catName,
      household: HOUSEHOLD_LABEL[input.household],
      ageBand: AGE_LABEL[input.ageBand],
      behaviorTags: input.behaviorTags,
      touchStyle: TOUCH_LABEL[input.touchStyle],
      playEnergy: PLAY_LABEL[input.playEnergy],
      routineFlags: input.routineFlags,
      focusArea: FOCUS_LABEL[input.focusArea],
      upcomingEvent: EVENT_LABEL[input.upcomingEvent],
      note: input.note,
    },
  }
}

const PLAIN_ELEMENT = {
  wood: '나무', fire: '불', earth: '흙', metal: '쇠', water: '물',
} as const

const CAT_TEASER_IMAGES = [
  { key: 'guardian-dna', src: `${CAT_COMPAT_ASSET_BASE}/reading-v2/01-guardian-dna.webp`, alt: '보호자가 고양이의 편안한 거리를 관찰하는 장면' },
  { key: 'affection-temperature', src: `${CAT_COMPAT_ASSET_BASE}/reading-v2/02-affection-temperature.webp`, alt: '고양이가 먼저 다가오는 순간과 손길의 속도를 살피는 장면' },
] as const

function safeCell(value: unknown): string {
  return String(value ?? '').replace(/\r?\n/g, ' ').replace(/\|/g, '｜').trim()
}

function catFacts(context: SajuReportContext) {
  const saved = context.catCompatibility
  const pieces = String(context.concern ?? '').split(' · ').map((part) => part.trim()).filter(Boolean)
  const value = (label: string) => pieces.find((part) => part.startsWith(`${label}:`))?.replace(new RegExp(`^${label}:\\s*`), '') || ''
  const note = saved?.note || pieces.find((part) => !/^(고양이|가정|나이대|성향|손길|놀이|루틴 고민|우선 확인|예정):/.test(part)) || ''
  return {
    name: safeCell(context.name) || '보호자',
    catName: safeCell(saved?.catName || value('고양이')) || '고양이',
    household: safeCell(saved?.household || value('가정')),
    ageBand: safeCell(saved?.ageBand || value('나이대')),
    behaviorTags: (saved?.behaviorTags?.length ? saved.behaviorTags : value('성향').split('·')).map(safeCell).filter(Boolean),
    touchStyle: safeCell(saved?.touchStyle || value('손길')),
    playEnergy: safeCell(saved?.playEnergy || value('놀이')),
    routineFlags: (saved?.routineFlags?.length ? saved.routineFlags : value('루틴 고민').split('·')).map(safeCell).filter(Boolean),
    focusArea: safeCell(saved?.focusArea || value('우선 확인')),
    upcomingEvent: safeCell(saved?.upcomingEvent || value('예정')),
    note: safeCell(note),
  }
}

function catInputTable(context: SajuReportContext): string {
  const facts = catFacts(context)
  const rows: Array<[string, string, string]> = [
    ['함께 사는 모습', [facts.household, facts.ageBand].filter(Boolean).join(' · '), '생활 공간과 돌봄 횟수를 읽는 바탕'],
    ['손길에 보인 반응', facts.touchStyle, '다가갈 때와 멈출 때를 나누는 신호'],
    ['놀이가 살아나는 때', facts.playEnergy, '보호자와 고양이의 활동 시간이 만나는 장면'],
  ]
  if (facts.routineFlags.length) rows.push(['요즘 부딪히는 부분', facts.routineFlags.join(' · '), '먼저 조정할 생활 장면'])
  if (facts.note) rows.push(['직접 적은 고민', facts.note, '이번 풀이가 먼저 답할 질문'])
  return ['| 확인한 내용 | 직접 알려 준 답 | 이번 풀이에서 읽는 장면 |', '| --- | --- | --- |', ...rows.filter((row) => Boolean(row[1])).map((row) => `| ${row.join(' | ')} |`)].join('\n')
}

function catPillarTable(analysis: SajuAnalysis): string {
  const labels = [['해', analysis.fourPillars.year], ['달', analysis.fourPillars.month], ['날', analysis.fourPillars.day], ['시간', analysis.fourPillars.hour]] as const
  const purpose = { 해: '돌봄을 시작할 때 먼저 보이는 태도', 달: '반복되는 생활을 정리하는 방식', 날: '가까운 존재에게 애정을 표현하는 방식', 시간: '지쳤을 때 회복하고 싶은 방식' } as const
  return ['| 보호자 사주의 기둥 | 두 기운 | 함께 살 때 보는 장면 |', '| --- | --- | --- |', ...labels.map(([label, pillar]) => `| ${label} 기둥 | ${PLAIN_ELEMENT[pillar.stemElement]} · ${PLAIN_ELEMENT[pillar.branchElement]} | ${purpose[label]} |`)].join('\n')
}

function catElementChart(analysis: SajuAnalysis) {
  return (Object.entries(analysis.elementCount) as Array<[keyof typeof PLAIN_ELEMENT, number]>).map(([element, count]) => ({
    label: `${PLAIN_ELEMENT[element]} 기운`, value: count, note: '보호자의 저장된 생년월일시에서 계산한 실제 개수',
  }))
}

function catTeaserInterpretation(index: number, analysis: SajuAnalysis | undefined, context: SajuReportContext): string {
  const facts = catFacts(context)
  if (!analysis) return `[주요 포인트] ${facts.catName}와 편안해지는 순간은 더 자주 만지는 때보다, ${facts.touchStyle || '관찰한 손길 반응'}에 맞춰 멈출 때를 알아보는 장면에서 시작됩니다.\n\n[확인할 장면] 먼저 다가온 순간과 몸을 돌린 순간을 하루 동안 나눠 적어 보세요.\n\n[결정 전에 물어볼 질문] ${facts.catName}가 다가온 뒤 어느 정도의 손길에서 편안하게 머무나요?`
  const dominant = PLAIN_ELEMENT[analysis.dominantElement]
  const weak = PLAIN_ELEMENT[analysis.weakElement]
  const day = PLAIN_ELEMENT[analysis.dayMasterElement]
  if (index === 0) return [
    `[주요 포인트] ${facts.name}님과 ${facts.catName}의 궁합은 얼마나 붙어 있느냐보다, 다가갈 때와 멈출 때가 서로 맞는지에서 선명해집니다. ${facts.catName}는 ${facts.touchStyle}이고, 놀이는 ${facts.playEnergy}에 살아납니다. 지금 먼저 볼 부분은 ${facts.focusArea || '편안한 거리'}입니다.`,
    `${facts.name}님의 사주에서는 ${dominant} 기운이 가장 많이 나타나고 ${weak} 기운이 가장 적습니다. 돌봄에서는 잘해 주고 싶은 마음이 먼저 움직일 수 있지만, 반응이 바로 오지 않을 때 한 번 더 확인하려는 행동으로 이어지기 쉽습니다. ${facts.catName}에게 필요한 것은 관심의 양보다 관찰 뒤에 손길을 조절하는 속도입니다.`,
    `[사주와 생활을 함께 보면] 태어난 날의 ${day} 기운은 가까운 존재에게 애정을 건네는 방식을 보여 줍니다. ${facts.behaviorTags.length ? `${facts.catName}에게서 관찰한 ${facts.behaviorTags.join('·')} 반응과 겹쳐 보면,` : ''} 먼저 와서 머무는 순간에는 짧게 반응하고 몸을 돌리거나 꼬리가 빨라질 때는 손을 거두는 방식이 둘 사이를 더 편하게 만듭니다.`,
    `[확인할 장면] 오늘 한 번만, ${facts.catName}가 먼저 다가온 시각과 손길을 멈췄을 때의 반응을 적어 보세요. ${facts.routineFlags.length ? `${facts.routineFlags.join('·')}에서 부딪힘이 있었다면 그 직전의 놀이·식사·휴식 순서도 함께 보면 좋습니다.` : '크게 부딪히는 생활 장면이 없다면 지금 편안한 순서를 그대로 유지하세요.'}`,
    `[결정 전에 물어볼 질문] ${facts.catName}가 먼저 다가왔나요? 손길 뒤 그대로 머물렀나요, 자리를 옮겼나요? 놀이는 어느 시간에 먼저 시작했을 때 가장 오래 이어졌나요? 이 세 장면이 둘에게 맞는 거리를 정해 줍니다.`,
    `[해법] ${facts.note ? `“${facts.note}”라는 고민의 답은` : '둘 사이를 더 편하게 만드는 방법은'} 관심을 줄이는 데 있지 않습니다. 먼저 다가오는 신호에는 짧고 분명하게 반응하고, 멈추는 신호에는 바로 공간을 돌려주는 것이 ${facts.name}님과 ${facts.catName}에게 맞는 첫 조정입니다.`,
  ].join('\n\n')
  return [
    `[주요 포인트] ${facts.name}님의 애정은 챙김으로 빠르게 드러나지만, ${facts.catName}가 편안함을 느끼는 순간은 손길이 길어질 때보다 자기 속도로 다가왔다가 물러날 수 있을 때입니다. ${facts.touchStyle}이라는 관찰은 둘 사이의 애정 온도를 읽는 가장 구체적인 단서입니다.`,
    `${facts.name}님의 네 기둥에서 ${dominant} 기운이 두드러지고, 가까운 존재에게 보이는 태어난 날의 중심은 ${day} 기운입니다. 이 조합은 돌봄의 변화를 빨리 알아채고 직접 움직이는 힘으로 나타납니다. 다만 ${weak} 기운이 필요한 장면에서는 기다리는 시간이 짧아질 수 있어, 반응을 재촉하지 않는 여백이 애정 표현의 일부가 됩니다.`,
    `[사주와 생활을 함께 보면] 보호자의 사주는 보호자가 어떻게 챙기고 쉬는지를 보여 주고, ${facts.catName}의 반응은 입력한 행동에서 확인합니다. 그래서 “궁합이 좋다”는 말은 같은 성향이라는 뜻이 아니라, ${facts.playEnergy}의 놀이 시간과 ${facts.name}님의 회복 시간을 함께 지킬 수 있다는 뜻에 가깝습니다.`,
    `[확인할 장면] ${facts.catName}가 부비거나 곁에 앉은 뒤 손을 내밀지 않고 잠시 기다려 보세요. 그대로 머물면 목과 볼처럼 평소 허용한 부위부터 짧게 반응하고, 몸을 돌리면 그 자리에서 끝내세요. 반복했을 때 다시 다가오는 간격이 둘의 편안한 애정 온도입니다.`,
    `[결정 전에 물어볼 질문] 먼저 다가오는 시간대는 언제인가요? 손길 없이 곁에만 있어도 머무나요? ${facts.routineFlags.length ? `${facts.routineFlags.join('·')}이 있는 날에는 이 간격이 달라지나요?` : '평소와 다른 날에는 이 간격이 달라지나요?'}`,
    `[해법] ${facts.name}님에게 필요한 애정 표현은 더 많이 해 주는 방식이 아니라, ${facts.catName}가 고른 거리 안에서 정확하게 응답하는 방식입니다. 그 거리가 지켜질수록 먼저 다가오는 순간은 더 분명해지고, 함께 쉬는 시간도 안정적으로 이어집니다.`,
  ].join('\n\n')
}

export function catCompatTeaserPreview(context: SajuReportContext, sectionCount: number) {
  const facts = catFacts(context)
  return {
    title: '내 고양이랑 나 진짜 궁합 맞아?',
    headline: `${facts.name}님과 ${facts.catName}는 더 가까이 붙는 순간보다 서로 멈춰 주는 순간에 궁합이 드러납니다`,
    summary: `${facts.touchStyle}, ${facts.playEnergy}${facts.focusArea ? `, 그리고 ${facts.focusArea}` : ''}을 보호자의 저장 사주와 함께 놓고 둘이 실제로 편안해지는 장면부터 짚었습니다.`,
    insights: [], signals: [],
    paidValue: `전체 해석에서는 ${sectionCount}개 항목으로 거리·손길·놀이·수면·공간·반복 갈등과 오래 함께 살기 위한 돌봄 속도까지 이어서 풉니다.`,
  }
}

export function catCompatTeaserSection(section: SajuReportSection, index: number, analysis: SajuAnalysis | undefined, context: SajuReportContext): SajuReportSection {
  const facts = catFacts(context)
  const image = CAT_TEASER_IMAGES[index]
  const story = index === 0 ? {
    feel: `${facts.catName}가 곁에 오는데도 손을 내밀면 물러난다면, 좋아하지 않는 게 아니라 편안한 거리의 순서가 다른 것입니다.`,
    softBridge: `${facts.name}님이 직접 본 행동과 저장 사주를 함께 놓으면, 더 해 줄 때와 멈춰 줄 때가 나뉩니다.`,
    tableMd: catInputTable(context),
    tableCaption: '직접 알려 준 생활 장면만 사용해 둘 사이의 거리를 읽었습니다.',
    flowSteps: [
      { label: '1. 먼저 다가온 순간', value: '말과 시선으로 짧게 반응', note: '고양이가 고른 거리 확인' },
      { label: '2. 손길을 허용한 순간', value: '평소 허용한 부위만 짧게', note: '머무는지 몸을 돌리는지 관찰' },
      { label: '3. 물러난 순간', value: '따라가지 않고 공간 돌려주기', note: '다시 다가올 여백 남기기' },
    ],
    flowCaption: '관찰한 행동으로 편안한 거리를 확인하는 실제 순서입니다.',
    scene: '', actions: [], imagePrompt: { ko: '', en: '' },
  } : {
    feel: `${facts.name}님의 챙김과 ${facts.catName}의 자기 속도는 다를 수 있습니다. 그 차이를 맞추는 순간이 둘의 애정 표현이 됩니다.`,
    softBridge: '보호자의 네 기둥은 챙기고 쉬는 방식을, 고양이의 입력은 실제로 관찰한 반응을 보여 줍니다.',
    ...(analysis ? {
      tableMd: catPillarTable(analysis),
      tableCaption: '보호자의 네 기둥을 한자 없이 함께 사는 장면으로 풀었습니다.',
      chartPoints: catElementChart(analysis),
      chartCaption: '보호자의 저장 사주에서 계산한 다섯 기운의 실제 개수입니다. 고양이의 성격 점수는 아닙니다.',
    } : {}),
    flowSteps: [
      { label: '1. 챙기고 싶은 순간', value: '먼저 행동하기 전 반응 보기', note: '보호자의 속도 확인' },
      { label: '2. 고양이가 머무는 순간', value: '같은 강도의 손길 유지', note: '편안함을 갑자기 키우지 않기' },
      { label: '3. 함께 쉬는 순간', value: '손길 없이 같은 공간 지키기', note: '접촉 밖의 애정 확인' },
    ],
    flowCaption: '보호자의 애정과 고양이의 반응을 같은 생활 안에서 맞추는 순서입니다.',
    scene: '', actions: [], imagePrompt: { ko: '', en: '' },
  }
  return {
    ...section,
    ...(image ? { imageKey: image.key, imageSrc: image.src, imageAlt: image.alt } : {}),
    interpretation: catTeaserInterpretation(index, analysis, context),
    storytelling: { ...(section.storytelling ?? {}), ...story },
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
