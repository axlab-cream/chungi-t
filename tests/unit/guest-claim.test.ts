import assert from 'node:assert/strict'
import { before, after, test } from 'node:test'
import type { Server } from 'node:http'

// 2026-10-14 3단계: SNS 로그인한 회원이 같은 탭의 비회원 기록(리포트·사주 정보)을 이어받는다. docs/auth/guest-member-plan.md
process.env.NODE_ENV = 'test'
for (const name of Object.keys(process.env)) if (/DATABASE|SUPABASE|OPENAI|ANTHROPIC|INICIS|PAYMENT|VERCEL|REPORT_STORAGE|ADMIN_EMAIL/.test(name)) delete process.env[name]
// 저장소는 메모리로 먼저 띄우고, 인증만 가짜 Supabase 로 확인한다.
const store = await import('../../src/report/report-store.js')
const profiles = await import('../../src/user/profile-store.js')
const { analyzeSaju } = await import('../../src/saju/analyzer.js')
process.env.SUPABASE_URL = 'https://claim-auth.invalid'
process.env.SUPABASE_PUBLISHABLE_KEY = 'test-key'
const realFetch = globalThis.fetch
let origin = '', server: Server
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  if (url.href === 'https://claim-auth.invalid/auth/v1/user') {
    const token = new Headers(init?.headers).get('authorization')?.replace('Bearer ', '') ?? ''
    if (!token) return new Response('{}', { status: 401 })
    const guest = token.startsWith('guest-')
    return Response.json({ id: token, ...(guest ? { is_anonymous: true } : { email: `${token}@synthetic.invalid`, is_anonymous: false }) })
  }
  if (url.origin === origin) return realFetch(input, init)
  throw new Error('No external requests in this test')
}) as typeof fetch
const { default: app } = await import('../../src/server/app.js')

const birth = { year: 1994, month: 3, day: 11, hour: 9, gender: 'female' as const, calendar: 'solar' as const }
const guest = { id: 'guest-claim-1', accessToken: 'guest-claim-1', isAnonymous: true }

async function claim(memberToken: string, body: Record<string, unknown>) {
  const response = await fetch(origin + '/api/auth/claim-guest', { method: 'POST', headers: { Authorization: `Bearer ${memberToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return { status: response.status, data: await response.json() as Record<string, unknown> }
}

before(async () => {
  await store.saveReportRecord({ reportId: 'guest-claim-report', owner: { id: guest.id }, birth, context: {}, analysis: analyzeSaju(birth), report: { title: '비회원 미리보기', subtitle: '', model: 'test', generatedBy: 'template', sections: [] }, status: 'pending', createdAt: '', updatedAt: '' } as never)
  await profiles.saveUserBirthProfile(profiles.buildUserBirthProfile({ owner: guest, name: '합성 손님', birth, birthTimeKnown: true, context: {} } as never), guest)
  server = app.listen(0, '127.0.0.1')
  await new Promise<void>(resolve => server.once('listening', resolve))
  origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`
})
after(async () => { globalThis.fetch = realFetch; server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) })

test('비회원 토큰으로는 이어받기를 부를 수 없다(회원 전용)', async () => {
  const result = await claim('guest-claim-1', { guestToken: 'guest-claim-1' })
  assert.equal(result.status, 401)
  assert.equal(result.data.code, 'MEMBER_REQUIRED')
})

test('회원 토큰을 비회원 토큰 자리에 넣으면 거절한다', async () => {
  const result = await claim('member-claim-1', { guestToken: 'member-other' })
  assert.equal(result.status, 400)
  assert.equal(result.data.code, 'NOT_GUEST')
})

test('dryRun 은 옮길 건수만 알려 주고 아무것도 옮기지 않는다', async () => {
  const result = await claim('member-claim-1', { guestToken: 'guest-claim-1', dryRun: true })
  assert.equal(result.status, 200)
  assert.deepEqual(result.data, { reports: 1, profile: 'copied' })
  assert.ok(await store.getReportRecord('guest-claim-report', guest))
})

test('이어받으면 리포트 주인이 회원으로 바뀌고, 사주 정보가 없던 회원에게 복사된다', async () => {
  const member = { id: 'member-claim-1', email: 'member-claim-1@synthetic.invalid' }
  const result = await claim('member-claim-1', { guestToken: 'guest-claim-1' })
  assert.equal(result.status, 200)
  assert.deepEqual(result.data, { reports: 1, profile: 'copied' })
  const moved = await store.getReportRecord('guest-claim-report', member)
  assert.equal(moved?.owner?.id, member.id)
  // 옮긴 뒤 비회원 계정으로는 더 열리지 않는다.
  assert.throws(() => store.assertReportOwner(moved!, guest), /REPORT_ACCESS_DENIED/)
  assert.doesNotThrow(() => store.assertReportOwner(moved!, member))
  const copied = await profiles.getUserBirthProfile(member)
  assert.equal(copied?.name, '합성 손님')
  assert.equal(copied?.userId, member.id)
})

test('이미 사주 정보가 있는 회원은 자기 정보를 지킨다', async () => {
  const other = { id: 'member-claim-2', accessToken: 'member-claim-2' }
  const otherGuest = { id: 'guest-claim-2', accessToken: 'guest-claim-2', isAnonymous: true }
  await profiles.saveUserBirthProfile(profiles.buildUserBirthProfile({ owner: other, name: '원래 회원', birth, birthTimeKnown: true, context: {} } as never), other)
  await profiles.saveUserBirthProfile(profiles.buildUserBirthProfile({ owner: otherGuest, name: '다른 손님', birth, birthTimeKnown: true, context: {} } as never), otherGuest)
  const result = await claim('member-claim-2', { guestToken: 'guest-claim-2' })
  assert.deepEqual(result.data, { reports: 0, profile: 'kept' })
  assert.equal((await profiles.getUserBirthProfile(other))?.name, '원래 회원')
})
