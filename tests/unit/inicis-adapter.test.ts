import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'
import { createInicisSandboxAdapter, formatInicisApiTimestamp } from '../../src/payment/inicis.js'

const apiKey = 'sandbox-api-key'
const mid = 'INIpayTest'
const now = new Date('2026-09-11T00:34:56.000Z')

function sha512(value: string): string {
  return createHash('sha512').update(value, 'utf8').digest('hex')
}

test('이니시스 sandbox 조회 adapter는 공식 v2 요청과 SHA-512 서명을 만든다', async () => {
  const requests: Array<{ url: string, body: Record<string, unknown> }> = []
  const adapter = createInicisSandboxAdapter({
    mid,
    iniApiKey: apiKey,
    clientIp: '127.0.0.1',
    now: () => now,
    transport: async ({ url, init }) => {
      requests.push({ url, body: JSON.parse(String(init.body)) as Record<string, unknown> })
      return new Response(JSON.stringify({ resultCode: 'SUCCESS', resultMsg: '조회 성공', tid: 'TID-1', price: '19900', status: '0' }), { status: 200 })
    },
  })

  const result = await adapter.inquire({ tid: 'TID-1' })

  assert.equal(formatInicisApiTimestamp(now), '20260911093456')
  assert.equal(requests.length, 1)
  assert.equal(requests[0]?.url, 'https://stginiapi.inicis.com/v2/pg/inquiry')
  assert.deepEqual(requests[0]?.body, {
    mid,
    type: 'inquiry',
    timestamp: '20260911093456',
    clientIp: '127.0.0.1',
    hashData: sha512(`${apiKey}${mid}inquiry20260911093456${JSON.stringify({ tid: 'TID-1' })}`),
    data: { tid: 'TID-1' },
  })
  assert.equal(result.success, true)
  assert.equal(result.status, 'approved')
  assert.equal(result.amount, 19900)
})

test('이니시스 sandbox 취소 adapter는 모의 transport만 사용하고 성공 원문만 반환한다', async () => {
  let calls = 0
  const adapter = createInicisSandboxAdapter({
    mid,
    iniApiKey: apiKey,
    clientIp: '127.0.0.1',
    now: () => now,
    transport: async ({ url, init }) => {
      calls += 1
      assert.equal(url, 'https://stginiapi.inicis.com/v2/pg/refund')
      const body = JSON.parse(String(init.body)) as Record<string, unknown>
      assert.deepEqual(body.data, { tid: 'TID-2', msg: '테스트 취소' })
      assert.equal(body.hashData, sha512(`${apiKey}${mid}refund20260911093456${JSON.stringify({ tid: 'TID-2', msg: '테스트 취소' })}`))
      return new Response(JSON.stringify({ resultCode: '00', resultMsg: '취소 성공', cancelDate: '20260911', cancelTime: '093456' }), { status: 200 })
    },
  })

  const result = await adapter.cancel({ tid: 'TID-2', reason: '테스트 취소' })

  assert.equal(calls, 1)
  assert.equal(result.success, true)
  assert.equal(result.duplicate, false)
  assert.equal(result.cancelledAt, '2026-09-11T09:34:56+09:00')
  assert.equal(result.raw.resultCode, '00')
})

test('이니시스 sandbox 취소 adapter는 기취소 응답을 재요청 없이 terminal duplicate로 보존한다', async () => {
  let calls = 0
  const adapter = createInicisSandboxAdapter({
    mid,
    iniApiKey: apiKey,
    clientIp: '127.0.0.1',
    now: () => now,
    transport: async () => {
      calls += 1
      return new Response(JSON.stringify({ resultCode: '500626', resultMsg: '기 취소 거래' }), { status: 200 })
    },
  })

  const result = await adapter.cancel({ tid: 'TID-3', reason: '중복 확인' })

  assert.equal(calls, 1)
  assert.equal(result.success, false)
  assert.equal(result.duplicate, true)
  assert.equal(result.terminal, true)
})

test('이니시스 sandbox adapter는 timeout을 불확정 오류로 분리하고 주문을 변경하지 않는다', async () => {
  const adapter = createInicisSandboxAdapter({
    mid,
    iniApiKey: apiKey,
    clientIp: '127.0.0.1',
    transport: async () => await new Promise<Response>(() => undefined),
  })

  await assert.rejects(
    adapter.inquire({ oid: 'ORDER-1', timeoutMs: 100 }),
    /INICIS_SANDBOX_TIMEOUT/,
  )
})

test('PG 성공 뒤 저장 실패는 adapter 성공 결과를 바꾸거나 재시도하지 않는다', async () => {
  let calls = 0
  const adapter = createInicisSandboxAdapter({
    mid,
    iniApiKey: apiKey,
    clientIp: '127.0.0.1',
    transport: async () => {
      calls += 1
      return new Response(JSON.stringify({ resultCode: '00', resultMsg: '취소 성공' }), { status: 200 })
    },
  })

  const result = await adapter.cancel({ tid: 'TID-4', reason: '저장 실패 경계' })
  await assert.rejects(async () => {
    if (result.success) throw new Error('STORAGE_UNAVAILABLE')
  }, /STORAGE_UNAVAILABLE/)

  assert.equal(result.success, true)
  assert.equal(calls, 1)
})

test('이니시스 sandbox adapter는 TID와 주문번호 동시 조회를 거부한다', async () => {
  const adapter = createInicisSandboxAdapter({
    mid,
    iniApiKey: apiKey,
    clientIp: '127.0.0.1',
    transport: async () => new Response('{}'),
  })

  await assert.rejects(adapter.inquire({ tid: 'TID-5', oid: 'ORDER-5' }), /정확히 하나/)
})
