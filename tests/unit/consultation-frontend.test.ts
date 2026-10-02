import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { test } from 'node:test'

const source = readFileSync(new URL('../../사주/js/consultation.js', import.meta.url), 'utf8')
const railSource = readFileSync(new URL('../../사주/js/consultation-rail.js', import.meta.url), 'utf8')
const tick = () => new Promise(resolve => setImmediate(resolve))
class Node {
  textContent = ''; value = ''; hidden = false; disabled = false; children: Node[] = []; className = ''; src = ''; dataset: Record<string, string> = {}
  attrs: Record<string, string> = {}; listeners: Record<string, Function[]> = {}; classList = { toggle() {} }
  append(...nodes: Node[]) { this.children.push(...nodes) }
  replaceChildren(...nodes: Node[]) { this.children = nodes; this.textContent = '' }
  setAttribute(key: string, value: string) { this.attrs[key] = value }
  removeAttribute(key: string) { delete this.attrs[key] }
  addEventListener(name: string, cb: Function) { (this.listeners[name] ??= []).push(cb) }
  emit(name: string, event: any = {}) { for (const fn of this.listeners[name] ?? []) fn({ preventDefault() {}, stopImmediatePropagation() {}, ...event }) }
  open = false; focused = false
  focus() { this.focused = true }
  showModal() { this.open = true }
  close() { this.open = false; this.emit('close') }
  pause() {} play() { return Promise.resolve() } remove() {} contains() { return false }
}
function harness(options: { vault?: boolean; guest?: boolean; configError?: boolean; profile?: boolean; fetch?: Function; mic?: Function; access?: any; owner?: string; storage?: Map<string, string>; timeout?: Function; live?: Function } = {}) {
  const nodes = new Map<string, Node>()
  const ids = ['#voice-scene-button', '#voice-scene-status', '#voice-gate', '#voice-progress', '#consultation-mode-chat', '#consultation-mode-voice', '#consultation-enter', '#consultation-waiting', '#consultation-waiting-copy', '#consultation-waiting-detail', '#consultation-paywall', '#consultation-paywall-dismiss', '#consultation-checkout', '#consultation-access', '#state', '#list', '#consultation-app', '#message', '#send-button', '#voice-button', '#consultation-gate', '#chat-log', '#consultation-status', '#reply-audio', '#consultation-form', '#character-image', '#character-state', '#character-introduction', '#consultation-title', '#profile-state', '#chat-empty', '.vault-tabs', '[data-tab-only="paid"]']
  for (const id of ids) nodes.set(id, new Node())
  if (options.vault) nodes.set('#consultation-vault', new Node())
  const access = options.access === undefined ? { freeRemaining: 1, paidRemaining: 0, remaining: 1, packQuestions: 5, packAmount: 4900, checkoutUrl: '/payment?product=cheonmyeong_consultation' } : options.access
  const storage = options.storage || new Map<string, string>()
  const calls: { path: string; body?: any }[] = []; let authChange: Function = () => {}; let uuid = 0
  const ctx: any = {
    document: { body: { dataset: {}, classList: { remove: (value: string) => { ctx.removedClass = value } } }, hidden: false, querySelector: (id: string) => nodes.get(id), querySelectorAll: () => [], createElement: () => new Node(), addEventListener() {} },
    fetch: async (path: string, init: any = {}) => {
      calls.push({ path, body: init.body ? JSON.parse(init.body) : undefined })
      if (path === '/api/auth/config') return { ok: !options.configError, json: async () => ({ enabled: true, url: 'auth.example', publishableKey: 'public' }) }
      if (path === '/api/consultation/live-session') return { ok: true, json: async () => ({ token: 'test-ephemeral', model: 'models/test', expiresIn: 600 }) }
      if (path === '/api/consultation/context') return { ok: true, json: async () => ({ profile: options.profile === false ? null : { name: 'test-only' }, settings: {}, access }) }
      return options.fetch ? options.fetch(path, init) : { ok: true, json: async () => ({ text: '<img onerror=alert(1)>', conversationId: 'test-id', saved: true, access, conversations: [] }) }
    },
    UMSHAuthSession: { resolveLiveSession: async () => ({ session: options.guest ? null : { access_token: 'test-only', user: { id: options.owner || 'owner-a' } }, client: { auth: { onAuthStateChange: (fn: Function) => { authChange = fn } } } }) },
    supabase: {}, location: { href: 'https://test.example/' + (options.vault ? 'vault?tab=consultation' : 'consultation/'), pathname: '/consultation/', search: options.vault ? '?tab=consultation' : '' },
    sessionStorage: { getItem: (key: string) => storage.get(key), setItem: (key: string, val: string) => storage.set(key, val), removeItem: (key: string) => storage.delete(key) },
    history: { replaceState() {} }, navigator: { mediaDevices: { getUserMedia: options.mic } },
    crypto: { randomUUID: () => 'request-' + (++uuid) }, AudioContext: function () { return { resume: async () => {}, close: async () => {} } },
    WebSocket: class { readyState = 1; onopen: any; onmessage: any; constructor() { queueMicrotask(() => this.onopen()) } close() {} send(value: string) { if (JSON.parse(value).setup) queueMicrotask(() => this.onmessage({ data: JSON.stringify({ setupComplete: {} }) })) } },
    URL, URLSearchParams, AbortController, setTimeout: options.timeout || setTimeout, clearTimeout, Blob, Uint8Array, Int16Array, Float32Array, ArrayBuffer, DataView,
    addEventListener() {},
  }
  ctx.location.assign = (url: string) => { ctx.destination = url }
  ctx.window = ctx
  runInNewContext(readFileSync(new URL('../../사주/js/consultation-live.js', import.meta.url), 'utf8'), ctx)
  if (options.live) ctx.UMSHConsultationLive = options.live
  runInNewContext(source, ctx)
  return { nodes, calls, ctx, storage, ownerChange: () => authChange('SIGNED_IN', { user: { id: 'owner-b' } }), signout: () => authChange('SIGNED_OUT'), submit: (text: string) => { nodes.get('#message')!.value = text; nodes.get('#consultation-form')!.emit('submit') } }
}

test('consultation duplicate submit is blocked; response remains safe text and saved input clears', async () => {
  let resolve: Function = () => {}
  const h = harness({ fetch: () => new Promise(r => { resolve = r }) }); await tick()
  h.submit('question'); h.submit('question'); await tick()
  assert.equal(h.calls.filter(c => c.path.endsWith('/chat')).length, 1)
  resolve({ ok: true, json: async () => ({ text: '<img onerror=alert(1)>', conversationId: 'one', saved: true, access: { freeRemaining: 0, paidRemaining: 0, remaining: 0 } }) }); await tick()
  assert.equal(h.nodes.get('#message')!.value, '')
  const rows = h.nodes.get('#chat-log')!.children
  assert.equal(rows.length, 2)
  assert.equal(rows[1].children[1].textContent, '<img onerror=alert(1)>')
  assert.match(h.nodes.get('#consultation-status')!.textContent, /저장됐/)
})
test('failed send preserves text and retry request id; never announces saved', async () => {
  const h = harness({ fetch: async () => ({ ok: false, status: 503, json: async () => ({ code: 'STORAGE_UNAVAILABLE' }) }) }); await tick()
  h.submit('retained question'); await tick(); h.submit('retained question'); await tick()
  const turns = h.calls.filter(c => c.path.endsWith('/chat'))
  assert.equal(turns.length, 2); assert.equal(turns[0].body.requestId, turns[1].body.requestId)
  assert.equal(h.nodes.get('#message')!.value, 'retained question')
  assert.doesNotMatch(h.nodes.get('#consultation-status')!.textContent, /저장됐/)
})
test('member, missing profile and authentication configuration failures are distinct gates', async () => {
  for (const [opts, label] of [[{ guest: true }, '회원 전용'], [{ profile: false }, '사주 미등록'], [{ configError: true }, '연결 확인 필요']] as const) {
    const h = harness(opts); await tick()
    assert.equal(h.nodes.get('#profile-state')!.textContent, label)
    assert.match(h.nodes.get('#consultation-access')!.textContent, /로그인 후|사주 정보 연결 후|연결이 복구되면/)
    assert.equal(h.nodes.get('#send-button')!.disabled, true)
    assert.equal(h.calls.some(c => c.path.endsWith('/chat')), false)
  }
})
test('sign-out clears transcripts and rejects an in-flight reply from previous owner', async () => {
  let resolve: Function = () => {}
  const h = harness({ fetch: () => new Promise(r => { resolve = r }) }); await tick()
  h.submit('private question'); await tick(); h.signout()
  resolve({ ok: true, json: async () => ({ text: 'private answer', conversationId: 'one', saved: true, access: { freeRemaining: 0, paidRemaining: 0, remaining: 0 } }) }); await tick()
  assert.equal(h.nodes.get('#chat-log')!.children.length, 0)
  assert.equal(h.nodes.get('#message')!.value, '')
  assert.equal(h.nodes.get('#send-button')!.disabled, true)
})
test('microphone denial releases the busy controls and leaves text input usable', async () => {
  const h = harness({ mic: async () => { throw Object.assign(new Error(), { name: 'NotAllowedError' }) } }); await tick()
  h.nodes.get('#voice-button')!.emit('click'); await tick()
  assert.match(h.nodes.get('#consultation-status')!.textContent, /마이크 권한/)
  assert.equal(h.nodes.get('#message')!.disabled, false)
  assert.equal(h.nodes.get('#voice-button')!.disabled, false)
})
test('vault consultation initial tab does not depend on purchased report endpoint', async () => {
  const h = harness({ vault: true }); await tick()
  assert.deepEqual(h.calls.map(c => c.path), ['/api/auth/config', '/api/consultation/conversations'])
  assert.equal(h.nodes.get('#consultation-vault')!.hidden, false)
  assert.equal(h.nodes.get('#list')!.hidden, false) // Existing additional-reading history is preserved.
  assert.equal(h.nodes.get('#consultation-vault')!.children[0].textContent, '아직 저장된 상담이 없어요')
})
test('vault logout clears list and prevents an in-flight private response from appearing', async () => {
  let resolve: Function = () => {}
  const h = harness({ vault: true, fetch: () => new Promise(r => { resolve = r }) }); await tick()
  h.signout(); resolve({ ok: true, json: async () => ({ conversations: [{ id: 'private', title: 'private title' }] }) }); await tick()
  assert.equal(h.nodes.get('#consultation-vault')!.children[0].textContent, '로그인이 필요해요')
})
test('carousel starts fail closed; unavailable published banner cannot resurrect a disabled CTA', async () => {
  const rail = new Node(), slides = [new Node(), new Node()], dots = [new Node(), new Node()]
  const nodes = new Map<string, Node>(['[data-rail-pause]', '[data-rail-prev]', '[data-rail-next]', '[data-rail-position]', '.consultation-rail-controls'].map(key => [key, new Node()]))
  Object.assign(rail, { querySelector: (key: string) => nodes.get(key), querySelectorAll: (key: string) => key === '[data-rail-slide]' ? slides : dots })
  let intervals = 0
  const ctx: any = { document: { querySelector: () => rail, addEventListener() {}, hidden: false }, matchMedia: () => ({ matches: false, addEventListener() {} }), fetch: async () => { throw new Error('offline') }, clearInterval() {}, setInterval() { intervals++; return 1 }, addEventListener() {} }; ctx.window = ctx
  runInNewContext(railSource, ctx); await tick()
  assert.equal(slides[1].hidden, true); assert.equal(nodes.get('.consultation-rail-controls')!.hidden, true); assert.equal(intervals, 0)
})

const exhausted = { freeRemaining: 0, paidRemaining: 0, remaining: 0, checkoutUrl: '/payment?product=cheonmyeong_consultation' }
const draftKey = 'umsh:consultation:checkout-draft:v1'
test('exhausted questions open the modal, dismissal preserves draft without generation', async () => {
  const h = harness({ access: exhausted }); await tick()
  h.submit('next question'); await tick()
  assert.equal(h.nodes.get('#consultation-paywall')!.open, true)
  assert.equal(h.calls.some(c => c.path.endsWith('/chat')), false)
  h.nodes.get('#consultation-paywall-dismiss')!.emit('click')
  assert.equal(h.nodes.get('#consultation-paywall')!.open, false)
  assert.equal(h.nodes.get('#message')!.value, 'next question')
  assert.equal(h.nodes.get('#message')!.focused, true)
})
test('checkout saves only owner-scoped draft and return restores without submitting', async () => {
  const h = harness({ access: exhausted }); await tick(); h.submit('retained draft')
  h.nodes.get('#consultation-checkout')!.emit('click'); await tick()
  assert.match(h.ctx.destination, /^\/payment\?product=cheonmyeong_consultation&returnTo=/)
  assert.deepEqual(Object.keys(JSON.parse(h.storage.get(draftKey)!)).sort(), ['conversationId', 'createdAt', 'ownerId', 'text'])
  const resumed = harness({ access: exhausted, storage: h.storage }); await tick()
  assert.equal(resumed.nodes.get('#message')!.value, 'retained draft')
  assert.equal(resumed.calls.some(c => c.path.endsWith('/chat')), false)
  assert.match(resumed.nodes.get('#consultation-access')!.textContent, /남은 질문 0회/)
})
test('owner mismatch and signout discard stored private draft', async () => {
  for (const event of ['mismatch', 'change', 'signout']) {
    const storage = new Map([[draftKey, JSON.stringify({ ownerId: 'owner-a', text: 'private', createdAt: Date.now(), conversationId: null })]])
    const h = harness({ storage, owner: event === 'mismatch' ? 'owner-b' : 'owner-a' }); await tick()
    if (event !== 'mismatch') { storage.set(draftKey, 'private'); if (event === 'change') h.ownerChange(); else h.signout() }
    assert.equal(storage.has(draftKey), false)
    assert.equal(h.nodes.get('#message')!.value, '')
  }
})
test('server payment-required response updates balance and opens modal preserving text', async () => {
  const h = harness({ fetch: async () => ({ ok: false, status: 402, json: async () => ({ code: 'CONSULTATION_PAYMENT_REQUIRED', access: exhausted }) }) }); await tick()
  h.submit('keep me'); await tick()
  assert.equal(h.nodes.get('#consultation-paywall')!.open, true)
  assert.equal(h.nodes.get('#message')!.value, 'keep me')
  assert.match(h.nodes.get('#consultation-access')!.textContent, /남은 질문 0회/)
})
test('missing access contract fails closed without claiming free questions', async () => {
  const h = harness({ access: null }); await tick()
  assert.equal(h.nodes.get('#send-button')!.disabled, true)
})
test('pending response shows indeterminate splash; failure hides it and restores controls', async () => {
  let resolve: Function = () => {}
  const h = harness({ fetch: () => new Promise(r => { resolve = r }) }); await tick()
  h.submit('question'); await tick()
  assert.equal(h.nodes.get('#consultation-waiting')!.hidden, false)
  assert.match(h.nodes.get('#consultation-waiting-copy')!.textContent, /신중히 살펴보고/)
  assert.equal(h.nodes.get('#send-button')!.disabled, true)
  resolve({ ok: false, status: 503, json: async () => ({ code: 'GENERATION_UNAVAILABLE' }) }); await tick()
  assert.equal(h.nodes.get('#consultation-waiting')!.hidden, true)
  assert.equal(h.nodes.get('#send-button')!.disabled, false)
  assert.equal(h.nodes.get('#message')!.value, 'question')
})

test('long wait copy reports delay without invented progress and signout hides splash', async () => {
  let delay: Function = () => {}; let resolve: Function = () => {}
  const h = harness({ timeout: (fn: Function, ms: number) => { if (ms === 12000) delay = fn; return 0 }, fetch: () => new Promise(r => { resolve = r }) }); await tick()
  h.submit('question'); await tick(); delay()
  assert.match(h.nodes.get('#consultation-waiting-detail')!.textContent, /조금 더 시간이 필요/)
  h.signout()
  assert.equal(h.nodes.get('#consultation-waiting')!.hidden, true)
  resolve({ ok: false, status: 401, json: async () => ({}) }); await tick()
})
test('native modal and progress markup provide accessible labels and reduced motion', () => {
  const html = readFileSync(new URL('../../사주/consultation/index.html', import.meta.url), 'utf8')
  const css = readFileSync(new URL('../../사주/css/consultation.css', import.meta.url), 'utf8')
  assert.match(html, /<dialog[^>]+aria-labelledby="consultation-paywall-title"[^>]+aria-describedby="consultation-paywall-copy"/)
  assert.match(html, /role="progressbar" aria-label="천명 상담 답변 준비 중"/)
  assert.doesNotMatch(html, /aria-valuenow/)
  assert.match(css, /prefers-reduced-motion:reduce[\s\S]*consultation-waiting-gauge span\{animation:none/)
})

test('coupon balance joins free and paid access and permits sending; malformed coupon balances fail closed', async () => {
  const h = harness({ access: { freeRemaining: 0, couponRemaining: 2, paidRemaining: 0, remaining: 2 } }); await tick()
  assert.match(h.nodes.get('#consultation-access')!.textContent, /쿠폰 2회 포함/)
  h.submit('쿠폰 질문'); await tick()
  assert.equal(h.calls.filter(c => c.path.endsWith('/chat')).length, 1)
  for (const couponRemaining of [-1, 1.5, '2']) {
    const invalid = harness({ access: { freeRemaining: 0, couponRemaining, paidRemaining: 0, remaining: 2 } }); await tick()
    assert.equal(invalid.nodes.get('#send-button')!.disabled, true)
    assert.equal(invalid.calls.filter(c => c.path.endsWith('/chat')).length, 0)
  }
})

test('consultation retains shared navigation but omits portrait copy and company footer', () => {
  const page = readFileSync(new URL('../../사주/consultation/index.html', import.meta.url), 'utf8')
  assert.doesNotMatch(page, /consultation-stage-copy|<footer class="site-footer|42세|당신의 이야기를 듣는 시간/)
  assert.match(page, /id="consultation-mode-chat"/)
  assert.match(page, /id="consultation-mode-voice"/)
  assert.match(page, /<main[^>]+class="consultation-layout"[^>]+data-umsh-chrome/)
  assert.match(page, /data-service="천명상담"/)
  assert.match(page, /src="\/js\/umsh-chrome\.js/)
  assert.match(page, /data-umsh-service-bottom/)
  assert.doesNotMatch(page, /<header class="consultation-header"/)
  const css = readFileSync(new URL('../../사주/css/consultation.css', import.meta.url), 'utf8')
  assert.match(css, /\.consultation-page\{padding-bottom:calc\(max\(74px,var\(--umsh-chrome-bottom-h,74px\)\)/)
  assert.match(css, /\.consultation-stage:has\(\.consultation-waiting:not\(\[hidden\]\)\)\{z-index:110/)
})


test('portrait tap opens the greeting without starting microphone or spending a question', async () => {
  let mic = 0
  const h = harness({ mic: async () => { mic++ } }); await tick()
  h.nodes.get('#consultation-enter')!.emit('click')
  assert.equal(h.ctx.removedClass, 'consultation-intro')
  assert.equal(h.nodes.get('#chat-log')!.focused, true)
  assert.equal(mic, 0); assert.equal(h.calls.some(c => /chat|live-session|live-turn/.test(c.path)), false)
})
test('PC voice input and spoken output render as safe text; stored answer uses Gemini server turn', async () => {
  let hooks: any
  const h = harness({ mic: async () => ({}), live: (value: any) => { hooks = value; return { start: async () => hooks.ready(), stop: () => hooks.closed('ended'), interrupt() {} } },
    fetch: async () => ({ ok: true, json: async () => ({ saved: true, text: '해석 답변', conversationId: 'live-one', access: { freeRemaining: 4, paidRemaining: 0, remaining: 4 }, history: [{ role: 'user', content: '직장 질문' }, { role: 'assistant', content: '해석 답변' }] }) }) })
  await tick(); h.nodes.get('#voice-button')!.emit('click'); await tick()
  hooks.transcript('user', '직장 질문'); hooks.transcript('assistant', '<script>기운</script>')
  let rows = h.nodes.get('#chat-log')!.children
  assert.equal(rows[0].children[0].textContent, '음성 입력: 직장 질문')
  assert.equal(rows[1].children[1].textContent, '천명 음성: <script>기운</script>')
  await hooks.question('직장 질문', 'live-request')
  assert.equal(h.calls.at(-1)!.path, '/api/consultation/live-turn')
  rows = h.nodes.get('#chat-log')!.children
  assert.equal(rows[1].children[1].textContent, '해석 답변')
  h.signout(); hooks.transcript('assistant', 'old private reply')
  assert.equal(h.nodes.get('#chat-log')!.children.length, 0)
})


test('chat and voice selectors change scenes without sending messages or opening microphone', async () => {
 const h=harness();await tick()
 assert.equal(h.ctx.document.body.dataset.consultationMode,'chat')
 assert.equal(h.calls.some(c=>/live-session|live-turn|\/chat$/.test(c.path)),false)
 h.nodes.get('#consultation-mode-voice')!.emit('click')
 assert.equal(h.ctx.document.body.dataset.consultationMode,'voice')
 assert.equal(h.nodes.get('#consultation-mode-voice')!.attrs['aria-pressed'],'true')
 h.nodes.get('#consultation-mode-chat')!.emit('click')
 assert.equal(h.ctx.document.body.dataset.consultationMode,'chat')
 assert.equal(h.nodes.get('#consultation-mode-chat')!.attrs['aria-pressed'],'true')
 assert.equal(h.calls.some(c=>/live-session|live-turn|\/chat$/.test(c.path)),false)
})
