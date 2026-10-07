import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { test } from 'node:test'

/**
 * 2026-10-07 Microsoft Clarity 히트맵.
 * 지키는 것 — 개인 정보 화면은 글자를 가리고, 식별자가 붙은 주소에서는 싣지 않고,
 * GA4 와 같은 조건(운영 주소·DNT·QA 유입)에서만 동작한다.
 */
const raw = readFileSync(new URL('../../사주/js/umsh-analytics.js', import.meta.url), 'utf8')
const withId = raw
const withoutId = raw.replace("var CLARITY_PROJECT_ID = 'ytxpdvt9bu';", "var CLARITY_PROJECT_ID = '';")

function load(href: string, options: { source?: string; dnt?: string } = {}) {
  const url = new URL(href)
  const scripts: string[] = []
  const attrs: Record<string, string> = {}
  const store = new Map<string, string>()
  const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) }
  const ctx: any = {
    URL, Date, Promise, setTimeout, clearTimeout,
    location: { origin: url.origin, pathname: url.pathname, href },
    navigator: { doNotTrack: options.dnt }, sessionStorage: storage, localStorage: storage,
    addEventListener() {},
    document: {
      referrer: '',
      documentElement: { setAttribute: (k: string, v: string) => { attrs[k] = v }, appendChild() {} },
      createElement: () => ({}),
      head: { appendChild: (node: any) => scripts.push(String(node.src || '')) },
    },
  }
  runInNewContext(options.source ?? withId, ctx)
  return { clarity: scripts.filter(s => s.includes('clarity.ms')), attrs }
}

test('empty project id keeps Clarity off', () => {
  assert.notEqual(withoutId, raw)
  assert.equal(load('https://umsh.kr/', { source: withoutId }).clarity.length, 0)
})

test('shared pages load Clarity with text visible', () => {
  for (const href of ['https://umsh.kr/', 'https://umsh.kr/love/signal/', 'https://umsh.kr/love/signal/01-step-1-story/index.html', 'https://umsh.kr/faq', 'https://umsh.kr/?utm_source=instagram&src=share']) {
    const { clarity, attrs } = load(href)
    assert.deepEqual(clarity, ['https://www.clarity.ms/tag/ytxpdvt9bu'], href)
    assert.equal(attrs['data-clarity-unmask'], 'true', href)
    assert.equal(attrs['data-clarity-mask'], undefined, href)
  }
})

test('input, report, payment and account pages are fully masked', () => {
  for (const href of ['https://umsh.kr/love/signal/02-step-2-saju-input/index.html', 'https://umsh.kr/love/signal/04-step-4-report/index.html', 'https://umsh.kr/today/free/', 'https://umsh.kr/vault.html', 'https://umsh.kr/my.html', 'https://umsh.kr/play/solo-nara/']) {
    const { clarity, attrs } = load(href)
    assert.equal(clarity.length, 1, href)
    assert.equal(attrs['data-clarity-mask'], 'true', href)
    assert.equal(attrs['data-clarity-unmask'], undefined, href)
  }
})

test('addresses carrying identifiers never reach Clarity', () => {
  for (const href of ['https://umsh.kr/payment/?product=couple_signal&reportId=PRIVATE', 'https://umsh.kr/payment/result?orderId=PRIVATE&state=paid', 'https://umsh.kr/love/signal/04-step-4-report/index.html?reportId=PRIVATE', 'https://umsh.kr/?code=PRIVATE']) {
    assert.equal(load(href).clarity.length, 0, href)
  }
})

test('local, DNT and QA referral stay off like GA4', () => {
  assert.equal(load('http://localhost:8790/').clarity.length, 0)
  assert.equal(load('https://umsh.kr/', { dnt: '1' }).clarity.length, 0)
})

test('privacy policy names both analytics tools', () => {
  const policy = readFileSync(new URL('../../사주/privacy.html', import.meta.url), 'utf8')
  assert.ok(policy.includes('Google Analytics 4'))
  assert.ok(policy.includes('Microsoft Clarity'))
})
