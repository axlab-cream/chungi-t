import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { test } from 'node:test'

const readerSource = readFileSync(new URL('../../사주/js/umsh-report-access.js', import.meta.url), 'utf8')
const chromeSource = readFileSync(new URL('../../사주/js/umsh-chrome.js', import.meta.url), 'utf8')
const shellSource = readFileSync(new URL('../../사주/js/service-shell.js', import.meta.url), 'utf8')

// A small DOM double exercises host identity and script lifecycle, not CSS layout.
// It intentionally leaves innerHTML opaque; visual layout is checked separately.
class Element {
  tagName: string
  id = ''
  className = ''
  innerHTML = ''
  textContent = ''
  hidden = false
  src = ''
  href = ''
  rel = ''
  width = 430
  height = 84
  parentNode: Element | null = null
  children: Element[] = []
  attrs = new Map<string, string>()
  dataset: Record<string, string> = {}
  listeners = new Map<string, Array<() => void>>()
  properties = new Map<string, string>()
  style = {
    cssText: '',
    setProperty: (key: string, value: string) => { this.properties.set(key, value) },
    removeProperty: (key: string) => { this.properties.delete(key) },
    getPropertyValue: (key: string) => this.properties.get(key) || '',
  }
  classList = {
    add: (...names: string[]) => { this.className = [...new Set([...this.className.split(' ').filter(Boolean), ...names])].join(' ') },
    remove: (...names: string[]) => { this.className = this.className.split(' ').filter(name => !names.includes(name)).join(' ') },
    contains: (name: string) => this.className.split(' ').includes(name),
    toggle: (name: string, force: boolean) => { if (force) this.classList.add(name); else this.classList.remove(name) },
  }
  constructor(tag: string) { this.tagName = tag.toUpperCase() }
  get parentElement() { return this.parentNode }
  get firstChild() { return this.children[0] || null }
  setAttribute(name: string, value: string) {
    this.attrs.set(name, value)
    if (name.startsWith('data-')) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, char: string) => char.toUpperCase())] = value
    if (name === 'id') this.id = value
  }
  getAttribute(name: string) { return name === 'src' ? this.src : this.attrs.get(name) ?? null }
  hasAttribute(name: string) { return this.attrs.has(name) }
  addEventListener(name: string, callback: () => void) { this.listeners.set(name, [...(this.listeners.get(name) || []), callback]) }
  appendChild(node: Element) { return this.insertBefore(node, null) }
  insertBefore(node: Element, before: Element | null) {
    if (node.parentNode) node.parentNode.children = node.parentNode.children.filter(item => item !== node)
    node.parentNode = this
    const index = before ? this.children.indexOf(before) : -1
    if (index < 0) this.children.push(node); else this.children.splice(index, 0, node)
    return node
  }
  replaceWith(node: Element) {
    if (!this.parentNode) return
    const parent = this.parentNode
    parent.insertBefore(node, this)
    parent.children = parent.children.filter(child => child !== this)
    this.parentNode = null
  }
  getBoundingClientRect() { return { width: this.width, height: this.height } }
  matches(selector: string): boolean {
    const attr = selector.match(/\[([^\]^=*]+)(\^?=)?(?:"([^"]*)")?\]/)
    const base = selector.replace(/\[[^\]]*\]/g, '')
    if (base.startsWith('#') && this.id !== base.slice(1)) return false
    const tag = base.match(/^[a-z]+/i)?.[0]
    if (tag && this.tagName !== tag.toUpperCase()) return false
    const classes = [...base.matchAll(/\.([\w-]+)/g)].map(match => match[1])
    if (classes.some(name => !this.classList.contains(name))) return false
    if (attr) {
      const value = this.getAttribute(attr[1])
      if (!attr[2] && value === null) return false
      if (attr[2] === '=' && value !== attr[3]) return false
      if (attr[2] === '^=' && !value?.startsWith(attr[3])) return false
    }
    return true
  }
  querySelectorAll(selector: string): Element[] {
    const selectors = selector.split(',').map(value => value.trim())
    const result: Element[] = []
    for (const child of this.children) {
      if (selectors.some(value => !value.includes(' ') && child.matches(value))) result.push(child)
      result.push(...child.querySelectorAll(selector))
    }
    return result
  }
  querySelector(selector: string) { return this.querySelectorAll(selector)[0] || null }
  closest(selector: string): Element | null { return this.matches(selector) ? this : this.parentNode?.closest(selector) || null }
  insertAdjacentHTML(_where: string, html: string) { this.innerHTML += html }
}

function harness(shellUrl = '/js/service-shell.js') {
  const documentElement = new Element('html')
  const head = documentElement.appendChild(new Element('head'))
  const body = documentElement.appendChild(new Element('body'))
  const legacy = body.appendChild(new Element('main'))
  legacy.className = 'app'
  legacy.width = 480
  legacy.innerHTML = 'PRIVATE LEGACY READING'
  const top = legacy.appendChild(new Element('div'))
  top.setAttribute('data-umsh-service-top', '')
  const bottom = body.appendChild(new Element('div'))
  bottom.setAttribute('data-umsh-service-bottom', '')
  const existingScript = head.appendChild(new Element('script'))
  existingScript.src = shellUrl
  const events = new Map<string, Array<(...args: any[]) => unknown>>()
  const document = {
    documentElement, head, body, readyState: 'loading',
    createElement: (tag: string) => new Element(tag),
    getElementById: (id: string) => documentElement.querySelector('#' + id),
    querySelector: (selector: string) => documentElement.querySelector(selector),
    querySelectorAll: (selector: string) => documentElement.querySelectorAll(selector),
    get scripts() { return documentElement.querySelectorAll('script') },
    addEventListener(name: string, callback: (...args: any[]) => unknown) { events.set(name, [...(events.get(name) || []), callback]) },
  }
  const location = new URL('https://umsh.kr/today/free?reportId=synthetic-daily')
  const context: any = {
    document, location, URL, URLSearchParams, Response, Set,
    fetch: async () => new Response('{}'),
    setTimeout: () => 1, clearTimeout() {},
    requestAnimationFrame(callback: () => void) { callback() },
    addEventListener(name: string, callback: (...args: any[]) => unknown) { events.set(name, [...(events.get(name) || []), callback]) },
    history: { replaceState(_state: unknown, _title: string, path: string) { location.href = new URL(path, location.origin).href } },
    sessionStorage: { length: 0, getItem: () => null, setItem() {}, removeItem() {} },
  }
  context.window = context
  runInNewContext(shellSource, context)
  runInNewContext(chromeSource, context)
  runInNewContext(readerSource, context)
  const fixture = { resultId: 'synthetic-daily', todayFortune: {
    date: { label: '합성 날짜' }, profile: { name: '점검' },
    reading: { title: 'SAVED DAILY CONTENT', summary: '방향을 정합니다.', work: '일', money: '돈', relationship: '관계', caution: '조건', action: '기준' },
  } }
  return { context, document, legacy, top, bottom, existingScript, fixture, events }
}

test('a verified daily reader moves the existing loaded top shell out of the hidden application', () => {
  const h = harness()
  const originalTop = h.top.innerHTML
  const originalBottom = h.bottom.innerHTML
  h.context.UMSHReportAccess.consume(h.fixture)
  const layout = h.document.getElementById('umsh-verified-layout')!
  assert.equal(h.top.parentNode, layout)
  assert.equal(h.top.hidden, false)
  assert.equal(h.legacy.hidden, true)
  assert.equal(h.legacy.style.getPropertyValue('display'), 'none')
  assert.equal(h.top.innerHTML, originalTop)
  assert.match(h.top.innerHTML, /운명상회 공통 상단/)
  assert.equal(h.bottom.parentNode, h.document.body)
  assert.equal(h.bottom.innerHTML, originalBottom)
  assert.match(h.bottom.innerHTML, /운명상회 공통 하단/)
  assert.equal(layout.querySelector('#umsh-verified-reading')?.parentNode, layout)
})

test('repeat reader mounts reuse one loaded shell script and the same two hosts', () => {
  const h = harness()
  h.context.UMSHReportAccess.consume(h.fixture)
  h.context.UMSHChrome.autoMount()
  h.context.UMSHChrome.mount({ root: 'main.app' })
  assert.equal(h.document.querySelectorAll('[data-umsh-service-top]').length, 1)
  assert.equal(h.document.querySelectorAll('[data-umsh-service-bottom]').length, 1)
  assert.equal(h.document.scripts.filter(script => script.src.includes('service-shell.js')).length, 1)
  assert.equal(h.document.querySelectorAll('link[data-umsh-shell-css]').length, 1)
  assert.equal(h.top.parentNode?.id, 'umsh-verified-layout')
})

test('versioned existing service-shell scripts are reused instead of loading duplicate document handlers', () => {
  const h = harness('/js/service-shell.js?v=20260902-work-move')
  h.context.UMSHReportAccess.consume(h.fixture)
  assert.equal(h.document.scripts.filter(script => new URL(script.src, h.context.location.origin).pathname === '/js/service-shell.js').length, 1)
})

test('moving a loaded service shell into the reader immediately updates its fixed bottom column width', () => {
  const h = harness()
  assert.equal(h.document.documentElement.style.getPropertyValue('--umsh-page-width'), '480px')
  h.context.UMSHReportAccess.consume(h.fixture)
  assert.equal(h.document.getElementById('umsh-verified-layout')?.width, 430)
  assert.equal(h.document.documentElement.style.getPropertyValue('--umsh-page-width'), '430px')
})

test('an owner change clears saved content without unhiding the legacy app or removing common navigation', () => {
  const h = harness()
  h.context.UMSHReportAccess.setOwner('synthetic-owner-a')
  h.context.UMSHReportAccess.consume(h.fixture)
  assert.match(h.document.getElementById('umsh-verified-reading')!.innerHTML, /SAVED DAILY CONTENT/)
  h.context.UMSHReportAccess.setOwner('synthetic-owner-b')
  assert.doesNotMatch(h.document.getElementById('umsh-verified-reading')!.innerHTML, /SAVED DAILY CONTENT|PRIVATE LEGACY READING/)
  assert.equal(h.legacy.hidden, true)
  assert.equal(h.top.parentNode?.id, 'umsh-verified-layout')
  assert.equal(h.bottom.hidden, false)
  const guard = h.document.head.children.find(node => node.tagName === 'STYLE')!
  assert.match(guard.textContent, /:not\(#umsh-verified-layout\)/)
  assert.match(guard.textContent, /:not\(\[data-umsh-service-bottom\]\)/)
})
