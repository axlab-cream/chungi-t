import { ConsultationError } from './provider.js'

/** Permanent credentials never cross the authenticated server boundary. */
export async function createLiveToken() {
  const key = process.env.GEMINI_API_KEY
  const model = process.env.GEMINI_LIVE_MODEL || 'gemini-3.8-live'
  if (!key || !/^[a-zA-Z0-9._-]+$/.test(model)) throw new ConsultationError('PROVIDER_UNAVAILABLE')
  const config = {
    generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } } },
    inputAudioTranscription: {}, outputAudioTranscription: {},
    systemInstruction: { parts: [{ text: '당신은 운명상회 천명 선생의 한국어 음성 상담 진행자입니다. 처음에는 “자네, 오늘의 기운을 함께 살펴보세. 어떤 상담을 하고 싶은가?”라고 인사합니다. 사주 질문이나 상대 정보는 반드시 consult_saju 도구에 원문 그대로 전달합니다. 도구가 돌려준 text만 그대로 읽으며 독자적으로 사주를 해석하거나 정보를 추측하지 않습니다. 오류면 답변을 지어내지 말고 채팅창을 확인하도록 안내합니다. 궁합 상대의 생년월일·양음력·성별·시각은 채팅으로 입력하면 더 정확하다고 안내합니다. 이용 횟수·결제·저장 여부를 임의로 확정하지 않습니다.' }] },
    tools: [{ functionDeclarations: [{ name: 'consult_saju', description: '회원의 사주 질문과 상대 정보를 서버에서 해석하고 저장합니다. 매 상담 발화에 호출하세요.', parameters: { type: 'OBJECT', properties: { text: { type: 'STRING', description: '사용자가 실제 말한 질문 또는 상대 정보 원문' } }, required: ['text'] } }] }],
  }
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/auth_tokens', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, signal: AbortSignal.timeout(15000),
      body: JSON.stringify({ uses: 1, expireTime: new Date(Date.now() + 10 * 60_000).toISOString(), newSessionExpireTime: new Date(Date.now() + 60_000).toISOString(), bidiGenerateContentSetup: { model: `models/${model}`, ...config } }),
    })
    if (!response.ok) {
      // Log only bounded machine codes and our own known field names, never raw messages.
      const failure = await response.json().catch(() => null) as { error?: { status?: unknown; message?: unknown; details?: Array<{ reason?: unknown }> } } | null
      const safeCode = (value: unknown) => typeof value === 'string' && /^[A-Z][A-Z0-9_]{0,79}$/.test(value) ? value : 'UNKNOWN'
      const details = failure?.error?.details
      const reasons = Array.isArray(details) ? details.slice(0, 3).map(detail => safeCode(detail?.reason)) : []
      const message = typeof failure?.error?.message === 'string' ? failure.error.message : ''
      const invalidFields = ['uses', 'expireTime', 'newSessionExpireTime', 'bidiGenerateContentSetup', 'generationConfig', 'config', 'responseModalities', 'speechConfig', 'inputAudioTranscription', 'outputAudioTranscription'].filter(field => message.includes(`Unknown name "${field}"`))
      console.warn('[consultation-live]', JSON.stringify({ status: response.status, model, code: safeCode(failure?.error?.status), reasons, invalidFields }))
      throw new ConsultationError(response.status === 429 ? 'PROVIDER_LIMIT' : 'PROVIDER_UNAVAILABLE', response.status === 429 ? 429 : 503)
    }
    const token = await response.json() as { name?: unknown }
    if (typeof token.name !== 'string' || !token.name || token.name.length > 16000) throw new ConsultationError('PROVIDER_RESPONSE_INVALID')
    return { token: token.name, model: `models/${model}`, expiresIn: 600 }
  } catch (error) {
    if (error instanceof ConsultationError) throw error
    throw new ConsultationError('PROVIDER_UNAVAILABLE')
  }
}
