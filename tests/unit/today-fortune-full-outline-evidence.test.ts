import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import test from 'node:test'

const root = process.cwd()
const evidencePath = 'tone-v2/evaluations/P04-today-fortune-full-outline-evidence-20260913.json'

function readJson(relativePath: string): any {
  return JSON.parse(readFileSync(join(root, relativePath), 'utf8'))
}

function hash(relativePath: string): string {
  return createHash('sha256').update(readFileSync(join(root, relativePath))).digest('hex')
}

test('today_fortune attaches complete deterministic full-outline evidence without pretending to call a provider', () => {
  const evidence = readJson(evidencePath)
  const release = readJson('tone-v2/releases/today-fortune-2.1.0.json')

  assert.equal(evidence.status, 'pass')
  assert.equal(evidence.serviceKey, 'today_fortune')
  assert.deepEqual(evidence.provider, { actualCalls: false, reason: 'deterministic_daily_rules_service' })
  assert.deepEqual(evidence.completion, {
    completedFields: 7,
    expectedFields: 7,
    recordStatus: 'complete',
    missingFields: [],
  })
  assert.equal(evidence.coverage.relations.passed, 5)
  assert.equal(evidence.coverage.relations.required, 5)
  assert.equal(evidence.coverage.zodiac.passed, 12)
  assert.equal(evidence.coverage.zodiac.required, 12)
  assert.equal(evidence.replay.savedRecordPassed, true)
  assert.equal(evidence.replay.sameKstDayIdentityStable, true)
  assert.equal(evidence.replay.savedBodyImmutable, true)
  assert.equal(evidence.verification.independentReview, 'approved_codex_review')
  assert.equal(evidence.evidence.containsProviderProse, false)
  assert.equal(evidence.evidence.containsSecrets, false)
  assert.equal(evidence.evidence.containsPersonalData, false)

  assert.equal(release.generationEvidence.path, evidencePath)
  assert.equal(release.generationEvidence.recordSha256, evidence.evidence.recordSha256)
  assert.equal(release.generationEvidence.acceptedProseSha256, evidence.evidence.acceptedProseSha256)
  assert.equal(release.generationEvidence.containsProviderProse, false)
  assert.equal(release.gates.providerOutputEvaluation, 'not_applicable_deterministic_service')
  assert.equal(release.gates.fullOutlineOutputReview, 'pass_7_of_7')
  assert.equal('generationEvidenceReason' in release, false)
})

test('aggregate counts the deterministic human review but not provider output', () => {
  const aggregate = readJson('tone-v2/releases/all-service-corpus-2.1.0.json')
  const service = aggregate.services.find((item: any) => item.serviceKey === 'today_fortune')
  assert.equal(service.generation.evidencePath, evidencePath)
  assert.equal(service.generation.evidenceSha256, hash(evidencePath))
  assert.equal(service.generation.actualProviderCalls, false)
  assert.equal(service.generation.containsProviderProse, false)
  assert.equal(service.generation.fullOutlineHumanReview, true)
  assert.deepEqual(aggregate.evidenceCoverage.providerOutput, { passed: 5, required: 19 })
  assert.deepEqual(aggregate.evidenceCoverage.fullOutlineHumanReview, { passed: 6, required: 20 })
})
