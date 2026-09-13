import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import test from 'node:test'
import { getCorpusSnapshot } from '../../src/rag/corpus-registry.js'

const root = process.cwd()

test('active pass_angle corpus is the reviewed 2.1.0 snapshot', () => {
  const pack = getCorpusSnapshot().activePacks.find((item) => item.id === 'pass-angle-service')
  assert.ok(pack)
  assert.equal(pack.serviceKey, 'pass_angle')
  assert.equal(pack.version, '2.1.0')
  assert.equal(pack.path, 'tone-v2/corpus/releases/pass-angle-service-2.1.0.json')
  const hash = createHash('sha256').update(readFileSync(join(root, 'data', pack.path))).digest('hex')
  assert.equal(pack.contentHash, hash.slice(0, 16))
})

test('live generation fails before provider use unless the stored record pins corpus 2.1.0', () => {
  const source = readFileSync(join(root, 'scripts/check-pass-angle-outline-live.ts'), 'utf8')
  assert.match(source, /const expectedCorpusVersion = '2\.1\.0'/)
  assert.match(source, /assert\.equal\(recordCorpusPack\?\.version, expectedCorpusVersion/)
  assert.match(source, /assert\.equal\(recordCorpusPack\?\.contentHash, expectedCorpusHash/)
  assert.match(source, /corpusSnapshot: record!\.corpus/)
  assert.match(source, /for \(const section of created\.record\.report\.sections/)
  assert.ok(source.indexOf('recordCorpusPack?.version') < source.indexOf('for (const section of created.record.report.sections'))
})

test('current candidate attaches the fresh corpus-2.1.0 generation evidence', () => {
  const release = JSON.parse(readFileSync(join(root, 'tone-v2/releases/pass-angle-2.1.0.json'), 'utf8'))
  assert.equal(release.generationEvidence.path, 'tone-v2/evaluations/P04-pass-angle-2-1-full-outline-generation-20260913.json')
  assert.equal(release.generationEvidence.containsProviderProse, false)
  assert.equal('generationEvidenceReason' in release, false)
  assert.equal(release.gates.providerOutputEvaluation, 'pass_52_of_52')
  assert.equal(release.deployed, false)
})
