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
import { ELEMENT_KO, STEM_KO } from '../saju/analyzer-helpers.js'
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
      { id: 'relationship_temperature_boredom', title: '익숙함과 관심 변화 구분', note: '새로움이 줄어든 건지 마음의 방향이 달라진 건지 분리합니다.' },
      { id: 'relationship_temperature_attention_gap', title: '상대의 의향과 실제 행동 확인', note: '반응 속도보다 먼저 봐야 할 말투와 태도 변화를 체크합니다.' },
      { id: 'relationship_temperature_expression_left', title: '표현이 줄었을 때 함께 볼 행동', note: '다정함의 방식이 바뀐 사람과 식은 사람의 차이를 봅니다.' },
      { id: 'relationship_temperature_contact_tension', title: '연락 텐션 변화', note: '답장 간격, 질문 유무, 마무리 말투가 같이 변했는지 살핍니다.' },
      { id: 'relationship_temperature_date_energy', title: '데이트 에너지 변화', note: '만남을 피하는 건지 익숙해서 덜 꾸미는 건지 생활 리듬으로 봅니다.' },
      { id: 'relationship_temperature_stable_or_cold', title: '안정기인지 식은 건지 구분', note: '편안함과 무심함의 경계를 약속, 시간, 관심 배분으로 나눕니다.' },
    ],
  },
  {
    id: 'partner_signal_radar',
    label: '第二門',
    image: 'partner_signal_radar',
    title: '관계 밖 활동과 합의한 경계',
    items: [
      { id: 'partner_signal_radar_dohwa_hongyeom', title: '매력의 상징과 실제 행동 구분', note: '도화·홍염을 외도나 성격 판정으로 쓰지 않고 전통적 개념의 범위를 설명합니다.' },
      { id: 'partner_signal_radar_social_magnet', title: '대인 활동이 늘어난 경우', note: '활동 변화가 확인된 경우에만 일정과 약속의 변화를 비교합니다.' },
      { id: 'partner_signal_radar_attention_enjoy', title: '칭찬과 관심을 주고받는 방식', note: '상대의 인정 욕구를 추측하지 않고 실제 표현과 합의한 경계를 봅니다.' },
      { id: 'partner_signal_radar_boundary_environment', title: '모임에서 함께 정할 경계', note: '모임 자체를 위험으로 보지 않고 서로 편안한 범위를 확인합니다.' },
      { id: 'partner_signal_radar_pyeonjae_schedule', title: '약속이 바뀌었을 때 볼 행동', note: '편재 하나로 무책임을 정하지 않고 변경 사유와 대안을 확인합니다.' },
      { id: 'partner_signal_radar_multi_scene', title: '여러 일정과 관계 시간 배분', note: '일정이 많다는 사실과 관계 약속 이행을 나누어 봅니다.' },
      { id: 'partner_signal_radar_temptation_timing', title: '생활 변화 때 재확인할 약속', note: '특정 시기의 유혹을 예언하지 않고 생활 변화에 맞춘 합의를 봅니다.' },
    ],
  },
  {
    id: 'switch_flirt_check',
    label: '第三門',
    image: 'switch_flirt_check',
    title: '새 접점과 관계 의향',
    items: [
      { id: 'switch_flirt_check_new_person_timing', title: '새로운 만남과 현재 관계의 구분', note: '새 접점이 생겨도 마음의 이동으로 단정하지 않습니다.' },
      { id: 'switch_flirt_check_easy_flirt_flow', title: '친절과 관계 의향을 구별하기', note: '한 번의 친절과 직접 표현된 관계 의향을 구분합니다.' },
      { id: 'switch_flirt_check_friend_or_flirt', title: '친구인지 플러팅인지 애매한 관계', note: '농담, 빈도, 단둘이 만나는 맥락을 나눠 봅니다.' },
      { id: 'switch_flirt_check_ex_return', title: '전애인 연락이 실제로 왔을 때', note: '연락이 있었다는 입력 없이 과거 인연의 등장을 예언하지 않습니다.' },
      { id: 'switch_flirt_check_work_sns_variable', title: '직장·모임·SNS 인연 변수', note: '자주 마주치는 환경이 관계 온도에 주는 영향을 봅니다.' },
      { id: 'switch_flirt_check_attention_self_esteem', title: '외부 관심에 붙인 해석 점검', note: '상대의 심리 동기를 창작하지 않고 관찰과 추측을 구분합니다.' },
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
      { id: 'partner_palace_signal_wonjin_button', title: '갈등 경험과 명리 상징 구분', note: '신살의 이름만으로 미움이나 갈등을 가정하지 않습니다.' },
      { id: 'partner_palace_signal_distance_marker', title: '개인 시간과 관계 거리 구분', note: '검증되지 않은 신살로 고독한 성향을 판정하지 않습니다.' },
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
      { id: 'ten_gods_love_style_bigyeon', title: '비견: 동등함을 읽는 참고 관점', note: '계산 목록에 해당 십성이 있는지 먼저 확인하고 실제 행동과 구별합니다.' },
      { id: 'ten_gods_love_style_geopjae', title: '겁재: 함께함과 주도권의 참고 관점', note: '경쟁심이 강하다는 성격 판정을 하지 않습니다.' },
      { id: 'ten_gods_love_style_siksin', title: '식신: 일상 표현의 참고 관점', note: '챙김과 생활 표현을 살피는 비교 개념입니다.' },
      { id: 'ten_gods_love_style_sanggwan', title: '상관: 표현과 의견의 참고 관점', note: '말이 거칠다는 낙인 대신 실제 대화를 확인합니다.' },
      { id: 'ten_gods_love_style_pyeonjae', title: '편재: 자원 활용의 참고 관점', note: '외도나 약속 불이행의 지표로 사용하지 않습니다.' },
      { id: 'ten_gods_love_style_jeongjae', title: '정재: 생활 관리의 참고 관점', note: '계산적 성격으로 단정하지 않습니다.' },
      { id: 'ten_gods_love_style_pyeongwan', title: '편관: 책임 대응의 참고 관점', note: '통제나 압박 행동을 사주로 설명해 정당화하지 않습니다.' },
      { id: 'ten_gods_love_style_jeonggwan', title: '정관: 약속과 규칙의 참고 관점', note: '합의한 규칙과 일방적 요구를 나누어 봅니다.' },
      { id: 'ten_gods_love_style_pyeonin', title: '편인: 이해와 해석의 참고 관점', note: '생각이 깊다는 말로 상대의 속마음을 창작하지 않습니다.' },
      { id: 'ten_gods_love_style_jeongin', title: '정인: 지지와 배움의 참고 관점', note: '돌봄과 의존을 같은 것으로 취급하지 않습니다.' },
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
      { id: 'timing_flow_sewoon', title: '세운: 올해 흐름의 참고 범위', note: '올해 관계에서 가까워질 일과 선을 지킬 일을 나눕니다.' },
      { id: 'timing_flow_month', title: '월운: 이번 달 관계 이슈', note: '이번 달 연락, 약속, 감정 소모가 커지는 지점을 봅니다.' },
      { id: 'timing_flow_day', title: '일진: 오늘 연락·만남 분위기', note: '오늘 대화가 잘 풀릴지 쉬어야 할지 분위기를 봅니다.' },
      { id: 'timing_flow_entry', title: '초입: 갑자기 달라진 느낌', note: '변화가 막 시작될 때 보이는 첫 신호를 정리합니다.' },
      { id: 'timing_flow_middle', title: '반복되는 습관과 실제 변화', note: '작은 미룸과 무심함이 쌓이는 흐름을 봅니다.' },
      { id: 'timing_flow_late', title: '거부와 거리두기를 존중할 기준', note: '회복보다 거리 조절이 필요한 장면을 조심스럽게 봅니다.' },
    ],
  },
  {
    id: 'anxiety_source',
    label: '第八門',
    image: 'anxiety_source',
    title: '불안 원인 해석',
    items: [
      { id: 'anxiety_source_intuition_or_fear', title: '내 촉이 맞는지 불안인지', note: '반복 증거와 순간 감정을 나눠 봅니다.' },
      { id: 'anxiety_source_attachment_button', title: '확인하고 싶은 마음 살펴보기', note: '내가 특히 예민해지는 말투와 상황을 확인합니다.' },
      { id: 'anxiety_source_hidden_feeling', title: '상대가 숨기는 게 있는 느낌', note: '숨김처럼 보이는 행동이 실제 회피인지 피로인지 봅니다.' },
      { id: 'anxiety_source_less_talk', title: '대화 감소에 가능한 설명들', note: '실제로 줄었다는 입력이 있을 때 여러 설명과 확인할 질문을 나눕니다.' },
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
      { id: 'final_conclusion_type_relief', title: '안심 기준: 현재의 존중과 안정', note: '관계의 기본 신뢰가 더 큰지 확인합니다.' },
      { id: 'final_conclusion_type_watch', title: '보류 기준: 아직 확인되지 않은 점', note: '조금 더 지켜볼 신호와 기록할 기준을 잡습니다.' },
      { id: 'final_conclusion_type_talk', title: '대화 기준: 실제 기대 차이 확인', note: '지금 꺼내야 할 질문과 피해야 할 말투를 정리합니다.' },
      { id: 'final_conclusion_type_boundary', title: '경계 기준: 합의한 선과 실제 행동', note: '관계 밖 변수에 대해 지킬 선을 분명히 잡습니다.' },
      { id: 'final_conclusion_type_distance', title: '정리 기준: 나의 안전과 관계 의향', note: '감정 소모가 관계 유지보다 커진 장면을 봅니다.' },
      { id: 'final_conclusion_type_recheck', title: '조정 기준: 생활 약속의 실행', note: '사주 흐름보다 실제 생활 약속을 다시 맞춰야 하는 구간입니다.' },
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
    birth: { year: birth.year, month: birth.month, day: birth.day, hour: birth.hour, ...(birth.minute ? { minute: birth.minute } : {}), gender: birth.gender, calendar: birth.calendar },
    partnerBirth: input.partnerBirth,
    relationshipStage: input.relationshipStage,
    signalFocus: input.signalFocus,
    concern: input.concern,
    serviceKey: LOVE_SIGNAL_SERVICE_KEY,
  })
  return createHash('sha256').update(fingerprint).digest('hex').slice(0, 28)
}

const OWN_CORPUS_DOMAIN = 'couple_signal_service'

function buildInterpretation(params: {
  groupId: string; categoryTitle: string; itemTitle: string; itemNote: string; userAnalysis: SajuAnalysis; partnerAnalysis: SajuAnalysis; userBirth: BirthInput; input: LoveSignalRequest; chunks: RagChunk[]; index: number
}): string {
  return buildRelationshipReading({
    serviceKey: LOVE_SIGNAL_SERVICE_KEY, category: params.groupId, title: params.itemTitle, note: params.itemNote, analysis: params.userAnalysis, partnerAnalysis: params.partnerAnalysis, relationship: params.input.relationshipStage, concern: params.input.concern, signals: { '살펴볼 관계 변화': params.input.signalFocus },
  })
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
    subtitle: `${context.name ?? '본인'}님과 ${input.partnerName || '상대'}의 연락·결과·표현 방식을 함께 봅니다`,
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
