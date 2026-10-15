import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createContext, runInContext } from 'node:vm'
import { join } from 'node:path'
import test from 'node:test'

const root = join(process.cwd(), '사주')

function loadCta() {
  const source = readFileSync(join(root, 'js', 'umsh-cta.js'), 'utf8')
  const store: { UMSHCta?: { fullViewCta: (state: string, amount: number | string) => string } } = {}
  runInContext(source, createContext({ window: store, globalThis: store }))
  if (!store.UMSHCta) throw new Error('UMSHCta missing')
  return store.UMSHCta
}

// 2026-10-15 결정: 결제창(이니시스·구글플레이)이 열리기 전에는 금액을 보이지 않는다.
// 버튼 문구는 고정이고, 예전 '(9,900원)' 같은 금액 부분만 뺀다.
const WON = /\d{1,3}(?:,\d{3})+\s*원/

test('STEP4 버튼은 금액 없이 고정 문구만, 권한 있으면 목차만 말한다', () => {
  const cta = loadCta()
  assert.equal(cta.fullViewCta('unpaid', 9900), '전체 보기')
  assert.equal(cta.fullViewCta('guest', '12,900원'), '로그인하고 전체 보기')
  assert.equal(cta.fullViewCta('entitled', 19900), '전체 목차 열기')
  assert.equal(cta.fullViewCta('retry', 19900), '다시 결제하고 전체 보기')
})

test('공개 STEP4 카피는 가운데점 금액도 괄호 금액도 없다', () => {
  const files = [
    join(root, 'money', 'save', '04-step-4-report', 'index.html'),
    join(root, 'love', 'this-year', '04-step-4-report', 'index.html'),
    join(root, 'match', 'couple', '04-step-4-report', 'index.html'),
  ]
  for (const file of files) {
    // data-price 는 공용 상단 바로 넘기던 값일 뿐 화면에 그려지지 않는다(umsh-chrome.js 가 더는 싣지 않는다).
    const html = readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, '').replace(/\sdata-price="[^"]*"/g, '')
    assert.doesNotMatch(html, /전체 보기 · /)
    assert.doesNotMatch(html, /전체 보기 \(/)
    assert.match(html, /전체 보기/)
    assert.doesNotMatch(html, WON)
  }
})

test('서비스 JS가 STEP4 CTA에 금액을 붙이지 않는다', () => {
  const files = [
    join(root, 'js', 'couple-service.js'),
    join(root, 'js', 'save-service.js'),
    join(root, 'js', 'thisyear-service.js'),
    join(root, 'js', 'signal-service.js'),
    join(root, 'js', 'cat-service.js'),
    join(root, 'js', 'quit-service.js'),
    join(root, 'js', 'marry-service.js'),
    join(root, 'js', 'jobchoice-service.js'),
    join(root, 'js', 'lucky-service.js'),
    join(root, 'js', 'pass-angle-service.js'),
  ]
  for (const file of files) {
    const source = readFileSync(file, 'utf8')
    assert.doesNotMatch(source, /전체 보기 · /)
    assert.doesNotMatch(source, /전체 보기 \(/)
    assert.doesNotMatch(source, /\(\$\{SERVICE\.price/)
  }
})
