import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildTodayFortune } from '../../src/saju/today-fortune.js'
import type { UserBirthProfile } from '../../src/user/profile-store.js'

const profile: UserBirthProfile = {
  userId: '11111111-1111-4111-8111-111111111111', name: '홍길동',
  birth: { year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: 'female', calendar: 'solar' },
  birthTimeKnown: true, context: { target: '본인' }, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
}

describe('오늘운 v3: readable deterministic daily guidance', () => {
  it('uses the saved birth profile and keeps compatibility detail fields consistent', () => {
    const fortune = buildTodayFortune(profile, new Date('2026-08-31T03:00:00.000Z'))
    assert.equal(fortune.date.iso, '2026-08-31')
    assert.equal(fortune.profile.name, '홍길동')
    assert.equal(fortune.user.dayMaster, '庚')
    assert.ok(fortune.today.pillar.length >= 2)
    assert.ok(fortune.reading.summary.includes('홍길동'))
    assert.ok(fortune.reading.score.total >= 0 && fortune.reading.score.total <= 100)
    for (const key of ['work', 'money', 'relationship', 'caution'] as const) {
      assert.equal(fortune.reading.details[key].score, fortune.reading.score[key])
      assert.equal(fortune.reading.details[key].text, fortune.reading[key])
      assert.equal(fortune.reading.details[key].opportunity, undefined)
      assert.equal(fortune.reading.details[key].caution, undefined)
    }
  })

  it('is identical within a KST day, and changes exactly at KST midnight', () => {
    const morning = buildTodayFortune(profile, new Date('2026-09-06T15:00:00.000Z'))
    const evening = buildTodayFortune(profile, new Date('2026-09-07T14:59:59.999Z'))
    const next = buildTodayFortune(profile, new Date('2026-09-07T15:00:00.000Z'))
    assert.deepEqual(morning, evening)
    assert.equal(morning.date.iso, '2026-09-07')
    assert.equal(next.date.iso, '2026-09-08')
    assert.notEqual(morning.today.pillar, next.today.pillar)
    assert.deepEqual(next, buildTodayFortune(profile, new Date('2026-09-07T15:00:00.000Z')))
  })

  it('reaches all five element relationships with substantial non-alarmist guidance and explained Hanja', () => {
    const seenRelations = new Set<string>()
    const seenElements = new Set<string>()
    const summaries = new Set<string>()
    const guidance = new Map<string, string>()
    for (let day = 1; day <= 10; day += 1) {
      const fortune = buildTodayFortune(profile, new Date(`2026-09-${String(day).padStart(2, '0')}T03:00:00Z`))
      const reading = fortune.reading
      seenRelations.add(fortune.today.relation)
      seenElements.add(fortune.today.element)
      summaries.add(reading.summary)
      guidance.set(fortune.today.relation, reading.work)
      assert.match(reading.summary, /[목화토금수]\([木火土金水]\)[은는] .+힘을 뜻하며/)
      assert.match(reading.summary, /태어난 날의 중심 기운/)
      for (const key of ['work', 'money', 'relationship', 'caution'] as const) {
        assert.ok(reading[key].length >= 100, `${fortune.today.relation}.${key} should have useful depth`)
        assert.equal(reading[key].split(/[.!?]+/).filter((sentence) => sentence.trim()).length, 3)
        assert.doesNotMatch(reading[key], /[\u3400-\u9fff]/, 'plain Korean guidance needs no unexplained Hanja')
      }
      assert.equal(reading.action.split(/[.!?]+/).filter((sentence) => sentence.trim()).length, 2)
      assert.match(reading.action, /^오늘의 결론은 .+것입니다\./)
      assert.match(reading.money, /안정적이라면|없다면|필요는 없습니다|없는 날이라면/)
      assert.match(reading.relationship, /평온하게|특별한 부탁이 없다면|좋은 관계라면|잘되어 있다면|특별한 부담 없이/)
      assert.doesNotMatch(JSON.stringify(reading), /실제 사건이나|예측한 결과|운을 깎|반드시 성공|금전의 이익도 크|반응이 부드럽습니다|위기가 찾아/)
      assert.equal(reading.zodiac?.text.split(/[.!?]+/).filter((sentence) => sentence.trim()).length, 2)
    }
    assert.deepEqual([...seenRelations].sort(), ['output', 'pressure', 'same', 'support', 'wealth'])
    assert.equal(seenElements.size, 5)
    assert.equal(summaries.size, 5)
    assert.equal(new Set(guidance.values()).size, 5)
  })

  it('labels all twelve zodiac years conventionally, including January births before 입춘', () => {
    const animals = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지']
    const zodiacReadings = new Set<string>()
    for (let index = 0; index < animals.length; index += 1) {
      const year = 1984 + index
      const fortune = buildTodayFortune({ ...profile, birth: { ...profile.birth, year, month: 1, day: 1 } }, new Date('2026-09-07T03:00:00Z'))
      const zodiac = fortune.reading.zodiac!
      assert.equal(zodiac.birthYear, year)
      assert.equal(zodiac.animal, animals[index])
      assert.equal(zodiac.basis, 'birth-year')
      assert.equal(zodiac.title, `${year}년생 ${animals[index]}띠 · 출생연도 기준`)
      assert.ok(zodiac.text.length >= 75)
      zodiacReadings.add(zodiac.text)
    }
    assert.equal(zodiacReadings.size, 12)
    const requested = buildTodayFortune({ ...profile, birth: { ...profile.birth, year: 1975 } }, new Date('2026-09-07T03:00:00Z'))
    assert.equal(requested.reading.zodiac?.animal, '토끼')
  })

  it('uses the supplied lunar birth year for the labeled birth-year guide and preserves unknown time', () => {
    const lunar = { ...profile, birth: { ...profile.birth, year: 1995, month: 1, day: 1, calendar: 'lunar' as const }, birthTimeKnown: false }
    const fortune = buildTodayFortune(lunar, new Date('2026-09-07T03:00:00Z'))
    assert.equal(fortune.profile.birthTimeKnown, false)
    assert.equal(fortune.reading.zodiac?.birthYear, 1995)
    assert.equal(fortune.reading.zodiac?.animal, '돼지')
  })
})
