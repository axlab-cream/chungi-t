import type { SajuReport, SajuReportContext } from '../types/index.js'
import { relationshipState } from '../love/reading-content.js'

export interface ReportPreview {
  title: string
  headline: string
  summary: string
  insights: string[]
  signals: string[]
  paidValue: string
}

function excerpt(value: string, limit = 320): string {
  const text = value.replace(/^\[[^\]]+\]\s*/, '').trim()
  const sentences = text.match(/[^.!?。]+(?:[.!?。]+|$)/g) ?? []
  let result = ''
  for (const sentence of sentences) {
    if (result && (result + sentence).length > limit) break
    if (!result && sentence.length > limit) return '입력한 상황과 확인할 조건을 구분해 살펴봅니다.'
    result += sentence
  }
  return result.trim()
}

/** A small complete insight, frozen with the record; never expose paid paragraphs. */
export function guardPreview(preview: ReportPreview, context: SajuReportContext = {}): ReportPreview {
  if (!/love|couple|marry|match/.test(context.serviceKey ?? '')) return preview
  const state = relationshipState({ concern: context.concern, relationship: context.relationship, signals: { partner: context.partner?.relationship } })
  if (state !== 'boundary' && state !== 'unsafe') return preview
  const summary = state === 'boundary'
    ? '상대가 연락을 원하지 않는다는 의사를 밝혔으므로, 지금의 기준은 새 메시지를 보내는 것이 아니라 그 경계를 존중하는 데 있습니다. 마음을 추측하지 않고 내 일상을 회복할 선택부터 살펴보세요.'
    : '말씀하신 안전 문제는 관계를 되돌리는 방법보다 안전한 거리와 도움을 먼저 확인해야 할 상황입니다. 운세를 이유로 불편한 접촉이나 강요를 감수할 필요는 없습니다.'
  return { ...preview, headline: state === 'boundary' ? '연락하지 않고 마음을 정리할 기준' : '관계보다 먼저 지켜야 할 나의 안전', summary, insights: [summary], signals: [summary], paidValue: '전체 해석에서도 재접촉을 권하거나 상대 마음을 단정하지 않습니다. 감정을 정리하고 내 선택과 경계를 지키는 기준을 자세히 설명합니다. 결제는 연락이나 안전 문제를 해결하는 조건이 아닙니다.' }
}

export function createSavedPreview(report: SajuReport, context: SajuReportContext = {}): ReportPreview {
  if (context.serviceKey === 'newyear_flow' && context.newyear?.teaser) {
    const { headline, lines } = context.newyear.teaser
    return {
      title: report.title, headline, summary: lines[0] ?? headline,
      insights: lines.slice(1), signals: lines.slice(1),
      paidValue: `전체 해석에서는 ${context.newyear.targetYear}년 입춘 전환과 열두 달 월운, 일·돈·관계의 선택 기준을 10개 대분류 · ${report.sections.length}개 항목으로 자세히 확인합니다.`,
    }
  }
  const insights = report.sections.slice(0, 2).map((section) => excerpt(section.interpretation.split(/\n\s*\n/)[0] ?? section.hook)).filter(Boolean)
  const headline = report.sections[0]?.hook || report.title
  return guardPreview({
    title: report.title, headline, summary: insights[0] ?? '입력한 내용을 바탕으로 먼저 확인할 기준을 정리합니다.',
    insights, signals: insights,
    paidValue: `전체 해석에서는 ${report.sections.length}개 항목의 근거와 생활 사례, 지금 상황에 맞는 판단 기준을 확인할 수 있습니다.`,
  }, context)
}
