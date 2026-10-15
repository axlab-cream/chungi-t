import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

// 2026-10-15 요청: 비회원은 탭을 닫거나 1시간 쉬면 익명 계정이 새로 생겨, 같은 사람이 어드민 회원 목록에 여러 줄로 쌓였다.
// 이름·생년월일시·성별·양음력이 같으면 한 사람으로 묶고, 몇 번 들어왔는지(visits)를 보인다.
const previousEnv = { ...process.env }
const nativeFetch = globalThis.fetch
process.env.SUPABASE_URL = 'https://guest-dedupe.synthetic.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'

const MEMBER = 'aaaaaaaa-0000-0000-0000-000000000001'
const GUEST_1 = 'bbbbbbbb-0000-0000-0000-000000000001'
const GUEST_2 = 'bbbbbbbb-0000-0000-0000-000000000002'
const GUEST_3 = 'bbbbbbbb-0000-0000-0000-000000000003'
const OTHER = 'cccccccc-0000-0000-0000-000000000001'
const birth = { birth_year: 1990, birth_month: 5, birth_day: 3, birth_hour: 7, birth_minute: 0, gender: 'female', calendar: 'solar', is_leap_month: false }

// updated_at 내림차순(최근 활동순)으로 온다고 가정한 행들.
const ROWS = [
  { user_id: GUEST_3, name: '김 하늘', accountType: 'guest', created_at: '2026-10-15T03:00:00.000Z', updated_at: '2026-10-15T03:00:00.000Z', ...birth },
  { user_id: MEMBER, name: '박회원', accountType: null, created_at: '2026-09-01T00:00:00.000Z', updated_at: '2026-10-14T00:00:00.000Z', ...birth },
  { user_id: GUEST_2, name: '김하늘', accountType: 'guest', created_at: '2026-10-14T03:00:00.000Z', updated_at: '2026-10-14T03:00:00.000Z', ...birth },
  { user_id: OTHER, name: '김하늘', accountType: 'guest', created_at: '2026-10-13T03:00:00.000Z', updated_at: '2026-10-13T03:00:00.000Z', ...birth, birth_day: 4 },
  { user_id: GUEST_1, name: '김하늘', accountType: 'guest', created_at: '2026-09-30T03:00:00.000Z', updated_at: '2026-09-30T03:00:00.000Z', ...birth },
]

const profileCalls: URL[] = []
globalThis.fetch = (async (input: string | URL | Request) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  if (url.pathname.endsWith('/cheongi_user_profiles')) {
    profileCalls.push(url)
    const guestOnly = url.searchParams.get('profile_payload->>account_type') === 'eq.guest'
    const lt = url.searchParams.getAll('created_at').find((value) => value.startsWith('lt.'))?.slice(3)
    let rows = ROWS.filter((row) => !guestOnly || row.accountType === 'guest')
    if (lt) rows = rows.filter((row) => row.created_at < lt)
    return new Response(JSON.stringify(rows), { headers: { 'content-range': `0-${rows.length - 1}/${rows.length}` } })
  }
  if (url.pathname.includes('/auth/v1/admin/users/')) return new Response(null, { status: 404 })
  return new Response(JSON.stringify([]), { headers: { 'content-range': '*/0' } })
}) as typeof fetch

let liveData: typeof import('../../src/admin/live-data.js')

before(async () => {
  liveData = await import('../../src/admin/live-data.js')
})

after(() => {
  globalThis.fetch = nativeFetch
  process.env = previousEnv
})

describe('비회원 같은 사람 묶기', { concurrency: false }, () => {
  it('이름 공백·대소문자만 다르면 같은 사람, 생일이 하루라도 다르면 다른 사람', () => {
    assert.equal(liveData.guestPersonKey(ROWS[0]), liveData.guestPersonKey(ROWS[2]))
    assert.notEqual(liveData.guestPersonKey(ROWS[2]), liveData.guestPersonKey(ROWS[3]))
    assert.equal(liveData.guestPersonKey({ user_id: GUEST_1.toUpperCase(), name: '' }), `id:${GUEST_1}`, '사주 정보가 비면 계정 번호로 따로 센다')
  })

  it('회원 목록(전체)은 같은 비회원을 가장 최근 방문 한 줄로 묶고 방문 수를 싣는다. 회원은 그대로 둔다', async () => {
    const { members, total } = await liveData.searchLiveMembers({})
    assert.equal(total, 3)
    assert.deepEqual(members.map((m) => [m.id, m.accountType, m.visits]), [
      [GUEST_3, 'guest', 3],
      [MEMBER, 'member', undefined],
      [OTHER, 'guest', 1],
    ])
  })

  it('묶은 뒤에 페이지를 자른다', async () => {
    const { members, total } = await liveData.searchLiveMembers({ kind: 'guest', limit: 1, offset: 1 })
    assert.equal(total, 2)
    assert.deepEqual(members.map((m) => [m.id, m.no]), [[OTHER, 2]])
  })

  it('비회원 수는 사람 수, 방문 수는 따로 센다', async () => {
    const counts = await liveData.countMemberKinds()
    assert.equal(counts.guest, 2)
    assert.equal(counts.guestVisits, 4)
    assert.equal(counts.all, counts.member + 2)
  })

  it('신규 비회원은 기간 안에 처음 온 사람만 센다(전에 왔던 사람이 다시 오면 빼고)', async () => {
    // 10-13~10-16: 김하늘(9/30 첫 방문)은 빼고, 생일 다른 김하늘(10/13)만 신규.
    assert.equal(await liveData.countGuestsCreated(new Date('2026-10-13T00:00:00.000Z'), new Date('2026-10-16T00:00:00.000Z')), 1)
    assert.equal(await liveData.countGuestsCreated(new Date('2026-09-01T00:00:00.000Z'), new Date('2026-10-16T00:00:00.000Z')), 2)
  })
})
