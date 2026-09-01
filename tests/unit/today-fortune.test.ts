import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildTodayFortune } from '../../src/saju/today-fortune.js'
import { buildUserBirthProfile } from '../../src/user/profile-store.js'

describe('[TASK] 오늘운 테스트 하네스', () => {
  it('저장된 사용자 사주 프로필로 KST 기준 오늘운을 만든다', () => {
    const profile = buildUserBirthProfile({
      owner: { id: '11111111-1111-4111-8111-111111111111' },
      name: '홍길동',
      birth: {
        year: 1990,
        month: 5,
        day: 15,
        hour: 14,
        minute: 30,
        gender: 'female',
        calendar: 'solar',
      },
      birthTimeKnown: true,
      context: { target: '본인' },
    })

    const fortune = buildTodayFortune(profile, new Date('2026-08-31T03:00:00.000Z'))

    assert.equal(fortune.date.iso, '2026-08-31')
    assert.equal(fortune.profile.name, '홍길동')
    assert.equal(fortune.user.dayMaster, '庚')
    assert.ok(fortune.today.pillar.length >= 2)
    assert.ok(fortune.reading.summary.includes('홍길동'))
    assert.ok(fortune.reading.caution.length > 0)
    assert.ok(fortune.reading.score.total >= 0)
    assert.ok(fortune.reading.score.total <= 100)
    assert.equal(fortune.reading.details.work.score, fortune.reading.score.work)
    assert.equal(fortune.reading.details.money.text, fortune.reading.money)
    assert.ok(fortune.reading.details.caution.caution?.length)
  })
})
