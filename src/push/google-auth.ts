/**
 * FCM 발송용 구글 액세스 토큰을 **키 파일 없이** 받는다.
 *
 * crea-m.com 조직은 서비스 계정 키 생성을 막는다(iam.disableServiceAccountKeyCreation).
 * 그래서 Vercel 이 함수 호출마다 붙여 주는 OIDC 토큰을 구글 Workload Identity 로 바꾼다.
 *
 *   x-vercel-oidc-token ──STS 교환──▶ 연합 토큰 ──generateAccessToken──▶ umsh-fcm-sender 토큰
 *
 * 구글 쪽 설정(2026-10-02, umsh-989fc):
 *   풀 vercel / 제공자 vercel(issuer https://oidc.vercel.com/ax-lab-cream)·vercel-global
 *   (issuer https://oidc.vercel.com). 조건: 팀 ID·프로젝트 ID 일치, environment production|preview.
 *   umsh-fcm-sender 에는 roles/firebasecloudmessaging.admin 만 있다.
 *
 * 아래 값은 식별자일 뿐 비밀이 아니다. 환경변수로 덮을 수 있게만 둔다.
 * 로컬 개발(environment=development)은 조건에서 빠져 있어 발송할 수 없다 — 의도한 것이다.
 */

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export interface PushGoogleConfig {
  projectId: string
  projectNumber: string
  poolId: string
  serviceAccountEmail: string
}

export function pushGoogleConfig(env: NodeJS.ProcessEnv = process.env): PushGoogleConfig {
  return {
    projectId: env.PUSH_FIREBASE_PROJECT_ID || 'umsh-989fc',
    projectNumber: env.PUSH_GCP_PROJECT_NUMBER || '267087222795',
    poolId: env.PUSH_GCP_WORKLOAD_IDENTITY_POOL_ID || 'vercel',
    serviceAccountEmail: env.PUSH_GCP_SERVICE_ACCOUNT_EMAIL || 'umsh-fcm-sender@umsh-989fc.iam.gserviceaccount.com',
  }
}

const STS_URL = 'https://sts.googleapis.com/v1/token'
const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging'
const TIMEOUT_MS = 10_000

/*
 * Vercel 함수에서 OIDC 토큰은 요청 헤더로만 온다(모듈 시점에는 없다). app.ts 미들웨어가
 * 요청마다 여기에 넣는다. 같은 인스턴스의 요청은 같은 프로젝트·환경이라 토큰 주장이 같다.
 * 빌드·로컬은 VERCEL_OIDC_TOKEN 환경변수로 온다.
 */
let latestOidcToken: { value: string; seenAt: number } | null = null

export function rememberVercelOidcToken(value: string | undefined | null): void {
  if (typeof value === 'string' && value.split('.').length === 3) latestOidcToken = { value, seenAt: Date.now() }
}

export function resetPushGoogleAuthForTests(): void {
  latestOidcToken = null
  cached = null
}

function currentOidcToken(env: NodeJS.ProcessEnv): string {
  // 함수 토큰은 2시간 유효하다. 1시간 넘게 새 요청이 없던 인스턴스의 값은 믿지 않는다.
  if (latestOidcToken && Date.now() - latestOidcToken.seenAt < 60 * 60_000) return latestOidcToken.value
  if (env.VERCEL_OIDC_TOKEN) return env.VERCEL_OIDC_TOKEN
  throw new Error('PUSH_OIDC_TOKEN_MISSING')
}

function jwtIssuer(token: string): string {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8')) as { iss?: unknown }
    return typeof payload.iss === 'string' ? payload.iss : ''
  } catch { return '' }
}

/** 프로젝트 설정의 OIDC 발급 방식(팀/전역)에 따라 iss 가 다르다. 맞는 제공자를 고른다. */
export function providerForIssuer(issuer: string): 'vercel' | 'vercel-global' {
  return issuer === 'https://oidc.vercel.com' ? 'vercel-global' : 'vercel'
}

let cached: { value: string; expiresAt: number } | null = null

export async function fcmAccessToken(request: FetchLike = fetch, env: NodeJS.ProcessEnv = process.env): Promise<string> {
  if (cached && cached.expiresAt - 120_000 > Date.now()) return cached.value
  const config = pushGoogleConfig(env)
  const subjectToken = currentOidcToken(env)
  const provider = providerForIssuer(jwtIssuer(subjectToken))
  const audience = `//iam.googleapis.com/projects/${config.projectNumber}/locations/global/workloadIdentityPools/${config.poolId}/providers/${provider}`

  const exchanged = await request(STS_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      grantType: 'urn:ietf:params:oauth:grant-type:token-exchange',
      audience,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      requestedTokenType: 'urn:ietf:params:oauth:token-type:access_token',
      subjectToken,
      subjectTokenType: 'urn:ietf:params:oauth:token-type:jwt',
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!exchanged.ok) throw new Error(`PUSH_STS_EXCHANGE_FAILED_${exchanged.status}`)
  const federated = (await exchanged.json() as { access_token?: unknown }).access_token
  if (typeof federated !== 'string' || !federated) throw new Error('PUSH_STS_EXCHANGE_EMPTY')

  const impersonated = await request(`https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(config.serviceAccountEmail)}:generateAccessToken`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${federated}` },
    body: JSON.stringify({ scope: [FCM_SCOPE], lifetime: '3600s' }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!impersonated.ok) throw new Error(`PUSH_IMPERSONATION_FAILED_${impersonated.status}`)
  const body = await impersonated.json() as { accessToken?: unknown; expireTime?: unknown }
  if (typeof body.accessToken !== 'string' || !body.accessToken) throw new Error('PUSH_IMPERSONATION_EMPTY')
  const expiresAt = typeof body.expireTime === 'string' ? Date.parse(body.expireTime) : NaN
  cached = { value: body.accessToken, expiresAt: Number.isFinite(expiresAt) ? expiresAt : Date.now() + 3_000_000 }
  return cached.value
}
