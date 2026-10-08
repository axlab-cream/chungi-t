import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const ROOT = join(process.cwd(), '사주')
const CSS = join(ROOT, 'css')

function walkHtml(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const next = join(dir, entry.name)
    if (entry.isDirectory()) walkHtml(next, out)
    else if (entry.name.endsWith('.html')) out.push(next)
  }
  return out
}

test('공용 크롬은 모바일 430 프레임을 100vw 없이 맞춘다', () => {
  const chrome = readFileSync(join(CSS, 'umsh-chrome.css'), 'utf8')
  const shell = readFileSync(join(CSS, 'service-shell.css'), 'utf8')
  const portal = readFileSync(join(CSS, 'portal.css'), 'utf8')
  assert.match(chrome, /--umsh-chrome-max:\s*430px/)
  assert.match(chrome, /overflow-x:\s*clip/)
  assert.match(chrome, /width:\s*min\(100%,\s*var\(--umsh-chrome-max\)\)/)
  assert.match(chrome, /body\.umsh-has-chrome \.app/)
  assert.match(chrome, /min-width:\s*0\s*!important/)
  assert.doesNotMatch(chrome.replace(/\/\*[\s\S]*?\*\//g, ''), /100vw/)
  assert.doesNotMatch(shell.replace(/\/\*[\s\S]*?\*\//g, ''), /100vw/)
  assert.doesNotMatch(portal.replace(/\/\*[\s\S]*?\*\//g, ''), /100vw/)
})

test('결제 화면은 모바일 키트와 같은 430·52px 터치를 쓴다', () => {
  const css = readFileSync(join(CSS, 'payment.css'), 'utf8')
  assert.match(css, /width:\s*min\(100%,\s*430px\)/)
  assert.match(css, /height:\s*52px/)
  assert.match(css, /min-height:\s*52px/)
  assert.doesNotMatch(css, /680px/)
})

// 2026-10-08: 하단 탭 화면의 공용 상단바는 홈(portal.css)과 같은 여백·로고 크기를 쓴다.
test('공용 상단바가 홈과 같은 크기를 쓴다(PC·520px·360px)', () => {
  const shell = readFileSync(join(CSS, 'service-shell.css'), 'utf8')
  const portal = readFileSync(join(CSS, 'portal.css'), 'utf8')
  for (const value of ['padding: 14px 20px 9px', 'padding: 7px 14px 6px', 'width: 106px', 'width: 90px', 'width: 80px']) {
    assert.ok(portal.includes(value), `홈에 ${value} 없음`)
    assert.ok(shell.includes(value), `공용 상단바에 ${value} 없음`)
  }
  assert.match(shell, /@media \(max-width:\s*520px\)/)
  assert.match(shell, /@media \(max-width:\s*360px\)/)
})

test('고객 HTML 레이아웃은 100vw 대신 퍼센트 폭을 쓴다', () => {
  const hits = walkHtml(ROOT).filter((file) => {
    const css = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '')
    return /100vw/.test(css)
  })
  assert.deepEqual(hits, [])
})
