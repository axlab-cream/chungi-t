import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), 'utf8')

test('saju master visual QA source is the immutable complete 37-section result', () => {
  const evidence = JSON.parse(read('tone-v2/evaluations/P04-saju-master-full-outline-generation-20260914.json'))
  assert.equal(evidence.status, 'pass')
  assert.equal(evidence.serviceKey, 'saju_master')
  assert.equal(evidence.completion.completedSections, 37)
  assert.equal(evidence.completion.expectedSections, 37)
  assert.equal(evidence.replay.passed, 37)
  assert.equal(evidence.provider.actualCalls, true)
  assert.equal(evidence.provider.syntheticOnly, true)
  assert.equal(evidence.provider.isolatedStorage, true)
  assert.equal(evidence.evidence.containsPersonalData, false)
})

test('saju master actual-record QA server stays loopback-only, read-only and fail-closed', () => {
  const path = 'scripts/qa-saju-master-live-reader.ts'
  assert.equal(existsSync(join(root, path)), true)
  const source = read(path)
  assert.match(source, /P04-saju-master-full-outline-generation-20260914\.json/)
  assert.match(source, /reading-live-20260914-saju-master/)
  assert.match(source, /recordPath\.startsWith/)
  assert.match(source, /record\.reportId !== evidence\.identity\.reportId/)
  assert.match(source, /record\.resultId !== evidence\.identity\.resultId/)
  assert.match(source, /serviceKey !== 'saju_master'/)
  assert.match(source, /corpusPack\?\.version !== '2\.1\.0'/)
  assert.match(source, /sections\.length !== 37/)
  assert.match(source, /developmentReportAccess: true/)
  assert.match(source, /cmdg\/index\.html/)
  assert.match(source, /sendFile\(resolve\('사주\/report-view\.html'\)\)/)
  assert.match(source, /127\.0\.0\.1/)
  assert.match(source, /qa\/saju-master-mobile-frame/)
  assert.doesNotMatch(source, /app\.(?:post|put|patch|delete)\(/i)
  assert.doesNotMatch(source, /supabase|DATABASE_URL|OPENAI_API_KEY/i)
})

test('shared result permalink derives its immutable identity before booting the generic reader', () => {
  const source = read('사주/js/umsh-report-access.js')
  assert.match(source, /function isPermalink\(\)/)
  assert.match(source, /decodeURIComponent\(location\.pathname\.replace\(\/\^\\\/r\\\//)
  assert.match(source, /\(!key && !isPermalink\(\)\)/)
  assert.match(source, /\(key \|\| isPermalink\(\)\) && isOutputPage\(\)/)
})

test('saju master release requires sanitized desktop, mobile and print evidence', () => {
  const evidencePath = 'tone-v2/evaluations/P04-saju-master-visual-render-evidence-20260914.json'
  assert.equal(existsSync(join(root, evidencePath)), true)
  const evidence = JSON.parse(read(evidencePath))
  const release = JSON.parse(read('tone-v2/releases/saju-master-2.1.0.json'))
  assert.equal(evidence.status, 'pass')
  assert.equal(evidence.serviceKey, 'saju_master')
  assert.equal(evidence.source.expectedSections, 37)
  assert.equal(evidence.render.desktop.passed, true)
  assert.equal(evidence.render.mobile.passed, true)
  assert.equal(evidence.print.passed, true)
  assert.deepEqual(evidence.privacy, { containsProviderProse: false, containsSecrets: false, containsPersonalData: false })
  assert.equal(release.visualEvidence.path, evidencePath)
  assert.equal(release.visualEvidence.containsProviderProse, false)
})
