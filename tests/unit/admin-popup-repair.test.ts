import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { test } from 'node:test'
import { normalizeSignupPopupPayload } from '../../src/marketing/signup-popup.js'

const html = readFileSync('admin-ui/index.html', 'utf8')
test('initial popup form values satisfy the real server validator', () => {
  const names = ['title','headline','subheadline','bodyText','imageSrc','ctaLabel','startsAt','endsAt']
  const form = { elements: Object.fromEntries(names.map(name => [name, { value: '' }])), querySelector: () => ({ textContent: '' }) }
  const defaults = html.slice(html.indexOf('var SIGNUP_POPUP_DEFAULTS'), html.indexOf('function toLocalDateTime'))
  // 2026-10-07: 새 팝업의 초기값은 오른쪽 편집 칸을 여는 fillEditor(null) 이 채운다.
  const fill = html.slice(html.indexOf('function fillEditor(item) {'), html.indexOf('        function renderList() {'))
  const helper = html.slice(html.indexOf('function toLocalDateTime'), html.indexOf('function popupStateLabel'))
  const noop = () => {}
  runInNewContext(defaults + helper + fill + 'fillEditor(null)', { form, showEditor: noop, refreshPopupPreview: noop, renderList: noop, editorTitle: {}, result: {}, selectedId: null, popupStateLabel: noop })
  assert.ok(new Date(form.elements.endsAt.value).getTime() > Date.now())
  const value = (key: string) => form.elements[key].value
  assert.doesNotThrow(() => normalizeSignupPopupPayload({title:value('title'),headline:value('headline'),subheadline:value('subheadline'),body:value('bodyText'),imageSrc:value('imageSrc'),ctaLabel:value('ctaLabel'),campaignEndAt:new Date(value('endsAt')).toISOString()},new Date(value('startsAt')).toISOString()))
})

test('popup validation errors have actionable 422 responses', () => {
  const source=readFileSync('src/server/app.ts','utf8')
  const mapping=source.slice(source.indexOf('const CONTENT_FAILURES:'),source.indexOf('function respondContentFailure'))
  const context: any={}
  runInNewContext(mapping.replace(/const CONTENT_FAILURES:[\s\S]*?= \{/, 'var failures = {'),context)
  for(const code of ['SIGNUP_POPUP_PAYLOAD_INVALID','SIGNUP_POPUP_PERIOD_INVALID']) {
    assert.equal(context.failures[code]?.status,422)
    assert.ok(context.failures[code]?.error.length>10)
  }
})


test('network failures cannot resurrect the built-in popup', async () => {
  const script = readFileSync('사주/js/umsh-signup-benefit-popup.js','utf8')
  const loader = script.slice(script.indexOf('function loadPopup()'), script.indexOf('function show(popup)'))
  for (const fetch of [undefined, async () => { throw new Error('offline') }, async () => ({status:503,ok:false})]) {
    const context: any = { global: { fetch }, DEFAULT_POPUP: {id:'builtin'}, Promise }
    runInNewContext(loader,context)
    assert.equal(await context.loadPopup(),null)
  }
})

test('unavailable statistics are rejected before zero-valued KPI rendering', () => {
  const popup=html.slice(html.indexOf('async function loadPopupManager'),html.indexOf('function renderContentDetail'))
  assert.ok(popup.indexOf("funnelPayload.available !== true") < popup.indexOf('popupClickCounts = {}'))
  assert.match(popup,/responsePayload.versionStore !== 'ready'/)
  const funnel=html.slice(html.indexOf('async function loadFunnelAnalytics'),html.indexOf('async function loadReleaseInfo'))
  assert.ok(funnel.indexOf("payload.available !== true") < funnel.indexOf('funnelState.payload = payload'))
  // 2026-10-08: 숫자는 render() 가 그린다. render 는 확인을 통과해 payload 가 채워진 뒤에만 그린다.
  assert.match(funnel, /var payload = funnelState\.payload;\s+body\.replaceChildren\(\);\s+if \(!payload\) return;/)
})



test('the editor prefers the published version and never fills from archive', () => {
  const ctx: any = {}
  runInNewContext(html.slice(html.indexOf('function popupEditableVersion'), html.indexOf('async function loadPopupManager')),ctx)
  const archived={state:'archived'},draft={state:'draft'},published={state:'published'}
  assert.equal(ctx.popupEditableVersion([archived,draft,published]),published)
  assert.equal(ctx.popupEditableVersion([archived,draft]),draft)
  assert.equal(ctx.popupEditableVersion([archived]),undefined)
})
