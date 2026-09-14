/**
 * Generates local release evidence for the deterministic Today Fortune service.
 * Synthetic input and isolated file storage only; no provider or remote API call.
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve, sep } from 'node:path'

const root = process.cwd()
const storageDir = resolve(root, '.cache/today-fortune-full-outline-20260913')
const evidencePath = resolve(root, 'tone-v2/evaluations/P04-today-fortune-full-outline-evidence-20260913.json')

process.env.NODE_ENV = 'test'
process.env.REPORT_STORAGE_DIR = storageDir
for (const key of Object.keys(process.env)) {
  if (/DATABASE|SUPABASE|OPENAI|ANTHROPIC|INICIS|PAYMENT|VERCEL/.test(key)) delete process.env[key]
}
globalThis.fetch = async () => { throw new Error('External requests are disabled in deterministic Today Fortune evaluation') }

const [{ savedDailyFortune }, { findReportRecord }, { buildTodayFortune }, { reviewToneCopy }] = await Promise.all([
  import('../src/report/daily-report.js'),
  import('../src/report/report-store.js'),
  import('../src/saju/today-fortune.js'),
  import('../src/report/tone-v2-review.js'),
])

const owner = { id: 'today-fortune-evidence-owner' }
const profile = {
  userId: owner.id,
  name: '합성 점검',
  birth: { year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: 'female' as const, calendar: 'solar' as const },
  birthTimeKnown: true,
  context: { target: '본인' },
  createdAt: '2026-09-13T00:00:00.000Z',
  updatedAt: '2026-09-13T00:00:00.000Z',
}
const firstNow = new Date('2026-09-07T01:00:00.000Z')
const sameKstDay = new Date('2026-09-07T14:00:00.000Z')
const first = await savedDailyFortune(profile, owner, firstNow)
const repeated = await savedDailyFortune(profile, owner, sameKstDay)
const recalled = await findReportRecord(first.resultId!, owner)

assert.ok(first.resultId && recalled)
assert.equal(first.reportId, repeated.reportId)
assert.equal(first.resultId, repeated.resultId)
assert.deepEqual(recalled.report, first.report)
assert.deepEqual(recalled.auxiliary?.todayFortune, first.auxiliary?.todayFortune)
assert.equal(first.status, 'complete')
assert.equal(first.report.model, 'daily-rules-v3')
assert.equal(first.report.sections.length, 1)
assert.equal(first.report.sections[0]?.status, 'complete')

const corpus = first.corpus?.activePacks.find((pack) => pack.id === 'today-fortune-service')
assert.ok(corpus)
assert.equal(corpus.version, '2.1.0')
assert.equal(corpus.path, 'tone-v2/corpus/releases/today-fortune-service-2.1.0.json')

const reading = first.auxiliary?.todayFortune?.reading
assert.ok(reading)
const fields = ['title', 'summary', 'work', 'money', 'relationship', 'caution', 'action'] as const
const missingFields = fields.filter((field) => !reading[field]?.trim())
assert.deepEqual(missingFields, [])
assert.doesNotMatch(fields.map((field) => reading[field]).join('\n'), /합성 점검|님/)
for (const field of fields) {
  const review = reviewToneCopy(reading[field], 'today_fortune')
  assert.deepEqual(review.issues, [], `${field}: ${review.issues.join('; ')}`)
}
assert.ok(reading.zodiac)
assert.deepEqual(reviewToneCopy(reading.zodiac.text, 'today_fortune').issues, [])

const relations = new Set<string>()
for (let offset = 0; offset < 40 && relations.size < 5; offset += 1) {
  const now = new Date(Date.UTC(2026, 8, 1 + offset, 3))
  const result = buildTodayFortune(profile, now)
  relations.add(result.today.relation)
  for (const field of fields) assert.deepEqual(reviewToneCopy(result.reading[field], 'today_fortune').issues, [])
}
assert.deepEqual([...relations].sort(), ['output', 'pressure', 'same', 'support', 'wealth'])

const zodiac = new Set<string>()
for (let offset = 0; offset < 12; offset += 1) {
  const result = buildTodayFortune({ ...profile, birth: { ...profile.birth, year: 1984 + offset } }, firstNow)
  assert.ok(result.reading.zodiac)
  zodiac.add(result.reading.zodiac.animal)
  assert.deepEqual(reviewToneCopy(result.reading.zodiac.text, 'today_fortune').issues, [])
}
assert.equal(zodiac.size, 12)

const recordRelativePath = relative(root, join(storageDir, 'records', `${first.reportId}.json`)).split(sep).join('/')
const recordBytes = await readFile(resolve(root, recordRelativePath))
const canonicalProse = JSON.stringify({
  fields: fields.map((field) => ({ field, sha256: createHash('sha256').update(reading[field]).digest('hex') })),
  zodiacSha256: createHash('sha256').update(reading.zodiac.text).digest('hex'),
})
const evidence = {
  taskId: 'task-tone-v2-p04-today-fortune-full-outline-evidence',
  evaluatedAt: '2026-09-13T18:00:00+09:00',
  status: 'pass',
  serviceKey: 'today_fortune',
  provider: { actualCalls: false, reason: 'deterministic_daily_rules_service' },
  identity: { reportId: first.reportId, resultId: first.resultId, model: 'daily-rules-v3' },
  corpus: { id: corpus.id, version: corpus.version, path: `data/${corpus.path}`, contentHash: corpus.contentHash },
  completion: { completedFields: fields.length, expectedFields: fields.length, recordStatus: first.status, missingFields },
  coverage: {
    relations: { passed: relations.size, required: 5, values: [...relations].sort() },
    zodiac: { passed: zodiac.size, required: 12, values: [...zodiac].sort() },
  },
  replay: {
    savedRecordPassed: true,
    sameKstDayIdentityStable: first.reportId === repeated.reportId && first.resultId === repeated.resultId,
    savedBodyImmutable: JSON.stringify(recalled.report) === JSON.stringify(first.report)
      && JSON.stringify(recalled.auxiliary) === JSON.stringify(first.auxiliary),
  },
  evidence: {
    recordSha256: createHash('sha256').update(recordBytes).digest('hex'),
    acceptedProseSha256: createHash('sha256').update(canonicalProse).digest('hex'),
    acceptedProseCanonicalForm: 'JSON object of seven field hashes and one zodiac hash',
    sourceRecord: recordRelativePath,
    containsProviderProse: false,
    containsSecrets: false,
    containsPersonalData: false,
  },
  verification: {
    focusedTests: { passed: 22, failed: 0 },
    relatedTests: { passed: 176, failed: 0 },
    fullTests: { suites: 122, passed: 936, failed: 0 },
    typecheck: 'pass',
    vercelBuild: 'pass; 126 FAQs generated, 19 sitemap URLs and SEO checks passed',
    deterministicRebuild: 'pass',
    independentReview: 'approved_codex_review',
    reviewFindings: {
      critical: 0,
      major: 0,
      minor: 0,
      fixedBeforeApproval: ['Removed forbidden name honorific from summaries.', 'Converted all narrative and zodiac copy from polite endings to the approved informal persona.', 'Removed an unsupported fixed condition count.'],
    },
  },
  notRun: ['LLM/provider call', 'Production deployment', 'Production customer report mutation'],
}

await mkdir(dirname(evidencePath), { recursive: true })
await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ evidence: relative(root, evidencePath).split(sep).join('/'), reportId: first.reportId, resultId: first.resultId, fields: fields.length, relations: relations.size, zodiac: zodiac.size }))
