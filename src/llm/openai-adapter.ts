import OpenAI from 'openai'
import type { LlmMessage } from '../types/index.js'

let client: OpenAI | null = null

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY 환경변수가 설정되지 않았습니다. .env 파일을 확인하세요.')
    }
    client = new OpenAI({ apiKey, timeout: 120_000, maxRetries: 0 })
  }
  return client
}

export interface OpenAiChatOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  onResponse?: (response: OpenAiResult) => void | Promise<void>
}

/**
 * gpt-5 계열은 추론 토큰도 `max_completion_tokens` 에서 함께 깎는다. 그래서 예산이 빠듯하면
 * 본문을 한 글자도 못 내고 잘린다 — money_save 의 첫 항목이 4200 예산을 전부 추론에 쓰고
 * 빈 응답으로 끝났다(2026-09-17). 잘림은 내용 결함이 아니라 되풀이하면 넘어갈 수 있는
 * 상태이므로, 호출자가 품질 실패와 구분해 재시도할 수 있게 타입을 따로 둔다.
 */
export class OpenAiTruncatedError extends Error {
  constructor(readonly usage?: OpenAiResult['usage']) {
    super('생성 응답이 길이 제한으로 중단되었습니다.')
    this.name = 'OpenAiTruncatedError'
  }
}

export interface OpenAiResult {
  text: string
  model: string
  finishReason: string | null
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number }
}

function usesMaxCompletionTokens(model: string): boolean {
  return /^(gpt-5|o[1-9]|o\d)/i.test(model)
}

/** OpenAI Chat Completions API 호출 */
export async function chatWithOpenAI(
  messages: LlmMessage[],
  options: OpenAiChatOptions = {},
): Promise<string> {
  const openai = getClient()
  const model = options.model ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
  const request: Record<string, unknown> = {
    model,
    messages,
  }

  if (usesMaxCompletionTokens(model)) {
    request.max_completion_tokens = options.maxTokens ?? 4000
    if (process.env.OPENAI_REASONING_EFFORT) request.reasoning_effort = process.env.OPENAI_REASONING_EFFORT
  } else {
    request.temperature = options.temperature ?? 0.7
    request.max_tokens = options.maxTokens ?? 800
  }

  const response = await openai.chat.completions.create(request as never)

  const content = response.choices[0]?.message?.content?.trim()
  await options.onResponse?.({
    text: content ?? '', model: response.model ?? model,
    finishReason: response.choices[0]?.finish_reason ?? null,
    usage: response.usage ? { promptTokens: response.usage.prompt_tokens, completionTokens: response.usage.completion_tokens, totalTokens: response.usage.total_tokens } : undefined,
  })
  if (response.choices[0]?.finish_reason === 'length') {
    throw new OpenAiTruncatedError(response.usage
      ? { promptTokens: response.usage.prompt_tokens, completionTokens: response.usage.completion_tokens, totalTokens: response.usage.total_tokens }
      : undefined)
  }
  if (response.choices[0]?.finish_reason === 'content_filter') throw new Error('생성 응답이 안전 검토로 중단되었습니다.')
  if (!content) {
    /*
     * finish_reason 이 'length' 가 아니어도 빈 응답이 나온다. gpt-5 계열은 추론 토큰을
     * max_completion_tokens 예산 안에서 쓰는데, 추론이 길어지면 본문 자리가 하나도
     * 안 남고 finish_reason 은 'stop'으로 끝난다 — 겉보기엔 정상 종료인데 내용이 없다.
     * 운영에서 love_mind 의 특정 항목이 사흘째 이 상태로 10분 간격 외부 재시도만
     * 반복하며 dead-letter 로 빠졌다(2026-09-17). OpenAiTruncatedError 로 던지면
     * generateReportSectionNow 가 같은 실행 안에서 SECTION_ATTEMPT_LIMIT 만큼(초 단위)
     * 바로 재시도한다 — 외부 재시도(수~수십 분 간격)보다 훨씬 빠르고 성공률도 높다.
     */
    throw new OpenAiTruncatedError(response.usage
      ? { promptTokens: response.usage.prompt_tokens, completionTokens: response.usage.completion_tokens, totalTokens: response.usage.total_tokens }
      : undefined)
  }
  return content
}

export function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY)
}
