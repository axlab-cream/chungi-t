import type { AdminContentSnapshot, ContentPayload } from '../admin/content-store.js'

export const CONSULTATION_PLACEMENT = 'cheonmyeong_consultation'
export const CONSULTATION_VOICES = ['ko-KR-InJoonNeural', 'ko-KR-HyunsuMultilingualNeural', 'ko-KR-SunHiNeural'] as const
/** Gemini Live prebuilt voices. The realtime voice consultation can only use these names. */
export const CONSULTATION_LIVE_VOICES = [
  'Charon', 'Puck', 'Fenrir', 'Orus', 'Kore', 'Zephyr', 'Leda', 'Aoede', 'Callirrhoe', 'Autonoe',
  'Enceladus', 'Iapetus', 'Umbriel', 'Algieba', 'Despina', 'Erinome', 'Algenib', 'Rasalgethi', 'Laomedeia', 'Achernar',
  'Alnilam', 'Schedar', 'Gacrux', 'Pulcherrima', 'Achird', 'Zubenelgenubi', 'Vindemiatrix', 'Sadachbia', 'Sadaltager', 'Sulafat',
] as const
export interface ConsultationSettings {
  name: string
  introduction: string
  personality: string
  speech: string
  questionRules: string
  voiceName: (typeof CONSULTATION_VOICES)[number]
  voiceRate: number
  liveVoiceName: (typeof CONSULTATION_LIVE_VOICES)[number]
  bannerTitle: string
  bannerBody: string
  bannerImage: string
  enabled: boolean
}
export const DEFAULT_CONSULTATION_SETTINGS: Readonly<ConsultationSettings> = Object.freeze({
  name: '천명',
  introduction: '사주를 바탕으로 고민을 함께 정리하는 42세 가상 남성 상담자입니다.',
  personality: '차분하고 다정하게 경청하며 현실에서 실천할 수 있는 방향을 함께 찾습니다. 실제 사주 계산 근거와 해석을 구분하고, 확인되지 않은 미래를 단정하지 않습니다.',
  speech: '자연스럽고 따뜻한 한국어 존댓말을 사용합니다. 어려운 명리 용어는 쉬운 말로 풀고, 한 번에 너무 많은 질문을 하지 않습니다.',
  questionRules: '궁합 상담은 상대방의 생년월일, 양력·음력, 성별, 출생시각을 확인합니다. 불명확한 정보는 질문하고, 시각을 모르면 모름으로 처리하여 임의로 시주를 확정하지 않습니다. 사용자의 정정을 우선 반영합니다.',
  voiceName: 'ko-KR-InJoonNeural', voiceRate: 0.95, liveVoiceName: 'Charon',
  bannerTitle: '천명과 나누는 사주 상담',
  bannerBody: '내 사주를 바탕으로, 지금 마음에 걸리는 이야기를 나눠 보세요.',
  bannerImage: '/assets/cheonmyeong-scenes/01-idle.png', enabled: true,
})

const TEXT_LIMITS = { name: 30, introduction: 300, personality: 900, speech: 700, questionRules: 1000, bannerTitle: 100, bannerBody: 300, bannerImage: 300 } as const
export function normalizeConsultationSettings(input: unknown): ConsultationSettings {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('CONSULTATION_SETTINGS_INVALID')
  const source = input as Record<string, unknown>
  const allowed = [...Object.keys(TEXT_LIMITS), 'voiceName', 'voiceRate', 'liveVoiceName', 'enabled']
  if (Object.keys(source).some(key => !allowed.includes(key))) throw new Error('CONSULTATION_SETTINGS_INVALID')
  const fields: Record<string, string> = {}
  for (const [key, max] of Object.entries(TEXT_LIMITS)) {
    const value = source[key]
    if (typeof value !== 'string' || !value.trim() || value.trim().length > max || /[<>\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value)) throw new Error('CONSULTATION_SETTINGS_INVALID')
    fields[key] = value.trim()
  }
  // Only same-site asset paths; protocol-relative URLs and path traversal are not images managed here.
  if (!/^\/(?:assets|images)\/[A-Za-z0-9_./-]+\.(?:png|jpe?g|webp|gif)$/i.test(fields.bannerImage) || fields.bannerImage.includes('..')) throw new Error('CONSULTATION_SETTINGS_INVALID')
  if (!(CONSULTATION_VOICES as readonly unknown[]).includes(source.voiceName) || typeof source.voiceRate !== 'number' || !Number.isFinite(source.voiceRate) || source.voiceRate < 0.7 || source.voiceRate > 1.3 || typeof source.enabled !== 'boolean') throw new Error('CONSULTATION_SETTINGS_INVALID')
  // Settings published before the realtime voice became configurable keep the shipped Charon voice.
  const liveVoiceName = source.liveVoiceName === undefined ? DEFAULT_CONSULTATION_SETTINGS.liveVoiceName : source.liveVoiceName
  if (!(CONSULTATION_LIVE_VOICES as readonly unknown[]).includes(liveVoiceName)) throw new Error('CONSULTATION_SETTINGS_INVALID')
  const result = { ...fields, voiceName: source.voiceName, voiceRate: source.voiceRate, liveVoiceName, enabled: source.enabled } as unknown as ConsultationSettings
  if (JSON.stringify(result).length > 4000) throw new Error('CONSULTATION_SETTINGS_INVALID')
  return result
}

export function normalizeConsultationContentPayload(input: unknown): ContentPayload {
  const value = input as Partial<ContentPayload> | null
  if (!value || typeof value.body !== 'string' || value.body.length > 4000) throw new Error('CONSULTATION_SETTINGS_INVALID')
  let decoded: unknown
  try { decoded = JSON.parse(value.body) } catch { throw new Error('CONSULTATION_SETTINGS_INVALID') }
  const settings = normalizeConsultationSettings(decoded)
  return { title: `${settings.name} 상담 설정`, body: JSON.stringify(settings) }
}

/** No published override means the shipped character. Unavailable storage never means enabled. */
export function resolveConsultationSettings(snapshot: AdminContentSnapshot): ConsultationSettings {
  if (snapshot.versionStore !== 'ready') throw new Error('CONSULTATION_SETTINGS_UNAVAILABLE')
  const published = snapshot.items.filter(item => item.contentType === 'notice' && item.placement === CONSULTATION_PLACEMENT && item.serviceKey === null && item.state === 'published')
  if (published.length > 1) throw new Error('CONSULTATION_SETTINGS_INVALID')
  if (!published.length) {
    const archived = snapshot.items.some(item => item.contentType === 'notice' && item.placement === CONSULTATION_PLACEMENT && item.serviceKey === null && item.state === 'archived')
    return { ...DEFAULT_CONSULTATION_SETTINGS, enabled: !archived && DEFAULT_CONSULTATION_SETTINGS.enabled }
  }
  const value = normalizeConsultationContentPayload(published[0].payload)
  return JSON.parse(value.body) as ConsultationSettings
}

export async function getConsultationSettings(): Promise<ConsultationSettings> {
  const { getConsultationContentSnapshot } = await import('../admin/content-store.js')
  return resolveConsultationSettings(await getConsultationContentSnapshot())
}
