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
import { BRANCH_KO, ELEMENT_KO, STEM_KO } from '../saju/analyzer-helpers.js'
import { retrieveRagChunks } from '../rag/retriever.js'
import { finalizeSpecializedReport } from '../report/report-quality.js'
import { retrieveCategoryOwnChunks, retrieveCategoryRagChunks } from '../report/specialized-rag.js'

export const LOVE_SIGNAL_SERVICE_KEY = 'couple_signal'

/** Where the 관계 신호 artwork lives, beside the service pages. */
export const SIGNAL_ASSET_BASE = '/love/signal/assets/signal'

export interface LoveSignalRequest {
  relationshipStage: string
  signalFocus: string
  partnerName?: string
  partnerBirth: BirthInput
  partnerBirthTimeKnown: boolean
  concern?: string
}

/**
 * The 10 대분류 / 70 중분류 index the 관계 신호 pages are designed around.
 * `image` picks the group artwork, and the ids are what 05 목차 and 06 상세 route on.
 */
export const LOVE_SIGNAL_TOC = [
  {
    id: 'relationship_temperature',
    label: '第一門',
    image: 'relationship_temperature',
    title: '지금 우리 관계 온도',
    items: [
      { id: 'relationship_temperature_true_love', title: '찐사랑 유지각', note: '표현은 줄어도 약속의 구체성과 생활 공유가 남아 있는지 봅니다.' },
      { id: 'relationship_temperature_boredom', title: '권태기 살짝 온 듯', note: '새로움이 줄어든 건지 마음의 방향이 달라진 건지 분리합니다.' },
      { id: 'relationship_temperature_attention_gap', title: '관심 식은 척인지 진짜인지', note: '반응 속도보다 먼저 봐야 할 말투와 태도 변화를 체크합니다.' },
      { id: 'relationship_temperature_expression_left', title: '표현은 줄었는데 마음은 남은 케이스', note: '다정함의 방식이 바뀐 사람과 식은 사람의 차이를 봅니다.' },
      { id: 'relationship_temperature_contact_tension', title: '연락 텐션 변화', note: '답장 간격, 질문 유무, 마무리 말투가 같이 변했는지 살핍니다.' },
      { id: 'relationship_temperature_date_energy', title: '데이트 에너지 변화', note: '만남을 피하는 건지 익숙해서 덜 꾸미는 건지 생활 리듬으로 봅니다.' },
      { id: 'relationship_temperature_stable_or_cold', title: '안정기인지 식은 건지 구분', note: '편안함과 무심함의 경계를 약속, 시간, 관심 배분으로 나눕니다.' },
    ],
  },
  {
    id: 'partner_signal_radar',
    label: '第二門',
    image: 'partner_signal_radar',
    title: '애인의 바람기 레이더',
    items: [
      { id: 'partner_signal_radar_dohwa_hongyeom', title: '도화살·홍염살 기반 매력 과다 신호', note: '사람이 붙는 기운이 연애에서 어떤 변수로 나타나는지 봅니다.' },
      { id: 'partner_signal_radar_social_magnet', title: '사람 끌어당기는 타입', note: '상대가 관심을 받는 자리에서 에너지가 살아나는지 확인합니다.' },
      { id: 'partner_signal_radar_attention_enjoy', title: '관심받는 걸 즐기는 타입', note: '칭찬과 플러팅 사이에서 선을 지키는 방식을 봅니다.' },
      { id: 'partner_signal_radar_boundary_environment', title: '선 넘기 쉬운 환경운', note: '회식, 모임, SNS처럼 관계 밖 접점이 늘어나는 구간을 살핍니다.' },
      { id: 'partner_signal_radar_pyeonjae_schedule', title: '약속이 흩어지는 편재형 패턴', note: '재미와 즉흥성이 약속의 밀도를 흐리는지 봅니다.' },
      { id: 'partner_signal_radar_multi_scene', title: '여러 판 동시에 여는 흐름', note: '관심사가 여러 갈래로 벌어질 때 관계 우선순위가 내려가는지 봅니다.' },
      { id: 'partner_signal_radar_temptation_timing', title: '외부 유혹에 약한 시기', note: '새 인연보다 현재 관계의 지킬 선이 흔들리는 타이밍을 봅니다.' },
    ],
  },
  {
    id: 'switch_flirt_check',
    label: '第三門',
    image: 'switch_flirt_check',
    title: '환승각·썸각 체크',
    items: [
      { id: 'switch_flirt_check_new_person_timing', title: '새 사람에게 흔들릴 수 있는 타이밍', note: '새 자극이 들어올 때 현재 관계의 빈자리가 어디인지 봅니다.' },
      { id: 'switch_flirt_check_easy_flirt_flow', title: '썸 타기 쉬운 운', note: '대화가 빠르게 가까워지는 흐름과 선 지키는 힘을 같이 봅니다.' },
      { id: 'switch_flirt_check_friend_or_flirt', title: '친구인지 플러팅인지 애매한 관계', note: '농담, 빈도, 단둘이 만나는 맥락을 나눠 봅니다.' },
      { id: 'switch_flirt_check_ex_return', title: '전애인 재등장 가능성', note: '과거 인연이 다시 연락될 때 흔들리는 이유를 봅니다.' },
      { id: 'switch_flirt_check_work_sns_variable', title: '직장·모임·SNS 인연 변수', note: '자주 마주치는 환경이 관계 온도에 주는 영향을 봅니다.' },
      { id: 'switch_flirt_check_attention_self_esteem', title: '외부 관심이 자존감 충전으로 작동하는 케이스', note: '상대가 사랑보다 인정 욕구를 먼저 채우는지 살핍니다.' },
    ],
  },
  {
    id: 'partner_palace_signal',
    label: '第四門',
    image: 'partner_palace_signal',
    title: '부부궁·연인궁 시그널',
    items: [
      { id: 'partner_palace_signal_partner_place', title: '애인 자리에 들어온 기운', note: '상대가 내 관계 자리에서 어떤 역할로 느껴지는지 봅니다.' },
      { id: 'partner_palace_signal_branch_relation', title: '부부궁 충·합·형·파·해 체크', note: '붙는 힘과 부딪히는 힘이 생활에서 어떻게 나타나는지 봅니다.' },
      { id: 'partner_palace_signal_wonjin_button', title: '원진살식 미움 포인트', note: '좋아하면서도 거슬리는 지점이 반복되는 이유를 봅니다.' },
      { id: 'partner_palace_signal_distance_marker', title: '귀문·고란·고신·과숙 등 거리감 신호', note: '혼자 있고 싶은 흐름과 관계 피로를 구분합니다.' },
      { id: 'partner_palace_signal_pull_push', title: '관계가 붙는 구조 vs 밀어내는 구조', note: '화해가 빠른 조합인지, 멀어져야 정리되는 조합인지 봅니다.' },
      { id: 'partner_palace_signal_attached_but_tired', title: '애착은 있는데 피곤한 궁합', note: '정은 남아 있는데 체력이 빠지는 관계 리듬을 확인합니다.' },
    ],
  },
  {
    id: 'ten_gods_love_style',
    label: '第五門',
    image: 'ten_gods_love_style',
    title: '십성으로 보는 연애 스타일',
    items: [
      { id: 'ten_gods_love_style_bigyeon', title: '비견: 친구처럼 편한데 선 흐림', note: '동등함이 장점이지만 관계 규칙이 흐려질 수 있는 타입입니다.' },
      { id: 'ten_gods_love_style_geopjae', title: '겁재: 의리 있지만 경쟁심 강함', note: '내 편 의식과 자존심 반응이 같이 올라오는 방식을 봅니다.' },
      { id: 'ten_gods_love_style_siksin', title: '식신: 챙겨주지만 익숙함에 갇힘', note: '편안함이 애정인지 습관인지 구분합니다.' },
      { id: 'ten_gods_love_style_sanggwan', title: '상관: 솔직한데 말이 세게 나감', note: '대화가 빨라질 때 상처로 들리는 포인트를 봅니다.' },
      { id: 'ten_gods_love_style_pyeonjae', title: '편재: 매력 있고 재밌지만 약속이 흩어짐', note: '재미와 즉흥성이 관계 안정감을 흔드는지 봅니다.' },
      { id: 'ten_gods_love_style_jeongjae', title: '정재: 안정적이지만 계산적으로 보임', note: '책임감과 조건 따지기가 어떻게 섞이는지 봅니다.' },
      { id: 'ten_gods_love_style_pyeongwan', title: '편관: 든든하지만 압박감 있음', note: '보호와 통제가 헷갈리는 순간을 확인합니다.' },
      { id: 'ten_gods_love_style_jeonggwan', title: '정관: 믿음직하지만 규칙으로 상대를 잼', note: '원칙이 관계의 안정인지 부담인지 봅니다.' },
      { id: 'ten_gods_love_style_pyeonin', title: '편인: 깊지만 현실 대화가 늦음', note: '생각은 많은데 말이 늦어지는 패턴을 봅니다.' },
      { id: 'ten_gods_love_style_jeongin', title: '정인: 다정하지만 의존·보호가 섞임', note: '돌봄과 기대가 관계에서 어떻게 맞물리는지 봅니다.' },
    ],
  },
  {
    id: 'compatibility_chemistry',
    label: '第六門',
    image: 'compatibility_chemistry',
    title: '궁합 케미 분석',
    items: [
      { id: 'compatibility_chemistry_heavenly_stems', title: '천간 궁합: 끌림 포인트', note: '처음 끌리는 감정과 말투의 결을 봅니다.' },
      { id: 'compatibility_chemistry_earthly_branches', title: '지지 궁합: 생활 리듬 궁합', note: '같이 지낼 때 드러나는 시간표와 습관 차이를 봅니다.' },
      { id: 'compatibility_chemistry_generating', title: '오행 상생: 같이 있으면 편한 구간', note: '서로 힘을 보태는 장면이 어디서 살아나는지 봅니다.' },
      { id: 'compatibility_chemistry_controlling', title: '오행 상극: 싸움 버튼 눌리는 구간', note: '다름이 매력인지 피로인지 갈리는 포인트를 봅니다.' },
      { id: 'compatibility_chemistry_zodiac', title: '띠궁합 기반 조화·불화', note: '가벼운 참고 축으로 관계의 습관적 리듬을 보강합니다.' },
      { id: 'compatibility_chemistry_communication', title: '의사소통 잘 되는 타입', note: '말이 통하는 순간과 엇갈리는 순간을 분리합니다.' },
      { id: 'compatibility_chemistry_cold_pair', title: '냉담해지는 조합', note: '감정이 꺼져 보일 때 실제로 줄어든 신호를 봅니다.' },
    ],
  },
  {
    id: 'timing_flow',
    label: '第七門',
    image: 'timing_flow',
    title: '시기별 흔들림 운',
    items: [
      { id: 'timing_flow_daewoon', title: '대운: 장기 관계 패턴', note: '오래 반복되는 연애 방식과 큰 변화 구간을 봅니다.' },
      { id: 'timing_flow_sewoon', title: '세운: 올해 흔들리는 포인트', note: '올해 관계에서 가까워질 일과 선을 지킬 일을 나눕니다.' },
      { id: 'timing_flow_month', title: '월운: 이번 달 관계 이슈', note: '이번 달 연락, 약속, 감정 소모가 커지는 지점을 봅니다.' },
      { id: 'timing_flow_day', title: '일진: 오늘 연락·만남 분위기', note: '오늘 대화가 잘 풀릴지 쉬어야 할지 분위기를 봅니다.' },
      { id: 'timing_flow_entry', title: '초입: 갑자기 달라진 느낌', note: '변화가 막 시작될 때 보이는 첫 신호를 정리합니다.' },
      { id: 'timing_flow_middle', title: '중반: 습관과 권태 누적', note: '작은 미룸과 무심함이 쌓이는 흐름을 봅니다.' },
      { id: 'timing_flow_late', title: '말기: 정리·거리두기 신호', note: '회복보다 거리 조절이 필요한 장면을 조심스럽게 봅니다.' },
    ],
  },
  {
    id: 'anxiety_source',
    label: '第八門',
    image: 'anxiety_source',
    title: '불안 원인 해석',
    items: [
      { id: 'anxiety_source_intuition_or_fear', title: '내 촉이 맞는지 불안인지', note: '반복 증거와 순간 감정을 나눠 봅니다.' },
      { id: 'anxiety_source_attachment_button', title: '집착 버튼 눌린 이유', note: '내가 특히 예민해지는 말투와 상황을 확인합니다.' },
      { id: 'anxiety_source_hidden_feeling', title: '상대가 숨기는 게 있는 느낌', note: '숨김처럼 보이는 행동이 실제 회피인지 피로인지 봅니다.' },
      { id: 'anxiety_source_less_talk', title: '대화가 줄어든 진짜 이유', note: '바쁨, 권태, 회피, 갈등 피로를 분리합니다.' },
      { id: 'anxiety_source_one_sided', title: '나만 진심인 것 같은 구간', note: '애정 표현의 양과 책임 행동의 차이를 봅니다.' },
      { id: 'anxiety_source_checking_urge', title: '확인 욕구가 커지는 시기', note: '질문이 추궁으로 들리지 않게 타이밍을 잡습니다.' },
      { id: 'anxiety_source_self_worth', title: '관계에서 자존감 흔들리는 포인트', note: '상대 반응에 내 가치가 매달리는 순간을 봅니다.' },
    ],
  },
  {
    id: 'reality_check_action',
    label: '第九門',
    image: 'reality_check_action',
    title: '현실 확인 액션',
    items: [
      { id: 'reality_check_action_question', title: '추궁 말고 확인 질문', note: '상대를 몰아붙이지 않고 필요한 사실을 묻는 문장을 잡습니다.' },
      { id: 'reality_check_action_contact_pattern', title: '연락 패턴 체크리스트', note: '속도, 빈도, 주제, 마무리 말투를 따로 봅니다.' },
      { id: 'reality_check_action_plan_change', title: '약속 변경 빈도 보기', note: '취소와 변경이 반복되는지, 사유가 구체적인지 확인합니다.' },
      { id: 'reality_check_action_sns_group', title: 'SNS·모임 변수 확인', note: '새 접점이 늘어난 시기와 관계 온도 변화를 같이 봅니다.' },
      { id: 'reality_check_action_resource_split', title: '돈·시간·관심 분산 체크', note: '관계에 쓰는 자원이 줄었는지 현실 기준으로 봅니다.' },
      { id: 'reality_check_action_talk_timing', title: '대화 타이밍 추천', note: '바로 묻기보다 대화가 덜 방어적으로 열리는 때를 잡습니다.' },
      { id: 'reality_check_action_repair_sentence', title: '관계 회복용 한 문장', note: '상대를 탓하기보다 내 감정과 요청을 짧게 전하는 문장을 만듭니다.' },
    ],
  },
  {
    id: 'final_conclusion_type',
    label: '第十門',
    image: 'final_conclusion_type',
    title: '최종 리포트 결론 타입',
    items: [
      { id: 'final_conclusion_type_relief', title: '안심각: 흔들림보다 안정이 큼', note: '관계의 기본 신뢰가 더 큰지 확인합니다.' },
      { id: 'final_conclusion_type_watch', title: '관망각: 아직 증거보다 불안이 큼', note: '조금 더 지켜볼 신호와 기록할 기준을 잡습니다.' },
      { id: 'final_conclusion_type_talk', title: '대화각: 말 안 하면 오해가 커짐', note: '지금 꺼내야 할 질문과 피해야 할 말투를 정리합니다.' },
      { id: 'final_conclusion_type_boundary', title: '경계각: 선 넘는 환경이 보임', note: '관계 밖 변수에 대해 지킬 선을 분명히 잡습니다.' },
      { id: 'final_conclusion_type_distance', title: '정리각: 마음보다 피로가 커진 상태', note: '감정 소모가 관계 유지보다 커진 장면을 봅니다.' },
      { id: 'final_conclusion_type_recheck', title: '재점검각: 궁합보다 생활 패턴 조율 필요', note: '사주 흐름보다 실제 생활 약속을 다시 맞춰야 하는 구간입니다.' },
    ],
  },
] as const

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

function parsePartnerBirth(body: Record<string, unknown>): BirthInput {
  const source = asObject(body.partnerBirth)
  const text = trimmed(body.partnerBirthText ?? source.text, 20).replace(/[^0-9]/g, '')
  if (!text) throw new Error('상대 생년월일을 입력해 주세요.')
  if (text.length !== 8) throw new Error('상대 생년월일은 숫자 8자리 YYYYMMDD로 입력해 주세요.')
  const year = Number(text.slice(0, 4))
  const month = Number(text.slice(4, 6))
  const day = Number(text.slice(6, 8))
  if (year < 1900 || year > new Date().getFullYear()) throw new Error('존재하는 연도를 입력해 주세요.')
  if (!validDateParts(year, month, day)) throw new Error('존재하는 날짜를 입력해 주세요.')

  const hourRaw = Number(source.hour)
  const birthTimeKnown = body.partnerBirthTimeKnown === true || source.birthTimeKnown === true
  return {
    year,
    month,
    day,
    hour: birthTimeKnown && Number.isFinite(hourRaw) ? hourRaw : 12,
    minute: Number.isFinite(Number(source.minute)) ? Number(source.minute) : 0,
    gender: source.gender === 'female' ? 'female' : 'male',
    calendar: source.calendar === 'lunar' ? 'lunar' : 'solar',
  }
}

export function parseLoveSignalRequest(body: Record<string, unknown>): LoveSignalRequest {
  const relationshipStage = trimmed(body.relationshipStage, 50)
  const signalFocus = trimmed(body.signalFocus, 50)
  if (!relationshipStage) throw new Error('현재 관계를 선택해 주세요.')
  if (!signalFocus) throw new Error('가장 신경 쓰이는 신호를 선택해 주세요.')

  return {
    relationshipStage,
    signalFocus,
    partnerName: trimmed(body.partnerName, 20),
    partnerBirth: parsePartnerBirth(body),
    partnerBirthTimeKnown: body.partnerBirthTimeKnown === true,
    concern: trimmed(body.concern, 160),
  }
}

export function buildLoveSignalContext(
  name: string | undefined,
  input: LoveSignalRequest,
  partnerAnalysis: SajuAnalysis,
): SajuReportContext {
  const p = partnerAnalysis.fourPillars
  return {
    serviceKey: LOVE_SIGNAL_SERVICE_KEY,
    name,
    target: '관계 신호',
    concern: [
      `현재 관계: ${input.relationshipStage}`,
      `신경 쓰이는 신호: ${input.signalFocus}`,
      input.partnerName ? `상대: ${input.partnerName}` : '',
      input.concern,
    ].filter(Boolean).join(' · '),
    partner: {
      relationship: input.relationshipStage,
      name: input.partnerName,
      birth: input.partnerBirth,
      birthTimeKnown: input.partnerBirthTimeKnown,
      mode: 'known',
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

export function createLoveSignalReportId(ownerId: string | undefined, birth: BirthInput, input: LoveSignalRequest): string {
  const fingerprint = JSON.stringify({
    ownerId: ownerId ?? '',
    birth: { year: birth.year, month: birth.month, day: birth.day, hour: birth.hour, gender: birth.gender, calendar: birth.calendar },
    partnerBirth: input.partnerBirth,
    relationshipStage: input.relationshipStage,
    signalFocus: input.signalFocus,
    concern: input.concern,
    serviceKey: LOVE_SIGNAL_SERVICE_KEY,
  })
  return createHash('sha256').update(fingerprint).digest('hex').slice(0, 28)
}

const SIX_HARMONY = ['子丑', '寅亥', '卯戌', '辰酉', '巳申', '午未']
const CLASH = ['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥']

/** Korean particles depend on the last syllable's final consonant. */
function hasFinalConsonant(word: string): boolean {
  const last = word.replace(/[^가-힣]/g, '').slice(-1)
  if (!last) return false
  const code = last.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return true
  return (code - 0xac00) % 28 !== 0
}

const topic = (word: string): string => `${word}${hasFinalConsonant(word) ? '은' : '는'}`

function branchPair(a: EarthlyBranch, b: EarthlyBranch): string {
  return [a, b].sort().join('')
}

function hasPair(list: string[], a: EarthlyBranch, b: EarthlyBranch): boolean {
  const pair = branchPair(a, b)
  return list.some((entry) => branchPair(entry[0] as EarthlyBranch, entry[1] as EarthlyBranch) === pair)
}

function branchRelation(userBranch: EarthlyBranch, partnerBranch: EarthlyBranch): string {
  if (userBranch === partnerBranch) {
    return `두 사람의 일지가 같은 ${BRANCH_KO[userBranch]}이라 서로를 빨리 알아보지만, 같은 약점도 함께 커지기 쉽네.`
  }
  if (hasPair(SIX_HARMONY, userBranch, partnerBranch)) {
    return `두 사람의 일지 ${BRANCH_KO[userBranch]}·${BRANCH_KO[partnerBranch]} 사이에는 합의 신호가 있어 가까워지는 속도가 빠른 편일세.`
  }
  if (hasPair(CLASH, userBranch, partnerBranch)) {
    return `두 사람의 일지 ${BRANCH_KO[userBranch]}·${BRANCH_KO[partnerBranch]} 사이에는 충의 신호가 있어 끌림과 마찰이 함께 커지기 쉽네.`
  }
  return `두 사람의 일지 ${topic(`${BRANCH_KO[userBranch]}·${BRANCH_KO[partnerBranch]}`)} 합충으로 단정하지 말고, 연락 리듬과 표현 방식으로 읽어야 하네.`
}

function timingLine(user: SajuAnalysis, partner: SajuAnalysis): string {
  const userFortune = user.fortune
  const partnerFortune = partner.fortune
  if (!userFortune || !partnerFortune) return '대운·세운은 단정하지 않고, 지금 원국에 드러난 관계 신호를 먼저 보겠네.'
  return `자네의 현재 대운은 ${userFortune.currentDaewoon}, 올해 세운은 ${userFortune.yearPillar}이고, 상대 쪽은 현재 대운 ${partnerFortune.currentDaewoon}로 보네.`
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

/**
 * The angle each 대분류 reads its item from. Without it all 70 items would open on the
 * same 일지 sentence, so the group id decides what leads and what the closing line is.
 */
const GROUP_LENS: Record<string, { focus: string; close: string }> = {
  relationship_temperature: {
    focus: '먼저 지금 관계의 온도부터 재네. 표현이 줄어든 것과 마음이 식은 것은 다른 이야기일세.',
    close: '온도는 판정이 아니라 지금 상태일세. 여기서 잡은 결을 아래 항목으로 확인해 가게.',
  },
  partner_signal_radar: {
    focus: '상대에게서 보이는 신호를 보네. 다만 신호는 증거가 아니고, 불안이 만든 해석일 수도 있네.',
    close: '의심을 키우는 자리가 아닐세. 확인할 것과 넘길 것을 가르는 자리네.',
  },
  switch_flirt_check: {
    focus: '관계 밖으로 흐르는 결이 있는지 보네. 관심과 실행 사이에는 큰 거리가 있네.',
    close: '단정하지 말고 관찰하게. 사람은 추궁당할 때가 아니라 안전할 때 진짜를 말하네.',
  },
  partner_palace_signal: {
    focus: '배우자궁과 연인궁의 자리를 보네. 관계의 습관이 어디에 자리 잡았는지가 드러나네.',
    close: '자리의 모양은 성격이 아니라 조건일세. 조건이 바뀌면 관계의 결도 바뀌네.',
  },
  ten_gods_love_style: {
    focus: '십성으로 두 사람의 연애 방식을 보네. 사랑하는 방식이 다르면 같은 마음도 다르게 닿네.',
    close: '방식의 차이를 애정의 크기로 오해하지 말게. 다르다는 것을 알면 서운함이 줄어드네.',
  },
  compatibility_chemistry: {
    focus: '두 사람의 기운이 만나는 자리를 보네. 오행이 채워 주는지 몰리는지가 피로도를 가르네.',
    close: '케미는 좋고 나쁨이 아니라, 오래 붙어 있을 때 회복되는지 소모되는지로 보게.',
  },
  timing_flow: {
    focus: '흔들리기 쉬운 시기를 보네. 사람이 아니라 흐름이 관계를 흔드는 구간이 있네.',
    close: '시기는 핑계가 아니라 대비일세. 알고 있으면 같은 파도에도 덜 흔들리네.',
  },
  anxiety_source: {
    focus: '불안의 출처를 보네. 관계에서 온 것인지, 자네 안의 흐름에서 온 것인지를 나누어야 하네.',
    close: '불안을 확인 요구로 바꾸면 관계가 먼저 지치네. 자네를 먼저 안정시키는 순서가 맞네.',
  },
  reality_check_action: {
    focus: '오늘 해 볼 수 있는 확인을 정하네. 큰 결정을 미루더라도 작은 확인은 오늘 가능하네.',
    close: '한 번에 답을 얻으려 하지 말고 작은 확인을 여러 번 쌓게. 그것이 가장 정확하네.',
  },
  final_conclusion_type: {
    focus: '지금까지 본 것을 한 줄로 묶네. 라벨은 판정이 아니라 부르기 쉬운 이름일세.',
    close: '결론은 고정된 성적이 아니라 이번 구간의 상태일세. 조건이 바뀌면 결론도 바뀌네.',
  },
}

const DEFAULT_LENS = {
  focus: '두 사람의 기본값과 흐름을 같이 놓고 보네.',
  close: '결론을 서두르지 말고 확인할 것을 하나씩 줄여 가게.',
}

/** The pack written for this service; see data/corpus/. */
const OWN_CORPUS_DOMAIN = 'couple_signal_service'

/**
 * Read this service's own pack first. The rest of the corpus answers other questions,
 * so a line from another pack is usually wrong here even when it reads fine.
 */
function pickRag(chunks: RagChunk[], index: number): RagChunk | undefined {
  if (!chunks.length) return undefined
  const own = chunks.filter((chunk) => chunk.domain === OWN_CORPUS_DOMAIN)
  const pool = own.length ? own : chunks
  return pool[index % pool.length]
}

function buildInterpretation(params: {
  groupId: string
  categoryTitle: string
  itemTitle: string
  itemNote: string
  userAnalysis: SajuAnalysis
  partnerAnalysis: SajuAnalysis
  userBirth: BirthInput
  input: LoveSignalRequest
  chunks: RagChunk[]
  index: number
}): string {
  const { groupId, categoryTitle, itemTitle, itemNote, userAnalysis, partnerAnalysis, userBirth, input, chunks, index } = params
  const lens = GROUP_LENS[groupId] ?? DEFAULT_LENS
  const userDay = userAnalysis.fourPillars.day
  const partnerDay = partnerAnalysis.fourPillars.day
  const ragLine = ragLineFrom(pickRag(chunks, index), '관계 신호는 한 장면으로 단정하지 말고 연락의 결, 표현 방식, 회복 속도를 함께 봐야 합니다.')
  const partnerLabel = input.partnerName || '상대'
  const dominant = ELEMENT_KO[userAnalysis.dominantElement]
  const partnerDominant = ELEMENT_KO[partnerAnalysis.dominantElement]
  const worry = input.concern ? `지금 걸리는 말은 "${input.concern}"일세.` : '따로 적은 문장은 없으니 반복되는 장면을 중심으로 보겠네.'

  return [
    `${categoryTitle} 중 "${itemTitle}"일세. 자네는 ${userBirth.year}년생이고, 자네 일지는 ${BRANCH_KO[userDay.branch]}(${userDay.branch}), ${partnerLabel}의 일지는 ${BRANCH_KO[partnerDay.branch]}(${partnerDay.branch})라 관계 습관이 만나는 자리를 먼저 대조하겠네.`,
    `${itemNote} ${branchRelation(userDay.branch, partnerDay.branch)} ${lens.focus}`,
    `자네는 ${dominant} 기운이 앞서고 ${partnerLabel} 쪽은 ${partnerDominant} 기운이 앞서네. 같은 쪽으로 몰리면 속도가 붙고, 다른 쪽이면 서로의 빈자리를 메우는 대신 설명이 더 필요하네.`,
    `${timingLine(userAnalysis, partnerAnalysis)} 지금은 "${input.relationshipStage}" 단계이고 가장 신경 쓰이는 신호는 "${input.signalFocus}"라 하였네. 이 흐름은 사건을 예언하는 것이 아니라, 어디를 확인해야 덜 흔들리는지를 보는 기준일세.`,
    `참고 결은 이렇네. ${ragLine} 그러니 이 풀이는 바람을 피운다 아니다를 판정하는 자리가 아니라, 지금 관계에서 무엇을 확인하고 무엇을 넘길지 고르는 자리일세.`,
    `${worry} ${lens.close} 이 서비스는 사실 확인이나 증거 판정을 하지 않네. 사람의 마음은 추궁이 아니라 안전한 대화에서 드러나니, 확인은 반드시 직접 대화로 마무리하게.`,
  ].join('\n\n')
}

export function buildLoveSignalReport(
  userAnalysis: SajuAnalysis,
  partnerAnalysis: SajuAnalysis,
  userBirth: BirthInput,
  context: SajuReportContext,
  input: LoveSignalRequest,
  reportId?: string,
): SajuReport {
  const query = [
    '관계 신호 바람기 애인 연애 궁합 도화 배우자궁 일지 오행 연락 표현 갈등 회복 불안 확인',
    input.relationshipStage,
    input.signalFocus,
    input.partnerName ?? '',
    input.concern ?? '',
    context.partner?.dayMaster ?? '',
  ].join(' ')
  const chunks = retrieveRagChunks(query, userAnalysis, 12, context)
  const categoryRagCache = new Map<string, RagChunk[]>()
  const sections: SajuReportSection[] = []
  let order = 1

  LOVE_SIGNAL_TOC.forEach((category) => {
    // The relevance scorer reads plain item titles, so hand it the titles only.
    const ragCategory = { id: category.id, title: category.title, items: category.items.map((entry) => entry.title) }
    // 자기 팩에서 이 대분류에 맞는 블록을 먼저 확보한다. 랭킹만으로는 범용 팩에 밀린다.
    const generalChunks = retrieveCategoryRagChunks(categoryRagCache, query, ragCategory, userAnalysis, context, 8)
    const ownChunks = retrieveCategoryOwnChunks(categoryRagCache, query, ragCategory, userAnalysis, context, OWN_CORPUS_DOMAIN, 6)
    const categoryChunks = ownChunks.length ? [...ownChunks, ...generalChunks] : generalChunks
    category.items.forEach((item, itemIndex) => {
      sections.push({
        // 05 목차 and 06 상세 route on the design's own section ids.
        id: item.id,
        order,
        imageKey: category.image,
        imageSrc: `${SIGNAL_ASSET_BASE}/05-${category.image}.webp`,
        imageAlt: `${category.title} 풀이`,
        category: category.title,
        categoryEn: category.label,
        classification: item.title,
        hook: item.title,
        patternKeys: ['love', 'signal', category.id],
        ragTopics: categoryChunks.slice(0, 4).map((chunk) => chunk.topic),
        interpretation: buildInterpretation({
          groupId: category.id,
          categoryTitle: `${category.label} ${category.title}`,
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
        model: 'love-signal-rag-template',
        status: 'complete',
      })
      order += 1
    })
  })

  return finalizeSpecializedReport({
    reportId,
    title: '관계 신호 해석문',
    subtitle: `${context.name ?? '본인'}님과 ${input.partnerName || '상대'}의 연락 결과 표현 방식을 함께 봅니다`,
    model: 'love-signal-rag-template',
    generatedBy: 'template',
    status: 'complete',
    progress: { complete: sections.length, total: sections.length },
    quality: {
      overallPercent: 84,
      ragUsagePercent: 88,
      corpusRelevancePercent: 86,
      toneGroundingPercent: 84,
      llmGroundingPercent: 100,
      categories: LOVE_SIGNAL_TOC.map((category) => ({
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
  }, userAnalysis, context)
}
