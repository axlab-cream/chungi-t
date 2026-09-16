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

test('STEP4 미결제는 괄호 금액, 권한 있으면 목차만 말한다', () => {
  const cta = loadCta()
  assert.equal(cta.fullViewCta('unpaid', 9900), '전체 보기 (9,900원)')
  assert.equal(cta.fullViewCta('guest', '12,900원'), '로그인하고 전체 보기 (12,900원)')
  assert.equal(cta.fullViewCta('entitled', 19900), '전체 목차 열기')
  assert.equal(cta.fullViewCta('retry', 19900), '다시 결제하고 전체 보기 (19,900원)')
})

test('공개 STEP4 카피는 가운데점 금액이 아니라 괄호 금액이다', () => {
  const files = [
    join(root, 'money', 'save', '04-step-4-report', 'index.html'),
    join(root, 'love', 'this-year', '04-step-4-report', 'index.html'),
    join(root, 'match', 'couple', '04-step-4-report', 'index.html'),
  ]
  for (const file of files) {
    const html = readFileSync(file, 'utf8')
    assert.doesNotMatch(html, /전체 보기 · /)
    assert.match(html, /전체 보기 \(/)
  }
})

test('서비스 JS가 STEP4 CTA에서 금액을 지우지 않는다', () => {
  const files = [
    join(root, 'js', 'couple-service.js'),
    join(root, 'js', 'save-service.js'),
    join(root, 'js', 'thisyear-service.js'),
    join(root, 'js', 'signal-service.js'),
    join(root, 'js', 'cat-service.js'),
    join(root, 'js', 'quit-service.js'),
    join(root, 'js', 'marry-service.js'),
  ]
  for (const file of files) {
    const source = readFileSync(file, 'utf8')
    assert.doesNotMatch(source, /전체 보기 · /)
    assert.doesNotMatch(source, /로그인하고 전체 보기['"`]/)
  }
})
