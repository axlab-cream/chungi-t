import type { ConversationTurn, LlmMessage, RagChunk } from '../types/index.js'
import { getIntentPromptHint } from '../rag/retriever.js'
import { loadServiceSystemPrompt } from '../prompt/service-system.js'

/** Missing tone bundles fail explicitly instead of selecting a legacy persona. */
export function loadSystemPrompt(serviceKey?: string | null): string {
  return loadServiceSystemPrompt(serviceKey)
}

export function buildConversationMessages(params: {
  systemPrompt: string
  sajuPrompt: string
  ragPrompt: string
  intent: string
  history: ConversationTurn[]
  userMessage: string
  serviceKey?: string | null
}): LlmMessage[] {
  const { systemPrompt, sajuPrompt, ragPrompt, intent, history, userMessage } = params
  const intentHint = getIntentPromptHint(intent)

  const systemContent = [
    systemPrompt,
    '',
    '--- 개인 사주 ---',
    sajuPrompt,
    '',
    '--- 명리학 RAG 지식 ---',
    ragPrompt,
    '',
    `--- 이번 질문 의도: ${intent} ---`,
    intentHint,
  ].join('\n')

  const messages: LlmMessage[] = [{ role: 'system', content: systemContent }]

  for (const turn of history) {
    messages.push({ role: turn.role, content: turn.content })
  }

  messages.push({ role: 'user', content: userMessage })

  return messages
}

export function summarizeRetrievedChunks(chunks: RagChunk[]): string {
  return chunks.map((c) => c.topic).join(', ')
}
