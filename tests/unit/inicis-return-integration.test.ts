import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import type { Server } from 'node:http'

const previousEnv = { ...process.env }
process.env.NODE_ENV = 'test'
for (const name of Object.keys(process.env)) {
  if (/DATABASE|SUPABASE|INICIS|PAYMENT|VERCEL|REPORT_STORAGE/.test(name)) delete process.env[name]
}
process.env.INICIS_MID = 'testmid'
process.env.INICIS_SIGNKEY = 'test-sign-key'
process.env.INICIS_HASHKEY = 'test-mobile-hash-key'
process.env.PUBLIC_BASE_URL = 'https://umsh.kr'

const nativeFetch = globalThis.fetch
let origin = ''
const providerCalls: string[] = []
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  if (origin && url.origin === origin) return nativeFetch(input, init)
  providerCalls.push(url.href)
  if (url.href === 'https://fcstdpay.inicis.com/api/payAuth') {
    return Response.json({ resultCode: '0000', resultMsg: 'success', tid: 'pc-approved-tid', MOID: 'UMSH-pc-return', TotPrice: '19900', payMethod: 'Card', applNum: '12345678' })
  }
  if (url.href === 'https://fcmobile.inicis.com/smart/payReq.ini') {
    return new Response('P_STATUS=00&P_RMESG1=success&P_TID=mobile-approved-tid&P_OID=UMSH-mobile-return&P_AMT=19900&P_TYPE=CARD')
  }
  // ks: 승인 요청이 통신 오류로 끊기는 이니시스. 망취소는 받아 준다.
  if (url.href === 'https://ksstdpay.inicis.com/api/payAuth') throw new TypeError('fetch failed')
  if (url.href === 'https://ksstdpay.inicis.com/api/netCancel') return Response.json({ resultCode: '0000', resultMsg: 'net cancelled' })
  // stg 는 미리보기용이지만 테스트에서는 "승인 거절"을 돌려주는 이니시스로 쓴다.
  if (url.href === 'https://stgstdpay.inicis.com/api/payAuth') return Response.json({ resultCode: 'V013', resultMsg: '카드 한도 초과' })
  throw new Error(`Unexpected provider URL: ${url.href}`)
}) as typeof fetch

const [{ default: app }, orderStore] = await Promise.all([
  import('../../src/server/app.js'),
  import('../../src/payment/order-store.js'),
])

let server: Server

function order(orderId: string) {
  return {
    orderId, ownerId: 'owner-1', buyerEmail: 'buyer@synthetic.invalid', buyerTel: '01012345678',
    productKey: 'home_pungsu', productTitle: '집 풍수', amount: 19900, status: 'ready' as const,
    createdAt: '2026-09-14T00:00:00.000Z', updatedAt: '2026-09-14T00:00:00.000Z',
  }
}

before(async () => {
  server = await new Promise<Server>((resolve, reject) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance))
    instance.once('error', reject)
  })
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  origin = `http://127.0.0.1:${address.port}`
})

after(async () => {
  server.closeAllConnections()
  await new Promise<void>((resolve) => server.close(() => resolve()))
  globalThis.fetch = nativeFetch
  for (const name of Object.keys(process.env)) if (!(name in previousEnv)) delete process.env[name]
  Object.assign(process.env, previousEnv)
})

describe('KG이니시스 PC·모바일 승인 콜백', { concurrency: false }, () => {
  it('PC 인증결과를 승인하고 주문을 paid로 투영한다', async () => {
    await orderStore.savePaymentOrder(order('UMSH-pc-return'))
    const response = await nativeFetch(`${origin}/api/payment/inicis/return`, {
      method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ resultCode: '0000', mid: 'testmid', orderNumber: 'UMSH-pc-return', authToken: 'pc-auth-token', idc_name: 'fc', authUrl: 'https://fcstdpay.inicis.com/api/payAuth', netCancelUrl: 'https://fcstdpay.inicis.com/stdpay/netCancel' }),
    })
    assert.equal(response.status, 303)
    assert.equal((await orderStore.getPaymentOrder('UMSH-pc-return'))?.status, 'paid')
  })

  it('모바일 인증결과를 별도 승인 URL로 승인하고 주문을 paid로 투영한다', async () => {
    await orderStore.savePaymentOrder(order('UMSH-mobile-return'))
    const response = await nativeFetch(`${origin}/api/payment/inicis/return`, {
      method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ P_STATUS: '00', P_TID: 'mobile-auth-tid', P_AMT: '19900', P_NOTI: 'UMSH-mobile-return', idc_name: 'fc', P_REQ_URL: 'https://fcmobile.inicis.com/smart/payReq.ini' }),
    })
    assert.equal(response.status, 303)
    assert.equal((await orderStore.getPaymentOrder('UMSH-mobile-return'))?.status, 'paid')
    assert.deepEqual(providerCalls, ['https://fcstdpay.inicis.com/api/payAuth', 'https://fcmobile.inicis.com/smart/payReq.ini'])
  })

  it('승인 응답을 받지 못하면 실패로 끝내지 않고 망취소한 뒤 cancelled 로 남긴다', async () => {
    providerCalls.length = 0
    await orderStore.savePaymentOrder(order('UMSH-pc-lost'))
    const response = await nativeFetch(`${origin}/api/payment/inicis/return`, {
      method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ resultCode: '0000', mid: 'testmid', orderNumber: 'UMSH-pc-lost', authToken: 'pc-auth-token', idc_name: 'ks', authUrl: 'https://ksstdpay.inicis.com/api/payAuth', netCancelUrl: 'https://ksstdpay.inicis.com/api/netCancel' }),
    })
    assert.equal(response.status, 303)
    assert.deepEqual(providerCalls, ['https://ksstdpay.inicis.com/api/payAuth', 'https://ksstdpay.inicis.com/api/netCancel'])
    const saved = await orderStore.getPaymentOrder('UMSH-pc-lost')
    assert.equal(saved?.status, 'cancelled')
    assert.match(String(saved?.message), /자동 취소/)
  })

  it('이니시스가 승인을 거절하면 망취소 없이 failed 로 남긴다', async () => {
    providerCalls.length = 0
    await orderStore.savePaymentOrder(order('UMSH-pc-declined'))
    await nativeFetch(`${origin}/api/payment/inicis/return`, {
      method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ resultCode: '0000', mid: 'testmid', orderNumber: 'UMSH-pc-declined', authToken: 'pc-auth-token', idc_name: 'stg', authUrl: 'https://stgstdpay.inicis.com/api/payAuth', netCancelUrl: 'https://stgstdpay.inicis.com/api/netCancel' }),
    })
    assert.deepEqual(providerCalls, ['https://stgstdpay.inicis.com/api/payAuth'])
    assert.equal((await orderStore.getPaymentOrder('UMSH-pc-declined'))?.status, 'failed')
  })
})
