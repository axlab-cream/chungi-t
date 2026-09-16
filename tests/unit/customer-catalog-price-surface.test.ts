import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { listPaymentProducts } from '../../src/payment/catalog.js'

const SAJU = join(process.cwd(), '사주')

function walkHtml(dir: string, found: string[] = []): string[] {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, name.name)
    if (name.isDirectory()) {
      if (name.name !== 'node_modules') walkHtml(path, found)
    } else if (name.name.endsWith('.html')) found.push(path)
  }
  return found
}

function won(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`
}

test('고객 HTML 에 QA_RESULT 가 실리지 않는다', () => {
  const leaks = walkHtml(SAJU).filter((file) => readFileSync(file, 'utf8').includes('id="QA_RESULT"'))
  assert.deepEqual(leaks, [], '내부 QA 메타데이터가 고객 페이지에 남아 있다')
})

test('홈 카드·상세 가격은 결제 카탈로그와 같다', () => {
  const portal = readFileSync(join(SAJU, 'portal.html'), 'utf8')
  const catalog = Object.fromEntries(listPaymentProducts().map((product) => [product.key, product.amount]))

  assert.match(portal, new RegExp(`PLACE · 집 풍수[\\s\\S]{0,400}${won(catalog.home_pungsu)}`))
  assert.match(
    readFileSync(join(SAJU, 'place', 'home', '01-step-1-story', 'index.html'), 'utf8'),
    new RegExp(`전체 풀이 ${won(catalog.home_pungsu)}`),
  )
  assert.doesNotMatch(
    readFileSync(join(SAJU, 'place', 'home', '01-step-1-story', 'index.html'), 'utf8'),
    /전체 풀이 9,900원/,
  )

  assert.match(portal, new RegExp(`SIGNATURE · 종합사주[\\s\\S]{0,500}${won(catalog.cmdg)}`))
  const cmdg = readFileSync(join(SAJU, 'cmdg', 'index.html'), 'utf8')
  assert.match(cmdg, new RegExp(won(catalog.cmdg)))
  assert.doesNotMatch(cmdg, /49,800원/)

  assert.match(portal, /합격운 나, 붙을 각이야\? 9,900원/)
  assert.doesNotMatch(portal, /붙을 각이야\? 새로 열린 서비스/)
})
