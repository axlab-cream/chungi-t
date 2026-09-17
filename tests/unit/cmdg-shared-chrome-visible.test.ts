import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

/**
 * 2026-09-16: 천명사주(`/cmdg/`) 화면만 상단 GNB 가 없었다.
 *
 * 공용 크롬은 상·하단이 한 벌이다. 그런데 이 페이지는 마운트 직후 상단만 도로 숨겼다 —
 * 함수 이름이 `mountCommonBottomNav` 였고 `chrome.appbar.hidden = true` 한 줄이 있었다.
 * 실측: `[data-umsh-service-top]` 이 hidden 이라 높이가 0px, 로고·뒤로·보관함 버튼이 전부
 * 사라져 인트로에서 홈으로 돌아갈 길이 없었다.
 *
 * 장면 렌더러에도 같은 숨김이 하나 더 있었다. 오늘운 결과에서 다른 장면으로 넘어가면
 * `scene !== "todayResult"` 조건으로 상·하단을 같이 떼어냈는데, 두 마운트가 같은 호스트를
 * 쓰기 때문에 인트로·입력 화면의 GNB 까지 함께 사라졌다.
 *
 * 이 파일이 지키는 것은 하나다 — 이 페이지에서 공용 크롬을 숨기는 코드가 다시 생기지 않는 것.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

/** `/cmdg/` 와 `/signup` 이 실제로 내보내는 파일(`SAJU_UI/index.html`). */
const SERVED_PAGE = join(root, '사주', '사주', 'index.html')
const html = readFileSync(SERVED_PAGE, 'utf8')

test('천명사주 화면은 공용 상단 GNB 를 숨기지 않는다', () => {
  const hides = [...html.matchAll(/(\w+)\.appbar\.hidden\s*=\s*([^;]+);/g)]
  assert.ok(hides.length > 0, '공용 크롬 상단 제어 코드가 사라졌다 — 마운트 자체를 확인할 것')
  for (const [line, owner, value] of hides) {
    assert.equal(
      value.trim(), 'false',
      `${owner}.appbar 를 숨기는 코드가 다시 생겼다: ${line.trim()}`,
    )
  }
})

test('천명사주 화면은 공용 하단 메뉴도 숨기지 않는다', () => {
  const hides = [...html.matchAll(/(\w+)\.bottomNav\.hidden\s*=\s*([^;]+);/g)]
  assert.ok(hides.length > 0, '공용 크롬 하단 제어 코드가 사라졌다')
  for (const [line, owner, value] of hides) {
    assert.equal(
      value.trim(), 'false',
      `${owner}.bottomNav 를 숨기는 코드가 다시 생겼다: ${line.trim()}`,
    )
  }
})

/*
 * 함수 이름은 고정하지 않는다. `today-portal-view.test.ts` 가 `mountCommonBottomNav` 라는
 * 이름을 이미 고정하고 있어서, 여기서 다른 이름을 요구하면 두 테스트가 서로를 깨뜨린다.
 * 이 파일이 지키는 것은 이름이 아니라 동작이다 — 마운트한 크롬을 도로 숨기지 않는 것.
 */
test('공용 크롬 마운트는 상·하단을 한 벌로 올린다', () => {
  const start = html.search(/function mountCommon\w*\(\)/)
  assert.ok(start >= 0, '공용 크롬 마운트 함수를 찾지 못했다')
  const mount = html.slice(start, start + html.slice(start).indexOf('\n      }') + 8)
  assert.match(mount, /UMSHChrome\.mount\(/)
  assert.match(mount, /chrome\.appbar\.hidden = false/, '상단을 숨긴 채로 올리면 안 된다')
  assert.match(mount, /chrome\.bottomNav\.hidden = false/)
})
