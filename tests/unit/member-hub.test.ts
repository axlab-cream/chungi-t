import assert from 'node:assert/strict'
import { after, beforeEach, describe, it } from 'node:test'

/**
 * 2026-10 마이페이지 회원 기능: 알림 설정, 1:1 문의, 공지.
 * 고객에게는 customer_message / customer_reply 만 보이고 내부 메모·답변 초안은 절대 나가지 않는다.
 */
const previousEnv = { ...process.env }
process.env.SUPABASE_URL = 'https://member-hub.synthetic.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'

const { createInquiry, getNotificationPrefs, listInquiries, optedOutUserIds, parseInquiry, updateNotificationPrefs, HubError } = await import('../../src/user/hub-store.js')
const { listMemberNotices } = await import('../../src/admin/content-store.js')
const { runPushDispatcher } = await import('../../src/push/dispatcher.js')
const { createMemoryPushStore } = await import('../../src/push/store.js')

const USER = 'aaaaaaaa-0000-0000-0000-000000000001'
const OTHER = 'bbbbbbbb-0000-0000-0000-000000000002'
const nativeFetch = globalThis.fetch
let prefsRow: Record<string, unknown> | null = null
let prefsTableMissing = false
const cases: Record<string, unknown>[] = []
const notes: Record<string, unknown>[] = []
const calls: Array<{ method: string; url: URL; body?: any }> = []

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  const method = init?.method ?? 'GET'
  const body = init?.body ? JSON.parse(String(init.body)) : undefined
  calls.push({ method, url, body })
  if (url.pathname === '/rest/v1/umsh_notification_prefs') {
    if (prefsTableMissing) return json({ code: 'PGRST205' }, 404)
    if (method === 'POST') { prefsRow = body; return json([body]) }
    if (url.searchParams.get('service_push') === 'eq.false') return json(prefsRow && prefsRow.service_push === false ? [{ user_id: prefsRow.user_id }] : [])
    return json(prefsRow ? [prefsRow] : [])
  }
  if (url.pathname === '/rest/v1/support_cases') {
    if (method === 'POST') {
      const row = { id: `case-${cases.length + 1}`, status: 'received', priority: 'normal', revision: 0, created_at: '2026-10-08T00:00:00Z', updated_at: '2026-10-08T00:00:00Z', ...body }
      cases.push(row); return json([row])
    }
    const member = url.searchParams.get('member_id')?.replace(/^eq\./, '')
    return json(cases.filter((row) => row.member_id === member))
  }
  if (url.pathname === '/rest/v1/support_notes') {
    if (method === 'POST') { const row = { id: `note-${notes.length + 1}`, created_at: '2026-10-08T00:01:00Z', ...body }; notes.push(row); return json([row]) }
    const caseId = url.searchParams.get('case_id')?.replace(/^eq\./, '')
    return json(notes.filter((row) => row.case_id === caseId))
  }
  if (url.pathname === '/rest/v1/content_versions') {
    return json([
      { id: 'n1', content_type: 'notice', placement: 'notice/2026-10-chuseok', payload: { title: '추석 이벤트', body: '쿠폰을 드립니다.', href: '/coupons.html' }, checksum: 'x', state: 'published', author_email: 'a@b.c', revision: 1, scheduled_at: null, published_at: '2026-10-07T00:00:00Z', created_at: '2026-10-07T00:00:00Z', updated_at: '2026-10-07T00:00:00Z' },
      { id: 'n2', content_type: 'notice', placement: 'notice/broken', payload: { title: '<script>', body: '' }, checksum: 'x', state: 'published', author_email: 'a@b.c', revision: 1, scheduled_at: null, published_at: '2026-10-06T00:00:00Z', created_at: '2026-10-06T00:00:00Z', updated_at: '2026-10-06T00:00:00Z' },
    ])
  }
  return json({ error: 'unexpected ' + url.pathname }, 500)
}) as typeof fetch

after(() => { globalThis.fetch = nativeFetch; process.env = previousEnv })
beforeEach(() => { prefsRow = null; prefsTableMissing = false; calls.length = 0 })

describe('notification prefs', () => {
  it('defaults to service on, marketing off when no row exists', async () => {
    assert.deepEqual(await getNotificationPrefs(USER), { servicePush: true, marketingPush: false, marketingConsentedAt: null, marketingWithdrawnAt: null, updatedAt: null })
  })

  it('records the consent and withdrawal time for marketing push', async () => {
    const consented = await updateNotificationPrefs(USER, { marketingPush: true }, new Date('2026-10-08T01:00:00Z'))
    assert.equal(consented.marketingPush, true)
    assert.equal(consented.marketingConsentedAt, '2026-10-08T01:00:00.000Z')
    const withdrawn = await updateNotificationPrefs(USER, { marketingPush: false }, new Date('2026-10-09T01:00:00Z'))
    assert.equal(withdrawn.marketingPush, false)
    assert.equal(withdrawn.marketingWithdrawnAt, '2026-10-09T01:00:00.000Z')
    assert.equal(withdrawn.marketingConsentedAt, '2026-10-08T01:00:00.000Z')
  })

  it('reports a missing table as not ready instead of a crash', async () => {
    prefsTableMissing = true
    await assert.rejects(getNotificationPrefs(USER), (error: unknown) => error instanceof HubError && error.code === 'HUB_NOT_READY' && error.status === 503)
  })

  it('lists opted-out users and treats a missing table as nobody opted out', async () => {
    await updateNotificationPrefs(USER, { servicePush: false })
    assert.deepEqual([...await optedOutUserIds([USER, OTHER, 'not-a-uuid'])], [USER])
    prefsTableMissing = true
    assert.equal((await optedOutUserIds([USER])).size, 0)
  })
})

describe('push dispatcher', () => {
  it('skips devices of members who turned notifications off', async () => {
    const store = createMemoryPushStore()
    store.state.devices.push(
      { id: 'd1', token: 'token-aaaaaaaaaaaaaaaaaaaa1', userId: USER, platform: 'android', isActive: true, lastActiveAt: new Date().toISOString(), createdAt: new Date().toISOString() } as any,
      { id: 'd2', token: 'token-aaaaaaaaaaaaaaaaaaaa2', userId: OTHER, platform: 'android', isActive: true, lastActiveAt: new Date().toISOString(), createdAt: new Date().toISOString() } as any,
      { id: 'd3', token: 'token-aaaaaaaaaaaaaaaaaaaa3', userId: null, platform: 'android', isActive: true, lastActiveAt: new Date().toISOString(), createdAt: new Date().toISOString() } as any,
    )
    await store.createNotification({ title: '공지', body: '본문', deepLink: '/', target: { type: 'all' }, schedule: { mode: 'now' } } as any, 'staff@example.com')
    const sent: string[] = []
    await runPushDispatcher({
      store,
      accessToken: async () => 'token',
      send: async (message: any) => { sent.push(message.token); return { ok: true } as any },
      optedOut: async () => new Set([USER]),
    }, 30_000)
    assert.deepEqual(sent.sort(), ['token-aaaaaaaaaaaaaaaaaaaa2', 'token-aaaaaaaaaaaaaaaaaaaa3'])
  })
})

describe('1:1 inquiries', () => {
  it('validates category and length', () => {
    assert.throws(() => parseInquiry({ category: 'nope', text: '충분히 긴 문의 내용입니다.' }), /INQUIRY_CATEGORY_REQUIRED/)
    assert.throws(() => parseInquiry({ category: 'payment', text: '짧음' }), /INQUIRY_TEXT_INVALID/)
    assert.deepEqual(parseInquiry({ category: 'payment', text: '  결제했는데 풀이가 안 열려요.  ' }), { category: 'payment', text: '결제했는데 풀이가 안 열려요.', orderId: undefined })
  })

  it('shows only customer-facing notes and marks answered cases', async () => {
    await createInquiry({ id: USER, email: 'member@example.com' }, { category: 'payment', text: '결제했는데 풀이가 안 열려요.' })
    const caseId = String(cases[0].id)
    notes.push(
      { id: 'n-int', case_id: caseId, kind: 'internal', text: '내부 메모: 환불 검토', author_email: 'staff@umsh.kr', created_at: '2026-10-08T00:02:00Z' },
      { id: 'n-draft', case_id: caseId, kind: 'customer_reply_draft', text: '초안', author_email: 'staff@umsh.kr', created_at: '2026-10-08T00:03:00Z' },
      { id: 'n-reply', case_id: caseId, kind: 'customer_reply', text: '풀이를 다시 열어 드렸습니다.', author_email: 'staff@umsh.kr', created_at: '2026-10-08T00:04:00Z' },
    )
    const [inquiry] = await listInquiries(USER)
    assert.equal(inquiry.state, 'answered')
    assert.equal(inquiry.stateLabel, '답변 도착')
    assert.deepEqual(inquiry.messages.map((m) => [m.from, m.text]), [['member', '결제했는데 풀이가 안 열려요.'], ['staff', '풀이를 다시 열어 드렸습니다.']])
    assert.ok(!JSON.stringify(inquiry).includes('내부 메모'))
    assert.equal(cases[0].created_by_email, 'member@example.com')
  })

  it('refuses a sixth open inquiry', async () => {
    while (cases.filter((row) => row.member_id === OTHER).length < 5) cases.push({ id: `open-${cases.length}`, member_id: OTHER, status: 'received', category: 'other', priority: 'normal', revision: 0, created_at: 'x', updated_at: 'x' })
    await assert.rejects(createInquiry({ id: OTHER }, { category: 'other', text: '열 글자가 넘는 문의입니다.' }), (error: unknown) => error instanceof HubError && error.code === 'INQUIRY_LIMIT')
  })
})

describe('member notices', () => {
  it('lists published notice/ placements and drops malformed payloads', async () => {
    const notices = await listMemberNotices()
    assert.deepEqual(notices.map((n) => n.title), ['추석 이벤트'])
    assert.equal(notices[0].href, '/coupons.html')
    const request = calls.find((c) => c.url.pathname === '/rest/v1/content_versions')!
    assert.equal(request.url.searchParams.get('placement'), 'like.notice/*')
    assert.equal(request.url.searchParams.get('content_type'), 'eq.notice')
  })
})

describe('marketing push rules', async () => {
  const { parseDraft, isMarketingQuietHour, msUntilMarketingWindow } = await import('../../src/push/contracts.js')
  // 2026-10-01 10:00 KST = 01:00Z, 22:00 KST = 13:00Z. 메모리 저장소는 실제 현재 시각으로 발송 건을 고르므로 과거 날짜를 쓴다.
  const morning = Date.parse('2026-10-01T01:00:00Z')
  const night = Date.parse('2026-10-01T13:00:00Z')
  const base = { title: '추석 이벤트', body: '쿠폰을 드려요', deepLink: '/', target: { type: 'all' }, marketing: true }
  const code = (fn: () => unknown) => { try { fn(); return 'ok' } catch (error) { return (error as Error).message } }

  it('knows the Korean quiet hours', () => {
    assert.equal(isMarketingQuietHour(morning), false)
    assert.equal(isMarketingQuietHour(night), true)
    assert.equal(isMarketingQuietHour(Date.parse('2026-10-01T22:59:00Z')), true) // 07:59 KST
    assert.equal(isMarketingQuietHour(Date.parse('2026-10-01T23:00:00Z')), false) // 08:00 KST
    assert.equal(msUntilMarketingWindow(night), 10 * 3_600_000) // 22:00 → 다음 날 08:00
  })

  it('refuses night sends, night schedules and guest targets', () => {
    assert.equal(code(() => parseDraft({ ...base, schedule: { mode: 'now' } }, night)), 'PUSH_MARKETING_QUIET_HOURS')
    assert.equal(code(() => parseDraft({ ...base, schedule: { mode: 'scheduled', at: '2026-10-01T13:30:00Z' } }, morning)), 'PUSH_MARKETING_QUIET_HOURS')
    assert.equal(code(() => parseDraft({ ...base, target: { type: 'guests' }, schedule: { mode: 'now' } }, morning)), 'PUSH_MARKETING_GUESTS')
    assert.equal(parseDraft({ ...base, schedule: { mode: 'now' } }, morning).marketing, true)
    // 일반 알림은 밤에도 보낼 수 있다.
    assert.equal(parseDraft({ ...base, marketing: false, schedule: { mode: 'now' } }, night).marketing, false)
  })

  async function marketingRun(at: number) {
    const store = createMemoryPushStore()
    const device = (id: string, userId: string | null) => ({ id, token: `token-${id}-aaaaaaaaaaaaaaaa`, userId, platform: 'android', isActive: true, reason: null, lastActiveAt: new Date().toISOString(), createdAt: new Date().toISOString() })
    store.state.devices.push(device('d1', USER), device('d2', OTHER), device('d3', null))
    await store.createNotification(parseDraft({ ...base, schedule: { mode: 'now' } }, morning), 'staff@example.com', new Date(at - 1000))
    const sent: Array<{ token: string; title: string; body: string }> = []
    await runPushDispatcher({
      store, now: () => at,
      accessToken: async () => 'token',
      send: async (message: any) => { sent.push(message); return { ok: true, messageId: 'm' } as any },
      marketingConsented: async () => new Set([OTHER]),
    }, 30_000)
    return { sent, store }
  }

  it('sends only to consented members with (광고) and the opt-out notice', async () => {
    const { sent } = await marketingRun(morning)
    assert.deepEqual(sent.map((m) => m.token), ['token-d2-aaaaaaaaaaaaaaaa'])
    assert.equal(sent[0].title, '(광고) 추석 이벤트')
    assert.match(sent[0].body, /쿠폰을 드려요\n\n수신 거부: 운명상회 앱 › 마이페이지 › 알림$/)
  })

  it('holds a marketing push that comes due at night until 8 a.m.', async () => {
    const { sent, store } = await marketingRun(night)
    assert.equal(sent.length, 0)
    assert.equal(store.state.notifications[0].lastError, 'MARKETING_QUIET_HOURS')
  })
})
