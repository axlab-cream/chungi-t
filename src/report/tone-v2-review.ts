import { loadTonePersona } from '../prompt/tone-v2.js'
import { normalizeServiceKey } from '../prompt/service-system.js'
import { relationshipState } from '../love/reading-content.js'
import type { RagChunk, SajuReportContext, SajuReportSection } from '../types/index.js'

export interface ToneReview { passed: boolean; issues: string[] }
export interface ToneReviewOptions {
  numericEvidence?: Iterable<string> | string | null
  corpusEvidence?: RagChunk[] | null
  context?: SajuReportContext
  contentRole?: 'hook' | 'body'
}
export interface SafetyClaimsInput { text: string; context?: SajuReportContext }
export interface PaidSectionDensityReview extends ToneReview {
  elements: {
    directAnswer: boolean
    grounding: boolean
    scene: boolean
    nextCriterion: boolean
  }
}
export interface PaidSectionDensityInput {
  hook: string
  question: string
  interpretation: string
  context?: SajuReportContext
  siblings?: SajuReportSection[]
}
export interface SectionUniquenessInput {
  hook: string
  question: string
  interpretation: string
  siblings?: SajuReportSection[]
}
export interface TechnicalTermsInput {
  hook: string
  interpretation: string
  siblings?: SajuReportSection[]
}
export interface ScoreVisualReviewInput {
  hook: string
  interpretation: string
  numericEvidence?: Iterable<string> | string | null
  hasComparisonTarget?: boolean
}

/** Quotes belong to the customer or another speaker, not the narrator. */
function narrator(text: string): string {
  return text.replace(/(?:“[^”]*”|「[^」]*」|"[^"\n]*")(?:이?야)?/g, '')
}

const NUMERIC_TOKEN_PATTERN = /(^|[^\p{L}\p{N}_])([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)\s*(cm|mm|m|만원|원|개월|시간|분|년|월|일|시|주|%|점|회|번|건|장|개|명|단계|칸|걸음|도|세)?/giu
const ISO_DATE_PATTERN = /(?<!\d)(\d{4})([-./])(\d{1,2})\2(\d{1,2})(?!\d)/g
const KOREAN_DATE_PATTERN = /(?<!\d)(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일(?!\d)/g
const ARITHMETIC_PATTERN = /([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)\s*(cm|mm|m|만원|원|개월|시간|분|년|월|일|시|주|%|점|회|번|건|장|개|명|단계|칸|걸음|도|세)?\s*([+\-−])\s*([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)\s*(cm|mm|m|만원|원|개월|시간|분|년|월|일|시|주|%|점|회|번|건|장|개|명|단계|칸|걸음|도|세)?\s*=\s*([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)\s*(cm|mm|m|만원|원|개월|시간|분|년|월|일|시|주|%|점|회|번|건|장|개|명|단계|칸|걸음|도|세)?/giu
const PRESCRIPTION_ACTION_PATTERN = /(?:하세요|하십시오|해요|해보|해 보|보세요|봐요|잡으세요|잡아보|떼세요|떼어|옮기세요|옮겨|놓으세요|놓아|정리하세요|정리해|끊으세요|끊어|줄이세요|줄여|늘리세요|늘려|확인하세요|확인해|기록하세요|기록해|비교하세요|비교해|관찰하세요|관찰해|테스트하세요|테스트해|만나세요|연락하세요|연락해|통화하세요|통화해|걸으세요|걸어|기다리세요|기다려|미루세요|미뤄|준비하세요|준비해|저축하세요|저축해|결제하세요|공부하세요|공부해|오답노트|쓰세요|지원하세요|지원해|계약하세요|계약해|퇴사하세요|퇴사해|이사하세요|이사해)/
const NEGATED_CERTAINTY_PATTERN = /(?:(?:확정|단정|보장|예언|알 수|알아낼 수|확인된 사실).{0,12}(?:하지|아니|못하|없)|(?:결과가\s*)?(?:정해지|확정되)[^.!?。\n]{0,16}(?:아니|않)|(?:판정|분석|검토)(?:에서|은|을)?\s*제외)/
const CONDITIONAL_PATTERN = /(?:라면|다면|경우|때에는|때는|수 있어|일 수|일 수도|듯해|처럼 보|가능성|가설|(?:맞|충족되|확인되|준비되|갖춰지|잡|막히|무너지|돌아오)(?:으)?면)/
const THIRD_PARTY_MIND_PATTERN = /(?:상대|그 사람|애인|전 애인|배우자|동료|상사|가족)\s*(?:은|는|이|가)?[^.!?。\n]{0,24}(?:마음|속마음|진심|감정|후회|미련)[^.!?。\n]{0,24}(?:없|떠났|식었|돌아섰|숨기|좋아하|사랑하|후회하|기다리|그리워|정리했|끝났|남아 있)/
const CERTAIN_FUTURE_EVENT_PATTERN = /(?:(?:올해|내년|다음\s*달|곧|결국|반드시|무조건|확실히|조만간)?[^.!?。\n]{0,16}(?:합격|불합격|이별|결혼|채용|수익|외도|질병|수명|사고|파산|이혼|재회|퇴사|이직|구조조정|돌아올|돌아오)[^.!?。\n]{0,20}(?:짧습니다|깁니다|있습니다|있어요|합니다|해요|해|돼요|됩니다|납니다|나요|옵니다|입니다|이에요|이야|(?:할|될|날|올|을|ㄹ)?\s*거(?:야|예요)|확정(?:입니다|이에요|돼요|됩니다)?|예정입니다|예정이에요))|(?:(?:올해|내년|이번|다음|곧|결국|반드시|무조건|확실히|조만간|(?<![가-힣])운(?:이|은|도)?|(?<![가-힣])시험(?:에|은|이)?)[^.!?。\n]{0,12}(?:붙(?:어|어요|는다|습니다|을\s*거(?:야|예요))|떨어(?:져|져요|진다|집니다|질\s*거(?:야|예요))))/
const SAFE_FUTURE_EVENT_REFERENCE_PATTERN = /(?:합격|불합격|이별|결혼|채용|수익|외도|질병|수명|사고|파산|이혼|재회|퇴사|이직|구조조정)\s*(?:여부|조건|검토|준비|계획|탐색|기회|생각|선택지|시점|절차|기준|가능성|후기)/g
const SAFE_EVENT_TIME_REFERENCE_PATTERN = /(?:퇴사|이직)\s*(?:전|뒤|후)/g
const SAFE_STATE_RECOVERY_PATTERN = /(?:판단|집중|감각|리듬|회복감|상태)(?:이|가)\s*돌아오(?:는지|면|나|는\s*때|지\s*않는|는데)/g
const SYMBOLIC_OMNISCIENCE_PATTERN = /(?:사주|명식|오행|용신|신강|신약|합|충|운세)[^.!?。\n]{0,36}(?:미래|합격\s*여부|불합격\s*여부|상대(?:의)?\s*(?:마음|속마음|진심|감정)|사람의\s*마음)[^.!?。\n]{0,20}(?:알\s*수\s*있|알아낼\s*수\s*있|확인할\s*수\s*있)/
const INVENTED_PRIVATE_FACT_PATTERN = /(?:회사\s*(?:문화|분위기|상사|동료)|가족\s*(?:문제|갈등|사정)|집\s*구조|고양이(?:\s*(?:행동|성격|마음|기분|외로움)|[이가는은])|지역\s*(?:사건|문제)|질병|병)[^.!?。\n]{0,30}(?:입니다|이에요|해요|합니다|때문입니다|때문이에요|원인입니다|원인이에요|탓입니다|탓이에요|생깁니다|생겨요)/
const GROUNDED_OBSERVATION_EVIDENCE_PATTERN = /(?:관찰|측정)(?:한|된)?\s*(?:기록|결과|자료)[^.!?。\n]{0,20}(?:으로|에서)[^.!?。\n]{0,12}(?:확인|판단)/
const NUMERIC_KEY_UNITS: Array<[RegExp, string]> = [
  [/(?:^|_)(?:year|targetYear|currentYear|startYear|solarYear|lunarYear)$/i, '년'],
  [/(?:^|_)(?:month|solarMonth|lunarMonth)$/i, '월'],
  [/(?:^|_)(?:day|solarDay|lunarDay)$/i, '일'],
  [/(?:^|_)(?:hour)$/i, '시'],
  [/(?:^|_)(?:minute)$/i, '분'],
  [/(?:^|_)(?:age|startAge|ageStart|ageEnd)$/i, '세'],
  [/(?:slopeDeg|aspectDownhillDeg)$/i, '도'],
  [/(?:score|siteSimilarityScore)$/i, '점'],
]
const SKIP_NUMERIC_EVIDENCE_KEYS = new Set(['id', 'generationId', 'publicId', 'imageKey', 'imageSrc', 'imageAlt', 'categoryEn', 'model'])

function normalizeNumber(raw: string): string {
  const number = Number(raw.replace(/,/g, ''))
  return Number.isFinite(number) ? String(number) : raw.replace(/,/g, '')
}

function normalizeNumericToken(rawNumber: string, unit = ''): string {
  return `${normalizeNumber(rawNumber)}${unit}`
}

function numericTokens(text: string): Array<{ token: string; unit: string; raw: string }> {
  const tokens: Array<{ token: string; unit: string; raw: string }> = []
  for (const match of text.matchAll(NUMERIC_TOKEN_PATTERN)) {
    const unit = match[3] ?? ''
    tokens.push({ token: normalizeNumericToken(match[2], unit), unit, raw: `${match[2]}${unit}` })
  }
  return tokens
}

function dateTokens(text: string): Array<{ token: string; raw: string }> {
  return [
    ...[...text.matchAll(ISO_DATE_PATTERN)].map((match) => ({
      token: `${normalizeNumber(match[1])}-${normalizeNumber(match[3])}-${normalizeNumber(match[4])}`,
      raw: match[0],
    })),
    ...[...text.matchAll(KOREAN_DATE_PATTERN)].map((match) => ({
      token: `${normalizeNumber(match[1])}-${normalizeNumber(match[2])}-${normalizeNumber(match[3])}`,
      raw: match[0],
    })),
  ]
}

function addDateEvidence(evidence: Set<string>, token: string): void {
  evidence.add(token)
  const [year, month, day] = token.split('-')
  if (year && month && day) {
    evidence.add(`${year}년`)
    evidence.add(`${month}월`)
    evidence.add(`${day}일`)
  }
}

function unitForKey(key: string | undefined): string | undefined {
  if (!key) return undefined
  return NUMERIC_KEY_UNITS.find(([pattern]) => pattern.test(key))?.[1]
}

export function numericEvidenceFrom(...sources: unknown[]): Set<string> {
  const evidence = new Set<string>()
  const seen = new Set<object>()

  function addNumber(value: number, key?: string): void {
    if (!Number.isFinite(value)) return
    const normalized = String(value)
    evidence.add(normalized)
    const unit = unitForKey(key)
    if (unit) evidence.add(`${normalized}${unit}`)
  }

  function walk(value: unknown, key?: string): void {
    if (value === null || value === undefined) return
    if (typeof value === 'number') {
      addNumber(value, key)
      return
    }
    if (typeof value === 'string') {
      for (const token of numericTokens(value)) evidence.add(token.token)
      for (const token of dateTokens(value)) addDateEvidence(evidence, token.token)
      return
    }
    if (typeof value === 'boolean') return
    if (Array.isArray(value)) {
      for (const item of value) walk(item)
      return
    }
    if (typeof value === 'object') {
      if (seen.has(value)) return
      seen.add(value)
      for (const [childKey, childValue] of Object.entries(value)) {
        if (SKIP_NUMERIC_EVIDENCE_KEYS.has(childKey)) continue
        walk(childValue, childKey)
      }
    }
  }

  for (const source of sources) walk(source)
  return evidence
}

function normalizeEvidence(input: Iterable<string> | string | null | undefined): Set<string> | undefined {
  if (input === null || input === undefined) return undefined
  if (typeof input === 'string') return numericEvidenceFrom(input)
  const evidence = new Set<string>()
  for (const item of input) {
    const parsed = numericTokens(item)
    const dates = dateTokens(item)
    if (parsed.length === 0 && dates.length === 0) evidence.add(normalizeNumericToken(item))
    for (const token of parsed) evidence.add(token.token)
    for (const token of dates) addDateEvidence(evidence, token.token)
  }
  return evidence
}

function sentences(text: string): string[] {
  return text.split(/(?<=[.!?。])\s+|\n+/).map(part => part.trim()).filter(Boolean)
}

const TECHNICAL_TERMS = [
  { korean: '오행', hanja: '五行' },
  { korean: '용신', hanja: '用神' },
  { korean: '신강', hanja: '身强' },
  { korean: '신약', hanja: '身弱' },
  { korean: '합', hanja: '合' },
  { korean: '충', hanja: '沖' },
] as const

function hasFirstUseExplanation(text: string, index: number, korean: string, hanja: string): boolean {
  const atFirstUse = text.slice(index)
  const escapedKorean = korean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const escapedHanja = hanja.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^${escapedKorean}\\s*[（(]\\s*${escapedHanja}\\s*[,，]\\s*[가-힣][^()（）]{1,30}[)）]`).test(atFirstUse)
}

function technicalTermIndex(text: string, korean: string, hanja: string): number {
  const hanjaIndex = text.indexOf(hanja)
  if (korean.length > 1) {
    const koreanIndex = text.indexOf(korean)
    return koreanIndex < 0 ? hanjaIndex : hanjaIndex < 0 ? koreanIndex : Math.min(koreanIndex, hanjaIndex)
  }
  const escaped = korean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const koreanMatch = new RegExp(`(?<![가-힣])${escaped}(?=$|[\\s(（,，.!?。·]|(?:이면|이라면|은|는|이|가|을|를|과|와|도|만)(?=[^가-힣]|$))`).exec(text)
  const koreanIndex = koreanMatch?.index ?? -1
  return koreanIndex < 0 ? hanjaIndex : hanjaIndex < 0 ? koreanIndex : Math.min(koreanIndex, hanjaIndex)
}

function isNegatedBoundary(sentence: string): boolean {
  return /(?:아니|않|못하|무관|같지\s*않|뜻하지\s*않|의미하지\s*않|확정하지\s*않)/.test(sentence)
}

/** Deterministic §7 lower-bound review in report reading order. */
export function reviewTechnicalTerms(input: TechnicalTermsInput): ToneReview {
  const issues: string[] = []
  const completed = (input.siblings ?? []).filter((item) => item.status === 'complete')
  const prior = completed.map((item) => narrator(`${item.hook}\n${item.interpretation}`)).join('\n')
  const current = narrator(`${input.hook}\n${input.interpretation}`)

  for (const term of TECHNICAL_TERMS) {
    if (technicalTermIndex(prior, term.korean, term.hanja) >= 0) continue
    const firstIndex = technicalTermIndex(current, term.korean, term.hanja)
    if (firstIndex >= 0 && !hasFirstUseExplanation(current, firstIndex, term.korean, term.hanja)) {
      issues.push(`처음 나오는 전문용어 ${term.korean}은 한글(한자, 쉬운 뜻)로 설명하세요.`)
    }
  }

  for (const sentence of sentences(current)) {
    const normalized = sentence.replace(/[（）]/g, (mark) => mark === '（' ? '(' : ')')
    const hanjaGroups = normalized.match(/[一-龥]+/g) ?? []
    const explanations = normalized.match(/\([^()]*[一-龥]+[^()]*\)/g) ?? []
    const outsideHanjaGroups = normalized
      .replace(/\([^()]*[一-龥]+[^()]*\)/g, '')
      .match(/[一-龥]+/g) ?? []
    const hasCrowdedHanja = explanations.length > 1
      || (explanations.length === 0 && hanjaGroups.length > 1)
      || (explanations.length === 1 && outsideHanjaGroups.some((group) => group.length > 1))
    if (hasCrowdedHanja) {
      issues.push('한 문장에는 여러 한자 설명을 겹치지 말고 용어를 나누어 설명하세요.')
      break
    }
    if (/\([^()]*\(/.test(normalized)) {
      issues.push('한 문장에 괄호를 겹치지 말고 쉬운 뜻을 한 번만 덧붙이세요.')
      break
    }
  }

  for (const sentence of sentences(current)) {
    if (isNegatedBoundary(sentence)) continue
    if (/오행/.test(sentence) && /용신/.test(sentence)
      && /(?:개(?:수)?|많|적|부족|과다|뿐)/.test(sentence)
      && /(?:라서|이어서|이므로|때문|따라서|그러므로|곧|바로|=)/.test(sentence)) {
      issues.push('오행 개수만으로 용신을 정하지 말고 서로 다른 판단 근거로 구분하세요.')
      break
    }
  }
  for (const sentence of sentences(current)) {
    if (isNegatedBoundary(sentence)) continue
    if (/(?:신강|신약)/.test(sentence) && /(?:체력|의지|인격)/.test(sentence)
      && /(?:강한|강하|약한|약하|좋은|좋다|나쁜|나쁘|높은|높다|낮은|낮다|등급)/.test(sentence)) {
      issues.push('신강·신약을 체력·의지·인격의 우열이나 등급으로 바꾸지 마세요.')
      break
    }
  }
  for (const sentence of sentences(current)) {
    if (isNegatedBoundary(sentence)) continue
    const certainEvent = /(?:무조건|반드시|확정|곧|바로|뜻해|의미해|재결합해|이별해|재결합합니다|이별합니다|재결합하게\s*돼|이별하게\s*돼)/.test(sentence)
    if (certainEvent && (/(?:합).{0,35}재결합/.test(sentence) || /(?:충).{0,35}이별/.test(sentence))) {
      issues.push('합을 재결합, 충을 이별 사건과 등치하지 말고 관계의 상징과 현실 조건을 구분하세요.')
      break
    }
  }

  return { passed: issues.length === 0, issues }
}

/** Deterministic §8 evidence and labeling checks for generated textual scores/visuals. */
export function reviewScoreVisuals(input: ScoreVisualReviewInput): ToneReview {
  const issues: string[] = []
  const text = narrator(`${input.hook}\n${input.interpretation}`)
  const evidence = normalizeEvidence(input.numericEvidence) ?? new Set<string>()
  const unsupported = new Set<string>()

  for (const token of numericTokens(text)) {
    if (!['점', '%', '년', '월', '일'].includes(token.unit)) continue
    if (!evidence.has(token.token)) unsupported.add(token.raw)
  }
  for (const token of dateTokens(text)) {
    if (!evidence.has(token.token)) unsupported.add(token.raw)
  }
  if (unsupported.size > 0) {
    issues.push(`서버 근거에 없는 점수·확률·날짜·차트 값을 만들지 마세요: ${[...unsupported].join(', ')}`)
  }

  if (/[▁▂▃▄▅▆▇█]{2,}|[■●◆★]{3,}/.test(text)) {
    issues.push('서버가 전달하지 않은 그래프 모양을 개인 결과처럼 만들지 마세요.')
  }

  for (const sentence of sentences(text)) {
    if (/(?:아니|않|확정하지|뜻하지)/.test(sentence)) continue
    if (/(?:합격|불합격|재회|이별|결혼|채용|수익|외도|질병|사고|파산|이혼).{0,18}(?:확률|가능성).{0,12}\d+(?:\.\d+)?\s*(?:%|점)|\d+(?:\.\d+)?\s*(?:%|점).{0,18}(?:합격|불합격|재회|이별|결혼|채용|수익|외도|질병|사고|파산|이혼).{0,12}(?:확률|가능성)/.test(sentence)) {
      issues.push('점수를 사건 발생 확률로 이름 붙이지 말고 현재 해석 축의 적합도·주의도·우선순위로 표시하세요.')
      break
    }
  }

  const interpretiveScoreSentences = sentences(text).filter((sentence) =>
    /\d+(?:\.\d+)?\s*(?:점|%)/.test(sentence)
      && /(?:점수|적합도|주의도|우선순위|확률|가능성)/.test(sentence)
      && !/(?:시험|모의고사|성적|최근|입력한|기록한|받은|실제)\s*[^.!?。\n]{0,18}(?:점수|\d+(?:\.\d+)?\s*점)/.test(sentence),
  )
  if (interpretiveScoreSentences.length > 0) {
    if (!/(?:적합도|주의도|우선순위)/.test(text)) {
      issues.push('해석 점수는 일반 점수나 확률이 아니라 적합도·주의도·우선순위 중 하나로 이름 붙이세요.')
    }
    if (!/(?:산정\s*축|산정\s*기준|판단\s*축|판단\s*기준)/.test(text)
      || !/(?:높을수록|높으면|높은\s*경우)/.test(text)
      || !/(?:낮을수록|낮으면|낮은\s*경우)/.test(text)) {
      issues.push('점수 옆에 산정 축과 높고 낮을 때의 의미를 함께 설명하세요.')
    }
  }

  if (/(?:두\s*(?:사람|회사|선택지)|비교\s*(?:점수|적합도|주의도)|상대\s*비교).{0,30}\d+(?:\.\d+)?\s*(?:점|%)/.test(text)
    && input.hasComparisonTarget !== true) {
    issues.push('실제 비교 대상이 없으면 비교 점수를 만들지 마세요.')
  }

  const chartSentences = sentences(text).filter((sentence) =>
    /(?:차트|그래프)/.test(sentence) && !/(?:쓰지|사용하지|표시하지|없|아니)/.test(sentence),
  )
  if (chartSentences.some((sentence) => /(?:장식|보기\s*좋|예쁘게|꾸미)/.test(sentence))
    || chartSentences.some((sentence) => !/(?:비교|차이|변화|추이|우선|판단|점검|시점|분포)/.test(sentence))) {
    issues.push('차트는 장식이 아니라 비교·변화·우선순위 판단을 쉽게 할 때만 쓰세요.')
  }

  const tableLines = input.interpretation.split('\n').filter((line) => /^\s*\|.*\|\s*$/.test(line))
  const chartLines = input.interpretation.split('\n').filter((line) => /(?:차트|그래프)/.test(line))
  if (tableLines.length > 0 && chartLines.length > 0) {
    const tableValues = new Set(numericTokens(tableLines.join('\n')).filter((token) => token.unit).map((token) => token.token))
    const chartValues = numericTokens(chartLines.join('\n')).filter((token) => token.unit).map((token) => token.token)
    if (chartValues.some((value) => tableValues.has(value))) {
      issues.push('같은 데이터를 표와 차트에 중복하지 말고 판단에 더 적합한 형식 하나만 쓰세요.')
    }
  }

  return { passed: issues.length === 0, issues }
}

function unsupportedPrescriptionNumbers(text: string, evidence: Set<string>): string[] {
  const unsupported = new Set<string>()
  for (const sentence of sentences(text)) {
    if (!PRESCRIPTION_ACTION_PATTERN.test(sentence)) continue
    for (const token of numericTokens(sentence)) {
      if (!token.unit) continue
      if (!evidence.has(token.token)) unsupported.add(token.raw)
    }
  }
  return [...unsupported]
}

function sameUnit(...units: string[]): boolean {
  return new Set(units.filter(Boolean)).size <= 1
}

function equalNumber(left: number, right: number): boolean {
  return Math.abs(left - right) < 0.000001
}

function arithmeticReview(text: string, evidence: Set<string>): { issues: string[]; derived: Set<string> } {
  const issues: string[] = []
  const derived = new Set<string>()
  for (const match of text.matchAll(ARITHMETIC_PATTERN)) {
    const leftNumber = normalizeNumber(match[1])
    const leftUnit = match[2] ?? ''
    const operator = match[3]
    const rightNumber = normalizeNumber(match[4])
    const rightUnit = match[5] ?? ''
    const resultNumber = normalizeNumber(match[6])
    const resultUnit = match[7] ?? ''
    const leftToken = normalizeNumericToken(leftNumber, leftUnit)
    const rightToken = normalizeNumericToken(rightNumber, rightUnit)
    const resultToken = normalizeNumericToken(resultNumber, resultUnit)

    if (!sameUnit(leftUnit, rightUnit, resultUnit)) {
      issues.push(`계산 숫자의 단위가 맞지 않습니다: ${match[0].trim()}`)
      continue
    }
    if (!evidence.has(leftToken) || !evidence.has(rightToken)) {
      issues.push(`계산식의 입력 숫자가 근거에 없습니다: ${match[0].trim()}`)
      continue
    }
    const expected = operator === '+' ? Number(leftNumber) + Number(rightNumber) : Number(leftNumber) - Number(rightNumber)
    if (!equalNumber(expected, Number(resultNumber))) {
      issues.push(`계산 숫자의 산술 결과가 맞지 않습니다: ${match[0].trim()}`)
      continue
    }
    derived.add(resultToken)
  }
  return { issues, derived }
}

function certaintyIssues(text: string): string[] {
  const issues: string[] = []
  for (const sentence of sentences(text)) {
    if (NEGATED_CERTAINTY_PATTERN.test(sentence) || CONDITIONAL_PATTERN.test(sentence)) continue
    if (THIRD_PARTY_MIND_PATTERN.test(sentence)) {
      issues.push('타인의 마음을 확인된 사실처럼 쓰지 말고 관찰 가능한 행동과 확인 조건으로 바꾸세요.')
      break
    }
  }
  for (const sentence of sentences(text)) {
    if (NEGATED_CERTAINTY_PATTERN.test(sentence) || CONDITIONAL_PATTERN.test(sentence)) continue
    const futureClaimCandidate = sentence
      .replace(SAFE_FUTURE_EVENT_REFERENCE_PATTERN, '')
      .replace(SAFE_EVENT_TIME_REFERENCE_PATTERN, '')
      .replace(SAFE_STATE_RECOVERY_PATTERN, '')
    if (CERTAIN_FUTURE_EVENT_PATTERN.test(futureClaimCandidate)) {
      issues.push('미래 사건을 확인된 사실처럼 쓰지 말고 조건과 가능성의 말로 바꾸세요.')
      break
    }
  }
  for (const sentence of sentences(text)) {
    if (NEGATED_CERTAINTY_PATTERN.test(sentence) || CONDITIONAL_PATTERN.test(sentence)) continue
    if (GROUNDED_OBSERVATION_EVIDENCE_PATTERN.test(sentence)) continue
    if (INVENTED_PRIVATE_FACT_PATTERN.test(sentence)) {
      issues.push('입력에 없는 회사·가족·집·반려묘·지역·질병 사실을 만들지 마세요.')
      break
    }
  }
  return issues
}

function safetyNegated(sentence: string): boolean {
  return /(?:아니(?!어도|라도|지만|고)|않(?!아도|더라도|지만|고)|못하|할 수 없|판단할 수 없|확정할 수 없|보장하지|대신하지|증명하지|뜻하지|의미하지|근거가 아니)/.test(sentence)
}

function relationshipSafetyIssues(text: string, context: SajuReportContext | undefined): string[] {
  if (!context) return []
  const state = relationshipState({ concern: context.concern, relationship: context.relationship })
  if (state !== 'boundary' && state !== 'unsafe') return []
  const unsafeAction = sentences(text).some((sentence) => {
    if (safetyNegated(sentence) || /(?:거부|경계|안전).{0,24}(?:우선|존중|지키|확인)/.test(sentence)) return false
    return /(?:연락|재접촉|메시지|문자|전화|찾아가|만나|재회|화해)[^.!?。\n]{0,28}(?:보내|시도|추진|걸|하세|해요|하세요|만나|찾아)/.test(sentence)
  })
  return unsafeAction
    ? ['차단·접촉 거부·위협·강요가 있으면 재접촉이나 재회보다 경계 존중과 안전을 우선하세요.']
    : []
}

function professionalAuthorityIssues(text: string): string[] {
  for (const sentence of sentences(text)) {
    if (safetyNegated(sentence)) continue
    if (/(?:증상|통증|질환|질병|병)[^.!?。\n]{0,24}(?:질병|질환|병|진단)(?:입니다|이에요|이다)|(?:약|복용)[^.!?。\n]{0,18}(?:끊으|중단하|바꾸)/.test(sentence)) {
      return ['건강·질병·복약 판단을 서술자의 권위로 대신하지 말고 의료진 확인을 안내하세요.']
    }
    if (/(?:계약|조항|합의)[^.!?。\n]{0,26}(?:법적으로|법적)[^.!?。\n]{0,18}(?:유효|무효|문제없|확정)/.test(sentence)) {
      return ['계약·법률 판단을 확정하지 말고 자격 있는 전문가의 검토가 필요한 조건으로 안내하세요.']
    }
    if (/(?:종목|주식|코인|부동산|투자)[^.!?。\n]{0,30}(?:수익|원금|상승|오를)[^.!?。\n]{0,18}(?:보장|확실|무조건|됩니다|합니다)/.test(sentence)) {
      return ['투자 수익이나 결과를 보장하지 말고 실제 자료와 전문 판단을 대신하지 마세요.']
    }
  }
  return []
}

function petCausationIssues(text: string): string[] {
  for (const sentence of sentences(text)) {
    if (safetyNegated(sentence)) continue
    const guardianSymbol = /보호자[^.!?。\n]{0,30}(?:사주|명식|오행|기운)|(?:사주|명식|오행|기운)[^.!?。\n]{0,30}보호자/.test(sentence)
    const catBehaviour = /고양이[^.!?。\n]{0,30}(?:행동|성격|공격|불안|문제|아프|질병|외로)/.test(sentence)
    if (guardianSymbol && catBehaviour && /(?:때문|탓|원인|영향으로|만들)/.test(sentence)) {
      return ['고양이의 행동·상태를 보호자의 사주 결함 탓으로 돌리지 말고 관찰과 수의학적 확인을 구분하세요.']
    }
  }
  return []
}

function unmeasuredHomeIssues(text: string, context: SajuReportContext | undefined): string[] {
  if (normalizeServiceKey(context?.serviceKey) !== 'home_fit') return []
  const terrain = context?.home?.terrainEvidence
  const hasTerrainEvidence = Boolean(terrain && (
    terrain.summary || terrain.headline || terrain.knownNow?.length || terrain.slopeDeg !== undefined
      || terrain.aspectDownhillDeg !== undefined || terrain.front || terrain.back || terrain.siteSimilarityScore !== undefined
  ))
  if (hasTerrainEvidence) return []
  for (const sentence of sentences(text)) {
    if (safetyNegated(sentence) || /(?:측정|확인).{0,16}(?:필요|해야|전에는|없이는)/.test(sentence)) continue
    const unmeasuredFeature = /(?:동향|서향|남향|북향|북동향|북서향|남동향|남서향|방위|경사|지형|배산임수|물길)/.test(sentence)
    const harmfulVerdict = /(?:흉지|사고|재산\s*가치|집값|부동산\s*가치)[^.!?。\n]{0,18}(?:하락|떨어|생기|납니다|입니다)|(?:흉지|사고|재산\s*가치|집값\s*하락)/.test(sentence)
    if (unmeasuredFeature && harmfulVerdict) {
      return ['측정하지 않은 방위·지형을 흉지·사고·재산 가치와 연결하지 마세요.']
    }
  }
  return []
}

/** Deterministic §10 lower-bound safety review for generated customer copy. */
export function reviewSafetyClaims(input: SafetyClaimsInput): ToneReview {
  const prose = narrator(input.text)
  const issues = [
    ...certaintyIssues(prose),
    ...relationshipSafetyIssues(prose, input.context),
    ...professionalAuthorityIssues(prose),
    ...petCausationIssues(prose),
    ...unmeasuredHomeIssues(prose, input.context),
  ]
  for (const sentence of sentences(prose)) {
    if (!safetyNegated(sentence) && SYMBOLIC_OMNISCIENCE_PATTERN.test(sentence)) {
      issues.push('상징 해석으로 미래 사건이나 타인의 마음을 알 수 있다고 단정하지 마세요.')
      break
    }
  }
  for (const sentence of sentences(prose)) {
    if (safetyNegated(sentence) || CONDITIONAL_PATTERN.test(sentence)) continue
    if (/(?:사주|명식|오행|용신|신강|신약|합|충|운세)[^.!?。\n]{0,36}(?:정답|결정|명령|증명|보장|확정)/.test(sentence)) {
      issues.push('상징 해석을 현실의 정답·명령·증명으로 바꾸지 말고 확인된 구조와 행동 우선순위만 분명히 쓰세요.')
      break
    }
  }
  return { passed: issues.length === 0, issues }
}

function normalizedCopy(value: string): string {
  return value.toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '')
}

const CONTEXT_GROUNDING_STOP_WORDS = new Set([
  '관련', '가장', '그냥', '내용', '다음', '대한', '문제', '이번', '이유', '정도',
  '조건', '중요', '지금', '평소', '현재',
])

function groundingToken(raw: string): string {
  const normalized = raw.toLowerCase()
  const stripped = normalized.replace(
    /(?:이라는|이라면|이라고|이라서|이어서|이지만|라는|라고|이고|이며|에서|에게|부터|까지|처럼|보다|으로|로서|에는|에도|이라|은|는|이|가|을|를|의|와|과|도|만|로)$/u,
    '',
  )
  return stripped.length >= 2 ? stripped : normalized
}

function groundingTokens(value: string): Set<string> {
  return new Set((value.normalize('NFKC').match(/[\p{L}\p{N}]+/gu) ?? [])
    .map(groundingToken)
    .filter((token) => token.length >= 2 && !CONTEXT_GROUNDING_STOP_WORDS.has(token)))
}

function contextGroundingFacts(context: SajuReportContext | undefined): string[] {
  if (!context) return []
  const facts: Array<string | undefined> = [
    context.target, context.concern, context.relationship, context.orientation, context.work,
    context.home?.addressOrBuilding, context.home?.roadAddress, context.home?.jibunAddress,
    context.home?.sido, context.home?.sigungu, context.home?.bname, context.home?.buildingName,
    context.home?.addressType, context.home?.buildingType, context.home?.livingPeriod,
    context.home?.mainPurpose, context.home?.stayDecision, ...(context.home?.painPoints ?? []),
    context.home?.entranceFlow, context.home?.bedroomFeel, context.home?.deskPosition,
    context.home?.outsideFlow, context.home?.extraNote,
    context.exam?.examName, context.exam?.examDate, context.exam?.examType,
    context.exam?.priority, context.exam?.worry,
    context.workMove?.decisionMode, context.workMove?.currentCompanySignal,
    context.workMove?.targetCompanyName, context.workMove?.targetRole, context.workMove?.workType,
    context.workMove?.commuteLocation, context.workMove?.salaryFeeling, context.workMove?.decisionDate,
    context.workMove?.discomfortPoint, context.workMove?.priority, ...(context.workMove?.realityChecks ?? []),
    context.partner?.relationship,
  ]
  return facts.filter((fact): fact is string => typeof fact === 'string' && Boolean(fact.trim()))
}

function factHasSpecificOverlap(fact: string, outputTokens: Set<string>): boolean {
  const shared = [...groundingTokens(fact)].filter((token) => outputTokens.has(token))
  return shared.length >= 3 || (shared.length >= 2 && shared.some((token) => token.length >= 3))
}

function hasContextGrounding(text: string, context: SajuReportContext | undefined): boolean {
  const outputTokens = groundingTokens(text)
  const objectiveTargetScoreParaphrase = context?.exam?.examType === 'objective'
    && /객관식/.test(text)
    && /연습\s*점수[^.!?。\n]{0,20}목표\s*수준/.test(context.concern ?? '')
    && /목표권\s*연습\s*점수/.test(text)
  return objectiveTargetScoreParaphrase || contextGroundingFacts(context).some((fact) => factHasSpecificOverlap(fact, outputTokens))
}

function corpusCopyIssues(text: string, chunks: RagChunk[]): string[] {
  const output = normalizedCopy(text)
  for (const chunk of chunks) {
    const sourceParts = chunk.knowledge
      ? [
        chunk.knowledge.interpretation,
        ...chunk.knowledge.real_world_pattern,
        chunk.knowledge.risk,
        chunk.knowledge.opportunity,
        chunk.knowledge.advice,
        chunk.knowledge.forbidden_generalization,
      ]
      : [chunk.content]
    for (const source of sourceParts.flatMap(sentences)) {
      const normalized = normalizedCopy(source)
      if (normalized.length >= 18 && output.includes(normalized)) {
        return ['코퍼스 문장을 복사하지 말고 현재 질문과 근거에 맞는 새 문장으로 다시 쓰세요.']
      }
    }
  }
  return []
}

function actionTargetIssues(text: string): string[] {
  const bareAction = /^(?:(?:먼저|우선|오늘|지금)\s*)?(?:확인|비교|정리|관찰|기록|대화|점검|검토|준비|유지|조정)(?:해요|하세요|합니다|해\s*보세요)[.!?。]?$/
  return sentences(text).some((sentence) => bareAction.test(sentence))
    ? ['행동을 추상적으로 쓰지 말고 무엇을 확인·비교·기록할지 대상을 밝히세요.']
    : []
}

function spokenEnding(sentence: string): string | undefined {
  const clean = sentence.replace(/[.!?。]+$/g, '').trim()
  return clean.match(/(확인하십시오|보십시오|하십시오|아닙니다|입니다|합니다|습니까|않으실\s*거죠|하시겠어요|아니에요|거예요|이에요|예요|네요|드러나요|나요|죠|주세요|보세요|하세요|세요|해요|아요|어요|각이야|거야|이야|야|봐|해|하네|일세|보게|군)$/)?.[1]
}

function voiceRhythmIssues(text: string): string[] {
  const endings = sentences(text).map(spokenEnding).filter((ending): ending is string => Boolean(ending))
  if (endings.length >= 3 && new Set(endings).size === 1) {
    return ['같은 종결어미를 모든 문장에 반복하지 말고 서비스가 허용한 어미 안에서 자연스럽게 변주하세요.']
  }
  return []
}

function personaPerformanceIssues(text: string): string[] {
  const issues: string[] = []
  if (/(?:나는|저는|제가)[^.!?。\n]{0,45}(?:\d+\s*년\s*경력|\d+\s*살|출신|자격증|자격을|신내림|어릴\s*때부터|전생)|(?:명리학|상담|역술)[^.!?。\n]{0,18}(?:자격증|자격을\s*가진)|(?:도사|상담가|역술가)(?:라서|이므로)[^.!?。\n]{0,25}(?:미래|마음|운명)[^.!?。\n]{0,12}(?:보|알)/.test(text)) {
    issues.push('캐릭터의 나이·출신·경력·자격·초능력·과거를 새로 만들지 마세요.')
  }
  if (/(?:멍청|한심|바보|호구|찌질|답정너)|(?:했쪄|해쪄|그랬쪄|알겠쪄|냐옹|뿌잉|우쭈쭈)|신령님[^.!?。\n]{0,24}(?:말|알려|보여)|(?:신의|하늘의)\s*계시|접신|내림굿|신내림|(?:속)?마음(?:이|은|을)?[^.!?。\n]{0,18}(?:훤히|전부|다)\s*(?:보|읽|알)/.test(text)) {
    issues.push('비하·아기 말투·독심술·과장된 신당 연출 대신 생활 장면과 작은 비유로 재미를 만드세요.')
  }
  return issues
}

function editorialFrame(text: string): string {
  const labels: string[] = []
  const pattern = /(?:^|\n)\s*(?:#{1,6}\s*)?(문제|경고|해결|결론|근거|놓친\s*것|권고)\s*[:：]/g
  for (const match of text.matchAll(pattern)) labels.push(match[1].replace(/\s+/g, ''))
  return labels.length >= 3 ? labels.join('>') : ''
}

function calmContextHasInventedCrisis(context: SajuReportContext | undefined, text: string): boolean {
  if (!context) return false
  const input = JSON.stringify(context)
  if (!/(?:특별한\s*문제\s*없이|문제\s*(?:없|없음)|만족|안정|편안|잘\s*지내)/.test(input)) return false
  const prose = narrator(text)
  if (/(?:실제로는|사실은|하지만|그러나|내면의|알지\s*못한)[^.!?。\n]{0,50}(?:위기|갈등|문제|붕괴|무너|파국)|숨은\s*(?:위기|갈등|문제)(?:이|가|은|는)[^.!?。\n]{0,35}(?:위기|붕괴|무너|파국)/.test(prose)) return true
  return sentences(prose).some((sentence) =>
    /(?:큰\s*)?(?:위기|파국|붕괴)|무너질|심각한\s*(?:갈등|문제)/.test(sentence)
      && !/(?:아니|없|만들\s*필요|전제하지|단정하지|가정하지)/.test(sentence),
  )
}

function characterShingles(text: string, width = 3): Set<string> {
  const normalized = normalizedCopy(text)
  const result = new Set<string>()
  for (let index = 0; index <= normalized.length - width; index += 1) result.add(normalized.slice(index, index + width))
  return result
}

function shingleSimilarity(left: string, right: string): number {
  const a = characterShingles(left)
  const b = characterShingles(right)
  if (a.size === 0 || b.size === 0) return 0
  let overlap = 0
  for (const item of a) if (b.has(item)) overlap += 1
  return (2 * overlap) / (a.size + b.size)
}

function longParagraphs(text: string): string[] {
  return text.split(/\n\s*\n/).map((part) => part.trim()).filter((part) => normalizedCopy(part).length >= 80)
}

const PRODUCTION_HEADING_PATTERN = /(?:^|\n)\s*(?:#{1,6}\s*|\[)?(?:풀이\s*\d+|상세\s*풀이|확인한\s*기준|이\s*풀이에\s*반영한\s*정보|겁주기보다\s*확인\s*방법)(?:\]|\s*[:：])?\s*(?:\n|$)/m
const GENERIC_COPY_PATTERNS = [
  /상황마다[^.!?。\n]{0,30}다르게/,
  /(?:전체적인|전반적인)?\s*흐름[^.!?。\n]{0,30}(?:이어|나타|흘러)/,
  /마음을?\s*편히/,
  /좋은\s*방향/,
  /자신에게\s*맞는\s*선택/,
  /(?:충분해요|충분합니다|충분하다)/,
]

/** Deterministic lower-bound checks for section-specific writing, not semantic equivalence. */
export function reviewSectionUniqueness(input: SectionUniquenessInput): ToneReview {
  const issues: string[] = []
  const completed = (input.siblings ?? []).filter((item) => item.status === 'complete')
  const hookKey = normalizedCopy(input.hook)
  if (hookKey.length >= 8 && completed.some((item) => normalizedCopy(item.hook) === hookKey)) {
    issues.push('다른 항목과 같은 답을 재사용하지 말고 현재 질문에 고유한 결론을 쓰세요.')
  }

  const priorParagraphs = completed.flatMap((item) => longParagraphs(item.interpretation))
  const repeatedLongParagraphs = longParagraphs(input.interpretation).filter((paragraph) =>
    priorParagraphs.some((prior) => shingleSimilarity(paragraph, prior) >= 0.86),
  )
  if (repeatedLongParagraphs.length >= 2) {
    issues.push('다른 항목과 동일하거나 거의 같은 긴 문단이 두 개 이상입니다. 현재 질문의 의미와 장면으로 다시 쓰세요.')
  }

  if (PRODUCTION_HEADING_PATTERN.test(input.interpretation)) {
    issues.push('제작용 소제목 대신 내용을 바로 알 수 있는 생활 장면형 소제목을 쓰세요.')
  }

  const outputKey = normalizedCopy(`${input.hook}\n${input.interpretation}`)
  const questionWords = (input.question.match(/[\p{L}\p{N}]+/gu) ?? [])
    .map((word) => word.replace(/(?:에서|으로|에게|부터|까지|처럼|보다|이라는|라고|을|를|이|가|은|는|의|와|과|도|만)$/u, ''))
    .filter((word) => word.length >= 2 && !/^(?:지금|현재|무엇|어떻게|어떤|언제|먼저|다음|기준|흐름|항목)$/.test(word))
  const hasQuestionAnchor = questionWords.length === 0 || questionWords.some((word) => outputKey.includes(normalizedCopy(word)))
  const genericSignalCount = GENERIC_COPY_PATTERNS.filter((pattern) => pattern.test(input.interpretation)).length
  if (!hasQuestionAnchor && genericSignalCount >= 2) {
    issues.push('질문의 핵심 장면 없이 범용 문구만 이어져 다른 제목으로 바꿔도 통할 수 있습니다.')
  }

  return { passed: issues.length === 0, issues }
}

function hasRecognizableScene(text: string): boolean {
  // An example marker is framing, not a scene by itself. Require a concrete
  // everyday setting/object to be paired with an observable situation.
  const ordinaryScene = /(?:(?:출근|퇴근|회의|답장|연락|약속|대화|업무|시험|책상|침대|현관|옷장|거울|가방|서랍|신발장|식사|밥상|식탁|점심|메뉴판|냉장고|산책|결제|지출|면접|공부|하루|주말|도서관|예식장|웨딩홀|상담\s*테이블|대관표|보증\s*인원표|양가\s*이동|계약서|스드메)[^.!?。\n]{0,70}(?:때|장면|상황|경우|에서|하면|했을|앉으면|이면|여야|없다면|있다면|않다면|보이면|갈리면|펼쳐|놓으면|적으면|비교하면|확인하면))|(?:(?:독서실|자습실|학원|서점|장바구니|강의|문제집|실모|채점표|오답\s*노트|노트북|접수\s*화면|주문창)[^.!?。\n]{0,55}(?:앞(?:에서는)?|옆에|순간|채점\s*직후|열\s*때|보면|켜면|펴봐|펴고|펴지면|열면|여는|닫아봐|반복될\s*때|밀려))|(?:문제[^.!?。\n]{0,45}(?:때|장면|상황|경우|했을))/.test(text)
  const reviewSession = sentences(text).some((sentence) => {
    const setting = /(?:복기\s*(?:에서|할\s*때|때|하면서)|오답\s*노트(?:를\s*(?:열고|펼치고)|에(?:서|선|서는|도|는)?)|마킹\s*검토(?:(?:를\s*)?(?:할\s*때|하면서)|에서))/.exec(sentence)
    if (!setting) return false
    const beforeSetting = sentence.slice(Math.max(0, setting.index - 40), setting.index)
    const afterSetting = sentence.slice(setting.index + setting[0].length, setting.index + setting[0].length + 60)
    const target = /(?:문제|오답|정답|찍|지식|표시|실수|시간|마킹|선택지|보기|함정|빈칸|조건|이유|원인|유형|점수|답안)/
    const affirmativeAction = /(?:나눠(?:봐|보세요|요)?|나누(?:어|세요|자)|(?:분류|기록|확인|비교|표시|체크)(?:해(?:봐|보세요|요)?|하세요|한다|했다|하면서|하자)|적어(?:봐|보세요|요)?|적(?:는다|었다|으세요|자)|되짚어(?:봐|보세요|요)?|되짚(?:는다|었다|으세요|자))(?=[\s,.!?。]|$)/
    const targetedAfterSetting = new RegExp(`${target.source}[^.!?。\\n]{0,40}${affirmativeAction.source}`).test(afterSetting)
    return targetedAfterSetting || (target.test(beforeSetting) && affirmativeAction.test(afterSetting))
  })
  const deskPlacementScene = /책상[^.!?。\n]{0,70}(?:정면|손\s*닿는\s*곳|시야\s*밖)[^.!?。\n]{0,70}(?:두고|둬봐|놓고|놓아)/.test(text)
  return ordinaryScene || reviewSession || deskPlacementScene
}

const nextCriterionAction = /(?:(?:비교|확인)해봐(?:요)?|골라(?:요|보세요)|골라둬(?:요|보세요)?|고르세요|남겨봐(?:요)?|남기세요|적(?:고|어(?:요|봐(?:요)?)?|으세요|으시겠어요)|(?:유지|비교|대화|이야기|질문|확인|기록|관찰|점검|선택|합의|보류|조정|복기)(?:해(?:봐(?:요)?|요|세요)?|하시겠어요)|표시(?:해(?:요)?|하세요|하시겠어요)|살펴봐(?:요)?|살펴보세요|세워봐(?:요)?|세우세요|정해(?:요)?|정하세요|매겨(?:요)?|매기세요)(?=[,.!?。\s]|$)/
// `부터` marks an origin, not an object. Treating it as a generic target lets
// targetless temporal advice such as "아침부터 확인해" pass this guard.
const objectMarkedNextTarget = `[\\p{L}\\p{N}](?:[\\p{L}\\p{N} ]{0,30}[\\p{L}\\p{N}])?(?:을|를|만|보다|(?<!앞)으로)[^.!?。\\n]{0,50}`
const subjectMarkedObservableNextTarget = `[\\p{L}\\p{N}](?:[\\p{L}\\p{N} ]{0,30}[\\p{L}\\p{N}])?(?:이|가)[^.!?。\\n]{0,24}(?:남는지|남았는지|줄었는지|늘었는지|달라졌는지|바뀌었는지|찍혔는지|맞는지|반복되는지|이어지는지|지켜지는지|나아졌는지)[^.!?。\\n]{0,16}`
const targetedNextAction = new RegExp(`(?:${objectMarkedNextTarget}|${subjectMarkedObservableNextTarget})${nextCriterionAction.source}`, 'u')
const pairedComparisonNextAction = /[\p{L}\p{N}](?:[\p{L}\p{N} ]{0,40}[\p{L}\p{N}])?(?:과|와)\s*비교해봐(?:요)?(?=[,.!?。\s]|$)/u
const perItemNextAction = /(?:문제|오답|답안|선택지|보기)마다[^.!?。\n]{0,50}(?:기록|확인|비교)해(?:요|세요)?(?=[,.!?。\s]|$)/u
const weddingPlanningNextAction = /(?:후보일|후보|예식장)[^.!?。\n]{0,100}(?:시간|인원|식대|비용|조건|동선|이동\s*부담)(?:을|를)[^.!?。\n]{0,30}(?:기록|확인|비교)(?:해요|하세요)(?=[,.!?。\s]|$)/u
const conditionalObservableNextTarget = `[\p{L}\p{N}](?:[\p{L}\p{N} ]{0,30}[\p{L}\p{N}])?(?:이|가)[^.!?。\n]{0,24}(?:남으면|줄면|달라지면|바뀌면|반복되면|이어지면|지켜지면|나아지면)[^.!?。\n]{0,36}`
const conditionalTargetedAction = new RegExp(`${conditionalObservableNextTarget}${nextCriterionAction.source}`, 'u')
const conditionalObservableDecision = /[\p{L}\p{N}](?:[\p{L}\p{N} ]{0,30}[\p{L}\p{N}])?(?:이|가)[^.!?。\n]{0,24}(?:남으면|줄면|달라지면|바뀌면|반복되면|이어지면|지켜지면|나아지면)[^.!?。\n]{0,36}(?:(?:지금|현재|하던|기존|그|혼자|같이)[^.!?。\n]{0,20})?(?:유지각(?:이야|야)?(?=[,.!?。\s]|$)|(?:유지|보류|조정)(?:야|이야|해|하세요)(?=[,.!?。\s]|$)|(?:새\s*)?(?:추가\s*)?자료(?:는|가)?[^.!?。\n]{0,8}나중이야(?=[,.!?。\s]|$))/u
const negatedNextAction = new RegExp(`(?:안|못)\\s*(?:${nextCriterionAction.source})|${nextCriterionAction.source}[^.!?。\\n]{0,12}(?:보지(?:는)?\\s*마|말(?:아|고|자|아요|세요)?(?=[\\s,.!?。]|$)|않|(?:볼\\s*)?(?:생각|의사|계획)(?:은|이|는|가|도|조차)?\\s*없|싫)`, 'u')
const pastNextAction = new RegExp(`${nextCriterionAction.source}\\s*(?:둔|뒀|두었|놓은|놨|본|봤|보았)(?=[\\p{L}\\p{N},.!?。\\s]|$)`, 'u')
const temporalOnlyNextTarget = new RegExp(`^(?:오늘|내일|이번|다음|앞으로|이후|먼저|우선)(?:만|과|와|을|를|으로|부터)?\\s*${nextCriterionAction.source}[.!?。]?$`, 'u')

function hasUnsafeNextCriterion(sentence: string): boolean {
  if (/(?:버릴|포기할|끊을|접을|그만둘|버려야\s*할|포기해야\s*할|끊어야\s*할|접어야\s*할|그만둬야\s*할)\s*(?:공부|시험|수험|응시)/u.test(sentence)) return true
  const abandonment = /(?:시험|수험|응시|공부)(?=을|를|은|는|도|만|\s)[^.!?。\n]{0,16}(?:버(?:리|려|릴)|끊(?=어|을|자|고|지|는|으)|접(?=어|을|자|고|지|는|으)|그만두|포기)/gu
  return [...sentence.matchAll(abandonment)].some((match) => {
    const suffix = sentence.slice((match.index ?? 0) + match[0].length, (match.index ?? 0) + match[0].length + 12)
    return !/^\s*(?:는\s*)?(?:(?:리)?지|하지)(?:는)?\s*(?:말|않)/.test(suffix)
  })
}

function hasSameSentenceNextCriterion(text: string): boolean {
  const marker = /(?:다음|앞으로|이후|먼저|우선|오늘|달별로|앉자마자|D-\d+|실모\s*뒤|변화가\s*생기면|선택할\s*때)/
  return sentences(text).some((sentence) => (
    marker.test(sentence)
    && (targetedNextAction.test(sentence) || pairedComparisonNextAction.test(sentence) || perItemNextAction.test(sentence) || weddingPlanningNextAction.test(sentence) || conditionalTargetedAction.test(sentence) || conditionalObservableDecision.test(sentence))
    && !hasUnsafeNextCriterion(sentence)
    && !temporalOnlyNextTarget.test(sentence)
    && !negatedNextAction.test(sentence)
    && !pastNextAction.test(sentence)
  ))
}

function hasAdjacentNextCriterion(text: string): boolean {
  const parts = sentences(text)
  const futurePlanSetting = /(?:다음|앞으로|이후|먼저|우선|오늘)[^.!?。\n]{0,60}(?:남길|유지할|비교할|확인할|기록할|볼|기준|루틴|오답\s*노트)/
  const explicitCheckSetting = /(?:(?:확인|판단|기록)(?:할)?|남길)\s*대상(?:은|이)[^.!?。\n]{2,90}/

  return parts.some((part, index) => {
    if (hasUnsafeNextCriterion(part)) return false
    const lookahead = explicitCheckSetting.test(part) ? 2 : futurePlanSetting.test(part) ? 1 : 0
    const actions = parts.slice(index + 1, index + 1 + lookahead)
    return actions.some((action) => (
      (targetedNextAction.test(action) || pairedComparisonNextAction.test(action) || perItemNextAction.test(action) || weddingPlanningNextAction.test(action))
      && !hasUnsafeNextCriterion(action)
      && !temporalOnlyNextTarget.test(action)
      && !negatedNextAction.test(action)
      && !pastNextAction.test(action)
    ))
  })
}

/**
 * A deterministic minimum-density gate. It checks observable writing signals only;
 * it does not claim that an interpretation is semantically correct or predictive.
 */
export function reviewPaidSectionDensity(input: PaidSectionDensityInput): PaidSectionDensityReview {
  const hook = input.hook.trim()
  const questionKey = normalizedCopy(input.question)
  const hookKey = normalizedCopy(hook)
  const text = input.interpretation.trim()
  const elements = {
    directAnswer: hookKey.length >= 6 && hookKey !== questionKey
      && (!/[?？]/.test(input.question) || !hookKey.startsWith(questionKey))
      && !/[?？]\s*$/.test(hook),
    grounding: /(?:적었|말했|느낀|고른|선택한|기록한|입력된|측정한|확인된|계산(?:된|값|에서)|관찰된|값\s*(?:없|미확인|미입력)|때문|이유|근거|조건(?:이|은|을|으로|부터)|판단\s*기준)/.test(text)
      || hasContextGrounding(text, input.context),
    scene: hasRecognizableScene(text),
    nextCriterion: hasSameSentenceNextCriterion(text) || hasAdjacentNextCriterion(text),
  }
  const issues: string[] = []
  if (!elements.directAnswer) issues.push('제목을 되묻거나 반복하지 말고 hook에 직접 답을 쓰세요.')
  if (!elements.grounding) issues.push('직접 답을 만든 개인 근거 또는 판단 조건을 밝히세요.')
  if (!elements.scene) issues.push('독자가 자기 일상에서 알아볼 수 있는 구체적인 장면을 넣으세요.')
  if (!elements.nextCriterion) issues.push('유지·비교·대화·행동 중 하나를 다음 판단 기준으로 제시하세요.')

  const frame = editorialFrame(text)
  if (frame && (input.siblings ?? []).some((item) => item.status === 'complete' && editorialFrame(item.interpretation) === frame)) {
    issues.push('다른 항목과 같은 편집 틀을 반복하지 말고 현재 질문에 맞는 결론 구조를 쓰세요.')
  }
  if (calmContextHasInventedCrisis(input.context, `${hook}\n${text}`)) {
    issues.push('평온하거나 만족한 사용자에게 입력에 없는 억지 위기를 만들지 마세요.')
  }
  return { passed: issues.length === 0, issues, elements }
}

export function reviewToneCopy(text: string, serviceKey?: string | null, options: ToneReviewOptions = {}): ToneReview {
  const persona = loadTonePersona(normalizeServiceKey(serviceKey))
  const prose = narrator(text)
  const issues: string[] = []
  const numericEvidence = normalizeEvidence(options.numericEvidence)
  if (options.contentRole === 'hook' && prose.trim() && !/[.!?。]$/.test(prose.trim())) {
    issues.push('판정 문장은 마침표로 끝내세요.')
  }
  if (/\b(?:concept|condition|interpretation|serviceKey|confidence|reportFeatures|groundedReportFeatures|scoring|debug|metadata|payload|outputShape|tokenUsage|ragTopK|evidenceLayers|userFacts|verifiedCalculations|traditionalInterpretationCandidates|fictionalExamplePolicy)\b|Feature JSON|<\/?(?:rag_knowledge|feature_json)|코퍼스|\bRAG\b|검색 점수|내부 프롬프트|내부 필드|JSON (?:필드|스키마)|시스템 프롬프트|개발자 프롬프트/i.test(text)) {
    issues.push('내부 근거 필드와 제작 용어를 고객 본문에 쓰지 마세요.')
  }
  const opening = prose.replace(/^\s*(?:\[[^\]\n]+\]\s*)?/, '')
  if (/^(?:현재 입력은|이 항목에서는|이 리포트에서는|단정하기 어렵지만|아래 (?:내용|정보)[을를] 바탕으로|제공된 (?:내용|정보)[을를]|주어진 (?:내용|정보)[을를])/.test(opening)) {
    issues.push('제작 과정이나 유보 문구로 시작하지 말고 현재 질문의 답부터 쓰세요.')
  }
  if (/(?:일세|하네|보게|알겠네|아닐세|하게나)(?=[.!?。\s]|$)|자네/.test(prose)) {
    issues.push('폐지된 하게체와 자네 호칭을 쓰지 마세요.')
  }
  if (/(?:^|[\s,.!?])(?:당신|고객님|니가|너는|너의|너를|야)(?=[\s,.!?]|$)/.test(prose)) {
    issues.push('고객을 호명하지 말고 주어를 생략하세요.')
  }
  if (/킹받|어쩔티비|중꺾마|갑분싸|야옹/.test(prose)) issues.push('밈과 애교 말투를 쓰지 마세요.')
  const style = persona.fields['말투']
  if (style.startsWith('반말체') && /(?:[가-힣]요|[가-힣]니다|십시오)(?=[.!?。]|$)/m.test(prose)) {
    issues.push('이 서비스의 서술 문장은 지정된 반말체로 유지하세요.')
  }
  if (style.startsWith('해요체') && /(?:[가-힣]니다|십시오)(?=[.!?。]|$)/m.test(prose)) {
    issues.push('이 서비스의 서술 문장은 지정된 해요체로 유지하세요.')
  }
  if (style.startsWith('격식체') && /[가-힣]요(?=[.!?。]|$)/m.test(prose)) {
    issues.push('이 서비스의 서술 문장은 지정된 격식체로 유지하세요.')
  }
  issues.push(...voiceRhythmIssues(prose))
  issues.push(...personaPerformanceIssues(prose))
  issues.push(...reviewSafetyClaims({ text: prose, context: options.context }).issues)
  issues.push(...actionTargetIssues(prose))
  if (options.corpusEvidence) issues.push(...corpusCopyIssues(prose, options.corpusEvidence))
  if (numericEvidence) {
    const calculation = arithmeticReview(prose, numericEvidence)
    issues.push(...calculation.issues)
    const evidenceWithDerived = new Set([...numericEvidence, ...calculation.derived])
    const unsupported = unsupportedPrescriptionNumbers(prose, evidenceWithDerived)
    if (unsupported.length > 0) issues.push(`근거 없는 처방 숫자를 만들지 마세요: ${unsupported.join(', ')}`)
  }
  return { passed: issues.length === 0, issues }
}

export function toneWritingInstruction(serviceKey?: string | null): string {
  const persona = loadTonePersona(normalizeServiceKey(serviceKey))
  return [
    `현재 서비스 말투: ${persona.fields['말투']}. 허용 종결: ${persona.fields['종결어미']}.`,
    'hook은 제목이나 질문을 되풀이하지 말고 질문에 대한 단독 답 한 문장으로 씁니다. 화면에서 hook이 본문보다 먼저 노출됩니다.',
    'hook을 포함한 첫 2~3문장 안에 목차의 질문에 직접 답하고 개인 근거 또는 판단 조건, 생활 장면, 다음 선택 기준을 포함합니다.',
    '생년월일, 주소, 고민, 선택지를 모든 항목에서 반복해 다시 읽어 주지 않습니다. 전체 소개가 필요하면 첫 항목에서 한 번만 씁니다.',
    '제목과 입력을 반복해 분량을 늘리지 않습니다. 원고 예시나 이전 템플릿을 복사하지 않습니다.',
    'evidenceLayers의 네 층을 섞지 않습니다. userFacts는 사용자 진술, verifiedCalculations는 서버 계산, traditionalInterpretationCandidates는 전통적 상징 후보입니다.',
    '가상의 생활 사례는 실제 경험처럼 쓰지 않고 반드시 “예를 들어” 또는 “만약”으로 시작해 구분합니다.',
    '행동은 막연히 확인·정리·대화하라고 끝내지 말고 무엇을 확인·비교·기록할지 대상을 밝힙니다.',
    '자료가 없는 빈칸을 소설로 채우지 않습니다. 대신 지금 확인할 수 있는 현실 조건을 제시합니다.',
    '문단은 의미에 따라 구분합니다. 모든 서비스에 같은 글자 수나 문장 수를 강제하지 않습니다.',
    '한 문장에는 하나의 중심 생각만 담습니다. 각 의미 단락은 2~4개의 완성 문장으로 쓰고 의미가 바뀌면 빈 줄을 둡니다.',
    '본문의 마지막 의미 단락에는 사용자가 실제로 확인·비교·기록할 행동을 2~4개의 완성 문장으로 따로 씁니다.',
    '긴 목록을 슬래시로 압축하지 않습니다. 문장이나 항목으로 나누어 모바일에서도 한 번에 읽히게 씁니다.',
    '읽겠요, 편재이, 결를 같은 조사·종결어미 오류가 없는지 최종 응답 전에 바로잡습니다.',
    '판정 문장은 마침표로 끝냅니다. 카드 라벨·순번·태그에는 마침표를 붙이지 않고 필요한 구분에는 가운뎃점(·)을 씁니다.',
    '다른 항목과 같은 문제→경고→해결 또는 결론→근거→놓친 것→권고 편집 틀을 반복하지 않습니다. 평온한 입력에는 억지 위기를 만들지 않습니다.',
    '제목을 다른 제목으로 바꿔도 통하는 범용 문단은 쓰지 않습니다. 현재 질문의 핵심 장면과 의미가 드러나야 하며, 다른 항목의 hook이나 긴 문단을 재사용하지 않습니다.',
    '풀이 번호·상세 풀이·확인한 기준 같은 제작용 소제목 대신 내용을 바로 알 수 있는 생활 장면형 소제목을 씁니다.',
    '한 서비스 안에서는 지정된 말투를 유지하되 같은 종결어미만 모든 문장에 반복하지 않습니다. 체언 판정은 종결어미가 없으므로 말투 이탈로 보지 않습니다.',
    '캐릭터의 나이·출신·경력·자격·초능력·과거를 만들지 않습니다. 비하·아기 말투·독심술·과장된 신당 연출 대신 정확한 생활 장면과 작은 비유를 씁니다.',
    '한 리포트에서 전문용어가 처음 나오면 한글(한자, 쉬운 뜻)로 한 번 설명하고 이후에는 한글만 써도 됩니다. 한 문장에 여러 한자 설명이나 중첩 괄호를 넣지 않습니다.',
    '오행 개수만으로 용신을 정하지 않고, 신강·신약을 체력·의지·인격 등급으로 바꾸지 않습니다. 합을 재결합, 충을 이별 사건과 등치하지 않습니다.',
    '점수·확률·날짜·차트 값은 evidenceLayers의 서버 근거에 있는 값만 씁니다. 해석 점수는 사건 확률이 아니라 적합도·주의도·우선순위로 이름 붙이고 산정 축과 높고 낮을 때의 의미를 설명합니다.',
    '실제 비교 대상이 없으면 비교 점수를 만들지 않습니다. 차트는 비교·변화·우선순위 판단에 필요할 때만 쓰고 같은 데이터를 표와 차트에 반복하지 않습니다.',
    '티저로 사용될 첫 항목은 서버 계산·해석에 근거한 한 줄 판정, 대표 근거 1~2개, 일상에서 알아볼 장면 하나를 포함합니다. 전체 결론은 풀지 말고 유료 목차가 해결할 비교·판단 기준을 구체적으로 밝힙니다.',
    '티저에는 로그인·결제 상태, 서버 권한, 생성 상태 같은 운영 문구를 쓰지 않습니다. 잠긴 본문의 가짜 인용, 공포·손실 회피, 근거 없는 개인 예언으로 결제를 유도하지 않습니다.',
    '출생 시각 미상 등 없는 계산은 추측하지 않습니다. 사용자 입력, 서버 계산, 현재 항목 제목에 없는 처방 숫자를 만들지 않습니다.',
    '미래 사건, 타인의 마음, 회사·가족·집·반려묘 상태를 확인된 사실처럼 쓰지 않습니다.',
    '실제 사람의 외도·질병·수명·합격·채용·수익·결혼·이별을 확정하지 않습니다. 단호함은 확인된 구조와 현실 행동의 우선순위에만 씁니다.',
    '차단·접촉 거부·위협·강요가 있으면 재접촉보다 경계 존중과 안전을 먼저 안내합니다.',
    '건강·법률·투자·계약의 전문 판단을 서술자의 권위로 대신하지 않습니다. 필요한 경우 자격 있는 전문가의 확인을 안내합니다.',
    '고양이 행동을 보호자의 사주 결함 탓으로 돌리지 않습니다. 측정하지 않은 방위·지형을 흉지·사고·재산 가치와 연결하지 않습니다.',
    '이전에 완료된 문장은 반복 검사용입니다. 현재 항목의 사실이나 재사용 원고가 아닙니다.',
    '검수 응답, evidenceLayers, reportFeatures, scoring, debug, metadata, payload 같은 내부 구조·용어는 고객 문장에 쓰지 않습니다. 요청한 JSON의 id, hook, interpretation만 반환합니다.',
  ].join('\n')
}
