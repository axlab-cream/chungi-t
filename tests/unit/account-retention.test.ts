import assert from 'node:assert/strict'
import { after, beforeEach, describe, it } from 'node:test'

/**
 * 탈퇴 후 결제 기록 보관(전자상거래법 5년)을 데이터베이스 규칙까지 흉내 내어 확인한다.
 *
 * 가짜 Supabase 는 실제 운영과 같은 제약을 지킨다:
 * - cheongi_payment_orders.owner_id → auth.users ON DELETE RESTRICT: 주문이 있는 계정을 완전히 지우면 실패한다.
 * - cheongi_user_profiles / umsh_notification_prefs → ON DELETE CASCADE.
 * - 소프트 삭제(should_soft_delete)는 계정 행을 남기고 이메일을 지운다.
 * - support_notes.case_id → support_cases ON DELETE RESTRICT: 글이 남은 문의는 지울 수 없다.
 * - 쿠폰은 coupon_state 한 행(JSON)에 있고 revision 이 같을 때만 바뀐다(rpc/coupon_state_cas).
 * - 스케치 그림은 Storage 버킷 report-sketches/{회원 id}/{풀이 id}/ 에 있다.
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
let coupon: { id: number; revision: number; data: { campaigns: Row[]; wallets: Row[]; audit: Row[] } }
let files: string[]

function seed() {
  users = [PAID, FREE, OTHER].map((id) => ({ id, email: `${id.slice(0, 4)}@example.com`, deleted_at: null }))
  const owned = (id: string) => [
    { table: 'cheongi_user_profiles', row: { user_id: id, name: '회원' } },
    { table: 'cheongi_reports', row: { report_id: `rep-${id.slice(0, 4)}`, user_id: id } },
    { table: 'cheongi_reports', row: { report_id: `consultation-${id.slice(0, 4)}`, user_id: id, user_email: `${id.slice(0, 4)}@example.com`, payload: { revision: 3, owner: { id }, auxiliary: { consultation: { credits: { freeUsed: true, usedByOrder: { 'ord-paid-1': 2 } }, checkoutOrderId: 'ord-paid-1', sessions: [{ id: 's1', history: [{ role: 'user', text: '헤어진 사람과 다시 만날까요' }] }], attempts: { r1: { hash: 'h', session: 's1', status: 'complete', charged: true } }, day: '', count: 0 } } } } },
    { table: 'support_cases', row: { id: `case-${id.slice(0, 4)}`, member_id: id, order_id: null, category: 'other' } },
    { table: 'support_cases', row: { id: `paycase-${id.slice(0, 4)}`, member_id: id, order_id: 'ord-paid-1', category: 'payment' } },
    { table: 'support_notes', row: { id: `note-${id.slice(0, 4)}`, case_id: `case-${id.slice(0, 4)}`, kind: 'customer_message', text: '문의 내용' } },
    { table: 'support_notes', row: { id: `paynote-${id.slice(0, 4)}`, case_id: `paycase-${id.slice(0, 4)}`, kind: 'customer_message', text: '환불 문의' } },
    { table: 'umsh_funnel_events', row: { id: `ev-${id.slice(0, 4)}`, user_id: id, session_id: 'anon' } },
    { table: 'push_delivery_logs', row: { id: `log-${id.slice(0, 4)}`, user_id: id, device_id: `dev-${id.slice(0, 4)}` } },
    { table: 'push_devices', row: { id: `dev-${id.slice(0, 4)}`, user_id: id } },
    { table: 'job_choice_free_preview_claims', row: { user_id: id, lineage_id: 'x' } },
    { table: 'umsh_notification_prefs', row: { user_id: id, marketing_push: true } },
  ]
  db = { cheongi_user_profiles: [], cheongi_reports: [], push_devices: [], job_choice_free_preview_claims: [], umsh_notification_prefs: [], cheongi_payment_orders: [], financial_events: [], refund_requests: [], support_cases: [], support_notes: [], umsh_funnel_events: [], push_delivery_logs: [] }
  for (const id of [PAID, FREE, OTHER]) for (const { table, row } of owned(id)) db[table].push(row)
  coupon = { id: 1, revision: 0, data: { campaigns: [], audit: [], wallets: [PAID, FREE, OTHER].flatMap((id) => [
    { id: `w-${id.slice(0, 4)}`, ownerId: id, kind: 'service_free' },
    { id: `wd-${id.slice(0, 4)}`, ownerId: id, kind: 'amount_off', orderId: `ord-${id.slice(0, 4)}` },
  ]) } }
  files = [PAID, FREE, OTHER].flatMap((id) => [`${id}/rep-${id.slice(0, 4)}/sketch.webp`, `${id}/rep2-${id.slice(0, 4)}/sketch.webp`])
  db.cheongi_payment_orders.push(
    { order_id: 'ord-paid-1', owner_id: PAID, owner_email: 'aaaa@example.com', buyer_email: 'buyer@example.com', buyer_tel: '010-0000-0000', product_key: 'love_this_year', product_title: '올해 연애운', amount: 12900, status: 'viewed', tid: 'StdpayCARD1', created_at: '2026-09-17T00:00:00Z', updated_at: '2026-09-17T00:00:00Z' },
    { order_id: 'ord-other-1', owner_id: OTHER, owner_email: 'cccc@example.com', buyer_email: 'c@example.com', buyer_tel: '010-1111-1111', product_key: 'job_choice', product_title: '직장 선택', amount: 9900, status: 'paid', created_at: '2026-09-18T00:00:00Z', updated_at: '2026-09-18T00:00:00Z' },
  )
  db.financial_events.push({ order_id: 'ord-paid-1', provider: 'inicis', source_ref: 'StdpayCARD1', amount: 12900 })
  db.refund_requests.push({ order_id: 'ord-paid-1', status: 'requested' })
}

/** PostgREST 필터 몇 가지(eq., neq., is.null, in.(), like., not.like., payload->>칸)만 해석한다. */
function matches(row: Row, params: URLSearchParams): boolean {
  for (const [rawKey, raw] of params) {
    if (['select', 'order', 'limit'].includes(rawKey)) continue
    const json = /^(\w+)->>(\w+)$/.exec(rawKey)
    const value = json ? row[json[1]]?.[json[2]] : row[rawKey]
    if (raw === 'is.null') { if (value !== null && value !== undefined) return false; continue }
    if (raw.startsWith('eq.')) { if (String(value) !== raw.slice(3)) return false; continue }
    if (raw.startsWith('neq.')) { if (String(value) === raw.slice(4)) return false; continue }
    if (raw.startsWith('in.(')) { if (!raw.slice(4, -1).split(',').includes(String(value))) return false; continue }
    if (raw.startsWith('like.')) { const prefix = raw.slice(5).replace(/\*$/, ''); if (!String(value).startsWith(prefix)) return false; continue }
    if (raw.startsWith('not.like.')) { const prefix = raw.slice(9).replace(/\*$/, ''); if (String(value).startsWith(prefix)) return false; continue }
    throw new Error(`unsupported filter ${rawKey}=${raw}`)
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
  const body = init?.body ? JSON.parse(String(init.body)) : {}
  if (url.pathname === '/rest/v1/coupon_state' && method === 'GET') return json([coupon].filter((r) => matches(r, url.searchParams)))
  if (url.pathname === '/rest/v1/rpc/coupon_state_cas' && method === 'POST') {
    if (coupon.revision !== body.expected_revision) return json(false)
    coupon = { ...coupon, revision: coupon.revision + 1, data: body.next_data }; return json(true)
  }
  if (url.pathname === '/storage/v1/object/list/report-sketches' && method === 'POST') {
    // 실제 Storage 처럼 한 단계만 보여 준다. 폴더는 id 가 null.
    const prefix = String(body.prefix).replace(/\/$/, '') + '/'
    const names = new Map<string, string | null>()
    for (const path of files.filter((f) => f.startsWith(prefix))) {
      const [head, ...tail] = path.slice(prefix.length).split('/')
      names.set(head, tail.length ? null : `obj-${path}`)
    }
    return json([...names].map(([name, id]) => ({ name, id })))
  }
  if (url.pathname === '/storage/v1/object/report-sketches' && method === 'DELETE') {
    files = files.filter((f) => !body.prefixes.includes(f)); return json([])
  }
  const rest = /^\/rest\/v1\/([a-z_]+)$/.exec(url.pathname)
  if (rest) {
    const table = rest[1]
    if (!db[table]) return json({ code: 'PGRST205' }, 404)
    if (method === 'GET') return json(db[table].filter((r) => matches(r, url.searchParams)))
    if (method === 'DELETE') {
      // ON DELETE RESTRICT: 글이 남은 문의를 지우려 하면 실패한다.
      if (table === 'support_cases' && db[table].some((r) => matches(r, url.searchParams) && db.support_notes?.some((n) => n.case_id === r.id))) return json({ code: '23503' }, 409)
      db[table] = db[table].filter((r) => !matches(r, url.searchParams)); return new Response(null, { status: 204 })
    }
    if (method === 'PATCH') {
      const changed = db[table].filter((r) => matches(r, url.searchParams))
      for (const r of changed) Object.assign(r, structuredClone(body))
      return json(changed)
    }
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

    // 1:1 문의: 일반 문의와 그 글은 지우고, 결제 문의(주문 번호가 붙은 것)는 분쟁처리 기록으로 남긴다.
    assert.equal(db.support_cases.some((r) => r.id === 'case-aaaa'), false, '일반 문의가 남음')
    assert.equal(db.support_notes.some((r) => r.id === 'note-aaaa'), false, '일반 문의 글이 남음')
    assert.ok(db.support_cases.some((r) => r.id === 'paycase-aaaa'), '결제 문의가 지워짐')
    assert.ok(db.support_notes.some((r) => r.id === 'paynote-aaaa'), '결제 문의 글이 지워짐')

    // 통계 행은 남고 회원 연결만 끊긴다.
    assert.equal(db.umsh_funnel_events.find((r) => r.id === 'ev-aaaa')?.user_id, null)
    assert.equal(db.push_delivery_logs.find((r) => r.id === 'log-aaaa')?.user_id, null)

    // 상담 이용권 행: 이용권 숫자는 남고 대화 내용과 이메일은 지워진다.
    const ledger = db.cheongi_reports.find((r) => r.report_id === 'consultation-aaaa')!
    assert.deepEqual(ledger.payload.auxiliary.consultation.sessions, [])
    assert.deepEqual(ledger.payload.auxiliary.consultation.credits, { freeUsed: true, usedByOrder: { 'ord-paid-1': 2 } })
    assert.equal(ledger.payload.auxiliary.consultation.checkoutOrderId, 'ord-paid-1')
    assert.equal(ledger.payload.revision, 4)
    assert.equal(ledger.user_email, null)
    assert.equal(JSON.stringify(ledger).includes('헤어진 사람'), false, '대화 내용이 남음')

    // 쿠폰: 결제에 쓴 할인 쿠폰만 남는다.
    assert.deepEqual(coupon.data.wallets.filter((w) => w.ownerId === PAID).map((w) => w.id), ['wd-aaaa'])
    // 그림 파일: 회원 폴더가 비었다.
    assert.equal(files.some((f) => f.startsWith(`${PAID}/`)), false, '스케치 파일이 남음')

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
    assert.ok(db.support_cases.some((r) => r.id === 'case-cccc'))
    assert.ok(db.support_notes.some((r) => r.id === 'note-cccc'))
    assert.equal(db.umsh_funnel_events.find((r) => r.id === 'ev-cccc')?.user_id, OTHER)
    assert.equal(db.cheongi_reports.find((r) => r.report_id === 'consultation-cccc')?.payload.auxiliary.consultation.sessions.length, 1)
    assert.equal(coupon.data.wallets.filter((w) => w.ownerId === OTHER).length, 2)
    assert.equal(files.filter((f) => f.startsWith(`${OTHER}/`)).length, 2)
  })

  it('문의·통계·쿠폰 표가 아직 없는 환경에서도 탈퇴가 끝난다', async () => {
    for (const table of ['support_cases', 'support_notes', 'umsh_funnel_events', 'push_delivery_logs']) delete db[table]
    coupon = { ...coupon, id: 2 } // id=1 행이 없으면 지울 쿠폰도 없다
    const result = await deleteOwnAccount(FREE)
    assert.equal(result.paymentRecordsRetained, false)
    assert.equal(users.some((u) => u.id === FREE), false)
  })

  it('이미 탈퇴한 회원이 다시 요청해도 안전하게 끝난다(중간 실패 후 재시도)', async () => {
    await deleteOwnAccount(PAID)
    const again = await deleteOwnAccount(PAID)
    assert.equal(again.paymentRecordsRetained, true)
    assert.equal(db.cheongi_reports.find((r) => r.report_id === 'consultation-aaaa')?.payload.revision, 4, '이미 지운 상담 행을 다시 고침')
    assert.equal(coupon.data.wallets.filter((w) => w.ownerId === PAID).length, 1)
    assert.ok(db.cheongi_payment_orders.some((o) => o.order_id === 'ord-paid-1'))
  })

  it('결제한 회원을 완전 삭제하려 하면 데이터베이스가 막는다(소프트 삭제가 필요한 이유)', async () => {
    const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users/${PAID}`, { method: 'DELETE', body: JSON.stringify({ should_soft_delete: false }) })
    assert.equal(response.status, 500)
    assert.ok(db.cheongi_payment_orders.some((o) => o.order_id === 'ord-paid-1'))
  })
})
