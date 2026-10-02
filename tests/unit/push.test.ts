import { test } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
process.env.NODE_ENV = 'test'
import { PushError, normalizeDeepLink, parseDevice, parseDraft, parseTarget } from '../../src/push/contracts.js'
import { fcmPayload, sendFcmMessage } from '../../src/push/fcm.js'
import { fcmAccessToken, providerForIssuer, rememberVercelOidcToken, resetPushGoogleAuthForTests } from '../../src/push/google-auth.js'
import { runPushDispatcher } from '../../src/push/dispatcher.js'
import { createMemoryPushStore } from '../../src/push/store.js'
import { adminPushRouter, pushRouter } from '../../src/push/router.js'
import type { FcmMessage, FcmResult } from '../../src/push/fcm.js'

const TOKEN_A = 'fcm-token-aaaaaaaaaaaaaaaaaaaaaaaa:APA91b'
const TOKEN_B = 'fcm-token-bbbbbbbbbbbbbbbbbbbbbbbb:APA91b'
const USER = '11111111-1111-4111-8111-111111111111'

test('deep links stay inside umsh.kr and never reach admin or API paths', () => {
  assert.equal(normalizeDeepLink(''), '/')
  assert.equal(normalizeDeepLink('/fortune/today?from=push#top'), '/fortune/today?from=push#top')
  for (const bad of ['https://evil.example', '//evil.example/x', '/\\evil.example', 'javascript:alert(1)', '/api/push/open', '/ops/constellation-7f3c', '/a b', 'fortune']) {
    assert.equal(normalizeDeepLink(bad), null, bad)
  }
})

test('drafts validate text, target and schedule window', () => {
  const now = Date.parse('2026-10-02T09:00:00Z')
  const ok = parseDraft({ title: ' 오늘의 운세 🔮 ', body: '확인해 보세요\r\n지금', deepLink: '/me', target: { type: 'all' }, schedule: { mode: 'scheduled', at: '2026-10-05T00:00:00Z' } }, now)
  assert.equal(ok.title, '오늘의 운세 🔮')
  assert.equal(ok.body, '확인해 보세요\n지금')
  assert.deepEqual(ok.schedule, { mode: 'scheduled', at: '2026-10-05T00:00:00.000Z' })
  const code = (fn: () => unknown) => { try { fn(); return 'ok' } catch (error) { return (error as PushError).code } }
  const base = { title: 't', body: 'b', target: { type: 'all' }, schedule: { mode: 'now' } }
  assert.equal(code(() => parseDraft({ ...base, title: '' })), 'PUSH_TITLE_REQUIRED')
  assert.equal(code(() => parseDraft({ ...base, deepLink: 'https://x.y' })), 'PUSH_DEEP_LINK_INVALID')
  assert.equal(code(() => parseDraft({ ...base, schedule: { mode: 'scheduled', at: '2026-10-02T09:00:30Z' } }, now)), 'PUSH_SCHEDULE_TOO_SOON')
  assert.equal(code(() => parseTarget({ type: 'active_days', days: 0 })), 'PUSH_TARGET_DAYS_INVALID')
  assert.equal(code(() => parseTarget({ type: 'users', userIds: ['not-a-uuid'] })), 'PUSH_TARGET_USERS_REQUIRED')
  assert.deepEqual(parseTarget({ type: 'users', userIds: [USER, USER.toUpperCase()] }), { type: 'users', userIds: [USER] })
  assert.equal(code(() => parseDevice({ token: 'short', platform: 'android' }, null)), 'PUSH_DEVICE_TOKEN_INVALID')
})

test('FCM payload carries the keys MainActivity reads and errors are classified', async () => {
  const message: FcmMessage = { token: TOKEN_A, title: 't', body: 'b', deepLink: '/me', notificationId: 'n1', deliveryId: '7' }
  const payload = fcmPayload(message)
  assert.deepEqual(payload.message.data, { umsh_url: '/me', umsh_nid: 'n1', umsh_did: '7' })
  assert.equal(payload.message.android.notification.channel_id, 'umsh_default')
  const reply = (status: number, body: unknown) => async () => new Response(JSON.stringify(body), { status })
  const send = (status: number, body: unknown) => sendFcmMessage(message, { projectId: 'p', accessToken: 'x', request: reply(status, body) })
  assert.deepEqual(await send(200, { name: 'projects/p/messages/1' }), { ok: true, messageId: 'projects/p/messages/1' })
  assert.equal(((await send(404, { error: { status: 'NOT_FOUND', details: [{ errorCode: 'UNREGISTERED' }] } })) as { kind: string }).kind, 'permanent')
  // 메시지 모양 오류를 토큰 탓으로 돌려 기기를 끄지 않는다.
  assert.equal(((await send(400, { error: { status: 'INVALID_ARGUMENT', message: 'Invalid JSON payload' } })) as { kind: string }).kind, 'rejected')
  assert.equal(((await send(400, { error: { status: 'INVALID_ARGUMENT', message: 'The registration token is not a valid FCM registration token' } })) as { kind: string }).kind, 'permanent')
  assert.equal(((await send(503, { error: { status: 'UNAVAILABLE' } })) as { kind: string }).kind, 'retryable')
  assert.equal(((await send(401, { error: { status: 'UNAUTHENTICATED' } })) as { kind: string }).kind, 'auth')
})

test('Vercel OIDC token is exchanged without any key file', async () => {
  resetPushGoogleAuthForTests()
  await assert.rejects(fcmAccessToken(async () => new Response('{}'), {}), /PUSH_OIDC_TOKEN_MISSING/)
  const jwt = (iss: string) => `x.${Buffer.from(JSON.stringify({ iss })).toString('base64url')}.y`
  assert.equal(providerForIssuer('https://oidc.vercel.com'), 'vercel-global')
  assert.equal(providerForIssuer('https://oidc.vercel.com/ax-lab-cream'), 'vercel')
  rememberVercelOidcToken(jwt('https://oidc.vercel.com/ax-lab-cream'))
  const calls: Array<{ url: string; body: Record<string, unknown>; auth?: string }> = []
  const request = async (url: string, init?: RequestInit) => {
    calls.push({ url, body: JSON.parse(String(init?.body)), auth: (init?.headers as Record<string, string>)?.authorization })
    if (url.startsWith('https://sts.googleapis.com')) return new Response(JSON.stringify({ access_token: 'federated' }))
    return new Response(JSON.stringify({ accessToken: 'sa-token', expireTime: new Date(Date.now() + 3_600_000).toISOString() }))
  }
  assert.equal(await fcmAccessToken(request, {}), 'sa-token')
  assert.equal(calls[0].body.audience, '//iam.googleapis.com/projects/267087222795/locations/global/workloadIdentityPools/vercel/providers/vercel')
  assert.match(calls[1].url, /umsh-fcm-sender%40umsh-989fc\.iam\.gserviceaccount\.com:generateAccessToken$/)
  assert.equal(calls[1].auth, 'Bearer federated')
  assert.deepEqual(calls[1].body.scope, ['https://www.googleapis.com/auth/firebase.messaging'])
  assert.equal(await fcmAccessToken(request, {}), 'sa-token')
  assert.equal(calls.length, 2, 'cached until near expiry')
  resetPushGoogleAuthForTests()
})

function seeded() {
  const store = createMemoryPushStore()
  return store
}

test('dispatcher sends each device once, deactivates dead tokens, and finishes', async () => {
  const store = seeded()
  const a = await store.upsertDevice({ token: TOKEN_A, platform: 'android', appVersion: '1.0', deviceName: null, userId: USER })
  await store.upsertDevice({ token: TOKEN_B, platform: 'android', appVersion: '1.0', deviceName: null, userId: null })
  const created = await store.createNotification(parseDraft({ title: '오늘의 운세', body: '확인', deepLink: '/me', target: { type: 'all' }, schedule: { mode: 'now' } }), 'ops@example.invalid')
  const sent: FcmMessage[] = []
  const send = async (message: FcmMessage): Promise<FcmResult> => {
    sent.push(message)
    return message.token === TOKEN_B ? { ok: false, kind: 'permanent', code: 'UNREGISTERED', message: '' } : { ok: true, messageId: 'm' }
  }
  const outcome = await runPushDispatcher({ store, send, accessToken: async () => 'token' }, 60_000)
  assert.deepEqual({ sent: outcome.sent, failed: outcome.failed, finished: outcome.finished }, { sent: 1, failed: 1, finished: 1 })
  const item = await store.getNotification(created.id)
  assert.equal(item?.status, 'sent')
  assert.deepEqual([item?.totalCount, item?.successCount, item?.failureCount], [2, 1, 1])
  assert.equal(store.state.devices.find((d) => d.token === TOKEN_B)?.isActive, false)
  assert.equal(store.state.devices.find((d) => d.id === a.id)?.isActive, true)
  // 다시 돌려도 이미 끝난 건은 보내지 않는다.
  await runPushDispatcher({ store, send, accessToken: async () => 'token' }, 60_000)
  assert.equal(sent.length, 2)
  assert.deepEqual(await store.failureSummary(created.id), { UNREGISTERED: 1 })
})

test('auth failures leave deliveries pending; empty audiences fail visibly; scheduled waits', async () => {
  const store = seeded()
  await store.upsertDevice({ token: TOKEN_A, platform: 'android', appVersion: null, deviceName: null, userId: null })
  const push = await store.createNotification(parseDraft({ title: 't', body: 'b', target: { type: 'all' }, schedule: { mode: 'now' } }), 'ops@example.invalid')
  const outcome = await runPushDispatcher({ store, send: async () => ({ ok: false, kind: 'auth', code: 'UNAUTHENTICATED', message: '' }), accessToken: async () => 'token' }, 60_000)
  assert.equal(outcome.error, 'FCM_AUTH_UNAUTHENTICATED')
  assert.equal(store.state.deliveries[0].status, 'pending')
  assert.equal(store.state.devices[0].isActive, true, 'our auth problem must not kill devices')
  assert.equal((await store.getNotification(push.id))?.status, 'sending')

  const empty = createMemoryPushStore()
  const lonely = await empty.createNotification(parseDraft({ title: 't', body: 'b', target: { type: 'logged_in' }, schedule: { mode: 'now' } }), 'ops@example.invalid')
  await runPushDispatcher({ store: empty, send: async () => ({ ok: true, messageId: '' }), accessToken: async () => 't' }, 60_000)
  const failed = await empty.getNotification(lonely.id)
  assert.equal(failed?.status, 'failed'); assert.equal(failed?.lastError, 'NO_TARGET_DEVICES')

  const later = createMemoryPushStore()
  const future = await later.createNotification(parseDraft({ title: 't', body: 'b', target: { type: 'all' }, schedule: { mode: 'scheduled', at: new Date(Date.now() + 3_600_000).toISOString() } }), 'ops@example.invalid')
  assert.equal((await runPushDispatcher({ store: later, accessToken: async () => 't' }, 60_000)).claimed, 0)
  assert.equal((await later.cancelNotification(future.id, 'ops@example.invalid'))?.status, 'cancelled')
  assert.equal(await later.cancelNotification(future.id, 'ops@example.invalid'), null)
})

test('targets: guests, logged-in, signup window and specific users', async () => {
  const store = seeded()
  await store.upsertDevice({ token: TOKEN_A, platform: 'android', appVersion: null, deviceName: null, userId: USER })
  await store.upsertDevice({ token: TOKEN_B, platform: 'android', appVersion: null, deviceName: null, userId: null })
  store.state.profiles.push({ userId: USER, name: '김운명', createdAt: new Date().toISOString() })
  assert.equal(await store.countTargetDevices({ type: 'guests' }), 1)
  assert.equal(await store.countTargetDevices({ type: 'logged_in' }), 1)
  assert.equal(await store.countTargetDevices({ type: 'signup_days', days: 7 }), 1)
  assert.equal(await store.countTargetDevices({ type: 'users', userIds: [USER] }), 1)
  // 같은 토큰을 로그아웃 상태로 다시 등록하면 회원 연결이 풀린다. 행은 하나만 남는다.
  await store.upsertDevice({ token: TOKEN_A, platform: 'android', appVersion: null, deviceName: null, userId: null })
  assert.equal(store.state.devices.length, 2)
  assert.equal(await store.countTargetDevices({ type: 'logged_in' }), 0)
  assert.deepEqual((await store.searchUsers('운명')).map((u) => u.name), ['김운명'])
})

test('routes: guest registration, safe open redirect with click count, admin scopes', async () => {
  const store = seeded()
  const app = express(); app.use(express.json())
  const deps = {
    optionalUser: async (req: express.Request) => req.header('x-member') ? { id: String(req.header('x-member')) } : null,
    staff: async (req: express.Request, res: express.Response, scope: string) => { if (!String(req.header('x-scopes') ?? '').split(',').includes(scope)) { res.sendStatus(403); return null } return { email: 'ops@example.invalid' } },
    store: () => store,
    immediateBudgetMs: 0,
  }
  app.use('/api/push', pushRouter(deps)); app.use('/admin/push', adminPushRouter(deps))
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>((resolve) => server.once('listening', resolve))
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`
  const post = (path: string, body: unknown, headers: Record<string, string> = {}) => fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) })
  try {
    const guest = await (await post('/api/push/devices', { token: TOKEN_A, platform: 'android', appVersion: '1.0' })).json()
    assert.equal(guest.linked, false)
    const member = await (await post('/api/push/devices', { token: TOKEN_A, platform: 'android' }, { 'x-member': USER })).json()
    assert.equal(member.deviceId, guest.deviceId)
    assert.equal(store.state.devices[0].userId, USER)

    const draft = { title: '오늘의 운세', body: '확인해 보세요', deepLink: '/me', target: { type: 'all' }, schedule: { mode: 'draft' } }
    assert.equal((await post('/admin/push', draft, { 'x-scopes': 'content:read' })).status, 403)
    const created = await post('/admin/push', draft, { 'x-scopes': 'content:publish' })
    assert.equal(created.status, 201)
    const { item } = await created.json()
    assert.equal(item.status, 'draft')
    assert.equal((await (await fetch(`${base}/admin/push`, { headers: { 'x-scopes': 'content:read' } })).json()).total, 1)
    assert.equal((await (await post('/admin/push/audience', { target: { type: 'logged_in' } }, { 'x-scopes': 'content:read' })).json()).count, 1)

    await store.insertDeliveries(item.id, [{ id: store.state.devices[0].id, userId: USER }])
    const deliveryId = store.state.deliveries[0].id
    const open = (query: string) => fetch(`${base}/api/push/open?${query}`, { redirect: 'manual' })
    const first = await open(`n=${item.id}&d=${deliveryId}&to=${encodeURIComponent('/me?tab=1')}`)
    assert.equal(first.status, 302); assert.equal(first.headers.get('location'), '/me?tab=1')
    await open(`n=${item.id}&d=${deliveryId}&to=/me`)
    assert.equal((await store.getNotification(item.id))?.clickCount, 1, 'second tap is not counted twice')
    for (const evil of ['https://evil.example', '//evil.example', '/\\evil.example']) {
      assert.equal((await open(`to=${encodeURIComponent(evil)}`)).headers.get('location'), '/')
    }
  } finally { server.close() }
})
