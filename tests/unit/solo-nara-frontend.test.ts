import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { summarizeFunnelRows, summarizeSoloNaraRows } from '../../src/analytics/funnel-store.js'
import { publicContentScript, structureErrors, designIssues, type SoloSpec } from '../../src/play/solo-nara.js'

const read = (p: string) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8')
const spec = JSON.parse(read('data/solo-nara-spec.json')) as SoloSpec
const telemetry = read('사주/play/solo-nara/telemetry.js')
const collector = read('사주/js/umsh-track.js')
const app = read('사주/play/solo-nara/app.js')

function run(href: string, referrer = '', privacy = false) {
  const url = new URL(href), ga: any[] = [], requests: any[] = [], listeners: Record<string, Function[]> = {}
  const context: any = { URL, Blob, Date, Math, JSON, Number, location: { href, origin: url.origin, pathname: url.pathname }, navigator: { doNotTrack: privacy ? '1' : '0' }, localStorage: { getItem() { return null }, setItem() {} }, crypto: { randomUUID() { return 'qa-session' } }, document: { referrer, readyState: 'loading', addEventListener(name: string, fn: Function) { (listeners[name] ||= []).push(fn) } }, addEventListener() {}, setTimeout() { return 1 }, clearTimeout() {}, UMSHAnalytics: {}, gtag(...args: any[]) { ga.push(args) }, fetch(_url: string, opts: any) { requests.push(JSON.parse(opts.body)); return Promise.resolve({ ok: true }) } }
  context.window = context
  runInNewContext(telemetry, context)
  runInNewContext(collector, context)
  ;(listeners.DOMContentLoaded || []).forEach(fn => fn())
  return { context, ga, requests }
}

test('production spec is valid, passes design rules, and the browser copy is regenerated from it', () => {
  assert.deepEqual(structureErrors(spec), [])
  assert.deepEqual(designIssues(spec), [])
  assert.equal(read('사주/play/solo-nara/content.js'), publicContentScript(spec), 'run: npx tsx scripts/build-solo-nara-content.ts')
})

test('browser copy carries no character vectors or answer scores', () => {
  const content = read('사주/play/solo-nara/content.js')
  for (const key of ['"vector"', '"scores"', '"axisRange"', '"primaryAxis"', '"tieBreak"']) assert.ok(!content.includes(key), key)
})

test('telemetry sends only question numbers and the public result character; gender, answers and scores never leave', async () => {
  const { context, ga, requests } = run('https://umsh.kr/play/solo-nara/?src=home&gender=female', 'https://social.example/private?birth=PRIVATE')
  const t = context.UMSHSoloNaraTelemetry
  t.track('start'); t.track('gender', { gender: 'female' })
  t.track('progress', { question_id: 'q1', answer: 2, gender: 'female' })
  t.track('progress', { question_id: 'PRIVATE' })
  t.track('complete'); t.track('complete')
  t.track('result_view', { result_character: 'oksun', scores: { direct: 70 }, gender: 'female' })
  t.track('PRIVATE')
  await context.UMSHTrack.flush()
  const events = requests.flatMap(r => r.events)
  assert.equal(events[0].serviceKey, 'solo_nara')
  assert.equal(events[0].target, 'solo_nara:source:home')
  assert.equal(events.filter((e: any) => e.target === 'solo_nara:complete').length, 1)
  assert.ok(!events.some((e: any) => e.target === 'solo_nara:progress' || e.target === 'solo_nara:result_view'), 'automatic steps are not CTA clicks')
  assert.ok(events.some((e: any) => e.event === 'step_view' && e.target === 'solo_nara:result:oksun'))
  const progress = ga.filter(e => e[1] === 'solo_nara_progress').map(e => e[2])
  assert.equal(progress[0].question_id, 'q1')
  assert.equal(progress[1].question_id, undefined)
  assert.equal(ga.find(e => e[1] === 'solo_nara_result_view')[2].result_character, 'oksun')
  const sent = JSON.stringify({ ga, requests })
  for (const banned of ['female', 'answer', 'scores', 'PRIVATE', 'social.example']) assert.ok(!sent.includes(banned), banned)
})

test('DNT suppresses collection and preview never emits telemetry', async () => {
  const a = run('https://umsh.kr/play/solo-nara/', '', true)
  a.context.UMSHSoloNaraTelemetry.track('start'); await a.context.UMSHTrack.flush()
  assert.equal(a.ga.length, 0); assert.equal(a.requests.length, 0)
  const b = run('https://umsh.kr/play/solo-nara/preview.html')
  await b.context.UMSHTrack.flush(); assert.equal(b.ga.length, 0); assert.equal(b.requests.length, 0)
})

test('admin summary counts result characters without inflating overall page views or leaking identifiers', () => {
  const row = (event: string, target: string, service_key: string | null = 'solo_nara') => ({ event, target, service_key, step: 'entry', session_id: 'PRIVATE-session', user_id: 'PRIVATE-user' })
  const rows = [row('step_view', 'solo_nara:source:home'), row('step_view', 'solo_nara:result:oksun'), row('step_view', 'solo_nara:result:oksun'), row('step_view', 'solo_nara:result:PRIVATE'), row('cta_click', 'solo_nara:start'), row('cta_click', 'solo_nara:home', null), row('cta_click', 'solo_nara:PRIVATE')]
  const solo = summarizeSoloNaraRows(rows)
  assert.equal(solo.views, 1); assert.equal(solo.homeClicks, 1)
  assert.equal(solo.results.find(r => r.typeId === 'oksun')!.views, 2)
  assert.equal(solo.results.reduce((s, r) => s + r.views, 0), 2)
  assert.equal(solo.results.length, 14)
  assert.deepEqual(solo.actions.find(a => a.action === 'start'), { action: 'start', events: 1, sessions: 1 })
  assert.ok(!JSON.stringify(solo).includes('PRIVATE'))
  const all = summarizeFunnelRows(rows, 'week', '2026-10-01T00:00:00.000Z')
  assert.equal(all.overview.views, 1, 'result markers are not extra page views')
  assert.equal(all.soloNara!.results.find(r => r.typeId === 'oksun')!.views, 2)
})

test('sharing sends only the public character; cancellation never falls back to clipboard', async () => {
  const source = app.slice(app.indexOf('  function sharePayload(type)'), app.indexOf('  function share(type,'))
    + app.slice(app.indexOf('  async function copyLink(p)'), app.indexOf('  function openSheet(p)'))
  let payload: any, copied = 0
  const C = { characters: { oksun: { name: '옥순', gender: 'female', shareText: '나는 옥순' } }, copy: { sharePreview: { title: 't', description: 'd' } } }
  const context: any = { C, track() {}, isType: (t: unknown) => t === 'oksun', encodeURIComponent, notice() {}, navigator: { share: async (data: unknown) => { payload = data }, clipboard: { writeText: async () => { copied++ } } } }
  runInNewContext(source, context)
  await context.nativeShare(context.sharePayload('oksun'))
  assert.equal(payload.url, 'https://umsh.kr/play/solo-nara/?type=oksun&src=share')
  assert.deepEqual(Object.keys(payload), ['title', 'text', 'url'])
  await context.nativeShare(context.sharePayload('PRIVATE'))
  assert.equal(payload.url, 'https://umsh.kr/play/solo-nara/?src=share')
  context.navigator.share = async () => { throw Object.assign(Error(), { name: 'AbortError' }) }
  await context.nativeShare(context.sharePayload('oksun'))
  assert.equal(copied, 0)
})

test('share buttons open a choice sheet instead of silently copying when the OS share sheet is missing', () => {
  assert.match(app, /track\('share'\);\s*openSheet\(sharePayload\(type\)\)/)
  assert.match(app, /navigator\.share \? '<button class="secondary" id="sheet-native">/)
  assert.match(app, /integrity: 'sha384-/)
})

test('a result for the other name group is rejected instead of shown', () => {
  assert.match(app, /C\.characters\[data\.type\]\.gender !== state\.gender/)
})

test('OAuth callback resumes solo-nara like love-speed and ignores unknown entries', () => {
  const source = read('사주/사주/index.html')
  const functions = source.slice(source.indexOf('      function returnToLoveSpeedAfterAuth'), source.indexOf('      function signupReturnUrl'))
  for (const [entry, expected] of [['solo-nara', '/play/solo-nara/'], ['love-speed', '/play/love-speed/'], ['toString', ''], ['today', '']]) {
    let target = ''
    const context: any = { initialAuthEntry: entry, AUTH_PENDING_KEY: 'pending', AUTH_FORM_KEY: 'form', Object, sessionStorage: { removeItem() {} }, location: { replace: (u: string) => { target = u } } }
    runInNewContext(functions, context)
    assert.equal(context.returnToLoveSpeedAfterAuth({ access_token: 'test-only' }), Boolean(expected), entry)
    assert.equal(target, expected, entry)
  }
})

test('home rail keeps both free tests rotating when the consultation promo is off', async () => {
  const rail = read('사주/js/consultation-rail.js')
  class Node { hidden = false; inert = false; disabled = false; textContent = ''; attrs: Record<string, string> = {}; setAttribute(k: string, v: string) { this.attrs[k] = v }; addEventListener() {} }
  const rail3: any = new Node(), slides = [new Node(), new Node(), new Node()], dots = [new Node(), new Node(), new Node()]
  const nodes = new Map<string, Node>(['[data-rail-pause]', '[data-rail-prev]', '[data-rail-next]', '[data-rail-position]', '.consultation-rail-controls'].map(key => [key, new Node()]))
  Object.assign(rail3, { querySelector: (key: string) => nodes.get(key), querySelectorAll: (key: string) => key === '[data-rail-slide]' ? slides : dots })
  let intervals = 0
  const ctx: any = { document: { querySelector: () => rail3, addEventListener() {}, hidden: false }, matchMedia: () => ({ matches: false, addEventListener() {} }), fetch: async () => { throw new Error('offline') }, clearInterval() {}, setInterval() { intervals++; return 1 }, addEventListener() {} }; ctx.window = ctx
  runInNewContext(rail, ctx); await new Promise(r => setTimeout(r, 0))
  assert.equal(slides[0].hidden, false); assert.equal(slides[1].hidden, true); assert.equal(slides[2].hidden, true)
  assert.equal(dots[2].hidden, true)
  assert.equal(nodes.get('.consultation-rail-controls')!.hidden, false)
  assert.equal(nodes.get('[data-rail-position]')!.textContent, '1 / 2')
  assert.ok(intervals > 0)
  const portal = read('사주/portal.html')
  const slidesHtml = portal.slice(portal.indexOf('consultation-rail-slides'), portal.indexOf('consultation-rail-controls'))
  assert.ok(slidesHtml.indexOf('/play/solo-nara/?src=home') < slidesHtml.indexOf('consultation-promo'), 'consultation must stay the last slide')
  assert.match(portal, /data-track-target="solo_nara:home"/)
})

test('page is readable without JS, deployable, indexed, and loads copy before the game', () => {
  const page = read('사주/play/solo-nara/index.html')
  assert.ok(page.includes('<h1>솔로나라에서 나는 누구?</h1>'))
  assert.ok(!page.includes('나는 솔로'), 'program name stays out of the page')
  assert.ok(page.indexOf('telemetry.js') < page.indexOf('umsh-track.js'))
  assert.ok(page.indexOf('content.js') < page.indexOf('./app.js'))
  assert.match(read('사주/play/solo-nara/preview.html'), /noindex,nofollow/)
  assert.ok(!read('사주/play/solo-nara/preview.html').includes('telemetry.js'))
  assert.ok(read('사주/sitemap.xml').includes('<loc>https://umsh.kr/play/solo-nara/</loc>'))
  assert.ok(read('scripts/prepare-vercel-public.mjs').includes("join(sajuRoot, 'play', 'solo-nara')"))
  assert.match(read('사주/js/umsh-analytics.js'), /love-speed\|solo-nara\)\\\/preview/)
})

test('answers survive a login that returns in another tab, and restart clears every copy', () => {
  const start = app.indexOf('  function save() {'), end = app.indexOf('\n', app.indexOf('  function readSaved()'))
  const makeStore = () => { const m = new Map<string, string>(); return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v) }, removeItem: (k: string) => { m.delete(k) } } }
  const tab = makeStore(), device = makeStore()
  const context: any = { KEY: 'k', state: { gender: 'female', answers: [1, 2], at: 0 }, storageOK: false, sessionStorage: tab, localStorage: device, JSON, Date }
  runInNewContext(app.slice(start, end), context)
  context.save()
  assert.equal(context.storageOK, true)
  tab.m.clear() // a new tab starts with an empty sessionStorage
  assert.deepEqual(context.readSaved().answers, [1, 2])
  context.clear()
  assert.equal(context.readSaved(), null)
  // Storage blocked in both places: the gate must know saving failed.
  const blocked = { getItem() { throw Error('blocked') }, setItem() { throw Error('blocked') }, removeItem() {} }
  Object.assign(context, { sessionStorage: blocked, localStorage: blocked })
  runInNewContext(app.slice(start, end), context)
  context.save()
  assert.equal(context.storageOK, false)
})
