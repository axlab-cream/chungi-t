import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

test('웹 결제 페이지는 product와 service 쿼리를 모두 상품 키로 읽는다', () => {
  const source = readFileSync(join(process.cwd(), '사주', 'js', 'payment.js'), 'utf8')
  assert.match(source, /query\.get\('product'\)\s*\|\|\s*query\.get\('service'\)/)
  assert.match(source, /앱\(Google Play\) 결제 진입은 app-billing 경로/)
})
