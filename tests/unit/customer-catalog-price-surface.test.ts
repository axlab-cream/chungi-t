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

  // 2026-10-15 홈 메인 포스터와 대표 궁합 배너에서는 금액을 뺐다. 가격은 상세 페이지에서 카탈로그와 맞춘다.
  const cmdgPoster = portal.match(/<a class="poster service-card is-cmdg"[\s\S]*?<\/a>/)?.[0] ?? ''
  assert.ok(cmdgPoster.includes('대표 · 종합사주'), '천명사주 포스터를 찾지 못했다')
  assert.doesNotMatch(cmdgPoster, /원<\/b>|price-line/)
  const cmdgPage = readFileSync(join(SAJU, '사주', 'index.html'), 'utf8')
  assert.match(cmdgPage, new RegExp(won(catalog.cmdg)))
  assert.doesNotMatch(cmdgPage, /49,800원/)
  const cmdgCopy = readFileSync(join(SAJU, 'cmdg', 'index.html'), 'utf8')
  assert.doesNotMatch(cmdgCopy, /49,800원/)

  assert.match(portal, /합격운 나, 붙을 각이야\? 9,900원/)
  assert.doesNotMatch(portal, /붙을 각이야\? 새로 열린 서비스/)
})

test('올해 연애운 홈 카드는 캠페인 대표 이미지를 사용한다', () => {
  const portal = readFileSync(join(SAJU, 'portal.html'), 'utf8')
  const card = portal.match(/<a class="poster service-card is-live is-love"[\s\S]*?<\/a>/)?.[0] ?? ''

  // 2026-10-15 홈 포스터를 세로 인물 그림(v2)으로 바꿨다. 검색·보관함 썸네일은 v1 그대로 쓴다.
  assert.match(card, /campaign-2026\/year-love-home-poster-v2\.webp/)
  assert.doesNotMatch(card, /<video|01-frontface-window/)
})
