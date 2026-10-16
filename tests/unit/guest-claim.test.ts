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
  assert.deepEqual(result.data, { reports: 1, orders: 0, paidOrders: 0, remaining: 0, profile: 'copied', decision: 'merge', nameHint: '' })
  assert.ok(await store.getReportRecord('guest-claim-report', guest))
})

test('이어받으면 리포트 주인이 회원으로 바뀌고, 사주 정보가 없던 회원에게 복사된다', async () => {
  const member = { id: 'member-claim-1', email: 'member-claim-1@synthetic.invalid' }
  const result = await claim('member-claim-1', { guestToken: 'guest-claim-1' })
  assert.equal(result.status, 200)
  assert.deepEqual(result.data, { reports: 1, orders: 0, paidOrders: 0, remaining: 0, profile: 'copied', decision: 'merge', nameHint: '' })
  const moved = await store.getReportRecord('guest-claim-report', member)
  assert.equal(moved?.owner?.id, member.id)
  // 옮긴 뒤 비회원 계정으로는 더 열리지 않는다.
  assert.throws(() => store.assertReportOwner(moved!, guest), /REPORT_ACCESS_DENIED/)
  assert.doesNotThrow(() => store.assertReportOwner(moved!, member))
  const copied = await profiles.getUserBirthProfile(member)
  assert.equal(copied?.name, '합성 손님')
  assert.equal(copied?.userId, member.id)
})

// 2026-10-16: 비회원이 기기에 오래 남으므로, 회원 사주와 다른 비회원 기록은 합치지 않는다(공용 기기에서 남의 기록이 넘어오지 않게).
test('회원 사주와 다른 사주의 비회원 기록은 합치지 않고, 회원 정보도 그대로 둔다', async () => {
  const other = { id: 'member-claim-2', accessToken: 'member-claim-2' }
  const otherGuest = { id: 'guest-claim-2', accessToken: 'guest-claim-2', isAnonymous: true }
  await profiles.saveUserBirthProfile(profiles.buildUserBirthProfile({ owner: other, name: '원래 회원', birth, birthTimeKnown: true, context: {} } as never), other)
  await profiles.saveUserBirthProfile(profiles.buildUserBirthProfile({ owner: otherGuest, name: '다른 손님', birth, birthTimeKnown: true, context: {} } as never), otherGuest)
  const result = await claim('member-claim-2', { guestToken: 'guest-claim-2' })
  assert.equal(result.data.skipped, 'different-saju')
  assert.equal(result.data.decision, 'skip-different')
  assert.equal(result.data.reports, 0)
  assert.equal((await profiles.getUserBirthProfile(other))?.name, '원래 회원')
})

test('회원 사주와 같은 사람(이름·생년월일)이면 합치고, 회원 사주는 그대로 둔다', async () => {
  const member = { id: 'member-claim-3', accessToken: 'member-claim-3' }
  const sameGuest = { id: 'guest-claim-3', accessToken: 'guest-claim-3', isAnonymous: true }
  await profiles.saveUserBirthProfile(profiles.buildUserBirthProfile({ owner: member, name: '같은 사람', birth, birthTimeKnown: true, context: {} } as never), member)
  // 태어난 시만 다르다: 같은 사람으로 본다.
  await profiles.saveUserBirthProfile(profiles.buildUserBirthProfile({ owner: sameGuest, name: '같은 사람', birth: { ...birth, hour: 21 }, birthTimeKnown: true, context: {} } as never), sameGuest)
  await store.saveReportRecord({ reportId: 'guest-claim-report-3', owner: { id: sameGuest.id }, birth, context: {}, analysis: analyzeSaju(birth), report: { title: 't', subtitle: '', model: 'test', generatedBy: 'template', sections: [] }, status: 'pending', createdAt: '', updatedAt: '' } as never)
  const result = await claim('member-claim-3', { guestToken: 'guest-claim-3' })
  assert.equal(result.data.decision, 'merge')
  assert.equal(result.data.reports, 1)
  assert.equal(result.data.profile, 'kept')
})

test('처음 가입한 회원 + 결제한 비회원 기록이면 한 번 확인한 뒤에만 옮긴다(이름은 가려서 보여 준다)', async () => {
  const payments = await import('../../src/payment/order-store.js')
  const paidGuest = { id: 'guest-claim-4', accessToken: 'guest-claim-4', isAnonymous: true }
  await profiles.saveUserBirthProfile(profiles.buildUserBirthProfile({ owner: paidGuest, name: '결제한손님', birth, birthTimeKnown: true, context: {} } as never), paidGuest)
  const at = new Date().toISOString()
  await store.saveReportRecord({ reportId: 'guest-claim-paid-report', owner: { id: paidGuest.id }, birth, context: { name: '결제한손님' }, analysis: analyzeSaju(birth), report: { title: 't', subtitle: '', model: 'test', generatedBy: 'template', sections: [] }, status: 'pending', createdAt: '', updatedAt: '' } as never)
  await payments.savePaymentOrder({ orderId: 'UMSH-CLAIM-PAID-1', ownerId: paidGuest.id, buyerEmail: 'a@b.c', buyerTel: '010-1234-5678', productKey: 'cmdg', productTitle: '천명사주', amount: 29000, status: 'paid', tid: 't', approvalCode: 'a', reportId: 'guest-claim-paid-report', createdAt: at, updatedAt: at } as never)
  const plan = await claim('member-claim-4', { guestToken: 'guest-claim-4', dryRun: true })
  assert.equal(plan.data.decision, 'confirm-paid')
  assert.equal(plan.data.nameHint, '결○○○')
  const blocked = await claim('member-claim-4', { guestToken: 'guest-claim-4' })
  assert.equal(blocked.status, 409)
  assert.equal(blocked.data.code, 'CONFIRM_PAID_REQUIRED')
  const done = await claim('member-claim-4', { guestToken: 'guest-claim-4', confirmPaid: true })
  assert.equal(done.status, 200)
  assert.equal(done.data.orders, 1)
  assert.equal((await payments.getPaymentOrder('UMSH-CLAIM-PAID-1'))?.ownerId, 'member-claim-4')
})

test('한 기기를 두 사람이 쓴 경우: 로그인한 회원과 사주가 같은 사람의 기록만 옮기고 다른 사람 기록은 남긴다', async () => {
  const member = { id: 'member-claim-5', accessToken: 'member-claim-5' }
  const shared = { id: 'guest-claim-5', accessToken: 'guest-claim-5', isAnonymous: true }
  const otherBirth = { ...birth, year: 1988 }
  await profiles.saveUserBirthProfile(profiles.buildUserBirthProfile({ owner: member, name: '비', birth, birthTimeKnown: true, context: {} } as never), member)
  for (const [id, name, b] of [['shared-a', '에이', otherBirth], ['shared-b', '비', birth]] as const) {
    await store.saveReportRecord({ reportId: id, owner: { id: shared.id }, birth: b, context: { name }, analysis: analyzeSaju(b), report: { title: 't', subtitle: '', model: 'test', generatedBy: 'template', sections: [] }, status: 'pending', createdAt: '', updatedAt: '' } as never)
  }
  const result = await claim('member-claim-5', { guestToken: 'guest-claim-5' })
  assert.equal(result.data.reports, 1)
  assert.equal(result.data.remaining, 1)
  assert.equal((await store.getReportRecord('shared-b', { id: member.id }))?.owner?.id, member.id)
  assert.equal((await store.getReportRecord('shared-a', { id: shared.id }))?.owner?.id, shared.id, '다른 사람 기록은 기기(비회원)에 남는다')
})
