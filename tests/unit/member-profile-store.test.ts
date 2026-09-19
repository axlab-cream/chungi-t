import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, before, describe, it } from 'node:test'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')

/**
 * 2026-09-19: 회원 프로필 수정·계정 정지 기능. 목록(listLiveMembers)의 마스킹은
 * 그대로 둔다 — 이 저장소 함수들은 "정확 식별자 검색"으로 이미 지목한 회원 한 명의
 * 상세만 다룬다. 계정 정지는 새 컬럼 없이 Supabase Auth 의 ban_duration 을 그대로 쓴다.
 */
const previousEnv = { ...process.env }
process.env.SUPABASE_URL = 'https://member-profile.synthetic.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'

const nativeFetch = globalThis.fetch
const calls: Array<{ method: string; url: URL; headers: Headers; body?: unknown }> = []

const PROFILE_ROW = {
  user_id: 'aaaaaaaa-0000-0000-0000-000000000001',
  name: '김철수',
  birth_year: 1990, birth_month: 5, birth_day: 12, birth_hour: 9, birth_minute: 30,
  gender: 'male', calendar: 'solar', is_leap_month: false, birth_time_known: true,
  created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-02T00:00:00.000Z',
}
const AUTH_USER = { id: 'aaaaaaaa-0000-0000-0000-000000000001', email: 'member@example.com', banned_until: null as string | null }

globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  const method = init?.method ?? 'GET'
  const headers = new Headers(init?.headers)
  const body = init?.body ? JSON.parse(String(init.body)) : undefined
  calls.push({ method, url, headers, body })

  if (url.pathname === '/rest/v1/cheongi_user_profiles' && method === 'GET') {
    const userId = url.searchParams.get('user_id')?.replace(/^eq\./, '')
    return new Response(JSON.stringify(userId === PROFILE_ROW.user_id ? [PROFILE_ROW] : []), { headers: { 'content-type': 'application/json' } })
  }
  if (url.pathname === '/rest/v1/cheongi_user_profiles' && method === 'POST') {
    Object.assign(PROFILE_ROW, {
      name: body.name, birth_year: body.birth_year, birth_month: body.birth_month, birth_day: body.birth_day,
      birth_hour: body.birth_hour, birth_minute: body.birth_minute, gender: body.gender, calendar: body.calendar,
      is_leap_month: body.is_leap_month, birth_time_known: body.birth_time_known, updated_at: body.updated_at,
    })
    return new Response(JSON.stringify([PROFILE_ROW]), { headers: { 'content-type': 'application/json' } })
  }
  if (url.pathname === `/auth/v1/admin/users/${AUTH_USER.id}` && method === 'GET') {
    return new Response(JSON.stringify(AUTH_USER), { headers: { 'content-type': 'application/json' } })
  }
  if (url.pathname === `/auth/v1/admin/users/${AUTH_USER.id}` && method === 'PATCH') {
    AUTH_USER.banned_until = body.ban_duration === 'none' ? null : new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 100).toISOString()
    return new Response(JSON.stringify(AUTH_USER), { headers: { 'content-type': 'application/json' } })
  }
  if (url.pathname === '/auth/v1/admin/users/unknown-user' && method === 'GET') {
    return new Response(JSON.stringify({ message: 'not found' }), { status: 404 })
  }
  if (url.pathname === '/rest/v1/cheongi_user_profiles' && method !== 'GET' && method !== 'POST') {
    throw new Error(`unexpected method ${method}`)
  }
  throw new Error(`Unexpected request: ${method} ${url}`)
}) as typeof fetch

const liveData = await import('../../src/admin/live-data.js')

after(() => {
  globalThis.fetch = nativeFetch
  for (const key of Object.keys(process.env)) if (!(key in previousEnv)) delete process.env[key]
  Object.assign(process.env, previousEnv)
})

describe('회원 프로필 상세·수정·계정 정지', { concurrency: false }, () => {
  before(() => { calls.length = 0 })

  it('프로필 행과 인증 계정을 합쳐 상세를 돌려주고, 마스킹하지 않는다', async () => {
    const detail = await liveData.getAdminMemberDetail(PROFILE_ROW.user_id)
    assert.deepEqual(detail, {
      userId: PROFILE_ROW.user_id,
      email: 'member@example.com',
      name: '김철수',
      birth: { year: 1990, month: 5, day: 12, hour: 9, minute: 30, gender: 'male', calendar: 'solar', isLeapMonth: false },
      birthTimeKnown: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      banned: false,
      bannedUntil: null,
      lastSignInAt: null,
      signupProvider: null,
    })
  })

  it('프로필 행도 인증 계정도 없으면 null — 임의 값을 지어내지 않는다', async () => {
    const detail = await liveData.getAdminMemberDetail('unknown-user')
    assert.equal(detail, null)
  })

  it('프로필 수정은 upsert 로 저장하고, 저장된 값을 그대로 돌려준다', async () => {
    const updated = await liveData.updateAdminMemberProfile({
      userId: PROFILE_ROW.user_id,
      name: '김철수2',
      birth: { year: 1991, month: 6, day: 1, hour: 10, minute: 0, gender: 'male', calendar: 'lunar', isLeapMonth: true },
      birthTimeKnown: false,
    })
    assert.equal(updated.name, '김철수2')
    assert.deepEqual(updated.birth, { year: 1991, month: 6, day: 1, hour: 10, minute: 0, gender: 'male', calendar: 'lunar', isLeapMonth: true })
    assert.equal(updated.birthTimeKnown, false)
    const draftCall = calls.find((call) => call.method === 'POST' && call.url.pathname === '/rest/v1/cheongi_user_profiles')
    assert.equal(draftCall?.headers.get('prefer'), 'resolution=merge-duplicates,return=representation')
  })

  it('계정 정지는 Supabase Auth 의 ban_duration 을 쓰고, 새 컬럼을 요구하지 않는다', async () => {
    const suspended = await liveData.setMemberBanned(PROFILE_ROW.user_id, true)
    assert.equal(suspended.banned, true)
    const banCall = calls.find((call) => call.method === 'PATCH' && call.url.pathname.endsWith('/admin/users/' + PROFILE_ROW.user_id))
    assert.equal((banCall?.body as { ban_duration?: string } | undefined)?.ban_duration, '876000h')

    const restored = await liveData.setMemberBanned(PROFILE_ROW.user_id, false)
    assert.equal(restored.banned, false)
    const unbanCall = calls.filter((call) => call.method === 'PATCH').at(-1)
    assert.equal((unbanCall?.body as { ban_duration?: string } | undefined)?.ban_duration, 'none')
  })
})

describe('회원 상세·수정·정지 라우트는 감사 명령을 거치고, members:write 로만 쓴다', () => {
  const source = readFileSync(join(ROOT, 'src/server/app.ts'), 'utf8')
  const detailRoute = source.slice(source.indexOf("app.get('/api/admin/v1/members/:id'"), source.indexOf("app.patch('/api/admin/v1/members/:id'"))
  const patchRoute = source.slice(source.indexOf("app.patch('/api/admin/v1/members/:id'"), source.indexOf("app.post('/api/admin/v1/members/:id/status'"))
  const statusRoute = source.slice(source.indexOf("app.post('/api/admin/v1/members/:id/status'"))

  it('상세 조회는 members:read 만 요구하고 아무것도 쓰지 않는다', () => {
    assert.match(detailRoute, /requireStaff\(req, res, 'members:read'\)/)
    assert.doesNotMatch(detailRoute, /executeAdminCommand\(/)
  })

  it('수정·정지 라우트는 members:write 를 요구하고 감사 명령·멱등 키를 거친다', () => {
    for (const route of [patchRoute.slice(0, 3000), statusRoute.slice(0, 2000)]) {
      assert.match(route, /requireStaff\(req, res, 'members:write'\)/)
      assert.match(route, /executeAdminCommand\(/, '쓰기는 감사 명령을 거쳐야 한다')
      assert.match(route, /adminCommandKey\(req\)/, '멱등 키 없이 쓰면 안 된다')
    }
  })

  it('계정 정지 action 은 이력에서 정지·해제를 구분할 수 있는 이름을 쓴다', () => {
    assert.match(statusRoute, /'member\.account\.suspend'/)
    assert.match(statusRoute, /'member\.account\.restore'/)
  })

  it('두 scope 모두 SUPER_ADMIN_SCOPES 와 LOCAL_ADMIN_SCOPES 에 있다', () => {
    const staff = readFileSync(join(ROOT, 'src/auth/staff.ts'), 'utf8')
    assert.match(staff, /'members:write'/)
    const localScopesLine = source.slice(source.indexOf('const LOCAL_ADMIN_SCOPES'), source.indexOf('\n', source.indexOf('const LOCAL_ADMIN_SCOPES')))
    assert.match(localScopesLine, /'members:write'/, '로컬 관리자 계정에도 members:write 가 없으면 화면이 403 으로 막힌다')
  })

  /**
   * 2026-09-19: 회원 상세의 구매 목록 라우트. PDF 받기와 마찬가지로 읽기 전용이라
   * members:read 만 요구하고, 감사 명령을 거치지 않는다.
   */
  it('구매 목록 라우트는 members:read 로 읽기만 한다', () => {
    const purchasesRoute = source.slice(source.indexOf("app.get('/api/admin/v1/members/:id/purchases'"), source.indexOf("app.patch('/api/admin/v1/members/:id'"))
    assert.match(purchasesRoute, /requireStaff\(req, res, 'members:read'\)/)
    assert.doesNotMatch(purchasesRoute, /executeAdminCommand\(/)
    assert.match(purchasesRoute, /listMemberPurchases\(userId\)/)
  })

  it('회원 목록 라우트는 offset·total 을 페이지네이션에 쓴다', () => {
    const listRoute = source.slice(source.indexOf("app.get('/api/admin/v1/members',"), source.indexOf("app.get('/api/admin/v1/members/:id'"))
    assert.match(listRoute, /requireStaff\(req, res, 'members:read'\)/)
    assert.match(listRoute, /req\.query\?\.offset/)
    assert.match(listRoute, /countLiveMembers\(\)/)
  })
})
