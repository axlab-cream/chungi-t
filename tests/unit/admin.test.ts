import assert from 'node:assert/strict'
import test from 'node:test'
import { adminEmails, applyAdminReportUnlock, isAdminEmail, isAdminOwner } from '../../src/auth/admin.js'

test('기본 슈퍼관리자 이메일은 good1621@gmail.com 이다', () => {
  const previous = process.env.UMSH_ADMIN_EMAILS
  delete process.env.UMSH_ADMIN_EMAILS
  try {
    assert.ok(adminEmails().includes('good1621@gmail.com'))
    assert.ok(adminEmails().includes('axlabtest@gmail.com'))
    assert.equal(isAdminEmail('Good1621@gmail.com'), true)
    assert.equal(isAdminEmail('AxLabTest@gmail.com'), true)
    assert.equal(isAdminEmail('someone@example.com'), false)
    assert.equal(isAdminOwner({ email: 'good1621@gmail.com' }), true)
    assert.equal(isAdminOwner({ email: 'axlabtest@gmail.com' }), true)
  } finally {
    if (previous === undefined) delete process.env.UMSH_ADMIN_EMAILS
    else process.env.UMSH_ADMIN_EMAILS = previous
  }
})

test('UMSH_ADMIN_EMAILS 환경변수로 관리자를 추가할 수 있다', () => {
  const previous = process.env.UMSH_ADMIN_EMAILS
  process.env.UMSH_ADMIN_EMAILS = 'ops@axlab.com, extra@umsh.kr'
  try {
    assert.equal(isAdminEmail('ops@axlab.com'), true)
    assert.equal(isAdminEmail('extra@umsh.kr'), true)
  } finally {
    if (previous === undefined) delete process.env.UMSH_ADMIN_EMAILS
    else process.env.UMSH_ADMIN_EMAILS = previous
  }
})

test('관리자 리포트는 결제 없이 paid entitlement 로 표시된다', () => {
  const unlocked = applyAdminReportUnlock(
    { isPaid: false } as { isPaid?: boolean; entitlement?: string; unlockReason?: string },
    { email: 'good1621@gmail.com' },
  )
  assert.equal(unlocked.isPaid, true)
  assert.equal(unlocked.entitlement, 'paid')
  assert.equal(unlocked.unlockReason, 'admin')

  const locked = applyAdminReportUnlock(
    {} as { isPaid?: boolean },
    { email: 'user@example.com' },
  )
  assert.equal(locked.isPaid, undefined)
})
