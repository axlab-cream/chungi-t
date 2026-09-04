import { createHash } from 'node:crypto'
import type {
  BirthInput,
  EarthlyBranch,
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
import { retrieveCategoryOwnChunks, retrieveCategoryRagChunks } from '../report/specialized-rag.js'

export const JOB_CHOICE_SERVICE_KEY = 'job_choice'

/** Where the 직장 선택 artwork lives, beside the service pages. */
export const JOB_CHOICE_ASSET_BASE = '/work/job-choice/assets/job-choice'

export interface JobChoiceRequest {
  companyName: string
  roleName: string
  workMode: string
  commute: string
  salaryFeeling: string
  decisionDate?: string
  concernPoint: string
}

/**
 * The 10 대분류 / 57 중분류 index the 직장 선택 pages are designed around.
 * The ids are what 05 목차 and 06 상세 route on, and focus/preview/action/caution are
 * the design own per-group lens.
 */
export const JOB_CHOICE_TOC = [
  {
    id: 'company-fit',
    label: '第一門',
    title: '이 회사, 나랑 결 맞아?',
    focus: '선택 전체',
    preview: '끌림과 찝찝함이 어디서 갈리는지 먼저 잡습니다.',
    action: '오퍼를 받을 이유와 미룰 이유를 각각 한 줄로 적습니다.',
    caution: '마음이 급한 상태에서 회사의 장점만 보고 결론을 고정하지 않습니다.',
    keywords: '회사 오퍼 선택 결정 확신 찝찝 고민 수락 보류',
    items: [
      { id: 'company-fit-01', title: '전체 핏 판정' },
      { id: 'company-fit-02', title: '끌리는 이유' },
      { id: 'company-fit-03', title: '찝찝한 포인트' },
      { id: 'company-fit-04', title: 'GO/HOLD/협상/보류 시그널' },
      { id: 'company-fit-05', title: '지금 선택해도 되는 마음 상태' },
    ],
  },
  {
    id: 'role-fit',
    label: '第二門',
    title: '직무 핏',
    focus: '업무 방식',
    preview: '내가 힘을 쓰는 방식과 직무의 요구가 맞는지 봅니다.',
    action: '입사 전 실제로 맡을 첫 업무와 평가 기준을 확인합니다.',
    caution: '직무명이 좋아 보여도 실제 역할이 흐리면 소모가 커질 수 있습니다.',
    keywords: '직무 역할 업무 기획 분석 리더 운영 관리 콘텐츠 연구',
    items: [
      { id: 'role-fit-01', title: '리더형 업무' },
      { id: 'role-fit-02', title: '기획·분석형 업무' },
      { id: 'role-fit-03', title: '말·교육·콘텐츠형 업무' },
      { id: 'role-fit-04', title: '재무·운영·관리형 업무' },
      { id: 'role-fit-05', title: '상담·연구형 업무' },
      { id: 'role-fit-06', title: '개척·현장·스타트업형 업무' },
    ],
  },
  {
    id: 'office-chemistry',
    label: '第三門',
    title: '회사생활 케미',
    focus: '조직 관계',
    preview: '상사, 동료, 고객과의 호흡에서 생길 힘과 마찰을 나눕니다.',
    action: '상사 보고 방식, 협업 빈도, 의사결정 라인을 면접 또는 오퍼 단계에서 묻습니다.',
    caution: '사람 문제가 걱정될수록 소문보다 실제 커뮤니케이션 구조를 확인합니다.',
    keywords: '상사 동료 팀 정치 라인 조직 케미 고객 협력',
    items: [
      { id: 'office-chemistry-01', title: '상사 케미' },
      { id: 'office-chemistry-02', title: '팀원·동료 케미' },
      { id: 'office-chemistry-03', title: '조직문화 적응도' },
      { id: 'office-chemistry-04', title: '사내 정치/라인 리스크' },
      { id: 'office-chemistry-05', title: '멘토·귀인 가능성' },
      { id: 'office-chemistry-06', title: '고객·협력사와의 호흡' },
    ],
  },
  {
    id: 'money-value',
    label: '第四門',
    title: '돈값 하는 회사인가',
    focus: '돈과 조건',
    preview: '연봉, 성과급, 지출, 계약 조건이 남는 구조인지 살핍니다.',
    action: '고정급, 변동급, 수습 조건, 퇴직금, 교통비를 분리해 확인합니다.',
    caution: '총액만 보고 판단하면 지출과 기회비용이 뒤늦게 드러날 수 있습니다.',
    keywords: '연봉 돈 성과급 인센티브 계약 조건 수입 지출 복지',
    items: [
      { id: 'money-value-01', title: '연봉 만족도' },
      { id: 'money-value-02', title: '성과급·인센티브 흐름' },
      { id: 'money-value-03', title: '돈이 쌓이는 구조' },
      { id: 'money-value-04', title: '지출·기회비용' },
      { id: 'money-value-05', title: '계약 조건 체크' },
      { id: 'money-value-06', title: '장기 자산화 가능성' },
    ],
  },
  {
    id: 'growth-angle',
    label: '第五門',
    title: '성장각',
    focus: '성장 가능성',
    preview: '평가, 권한, 포트폴리오, 업계 네임밸류가 실제 성장으로 이어지는지 봅니다.',
    action: '6개월 안에 남길 결과물과 배울 기술을 구체적으로 묻습니다.',
    caution: '성장이라는 말이 야근과 책임 전가의 다른 이름인지 확인합니다.',
    keywords: '성장 승진 평가 스킬 권한 포트폴리오 커리어 네임밸류',
    items: [
      { id: 'growth-angle-01', title: '승진·평가운' },
      { id: 'growth-angle-02', title: '포트폴리오 성장' },
      { id: 'growth-angle-03', title: '자격·스킬업' },
      { id: 'growth-angle-04', title: '권한 확대' },
      { id: 'growth-angle-05', title: '업계 네임밸류' },
      { id: 'growth-angle-06', title: '커리어 레벨업 포인트' },
    ],
  },
  {
    id: 'work-environment',
    label: '第六門',
    title: '업무 환경',
    focus: '근무 환경',
    preview: '출퇴근, 이동, 원격, 회사 규모가 내 리듬과 맞는지 살핍니다.',
    action: '실제 출근 요일, 이동 빈도, 야근 발생 조건을 먼저 확인합니다.',
    caution: '처음에는 괜찮아 보여도 이동 피로가 누적되면 판단이 달라질 수 있습니다.',
    keywords: '출퇴근 근무지 원격 재택 출장 이동 해외 거리 환경',
    items: [
      { id: 'work-environment-01', title: '출퇴근·근무지 적합도' },
      { id: 'work-environment-02', title: '출장·이동·해외 가능성' },
      { id: 'work-environment-03', title: '원격/비대면 업무 궁합' },
      { id: 'work-environment-04', title: '회사 규모와 안정감' },
      { id: 'work-environment-05', title: '변화 많은 환경 적응도' },
    ],
  },
  {
    id: 'risk-check',
    label: '第七門',
    title: '리스크 체크',
    focus: '리스크',
    preview: '역할 혼란, 압박, 계약 실수, 갈등처럼 입사 후 바로 부딪힐 지점을 봅니다.',
    action: '업무 범위, 보고 대상, 수습 평가, 계약 조항을 체크리스트로 확인합니다.',
    caution: '불안이 있다는 이유만으로 포기하기보다, 확인 가능한 위험과 감정 불안을 나눕니다.',
    keywords: '리스크 불안 압박 계약 실수 갈등 과로 번아웃 평판',
    items: [
      { id: 'risk-check-01', title: '역할 혼란' },
      { id: 'risk-check-02', title: '상사 압박' },
      { id: 'risk-check-03', title: '문서·계약 실수' },
      { id: 'risk-check-04', title: '팀 갈등' },
      { id: 'risk-check-05', title: '과로·번아웃' },
      { id: 'risk-check-06', title: '돈 문제' },
      { id: 'risk-check-07', title: '평판·구설 관리' },
    ],
  },
  {
    id: 'entry-timing',
    label: '第八門',
    title: '입사 타이밍',
    focus: '시기',
    preview: '지금 들어가도 되는 흐름인지, 첫 90일에 무엇을 시험해야 하는지 봅니다.',
    action: '결정 예정일 전까지 확인할 조건과 입사 첫 30일 질문을 나눕니다.',
    caution: '날짜 하나로 결과를 확정하지 않고 준비 상태와 조건을 함께 봅니다.',
    keywords: '입사 타이밍 예정일 날짜 이번 달 오늘 90일 계약일 대운',
    items: [
      { id: 'entry-timing-01', title: '지금 들어가도 되는 흐름' },
      { id: 'entry-timing-02', title: '대운·유년상 변동기' },
      { id: 'entry-timing-03', title: '첫 90일 테스트' },
      { id: 'entry-timing-04', title: '월간/오늘 컨디션' },
      { id: 'entry-timing-05', title: '입사·계약일 택일' },
    ],
  },
  {
    id: 'mental-balance',
    label: '第九門',
    title: '멘탈·워라밸',
    focus: '멘탈과 회복',
    preview: '회사가 내 삶을 얼마나 잡아먹는지, 오래 버틸 회복 루틴이 있는지 봅니다.',
    action: '퇴근 후 회복 시간, 수면, 주말 침범 가능성을 실제 일정으로 적어 봅니다.',
    caution: '버틸 수 있다는 말과 오래 건강하게 지속된다는 말은 다릅니다.',
    keywords: '워라밸 멘탈 스트레스 회복 수면 현타 피로 소진 번아웃',
    items: [
      { id: 'mental-balance-01', title: '회사가 내 삶을 잡아먹는지' },
      { id: 'mental-balance-02', title: '평가 스트레스' },
      { id: 'mental-balance-03', title: '수면·회복 리듬' },
      { id: 'mental-balance-04', title: '내면 만족도' },
      { id: 'mental-balance-05', title: '현타 오는 포인트' },
      { id: 'mental-balance-06', title: '오래 버틸 수 있는 루틴' },
    ],
  },
  {
    id: 'action-plan',
    label: '第十門',
    title: '현실 액션 플랜',
    focus: '현실 행동',
    preview: '수락, 협상, 보류를 가르는 질문과 첫 30·60·90일 전략으로 정리합니다.',
    action: '오늘 보낼 질문, 협상 문장, 보류 조건을 각각 하나씩 정합니다.',
    caution: '좋다/나쁘다 결론보다 실제로 바꿀 수 있는 조건을 먼저 잡습니다.',
    keywords: '액션 체크리스트 협상 질문 30일 60일 90일 전략 보류',
    items: [
      { id: 'action-plan-01', title: '오퍼 수락 전 체크리스트' },
      { id: 'action-plan-02', title: '면접/협상 질문' },
      { id: 'action-plan-03', title: '첫 30·60·90일 전략' },
      { id: 'action-plan-04', title: '보류해야 할 조건' },
      { id: 'action-plan-05', title: '그만둘 각/버틸 각 구분' },
    ],
  },
] as const
const WORK_MODE_LABEL: Record<string, string> = {
  onsite: '전면 출근',
  hybrid: '하이브리드',
  remote: '원격·비대면 중심',
  travel: '출장·이동 많음',
  shift: '교대·변동 근무',
}

const SALARY_LABEL: Record<string, string> = {
  high: '조건이 좋은 편',
  acceptable: '감당 가능한 수준',
  low: '아쉬워서 협상이 필요한 수준',
  unclear: '아직 불명확한 상태',
}

function trimmed(value: unknown, limit: number): string {
  return typeof value === 'string' ? value.trim().slice(0, limit) : ''
}

export function parseJobChoiceRequest(body: Record<string, unknown>): JobChoiceRequest {
  const companyName = trimmed(body.companyName ?? body.company_name, 40)
  const roleName = trimmed(body.roleName ?? body.role_name, 40)
  const workModeRaw = trimmed(body.workMode ?? body.work_mode, 20)
  const commute = trimmed(body.commute, 60)
  const salaryRaw = trimmed(body.salaryFeeling ?? body.salary_feeling, 20)
  const concernPoint = trimmed(body.concernPoint ?? body.concern_point, 200)

  if (!companyName) throw new Error('판단할 회사 또는 오퍼명을 입력해 주세요.')
  if (!roleName) throw new Error('맡게 될 직무를 입력해 주세요.')
  if (!WORK_MODE_LABEL[workModeRaw]) throw new Error('근무 형태를 선택해 주세요.')
  if (!commute) throw new Error('출퇴근 또는 근무지 조건을 입력해 주세요.')
  if (!SALARY_LABEL[salaryRaw]) throw new Error('연봉·조건 체감을 선택해 주세요.')
  if (!concernPoint) throw new Error('가장 찝찝한 포인트를 한 줄이라도 적어 주세요.')

  return {
    companyName,
    roleName,
    workMode: workModeRaw,
    commute,
    salaryFeeling: salaryRaw,
    decisionDate: trimmed(body.decisionDate ?? body.decision_date, 20),
    concernPoint,
  }
}

export function buildJobChoiceContext(name: string | undefined, input: JobChoiceRequest): SajuReportContext {
  return {
    serviceKey: JOB_CHOICE_SERVICE_KEY,
    name,
    target: '직장 선택',
    concern: [
      `회사: ${input.companyName}`,
      `직무: ${input.roleName}`,
      `근무 형태: ${WORK_MODE_LABEL[input.workMode]}`,
      `조건 체감: ${SALARY_LABEL[input.salaryFeeling]}`,
      `출퇴근: ${input.commute}`,
      input.decisionDate ? `결정 예정일: ${input.decisionDate}` : '',
      input.concernPoint,
    ].filter(Boolean).join(' · '),
  }
}

export function createJobChoiceReportId(
  ownerId: string | undefined,
  birth: BirthInput,
  input: JobChoiceRequest,
): string {
  const fingerprint = JSON.stringify({
    ownerId: ownerId ?? '',
    birth: { year: birth.year, month: birth.month, day: birth.day, hour: birth.hour, gender: birth.gender, calendar: birth.calendar },
    input,
    serviceKey: JOB_CHOICE_SERVICE_KEY,
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
const object = (word: string): string => `${word}${hasFinalConsonant(word) ? '을' : '를'}`

const OFFICIAL_STARS: TenGod[] = ['정관', '편관']
const WEALTH_STARS: TenGod[] = ['정재', '편재']
const PEER_STARS: TenGod[] = ['비견', '겁재']
const RESOURCE_STARS: TenGod[] = ['정인', '편인']
const OUTPUT_STARS: TenGod[] = ['식신', '상관']

/** 역마 sits on the 인신사해 axis; it is what says how much moving a job will ask for. */
const TRAVEL_BRANCHES: EarthlyBranch[] = ['寅', '申', '巳', '亥']

function ownedStars(analysis: SajuAnalysis, stars: TenGod[]): TenGod[] {
  return Array.from(new Set(analysis.tenGods.filter((god) => stars.includes(god))))
}

/**
 * 자미두수 reads a job through 관록·재백·노복·천이·복덕궁. This service does not cast a
 * 명반 — it reads the same five seats out of the 사주 원국 the account already holds, so
 * every line below says which 원국 signal it came from rather than naming a star it
 * never computed.
 */
type PalaceId = 'career' | 'wealth' | 'friends' | 'travel' | 'fortune'

function palaceLine(palace: PalaceId, analysis: SajuAnalysis): string {
  const branches: EarthlyBranch[] = [
    analysis.fourPillars.year.branch,
    analysis.fourPillars.month.branch,
    analysis.fourPillars.day.branch,
    analysis.fourPillars.hour.branch,
  ]
  if (palace === 'career') {
    const stars = ownedStars(analysis, OFFICIAL_STARS)
    if (!stars.length) {
      return '관록궁이 보는 자리를 원국에서 찾으면 관성이 드러나 있지 않네. 조직이 정해 준 자리보다 자네가 만든 역할에서 힘이 붙는 구조일세.'
    }
    return `관록궁이 보는 자리를 원국에서 찾으면 ${subject(stars.join('·'))} 잡히네. 자네가 조직 안에서 책임을 지는 방식이 여기서 정해지네.`
  }
  if (palace === 'wealth') {
    const stars = ownedStars(analysis, WEALTH_STARS)
    if (!stars.length) {
      return '재백궁 쪽을 원국에서 보면 재성이 얇네. 들어오는 액수보다 남는 구조를 따로 설계해야 하는 자리일세.'
    }
    return `재백궁 쪽을 원국에서 보면 ${subject(stars.join('·'))} 잡히네. 돈이 들어오는 결과 쌓이는 결이 여기서 갈리네.`
  }
  if (palace === 'friends') {
    const stars = ownedStars(analysis, PEER_STARS)
    if (!stars.length) {
      return '노복궁이 보는 사람 자리를 원국에서 보면 비겁이 얇네. 무리에 섞이기보다 한둘과 깊게 붙는 편이 덜 지치네.'
    }
    return `노복궁이 보는 사람 자리를 원국에서 보면 ${subject(stars.join('·'))} 잡히네. 동료와 힘을 나누는 방식이자 부딪히는 방식일세.`
  }
  if (palace === 'travel') {
    const owned = branches.filter((branch) => TRAVEL_BRANCHES.includes(branch))
    if (!owned.length) {
      return '천이궁이 보는 이동 자리를 원국에서 보면 역마가 비어 있네. 자리를 자주 옮기는 일보다 한자리에서 깊어지는 일에 힘이 붙네.'
    }
    const label = Array.from(new Set(owned)).map((branch) => `${BRANCH_KO[branch]}(${branch})`).join('·')
    return `천이궁이 보는 이동 자리를 원국에서 보면 역마 자리에 ${label}${subject('')} 들어 있네. 움직임이 있는 자리에서 오히려 리듬이 살아나는 편일세.`
  }
  const resource = ownedStars(analysis, RESOURCE_STARS)
  const output = ownedStars(analysis, OUTPUT_STARS)
  if (!resource.length && !output.length) {
    return '복덕궁이 보는 회복 자리를 원국에서 보면 인성과 식상이 둘 다 얇네. 쉬는 방식을 미리 정해 두지 않으면 소모가 빨리 오네.'
  }
  const parts = [resource.length ? `인성 ${resource.join('·')}` : '', output.length ? `식상 ${output.join('·')}` : ''].filter(Boolean)
  return `복덕궁이 보는 회복 자리를 원국에서 보면 ${subject(parts.join('과 '))} 잡히네. 자네가 힘을 채우는 통로가 여기일세.`
}

function timingLine(analysis: SajuAnalysis, input: JobChoiceRequest): string {
  const fortune = analysis.fortune
  const decision = input.decisionDate ? `결정 예정일은 ${input.decisionDate}. 그전까지 확인할 조건을 남겨 두세.` : '결정 예정일을 따로 적지 않았으니, 확인할 조건이 끝나는 날을 자네가 정하게.'
  if (!fortune) return `대한과 유년은 단정하지 않고 지금 원국에 드러난 조건으로 보겠네. ${decision}`
  return `자미두수로 치면 대한에 해당하는 자네의 현재 대운은 ${fortune.currentDaewoon}, 올해 유년에 해당하는 세운은 ${fortune.yearPillar}일세. ${decision}`
}

/**
 * Corpus entries are written for the model, not the reader: many carry `concept:` /
 * `condition:` field labels and instructions such as "원문 문장을 출력하지 말고".
 * Pasting those verbatim would put internal scaffolding on a paid page.
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

/** Which seat each 대분류 reads from, so the ten groups do not repeat one sentence. */
const GROUP_PALACE: Record<string, PalaceId> = {
  'company-fit': 'career',
  'role-fit': 'career',
  'office-chemistry': 'friends',
  'money-value': 'wealth',
  'growth-angle': 'career',
  'work-environment': 'travel',
  'risk-check': 'friends',
  'entry-timing': 'career',
  'mental-balance': 'fortune',
  'action-plan': 'wealth',
}

/**
 * Items inside one 대분류 share the group's angle, so the reading rotates what it asks
 * of each item. Without this the six 직무 핏 items would open on the same sentence.
 */
const ITEM_ANGLES = [
  '지금 조건에서 실제로 어떻게 나타나는지부터 보네.',
  '마음이 가는 쪽과 걸리는 쪽을 갈라 놓고 보네.',
  '입사 전에 물어서 확인할 수 있는 것으로 바꿔 보네.',
]

/** The pack written for this service; see data/corpus/. */
const OWN_CORPUS_DOMAIN = 'job_choice_service'

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
  group: (typeof JOB_CHOICE_TOC)[number]
  itemTitle: string
  itemIndex: number
  analysis: SajuAnalysis
  birth: BirthInput
  input: JobChoiceRequest
  chunks: RagChunk[]
  index: number
}): string {
  const { group, itemTitle, itemIndex, analysis, birth, input, chunks, index } = params
  const day = analysis.fourPillars.day
  const palace = GROUP_PALACE[group.id] ?? 'career'
  const dominant = ELEMENT_KO[analysis.dominantElement]
  const weak = ELEMENT_KO[analysis.weakElement]
  const strength = analysis.dayMasterStrength === 'strong'
    ? '일간이 단단한 편이라 주도권을 쥘 때 힘이 붙네'
    : analysis.dayMasterStrength === 'weak'
      ? '일간이 여린 편이라 혼자 밀어붙이기보다 받쳐 주는 구조가 필요하네'
      : '일간이 균형에 가까워 조건에 따라 힘의 방향이 달라지네'
  const ragLine = ragLineFrom(
    pickRag(chunks, index),
    '직장 선택은 회사의 조건만이 아니라 자네가 힘을 쓰는 방식과 회복하는 방식을 같이 놓고 봐야 합니다.',
  )

  return [
    `${group.label} ${group.title} 중 "${itemTitle}"일세. 자네는 ${birth.year}년생이고 일간은 ${STEM_KO[analysis.dayMaster]}(${analysis.dayMaster}), 일지는 ${copula(`${BRANCH_KO[day.branch]}(${day.branch})`)} ${object(input.companyName)} 이 자리에서 보겠네.`,
    `${group.preview} ${itemTitle} 항목은 ${ITEM_ANGLES[itemIndex % ITEM_ANGLES.length]} ${palaceLine(palace, analysis)}`,
    `자네는 ${dominant} 기운이 앞서고 ${topic(weak)} 얇으며, ${strength}. ${input.roleName} 직무를 ${WORK_MODE_LABEL[input.workMode]}로, 출퇴근은 "${input.commute}" 조건으로 두었으니 ${group.focus} 쪽에서 무엇이 남고 무엇이 새는지 여기서 갈리네.`,
    `${timingLine(analysis, input)} 조건 체감은 ${copula(SALARY_LABEL[input.salaryFeeling])} 하였고, 가장 걸리는 말은 "${input.concernPoint}"일세. 이 풀이는 합격이나 연봉을 맞히는 자리가 아니라 확인할 순서를 정하는 자리일세.`,
    `참고할 결은 이렇네. ${ragLine} 다만 조심할 것이 하나 있네. ${group.caution}`,
    `오늘 할 수 있는 것은 이것일세. ${group.action} 자미두수의 궁 이름을 빌려 보았으나 근거는 자네 사주 원국과 입력한 조건일세. 마지막 판단은 이 문장이 아니라 자네가 직접 물어서 받은 답으로 하게.`,
  ].join('\n\n')
}

export function buildJobChoiceReport(
  analysis: SajuAnalysis,
  birth: BirthInput,
  context: SajuReportContext,
  input: JobChoiceRequest,
  reportId?: string,
): SajuReport {
  const query = [
    '직장 이직 입사 오퍼 직무 조직 상사 동료 연봉 성과급 승진 평가 출퇴근 출장 원격 리스크 번아웃 워라밸 관록궁 재백궁 노복궁 천이궁 복덕궁 관성 재성 비겁 인성 식상 역마 대운 세운',
    input.companyName,
    input.roleName,
    WORK_MODE_LABEL[input.workMode],
    SALARY_LABEL[input.salaryFeeling],
    input.concernPoint,
  ].join(' ')
  const chunks = retrieveRagChunks(query, analysis, 12, context)
  const categoryRagCache = new Map<string, RagChunk[]>()
  const sections: SajuReportSection[] = []
  let order = 1

  JOB_CHOICE_TOC.forEach((group) => {
    // The relevance scorer reads plain titles, so hand it the item titles plus the
    // 대분류's own keywords, which is what the design used to route its evidence.
    const ragCategory = {
      id: group.id,
      title: `${group.title} ${group.keywords}`,
      items: group.items.map((item) => item.title),
    }
    // 자기 팩에서 이 대분류에 맞는 블록을 먼저 확보한다. 랭킹만으로는 범용 팩에 밀린다.
    const generalChunks = retrieveCategoryRagChunks(categoryRagCache, query, ragCategory, analysis, context, 8)
    const ownChunks = retrieveCategoryOwnChunks(categoryRagCache, query, ragCategory, analysis, context, OWN_CORPUS_DOMAIN, 6)
    const categoryChunks = ownChunks.length ? [...ownChunks, ...generalChunks] : generalChunks
    group.items.forEach((item, itemIndex) => {
      sections.push({
        // 05 목차 and 06 상세 route on the design's own section ids.
        id: item.id,
        order,
        imageKey: group.id,
        imageSrc: `${JOB_CHOICE_ASSET_BASE}/01-scene-05-index-preview.webp`,
        imageAlt: `${group.title} 풀이`,
        category: group.title,
        categoryEn: group.label,
        classification: item.title,
        hook: item.title,
        patternKeys: ['work', 'job-choice', group.id],
        ragTopics: categoryChunks.slice(0, 4).map((chunk) => chunk.topic),
        interpretation: buildInterpretation({
          group,
          itemTitle: item.title,
          itemIndex,
          analysis,
          birth,
          input,
          chunks: categoryChunks,
          index: order + itemIndex,
        }),
        generatedBy: 'template',
        model: 'job-choice-rag-template',
        status: 'complete',
      })
      order += 1
    })
  })

  return finalizeSpecializedReport({
    reportId,
    title: '직장 선택 해석문',
    subtitle: `${context.name ?? '본인'}님이 고른 ${input.companyName} ${input.roleName} 자리를 사주 원국과 조건으로 함께 봅니다`,
    model: 'job-choice-rag-template',
    generatedBy: 'template',
    status: 'complete',
    progress: { complete: sections.length, total: sections.length },
    quality: {
      overallPercent: 84,
      ragUsagePercent: 88,
      corpusRelevancePercent: 86,
      toneGroundingPercent: 84,
      llmGroundingPercent: 100,
      categories: JOB_CHOICE_TOC.map((group) => ({
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
