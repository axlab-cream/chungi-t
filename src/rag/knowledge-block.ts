import type { RagChunk, RagKnowledgeBlock } from '../types/index.js'

interface LegacyChunk {
  id: string
  topic: string
  keywords: string[]
  content: string
}

interface CorpusFile {
  domain?: string
  chunks?: LegacyChunk[]
  knowledgeBlocks?: RagKnowledgeBlock[]
}

function unique(values: string[]): string[] {
  return values.filter((value, index, list) => Boolean(value) && list.indexOf(value) === index)
}

function blockSearchText(block: RagKnowledgeBlock): string {
  return [
    block.topic,
    ...(block.keywords ?? []),
    block.concept,
    block.condition,
    block.interpretation,
    ...block.real_world_pattern,
    block.risk,
    block.opportunity,
    block.advice,
    block.confidence,
    block.forbidden_generalization,
  ].filter(Boolean).join(' ')
}

export function formatKnowledgeBlock(block: RagKnowledgeBlock): string {
  const patterns = block.real_world_pattern.length > 0
    ? block.real_world_pattern.map((item) => `- ${item}`).join('\n')
    : '- 현재 질문과 Feature JSON에 맞춰 새로 작성'

  return [
    `concept: ${block.concept}`,
    `condition: ${block.condition}`,
    `interpretation: ${block.interpretation}`,
    'real_world_pattern:',
    patterns,
    `risk: ${block.risk}`,
    `opportunity: ${block.opportunity}`,
    `advice: ${block.advice}`,
    `confidence: ${block.confidence}`,
    `forbidden_generalization: ${block.forbidden_generalization}`,
  ].join('\n')
}

export function knowledgeBlockToRagChunk(
  block: RagKnowledgeBlock,
  domain?: string,
): RagChunk {
  return {
    id: block.id,
    topic: block.topic ?? block.concept,
    keywords: unique([...(block.keywords ?? []), block.concept]),
    content: formatKnowledgeBlock(block),
    domain,
    knowledge: block,
    searchText: blockSearchText(block),
  }
}

function legacyChunkToKnowledgeBlock(chunk: LegacyChunk): RagKnowledgeBlock {
  return {
    id: chunk.id,
    topic: chunk.topic,
    keywords: chunk.keywords,
    concept: chunk.topic,
    condition: `관련 키워드가 현재 질문 또는 Feature JSON에 직접 연결될 때만 적용: ${chunk.keywords.join(', ')}`,
    interpretation: '기존 청크에서 검색된 참고 근거다. 원문 문장을 출력하지 말고 핵심 의미만 추출해 현재 사용자 조건에 맞게 새로 해석한다.',
    real_world_pattern: [
      '현재 질문의 영역과 직접 관련된 생활 장면으로만 변환',
      '명식 계산 결과와 맞지 않으면 사용하지 않음',
      '전문용어는 내부 근거로만 쓰고 사용자 문장에서는 일상어로 번역',
    ],
    risk: '키워드가 맞는다는 이유만으로 사건, 직업, 관계 결과를 단정하는 것',
    opportunity: '계산된 명식 조건과 질문 의도가 겹칠 때 판단 방향을 좁히는 보조 근거',
    advice: '성향, 실제 행동, 위험, 기회, 조언 중 현재 답변에 필요한 1~2개 의미만 골라 새 문장으로 작성',
    confidence: 'low',
    forbidden_generalization: '청크 원문을 그대로 답변하거나 특정 개인 사례를 현재 사용자 사실처럼 복사하지 않음',
  }
}

export function legacyChunkToRagChunk(
  chunk: LegacyChunk,
  domain?: string,
): RagChunk {
  const knowledge = legacyChunkToKnowledgeBlock(chunk)
  return {
    ...knowledgeBlockToRagChunk(knowledge, domain),
    searchText: `${chunk.topic} ${chunk.keywords.join(' ')} ${chunk.content}`,
  }
}

export function corpusFileToChunks(data: CorpusFile): RagChunk[] {
  const knowledgeChunks = (data.knowledgeBlocks ?? []).map((block) => knowledgeBlockToRagChunk(block, data.domain))
  const legacyChunks = (data.chunks ?? []).map((chunk) => legacyChunkToRagChunk(chunk, data.domain))
  return [...knowledgeChunks, ...legacyChunks]
}

/**
 * 근거 블록에서 문장 재료만 뽑는다. 승인된 지식 블록이 있으면 해석·조언·기회를 쓰고,
 * 없으면 원문을 쓴다.
 */
export function chunkMeaning(chunk: RagChunk): string {
  const block = chunk.knowledge
  if (block) {
    return [block.interpretation, block.advice, block.opportunity].filter(Boolean).join(' ')
  }
  return chunk.content ?? ''
}

const RAG_FIELD_LABEL = /(^|\s)(concept|condition|interpretation|guide|output|tone|caution|source|evidence|risk|opportunity|advice)\s*:\s*/gi

/**
 * 근거 문장을 한 문단 분량으로 줄인다. 코퍼스 필드 이름이 고객 화면에 새어 나가지
 * 않도록 라벨을 지운다.
 *
 * 자르는 자리는 반드시 문장 끝이다. 글자 수로 자르면 잘린 발췌와 말줄임표가 고객
 * 문장에 남는다(`tests/unit/wedding-readability.test.ts` 가 이것을 막는다).
 * 첫 문장 하나가 이미 한도를 넘으면 그 문장은 통째로 둔다 — 문장을 쪼개는 것보다 낫다.
 */
export function compactChunkText(text: string, fallback = '', limit = 170): string {
  const clean = String(text ?? '')
    .replace(RAG_FIELD_LABEL, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!clean) return fallback
  if (clean.length <= limit) return clean
  let kept = ''
  for (const sentence of clean.split(/(?<=[.!?。])\s+/)) {
    const next = kept ? `${kept} ${sentence}` : sentence
    if (kept && next.length > limit) break
    kept = next
    if (kept.length >= limit) break
  }
  return kept || clean
}

export function chunkSearchText(chunk: RagChunk): string {
  return chunk.searchText ?? [
    chunk.topic,
    ...chunk.keywords,
    chunk.content,
  ].join(' ')
}
