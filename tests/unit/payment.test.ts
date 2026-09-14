import assert from 'node:assert/strict'
import test from 'node:test'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import {
  approveInicisMobilePayment,
  cancelInicisApproval,
  createInicisMobilePaymentFields,
  createInicisPaymentFields,
  publicInicisConfig,
} from '../../src/payment/inicis.js'
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
    assert.equal(fields.acceptmethod, 'centerCd(Y)')
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

test('모바일 결제 필드는 HashKey를 노출하지 않고 금액 위변조 검증값을 만든다', () => {
  const previous = {
    mid: process.env.INICIS_MID,
    signKey: process.env.INICIS_SIGNKEY,
    hashKey: process.env.INICIS_HASHKEY,
    baseUrl: process.env.PUBLIC_BASE_URL,
  }
  process.env.INICIS_MID = 'testmid'
  process.env.INICIS_SIGNKEY = 'test-sign-key'
  process.env.INICIS_HASHKEY = 'test-mobile-hash-key'
  process.env.PUBLIC_BASE_URL = 'https://umsh.kr'
  const order = {
    orderId: 'UMSHmobile123', ownerId: 'owner-1', buyerEmail: 'buyer@example.com', buyerTel: '010-1234-5678',
    productKey: 'home_pungsu', productTitle: '집 풍수', amount: 19900, status: 'ready',
    createdAt: '2026-09-14T00:00:00.000Z', updatedAt: '2026-09-14T00:00:00.000Z',
  } as PaymentOrder
  try {
    const fields = createInicisMobilePaymentFields({ order, buyerName: '홍길동', timestamp: '1726280000000' })
    assert.equal(fields.P_MID, 'testmid')
    assert.equal(fields.P_OID, order.orderId)
    assert.equal(fields.P_AMT, '19900')
    assert.equal(fields.P_RESERVED, 'centerCd=Y&amt_hash=Y')
    assert.equal(fields.P_NEXT_URL, 'https://umsh.kr/api/payment/inicis/return')
    assert.equal(fields.P_NOTI, order.orderId)
    assert.match(fields.P_CHKFAKE, /^[A-Za-z0-9+/]+={0,2}$/)
    assert.equal(fields.P_CHKFAKE, createHash('sha512').update('19900UMSHmobile1231726280000000test-mobile-hash-key').digest('base64'))
    assert.ok(!JSON.stringify(fields).includes('test-mobile-hash-key'))
    assert.equal(publicInicisConfig().mobileEnabled, true)
  } finally {
    for (const [name, value] of Object.entries({ INICIS_MID: previous.mid, INICIS_SIGNKEY: previous.signKey, INICIS_HASHKEY: previous.hashKey, PUBLIC_BASE_URL: previous.baseUrl })) {
      if (value === undefined) delete process.env[name]
      else process.env[name] = value
    }
  }
})

test('브라우저는 PC와 모바일 결제 모듈을 각기 다른 방식으로 호출한다', () => {
  const source = readFileSync(new URL('../../사주/js/payment.js', import.meta.url), 'utf8')
  assert.match(source, /paymentMode: isMobileWeb\(\) \? 'mobile' : 'pc'/)
  assert.match(source, /sendForm\.submit\(\)/)
  assert.match(source, /global\.INIStdPay\.pay\(sendForm\)/)
})

test('PC 승인은 idc_name과 승인 URL 호스트가 일치할 때만 요청한다', async () => {
  const previous = { mid: process.env.INICIS_MID, signKey: process.env.INICIS_SIGNKEY }
  process.env.INICIS_MID = 'testmid'
  process.env.INICIS_SIGNKEY = 'test-sign-key'
  const order = { orderId: 'UMSHpc123', ownerId: 'owner-1', buyerEmail: 'buyer@example.com', buyerTel: '01012345678', productKey: 'home_pungsu', productTitle: '집 풍수', amount: 19900, status: 'approving', createdAt: '', updatedAt: '' } as PaymentOrder
  try {
    await assert.rejects(
      () => cancelInicisApproval({ mode: 'pc', order, idcName: 'fc', authToken: 'token', cancelUrl: 'https://ksstdpay.inicis.com/stdpay/netCancel' }, async () => new Response('resultCode=0000')),
      /IDC/,
    )
  } finally {
    if (previous.mid === undefined) delete process.env.INICIS_MID; else process.env.INICIS_MID = previous.mid
    if (previous.signKey === undefined) delete process.env.INICIS_SIGNKEY; else process.env.INICIS_SIGNKEY = previous.signKey
  }
})

test('모바일 승인은 반환 주문번호와 금액을 다시 검증한다', async () => {
  const previous = { mid: process.env.INICIS_MID, hashKey: process.env.INICIS_HASHKEY }
  process.env.INICIS_MID = 'testmid'
  process.env.INICIS_HASHKEY = 'test-mobile-hash-key'
  const order = { orderId: 'UMSHmobile123', ownerId: 'owner-1', buyerEmail: 'buyer@example.com', buyerTel: '01012345678', productKey: 'home_pungsu', productTitle: '집 풍수', amount: 19900, status: 'approving', createdAt: '', updatedAt: '' } as PaymentOrder
  try {
    await assert.rejects(
      () => approveInicisMobilePayment({ order, tid: 'INIMX_AUTH_TEST', requestUrl: 'https://fcmobile.inicis.com/smart/payReq.ini', idcName: 'fc' }, async () => new Response('P_STATUS=00&P_OID=OTHER&P_AMT=19900&P_TID=approved-tid')),
      /주문번호/,
    )
  } finally {
    if (previous.mid === undefined) delete process.env.INICIS_MID; else process.env.INICIS_MID = previous.mid
    if (previous.hashKey === undefined) delete process.env.INICIS_HASHKEY; else process.env.INICIS_HASHKEY = previous.hashKey
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
