import assert from 'node:assert/strict'
import { test } from 'node:test'

process.env.SUPABASE_URL = 'https://support-members.synthetic.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'

const MEMBER_A = 'a1a1a1a1-1111-4111-8111-111111111111'
const MEMBER_B = 'b2b2b2b2-2222-4222-8222-222222222222'
const MEMBER_C = 'c3c3c3c3-3333-4333-8333-333333333333'
const authCalls: string[] = []
globalThis.fetch = (async (input: string | URL | Request) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  if (url.pathname === '/rest/v1/cheongi_user_profiles') return new Response(JSON.stringify([{ user_id: MEMBER_A, name: '홍길동' }, { user_id: MEMBER_B, name: '김영희' }]), { status: 200 })
  const id = url.pathname.split('/').pop() ?? ''
  authCalls.push(id)
  // A는 이메일이 있고, B는 인증 조회가 실패하고, C는 인증 계정이 없다.
  if (id === MEMBER_A) return new Response(JSON.stringify({ id, email: 'hong@example.invalid', app_metadata: { provider: 'kakao' } }), { status: 200 })
  if (id === MEMBER_B) return new Response('{}', { status: 500 })
  return new Response('{}', { status: 404 })
}) as typeof fetch

const { memberContactsByIds } = await import('../../src/admin/live-data.js')

test('고객 지원 목록용 회원 조회는 이름·이메일을 붙이고, 한 명이 실패해도 나머지는 돌려준다', async () => {
  const contacts = await memberContactsByIds([MEMBER_A, MEMBER_A.toUpperCase(), MEMBER_B, MEMBER_C, 'guest', ''])
  assert.deepEqual(authCalls.sort(), [MEMBER_A, MEMBER_B, MEMBER_C].sort())
  assert.deepEqual(contacts.get(MEMBER_A), { name: '홍길동', email: 'hong@example.invalid', signupProvider: 'kakao' })
  assert.deepEqual(contacts.get(MEMBER_B), { name: '김영희', email: null, signupProvider: null })
  assert.deepEqual(contacts.get(MEMBER_C), { name: null, email: null, signupProvider: null })
  assert.equal(contacts.size, 3)
})

test('회원 번호가 없는 문의만 있으면 아무것도 묻지 않는다', async () => {
  authCalls.length = 0
  assert.equal((await memberContactsByIds(['', 'guest'])).size, 0)
  assert.equal(authCalls.length, 0)
})
