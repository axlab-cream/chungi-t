import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { test } from 'node:test'

const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../사주/js/umsh-auth-session.js'), 'utf8')

function loadAuth(supabase: any, fetchImpl: typeof fetch = fetch) {
  const store = new Map<string, string>()
  const context: any = {
    supabase,
    fetch: fetchImpl,
    setTimeout,
    clearTimeout,
    Date,
    Number,
    Boolean,
    String,
    console,
    localStorage: {
      getItem(key: string) { return store.has(key) ? store.get(key)! : null },
      setItem(key: string, value: string) { store.set(key, String(value)) },
      removeItem(key: string) { store.delete(key) },
    },
  }
  context.window = context
  context.globalThis = context
  runInNewContext(source, context)
  return context.UMSHAuthSession
}

function liveSession() {
  return {
    access_token: 'tok',
    user: { id: 'owner-a', last_sign_in_at: new Date().toISOString() },
  }
}

test('같은 url/key 로는 supabase 클라이언트를 하나만 만든다', () => {
  let created = 0
  const client = { auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } } } } }
  const supabase = { createClient() { created += 1; return client } }
  const api = loadAuth(supabase)
  assert.equal(api.createClient(supabase, 'https://auth.example', 'pk'), client)
  assert.equal(api.createClient(supabase, 'https://auth.example', 'pk'), client)
  assert.equal(created, 1)
})

test('getSession이 비어도 SIGNED_IN이 오면 그 세션을 쓴다', async () => {
  let authChange: ((event: string, session: any) => void) | undefined
  const client = {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange(callback: (event: string, session: any) => void) {
        authChange = callback
        return { data: { subscription: { unsubscribe() {} } } }
      },
    },
  }
  const api = loadAuth({ createClient() { return client } })
  const pending = api.resolveLiveSession({ url: 'https://auth.example', publishableKey: 'pk' }, 400)
  await new Promise((resolve) => setTimeout(resolve, 20))
  const fire = authChange
  if (!fire) throw new Error('SIGNED_IN 대기 구독이 없다')
  fire('SIGNED_IN', liveSession())
  const resolved = await pending
  assert.equal(resolved.session.access_token, 'tok')
  assert.equal(resolved.client, client)
})

test('이미 있는 세션은 이벤트 대기 없이 바로 돌려준다', async () => {
  const session = liveSession()
  const client = {
    auth: {
      getSession: async () => ({ data: { session } }),
      onAuthStateChange() {
        throw new Error('있으면 기다리지 않는다')
      },
    },
  }
  const api = loadAuth({ createClient() { return client } })
  const resolved = await api.resolveLiveSession({ url: 'https://auth.example', publishableKey: 'pk' }, 400)
  assert.equal(resolved.session, session)
})

test('bindServiceSession은 설정 조회 후 산 세션을 auth 객체에 붙인다', async () => {
  const session = liveSession()
  const client = {
    auth: {
      getSession: async () => ({ data: { session } }),
      onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } } },
    },
  }
  const fetchImpl = async () => new Response(JSON.stringify({
    enabled: true,
    url: 'https://auth.example',
    publishableKey: 'pk',
  }))
  const api = loadAuth({ createClient() { return client } }, fetchImpl as typeof fetch)
  const auth: any = { config: null, client: null, session: null }
  const bound = await api.bindServiceSession(auth, 200)
  assert.equal(bound, session)
  assert.equal(auth.client, client)
  assert.equal(auth.session, session)
})
