import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildTodayFortune } from '../../src/saju/today-fortune.js'
import { reviewToneCopy } from '../../src/report/tone-v2-review.js'
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
    assert.doesNotMatch(fortune.reading.summary, /홍길동|님/)
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
      assert.match(reading.summary, /[목화토금수]\([木火土金水]\)[은는] .+힘을 뜻하고/)
      assert.match(reading.summary, /태어난 날의 중심 기운/)
      for (const key of ['work', 'money', 'relationship', 'caution'] as const) {
        assert.ok(reading[key].length >= 100, `${fortune.today.relation}.${key} should have useful depth`)
        assert.equal(reading[key].split(/[.!?]+/).filter((sentence) => sentence.trim()).length, 3)
        assert.doesNotMatch(reading[key], /[\u3400-\u9fff]/, 'plain Korean guidance needs no unexplained Hanja')
      }
      assert.equal(reading.action.split(/[.!?]+/).filter((sentence) => sentence.trim()).length, 2)
      assert.match(reading.action, /^오늘의 결론은 .+거야\./)
      assert.match(reading.money, /안정적이라면|없다면|필요는 없어|없는 날이라면/)
      assert.match(reading.relationship, /평온하게|특별한 부탁이 없다면|좋은 관계라면|잘되어 있다면|특별한 부담 없이/)
      assert.doesNotMatch(JSON.stringify(reading), /실제 사건이나|예측한 결과|운을 깎|반드시 성공|금전의 이익도 크|반응이 부드럽습니다|위기가 찾아/)
      assert.equal(reading.zodiac?.text.split(/[.!?]+/).filter((sentence) => sentence.trim()).length, 2)
      for (const text of [reading.title, reading.summary, reading.work, reading.money, reading.relationship, reading.caution, reading.action, reading.zodiac!.text]) {
        assert.deepEqual(reviewToneCopy(text, 'today_fortune').issues, [], text)
      }
    }
    assert.deepEqual([...seenRelations].sort(), ['output', 'pressure', 'same', 'support', 'wealth'])
    assert.equal(seenElements.size, 5)
    // 요약은 그날의 일주(예: 갑오일)와 음양을 함께 말하므로 열흘이면 열 개다.
    assert.equal(summaries.size, 10)
    assert.equal(new Set(guidance.values()).size, 5)
  })

  it('reads differently on consecutive days even when the day element repeats', () => {
    // 2026-09-18 실제 문의: 갑오(甲午)일과 을미(乙未)일이 둘 다 목(木)이라 어제와 오늘 글이 같았다.
    // 천간의 음양·지지 장면이 갈라 주어야 한다. 60일 연속으로 하루도 앞날과 같지 않아야 하고,
    // 그러면서 문장 수·어조·한자 규칙은 그대로 지켜야 한다.
    const owner: UserBirthProfile = { ...profile, birth: { year: 1975, month: 9, day: 26, hour: 5, minute: 0, gender: 'male', calendar: 'solar' } }
    const sep17 = buildTodayFortune(owner, new Date('2026-09-17T03:00:00Z'))
    const sep18 = buildTodayFortune(owner, new Date('2026-09-18T03:00:00Z'))
    assert.equal(sep17.today.element, sep18.today.element, '같은 오행이 이어지는 이틀로 골라야 회귀가 잡힌다')
    for (const key of ['title', 'summary', 'work', 'money', 'relationship', 'caution', 'action'] as const) {
      assert.notEqual(sep17.reading[key], sep18.reading[key], `${key} 가 어제와 같다`)
    }
    assert.notDeepEqual(sep17.reading.score, sep18.reading.score)

    let previous: ReturnType<typeof buildTodayFortune> | undefined
    const zodiacTexts = new Set<string>()
    for (let offset = 0; offset < 60; offset += 1) {
      const fortune = buildTodayFortune(owner, new Date(Date.UTC(2026, 8, 1 + offset, 3)))
      const reading = fortune.reading
      zodiacTexts.add(reading.zodiac!.text)
      if (previous) {
        assert.notEqual(reading.work + reading.money + reading.relationship + reading.caution, previous.reading.work + previous.reading.money + previous.reading.relationship + previous.reading.caution, `${fortune.date.iso} 본문이 전날과 같다`)
        assert.notEqual(reading.action, previous.reading.action, `${fortune.date.iso} 결론이 전날과 같다`)
        // 띠운과 점수도 매일 바뀌어야 한다 — 오행 관계만 보던 때는 띠운이 60일에 다섯 종류였다.
        assert.notEqual(reading.zodiac!.text, previous.reading.zodiac!.text, `${fortune.date.iso} 띠운이 전날과 같다`)
        assert.notDeepEqual(reading.score, previous.reading.score, `${fortune.date.iso} 점수가 전날과 같다`)
      }
      // 하루의 천간이 내 일간에게 무엇인지(십성)와 지지가 내 기둥과 맺는 관계를 요약이 밝힌다.
      assert.match(reading.summary, /내 일간에게 오늘 천간은 (?:비견|겁재|식신|상관|편재|정재|편관|정관|편인|정인)이고,/)
      assert.match(reading.summary, /오늘 지지(?:가|는) 내 (?:기둥|[년월일시]지)/)
      assert.match(reading.summary, /^[가-힣]{2}\([㐀-鿿]{2}\)일, [양음]의 [목화토금수]\([木火土金水]\) 기운이/)
      for (const key of ['work', 'money', 'relationship', 'caution'] as const) {
        assert.equal(reading[key].split(/[.!?]+/).filter((sentence) => sentence.trim()).length, 3, `${fortune.date.iso}.${key}`)
        assert.ok(reading[key].length >= 100)
        assert.doesNotMatch(reading[key], /[㐀-鿿]/)
      }
      assert.equal(reading.action.split(/[.!?]+/).filter((sentence) => sentence.trim()).length, 2, `${fortune.date.iso}.action`)
      assert.match(reading.action, /^오늘의 결론은 .+거야\./)
      for (const text of [reading.title, reading.summary, reading.work, reading.money, reading.relationship, reading.caution, reading.action]) {
        assert.deepEqual(reviewToneCopy(text, 'today_fortune').issues, [], `${fortune.date.iso}: ${text}`)
      }
      previous = fortune
    }
    assert.equal(zodiacTexts.size, 60, '띠운이 60일 동안 날마다 달라야 한다')
  })

  it('같은 날이라도 사주가 다르면 다른 오늘운이 나온다', () => {
    // 오늘의 기둥만 보고 내 기둥을 보지 않으면 모든 사용자가 같은 글을 받는다. 십성과
    // 지지 관계(합·충·파·해)는 내 네 기둥과 견주므로 사람마다 갈린다(2026-09-18).
    const when = new Date('2026-09-18T03:00:00Z')
    const first = buildTodayFortune({ ...profile, birth: { ...profile.birth, year: 1975, month: 9, day: 26, hour: 5, gender: 'male' } }, when)
    const second = buildTodayFortune({ ...profile, birth: { ...profile.birth, year: 1994, month: 3, day: 11, hour: 9, gender: 'female' } }, when)
    assert.equal(first.today.pillar, second.today.pillar, '같은 날이면 일진은 같아야 한다')
    assert.notEqual(first.reading.summary, second.reading.summary, '사주가 달라도 요약이 같다')
    assert.notDeepEqual(first.reading.score, second.reading.score, '사주가 달라도 점수가 같다')
    assert.notEqual(first.reading.zodiac?.text, second.reading.zodiac?.text)
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
