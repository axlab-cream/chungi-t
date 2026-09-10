/**
 * 구글플레이 인앱 결제 영수증 검증.
 *
 * 앱에서 결제가 끝나면 클라이언트는 purchaseToken 하나만 들고 온다. 그 토큰이 진짜인지,
 * 어떤 상품인지, 이미 다른 주문을 열어 준 토큰이 아닌지는 서버가 구글에 직접 물어야
 * 판단할 수 있다. 클라이언트가 보내는 상품명이나 금액은 근거로 쓰지 않는다.
 *
 * googleapis 패키지를 쓰지 않는다. Vercel 함수 크기가 이미 한계에 가깝고, 필요한 것은
 * 서비스 계정 JWT 한 장과 REST 호출 두 개뿐이다.
 */
import { createHash, createSign } from 'node:crypto'
import { configuredEnv } from '../env/load.js'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const API_BASE = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications'
const SCOPE = 'https://www.googleapis.com/auth/androidpublisher'
const TIMEOUT_MS = 15_000

/** 구글이 돌려주는 purchaseState. 0 이 아니면 열어 주지 않는다. */
export const PURCHASE_STATE_PURCHASED = 0
export const PURCHASE_STATE_CANCELLED = 1
export const PURCHASE_STATE_PENDING = 2

export interface GooglePlayCredentials {
  packageName: string
  clientEmail: string
  privateKey: string
}

export interface GooglePlayPurchase {
  /** 0 구매 완료, 1 취소, 2 보류. */
  purchaseState: number
  /** 0 미소비, 1 소비됨. 한 번 쓴 토큰을 다시 들고 오는 경우를 가른다. */
  consumptionState: number
  /** 0 미확인, 1 확인됨. 3일 안에 확인하지 않으면 구글이 자동 환불한다. */
  acknowledgementState: number
  /** 구글이 매긴 주문 번호. 고객 문의 대조에 쓴다. */
  orderId?: string
  purchaseTimeMillis?: string
  /** 결제 시 앱이 넘긴 계정 식별자. 남의 토큰을 가져다 쓰는 것을 막는 근거다. */
  obfuscatedExternalAccountId?: string
  regionCode?: string
}

/**
 * 서비스 계정 자격 증명.
 *
 * Play Console 에서 내려받은 JSON 키를 그대로 쓰기 어려운 환경(줄바꿈이 든 값)을 감안해
 * base64 로 인코딩한 문자열도 받는다.
 */
export function googlePlayCredentials(): GooglePlayCredentials | undefined {
  const raw = configuredEnv(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON)
  const packageName = configuredEnv(process.env.GOOGLE_PLAY_PACKAGE_NAME)
  if (!raw || !packageName) return undefined

  let parsed: { client_email?: unknown; private_key?: unknown }
  try {
    const text = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf-8')
    parsed = JSON.parse(text) as typeof parsed
  } catch {
    return undefined
  }

  const clientEmail = typeof parsed.client_email === 'string' ? parsed.client_email.trim() : ''
  const privateKey = typeof parsed.private_key === 'string' ? parsed.private_key.replace(/\\n/g, '\n').trim() : ''
  if (!clientEmail || !privateKey) return undefined
  return { packageName, clientEmail, privateKey }
}

/**
 * 결제를 계정에 묶는 식별자.
 *
 * 앱이 결제할 때 이 값을 넘기고 서버가 영수증에서 같은 값을 확인한다. 사용자 id 를
 * 그대로 넘기지 않는 이유는 구글에 우리 계정 식별자를 남기지 않기 위해서다.
 * Play 가 허용하는 길이는 64자까지다.
 */
export function obfuscatedAccountId(ownerId: string): string {
  return createHash('sha256').update(`umsh:${ownerId}`).digest('hex').slice(0, 64)
}

export function isGooglePlayConfigured(): boolean {
  return googlePlayCredentials() !== undefined
}

/** 테스트가 갈아 끼울 수 있도록 HTTP 호출을 한 군데로 모은다. */
export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>

let cachedToken: { value: string; expiresAt: number } | null = null

/** 캐시를 비운다. 자격 증명이 바뀌는 테스트에서만 쓴다. */
export function resetGooglePlayTokenCache(): void {
  cachedToken = null
}

function base64Url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * 서비스 계정 JWT 로 액세스 토큰을 받는다.
 *
 * 만료 1분 전까지 재사용한다. 매 검증마다 토큰을 새로 받으면 결제 확인이 그만큼 느려지고
 * 구글 쪽 호출 한도만 쓴다.
 */
async function accessToken(credentials: GooglePlayCredentials, request: FetchLike): Promise<string> {
  if (cachedToken && cachedToken.expiresAt - 60_000 > Date.now()) return cachedToken.value

  const issuedAt = Math.floor(Date.now() / 1000)
  const claims = {
    iss: credentials.clientEmail,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: issuedAt,
    exp: issuedAt + 3600,
  }
  const unsigned = `${base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${base64Url(JSON.stringify(claims))}`
  const signer = createSign('RSA-SHA256')
  signer.update(unsigned)
  const assertion = `${unsigned}.${base64Url(signer.sign(credentials.privateKey))}`

  const response = await request(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }).toString(),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!response.ok) {
    throw new Error('구글플레이 인증에 실패했습니다. 서비스 계정 설정을 확인해 주세요.')
  }
  const payload = await response.json() as { access_token?: unknown; expires_in?: unknown }
  const value = typeof payload.access_token === 'string' ? payload.access_token : ''
  if (!value) throw new Error('구글플레이 인증 응답에 토큰이 없습니다.')
  const lifetime = typeof payload.expires_in === 'number' ? payload.expires_in : 3600
  cachedToken = { value, expiresAt: Date.now() + lifetime * 1000 }
  return value
}

function purchaseUrl(credentials: GooglePlayCredentials, productId: string, purchaseToken: string): string {
  return [
    API_BASE,
    encodeURIComponent(credentials.packageName),
    'purchases/products',
    encodeURIComponent(productId),
    'tokens',
    encodeURIComponent(purchaseToken),
  ].join('/')
}

/**
 * 영수증 조회. 상태 판단은 하지 않고 구글이 준 값을 그대로 돌려준다.
 * 무엇을 통과로 볼지는 호출한 쪽에서 결정한다.
 */
export async function fetchGooglePlayPurchase(
  params: { productId: string; purchaseToken: string },
  options: { credentials?: GooglePlayCredentials; request?: FetchLike } = {},
): Promise<GooglePlayPurchase> {
  const credentials = options.credentials ?? googlePlayCredentials()
  if (!credentials) throw new Error('구글플레이 결제가 설정되지 않았습니다.')
  const request = options.request ?? ((url, init) => fetch(url, init))

  const token = await accessToken(credentials, request)
  const response = await request(purchaseUrl(credentials, params.productId, params.purchaseToken), {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (response.status === 404) {
    throw new Error('구글플레이에서 이 결제를 찾지 못했습니다.')
  }
  if (!response.ok) {
    throw new Error('구글플레이 결제 확인에 실패했습니다.')
  }
  const body = await response.json() as Record<string, unknown>
  const num = (key: string, fallback: number) => (typeof body[key] === 'number' ? body[key] as number : fallback)
  const str = (key: string) => (typeof body[key] === 'string' ? body[key] as string : undefined)
  return {
    // 값이 없으면 통과시키지 않는 쪽으로 기운다. 보류(2)를 기본으로 둔다.
    purchaseState: num('purchaseState', PURCHASE_STATE_PENDING),
    consumptionState: num('consumptionState', 0),
    acknowledgementState: num('acknowledgementState', 0),
    orderId: str('orderId'),
    purchaseTimeMillis: str('purchaseTimeMillis'),
    obfuscatedExternalAccountId: str('obfuscatedExternalAccountId'),
    regionCode: str('regionCode'),
  }
}

/**
 * 결제 확인 통보.
 *
 * 구글은 확인되지 않은 결제를 3일 뒤 자동 환불한다. 리포트를 열어 준 뒤에는 반드시
 * 불러야 하고, 이미 확인된 결제를 다시 확인하는 것은 문제가 되지 않는다.
 */
export async function acknowledgeGooglePlayPurchase(
  params: { productId: string; purchaseToken: string; payload?: string },
  options: { credentials?: GooglePlayCredentials; request?: FetchLike } = {},
): Promise<void> {
  const credentials = options.credentials ?? googlePlayCredentials()
  if (!credentials) throw new Error('구글플레이 결제가 설정되지 않았습니다.')
  const request = options.request ?? ((url, init) => fetch(url, init))

  const token = await accessToken(credentials, request)
  const response = await request(`${purchaseUrl(credentials, params.productId, params.purchaseToken)}:acknowledge`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(params.payload ? { developerPayload: params.payload } : {}),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!response.ok) {
    throw new Error('구글플레이 결제 확인 통보에 실패했습니다.')
  }
}
