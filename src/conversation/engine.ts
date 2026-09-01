import type { ConversationInput, ConversationResult } from '../types/index.js'
import { analyzeSaju, formatSajuForPrompt } from '../saju/analyzer.js'
import { detectIntent, formatRagForPrompt, retrieveRagChunks } from '../rag/retriever.js'
import { buildConversationMessages, loadSystemPrompt } from './prompt-builder.js'
import runtimeConfig from '../../data/runtime-config.json' with { type: 'json' }

/**
 * 개인 사주 + RAG + 캐릭터 프롬프트를 조합해 LLM에 전달할 메시지를 생성합니다.
 * 실제 LLM API 호출은 외부 어댑터(OpenAI, Anthropic 등)에서 messages를 받아 처리합니다.
 */
export function prepareConversation(input: ConversationInput): ConversationResult {
  const sajuAnalysis = analyzeSaju(input.birth)
  const intent = detectIntent(input.message)
  const topK = runtimeConfig.conversation?.ragTopK ?? 5
  const maxHistory = runtimeConfig.conversation?.maxHistoryTurns ?? 10

  const retrievedChunks = retrieveRagChunks(input.message, sajuAnalysis, topK)
  const history = (input.history ?? []).slice(-maxHistory)

  const messages = buildConversationMessages({
    systemPrompt: loadSystemPrompt(),
    sajuPrompt: formatSajuForPrompt(sajuAnalysis),
    ragPrompt: formatRagForPrompt(retrievedChunks),
    intent,
    history,
    userMessage: input.message,
  })

  return {
    messages,
    sajuAnalysis,
    retrievedChunks,
    intent,
  }
}

export function buildCheongiTtsText(text: string): string {
  return text
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
