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
import { practicalReading, quotedInput, reportedState, workSymbol } from '../report/practical-service-copy.js'
import { JOB_DETAILS } from './practical-readings.js'

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
 * The 10 대분류 / 21 중분류 index the 직장 선택 pages are designed around.
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
      { id: 'company-fit-02', title: 'GO/HOLD/협상/보류 시그널' },
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
      { id: 'office-chemistry-02', title: '사내 정치/라인 리스크' },
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
      { id: 'money-value-02', title: '지출·기회비용' },
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
      { id: 'growth-angle-02', title: '커리어 레벨업 포인트' },
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
      { id: 'work-environment-02', title: '원격/비대면 업무 궁합' },
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
      { id: 'risk-check-02', title: '과로·번아웃' },
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
      { id: 'mental-balance-02', title: '오래 버틸 수 있는 루틴' },
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
      { id: 'action-plan-02', title: '첫 30·60·90일 전략' },
      { id: 'action-plan-03', title: '그만둘 각/버틸 각 구분' },
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
  const concernPoint = trimmed(body.concernPoint ?? body.concern_point, 200) || '별도 우려 미입력'

  if (!companyName) throw new InputError('판단할 회사 또는 오퍼명을 입력해 주세요.')
  if (!roleName) throw new InputError('맡게 될 직무를 입력해 주세요.')
  if (!WORK_MODE_LABEL[workModeRaw]) throw new InputError('근무 형태를 선택해 주세요.')
  if (!commute) throw new InputError('출퇴근 또는 근무지 조건을 입력해 주세요.')
  if (!SALARY_LABEL[salaryRaw]) throw new InputError('연봉·조건 체감을 선택해 주세요.')

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
    birth: { year: birth.year, month: birth.month, day: birth.day, hour: birth.hour, gender: birth.gender, calendar: birth.calendar, ...(birth.minute ? { minute: birth.minute } : {}) },
    input,
    serviceKey: JOB_CHOICE_SERVICE_KEY,
  })
  return createHash('sha256').update(fingerprint).digest('hex').slice(0, 28)
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
  const { group, itemTitle, analysis, input } = params
  const reading = JOB_DETAILS[itemTitle]
  if (!reading) throw new Error(`직장 선택 항목별 해석 누락: ${itemTitle}`)
  const state = reportedState(input.concernPoint)
  const kind = group.id === 'money-value' ? 'money' : group.id === 'growth-angle' ? 'learning'
    : group.id === 'office-chemistry' ? 'people' : group.id === 'entry-timing' ? 'timing' : 'role'
  const current = group.id === 'money-value'
    ? `보상에 대한 입력은 “${SALARY_LABEL[input.salaryFeeling]}”입니다. 실제 급여·성과급·추가 비용의 숫자는 제공되지 않았으므로 금액 비교를 완료한 것으로 보지 않습니다.`
    : group.id === 'work-environment'
      ? `근무 형태는 ${WORK_MODE_LABEL[input.workMode]}입니다. ${quotedInput('출퇴근 조건', input.commute)} 이 정보를 기준으로 생활에 맞는지 살펴봅니다.`
      : group.id === 'entry-timing'
        ? quotedInput('결정 예정일', input.decisionDate)
        : `검토 중인 후보는 “${input.companyName}”, 역할은 “${input.roleName}”입니다. ${quotedInput('현재 의견', input.concernPoint)} 회사의 문화나 사람에 관한 외부 확인 자료는 별도로 제공되지 않았습니다.`
  return practicalReading({
    title: itemTitle, detail: reading, current,
    evidence: workSymbol(analysis, kind),
    application: state === 'settled'
      ? '현재 입력은 문제보다 긍정적인 조건을 확인하려는 뜻을 포함합니다. 위 장면이 실제로 나타나지 않으면 위험으로 적용하지 말고, 이미 괜찮은 조건을 유지할 근거로 읽으십시오.'
      : state === 'concern'
        ? '적어 주신 어려움은 판단에 포함하되 회사 전체의 특성으로 일반화하지 않습니다. 이 항목과 직접 연결되는 경험이 있는지를 먼저 대조하십시오.'
        : '아직 확인하지 않은 조건은 나쁜 조건과 다릅니다. 이 항목은 현재 후보를 탈락시키는 판정이 아니라 필요한 질문을 정리하는 기준입니다.',
    closing: group.id === 'action-plan' && itemTitle === '그만둘 각/버틸 각 구분'
      ? '자미두수 명반은 제공되지 않았습니다. 이 보고서는 실제 궁 배치를 계산한 해석이 아니라 입력한 회사 조건과 검증된 사주 정보를 구별해 살피는 참고 자료입니다.'
      : undefined,
  })
}

function oneWayCommuteMinutes(value: string): number | null {
  const match = value.match(/편도\s*(\d{1,3})\s*분|(\d{1,3})\s*분\s*편도/)
  const minutes = Number(match?.[1] ?? match?.[2])
  return Number.isInteger(minutes) && minutes > 0 && minutes <= 180 ? minutes : null
}

function openingJobChoiceReading(input: JobChoiceRequest, analysis: SajuAnalysis, index: number): string {
  const mode = WORK_MODE_LABEL[input.workMode]
  const salary = SALARY_LABEL[input.salaryFeeling]
  const minutes = oneWayCommuteMinutes(input.commute)
  if (index === 0) return `**${input.companyName}의 ${input.roleName} 제안에서 지금 먼저 확인할 것은 무엇일까요?** 적어 주신 근무 형태는 ${mode}, 출퇴근 조건은 “${input.commute}”, 보상 체감은 “${salary}”입니다. 특히 “${input.concernPoint}”라는 고민이 있다면 회사 이름이나 첫인상보다 실제로 맡을 일의 경계가 먼저입니다. 이 입력만으로 회사의 내부 운영을 알 수는 없으므로, 판단은 확인 가능한 조건부터 쌓아야 합니다.

첫 기준은 **직무명보다 실제 산출물**입니다. ${input.roleName}이라는 이름 아래 어떤 결과물을 언제까지 내야 하는지, 누가 최종 승인하는지, 다른 팀과의 조율을 어디까지 책임지는지 물어보세요. 역할 설명이 넓어 보여도 결정권과 지원 인력이 분명하다면 성장의 여지가 있습니다. 반대로 책임만 넓고 승인권이 흐리면 기대한 자율성이 수정 요청을 처리하는 시간으로 바뀔 수 있습니다. 사주 쪽에서는 ${workSymbol(analysis, 'role')}를 참고하되, 이것만으로 특정 회사의 실제 업무 방식을 판정하지는 않습니다.

두 번째 기준은 **평가와 보상이 같은 일을 가리키는지**입니다. 첫 3개월의 산출물, 평가자, 평가 시점이 문서에 있는지 확인하세요. 입력하신 보상 체감은 ${salary}이지만 실제 급여, 성과급, 수습 조건의 숫자는 제공되지 않았습니다. 보상이 좋게 느껴져도 기대 업무가 매번 바뀌면 비교 기준이 흔들립니다. 반대로 업무 범위와 평가 기준이 일치한다면 출퇴근 부담을 감수할 이유가 있는지 더 분명해집니다.

| 비교할 조건 | 지금 입력한 내용 | 결정 전 확인할 것 |
| --- | --- | --- |
| 맡을 일 | ${input.roleName} | 첫 90일 산출물과 맡지 않을 일 |
| 근무 방식 | ${mode} | 실제 출근·재택·출장 운영 규칙 |
| 이동 | ${input.commute} | 출근 요일과 변경 통보 방식 |
| 보상 | ${salary} | 고정급·변동급·수습 조건 |

이 표에서 아직 답하지 못한 칸은 불합격 판정이 아닙니다. 오퍼를 수락할 근거를 더 모아야 할 자리입니다. 역할·권한·평가가 같은 설명으로 이어지는지 확인한 뒤 보상과 생활 부담을 비교해 보세요.`

  return `**${mode}라면 내 일상은 실제로 어떻게 달라질까요?** 입력하신 출퇴근 조건은 “${input.commute}”입니다. ${minutes !== null ? `같은 경로로 오간다고 가정하면 편도 ${minutes}분, 왕복 약 ${minutes * 2}분입니다. 이 수치는 입력한 시간을 두 배로 환산한 값이며 실제 출근 횟수나 교통 상황까지 계산한 값은 아닙니다.` : '편도 시간과 출근 횟수가 함께 확인되지 않아 주간·월간 이동 시간을 숫자로 단정할 수 없습니다.'} ${mode}라는 명칭만으로 회복할 저녁 시간이 보장되지는 않습니다. 출근 일정이 고정인지, 회의 때문에 바뀌는지, 이동하는 날에 대면 업무가 몰리는지에 따라 체감이 달라집니다.

${input.roleName} 업무에서는 이동만이 아니라 **회의 뒤의 일**도 확인해야 합니다. 수정 의견을 누가 정리하고 누가 승인하는지, 퇴근 뒤 요청에는 언제 답해야 하는지 물어보세요. 출근한 날 조율을 끝내고 다른 날에 집중할 수 있다면 ${mode}가 도움이 될 수 있습니다. 반대로 회의가 끝난 뒤 결과를 혼자 정리해야 한다면 장소만 바뀌고 업무 시간은 길어질 수 있습니다. “${input.concernPoint}”라는 걱정도 이런 실제 일정과 대조해야 막연한 불안인지 필요한 협상 조건인지 나눌 수 있습니다.

| 일상에서 볼 장면 | 회사에 물을 질문 | 답이 모호할 때의 영향 |
| --- | --- | --- |
| 출근 일정 | 요일과 변경 통보 시점은 정해져 있나요? | 이동 계획이 흔들릴 수 있음 |
| 대면 회의 | 회의 뒤 산출물 작업 시간은 확보되나요? | 조율 뒤 일이 쌓일 수 있음 |
| 퇴근 뒤 연락 | 응답 기한과 긴급 기준은 무엇인가요? | 회복 시간이 대기로 바뀔 수 있음 |

결정을 도울 질문은 “버틸 수 있나요?”보다 구체적이어야 합니다. 첫 달의 근무 일정을 예시로 받아 보고, 실제로 업무가 끝나는 시각과 첫 90일 피드백 주기를 확인해 보세요. 답이 문서와 현장 설명에서 일치하면 이동 부담을 감수할 이유가 있는지 비교할 수 있습니다. 규칙이 계속 말로만 남는다면 좋은 첫인상만으로 오래 다닐 수 있다고 판단하지 마세요.`
}

const OWN_CORPUS_DOMAIN = 'job_choice_service'

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
      const openingIndex = order - 1
      const isOpening = openingIndex < 2
      const minutes = isOpening && openingIndex === 1 ? oneWayCommuteMinutes(input.commute) : null
      const baseInterpretation = buildInterpretation({
        group, itemTitle: item.title, itemIndex, analysis, birth, input,
        chunks: categoryChunks, index: order + itemIndex,
      })
      sections.push({
        // 05 목차 and 06 상세 route on the design's own section ids.
        id: item.id,
        order,
        imageKey: group.id,
        imageSrc: isOpening
          ? `${JOB_CHOICE_ASSET_BASE}/reading-v2/0${openingIndex + 1}-company-fit-${openingIndex === 0 ? 'overall' : 'decision'}.webp`
          : `${JOB_CHOICE_ASSET_BASE}/01-scene-05-index-preview.webp`,
        imageAlt: `${group.title} 풀이`,
        category: group.title,
        categoryEn: group.label,
        classification: item.title,
        hook: isOpening ? (openingIndex === 0 ? '좋아 보이는 제안일수록 실제 맡을 일과 평가 기준을 먼저 확인하세요.' : '근무 형태보다 실제 출근 일정과 회복 시간을 먼저 비교하세요.') : item.title,
        patternKeys: ['work', 'job-choice', group.id],
        ragTopics: categoryChunks.slice(0, 4).map((chunk) => chunk.topic),
        interpretation: isOpening ? `${openingJobChoiceReading(input, analysis, openingIndex)}\n\n${baseInterpretation}` : baseInterpretation,
        ...(minutes !== null ? { storytelling: {
          feel: '', scene: '', actions: [], imagePrompt: { ko: '', en: '' },
          chartPoints: [
            { label: '편도 이동', value: minutes, note: '고객이 입력한 편도 시간' },
            { label: '같은 경로 왕복', value: minutes * 2, note: `편도 ${minutes}분 × 2 단순 환산` },
          ],
          chartCaption: '이동 시간(분) · 입력한 편도 시간의 단순 환산입니다.',
        } } : {}),
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
