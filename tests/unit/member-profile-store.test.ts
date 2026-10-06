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

const PAID_MEMBER = 'bbbbbbbb-0000-0000-0000-000000000002'
const NEW_MEMBER = 'cccccccc-0000-0000-0000-000000000003'
const DELETED: string[] = []
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
  if (url.pathname === '/rest/v1/cheongi_reports' && method === 'GET') {
    return new Response(JSON.stringify([{ report_id: 'rep_1', created_at: '2026-10-01T00:00:00.000Z', updated_at: '2026-10-01T00:05:00.000Z', reportStatus: 'complete', reportService: 'saju' }]), { headers: { 'content-type': 'application/json' } })
  }
  if (url.pathname === '/rest/v1/cheongi_payment_orders' && method === 'GET') {
    const owner = url.searchParams.get('owner_id')?.replace(/^eq\./, '')
    return new Response(JSON.stringify(owner === PAID_MEMBER ? [{ order_id: 'o1', owner_id: PAID_MEMBER, product_key: 'cmdg', product_title: 'x', amount: 1000, status: 'paid', created_at: '2026-10-01T00:00:00.000Z', updated_at: '2026-10-01T00:00:00.000Z' }] : []), { headers: { 'content-type': 'application/json' } })
  }
  if (url.pathname === '/auth/v1/admin/users' && method === 'POST') {
    if (body.email === 'taken@example.com') return new Response(JSON.stringify({ msg: 'exists' }), { status: 422 })
    return new Response(JSON.stringify({ id: NEW_MEMBER, email: body.email }), { headers: { 'content-type': 'application/json' } })
  }
  if (url.pathname.startsWith('/auth/v1/admin/users/') && method === 'DELETE') {
    DELETED.push(url.pathname.split('/').pop()!)
    return new Response(null, { status: 200 })
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

  it('회원 목록 라우트는 검색·필터·정렬을 서버에서 걸고 거른 결과의 total 로 페이지를 나눈다', () => {
    const listRoute = source.slice(source.indexOf("app.get('/api/admin/v1/members',"), source.indexOf("app.get('/api/admin/v1/members/:id'"))
    assert.match(listRoute, /requireStaff\(req, res, 'members:read'\)/)
    assert.match(listRoute, /req\.query\?\.offset/)
    assert.match(listRoute, /searchLiveMembers\(\{ q, paid, from, to, sort, limit, offset \}\)/)
  })

  it('회원 상세 모음 라우트는 members:read 로 읽기만 하고, 한 부분이 실패해도 나머지를 보낸다', () => {
    const overview = source.slice(source.indexOf("app.get('/api/admin/v1/members/:id/overview'"), source.indexOf('const MEMBER_PROFILE_FAILURES'))
    assert.match(overview, /requireStaff\(req, res, 'members:read'\)/)
    assert.doesNotMatch(overview, /executeAdminCommand\(/)
    assert.match(overview, /Promise\.allSettled/)
    assert.match(overview, /errors\.push\(names\[index\]\)/)
  })
})

describe('회원 목록 검색·필터 (2026-10 4단계)', { concurrency: false }, () => {
  const lastProfileQuery = () => calls.filter((call) => call.method === 'GET' && call.url.pathname === '/rest/v1/cheongi_user_profiles').at(-1)!.url

  it('이름 일부는 ilike 로, 필터 문법 글자는 지우고 보낸다', async () => {
    await liveData.searchLiveMembers({ q: '김*철,수)', sort: 'name', limit: 50, offset: 50 })
    const url = lastProfileQuery()
    assert.equal(url.searchParams.get('name'), 'ilike.*김철수*')
    assert.equal(url.searchParams.get('order'), 'name.asc')
    assert.equal(url.searchParams.get('limit'), '50')
    assert.equal(url.searchParams.get('offset'), '50')
  })

  it('회원 번호 전체는 정확히 일치로 찾고, 행 수는 거른 결과 기준으로 센다', async () => {
    const result = await liveData.searchLiveMembers({ q: PROFILE_ROW.user_id.toUpperCase() })
    assert.equal(lastProfileQuery().searchParams.get('user_id'), `eq.${PROFILE_ROW.user_id}`)
    assert.equal(lastProfileQuery().searchParams.get('name'), null)
    assert.equal(result.members.length, 1)
    assert.equal(result.members[0].email, 'member@example.com')
    assert.equal(calls.filter((call) => call.url.pathname === '/rest/v1/cheongi_user_profiles').at(-1)!.headers.get('prefer'), 'count=exact')
  })

  it('가입일 범위는 created_at 두 조건으로, 한 번에 100명을 넘지 않는다', async () => {
    await liveData.searchLiveMembers({ from: '2026-09-01T00:00:00.000Z', to: '2026-10-01T00:00:00.000Z', limit: 500 })
    const url = lastProfileQuery()
    assert.deepEqual(url.searchParams.getAll('created_at'), ['gte.2026-09-01T00:00:00.000Z', 'lt.2026-10-01T00:00:00.000Z'])
    assert.equal(url.searchParams.get('limit'), '100')
    assert.equal(url.searchParams.get('order'), 'updated_at.desc')
  })

  it('회원 리포트는 본문 없이 상태·서비스만 JSON 경로로 뽑는다', async () => {
    const reports = await liveData.listMemberReports(PROFILE_ROW.user_id)
    const call = calls.filter((item) => item.url.pathname === '/rest/v1/cheongi_reports').at(-1)!
    assert.doesNotMatch(call.url.searchParams.get('select') ?? '', /(^|,)payload(,|$)/, '리포트 본문 전체를 가져오면 안 된다')
    assert.equal(call.url.searchParams.get('user_id'), `eq.${PROFILE_ROW.user_id}`)
    assert.deepEqual(reports, [{ reportId: 'rep_1', serviceTitle: reports[0].serviceTitle, status: 'complete', createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:05:00.000Z' }])
    assert.deepEqual(await liveData.listMemberReports('not-a-uuid'), [])
  })
})

describe('회원 등록·삭제 (2026-10 CRUD)', { concurrency: false }, () => {
  it('등록은 이메일 확인 완료 계정을 만들고 같은 번호로 프로필을 저장한다', async () => {
    const before = calls.length
    await liveData.createAdminMember({ email: 'new@example.com', name: '새회원', birth: { year: 1995, month: 1, day: 2, hour: 3, minute: 0, gender: 'female', calendar: 'solar', isLeapMonth: false }, birthTimeKnown: true }).catch(() => undefined)
    const created = calls.slice(before).find((call) => call.method === 'POST' && call.url.pathname === '/auth/v1/admin/users')
    assert.deepEqual((created?.body as Record<string, unknown>).email_confirm, true)
    assert.equal((created?.body as Record<string, unknown>).password, undefined, '비밀번호를 만들지 않는다')
    const profile = calls.slice(before).find((call) => call.method === 'POST' && call.url.pathname === '/rest/v1/cheongi_user_profiles')
    assert.equal((profile?.body as Record<string, unknown>).user_id, NEW_MEMBER)
  })

  it('이미 있는 이메일은 MEMBER_EMAIL_EXISTS', async () => {
    await assert.rejects(liveData.createAdminMember({ email: 'taken@example.com', name: '중복', birth: { year: 1995, month: 1, day: 2, hour: 3, minute: 0, gender: 'female', calendar: 'solar', isLeapMonth: false }, birthTimeKnown: true }), /MEMBER_EMAIL_EXISTS/)
  })

  it('결제 기록이 있는 회원은 지우지 않는다', async () => {
    await assert.rejects(liveData.deleteAdminMember(PAID_MEMBER), /MEMBER_HAS_PAYMENTS/)
    assert.ok(!DELETED.includes(PAID_MEMBER))
  })

  it('결제가 없는 회원만 인증 계정을 지운다', async () => {
    assert.deepEqual(await liveData.deleteAdminMember(PROFILE_ROW.user_id), { userId: PROFILE_ROW.user_id, deleted: true })
    assert.ok(DELETED.includes(PROFILE_ROW.user_id))
  })

  it('등록·삭제 라우트는 members:write 와 감사 명령을 거치고, 삭제는 confirm:true 를 요구한다', () => {
    const source = readFileSync(join(ROOT, 'src/server/app.ts'), 'utf8')
    const create = source.slice(source.indexOf("app.post('/api/admin/v1/members',"), source.indexOf("app.delete('/api/admin/v1/members/:id'"))
    const remove = source.slice(source.indexOf("app.delete('/api/admin/v1/members/:id'"), source.indexOf("app.delete('/api/admin/v1/members/:id'") + 1500)
    for (const route of [create, remove]) {
      assert.match(route, /requireStaff\(req, res, 'members:write'\)/)
      assert.match(route, /executeAdminCommand\(/)
    }
    assert.match(create, /'member\.account\.create'/)
    assert.match(remove, /'member\.account\.delete'/)
    assert.match(remove, /confirm !== true/)
  })
})
