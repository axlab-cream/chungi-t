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

test('saju master uses the same sixteen public thumbnails for new and saved reports', () => {
  const generator = read('src/report/report-generator.ts')
  const reader = read('사주/js/umsh-report-access.js')
  const images = [
    '02-core-strength.webp', '03-resilience.webp', '04-criteria.webp', '05-energy-focus.webp',
    '06-restoration.webp', '07-priority.webp', '08-work-money.webp', '09-stay-move.webp',
    '10-value.webp', '11-pattern.webp', '12-comfort.webp', '13-boundary.webp',
    '14-timing.webp', '15-long-flow.webp', '16-year-change.webp', '17-next-signal.webp',
  ]

  assert.match(generator, /SAJU_MASTER_REVIEW_IMAGES/)
  assert.match(generator, /\/assets\/cmdg-report-20261009\//)
  assert.match(reader, /CMDG_TEMPLATE_IMAGES/)
  images.forEach((image) => {
    assert.equal(existsSync(join(root, '사주/사주/assets/cmdg-report-20261009', image)), true, image)
    assert.ok(generator.includes(`'${image}'`), `new report: ${image}`)
    assert.ok(reader.includes(`'${image}'`), `saved report: ${image}`)
  })
  const config = JSON.parse(read('사주/data/longform-blocks.json')).services.cmdg
  assert.equal(config.summaryImage, '/assets/cmdg-report-20261009/00-summary.webp')
  assert.equal(config.cutB, '/assets/cmdg-report-20261009/01-highlight.webp')
  assert.equal(config.thumbnail, '/assets/umsh-cmdg-card-bg.webp')
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
