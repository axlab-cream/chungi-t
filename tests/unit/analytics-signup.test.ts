import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { test } from 'node:test'

const source = readFileSync(new URL('../../사주/js/umsh-analytics.js', import.meta.url), 'utf8')
const now = Date.now()
function setup(options: { origin?: string; dnt?: string; referrer?: string } = {}) {
  const store = new Map<string, string>()
  const storage = { getItem: (k: string) => store.get(k) || null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) }
  const events: any[] = []
  const ctx: any = { URL, Date, Promise, AbortController, setTimeout, clearTimeout, location: { origin: options.origin || 'https://umsh.kr', pathname: '/cmdg/', href: 'https://umsh.kr/cmdg/?code=private' }, navigator: { doNotTrack: options.dnt }, sessionStorage: storage, localStorage: storage, fetch: async () => ({ ok: true, json: async () => ({ serverTime: new Date(now).toISOString() }) }), document: { referrer: options.referrer || '', createElement: () => ({}), head: { appendChild() {} } }, gtag: (...args: any[]) => { events.push(args); args[2]?.event_callback?.() } }
  runInNewContext(source, ctx)
  return { ctx, events, store, api: ctx.UMSHAnalytics }
}
function auth(method: string, createdAt = now + 1000) {
  const user = { id: 'private-user', email: 'private@example.com', created_at: new Date(createdAt).toISOString(), app_metadata: { provider: method } }
  return { auth: { getUser: async () => ({ data: { user }, error: null }) } }
}
const session = { access_token: 'private-token' }

for (const method of ['google', 'kakao']) {
  test(`new ${method} signup sends once, without personal data`, async () => {
    const { api, events } = setup()
    await api.beginSignup(method)
    await Promise.all([api.completeSignup(auth(method), session), api.completeSignup(auth(method), session)])
    await api.completeSignup(auth(method), session)
    assert.equal(events.length, 1)
    assert.deepEqual(events[0].slice(0, 2), ['event', 'sign_up'])
    assert.equal(events[0][2].method, method)
    assert.doesNotMatch(JSON.stringify(events), /private|user_id|email/)
  })
}
test('existing login, missing attempt, failed authentication and mismatched provider do not count', async () => {
  for (const kind of ['existing', 'missing', 'failed', 'provider']) {
    const { api, events } = setup()
    if (kind !== 'missing') await api.beginSignup('google')
    await api.completeSignup(auth(kind === 'provider' ? 'kakao' : 'google', kind === 'existing' ? now - 1 : now + 1000), kind === 'failed' ? null : session)
    assert.equal(events.length, 0, kind)
  }
})
test('cancelled attempt and repeated login after signup do not count', async () => {
  const { api, events } = setup()
  await api.beginSignup('google'); api.cancelSignup()
  await api.completeSignup(auth('google'), session)
  assert.equal(events.length, 0)
  await api.beginSignup('google'); await api.completeSignup(auth('google'), session)
  await api.beginSignup('google'); await api.completeSignup(auth('google'), session)
  assert.equal(events.length, 1)
})
test('measurement stays disabled on local, QA referral and DNT', () => {
  for (const options of [{ origin: 'http://localhost:8800' }, { referrer: 'http://127.0.0.1:8800/' }, { dnt: '1' }]) assert.equal(setup(options).api, undefined)
})
test('tracking failure never rejects login completion', async () => {
  const { api, ctx, events } = setup()
  ctx.fetch = async () => { throw new Error('offline') }
  await api.beginSignup('google')
  await api.completeSignup(auth('google'), session)
  assert.equal(events.length, 0)
})
test('OAuth redirect reload consumes pending attempt exactly once', async () => {
  const { api, ctx, events } = setup()
  await api.beginSignup('kakao')
  delete ctx.__umshAnalyticsLoaded
  runInNewContext(source, ctx)
  await ctx.UMSHAnalytics.completeSignup(auth('kakao'), session)
  delete ctx.__umshAnalyticsLoaded
  runInNewContext(source, ctx)
  await ctx.UMSHAnalytics.completeSignup(auth('kakao'), session)
  assert.equal(events.length, 1)
})
test('expired or corrupt pending and failed getUser cannot create signups', async () => {
  for (const mode of ['expired', 'corrupt', 'unverified']) {
    const { api, events, store } = setup()
    await api.beginSignup('google')
    if (mode === 'expired') store.set('umsh:analytics:signup-pending', JSON.stringify({ method: 'google', startedAt: now, localAt: now - 3600001 }))
    if (mode === 'corrupt') store.set('umsh:analytics:signup-pending', '{')
    const client = mode === 'unverified' ? { auth: { getUser: async () => ({ error: new Error('invalid session') }) } } : auth('google')
    await api.completeSignup(client, session)
    assert.equal(events.length, 0, mode)
  }
})
test('analytics unavailable and blocked storage do not hold login indefinitely', async () => {
  const { api, ctx, events } = setup()
  await api.beginSignup('google')
  ctx.gtag = () => {} // ad blocker / script load failure: bounded callback wait
  const before = Date.now()
  await api.completeSignup(auth('google'), session)
  assert.ok(Date.now() - before < 2500)
  ctx.sessionStorage.getItem = () => { throw new Error('blocked') }
  await api.completeSignup(auth('google'), session)
  assert.equal(events.length, 0)
})
test('real signup page waits for completion before auth continuation', async () => {
  const html = readFileSync(new URL('../../사주/사주/index.html', import.meta.url), 'utf8')
  const start = html.indexOf('async function initAuth()')
  const end = html.indexOf('async function currentAuthSession()', start)
  assert.ok(start > 0 && end > start)
  const calls: string[] = []
  const client = { auth: { getSession: async () => ({ data: { session } }), onAuthStateChange() {} } }
  const ctx: any = { authInitPromise: null, fetch: async () => ({ json: async () => ({ enabled: true }) }), window: { supabase: { createClient: () => client }, UMSHAnalytics: { completeSignup: async () => { await Promise.resolve(); calls.push('signup') } } }, enforceDeviceAuthSession: async (s: any) => s, setTimeout() {} }
  runInNewContext(html.slice(start, end), ctx)
  await ctx.initAuth()
  calls.push('continue')
  assert.deepEqual(calls, ['signup', 'continue'])
  assert.match(html, /await window\.UMSHAnalytics\?\.beginSignup\?\.\("google"\);\s+const \{ data, error \} = await authClient\.auth\.signInWithIdToken/)
  assert.match(html, /await window\.UMSHAnalytics\?\.beginSignup\?\.\(providerName\);\s+const \{ error \} = await authClient\.auth\.signInWithOAuth/)
})
