import assert from 'node:assert/strict'
import test from 'node:test'
import { createInicisPaymentFields, publicInicisConfig } from '../../src/payment/inicis.js'
import { getPaymentProduct } from '../../src/payment/catalog.js'
import { isPaymentTestMode } from '../../src/payment/test-mode.js'
import type { PaymentOrder } from '../../src/payment/order-store.js'

test('결제 카탈로그는 서버 기준 상품명과 금액을 사용한다', () => {
  const product = getPaymentProduct('home_pungsu')
  assert.equal(product?.title, '집 풍수')
  assert.equal(product?.amount, 19900)
  assert.equal(product?.returnPath, '/place/home')
})

test('이니시스 표준결제 필드와 서명은 서버에서 생성한다', () => {
  const previousMid = process.env.INICIS_MID
  const previousSignKey = process.env.INICIS_SIGNKEY
  const previousBaseUrl = process.env.PUBLIC_BASE_URL
  process.env.INICIS_MID = 'testmid'
  process.env.INICIS_SIGNKEY = 'test-sign-key'
  process.env.PUBLIC_BASE_URL = 'https://umsh.kr'

  const order: PaymentOrder = {
    orderId: 'UMSH1234567890abc',
    ownerId: 'owner-1',
    buyerEmail: 'buyer@example.com',
    buyerTel: '010-1234-5678',
    productKey: 'home_pungsu',
    productTitle: '집 풍수',
    amount: 19900,
    status: 'ready',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  try {
    const fields = createInicisPaymentFields({ order, buyerName: '홍길동' })
    assert.equal(fields.mid, 'testmid')
    assert.equal(fields.oid, order.orderId)
    assert.equal(fields.price, '19900')
    assert.match(fields.signature, /^[a-f0-9]{64}$/)
    assert.match(fields.verification, /^[a-f0-9]{64}$/)
    assert.equal(fields.returnUrl, 'https://umsh.kr/api/payment/inicis/return')
    assert.equal(publicInicisConfig().closeUrl, 'https://umsh.kr/payment/close')
  } finally {
    if (previousMid === undefined) delete process.env.INICIS_MID
    else process.env.INICIS_MID = previousMid
    if (previousSignKey === undefined) delete process.env.INICIS_SIGNKEY
    else process.env.INICIS_SIGNKEY = previousSignKey
    if (previousBaseUrl === undefined) delete process.env.PUBLIC_BASE_URL
    else process.env.PUBLIC_BASE_URL = previousBaseUrl
  }
})

test('결제 테스트 모드는 production에서 강제로 비활성화된다', () => {
  const previousMode = process.env.PAYMENT_TEST_MODE
  const previousNodeEnv = process.env.NODE_ENV
  process.env.PAYMENT_TEST_MODE = 'true'
  process.env.NODE_ENV = 'production'
  assert.equal(isPaymentTestMode(), false)
  process.env.NODE_ENV = 'development'
  assert.equal(isPaymentTestMode(), true)
  if (previousMode === undefined) delete process.env.PAYMENT_TEST_MODE
  else process.env.PAYMENT_TEST_MODE = previousMode
  if (previousNodeEnv === undefined) delete process.env.NODE_ENV
  else process.env.NODE_ENV = previousNodeEnv
})
