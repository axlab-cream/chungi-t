import type { SajuReport, SajuReportSection } from '../types/index.js'

const INTERNAL_COPY_REPLACEMENTS: Array<[RegExp, string]> = [
  [/RAG\s*근거는 이렇네\.?/gi, '참고 결은 이렇네.'],
  [/RAG/gi, '참고 자료'],
  [/코퍼스/gi, '참고 자료'],
  [/검색된 지식/gi, '참고 자료'],
  [/지식 블록/gi, '참고 자료'],
]

const EMPHASIS_LABEL = /^\[[^\]]+\]/
const TERM_GLOSSARY: Array<[string, string]> = [
  ['일간', '日干, 태어난 날을 나타내는 두 글자 중 첫 글자'], ['일지', '日支, 태어난 날을 나타내는 두 글자 중 둘째 글자'],
  ['원국', '原局, 생년월일시의 네 기둥을 묶은 기본 구조'], ['명식', '命式, 생년월일시를 전통 기호로 나타낸 구조'],
  ['월주', '月柱, 태어난 달의 기둥'], ['년주', '年柱, 태어난 해의 기둥'], ['시주', '時柱, 태어난 시각의 기둥'],
  ['대운', '大運, 전통 명리에서 보는 약 10년 단위 흐름'], ['세운', '歲運, 한 해의 흐름'],
  ['오행', '五行, 목·화·토·금·수의 다섯 상징'], ['십성', '十星, 나를 나타내는 기운과 다른 기운의 관계를 열 가지로 나눈 체계'],
  ['용신', '用神, 명식의 균형을 위해 중요하게 보는 기운'], ['기신', '忌神, 균형에 부담을 주는 것으로 해석하는 기운'],
  ['관성', '官星, 정관과 편관을 묶어 역할·책임 등을 살피는 관계'], ['재성', '財星, 정재와 편재를 묶어 자원·현실 활동 등을 살피는 관계'],
  ['인성', '印星, 정인과 편인을 묶어 배움·받아들임 등을 살피는 관계'], ['식상', '食傷, 식신과 상관을 묶어 표현·결과물 등을 살피는 관계'],
  ['비겁', '比劫, 비견과 겁재를 묶어 동료·자기 기준 등을 살피는 관계'],
  ['도화', '桃花, 매력과 주목을 살피는 전통적 상징'], ['지장간', '支藏干, 지지 안에 포함된 천간'],
  ['조후', '調候, 계절의 차고 더움·건조함과 습함을 살피는 관점'],
  ['신강', '身强, 일간을 돕는 기운이 상대적으로 강한 구조'], ['신약', '身弱, 일간을 돕는 기운이 상대적으로 약한 구조'],
]

/** Each independently opened chapter explains the first technical term it uses. */
export function explainFirstTerms(text: string): string {
  const meanings = new Map(TERM_GLOSSARY)
  const explained = new Set<string>()
  // Match only the original prose once. Inserted definitions must never be re-expanded.
  const pattern = new RegExp(`(${TERM_GLOSSARY.map(([term]) => term).sort((a, b) => b.length - a.length).join('|')})(\\s*\\([^()]*\\))?`, 'g')
  return text.replace(pattern, (whole: string, term: string, parenthesis: string | undefined, offset: number) => {
    if (explained.has(term)) return whole
    const before = text.slice(0, offset)
    const after = text.slice(offset + whole.length)
    // Keep quoted user input, compound nouns (인성검사), and existing explanatory parentheses intact.
    if ((before.match(/[“”]/g)?.length ?? 0) % 2 || before.lastIndexOf('(') > before.lastIndexOf(')')) return whole
    if (/[가-힣]$/.test(before) || (!parenthesis && /^[가-힣]/.test(after) && !/^(?:은|는|이|가|을|를|의|과|와|에서|에|으로|로|도|만|부터|보다|처럼|이라|라고|입니다|인데)/.test(after))) return whole
    if (term === '인성' && !parenthesis && !/^(?:은|는)?\s*(?:전통|명리|배움|정인|편인)/.test(after)) return whole
    if (parenthesis && /[가-힣]/.test(parenthesis)) { explained.add(term); return whole }
    explained.add(term)
    return `${term}(${meanings.get(term)})`
  })
}
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
  const paragraphs = explainFirstTerms(replaceInternalTerms(text))
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  if (paragraphs.length >= 2 && !EMPHASIS_LABEL.test(paragraphs[0])) {
    paragraphs[0] = `[주요 포인트] ${paragraphs[0]}`
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
