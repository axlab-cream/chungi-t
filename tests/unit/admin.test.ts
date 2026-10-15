import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// 2026-10-15: 결제 없이 여는 계정 = 관리자 계정. 따로 두던 무료 열람 목록(UMSH_ADMIN_EMAILS)은 없앴다.
const previousEnv = { ...process.env }
process.env.SUPABASE_URL = 'https://admin-free.synthetic.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_synthetic'
process.env.UMSH_ADMIN_ACCOUNT_STORE = 'enabled'
process.env.UMSH_ADMIN_SUPER_EMAILS = 'super@synthetic.invalid'
process.env.UMSH_LOCAL_ADMIN_EMAIL = 'local@synthetic.invalid'
process.env.UMSH_ADMIN_EMAILS = 'legacy@synthetic.invalid'

const accounts: Record<string, boolean> = { 'account@synthetic.invalid': true, 'inactive@synthetic.invalid': false }
let lookups = 0
let failLookups = false
const nativeFetch = globalThis.fetch
globalThis.fetch = (async (input: string | URL | Request) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  assert.ok(url.pathname.endsWith('/umsh_admin_accounts'), url.pathname)
  lookups += 1
  if (failLookups) return new Response('{}', { status: 503 })
  const email = String(url.searchParams.get('email')).replace(/^eq\./, '')
  const rows = email in accounts ? [{ id: 'a1', email, password_hash: 'x', is_active: accounts[email], role: 'super_admin', revision: 1, created_at: '', updated_at: '' }] : []
  return new Response(JSON.stringify(rows), { headers: { 'content-type': 'application/json' } })
}) as typeof fetch

const { applyAdminReportUnlock, forgetAdminAccountCache, isAdminEmail, isAdminOwner } = await import('../../src/auth/admin.js')
after(() => { globalThis.fetch = nativeFetch; for (const name of Object.keys(process.env)) if (!(name in previousEnv)) delete process.env[name]; Object.assign(process.env, previousEnv) })

test('관리자 화면 계정(활성)·관리자 이메일 설정·비상 계정은 무료로 연다', async () => {
  assert.equal(await isAdminEmail('ACCOUNT@synthetic.invalid'), true)
  assert.equal(await isAdminEmail('super@synthetic.invalid'), true)
  assert.equal(await isAdminEmail('local@synthetic.invalid'), true)
  assert.equal(await isAdminOwner({ email: ' Super@Synthetic.invalid ' }), true)
})

test('비활성 관리자·관리자 아닌 계정·예전 무료 목록은 열지 않는다', async () => {
  assert.equal(await isAdminEmail('inactive@synthetic.invalid'), false)
  assert.equal(await isAdminEmail('someone@example.com'), false)
  assert.equal(await isAdminEmail('legacy@synthetic.invalid'), false, 'UMSH_ADMIN_EMAILS 는 더 이상 보지 않는다')
  assert.equal(await isAdminEmail(''), false)
  assert.equal(await isAdminOwner(null), false)
})

test('관리자 계정 조회는 1분 기억하고, 추가·비활성화하면 바로 다시 묻는다', async () => {
  forgetAdminAccountCache()
  const before = lookups
  await isAdminEmail('account@synthetic.invalid'); await isAdminEmail('account@synthetic.invalid')
  assert.equal(lookups - before, 1)
  accounts['account@synthetic.invalid'] = false
  assert.equal(await isAdminEmail('account@synthetic.invalid'), true, '기억한 동안은 그대로')
  forgetAdminAccountCache()
  assert.equal(await isAdminEmail('account@synthetic.invalid'), false)
  accounts['account@synthetic.invalid'] = true
})

test('관리자 계정 조회가 실패하면 열지 않는다(닫힌 쪽으로 실패)', async () => {
  forgetAdminAccountCache(); failLookups = true
  try { assert.equal(await isAdminEmail('account@synthetic.invalid'), false) } finally { failLookups = false; forgetAdminAccountCache() }
  assert.equal(await isAdminEmail('account@synthetic.invalid'), true, '실패는 기억하지 않는다')
})

test('공개 저장소이므로 소스에 실제 관리자 이메일을 적지 않는다', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'auth', 'admin.ts'), 'utf8')
  assert.doesNotMatch(source, /@(gmail|naver|kakao|daum|crea-m)\./)
  assert.doesNotMatch(source, /process\.env\.UMSH_ADMIN_EMAILS/)
})

test('관리자 리포트는 결제 없이 paid entitlement 로 표시된다', () => {
  const unlocked = applyAdminReportUnlock({ isPaid: false } as { isPaid?: boolean; entitlement?: string; unlockReason?: string })
  assert.equal(unlocked.isPaid, true)
  assert.equal(unlocked.entitlement, 'paid')
  assert.equal(unlocked.unlockReason, 'admin')
})
