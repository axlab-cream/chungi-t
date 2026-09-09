import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { getPaymentProduct } from '../../src/payment/catalog.js'
import { serviceHrefForKey } from '../../src/server/service-directory.js'

const read = (path:string) => readFileSync(new URL('../../'+path, import.meta.url), 'utf8')
const portal = read('사주/portal.html')
const visiblePortal = portal.replace(/<!--\s*[\s\S]*?-->/g, '')
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

test('the newyear card keeps its placement and links to its service', () => {
  const card=cards(portal).filter(isNewyear)[0] || ''
  assert.match(card, /^<a\b/)
  assert.match(card, /href="\/flow\/newyear\/01-step-1-story\/index.html"/)
  assert.match(card, /\bclass="[^"]*\bcoming-card\b[^\"]*\bservice-card\b[^\"]*\bis-live\b[^\"]*"/)
  assert.match(card, /\bdata-category="흐름"/)
  assert.match(card, /aria-label="[^"]*2027[^"]*열기[^"]*"/)
  assert.match(card, /<span class="coming-tag">SOON<\/span>/)
  assert.match(card, /<strong class="coming-card-name">내 2027년, 풀릴 각이야\?<\/strong>/)
  assert.doesNotMatch(card, /\bis-soon\b/)
})

test('other released cards and the wedding service card retain their placement', () => {
  const hrefs=cards(released[0] || '').map(card=>card.match(/\bhref="([^"]+)"/)?.[1])
  assert.deepEqual(hrefs, ['/me/lucky','/me/pass-angle','/work/quit','/match/cat'])
  const upcoming=cards(coming[0] || '')
  assert.equal(upcoming.length, 2)
  assert.match(upcoming[1], /^<a\b/)
  assert.match(upcoming[1], /href="\/day\/wedding"/)
  assert.match(upcoming[1], /umsh-wedding-card-bg\.webp/)
  assert.match(upcoming[1], /우리 결혼, 이날 해도 될까\?/)
  assert.match(upcoming[1], /is-live/)
  assert.match(upcoming[1], /<span class="coming-tag">SOON<\/span>/)
  for(const href of ['/cmdg/','/today/free','/love/this-year','/work/job-choice','/work/move','/money/save','/match/marry','/love/signal','/match/couple']) {
    assert.ok(visiblePortal.includes('href="'+href+'"'), 'unrelated home link missing: '+href)
  }
  assert.ok(!visiblePortal.includes('href="/place/home"'), '집 풍수 대표 카드가 공개되어 있습니다')
  assert.ok(!visiblePortal.includes('data-filter="풍수"'), '집 풍수 필터가 공개되어 있습니다')
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
