/** Local-only synthetic browser fixture. Never loads credentials or writes customer data. */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import type { UserBirthProfile } from '../src/user/profile-store.js'

process.env.NODE_ENV = 'test'
for (const key of Object.keys(process.env)) {
  if (/DATABASE|SUPABASE|OPENAI|ANTHROPIC|INICIS|PAYMENT|VERCEL|REPORT_STORAGE/.test(key)) delete process.env[key]
}
globalThis.fetch = async () => { throw new Error('External server requests disabled in the today UI fixture') }
const { default: express } = await import('express')
const { buildTodayFortune } = await import('../src/saju/today-fortune.js')
const profile: UserBirthProfile = {
  userId: 'local-synthetic-only', name: '가상 고객',
  birth: { year: 1995, month: 5, day: 15, hour: 14, gender: 'female', calendar: 'solar' },
  birthTimeKnown: true, context: {},
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
}
const fortune = buildTodayFortune(profile, new Date('2026-09-07T03:00:00Z'))
const fixturePayload = {
  resultId: 'local-today-ui', reportId: 'local-today-ui', publicUrl: '/r/local-today-ui',
  todayFortune: fortune,
  report: { serviceKey: 'today', title: '오늘운 UI 합성 검증', sections: [], status: 'complete' },
}
const portalSource = readFileSync(new URL('../사주/사주/index.html', import.meta.url), 'utf8')
const dailySource = readFileSync(new URL('../사주/today/free/index.html', import.meta.url), 'utf8')
const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g,
  char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)

// Match tests/unit/today-portal-view.test.ts: a refactor must fail explicitly
// instead of silently rendering a copied template or synthetic score markup.
function functionSource(name: string, nextName: string) {
  const start = portalSource.indexOf(`      function ${name}(`)
  const end = portalSource.indexOf(`      function ${nextName}(`, start)
  assert.ok(start >= 0 && end > start, `Portal function boundary missing: ${name}`)
  return portalSource.slice(start, end)
}
function portalMarkup() {
  const stage = { innerHTML: '' }
  runInNewContext(`${functionSource('formatInterpretationHtml', 'renderReportTocMarkup')}\n${functionSource('renderTodayResult', 'loveDohwaInfoFromPillars')}\nrenderTodayResult()`, {
    stage, state: { name: profile.name, scene: 'todayResult', todayFortune: fortune }, escapeHtml,
    document: { readyState: 'complete', getElementById: () => null }, window: {},
  }, { timeout: 1000 })
  assert.ok(stage.innerHTML.includes('today-result-card'), 'Real today renderer produced no result')
  return stage.innerHTML
}
function safeHead(source: string) {
  const head = source.match(/<head>([\s\S]*?)<\/head>/)?.[1]
  assert.ok(head, 'Fixture source has no head')
  // Real CSS is retained, but auth/analytics/application scripts never execute.
  // CSP additionally prevents external requests through any nested resource.
  return head.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<link\b[^>]*href\s*=\s*["'](?:https?:)?\/\/[^>]*>/gi, '')
}
function widthOf(value: unknown) { return value === '320' ? 320 : value === '375' ? 375 : 430 }
function documentHtml(head: string, body: string, width: number, scripts: string) {
  // Narrow columns, not viewport emulation: actual viewport media queries and
  // safe-area insets remain unchanged. Relative portal assets still use /cmdg/.
  return `<!doctype html><html lang="ko"><head><base href="/cmdg/">${head}
    <style data-local-qa-width>:root{--umsh-page-width:${width}px}.phone,#umsh-verified-layout,main[data-today-landing]{width:min(100vw,${width}px)!important}</style>
    ${scripts}</head><body data-local-synthetic-fixture="today" data-qa-width="${width}">${body}</body></html>`
}

const fixture = express()
fixture.disable('x-powered-by')
fixture.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src 'none'; object-src 'none'; form-action 'none'; base-uri 'self'")
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.status(405).json({ error: 'Synthetic fixture is read-only' }); return }
  next()
})
// Loopback-only fixture endpoints: no production app or storage module is imported.
fixture.get('/api/auth/config', (_req, res) => res.json({ enabled: false, developmentReportAccess: true }))
fixture.get('/api/report/local-today-ui', (_req, res) => res.json(fixturePayload))
fixture.get('/today/free', (req, res) => {
  if (!req.query.reportId) {
    const body = dailySource.match(/<body>([\s\S]*?)<\/body>/)?.[1].replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    assert.ok(body, 'Today landing body missing')
    res.type('html').send(documentHtml(safeHead(dailySource), body, widthOf(req.query.width),
      '<script src="/js/umsh-chrome.js" defer></script><script src="/js/service-public-detail.js" defer></script><script>document.addEventListener("DOMContentLoaded",function(){window.UMSHServiceDetail.render();});</script>'))
    return
  }
  if (req.query.reportId !== 'local-today-ui') { res.status(400).send('Use reportId=local-today-ui for this synthetic fixture'); return }
  res.type('html').send(documentHtml(safeHead(dailySource), '', widthOf(req.query.width),
    '<script src="/js/umsh-chrome.js" defer></script><script src="/js/umsh-report-access.js" defer></script>'))
})
fixture.get('/__qa/today-portal', (req, res) => {
  const main = portalSource.match(/<main\b[^>]*class="phone"[^>]*>/)?.[0]
  const stage = portalSource.match(/<section\b[^>]*id="stage"[^>]*>/)?.[0]
  assert.ok(main && stage, 'Portal shell mount boundaries missing')
  const mainToday = main.replace(/data-scene="[^"]*"/, 'data-scene="result"')
    .replace(/data-step="[^"]*"/, 'data-step="todayResult"')
    .replace(/aria-label="[^"]*"/, 'aria-label="오늘운 합성 검증"')
  res.type('html').send(documentHtml(safeHead(portalSource), `${mainToday}${stage}${portalMarkup()}</section></main>`, widthOf(req.query.width),
    '<script src="/js/umsh-chrome.js" defer></script><script>document.addEventListener("DOMContentLoaded",function(){window.UMSHChrome.mount({root:".phone",service:"오늘의 사주 풀이",category:"흐름"});});</script>'))
})
// Serve actual reading/chrome JS only, not auth/payment/application code. Public
// asset directories are explicit; neither repository root nor dotfiles are served.
for (const name of ['umsh-chrome.js', 'service-shell.js', 'umsh-report-access.js', 'service-public-detail.js']) {
  fixture.get(`/js/${name}`, (_req, res) => res.sendFile(fileURLToPath(new URL(`../사주/js/${name}`, import.meta.url))))
}
fixture.use('/css', express.static(fileURLToPath(new URL('../사주/css', import.meta.url)), { index: false, dotfiles: 'deny' }))
fixture.use('/assets', express.static(fileURLToPath(new URL('../사주/assets', import.meta.url)), { index: false, dotfiles: 'deny' }))
fixture.use(['/assets', '/cmdg/assets'], express.static(fileURLToPath(new URL('../사주/사주/assets', import.meta.url)), { index: false, dotfiles: 'deny' }))
fixture.use((_req, res) => res.status(404).send('Outside the local synthetic today fixture'))
fixture.listen(8796, '127.0.0.1', () => {
  console.log('Synthetic reader: http://127.0.0.1:8796/today/free?reportId=local-today-ui&width=375')
  console.log('Synthetic portal: http://127.0.0.1:8796/__qa/today-portal?width=320')
})
