import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { test } from 'node:test'

/**
 * PDF 받기를 전 서비스 같은 자리에 둔다.
 *
 * 2026-09-16 실측(배포본 umsh.kr): 14개 서비스 중 PDF 버튼이 있는 화면은 두 곳
 * (이 연애운 06 · 반려묘 궁합 06)뿐이었고, 둘 다 상단 `.contextbar` 에 있었다.
 * 게다가 그 버튼은 `umsh-report-pdf.js` 를 싣지 않은 채
 * `UMSHReportPdf.openFromStorage()` 를 부르고 실패하면 `window.print()` 로
 * 떨어졌다 — 화면을 그대로 인쇄한다. 돈 낸 본문을 PDF 로 받는 길이 사실상 없었다.
 *
 * 자리는 service-shell.css 에 적어 둔 규약을 따른다: 상단바가 아니라 본문 맨 아래
 * (`.umsh-pdf-dock`). 붙이는 곳은 `umsh-report-access.js` 한 곳이다 — 42개 출력
 * 화면이 전부 그 스크립트를 부르므로, 화면마다 버튼을 복사해 넣지 않는다.
 *
 * 본문은 sessionStorage 사본이 아니라 인증된 응답에서만 가져온다. 같은 스크립트가
 * 소유권 증거가 아니라는 이유로 sessionStorage 사본을 지우기 때문에,
 * openFromStorage 에 기대면 늘 빈손이 된다.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const SITE = join(root, '사주')
const source = readFileSync(join(SITE, 'js', 'umsh-report-access.js'), 'utf8')

const READY = { id: 'work-move-1', category: '이직 흐름', classification: '올해 이동수', status: 'complete', interpretation: '올해는 움직임이 붙는 해입니다.\n\n두 번째 문단.' }
const EMPTY = { id: 'work-move-2', category: '이직 흐름', classification: '준비할 것', status: 'pending', interpretation: '' }

// ── 정상 동작 ──

test('1. 검증된 본문을 그리면 PDF 자리가 본문 맨 아래에 붙는다', () => {
  const h = harness('/work/move/05-step-5-chat/chat.html?reportId=move-uuid')
  h.api.consume({ resultId: 'move-uuid', report: { serviceKey: 'work_move', title: '이직운', sections: [READY] } }, {})

  const reading = h.nodes.get('umsh-verified-reading')
  const dock = h.nodes.get('umsh-pdf-dock')
  assert.ok(dock, 'PDF 자리가 만들어지지 않았다')
  assert.equal(dock.className, 'umsh-pdf-dock')
  assert.equal(reading.children.at(-1), dock, 'PDF 자리가 본문 끝이 아니다')

  const button = h.nodes.get('umsh-pdf-button')
  assert.equal(dock.children[0], button, 'PDF 버튼이 공통 자리 밖에 있다')
  assert.equal(button.getAttribute('data-report-pdf'), '')
  assert.equal(button.className, 'pdf-button')
  assert.equal(button.textContent, 'PDF 다운받기')
})

test('2. 글이 들어온 항목만 싣는다 — 빈 항목은 빈 장으로 인쇄되지 않는다', async () => {
  const h = harness('/work/move/05-step-5-chat/chat.html?reportId=move-uuid')
  const opened: any[] = []
  h.context.UMSHReportPdf = { open(report: any) { opened.push(report); return true } }
  h.api.consume({ resultId: 'move-uuid', report: { serviceKey: 'work_move', title: '이직운', sections: [READY, EMPTY] } }, {})

  await h.click('umsh-pdf-button')
  assert.equal(opened.length, 1)
  assert.deepEqual(opened[0].sections.map((s: any) => s.id), [READY.id])
  assert.equal(opened[0].title, '이직운', '리포트 제목이 사라졌다')
  assert.equal(h.nodes.get('umsh-pdf-button').textContent, 'PDF 다운받기')
})

test('3. 도우미 스크립트는 누를 때 한 번만 싣는다', async () => {
  const h = harness('/work/move/05-step-5-chat/chat.html?reportId=move-uuid')
  h.api.consume({ resultId: 'move-uuid', report: { serviceKey: 'work_move', sections: [READY] } }, {})
  assert.equal(h.scripts().includes('/js/umsh-report-pdf.js'), false, '누르기 전에 미리 싣고 있다')

  h.context.UMSHReportPdf = { open() { return true } }
  await h.click('umsh-pdf-button')
  assert.equal(h.scripts().filter((src) => src === '/js/umsh-report-pdf.js').length, 0, '이미 올라와 있으면 다시 싣지 않는다')
})

// ── 경계 조건 ──

test('4. 본문을 아직 못 그린 화면에는 자리를 만들지 않는다', () => {
  const preview = harness('/work/move/04-step-4-report/index.html?reportId=move-uuid')
  preview.api.consume({ previewOnly: true, serviceKey: 'work_move', resultId: 'move-uuid', preview: { summary: '미리보기' } })
  assert.equal(preview.nodes.has('umsh-pdf-dock'), false, '결제 전 미리보기에 PDF 자리가 붙었다')

  const other = harness('/work/move/05-step-5-chat/chat.html?reportId=move-uuid')
  other.api.consume({ resultId: 'move-uuid', report: { serviceKey: 'home_fit', sections: [READY] } }, {})
  assert.equal(other.nodes.has('umsh-pdf-dock'), false, '다른 서비스 해석에 PDF 자리가 붙었다')
})

test('5. 본문을 다시 그려도 자리는 하나뿐이고 끝에 남는다', () => {
  const h = harness('/work/move/05-step-5-chat/chat.html?reportId=move-uuid')
  const payload = { resultId: 'move-uuid', report: { serviceKey: 'work_move', sections: [READY] } }
  h.api.consume(payload, {})
  h.api.consume(payload, {})

  const reading = h.nodes.get('umsh-verified-reading')
  const docks = reading.children.filter((child: any) => child.id === 'umsh-pdf-dock')
  assert.equal(docks.length, 1, 'PDF 자리가 두 개가 됐다')
  assert.equal(reading.children.at(-1).id, 'umsh-pdf-dock', '다시 그린 뒤 자리가 본문 중간으로 밀렸다')
})

// ── 에러 처리 ──

test('6. 읽을 항목이 하나도 없으면 이유를 버튼에 적는다', async () => {
  const h = harness('/work/move/05-step-5-chat/chat.html?reportId=move-uuid')
  let called = false
  h.context.UMSHReportPdf = { open() { called = true; return true } }
  h.api.consume({ resultId: 'move-uuid', report: { serviceKey: 'work_move', sections: [EMPTY] } }, {})

  await h.click('umsh-pdf-button')
  assert.equal(called, false, '빈 리포트로 인쇄창을 열었다')
  assert.equal(h.nodes.get('umsh-pdf-button').textContent, '해석이 준비되면 PDF를 받을 수 있습니다')
})

test('7. 팝업이 막히면 조용히 실패하지 않고 알린다', async () => {
  const h = harness('/work/move/05-step-5-chat/chat.html?reportId=move-uuid')
  h.context.UMSHReportPdf = { open() { return false } }
  h.api.consume({ resultId: 'move-uuid', report: { serviceKey: 'work_move', sections: [READY] } }, {})

  await h.click('umsh-pdf-button')
  const button = h.nodes.get('umsh-pdf-button')
  assert.equal(button.textContent, '팝업을 허용하면 PDF 창이 열립니다')
  assert.equal(button.disabled, false, '실패한 뒤 버튼이 잠긴 채로 남았다')
})

// ── 회귀 방지 ──

test('8. 화면별 PDF 버튼이 상단바로 돌아오지 않는다', () => {
  const offenders = outputPages()
    .filter(({ html }) => /id="btn-pdf"/.test(html))
    .map(({ rel }) => rel)
  assert.deepEqual(offenders, [], `화면에 직접 박은 PDF 버튼이 남아 있다: ${offenders.join(', ')}`)
})

test('9. window.print() 폴백이 남아 있지 않다', () => {
  // 이 폴백이 있으면 실패가 드러나지 않는다 — 화면을 그대로 인쇄하고 성공처럼 보인다.
  const offenders = outputPages()
    .filter(({ html }) => html.includes('openFromStorage') || /UMSHReportPdf[\s\S]{0,80}window\.print/.test(html))
    .map(({ rel }) => rel)
  assert.deepEqual(offenders, [], `PDF 실패를 window.print() 로 덮는 화면: ${offenders.join(', ')}`)
})

test('10. 붙이는 곳은 공용 스크립트 한 곳이다', () => {
  assert.ok(source.includes("className = 'umsh-pdf-dock'"), '공용 스크립트가 PDF 자리를 만들지 않는다')
  assert.ok(!/openFromStorage\s*\(/.test(source), '공용 스크립트가 지워지는 sessionStorage 사본에 기대고 있다')

  const lucky = readFileSync(join(SITE, 'js', 'lucky-service.js'), 'utf8')
  assert.ok(!/id\s*=\s*'btn-pdf'/.test(lucky), '행운색 서비스가 자체 PDF 버튼을 다시 만든다')

  // 출력 화면은 전부 공용 스크립트를 부른다 — 이게 깨지면 그 화면만 PDF 가 사라진다.
  const missing = outputPages()
    .filter(({ html }) => !html.includes('umsh-report-access.js'))
    .map(({ rel }) => rel)
  assert.deepEqual(missing, [], `공용 스크립트를 싣지 않는 출력 화면: ${missing.join(', ')}`)
})

/** 서비스별 티저·목차·상세 화면. 여기가 결제한 사람이 본문을 읽는 자리다. */
function outputPages(): Array<{ rel: string; html: string }> {
  const pages: Array<{ rel: string; html: string }> = []
  for (const category of readdirSync(SITE, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
    const categoryDir = join(SITE, category.name)
    for (const service of readdirSync(categoryDir, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
      for (const [step, file] of [['04-step-4-report', 'index.html'], ['05-step-5-chat', 'chat.html'], ['06-step-6_1-report-detail', 'index.html']] as const) {
        const rel = join(category.name, service.name, step, file)
        try {
          pages.push({ rel, html: readFileSync(join(SITE, rel), 'utf8') })
        } catch { /* 그 단계가 없는 서비스는 건너뛴다 */ }
      }
    }
  }
  assert.ok(pages.length >= 40, `출력 화면을 ${pages.length}개만 찾았다 — 경로 규칙이 바뀌었는지 확인해야 한다`)
  return pages
}

function harness(path: string) {
  const nodes = new Map<string, any>()
  const loaded: string[] = []
  const location = new URL(path, 'https://umsh.kr')
  const clicks = new Map<string, Array<() => unknown>>()

  function element(tag = 'div'): any {
    const attrs = new Map<string, string>()
    const node: any = {
      id: '', className: '', tagName: tag.toUpperCase(), innerHTML: '', textContent: '', type: '',
      disabled: false, children: [] as any[], parentNode: null as any,
      style: { cssText: '', setProperty() {}, removeProperty() {} },
      setAttribute(name: string, value: string) { attrs.set(name, value); if (name === 'src') loaded.push(value) },
      hasAttribute(name: string) { return attrs.has(name) },
      getAttribute(name: string) { return attrs.get(name) },
      removeAttribute(name: string) { attrs.delete(name) },
      addEventListener(name: string, callback: () => unknown) {
        if (name !== 'click') return
        clicks.set(node.id, [...(clicks.get(node.id) || []), callback])
      },
      querySelector() { return null },
      querySelectorAll() { return [] },
      appendChild(child: any) {
        if (child.parentNode) child.parentNode.children = child.parentNode.children.filter((item: any) => item !== child)
        node.children.push(child)
        child.parentNode = node
        if (child.id) nodes.set(child.id, child)
        if (child.tagName === 'SCRIPT' && child.src) loaded.push(child.src)
        return child
      },
      insertBefore(child: any, _anchor: any) { return node.appendChild(child) },
      insertAdjacentHTML(_where: string, text: string) { node.innerHTML += text },
    }
    // 스크립트 src 는 속성이 아니라 프로퍼티로 넣는 코드도 있다.
    Object.defineProperty(node, 'src', {
      get() { return attrs.get('src') || '' },
      set(value: string) { attrs.set('src', value) },
      configurable: true,
    })
    return node
  }

  const document = {
    readyState: 'loading',
    addEventListener() {},
    querySelector() { return null },
    querySelectorAll() { return [] },
    getElementById(id: string) { return nodes.get(id) },
    createElement: element,
    documentElement: element('html'),
    head: element('head'),
    body: element('body'),
  }

  const items = new Map<string, string>()
  const context: any = {
    location, document, URL, URLSearchParams, Response, Set, console, Object, Array, Promise, JSON,
    history: { replaceState(_state: unknown, _title: string, next: string) { location.href = new URL(next, location.origin).href } },
    sessionStorage: {
      get length() { return items.size },
      key(index: number) { return [...items.keys()][index] },
      getItem(key: string) { return items.get(key) },
      setItem(key: string, value: string) { items.set(key, value) },
      removeItem(key: string) { items.delete(key) },
    },
    fetch: async () => new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }),
    setTimeout() { return 0 },
    clearTimeout() {},
  }
  context.window = context
  runInNewContext(source, context)

  return {
    api: context.UMSHReportAccess,
    context,
    nodes,
    scripts: () => loaded,
    /** 등록된 클릭 처리기를 부르고, 안에서 쓰는 Promise 체인이 끝날 틈을 준다. */
    async click(id: string) {
      for (const handler of clicks.get(id) || []) await handler()
      await Promise.resolve()
      await Promise.resolve()
    },
  }
}
