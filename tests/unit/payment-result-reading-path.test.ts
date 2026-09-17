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
  love_this_year: '/love/this-year/06-step-6_1-report-detail/index.html',
  job_choice: '/work/job-choice/06-step-6_1-report-detail/index.html',
  cat_compatibility: '/match/cat/06-step-6_1-report-detail/index.html',
  lucky_color: '/me/lucky/06-step-6_1-report-detail/index.html',
  newyear_flow: '/flow/newyear/06-step-6_1-report-detail/index.html',
  wedding_day: '/day/wedding/06-step-6_1-report-detail/index.html',
  match_couple: '/match/couple/06-step-6_1-report-detail/index.html',
  marry_match: '/match/marry/06-step-6_1-report-detail/index.html',
  couple_signal: '/love/signal/06-step-6_1-report-detail/index.html',
  quit_fortune: '/work/quit/06-step-6_1-report-detail/index.html',
  pass_angle: '/me/pass-angle/06-step-6_1-report-detail/index.html',
  money_save: '/money/save/06-step-6_1-report-detail/index.html',
  work_move: '/work/move/06-step-6_1-report-detail/index.html',
  home_pungsu: '/place/home/06-step-6_1-report-detail/index.html',
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

test('money_save paid result opens the 06-1 interpretation list', () => {
  const href = paidReadingHref('money_save', '98515f23f9fb249e22c56ea023d5')
  assert.match(href, /\/money\/save\/06-step-6_1-report-detail\/index\.html/)
  assert.match(href, /reportId=98515f23f9fb249e22c56ea023d5/)
  assert.doesNotMatch(href, /04-step-4-report/)
})

test('every catalog product has a paid destination: 06-1 TOC or /r/:id', () => {
  const products = listPaymentProducts()
  assert.equal(products.length, Object.keys(TOC_PRODUCTS).length + READER_FALLBACK.length)
  for (const product of products) {
    const href = paidReadingHref(product.key, 'rid-test')
    const expectedToc = TOC_PRODUCTS[product.key]
    if (expectedToc) {
      assert.equal(readingPathForProduct(product.key)?.startsWith(expectedToc), true, product.key)
      assert.ok(href.includes(expectedToc), `${product.key} → ${href}`)
      assert.doesNotMatch(href, /04-step-4-report/)
    } else {
      assert.ok(READER_FALLBACK.includes(product.key), `unexpected product ${product.key}`)
      assert.equal(href, '/r/rid-test', product.key)
    }
  }
})
