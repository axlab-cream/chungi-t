import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { isWebProductionOrigin, WEB_PRODUCTION_ORIGIN } from '../../src/qa/web-target.js'

test('웹 QA 정본 origin은 umsh.kr 이다', () => {
  assert.equal(WEB_PRODUCTION_ORIGIN, 'https://umsh.kr')
  assert.equal(isWebProductionOrigin('https://umsh.kr/'), true)
  assert.equal(isWebProductionOrigin('https://www.umsh.kr/search'), true)
  assert.equal(isWebProductionOrigin('https://umsh.app/'), false)
  assert.equal(isWebProductionOrigin('https://chungi-t.vercel.app/'), false)
})

test('결제 기본 PUBLIC_BASE_URL은 umsh.kr 이고 umsh.app이 아니다', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'payment', 'inicis.ts'), 'utf8')
  assert.match(source, /envValue\(process\.env\.PUBLIC_BASE_URL, 'https:\/\/umsh\.kr'\)/)
  assert.doesNotMatch(source, /https:\/\/umsh\.app/)
})
