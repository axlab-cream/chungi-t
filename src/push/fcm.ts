import type { FetchLike } from './google-auth.js'

/**
 * FCM HTTP v1 로 기기 하나에 보낸다.
 *
 * firebase-admin 을 쓰지 않는다. 함수 번들이 이미 한도에 가깝고(android/app-shell/README.md),
 * 필요한 것은 요청 하나다. v1 은 다건 발송(multicast)이 없어 기기마다 한 번씩 부른다 —
 * 대신 기기마다 data 가 달라도 되므로 클릭을 기기 단위(umsh_did)로 기록할 수 있다.
 *
 * data 키는 앱 셸(MainActivity.PUSH_*_KEY)과 같아야 한다.
 */

export const PUSH_DATA_KEYS = { url: 'umsh_url', notification: 'umsh_nid', delivery: 'umsh_did' } as const
export const ANDROID_CHANNEL_ID = 'umsh_default'

export interface FcmMessage {
  token: string
  title: string
  body: string
  deepLink: string
  notificationId: string
  deliveryId: string
}

export type FcmResult =
  | { ok: true; messageId: string }
  /**
   * permanent: 이 토큰은 죽었다(기기 비활성화). rejected: 이번 발송만 실패(기기는 그대로).
   * retryable: 잠시 뒤 다시. auth: 우리 쪽 인증 문제라 발송 전체를 멈춘다.
   */
  | { ok: false; kind: 'permanent' | 'rejected' | 'retryable' | 'auth'; code: string; message: string }

const PERMANENT_CODES = new Set(['UNREGISTERED', 'SENDER_ID_MISMATCH'])
const RETRYABLE_CODES = new Set(['QUOTA_EXCEEDED', 'UNAVAILABLE', 'INTERNAL'])

export function fcmPayload(message: FcmMessage) {
  return {
    message: {
      token: message.token,
      notification: { title: message.title, body: message.body },
      data: {
        [PUSH_DATA_KEYS.url]: message.deepLink,
        [PUSH_DATA_KEYS.notification]: message.notificationId,
        [PUSH_DATA_KEYS.delivery]: message.deliveryId,
      },
      android: {
        priority: 'HIGH',
        notification: { channel_id: ANDROID_CHANNEL_ID },
      },
    },
  }
}

export async function sendFcmMessage(
  message: FcmMessage,
  context: { projectId: string; accessToken: string; request?: FetchLike },
): Promise<FcmResult> {
  const request = context.request ?? fetch
  let response: Response
  try {
    response = await request(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(context.projectId)}/messages:send`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${context.accessToken}` },
      body: JSON.stringify(fcmPayload(message)),
      signal: AbortSignal.timeout(10_000),
    })
  } catch (cause) {
    return { ok: false, kind: 'retryable', code: 'NETWORK', message: cause instanceof Error ? cause.message.slice(0, 200) : 'network error' }
  }
  if (response.ok) {
    const body = await response.json().catch(() => ({})) as { name?: unknown }
    return { ok: true, messageId: typeof body.name === 'string' ? body.name : '' }
  }
  const body = await response.json().catch(() => ({})) as { error?: { status?: string; message?: string; details?: Array<{ errorCode?: string }> } }
  const detailCode = body.error?.details?.find((detail) => typeof detail?.errorCode === 'string')?.errorCode
  const code = detailCode || body.error?.status || `HTTP_${response.status}`
  const text = String(body.error?.message ?? '').slice(0, 200)
  if (response.status === 401 || response.status === 403 || code === 'THIRD_PARTY_AUTH_ERROR' || code === 'PERMISSION_DENIED') {
    return { ok: false, kind: 'auth', code, message: text }
  }
  if (response.status === 404 || PERMANENT_CODES.has(code)) return { ok: false, kind: 'permanent', code: response.status === 404 && !detailCode ? 'UNREGISTERED' : code, message: text }
  if (response.status === 429 || response.status >= 500 || RETRYABLE_CODES.has(code)) return { ok: false, kind: 'retryable', code, message: text }
  /*
   * INVALID_ARGUMENT 는 토큰이 깨졌을 때도, 메시지 모양이 틀렸을 때도 온다. 후자를 토큰 탓으로
   * 돌려 기기를 끄면 코드 실수 하나로 전체 기기가 꺼진다. 토큰을 지목한 경우만 영구로 본다.
   */
  if (code === 'INVALID_ARGUMENT' && /registration token/i.test(text)) return { ok: false, kind: 'permanent', code, message: text }
  return { ok: false, kind: 'rejected', code, message: text }
}
