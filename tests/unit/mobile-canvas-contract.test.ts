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

test('작은 화면에서 공용 상단바 패딩이 줄어든다', () => {
  const shell = readFileSync(join(CSS, 'service-shell.css'), 'utf8')
  assert.match(shell, /@media \(max-width:\s*430px\)/)
  assert.match(shell, /width:\s*112px/)
  assert.match(shell, /width:\s*100px/)
})

test('고객 HTML 레이아웃은 100vw 대신 퍼센트 폭을 쓴다', () => {
  const hits = walkHtml(ROOT).filter((file) => {
    const css = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '')
    return /100vw/.test(css)
  })
  assert.deepEqual(hits, [])
})
