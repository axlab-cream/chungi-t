import assert from 'node:assert/strict'
import { after, test } from 'node:test'

const previousEnv = { ...process.env }
process.env.SUPABASE_URL = 'https://audit.synthetic.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
const nativeFetch = globalThis.fetch
const seen: Array<{ url: URL; headers: Headers }> = []
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  seen.push({ url, headers: new Headers(init?.headers) })
  return new Response(JSON.stringify([{ id: 1, actor_email: 'ops@umsh.kr', action: 'member.account.delete', target_type: 'member_auth', target_id: 'u1', result: 'succeeded', created_at: '2026-10-06T00:00:00.000Z' }]), { headers: { 'content-range': '0-0/37' } })
}) as typeof fetch
const { searchAdminAuditEvents } = await import('../../src/admin/audit-store.js')
after(() => { globalThis.fetch = nativeFetch; for (const name of Object.keys(process.env)) if (!(name in previousEnv)) delete process.env[name]; Object.assign(process.env, previousEnv) })

test('로그 검색은 영역·관리자·기간으로 거르고, 기본은 완료 기록만, 관리자 이메일은 가린다', async () => {
  const result = await searchAdminAuditEvents({ area: 'member.', actor: 'ops*,', from: '2026-10-01T00:00:00.000Z', to: '2026-10-07T00:00:00.000Z', limit: 999, offset: 50 })
  const url = seen.at(-1)!.url
  assert.equal(url.searchParams.get('action'), 'like.member.*')
  assert.equal(url.searchParams.get('actor_email'), 'ilike.*ops*', '필터 문법 글자는 지운다')
  assert.equal(url.searchParams.get('result'), 'eq.succeeded')
  assert.deepEqual(url.searchParams.getAll('created_at'), ['gte.2026-10-01T00:00:00.000Z', 'lt.2026-10-07T00:00:00.000Z'])
  assert.equal(url.searchParams.get('limit'), '200')
  assert.equal(seen.at(-1)!.headers.get('prefer'), 'count=exact')
  assert.equal(result.total, 37)
  assert.equal(result.events[0].actor, 'o•••@umsh.kr')
})

test('모르는 영역은 필터로 쓰지 않고, 시작 기록 포함을 고를 수 있다', async () => {
  await searchAdminAuditEvents({ area: 'drop.', result: 'all' })
  const url = seen.at(-1)!.url
  assert.equal(url.searchParams.get('action'), null)
  assert.equal(url.searchParams.get('result'), null)
})
