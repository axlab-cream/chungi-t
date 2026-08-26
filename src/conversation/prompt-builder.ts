import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ConversationTurn, LlmMessage, RagChunk } from '../types/index.js'
import { getIntentPromptHint } from '../rag/retriever.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export function loadSystemPrompt(): string {
  return readFileSync(join(__dirname, '../../prompts/system-prompt.md'), 'utf-8')
}

export function buildConversationMessages(params: {
  systemPrompt: string
  sajuPrompt: string
  ragPrompt: string
  intent: string
  history: ConversationTurn[]
  userMessage: string
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
