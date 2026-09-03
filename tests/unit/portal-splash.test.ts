import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import test from 'node:test'

const portalPath = new URL('../../사주/portal.html', import.meta.url)
const portalScriptPath = new URL('../../사주/js/portal.js', import.meta.url)
const portalStylePath = new URL('../../사주/css/portal.css', import.meta.url)
const splashVideoPath = new URL('../../사주/사주/assets/umsh-splash.mp4', import.meta.url)

test('portal splash uses the supplied video once per browser session', async () => {
  const [portal, script, style, video] = await Promise.all([
    readFile(portalPath, 'utf8'),
    readFile(portalScriptPath, 'utf8'),
    readFile(portalStylePath, 'utf8'),
    stat(splashVideoPath),
  ])

  assert.match(portal, /src="\/assets\/umsh-splash\.mp4\?v=20260903"/)
  assert.match(portal, /muted[\s\S]*playsinline/)
  assert.match(script, /sessionStorage\.getItem\(SPLASH_SESSION_KEY\)/)
  assert.match(script, /addEventListener\('ended', finishSplash/)
  assert.match(script, /addEventListener\('error', finishSplash/)
  assert.match(script, /setTimeout\(finishSplash, 6500\)/)
  assert.match(style, /\.splash-screen[\s\S]*position: fixed/)
  assert.ok(video.size > 0)
})
