import type { SajuAnalysis, SajuReport, SajuReportContext, SajuReportQuality, SajuReportQualityCategory, SajuReportSection } from '../types/index.js'
import { normalizeReportCopy } from './copy-guide.js'

/** Observable editorial checks, not a fact checker or prediction confidence.
 * No risk vocabulary, technical-term count or RAG topic count earns points. */
export const REPORT_QUALITY_LIMITATION = '자동 글 품질 점수이며 LLM의 전문적 사실 정확성이나 예측의 정확성을 보장하지 않습니다.'

// These established master-report IDs only group sections; their words do not earn points.
const MASTER_GROUPS: Array<[string, string, string[]]> = [
  ['four-pillars', '사주팔자 / 명식 구조', ['pillars-structure', 'year-pillar', 'month-pillar', 'day-pillar', 'hour-pillar']],
  ['manseryeok', '만세력 설명의 범위', ['pillars-structure', 'future-flow']],
  ['day-master', '일간 풀이', ['profile', 'day-master-strength']],
  ['day-strength', '일간 강약', ['day-master-strength', 'balance']],
  ['elements', '오행 풀이', ['balance', 'dominant-element', 'weak-element']],
  ['ten-gods', '십성 풀이', ['ten-gods-overview', 'ten-gods-position']],
  ['useful-god', '용신 / 조후 설명', ['useful-god-eokbu', 'useful-god-johu']],
  ['personality', '성격 / 기질 풀이', ['profile', 'hidden-personality']],
  ['concern', '현재 상태와 질문', ['trap', 'concern-loop']],
  ['fortune-cycle', '대운 · 세운', ['future-flow', 'daewoon-detail', 'sewoon-detail']],
  ['turning-point', '전환 조건', ['turning-years', 'timing-place']],
  ['wealth', '재물 해석', ['wealth-flow', 'money-leak', 'wealth-timing']],
  ['career', '일 / 직업 해석', ['career-money', 'work-context', 'career-transition']],
  ['love', '연애 해석', ['relationship-status', 'love-loop', 'love-timing']],
  ['destiny', '동반자 판단 기준', ['destiny-partner', 'love-timing']],
  ['relationship-loop', '관계 경험과 적용 조건', ['love-loop', 'avoid-relationship', 'trap']],
  ['same-sex-relationship', '관계의 다양성', ['relationship-orientation', 'avoid-relationship']],
  ['timing-place', '시기와 장소의 조건', ['timing-place', 'love-timing', 'wealth-timing']],
  ['long-report', '해석의 깊이와 실행', ['long-report-depth', 'action-guide']],
  ['rag-precision', '근거 설명의 투명성', ['long-report-depth', 'concern-loop', 'relationship-status']],
  ['corpus-quality', '전통 설명과 적용 범위', ['long-report-depth', 'useful-god-johu', 'ten-gods-position']],
  ['risk-tone', '문제의 유무와 조건부 대응', ['trap', 'avoid-relationship', 'money-leak', 'future-flow']],
]

const TECHNICAL_TERMS = ['일간', '일지', '일주', '시주', '월주', '년주', '명식', '원국', '십성', '십신', '오행', '용신', '희신', '기신', '관성', '재성', '인성', '식상', '비겁', '정관', '편관', '정재', '편재', '비견', '겁재', '정인', '편인', '식신', '상관', '대운', '세운', '신강', '신약', '조후', '통관', '격국', '지장간', '도화']
const TYPO = /편재이|당신로|읽겠요|찾겠요|잡요|적었요|보았요|결를|자시을|전면 출근로|되요|할께|됬/g
const INTERNAL = /\b(?:concept|condition|interpretation|serviceKey|main_purpose|desk_position)\s*[:=]|Feature JSON|상담 의도:|\bhot\/dry\b/i
const CAUTION_OR_NEGATION = /(?:단정|추정|보장|판정|확정).{0,8}(?:않|없)|아닙|아니에|해서는 안|하지 마|금지|뜻하지 않|의미하지 않/

function percent(value: number): number { return Math.max(0, Math.min(100, Math.round(value))) }
function average(values: number[]): number { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0 }
function plain(text: string): string { return text.replace(/^\[[^\]]+\]\s*/, '').replace(/\s+/g, ' ').trim() }
function paragraphs(text: string): string[] { return text.split(/\n\s*\n/).map(plain).filter(Boolean) }
function sentences(text: string): string[] { return text.split(/[.!?。]+(?:\s|$)|\n+/).map(plain).filter((line) => line.length >= 18) }

function contextFacts(value: unknown, key = ''): string[] {
  if (/^(?:serviceKey|name|displayName|id|email|accessToken|provider|image|address|birth)/i.test(key)) return []
  if (typeof value === 'string') return /[가-힣]/.test(value) && value.trim().length >= 3 ? [value.trim()] : []
  if (Array.isArray(value)) return value.flatMap((item) => contextFacts(item, key))
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([name, item]) => contextFacts(item, name))
  return []
}

function inputState(facts: string[]): 'settled' | 'concern' | 'unknown' {
  const input = facts.join(' ')
  const withoutNegatedProblems = input.replace(/(?:문제|불편|고민|소진|갈등|스트레스|연체|불안)\s*(?:가|이|은|는)?\s*(?:없\S*|크지 않\S*)/g, '')
  if (/불만족|불안정|불안|갈등|소진|고통|연체|적자|괴롭|힘들/.test(withoutNegatedProblems)) return 'concern'
  if (/문제\s*없|불편\s*없|만족|잘 지내|잘 유지|잘 관리|안정|예산대로/.test(input)) return 'settled'
  return 'unknown'
}

/** Check first-use explanations, not the quantity of technical words present. */
function unexplainedTerms(text: string): string[] {
  const missing: string[] = []
  for (const term of TECHNICAL_TERMS) {
    const index = text.indexOf(term)
    if (index < 0) continue
    const after = text.slice(index + term.length, index + term.length + 110)
    const parenthesis = after.match(/^\s*[（(]([^）)]*)[）)]/)?.[1] ?? ''
    const explained = /[가-힣]{2}/.test(parenthesis.replace(/[一-龥]/g, ''))
      || /^(?:은|는|이란|이|을|를)?\s*[^.!?\n]{2,90}(?:뜻|말합|말해|가리|의미|기준|상징|관점|관계|기둥|체계|분류|천간|지지)/.test(after)
    if (!explained) missing.push(term)
  }
  for (const match of text.matchAll(/[一-龥]+/g)) {
    const index = match.index ?? 0
    const before = text.slice(Math.max(0, index - 20), index)
    const after = text.slice(index + match[0].length, index + match[0].length + 90)
    const explained = /[가-힣]\s*[（(]$/.test(before) && /^[^）)]*[,，][^）)]*[가-힣]{2}/.test(after)
      || /^[（(][^）)]*[가-힣]{2}[^）)]*[）)]/.test(after)
    if (!explained) missing.push(match[0])
  }
  return [...new Set(missing)]
}

interface EditorialReview {
  evidence: number
  scope: number
  clarity: number
  structure: number
  practical: number
  integrity: number
  depth: number
  overall: number
  notes: string[]
}

function reviewSection(section: SajuReportSection, report: SajuReport, context: SajuReportContext): EditorialReview {
  const text = section.interpretation.trim()
  const parts = paragraphs(text)
  const lines = sentences(text)
  const facts = contextFacts(context)
  const state = inputState(facts)
  const issues: string[] = []
  const substantial = (pattern: RegExp) => lines.some((line) => pattern.test(line))
  const inputReflected = facts.some((fact) => fact.length >= 8 && text.includes(fact))
  const currentExplained = inputReflected || substantial(/입력|말씀|적어 주|문진|현재.{0,35}(?:상태|상황|확인)|정보.{0,25}(?:부족|없|확인)/)
  const evidenceExplained = substantial(/(?:전통|상징|계산|분포|관찰|근거|확인된).{3,80}(?:뜻|구분|의미|따라|참고|기준|이유|때문|판단|다르|아닙|보류)/)
  const limitsExplained = substantial(/(?:알 수|판단할 수|확인할 수|확정할 수).{0,12}없|(?:확인되지|입력되지|단정하지|추정하지)|(?:상징|가정|예시|비유).{0,25}(?:실제|확인|구분|참고)|조건.{0,30}(?:맞|때|다르)/)
  const evidence = (currentExplained ? 35 : 0) + (evidenceExplained ? 35 : 0) + (limitsExplained ? 30 : 0)
  if (!currentExplained) issues.push('입력·현재 상태·정보 한계의 연결을 더 분명히 설명하세요.')
  if (!evidenceExplained) issues.push('결론의 근거와 현실에 적용하는 이유를 설명하세요.')

  const settledRecognized = substantial(/(?:현재|이미|지금|입력|특별한).{0,45}(?:문제.{0,8}없|만족|안정|잘 유지|잘 지내)|(?:유지|바꿀 필요|고칠 필요).{0,25}(?:우선|없|좋|충분)/)
  const uncertaintyRecognized = substantial(/(?:정보|입력|상황|경험|수준).{0,40}(?:부족|없|확인되지|충분하지|모르)|(?:판단|결론|해석).{0,15}(?:보류|열어|유보)/)
  const fabricated = lines.some((line) => !CAUTION_OR_NEGATION.test(line) && /숨겨진.{0,15}(?:문제|상처|결핍)|(?:당신|본인)은.{0,30}(?:애정결핍|불면|번아웃)|문제.{0,8}없.{0,20}(?:실제로는|사실은)/.test(line))
  const certainty = lines.some((line) => !CAUTION_OR_NEGATION.test(line) && /반드시.{0,15}(?:합격|이별|결혼|퇴사|망합)|무조건.{0,15}(?:성공|실패)|외도를 (?:합니다|할|확인)|합격률.{0,8}\d+\s*%/.test(line))
  const dismissesConcern = state === 'concern' && !inputReflected && substantial(/문제.{0,8}없|잘 유지되는 상태|모두 괜찮/)
  let scope = limitsExplained ? 85 : 55
  if (state === 'settled' && settledRecognized || state === 'unknown' && uncertaintyRecognized || state === 'concern' && inputReflected) scope = 100
  if (fabricated || certainty || dismissesConcern) {
    scope = 0
    issues.push('입력에 없는 문제·사건을 만들거나 실제 우려를 지우는 단정을 점검하세요.')
  }
  if (state === 'settled' && !settledRecognized) issues.push('잘 유지되는 상태를 인정하고 불필요한 교정은 요구하지 마세요.')
  if (state === 'unknown' && !uncertaintyRecognized && !currentExplained) issues.push('정보 부족을 문제의 증거로 취급하지 말고 판단 범위를 밝혀 주세요.')

  const missingTerms = unexplainedTerms(text)
  const longSentences = lines.filter((line) => line.length > 180).length / Math.max(1, lines.length)
  const clarity = percent(100 - Math.min(70, missingTerms.length * 14) - longSentences * 30)
  if (missingTerms.length) issues.push(`첫 전문용어·한자의 쉬운 풀이 필요: ${missingTerms.slice(0, 6).join(', ')}`)
  if (longSentences > 0.25) issues.push('한 문장에 조건이 겹쳐 있습니다. 문장을 나누세요.')

  const oversized = parts.filter((part) => part.length > 550).length
  const structure = percent((parts.length >= 5 ? 100 : parts.length >= 3 ? 75 : parts.length === 2 ? 45 : 0) - oversized * 15)
  if (parts.length < 5 || oversized) issues.push('답·근거·사례·판단·실행을 읽기 쉬운 의미 단락으로 구분하세요.')

  const scene = substantial(/예를 들|예를 들어|가령|상황에서|장면|경우|만약|반면/)
  const criterion = substantial(/(?:다면|경우|때|인지).{5,100}(?:확인|비교|판단|기준|구분|유지|조정)|(?:기준|조건).{5,80}(?:확인|비교|맞|달라|다르)/)
  const action = substantial(/.{10,}(?:기록|적어|비교|질문|확인|정리|유지|나누|합의|관찰|보류|점검).{0,30}(?:하세요|해 보|해보|좋습니다|충분|둡니다|보세요|할 수)/)
  const feedback = substantial(/(?:변화|반복|전후|결과|여전히|이후|실제로).{4,75}(?:확인|비교|판단|유지|조정|살펴)/)
  const practical = (scene ? 25 : 0) + (criterion ? 30 : 0) + (action ? 30 : 0) + (feedback ? 15 : 0)
  if (!scene || !criterion || !action) issues.push('현재 질문에 맞는 생활 사례·판단 조건·실행을 구체적으로 연결하세요.')

  const repeatedWithin = (parts.length - new Set(parts).size) / Math.max(1, parts.length)
  const repeatedSentences = (lines.length - new Set(lines).size) / Math.max(1, lines.length)
  const otherParagraphs = new Set(report.sections.filter((item) => item !== section).flatMap((item) => paragraphs(item.interpretation)).filter((part) => part.length > 80))
  const borrowed = parts.filter((part) => part.length > 80 && otherParagraphs.has(part)).length
  const repeatedAcross = borrowed >= 2 ? borrowed / Math.max(1, parts.length) : 0
  const typos = [...text.matchAll(TYPO)].length
  const internal = INTERNAL.test(text)
  const integrity = percent(100 - repeatedWithin * 100 - repeatedSentences * 70 - repeatedAcross * 70 - Math.min(50, typos * 15) - (internal ? 50 : 0))
  if (repeatedWithin || repeatedSentences || repeatedAcross) issues.push('같은 문장·문단의 반복으로 분량을 채우지 말고 항목별 답을 구별하세요.')
  if (typos) issues.push(`알려진 조사·종결어미 오타 ${typos}건을 검토하세요.`)
  if (internal) issues.push('내부 필드명·원문 지시문이 본문에 노출되었습니다.')

  // Length is necessary but never sufficient: repeat/keyword padding cannot pass.
  const depth = percent(Math.min(text.length / 800, 1) * 55 + Math.min(lines.length / 8, 1) * 45)
  let overall = evidence * 0.2 + scope * 0.15 + clarity * 0.1 + structure * 0.1 + practical * 0.2 + integrity * 0.15 + depth * 0.1
  if (text.length < 120) overall = Math.min(overall, 15)
  else if (text.length < 350 || lines.length < 3) overall = Math.min(overall, 40)
  if (fabricated || certainty || dismissesConcern) overall = Math.min(overall, 45)
  if (integrity < 50) overall = Math.min(overall, 55)
  if (!text) overall = 0
  return { evidence, scope, clarity, structure, practical, integrity, depth, overall: percent(overall), notes: issues }
}

function category(id: string, label: string, sections: SajuReportSection[], reviews: Map<SajuReportSection, EditorialReview>): SajuReportQualityCategory {
  const checks = sections.map((section) => reviews.get(section)!)
  const score = (field: keyof Omit<EditorialReview, 'notes'>) => percent(average(checks.map((check) => check[field])))
  return {
    id, label, sectionIds: sections.map((section) => section.id),
    // Zero means UNVERIFIED, not poor RAG. Real usage requires evidence logs.
    ragUsagePercent: 0, corpusRelevancePercent: 0,
    toneGroundingPercent: percent((score('scope') + score('clarity') + score('integrity')) / 3),
    llmGroundingPercent: score('evidence'), completenessPercent: score('overall'),
    evidence: [
      REPORT_QUALITY_LIMITATION,
      'RAG 실제 사용률·코퍼스 정확도는 미검증(호환 필드의 0은 미검증 표시이며 총점에서 제외).',
      `본문 ${sections.length}개 항목: 근거 표현 ${score('evidence')} · 상태/적용 범위 ${score('scope')} · 쉬운말 ${score('clarity')}`,
      `의미 단락 ${score('structure')} · 구체 사례/기준/실행 ${score('practical')} · 중복/오타 ${score('integrity')} · 설명 분량 ${score('depth')}`,
      ...[...new Set(checks.flatMap((check) => check.notes))],
    ],
  }
}

export function evaluateReportQuality(report: SajuReport, _analysis: SajuAnalysis, context: SajuReportContext = {}): SajuReportQuality {
  const reviews = new Map(report.sections.map((section) => [section, reviewSection(section, report, context)]))
  const categories: SajuReportQualityCategory[] = []
  const covered = new Set<SajuReportSection>()
  if (!context.serviceKey || context.serviceKey === 'saju_master') {
    for (const [id, label, ids] of MASTER_GROUPS) {
      const sections = report.sections.filter((section) => ids.includes(section.id))
      if (!sections.length) continue
      sections.forEach((section) => covered.add(section))
      categories.push(category(id, label, sections, reviews))
    }
  }
  const remaining = new Map<string, SajuReportSection[]>()
  for (const section of report.sections.filter((item) => !covered.has(item))) {
    const label = section.category || section.classification || '해석'
    remaining.set(label, [...(remaining.get(label) ?? []), section])
  }
  for (const [label, sections] of remaining) categories.push(category(`sections:${sections[0].id}`, label, sections, reviews))
  const all = [...reviews.values()]
  return {
    // Each actual section counts once, even when master categories overlap.
    overallPercent: percent(average(all.map((review) => review.overall))),
    ragUsagePercent: 0, corpusRelevancePercent: 0,
    toneGroundingPercent: percent(average(all.map((review) => (review.scope + review.clarity + review.integrity) / 3))),
    llmGroundingPercent: percent(average(all.map((review) => review.evidence))), categories,
  }
}

export function finalizeSpecializedReport(report: SajuReport, analysis: SajuAnalysis, context: SajuReportContext): SajuReport {
  const normalized = normalizeReportCopy(report)
  normalized.quality = evaluateReportQuality(normalized, analysis, context)
  return normalized
}
