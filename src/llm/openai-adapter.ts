import OpenAI from 'openai'
import type { ImageGenerateParams } from 'openai/resources/images.js'
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

export interface OpenAiImageOptions {
  model?: string
  size?: ImageGenerateParams['size']
  quality?: ImageGenerateParams['quality']
}

export interface OpenAiImageResult {
  imageSrc: string
  model: string
  revisedPrompt?: string
  usage?: unknown
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
  } else {
    request.temperature = options.temperature ?? 0.7
    request.max_tokens = options.maxTokens ?? 800
  }

  const response = await openai.chat.completions.create(request as never)

  const content = response.choices[0]?.message?.content?.trim()
  if (!content) {
    throw new Error('OpenAI 응답이 비어 있습니다.')
  }
  return content
}

export async function generateImageWithOpenAI(
  prompt: string,
  options: OpenAiImageOptions = {},
): Promise<OpenAiImageResult> {
  const openai = getClient()
  const model = options.model ?? process.env.IMAGE_OPENAI_MODEL ?? 'gpt-image-1'
  const request: ImageGenerateParams = {
    model,
    prompt,
    n: 1,
    size: options.size ?? '1024x1024',
    quality: options.quality ?? 'low',
  }

  if (!/^gpt-image-1$/i.test(model)) {
    request.response_format = 'b64_json'
  } else {
    request.output_format = 'png'
  }

  const response = await openai.images.generate(request)
  const image = response.data?.[0]
  if (image?.b64_json) {
    return {
      imageSrc: `data:image/png;base64,${image.b64_json}`,
      model,
      revisedPrompt: image.revised_prompt,
      usage: response.usage,
    }
  }
  if (image?.url) {
    return {
      imageSrc: image.url,
      model,
      revisedPrompt: image.revised_prompt,
      usage: response.usage,
    }
  }
  throw new Error('OpenAI 이미지 응답이 비어 있습니다.')
}

export function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY)
}
