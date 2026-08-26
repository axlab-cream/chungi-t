import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { RagChunk, SajuAnalysis, SajuReportContext } from '../types/index.js'
import { retrieveVectorRagChunks } from './embedder.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_ROOT = join(__dirname, '../../data')
const CORPUS_FILES = [
  'corpus/myeongri-basics.json',
  'corpus/deep-saju-interpretation.json',
  'corpus/input-context-interpretation.json',
]

interface ConsultationTemplate {
  id: string
  intent: string
  keywords: string[]
  promptHint: string
}

interface CorpusFile {
  domain?: string
  chunks?: RagChunk[]
  templates?: ConsultationTemplate[]
}

interface SajuElementsFile {
  elementProfiles?: Record<string, {
    keywords?: string[]
    strongTraits?: string
    weakTraits?: string
    advice?: string
  }>
  dayMasterAdvice?: Record<string, string>
}

function loadJson<T>(relativePath: string): T {
  const raw = readFileSync(join(DATA_ROOT, relativePath), 'utf-8')
  return JSON.parse(raw) as T
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
}

function tokenize(text: string): string[] {
  return normalizeText(text).match(/[\uac00-\ud7a3a-z0-9]+/g) ?? []
}

const SYNONYMS: Record<string, string[]> = {
  본인: ['나', '자기', '내상태', '자기이해', '현재고민'],
  가족: ['부모', '자녀', '형제', '집안', '거리조절'],
  연인: ['연애', '배우자궁', '관계패턴', '인연', '상대'],
  친구: ['비견', '겁재', '비겁', '우정', '경쟁', '거리감'],
  기타: ['타인', '상대', '기본성향', '관찰'],
  솔로: ['연애운', '인연', '일지', '도화', '오래남는사람'],
  짝사랑: ['마음에둔사람', '썸', '끌림', '도화', '합'],
  이별: ['재회', '상실', '관계반복', '마음', '정리'],
  결혼: ['배우자', '부부', '생활', '책임', '정재'],
  학생: ['공부', '진로', '인성', '식상', '시험'],
  구직: ['취업', '일자리', '직업', '관성', '식상'],
  직장: ['회사', '업무', '조직', '관성', '월주', '이직'],
  사업: ['편재', '식상', '시장', '돈구멍', '창업'],
  프리랜서: ['프로젝트', '외주', '식상', '재성', '계약'],
  휴식: ['쉬고', '공백기', '번아웃', '회복', '인성'],
  돈: ['재물', '재물운', '재성', '정재', '편재', '돈구멍'],
  재물: ['돈', '재물운', '재성', '정재', '편재', '수입'],
  직업: ['직장', '커리어', '관성', '식상', '월주', '일운'],
  연애: ['관계', '인연', '배우자궁', '일지', '도화'],
  관계: ['연애', '일지', '배우자궁', '비겁', '합충'],
  용신: ['희신', '기신', '억부', '조후', '통관', '보완'],
  대운: ['세운', '전환', '시기', '10년', '운세'],
  세운: ['올해', '연도', '대운', '신호', '운세'],
  시기: ['대운', '세운', '전환', '합충', '신호'],
  장소: ['오행', '생활공간', '인연장소', '사건장소'],
  리포트: ['장문', '상세풀이', '근거', '섹션', '95점'],
  dominant: ['강한', '오행', '과다'],
  element: ['오행', '목', '화', '토', '금', '수'],
}

const ELEMENT_TERMS: Record<string, string[]> = {
  wood: ['목', '갑', '을', '木', '성장', '시작'],
  fire: ['화', '병', '정', '火', '표현', '열정'],
  earth: ['토', '무', '기', '土', '현실', '안정'],
  metal: ['금', '경', '신', '金', '기준', '판단'],
  water: ['수', '임', '계', '水', '직관', '흐름'],
}

function expandTokens(tokens: string[]): string[] {
  const expanded = new Set(tokens.filter(Boolean))
  for (const token of tokens) {
    for (const synonym of SYNONYMS[token] ?? []) expanded.add(synonym)
  }
  return [...expanded]
}

function loadTemplates(): ConsultationTemplate[] {
  return loadJson<CorpusFile>('corpus/consultation-templates.json').templates ?? []
}

function buildElementChunks(): RagChunk[] {
  const elements = loadJson<SajuElementsFile>('corpus/saju-elements.json')
  const profileChunks = Object.entries(elements.elementProfiles ?? {}).map(([element, profile]) => ({
    id: `el-${element}`,
    topic: `오행 프로필: ${element}`,
    keywords: [element, ...(profile.keywords ?? [])],
    content: [
      profile.strongTraits ? `강점: ${profile.strongTraits}` : '',
      profile.weakTraits ? `주의: ${profile.weakTraits}` : '',
      profile.advice ? `조언: ${profile.advice}` : '',
    ].filter(Boolean).join(' '),
    domain: 'saju_elements',
  }))

  const dayMasterChunks = Object.entries(elements.dayMasterAdvice ?? {}).map(([stem, advice]) => ({
    id: `dm-${stem}`,
    topic: `일간 조언: ${stem}`,
    keywords: [stem, '일간', '기질', '성격', '조언'],
    content: advice,
    domain: 'saju_elements',
  }))

  return [...profileChunks, ...dayMasterChunks]
}

/** O(n) — 코퍼스 인덱스 로드 */
export function buildCorpusIndex(): RagChunk[] {
  const corpusChunks = CORPUS_FILES.flatMap((file) => {
    const data = loadJson<CorpusFile>(file)
    return (data.chunks ?? []).map((chunk) => ({
      ...chunk,
      domain: data.domain,
    }))
  })

  const templateChunks = loadTemplates().map((template) => ({
    id: `tpl-${template.id}`,
    topic: `상담 의도: ${template.intent}`,
    keywords: [template.intent, ...template.keywords],
    content: template.promptHint,
    domain: 'consultation_templates',
  }))

  return [...corpusChunks, ...buildElementChunks(), ...templateChunks]
}

function keywordScore(keyword: string, queryRaw: string, queryTokens: string[]): number {
  const normalized = normalizeText(keyword)
  if (!normalized) return 0

  const keywordTokens = tokenize(normalized)
  if (normalized.length <= 1) return queryTokens.includes(normalized) ? 3 : 0
  if (queryRaw.includes(normalized)) return 18
  if (keywordTokens.length > 1 && keywordTokens.every((token) => queryTokens.includes(token))) return 14
  if (queryTokens.includes(normalized)) return 12
  if (queryTokens.some((token) => token.length >= 2 && (normalized.includes(token) || token.includes(normalized)))) return 5
  return 0
}

export function detectIntent(message: string): string {
  const templates = loadTemplates()
  const queryRaw = normalizeText(message)
  const queryTokens = expandTokens(tokenize(message))
  let best = { intent: 'general', score: 0 }

  for (const template of templates) {
    if (template.intent === 'general') continue
    const score = template.keywords.reduce((total, keyword) => total + keywordScore(keyword, queryRaw, queryTokens), 0)
    if (score > best.score) best = { intent: template.intent, score }
  }

  return best.score > 0 ? best.intent : 'general'
}

function contextTokens(context?: SajuReportContext): string[] {
  if (!context) return []
  const values = [
    context.target,
    context.relationship,
    context.orientation,
    context.work,
    context.concern,
  ].filter((value): value is string => Boolean(value && value.trim()))

  const rawTokens = values.flatMap(tokenize)
  const joined = values.join(' ')
  const direct: string[] = []

  if (joined.includes('본인')) direct.push('본인', '내상태', '현재고민')
  if (joined.includes('가족')) direct.push('가족', '부모', '자녀', '거리조절')
  if (joined.includes('연인')) direct.push('연인', '연애', '배우자궁', '관계패턴')
  if (joined.includes('친구')) direct.push('친구', '비겁', '비견', '겁재')
  if (joined.includes('기타')) direct.push('기타', '타인', '상대')
  if (joined.includes('이성 관계')) direct.push('이성', '배우자성', '재성', '관성')
  if (joined.includes('동성 관계')) direct.push('동성', '비겁', '친구', '동료')
  if (joined.includes('솔로')) direct.push('솔로', '인연', '도화')
  if (joined.includes('마음에 둔')) direct.push('짝사랑', '썸', '끌림')
  if (joined.includes('연애 중')) direct.push('연애', '관계반복')
  if (joined.includes('이별')) direct.push('이별', '재회', '정리')
  if (joined.includes('결혼')) direct.push('결혼', '배우자', '생활')
  if (joined.includes('학생')) direct.push('학생', '공부', '진로')
  if (joined.includes('일을 찾')) direct.push('구직', '취업', '일자리')
  if (joined.includes('직장')) direct.push('직장', '회사', '업무')
  if (joined.includes('사업')) direct.push('사업', '편재', '시장')
  if (joined.includes('프리랜서')) direct.push('프리랜서', '프로젝트', '계약')
  if (joined.includes('쉬고')) direct.push('휴식', '공백기', '회복')

  return expandTokens([...rawTokens, ...direct])
}

function sajuTokens(saju: SajuAnalysis): string[] {
  const terms = [
    saju.dayMaster,
    saju.dominantElement,
    saju.weakElement,
    saju.usefulGod ?? '',
    saju.dayMasterStrength,
    ...saju.tenGods,
    ...(ELEMENT_TERMS[saju.dayMasterElement] ?? []),
    ...(ELEMENT_TERMS[saju.dominantElement] ?? []),
    ...(ELEMENT_TERMS[saju.weakElement] ?? []),
    ...(saju.usefulGod ? ELEMENT_TERMS[saju.usefulGod] ?? [] : []),
  ].filter(Boolean)
  return expandTokens(terms.map(String).flatMap(tokenize))
}

function scoreChunk(
  chunk: RagChunk,
  queryRaw: string,
  queryTokens: string[],
  personalTokens: string[],
  vectorBoost: number,
): number {
  const topic = normalizeText(chunk.topic)
  const content = normalizeText(chunk.content)
  const keywords = chunk.keywords.map(normalizeText)
  let score = vectorBoost

  for (const keyword of keywords) score += keywordScore(keyword, queryRaw, queryTokens)

  for (const token of queryTokens) {
    if (!token || token.length <= 1) continue
    if (topic.includes(token)) score += 6
    if (content.includes(token)) score += 2
  }

  for (const token of personalTokens) {
    if (!token || token.length <= 1) continue
    if (keywords.some((keyword) => keyword.includes(token) || token.includes(keyword))) score += 2
    if (content.includes(token)) score += 1
  }

  if (chunk.domain === 'input_context_interpretation') score += 1.5
  if (chunk.domain === 'deep_saju_interpretation') score += 1
  return score
}

function contextText(context?: SajuReportContext): string {
  if (!context) return ''
  return [
    context.target,
    context.relationship,
    context.orientation,
    context.work,
    context.concern,
  ].filter(Boolean).join(' ')
}

export function retrieveRagChunks(
  message: string,
  saju: SajuAnalysis,
  topK = 5,
  context?: SajuReportContext,
): RagChunk[] {
  const corpus = buildCorpusIndex()
  const contextQuery = contextText(context)
  const queryText = [message, contextQuery].filter(Boolean).join(' ')
  const intent = detectIntent(queryText)
  const intentKeywords = loadTemplates().find((template) => template.intent === intent)?.keywords ?? []
  const queryTokens = expandTokens([
    ...tokenize(queryText),
    ...intentKeywords.flatMap(tokenize),
    ...contextTokens(context),
  ])
  const personalTokens = sajuTokens(saju)
  const queryRaw = normalizeText([...queryTokens, queryText].join(' '))

  const vectorResults = retrieveVectorRagChunks(
    [...queryTokens, ...personalTokens].join(' '),
    saju,
    Math.max(topK * 3, topK),
  )
  const vectorRank = new Map(vectorResults.map((chunk, index) => [chunk.id, Math.max(0, 8 - index)]))

  const scored = corpus
    .map((chunk) => ({
      chunk,
      score: scoreChunk(chunk, queryRaw, queryTokens, personalTokens, vectorRank.get(chunk.id) ?? 0),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.chunk.id.localeCompare(b.chunk.id))

  if (scored.length === 0) return corpus.slice(0, topK)
  return scored.slice(0, topK).map((item) => item.chunk)
}

export function formatRagForPrompt(chunks: RagChunk[]): string {
  if (chunks.length === 0) return '<rag_knowledge>\n(관련 지식 없음)\n</rag_knowledge>'

  const body = chunks
    .map((c, i) => `[${i + 1}] ${c.topic}\n${c.content}`)
    .join('\n\n')

  return `<rag_knowledge>\n${body}\n</rag_knowledge>`
}

export function getIntentPromptHint(intent: string): string {
  return loadTemplates().find((t) => t.intent === intent)?.promptHint ?? '일간과 오행 균형을 참고해 따뜻하게 답하세요.'
}
