import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

/**
 * 운명상회 고객 키트는 preview.html 의 호흡·CTA 절제만 가져오고
 * SK 브랜드 색과 전역 button 높이(GNB 를 키움)는 가져오지 않는다.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const kit = readFileSync(join(root, '사주', 'css', 'umsh-kit.css'), 'utf8')
const field = readFileSync(join(root, '사주', 'css', 'umsh-field.css'), 'utf8')
const catalog = readFileSync(join(root, '사주', 'ui-kit', 'index.html'), 'utf8')

function has(css: string, needle: RegExp, message: string) {
  assert.ok(needle.test(css), message)
}

test('키트는 SK 브랜드 색을 하드코딩하지 않는다', () => {
  assert.doesNotMatch(kit, /#ea1738/i)
  assert.doesNotMatch(kit, /#d9002b/i)
  assert.doesNotMatch(kit, /sk-red/i)
  assert.doesNotMatch(catalog, /#ea1738/i)
})

test('기존 umsh-field.css 는 키트를 끌어온다', () => {
  assert.match(field, /@import url\("\.\/umsh-kit\.css(?:\?v=[^"]+)?"\)/)
})

test('입력은 1열이고 높이는 52px 이다', () => {
  has(kit, /--umsh-field-height:\s*52px/, '필드 높이 토큰이 없다')
  has(kit, /--umsh-cta-height:\s*52px/, 'CTA 높이 토큰이 없다')
  has(
    kit,
    /form :is\(\.field-grid, \.field-grid\.two, \.field-grid\.two-col, \.row, \.two-col, \.grid\)[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/,
    '2열 입력 그리드를 1열로 접지 않는다',
  )
})

test('시간 모름만 옆자리 예외로 남긴다', () => {
  has(
    kit,
    /form \.field-row[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\) auto/,
    '시간+모름 한 필드 예외가 없다',
  )
})

test('단계 버튼은 폼 안에서만 100% 52px 이고 전역 button 은 건드리지 않는다', () => {
  has(kit, /\.primary-cta/, 'primary-cta 별칭이 없다')
  has(kit, /\.bottom-actions/, 'bottom-actions 독을 1열로 못 잡는다')
  has(kit, /min-height:\s*var\(--umsh-cta-height\)/, 'CTA 높이를 토큰으로 쓰지 않는다')
  has(kit, /grid-template-columns:\s*minmax\(0,\s*1fr\)/, 'CTA 바가 2열이 아니다')
  has(kit, /body\.umsh-has-chrome[\s\S]*?\.back-button/, 'GNB가 있을 때 독 이전 버튼을 숨기지 않는다')
  assert.doesNotMatch(kit, /(?:^|\n)button\s*\{/, '전역 button {} 규칙은 공용 GNB 를 키운다')
})

test('영문 패널 눈머리는 시각적으로 숨긴다', () => {
  has(kit, /\.panel-kicker[\s\S]*?clip:\s*rect\(0,\s*0,\s*0,\s*0\)/, 'panel-kicker 숨김이 없다')
})

test('카탈로그는 같은 키트를 두 팔레트에 입혀 색이 페이지 것임을 보여 준다', () => {
  assert.match(catalog, /umsh-kit\.css/)
  assert.match(catalog, /--umsh-accent:\s*#ff7a66/)
  assert.match(catalog, /--umsh-accent:\s*#e7bf69/)
  assert.match(catalog, /noindex/)
})

test('생년월일은 년·월·일 세 칸이고 네이티브 미국식 달력을 숨긴다', () => {
  const ymd = readFileSync(join(root, '사주', 'js', 'umsh-ymd.js'), 'utf8')
  const chrome = readFileSync(join(root, '사주', 'js', 'umsh-chrome.js'), 'utf8')
  has(kit, /\.umsh-ymd[\s\S]*?grid-template-columns:\s*minmax\(0, 1\.35fr\) minmax\(0, 1fr\) minmax\(0, 1fr\)/, '년월일 3칸 그리드가 없다')
  assert.match(ymd, /makePart\('year', '년'\)/)
  assert.match(ymd, /makePart\('month', '월'\)/)
  assert.match(ymd, /makePart\('day', '일'\)/)
  assert.doesNotMatch(ymd, /wrap\.appendChild\(text\)/)
  has(kit, /\.umsh-ymd-part > span[\s\S]*?display:\s*none/, '칸 옆 년월일 글자를 숨기지 않는다')
  assert.match(chrome, /umsh-ymd\.js/)
  assert.match(catalog, /umsh-ymd\.js/)
})

