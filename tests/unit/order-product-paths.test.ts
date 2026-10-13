import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { PAYMENT_PATH_PREFIXES } from '../../src/payment/catalog.js'

const orders = readFileSync(new URL('../../사주/js/orders.js', import.meta.url), 'utf8')
const accountPages = readFileSync(new URL('../../사주/js/umsh-account-pages.js', import.meta.url), 'utf8')
const refunds = readFileSync(new URL('../../사주/js/refunds.js', import.meta.url), 'utf8')

// 결제 내역의 "풀이 화면 열기"는 상품별 화면 주소 표를 쓴다. 표에 없는 상품은 홈으로 가 버린다(2026-10-12 9개 누락).
describe('결제 내역 상품 화면 주소', () => {
  for (const [path, key] of PAYMENT_PATH_PREFIXES) {
    const expected = key === 'cmdg' ? '/cmdg/' : path
    it(`${key} → ${expected}`, () => {
      const pattern = new RegExp(key + ": *'" + expected.replace(/[/-]/g, (c) => '[' + c + ']') + "'")
      assert.match(orders, pattern, 'orders.js')
      assert.match(accountPages, pattern, 'umsh-account-pages.js')
    })
  }

  it('환불 화면의 문의 링크는 1:1 문의로 간다', () => {
    assert.doesNotMatch(refunds, /\/support#inquiry/)
    assert.match(refunds, /href="\/inquiries"/)
  })
})
