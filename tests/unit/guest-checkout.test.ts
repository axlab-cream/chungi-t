import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { after, before, describe, it } from 'node:test'
import type { Server } from 'node:http'

// 2026-10-16 비회원 결제(docs/auth/guest-member-plan.md 8절): 메인 콘텐츠는 비회원도 결제하고,
// 다른 기기에서는 주문번호 + 휴대폰 번호로 불러온다. 주문 주인은 정해진 경로에서만 옮긴다.
process.env.NODE_ENV = 'test'
for (const name of Object.keys(process.env)) if (/DATABASE|SUPABASE|OPENAI|ANTHROPIC|INICIS|PAYMENT|VERCEL|REPORT_STORAGE|ADMIN_EMAIL/.test(name)) delete process.env[name]
// 저장소(리포트·프로필·주문)는 메모리로 먼저 띄우고, 인증과 회원 조회(live-data)만 가짜 Supabase 로 확인한다.
const store = await import('../../src/report/report-store.js')
const payments = await import('../../src/payment/order-store.js')
const { analyzeSaju } = await import('../../src/saju/analyzer.js')
process.env.SUPABASE_URL = 'https://checkout-auth.invalid'
process.env.SUPABASE_PUBLISHABLE_KEY = 'test-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
const realFetch = globalThis.fetch
let origin = '', server: Server
const MEMBER_OWNER = 'aaaaaaaa-0000-4000-8000-0000000000a1'
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  if (url.href === 'https://checkout-auth.invalid/auth/v1/user') {
    const token = new Headers(init?.headers).get('authorization')?.replace('Bearer ', '') ?? ''
    if (!token) return new Response('{}', { status: 401 })
    const guest = token.startsWith('guest-')
    return Response.json({ id: token, ...(guest ? { is_anonymous: true } : { email: `${token}@synthetic.invalid`, is_anonymous: false }) })
  }
  // live-data: 주문 주인이 회원인지 비회원인지
  if (url.pathname.startsWith('/auth/v1/admin/users/')) {
    const id = decodeURIComponent(url.pathname.split('/').pop() || '')
    if (id === MEMBER_OWNER) return Response.json({ id, email: 'member@synthetic.invalid', is_anonymous: false })
    if (id.startsWith('guest-')) return Response.json({ id, is_anonymous: true })
    return new Response('{}', { status: 404 })
  }
  if (url.pathname.endsWith('/cheongi_user_profiles') || url.pathname.endsWith('/umsh_notification_prefs') || url.pathname.endsWith('/umsh_guest_people')) {
    return Response.json([])
  }
  if (url.origin === origin) return realFetch(input, init)
  throw new Error('No external requests in this test: ' + url.href)
}) as typeof fetch
const { default: app } = await import('../../src/server/app.js')

const birth = { year: 1994, month: 3, day: 11, hour: 9, gender: 'female' as const, calendar: 'solar' as const }
const at = new Date().toISOString()
async function post(path: string, token: string, body: Record<string, unknown>) {
  const response = await fetch(origin + path, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return { status: response.status, data: await response.json() as Record<string, unknown> }
}
async function paidOrder(orderId: string, ownerId: string, reportId: string) {
  await payments.savePaymentOrder({ orderId, ownerId, buyerEmail: 'a@b.c', buyerTel: '010-2222-3333', productKey: 'cmdg', productTitle: '천명사주', amount: 29000, status: 'paid', tid: 't', approvalCode: 'a', reportId, createdAt: at, updatedAt: at } as never)
  await store.saveReportRecord({ reportId, owner: { id: ownerId }, birth, context: {}, analysis: analyzeSaju(birth), report: { title: 't', subtitle: '', model: 'test', generatedBy: 'template', sections: [] }, status: 'pending', createdAt: '', updatedAt: '' } as never)
}

before(async () => {
  server = app.listen(0, '127.0.0.1')
  await new Promise<void>(resolve => server.once('listening', resolve))
  origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`
})
after(async () => { globalThis.fetch = realFetch; server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) })

describe('주문 주인 옮기기(저장소)', () => {
  it('정해진 주문만, 또는 그 주인의 주문 전부를 옮기고 금액·상태는 그대로 둔다', async () => {
    await paidOrder('UMSH-MOVE-1', 'guest-move-a', 'report-move-1')
    await paidOrder('UMSH-MOVE-2', 'guest-move-a', 'report-move-2')
    assert.equal(await payments.transferPaymentOrdersOwner('guest-move-a', { id: 'member-move' }, ['UMSH-MOVE-1']), 1)
    assert.equal((await payments.getPaymentOrder('UMSH-MOVE-1'))?.ownerId, 'member-move')
    assert.equal((await payments.getPaymentOrder('UMSH-MOVE-2'))?.ownerId, 'guest-move-a')
    assert.equal(await payments.transferPaymentOrdersOwner('guest-move-a', { id: 'member-move' }), 1)
    const moved = await payments.getPaymentOrder('UMSH-MOVE-2')
    assert.equal(moved?.ownerId, 'member-move')
    assert.equal(moved?.amount, 29000)
    assert.equal(moved?.status, 'paid')
  })

  it('일반 수정 경로로는 여전히 주인을 바꿀 수 없다(바꾸려 해도 그대로)', async () => {
    await payments.mutatePaymentOrder('UMSH-MOVE-1', () => ({ ownerId: 'someone', message: 'touched' } as never)).catch(() => null)
    assert.equal((await payments.getPaymentOrder('UMSH-MOVE-1'))?.ownerId, 'member-move')
  })
})

describe('비회원 주문 불러오기(주문번호 + 휴대폰)', { concurrency: false }, () => {
  it('번호가 맞으면 다른 기기의 비회원(또는 회원)에게 주문·풀이를 옮긴다', async () => {
    await paidOrder('UMSH-IMPORT-1', 'guest-old-phone', 'report-import-1')
    const result = await post('/api/guest/orders/import', 'guest-new-phone', { orderId: 'UMSH-IMPORT-1', tel: '01022223333' })
    assert.equal(result.status, 200, JSON.stringify(result.data))
    assert.equal(result.data.moved, true)
    assert.equal(result.data.reportId, 'report-import-1')
    assert.equal((await payments.getPaymentOrder('UMSH-IMPORT-1'))?.ownerId, 'guest-new-phone')
    assert.equal((await store.getReportRecord('report-import-1', { id: 'guest-new-phone' }))?.owner?.id, 'guest-new-phone')
  })

  it('주문이 없거나 번호가 틀리면 같은 답(어느 쪽이 틀렸는지 알려 주지 않음)', async () => {
    const wrongTel = await post('/api/guest/orders/import', 'guest-x1', { orderId: 'UMSH-IMPORT-1', tel: '01099999999' })
    const noOrder = await post('/api/guest/orders/import', 'guest-x1', { orderId: 'UMSH-NONE', tel: '01022223333' })
    assert.equal(wrongTel.status, 404)
    assert.equal(noOrder.status, 404)
    assert.equal(wrongTel.data.code, noOrder.data.code)
  })

  it('회원 계정에 있는 주문은 번호를 알아도 옮기지 않는다', async () => {
    await paidOrder('UMSH-IMPORT-MEMBER', MEMBER_OWNER, 'report-import-member')
    const result = await post('/api/guest/orders/import', 'guest-thief', { orderId: 'UMSH-IMPORT-MEMBER', tel: '010-2222-3333' })
    assert.equal(result.status, 409)
    assert.equal(result.data.code, 'ORDER_OWNED_BY_MEMBER')
    assert.equal((await payments.getPaymentOrder('UMSH-IMPORT-MEMBER'))?.ownerId, MEMBER_OWNER)
  })

  it('같은 주문번호로 짧은 시간에 너무 많이 틀리면 잠시 막는다', async () => {
    let limited = false
    for (let i = 0; i < 8; i += 1) {
      const result = await post('/api/guest/orders/import', 'guest-brute', { orderId: 'UMSH-BRUTE', tel: `0101111000${i}` })
      if (result.status === 429) { limited = true; break }
    }
    assert.ok(limited)
  })
})

describe('결제 주문 만들기: 비회원 규칙', () => {
  it('비회원은 쿠폰·상담 질문권을 쓸 수 없고, 약관 동의 기록이 있어야 주문을 만든다', () => {
    const source = readFileSync(new URL('../../src/server/app.ts', import.meta.url), 'utf8')
    const route = source.slice(source.indexOf("app.post('/api/payment/orders'"), source.indexOf("app.post('/api/payment/test/approve'"))
    assert.ok(route.includes('const owner = await requireSupabaseUser(req, res)'))
    const guest = route.slice(route.indexOf('if (owner.isAnonymous) {'))
    assert.ok(guest.includes("if (product.key === 'cheonmyeong_consultation') { res.status(401).json({ code: 'MEMBER_REQUIRED'"))
    assert.ok(guest.includes("if (trimmedString(req.body?.couponId)) { res.status(401).json({ code: 'MEMBER_REQUIRED'"))
    assert.ok(guest.includes('hasCurrentConsent(owner.id)'))
    assert.ok(guest.includes("code: 'CONSENT_REQUIRED'"))
  })
})

describe('어드민 수동 합치기·이전 라우트', () => {
  const source = readFileSync(new URL('../../src/server/app.ts', import.meta.url), 'utf8')
  for (const [route, action] of [
    ["app.post('/api/admin/v1/guests/:id/merge'", 'member.guest.merge'],
    ["app.post('/api/admin/v1/payments/:orderId/transfer'", 'payment.order.transfer'],
    ["app.post('/api/admin/v1/members/:id/transfer'", 'member.records.transfer'],
  ]) {
    it(`${action}: members:write · 사유·확인·멱등 키 · 감사 기록`, () => {
      const at = source.indexOf(route)
      assert.ok(at > 0, route)
      const body = source.slice(at, source.indexOf('\napp.', at + 10))
      assert.match(body, /requireStaff\(req, res, 'members:write'\)/)
      assert.match(body, /adminTransferInput\(req, res\)/)
      assert.match(body, /executeAdminCommand\(/)
      assert.match(body, new RegExp(`'${action.replace(/\./g, '\\.')}'`))
    })
  }
  it('사유·확인·멱등 키가 없으면 거절', () => {
    const input = source.slice(source.indexOf('function adminTransferInput('), source.indexOf("app.post('/api/admin/v1/guests/:id/merge'"))
    assert.match(input, /body\.confirm !== true \|\| reason\.length < 2 \|\| key\.length < 8/)
  })
  it('옮겨 받는 쪽은 회원만(비회원 계정으로는 옮기지 않음)', () => {
    const target = source.slice(source.indexOf('async function adminTransferTarget('), source.indexOf('async function copyProfileIfMissing('))
    assert.match(target, /member\.accountType === 'guest'\) return null/)
  })
})
