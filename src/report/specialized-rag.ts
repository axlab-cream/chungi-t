import type { RagChunk, SajuAnalysis, SajuReportContext } from '../types/index.js'
import { retrieveRagChunks } from '../rag/retriever.js'

interface SpecializedCategory {
  id: string
  title: string
  items: readonly string[]
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '')
}

function categoryRelevance(chunk: RagChunk, category: SpecializedCategory): number {
  const topic = normalize(chunk.topic)
  const content = normalize(chunk.content)
  const terms = [category.title, ...category.items]
    .flatMap((value) => value.split(/[·,/\s]+/))
    .map(normalize)
    .filter((term) => term.length >= 2)

  return terms.reduce((score, term) => score + (topic.includes(term) ? 10 : 0) + (content.includes(term) ? 2 : 0), 0)
}

/** Keep each product's interpretation tied to its own TOC instead of reusing one global result set. */
export function retrieveCategoryRagChunks(
  cache: Map<string, RagChunk[]>,
  baseQuery: string,
  category: SpecializedCategory,
  analysis: SajuAnalysis,
  context: SajuReportContext,
  topK: number,
): RagChunk[] {
  const cached = cache.get(category.id)
  if (cached) return cached

  const candidates = retrieveRagChunks(
    [baseQuery, category.title, ...category.items].filter(Boolean).join(' '),
    analysis,
    Math.max(topK * 3, topK),
    context,
  )
  const chunks = candidates
    .map((chunk, index) => ({ chunk, index, score: categoryRelevance(chunk, category) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ chunk }) => chunk)
    .slice(0, topK)
  cache.set(category.id, chunks)
  return chunks
}
