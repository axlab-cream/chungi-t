import { strict as assert } from 'node:assert'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

/**
 * 2026-09-15: 티저·목록·상세 화면에서 나오지 않아야 할 것들을 걷어냈다.
 *
 * 한 화면에 여섯 가지가 겹쳐 있었다.
 *   1. '해석 신고' 플로팅 버튼이 모든 화면에 떠 있었다
 *   2. 진행률과 상태 안내가 **공용 GNB 위**에 올라갔다 — 만들어 넣는 자리가 모두
 *      contentHost().firstChild 앞이라, 같은 자리에 들어가는 GNB 를 밀어냈다
 *   3. 뒤로가기를 지운 뒤 상단 줄에 가격만 덩그러니 남았다
 *   4. 04 무료 티저에 전체 목차가 통째로 쏟아졌다 — 티저·목록·상세가 같은 내용이 됐다
 *   5. '전체 리포트 목록 보기' 버튼이 등록 디자인의 CTA 를 덮어써서, 이미 펼쳐진 목록을
 *      별도 페이지로 다시 열게 했다
 *   6. '목차는 지금 보실 수 있고…' 같은 우리 사정 설명이 화면에 남아 있었다
 *
 * 헤드리스 실측(14개 서비스 × 04·06 = 28개 화면): 어긋남 0.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const SITE = join(root, '사주')
const ACCESS = join(SITE, 'js', 'umsh-report-access.js')
const CHROME = join(SITE, 'js', 'umsh-chrome.js')

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '')
}

function stepPages(): string[] {
  const found: string[] = []
  const walk = (dir: string, depth: number): void => {
    if (depth > 4) return
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      if (entry.name === 'assets' || entry.name === 'node_modules' || entry.name.startsWith('.')) continue
      const child = join(dir, entry.name)
      if (/^0[2456]-step-/.test(entry.name)) {
        for (const file of ['index.html', 'chat.html']) {
          const page = join(child, file)
          if (existsSync(page)) found.push(page)
        }
        continue
      }
      walk(child, depth + 1)
    }
  }
  walk(SITE, 0)
  return found.sort()
}

test('1. 해석 신고 버튼은 어느 화면에서도 올라오지 않는다', () => {
  const chrome = stripComments(read(CHROME))
  assert.ok(!/^\s*loadReportFlag\(\);/m.test(chrome), 'loadReportFlag() 호출이 되살아났다')
  // 스크립트 자체는 남겨 둔다 — 다시 켤 때 한 줄이면 되게.
  assert.ok(read(CHROME).includes('loadReportFlag'), '되살릴 코드까지 지워졌다')

  // 공용 크롬을 거치지 않고 **자기 HTML 에서 직접** 싣는 화면이 있었다(이 집·이직운).
  // 공용 호출만 껐더니 그 네 화면에서만 살아남았다. 주석 안이 아니라 실제로 로드되는
  // 태그가 남아 있는지를 본다.
  const offenders = stepPages()
    .filter((page) => /<script[^>]*ai-report-flag/.test(read(page).replace(/<!--[\s\S]*?-->/g, '')))
    .map((page) => relative(root, page))
  assert.deepEqual(offenders, [], `해석 신고를 직접 싣는 화면: ${offenders.join(', ')}`)
})

test('2. 만들어 넣는 자리는 모두 공용 GNB 아래에서 시작한다', () => {
  const access = stripComments(read(ACCESS))
  assert.ok(/function insertBelowChrome\(/.test(access), 'insertBelowChrome 이 없다')
  for (const host of ['ensureProgressHost', 'ensureStateHost']) {
    const start = access.indexOf(`function ${host}(`)
    assert.notEqual(start, -1, `${host} 를 찾지 못했다`)
    const body = access.slice(start, start + 700)
    assert.ok(
      /insertBelowChrome\(host, node\)/.test(body),
      `${host} 가 GNB 를 밀어낸다 — 진행률·상태가 상단바 위로 올라간다`,
    )
    assert.ok(!/host\.insertBefore\(node, host\.firstChild\)/.test(body), `${host} 가 옛 방식으로 돌아갔다`)
  }
})

test('3. 04 무료 티저에는 전체 목차를 쏟지 않는다', () => {
  const access = stripComments(read(ACCESS))
  const start = access.indexOf('function ensureSectionsHost(')
  assert.notEqual(start, -1)
  const body = access.slice(start, start + 800)
  assert.ok(
    /04-step-4-report[\s\S]{0,40}return null/.test(body),
    '티저에서 목차 자리를 만들어 낸다 — 티저·목록·상세가 같은 화면이 된다',
  )
})

test('4. 목록으로 다시 보내는 덮어쓰기 CTA 가 없다', () => {
  const jsDir = join(SITE, 'js')
  const offenders: string[] = []
  for (const file of readdirSync(jsDir).filter((f) => f.endsWith('.js'))) {
    const source = stripComments(read(join(jsDir, file)))
    if (/takeOverCta\(\s*'전체 리포트 목록 보기'/.test(source)) offenders.push(file)
  }
  assert.deepEqual(offenders, [], `등록 디자인의 CTA 를 덮어쓰는 파일: ${offenders.join(', ')}`)
})

test('5. 우리 사정 설명이 화면 문구로 남아 있지 않다', () => {
  const banned = ['목차는 지금 보실 수 있고', '저장된 해석과 열람 권한을 확인하고 있습니다']
  const offenders: string[] = []
  for (const file of [ACCESS, ...stepPages()]) {
    // JS 는 주석을 걷어내고 본다 — 이 문구를 왜 없앴는지 적어 둔 설명에 걸리면 안 된다.
    const source = file.endsWith('.js') ? stripComments(read(file)) : read(file)
    for (const phrase of banned) {
      if (source.includes(phrase)) offenders.push(`${relative(root, file)} — "${phrase}"`)
    }
  }
  assert.deepEqual(offenders, [], `걷어낸 안내 문구가 돌아왔다:\n${offenders.join('\n')}`)
})

test('6. 상단 줄에 가격만 남은 껍데기가 없다', () => {
  // 뒤로가기를 지우고 남은 <div class="top"><span class="price">…</span></div> 가
  // GNB 바로 아래 가격 한 줄로 보였다. 결제 금액은 결제 CTA 가 말한다.
  const offenders = stepPages()
    .filter((page) => /<div class="top(?:bar)?">\s*<span class="price">[^<]*<\/span>\s*<\/div>/.test(read(page)))
    .map((page) => relative(root, page))
  assert.deepEqual(offenders, [], `가격만 남은 상단 줄: ${offenders.join(', ')}`)
})
