import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

/**
 * 2026-09-15: 공용 상단바의 크기와 중복을 한 곳에서 고정한다.
 *
 * 상단바는 페이지의 클래스(.appbar .topbar)를 그대로 물려받는다. 그래야 페이지가 원래
 * 두던 자리에 그대로 끼워지는데, 대신 **페이지 CSS 가 이 바를 건드린다.**
 *
 * 실측으로 두 가지가 드러났다.
 *   1. 커플궁합 04 의 상단바가 165px — 기준(85px)의 두 배. 그 페이지의 좁은 화면
 *      미디어쿼리에 `.topbar { flex-direction: column }` 이 있어 로고와 버튼이 세로로
 *      쌓였다. 셸은 display 만 고정해 두어 막지 못했다. 같은 페이지의
 *      `button { min-height: 48px }` 도 공용 버튼(38px)을 키웠다.
 *   2. 이직운 04 는 공용 GNB 아래 `nav.topbar > div.brand` 가 또 있어 로고가 두 번.
 *      페이지마다 `body.umsh-has-chrome .brand{display:none}` 을 넣어 왔지만, 이직운은
 *      셸을 직접 써서 그 클래스가 아예 붙지 않는다. 그래서 안 들었다.
 *
 * 고친 뒤 실측: 14개 서비스 상단바 85px 단일(커플궁합 06 만 하위픽셀 반올림으로 86px).
 */

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const SHELL_CSS = join(root, '사주', 'css', 'service-shell.css')

function rule(css: string, selector: string): string {
  const at = css.indexOf(selector)
  assert.notEqual(at, -1, `${selector} 규칙이 없다`)
  const open = css.indexOf('{', at)
  const close = css.indexOf('}', open)
  return css.slice(open, close)
}

const css = readFileSync(SHELL_CSS, 'utf8')

test('1. 공용 상단바의 배치 값이 못박혀 있다', () => {
  // display 만 고정하면 페이지의 미디어쿼리가 flex-direction 을 바꿔 바를 세로로 쌓는다.
  const body = rule(css, '.umsh-service-shell .appbar.umsh-chrome-appbar')
  for (const [prop, value] of [
    ['display', 'flex'], ['flex-direction', 'row'], ['flex-wrap', 'nowrap'],
    ['align-items', 'center'], ['height', 'auto'], ['min-height', '0'], ['margin', '0'],
    ['pointer-events', 'auto'],
  ]) {
    assert.ok(
      new RegExp(`${prop}:\\s*${value}\\b`).test(body),
      `상단바에 ${prop}: ${value} 가 없다 — 페이지 CSS 가 모양을 바꿀 수 있다`,
    )
  }
})

test('5. 커플궁합 01 의 .topbar pointer-events:none 이 로고를 막지 못한다', () => {
  // 인클루드(umsh-chrome.js → service-shell) 는 이미 <a href="/"> 로고를 그린다.
  // 페이지 CSS 가 같은 클래스 .topbar 에 pointer-events:none 을 걸어 클릭이 통과한다.
  const couple = readFileSync(join(root, '사주', 'match', 'couple', '01-step-1-story', 'index.html'), 'utf8')
  assert.ok(
    /\.topbar\s*\{[^}]*pointer-events:\s*none/.test(couple),
    '커플 01 페이지 CSS 가 바뀌어 이 검사가 의미를 잃었다',
  )
  assert.ok(couple.includes('/js/umsh-chrome.js'), '커플 01 이 공용 크롬 인클루드를 빼 냈다')
  const logo = rule(css, '.umsh-service-shell .umsh-service-logo')
  assert.ok(/pointer-events:\s*auto/.test(logo), '로고 링크가 페이지의 pointer-events:none 을 이기지 못한다')
})

test('2. 상단바 버튼 크기가 페이지 CSS 에 밀리지 않는다', () => {
  const body = rule(css, '.umsh-service-shell .app-back,')
  assert.ok(/min-height:\s*0\b/.test(body), 'min-height: 0 이 없다 — bare button 규칙이 버튼을 키운다')
})

test('3. 두 번째 브랜드 바는 두 마운트 경로 모두에서 숨는다', () => {
  // umsh-has-chrome 은 umsh-chrome.js 로 붙을 때만 생긴다. 셸을 직접 쓰는 화면
  // (이직운·이 집)에는 has-umsh-service-shell 만 붙으므로 그쪽을 키로 써야 한다.
  const hidden = css.slice(css.indexOf('nav.topbar:has(> .brand)'))
  assert.ok(
    /body\.has-umsh-service-shell nav\.topbar:has\(> \.brand\)/.test(css),
    '중복 브랜드 바 숨김이 has-umsh-service-shell 을 키로 쓰지 않는다',
  )
  assert.ok(hidden.includes('display: none'), '숨김 선언이 사라졌다')
  // 공용 셸 자신의 로고는 .app-brand 라 이 규칙에 걸리지 않아야 한다.
  assert.ok(!/\.app-brand[^,{]*:has/.test(css), '공용 셸 로고까지 숨기고 있다')
})

test('4. 바닥 여백 규칙은 그대로 살아 있다', () => {
  assert.ok(
    /body\.umsh-has-chrome\s*\{[^}]*padding-bottom:\s*calc\(max\(74px/.test(css),
    '하단 메뉴 바닥 여백 규칙이 사라졌다',
  )
})
