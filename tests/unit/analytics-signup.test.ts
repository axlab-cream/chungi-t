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


test('wall and click events are synchronous, allowlisted and tolerate blocked analytics', () => {
  const { api, ctx, events } = setup()
  api.viewSignupWall()
  for (const method of ['google', 'kakao', 'naver', 'private@example.com']) api.signupClick(method)
  assert.deepEqual(events.map(e => [e[1], e[2].method]), [
    ['view_signup_wall', undefined], ['signup_click', 'google'], ['signup_click', 'kakao'], ['signup_click', 'naver'],
  ])
  ctx.gtag = () => { throw new Error('blocked') }
  assert.doesNotThrow(() => { api.viewSignupWall(); api.signupClick('google') })
})

test('Naver custom OAuth provider completes once with public method naver', async () => {
  for (const provider of ['custom:naver', 'custom:naver-production']) {
    const { api, ctx, events } = setup()
    ctx.fetch = async () => ({ ok: true, json: async () => ({ serverTime: new Date(now).toISOString(), providers: { naver: provider } }) })
    await api.beginSignup('naver')
    await api.completeSignup(auth(provider), session)
    await api.completeSignup(auth(provider), session)
    assert.equal(events.length, 1)
    assert.equal(events[0][1], 'sign_up')
    assert.equal(events[0][2].method, 'naver')
  }
})

test('Naver existing login and wrong provider never count as signup', async () => {
  for (const mode of ['existing', 'wrong']) {
    const { api, ctx, events } = setup()
    ctx.fetch = async () => ({ ok: true, json: async () => ({ serverTime: new Date(now).toISOString(), providers: { naver: 'custom:naver' } }) })
    await api.beginSignup('naver')
    await api.completeSignup(auth(mode === 'wrong' ? 'google' : 'custom:naver', mode === 'existing' ? now - 1 : now + 1000), session)
    assert.equal(events.length, 0)
  }
})

const signupPage = readFileSync(new URL('../../사주/사주/index.html', import.meta.url), 'utf8').replace(/\r\n/g, '\n')
function pageFunction(start: string, end: string) {
  const from = signupPage.indexOf(start)
  const to = signupPage.indexOf(end, from)
  assert.ok(from > 0 && to > from)
  return signupPage.slice(from, to)
}

test('actual modal counts entry and reopening, not config/error rerenders', () => {
  const { api, events } = setup()
  const stage = { innerHTML: '', querySelector() { return this.innerHTML.includes('role="dialog"') ? {} : null } }
  const ctx: any = { stage, window: { UMSHAnalytics: api }, authConfigData: {}, authGateMessage: '',
    protectedEntryLabel: () => '', wantsTodayEntry: () => false, wantsProtectedProfileEntry: () => false,
    isStandaloneSignupFlow: () => true, escapeHtml: (s: string) => s, renderAuthProviderButton: () => '', shouldUseGoogleIdentity: () => false }
  runInNewContext(pageFunction('function renderLogin()', 'function renderLoading()'), ctx)
  ctx.renderLogin()
  assert.match(stage.innerHTML, /role="dialog"/)
  ctx.renderLogin()
  ctx.authGateMessage = 'retry'; ctx.renderLogin()
  assert.equal(events.length, 1)
  stage.innerHTML = '<div>concern</div>'
  ctx.renderLogin()
  assert.equal(events.length, 2)
  ctx.window.UMSHAnalytics = undefined
  assert.doesNotThrow(() => ctx.renderLogin())
})

test('actual native provider clicks count before auth, including loading/unavailable states', () => {
  for (const method of ['google', 'kakao', 'naver']) {
    for (const kind of ['provider', 'loading', 'unavailable']) {
      const { api, events } = setup()
      let click: any
      const calls: string[] = []
      const ctx: any = { window: { UMSHAnalytics: api }, document: { addEventListener: (_: string, cb: any) => { click = cb } },
        signInWithProvider: (m: string) => { assert.equal(events.length, 1); calls.push(m) },
        setAuthMessage: () => { assert.equal(events.length, 1); calls.push('message') }, unavailableAuthMessage: () => '' }
      runInNewContext(pageFunction('document.addEventListener("click", (event) => {\n        const signupButton', 'function handleValue('), ctx)
      const key = 'auth' + kind[0].toUpperCase() + kind.slice(1)
      const button = { dataset: { [key]: method } }
      click({ target: { closest: (selector: string) => selector.includes(`[data-auth-${kind}]`) ? button : null } })
      assert.equal(events.length, 1)
      assert.equal(events[0][1], 'signup_click')
      assert.equal(events[0][2].method, method)
      assert.deepEqual(calls, [kind === 'provider' ? method : 'message'])
    }
  }
})

test('Google iframe official click callback counts click before credential callback', async () => {
  const { api, events } = setup()
  let config: any
  const container = { isConnected: true, innerHTML: '', getBoundingClientRect: () => ({ width: 320 }) }
  const ctx: any = { window: { UMSHAnalytics: api }, document: { querySelector: () => container },
    initializeGoogleIdentity: async () => ({ renderButton: (_: any, options: any) => { config = options } }),
    setAuthMessage: (s: string) => assert.fail(s) }
  runInNewContext(pageFunction('async function renderGoogleIdentityButton()', 'async function handleGoogleCredentialResponse('), ctx)
  await ctx.renderGoogleIdentityButton()
  assert.equal(events.length, 0)
  config.click_listener()
  assert.equal(events.length, 1)
  assert.equal(events[0][1], 'signup_click')
  assert.equal(events[0][2].method, 'google')
})
