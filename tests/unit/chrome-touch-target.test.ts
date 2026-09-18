import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const shell = readFileSync(new URL('../../사주/css/service-shell.css', import.meta.url), 'utf8')

/**
 * 2026-09-18: 공용 상단바의 뒤로가기·보관함 버튼이 38px, 하단 시트의 닫기 칩이 32px 로
 * 손가락 최소 크기(44px)에 못 미쳤다. 다만 38px 원은 디자인이고 19개 서비스 화면이 같은
 * 상단바를 쓴다. 보이는 크기를 키우면 모든 화면의 상단바가 흔들리므로, 겹쳐 놓는 판으로
 * **닿는 넓이만** 넓힌다. 판은 흐름 밖(absolute)이라 아이콘 위치도 바 높이도 바뀌지 않는다.
 */
function rule(selector: string): string {
  const at = shell.indexOf(selector)
  assert.ok(at >= 0, `${selector} 규칙이 없다`)
  const open = shell.indexOf('{', at)
  return shell.slice(open, shell.indexOf('}', open))
}

test('상단바의 두 동그란 버튼은 44px 넓이로 눌린다', () => {
  const touch = rule('.umsh-service-shell .topbar-vault-button::after')
  assert.match(touch, /position:\s*absolute/)
  assert.match(touch, /width:\s*44px/)
  assert.match(touch, /height:\s*44px/)
  // 겹쳐 놓는 판이 아이콘을 밀어내지 않도록 가운데로 옮겨 놓는다.
  assert.match(touch, /transform:\s*translate\(-50%,\s*-50%\)/)
  // 같은 규칙이 뒤로가기 버튼에도 함께 걸려 있어야 한다.
  const selectorBlock = shell.slice(shell.indexOf('.umsh-service-shell .app-back::after'), shell.indexOf('.umsh-service-shell .topbar-vault-button::after') + 60)
  assert.match(selectorBlock, /\.umsh-service-shell \.app-back::after/)
})

test('보이는 크기는 그대로 38px 원이다', () => {
  // 줄바꿈이 섞인 여러 줄 선택자라 블록을 통째로 찾는다.
  const block = /\.umsh-service-shell \.app-back,\s*\r?\n\s*\.umsh-service-shell \.topbar-vault-button \{([\s\S]*?)\}/.exec(shell)
  assert.ok(block, '두 버튼의 크기 규칙을 찾지 못했다')
  assert.match(block[1], /width:\s*38px/)
  assert.match(block[1], /height:\s*38px/)
  assert.match(block[1], /border-radius:\s*50%/)
})

test('하단 시트의 닫기 칩도 44px 넓이로 눌린다', () => {
  const chip = rule('.umsh-service-bottom .bottom-menu-close {')
  // 겹쳐 놓는 판의 기준점이 되려면 relative 여야 한다.
  assert.match(chip, /position:\s*relative/)
  assert.match(chip, /height:\s*32px/, '알약 모양은 그대로 둔다')
  const touch = rule('.umsh-service-bottom .bottom-menu-close::after')
  assert.match(touch, /position:\s*absolute/)
  assert.match(touch, /height:\s*44px/)
  assert.match(touch, /transform:\s*translateY\(-50%\)/)
})
