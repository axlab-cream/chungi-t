import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { getPaymentProduct } from '../../src/payment/catalog.js'
import { serviceHrefForKey } from '../../src/server/service-directory.js'

const read = (path:string) => readFileSync(new URL('../../'+path, import.meta.url), 'utf8')
const portal = read('사주/portal.html')
const visible = portal.replace(/<!--\s*[\s\S]*?-->/g, '')
const title = '내 2027년, 풀릴 각이야?'
const sections = [...visible.matchAll(/<section\b[^>]*class="[^"]*\bsection-block\b[^"]*"[^>]*>[\s\S]*?<\/section>/g)].map(match=>match[0])
const cards = (html:string) => [...html.matchAll(/<(a|button)\b[^>]*class="[^"]*\bservice-card\b[^"]*"[^>]*>[\s\S]*?<\/\1>/g)].map(match=>match[0])
const isNewyear = (card:string) => card.includes(title) || card.includes('umsh-newyear-card-bg.webp')
// 2026-10-14 영어 라벨(RELEASED NOW)을 빼고 한국어 제목만 남겼다. 궁합 섹션은 제목으로 찾는다.
const released = sections.filter(section=>/<h2>\s*인연과 악연 사이\s*<\/h2>/.test(section))
const coming = sections.filter(section=>/<span>\s*COMING SOON\s*<\/span>/.test(section))

test('paused coming-soon and lucky/pass-angle cards are commented out of the live portal', () => {
  assert.equal(released.length, 1)
  assert.equal(coming.length, 0)
  assert.equal(cards(visible).filter(isNewyear).length, 0)
  assert.doesNotMatch(visible, /href="\/flow\/newyear"/)
  assert.doesNotMatch(visible, /href="\/day\/wedding"/)
  assert.doesNotMatch(visible, /href="\/me\/lucky"/)
  assert.doesNotMatch(visible, /href="\/me\/pass-angle"/)
  assert.doesNotMatch(visible, /href="\/place\/home"/)
  assert.doesNotMatch(visible, /곧 다가올 운명/)
})

test('released now keeps the remaining live cards', () => {
  const hrefs=cards(released[0] || '').map(card=>card.match(/\bhref="([^"]+)"/)?.[1])
  assert.deepEqual(hrefs, ['/match/couple'])
  assert.doesNotMatch(visible, /href="\/work\/quit"|href="\/match\/cat"/)
  assert.doesNotMatch(visible, /말 못 한 마음이 있다면/)
  for(const href of ['/cmdg/','/today/free','/love/this-year','/work/job-choice','/work/move','/money/save','/match/marry','/love/signal','/match/couple']) {
    assert.ok(visible.includes('href="'+href+'"'), 'unrelated home link missing: '+href)
  }
})

// 2026-10-14 홈 개편: 소개 문단(home-hero)을 지우고, 오늘운 무료 카드는 대표 포스터 바로 아래로 옮겼다.
test('daily free fortune ticket sits right below the home poster rail', () => {
  const ticket = '<a class="today-ticket service-card is-live"'
  const ticketIndex = visible.indexOf(ticket)
  const dotsIndex = visible.indexOf('<nav class="poster-dots"')
  const weeklyIndex = visible.indexOf('<section class="section-block weekly-free"')

  assert.ok(ticketIndex >= 0, '오늘운 무료 카드가 없다')
  assert.ok(dotsIndex >= 0, '대표 포스터 위치 점이 없다')
  assert.equal(visible.indexOf('<section class="home-hero"'), -1, '소개 문단은 홈에서 빠졌다')
  assert.ok(dotsIndex < ticketIndex && ticketIndex < weeklyIndex, '오늘운 무료 카드는 대표 포스터 바로 아래, 무료 테스트 위에 있어야 한다')
  assert.equal(visible.split(ticket).length - 1, 1, '오늘운 무료 카드는 한 번만 있어야 한다')
  assert.match(visible.slice(ticketIndex, weeklyIndex), /href="\/today\/free"/)
  assert.match(visible.slice(ticketIndex, weeklyIndex), /aria-label="오늘 네게 들어오는 운 보기"/)
})

test('homepage hold does not delete payment catalog or admin href mapping', () => {
  const app=read('src/server/app.ts')
  assert.match(app, /app\.get\(\['\/flow\/newyear',/)
  assert.match(app, /app\.post\('\/api\/flow\/newyear\/analyze'/)
  assert.match(app, /app\.get\('\/r\/:resultId'/)
  for(const alias of ['input','report','chat','detail']) assert.ok(app.includes("'/flow/newyear/"+alias+"'"))
  const product=getPaymentProduct('newyear_flow')
  assert.equal(product?.title, title)
  assert.equal(product?.amount, 19900)
  assert.equal(product?.returnPath, '/flow/newyear/04-step-4-report/index.html')
  assert.equal(serviceHrefForKey('newyear_flow'), '/flow/newyear')
})
