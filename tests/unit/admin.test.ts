import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { adminEmails, applyAdminReportUnlock, isAdminEmail, isAdminOwner } from '../../src/auth/admin.js'

test('코드에 기본 관리자 이메일이 없다. 환경변수가 비면 아무도 무료로 열지 못한다', () => {
  const previous = process.env.UMSH_ADMIN_EMAILS
  delete process.env.UMSH_ADMIN_EMAILS
  try {
    assert.deepEqual(adminEmails(), [])
    assert.equal(isAdminEmail('qa@synthetic.invalid'), false)
    assert.equal(isAdminOwner({ email: 'qa@synthetic.invalid' }), false)
  } finally {
    if (previous === undefined) delete process.env.UMSH_ADMIN_EMAILS
    else process.env.UMSH_ADMIN_EMAILS = previous
  }
})

test('공개 저장소이므로 소스에 실제 관리자 이메일을 적지 않는다', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'auth', 'admin.ts'), 'utf8')
  assert.doesNotMatch(source, /@(gmail|naver|kakao|daum|crea-m)\./)
})

test('UMSH_ADMIN_EMAILS 환경변수로 관리자를 추가할 수 있다', () => {
  const previous = process.env.UMSH_ADMIN_EMAILS
  process.env.UMSH_ADMIN_EMAILS = 'ops@axlab.com, extra@umsh.kr'
  try {
    assert.equal(isAdminEmail('ops@axlab.com'), true)
    assert.equal(isAdminEmail('extra@umsh.kr'), true)
    assert.equal(isAdminEmail('EXTRA@umsh.kr'), true)
    assert.equal(isAdminEmail('someone@example.com'), false)
  } finally {
    if (previous === undefined) delete process.env.UMSH_ADMIN_EMAILS
    else process.env.UMSH_ADMIN_EMAILS = previous
  }
})

test('관리자 리포트는 결제 없이 paid entitlement 로 표시된다', () => {
  const previous = process.env.UMSH_ADMIN_EMAILS
  process.env.UMSH_ADMIN_EMAILS = 'qa@synthetic.invalid'
  try {
    const unlocked = applyAdminReportUnlock(
      { isPaid: false } as { isPaid?: boolean; entitlement?: string; unlockReason?: string },
      { email: 'QA@synthetic.invalid' },
    )
    assert.equal(unlocked.isPaid, true)
    assert.equal(unlocked.entitlement, 'paid')
    assert.equal(unlocked.unlockReason, 'admin')

    const locked = applyAdminReportUnlock(
      {} as { isPaid?: boolean },
      { email: 'user@example.com' },
    )
    assert.equal(locked.isPaid, undefined)
  } finally {
    if (previous === undefined) delete process.env.UMSH_ADMIN_EMAILS
    else process.env.UMSH_ADMIN_EMAILS = previous
  }
})
