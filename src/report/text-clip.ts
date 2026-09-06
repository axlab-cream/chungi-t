/**
 * Product rule: interpretation / teaser user copy must not use unfinished
 * ellipsis truncation (… mid-clause). Prefer 1–2 complete sentences.
 */

const SENTENCE_END = /[.!?。]/g

/**
 * Shorten text for teaser/RAG preview without mid-clause ellipsis.
 * - If under limit, return as-is.
 * - Else keep the longest prefix of complete sentences that fits in limit.
 * - If nothing fits, take the first complete sentence even if slightly over.
 * - If there is no sentence punctuation, return the full string (never mid-cut + …).
 */
export function clipCompleteSentences(text: string, limit = 220): string {
  const clean = String(text || '').replace(/\s+/g, ' ').trim()
  if (!clean) return clean
  if (clean.length <= limit) return clean

  const ends: number[] = []
  let match: RegExpExecArray | null
  const re = new RegExp(SENTENCE_END.source, 'g')
  while ((match = re.exec(clean)) !== null) {
    ends.push(match.index + 1)
  }

  const fitting = ends.filter((index) => index <= limit)
  if (fitting.length > 0) {
    return clean.slice(0, fitting[fitting.length - 1]).trim()
  }

  if (ends.length > 0) {
    const first = clean.slice(0, ends[0]).trim()
    if (ends.length > 1) {
      const two = clean.slice(0, ends[1]).trim()
      if (first.length < Math.floor(limit * 0.55) && two.length <= Math.floor(limit * 1.65)) {
        return two
      }
    }
    return first
  }

  return clean
}
