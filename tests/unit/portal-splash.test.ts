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
  assert.match(portal, /autoplay[\s\S]*muted[\s\S]*playsinline/)
  assert.match(portal, /document\.documentElement\.classList\.add\(shouldShowSplash \? 'splash-pending' : 'splash-disabled'\)/)
  assert.match(portal, /id="splashScreen" aria-hidden="false">/)
  assert.doesNotMatch(portal, /id="splashScreen"[^>]*\shidden(?:\s|>)/)
  assert.match(script, /sessionStorage\.getItem\(SPLASH_SESSION_KEY\)/)
  assert.match(script, /classList\.contains\('splash-pending'\)/)
  assert.match(script, /classList\.add\('splash-disabled'\)/)
  assert.match(script, /addEventListener\('ended', finishSplash/)
  assert.match(script, /addEventListener\('error', finishSplash/)
  assert.match(script, /setTimeout\(finishSplash, 6500\)/)
  assert.match(style, /\.splash-screen[\s\S]*position: fixed/)
  assert.match(style, /html\.splash-pending \.stage\s*{\s*visibility: hidden;/)
  assert.ok(video.size > 0)
})
