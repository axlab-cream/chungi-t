import OpenAI from 'openai'
import type { LlmMessage } from '../types/index.js'

let client: OpenAI | null = null

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY 환경변수가 설정되지 않았습니다. .env 파일을 확인하세요.')
    }
    client = new OpenAI({ apiKey })
  }
  return client
}

export interface OpenAiChatOptions {
  model?: string
  temperature?: number
  maxTokens?: number
}

/** OpenAI Chat Completions API 호출 */
export async function chatWithOpenAI(
  messages: LlmMessage[],
  options: OpenAiChatOptions = {},
): Promise<string> {
  const openai = getClient()
  const response = await openai.chat.completions.create({
    model: options.model ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 800,
  })

  const content = response.choices[0]?.message?.content?.trim()
  if (!content) {
    throw new Error('OpenAI 응답이 비어 있습니다.')
  }
  return content
}

export function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY)
}
