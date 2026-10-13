import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatReferencePrice, replaceVisibleLocaleText, PRICE_REFERENCE } from '../../src/i18n/visible-locale-replacements.js'

test('reference prices use one documented rate and normal currency precision, not marketing prices', () => {
  assert.deepEqual(PRICE_REFERENCE, { krwPerUsd: 1340, jpyPerKrw: 0.118 })
  assert.equal(formatReferencePrice(9900, 'en'), 'Approx. $7.39 USD')
  assert.equal(formatReferencePrice(9900, 'ja'), '約 ¥1,168 JPY')
  assert.equal(formatReferencePrice(49900, 'en'), 'Approx. $37.24 USD')
  assert.equal(formatReferencePrice(49900, 'ja'), '約 ¥5,888 JPY')
  assert.equal(formatReferencePrice(0, 'en'), 'Approx. $0.00 USD')
  assert.equal(formatReferencePrice(0, 'ja'), '約 ¥0 JPY')
  assert.equal(formatReferencePrice(1, 'en'), 'Approx. $0.00 USD')
  assert.throws(() => formatReferencePrice(Number.NaN, 'en'), /finite KRW/)
})

test('prices render locally in text and accessible display attributes while every machine price attribute stays original', () => {
  const input = '<html lang="en"><body><main><a href="/payment?amount=9900&coupon=9900원" data-price="9900" data-amount="9900" aria-label="Read 9,900 KRW"><b>9,900원</b></a><p data-price="49,900 KRW" title="Price: 49,900원">49,900 KRW</p><img alt="9,900 KRW" src="/assets/9900원.png"></main></body></html>'
  const out = replaceVisibleLocaleText(input, 'en')
  assert.match(out, /<b>Approx\. \$7\.39 USD<\/b>/)
  assert.match(out, /aria-label="Read Approx\. \$7\.39 USD"/)
  assert.match(out, /data-price="49,900 KRW"/)
  assert.match(out, /title="Price: Approx\. \$37\.24 USD"/)
  assert.match(out, /alt="Approx\. \$7\.39 USD"/)
  assert.ok(out.includes('href="/payment?amount=9900&coupon=9900원"'))
  assert.ok(out.includes('data-price="9900" data-amount="9900"'))
  assert.ok(out.includes('src="/assets/9900원.png"'))
  assert.doesNotMatch(out, /umsh-currency-disclosure|USD amounts are approximate references|Checkout charges Korean won/)
})

test('JS purchase payloads, coupons, CSS and structured-data offers are not converted', () => {
  const script = '<script>const amount=9900; const productId="9900원"; const coupon={amount:1000,id:"1000 KRW"}; fetch("/api/payment",{body:JSON.stringify({amount:9900,currency:"KRW"})}); const label="9,900 KRW";</script>'
  const jsonLd = '<script type="application/ld+json">{"@type":"Offer","price":"9900","priceCurrency":"KRW","name":"9,900 KRW"}</script>'
  const microdata = '<meta itemprop="price" content="9900"><meta itemprop="priceCurrency" content="KRW">'
  const style = '<style>.price:after{content:"9,900 KRW"}</style>'
  const comment = '<!-- reference: 9900 KRW -->'
  const out = replaceVisibleLocaleText(script + jsonLd + microdata + style + comment + '<b>9,900 KRW</b>', 'ja')
  for (const original of [script, jsonLd, microdata, style, comment]) assert.ok(out.includes(original), original)
  assert.ok(out.includes('<b>約 ¥1,168 JPY</b>'))
  const schema = JSON.parse(out.match(/<script type="application\/ld\+json">([^]*?)<\/script>/)![1])
  assert.equal(schema.price, '9900')
  assert.equal(schema.priceCurrency, 'KRW')
  assert.doesNotMatch(out, /umsh-currency-disclosure|円の金額は参考換算です|決済は日本円ではなく韓国ウォン/)
})

test('discounted totals, free coupons and ranges use the same converter with no minimum', () => {
  const out = replaceVisibleLocaleText('<p>4,900–24,900 KRW</p><p>0원</p><p>-1,000 KRW</p><p>Final: 8,900 KRW</p><p>KRW 1,340 / ₩1,340</p>', 'en')
  assert.match(out, /Approx\. \$3\.66 USD – Approx\. \$18\.58 USD/)
  assert.match(out, /<p>Approx\. \$0\.00 USD<\/p>/)
  assert.match(out, /Approx\. −\$0\.75 USD/)
  assert.match(out, /Final: Approx\. \$6\.64 USD/)
  assert.match(out, /Approx\. \$1\.00 USD \/ Approx\. \$1\.00 USD/)
})

test('conversion is idempotent without inserting the internal currency-reference note', () => {
  for (const locale of ['en', 'ja'] as const) {
    const once = replaceVisibleLocaleText('<html><body><main><h1>Fortune Shop</h1><p>9,900 KRW</p></main></body></html>', locale)
    const twice = replaceVisibleLocaleText(once, locale)
    assert.equal(twice, once)
    assert.doesNotMatch(once, /umsh-currency-disclosure/)
    if (locale === 'en') assert.ok(once.includes('<h1>Fate Shop</h1>'))
  }
})

test('Korean content is byte-for-byte untouched and technical-only amounts add no disclosure', () => {
  const ko = '<html lang="ko"><body><h1>운명상회</h1><p>9,900원</p><script>const amount=9900;</script></body></html>'
  assert.equal(replaceVisibleLocaleText(ko, 'ko'), ko)
  const machine = '<script>const label="9,900 KRW";</script><meta itemprop="price" content="9900"><meta itemprop="priceCurrency" content="KRW">'
  assert.equal(replaceVisibleLocaleText(machine, 'en'), machine)
})

test('previously generated currency-reference asides are removed without touching other content or script data', () => {
  for (const locale of ['en', 'ja'] as const) {
    const legacy = '<aside id="umsh-currency-disclosure" aria-label="Payment currency">USD amounts are approximate references. Checkout charges Korean won (KRW), not USD.</aside>'
    const legacySingleQuote = "<aside id='umsh-currency-disclosure'>円の金額は参考換算です。</aside>"
    const script = '<script>const example = `<aside id="umsh-currency-disclosure">9900 KRW</aside>`; const payload={amount:9900,currency:"KRW"};</script>'
    const legacyWithAttributes = `<aside class="reference" title='id="not-the-notice"' id = 'umsh-currency-disclosure'>Internal reference note</aside>`
    const other = '<aside id="customer-help">Customer help</aside>'
    const unrelated = [
      '<aside data-id="umsh-currency-disclosure">Customer help with data-id</aside>',
      `<aside title='Example id="umsh-currency-disclosure"'>Customer help with quoted id text</aside>`,
      `<div data-template='<aside id="umsh-currency-disclosure">Template example</aside>'>Customer template</div>`,
    ]
    const input = '<html><body><main><p>Reading description</p>' + legacy + legacySingleQuote + legacyWithAttributes + other + unrelated.join('') + script + '</main></body></html>'
    const out = replaceVisibleLocaleText(input, locale)
    assert.ok(!out.includes(legacy))
    assert.ok(!out.includes(legacySingleQuote))
    assert.ok(!out.includes(legacyWithAttributes))
    for (const content of unrelated) assert.ok(out.includes(content), 'Unrelated attributes and quoted examples must remain intact')
    assert.ok(out.includes('<p>Reading description</p>'))
    assert.ok(out.includes(other))
    assert.ok(out.includes(script), 'Example strings and payment payloads in scripts must remain byte-for-byte intact')
    assert.equal(replaceVisibleLocaleText(out, locale), out)
    assert.equal(replaceVisibleLocaleText(input, 'ko'), input)
  }
})
