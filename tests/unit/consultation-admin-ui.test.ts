import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import vm from 'node:vm'
import { DEFAULT_CONSULTATION_SETTINGS } from '../../src/consultation/settings.js'

// Isolated synthetic DOM exercises real inline event handlers; no browser auth or database writes.
class Element {
  children: Element[] = []
  attributes: Record<string, string> = {}
  handlers: Record<string, (event: unknown) => unknown> = {}
  style = {}; dataset = {}; value: unknown = ''; name = ''; textContent = ''; disabled = false
  constructor(public tag: string) {}
  append(...children: Element[]) { this.children.push(...children) }
  appendChild(child: Element) { this.append(child); return child }
  replaceChildren(...children: Element[]) { this.children = children }
  setAttribute(key: string, value: string) { this.attributes[key] = value }
  addEventListener(key: string, handler: (event: unknown) => unknown) { this.handlers[key] = handler }
  async emit(key: string) { await this.handlers[key]?.({ preventDefault() {} }) }
  get all(): Element[] { return this.children.flatMap(child => [child, ...child.all]) }
  get elements() {
    const controls = this.all.filter(child => ['input', 'textarea', 'select', 'button'].includes(child.tag)) as Element[] & Record<string, Element>
    for (const control of controls) if (control.name) controls[control.name] = control
    return controls
  }
  set innerHTML(html: string) {
    this.children = []
    for (const match of html.matchAll(/<(input|select|button|p)\b([^>]*)>/g)) {
      const child = new Element(match[1])
      for (const attribute of match[2].matchAll(/([\w-]+)(?:="([^"]*)")?/g)) child.attributes[attribute[1]] = attribute[2] ?? ''
      child.name = child.attributes.name ?? ''; this.append(child)
    }
  }
  querySelector(selector: string): Element | undefined {
    const match = selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/)
    return this.all.find(child => match ? match[1] in child.attributes && (match[2] === undefined || child.attributes[match[1]] === match[2]) : child.tag === selector)
  }
}
const html = readFileSync(new URL('../../admin-ui/index.html', import.meta.url), 'utf8')
const source = html.slice(html.indexOf('async function loadConsultationManager(body)'), html.indexOf('function renderContentDetail(body, item)'))
type Reply = { status?: number; data?: unknown; error?: boolean }
async function harness(replies: Reply[], items: unknown[] = []) {
  const calls: { url: string; method: string; body?: Record<string, unknown>; key?: string }[] = []
  let sequence = 0
  const context = vm.createContext({ document: { createElement: (tag: string) => new Element(tag) }, crypto: { randomUUID: () => `synthetic-key-${++sequence}` }, fetch: async (url: string, options: { method?: string; body?: string; headers?: Record<string, string> } = {}) => {
    calls.push({ url, method: options.method ?? 'GET', body: options.body ? JSON.parse(options.body) : undefined, key: options.headers?.['Idempotency-Key'] })
    if (calls.length === 1) return { ok: true, json: async () => ({ versionStore: 'ready', items, defaults: DEFAULT_CONSULTATION_SETTINGS }) }
    const reply = replies.shift(); if (!reply || reply.error) throw new Error('synthetic network error')
    return { ok: (reply.status ?? 200) < 400, status: reply.status ?? 200, json: async () => reply.data }
  } })
  vm.runInContext(source, context)
  const body = new Element('body'); await context.loadConsultationManager(body)
  return { body, form: body.querySelector('form')!, calls }
}
test('admin consultation saves revision zero and publishes only the saved checksum and revision', async () => {
  const content = { id: 'synthetic-draft', revision: 0, checksum: 'synthetic-checksum', state: 'draft' }
  const { form, calls } = await harness([{ data: { content } }, { data: { content: { ...content, revision: 1, state: 'published' } } }])
  const publish = form.querySelector('[data-consultation-publish]')!
  assert.equal(publish.disabled, true)
  await form.emit('submit')
  assert.equal(publish.disabled, false, 'revision zero must be accepted as saved')
  assert.equal(calls[1].method, 'POST')
  assert.equal(calls[1].body?.placement, 'cheonmyeong_consultation')
  await publish.emit('click')
  assert.equal(calls[2].url, '/api/admin/v1/content/synthetic-draft/publish')
  assert.deepEqual(calls[2].body, { expectedRevision: 0, checksum: 'synthetic-checksum' })
  assert.equal(publish.disabled, true)
})
test('admin edits disable publish; failed saves preserve input and reuse the idempotency key', async () => {
  const { form, calls } = await harness([{ error: true }, { status: 409, data: {} }])
  form.elements.bannerTitle.value = '입력 보존 확인'
  await form.emit('input'); await form.emit('submit'); await form.emit('submit')
  assert.equal(form.elements.bannerTitle.value, '입력 보존 확인')
  assert.equal(form.querySelector('[data-consultation-publish]')!.disabled, true)
  assert.equal(calls[1].key, calls[2].key)
  assert.match(form.children.at(-1)!.textContent, /충돌/)
})
test('admin loaded draft uses PATCH and permissions failures never claim publication', async () => {
  const draft = { id: 'synthetic-draft', state: 'draft', revision: 7, checksum: 'saved', contentType: 'notice', serviceKey: null, placement: 'cheonmyeong_consultation', payload: { body: JSON.stringify(DEFAULT_CONSULTATION_SETTINGS) } }
  const { form, calls } = await harness([{ status: 403, data: {} }, { data: { content: { ...draft, revision: 8 } } }], [draft])
  await form.querySelector('[data-consultation-publish]')!.emit('click')
  assert.match(form.children.at(-1)!.textContent, /권한/)
  await form.emit('input'); await form.emit('submit')
  assert.equal(calls[2].method, 'PATCH'); assert.equal(calls[2].body?.expectedRevision, 7)
})
