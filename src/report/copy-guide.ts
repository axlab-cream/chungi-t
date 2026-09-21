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
  ['일간', '태어난 날의 기준 기운'], ['일지', '태어난 날의 생활 바탕'],
  ['원국', '태어난 때의 기본 구조'], ['명식', '생년월일시를 전통 기호로 정리한 표'],
  ['월주', '태어난 달의 기둥'], ['년주', '태어난 해의 기둥'], ['시주', '태어난 시각의 기둥'],
  ['대운', '약 10년 단위로 보는 큰 흐름'], ['세운', '한 해의 흐름'],
  ['오행', '목·화·토·금·수의 다섯 상징'], ['십성', '기운 사이의 관계를 열 가지로 나눈 방식'],
  ['용신', '균형을 위해 중요하게 보는 기운'], ['기신', '균형에 부담을 줄 수 있다고 보는 기운'],
  ['관성', '역할과 책임을 살피는 관계'], ['재성', '자원과 현실 활동을 살피는 관계'],
  ['인성', '배움과 받아들임을 살피는 관계'], ['식상', '표현과 결과물을 살피는 관계'],
  ['비겁', '동료와 자기 기준을 살피는 관계'],
  ['도화', '매력과 주목을 살피는 전통 상징'], ['지장간', '땅의 기호 안에 담긴 기운'],
  ['조후', '계절의 차고 더움과 습도를 살피는 관점'],
  ['신강', '나를 돕는 기운이 상대적으로 강한 구조'], ['신약', '나를 돕는 기운이 상대적으로 약한 구조'],
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
  return text.split(/(“[^”]*”|「[^」]*」|"[^"\n]*")/g).map((part, index) => {
    if (index % 2 === 1) return part
    return INTERNAL_COPY_REPLACEMENTS.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), part)
  }).join('').trim()
}

/** 사용자 인용은 보존하고, 서술자가 쓴 한자 표기만 고객 화면에서 제거한다. */
function removeNarratorHanja(text: string): string {
  return text.split(/(“[^”]*”|「[^」]*」|"[^"\n]*")/g).map((part, index) => {
    if (index % 2 === 1) return part
    return part
      .replace(/[一-龥]+/g, '')
      .replace(/\(\s*[,，]\s*/g, '(')
      .replace(/\(\s*\)/g, '')
      .replace(/[ \t]{2,}/g, ' ')
  }).join('')
}

const EASY_TEASER_REPLACEMENTS: Array<[RegExp, string]> = [
  [/(?<![가-힣])십성\s*\([^()]*\)/g, '열 가지 관계'],
  [/기운의 균형\([^()]*\)(?:·기운의 균형\([^()]*\))?/g, '기운의 강약'],
  [/역할과 책임의 흐름\([^()]*\)/g, '역할과 책임의 흐름'],
  [/표현과 결과의 흐름\([^()]*\)/g, '표현과 결과의 흐름'],
  [/태어난 때의 기본 구조\([^()]*\)/g, '태어난 때의 기본 구조'],
  [/태어난 날의 기준 기운\([^()]*\)/g, '태어난 날의 기준 기운'],
  [/커리어\s*핏/gi, '직장 적합도'], [/관계\s*DNA/gi, '관계 습관'], [/레드\s*플래그/gi, '주의 신호'],
  [/그린\s*플래그/gi, '좋은 신호'], [/인사이트/gi, '핵심 내용'], [/솔루션/gi, '해결 방법'],
  [/컨디션/gi, '상태'], [/밸런스/gi, '균형'], [/타이밍/gi, '시점'],
  [/(?<![가-힣])일간(?=(?:은|는|이|가|을|를|의|과|와|에서|에|으로|로|도|만|부터|보다|처럼|이라|라고|입니다|인데|[,.!?。()\s]|$))/g, '태어난 날의 기준 기운'],
  [/(?<![가-힣])대운(?=(?:은|는|이|가|을|를|의|과|와|에서|에|으로|로|도|만|부터|보다|처럼|이라|라고|입니다|인데|[,.!?。()\s]|$))/g, '큰 흐름'],
  [/(?<![가-힣])오행(?=(?:은|는|이|가|을|를|의|과|와|에서|에|으로|로|도|만|부터|보다|처럼|이라|라고|입니다|인데|[,.!?。()\s]|$))/g, '다섯 기운'],
  [/(?<![가-힣])(?:명식|원국)(?=(?:은|는|이|가|을|를|의|과|와|에서|에|으로|로|도|만|부터|보다|처럼|이라|라고|입니다|인데|[,.!?。()\s]|$))/g, '태어난 때의 기본 구조'],
  [/(?<![가-힣])(?:정인|편인)(?=(?:은|는|이|가|을|를|의|과|와|에서|에|으로|로|도|만|부터|보다|처럼|이라|라고|입니다|인데|[,.!?。()\s]|$))/g, '배움과 도움의 흐름'],
  [/(?<![가-힣])(?:정관|편관|관성)(?=(?:은|는|이|가|을|를|의|과|와|에서|에|으로|로|도|만|부터|보다|처럼|이라|라고|입니다|인데|[,.!?。()\s]|$))/g, '역할과 책임의 흐름'],
  [/(?<![가-힣])(?:정재|편재|재성)(?=(?:은|는|이|가|을|를|의|과|와|에서|에|으로|로|도|만|부터|보다|처럼|이라|라고|입니다|인데|[,.!?。()\s]|$))/g, '돈과 자원의 흐름'],
  [/(?<![가-힣])(?:식신|식상)(?=(?:은|는|이|가|을|를|의|과|와|에서|에|으로|로|도|만|부터|보다|처럼|이라|라고|입니다|인데|[,.!?。()\s]|$))/g, '표현과 결과의 흐름'],
  [/(?<![가-힣])(?:비견|겁재|비겁)(?=(?:은|는|이|가|을|를|의|과|와|에서|에|으로|로|도|만|부터|보다|처럼|이라|라고|입니다|인데|[,.!?。()\s]|$))/g, '나와 동료의 흐름'],
  [/(?<![가-힣])(?:신강|신약)(?=(?:은|는|이|가|을|를|의|과|와|에서|에|으로|로|도|만|부터|보다|처럼|이라|라고|입니다|인데|[,.!?。()\s]|$))/g, '기운의 균형'],
  // Run after the original terms above have been translated in this same pass.
  [/기운의 균형\([^()]*\)(?:·기운의 균형\([^()]*\))?/g, '기운의 강약'],
]

const EASY_REPLACEMENT_PHRASES = [...new Set(EASY_TEASER_REPLACEMENTS.map(([, replacement]) => replacement))]

function hasFinalConsonant(value: string): boolean {
  const code = value.charCodeAt(value.length - 1) - 0xac00
  return code >= 0 && code <= 11171 && code % 28 !== 0
}

function hasFinalRieul(value: string): boolean {
  const code = value.charCodeAt(value.length - 1) - 0xac00
  return code >= 0 && code <= 11171 && code % 28 === 8
}

function adjustReplacementParticles(text: string): string {
  return EASY_REPLACEMENT_PHRASES.reduce((value, phrase) => {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const batchim = hasFinalConsonant(phrase)
    return value.replace(new RegExp(`${escaped}(이었어요|이에요|이라고|이어서|이라서|이지만|이라면|이라도|이면|이고|이며|이나|이든|이란|인데|입니다|[은는이가을를과와](?![가-힣])|(?:으로|로)(?![가-힣]))`, 'g'), (_, suffix: string) => {
      const particle = suffix === '은' || suffix === '는' ? (batchim ? '은' : '는')
        : suffix === '이' || suffix === '가' ? (batchim ? '이' : '가')
          : suffix === '을' || suffix === '를' ? (batchim ? '을' : '를')
            : suffix === '과' || suffix === '와' ? (batchim ? '과' : '와')
            : suffix === '이면' ? (batchim ? '이면' : '면')
              : suffix === '이라면' ? (batchim ? '이라면' : '라면')
                : suffix === '이라고' ? (batchim ? '이라고' : '라고')
                  : suffix === '이에요' ? (batchim ? '이에요' : '예요')
                    : suffix === '이었어요' ? (batchim ? '이었어요' : '였어요')
                  : suffix === '이어서' ? (batchim ? '이어서' : '여서')
                    : suffix === '이라서' ? (batchim ? '이라서' : '라서')
                      : suffix === '이지만' ? (batchim ? '이지만' : '지만')
                        : suffix === '이고' ? (batchim ? '이고' : '고')
                          : suffix === '이며' ? (batchim ? '이며' : '며')
                            : suffix === '이나' ? (batchim ? '이나' : '나')
                              : suffix === '이든' ? (batchim ? '이든' : '든')
                              : suffix === '이란' ? (batchim ? '이란' : '란')
                                : suffix === '이라도' ? (batchim ? '이라도' : '라도')
                                  : suffix === '으로' || suffix === '로' ? (batchim && !hasFinalRieul(phrase) ? '으로' : '로')
                                    : suffix
      return `${phrase}${particle}`
    })
  }, text)
}

function easyNarratorWords(text: string): string {
  return text.split(/(“[^”]*”|「[^」]*」|"[^"\n]*")/g).map((part, index) => {
    if (index % 2 === 1) return part
    const replaced = EASY_TEASER_REPLACEMENTS.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), part)
    return adjustReplacementParticles(replaced)
  }).join('')
}

function splitReadableSentence(value: string, limit = 65): string[] {
  const queue = [value.trim()]
  const result: string[] = []
  while (queue.length) {
    const current = queue.shift()!.trim()
    if (current.length <= limit) { result.push(current); continue }
    const window = current.slice(0, limit + 1)
    const candidates = [', ', ' 그리고 ', ' 하지만 ', ' 반면 ', ' 그래서 ', ' 다만 ']
      .map((marker) => ({ marker, index: window.lastIndexOf(marker) }))
      .filter(({ index }) => index >= 16)
      .sort((a, b) => b.index - a.index)
    const cut = candidates[0]?.index ?? -1
    // A whitespace-only cut can split a negation or particle and change the meaning
    // (for example, `결제하지 않으면` -> `결제하지. 않으면`). If there is no
    // explicit clause boundary, keep the sentence intact and let the reviewer reject it.
    if (cut < 16) { result.push(current); continue }
    const marker = candidates[0]?.index === cut ? candidates[0].marker : ''
    const left = current.slice(0, cut).replace(/[,，\s]+$/, '')
    const right = current.slice(cut + marker.length).trim()
    const completeLeft = marker === ', '
      ? left.replace(/적고$/, '적어요').replace(/기록하고$/, '기록해요').replace(/확인하고$/, '확인해요').replace(/비교하고$/, '비교해요')
      : left
    // Split only when the left clause can stand as a complete sentence.
    if (marker === ', ' && completeLeft === left && /고$/.test(left)) { result.push(current); continue }
    result.push(/[.!?。]$/.test(completeLeft) ? completeLeft : `${completeLeft}.`)
    if (right) queue.unshift(right)
  }
  return result
}

export function splitReadableSentences(value: string): string[] {
  const result: string[] = []
  let start = 0
  let quoteEnd = ''
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index]
    if (!quoteEnd && (char === '“' || char === '「' || char === '"')) {
      quoteEnd = char === '“' ? '”' : char === '「' ? '」' : '"'
      continue
    }
    if (quoteEnd && char === quoteEnd) { quoteEnd = ''; continue }
    if (quoteEnd) continue
    const decimalPoint = char === '.' && /\d/.test(value[index - 1] ?? '') && /\d/.test(value[index + 1] ?? '')
    if (!'!?。.'.includes(char) || decimalPoint) continue
    let end = index + 1
    while (end < value.length && '!?。'.includes(value[end])) end += 1
    result.push(value.slice(start, end))
    start = end
    index = end - 1
  }
  if (start < value.length) result.push(value.slice(start))
  return result.length ? result : [value]
}

/** 저장 직전 티저를 쉬운말로 바꾸고 긴 문장을 정보 손실 없이 나눈다. */
export function normalizeTeaserCopy(text: string, singleSentence = false): string {
  const easy = easyNarratorWords(removeNarratorHanja(replaceInternalTerms(text)))
  // A headline must not silently lose a condition or warning. Keep it intact and
  // let the strict new-save gate reject a long or multi-sentence headline.
  if (singleSentence) return easy.trim()
  const tokens = easy.split(/(\n\s*\n|“[^”]*”|「[^」]*」|"[^"\n]*")/g)
  const normalized = tokens.map((token) => {
    if (/^\n\s*\n$/.test(token)) return '\n\n'
    if (/^(?:“[^”]*”|「[^」]*」|"[^"\n]*")$/.test(token)) return token
    const leading = token.match(/^\s+/)?.[0] ?? ''
    const trailing = token.match(/\s+$/)?.[0] ?? ''
    const core = token.trim()
    if (!core) return token
    const sourceSentences = splitReadableSentences(core)
    return `${leading}${sourceSentences.flatMap((sentence) => splitReadableSentence(sentence)).join(' ')}${trailing}`
  }).join('').replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n').trim()
  return normalized
}

export function normalizeUserCopy(text: string): string {
  const paragraphs = removeNarratorHanja(explainFirstTerms(replaceInternalTerms(text)))
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
  const cleanHook = removeNarratorHanja(replaceInternalTerms(hook)).replace(/[.!。]+$/, '').trim()
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
