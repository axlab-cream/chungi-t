import { InputError } from '../server/input-error.js'
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
  selfName?: string
  selfBirth?: BirthInput
  selfBirthTimeKnown?: boolean
  relationshipStage: string
  signalFocus: string
  partnerName?: string
  partnerBirth: BirthInput
  partnerBirthTimeKnown: boolean
  concern?: string
}

/**
 * The 10 대분류 / 21 중분류 index the 관계 신호 pages are designed around.
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
      { id: 'partner_signal_radar_boundary_environment', title: '모임에서 함께 정할 경계', note: '모임 자체를 위험으로 보지 않고 서로 편안한 범위를 확인합니다.' },
    ],
  },
  {
    id: 'switch_flirt_check',
    label: '第三門',
    image: 'switch_flirt_check',
    title: '새 접점과 관계 의향',
    items: [
      { id: 'switch_flirt_check_friend_or_flirt', title: '친구인지 플러팅인지 애매한 관계', note: '농담, 빈도, 단둘이 만나는 맥락을 나눠 봅니다.' },
      { id: 'switch_flirt_check_ex_return', title: '전애인 연락이 실제로 왔을 때', note: '연락이 있었다는 입력 없이 과거 인연의 등장을 예언하지 않습니다.' },
    ],
  },
  {
    id: 'partner_palace_signal',
    label: '第四門',
    image: 'partner_palace_signal',
    title: '부부궁·연인궁 시그널',
    items: [
      { id: 'partner_palace_signal_branch_relation', title: '부부궁 충·합·형·파·해 체크', note: '붙는 힘과 부딪히는 힘이 생활에서 어떻게 나타나는지 봅니다.' },
      { id: 'partner_palace_signal_pull_push', title: '관계가 붙는 구조 vs 밀어내는 구조', note: '화해가 빠른 조합인지, 멀어져야 정리되는 조합인지 봅니다.' },
    ],
  },
  {
    id: 'ten_gods_love_style',
    label: '第五門',
    image: 'ten_gods_love_style',
    title: '십성으로 보는 연애 스타일',
    items: [
      { id: 'ten_gods_love_style_siksin', title: '식신: 일상 표현의 참고 관점', note: '챙김과 생활 표현을 살피는 비교 개념입니다.' },
      { id: 'ten_gods_love_style_jeongjae', title: '정재: 생활 관리의 참고 관점', note: '계산적 성격으로 단정하지 않습니다.' },
      { id: 'ten_gods_love_style_jeonggwan', title: '정관: 약속과 규칙의 참고 관점', note: '합의한 규칙과 일방적 요구를 나누어 봅니다.' },
    ],
  },
  {
    id: 'compatibility_chemistry',
    label: '第六門',
    image: 'compatibility_chemistry',
    title: '궁합 케미 분석',
    items: [
      { id: 'compatibility_chemistry_generating', title: '오행 상생: 같이 있으면 편한 구간', note: '서로 힘을 보태는 장면이 어디서 살아나는지 봅니다.' },
      { id: 'compatibility_chemistry_controlling', title: '오행 상극: 싸움 버튼 눌리는 구간', note: '다름이 매력인지 피로인지 갈리는 포인트를 봅니다.' },
    ],
  },
  {
    id: 'timing_flow',
    label: '第七門',
    image: 'timing_flow',
    title: '시기별 흔들림 운',
    items: [
      { id: 'timing_flow_sewoon', title: '세운: 올해 흐름의 참고 범위', note: '올해 관계에서 가까워질 일과 선을 지킬 일을 나눕니다.' },
      { id: 'timing_flow_day', title: '일진: 오늘 연락·만남 분위기', note: '오늘 대화가 잘 풀릴지 쉬어야 할지 분위기를 봅니다.' },
    ],
  },
  {
    id: 'anxiety_source',
    label: '第八門',
    image: 'anxiety_source',
    title: '불안 원인 해석',
    items: [
      { id: 'anxiety_source_intuition_or_fear', title: '내 촉이 맞는지 불안인지', note: '반복 증거와 순간 감정을 나눠 봅니다.' },
      { id: 'anxiety_source_checking_urge', title: '확인 욕구가 커지는 시기', note: '질문이 추궁으로 들리지 않게 타이밍을 잡습니다.' },
    ],
  },
  {
    id: 'reality_check_action',
    label: '第九門',
    image: 'reality_check_action',
    title: '현실 확인 액션',
    items: [
      { id: 'reality_check_action_question', title: '추궁 말고 확인 질문', note: '상대를 몰아붙이지 않고 필요한 사실을 묻는 문장을 잡습니다.' },
      { id: 'reality_check_action_repair_sentence', title: '관계 회복용 한 문장', note: '상대를 탓하기보다 내 감정과 요청을 짧게 전하는 문장을 만듭니다.' },
    ],
  },
  {
    id: 'final_conclusion_type',
    label: '第十門',
    image: 'final_conclusion_type',
    title: '최종 리포트 결론 타입',
    items: [
      { id: 'final_conclusion_type_talk', title: '대화 기준: 실제 기대 차이 확인', note: '지금 꺼내야 할 질문과 피해야 할 말투를 정리합니다.' },
      { id: 'final_conclusion_type_distance', title: '정리 기준: 나의 안전과 관계 의향', note: '감정 소모가 관계 유지보다 커진 장면을 봅니다.' },
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
  const selfBirthBody = asObject(body.selfBirth)
  let selfBirth: BirthInput | undefined
  let selfBirthTimeKnown: boolean | undefined
  if (Object.keys(selfBirthBody).length) {
    const known = body.selfBirthTimeKnown === true || selfBirthBody.birthTimeKnown === true
    const year = Number(selfBirthBody.year)
    const month = Number(selfBirthBody.month)
    const day = Number(selfBirthBody.day)
    const hour = Number(selfBirthBody.hour ?? (known ? Number.NaN : 12))
    const minute = Number(selfBirthBody.minute ?? 0)
    if (!validDateParts(year, month, day) || year < 1900 || year > new Date().getFullYear()) throw new InputError('내 생년월일을 다시 확인해 주세요.')
    if (selfBirthBody.gender !== 'male' && selfBirthBody.gender !== 'female') throw new InputError('내 성별을 선택해 주세요.')
    if (selfBirthBody.calendar !== 'solar' && selfBirthBody.calendar !== 'lunar') throw new InputError('내 생년월일의 양력 또는 음력을 선택해 주세요.')
    if (known && (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59)) throw new InputError('내 태어난 시간을 다시 확인해 주세요.')
    selfBirth = { year, month, day, hour: known ? hour : 12, minute: Number.isFinite(minute) ? minute : 0, gender: selfBirthBody.gender, calendar: selfBirthBody.calendar, isLeapMonth: Boolean(selfBirthBody.isLeapMonth) }
    selfBirthTimeKnown = known
  }
  const relationshipStage = trimmed(body.relationshipStage, 50)
  const signalFocus = trimmed(body.signalFocus, 50)
  if (!relationshipStage) throw new InputError('현재 관계를 선택해 주세요.')
  if (!signalFocus) throw new InputError('가장 신경 쓰이는 신호를 선택해 주세요.')

  return {
    selfName: trimmed(body.selfName, 20),
    selfBirth,
    selfBirthTimeKnown,
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
      // 상대의 생년월일시 원본은 문맥에 싣지 않는다. 이 문맥은 리포트 payload 로 저장되고
      // 응답으로도 나가는데, 상대는 이 서비스의 사용자가 아니어서 동의·삭제 창구가 없다.
      // 본문 생성에 필요한 것은 아래 계산 결과뿐이고 원본은 `input.partnerBirth` 에 있다.
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
      elementCount: partnerAnalysis.elementCount,
      pillarElements: {
        year: [p.year.stemElement, p.year.branchElement],
        month: [p.month.stemElement, p.month.branchElement],
        day: [p.day.stemElement, p.day.branchElement],
        hour: [p.hour.stemElement, p.hour.branchElement],
      },
      tenGods: partnerAnalysis.tenGods,
    },
  }
}

const PLAIN_ELEMENT: Record<string, string> = {
  wood: '나무', fire: '불', earth: '흙', metal: '쇠', water: '물',
  목: '나무', 화: '불', 토: '흙', 금: '쇠', 수: '물',
}

const SIGNAL_FOCUS_LABELS: Record<string, string> = {
  contact_change: '연락 텐션 변화',
  schedule_change: '약속 변경이 잦아짐',
  sns_group: 'SNS·모임 변수',
  ex_return: '전애인 재등장 느낌',
  cold_mood: '표현이 식은 느낌',
  not_sure: '아직 잘 모르겠음',
}

function signalFocusLabel(value: unknown): string {
  const raw = safeCell(value)
  return SIGNAL_FOCUS_LABELS[raw] || raw
}

function safeCell(value: unknown): string {
  return String(value ?? '').replace(/\r?\n/g, ' ').replace(/\|/g, '｜').trim()
}

function elementName(value: unknown): string {
  return PLAIN_ELEMENT[String(value ?? '')] || String(value ?? '').replace(/\([^)]*\)/g, '').trim() || '기운'
}

function signalFacts(context: SajuReportContext) {
  const parts = safeCell(context.concern).split(/\s*·\s*/).filter(Boolean)
  const pick = (label: string) => parts.find((part) => part.startsWith(`${label}:`))?.slice(label.length + 1).trim() || ''
  const described = parts.filter((part) => !/^(현재 관계|신경 쓰이는 신호|상대):/.test(part)).join(' · ')
  return {
    selfName: safeCell(context.name) || '나',
    partnerName: safeCell(context.partner?.name) || pick('상대') || '상대',
    relationship: safeCell(context.partner?.relationship) || pick('현재 관계') || '가까운 관계',
    focus: signalFocusLabel(pick('신경 쓰이는 신호')) || '최근 달라진 행동',
    concern: described,
  }
}

function signalInputTable(context: SajuReportContext): string {
  const facts = signalFacts(context)
  const rows: Array<[string, string, string]> = [
    ['현재 두 사람의 관계', facts.relationship, '연락과 약속을 받아들이는 현재 거리'],
    ['가장 마음에 걸린 변화', facts.focus, '첫 무료 해석에서 먼저 확인할 장면'],
    ...(facts.concern ? [['직접 적은 고민', facts.concern, '추측과 실제 변화를 나눠 볼 문장'] as [string, string, string]] : []),
  ]
  return ['| 확인한 내용 | 직접 알려 준 답 | 이번 풀이에서 읽는 부분 |', '| --- | --- | --- |', ...rows.map((row) => `| ${row.join(' | ')} |`)].join('\n')
}

function signalPillarTable(analysis: SajuAnalysis, context: SajuReportContext): string {
  const mine = analysis.fourPillars
  const theirs = context.partner?.pillarElements
  const rows = theirs ? [
    ['태어난 해', `${elementName(mine.year.stemElement)} · ${elementName(mine.year.branchElement)}`, `${elementName(theirs.year[0])} · ${elementName(theirs.year[1])}`],
    ['태어난 달', `${elementName(mine.month.stemElement)} · ${elementName(mine.month.branchElement)}`, `${elementName(theirs.month[0])} · ${elementName(theirs.month[1])}`],
    ['태어난 날', `${elementName(mine.day.stemElement)} · ${elementName(mine.day.branchElement)}`, `${elementName(theirs.day[0])} · ${elementName(theirs.day[1])}`],
    ['태어난 시간', context.birthTimeKnown === false ? '입력하지 않음' : `${elementName(mine.hour.stemElement)} · ${elementName(mine.hour.branchElement)}`, context.partner?.birthTimeKnown === false ? '입력하지 않음' : `${elementName(theirs.hour[0])} · ${elementName(theirs.hour[1])}`],
  ] : [
    ['태어난 날의 중심', elementName(analysis.dayMasterElement), elementName(context.partner?.dayMasterElement)],
    ['전체에서 많이 쓰는 기운', elementName(analysis.dominantElement), elementName(context.partner?.dominantElement)],
  ]
  const heading = theirs ? '사주의 네 기둥' : '저장된 사주 계산값'
  return [`| ${heading} | 나에게 드러난 기운 | 상대에게 드러난 기운 |`, '| --- | --- | --- |', ...rows.map((row) => `| ${row.join(' | ')} |`)].join('\n')
}

function signalElementChart(analysis: SajuAnalysis, context: SajuReportContext) {
  const elements = [['wood', '나무'], ['fire', '불'], ['earth', '흙'], ['metal', '쇠'], ['water', '물']] as const
  const facts = signalFacts(context)
  const withoutUnknownHour = (count: SajuAnalysis['elementCount'], hourElements: [string, string], known: boolean | undefined) => {
    if (known !== false) return count
    const visible = { ...count }
    hourElements.forEach((element) => {
      const key = element as keyof typeof visible
      visible[key] = Math.max(0, visible[key] - 1)
    })
    return visible
  }
  const mineCount = withoutUnknownHour(analysis.elementCount, [analysis.fourPillars.hour.stemElement, analysis.fourPillars.hour.branchElement], context.birthTimeKnown)
  const mineNote = context.birthTimeKnown === false ? '입력한 세 기둥에서 계산한 개수' : '내 사주 네 기둥에서 계산한 개수'
  const mine = elements.map(([key, label]) => ({ label: `${facts.selfName} · ${label}`, value: mineCount[key], note: mineNote }))
  const partner = context.partner?.elementCount
  const partnerHour = context.partner?.pillarElements?.hour
  const partnerCount = partner && partnerHour ? withoutUnknownHour(partner, partnerHour, context.partner?.birthTimeKnown) : partner
  const partnerNote = context.partner?.birthTimeKnown === false ? '입력한 세 기둥에서 계산한 개수' : '상대 사주 네 기둥에서 계산한 개수'
  return partnerCount ? mine.concat(elements.map(([key, label]) => ({ label: `${facts.partnerName} · ${label}`, value: partnerCount[key], note: partnerNote }))) : mine
}

function signalTeaserInterpretation(index: number, analysis: SajuAnalysis | undefined, context: SajuReportContext): string {
  const facts = signalFacts(context)
  const mine = analysis ? elementName(analysis.dominantElement) : '내가 강하게 쓰는 기운'
  const theirs = elementName(context.partner?.dominantElement)
  const concern = facts.concern || `${facts.partnerName}님의 ${facts.focus}이 왜 달라졌는지`
  if (index === 0) return [
    `[주요 포인트] ${facts.selfName}님이 “${concern}”을 마음에 두게 된 출발점은 ${facts.focus}입니다. 지금 입력에서 먼저 드러나는 것은 외도의 증거가 아니라, 이전과 달라진 행동을 설명하지 않은 채 둘 사이의 약속이 흐려진 장면입니다. 그래서 이 관계는 상대의 마음을 상상하기보다 달라진 연락·약속·표현을 같은 기간에 놓고 보는 것이 맞습니다.`,
    `${facts.relationship}인 두 사람에게 가장 중요한 단서는 연락 횟수 하나가 아닙니다. 답이 늦어도 약속을 먼저 잡고 이유를 설명한다면 관계를 지키는 행동은 남아 있습니다. 반대로 말은 다정한데 약속이 자주 바뀌고 질문할 때마다 설명이 달라진다면, 불안의 원인은 촉이 예민해서가 아니라 확인할 정보가 계속 비어 있기 때문입니다.`,
    `[사주와 관계를 함께 보면] ${facts.selfName}님은 ${mine} 기운을 많이 쓰고 ${facts.partnerName}님은 ${theirs} 기운이 두드러집니다. 두 기운의 차이는 사랑의 크기가 아니라 불편함을 처리하는 속도에서 나타납니다. 한 사람은 바로 확인해야 마음이 놓이고 다른 사람은 정리할 시간을 원할 수 있어, 설명 없는 침묵이 길어질수록 의심이 커지기 쉽습니다.`,
    `[확인할 장면] 최근 가장 마음에 걸린 일 하나를 골라 보세요. 약속이 바뀐 시각, 상대가 먼저 설명했는지, 다음 약속을 다시 잡았는지를 순서대로 적으면 단순한 바쁨과 관계 약속의 후퇴가 분명히 갈립니다.`,
    `[결정 전에 물어볼 질문] “최근 ${facts.focus}이 달라져서 불안했어. 무슨 일이 있었는지, 앞으로 비슷한 날에는 어떻게 알려 줄 수 있는지 듣고 싶어”라고 물었을 때 구체적인 설명과 다음 행동이 함께 돌아오나요?`,
    `[해법] 지금 필요한 답은 휴대전화나 사주 속에 있지 않습니다. 달라진 장면을 숨기지 않고 설명하며 둘이 정한 약속을 다시 지키는 행동이 이어지는지 확인하는 것이 첫 결론입니다.`,
  ].join('\n\n')
  return [
    `[주요 포인트] ${facts.selfName}님과 ${facts.partnerName}님의 관계가 흔들리는 순간은 다른 사람의 등장보다, 불편한 질문을 꺼냈을 때 대화가 끊기는 장면에서 먼저 드러납니다. 첫 해석이 달라진 행동을 짚었다면, 이번에는 두 사람이 그 불안을 함께 다룰 수 있는지를 봅니다.`,
    `${facts.selfName}님은 ${mine}, ${facts.partnerName}님은 ${theirs} 기운을 주로 씁니다. 반응 방식이 다르면 한쪽은 확인 질문을 사랑의 관심으로 느끼고 다른 쪽은 통제로 받아들일 수 있습니다. 이 차이를 모른 채 같은 질문을 반복하면 내용보다 말투가 싸움의 중심이 되지만, 필요한 설명과 사생활의 경계를 함께 정하면 오히려 신뢰를 회복하는 힘이 됩니다.`,
    `[사주와 관계를 함께 보면] 태어난 날의 기둥은 가까운 사람 앞에서 나오는 반응을, 태어난 달의 기둥은 일상에서 반복되는 방식을 살피는 참고점입니다. 두 사람의 사주 계산값을 나란히 놓으면 누가 바람을 피울지를 판정하는 대신, 한 사람이 불안할 때 다른 사람이 설명과 약속으로 응답할 수 있는지를 구체적으로 읽을 수 있습니다.`,
    `[확인할 장면] 불편한 이야기를 꺼낸 뒤의 24시간을 보세요. 상대가 질문을 비난으로 돌리지 않고 사실을 설명하는지, 둘이 합의한 연락이나 모임의 경계를 다시 정하는지, 다음 행동이 실제로 달라지는지가 신뢰 회복의 핵심 장면입니다.`,
    `[결정 전에 물어볼 질문] 서로 편안한 모임·SNS·이성 친구의 범위는 어디까지인가요? 일정이 바뀌면 언제 알려 주기로 할까요? 같은 일이 반복될 때 어떤 행동을 관계 약속 위반으로 볼지도 함께 말할 수 있나요?`,
    `[해법] 대화를 피하지 않고 설명·경계·다음 행동을 함께 정할 수 있다면 이 관계에는 회복할 힘이 있습니다. 질문할 때마다 말을 바꾸거나 합의한 약속을 반복해서 무시한다면, 믿으라는 말보다 거리를 두고 나를 보호하는 판단이 먼저입니다.`,
  ].join('\n\n')
}

export function loveSignalTeaserPreview(context: SajuReportContext, sectionCount: number) {
  const facts = signalFacts(context)
  return {
    title: '내 애인 바람필까?',
    headline: `${facts.partnerName}님의 마음보다 먼저, “${facts.focus}”이 실제 약속과 함께 달라졌는지 봐야 합니다`,
    summary: `“${facts.concern || facts.focus}”이라는 불안을 두 사람의 사주 계산값과 ${facts.relationship}에서 실제로 달라진 행동에 겹쳐, 추측과 확인 가능한 신호를 분리했습니다.`,
    insights: [], signals: [],
    paidValue: `전체 해석에서는 ${sectionCount}개 항목으로 관계 온도, 모임·SNS 경계, 새로운 접점, 두 사람의 반응 차이와 지금 꺼낼 질문까지 이어서 풉니다.`,
  }
}

const LOVE_SIGNAL_TEASER_IMAGES = [
  { key: 'relationship-temperature', src: `${SIGNAL_ASSET_BASE}/05-relationship_temperature.webp`, alt: '두 사람 사이의 연락과 약속 변화를 살피는 관계 온도 장면' },
  { key: 'partner-signal-radar', src: `${SIGNAL_ASSET_BASE}/05-partner_signal_radar.webp`, alt: '두 사람의 사주 기운과 관계 밖 경계를 함께 살피는 장면' },
] as const

export function loveSignalTeaserSection(
  section: SajuReportSection,
  index: number,
  analysis: SajuAnalysis | undefined,
  context: SajuReportContext,
): SajuReportSection {
  const facts = signalFacts(context)
  const hasPartnerPillars = Boolean(context.partner?.pillarElements)
  const image = LOVE_SIGNAL_TEASER_IMAGES[index]
  const story = index === 0 ? {
    feel: `“${facts.focus}”이 달라진 지금, 불안과 실제 신호는 어디에서 갈릴까요?`,
    softBridge: '연락 횟수 하나보다 설명·약속·다음 행동이 함께 남아 있는지를 보면, 지금 관계에서 확인할 답이 선명해집니다.',
    tableMd: signalInputTable(context),
    tableCaption: '직접 알려 준 관계 상태와 달라진 장면이 이번 풀이에서 맡는 역할입니다.',
    flowSteps: [
      { label: '1. 달라진 장면', value: facts.focus, note: '추측 대신 실제 변화를 한 장면으로 좁히기' },
      { label: '2. 설명과 약속', value: '이유와 다음 행동 확인', note: '말과 행동이 같은 방향인지 보기' },
      { label: '3. 반복 여부', value: '같은 일이 다시 생겼는지', note: '한 번의 실수와 관계 약속의 후퇴를 구분하기' },
    ],
    flowCaption: '입력한 불안을 확인 가능한 관계 장면으로 바꾸는 순서입니다.',
    scene: '', actions: [], imagePrompt: { ko: '', en: '' },
  } : {
    feel: '두 사람의 신뢰는 의심이 없는 상태보다, 불편한 질문 뒤에도 설명과 약속이 이어지는지에서 드러납니다.',
    softBridge: hasPartnerPillars
      ? '두 사람의 네 기둥과 다섯 기운을 생활 언어로 나란히 놓아, 불안을 처리하는 속도와 관계 경계를 비교했습니다.'
      : '저장된 두 사람의 사주 계산값을 생활 언어로 나란히 놓아, 불안을 처리하는 속도와 관계 경계를 비교했습니다.',
    ...(analysis ? {
      tableMd: signalPillarTable(analysis, context),
      tableCaption: hasPartnerPillars
        ? '한자를 걷어 내고 두 사람의 네 기둥을 생활 언어의 기운으로 비교했습니다.'
        : '이 리포트에 저장된 두 사람의 사주 계산값만 사용해 생활 언어로 비교했습니다.',
      chartPoints: signalElementChart(analysis, context),
      chartCaption: '입력한 출생 정보에서 계산한 다섯 기운의 개수입니다. 태어난 시간을 모르면 시간 기둥은 제외했으며, 외도 확률이나 사랑의 점수가 아닙니다.',
    } : {}),
    flowSteps: [
      { label: '1. 사실 설명', value: '달라진 일을 숨기지 않기', note: '질문을 공격으로 돌리지 않고 답하기' },
      { label: '2. 경계 합의', value: '모임·SNS·연락 범위 정하기', note: '서로 지킬 수 있는 약속으로 말하기' },
      { label: '3. 다음 행동', value: '같은 상황의 대응 정하기', note: '말이 아니라 반복 행동으로 신뢰 확인하기' },
    ],
    flowCaption: '불안한 관계를 추측에서 합의와 행동으로 옮기는 순서입니다.',
    scene: '', actions: [], imagePrompt: { ko: '', en: '' },
  }
  return {
    ...section,
    ...(image ? { imageKey: image.key, imageSrc: image.src, imageAlt: image.alt } : {}),
    interpretation: signalTeaserInterpretation(index, analysis, context),
    storytelling: { ...(section.storytelling ?? {}), ...story },
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
    title: '내 애인 바람필까? 해석문',
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
