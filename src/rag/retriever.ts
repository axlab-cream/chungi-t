import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { RagChunk, SajuAnalysis } from '../types/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_ROOT = join(__dirname, '../../data')

interface CorpusFile {
  domain?: string
  chunks?: RagChunk[]
  templates?: Array<{ id: string; intent: string; keywords: string[]; promptHint: string }>
}

function loadJson<T>(relativePath: string): T {
  const raw = readFileSync(join(DATA_ROOT, relativePath), 'utf-8')
  return JSON.parse(raw) as T
}

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[\s,·/]+/).filter(Boolean)
}

import { retrieveVectorRagChunks } from './embedder.js'

/** O(n*m) — 코퍼스 인덱스 로드 */
export function buildCorpusIndex(): RagChunk[] {
  const basics = loadJson<CorpusFile>('corpus/myeongri-basics.json')
  const chunks: RagChunk[] = (basics.chunks ?? []).map((c) => ({
    ...c,
    domain: basics.domain,
  }))
  return chunks
}

function scoreChunk(
  chunk: RagChunk,
  queryTokens: string[],
  saju: SajuAnalysis,
): number {
  let score = 0
  const keywords = chunk.keywords.map((k) => k.toLowerCase())

  for (const token of queryTokens) {
    if (keywords.some((k) => k.includes(token) || token.includes(k))) score += 3
    if (chunk.content.includes(token)) score += 1
    if (chunk.topic.includes(token)) score += 2
  }

  const elementMap: Record<string, string[]> = {
    wood: ['목', '갑', '을', '木'],
    fire: ['화', '병', '정', '火'],
    earth: ['토', '무', '기', '土'],
    metal: ['금', '경', '신', '金'],
    water: ['수', '임', '계', '水'],
  }

  const sajuTerms = [
    saju.dayMaster,
    saju.dominantElement,
    saju.weakElement,
    ...(saju.usefulGod ? [saju.usefulGod] : []),
    ...saju.tenGods,
    ...(elementMap[saju.dayMasterElement] ?? []),
    ...(elementMap[saju.dominantElement] ?? []),
    ...(elementMap[saju.weakElement] ?? []),
  ].map(String)

  for (const term of sajuTerms) {
    if (chunk.content.includes(term) || chunk.keywords.some((k) => k.includes(term))) {
      score += 2
    }
  }

  return score
}

export function detectIntent(message: string): string {
  const templates = loadJson<CorpusFile>('corpus/consultation-templates.json').templates ?? []
  const lower = message.toLowerCase()

  for (const t of templates) {
    if (t.intent === 'general') continue
    if (t.keywords.some((k) => lower.includes(k))) return t.intent
  }
  return 'general'
}

export function retrieveRagChunks(
  message: string,
  saju: SajuAnalysis,
  topK = 5,
): RagChunk[] {
  const vectorResults = retrieveVectorRagChunks(message, saju, topK)
  if (vectorResults.length >= topK) return vectorResults

  const corpus = buildCorpusIndex()
  const queryTokens = tokenize(message)
  const intent = detectIntent(message)

  const intentKeywords = loadJson<CorpusFile>('corpus/consultation-templates.json')
    .templates?.find((t) => t.intent === intent)?.keywords ?? []

  const allTokens = [...new Set([...queryTokens, ...intentKeywords.map((k) => k.toLowerCase())])]

  const scored = corpus
    .map((chunk) => ({ chunk, score: scoreChunk(chunk, allTokens, saju) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)

  if (scored.length === 0) {
    return vectorResults.length > 0 ? vectorResults : corpus.slice(0, topK)
  }

  const merged = [...vectorResults]
  for (const item of scored) {
    if (!merged.some((c) => c.id === item.chunk.id)) merged.push(item.chunk)
    if (merged.length >= topK) break
  }
  return merged.slice(0, topK)
}

export function formatRagForPrompt(chunks: RagChunk[]): string {
  if (chunks.length === 0) return '<rag_knowledge>\n(관련 지식 없음)\n</rag_knowledge>'

  const body = chunks
    .map((c, i) => `[${i + 1}] ${c.topic}\n${c.content}`)
    .join('\n\n')

  return `<rag_knowledge>\n${body}\n</rag_knowledge>`
}

export function getIntentPromptHint(intent: string): string {
  const templates = loadJson<CorpusFile>('corpus/consultation-templates.json').templates ?? []
  return templates.find((t) => t.intent === intent)?.promptHint ?? '일간과 오행 균형을 참고해 따뜻하게 답하세요.'
}
