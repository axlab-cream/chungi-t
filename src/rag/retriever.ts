import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { RagChunk, SajuAnalysis, SajuReportContext } from '../types/index.js'
import { getChunkCorpusFiles, getCorpusDomainBoost } from './corpus-registry.js'
import { retrieveVectorRagChunks } from './embedder.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_ROOT = join(__dirname, '../../data')

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
  격국: ['월령', '십신', '사회적작동', '용신', '구조'],
  조후: ['온도', '한난조습', '계절', '용신', '균형'],
  통관: ['상생', '상극', '중재', '충돌완화', '용신'],
  자시: ['23시', '야자시', '조자시', '일주변경', '시주'],
  gbr: ['graph', '그래프', '재랭킹', '근거', '연결'],
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

const HOOKED_FLOW_PINS: Array<{ id: string; phrases: string[] }> = [
  { id: 'hf20-001', phrases: ['너라는 사람부터', '자기 인식 차이표', '첫 장면 고정'] },
  { id: 'hf20-002', phrases: ['남들이 아는 너는 진짜 네가 아니다', '외부 얼굴', '내면 피로'] },
  { id: 'hf20-003', phrases: ['어릴 때부터 여기서 무너졌다', '초년 패턴', '감정 패턴'] },
  { id: 'hf20-004', phrases: ['가까워져야만 들키는', '가까운 관계 반응표', '관계 속 본모습'] },
  { id: 'hf20-005', phrases: ['그렇게까지 버티는', '강점 과사용', '무너지기 직전'] },
  { id: 'hf20-006', phrases: ['이상하게 이것만은 늘 부족하다', '부족한 자리', '균형 회복'] },
  { id: 'hf20-007', phrases: ['살리는 선택과 망치는 선택', '선택 판별식', '풀릴 때'] },
  { id: 'hf20-008', phrases: ['돈·사람·책임', '돈 사람 책임', '본성 반응표'] },
  { id: 'hf20-009', phrases: ['매번 같은 곳에서 무너질까', '위험 신호', '함정 반복'] },
  { id: 'hf20-010', phrases: ['고민은 바뀌는데 문제는 왜 계속 같을까', '반복 고민 공식'] },
  { id: 'hf20-011', phrases: ['능력이 돈이 되는', '돈 전환력', '수입 경로표'] },
  { id: 'hf20-012', phrases: ['요즘 자꾸 꼬인다면', '최근 전후 비교', '먼저 움직이는 증상'] },
  { id: 'hf20-013', phrases: ['지금 버틸까, 나갈까', '버틸 조건', '전환 판단식'] },
  { id: 'hf20-014', phrases: ['돈이 없는 게 아니다', '돈구멍 계산', '지출 누수'] },
  { id: 'hf20-015', phrases: ['잡아야 할 돈', '절대 쫓으면 안 되는 돈', '재물 기회 타이밍'] },
  { id: 'hf20-016', phrases: ['그 사람, 운명일까', '또 네 패턴일까', '운명처럼 보이는 끌림'] },
  { id: 'hf20-017', phrases: ['설레는 사람과 결국 남는 사람', '운명의 상대 확인하기', '상대 분위기 스케치'] },
  { id: 'hf20-018', phrases: ['곁에 둘수록 너를 흐리게', '가까이할 인연', '멀어질 인연'] },
  { id: 'hf20-019', phrases: ['올해 네 인생에서 가장 먼저 움직이는 신호', '올해 신호 그래프', '작년과 올해'] },
  { id: 'hf20-020', phrases: ['인생 판이 바뀌기 직전', '현재 대운 vs 다음 대운', '전환 준비 점수'] },
]

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
  const corpusChunks = getChunkCorpusFiles().flatMap((file) => {
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
    saju.manseryeok?.gyeokguk.name ?? '',
    saju.manseryeok?.gyeokguk.tenGod ?? '',
    saju.manseryeok?.climate.season ?? '',
    saju.manseryeok?.climate.temperature ?? '',
    saju.manseryeok?.climate.moisture ?? '',
    ...(saju.manseryeok?.flowBridges.map((bridge) => bridge.bridge) ?? []),
    ...(saju.manseryeok?.interactions.flatMap((item) => [item.type, ...item.signs]) ?? []),
  ].filter(Boolean)
  return expandTokens(terms.map(String).flatMap(tokenize))
}

function graphBoostTokens(
  queryTokens: string[],
  saju: SajuAnalysis,
  context?: SajuReportContext,
): string[] {
  const query = queryTokens.join(' ')
  const contextValue = contextText(context)
  const graph = new Set<string>()

  for (const token of sajuTokens(saju)) graph.add(token)
  if (saju.manseryeok?.gyeokguk) {
    graph.add('격국')
    graph.add('월령')
    graph.add(saju.manseryeok.gyeokguk.name)
    graph.add(saju.manseryeok.gyeokguk.tenGod)
  }
  if (saju.manseryeok?.climate) {
    graph.add('조후')
    graph.add('한난조습')
    graph.add('계절')
    for (const element of saju.manseryeok.climate.usefulElements) graph.add(element)
  }
  if ((saju.manseryeok?.flowBridges.length ?? 0) > 0) {
    graph.add('통관')
    graph.add('상생')
    graph.add('상극')
  }
  if (saju.fortune) {
    graph.add('대운')
    graph.add('세운')
    graph.add(saju.fortune.currentDaewoon)
    graph.add(saju.fortune.yearPillar)
  }

  if (/연애|관계|인연|이별|재회|배우자|동성|이성/.test(`${query} ${contextValue}`)) {
    for (const token of ['일지', '배우자궁', '비겁', '재성', '관성', '식상', '합충', '거리감']) graph.add(token)
  }
  if (/돈|재물|수입|지출|직업|직장|사업|프리랜서|계약/.test(`${query} ${contextValue}`)) {
    for (const token of ['재성', '식상', '관성', '계약', '돈구멍', '편재', '정재']) graph.add(token)
  }
  if (/용신|희신|기신|격국|조후|통관|강약/.test(query)) {
    for (const token of ['격국', '월령', '조후', '통관', '억부', '한난조습']) graph.add(token)
  }
  if (/23|자시|야자시|조자시/.test(query)) {
    for (const token of ['자시', '23시', '일주변경', '시주']) graph.add(token)
  }

  return expandTokens([...graph].map(String).flatMap(tokenize))
}

function scoreChunk(
  chunk: RagChunk,
  queryRaw: string,
  queryTokens: string[],
  personalTokens: string[],
  graphTokens: string[],
  vectorBoost: number,
  pinnedContextIds: Set<string>,
): number {
  const topic = normalizeText(chunk.topic)
  const content = normalizeText(chunk.content)
  const keywords = chunk.keywords.map(normalizeText)
  let score = vectorBoost
  let keywordHit = false
  let topicHit = false
  let contentHit = false
  let personalHit = false
  let graphHit = false

  for (const keyword of keywords) {
    const next = keywordScore(keyword, queryRaw, queryTokens)
    if (next > 0) keywordHit = true
    score += next
  }

  for (const token of queryTokens) {
    if (!token || token.length <= 1) continue
    if (topic.includes(token)) {
      topicHit = true
      score += 6
    }
    if (content.includes(token)) {
      contentHit = true
      score += 2
    }
  }

  for (const token of personalTokens) {
    if (!token || token.length <= 1) continue
    if (keywords.some((keyword) => keyword.includes(token) || token.includes(keyword))) {
      personalHit = true
      score += 2
    }
    if (content.includes(token)) {
      personalHit = true
      score += 1
    }
  }

  for (const token of graphTokens) {
    if (!token || token.length <= 1) continue
    if (keywords.some((keyword) => keyword.includes(token) || token.includes(keyword))) {
      graphHit = true
      score += 3
    }
    if (topic.includes(token)) {
      graphHit = true
      score += 4
    }
    if (content.includes(token)) {
      graphHit = true
      score += 1.5
    }
  }

  score += getCorpusDomainBoost(chunk.domain)
  if (pinnedContextIds.has(chunk.id)) score += 40

  const binarySignals = [
    pinnedContextIds.has(chunk.id),
    keywordHit,
    topicHit,
    contentHit,
    personalHit,
    graphHit,
    vectorBoost > 0,
  ]
  const hitCount = binarySignals.filter(Boolean).length
  const smoothedCoverage = (hitCount + 1) / (binarySignals.length + 2)
  score += smoothedCoverage * 10

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

function pinnedContextChunkIds(context?: SajuReportContext): Set<string> {
  const ids = new Set<string>()
  if (!context) return ids

  const target = context?.target ?? ''
  const orientation = context?.orientation ?? ''
  const relationship = context?.relationship ?? ''
  const work = context?.work ?? ''

  if (target.includes('본인')) ids.add('ic-001')
  if (target.includes('가족')) ids.add('ic-002')
  if (target.includes('연인')) ids.add('ic-003')
  if (target.includes('친구')) ids.add('ic-004')
  if (target.includes('기타')) ids.add('ic-005')
  if (orientation.includes('이성 관계')) ids.add('ic-006')
  if (orientation.includes('동성 관계')) ids.add('ic-007')
  if (relationship.includes('솔로')) ids.add('ic-008')
  if (relationship.includes('마음에 둔')) ids.add('ic-009')
  if (relationship.includes('연애 중')) ids.add('ic-010')
  if (relationship.includes('이별')) ids.add('ic-011')
  if (relationship.includes('결혼')) ids.add('ic-012')
  if (work.includes('학생')) ids.add('ic-013')
  if (work.includes('일을 찾')) ids.add('ic-014')
  if (work.includes('직장')) ids.add('ic-015')
  if (work.includes('사업')) ids.add('ic-016')
  if (work.includes('프리랜서')) ids.add('ic-017')
  if (work.includes('쉬고')) ids.add('ic-018')
  if (context?.concern?.trim()) ids.add('ic-019')
  else ids.add('ic-020')

  return ids
}

function pinnedHookedFlowChunkIds(queryText: string): Set<string> {
  const normalized = normalizeText(queryText)
  const ids = new Set<string>()
  for (const pin of HOOKED_FLOW_PINS) {
    if (pin.phrases.some((phrase) => normalized.includes(normalizeText(phrase)))) {
      ids.add(pin.id)
    }
  }
  return ids
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
  const gbrTokens = graphBoostTokens(queryTokens, saju, context)
  const queryRaw = normalizeText([...queryTokens, queryText].join(' '))
  const pinnedIds = new Set([
    ...pinnedContextChunkIds(context),
    ...pinnedHookedFlowChunkIds(queryText),
  ])

  const vectorResults = retrieveVectorRagChunks(
    [...queryTokens, ...personalTokens].join(' '),
    saju,
    Math.max(topK * 3, topK),
  )
  const vectorRank = new Map(vectorResults.map((chunk, index) => [chunk.id, Math.max(0, 8 - index)]))

  const scored = corpus
    .map((chunk) => ({
      chunk,
      score: scoreChunk(chunk, queryRaw, queryTokens, personalTokens, gbrTokens, vectorRank.get(chunk.id) ?? 0, pinnedIds),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.chunk.id.localeCompare(b.chunk.id))

  const pinnedChunks = [...pinnedIds]
    .map((id) => corpus.find((chunk) => chunk.id === id))
    .filter((chunk): chunk is RagChunk => Boolean(chunk))

  const rankedChunks = [
    ...pinnedChunks,
    ...scored
      .map((item) => item.chunk)
      .filter((chunk) => !pinnedIds.has(chunk.id)),
  ]

  if (rankedChunks.length === 0) return corpus.slice(0, topK)
  return rankedChunks.slice(0, topK)
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
