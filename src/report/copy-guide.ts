import type { SajuReport, SajuReportSection } from '../types/index.js'

const INTERNAL_COPY_REPLACEMENTS: Array<[RegExp, string]> = [
  [/RAG\s*근거는 이렇네\.?/gi, '참고 결은 이렇네.'],
  [/RAG/gi, '참고 자료'],
  [/코퍼스/gi, '참고 자료'],
  [/검색된 지식/gi, '참고 자료'],
  [/지식 블록/gi, '참고 자료'],
]

const EMPHASIS_LABEL = /^\[(주요 포인트|주목할 점|주의할 점|위험 신호|위기 신호|해법)\]/
const HOOK_FRAMES = [
  '지금 먼저 확인할 장면',
  '놓치기 쉬운 신호',
  '현실에서 드러나는 방식',
  '관계를 바꾸는 기준',
  '다음 선택의 기준',
]

function replaceInternalTerms(text: string): string {
  return INTERNAL_COPY_REPLACEMENTS.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), text).trim()
}

export function normalizeUserCopy(text: string): string {
  const paragraphs = replaceInternalTerms(text)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  if (paragraphs.length >= 2 && !EMPHASIS_LABEL.test(paragraphs[0])) {
    paragraphs[0] = `[주요 포인트] ${paragraphs[0]}`
  }

  const lastIndex = paragraphs.length - 1
  if (lastIndex >= 1 && !EMPHASIS_LABEL.test(paragraphs[lastIndex])) {
    paragraphs[lastIndex] = `[해법] ${paragraphs[lastIndex]}`
  }

  return paragraphs.join('\n\n')
}

export function consumerHook(classification: string, hook: string, order: number): string {
  const cleanClassification = classification.trim()
  const cleanHook = replaceInternalTerms(hook).replace(/[.!。]+$/, '').trim()
  if (cleanHook && cleanHook !== cleanClassification) return cleanHook
  const frame = HOOK_FRAMES[Math.max(0, order - 1) % HOOK_FRAMES.length]
  return `${cleanClassification} · ${frame}`
}

export function normalizeReportCopy(report: SajuReport): SajuReport {
  return {
    ...report,
    title: replaceInternalTerms(report.title),
    subtitle: replaceInternalTerms(report.subtitle),
    sections: report.sections.map((section: SajuReportSection) => ({
      ...section,
      hook: consumerHook(section.classification, section.hook, section.order),
      interpretation: normalizeUserCopy(section.interpretation),
      storytelling: section.storytelling,
    })),
  }
}
