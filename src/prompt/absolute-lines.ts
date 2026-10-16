import { normalizeServiceKey } from './service-system.js'

/**
 * 단정 규칙 3층(2026-10-16 결정, analysis/stage4-plan.html ①).
 *
 * 1층 공통 절대 선: 어떤 말투·단정 수준이어도 하지 않는 것. 말이 틀렸을 때 몸·돈·법·다른 사람의 안전에
 *     실제 피해가 나는 영역이다. 1~5·7번은 모든 서비스, 6·8·9·10번은 그 주제를 다루는 서비스에만 붙는다.
 * 2층 단정 수준: 성격·일·돈 버는 방식·연애 패턴·운의 흐름을 얼마나 딱 잘라 말하나. 서비스마다 값 하나.
 * 3층 말투: 서비스별 말투 규약(service-voice-contracts.ts, tone-v2/generated/services).
 *
 * 천명사주부터 켠다. 다른 서비스로 넓힐 때는 ABSOLUTE_LINE_SERVICES 와 ASSERTION_LEVELS 에 키만 더한다.
 * 2번(마음 위기)의 실제 장치는 src/safety/crisis-signal.ts 다 — 여기서는 지시 한 줄만 둔다.
 */

export interface AbsoluteLine {
  no: number
  title: string
  /** AI 에게 주는 한 줄 */
  rule: string
  /** 비어 있으면 모든 서비스, 있으면 그 서비스에만 */
  services?: string[]
}

export const ABSOLUTE_LINES: AbsoluteLine[] = [
  { no: 1, title: '건강', rule: '질병 진단·치료 보장·수명·사망 시기를 말하지 않는다. 몸의 이상은 사주 탓으로 돌리지 않고 진료를 권한다.' },
  { no: 2, title: '마음 위기', rule: '자해·극단 선택 신호가 보이면 운세로 풀지 않고 도움 받을 곳을 먼저 안내한다.' },
  { no: 3, title: '법률 판단', rule: '계약·노동·소송의 법적 결과를 확정하지 않는다. 전문가 확인을 권한다.' },
  { no: 4, title: '금융 행동', rule: '특정 투자·대출·세금·부동산 매매를 하라·말라고 지시하지 않고, 수익·금액·재산 규모를 보장하거나 확정하지 않는다.' },
  { no: 5, title: '타인 안전', rule: '차단·거부를 무시한 연락, 몰래 확인·감시, 질투·집착을 이용한 조작을 권하지 않는다.' },
  { no: 6, title: '실존 타인의 비행', rule: '실제로 있는 상대의 외도·사기·거짓말·속마음을 사실처럼 단정하지 않는다.', services: ['saju_master', 'love_this_year', 'love_mind', 'love_again', 'love_spouse', 'couple_signal', 'match_couple', 'marry_match'] },
  { no: 7, title: '차별', rule: '직업 귀천, 성별 고정 역할, 성적 지향 추정, 외모·가난 비하를 쓰지 않는다. 연애 상대의 성별은 입력된 관계 기준을 따른다.' },
  { no: 8, title: '약자 보호', rule: '동물·아동 학대나 방치를 정당화하지 않고, 아픈 원인을 궁합 탓으로 돌리지 않는다.', services: ['cat_compatibility'] },
  { no: 9, title: '구매 유도', rule: '물건·부적을 사야 운이 열린다거나, 흉지 공포로 이사·구매를 권하지 않는다.', services: ['saju_master', 'lucky_color', 'home_fit'] },
  { no: 10, title: '성인 내용', rule: '성향·궁합은 신체·행위 묘사 없는 수준까지만 쓰고, 미성년·비동의·불법 행위는 다루지 않는다.', services: ['saju_master'] },
]

export type AssertionLevel = 'reserved' | 'pdf'

/** 2층 단정 수준. 없는 서비스는 'reserved'(지금까지의 보류 말투). */
const ASSERTION_LEVELS: Record<string, AssertionLevel> = {
  saju_master: 'pdf',
}

/** 1층 절대 선 지시와 검사를 켠 서비스. */
const ABSOLUTE_LINE_SERVICES = new Set(['saju_master'])

export function assertionLevel(serviceKey?: string | null): AssertionLevel {
  return ASSERTION_LEVELS[normalizeServiceKey(serviceKey)] ?? 'reserved'
}

export function absoluteLinesEnabled(serviceKey?: string | null): boolean {
  return ABSOLUTE_LINE_SERVICES.has(normalizeServiceKey(serviceKey))
}

export function absoluteLinesFor(serviceKey?: string | null): AbsoluteLine[] {
  const key = normalizeServiceKey(serviceKey)
  return ABSOLUTE_LINES.filter((line) => !line.services || line.services.includes(key))
}

const PDF_ASSERTION = [
  '단정 수준(이 서비스): 원국·대운·세운으로 성격, 일하는 방식, 돈을 벌고 쓰는 방식, 연애 패턴, 운이 바뀌는 시기는 딱 잘라 말한다. "넌 이런 사람이야", "이 시기에 판이 바뀌어"처럼 쓴다.',
  '사주 해석 문장에 "~일 수 있어", "~할 가능성이 있어", "단정할 수 없지만" 같은 보류를 붙이지 않는다. 보류는 고객이 적지 않은 사실(지금 회사 사정, 상대의 실제 마음, 실제로 있었던 일)에만 쓴다.',
  '공통 규칙의 보류·예측 금지 문구 중 아래 절대 선에 없는 것은 이 단정 수준이 우선한다. 절대 선은 어떤 경우에도 지킨다.',
  '사건이 일어나는 날짜·금액을 정해 말하지 않는다. 시기는 "판이 바뀌는 해", "기댈 데가 생기는 해"처럼 흐름으로 말한다.',
  '이 규칙들을 고객 글에 설명하지 않는다. "속마음은 사주로 정할 수 없어", "이건 예언이 아니야" 같은 안내문을 넣지 말고, 지킬 것은 말하지 않는 것으로 지킨다.',
]

/** 리포트 시스템 프롬프트 끝에 붙는 3층 규칙 블록. 켠 서비스가 아니면 빈 문자열. */
export function absoluteLinesPrompt(serviceKey?: string | null): string {
  if (!absoluteLinesEnabled(serviceKey)) return ''
  const lines = absoluteLinesFor(serviceKey).map((line) => `${line.no}. ${line.title}: ${line.rule}`)
  return [
    '공통 절대 선(어떤 말투·단정 수준에서도 지킴):',
    ...lines,
    ...(assertionLevel(serviceKey) === 'pdf' ? ['', ...PDF_ASSERTION] : []),
  ].join('\n')
}
