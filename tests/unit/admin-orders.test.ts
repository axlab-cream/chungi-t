import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { after, before, describe, it } from 'node:test'
import type { Server } from 'node:http'

const previousEnv = { ...process.env }
process.env.NODE_ENV = 'test'
for (const name of Object.keys(process.env)) {
  if (/DATABASE|SUPABASE|OPENAI|ANTHROPIC|INICIS|PAYMENT|VERCEL|REPORT_STORAGE|ADMIN_EMAIL/.test(name)) delete process.env[name]
}
const nativeFetch = globalThis.fetch
let origin = ''
const unexpected: string[] = []
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  if (url.href === 'https://synthetic-auth.invalid/auth/v1/user') {
    const token = new Headers(init?.headers).get('authorization')?.replace(/^Bearer /, '')
    if (!token) return new Response(JSON.stringify({ error: 'invalid' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    return new Response(JSON.stringify({ id: token, email: `${token}@synthetic.invalid` }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
  if (origin && url.origin === origin) return nativeFetch(input, init)
  unexpected.push(url.origin)
  throw new Error('External requests are forbidden in this suite')
}) as typeof fetch

process.env.SUPABASE_URL = 'https://synthetic-auth.invalid'
process.env.SUPABASE_PUBLISHABLE_KEY = 'synthetic-public-fixture-only'
process.env.UMSH_ADMIN_SUPER_EMAILS = 'staff@synthetic.invalid'

const orders = await import('../../src/payment/order-store.js')
const { maskEmail, maskTel, maskTid } = await import('../../src/payment/order-admin-dto.js')
const { default: app } = await import('../../src/server/app.js')

let server: Server

async function request(path: string, token?: string) {
  const response = await fetch(origin + path, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  const text = await response.text()
  let payload: any
  try { payload = JSON.parse(text) } catch { payload = text }
  return { response, payload }
}

/** 같은 시각에 만들어진 주문을 일부러 섞는다 — cursor 안정성 검사의 근거다. */
const SAME_INSTANT = '2026-09-05T10:00:00.000Z'

before(async () => {
  server = await new Promise<Server>((resolve, reject) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance))
    instance.once('error', reject)
  })
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  origin = `http://127.0.0.1:${address.port}`

  const base = {
    ownerId: 'member-1', ownerEmail: 'member@synthetic.invalid',
    buyerEmail: 'hong.gildong@synthetic.invalid', buyerTel: '010-1234-5678',
    productKey: 'wedding_day', productTitle: '결혼 택일', amount: 24900,
    createdAt: '2026-09-01T00:00:00.000Z',
  }
  // 같은 시각 3건 + 다른 시각 2건. 마지막 것은 구형 주문(reportId 없음)이다.
  for (const [index, updatedAt] of [SAME_INSTANT, SAME_INSTANT, SAME_INSTANT, '2026-09-06T10:00:00.000Z', '2026-09-04T10:00:00.000Z'].entries()) {
    await orders.savePaymentOrder({
      ...base,
      orderId: `admin-order-${index}`,
      status: index === 3 ? 'paid' : 'ready',
      reportId: index === 4 ? undefined : `report-${index}`,
      updatedAt,
    })
  }
  // 승인 증거가 있는데 정산이 끝나지 않은 주문(U22). 목록에서 구분돼야 한다.
  await orders.savePaymentOrder({
    ...base, orderId: 'admin-order-unsettled', status: 'approving',
    tid: 'TID-1234567890', updatedAt: '2026-09-07T10:00:00.000Z',
  })
})

after(async () => {
  if (server) {
    server.closeAllConnections()
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  }
  globalThis.fetch = nativeFetch
  for (const name of Object.keys(process.env)) if (!(name in previousEnv)) delete process.env[name]
  Object.assign(process.env, previousEnv)
  assert.deepEqual(unexpected, [])
})

describe('관리자 주문 조회 (T08)', { concurrency: false }, () => {
  describe('보안', () => {
    it('미로그인은 주문을 볼 수 없다', async () => {
      for (const path of ['/api/admin/v1/orders', '/api/admin/v1/orders/admin-order-0']) {
        const { response, payload } = await request(path)
        assert.equal(response.status, 401, path)
        assert.equal(payload.code, 'AUTH_REQUIRED')
        assert.equal(payload.orders, undefined)
        assert.equal(payload.order, undefined)
      }
    })

    it('직원이 아닌 회원은 주문을 볼 수 없다', async () => {
      const { response, payload } = await request('/api/admin/v1/orders', 'customer')
      assert.equal(response.status, 403)
      assert.equal(payload.code, 'STAFF_MEMBERSHIP_REQUIRED')
      assert.equal(payload.orders, undefined)
    })

    it('고객 연락처를 원문으로 내보내지 않는다', async () => {
      const { response, payload } = await request('/api/admin/v1/orders', 'staff')
      assert.equal(response.status, 200)
      const serialized = JSON.stringify(payload)
      for (const raw of ['hong.gildong@synthetic.invalid', '010-1234-5678', '01012345678', 'TID-1234567890']) {
        assert.ok(!serialized.includes(raw), `원문이 그대로 나갔다: ${raw}`)
      }
      assert.equal(payload.orders[0].buyerEmail, undefined, '마스킹 안 된 필드가 DTO 에 있다')
      assert.equal(payload.orders[0].buyerTel, undefined)
      assert.equal(payload.orders[0].tid, undefined)
    })

    it('상세도 목록과 같은 마스킹을 쓴다', async () => {
      const { response, payload } = await request('/api/admin/v1/orders/admin-order-0', 'staff')
      assert.equal(response.status, 200)
      assert.ok(!JSON.stringify(payload).includes('hong.gildong@synthetic.invalid'))
      assert.match(payload.order.buyerEmailMasked, /^ho\*+@synthetic\.invalid$/)
      assert.equal(payload.order.buyerTelMasked, '***-****-5678')
    })

    it('응답이 캐시되지 않는다', async () => {
      const { response } = await request('/api/admin/v1/orders', 'staff')
      assert.match(response.headers.get('cache-control') ?? '', /no-store/)
      assert.match(response.headers.get('vary') ?? '', /Authorization/i)
    })
  })

  describe('정상 동작', () => {
    it('직원은 모든 회원의 주문을 본다', async () => {
      const { response, payload } = await request('/api/admin/v1/orders?limit=100', 'staff')
      assert.equal(response.status, 200)
      assert.equal(payload.orders.length, 6)
      assert.equal(payload.storage, 'memory')
      // 최신 먼저. 시각이 같으면 주문번호 내림차순 — 모든 저장소가 이 순서를 쓴다.
      const stamps = payload.orders.map((order: any) => order.updatedAt)
      assert.deepEqual(stamps, [...stamps].sort().reverse(), '최신 먼저가 아니다')
    })

    it('구형 주문(reportId 없음)도 목록에 남는다', async () => {
      // 목록에서 사라지면 대사가 불가능해진다.
      const { payload } = await request('/api/admin/v1/orders?limit=100', 'staff')
      const legacy = payload.orders.find((order: any) => order.orderId === 'admin-order-4')
      assert.ok(legacy, '구형 주문이 사라졌다')
      assert.equal(legacy.reportId, undefined)
    })

    it('정산이 끝나지 않은 주문을 구분해 표시한다', async () => {
      const { payload } = await request('/api/admin/v1/orders?limit=100', 'staff')
      const unsettled = payload.orders.find((order: any) => order.orderId === 'admin-order-unsettled')
      assert.equal(unsettled.unsettled, true, 'U22 상태가 구분되지 않는다')
      assert.equal(unsettled.status, 'approving')
      const normal = payload.orders.find((order: any) => order.orderId === 'admin-order-3')
      assert.equal(normal.unsettled, false)
    })

    it('상태로 걸러 낸다', async () => {
      const { payload } = await request('/api/admin/v1/orders?status=paid&limit=100', 'staff')
      assert.deepEqual(payload.orders.map((order: any) => order.orderId), ['admin-order-3'])
    })
  })

  describe('경계값', () => {
    it('cursor 가 같은 시각의 주문을 건너뛰거나 겹치지 않는다', async () => {
      // `updated_at` 하나로 페이지를 넘기면 같은 시각 주문이 빠지거나 중복된다.
      const seen: string[] = []
      let cursor: string | undefined
      for (let page = 0; page < 10; page += 1) {
        const query = `/api/admin/v1/orders?limit=2${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`
        const { payload } = await request(query, 'staff')
        seen.push(...payload.orders.map((order: any) => order.orderId))
        cursor = payload.nextCursor
        if (!cursor) break
      }
      assert.equal(seen.length, 6, `가져온 건수가 맞지 않는다: ${seen.join(', ')}`)
      assert.equal(new Set(seen).size, 6, '중복이 있다')
    })

    it('기간 경계는 시작 포함·종료 제외다', async () => {
      // 저장소가 쓰기 시각을 직접 찍으므로(감사 목적) 픽스처의 `updatedAt` 은 남지 않는다.
      // 그래서 실제 저장된 시각을 읽어 창을 만들고 경계 규칙만 검사한다.
      const { payload: all } = await request('/api/admin/v1/orders?limit=100', 'staff')
      const stamps = all.orders.map((order: any) => order.updatedAt)
      assert.ok(stamps.length >= 3, '경계를 검사할 만큼의 주문이 없다')

      const newest = stamps[0]
      const oldest = stamps[stamps.length - 1]
      // 주문이 같은 밀리초에 저장될 수 있으므로 기대값을 실제 시각 분포에서 계산한다.
      // 고정 숫자를 쓰면 시계 해상도에 따라 통과 여부가 갈린다.
      const expectedBelowNewest = stamps.filter((stamp: string) => stamp < newest).length

      // `from` 은 포함이다. 가장 오래된 시각을 시작으로 주면 전부 들어온다.
      const fromInclusive = await request(`/api/admin/v1/orders?from=${oldest}&limit=100`, 'staff')
      assert.equal(fromInclusive.payload.orders.length, stamps.length, 'from 이 포함이 아니다')

      // `to` 는 제외다. 그 시각의 주문은 모두 빠진다.
      const toExclusive = await request(`/api/admin/v1/orders?to=${newest}&limit=100`, 'staff')
      assert.equal(toExclusive.payload.orders.length, expectedBelowNewest, 'to 가 제외가 아니다')
      assert.ok(
        !toExclusive.payload.orders.some((order: any) => order.updatedAt === newest),
        '종료 경계의 주문이 포함됐다',
      )

      // 두 경계를 함께 주면 가장 오래된 것부터 가장 최신 직전까지다.
      const both = await request(`/api/admin/v1/orders?from=${oldest}&to=${newest}&limit=100`, 'staff')
      assert.equal(both.payload.orders.length, expectedBelowNewest)
    })

    it('limit 을 벗어난 값은 범위로 되돌린다', async () => {
      const { response, payload } = await request('/api/admin/v1/orders?limit=9999', 'staff')
      assert.equal(response.status, 200)
      assert.ok(payload.orders.length <= 100)
    })
  })

  describe('에러 처리', () => {
    it('깨진 cursor 는 400 이다', async () => {
      const { response, payload } = await request('/api/admin/v1/orders?cursor=not-a-cursor', 'staff')
      assert.equal(response.status, 400)
      assert.equal(payload.code, 'INVALID_CURSOR')
    })

    it('잘못된 기간·상태는 조용히 무시하지 않는다', async () => {
      const bad = await request('/api/admin/v1/orders?from=어제', 'staff')
      assert.equal(bad.response.status, 400)
      assert.equal(bad.payload.code, 'INVALID_WINDOW')

      const badStatus = await request('/api/admin/v1/orders?status=refunded', 'staff')
      assert.equal(badStatus.response.status, 400)
      assert.equal(badStatus.payload.code, 'INVALID_STATUS')
    })

    it('없는 주문과 권한 없음을 구분한다', async () => {
      const { response, payload } = await request('/api/admin/v1/orders/does-not-exist', 'staff')
      assert.equal(response.status, 404)
      assert.equal(payload.code, 'ORDER_NOT_FOUND')
    })
  })
})

describe('마스킹 규칙', () => {
  describe('경계값', () => {
    it('이메일은 앞 두 자와 도메인만 남긴다', () => {
      assert.equal(maskEmail('hong@example.com'), 'ho**@example.com')
      assert.equal(maskEmail('a@example.com'), 'a*@example.com')
      assert.equal(maskEmail(''), '')
      assert.equal(maskEmail('not-an-email'), '***')
    })

    it('전화는 뒤 네 자리만 남긴다', () => {
      assert.equal(maskTel('010-1234-5678'), '***-****-5678')
      assert.equal(maskTel('01012345678'), '***-****-5678')
      assert.equal(maskTel('123'), '***')
      assert.equal(maskTel(undefined), '')
    })

    it('거래번호는 앞뒤 네 자만 남긴다', () => {
      assert.equal(maskTid('TID-1234567890'), 'TID-***7890')
      assert.equal(maskTid('short'), 'sh***')
      assert.equal(maskTid(undefined), undefined)
    })
  })
})

describe('관리자 주문 화면 (T09)', () => {
  const shell = readFileSync(new URL('../../admin-ui/index.html', import.meta.url), 'utf8')

  describe('정상 동작', () => {
    it('네 가지 목록 상태를 구분해 갖고 있다', () => {
      // 빈 목록 / 필터 결과 없음 / 조회 실패 / 불러오는 중 (A35)
      for (const marker of ['data-admin-order-empty', 'data-admin-order-filtered-empty', 'data-admin-order-error', 'data-admin-order-loading']) {
        assert.ok(shell.includes(marker), `${marker} 상태가 없다`)
      }
    })

    it('표가 가로 스크롤로 처리된다', () => {
      // 390px 에서 표를 카드로 바꾸지 않고 가로 스크롤 + 페이지 넘침 방지.
      assert.match(shell, /\.admin-table-scroll \{ overflow-x: auto; \}/)
    })

    it('금액이 같은 정렬축에 놓인다', () => {
      assert.match(shell, /tabular-nums/)
      assert.ok(shell.includes('class="admin-amount"'))
    })

    it('권한이 확인된 뒤에만 주문을 요청한다', () => {
      // 셸은 데이터를 갖고 있지 않다. scope 가 있을 때만 조회한다.
      assert.match(shell, /indexOf\('orders:read'\) >= 0\) startOrders/)
    })

    it('셸에 고객 데이터가 인라인되지 않는다', () => {
      // 셸은 정적 HTML 이다. 고객 값이 들어가면 미로그인에게도 나간다.
      assert.ok(!shell.includes('@synthetic.invalid'), '픽스처 이메일이 셸에 들어갔다')
      assert.ok(!/010-\d{4}-\d{4}/.test(shell), '전화번호 형태가 셸에 들어갔다')
    })
  })
})
