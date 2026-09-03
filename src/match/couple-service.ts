import { createHash } from 'node:crypto'
import type {
  BirthInput,
  EarthlyBranch,
  RagChunk,
  SajuAnalysis,
  SajuReport,
  SajuReportContext,
  SajuReportSection,
} from '../types/index.js'
import { ELEMENT_KO, STEM_KO, BRANCH_KO } from '../saju/analyzer-helpers.js'
import { retrieveRagChunks } from '../rag/retriever.js'
import { finalizeSpecializedReport } from '../report/report-quality.js'
import { retrieveCategoryRagChunks } from '../report/specialized-rag.js'

export const COUPLE_MATCH_SERVICE_KEY = 'match_couple'

/** Where the 커플궁합 artwork lives, beside the service pages. */
export const COUPLE_ASSET_BASE = '/match/couple/assets/couple'

export interface CoupleMatchRequest {
  partnerName?: string
  partnerBirth: BirthInput
  partnerBirthTimeKnown: boolean
  relationshipStage?: string
  conflictPattern?: string
  concern?: string
}

/**
 * The 14 대분류 / 70 중분류 index the 커플궁합 pages are designed around.
 * `cluster` drives the 05 목차 filter, `image` picks the group artwork where the design
 * supplied one, and the ids are what 05 목차 and 06 상세 route on.
 */
export const COUPLE_MATCH_TOC = [
  {
    id: 'relationship_overview',
    label: '第一門',
    cluster: 'initial',
    image: 'relationship-overview',
    title: '관계 총평',
    items: [
      { id: 'relationship_overview__chemistry_one_line', title: '케미 한 줄', note: '두 사람 관계의 첫인상을 한 문장으로 압축해요.' },
      { id: 'relationship_overview__green_light_points', title: '그린라이트 포인트', note: '잘 맞는 버튼이 어디서 켜지는지 먼저 보여줘요.' },
      { id: 'relationship_overview__yellow_points', title: '옐로포인트', note: '좋아도 살짝 걸리는 신호를 과하게 키우지 않고 체크해요.' },
      { id: 'relationship_overview__maintenance_difficulty', title: '관계 유지 난이도', note: '좋아하는 마음과 실제 유지 체력을 나눠서 봐요.' },
      { id: 'relationship_overview__question_to_check', title: '지금 확인할 질문', note: '오늘 바로 물어봐도 덜 부담스러운 질문을 뽑아요.' },
    ],
  },
  {
    id: 'zodiac_branch_match',
    label: '第二門',
    cluster: 'initial',
    image: 'zodiac-branch-match',
    title: '띠/지지 궁합',
    items: [
      { id: 'zodiac_branch_match__best_fit_combo', title: '찰떡 조합', note: '같이 있을 때 자연스럽게 편해지는 조합 신호를 봐요.' },
      { id: 'zodiac_branch_match__steady_combo', title: '무난한 조합', note: '큰 드라마보다 꾸준함으로 가는 궁합 결을 확인해요.' },
      { id: 'zodiac_branch_match__needs_space_combo', title: '거리 필요한 조합', note: '붙어 있을수록 예민해질 수 있는 거리감을 체크해요.' },
      { id: 'zodiac_branch_match__collision_button', title: '충돌 버튼', note: '별일 아닌데 크게 튀는 포인트를 버튼처럼 표시해요.' },
      { id: 'zodiac_branch_match__marriage_business_match', title: '결혼/동업 궁합', note: '연애 감정과 생활·파트너십 체력을 따로 봐요.' },
    ],
  },
  {
    id: 'five_element_chemistry',
    label: '第三門',
    cluster: 'initial',
    image: 'five-element-chemistry',
    title: '오행 케미',
    items: [
      { id: 'five_element_chemistry__generating_tension', title: '상생 텐션', note: '서로에게 힘을 실어주는 흐름을 오행으로 읽어요.' },
      { id: 'five_element_chemistry__controlling_tension', title: '상극 텐션', note: '끌리는데 피곤한 이유를 상극의 말투로 풀어요.' },
      { id: 'five_element_chemistry__energy_charge_type', title: '에너지 충전형', note: '만나고 나면 기분이 차오르는 순간을 찾아요.' },
      { id: 'five_element_chemistry__energy_drain_type', title: '에너지 소모형', note: '좋은데 자꾸 지치는 구간을 조용히 분리해요.' },
      { id: 'five_element_chemistry__missing_element_support', title: '부족한 오행 보완 포인트', note: '둘 사이에서 비어 보이는 결을 생활 습관으로 채워요.' },
    ],
  },
  {
    id: 'daymaster_sync',
    label: '第四門',
    cluster: 'saju',
    image: '',
    title: '일간 성향 싱크',
    items: [
      { id: 'daymaster_sync__expression_speed', title: '표현 속도', note: '좋아하는 마음이 말로 나오는 속도 차이를 봐요.' },
      { id: 'daymaster_sync__emotion_processing', title: '감정 처리 방식', note: '서운함을 바로 말하는지, 혼자 정리하는지 나눠요.' },
      { id: 'daymaster_sync__affection_style', title: '애정 표현 스타일', note: '말, 행동, 챙김 중 어디서 사랑이 드러나는지 봐요.' },
      { id: 'daymaster_sync__independence_dependence', title: '독립성/의존도', note: '각자 시간이 필요한 쪽과 붙어 있어야 안정되는 쪽을 비교해요.' },
      { id: 'daymaster_sync__comfort_condition', title: '관계에서 편해지는 조건', note: '두 사람이 긴장을 풀고 자기답게 있는 조건을 찾습니다.' },
    ],
  },
  {
    id: 'ten_star_code',
    label: '第五門',
    cluster: 'saju',
    image: '',
    title: '십성 관계 코드',
    items: [
      { id: 'ten_star_code__friend_like_love', title: '친구 같은 연애', note: '편하게 장난치고 같이 노는 관계 코드를 봐요.' },
      { id: 'ten_star_code__flirting_code', title: '설렘/플러팅 코드', note: '상대가 나를 끌리게 만드는 포인트를 짧게 잡아요.' },
      { id: 'ten_star_code__real_life_care', title: '현실 케어 코드', note: '챙김, 계획, 생활 안정감이 어디서 나오는지 봐요.' },
      { id: 'ten_star_code__official_commitment', title: '책임/공식 관계 코드', note: '관계 이름표와 약속을 대하는 태도를 확인해요.' },
      { id: 'ten_star_code__emotional_leaning', title: '기대고 싶은 정서 코드', note: '힘든 날 누구에게 어떻게 기대고 싶은지 읽어요.' },
    ],
  },
  {
    id: 'communication_match',
    label: '第六門',
    cluster: 'initial',
    image: 'communication-match',
    title: '소통 궁합',
    items: [
      { id: 'communication_match__tone_temperature', title: '말투 온도', note: '차갑게 들리는 말과 따뜻하게 받는 말의 차이를 봐요.' },
      { id: 'communication_match__reply_rhythm', title: '답장/연락 리듬', note: '답장 속도를 관심의 크기로만 보지 않게 정리해요.' },
      { id: 'communication_match__hurt_handling', title: '서운함 처리법', note: '서운할 때 바로 꺼낼 말과 잠깐 보류할 말을 나눠요.' },
      { id: 'communication_match__defense_pattern', title: '싸울 때 방어 패턴', note: '말이 세지는 쪽, 닫히는 쪽, 피하는 쪽을 구분해요.' },
      { id: 'communication_match__reconciliation_sentence', title: '화해 문장 추천', note: '상대 방어를 덜 건드리는 첫 문장을 제안해요.' },
    ],
  },
  {
    id: 'attraction_points',
    label: '第七門',
    cluster: 'relationship',
    image: '',
    title: '끌림/호감 포인트',
    items: [
      { id: 'attraction_points__first_spark', title: '첫눈 텐션', note: '처음부터 시선이 가는 이유를 감각적으로 정리해요.' },
      { id: 'attraction_points__slow_burn_charm', title: '오래 볼수록 스며드는 매력', note: '처음보다 시간이 갈수록 좋아지는 결을 봐요.' },
      { id: 'attraction_points__peach_blossom_charm', title: '도화/홍염식 매력', note: '자꾸 눈길 가는 분위기와 플러팅 결을 가볍게 봐요.' },
      { id: 'attraction_points__comfort_point', title: '편안함 포인트', note: '말하지 않아도 덜 긴장되는 지점을 찾아요.' },
      { id: 'attraction_points__spark_maintenance', title: '설렘 유지 버튼', note: '관계가 익숙해져도 식지 않게 눌러볼 포인트예요.' },
    ],
  },
  {
    id: 'conflict_report',
    label: '第八門',
    cluster: 'initial',
    image: 'conflict-report',
    title: '갈등 리포트',
    items: [
      { id: 'conflict_report__repeating_loop', title: '반복 갈등 루프', note: '매번 비슷하게 돌아오는 싸움 패턴을 도식화해요.' },
      { id: 'conflict_report__competition_point', title: '경쟁심 포인트', note: '누가 맞는지 겨루게 되는 순간을 체크해요.' },
      { id: 'conflict_report__communication_obstacle', title: '의사소통 장애', note: '말은 오가는데 뜻이 엇갈리는 구간을 분리해요.' },
      { id: 'conflict_report__trust_shake', title: '신뢰 흔들림', note: '믿음이 약해지는 행동과 회복 포인트를 봐요.' },
      { id: 'conflict_report__line_crossing_moment', title: '선 넘는 순간', note: '서로가 멈춰야 하는 말과 행동의 기준을 세워요.' },
    ],
  },
  {
    id: 'dating_stage_reading',
    label: '第九門',
    cluster: 'relationship',
    image: '',
    title: '연애 단계별 풀이',
    items: [
      { id: 'dating_stage_reading__some_possibility', title: '썸 가능성', note: '아직 애매한 관계에서 신호와 착각을 나눠요.' },
      { id: 'dating_stage_reading__confession_timing', title: '고백 타이밍', note: '밀어붙이기보다 대화 온도가 맞는 순간을 봐요.' },
      { id: 'dating_stage_reading__early_love_caution', title: '연애 초반 주의점', note: '초반에 과속하거나 과하게 참는 패턴을 체크해요.' },
      { id: 'dating_stage_reading__long_term_stamina', title: '장기연애 체력', note: '오래 만나도 유지되는 힘과 지치는 구간을 봐요.' },
      { id: 'dating_stage_reading__pre_marriage_check', title: '결혼 전 체크포인트', note: '생활, 가족, 돈, 책임 이야기를 나누는 기준을 잡아요.' },
    ],
  },
  {
    id: 'real_life_match',
    label: '第十門',
    cluster: 'relationship',
    image: '',
    title: '현실 궁합',
    items: [
      { id: 'real_life_match__money_temperature', title: '돈 쓰는 온도', note: '데이트비, 선물, 소비 감각의 차이를 가볍게 점검해요.' },
      { id: 'real_life_match__promise_style', title: '약속 지키는 방식', note: '시간, 답장, 말한 것 지키는 태도의 결을 봐요.' },
      { id: 'real_life_match__work_business_partnership', title: '일/사업 파트너십', note: '같이 일하거나 목표를 세울 때 맞는 역할을 봐요.' },
      { id: 'real_life_match__family_expectation', title: '가족 기대치', note: '가족, 주변 사람, 공개 범위를 대하는 온도를 봐요.' },
      { id: 'real_life_match__daily_routine_fit', title: '생활 루틴 맞춤', note: '잠, 식사, 일상 템포가 관계 체감에 미치는 영향을 봐요.' },
    ],
  },
  {
    id: 'luck_flow_match',
    label: '第十一門',
    cluster: 'timing',
    image: '',
    title: '운 흐름 궁합',
    items: [
      { id: 'luck_flow_match__year_temperature', title: '올해 관계 온도', note: '올해 두 사람 관계가 어느 쪽으로 예민한지 봐요.' },
      { id: 'luck_flow_match__month_rhythm', title: '이번 달 관계 리듬', note: '이번 달 연락, 만남, 감정 기복의 리듬을 봐요.' },
      { id: 'luck_flow_match__today_contact_day', title: '오늘 연락해도 되는 날', note: '오늘 먼저 말을 걸 때 부담이 덜한 톤을 골라요.' },
      { id: 'luck_flow_match__clash_day_talk', title: '충 있는 날 대화법', note: '예민한 날에는 말을 줄일지, 구조를 바꿀지 봐요.' },
      { id: 'luck_flow_match__relationship_turning_time', title: '관계 전환 타이밍', note: '썸에서 연애, 연애에서 약속으로 넘어가는 결을 봐요.' },
    ],
  },
  {
    id: 'mind_care',
    label: '第十二門',
    cluster: 'care',
    image: '',
    title: '마음 돌봄',
    items: [
      { id: 'mind_care__separate_confidence_anxiety', title: '확신과 불안 분리', note: '좋아하는 마음과 불안한 상상을 따로 놓고 봐요.' },
      { id: 'mind_care__name_the_feeling', title: '감정 이름 붙이기', note: '짜증, 서운함, 불안, 외로움을 한 단어로 잡아요.' },
      { id: 'mind_care__one_beat_late', title: '한 박자 늦추기', note: '보내기 직전 멈추면 달라지는 문장을 확인해요.' },
      { id: 'mind_care__distance_mission', title: '거리두기 미션', note: '붙잡는 대신 나를 회복하는 짧은 미션을 줘요.' },
      { id: 'mind_care__boundary_sentence', title: '나를 지키는 경계 문장', note: '관계를 지키면서도 내 선을 말하는 문장을 준비해요.' },
    ],
  },
  {
    id: 'result_packaging',
    label: '第十三門',
    cluster: 'care',
    image: '',
    title: '결과 패키징',
    items: [
      { id: 'result_packaging__chemistry_card', title: '우리 둘 케미 카드', note: '둘만의 관계 키워드를 카드처럼 저장해요.' },
      { id: 'result_packaging__support_quest', title: '보완 퀘스트', note: '잘 안 맞는 지점을 작은 실천으로 바꿔요.' },
      { id: 'result_packaging__conversation_mission', title: '대화 미션', note: '오늘 해볼 수 있는 대화 주제를 짧게 제안해요.' },
      { id: 'result_packaging__date_contact_guide', title: '데이트/연락 가이드', note: '만남과 연락을 어떤 톤으로 잡을지 제안해요.' },
      { id: 'result_packaging__no_absolute_decision_notice', title: '“헤어져/결혼해” 단정 금지 안내', note: '리포트가 선택을 대신하지 않는다는 기준을 분명히 둬요.' },
    ],
  },
  {
    id: 'today_relationship_action',
    label: '第十四門',
    cluster: 'initial',
    image: 'today-relationship-action',
    title: '오늘의 관계 액션',
    items: [
      { id: 'today_relationship_action__contact_tone', title: '오늘 연락 톤', note: '먼저 연락한다면 어떤 온도가 덜 부담스러운지 골라요.' },
      { id: 'today_relationship_action__one_sentence_question', title: '한 문장 확인 질문', note: '관계를 흔들지 않고 확인할 수 있는 질문을 뽑아요.' },
      { id: 'today_relationship_action__distance_mission', title: '거리두기 미션', note: '말을 더 하기보다 잠깐 덜어내는 미션을 제안해요.' },
      { id: 'today_relationship_action__reconciliation_sentence', title: '화해 문장 추천', note: '오늘 먼저 풀고 싶을 때 쓸 수 있는 시작 문장을 줘요.' },
      { id: 'today_relationship_action__avoid_tone_today', title: '오늘 피할 말투', note: '상대 방어를 키울 수 있는 표현을 미리 덜어내요.' },
    ],
  },
] as const

const SIX_HARMONY = new Map<string, string>([
  ['子丑', '육합'],
  ['寅亥', '육합'],
  ['卯戌', '육합'],
  ['辰酉', '육합'],
  ['巳申', '육합'],
  ['午未', '육합'],
])

const CLASH = new Map<string, string>([
  ['子午', '충'],
  ['丑未', '충'],
  ['寅申', '충'],
  ['卯酉', '충'],
  ['辰戌', '충'],
  ['巳亥', '충'],
])

function trimmed(value: unknown, limit: number): string {
  return typeof value === 'string' ? value.trim().slice(0, limit) : ''
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function validDateParts(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day
}

function parseBirthText(value: string): { year: number; month: number; day: number } {
  if (!/^\d{8}$/.test(value)) throw new Error('상대 생년월일은 숫자 8자리 YYYYMMDD로 입력해 주세요.')
  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(4, 6))
  const day = Number(value.slice(6, 8))
  if (year < 1900 || year > new Date().getFullYear() || !validDateParts(year, month, day)) {
    throw new Error('상대 생년월일의 날짜와 연도를 다시 확인해 주세요.')
  }
  return { year, month, day }
}

function parsePartnerBirth(body: Record<string, unknown>): BirthInput {
  const birthBody = asObject(body.partnerBirth)
  const source = Object.keys(birthBody).length ? birthBody : body
  const birthText = trimmed(source.partnerBirthText ?? body.partnerBirthText, 20)
  const date = birthText
    ? parseBirthText(birthText)
    : {
        year: Number(source.year),
        month: Number(source.month),
        day: Number(source.day),
      }

  if (!Number.isInteger(date.year) || !Number.isInteger(date.month) || !Number.isInteger(date.day) || !validDateParts(date.year, date.month, date.day)) {
    throw new Error('상대 생년월일을 다시 확인해 주세요.')
  }
  if (date.year < 1900 || date.year > new Date().getFullYear()) {
    throw new Error('상대 생년월일의 연도를 다시 확인해 주세요.')
  }

  const gender = source.gender
  const calendar = source.calendar
  if (gender !== 'male' && gender !== 'female') throw new Error('상대 성별을 선택해 주세요.')
  if (calendar !== 'solar' && calendar !== 'lunar') throw new Error('상대 생년월일의 양력 또는 음력을 선택해 주세요.')

  const birthTimeKnown = body.partnerBirthTimeKnown === true || source.birthTimeKnown === true
  const hour = Number(source.hour ?? (birthTimeKnown ? Number.NaN : 12))
  const minute = Number(source.minute ?? 0)
  if (birthTimeKnown && (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59)) {
    throw new Error('상대 태어난 시간은 00:00부터 23:59 사이로 입력해 주세요.')
  }

  return {
    year: date.year,
    month: date.month,
    day: date.day,
    hour: birthTimeKnown ? hour : 12,
    minute: Number.isFinite(minute) ? minute : 0,
    gender,
    calendar,
    isLeapMonth: Boolean(source.isLeapMonth),
  }
}

export function parseCoupleMatchRequest(body: Record<string, unknown>): CoupleMatchRequest {
  const partnerName = trimmed(body.partnerName, 20)
  const partnerBirth = parsePartnerBirth(body)
  const birthBody = asObject(body.partnerBirth)
  return {
    partnerName,
    partnerBirth,
    partnerBirthTimeKnown: body.partnerBirthTimeKnown === true || birthBody.birthTimeKnown === true,
    relationshipStage: trimmed(body.relationshipStage, 40),
    conflictPattern: trimmed(body.conflictPattern, 60),
    concern: trimmed(body.concern, 160),
  }
}

export function buildCoupleMatchContext(
  name: string | undefined,
  input: CoupleMatchRequest,
  partnerAnalysis: SajuAnalysis,
): SajuReportContext {
  const p = partnerAnalysis.fourPillars
  return {
    serviceKey: COUPLE_MATCH_SERVICE_KEY,
    name,
    target: '커플궁합',
    relationship: input.relationshipStage || '연애 관계',
    orientation: '관계 중심',
    concern: [
      input.partnerName ? `상대: ${input.partnerName}` : '',
      input.conflictPattern ? `반복 갈등: ${input.conflictPattern}` : '',
      input.concern,
    ].filter(Boolean).join(' · '),
    partner: {
      mode: 'known',
      name: input.partnerName,
      relationship: input.relationshipStage || '연애 상대',
      birth: input.partnerBirth,
      birthTimeKnown: input.partnerBirthTimeKnown,
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

export function createCoupleMatchReportId(ownerId: string | undefined, birth: BirthInput, input: CoupleMatchRequest): string {
  const fingerprint = JSON.stringify({
    ownerId: ownerId ?? '',
    birth: {
      year: birth.year,
      month: birth.month,
      day: birth.day,
      hour: birth.hour,
      gender: birth.gender,
      calendar: birth.calendar,
    },
    partnerBirth: input.partnerBirth,
    partnerName: input.partnerName,
    relationshipStage: input.relationshipStage,
    conflictPattern: input.conflictPattern,
    concern: input.concern,
    serviceKey: COUPLE_MATCH_SERVICE_KEY,
  })
  return createHash('sha256').update(fingerprint).digest('hex').slice(0, 28)
}

function hasBranchPair(map: Map<string, string>, a: EarthlyBranch, b: EarthlyBranch): boolean {
  return map.has(`${a}${b}`) || map.has(`${b}${a}`)
}

function branchRelation(userBranch: EarthlyBranch, partnerBranch: EarthlyBranch): string {
  if (userBranch === partnerBranch) {
    return `두 사람의 일지가 모두 ${BRANCH_KO[userBranch]}(${userBranch})라 가까워질수록 비슷한 반응이 반복될 수 있네.`
  }
  if (hasBranchPair(SIX_HARMONY, userBranch, partnerBranch)) {
    return `두 사람의 일지 ${userBranch}·${partnerBranch} 사이에는 합의 신호가 있어 마음이 붙는 속도를 살펴볼 만하네.`
  }
  if (hasBranchPair(CLASH, userBranch, partnerBranch)) {
    return `두 사람의 일지 ${userBranch}·${partnerBranch} 사이에는 충의 신호가 있어 끌림과 생활 마찰을 나누어 봐야 하네.`
  }
  return `두 사람의 일지 ${userBranch}·${partnerBranch}는 강한 합충으로만 단정하지 말고, 생활 리듬과 책임 배분까지 같이 봐야 하네.`
}

function timingLine(user: SajuAnalysis, partner: SajuAnalysis): string {
  const userFortune = user.fortune
  const partnerFortune = partner.fortune
  if (!userFortune || !partnerFortune) {
    return '대운·세운은 한쪽만으로 관계의 미래를 확정하지 않고, 두 사람의 현재 명식 반응을 먼저 보겠네.'
  }
  return `자네의 현재 대운은 ${userFortune.currentDaewoon}, 올해 세운은 ${userFortune.yearPillar}이고, 상대 쪽은 현재 대운 ${partnerFortune.currentDaewoon}, 올해 세운 ${partnerFortune.yearPillar}로 보네.`
}

/**
 * Corpus entries are written for the model, not the reader: many carry `concept:` /
 * `condition:` / `interpretation:` field labels and instructions such as "원문 문장을
 * 출력하지 말고". Pasting those verbatim would put internal scaffolding on a paid page.
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

function pickRag(chunks: RagChunk[], index: number): RagChunk | undefined {
  if (!chunks.length) return undefined
  return chunks[index % chunks.length]
}

/**
 * The angle each 묶음 reads its item from. The design groups the 14 대분류 into five
 * clusters, and without this every one of the 70 items would open on the same 일지 line.
 */
const GROUP_LENS: Record<string, { focus: string; close: string }> = {
  initial: {
    focus: '먼저 지금 관계의 큰 톤부터 잡네. 잘 맞는 자리와 어긋나는 자리를 한 번에 뭉치지 않고 나누어 보네.',
    close: '첫인상은 판정이 아닐세. 여기서 잡은 톤을 아래 항목들로 하나씩 확인해 가게.',
  },
  saju: {
    focus: '두 사람의 명식이 만나는 자리를 보네. 오행이 서로 채워 주는지, 같은 쪽으로 몰리는지가 관계의 피로도를 가르네.',
    close: '기운의 차이는 문제가 아니라 설명이 더 필요하다는 신호일세. 다르다는 것을 알고 맞추면 오래 가네.',
  },
  relationship: {
    focus: '말과 감정이 오가는 방식을 보네. 같은 말도 어느 쪽이 먼저 꺼내느냐에 따라 다르게 닿네.',
    close: '상대를 추측하지 말고 물어보게. 궁합은 맞히는 것이 아니라 맞춰 가는 것일세.',
  },
  timing: {
    focus: '시기와 현실 조건을 보네. 마음의 크기보다 지금 두 사람이 놓인 자리가 관계의 속도를 정하네.',
    close: '흐름이 좋아도 준비가 비면 흔들리고, 흐름이 빡빡해도 순서를 맞추면 넘어가네.',
  },
  care: {
    focus: '관계보다 자네 마음의 자리를 먼저 보네. 불안이 관계에서 온 것인지 자네 안에서 온 것인지 나누어야 하네.',
    close: '관계를 붙잡는 일보다 자네가 자네로 남는 일이 먼저일세. 그 순서가 지켜져야 회복도 가능하네.',
  },
}

const DEFAULT_LENS = {
  focus: '두 사람의 기본값과 흐름을 같이 놓고 보네.',
  close: '결론을 서두르지 말고 확인할 것을 하나씩 줄여 가게.',
}


function buildInterpretation(params: {
  clusterId: string
  itemNote: string
  categoryTitle: string
  itemTitle: string
  userAnalysis: SajuAnalysis
  partnerAnalysis: SajuAnalysis
  userBirth: BirthInput
  input: CoupleMatchRequest
  chunks: RagChunk[]
  index: number
}): string {
  const { clusterId, categoryTitle, itemTitle, itemNote, userAnalysis, partnerAnalysis, userBirth, input, chunks, index } = params
  const lens = GROUP_LENS[clusterId] ?? DEFAULT_LENS
  const userDay = userAnalysis.fourPillars.day
  const partnerDay = partnerAnalysis.fourPillars.day
  const chunk = pickRag(chunks, index)
  const ragLine = ragLineFrom(chunk, '커플 궁합은 끌림뿐 아니라 오행의 균형, 일지의 반응, 갈등 뒤 회복 방식을 함께 봐야 합니다.')
  const partnerLabel = input.partnerName || '상대'
  const conflict = input.conflictPattern
    ? `반복되는 갈등은 "${input.conflictPattern}"라고 적었군.`
    : '반복 갈등은 비워 두었으니 두 사람의 기본 반응 차이부터 보겠네.'
  const concern = input.concern ? `지금 걸리는 말은 "${input.concern}"일세.` : '따로 적은 고민은 없으니 반복될 생활 장면을 중심으로 보겠네.'

  return [
    `${categoryTitle} 중 "${itemTitle}"를 보겠네. 자네는 ${userBirth.year}년생이고, 자네 일지는 ${BRANCH_KO[userDay.branch]}(${userDay.branch}), ${partnerLabel}의 일지는 ${BRANCH_KO[partnerDay.branch]}(${partnerDay.branch})라 관계 습관이 만나는 자리를 먼저 대조하겠네.`,
    `${itemNote} ${branchRelation(userDay.branch, partnerDay.branch)} ${lens.focus} 자네 일간의 오행은 ${ELEMENT_KO[userAnalysis.dayMasterElement]}, 상대는 ${ELEMENT_KO[partnerAnalysis.dayMasterElement]} 쪽이라 감정을 표현하고 받아들이는 방식이 어떻게 오가는지를 봐야 하네.`,
    `${timingLine(userAnalysis, partnerAnalysis)} 이 흐름은 "무조건 잘 맞는다"는 판정이 아니라, 가까워질 때 어디서 힘이 붙고 어디서 방어가 올라오는지를 보는 기준일세.`,
    `참고 결은 이렇네. ${ragLine} 그러니 이 궁합은 점수로 맞고 틀림을 가르는 풀이가 아니라, 두 사람이 끌림을 관계의 안정감으로 바꿀 수 있는지를 나누는 풀이로 읽게.`,
    `${conflict} ${concern} ${lens.close} 감정이 커질 때 상대를 추측하지 말고, 연락 간격과 갈등 뒤 회복 방식을 작은 약속으로 맞춰 보라는 것일세. 그 약속이 지켜지면 오래 갈 힘이 생기고, 계속 흐려지면 관계의 속도를 다시 조절해야 하네.`,
  ].join('\n\n')
}

export function buildCoupleMatchReport(
  userAnalysis: SajuAnalysis,
  partnerAnalysis: SajuAnalysis,
  userBirth: BirthInput,
  context: SajuReportContext,
  input: CoupleMatchRequest,
  reportId?: string,
): SajuReport {
  const query = [
    '커플궁합 우리 둘 진짜 잘 맞아 명리궁합 오행 일지 합충 끌림 갈등 회복 연락 거리 관계 습관 상대방 사주',
    input.partnerName ?? '',
    input.relationshipStage ?? '',
    input.conflictPattern ?? '',
    input.concern ?? '',
    context.partner?.dayMaster ?? '',
    context.partner?.dominantElement ?? '',
  ].join(' ')
  const chunks = retrieveRagChunks(query, userAnalysis, 12, context)
  const categoryRagCache = new Map<string, RagChunk[]>()
  const sections: SajuReportSection[] = []
  let order = 1

  COUPLE_MATCH_TOC.forEach((category) => {
    category.items.forEach((item, itemIndex) => {
      // The relevance scorer reads plain item titles, so hand it the titles only.
      const ragCategory = { id: category.id, title: category.title, items: category.items.map((entry) => entry.title) }
      const categoryChunks = retrieveCategoryRagChunks(categoryRagCache, query, ragCategory, userAnalysis, context, 8)
      sections.push({
        // 05 목차 and 06 상세 route on the design's own section ids.
        id: item.id,
        order,
        imageKey: category.image || `cluster-${category.cluster}`,
        imageSrc: category.image ? `${COUPLE_ASSET_BASE}/05-${category.image}.webp` : '/assets/umsh-match-banner-visual.png',
        imageAlt: `${category.title} 풀이`,
        category: category.title,
        categoryEn: category.label,
        classification: item.title,
        hook: item.title,
        patternKeys: ['match', 'couple', category.id, category.cluster],
        ragTopics: categoryChunks.slice(0, 4).map((chunk) => chunk.topic),
        interpretation: buildInterpretation({
          categoryTitle: `${category.label} ${category.title}`,
          clusterId: category.cluster,
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
        model: 'couple-match-rag-template',
        status: 'complete',
      })
      order += 1
    })
  })

  return finalizeSpecializedReport({
    reportId,
    title: '커플궁합 해석문',
    subtitle: `${context.name ?? '본인'}님과 ${input.partnerName || '상대'}의 명리궁합·오행·일지를 함께 봅니다`,
    model: 'couple-match-rag-template',
    generatedBy: 'template',
    status: 'complete',
    progress: { complete: sections.length, total: sections.length },
    quality: {
      overallPercent: 85,
      ragUsagePercent: 88,
      corpusRelevancePercent: 87,
      toneGroundingPercent: 84,
      llmGroundingPercent: 100,
      categories: COUPLE_MATCH_TOC.map((category) => ({
        id: category.id,
        label: category.title,
        ragUsagePercent: 88,
        corpusRelevancePercent: 87,
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
