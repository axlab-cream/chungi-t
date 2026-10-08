import assert from 'node:assert/strict'
import { after, beforeEach, describe, it } from 'node:test'

/**
 * 탈퇴 후 결제 기록 보관(전자상거래법 5년)을 데이터베이스 규칙까지 흉내 내어 확인한다.
 *
 * 가짜 Supabase 는 실제 운영과 같은 제약을 지킨다:
 * - cheongi_payment_orders.owner_id → auth.users ON DELETE RESTRICT: 주문이 있는 계정을 완전히 지우면 실패한다.
 * - cheongi_user_profiles / umsh_notification_prefs → ON DELETE CASCADE.
 * - 소프트 삭제(should_soft_delete)는 계정 행을 남기고 이메일을 지운다.
 */
const previousEnv = { ...process.env }
process.env.SUPABASE_URL = 'https://retention.synthetic.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
delete process.env.DATABASE_URL

const { deleteOwnAccount } = await import('../../src/user/account-deletion.js')

const PAID = 'aaaaaaaa-0000-0000-0000-00000000000a'
const FREE = 'bbbbbbbb-0000-0000-0000-00000000000b'
const OTHER = 'cccccccc-0000-0000-0000-00000000000c'

type Row = Record<string, any>
let db: Record<string, Row[]>
let users: Array<{ id: string; email: string | null; deleted_at: string | null }>

function seed() {
  users = [PAID, FREE, OTHER].map((id) => ({ id, email: `${id.slice(0, 4)}@example.com`, deleted_at: null }))
  const owned = (id: string) => [
    { table: 'cheongi_user_profiles', row: { user_id: id, name: '회원' } },
    { table: 'cheongi_reports', row: { report_id: `rep-${id.slice(0, 4)}`, user_id: id } },
    { table: 'cheongi_reports', row: { report_id: `consultation-${id.slice(0, 4)}`, user_id: id } },
    { table: 'push_devices', row: { id: `dev-${id.slice(0, 4)}`, user_id: id } },
    { table: 'job_choice_free_preview_claims', row: { user_id: id, lineage_id: 'x' } },
    { table: 'umsh_notification_prefs', row: { user_id: id, marketing_push: true } },
  ]
  db = { cheongi_user_profiles: [], cheongi_reports: [], push_devices: [], job_choice_free_preview_claims: [], umsh_notification_prefs: [], cheongi_payment_orders: [], financial_events: [], refund_requests: [] }
  for (const id of [PAID, FREE, OTHER]) for (const { table, row } of owned(id)) db[table].push(row)
  db.cheongi_payment_orders.push(
    { order_id: 'ord-paid-1', owner_id: PAID, owner_email: 'aaaa@example.com', buyer_email: 'buyer@example.com', buyer_tel: '010-0000-0000', product_key: 'love_this_year', product_title: '올해 연애운', amount: 12900, status: 'viewed', tid: 'StdpayCARD1', created_at: '2026-09-17T00:00:00Z', updated_at: '2026-09-17T00:00:00Z' },
    { order_id: 'ord-other-1', owner_id: OTHER, owner_email: 'cccc@example.com', buyer_email: 'c@example.com', buyer_tel: '010-1111-1111', product_key: 'job_choice', product_title: '직장 선택', amount: 9900, status: 'paid', created_at: '2026-09-18T00:00:00Z', updated_at: '2026-09-18T00:00:00Z' },
  )
  db.financial_events.push({ order_id: 'ord-paid-1', provider: 'inicis', source_ref: 'StdpayCARD1', amount: 12900 })
  db.refund_requests.push({ order_id: 'ord-paid-1', status: 'requested' })
}

/** PostgREST 필터 몇 가지(eq., not.like.)만 해석한다. */
function matches(row: Row, params: URLSearchParams): boolean {
  for (const [key, raw] of params) {
    if (['select', 'order', 'limit'].includes(key)) continue
    if (raw.startsWith('eq.')) { if (String(row[key]) !== raw.slice(3)) return false; continue }
    if (raw.startsWith('not.like.')) { const prefix = raw.slice(9).replace(/\*$/, ''); if (String(row[key]).startsWith(prefix)) return false; continue }
    throw new Error(`unsupported filter ${key}=${raw}`)
  }
  return true
}

const nativeFetch = globalThis.fetch
const calls: string[] = []
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  const method = init?.method ?? 'GET'
  calls.push(`${method} ${url.pathname}`)
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
  const auth = /^\/auth\/v1\/admin\/users\/([^/]+)$/.exec(url.pathname)
  if (auth && method === 'DELETE') {
    const id = decodeURIComponent(auth[1]); const body = init?.body ? JSON.parse(String(init.body)) : {}
    const user = users.find((u) => u.id === id)
    if (!user || user.deleted_at) return json({ msg: 'User not found' }, 404)
    if (body.should_soft_delete) { user.deleted_at = new Date().toISOString(); user.email = null; return json({}) }
    // ON DELETE RESTRICT: 주문이 남아 있으면 계정을 지울 수 없다(운영 GoTrue 는 500 "Database error deleting user").
    if (db.cheongi_payment_orders.some((o) => o.owner_id === id)) return json({ msg: 'Database error deleting user' }, 500)
    users = users.filter((u) => u.id !== id)
    for (const table of ['cheongi_user_profiles', 'umsh_notification_prefs']) db[table] = db[table].filter((r) => r.user_id !== id) // CASCADE
    return json({})
  }
  const rest = /^\/rest\/v1\/([a-z_]+)$/.exec(url.pathname)
  if (rest) {
    const table = rest[1]
    if (!db[table]) return json({ code: 'PGRST205' }, 404)
    if (method === 'GET') return json(db[table].filter((r) => matches(r, url.searchParams)))
    if (method === 'DELETE') { db[table] = db[table].filter((r) => !matches(r, url.searchParams)); return new Response(null, { status: 204 }) }
  }
  return json({ error: `unexpected ${method} ${url.pathname}` }, 500)
}) as typeof fetch

after(() => { globalThis.fetch = nativeFetch; process.env = previousEnv })
beforeEach(() => { seed(); calls.length = 0 })

describe('탈퇴 후 결제 기록 보관', () => {
  it('결제한 회원: 개인 데이터는 지우고 결제·매출·환불·상담 이용권 기록은 남긴다', async () => {
    const result = await deleteOwnAccount(PAID)
    assert.deepEqual(result, { userId: PAID, paymentRecordsRetained: true })

    // 지워져야 하는 것
    for (const table of ['cheongi_user_profiles', 'push_devices', 'job_choice_free_preview_claims', 'umsh_notification_prefs']) {
      assert.equal(db[table].some((r) => r.user_id === PAID), false, `${table} 이 남음`)
    }
    assert.equal(db.cheongi_reports.some((r) => r.report_id === 'rep-aaaa'), false, '일반 풀이가 남음')

    // 남아야 하는 것
    const order = db.cheongi_payment_orders.find((o) => o.order_id === 'ord-paid-1')
    assert.ok(order, '결제 주문이 지워짐')
    assert.equal(order.owner_id, PAID, '주문의 회원 연결이 바뀜')
    assert.equal(order.buyer_email, 'buyer@example.com')
    assert.equal(order.tid, 'StdpayCARD1')
    assert.equal(db.financial_events.length, 1, '매출 기록이 지워짐')
    assert.equal(db.refund_requests.length, 1, '환불 기록이 지워짐')
    assert.ok(db.cheongi_reports.some((r) => r.report_id === 'consultation-aaaa'), '상담 이용권 기록이 지워짐')

    // 계정은 소프트 삭제: 행은 남아 주문이 가리킬 곳이 있고, 이메일은 지워져 다시 로그인할 수 없다.
    const user = users.find((u) => u.id === PAID)
    assert.ok(user, '계정 행이 사라져 주문이 고아가 됨')
    assert.ok(user.deleted_at)
    assert.equal(user.email, null)

    // 결제·매출·환불 표에는 한 번도 지우기 요청을 보내지 않았다.
    assert.equal(calls.some((c) => /^DELETE \/rest\/v1\/(cheongi_payment_orders|financial_events|refund_requests)$/.test(c)), false)
  })

  it('결제한 적 없는 회원: 계정까지 완전히 지운다', async () => {
    const result = await deleteOwnAccount(FREE)
    assert.equal(result.paymentRecordsRetained, false)
    assert.equal(users.some((u) => u.id === FREE), false)
    for (const table of ['cheongi_user_profiles', 'cheongi_reports', 'push_devices', 'umsh_notification_prefs']) {
      assert.equal(db[table].some((r) => r.user_id === FREE && !String(r.report_id ?? '').startsWith('consultation-')), false, `${table} 이 남음`)
    }
  })

  it('다른 회원의 데이터와 결제 기록은 건드리지 않는다', async () => {
    await deleteOwnAccount(PAID)
    await deleteOwnAccount(FREE)
    assert.ok(users.find((u) => u.id === OTHER && !u.deleted_at && u.email))
    assert.ok(db.cheongi_user_profiles.some((r) => r.user_id === OTHER))
    assert.ok(db.cheongi_payment_orders.some((o) => o.owner_id === OTHER))
  })

  it('이미 탈퇴한 회원이 다시 요청해도 안전하게 끝난다(중간 실패 후 재시도)', async () => {
    await deleteOwnAccount(PAID)
    const again = await deleteOwnAccount(PAID)
    assert.equal(again.paymentRecordsRetained, true)
    assert.ok(db.cheongi_payment_orders.some((o) => o.order_id === 'ord-paid-1'))
  })

  it('결제한 회원을 완전 삭제하려 하면 데이터베이스가 막는다(소프트 삭제가 필요한 이유)', async () => {
    const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users/${PAID}`, { method: 'DELETE', body: JSON.stringify({ should_soft_delete: false }) })
    assert.equal(response.status, 500)
    assert.ok(db.cheongi_payment_orders.some((o) => o.order_id === 'ord-paid-1'))
  })
})
