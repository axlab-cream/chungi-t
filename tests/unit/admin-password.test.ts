import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { hashAdminPassword, verifyAdminPassword } from '../../src/auth/admin-password.js'

describe('관리자 비밀번호 해시', () => {
  it('같은 비밀번호만 scrypt 해시를 통과시킨다', async () => {
    const stored = await hashAdminPassword('fixture-password-123!')
    assert.match(stored, /^scrypt\$[^$]+\$[^$]+$/)
    assert.equal(await verifyAdminPassword('fixture-password-123!', stored), true)
    assert.equal(await verifyAdminPassword('wrong-password', stored), false)
  })

  it('깨진 해시는 로그인에 사용할 수 없다', async () => {
    assert.equal(await verifyAdminPassword('fixture-password-123!', 'not-a-valid-hash'), false)
  })
})
