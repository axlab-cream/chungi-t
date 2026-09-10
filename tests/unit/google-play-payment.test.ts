import assert from 'node:assert/strict'
import { generateKeyPairSync } from 'node:crypto'
import { after, before, describe, it } from 'node:test'
import type { Server } from 'node:http'
import type { UserBirthProfile } from '../../src/user/profile-store.js'

// 저장소를 메모리로 내리고 합성 인증만 남긴다. 이 스위트는 밖으로 나가는 요청을
// 하나도 허용하지 않는다. 구글 API 는 스텁으로 대신한다.
const previousEnv = { ...process.env }
process.env.NODE_ENV = 'test'
for (const name of Object.keys(process.env)) {
  if (/DATABASE|SUPABASE|OPENAI|ANTHROPIC|INICIS|PAYMENT|VERCEL|REPORT_STORAGE|ADMIN_EMAIL|GOOGLE_PLAY/.test(name)) {
    delete process.env[name]
  }
}

// 서비스 계정 키는 테스트 안에서 만든다. 실제 키를 파일에 두지 않아도 JWT 서명 경로가
// 그대로 돌아가는지 확인할 수 있다.
const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
})
const SERVICE_ACCOUNT = {
  type: 'service_account',
  client_email: 'umsh-play@synthetic.invalid',
  private_key: privateKey as unknown as string,
}

/** 구글 API 를 대신할 응답. 각 테스트가 필요한 값으로 갈아 끼운다. */
let purchaseResponse: { status: number; body: Record<string, unknown> } = {
  status: 200,
  body: { purchaseState: 0, consumptionState: 0, acknowledgementState: 0, orderId: 'GPA.0000-0000-0000-00000' },
}
const googleCalls: string[] = []

const nativeFetch = globalThis.fetch
let origin = ''
const unexpected: string[] = []
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)

  if (url.href === 'https://synthetic-auth.invalid/auth/v1/user') {
    const token = new Headers(init?.headers).get('authorization')?.replace(/^Bearer /, '')
    return new Response(JSON.stringify({ id: token, email: `${token}@synthetic.invalid` }), {
      status: token ? 200 : 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  if (url.href === 'https://oauth2.googleapis.com/token') {
    googleCalls.push('token')
    return new Response(JSON.stringify({ access_token: 'synthetic-play-token', expires_in: 3600 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  if (url.hostname === 'androidpublisher.googleapis.com') {
    googleCalls.push(url.pathname.endsWith(':acknowledge') ? 'acknowledge' : 'get')
    if (url.pathname.endsWith(':acknowledge')) {
      return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    return new Response(JSON.stringify(purchaseResponse.body), {
      status: purchaseResponse.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  if (origin && url.origin === origin) return nativeFetch(input, init)
  unexpected.push(url.origin)
  throw new Error('이 스위트는 외부 요청을 허용하지 않습니다.')
}) as typeof fetch

// report-store 를 SUPABASE_URL 설정보다 먼저 import 해야 저장 방식이 메모리로 굳는다.
await import('../../src/report/report-store.js')
const profiles = await import('../../src/user/profile-store.js')
const payments = await import('../../src/payment/order-store.js')
const googlePlay = await import('../../src/payment/google-play.js')

process.env.SUPABASE_URL = 'https://synthetic-auth.invalid'
process.env.SUPABASE_PUBLISHABLE_KEY = 'synthetic-public-fixture-only'
process.env.GOOGLE_PLAY_PACKAGE_NAME = 'kr.umsh.app'
process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = Buffer.from(JSON.stringify(SERVICE_ACCOUNT)).toString('base64')

const { default: app } = await import('../../src/server/app.js')
let server: Server

const OWNER = 'play-owner-a'
const OTHER = 'play-owner-b'
const profile: UserBirthProfile = {
  userId: OWNER,
  name: '합성점검',
  birth: { year: 1993, month: 4, day: 18, hour: 9, minute: 40, gender: 'female', calendar: 'solar' },
  birthTimeKnown: true,
  context: {},
  createdAt: '2026-09-07T00:00:00Z',
  updatedAt: '2026-09-07T00:00:00Z',
}

async function request(path: string, body?: unknown, owner: string | null = OWNER) {
  const response = await fetch(origin + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { ...(owner ? { Authorization: `Bearer ${owner}` } : {}), 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const text = await response.text()
  let payload: Record<string, unknown> = {}
  try {
    payload = JSON.parse(text) as Record<string, unknown>
  } catch {
    payload = { raw: text }
  }
  return { status: response.status, payload }
}

let seq = 0
async function seedOrder(options: { owner?: string; productKey?: string; status?: string; tid?: string } = {}) {
  seq += 1
  const orderId = `play-order-${seq}`
  await payments.savePaymentOrder({
    orderId,
    ownerId: options.owner ?? OWNER,
    buyerEmail: 'fixture@synthetic.invalid',
    buyerTel: '01000000000',
    productKey: (options.productKey ?? 'wedding_day') as never,
    productTitle: '합성 주문',
    amount: 24900,
    status: (options.status ?? 'ready') as never,
    ...(options.tid ? { tid: options.tid } : {}),
    createdAt: '2026-09-07T00:00:00Z',
    updatedAt: '2026-09-07T00:00:00Z',
  } as never)
  return orderId
}

describe('구글플레이 인앱 결제 확인', () => {
  before(async () => {
    await profiles.saveUserBirthProfile(profile as never, { id: OWNER } as never)
    server = app.listen(0, '127.0.0.1')
    await new Promise<void>((resolve) => server.once('listening', () => resolve()))
    const address = server.address()
    origin = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`
  })

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
    globalThis.fetch = nativeFetch
    Object.assign(process.env, previousEnv)
    assert.deepEqual(unexpected, [], `허용하지 않은 외부 요청: ${unexpected.join(', ')}`)
  })

  it('로그인하지 않으면 확인해 주지 않는다', async () => {
    const result = await request('/api/payment/google/verify', { orderId: 'x', purchaseToken: 'y' }, null)
    assert.equal(result.status, 401)
  })

  it('주문 번호와 결제 토큰이 없으면 400 으로 되돌린다', async () => {
    const missingToken = await request('/api/payment/google/verify', { orderId: 'play-order-x' })
    assert.equal(missingToken.status, 400)
    assert.equal(missingToken.payload.code, 'INPUT_REQUIRED')
  })

  it('남의 주문은 열어 주지 않는다', async () => {
    const orderId = await seedOrder({ owner: OTHER })
    const result = await request('/api/payment/google/verify', { orderId, purchaseToken: 'token-other' })
    assert.equal(result.status, 404)
  })

  it('주문과 다른 상품 ID 를 보내면 거절한다', async () => {
    const orderId = await seedOrder()
    const result = await request('/api/payment/google/verify', {
      orderId,
      productId: 'money_save',
      purchaseToken: 'token-mismatch',
    })
    assert.equal(result.status, 400)
    assert.match(String(result.payload.error), /상품/)
  })

  it('구매 완료 영수증이면 주문을 열고 구글에 확인을 통보한다', async () => {
    const orderId = await seedOrder()
    googleCalls.length = 0
    purchaseResponse = {
      status: 200,
      body: {
        purchaseState: 0,
        consumptionState: 0,
        acknowledgementState: 0,
        orderId: 'GPA.1111-2222-3333-44444',
        obfuscatedExternalAccountId: googlePlay.obfuscatedAccountId(OWNER),
      },
    }
    const result = await request('/api/payment/google/verify', {
      orderId,
      productId: 'wedding_day',
      purchaseToken: 'token-good',
    })
    assert.equal(result.status, 200, JSON.stringify(result.payload))
    const order = result.payload.order as Record<string, unknown>
    assert.equal(order.status, 'paid')
    assert.equal(order.payMethod, 'GOOGLE_PLAY')
    // 확인 통보를 반드시 부른다. 부르지 않으면 구글이 3일 뒤 자동 환불한다.
    assert.ok(googleCalls.includes('acknowledge'), `구글 호출: ${googleCalls.join(', ')}`)

    const stored = await payments.getPaymentOrder(orderId)
    assert.equal(stored?.tid, 'token-good')
    assert.equal(stored?.approvalCode, 'GPA.1111-2222-3333-44444')
  })

  it('같은 결제 토큰으로 다른 주문을 열지 못한다', async () => {
    const second = await seedOrder()
    const result = await request('/api/payment/google/verify', { orderId: second, purchaseToken: 'token-good' })
    assert.equal(result.status, 409)
    assert.equal(result.payload.code, 'PURCHASE_ALREADY_USED')
  })

  it('이미 열린 주문을 다시 확인해도 같은 결과가 나온다', async () => {
    const orderId = await seedOrder({ status: 'paid', tid: 'token-already' })
    const result = await request('/api/payment/google/verify', { orderId, purchaseToken: 'token-already' })
    assert.equal(result.status, 200)
    assert.equal(result.payload.alreadyPaid, true)
  })

  it('보류 상태 결제는 열지 않고 기다리라고 알린다', async () => {
    const orderId = await seedOrder()
    purchaseResponse = { status: 200, body: { purchaseState: 2, consumptionState: 0, acknowledgementState: 0 } }
    const result = await request('/api/payment/google/verify', { orderId, purchaseToken: 'token-pending' })
    assert.equal(result.status, 202)
    assert.equal(result.payload.code, 'PAYMENT_PENDING')
    const stored = await payments.getPaymentOrder(orderId)
    assert.equal(stored?.status, 'ready')
  })

  it('취소된 결제는 열지 않는다', async () => {
    const orderId = await seedOrder()
    purchaseResponse = { status: 200, body: { purchaseState: 1, consumptionState: 0, acknowledgementState: 0 } }
    const result = await request('/api/payment/google/verify', { orderId, purchaseToken: 'token-cancelled' })
    assert.equal(result.status, 402)
    const stored = await payments.getPaymentOrder(orderId)
    assert.equal(stored?.status, 'ready')
  })

  it('다른 계정에서 만들어진 결제는 거절한다', async () => {
    const orderId = await seedOrder()
    purchaseResponse = {
      status: 200,
      body: {
        purchaseState: 0,
        consumptionState: 0,
        acknowledgementState: 0,
        obfuscatedExternalAccountId: googlePlay.obfuscatedAccountId(OTHER),
      },
    }
    const result = await request('/api/payment/google/verify', { orderId, purchaseToken: 'token-foreign' })
    assert.equal(result.status, 409)
    assert.equal(result.payload.code, 'PURCHASE_ACCOUNT_MISMATCH')
  })

  it('purchaseState 가 빠진 응답은 통과시키지 않는다', async () => {
    const orderId = await seedOrder()
    purchaseResponse = { status: 200, body: { orderId: 'GPA.no-state' } }
    const result = await request('/api/payment/google/verify', { orderId, purchaseToken: 'token-no-state' })
    assert.equal(result.status, 202, JSON.stringify(result.payload))
  })

  it('앱이 결제를 시작할 때 쓸 상품 정보와 계정 식별자를 준다', async () => {
    const result = await request('/api/payment/google/product/wedding_day')
    assert.equal(result.status, 200)
    assert.equal(result.payload.productId, 'wedding_day')
    assert.equal(result.payload.amount, 24900)
    assert.equal(result.payload.configured, true)
    // 검증 단계가 같은 규칙으로 다시 계산해 대조하므로 두 값이 같아야 한다.
    assert.equal(result.payload.obfuscatedAccountId, googlePlay.obfuscatedAccountId(OWNER))
    assert.equal(String(result.payload.obfuscatedAccountId).length, 64)
  })

  it('없는 상품은 404 로 되돌린다', async () => {
    const result = await request('/api/payment/google/product/not_a_product')
    assert.equal(result.status, 404)
  })

  // 정책은 앱을 나가지 않는 신고 경로를 요구한다. 본인 리포트에 대해서만 받고,
  // 사유는 고정 목록에서만 받는다.
  it('신고: 로그인하지 않으면 받지 않는다', async () => {
    const result = await request('/api/report/flag', { reportId: 'x', reason: 'harmful' }, null)
    assert.equal(result.status, 401)
  })

  it('신고: 리포트와 사유가 없으면 400 으로 되돌린다', async () => {
    const result = await request('/api/report/flag', { reportId: 'x' })
    assert.equal(result.status, 400)
    assert.equal(result.payload.code, 'INPUT_REQUIRED')
  })

  it('신고: 목록에 없는 사유는 받지 않는다', async () => {
    const result = await request('/api/report/flag', { reportId: 'x', reason: 'made-up-reason' })
    assert.equal(result.status, 400)
    assert.match(String(result.payload.error), /사유/)
  })

  it('신고: 없는 리포트는 404 로 되돌린다', async () => {
    const result = await request('/api/report/flag', { reportId: 'no-such-report', reason: 'harmful' })
    assert.equal(result.status, 404)
  })
})

describe('구글플레이 자격 증명 읽기', () => {
  it('원본 JSON 과 base64 를 모두 받는다', () => {
    const previous = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON
    process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = JSON.stringify(SERVICE_ACCOUNT)
    assert.equal(googlePlay.googlePlayCredentials()?.clientEmail, SERVICE_ACCOUNT.client_email)
    process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = Buffer.from(JSON.stringify(SERVICE_ACCOUNT)).toString('base64')
    assert.equal(googlePlay.googlePlayCredentials()?.clientEmail, SERVICE_ACCOUNT.client_email)
    process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = previous
  })

  it('값이 없거나 깨지면 설정되지 않은 것으로 본다', () => {
    const previous = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON
    process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = 'not-json-at-all'
    assert.equal(googlePlay.isGooglePlayConfigured(), false)
    delete process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON
    assert.equal(googlePlay.isGooglePlayConfigured(), false)
    process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = previous
    assert.equal(googlePlay.isGooglePlayConfigured(), true)
  })

  it('계정 식별자는 같은 사용자에게 항상 같고 사용자 id 를 노출하지 않는다', () => {
    const a = googlePlay.obfuscatedAccountId(OWNER)
    assert.equal(a, googlePlay.obfuscatedAccountId(OWNER))
    assert.notEqual(a, googlePlay.obfuscatedAccountId(OTHER))
    assert.ok(!a.includes(OWNER))
  })
})

describe('Play 상품 ID 규격', () => {
  // Play Console 에 등록할 상품 ID 로 카탈로그 키를 그대로 쓴다. 별도 매핑 표를 두지
  // 않는 대신, 19개 키가 모두 Play 규격을 지키는지를 여기서 고정한다.
  it('모든 결제 상품 키가 Play 상품 ID 규격에 맞는다', async () => {
    const { listPaymentProducts } = await import('../../src/payment/catalog.js')
    const products = listPaymentProducts()
    assert.ok(products.length >= 19, `상품 수 ${products.length}`)
    for (const product of products) {
      // 소문자·숫자·밑줄만, 첫 글자는 소문자나 숫자, 1~40자.
      assert.match(product.key, /^[a-z0-9][a-z0-9_]{0,39}$/, `규격을 벗어난 키: ${product.key}`)
    }
    assert.equal(new Set(products.map((p) => p.key)).size, products.length, "중복된 키가 있다")
  })
})
