import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const reader = readFileSync(new URL('../../사주/js/umsh-report-access.js', import.meta.url), 'utf8')

const expectedTitles = [
  '올해, 연애가 시작될까?',
  '나는 어떤 사람에게 끌릴까?',
  '언제 사람을 만나기 쉬울까?',
  '나와 잘 맞는 사람의 특징',
  '달마다 연애운이 어떻게 달라질까?',
  '썸이 연애로 바뀌는 순간',
  '좋은 신호를 놓치는 내 습관',
  '그 사람과 나는 잘 맞을까?',
  '나만 더 좋아하는 건 아닐까?',
  '올해 연애를 시작하는 방법'
]

test('올해 연애운 10개 목차는 계산 용어 대신 쉬운 생활 언어를 쓴다', () => {
  for (const title of expectedTitles) assert.ok(reader.includes(`'${title}'`), `쉬운 제목이 없다: ${title}`)
  assert.match(reader, /canonical\(reportServiceKey\(payload\)\) === 'love_this_year'/)
  assert.match(reader, /LOVE_THIS_YEAR_CARD_TITLES\[section\.id\]/)
})

test('목차 제목에는 한자·천간지지·전문 명리 용어를 넣지 않는다', () => {
  for (const title of expectedTitles) {
    assert.doesNotMatch(title, /[甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥]/)
    assert.doesNotMatch(title, /도화|배우자성|관계궁|기운|사주/)
    assert.ok(title.length <= 20, `모바일에서 긴 제목: ${title}`)
  }
})
