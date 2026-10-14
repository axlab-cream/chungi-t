import assert from 'node:assert/strict'
import test from 'node:test'
import {
  InicisApprovalUncertainError,
  approveInicisMobilePayment,
  approveInicisPayment,
  cancelInicisApproval,
} from '../../src/payment/inicis.js'
import type { PaymentOrder } from '../../src/payment/order-store.js'

const ENV_KEYS = ['INICIS_MID', 'INICIS_SIGNKEY', 'INICIS_HASHKEY', 'VERCEL_ENV'] as const

async function withKeys(run: () => Promise<void>) {
  const previous = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]))
  process.env.INICIS_MID = 'testmid'
  process.env.INICIS_SIGNKEY = 'test-sign-key'
  process.env.INICIS_HASHKEY = 'test-mobile-hash-key'
  delete process.env.VERCEL_ENV
  try {
    await run()
  } finally {
    for (const key of ENV_KEYS) {
      if (previous[key] === undefined) delete process.env[key]
      else process.env[key] = previous[key]
    }
  }
}

const order = {
  orderId: 'UMSHtimeout', ownerId: 'owner-1', buyerEmail: 'buyer@example.com', buyerTel: '01012345678',
  productKey: 'job_choice', productTitle: '직장 선택', amount: 9900, status: 'approving', createdAt: '', updatedAt: '',
} as PaymentOrder
const pc = { order, authToken: 'token', authUrl: 'https://fcstdpay.inicis.com/api/payAuth', idcName: 'fc' }
const mobile = { order, tid: 'INIMX_AUTH', requestUrl: 'https://fcmobile.inicis.com/smart/payReq.ini', idcName: 'fc' }

/** 응답을 보내지 않고 abort 신호만 기다리는 이니시스. */
const hangingTransport = (seen: { aborted?: boolean }) => (_url: string, init: RequestInit) => new Promise<Response>((_resolve, reject) => {
  init.signal?.addEventListener('abort', () => { seen.aborted = true; reject(new Error('aborted')) })
})

test('PC 승인 응답이 제한 시간을 넘기면 결과 불확실로 끊고 요청도 중단한다', async () => {
  await withKeys(async () => {
    const seen: { aborted?: boolean } = {}
    const started = Date.now()
    await assert.rejects(() => approveInicisPayment(pc, hangingTransport(seen), 50), InicisApprovalUncertainError)
    assert.ok(Date.now() - started < 2000)
    assert.equal(seen.aborted, true)
  })
})

test('모바일 승인 응답이 제한 시간을 넘겨도 결과 불확실로 끊는다', async () => {
  await withKeys(async () => {
    await assert.rejects(() => approveInicisMobilePayment(mobile, hangingTransport({}), 50), InicisApprovalUncertainError)
  })
})

test('통신 오류와 결과 코드 없는 응답은 결과 불확실이다', async () => {
  await withKeys(async () => {
    await assert.rejects(() => approveInicisPayment(pc, async () => { throw new TypeError('fetch failed') }), InicisApprovalUncertainError)
    await assert.rejects(() => approveInicisPayment(pc, async () => new Response('', { status: 502 })), InicisApprovalUncertainError)
    await assert.rejects(() => approveInicisMobilePayment(mobile, async () => new Response('', { status: 504 })), InicisApprovalUncertainError)
  })
})

test('이니시스가 승인 실패를 분명히 돌려주면 일반 실패다(망취소 대상 아님)', async () => {
  await withKeys(async () => {
    const pcError = await approveInicisPayment(pc, async () => Response.json({ resultCode: 'V013', resultMsg: '카드 한도 초과' })).catch((error) => error)
    assert.ok(pcError instanceof Error && !(pcError instanceof InicisApprovalUncertainError))
    assert.equal(pcError.message, '카드 한도 초과')
    const mobileError = await approveInicisMobilePayment(mobile, async () => new Response('P_STATUS=01&P_RMESG1=거절')).catch((error) => error)
    assert.ok(mobileError instanceof Error && !(mobileError instanceof InicisApprovalUncertainError))
  })
})

test('승인은 됐는데 주문번호나 금액이 다르면 승인 TID와 함께 결과 불확실로 넘긴다', async () => {
  await withKeys(async () => {
    const amount = await approveInicisPayment(pc, async () => Response.json({ resultCode: '0000', tid: 'pc-tid', MOID: 'UMSHtimeout', TotPrice: '100' })).catch((error) => error)
    assert.ok(amount instanceof InicisApprovalUncertainError)
    assert.equal(amount.tid, 'pc-tid')
    const oid = await approveInicisMobilePayment(mobile, async () => new Response('P_STATUS=00&P_TID=mo-tid&P_OID=OTHER&P_AMT=9900')).catch((error) => error)
    assert.ok(oid instanceof InicisApprovalUncertainError)
    assert.equal(oid.tid, 'mo-tid')
  })
})

test('망취소 응답이 늦으면 실패로 돌려준다(복구 쪽이 정산 대기로 남긴다)', async () => {
  await withKeys(async () => {
    const result = await cancelInicisApproval({ mode: 'pc', order, idcName: 'fc', authToken: 'token', cancelUrl: 'https://fcstdpay.inicis.com/api/netCancel' }, hangingTransport({}), 50)
    assert.equal(result.success, false)
    assert.equal(result.resultCode, 'NETWORK')
  })
})
