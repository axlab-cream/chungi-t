import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const source = readFileSync(new URL('../../admin-ui/index.html', import.meta.url), 'utf8')

/**
 * 2026-09-19: 운영 관리자 사이드바에서 대분류(운영 현황 등)와 소분류(개요 등)를 구분하고,
 * 대분류를 접고 펼 수 있게 했다.
 *
 * 실측 회귀 둘을 여기서 막는다.
 *  1) `<details>` 를 바로 `display:flex` 로 만들면, 최신 크로미움이 summary 아닌 자식을
 *     내부 익명 박스(`::details-content`)로 한 번 더 감싸는 탓에 `<a>` 들이 인라인 흐름으로
 *     남아 옆으로 늘어섰다. 그래서 소분류를 우리가 만든 `.admin-nav-links` 로 감싼다.
 *  2) author 규칙은 명시도와 무관하게 UA 기본 규칙(`details:not([open]) > *:not(summary)`)을
 *     이긴다 — `.admin-nav-links{display:flex}` 만 있으면 접어도(open=false) 계속 보인다.
 *     `.admin-nav-group:not([open]) .admin-nav-links{display:none}` 이 없으면 토글이
 *     눈에 보이는 효과를 내지 못한다.
 */

test('대분류마다 details/summary 로 감싸고, 소분류는 .admin-nav-links 로 한 번 더 감싼다', () => {
  const groups = ['overview', 'customer', 'ai-ops', 'system']
  for (const group of groups) {
    const pattern = new RegExp(`<details class="admin-nav-group" data-nav-group="${group}" open>\\s*<summary class="admin-nav-label">[^<]+</summary>\\s*<div class="admin-nav-links">`)
    assert.match(source, pattern, `${group} 그룹의 마크업이 바뀌었다`)
  }
  // 네 그룹 모두 details 로 닫혀야 한다 — 하나라도 <p> 로 되돌아가면 토글이 사라진다.
  assert.equal((source.match(/<details class="admin-nav-group"/g) ?? []).length, 4)
  assert.equal((source.match(/<\/details>/g) ?? []).length, 4)
})

test('접힌 소분류는 실제로 안 보인다 — UA 기본 규칙을 되찾는 규칙이 있다', () => {
  assert.match(source, /\.admin-nav-group:not\(\[open\]\)\s*\.admin-nav-links\s*\{\s*display:\s*none;?\s*\}/)
})

test('좁은 화면에서는 대분류 구분 없이 모든 소분류가 평평하게 다시 보인다', () => {
  const mobile = source.slice(source.indexOf('@media (max-width: 768px)'), source.indexOf('</style>'))
  assert.match(mobile, /\.admin-nav-group\s*\{\s*display:\s*contents;/, '대분류 박스 자체를 지우는 규칙이 없다')
  assert.match(mobile, /\.admin-nav-group\s+summary\s*\{\s*display:\s*none;\s*\}/)
  assert.match(mobile, /\.admin-nav-group\s+\.admin-nav-links\s*\{\s*display:\s*contents\s*!important;\s*\}/, '!important 없이는 접힌 상태의 UA 숨김 규칙을 못 이긴다')
})

test('현재 페이지가 속한 대분류는 접혀 있어도 강제로 편다', () => {
  assert.match(source, /var group = link\.closest\('\.admin-nav-group'\);\s*\n\s*if \(group\) group\.open = true;/)
})

test('대분류 접기 선호는 localStorage 에 기억하고, 읽기·쓰기 모두 던지지 않는다', () => {
  assert.match(source, /function bindNavGroups\(\)/)
  assert.match(source, /umsh-admin-nav-collapsed:/)
  const body = source.slice(source.indexOf('function bindNavGroups'), source.indexOf('function bindNavGroups') + 700)
  assert.match(body, /try\s*\{\s*if\s*\(localStorage\.getItem/, 'localStorage 읽기가 try 밖에 있다')
  assert.match(body, /try\s*\{\s*localStorage\.setItem/, 'localStorage 쓰기가 try 밖에 있다')
  assert.match(source, /bindNavGroups\(\);/, '초기화 시점에 부르는 곳이 없다')
})
