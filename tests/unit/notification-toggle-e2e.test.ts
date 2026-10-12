import assert from 'node:assert/strict'
import { after, beforeEach, describe, it } from 'node:test'
import express from 'express'

/**
 * 2026-10-12 알림 켜기·끄기 통합 확인. 회원이 마이페이지 스위치를 누를 때 쓰는 저장 코드(hub-store)와
 * 실제 발송 코드(dispatcher·관리자 "지금 발송" 라우터)를 그대로 잇고, 알림 설정 표만 메모리로 흉내 낸다.
 * "껐으면 안 가고, 켰으면 간다"를 회원·기기 단위로 본다.
 */
const previousEnv = { ...process.env }
process.env.SUPABASE_URL = 'https://toggle.synthetic.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'

const { updateNotificationPrefs, optedOutUserIds, marketingConsentedUserIds } = await import('../../src/user/hub-store.js')
const { runPushDispatcher } = await import('../../src/push/dispatcher.js')
const { createMemoryPushStore } = await import('../../src/push/store.js')
const { adminPushRouter } = await import('../../src/push/router.js')
const { parseDraft } = await import('../../src/push/contracts.js')

const A = 'aaaaaaaa-0000-0000-0000-00000000000a' // 스위치를 바꾸는 회원
const B = 'bbbbbbbb-0000-0000-0000-00000000000b' // 아무것도 바꾸지 않은 회원(기본값)

/** umsh_notification_prefs 를 흉내 낸다: upsert(POST)와 user_id·service_push·marketing_push 필터. */
let prefs = new Map<string, Record<string, unknown>>()
const nativeFetch = globalThis.fetch
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  if (url.hostname !== 'toggle.synthetic.invalid') return nativeFetch(input as any, init)
  const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } })
  if (url.pathname !== '/rest/v1/umsh_notification_prefs') return new Response('{}', { status: 500 })
  if ((init?.method ?? 'GET') === 'POST') {
    const row = JSON.parse(String(init!.body)); prefs.set(row.user_id, row); return json([row])
  }
  const eq = (key: string) => url.searchParams.get(key)
  let rows = [...prefs.values()]
  const userEq = eq('user_id'); const userIn = /^in\.\((.*)\)$/.exec(userEq ?? '')
  if (userIn) rows = rows.filter((r) => userIn[1].split(',').includes(String(r.user_id)))
  else if (userEq?.startsWith('eq.')) rows = rows.filter((r) => r.user_id === userEq.slice(3))
  for (const key of ['service_push', 'marketing_push']) { const v = eq(key); if (v) rows = rows.filter((r) => String(r[key]) === v.slice(3)) }
  return json(rows)
}) as typeof fetch
after(() => { globalThis.fetch = nativeFetch; process.env = previousEnv })

function newStore() {
  const store = createMemoryPushStore()
  const device = (id: string, userId: string | null) => ({ id, token: `token-${id}-aaaaaaaaaaaaaaaaaaaa`, userId, platform: 'android', isActive: true, reason: null, lastActiveAt: new Date().toISOString(), createdAt: new Date().toISOString() })
  store.state.devices.push(device('phone-A', A), device('phone-B', B), device('phone-guest', null))
  return store
}

// 메모리 저장소는 실제 현재 시각으로 발송 건을 고르므로 과거의 낮 시각(10:00 KST)을 쓴다.
const DAY = Date.parse('2026-10-01T01:00:00Z')

/** 매분 자동 발송 경로. 실제로 FCM 에 보낸 기기 토큰을 돌려준다. */
async function sendViaCron(marketing = false) {
  const store = newStore()
  await store.createNotification(parseDraft({ title: marketing ? '추석 이벤트' : '풀이가 완성됐어요', body: '확인해 보세요', deepLink: '/', target: { type: 'all' }, schedule: { mode: 'now' }, marketing }, DAY), 'ops@example.com', new Date(DAY - 1000))
  const sent: Array<{ token: string; title: string }> = []
  await runPushDispatcher({
    store, now: () => DAY, accessToken: async () => 'token',
    send: async (message: any) => { sent.push(message); return { ok: true, messageId: 'm' } as any },
    optedOut: optedOutUserIds, marketingConsented: marketingConsentedUserIds,
  }, 30_000)
  return sent
}
// 토큰 모양: token-phone-A-aaaa… → 'A' / 'B' / 'guest'
const owners = (sent: Array<{ token: string }>) => sent.map((m) => m.token.split('-')[2]).sort()

beforeEach(() => { prefs = new Map() })

describe('풀이·결제 알림 켜기·끄기', () => {
  it('처음(설정 안 함): 모든 기기에 간다', async () => {
    assert.deepEqual(owners(await sendViaCron()), ['A', 'B', 'guest'])
  })
  it('끄면 그 회원 기기에는 안 간다(다른 회원·비로그인 기기는 그대로)', async () => {
    await updateNotificationPrefs(A, { servicePush: false })
    assert.deepEqual(owners(await sendViaCron()), ['B', 'guest'])
  })
  it('다시 켜면 다시 간다', async () => {
    await updateNotificationPrefs(A, { servicePush: false })
    await updateNotificationPrefs(A, { servicePush: true })
    assert.deepEqual(owners(await sendViaCron()), ['A', 'B', 'guest'])
  })
})

describe('이벤트·혜택 알림(광고성) 켜기·끄기', () => {
  it('처음(미동의): 광고 푸시는 아무에게도 안 간다(비로그인 기기 포함)', async () => {
    assert.deepEqual(owners(await sendViaCron(true)), [])
  })
  it('동의하면 그 회원에게만 "(광고)"를 붙여 간다', async () => {
    await updateNotificationPrefs(A, { marketingPush: true })
    const sent = await sendViaCron(true)
    assert.deepEqual(owners(sent), ['A'])
    assert.equal(sent[0].title, '(광고) 추석 이벤트')
  })
  it('철회하면 다시 안 간다', async () => {
    await updateNotificationPrefs(A, { marketingPush: true })
    await updateNotificationPrefs(A, { marketingPush: false })
    assert.deepEqual(owners(await sendViaCron(true)), [])
  })
  it('광고 동의했어도 풀이·결제 알림을 껐으면 광고도 안 간다', async () => {
    await updateNotificationPrefs(A, { marketingPush: true, servicePush: false })
    assert.deepEqual(owners(await sendViaCron(true)), [])
  })
  it('광고 동의는 일반 알림에 영향이 없다', async () => {
    await updateNotificationPrefs(A, { marketingPush: true })
    assert.deepEqual(owners(await sendViaCron(false)), ['A', 'B', 'guest'])
  })
})

describe('관리자 "지금 발송" 경로도 같은 설정을 따른다', () => {
  async function sendViaAdmin(store: ReturnType<typeof newStore>) {
    const app = express(); app.use(express.json())
    app.use('/push', adminPushRouter({
      optionalUser: async () => null,
      staff: async () => ({ email: 'ops@example.com' }),
      store: () => store,
      immediateBudgetMs: 6_000,
      recipients: { optedOut: optedOutUserIds, marketingConsented: marketingConsentedUserIds },
    }))
    const server = app.listen(0); const port = (server.address() as any).port
    try {
      const response = await nativeFetch(`http://127.0.0.1:${port}/push`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: '공지', body: '본문', deepLink: '/', target: { type: 'all' }, schedule: { mode: 'now' } }) })
      assert.equal(response.status, 201)
    } finally { server.close() }
    // FCM 인증이 없는 테스트 환경이라 실제 전송 전 단계에서 멈춘다. 발송 목록(대상 기기)은 그 전에 정해진다.
    return store.state.deliveries.map((d) => String(d.deviceId).replace('phone-', '')).sort()
  }
  it('끈 회원은 발송 목록에서 빠진다', async () => {
    await updateNotificationPrefs(A, { servicePush: false })
    assert.deepEqual(await sendViaAdmin(newStore()), ['B', 'guest'])
  })
  it('켠 회원은 발송 목록에 들어간다', async () => {
    assert.deepEqual(await sendViaAdmin(newStore()), ['A', 'B', 'guest'])
  })
})
