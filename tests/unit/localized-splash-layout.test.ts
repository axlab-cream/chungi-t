import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'

function portal(locale: string) {
  return readFileSync(new URL(`../../.vercel-localized/${locale}/portal.html`, import.meta.url), 'utf8')
}
function layout(html: string) {
  const match = html.match(/<style id="localized-splash-layout">([\s\S]*?)<\/style>/)
  assert.ok(match, 'Localized splash needs its own layout because shared Korean splash styles were removed')
  return match[1]
}
function rule(css: string, selector: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = css.match(new RegExp(escaped + '\\s*\\{([^}]*)\\}'))
  assert.ok(match, `Missing layout rule: ${selector}`)
  return match[1]
}
for (const locale of ['en', 'ja']) {
  test(`${locale} splash covers the viewport and centers an uncropped video, then hides correctly`, () => {
    const html = portal(locale)
    const css = layout(html)
    const screen = rule(css, '.splash-screen')
    assert.match(screen, /position:\s*fixed/)
    assert.match(screen, /inset:\s*0/)
    assert.match(screen, /display:\s*grid/)
    assert.match(screen, /place-items:\s*center/)
    const video = rule(css, '.splash-video')
    assert.match(video, /width:\s*min\(430px,\s*100%\)/)
    assert.match(video, /height:\s*100vh/)
    assert.match(video, /height:\s*100dvh/)
    assert.match(video, /object-fit:\s*contain/)
    assert.match(video, /object-position:\s*center/)
    assert.doesNotMatch(video, /object-fit:\s*cover|transform:/)
    assert.match(rule(css, '.splash-screen[hidden]'), /display:\s*none/)
    assert.match(css, /html\.splash-disabled \.splash-screen,\s*\.splash-screen\[hidden\]\s*\{\s*display:\s*none/)
    assert.match(rule(css, '.splash-screen.is-closing'), /pointer-events:\s*none/)
    assert.match(rule(css, '.splash-screen.is-closing'), /opacity:\s*0/)
    const skip = rule(css, '.splash-skip')
    assert.match(skip, /left:\s*50%/)
    assert.match(skip, /transform:\s*translateX\(-50%\)/)
    assert.ok(html.includes('id="splashScreen"'))
    assert.ok(html.includes('id="splashVideo"'))
    assert.ok(html.includes('data-splash-skip'))
    assert.doesNotMatch(css, /(?:^|\n)\s*(?:body|\.stage|\.phone)\s*\{/)
  })
}
test('EN and JA use identical localized splash layout', () => {
  assert.equal(layout(portal('en')), layout(portal('ja')))
})
test('Korean home remains splash-free and shared Korean CSS is not restored', () => {
  const ko = readFileSync(new URL('../../사주/portal.html', import.meta.url), 'utf8')
  const shared = readFileSync(new URL('../../사주/css/portal.css', import.meta.url), 'utf8')
  assert.ok(!ko.includes('id="splashScreen"'))
  assert.ok(!ko.includes('localized-splash-layout'))
  assert.doesNotMatch(shared, /\.splash-screen\s*\{/)
})
