import { strict as assert } from 'node:assert'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

/**
 * 2026-09-15: 상단 GNB 와 하단 메뉴를 모든 페이지에서 같게 한다.
 *
 * 인클루드는 원래 있었다 — `umsh-chrome.js` 가 `service-shell.js` 를 올려 상단 GNB(뒤로가기
 * 포함)와 하단 메뉴를 한 곳에서 그린다. 문제는 정책·FAQ 17개 화면이 그 인클루드를
 * **아예 부르지 않아서** 상단도 하단도 없었다는 것이다.
 *
 * 실측(배포본, 브라우저): 하단 메뉴가 붙은 화면은 전부 74px · 5개 항목으로 이미 같았다.
 * 없는 화면만 문제였다.
 *
 * 붙이는 방법은 화면마다 마크업을 새로 짜는 게 아니라 네 줄이다 —
 * `umsh-chrome.css` + supabase + auth 두 개 + `umsh-chrome.js`, 그리고 스테이지에
 * `data-umsh-chrome`. 페이지 자체 헤더에는 `appbar` 를 더해 그 자리를 공용 GNB 가
 * 바꿔 끼우게 한다(지우지 않는다 — 마운트가 실패하면 로고까지 사라지므로).
 */

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const SITE = join(root, '사주')

/** 공용 크롬을 반드시 달아야 하는 화면. */
const MUST_HAVE_CHROME = [
  'about.html', 'faq.html',
  'faq/career.html', 'faq/fortune.html', 'faq/life.html', 'faq/love.html', 'faq/match.html',
  'faq/money.html', 'faq/payment.html', 'faq/reading.html', 'faq/report.html', 'faq/use.html',
  'faq/workflow.html',
  'terms.html', 'privacy.html', 'refund.html', 'support.html',
  'orders.html', 'profile.html', 'refunds.html', 'leave.html', 'vault.html',
]

/**
 * 일부러 빼 둔 화면. 이유를 옆에 적어 둔다 — 적어 두지 않으면 다음 사람이 "빠졌네" 하고
 * 붙이고, 결제 중에 메뉴를 눌러 빠져나가는 길이 생긴다.
 */
const DELIBERATELY_WITHOUT_CHROME: Array<[string, string]> = [
  ['index.html', 'meta refresh 로 / 로 보내는 리다이렉트 껍데기다'],
  ['result.html', 'meta refresh 로 / 로 보내는 리다이렉트 껍데기다'],
  ['payment/close.html', '결제창이 닫힌 뒤 뜨는 화면이라 다른 데로 나갈 길을 두지 않는다'],
  ['payment/test.html', '운영자 점검용이라 고객 메뉴를 붙이지 않는다'],
]

function read(rel: string): string {
  return readFileSync(join(SITE, rel), 'utf8')
}

test('1. 정책·FAQ 를 포함한 모든 대상 화면이 공용 크롬을 싣는다', () => {
  const missing = MUST_HAVE_CHROME.filter((rel) => !read(rel).includes('/js/umsh-chrome.js'))
  assert.deepEqual(missing, [], `공용 크롬을 싣지 않는 화면: ${missing.join(', ')}`)
})

test('2. 마운트 지점이 있다 — 스크립트만 있으면 붙지 않는다', () => {
  // autoMount() 는 [data-umsh-chrome] 나 header.appbar 나 main.stage 가 있어야 붙는다.
  const missing = MUST_HAVE_CHROME.filter((rel) => {
    const html = read(rel)
    return !/data-umsh-chrome/.test(html)
      && !/class="[^"]*\bappbar\b/.test(html)
      && !/<main[^>]*class="[^"]*\bstage\b/.test(html)
  })
  assert.deepEqual(missing, [], `마운트 지점이 없는 화면: ${missing.join(', ')}`)
})

test('3. 일부러 뺀 화면은 목록에 이유와 함께 남아 있다', () => {
  const sneaked = DELIBERATELY_WITHOUT_CHROME
    .filter(([rel]) => read(rel).includes('/js/umsh-chrome.js'))
    .map(([rel, why]) => `${rel} (${why})`)
  assert.deepEqual(sneaked, [], `빼기로 한 화면에 크롬이 붙었다:\n${sneaked.join('\n')}`)
  for (const [, why] of DELIBERATELY_WITHOUT_CHROME) {
    assert.ok(why.length > 10, '제외 이유가 비어 있다 — 이유 없는 예외는 다음 사람이 되돌린다')
  }
})

test('4. 바닥 여백 규칙은 공용 CSS 한 곳에 있다', () => {
  // 화면마다 같은 한 줄을 복사해 넣던 것을 공용으로 올렸다. 빠지면 마지막 카드가 메뉴에 가린다.
  const css = read(join('css', 'service-shell.css'))
  assert.ok(
    /body\.umsh-has-chrome\s*\{[^}]*padding-bottom:\s*calc\(max\(74px, var\(--umsh-chrome-bottom-h, 74px\)\)/.test(css),
    '공용 바닥 여백 규칙이 없다',
  )
})

test('5. 페이지 자체 헤더는 지우지 않고 appbar 로 바꿔 끼운다', () => {
  // 지우면 마운트가 실패했을 때 로고도 홈 링크도 없는 화면이 남는다.
  const policy = MUST_HAVE_CHROME.filter((rel) => read(rel).includes('policy-header'))
  assert.ok(policy.length >= 15, `policy-header 를 쓰는 화면이 ${policy.length}개뿐이다`)
  const untagged = policy.filter((rel) => !read(rel).includes('policy-header appbar'))
  assert.deepEqual(untagged, [], `appbar 가 붙지 않은 자체 헤더: ${untagged.join(', ')}`)
})


/**
 * 2026-09-15: FAQ 12개만 크롬이 빠진 채 배포됐다.
 *
 * faq.html 과 faq/*.html 은 `scripts/build-public-faq.mjs` 가 만든다. 그 파일들을 손으로
 * 고쳐 크롬을 달았는데, 배포 빌드(`prepare-vercel-public.mjs`)가 생성기를 먼저 돌려
 * 12개를 통째로 다시 쓰면서 수정이 사라졌다. 손으로 쓴 about·terms·privacy·refund·
 * support 만 살아남아 FAQ 만 빠진 것처럼 보였다.
 *
 * 생성기에는 --check 모드가 있었지만 **아무 데서도 돌지 않았다.** 그래서 생성물이
 * 템플릿과 어긋나도 배포 때 조용히 덮일 뿐 알 길이 없었다. 여기서 돌린다.
 */

const FAQ_GENERATOR = join(root, 'scripts', 'build-public-faq.mjs')

test('6. FAQ 생성기 템플릿이 공용 크롬을 달고 있다', () => {
  // 생성물이 아니라 템플릿을 고정한다. 생성물만 보면 손으로 고친 직후엔 통과하고
  // 다음 빌드에서 되돌아간다 — 실제로 그렇게 한 번 놓쳤다.
  const generator = readFileSync(FAQ_GENERATOR, 'utf8')
  for (const piece of ['/js/umsh-chrome.js', 'data-umsh-chrome', 'policy-header appbar', '/css/umsh-chrome.css']) {
    assert.ok(generator.includes(piece), `FAQ 생성기 템플릿에 ${piece} 가 없다`)
  }
})

test('7. 생성된 FAQ 가 템플릿과 어긋나지 않는다', () => {
  // --check 는 생성기가 원래 갖고 있던 기능인데 아무 데서도 돌지 않았다.
  // 여기서 돌려야 "생성물을 손으로 고쳤다"가 배포가 아니라 테스트에서 드러난다.
  try {
    execFileSync('node', [FAQ_GENERATOR, '--check'], { cwd: root, stdio: 'pipe' })
  } catch (err) {
    const detail = String((err as { stderr?: Buffer }).stderr ?? err).slice(0, 400)
    assert.fail(`생성된 FAQ 가 템플릿과 다르다 — 생성물을 손으로 고치면 배포 때 덮인다.\n${detail}`)
  }
})
