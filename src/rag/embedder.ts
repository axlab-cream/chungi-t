import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { RagChunk, SajuAnalysis } from '../types/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_ROOT = join(__dirname, '../../data')
const CORPUS_FILES = ['corpus/myeongri-basics.json', 'corpus/deep-saju-interpretation.json']

type Vector = Map<string, number>

function loadCorpus(): RagChunk[] {
  return CORPUS_FILES.flatMap((file) => {
    const raw = readFileSync(join(DATA_ROOT, file), 'utf-8')
    const data = JSON.parse(raw) as { chunks?: RagChunk[]; domain?: string }
    return (data.chunks ?? []).map((c) => ({ ...c, domain: data.domain }))
  })
}

function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[\uac00-\ud7a3a-z0-9]+/g) ?? []
}

function toVector(tokens: string[]): Vector {
  const vec = new Map<string, number>()
  for (const t of tokens) {
    vec.set(t, (vec.get(t) ?? 0) + 1)
  }
  return vec
}

function cosine(a: Vector, b: Vector): number {
  let dot = 0
  let normA = 0
  let normB = 0
  for (const [, v] of a) normA += v * v
  for (const [, v] of b) normB += v * v
  for (const [k, v] of a) {
    const bv = b.get(k) ?? 0
    dot += v * bv
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

let cachedVectors: Array<{ chunk: RagChunk; vector: Vector }> | null = null

function getIndexedCorpus(): Array<{ chunk: RagChunk; vector: Vector }> {
  if (cachedVectors) return cachedVectors
  const corpus = loadCorpus()
  cachedVectors = corpus.map((chunk) => ({
    chunk,
    vector: toVector(tokenize(`${chunk.topic} ${chunk.keywords.join(' ')} ${chunk.content}`)),
  }))
  return cachedVectors
}

/** O(n) — TF-IDF 유사도 기반 벡터 RAG */
export function retrieveVectorRagChunks(
  message: string,
  saju: SajuAnalysis,
  topK = 5,
): RagChunk[] {
  const queryText = [
    message,
    saju.dayMaster,
    saju.dominantElement,
    saju.weakElement,
    saju.usefulGod ?? '',
    ...saju.tenGods,
  ].join(' ')

  const queryVec = toVector(tokenize(queryText))
  const indexed = getIndexedCorpus()

  const scored = indexed
    .map(({ chunk, vector }) => ({ chunk, score: cosine(queryVec, vector) }))
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, topK).map((s) => s.chunk)
}

export function clearVectorCache(): void {
  cachedVectors = null
}
