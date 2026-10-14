import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'
import {
  INICIS_ENFORCE_EXACT_APPROVAL_URL,
  allowedInicisIdcNames,
  approveInicisMobilePayment,
  approveInicisPayment,
  cancelInicisApproval,
  resolveInicisApprovalUrl,
} from '../../src/payment/inicis.js'
import type { PaymentOrder } from '../../src/payment/order-store.js'

const ENV_KEYS = ['INICIS_MID', 'INICIS_SIGNKEY', 'INICIS_HASHKEY', 'VERCEL_ENV'] as const

async function withEnv(values: Partial<Record<typeof ENV_KEYS[number], string>>, run: () => Promise<void> | void) {
  const previous = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]))
  for (const key of ENV_KEYS) {
    if (values[key] === undefined) delete process.env[key]
    else process.env[key] = values[key]
  }
  try {
    await run()
  } finally {
    for (const key of ENV_KEYS) {
      if (previous[key] === undefined) delete process.env[key]
      else process.env[key] = previous[key]
    }
  }
}

function order(orderId: string): PaymentOrder {
  return {
    orderId, ownerId: 'owner-1', buyerEmail: 'buyer@example.com', buyerTel: '01012345678',
    productKey: 'home_pungsu', productTitle: '집 풍수', amount: 19900, status: 'approving', createdAt: '', updatedAt: '',
  } as PaymentOrder
}

const KEYS = { INICIS_MID: 'testmid', INICIS_SIGNKEY: 'test-sign-key', INICIS_HASHKEY: 'test-mobile-hash-key' }

test('승인 URL이 등록된 주소와 같으면 그 주소로 요청한다', async () => {
  await withEnv(KEYS, async () => {
    assert.equal(resolveInicisApprovalUrl('https://fcstdpay.inicis.com/api/payAuth', 'fc', 'pc'), 'https://fcstdpay.inicis.com/api/payAuth')
    assert.equal(resolveInicisApprovalUrl('https://ksmobile.inicis.com/smart/payReq.ini', 'KS', 'mobile'), 'https://ksmobile.inicis.com/smart/payReq.ini')
  })
})

test('승인 URL 호스트가 idc_name과 다르거나 이니시스가 아니면 항상 막는다', async () => {
  await withEnv(KEYS, () => {
    for (const enforce of [false, true]) {
      assert.throws(() => resolveInicisApprovalUrl('https://ksstdpay.inicis.com/api/payAuth', 'fc', 'pc', enforce), /IDC/)
      assert.throws(() => resolveInicisApprovalUrl('https://fcstdpay.inicis.com.evil.example/api/payAuth', 'fc', 'pc', enforce), /IDC/)
      assert.throws(() => resolveInicisApprovalUrl('http://fcstdpay.inicis.com/api/payAuth', 'fc', 'pc', enforce), /IDC/)
      assert.throws(() => resolveInicisApprovalUrl('https://fcstdpay.inicis.com/api/payAuth', 'xx', 'pc', enforce), /IDC/)
      assert.throws(() => resolveInicisApprovalUrl('not a url', 'fc', 'mobile', enforce), /IDC/)
    }
  })
})

test('경로가 등록된 주소와 다르면 관찰 단계에서는 로그만 남기고, 차단 단계에서는 막는다', async () => {
  await withEnv(KEYS, () => {
    const warnings: string[] = []
    const originalWarn = console.warn
    console.warn = (message: string) => { warnings.push(message) }
    try {
      assert.equal(resolveInicisApprovalUrl('https://fcstdpay.inicis.com/stdpay/payAuth?x=secret', 'fc', 'pc', false), 'https://fcstdpay.inicis.com/stdpay/payAuth?x=secret')
    } finally {
      console.warn = originalWarn
    }
    assert.equal(warnings.length, 1)
    assert.match(warnings[0], /\[inicis-approval-url\] mode=pc idc=fc received=https:\/\/fcstdpay\.inicis\.com\/stdpay\/payAuth stored=https:\/\/fcstdpay\.inicis\.com\/api\/payAuth/)
    assert.doesNotMatch(warnings[0], /secret/)
    assert.throws(() => resolveInicisApprovalUrl('https://fcstdpay.inicis.com/stdpay/payAuth', 'fc', 'pc', true), /등록된 주소/)
  })
})

test('운영 상점은 stg 인증결과를 받지 않고, 미리보기와 테스트 MID는 stg를 쓴다', async () => {
  await withEnv({ ...KEYS, VERCEL_ENV: 'production' }, () => {
    assert.deepEqual(allowedInicisIdcNames(), ['fc', 'ks'])
    assert.throws(() => resolveInicisApprovalUrl('https://stgstdpay.inicis.com/api/payAuth', 'stg', 'pc'), /IDC/)
  })
  await withEnv({ ...KEYS, INICIS_MID: 'INIpayTest', VERCEL_ENV: 'production' }, () => {
    assert.deepEqual(allowedInicisIdcNames(), ['fc', 'ks', 'stg'])
  })
  await withEnv({ ...KEYS, VERCEL_ENV: 'preview' }, () => {
    assert.equal(resolveInicisApprovalUrl('https://stgstdpay.inicis.com/api/payAuth', 'stg', 'pc'), 'https://stgstdpay.inicis.com/api/payAuth')
  })
})

test('운영에서 stg 망취소 URL도 막는다', async () => {
  await withEnv({ ...KEYS, VERCEL_ENV: 'production' }, async () => {
    await assert.rejects(
      () => cancelInicisApproval({ mode: 'pc', order: order('UMSHpc123'), idcName: 'stg', authToken: 'token', cancelUrl: 'https://stgstdpay.inicis.com/api/netCancel' }, async () => new Response('resultCode=0000')),
      /IDC/,
    )
  })
})

test('PC·모바일 승인은 검증을 통과한 주소로 요청한다', async () => {
  await withEnv(KEYS, async () => {
    const pcCalls: string[] = []
    await approveInicisPayment({ order: order('UMSHpcexact'), authToken: 'token', authUrl: 'https://ksstdpay.inicis.com/api/payAuth', idcName: 'ks' }, async (url) => {
      pcCalls.push(url)
      return Response.json({ resultCode: '0000', resultMsg: 'success', tid: 'pc-tid', MOID: 'UMSHpcexact', TotPrice: '19900' })
    })
    assert.deepEqual(pcCalls, ['https://ksstdpay.inicis.com/api/payAuth'])

    const mobileCalls: string[] = []
    await approveInicisMobilePayment({ order: order('UMSHmoexact'), tid: 'INIMX_AUTH', requestUrl: 'https://fcmobile.inicis.com/smart/payReq.ini', idcName: 'fc' }, async (url) => {
      mobileCalls.push(url)
      return new Response('P_STATUS=00&P_OID=UMSHmoexact&P_AMT=19900&P_TID=mo-tid')
    })
    assert.deepEqual(mobileCalls, ['https://fcmobile.inicis.com/smart/payReq.ini'])
  })
})

test('모바일 망취소는 P_REQ_URL 호스트를 쓰고, 결제 요청 때와 같은 P_OID로 위변조 값을 만든다', async () => {
  await withEnv(KEYS, async () => {
    let calledUrl = ''
    let body = new URLSearchParams()
    await cancelInicisApproval({ mode: 'mobile', order: order('UMSH.mobile.cancel'), idcName: 'ks', tid: 'INIMX_AUTH', requestUrl: 'https://ksmobile.inicis.com/smart/payReq.ini' }, async (url, init) => {
      calledUrl = url
      body = init.body as URLSearchParams
      return new Response('P_STATUS=00')
    })
    assert.equal(calledUrl, 'https://ksmobile.inicis.com/smart/payNetCancel.ini')
    assert.equal(body.get('P_OID'), 'UMSHmobilecancel')
    const timestamp = body.get('P_TIMESTAMP') ?? ''
    assert.equal(body.get('P_CHKFAKE'), createHash('sha512').update(`19900UMSHmobilecancel${timestamp}test-mobile-hash-key`).digest('base64'))
  })
})

test('기본 설정은 표와 경로가 다른 승인 URL을 막는다', async () => {
  await withEnv(KEYS, async () => {
    assert.equal(INICIS_ENFORCE_EXACT_APPROVAL_URL, true)
    let called = false
    await assert.rejects(
      () => approveInicisPayment({ order: order('UMSHpcpath'), authToken: 'token', authUrl: 'https://fcstdpay.inicis.com/stdpay/payAuth', idcName: 'fc' }, async () => { called = true; return Response.json({}) }),
      /등록된 주소/,
    )
    await assert.rejects(
      () => approveInicisMobilePayment({ order: order('UMSHmopath'), tid: 'INIMX_AUTH', requestUrl: 'https://fcmobile.inicis.com/smart/other.ini', idcName: 'fc' }, async () => { called = true; return new Response('') }),
      /등록된 주소/,
    )
    assert.equal(called, false)
  })
})
