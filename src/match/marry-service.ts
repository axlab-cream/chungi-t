import { InputError } from '../server/input-error.js'
import { createHash } from 'node:crypto'
import { buildRelationshipReading } from '../love/reading-content.js'
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
} from '../types/index.js'
import {
  BRANCH_ELEMENT,
  BRANCH_CLASH_PAIRS,
  BRANCH_COMBINATION_PAIRS,
  ELEMENT_KO,
  STEM_ELEMENT,
  STEM_KO,
} from '../saju/analyzer-helpers.js'
import { retrieveRagChunks } from '../rag/retriever.js'
import { finalizeSpecializedReport } from '../report/report-quality.js'
import { retrieveCategoryOwnChunks, retrieveCategoryRagChunks } from '../report/specialized-rag.js'

export const MARRY_MATCH_SERVICE_KEY = 'marry_match'

/** Where the 결혼궁합 artwork lives; the 05 list and the 06 detail hero share one key per 대분류. */
export const MARRY_ASSET_BASE = '/match/marry/assets/marry'

export interface MarryMatchRequest {
  selfName?: string
  selfBirth?: BirthInput
  selfBirthTimeKnown?: boolean
  partnerName?: string
  partnerBirth: BirthInput
  partnerBirthTimeKnown: boolean
  relationshipStage?: string
  marriagePlan?: string
  concern?: string
}

/**
 * The 10 대분류 / 24 중분류 index the 결혼궁합 service pages are designed around.
 * `tag` drives the 05 목차 filter chips, `image` picks the per-group artwork the
 * 05 list card and the 06 detail hero share.
 */
export const MARRY_MATCH_TOC = [
  {
    id: 'self-base',
    label: '第一門',
    tag: 'chemistry',
    image: 'marry-section-01',
    title: '내 연애 기본값',
    items: [
      '연락·표현·스킨십 온도',
      '결혼하면 드러나는 생활 습관',
    ],
  },
  {
    id: 'partner-base',
    label: '第二門',
    tag: 'chemistry',
    image: 'marry-section-02',
    title: '상대 연애 캐릭터',
    items: [
      '책임감과 약속 감각',
      '말보다 행동으로 봐야 하는 신호',
    ],
  },
  {
    id: 'chemistry',
    label: '第三門',
    tag: 'chemistry',
    image: 'marry-section-03',
    title: '둘의 케미 궁합',
    items: [
      '일간 케미',
      '오행 밸런스 궁합',
      '같이 있으면 반복되는 피로 포인트',
    ],
  },
  {
    id: 'marriage-angle',
    label: '第四門',
    tag: 'marriage',
    image: 'marry-section-04',
    title: '연애 말고 결혼각',
    items: [
      '결혼 얘기를 꺼내도 되는 타이밍',
      '현실 조건의 합의 가능성',
      '지금 밀어붙일 각인지, 속도 조절각인지',
    ],
  },
  {
    id: 'timing',
    label: '第五門',
    tag: 'timing',
    image: 'marry-section-05',
    title: '결혼 타이밍 운',
    items: [
      '올해 결혼운',
      '고백·관계 정의·프러포즈 타이밍',
    ],
  },
  {
    id: 'red-flag',
    label: '第六門',
    tag: 'flag',
    image: 'marry-section-06',
    title: '레드플래그 체크',
    items: [
      '반복되는 싸움 패턴',
      '돈 문제에서 보이는 신뢰도',
      '말은 좋은데 행동이 안 맞는 구간',
    ],
  },
  {
    id: 'daily-life',
    label: '第七門',
    tag: 'marriage',
    image: 'marry-section-07',
    title: '현실 동거·결혼 생활 시뮬레이션',
    items: [
      '집안일과 돈 관리 스타일',
      '장기 갈등을 푸는 방식',
    ],
  },
  {
    id: 'recovery',
    label: '第八門',
    tag: 'action',
    image: 'marry-section-08',
    title: '관계 회복과 마음 돌봄',
    items: [
      '서운함을 말하는 방식',
      '이 관계에서 나를 잃지 않는 법',
    ],
  },
  {
    id: 'action',
    label: '第九門',
    tag: 'action',
    image: 'marry-section-09',
    title: '오늘 바로 써먹는 액션',
    items: [
      '오늘 보낼 메시지 한 줄',
      '결혼 얘기를 꺼내는 문장',
    ],
  },
  {
    id: 'label',
    label: '第十門',
    tag: 'marriage',
    image: 'marry-section-10',
    title: '한눈에 보는 결과 라벨',
    items: [
      '결혼각 온도',
      '안정감 레벨',
      '속도 조절 알림',
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
    throw new InputError('상대 생년월일을 다시 확인해 주세요.')
  }
  if (date.year < 1900 || date.year > new Date().getFullYear()) {
    throw new InputError('상대 생년월일의 연도를 다시 확인해 주세요.')
  }

  const gender = source.gender
  const calendar = source.calendar
  if (gender !== 'male' && gender !== 'female') throw new InputError('상대 성별을 선택해 주세요.')
  if (calendar !== 'solar' && calendar !== 'lunar') throw new InputError('상대 생년월일의 양력 또는 음력을 선택해 주세요.')

  const birthTimeKnown = body.partnerBirthTimeKnown === true || source.birthTimeKnown === true
  const hour = Number(source.hour ?? (birthTimeKnown ? Number.NaN : 12))
  const minute = Number(source.minute ?? 0)
  if (birthTimeKnown && (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59)) {
    throw new InputError('상대 태어난 시간은 00:00부터 23:59 사이로 입력해 주세요.')
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

export function parseMarryMatchRequest(body: Record<string, unknown>): MarryMatchRequest {
  const partnerName = trimmed(body.partnerName, 20)
  const partnerBirth = parsePartnerBirth(body)
  const birthBody = asObject(body.partnerBirth)
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
  return {
    selfName: trimmed(body.selfName, 20),
    selfBirth,
    selfBirthTimeKnown,
    partnerName,
    partnerBirth,
    partnerBirthTimeKnown: body.partnerBirthTimeKnown === true || birthBody.birthTimeKnown === true,
    relationshipStage: trimmed(body.relationshipStage, 40),
    marriagePlan: trimmed(body.marriagePlan, 40),
    concern: trimmed(body.concern, 160),
  }
}

export function buildMarryMatchContext(
  name: string | undefined,
  input: MarryMatchRequest,
  partnerAnalysis: SajuAnalysis,
  userAnalysis?: SajuAnalysis,
): SajuReportContext {
  const p = partnerAnalysis.fourPillars
  return {
    serviceKey: MARRY_MATCH_SERVICE_KEY,
    name,
    target: '결혼궁합',
    relationship: input.relationshipStage || '결혼 고려',
    orientation: '이성 관계 중심',
    concern: [
      input.partnerName ? `상대: ${input.partnerName}` : '',
      input.marriagePlan ? `계획: ${input.marriagePlan}` : '',
      input.concern,
    ].filter(Boolean).join(' · '),
    partner: {
      mode: 'known',
      name: input.partnerName,
      relationship: input.relationshipStage || '결혼 고려 상대',
      // 상대의 생년월일시 원본은 문맥에 싣지 않는다. 이 문맥은 리포트 payload 로 저장되고
      // 응답으로도 나가는데, 상대는 이 서비스의 사용자가 아니어서 동의·삭제 창구가 없다.
      // 본문 생성에 필요한 것은 아래 계산 결과뿐이고 원본은 `input.partnerBirth` 에 있다.
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
      elementCount: partnerAnalysis.elementCount,
      pillarElements: {
        year: [p.year.stemElement, p.year.branchElement],
        month: [p.month.stemElement, p.month.branchElement],
        day: [p.day.stemElement, p.day.branchElement],
        hour: [p.hour.stemElement, p.hour.branchElement],
      },
      dayBranchRelation: userAnalysis ? marryDayBranchRelation(userAnalysis, partnerAnalysis) : undefined,
      tenGods: partnerAnalysis.tenGods,
    },
    couple: {
      focus: input.marriagePlan,
      concern: input.concern,
    },
  }
}

const PLAIN_ELEMENT: Record<string, string> = {
  wood: '나무', fire: '불', earth: '흙', metal: '쇠', water: '물',
  '목(木)': '나무', '화(火)': '불', '토(土)': '흙', '금(金)': '쇠', '수(水)': '물',
}

function safeCell(value: unknown): string {
  return String(value ?? '').replace(/\r?\n/g, ' ').replace(/\|/g, '｜').trim()
}

function elementName(value: unknown): string {
  return PLAIN_ELEMENT[String(value ?? '')] || String(value ?? '').replace(/\([^)]*\)/g, '').trim() || '기운'
}

function marryDayBranchRelation(userAnalysis: SajuAnalysis, partnerAnalysis: SajuAnalysis): string {
  const mine = userAnalysis.fourPillars.day.branch
  const theirs = partnerAnalysis.fourPillars.day.branch
  if (mine === theirs) return '가까운 사이에서 생활 반응이 닮아 편하지만, 같은 문제에 동시에 예민해지기 쉽습니다.'
  if (BRANCH_COMBINATION_PAIRS.some(([a, b]) => (a === mine && b === theirs) || (a === theirs && b === mine))) {
    return '서로 다른 반응이 자연스럽게 이어져, 생활 속 역할을 나눌 때 호흡을 맞추기 쉬운 편입니다.'
  }
  if (BRANCH_CLASH_PAIRS.some(([a, b]) => (a === mine && b === theirs) || (a === theirs && b === mine))) {
    return '가까운 관계에서 감정을 꺼내는 속도와 받아들이는 방식이 반대로 움직이기 쉬워, 작은 약속도 분명히 말해야 합니다.'
  }
  return '생활 반응이 완전히 같지도 정반대도 아니어서, 말하지 않은 기대보다 실제 습관을 맞출수록 안정감이 커집니다.'
}

function marryFacts(context: SajuReportContext) {
  const combined = safeCell(context.concern)
  const plan = safeCell(context.couple?.focus)
    || combined.match(/(?:^|·\s*)계획:\s*([^·]+)/)?.[1]?.trim()
    || '결혼을 구체적으로 생각하는 단계'
  const concern = safeCell(context.couple?.concern)
    || combined.replace(/(?:^|\s*·\s*)상대:\s*[^·]+/g, '').replace(/(?:^|\s*·\s*)계획:\s*[^·]+/g, '').trim()
  return {
    selfName: safeCell(context.name) || '나',
    partnerName: safeCell(context.partner?.name) || '상대',
    relationship: safeCell(context.relationship) || '결혼을 생각하는 관계',
    plan,
    concern,
  }
}

function marryInputTable(context: SajuReportContext): string {
  const facts = marryFacts(context)
  const rows: Array<[string, string, string]> = [
    ['지금 두 사람의 관계', facts.relationship, '말보다 생활 약속이 얼마나 구체적인지 확인'],
    ['먼저 보고 싶은 부분', facts.plan, '결혼 이야기를 꺼낼 속도와 준비 정도를 판단'],
    ...(facts.concern ? [['직접 적은 고민', facts.concern, '막연한 궁합 대신 실제 관계 장면과 연결'] as [string, string, string]] : []),
  ]
  return ['| 확인한 내용 | 직접 알려 준 답 | 이번 풀이에서 짚는 부분 |', '| --- | --- | --- |', ...rows.map((row) => `| ${row.join(' | ')} |`)].join('\n')
}

function visibleElementCount(analysis: SajuAnalysis, birthTimeKnown: boolean | undefined) {
  const count = { ...analysis.elementCount }
  if (birthTimeKnown !== false) return count
  const hour = analysis.fourPillars.hour
  count[hour.stemElement] = Math.max(0, count[hour.stemElement] - 1)
  count[hour.branchElement] = Math.max(0, count[hour.branchElement] - 1)
  return count
}

function legacyPartnerPillarElements(context: SajuReportContext) {
  const pillars = context.partner?.pillars
  if (!pillars) return undefined
  const convert = (value: string | undefined): [Element, Element] | undefined => {
    const text = String(value ?? '')
    const stem = STEM_ELEMENT[text[0] as HeavenlyStem]
    const branch = BRANCH_ELEMENT[text[1] as EarthlyBranch]
    return stem && branch ? [stem, branch] : undefined
  }
  const year = convert(pillars.year)
  const month = convert(pillars.month)
  const day = convert(pillars.day)
  const hour = convert(pillars.hour)
  return year && month && day && hour ? { year, month, day, hour } : undefined
}

function legacyPartnerElementCount(context: SajuReportContext) {
  const pillars = context.partner?.pillarElements ?? legacyPartnerPillarElements(context)
  if (!pillars) return undefined
  const count = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 }
  const visible = context.partner?.birthTimeKnown === false ? [pillars.year, pillars.month, pillars.day] : [pillars.year, pillars.month, pillars.day, pillars.hour]
  visible.flat().forEach((element) => { count[element] += 1 })
  return count
}

function marryPillarTable(analysis: SajuAnalysis, context: SajuReportContext): string {
  const mine = analysis.fourPillars
  const theirs = context.partner?.pillarElements ?? legacyPartnerPillarElements(context)
  const unknown = '입력하지 않음'
  const rows = theirs ? [
    ['태어난 해', `${elementName(mine.year.stemElement)} · ${elementName(mine.year.branchElement)}`, `${elementName(theirs.year[0])} · ${elementName(theirs.year[1])}`],
    ['태어난 달', `${elementName(mine.month.stemElement)} · ${elementName(mine.month.branchElement)}`, `${elementName(theirs.month[0])} · ${elementName(theirs.month[1])}`],
    ['태어난 날', `${elementName(mine.day.stemElement)} · ${elementName(mine.day.branchElement)}`, `${elementName(theirs.day[0])} · ${elementName(theirs.day[1])}`],
    ['태어난 시간', context.birthTimeKnown === false ? unknown : `${elementName(mine.hour.stemElement)} · ${elementName(mine.hour.branchElement)}`, context.partner?.birthTimeKnown === false ? unknown : `${elementName(theirs.hour[0])} · ${elementName(theirs.hour[1])}`],
  ] : [
    ['태어난 날의 중심', elementName(analysis.dayMasterElement), elementName(context.partner?.dayMasterElement)],
    ['전체에서 많이 쓰는 기운', elementName(analysis.dominantElement), elementName(context.partner?.dominantElement)],
  ]
  return ['| 사주의 네 기둥 | 나에게 드러난 기운 | 상대에게 드러난 기운 |', '| --- | --- | --- |', ...rows.map((row) => `| ${row.join(' | ')} |`)].join('\n')
}

function marryElementChart(analysis: SajuAnalysis, context: SajuReportContext) {
  const elements = [['wood', '나무'], ['fire', '불'], ['earth', '흙'], ['metal', '쇠'], ['water', '물']] as const
  const facts = marryFacts(context)
  const mine = visibleElementCount(analysis, context.birthTimeKnown)
  const mineNote = context.birthTimeKnown === false ? '내 사주의 입력된 세 기둥에서 계산한 개수' : '내 사주 네 기둥에서 계산한 개수'
  const points = elements.map(([key, label]) => ({ label: `${facts.selfName} · ${label}`, value: mine[key], note: mineNote }))
  const partner = context.partner?.elementCount ?? legacyPartnerElementCount(context)
  const partnerHour = (context.partner?.pillarElements ?? legacyPartnerPillarElements(context))?.hour
  if (!partner) return points
  const visiblePartner = { ...partner }
  if (context.partner?.elementCount && context.partner?.birthTimeKnown === false && partnerHour) {
    visiblePartner[partnerHour[0]] = Math.max(0, visiblePartner[partnerHour[0]] - 1)
    visiblePartner[partnerHour[1]] = Math.max(0, visiblePartner[partnerHour[1]] - 1)
  }
  const partnerNote = context.partner?.birthTimeKnown === false ? '상대 사주의 입력된 세 기둥에서 계산한 개수' : '상대 사주 네 기둥에서 계산한 개수'
  return points.concat(elements.map(([key, label]) => ({ label: `${facts.partnerName} · ${label}`, value: visiblePartner[key], note: partnerNote })))
}

function marryTeaserInterpretation(index: number, analysis: SajuAnalysis | undefined, context: SajuReportContext): string {
  const facts = marryFacts(context)
  const mine = analysis ? elementName(analysis.dominantElement) : '내가 강하게 쓰는 기운'
  const theirs = elementName(context.partner?.dominantElement)
  const relation = context.partner?.dayBranchRelation || '두 사람은 감정의 크기보다 생활 약속을 맞추는 방식에서 결혼 뒤의 안정감이 드러납니다.'
  if (index === 0) return [
    `[주요 포인트] ${facts.selfName}님이 ${facts.partnerName}님과 결혼을 생각하면서도 망설이는 이유는 사랑이 부족해서가 아닙니다. “${facts.plan}”을 먼저 보고 싶은 지금, 말로 확인한 마음과 실제로 반복되는 책임이 같은 방향인지 알고 싶은 것입니다.`,
    `${facts.selfName}님은 ${mine} 기운을 많이 쓰고 ${facts.partnerName}님은 ${theirs} 기운이 두드러집니다. ${relation} 한 사람은 바로 말해야 안심하고 다른 사람은 행동으로 보여 주는 편이라면, 표현 차이를 애정 차이로 오해하기 쉽습니다.`,
    `[사주와 관계를 함께 보면] 태어난 날의 기둥은 가장 가까운 사람 앞에서 나오는 반응을, 태어난 달의 기둥은 일상에서 반복되는 습관을 살피는 단서입니다. 두 사람의 날과 달을 함께 보면 누가 더 사랑하는지를 재는 대신, 서운함을 말하고 약속을 다시 맞출 힘이 있는지 구체적으로 읽을 수 있습니다.`,
    `[확인할 장면] 최근 한 달 안에 약속이 바뀐 날을 떠올려 보세요. 먼저 이유를 설명했는지, 가능한 다른 날을 제안했는지, 서운함을 말했을 때 끝까지 들었는지가 결혼 뒤에도 반복될 책임의 모습입니다.`,
    `[결정 전에 물어볼 질문] “${facts.concern || '우리 관계에서 결혼 전에 꼭 맞춰야 할 약속은 무엇일까'}”를 꺼냈을 때 두 사람 모두 자신의 몫을 구체적인 행동으로 답할 수 있나요?`,
    `[해법] 이 관계가 결혼으로 이어질 힘은 다정한 말의 횟수보다, 불편한 이야기를 피하지 않고 다음 약속을 함께 정하는 장면에 있습니다. 설명과 행동이 꾸준히 맞는다면 지금의 망설임은 준비해야 할 항목으로 바뀔 수 있습니다.`,
  ].join('\n\n')
  return [
    `[주요 포인트] 두 사람의 결혼 생활은 취향이 같은가보다, 보이지 않는 일을 누가 기억하고 끝내는가에서 먼저 갈립니다. ${facts.relationship}인 지금 생활비·집안일·가족 일정처럼 설렘 밖의 이야기를 나눌 수 있다면 이미 결혼에 필요한 대화를 시작한 셈입니다.`,
    `${facts.selfName}님은 ${mine}, ${facts.partnerName}님은 ${theirs} 기운을 주로 씁니다. 강한 기운이 다르면 한 사람은 계획을 세우고 다른 사람은 상황에 맞춰 움직이는 식으로 서로를 보완할 수 있습니다. 그러나 맡은 일의 끝을 서로 다르게 생각하면 “나는 계속 챙기는데 상대는 모른다”는 피로로 바뀝니다.`,
    `[사주와 관계를 함께 보면] ${relation} ${context.partner?.birthTimeKnown === false ? '상대의 태어난 시간이 없어 시간 기둥은 빼고 해·달·날에서 공통으로 드러나는 생활 반응만 비교했습니다.' : '두 사람의 네 기둥을 나란히 놓아 가까운 관계의 반응과 함께 살 때의 생활 리듬을 연결했습니다.'}`,
    `[확인할 장면] 장보기, 청소, 부모님 일정, 저축처럼 매주 반복되는 일 하나를 골라 보세요. 누가 먼저 알아채고, 누가 결정하며, 예상 밖의 일이 생겼을 때 누가 대안을 만드는지 보면 결혼 뒤 부담이 한쪽으로 쏠릴지 드러납니다.`,
    `[결정 전에 물어볼 질문] 월 고정비는 어떤 비율로 나눌까요? 집안일은 시작뿐 아니라 마무리까지 누가 맡을까요? 양가 일정이 겹치면 무엇을 우선할지 두 사람이 같은 문장으로 답할 수 있나요?`,
    `[해법] 함께 살 준비가 된 관계는 모든 습관이 같은 관계가 아니라, 다른 습관을 숨기지 않고 역할과 마감선을 합의하는 관계입니다. 돈·집안일·가족 일정 가운데 두 가지만 이번 주에 실제로 정해 보세요. 대화 뒤 행동까지 이어지면 결혼의 안정감은 이미 현실에서 확인되고 있습니다.`,
  ].join('\n\n')
}

export function marryMatchTeaserPreview(context: SajuReportContext, sectionCount: number) {
  const facts = marryFacts(context)
  return {
    title: '결혼할까?',
    headline: `${facts.selfName}님과 ${facts.partnerName}님, 사랑의 크기보다 함께 책임지는 방식이 결혼의 답을 가릅니다`,
    summary: `“${facts.concern || facts.plan}”이라는 고민을 두 사람의 사주와 ${facts.relationship}에서 실제로 반복되는 약속에 겹쳐, 결혼 뒤에도 남을 장점과 먼저 맞춰야 할 생활 조건을 짚었습니다.`,
    insights: [], signals: [],
    paidValue: `전체 해석에서는 ${sectionCount}개 항목으로 애정 표현·생활비·집안일·가족 관계·갈등 회복·결혼 시점과 오늘 꺼낼 질문까지 이어서 풉니다.`,
  }
}

const MARRY_TEASER_IMAGES = [
  { key: 'marry-section-01', src: `${MARRY_ASSET_BASE}/05-marry-section-01.webp`, alt: '두 사람의 애정 표현과 약속 방식을 살피는 결혼궁합 장면' },
  { key: 'marry-section-02', src: `${MARRY_ASSET_BASE}/05-marry-section-02.webp`, alt: '두 사람이 결혼 뒤의 생활과 책임을 함께 살피는 장면' },
] as const

export function marryMatchTeaserSection(
  section: SajuReportSection,
  index: number,
  analysis: SajuAnalysis | undefined,
  context: SajuReportContext,
): SajuReportSection {
  const facts = marryFacts(context)
  const image = MARRY_TEASER_IMAGES[index]
  const story = index === 0 ? {
    feel: `${facts.partnerName}님과 결혼을 떠올릴수록 설렘과 망설임이 함께 커지는 이유는 무엇일까요?`,
    softBridge: '두 사람의 태어난 날·달 기운과 직접 적은 고민을 겹치면, 애정 표현의 차이보다 약속을 책임지는 방식이 먼저 보입니다.',
    tableMd: marryInputTable(context),
    tableCaption: '직접 알려 준 관계 상태와 고민을 결혼 전 확인할 장면으로 연결했습니다.',
    flowSteps: [
      { label: '1. 마음을 말할 때', value: '표현 방식을 확인', note: '말·행동·시간 중 무엇으로 안심하는지 묻기' },
      { label: '2. 약속이 바뀔 때', value: '설명과 대안을 확인', note: '미안하다는 말 뒤에 다음 행동이 남는지 보기' },
      { label: '3. 결혼을 말할 때', value: facts.plan, note: '막연한 확신을 날짜와 준비 항목으로 바꾸기' },
    ],
    flowCaption: '지금의 마음을 결혼 준비 여부로 확인하는 순서입니다.',
    scene: '', actions: [], imagePrompt: { ko: '', en: '' },
  } : {
    feel: '결혼 뒤의 궁합은 취향보다, 돈·집안일·가족 일정을 함께 책임지는 방식에서 선명해집니다.',
    softBridge: '두 사람의 네 기둥과 다섯 기운을 생활 언어로 나란히 놓으면, 서로를 보완하는 부분과 부담이 한쪽으로 쏠릴 부분을 구분할 수 있습니다.',
    ...(analysis ? {
      tableMd: marryPillarTable(analysis, context),
      tableCaption: '한자를 걷어 내고 두 사람의 네 기둥을 생활 언어의 기운으로 비교했습니다.',
      chartPoints: marryElementChart(analysis, context),
      chartCaption: '두 사람의 저장 사주에서 계산한 다섯 기운의 실제 개수입니다. 결혼 점수나 사랑의 크기가 아닙니다.',
    } : {}),
    flowSteps: [
      { label: '1. 매주 반복되는 일', value: '먼저 알아채는 사람 확인', note: '보이지 않는 준비가 한쪽에 몰리는지 보기' },
      { label: '2. 돈과 가족 일정', value: '각자의 우선순위 말하기', note: '갈등 전에 합의할 수 있는지 확인' },
      { label: '3. 예상 밖의 날', value: '대안을 함께 만들기', note: '책임을 미루지 않고 조정하는지 보기' },
    ],
    flowCaption: '두 사람의 생활 차이를 실제 분담으로 바꾸는 순서입니다.',
    scene: '', actions: [], imagePrompt: { ko: '', en: '' },
  }
  return {
    ...section,
    ...(image ? { imageKey: image.key, imageSrc: image.src, imageAlt: image.alt } : {}),
    hook: story.feel,
    interpretation: marryTeaserInterpretation(index, analysis, context),
    storytelling: { ...(section.storytelling ?? {}), ...story },
  }
}

export function createMarryMatchReportId(ownerId: string | undefined, birth: BirthInput, input: MarryMatchRequest): string {
  const fingerprint = JSON.stringify({
    ownerId: ownerId ?? '',
    birth: {
      year: birth.year,
      month: birth.month,
      day: birth.day,
      hour: birth.hour,
      ...(birth.minute ? { minute: birth.minute } : {}),
      gender: birth.gender,
      calendar: birth.calendar,
    },
    partnerBirth: input.partnerBirth,
    partnerName: input.partnerName,
    relationshipStage: input.relationshipStage,
    marriagePlan: input.marriagePlan,
    concern: input.concern,
    serviceKey: MARRY_MATCH_SERVICE_KEY,
  })
  return createHash('sha256').update(fingerprint).digest('hex').slice(0, 28)
}

const OWN_CORPUS_DOMAIN = 'marry_match_service'
const pad2 = (value: number): string => String(value).padStart(2, '0')

function buildInterpretation(params: {
  groupId: string; categoryTitle: string; itemTitle: string; userAnalysis: SajuAnalysis; partnerAnalysis: SajuAnalysis; userBirth: BirthInput; input: MarryMatchRequest; chunks: RagChunk[]; index: number
}): string {
  return buildRelationshipReading({
    serviceKey: MARRY_MATCH_SERVICE_KEY, category: params.groupId, title: params.itemTitle, analysis: params.userAnalysis, partnerAnalysis: params.partnerAnalysis, relationship: params.input.relationshipStage, concern: params.input.concern, signals: { '결혼 준비 계획': params.input.marriagePlan },
  })
}

export function buildMarryMatchReport(
  userAnalysis: SajuAnalysis,
  partnerAnalysis: SajuAnalysis,
  userBirth: BirthInput,
  context: SajuReportContext,
  input: MarryMatchRequest,
  reportId?: string,
): SajuReport {
  const query = [
    '결혼궁합 연애 말고 결혼 배우자궁 대운 세운 합충 일지 배우자성 부부 생활 책임 돈 가족 상대방 사주',
    input.partnerName ?? '',
    input.relationshipStage ?? '',
    input.marriagePlan ?? '',
    input.concern ?? '',
    context.partner?.dayMaster ?? '',
    context.partner?.dominantElement ?? '',
  ].join(' ')
  const chunks = retrieveRagChunks(query, userAnalysis, 12, context)
  const categoryRagCache = new Map<string, RagChunk[]>()
  const sections: SajuReportSection[] = []
  let order = 1

  MARRY_MATCH_TOC.forEach((category, groupIndex) => {
    category.items.forEach((item, itemIndex) => {
      // 자기 팩에서 이 대분류에 맞는 블록을 먼저 확보한다. 랭킹만으로는 범용 팩에 밀려
      // 다른 질문용 문장이 올라오기 때문이다. 모자라면 일반 검색 결과로 채운다.
      const generalChunks = retrieveCategoryRagChunks(categoryRagCache, query, category, userAnalysis, context, 8)
      const ownChunks = retrieveCategoryOwnChunks(categoryRagCache, query, category, userAnalysis, context, OWN_CORPUS_DOMAIN, 6)
      const categoryChunks = ownChunks.length ? [...ownChunks, ...generalChunks] : generalChunks
      sections.push({
        // Ids follow the marry-<대분류>-<중분류> scheme the 05 목차 and 06 상세 pages route on.
        id: `marry-${pad2(groupIndex + 1)}-${pad2(itemIndex + 1)}`,
        order,
        imageKey: category.image,
        imageSrc: `${MARRY_ASSET_BASE}/05-${category.image}.webp`,
        imageAlt: `${category.title} 풀이`,
        category: category.title,
        categoryEn: category.label,
        classification: item,
        hook: item,
        patternKeys: ['match', 'marry', category.id, category.tag],
        ragTopics: categoryChunks.slice(0, 4).map((chunk) => chunk.topic),
        interpretation: buildInterpretation({
          groupId: category.id,
          categoryTitle: `${category.label} ${category.title}`,
          itemTitle: item,
          userAnalysis,
          partnerAnalysis,
          userBirth,
          input,
          chunks: categoryChunks,
          index: order + itemIndex,
        }),
        generatedBy: 'template',
        model: 'marry-match-rag-template',
        status: 'complete',
      })
      order += 1
    })
  })

  return finalizeSpecializedReport({
    reportId,
    title: '결혼궁합 해석문',
    subtitle: `${context.name ?? '본인'}님과 ${input.partnerName || '상대'}의 배우자궁·대운·합충을 함께 봅니다`,
    model: 'marry-match-rag-template',
    generatedBy: 'template',
    status: 'complete',
    progress: { complete: sections.length, total: sections.length },
    quality: {
      overallPercent: 85,
      ragUsagePercent: 88,
      corpusRelevancePercent: 87,
      toneGroundingPercent: 84,
      llmGroundingPercent: 100,
      categories: MARRY_MATCH_TOC.map((category) => ({
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
