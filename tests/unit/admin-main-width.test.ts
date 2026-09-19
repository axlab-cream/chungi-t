import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const source = readFileSync(new URL('../../admin-ui/index.html', import.meta.url), 'utf8')

/**
 * 2026-09-19: `<main>` 이 처음부터 `data-width="narrow"`(720px 캡)를 정적으로 달고 있었고,
 * 어떤 상태 전환도 그 값을 바꾸지 않았다 — 그래서 CSS 의 "표 중심 화면은 넓게" 규칙을
 * 아무리 고쳐도 실제 화면(개요·주문 등)은 계속 720px 에 갇혔다(실측: 2200px 창에서도 표
 * 오른쪽이 텅 비었다). `show(name)` 이 상태에 따라 그 속성을 직접 관리해야 한다.
 */

test('작은 안내 패널 상태만 좁게 두고, 실제 운영 화면(workspace·orders)은 화면 폭을 그대로 쓴다', () => {
  const match = source.match(/var ADMIN_NARROW_STATES = \[([^\]]+)\];/)
  assert.ok(match, 'ADMIN_NARROW_STATES 를 찾지 못했다')
  const narrow = match![1].split(',').map((item) => item.trim().replace(/'/g, ''))
  for (const small of ['loading', 'anonymous', 'recovery', 'forbidden', 'error', 'ready']) {
    assert.ok(narrow.includes(small), `${small} 은 좁아야 하는데 빠졌다`)
  }
  for (const wide of ['workspace', 'orders']) {
    assert.ok(!narrow.includes(wide), `${wide} 는 표 화면인데 좁은 목록에 들어 있다`)
  }
})

test('show(name) 이 상태마다 main 의 data-width 를 직접 설정하거나 지운다', () => {
  const body = source.slice(source.indexOf('function show(name)'), source.indexOf('function show(name)') + 400)
  assert.match(body, /setMainWidth\(ADMIN_NARROW_STATES\.indexOf\(name\) !== -1\)/)
})

/**
 * 2026-09-19: 주문(orders) 패널은 `show()` 의 states 맵을 거치지 않고 `startOrders()` 가
 * `[data-admin-state="orders"]` 를 직접 연다. `show('ready')` 가 먼저 narrow 를 남겨 뒀는데
 * 그걸 되돌리는 코드가 없어서, 표 중심 화면인 주문 페이지가 유일하게 계속 720px 에 갇혔다
 * (실사용자 재확인 리포트로 발견). startOrders 도 같은 setMainWidth 를 써야 한다.
 */
test('주문 패널은 show() 를 거치지 않지만, startOrders 가 직접 폭을 넓힌다', () => {
  const body = source.slice(source.indexOf('function startOrders('), source.indexOf('function startOrders(') + 400)
  assert.match(body, /setMainWidth\(false\)/, 'startOrders 가 main 을 넓히지 않는다')
})

test('main[data-width=narrow] 만 720px 로 좁고, 기본 main 은 사이드바를 뺀 폭 전체를 쓴다', () => {
  assert.match(source, /main \{ max-width: none; width: calc\(100% - 232px\); margin: 0 0 0 232px;/)
  assert.match(source, /main\[data-width='narrow'\] \{ max-width: 720px; width: auto; \}/)
})

test('표 머리글은 배경·굵기·밑줄 세 축으로 본문과 뚜렷이 구분된다', () => {
  assert.match(source, /\.admin-table thead th \{[^}]*background: var\(--admin-bg\);[^}]*font-weight: 700;[^}]*border-bottom: 2px solid var\(--admin-line\);/)
  assert.match(source, /\.admin-table tbody tr:nth-child\(even\) \{ background: var\(--admin-bg\); \}/)
  // 짝수 줄 배경과 마우스오버 배경이 같은 값이면, 이미 줄무늬가 있는 줄에서 마우스오버가 안 보인다.
  assert.match(source, /\.admin-table tbody tr:hover \{ background: var\(--admin-bg-hover\); \}/)
  assert.doesNotMatch(source, /--admin-bg-hover: var\(--admin-bg\)/, '마우스오버 색이 줄무늬 색과 같으면 안 된다')
})
