import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const ROOT = join(process.cwd(), '사주')

test('천명사주 동의는 모두 선택 체크박스다', () => {
  const html = readFileSync(join(ROOT, 'cmdg', 'index.html'), 'utf8')
  assert.match(html, /모두 선택/)
  assert.match(html, /toggle-agree-all/)
  assert.match(html, /agreeListMarkup/)
  assert.doesNotMatch(
    html,
    /<button class="choice[^"]*" type="button" data-action="toggle-agree" data-agree="privacyAgree">/,
  )
})

test('시그널·커플 STEP4도 모두 선택 체크를 쓴다', () => {
  const signal = readFileSync(join(ROOT, 'love', 'signal', '04-step-4-report', 'index.html'), 'utf8')
  const couple = readFileSync(join(ROOT, 'match', 'couple', '04-step-4-report', 'index.html'), 'utf8')
  assert.match(signal, /data-agree-all/)
  assert.match(signal, /type="checkbox" data-agree="privacy"/)
  assert.doesNotMatch(signal, /<button class="check-row"/)
  assert.match(couple, /id="agreeAll"/)
  assert.match(couple, /bindAgreeAll/)
})
