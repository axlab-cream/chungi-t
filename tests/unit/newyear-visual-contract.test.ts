import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), 'utf8')

test('newyear visual QA source is one immutable complete 36-section isolated record', () => {
  const evidence = JSON.parse(read('tone-v2/evaluations/P04-newyear-flow-full-outline-generation-20260913.json'))
  assert.equal(evidence.status, 'pass')
  assert.equal(evidence.serviceKey, 'newyear_flow')
  assert.deepEqual(evidence.completion, {
    completedSections: 36,
    expectedSections: 36,
    recordStatus: 'complete',
    firstFailure: null,
    attemptedAfterFailure: 0,
    attemptedOutsideLimit: 0,
  })
  assert.equal(evidence.provider.syntheticOnly, true)
  assert.equal(evidence.provider.isolatedStorage, true)
  assert.equal(evidence.evidence.containsPersonalData, false)
})

test('newyear actual-record QA server stays local, read-only and fail-closed', () => {
  const path = 'scripts/qa-newyear-live-reader.ts'
  assert.equal(existsSync(join(root, path)), true)
  const source = read(path)
  assert.match(source, /P04-newyear-flow-full-outline-generation-20260913\.json/)
  assert.match(source, /reading-live-20260907\/records/)
  assert.match(source, /recordPath\.startsWith/)
  assert.match(source, /serviceKey !== 'newyear_flow'/)
  assert.match(source, /sections\.length !== 36/)
  assert.match(source, /developmentReportAccess: true/)
  assert.match(source, /127\.0\.0\.1/)
  assert.match(source, /qa\/newyear-mobile-frame/)
  assert.doesNotMatch(source, /app\.(?:post|put|patch|delete)\(/i)
  assert.doesNotMatch(source, /supabase|DATABASE_URL|OPENAI_API_KEY/i)
})

test('verified reader prints every disclosure and protects narrow-screen reflow', () => {
  const css = read('사주/css/umsh-verified-reader.css')
  const access = read('사주/js/umsh-report-access.js')
  assert.match(css, /@media\s+print/)
  assert.match(css, /details\s*>\s*\*:not\(summary\)/)
  assert.match(css, /data-umsh-service-(?:top|bottom)/)
  assert.match(css, /break-inside:\s*avoid/)
  assert.match(css, /overflow-wrap:\s*anywhere/)
  assert.match(css, /@media\s*\(max-width:\s*430px\)/)
  assert.match(css, /summary[^}]*min-height:\s*44px/s)
  assert.match(css, /#umsh-verified-reading\s*>\s*a[^}]*min-height:\s*44px/s)
  assert.match(css, /\.umsh-flag-open/)
  assert.match(access, /beforeprint/)
  assert.match(access, /afterprint/)
  assert.match(access, /details\.reading-card:not\(\[open\]\)/)
})
