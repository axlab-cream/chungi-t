import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ConversationTurn, LlmMessage, RagChunk } from '../types/index.js'
import { getIntentPromptHint } from '../rag/retriever.js'
import { loadServiceSystemPrompt } from '../prompt/service-system.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Prefer per-service pack (common + service block).
 * Falls back to legacy system-prompt.md only when common-system.md is missing
 * (handled inside loadServiceSystemPrompt / loadCommonSystemPrompt).
 */
export function loadSystemPrompt(serviceKey?: string | null): string {
  try {
    return loadServiceSystemPrompt(serviceKey)
  } catch {
    const legacy = join(__dirname, '../../prompts/system-prompt.md')
    if (existsSync(legacy)) {
      return readFileSync(legacy, 'utf-8')
    }
    throw new Error('System prompt files missing under prompts/')
  }
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
