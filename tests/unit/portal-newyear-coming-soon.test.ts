import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { getPaymentProduct } from '../../src/payment/catalog.js'
import { serviceHrefForKey } from '../../src/server/service-directory.js'

const read = (path:string) => readFileSync(new URL('../../'+path, import.meta.url), 'utf8')
const portal = read('사주/portal.html')
const title = '내 2027년, 풀릴 각이야?'
const sections = [...portal.matchAll(/<section\b[^>]*class="[^"]*\bsection-block\b[^"]*"[^>]*>[\s\S]*?<\/section>/g)].map(match=>match[0])
const cards = (html:string) => [...html.matchAll(/<(a|button)\b[^>]*class="[^"]*\bservice-card\b[^"]*"[^>]*>[\s\S]*?<\/\1>/g)].map(match=>match[0])
const isNewyear = (card:string) => card.includes(title) || card.includes('umsh-newyear-card-bg.webp')
const released = sections.filter(section=>/<span>\s*RELEASED NOW\s*<\/span>/.test(section))
const coming = sections.filter(section=>/<span>\s*COMING SOON\s*<\/span>/.test(section))

test('the home newyear card appears only once and only first in COMING SOON', () => {
  assert.equal(released.length, 1)
  assert.equal(coming.length, 1)
  assert.equal(cards(released[0]).filter(isNewyear).length, 0)
  assert.doesNotMatch(released[0], /umsh-newyear-card-bg|내 2027년/)
  const matches=cards(portal).filter(isNewyear)
  assert.equal(matches.length, 1)
  assert.equal(cards(coming[0])[0], matches[0])
  assert.ok(portal.indexOf(coming[0]) > portal.indexOf(released[0]))
  assert.equal((portal.match(/src="\/assets\/umsh-newyear-card-bg\.webp"/g) || []).length, 1)
})

test('the upcoming newyear card is now an open link to its own detail page', () => {
  // 준비 중이 아니라 판매 중이다. 자리와 썸네일은 그대로 두고 SOON 배지만 걷어내,
  // 누르면 상세 페이지로 들어가야 한다.
  const card=cards(portal).filter(isNewyear)[0] || ''
  assert.match(card, /^<a\b/)
  assert.match(card, /\bclass="[^"]*\bcoming-card\b[^"]*\bservice-card\b[^"]*\bis-live\b[^"]*"/)
  assert.match(card, /\bhref="\/flow\/newyear"/)
  assert.match(card, /\bdata-category="흐름"/)
  assert.match(card, /aria-label="[^"]*2027[^"]*이 풀이 보기[^"]*"/)
  assert.match(card, /<strong class="coming-card-name">내 2027년, 풀릴 각이야\?<\/strong>/)
  assert.match(card, /src="\/assets\/umsh-newyear-card-bg\.webp"/)
  assert.doesNotMatch(card, /\bis-soon\b|coming-tag|준비 중인 서비스|\btype="button"/)
  // 화면 어디에도 준비 중 표시가 남아 있으면 안 된다.
  assert.equal((portal.match(/class="coming-tag"/g) || []).length, 0)
  assert.equal((portal.match(/\bis-soon\b/g) || []).length, 0)
})

test('other released cards and the wedding card retain their placement', () => {
  const hrefs=cards(released[0] || '').map(card=>card.match(/\bhref="([^"]+)"/)?.[1])
  assert.deepEqual(hrefs, ['/me/lucky','/me/pass-angle','/work/quit','/match/cat'])
  const upcoming=cards(coming[0] || '')
  assert.equal(upcoming.length, 2)
  assert.match(upcoming[1], /^<a\b/)
  assert.match(upcoming[1], /\bhref="\/day\/wedding"/)
  assert.match(upcoming[1], /umsh-wedding-card-bg\.webp/)
  assert.match(upcoming[1], /우리 결혼, 이날 해도 될까\?/)
  assert.match(upcoming[1], /\bis-live\b/)
  assert.doesNotMatch(upcoming[1], /\bis-soon\b|coming-tag/)
  for(const href of ['/cmdg/','/today/free','/love/this-year','/work/job-choice','/place/home','/work/move','/money/save','/match/marry','/love/signal','/match/couple']) {
    assert.ok(portal.includes('href="'+href+'"'), 'unrelated home link missing: '+href)
  }
})

test('homepage placement does not remove direct service, saved-result or payment routes', () => {
  const app=read('src/server/app.ts')
  assert.match(app, /app\.get\(\['\/flow\/newyear',/)
  assert.match(app, /app\.post\('\/api\/flow\/newyear\/analyze'/)
  assert.match(app, /app\.get\('\/r\/:resultId'/)
  for(const alias of ['input','report','chat','detail']) assert.ok(app.includes("'/flow/newyear/"+alias+"'"))
  const product=getPaymentProduct('newyear_flow')
  assert.equal(product?.title, title)
  assert.equal(product?.amount, 19900)
  assert.equal(product?.returnPath, '/flow/newyear')
  assert.equal(serviceHrefForKey('newyear_flow'), '/flow/newyear')
})
