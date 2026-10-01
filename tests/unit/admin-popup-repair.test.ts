import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { test } from 'node:test'
import { normalizeSignupPopupPayload } from '../../src/marketing/signup-popup.js'

const html = readFileSync('admin-ui/index.html', 'utf8')
test('initial popup form values satisfy the real server validator', () => {
  const names = ['title','headline','subheadline','bodyText','imageSrc','ctaLabel','startsAt','endsAt']
  const form = { elements: Object.fromEntries(names.map(name => [name, { value: '' }])) }
  const defaults = html.slice(html.indexOf('var SIGNUP_POPUP_DEFAULTS'), html.indexOf('function toLocalDateTime'))
  const fill = html.slice(html.indexOf('Object.keys(SIGNUP_POPUP_DEFAULTS)'), html.indexOf("var result = form.querySelector('[data-popup-result]')"))
  const helper = html.slice(html.indexOf('function toLocalDateTime'), html.indexOf('function popupStateLabel'))
  runInNewContext(defaults + helper + fill, { form })
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
  assert.ok(funnel.indexOf("payload.available !== true") < funnel.indexOf('appendKpis(overview, payload.sampled'))
})



test('the editor prefers the published version and never fills from archive', () => {
  const ctx: any = {}
  runInNewContext(html.slice(html.indexOf('function popupEditableVersion'), html.indexOf('async function loadPopupManager')),ctx)
  const archived={state:'archived'},draft={state:'draft'},published={state:'published'}
  assert.equal(ctx.popupEditableVersion([archived,draft,published]),published)
  assert.equal(ctx.popupEditableVersion([archived,draft]),draft)
  assert.equal(ctx.popupEditableVersion([archived]),undefined)
})
