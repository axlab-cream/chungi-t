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

// 2026-10-15 결정: 고객이 금액을 처음 보는 곳은 결제창(KG이니시스 웹 결제창, 구글플레이 결제 시트)이다.
// 그 전 화면(소개·입력·무료 미리보기·목차·상세·홈·검색·회사 소개)에는 금액을 싣지 않는다.
// 결제 카탈로그 금액(PG 로 보내는 값)은 그대로다.
const WON = /\d{1,3}(?:,\d{3})+\s*원/

/** 주석, 화면에 그리지 않는 값(data-price, JSON 블록, price_display 키)을 뺀 고객 HTML. */
function visible(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\sdata-price="[^"]*"/g, '')
    .replace(/<script[^>]*type="application\/(?:ld\+)?json"[^>]*>[\s\S]*?<\/script>/g, '')
    .replace(/"?price_display"?\s*:\s*"[^"]*"/g, '')
}

// 결제 뒤 화면(주문·환불·결과)은 정적 금액이 없고 금액을 스크립트로 그린다. 아래는 고객에게 나가지 않는 파일이다.
const NOT_SERVED = new Set([
  join(SAJU, 'cmdg', 'index.html'), // 쓰지 않는 사본. 운영 /cmdg/ 는 사주/사주/index.html
  join(SAJU, '사주', 'extracted_decoded.html'), // 외부 사이트 스크래핑 산출물. 서버가 막는다(static-exposure.test).
])

test('결제 카탈로그 금액은 그대로다', () => {
  const catalog = Object.fromEntries(listPaymentProducts().map((product) => [product.key, product.amount]))
  assert.equal(catalog.cmdg, 29000)
  assert.equal(catalog.love_this_year, 12900)
  assert.equal(catalog.cheonmyeong_consultation, 4900)
  assert.equal(catalog.home_pungsu, 19900)
  for (const product of listPaymentProducts()) assert.ok(Number.isInteger(product.amount) && product.amount > 0, product.key)
})

test('결제창 전 고객 HTML 에는 금액이 보이지 않는다', () => {
  const leaks: string[] = []
  for (const file of walkHtml(SAJU)) {
    if (NOT_SERVED.has(file)) continue
    const match = visible(readFileSync(file, 'utf8')).match(WON)
    if (match) leaks.push(`${file.slice(SAJU.length + 1)} :: ${match[0]}`)
  }
  assert.deepEqual(leaks, [])
})

test('홈·천명사주·검색·회사 소개는 카탈로그 금액을 그리지 않는다', () => {
  const catalog = Object.fromEntries(listPaymentProducts().map((product) => [product.key, product.amount]))
  const portal = visible(readFileSync(join(SAJU, 'portal.html'), 'utf8'))
  const cmdgPoster = portal.match(/<a class="poster service-card is-cmdg"[\s\S]*?<\/a>/)?.[0] ?? ''
  assert.ok(cmdgPoster.includes('대표 · 종합사주'), '천명사주 포스터를 찾지 못했다')
  assert.doesNotMatch(cmdgPoster, /원<\/b>|price-line/)
  assert.doesNotMatch(portal, / \d{1,3}(?:,\d{3})+원 · 이 풀이 보기/)

  const cmdgPage = visible(readFileSync(join(SAJU, '사주', 'index.html'), 'utf8'))
  assert.ok(!cmdgPage.includes(won(catalog.cmdg)), '천명사주 화면에 판매가가 남아 있다')
  assert.doesNotMatch(cmdgPage, /63,000원|-34,000원|49,800원|price-slate" aria-label="복채 안내"/)

  const search = readFileSync(join(SAJU, 'search.html'), 'utf8')
  assert.doesNotMatch(search, /service\.amount|toLocaleString\('ko-KR'\)\}원/)

  const about = visible(readFileSync(join(SAJU, 'about.html'), 'utf8'))
  assert.doesNotMatch(about, WON)
  assert.match(about, /<span class="price-line"><span>목차 보기 ↗<\/span><\/span>/)
})

test('공용 상단 바와 메뉴는 금액을 싣지 않는다', () => {
  const chrome = readFileSync(join(SAJU, 'js', 'umsh-chrome.js'), 'utf8')
  assert.doesNotMatch(chrome, /data-umsh-service-price/)
  for (const name of ['service-shell.js', 'portal.js']) {
    const source = readFileSync(join(SAJU, 'js', name), 'utf8')
    assert.doesNotMatch(source, /status: '\d{1,3}(?:,\d{3})+원'/, name)
    assert.doesNotMatch(source, /umshServicePrice/, name)
  }
})

test('올해 연애운 홈 카드는 캠페인 대표 이미지를 사용한다', () => {
  const portal = readFileSync(join(SAJU, 'portal.html'), 'utf8')
  const card = portal.match(/<a class="poster service-card is-live is-love"[\s\S]*?<\/a>/)?.[0] ?? ''

  // 2026-10-15 홈 포스터를 세로 인물 그림(v2)으로 바꿨다. 검색·보관함 썸네일은 v1 그대로 쓴다.
  assert.match(card, /campaign-2026\/year-love-home-poster-v2\.webp/)
  assert.doesNotMatch(card, /<video|01-frontface-window/)
})
