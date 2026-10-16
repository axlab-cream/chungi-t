import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { test } from 'node:test'

// 2026-10-14 비회원(익명 계정) 세션 저장 규칙 — docs/auth/guest-member-plan.md §5
const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../사주/js/umsh-auth-session.js'), 'utf8')
const TOKEN = 'sb-proj-auth-token'
const HOUR = 60 * 60 * 1000

function memoryStorage(seed: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(seed))
  return {
    store,
    get length() { return store.size },
    key(index: number) { return [...store.keys()][index] ?? null },
    getItem(key: string) { return store.has(key) ? store.get(key)! : null },
    setItem(key: string, value: string) { store.set(key, String(value)) },
    removeItem(key: string) { store.delete(key) },
  }
}

function load(local = memoryStorage(), session = memoryStorage(), now = () => Date.now(), extra: Record<string, unknown> = {}) {
  const FakeDate = class extends Date { static now() { return now() } }
  const context: any = { setTimeout, clearTimeout, Date: FakeDate, Number, Boolean, String, JSON, console, localStorage: local, sessionStorage: session, ...extra }
  context.window = context
  context.globalThis = context
  runInNewContext(source, context)
  return { auth: context.UMSHAuthSession, local, session }
}

const guestValue = JSON.stringify({ access_token: 'guest-tok', user: { id: 'guest-1', is_anonymous: true } })
const memberValue = JSON.stringify({ access_token: 'member-tok', user: { id: 'member-1', is_anonymous: false } })

// 2026-10-16 대표 결정: 1시간 정책 폐지. 비회원 세션은 이 기기에 계속 두되, 회원 세션과 겹치지 않게 따로 된 칸(umsh_guest:)에 둔다.
const GUEST_SLOT = 'umsh_guest:' + TOKEN

test('비회원 세션은 localStorage 의 따로 된 칸에, 회원 세션은 원래 칸에 둔다(로그인해도 비회원 세션이 덮이지 않는다)', () => {
  const { auth, local, session } = load()
  auth.guestAwareStorage.setItem(TOKEN, guestValue)
  assert.equal(local.getItem(GUEST_SLOT), guestValue)
  assert.equal(local.getItem(TOKEN), null)
  assert.equal(session.getItem(TOKEN), null)
  assert.equal(auth.guestAwareStorage.getItem(TOKEN), guestValue)

  auth.guestAwareStorage.setItem(TOKEN, memberValue)
  assert.equal(local.getItem(TOKEN), memberValue)
  assert.equal(local.getItem(GUEST_SLOT), guestValue, '로그인해도 비회원 세션은 남아 이어받기를 할 수 있다')
  assert.equal(auth.guestAwareStorage.getItem(TOKEN), memberValue)
})

test('회원 세션이 있으면 남은 비회원 세션보다 회원을 먼저 돌려준다', () => {
  const { auth } = load(memoryStorage({ [TOKEN]: memberValue }), memoryStorage({ [TOKEN]: guestValue }))
  assert.equal(auth.guestAwareStorage.getItem(TOKEN), memberValue)
})

test('시간이 지나도 비회원 세션을 지우지 않는다(같은 기기로 다시 오면 이어진다)', () => {
  let clock = 1_000_000
  const { auth } = load(memoryStorage(), memoryStorage(), () => clock)
  auth.guestAwareStorage.setItem(TOKEN, guestValue)
  clock += 30 * 24 * HOUR
  assert.equal(auth.guestAwareStorage.getItem(TOKEN), guestValue)
})

test('예전 방식(탭 저장소)에 남은 비회원 세션은 처음 열 때 새 칸으로 옮긴다', () => {
  const local = memoryStorage({ umsh_guest_active_at_v1: String(Date.now()) })
  const session = memoryStorage({ [TOKEN]: guestValue })
  load(local, session)
  assert.equal(local.getItem(GUEST_SLOT), guestValue)
  assert.equal(session.getItem(TOKEN), null)
  assert.equal(local.getItem('umsh_guest_active_at_v1'), null)
})

test('회원이 로그아웃해도 이 기기의 비회원 세션은 지우지 않는다', () => {
  const { auth, local } = load(memoryStorage({ [TOKEN]: memberValue, [GUEST_SLOT]: guestValue }))
  auth.guestAwareStorage.removeItem(TOKEN)
  assert.equal(local.getItem(TOKEN), null)
  assert.equal(local.getItem(GUEST_SLOT), guestValue)
})

test('회원의 생년월일 캐시는 비회원 표시가 없으면 건드리지 않는다', () => {
  const local = memoryStorage({ cheongi_user_birth_profile_v1: '{"name":"회원"}' })
  load(local, memoryStorage())
  assert.equal(local.getItem('cheongi_user_birth_profile_v1'), '{"name":"회원"}')
})

test('토큰만 보지 않고 익명 여부로 회원을 가린다', () => {
  const { auth } = load()
  const guest = { access_token: 'g', user: { id: 'g', is_anonymous: true } }
  const member = { access_token: 'm', user: { id: 'm' } }
  assert.equal(auth.isGuestSession(guest), true)
  assert.equal(auth.isMemberSession(guest), false)
  assert.equal(auth.isMemberSession(member), true)
  assert.equal(auth.isMemberSession(null), false)
})

test('비회원 세션은 30일 기기 기록을 남기지 않고 가입 이벤트도 보내지 않는다', async () => {
  const events: unknown[] = []
  const { auth, local } = load(memoryStorage(), memoryStorage(), () => Date.now(), { gtag: (...args: unknown[]) => events.push(args) })
  const now = new Date().toISOString()
  const guest = { access_token: 'g', user: { id: 'g', is_anonymous: true, created_at: now, last_sign_in_at: now } }
  assert.equal(await auth.enforceDeviceAuthSession(guest, null), guest)
  assert.equal(local.getItem(auth.DEVICE_KEY), null)
  assert.equal(events.length, 0)
})

test('서버가 비회원 로그인을 켜 두지 않으면 익명 세션을 만들지 않는다', async () => {
  let called = 0
  const client = { auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }), signInAnonymously: async () => { called += 1; return { data: { session: null } } } } }
  const { auth } = load(memoryStorage(), memoryStorage(), () => Date.now(), { supabase: { createClient: () => client } })
  const result = await auth.ensureGuestSession({ config: { enabled: true, url: 'u', publishableKey: 'k', guestSignIn: false }, client, session: null }, 0)
  assert.equal(result, null)
  assert.equal(called, 0)
})

test('켜 두었으면 익명 세션을 만들고 비회원 진입을 기록한다', async () => {
  const created = { access_token: 'g', user: { id: 'g', is_anonymous: true } }
  const pushed: unknown[] = []
  const client = { auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }), signInAnonymously: async () => ({ data: { session: created } }) } }
  const { auth } = load(memoryStorage(), memoryStorage(), () => Date.now(), { supabase: { createClient: () => client }, UMSHTrack: { push: (...args: unknown[]) => pushed.push(args) } })
  const result = await auth.ensureGuestSession({ config: { enabled: true, url: 'u', publishableKey: 'k', guestSignIn: true }, client, session: null }, 0)
  assert.equal(result, created)
  assert.deepEqual(JSON.parse(JSON.stringify(pushed)), [['cta_click', { target: 'signup:guest' }]])
})

// 2026-10-14 3단계: 로그인한 뒤 같은 탭의 비회원 기록을 회원 계정으로 옮긴다.
function claimSetup(confirmAnswer: boolean | null, pathname = '/play/solo-nara/') {
  const calls: Array<{ auth: string | null; body: any }> = []
  const local = memoryStorage({ [TOKEN]: memberValue, umsh_guest_active_at_v1: String(Date.now()) })
  const session = memoryStorage({ [TOKEN]: guestValue })
  const fetchImpl = async (_url: string, init: any) => {
    const body = JSON.parse(init.body)
    calls.push({ auth: init.headers.Authorization, body })
    return { ok: true, status: 200, json: async () => (body.dryRun ? { reports: 2, profile: 'copied' } : { reports: 2, profile: 'copied' }) }
  }
  const extra: Record<string, unknown> = { fetch: fetchImpl, location: { pathname } }
  if (confirmAnswer !== null) extra.UMSHGuestSaveSheet = { confirmClaim: async () => confirmAnswer }
  const { auth } = load(local, session, () => Date.now(), extra)
  return { auth, calls, local, session }
}

test('회원이 저장에 동의하면 비회원 토큰으로 옮기고 같은 탭의 비회원 세션을 지운다', async () => {
  const { auth, calls, session, local } = claimSetup(true)
  await auth.claimGuestNow()
  assert.equal(calls.length, 2)
  assert.equal(calls[0].auth, 'Bearer member-tok')
  assert.deepEqual(calls[0].body, { guestToken: 'guest-tok', dryRun: true })
  assert.deepEqual(calls[1].body, { guestToken: 'guest-tok' })
  assert.equal(session.getItem(TOKEN), null)
  assert.equal(local.getItem(TOKEN), memberValue, '회원 세션은 그대로')
})

test('저장하지 않기를 고르면 옮기지 않고, 비회원 기록은 이 기기에 남기며 다시 묻지 않는다', async () => {
  const { auth, calls, local } = claimSetup(false)
  await auth.claimGuestNow()
  assert.equal(calls.length, 1)
  assert.equal(calls[0].body.dryRun, true)
  assert.equal(local.getItem(GUEST_SLOT), guestValue, '다른 사람 기록일 수 있어 남긴다')
  await auth.claimGuestNow()
  assert.equal(calls.length, 1, '같은 회원·비회원 짝은 한 번만 묻는다')
})

test('처음 가입 + 이 기기에 결제 기록이면 결제 화면·저장 의도가 있어도 가린 이름으로 한 번 묻고, 동의하면 confirmPaid 로 옮긴다', async () => {
  const calls: any[] = []
  let asked: any = null
  const local = memoryStorage({ [TOKEN]: memberValue, [GUEST_SLOT]: guestValue })
  const session = memoryStorage({ umsh_claim_intent_v1: String(Date.now()) })
  const fetchImpl = async (_url: string, init: any) => {
    const body = JSON.parse(init.body)
    calls.push(body)
    return { ok: true, status: 200, json: async () => (body.dryRun ? { reports: 1, orders: 1, paidOrders: 1, remaining: 0, profile: 'copied', decision: 'confirm-paid', nameHint: '김○○' } : { reports: 1, orders: 1, remaining: 0 }) }
  }
  const { auth } = load(local, session, () => Date.now(), { fetch: fetchImpl, location: { pathname: '/payment/' }, UMSHGuestSaveSheet: { confirmClaim: async (plan: any) => { asked = plan; return true } } })
  await auth.claimGuestNow()
  assert.equal(asked?.paidName, '김○○')
  assert.equal(calls[1].confirmPaid, true)
  assert.equal(local.getItem(GUEST_SLOT), null, '남은 기록이 없으면 비회원 세션을 정리한다')
})

test('회원과 사주가 다른 사람의 기록뿐이면(공용 기기) 옮기지 않고 비회원 세션도 남긴다', async () => {
  const calls: any[] = []
  const local = memoryStorage({ [TOKEN]: memberValue, [GUEST_SLOT]: guestValue })
  const fetchImpl = async (_url: string, init: any) => { calls.push(JSON.parse(init.body)); return { ok: true, status: 200, json: async () => ({ reports: 0, orders: 0, remaining: 2, profile: 'kept', decision: 'skip-different' }) } }
  const { auth } = load(local, memoryStorage(), () => Date.now(), { fetch: fetchImpl, location: { pathname: '/' } })
  await auth.claimGuestNow()
  assert.equal(calls.length, 1)
  assert.equal(local.getItem(GUEST_SLOT), guestValue)
})

test('결제 화면에서는 묻지 않고 옮긴다(방금 본 결과를 사려는 본인)', async () => {
  const { auth, calls } = claimSetup(false, '/payment/')
  await auth.claimGuestNow()
  assert.equal(calls.length, 2)
})

test('비회원 세션이나 회원 세션이 없으면 서버를 부르지 않는다', async () => {
  const calls: unknown[] = []
  const { auth } = load(memoryStorage({ [TOKEN]: memberValue }), memoryStorage(), () => Date.now(), { fetch: async () => { calls.push(1); return {} } })
  assert.deepEqual(JSON.parse(JSON.stringify(await auth.claimGuestNow())), { skipped: true })
  assert.equal(calls.length, 0)
})
