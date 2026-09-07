import type { SajuAnalysis } from '../types/index.js'
import { ELEMENT_KO, STEM_KO } from '../saju/analyzer-helpers.js'

/** Human-authored section seeds. A seed is not a substitute for the paid, validated reading. */
export interface ReadingDetail {
  answer: string
  scene: string
  action: string
}

export function detail(answer: string, scene: string, action: string): ReadingDetail {
  return { answer, scene, action }
}

export function quotedInput(label: string, value?: string): string {
  return value?.trim() ? `${label}: “${value.trim()}”라고 적어 주셨습니다.` : `${label}에 관한 구체적인 정보는 아직 없습니다.`
}

/** Absence of a complaint is not evidence that there is a problem, nor proof everything is fine. */
export function reportedState(text: string): 'settled' | 'concern' | 'unknown' {
  const value = text.trim()
  if (!value) return 'unknown'
  const remaining = value.replace(/(?:문제|불편|고민|소진|과소비|갈등|스트레스|연체)\s*(?:가|은|는|이)?\s*(?:없\S*|크지 않\S*)/g, '')
  if (/연체|적자|과소비|갈등|괴롭|힘들|불안|불만족|만족.{0,5}(?:않|못)|소진|고통|잠을 못|부담이 크|회복되지/.test(remaining)) return 'concern'
  if (/없음|문제\s*없|불편\s*없|소진\s*없|만족|안정|잘\s*(?:유지|지내|모으)|예산대로|자동저축|좋음|좋아요/.test(value)) return 'settled'
  return 'unknown'
}

export function elementEvidence(analysis: SajuAnalysis): string {
  const counts = analysis.elementCount
  const spread = `목 ${counts.wood}·화 ${counts.fire}·토 ${counts.earth}·금 ${counts.metal}·수 ${counts.water}`
  return `오행(五行, 목·화·토·금·수의 다섯 상징)의 계산 분포는 ${spread}입니다. 가장 적게 집계된 ${ELEMENT_KO[analysis.weakElement]}도 ${counts[analysis.weakElement]}개로 읽습니다. 겉에 드러난 개수와 명식 전체의 작용은 다르므로, 적다는 이유만으로 생활의 결함이나 필요한 색을 정하지 않습니다.`
}

export function workSymbol(analysis: SajuAnalysis, kind: 'role' | 'money' | 'learning' | 'people' | 'timing'): string {
  const vocabulary = {
    role: ['관성(官星, 조직의 역할과 책임을 살피는 상징)', ['정관', '편관'], '권한과 책임이 실제로 맞물리는지'],
    money: ['재성(財星, 보상과 자원 활용을 살피는 상징)', ['정재', '편재'], '보상이 언제 어떤 조건으로 지급되는지'],
    learning: ['인성(印星, 배움과 지원을 살피는 상징)', ['정인', '편인'], '배울 시간과 피드백이 실제로 주어지는지'],
    people: ['비겁(比劫, 나와 타인의 협력·경쟁을 살피는 상징)', ['비견', '겁재'], '관계 속에서 비용과 책임을 어떻게 나누는지'],
    timing: ['식상(食傷, 생각을 표현하고 결과로 만드는 방식을 살피는 상징)', ['식신', '상관'], '준비한 내용이 확인 가능한 결과물로 남았는지'],
  } as const
  const [term, stars, question] = vocabulary[kind]
  const present = analysis.tenGods.filter((star) => (stars as readonly string[]).includes(star))
  const signal = present.length ? `제공된 십성(十星, 일간을 기준으로 다른 기운과의 관계를 나눈 열 가지 분류) 요약에는 ${[...new Set(present)].join('·')} 항목이 이 묶음에 들어갑니다.` : '제공된 십성(十星, 일간을 기준으로 다른 기운과의 관계를 나눈 열 가지 분류) 요약에는 이 묶음이 따로 나타나지 않습니다. 그것이 명식 전체에 전혀 없다는 뜻은 아닙니다.'
  return `전통 명리에서 ${term}을 참고합니다. ${signal} 이 상징은 ${question} 돌아보는 질문으로 사용합니다. 성향이나 결과를 이 값 하나로 판정하지 않고, 아래의 실제 장면이 확인될 때만 해석을 연결합니다.`
}

export function practicalReading(params: {
  title: string
  detail: ReadingDetail
  current: string
  evidence?: string
  application?: string
  closing?: string
}): string {
  const { title, detail: reading, current, evidence, application, closing } = params
  return [
    `[주요 포인트] ${title}. ${reading.answer}`,
    current,
    evidence,
    `[확인할 장면] ${reading.scene}`,
    application,
    `[해법] ${reading.action}`,
    closing,
  ].filter(Boolean).join('\n\n')
}

export function dayMasterDefinition(analysis: SajuAnalysis): string {
  return `일간(日干, 태어난 날의 천간)은 ${STEM_KO[analysis.dayMaster]}(${analysis.dayMaster})입니다.`
}
