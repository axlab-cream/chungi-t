import type { SajuAnalysis, SajuReportContext, SajuReportSection, SectionStorytelling } from '../types/index.js'

const ASSET_BASE = '/work/move/assets/work-move/reading-v2'

const IMAGES = [
  { key: 'work-move-decision', src: `${ASSET_BASE}/01-decision.webp`, alt: '현재 회사와 새 제안 사이에서 실제 조건을 비교하는 장면' },
  { key: 'current-company-signal', src: `${ASSET_BASE}/02-current-role-signal.webp`, alt: '현재 직장에서 반복되는 역할과 압박의 원인을 살피는 장면' },
] as const

const ELEMENTS: Array<[keyof SajuAnalysis['elementCount'], string, string]> = [
  ['wood', '나무', '새 일을 시작하고 성장 방향을 넓히는 힘'],
  ['fire', '불', '성과와 의사를 밖으로 드러내는 힘'],
  ['earth', '흙', '일상을 안정적으로 반복하고 버티는 힘'],
  ['metal', '쇠', '책임 범위와 우선순위를 분명히 나누는 힘'],
  ['water', '물', '정보를 읽고 변화에 맞춰 움직이는 힘'],
]

const LABELS: Record<string, Record<string, string>> = {
  decisionMode: {
    move_considering: '이직을 고민 중', offer_review: '오퍼를 받은 상태', resignation_timing: '퇴사 시점을 고민 중',
    internal_transfer: '부서 이동·직무 전환을 고민 중', job_search_start: '이력서부터 시작할지 고민 중',
  },
  currentCompanySignal: {
    role_blur: '역할이 흐림', authority_blur: '결정권이 애매함', boss_pressure: '상사 압박이 큼',
    peer_competition: '동료·경쟁 스트레스', recognition_gap: '인정받는 느낌이 부족함', burnout: '번아웃 신호가 있음',
  },
  workType: { office: '사무실 출근', hybrid: '하이브리드', remote: '원격 중심', shift: '교대·스케줄 근무', field: '현장·외근 중심', unknown: '아직 모름' },
  salaryFeeling: { clear_up: '확실히 상승', slight_up: '조금 상승', similar: '비슷함', down_for_growth: '성장을 위해 낮아져도 고려', unclear: '아직 불명확함' },
  priority: { money: '돈 조건', growth: '성장', mental: '회복 가능성', timing: '움직일 시점', people: '함께 일할 사람', stability: '안정감' },
  realityChecks: {
    resume_ready: '이력서·포트폴리오 정리', offer_terms_checked: '오퍼·계약 조건 확인',
    buffer_ready: '퇴사 전 현금 여유 확인', exit_script_ready: '퇴사·이동 대화 준비',
  },
}

function clean(value: unknown): string {
  return String(value ?? '').replace(/\r?\n/g, ' ').replace(/\|/g, '｜').trim()
}

function label(group: string, value: unknown): string {
  const key = clean(value)
  return LABELS[group]?.[key] || key
}

function particle(value: string, withBatchim: string, withoutBatchim: string): string {
  const last = value.charCodeAt(value.length - 1)
  return last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 !== 0 ? withBatchim : withoutBatchim
}

function elementName(key: keyof SajuAnalysis['elementCount']): string {
  return ELEMENTS.find(([value]) => value === key)?.[1] ?? '기운'
}

function inputRows(context: SajuReportContext): Array<[string, string, string]> {
  const move = context.workMove ?? {}
  const candidates: Array<[string, string, string]> = [
    ['지금 상태', label('decisionMode', move.decisionMode), '결정을 어디까지 진행했는지 확인'],
    ['현재 회사에서 걸리는 점', label('currentCompanySignal', move.currentCompanySignal), '장소를 바꿔도 반복될 문제인지 구분'],
    ['새 회사·직무', [clean(move.targetCompanyName), clean(move.targetRole)].filter(Boolean).join(' · '), '이름보다 실제 책임과 산출물을 확인'],
    ['근무 방식·위치', [label('workType', move.workType), clean(move.commuteLocation)].filter(Boolean).join(' · '), '매일 감당할 시간과 체력에 연결'],
    ['연봉·조건 체감', label('salaryFeeling', move.salaryFeeling), '보상과 늘어나는 책임을 함께 비교'],
    ['가장 중요한 것', label('priority', move.priority), '마지막 판단에서 양보하지 않을 항목'],
    ['마음에 걸리는 한 문장', clean(move.discomfortPoint), '설렘 뒤에 남은 위험 신호를 확인'],
  ]
  return candidates.filter(([, value]) => Boolean(value))
}

function pillarTable(analysis: SajuAnalysis): string {
  const p = analysis.fourPillars
  const rows = [
    ['태어난 해', `${elementName(p.year.stemElement)} · ${elementName(p.year.branchElement)}`, '처음 익힌 조직 반응과 주변의 영향'],
    ['태어난 달', `${elementName(p.month.stemElement)} · ${elementName(p.month.branchElement)}`, '회사에서 반복되는 책임과 일의 방식'],
    ['태어난 날', `${elementName(p.day.stemElement)} · ${elementName(p.day.branchElement)}`, '내가 압박을 받아들이고 결단하는 방식'],
    ['태어난 시간', `${elementName(p.hour.stemElement)} · ${elementName(p.hour.branchElement)}`, '앞으로 만들 커리어와 실행 방향'],
  ]
  return ['| 사주의 네 기둥 | 실제 기운 구성 | 이직 풀이에서 읽는 부분 |', '| --- | --- | --- |', ...rows.map((row) => `| ${row.join(' | ')} |`)].join('\n')
}

function elementReading(analysis: SajuAnalysis): string {
  const p = analysis.fourPillars
  const day = elementName(p.day.stemElement)
  const month = elementName(p.month.branchElement)
  const hour = elementName(p.hour.stemElement)
  const dominant = elementName(analysis.dominantElement)
  const weak = elementName(analysis.weakElement)
  const counts = ELEMENTS.map(([key, name]) => `${name} ${analysis.elementCount[key]}개`).join(', ')
  const relationship = p.day.stemElement === p.month.branchElement
    ? `태어난 날과 태어난 달에 ${day} 기운이 함께 있어, 내가 결단하는 방식과 직장에서 버티는 방식이 같은 방향으로 밀립니다. 한 번 책임을 맡으면 오래 끌고 가지만, 역할이 흐릴 때도 혼자 정리하려 들기 쉽습니다.`
    : `태어난 날의 ${day} 기운과 태어난 달의 ${month} 기운이 달라, 내가 원하는 일의 속도와 조직이 요구하는 방식이 어긋날 때 피로가 빠르게 쌓입니다.`
  return `네 기둥을 생활 언어로 풀면, 결단의 중심은 ${day}, 회사에서 반복되는 반응은 ${month}, 앞으로 만들 커리어는 ${hour} 기운입니다. ${relationship} 전체 분포는 ${counts}이며, 가장 강한 ${dominant}${particle(dominant, '은', '는')} 이미 충분히 쓰고 있습니다. 상대적으로 약한 ${weak} 기운은 새 회사에서 의식적으로 확인해야 할 부분입니다.`
}

function interpretation(index: number, analysis: SajuAnalysis | undefined, context: SajuReportContext): string {
  const move = context.workMove ?? {}
  const name = clean(context.name) || '고객'
  const state = label('decisionMode', move.decisionMode) || '회사 이동을 고민하는 상태'
  const signal = label('currentCompanySignal', move.currentCompanySignal) || '현재 회사에서 반복되는 불편'
  const role = clean(move.targetRole)
  const company = clean(move.targetCompanyName)
  const target = [company, role].filter(Boolean).join('의 ') || '새로운 회사와 역할'
  const priority = label('priority', move.priority) || '가장 중요하게 적어 준 조건'
  const concern = clean(move.discomfortPoint) || clean(context.concern) || '마음에 걸리는 지점'
  const workType = label('workType', move.workType)
  const commute = clean(move.commuteLocation)
  const salary = label('salaryFeeling', move.salaryFeeling)
  const reality = (move.realityChecks ?? []).map((value) => label('realityChecks', value)).filter(Boolean)
  const saju = analysis ? elementReading(analysis) : ''

  if (index === 0) {
    return [
      `[주요 포인트] ${name}님이 지금 ${state}${particle(state, '인', '인')} 이유는 단순히 새 회사가 좋아 보여서가 아닙니다. 현재 회사에서 “${signal}”이 반복되고, ${target}에서는 ${priority}을 지킬 수 있을 것이라는 기대가 동시에 커졌기 때문입니다.`,
      `그러나 지금 답을 가르는 지점은 이직 의지의 크기가 아니라 새 역할의 실제 범위입니다. ${role ? `“${role}”라는 직무명` : '제안받은 직무명'} 뒤에서 누가 일을 정하고, 어떤 결과물을 언제까지 내며, 성과를 누가 평가하는지가 선명해야 합니다. 책임은 늘어나는데 승인 권한이 그대로라면 장소만 바뀐 채 “${signal}”이 다시 나타날 수 있습니다.`,
      analysis ? `[사주와 생활을 함께 보면] ${saju}` : '',
      salary ? `연봉·조건은 “${salary}”으로 적었습니다. 숫자가 좋아 보여도 수습 기간, 성과급 조건, 업무 범위가 문서에 없으면 실제 보상은 아직 완성되지 않았습니다. ${priority}을 가장 중요하게 골랐다면, 그 항목이 말이 아니라 계약과 운영 방식으로 확인될 때 이번 이동의 장점이 살아납니다.` : '',
      `[확인할 장면] 다음 대화에서 첫 90일에 맡을 결과물 세 가지, 최종 승인자, 수정 요청이 들어오는 경로를 물어보세요. 세 답이 한 사람과 한 문서로 모이면 새 역할은 오래 갈 가능성이 커집니다. 답이 사람마다 다르면 지금의 찝찝함은 과민함이 아니라 실제 정보 부족입니다.`,
      `[결정 전에 물어볼 질문] “${concern}”을 없애 줄 권한과 지원이 새 회사에 실제로 있나요? 직무명이 바뀌는 만큼 결정권도 커지나요? 평가가 결과물로 정해지나요, 상사의 인상으로 정해지나요?`,
      `[해법] 지금은 막연한 기대보다 역할·권한·평가의 세 줄을 문서로 맞출 때입니다. 세 줄이 같은 방향을 가리키면 ${target}은 현실적인 다음 단계가 됩니다. 하나라도 비어 있으면 결정일보다 확인 질문이 먼저입니다.`,
    ].filter(Boolean).join('\n\n')
  }

  return [
    `[주요 포인트] “${signal}”은 회사를 옮기고 싶게 만든 표면의 이유이고, 더 깊은 원인은 ${name}님이 책임을 감당하는 방식과 회사가 일을 나누는 방식의 충돌입니다. 첫 번째 해석에서 새 역할의 조건을 봤다면, 이번에는 같은 피로가 새 회사에서도 반복될지 가릅니다.`,
    `${concern}이라고 직접 적은 문장에는 이미 핵심이 들어 있습니다. 불편이 특정 상사나 한 프로젝트에서만 생겼다면 환경을 바꿀 때 줄어들 수 있습니다. 반대로 보고선, 역할 범위, 인정 방식처럼 구조에서 생겼다면 새 회사의 운영 규칙까지 확인하지 않으면 이름만 다른 같은 문제가 이어집니다.`,
    analysis ? `[사주와 생활을 함께 보면] ${saju}` : '',
    [workType, commute].filter(Boolean).length ? `새 근무 조건은 ${[workType, commute].filter(Boolean).join(' · ')}입니다. 출근 방식의 이름보다 회의가 몰리는 날, 퇴근 뒤 연락 규칙, 이동 뒤 회복할 시간을 확인해야 합니다. 이 세 가지가 분명하면 새 환경이 체력을 깎는지 살리는지 구체적으로 판단할 수 있습니다.` : '',
    `[확인할 장면] 최근 한 달에서 가장 지쳤던 날을 하나 골라 보세요. 그날의 원인이 업무량인지, 결정권 부족인지, 사람 사이 조율인지 적은 뒤 새 회사에서는 누가 그 문제를 맡는지 물어보세요. 답이 없으면 같은 피로가 반복될 가능성이 높고, 책임자가 분명하면 환경을 바꿀 이유가 생깁니다.`,
    `[결정 전에 물어볼 질문] 보고 라인은 몇 단계인가요? 급한 수정은 누가 우선순위를 정하나요? 퇴근 뒤 요청에는 언제 답해야 하나요? ${reality.length ? `지금 확인된 준비는 ${reality.join(' · ')}입니다. 아직 비어 있는 항목은 결정 전에 채워야 합니다.` : '오퍼 조건과 퇴사 뒤 생활비 여유도 함께 확인해야 합니다.'}`,
    `[해법] 이번 이동의 답은 참을지 떠날지보다 반복되는 피로를 새 회사가 실제로 끊어 줄 수 있는지에 있습니다. 운영 규칙과 책임자가 분명하면 이동의 이유가 단단해집니다. 설명이 계속 달라지면 좋은 제안처럼 보여도 보류하는 편이 맞습니다.`,
  ].filter(Boolean).join('\n\n')
}

function stories(analysis: SajuAnalysis | undefined, context: SajuReportContext): [SectionStorytelling, SectionStorytelling] {
  const move = context.workMove ?? {}
  const rows = inputRows(context)
  const inputTable = ['| 확인 포인트 | 실제 입력 | 이 풀이에서 보는 이유 |', '| --- | --- | --- |', ...rows.map((row) => `| ${row.join(' | ')} |`)].join('\n')
  const checks = (move.realityChecks ?? []).map((value) => label('realityChecks', value)).filter(Boolean)
  return [
    {
      feel: clean(move.targetRole) ? `“${clean(move.targetRole)}”로 옮기면 지금의 답답함이 정말 달라질까요?` : '새 회사로 옮기면 지금의 답답함이 정말 달라질까요?',
      softBridge: `현재 회사에서 느낀 “${label('currentCompanySignal', move.currentCompanySignal) || '반복되는 불편'}”과 새 제안의 실제 책임을 나란히 놓으면, 설렘과 현실의 차이가 선명해집니다.`,
      tableMd: inputTable,
      tableCaption: '직접 입력한 이직 조건과 그 값이 이번 풀이에서 맡는 역할을 연결했습니다.',
      flowSteps: [
        { label: '1. 실제 역할', value: clean(move.targetRole) || '입력한 직무', note: '첫 90일 산출물 확인' },
        { label: '2. 권한과 평가', value: label('priority', move.priority) || '입력한 우선순위', note: '책임과 결정권이 함께 오는지 확인' },
        { label: '3. 계약 문서', value: label('salaryFeeling', move.salaryFeeling) || '입력한 조건', note: '말과 문서가 같은지 확인' },
      ],
      flowCaption: '입력한 제안을 결정으로 옮기기 전에 확인할 실제 순서입니다.',
      scene: '', actions: [], imagePrompt: { ko: '', en: '' },
    },
    {
      feel: `“${label('currentCompanySignal', move.currentCompanySignal) || '현재의 피로'}”는 회사를 바꾸면 끝날까요?`,
      softBridge: '한 번 힘들었던 장면을 업무량·권한·사람·회복 시간으로 나누면, 새 회사에서도 반복될 문제와 끊어낼 문제를 구분할 수 있습니다.',
      ...(analysis ? {
        tableMd: pillarTable(analysis),
        tableCaption: '한자를 노출하지 않고 네 기둥의 실제 기운 구성과 이직 풀이에서 맡는 역할을 연결했습니다.',
        chartPoints: ELEMENTS.map(([key, name, note]) => ({ label: name, value: analysis.elementCount[key], note })),
        chartCaption: '저장된 사주에서 계산한 다섯 기운의 개수입니다. 이직 성공률이 아니라 일할 때 쓰는 힘의 상대적 분포입니다.',
      } : {}),
      flowSteps: [
        { label: '현재 반복', value: label('currentCompanySignal', move.currentCompanySignal) || '입력한 불편', note: '가장 지쳤던 장면 한 가지' },
        { label: '새 회사의 답', value: clean(move.discomfortPoint) || '마음에 걸리는 지점', note: '책임자와 운영 규칙 질문' },
        { label: '결정 전 준비', value: checks.length ? checks.join(' · ') : '확인할 항목 정리', note: '확인된 사실만으로 판단' },
      ],
      flowCaption: '현재의 피로가 새 회사에서 반복되는지 확인하는 순서입니다.',
      scene: '', actions: [], imagePrompt: { ko: '', en: '' },
    },
  ]
}

export function workMoveTeaserPreview(context: SajuReportContext, sectionCount: number) {
  const move = context.workMove ?? {}
  const signal = label('currentCompanySignal', move.currentCompanySignal) || '현재 회사에서 반복되는 불편'
  const target = [clean(move.targetCompanyName), clean(move.targetRole)].filter(Boolean).join(' · ') || '새 회사와 역할'
  const priority = label('priority', move.priority) || '가장 중요한 조건'
  return {
    title: '나, 회사 옮겨도 될까?',
    headline: `${target}이 좋아 보여도, “${signal}”을 끊어 줄 조건이 있어야 옮길 이유가 생깁니다`,
    summary: `${priority}을 지키면서 지금의 피로를 반복하지 않으려면 새 역할의 책임·권한·평가가 같은 방향을 가리켜야 합니다. 입력한 회사 조건과 사주의 네 기둥을 겹쳐 그 차이를 먼저 짚었습니다.`,
    insights: [], signals: [],
    paidValue: `전체 해석에서는 ${sectionCount}개 항목으로 직무 적합성, 새 회사의 일상, 돈 조건, 이동 시점, 위험 신호와 90일 준비까지 이어서 풉니다.`,
  }
}

export function workMoveTeaserSection(section: SajuReportSection, index: number, analysis: SajuAnalysis | undefined, context: SajuReportContext): SajuReportSection {
  const story = stories(analysis, context)[index]
  const image = IMAGES[index]
  return {
    ...section,
    ...(image ? { imageKey: image.key, imageSrc: image.src, imageAlt: image.alt } : {}),
    interpretation: interpretation(index, analysis, context),
    // The stored full-report section can carry generic storytelling metadata. The teaser's
    // input-grounded table/chart/title must win so the public 1·2 readings match this user.
    storytelling: { ...(section.storytelling ?? {}), ...story },
  }
}
