import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('home opens directly without a splash download, overlay or interaction lock', async () => {
  const [html, script, style] = await Promise.all([
    readFile(new URL('../../사주/portal.html', import.meta.url), 'utf8'),
    readFile(new URL('../../사주/js/portal.js', import.meta.url), 'utf8'),
    readFile(new URL('../../사주/css/portal.css', import.meta.url), 'utf8'),
  ])
  assert.match(html, /<main class="phone" aria-label="운명상회 메인">/)
  assert.doesNotMatch(html, /umsh-splash|splashScreen|splash-pending/)
  assert.doesNotMatch(script, /startSplash|phone\.inert\s*=\s*true|SPLASH_SESSION_KEY/)
  assert.doesNotMatch(style, /html\.splash-pending/)
})
