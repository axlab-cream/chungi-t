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
const released = sections.filter(section=>/<span>\s*RELEASED NOW\s*<\/span>/.test(section))
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
  assert.deepEqual(hrefs, ['/work/quit','/match/cat'])
  for(const href of ['/cmdg/','/today/free','/love/this-year','/work/job-choice','/work/move','/money/save','/match/marry','/love/signal','/match/couple']) {
    assert.ok(visible.includes('href="'+href+'"'), 'unrelated home link missing: '+href)
  }
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
  assert.equal(product?.returnPath, '/flow/newyear')
  assert.equal(serviceHrefForKey('newyear_flow'), '/flow/newyear')
})
