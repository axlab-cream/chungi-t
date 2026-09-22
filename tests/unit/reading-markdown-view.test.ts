import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const read = (path: string) => readFileSync(join(root, path), 'utf8')

/**
 * 2026-09-18: 해석 본문이 마크다운 뷰가 아니라 글자 그대로 찍혔다. 모델이 표를 쓰면
 * `| 마음 신호 | 올해의 장면 |` `| --- | --- |` 가 그대로 보였다(올해 연애운 한 리포트에
 * 표 줄 55개). 이미 저장된 해석을 다시 만들지 않고 고치려면 화면에서 옮겨야 한다.
 */
/** 스크립트는 브라우저 전역을 읽으며 시작한다. 렌더러만 꺼내 쓰기 위한 최소 스텁. */
function richText(): (raw: string) => string {
  const source = readFileSync(join(root, '사주/js/umsh-report-access.js'), 'utf8')
  const node = () => ({ id: '', textContent: '', style: {}, children: [] as unknown[], setAttribute() {}, hasAttribute: () => false, getAttribute: () => null, removeAttribute() {}, appendChild() {}, addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], closest: () => null })
  const store = new Map<string, string>()
  const context: Record<string, unknown> = {
    console, URL, URLSearchParams, Set, Response,
    location: new URL('https://umsh.kr/love/this-year/06-step-6_1-report-detail/index.html'),
    document: {
      readyState: 'complete', addEventListener() {}, querySelector: () => null, querySelectorAll: () => [],
      getElementById: () => null, createElement: node, documentElement: node(), head: node(), body: node(),
    },
    sessionStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k), get length() { return store.size }, key: (i: number) => [...store.keys()][i] ?? null },
    history: { replaceState() {} },
    fetch: async () => new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }),
    setTimeout: () => 0, clearTimeout() {},
  }
  context.window = context
  context.global = context
  runInNewContext(source, context)
  const api = (context as { UMSHReportAccess?: { richText?: (raw: string) => string } }).UMSHReportAccess
  assert.ok(api?.richText, 'richText 를 노출하지 않는다')
  return api.richText
}

test('마크다운 표를 표로 그린다', () => {
  const render = richText()
  const html = render([
    '| 마음 신호 | 올해의 장면 |',
    '| --- | --- |',
    '| 설렘 | 연락이 끊기지 않고 다시 이어질 때 |',
    '| 놓침 | 바쁘다는 말로 미룰 때 |',
  ].join('\n'))
  assert.match(html, /<table class="reading-table">/)
  assert.match(html, /<th scope="col">마음 신호<\/th><th scope="col">올해의 장면<\/th>/)
  assert.match(html, /role="region" aria-label="해석 비교표" tabindex="0"/)
  assert.match(html, /<td>설렘<\/td>/)
  assert.doesNotMatch(html, /\| --- \|/, '구분선이 글자로 남았다')
  assert.doesNotMatch(html, /\|\s*설렘/, '표가 글자로 남았다')
})

test('목록과 굵은 글씨를 옮긴다', () => {
  const render = richText()
  const bullets = render('- 첫째 줄\n- 둘째 줄')
  assert.match(bullets, /<ul class="reading-list"><li>첫째 줄<\/li><li>둘째 줄<\/li><\/ul>/)
  const ordered = render('1. 먼저 확인\n2. 다음 확인')
  assert.match(ordered, /<ol class="reading-list"><li>먼저 확인<\/li><li>다음 확인<\/li><\/ol>/)
  assert.match(render('여기는 **중요**해요.'), /<strong>중요<\/strong>/)
})

test('저장 원문의 인용·강조·밑줄·형광 표시를 안전한 마크다운 뷰로 옮긴다', () => {
  const render = richText()
  const html = render('> 선택의 기준\n\n## 오늘 할 일\n**핵심**과 *설명*, ++밑줄++, ==강조==')
  assert.match(html, /<blockquote class="reading-quote">선택의 기준<\/blockquote>/)
  assert.match(html, /<p class="reading-subhead">오늘 할 일<\/p>/)
  assert.match(html, /<strong>핵심<\/strong>/)
  assert.match(html, /<em>설명<\/em>/)
  assert.match(html, /<u>밑줄<\/u>/)
  assert.match(html, /<mark>강조<\/mark>/)
  assert.doesNotMatch(render('==<img onerror=alert(1)>=='), /<img/)
})

test('공용 마크다운 컴포넌트는 인플레이스·전체 리더에서 같은 가독성 규칙을 쓴다', () => {
  const inplace = read('사주/css/umsh-verified-inplace.css')
  const full = read('사주/css/umsh-verified-reader.css')
  for (const css of [inplace, full]) {
    assert.match(css, /\.reading-block strong/)
    assert.match(css, /\.reading-block u/)
    assert.match(css, /\.reading-block mark/)
    assert.match(css, /\.reading-subhead/)
    assert.match(css, /\.reading-quote/)
    assert.match(css, /\.reading-list li::marker/)
    assert.match(css, /\.reading-table-wrap/)
    assert.match(css, /\.reading-table thead th/)
  }
  assert.match(inplace, /\.umsh-reading-guide table/)
  assert.match(inplace, /\.umsh-reading-guide thead th/)
  assert.match(inplace, /\.story-chart-track/)
  assert.match(inplace, /\.story-table th/)
})

test('전용 집 풍수·결혼 날짜 상세도 공용 마크다운 뷰를 호출한다', () => {
  assert.match(read('사주/place/home/06-step-6_1-report-detail/index.html'), /UMSHReportAccess\.richText\(block\.body\)/)
  assert.match(read('사주/js/wedding-service.js'), /reportAccess\.richText\(block\)/)
})

test('평범한 문단은 그대로 한 문단으로 남는다', () => {
  const render = richText()
  const html = render('오늘은 확인할 것이 하나 있어요.\n같은 문단의 다음 줄이에요.')
  assert.equal(html, '<p>오늘은 확인할 것이 하나 있어요. 같은 문단의 다음 줄이에요.</p>')
})

test('본문의 HTML 은 글자로 남는다 — 서식만 우리가 만든 태그다', () => {
  const render = richText()
  const html = render('<img src=x onerror=alert(1)> 그리고 <b>굵게</b> 와 & 기호')
  // 살아 있는 태그가 없으면 된다. 이스케이프된 글자 안의 onerror 는 그냥 텍스트다.
  assert.doesNotMatch(html, /<img|<b>/, '본문 HTML 이 살아났다')
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/)
  assert.match(html, /&amp; 기호/)
  // 표 안의 값도 같은 규칙을 지킨다.
  const table = render('| 항목 | 값 |\n| --- | --- |\n| <script>x</script> | 안전 |')
  assert.doesNotMatch(table, /<script>/)
  assert.match(table, /&lt;script&gt;/)
})

test('해석 본문·요약·하이라이트가 모두 같은 렌더러를 쓴다', () => {
  const source = readFileSync(join(root, '사주/js/umsh-report-access.js'), 'utf8')
  // 한 곳이라도 옛 방식(escapeHtml 을 <p> 에 그대로)으로 남으면 그 화면만 글자로 보인다.
  assert.match(source, /paragraphs\.map\(richText\)\.join\(''\)/, '해석 본문이 렌더러를 쓰지 않는다')
  assert.match(source, /shown\.map\(richText\)\.join\(''\)/, '한눈에 보기가 렌더러를 쓰지 않는다')
  assert.match(source, /paragraphs\.map\(richText\)\.join\(''\)\)/, '하이라이트가 렌더러를 쓰지 않는다')
  assert.doesNotMatch(source, /'<p>' \+ escapeHtml\(paragraph\) \+ '<\/p>'/, '옛 렌더가 남아 있다')
})
