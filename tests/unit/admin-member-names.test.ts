import assert from 'node:assert/strict'
import { test } from 'node:test'

process.env.SUPABASE_URL = 'https://member-names.synthetic.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'

const MEMBER_A = '12345678-1234-1234-1234-123456789012'
const MEMBER_B = 'b2b2b2b2-2222-2222-2222-222222222222'
const requests: URL[] = []
globalThis.fetch = (async (input: string | URL | Request) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  requests.push(url)
  // 프로필이 있는 회원 A, 이름이 빈 회원 B. 둘 다 묻더라도 이름이 있는 쪽만 돌려받아야 한다.
  return new Response(JSON.stringify([{ user_id: MEMBER_A.toUpperCase(), name: '홍길동' }, { user_id: MEMBER_B, name: '' }]), { status: 200 })
}) as typeof fetch

const { memberNamesByIds } = await import('../../src/admin/live-data.js')

test('결제 목록용 이름 조회는 회원 번호만 한 번에 묻고, 이름이 있는 회원만 돌려준다', async () => {
  const names = await memberNamesByIds([MEMBER_A, MEMBER_A, MEMBER_B, 'guest', ''])
  assert.equal(requests.length, 1)
  assert.equal(requests[0].searchParams.get('user_id'), `in.(${MEMBER_A},${MEMBER_B})`)
  assert.equal(requests[0].searchParams.get('select'), 'user_id,name')
  assert.equal(names.get(MEMBER_A), '홍길동')
  assert.equal(names.has(MEMBER_B), false)
})

test('회원 번호 형식이 하나도 없으면 저장소를 부르지 않는다', async () => {
  requests.length = 0
  const names = await memberNamesByIds(['guest', 'not-a-uuid'])
  assert.equal(names.size, 0)
  assert.equal(requests.length, 0)
})
