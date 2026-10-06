import assert from 'node:assert/strict'
import { generateKeyPairSync } from 'node:crypto'
import { describe, it } from 'node:test'
import type { PaymentOrder } from '../../src/payment/order-store.js'

process.env.NODE_ENV = 'test'
const voided = await import('../../src/payment/google-play-voided.js')
const googlePlay = await import('../../src/payment/google-play.js')

function order(orderId: string, status: PaymentOrder['status'], tid: string): PaymentOrder {
  return {
    orderId, ownerId: 'owner', buyerEmail: 'fixture@synthetic.invalid', buyerTel: '01000000000',
    productKey: 'wedding_day', productTitle: '합성 주문', amount: 24900, status, tid,
    createdAt: '2026-09-07T00:00:00Z', updatedAt: '2026-09-07T00:00:00Z',
  }
}

describe('구글플레이 환불 반영', () => {
  it('환불된 결제의 열린 주문만 취소로 바꾸고, 다시 돌려도 결과가 같다', async () => {
    const orders = new Map<string, PaymentOrder>([
      ['paid-1', order('paid-1', 'paid', 'tok-paid')],
      ['viewed-1', order('viewed-1', 'viewed', 'tok-viewed')],
      ['ready-1', order('ready-1', 'ready', 'tok-ready')],
    ])
    let listedFrom = 0
    const dependencies = {
      list: async (params: { startTimeMillis: number }) => {
        listedFrom = params.startTimeMillis
        return ['tok-paid', 'tok-viewed', 'tok-ready', 'tok-unknown'].map((purchaseToken) => ({ purchaseToken }))
      },
      findByTid: async (tid: string) => [...orders.values()].find((item) => item.tid === tid) ?? null,
      mutate: (async (orderId: string, mutate: (current: PaymentOrder) => Partial<PaymentOrder>) => {
        const current = orders.get(orderId)
        if (!current) return null
        const next = { ...current, ...mutate(current) }
        orders.set(orderId, next)
        return next
      }) as never,
      now: () => Date.parse('2026-10-06T00:00:00Z'),
    }

    const first = await voided.syncGooglePlayVoidedPurchases(dependencies)
    assert.equal(first.checked, 4)
    assert.deepEqual(first.cancelled.sort(), ['paid-1', 'viewed-1'])
    assert.equal(orders.get('paid-1')?.status, 'cancelled')
    assert.equal(orders.get('paid-1')?.message, voided.VOIDED_ORDER_MESSAGE)
    // 결제가 확정되지 않은 주문은 건드리지 않는다.
    assert.equal(orders.get('ready-1')?.status, 'ready')
    assert.equal(listedFrom, Date.parse('2026-10-06T00:00:00Z') - voided.VOIDED_LOOKBACK_MS)

    const second = await voided.syncGooglePlayVoidedPurchases(dependencies)
    assert.deepEqual(second.cancelled, [])
  })

  it('호출 한도 때문에 10분 간격으로만 묻는다', () => {
    assert.equal(voided.shouldSyncVoidedPurchases(new Date('2026-10-06T03:20:00Z')), true)
    assert.equal(voided.shouldSyncVoidedPurchases(new Date('2026-10-06T03:21:00Z')), false)
  })

  it('환불 목록을 쪽 단위로 끝까지 읽는다', async () => {
    const { privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    })
    googlePlay.resetGooglePlayTokenCache()
    const urls: string[] = []
    const request = async (url: string) => {
      if (url === 'https://oauth2.googleapis.com/token') {
        return new Response(JSON.stringify({ access_token: 'synthetic', expires_in: 3600 }), { status: 200 })
      }
      urls.push(url)
      const page = new URL(url).searchParams.get('token')
      const body = page
        ? { voidedPurchases: [{ purchaseToken: 'tok-b', orderId: 'GPA.b', voidedReason: 1 }] }
        : { voidedPurchases: [{ purchaseToken: 'tok-a' }, { orderId: 'no-token' }], tokenPagination: { nextPageToken: 'page-2' } }
      return new Response(JSON.stringify(body), { status: 200 })
    }
    const result = await googlePlay.listGooglePlayVoidedPurchases(
      { startTimeMillis: 1_000 },
      { credentials: { packageName: 'kr.umsh.app', clientEmail: 'play@synthetic.invalid', privateKey: privateKey as unknown as string }, request },
    )
    googlePlay.resetGooglePlayTokenCache()
    assert.deepEqual(result.map((item) => item.purchaseToken), ['tok-a', 'tok-b'])
    assert.equal(result[1].voidedReason, 1)
    assert.equal(urls.length, 2)
    assert.match(urls[0], /\/kr\.umsh\.app\/purchases\/voidedpurchases\?startTime=1000/)
  })
})
