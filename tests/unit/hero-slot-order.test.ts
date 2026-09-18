import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const source = readFileSync(new URL('../../사주/js/umsh-report-access.js', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../../사주/css/umsh-longform.css', import.meta.url), 'utf8')

/**
 * 2026-09-18: 퇴사운 06 화면은 해석 슬롯이 히어로 이미지보다 **앞**에 있었다. 고객은 표지
 * 이미지와 제목을 보기도 전에 본문부터 만나고, 정작 이미지는 본문 수천 픽셀 아래에 홀로
 * 남았다. 이직운·커플궁합도 같은 순서였다. 화면마다 마크업이 달라 공용 스크립트가 옮긴다.
 */
type Node = {
  tag: string
  attrs: Record<string, string>
  parent: Node | null
  children: Node[]
}

function build(): { root: Node; byAttr: (name: string, value: string) => Node | null } {
  const make = (tag: string, attrs: Record<string, string> = {}): Node => ({ tag, attrs, parent: null, children: [] })
  const root = make('main')
  const add = (parent: Node, child: Node) => { child.parent = parent; parent.children.push(child); return child }
  // 퇴사운과 같은 순서: 슬롯 셋이 먼저, 그다음 히어로, 그다음 목차 탭.
  const progress = add(root, make('section', { 'data-umsh-slot': 'progress' }))
  const state = add(root, make('section', { 'data-umsh-slot': 'state' }))
  const sections = add(root, make('section', { 'data-umsh-slot': 'sections' }))
  const hero = add(root, make('section', { class: 'hero' }))
  add(root, make('nav', { class: 'tabs' }))
  void progress; void state; void sections; void hero
  const find = (name: string, value: string): Node | null => {
    const walk = (node: Node): Node | null => {
      if (node.attrs[name] === value || (name === 'class' && node.attrs.class === value)) return node
      for (const child of node.children) { const hit = walk(child); if (hit) return hit }
      return null
    }
    return walk(root)
  }
  return { root, byAttr: find }
}

function run() {
  const { root, byAttr } = build()
  const order = (node: Node): number => {
    const flat: Node[] = []
    const walk = (item: Node) => { flat.push(item); item.children.forEach(walk) }
    walk(root)
    return flat.indexOf(node)
  }
  const context: Record<string, unknown> = {
    document: {
      documentElement: { hasAttribute: () => true },
      querySelector(selector: string) {
        if (selector.includes('data-umsh-slot="progress"')) return decorate(byAttr('data-umsh-slot', 'progress'))
        if (selector.includes('data-umsh-slot="state"')) return decorate(byAttr('data-umsh-slot', 'state'))
        if (selector.includes('data-umsh-slot="sections"')) return decorate(byAttr('data-umsh-slot', 'sections'))
        if (selector.includes('.hero')) return decorate(byAttr('class', 'hero'))
        return null
      },
      querySelectorAll: () => [],
      getElementById: () => null,
      addEventListener: () => undefined,
      createElement: () => ({ setAttribute() {}, style: {}, appendChild() {} }),
      head: { appendChild() {} },
      body: { appendChild() {} },
    },
  }
  function decorate(node: Node | null): unknown {
    if (!node) return null
    return {
      _node: node,
      get parentNode() {
        const parent = node.parent
        return parent ? {
          insertBefore(next: any, ref: any) {
            const target = next._node as Node
            if (target.parent) target.parent.children.splice(target.parent.children.indexOf(target), 1)
            const at = ref ? parent.children.indexOf(ref._node as Node) : parent.children.length
            parent.children.splice(at < 0 ? parent.children.length : at, 0, target)
            target.parent = parent
          },
        } : null
      },
      get nextSibling() {
        const parent = node.parent
        if (!parent) return null
        return decorate(parent.children[parent.children.indexOf(node) + 1] ?? null)
      },
      compareDocumentPosition(other: any) { return order(other._node as Node) > order(node) ? 4 : 2 },
      setAttribute() {}, hasAttribute() { return false }, getAttribute() { return null },
    }
  }
  return { root, context, order }
}

test('히어로가 뒤에 있으면 해석 슬롯을 히어로 아래로 내린다', () => {
  const { root, context } = run()
  // 공용 스크립트에서 옮기는 함수만 떼어내 같은 논리로 돌린다.
  const body = source.slice(source.indexOf('var slotsPlaced = false;'), source.indexOf('function slotNode(name)'))
  assert.ok(body.includes('placeSlotsUnderHero'), '옮기는 함수를 찾지 못했다')
  // eslint-disable-next-line no-new-func
  new Function('document', `${body}\nplaceSlotsUnderHero();`)(context.document)
  const names = root.children.map((child) => child.attrs['data-umsh-slot'] || child.attrs.class)
  assert.deepEqual(names, ['hero', 'progress', 'state', 'sections', 'tabs'], `순서가 어긋났다: ${names.join(' > ')}`)
})

test('슬롯이 이미 히어로 뒤면 건드리지 않는다', () => {
  const { root, context } = run()
  // 미리 올바른 순서로 만들어 둔다.
  const hero = root.children.find((child) => child.attrs.class === 'hero')!
  root.children = [hero, ...root.children.filter((child) => child !== hero)]
  const body = source.slice(source.indexOf('var slotsPlaced = false;'), source.indexOf('function slotNode(name)'))
  // eslint-disable-next-line no-new-func
  new Function('document', `${body}\nplaceSlotsUnderHero();`)(context.document)
  const names = root.children.map((child) => child.attrs['data-umsh-slot'] || child.attrs.class)
  assert.deepEqual(names, ['hero', 'progress', 'state', 'sections', 'tabs'])
})

/**
 * 준비 중 자리가 글자만 있어서 멈춘 화면으로 오해했다. 빛이 지나가고 점이 돌아야 한다.
 */
test('준비 중 자리에 움직이는 표시가 있다', () => {
  assert.match(styles, /\.umsh-lf-skeleton::after/)
  assert.match(styles, /@keyframes umsh-lf-shimmer/)
  assert.match(styles, /\.umsh-lf-skeleton strong::before/)
  assert.match(styles, /@keyframes umsh-lf-spin/)
  // 움직임을 줄인 기기에서는 돌지 않는다. 두 규칙 모두 reduce 블록 안에 있어야 한다.
  const reduceAt = styles.indexOf('@media (prefers-reduced-motion: reduce)')
  assert.ok(reduceAt >= 0, '움직임을 줄인 기기용 블록이 없다')
  const shimmerOff = styles.indexOf('.umsh-lf-skeleton::after { animation: none', reduceAt)
  const spinOff = styles.indexOf('.umsh-lf-skeleton strong::before { animation: none', reduceAt)
  assert.ok(shimmerOff > reduceAt, '빛 지나가기를 끄지 않는다')
  assert.ok(spinOff > reduceAt, '점 돌기를 끄지 않는다')
})
