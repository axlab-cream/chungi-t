import { strict as assert } from 'node:assert'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

/**
 * 2026-09-14 회귀 방지: 무료 티저를 열면 등록 디자인이 사라지고 옛 공용 화면이 떴다.
 *
 * `showPreview()` 는 `renderPreviewInPlace()` 가 false 를 돌려주면 `panel()` 로 떨어진다.
 * `panel()` 은 body 자식을 전부 숨기고(`data-report-concealed`) 자체 마크업으로 화면을
 * 갈아끼운다 — 이것이 사용자가 본 "다른 옛 화면"이다.
 *
 * false 가 되는 조건이 문제였다. 미리보기가 쓰는 자리 이름 다섯 개
 * (headline · summary · insights · paid-value · checkout) 중 **하나도** 디자인에 없으면
 * filled 가 false 다. 04 티저 대부분이 그 자리에 id 를 갖고 있지 않았다.
 * sections · state · progress 는 자리가 없으면 만들어 넣는데 미리보기만 빠져 있었다.
 *
 * 헤드리스 실측(28개 화면): 고치기 전 **16개 깨짐** → 고친 뒤 **0개**.
 *
 * 아래는 그 계약을 소스에 고정한다. 이 파일들은 브라우저에서만 돌기 때문에
 * 런타임 테스트가 아니라 계약 검사다.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const SITE = join(root, '사주')
const ACCESS = join(SITE, 'js', 'umsh-report-access.js')
const INPLACE_CSS = join(SITE, 'css', 'umsh-verified-inplace.css')

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

/** 주석에 든 설명이 계약 검사에 걸리지 않게 걷어낸다. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '')
}

/** 함수 하나의 본문만 잘라 본다. 파일 전체를 훑으면 다른 함수가 검사를 대신 통과시킨다. */
function functionBody(source: string, name: string): string {
  const start = source.indexOf(`function ${name}(`)
  assert.notEqual(start, -1, `${name} 를 찾지 못했다`)
  let depth = 0
  for (let i = source.indexOf('{', start); i < source.length; i += 1) {
    if (source[i] === '{') depth += 1
    else if (source[i] === '}') {
      depth -= 1
      if (depth === 0) return source.slice(start, i + 1)
    }
  }
  assert.fail(`${name} 의 끝을 찾지 못했다`)
}

const access = stripComments(read(ACCESS))

test('1. 미리보기도 자리가 없으면 만들어 넣는다', () => {
  assert.ok(/function ensurePreviewHost\(/.test(access), 'ensurePreviewHost 가 없다')
  const slot = functionBody(access, 'slotNode')
  for (const name of ['progress', 'sections', 'state', 'preview']) {
    assert.ok(
      new RegExp(`name === '${name}'`).test(slot),
      `slotNode 가 '${name}' 자리를 만들지 않는다 — 없으면 panel() 로 떨어진다`,
    )
  }
})

test('2. 디자인 슬롯을 하나도 못 찾으면 만든 자리에 통째로 그린다', () => {
  const render = functionBody(access, 'renderPreviewInPlace')
  assert.ok(
    /if \(!filled\) filled = fillSlot\('preview'/.test(render),
    'filled 가 false 인 채로 돌아간다 — showPreview 가 화면을 갈아끼운다',
  )
  assert.ok(/return filled/.test(render), 'renderPreviewInPlace 의 반환이 바뀌었다')
})

test('3. 옵트인한 페이지는 어떤 경로로도 panel() 에 닿지 않는다', () => {
  // 전체 해석 렌더는 renderReportBody 로 옮겼다 — showReport 는 그 결과를 받아
  // PDF 자리를 붙이는 껍데기다. 가드는 본문을 그리는 쪽에 있어야 한다.
  for (const name of ['showPreview', 'renderReportBody']) {
    const body = functionBody(access, name)
    const inPlaceGuard = body.indexOf('inPlaceEnabled()')
    const panelCall = body.indexOf('panel()')
    assert.notEqual(inPlaceGuard, -1, `${name} 에 옵트인 가드가 없다`)
    assert.ok(
      panelCall === -1 || inPlaceGuard < panelCall,
      `${name} 에서 panel() 이 옵트인 가드보다 먼저 온다 — 등록 디자인이 사라진다`,
    )
  }
  // 껍데기가 렌더를 직접 다시 구현하면 가드를 우회한다.
  const wrapper = functionBody(access, 'showReport')
  assert.ok(wrapper.includes('renderReportBody(payload)'), 'showReport 가 본문 렌더에 위임하지 않는다')
  assert.equal(wrapper.indexOf('panel()'), -1, 'showReport 가 panel() 을 직접 부른다')
})

test('4. panel() 로 떨어지는 경로는 옵트인하지 않은 페이지 전용이다', () => {
  // gate() 는 이미 gateInPlace() 를 먼저 본다. 그 순서가 뒤집히면 차단 안내에서도 디자인이 날아간다.
  const gate = functionBody(access, 'gate')
  assert.ok(gate.indexOf('gateInPlace(message)') < gate.indexOf('panel()'), 'gate() 순서가 뒤집혔다')
})

/** 사이트에 있는 04 티저 · 06 상세 화면 전부. */
function stepPages(): string[] {
  const found: string[] = []
  const walk = (dir: string, depth: number): void => {
    if (depth > 4) return
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      if (entry.name === 'assets' || entry.name === 'node_modules' || entry.name.startsWith('.')) continue
      const child = join(dir, entry.name)
      if (/^0[46]-step-/.test(entry.name)) {
        const page = join(child, 'index.html')
        if (existsSync(page)) found.push(page)
        continue
      }
      walk(child, depth + 1)
    }
  }
  walk(SITE, 0)
  return found.sort()
}

test('5. 옵트인한 화면에는 자리를 만들어 넣을 컨테이너가 반드시 있다', () => {
  // contentHost() 가 찾는 것: #step-6_1-report · #step-5-chat · #step-4-report · .phone
  // 이 중 하나도 없으면 자리를 만들 수 없어 결국 panel() 로 떨어진다.
  const missing: string[] = []
  let optedIn = 0
  for (const page of stepPages()) {
    const html = read(page)
    if (!html.includes('data-umsh-verified-inplace')) continue
    optedIn += 1
    const hasHost = /id="step-6_1-report"|id="step-5-chat"|id="step-4-report"|class="[^"]*\bphone\b/.test(html)
    if (!hasHost) missing.push(relative(root, page))
  }
  assert.ok(optedIn >= 20, `옵트인한 화면이 ${optedIn}개뿐이다 — 옵트인이 대량으로 사라졌다`)
  assert.deepEqual(missing, [], `자리를 만들 컨테이너가 없는 화면: ${missing.join(', ')}`)
})

test('6. 만들어 넣은 미리보기 자리에 스타일이 붙어 있다', () => {
  const css = read(INPLACE_CSS)
  assert.ok(css.includes('[data-umsh-slot="preview"]'), '미리보기 자리 스타일이 없다')
  for (const cls of ['umsh-preview-headline', 'umsh-preview-summary', 'umsh-preview-checkout']) {
    assert.ok(css.includes(cls), `${cls} 스타일이 없다`)
    assert.ok(access.includes(cls), `${cls} 를 쓰는 곳이 없다`)
  }
})
