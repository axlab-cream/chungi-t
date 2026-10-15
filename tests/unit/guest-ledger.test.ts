import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { after, before, beforeEach, describe, it } from 'node:test'

// 2026-10-15 비회원 관리·약관 동의(대표 결정): 같은 기기 + 같은 사주 = 같은 비회원, 기기가 다르면 다른 비회원.
// 필수 동의는 이용약관·개인정보 수집·이용·만 14세 이상. 30일 지난 비회원은 운영자가 정리하고 통계만 남긴다.
const previousEnv = { ...process.env }
const nativeFetch = globalThis.fetch
process.env.SUPABASE_URL = 'https://guest-ledger.synthetic.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'

const GUEST_A = 'aaaaaaaa-0000-4000-8000-000000000001'
const GUEST_B = 'aaaaaaaa-0000-4000-8000-000000000002'
const GUEST_C = 'aaaaaaaa-0000-4000-8000-000000000003'
const MEMBER = 'bbbbbbbb-0000-4000-8000-000000000001'
const DEVICE_PC = 'device-pc-000001'
const DEVICE_PHONE = 'device-phone-0001'

type Person = Record<string, unknown> & { id: string; device_id: string; saju_key: string; guest_user_ids: string[] }
let people: Person[] = []
let consents: Array<Record<string, unknown>> = []
let prefsWrites: Array<Record<string, unknown>> = []
let nextId = 1

function matches(row: Record<string, unknown>, params: URLSearchParams): boolean {
  for (const [column, filter] of params) {
    if (['select', 'order', 'limit', 'offset'].includes(column)) continue
    const value = row[column]
    if (filter.startsWith('eq.') && String(value) !== filter.slice(3)) return false
    if (filter.startsWith('cs.{') && !(Array.isArray(value) && value.includes(filter.slice(4, -1)))) return false
    if (filter === 'is.null' && value != null) return false
    if (filter === 'not.is.null' && value == null) return false
    if (filter.startsWith('lt.') && !(typeof value === 'string' && value < filter.slice(3))) return false
    if (filter.startsWith('in.(') && !filter.slice(4, -1).split(',').includes(String(value))) return false
  }
  return true
}

globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  const method = init?.method ?? 'GET'
  const body = init?.body ? JSON.parse(String(init.body)) : null
  if (url.pathname.endsWith('/umsh_guest_people')) {
    const hit = people.filter((row) => matches(row, url.searchParams))
    if (method === 'GET') {
      const limit = Number(url.searchParams.get('limit') ?? 1000)
      return new Response(JSON.stringify(hit.slice(0, limit)), { headers: { 'content-range': `0-${hit.length - 1}/${hit.length}` } })
    }
    if (method === 'PATCH') { for (const row of hit) Object.assign(row, body); return new Response(null, { status: 204 }) }
    if (method === 'POST') {
      if (people.some((row) => row.device_id === body.device_id && row.saju_key === body.saju_key)) return new Response(null, { status: 201 })
      people.push({ id: `00000000-0000-4000-8000-${String(nextId++).padStart(12, '0')}`, consented_at: null, converted_to: null, anonymized_at: null, ...body })
      return new Response(null, { status: 201 })
    }
  }
  if (url.pathname.endsWith('/umsh_consents')) {
    if (method === 'POST') { consents.push(body); return new Response(null, { status: 201 }) }
    const hit = consents.filter((row) => matches(row, url.searchParams))
    return new Response(JSON.stringify(hit), { headers: { 'content-range': `0-${hit.length - 1}/${hit.length}` } })
  }
  if (url.pathname.endsWith('/umsh_notification_prefs')) {
    if (method === 'POST') { prefsWrites.push(body); return new Response(JSON.stringify([body])) }
    return new Response(JSON.stringify([]))
  }
  return new Response(JSON.stringify([]), { status: 404 })
}) as typeof fetch

let ledger: typeof import('../../src/user/guest-ledger.js')
const birth = { year: 1995, month: 3, day: 7, hour: 9, minute: 30, gender: 'female' as const, calendar: 'solar' as const, isLeapMonth: false }
const profile = (name = '김하늘') => ({ userId: '', name, birth, birthTimeKnown: true, context: {}, createdAt: '', updatedAt: '' })
const guest = (id: string) => ({ id, isAnonymous: true, accessToken: 't' })

before(async () => { ledger = await import('../../src/user/guest-ledger.js') })
beforeEach(() => { people = []; consents = []; prefsWrites = []; nextId = 1 })
after(() => { globalThis.fetch = nativeFetch; process.env = previousEnv })

describe('비회원 장부: 같은 기기 + 같은 사주 = 한 사람', { concurrency: false }, () => {
  it('오늘 PC, 내일 같은 PC(같은 사주) → 한 줄, 방문 2회', async () => {
    await ledger.recordGuestVisit({ guest: guest(GUEST_A), deviceId: DEVICE_PC, service: 'today', profile: profile() })
    await ledger.recordGuestVisit({ guest: guest(GUEST_B), deviceId: DEVICE_PC, service: 'cmdg', profile: profile('김 하늘') })
    assert.equal(people.length, 1)
    assert.deepEqual(people[0].guest_user_ids, [GUEST_A, GUEST_B])
    assert.equal(people[0].visits, 2)
    assert.deepEqual(people[0].services, ['today', 'cmdg'])
  })

  it('PC와 폰은 이름·생일이 같아도 다른 비회원', async () => {
    await ledger.recordGuestVisit({ guest: guest(GUEST_A), deviceId: DEVICE_PC, service: 'today', profile: profile() })
    await ledger.recordGuestVisit({ guest: guest(GUEST_B), deviceId: DEVICE_PHONE, service: 'today', profile: profile() })
    assert.equal(people.length, 2)
  })

  it('같은 기기라도 다른 사주(PC방·가족)는 다른 비회원', async () => {
    await ledger.recordGuestVisit({ guest: guest(GUEST_A), deviceId: DEVICE_PC, service: 'today', profile: profile() })
    await ledger.recordGuestVisit({ guest: guest(GUEST_B), deviceId: DEVICE_PC, service: 'today', profile: profile('박다른') })
    assert.equal(people.length, 2)
  })

  it('같은 방문에서 여러 결과를 보면 방문 수는 그대로, 본 결과만 늘어난다. 서브 콘텐츠만 보다 사주를 넣으면 그 줄에 채운다', async () => {
    await ledger.recordGuestVisit({ guest: guest(GUEST_A), deviceId: DEVICE_PC, service: 'play/solo-nara', profile: null })
    await ledger.recordGuestVisit({ guest: guest(GUEST_A), deviceId: DEVICE_PC, service: 'today', profile: profile() })
    assert.equal(people.length, 1)
    assert.equal(people[0].visits, 1)
    assert.equal(people[0].name, '김하늘')
    assert.equal(people[0].saju_key, ledger.sajuKey(profile()))
    assert.deepEqual(people[0].services, ['play/solo-nara', 'today'])
  })

  it('장부의 사주 키는 원문이 아니라 해시다', () => {
    const key = ledger.sajuKey(profile())
    assert.match(key, /^[0-9a-f]{32}$/)
    assert.doesNotMatch(key, /1995|하늘/)
  })

  it('회원은 장부에 쓰지 않는다', async () => {
    await ledger.recordGuestVisit({ guest: { id: MEMBER, isAnonymous: false }, deviceId: DEVICE_PC, service: 'today', profile: profile() })
    assert.equal(people.length, 0)
  })

  it('SNS 로그인으로 이어받으면 그 비회원 줄에 회원을 적고, 이미 다른 회원에 적힌 줄은 덮지 않는다', async () => {
    await ledger.recordGuestVisit({ guest: guest(GUEST_A), deviceId: DEVICE_PC, service: 'today', profile: profile() })
    await ledger.markGuestConverted(GUEST_A, MEMBER)
    assert.equal(people[0].converted_to, MEMBER)
    await ledger.markGuestConverted(GUEST_A, 'cccccccc-0000-4000-8000-000000000001')
    assert.equal(people[0].converted_to, MEMBER)
  })
})

describe('약관 동의', { concurrency: false }, () => {
  const valid = { version: '2026-10-15', terms: true, privacy: true, age14: true, marketing: false, source: 'guest-sheet', deviceId: DEVICE_PC }

  it('필수 셋(이용약관·개인정보·만 14세 이상) 중 하나라도 빠지면 받지 않는다', () => {
    for (const key of ['terms', 'privacy', 'age14'] as const) {
      assert.throws(() => ledger.parseConsentInput({ ...valid, [key]: false }), /CONSENT_REQUIRED/)
    }
    assert.throws(() => ledger.parseConsentInput({ ...valid, version: '2020-01-01' }), /CONSENT_VERSION_MISMATCH/)
    assert.equal(ledger.parseConsentInput({ ...valid, source: 'weird', deviceId: 'x' }).source, 'login')
    assert.equal(ledger.parseConsentInput({ ...valid, deviceId: 'bad id!' }).deviceId, null)
  })

  it('비회원 동의는 동의 기록 + 장부 "동의" 칸, 회원 마케팅 동의는 이벤트 알림도 켠다', async () => {
    await ledger.recordGuestVisit({ guest: guest(GUEST_A), deviceId: DEVICE_PC, service: 'today', profile: profile() })
    await ledger.recordConsent(guest(GUEST_A), ledger.parseConsentInput({ ...valid, marketing: true }))
    assert.equal(consents.length, 1)
    assert.equal(consents[0].is_guest, true)
    assert.equal(consents[0].age_over_14, true)
    assert.ok(people[0].consented_at)
    assert.equal(people[0].marketing_consented, true)
    assert.equal(prefsWrites.length, 0, '비회원에게는 알림 설정이 없다')

    await ledger.recordConsent({ id: MEMBER, isAnonymous: false }, ledger.parseConsentInput({ ...valid, marketing: true, source: 'login' }))
    assert.equal(prefsWrites.at(-1)?.marketing_push, true)
    assert.equal(await ledger.hasCurrentConsent(MEMBER), true)
    assert.equal(await ledger.hasCurrentConsent(GUEST_C), false)
  })
})

describe('30일 지난 비회원 정리', { concurrency: false }, () => {
  it('이름·생일(월·일)·시를 지우고 출생 연도·성별·방문 수는 남기며, 방문 계정을 지운다. 못 지운 계정은 다음에 다시 시도한다', async () => {
    const now = new Date('2026-12-01T00:00:00.000Z')
    await ledger.recordGuestVisit({ guest: guest(GUEST_A), deviceId: DEVICE_PC, service: 'today', profile: profile() }, new Date('2026-10-01T00:00:00.000Z'))
    await ledger.recordGuestVisit({ guest: guest(GUEST_B), deviceId: DEVICE_PC, service: 'today', profile: profile() }, new Date('2026-10-02T00:00:00.000Z'))
    await ledger.recordGuestVisit({ guest: guest(GUEST_C), deviceId: DEVICE_PHONE, service: 'today', profile: profile() }, new Date('2026-11-25T00:00:00.000Z'))
    const deleted: string[] = []
    const result = await ledger.anonymizeStaleGuests(null, now, async (id) => { if (id === GUEST_B) throw new Error('boom'); deleted.push(id) })
    assert.deepEqual(result, { people: 1, accounts: 1, failedAccounts: 1 })
    const old = people.find((row) => row.device_id === DEVICE_PC)!
    assert.equal(old.name, null)
    assert.equal(old.birth_day, null)
    assert.equal(old.birth_hour, null)
    assert.equal(old.birth_year, 1995)
    assert.equal(old.gender, 'female')
    assert.equal(old.visits, 2)
    assert.deepEqual(old.guest_user_ids, [GUEST_B])
    assert.equal(old.anonymized_at, null, '못 지운 계정이 남으면 아직 정리 대상')
    assert.equal(people.find((row) => row.device_id === DEVICE_PHONE)!.name, '김하늘', '최근 방문은 건드리지 않는다')

    const retry = await ledger.anonymizeStaleGuests(null, now, async (id) => { deleted.push(id) })
    assert.deepEqual(retry, { people: 1, accounts: 1, failedAccounts: 0 })
    assert.ok(old.anonymized_at)
    assert.deepEqual(deleted, [GUEST_A, GUEST_B])
  })
})

describe('서버·어드민 연결', () => {
  const app = readFileSync(new URL('../../src/server/app.ts', import.meta.url), 'utf8')
  const migration = readFileSync(new URL('../../supabase/migrations/20261015120000_guest_people_and_consents.sql', import.meta.url), 'utf8')

  it('정리는 members:write·멱등 키·confirm·감사 기록을 거친다', () => {
    const route = app.slice(app.indexOf("app.post('/api/admin/v1/guests/anonymize'"), app.indexOf("app.get('/api/admin/v1/members/:id/overview'"))
    assert.match(route, /requireStaff\(req, res, 'members:write'\)/)
    assert.match(route, /body\.confirm !== true/)
    assert.match(route, /executeAdminCommand\(/)
    assert.match(route, /'member\.guest\.anonymize'/)
  })

  it('회원 관리 목록은 SNS 회원만 보인다', () => {
    const route = app.slice(app.indexOf("app.get('/api/admin/v1/members',"), app.indexOf("app.get('/api/admin/v1/members/:id'"))
    assert.match(route, /const kind = req\.query\?\.kind === 'guest' \? 'guest' : 'member'/)
  })

  it('이어받기는 장부에도 회원 전환을 적는다', () => {
    const claim = app.slice(app.indexOf("app.post('/api/auth/claim-guest'"), app.indexOf("app.get('/api/user/profile'"))
    assert.match(claim, /markGuestConverted\(guest\.id, member\.id\)/)
  })

  it('동의 표는 필수 셋이 모두 true 인 줄만 받고, 두 표 모두 service_role 만 쓴다', () => {
    assert.match(migration, /CHECK \(terms AND privacy AND age_over_14\)/)
    assert.match(migration, /UNIQUE \(device_id, saju_key\)/)
    assert.equal((migration.match(/REVOKE ALL ON public\.umsh_\w+ FROM PUBLIC, anon, authenticated/g) ?? []).length, 2)
  })
})
