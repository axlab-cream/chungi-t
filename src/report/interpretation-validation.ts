import type { SajuReportContext, SajuReportSection } from '../types/index.js'

export interface InterpretationReview { passed: boolean; issues: string[]; characters: number; paragraphs: number }

/** Deterministic safety/format checks, not a claim of semantic or predictive accuracy. */
export function reviewInterpretation(text: string, context: SajuReportContext, siblings: SajuReportSection[] = []): InterpretationReview {
  const issues: string[] = []
  const paragraphs = text.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean)
  if (text.trim().length < 1000) issues.push('해석이 너무 짧습니다. 질문의 답·근거·생활 사례·판단 기준을 충분히 설명하세요.')
  if (paragraphs.length < 5) issues.push('의미 단락을 최소 5개로 나누고 근거와 사례를 구분하세요.')
  if (/\b(?:concept|condition|interpretation|serviceKey|main_purpose|desk_position|Feature JSON)\s*[:=]|상담 의도:|\d+점 번들|\bhot\/dry\b/i.test(text)) issues.push('내부 필드나 타 서비스 원문이 노출되었습니다.')
  if (/편재이|당신로|읽겠요|찾겠요|잡요|적었요|보았요|결를|년["”']?라\s|자시을/.test(text)) issues.push('조사 또는 종결어미를 바로잡으세요.')
  if (/바람기 레이더|반드시 (?:합격|이별|결혼)|외도를 (?:합니다|할|확인)/.test(text)) issues.push('확인되지 않은 사건을 단정하거나 외도 탐지처럼 표현하지 마세요.')
  if (/(?:이기는|합격하는) (?:사람|시험)|승부는[^.\n]{0,130}갈리/.test(text)) issues.push('행동이나 운이 승패를 결정한다고 단정하지 말고 실력 재현에 도움이 될 수 있는 조건으로 설명하세요.')
  if (new Set(paragraphs).size < paragraphs.length) issues.push('같은 문단이 중복되었습니다.')
  const prior = new Set(siblings.flatMap((item) => item.interpretation.split(/\n\s*\n/)).map((part) => part.replace(/^\[[^\]]+\]\s*/, '').trim()).filter((part) => part.length > 100))
  if (paragraphs.filter((part) => prior.has(part.replace(/^\[[^\]]+\]\s*/, '').trim())).length >= 2) issues.push('다른 항목의 문단을 반복하지 말고 현재 질문에 고유한 답을 쓰세요.')
  const input = JSON.stringify(context)
  if (/차단|연락.{0,10}(?:원하지|거부|하지 말)|접촉.{0,8}금지/.test(input)
      && /(?:부담 없는|가벼운|한 번|먼저).{0,20}(?:연락|확인.{0,5}건네|메시지).{0,20}(?:보내|건네|해보|해 보)/.test(text)) issues.push('명시적 연락 거부가 있으므로 재접촉을 제안하지 마세요.')
  // A bare Chinese word without a nearby reading/explanation is not accessible prose.
  for (const match of text.matchAll(/[一-龥]{2,}/g)) {
    const at = match.index ?? 0
    if (!/[가-힣]\($/.test(text.slice(Math.max(0, at - 20), at)) && !/^[（(][가-힣]/.test(text.slice(at + match[0].length))) {
      issues.push('한자 단독 표기를 한글 독음과 쉬운 뜻으로 설명하세요.')
      break
    }
  }
  return { passed: issues.length === 0, issues, characters: text.length, paragraphs: paragraphs.length }
}

export class InterpretationQualityError extends Error {
  constructor(public readonly review: InterpretationReview) {
    super(review.issues.join(' '))
    this.name = 'InterpretationQualityError'
  }
}
