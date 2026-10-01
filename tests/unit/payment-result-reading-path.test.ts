import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { listPaymentProducts } from '../../src/payment/catalog.js'
import { paidReadingHref, readingPathForProduct } from '../../src/server/service-directory.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const resultSource = readFileSync(join(root, '사주', 'js', 'payment-result.js'), 'utf8')

const TOC_PRODUCTS: Record<string, string> = {
  cheonmyeong_consultation: '/consultation/',
  love_this_year: '/love/this-year/05-step-5-chat/chat.html',
  job_choice: '/work/job-choice/05-step-5-chat/chat.html',
  cat_compatibility: '/match/cat/05-step-5-chat/chat.html',
  lucky_color: '/me/lucky/05-step-5-chat/chat.html',
  newyear_flow: '/flow/newyear/05-step-5-chat/chat.html',
  wedding_day: '/day/wedding/05-step-5-chat/chat.html',
  match_couple: '/match/couple/05-step-5-chat/chat.html',
  marry_match: '/match/marry/05-step-5-chat/chat.html',
  couple_signal: '/love/signal/05-step-5-chat/chat.html',
  quit_fortune: '/work/quit/05-step-5-chat/chat.html',
  pass_angle: '/me/pass-angle/05-step-5-chat/chat.html',
  money_save: '/money/save/05-step-5-chat/chat.html',
  work_move: '/work/move/05-step-5-chat/chat.html',
  home_pungsu: '/place/home/05-step-5-chat/chat.html',
  cmdg: '/cmdg/06-step-6_1-report-detail/index.html',
  work_job: '/work/job/06-step-6_1-report-detail/index.html',
  love_mind: '/love/mind/06-step-6_1-report-detail/index.html',
  love_again: '/love/again/06-step-6_1-report-detail/index.html',
  love_spouse: '/love/spouse/06-step-6_1-report-detail/index.html',
}

const READER_FALLBACK: string[] = []

test('payment result copy sends paid customers to the full reading, not more input', () => {
  assert.match(resultSource, /전체 풀이보기/)
  assert.doesNotMatch(resultSource, /풀이 이어서 입력하기/)
  assert.match(resultSource, /readingPath/)
  assert.doesNotMatch(resultSource, /pending\?\.returnTo/)
})

test('money_save paid result opens the 05 table of contents', () => {
  const href = paidReadingHref('money_save', '98515f23f9fb249e22c56ea023d5')
  assert.match(href, /\/money\/save\/05-step-5-chat\/chat\.html/)
  assert.match(href, /reportId=98515f23f9fb249e22c56ea023d5/)
  assert.doesNotMatch(href, /04-step-4-report/)
})

test('standard funnel checkout returns through step 04 before the paid TOC', () => {
  for (const product of listPaymentProducts()) {
    if (!TOC_PRODUCTS[product.key]?.includes('/05-step-5-chat/')) continue
    assert.match(product.returnPath, /\/04-step-4-report\/index\.html$/, product.key)
  }
})

test('every catalog product has a paid destination: 05 TOC or registered reader', () => {
  const products = listPaymentProducts()
  assert.equal(products.length, Object.keys(TOC_PRODUCTS).length + READER_FALLBACK.length)
  for (const product of products) {
    const href = paidReadingHref(product.key, 'rid-test')
    const expectedToc = TOC_PRODUCTS[product.key]
    if (expectedToc) {
      assert.equal(readingPathForProduct(product.key)?.startsWith(expectedToc), true, product.key)
      assert.ok(href.includes(expectedToc), `${product.key} → ${href}`)
      if (expectedToc.includes('/05-step-5-chat/')) assert.match(href, /#step-5-chat$/)
      assert.doesNotMatch(href, /04-step-4-report/)
    } else {
      assert.ok(READER_FALLBACK.includes(product.key), `unexpected product ${product.key}`)
      assert.equal(href, '/r/rid-test', product.key)
    }
  }
})
