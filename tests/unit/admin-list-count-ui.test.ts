import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import vm from 'node:vm'

// 2026-10-14 요청: 관리자 목록마다 "전체 N · 조건에 맞는 M"을 검색줄 오른쪽에 보여 준다.
class Node {
  children: Node[] = []
  dataset: Record<string, string> = {}
  attributes: Record<string, string> = {}
  className = ''
  text = ''
  constructor(public tag: string) {}
  get classList() { return { contains: (name: string) => this.className.split(/\s+/).includes(name) } }
  set textContent(value: string) { this.text = value; this.children = [] }
  get textContent(): string { return this.text + this.children.map((child) => child.textContent).join('') }
  setAttribute(key: string, value: string) { this.attributes[key] = value }
  appendChild(child: Node) { this.children.push(child); return child }
  append(...items: Array<Node | string>) { for (const item of items) { if (typeof item === 'string') { const t = new Node('#text'); t.text = item; this.children.push(t) } else this.children.push(item) } }
  replaceChildren() { this.children = []; this.text = '' }
  get childNodes() { return this.children }
}

const html = readFileSync(new URL('../../admin-ui/index.html', import.meta.url), 'utf8')
function source(name: string): string {
  const start = html.indexOf(`      function ${name}(`)
  assert.ok(start > 0, name)
  const end = html.indexOf('\n      }\n', start)
  return html.slice(start, end + 9)
}
const context = vm.createContext({ document: { createElement: (tag: string) => new Node(tag) } })
vm.runInContext(source('adminCount') + source('paintAdminCount') + 'this.adminCount = adminCount; this.paintAdminCount = paintAdminCount;', context)
const { adminCount, paintAdminCount } = context as unknown as {
  adminCount: (bar: Node, total: number | null, matched: number, unit?: string, filtered?: boolean, owner?: string) => Node
  paintAdminCount: (node: Node, matched: number, filtered: boolean) => void
}

test('조건이 없으면 전체 수만, 조건이 있으면 조건에 맞는 수를 함께 보여 준다', () => {
  const bar = new Node('div')
  const node = adminCount(bar, 1234, 1234, '명', false)
  assert.equal(node.textContent, '전체1,234명')
  assert.equal(bar.children.length, 1)
  adminCount(bar, 1234, 56, '명', true)
  assert.equal(bar.children.length, 1, '다시 그려도 숫자 칸은 하나만 둔다')
  assert.equal(node.textContent, '전체1,234명 · 조건에 맞는56명')
  assert.equal(node.dataset.owner, 'page')
})

test('전체 수를 모르면(서버가 세지 못함·기간으로 이미 거름) 조건에 맞는 수만 보여 준다', () => {
  const bar = new Node('div')
  assert.equal(adminCount(bar, null, 7, '건', true).textContent, '조건에 맞는7건')
  // 조건이 없는데 전체 수를 모르면 받은 수가 곧 전체다.
  assert.equal(adminCount(new Node('div'), null, 7, '건', false).textContent, '전체7건')
})

test('표 검색은 화면이 적어 둔 전체 수 위에 검색 결과 수만 고친다', () => {
  const node = adminCount(new Node('div'), 100, 30, '건', true)
  paintAdminCount(node, 4, true)
  assert.equal(node.textContent, '전체100건 · 조건에 맞는4건')
  const plain = adminCount(new Node('div'), 100, 100, '건', false, 'table')
  paintAdminCount(plain, 100, false)
  assert.equal(plain.textContent, '전체100건')
})

test('목록 화면마다 숫자 칸을 붙인다', () => {
  for (const marker of [
    "adminCount(body.querySelector('form.admin-filterbar'), counts ? counts.all : null, total, '명'", // 회원
    "adminCount(section.previousElementSibling, typeof payload.overall === 'number'", // 리포트
    "adminCount(filters, typeof payload.overall === 'number'", // 변경 이력
    "adminCount(filters, adminRange() ? null : state.orders.length", // 결제
    "adminCount(filters, adminRange() ? null : state.items.length, list.length, '건', state.filter", // 환불
    "adminCount(filters, adminRange() ? null : state.items.length, list.length, '건', state.group", // 고객 지원
    "adminCount(bar, allCount, shown.length, '개'", // 쿠폰
    "adminCount(filters, items.length, shown.length, '개'", // 팝업
    "adminCount(filters, rowsData.length, shown.length, '개'", // 천명상담
    "adminCount(serviceBar, services.length", // 서비스
    "if (state.view === 'history') adminCount(filters", // 푸시
  ]) assert.ok(html.includes(marker), marker)
  assert.doesNotMatch(html, /'총 ' \+ total\.toLocaleString/, '아래쪽 페이지 줄은 "총"을 빼고 조건에 맞는 수 기준으로 쓴다')
})
