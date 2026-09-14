import { strict as assert } from 'node:assert'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

/**
 * 2026-09-14: 모든 서비스가 같은 순서를 타게 한다.
 *
 *   인트로 → (로그인) → 사주 입력 → 무료 티저 → 결제 → 해석 목차 → 목차 상세
 *
 * 로그인 단계가 없었다. 01 인트로의 CTA 는 14개 서비스 전부 곧장 02 로 갔고, 로그인은
 * 04 티저나 05 목록에서야 막아섰다. 입력을 다 마친 뒤에 로그인을 요구받는 순서였다.
 *
 * 문은 01 이 아니라 **02** 에 세웠다. 01 의 CTA 가 서비스마다 다르기 때문이다 —
 * 정적 <a>, JS 가 location 을 바꾸는 곳(job-choice·cat·signal 은 02 로 가는 <a> 가 없다),
 * umsh-chrome.js 를 싣지 않는 곳(work/move). 02 에서 한 번 막으면 경로와 무관하게 같다.
 *
 * 헤드리스 실측: 14개 서비스 전부 비로그인 → 로그인 화면, 로그인 → 입력 화면.
 * 로그인 기능 꺼짐 · 설정 조회 500 · 5초 지연 세 경우 모두 입력 화면을 열어 준다.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const SITE = join(root, '사주')
const GATE = join(SITE, 'js', 'umsh-funnel-auth-gate.js')
const GATE_TAG = '/js/umsh-funnel-auth-gate.js'

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '')
}

/** 사주 입력 화면 전부. 서비스 폴더는 두 칸 깊이(me/lucky)다. */
function inputPages(): string[] {
  const found: string[] = []
  const walk = (dir: string, depth: number): void => {
    if (depth > 4) return
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      if (entry.name === 'assets' || entry.name === 'node_modules' || entry.name.startsWith('.')) continue
      const child = join(dir, entry.name)
      if (entry.name === '02-step-2-saju-input') {
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

const gate = stripComments(read(GATE))

test('1. 모든 사주 입력 화면이 로그인 문을 싣는다', () => {
  const pages = inputPages()
  assert.ok(pages.length >= 14, `입력 화면이 ${pages.length}개뿐이다 — 서비스가 통째로 빠졌다`)
  const missing = pages.filter((page) => !read(page).includes(GATE_TAG)).map((page) => relative(root, page))
  assert.deepEqual(missing, [], `로그인 문이 없는 입력 화면: ${missing.join(', ')}`)
})

test('2. 문은 <head> 안에 있다 — 나중에 실으면 입력 화면이 깜빡였다가 튕긴다', () => {
  const late: string[] = []
  for (const page of inputPages()) {
    const html = read(page)
    const headEnd = html.search(/<\/head>/i)
    const tagAt = html.indexOf(GATE_TAG)
    if (headEnd === -1 || tagAt === -1 || tagAt > headEnd) late.push(relative(root, page))
  }
  assert.deepEqual(late, [], `<head> 밖에서 실리는 화면: ${late.join(', ')}`)
})

test('3. 02 입력 화면에서만 돈다', () => {
  assert.ok(
    /indexOf\(STEP_PATH\) === -1\) return/.test(gate) && /STEP_PATH = '\/02-step-2-saju-input\/'/.test(gate),
    '경로 가드가 사라졌다 — 다른 화면까지 막아 세운다',
  )
})

test('4. 로그인되어 있으면 아무 일도 하지 않는다', () => {
  assert.ok(/if \(session\) return reveal\(\)/.test(gate), '로그인 상태에서도 로그인 화면으로 보낸다')
})

test('5. 무엇이 실패하든 입력 화면을 막지 않는다', () => {
  // 설정 조회 실패·로그인 기능 꺼짐·스크립트 없음·예외 — 전부 열어 주는 쪽으로 떨어져야 한다.
  assert.ok(/!config \|\| !config\.enabled\) return reveal\(\)/.test(gate), '로그인 기능이 꺼져도 막아 세운다')
  assert.ok(/waitForAuthScripts\(deadline\)\)\) return reveal\(\)/.test(gate), '스크립트가 없으면 빈 화면이 된다')
  assert.ok(/catch \(_error\) \{\s*reveal\(\);?\s*\}/.test(gate), '예외가 나면 빈 화면으로 남는다')
  assert.ok(/setTimeout\(reveal, GIVE_UP_MS\)/.test(gate), '검사가 늦으면 빈 화면으로 남는다')
})

test('6. 왕복과 뒤로 가기 루프를 막는다', () => {
  assert.ok(/location\.replace\(loginUrl\(\)\)/.test(gate), 'assign 이면 뒤로 가기가 로그인↔입력을 왕복한다')
  assert.ok(!/location\.assign\(/.test(gate), 'assign 으로 되돌아갔다')
  assert.ok(/if \(settled \|\| alreadySent\(\)\) return reveal\(\)/.test(gate),
    '로그인에 실패해 돌아온 사람을 다시 로그인으로 보낸다 — 무한 왕복')
})

test('7. 되돌아올 주소를 그대로 들고 간다', () => {
  assert.ok(/commonLoginUrl\(entry, here\(\)\)/.test(gate), '로그인 뒤 원래 입력 화면으로 돌아오지 않는다')
  assert.ok(/returnTo=' \+ encodeURIComponent\(here\(\)\)/.test(gate), 'UMSHCommonAuth 가 없을 때의 폴백이 사라졌다')
})
