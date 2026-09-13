import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), 'utf8')

test('pass angle visual QA source is the immutable complete corpus-2.1.0 52-section result', () => {
  const evidence = JSON.parse(read('tone-v2/evaluations/P04-pass-angle-2-1-full-outline-generation-20260913.json'))
  assert.equal(evidence.status, 'pass')
  assert.equal(evidence.serviceKey, 'pass_angle')
  assert.equal(evidence.corpus.version, '2.1.0')
  assert.deepEqual(evidence.completion, { completedSections: 52, expectedSections: 52, recordStatus: 'complete', firstFailure: null, attemptedAfterFailure: 0, attemptedOutsideLimit: 0 })
  assert.equal(evidence.provider.actualCalls, true)
  assert.equal(evidence.provider.syntheticOnly, true)
  assert.equal(evidence.provider.isolatedStorage, true)
  assert.equal(evidence.evidence.containsPersonalData, false)
})

test('pass angle actual-record QA server stays loopback-only, read-only and fail-closed', () => {
  const path = 'scripts/qa-pass-angle-live-reader.ts'
  assert.equal(existsSync(join(root, path)), true)
  const source = read(path)
  assert.match(source, /P04-pass-angle-2-1-full-outline-generation-20260913\.json/)
  assert.match(source, /reading-live-20260907\/records/)
  assert.match(source, /recordPath\.startsWith/)
  assert.match(source, /record\.reportId !== evidence\.identity\.reportId/)
  assert.match(source, /record\.resultId !== evidence\.identity\.resultId/)
  assert.match(source, /serviceKey !== 'pass_angle'/)
  assert.match(source, /corpusPack\?\.version !== evidence\.corpus\.version/)
  assert.match(source, /sections\.length !== 52/)
  assert.match(source, /developmentReportAccess: true/)
  assert.match(source, /127\.0\.0\.1/)
  assert.match(source, /qa\/pass-angle-mobile-frame/)
  assert.doesNotMatch(source, /app\.(?:post|put|patch|delete)\(/i)
  assert.doesNotMatch(source, /supabase|DATABASE_URL|OPENAI_API_KEY/i)
})

test('verified reader provides complete print and narrow-screen contracts for pass angle', () => {
  const css = read('사주/css/umsh-verified-reader.css')
  const access = read('사주/js/umsh-report-access.js')
  assert.match(css, /@media\s+print/)
  assert.match(css, /details\s*>\s*\*:not\(summary\)/)
  assert.match(css, /#umsh-verified-reading\s*>\s*span[^}]*color:\s*#111\s*!important/s)
  assert.match(css, /#umsh-verified-reading\s*>\s*p[^}]*color:\s*#111\s*!important/s)
  assert.match(css, /data-umsh-service-(?:top|bottom)/)
  assert.match(css, /break-inside:\s*avoid/)
  assert.match(css, /overflow-wrap:\s*anywhere/)
  assert.match(css, /@media\s*\(max-width:\s*430px\)/)
  assert.match(css, /summary[^}]*min-height:\s*44px/s)
  assert.match(css, /#umsh-verified-layout\s+\.app-back[^}]*min-(?:width|inline-size):\s*44px[^}]*min-(?:height|block-size):\s*44px/s)
  assert.match(css, /#umsh-verified-reading\s+nav\s+a[^}]*min-height:\s*44px/s)
  assert.match(css, /#umsh-verified-layout\s+\.umsh-flag-open[^}]*min-height:\s*44px/s)
  assert.match(css, /\.bottom-menu-close[^}]*min-height:\s*48px/s)
  assert.match(access, /beforeprint/)
  assert.match(access, /afterprint/)
  assert.match(access, /details\.reading-card:not\(\[open\]\)/)
})
