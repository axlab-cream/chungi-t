import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'

const root = process.cwd()
const evidencePath = 'tone-v2/evaluations/P04-saju-master-full-outline-generation-20260914.json'
const releasePath = 'tone-v2/releases/saju-master-2.1.0.json'

describe('[TASK P04] saju_master full-outline generation evidence', () => {
  it('keeps a fail-closed 37-section isolated live harness', () => {
    const sourcePath = join(root, 'scripts/check-saju-master-outline-live.ts')
    assert.equal(existsSync(sourcePath), true)
    const source = readFileSync(sourcePath, 'utf8')
    assert.match(source, /REPORT_STORAGE_DIR/)
    assert.match(source, /assert\.equal\(templateReport\.sections\.length, 37\)/)
    assert.match(source, /assertRequestedPrefixComplete/)
    assert.match(source, /No section after the first failure may be attempted/)
    assert.match(source, /corpusSnapshot: record!\.corpus/)
  })

  it('binds prose-free approved provider evidence to the release', () => {
    assert.equal(existsSync(join(root, evidencePath)), true)
    const evidence = JSON.parse(readFileSync(join(root, evidencePath), 'utf8'))
    const release = JSON.parse(readFileSync(join(root, releasePath), 'utf8'))
    assert.equal(evidence.status, 'pass')
    assert.equal(evidence.serviceKey, 'saju_master')
    assert.equal(evidence.provider.actualCalls, true)
    assert.equal(evidence.provider.syntheticOnly, true)
    assert.deepEqual(evidence.completion, {
      completedSections: 37,
      expectedSections: 37,
      recordStatus: 'complete',
      firstFailure: null,
      attemptedAfterFailure: 0,
      attemptedOutsideLimit: 0,
    })
    assert.deepEqual(evidence.replay, {
      passed: 37,
      failed: 0,
      interpretationCharacterCount: evidence.replay.interpretationCharacterCount,
      paragraphCount: evidence.replay.paragraphCount,
    })
    assert.equal(evidence.teaser.passed, true)
    assert.equal(evidence.teaser.containsConcreteScene, true)
    assert.equal(evidence.teaser.paidOutlineItemCount, 37)
    assert.equal(evidence.teaser.containsProviderProse, false)
    assert.match(evidence.teaser.canonicalSha256, /^[a-f0-9]{64}$/)
    assert.equal(evidence.evidence.containsProviderProse, false)
    assert.equal(evidence.evidence.containsSecrets, false)
    assert.equal(evidence.evidence.containsPersonalData, false)
    assert.match(evidence.evidence.recordSha256, /^[a-f0-9]{64}$/)
    assert.match(evidence.evidence.acceptedProseSha256, /^[a-f0-9]{64}$/)
    assert.equal(evidence.verification.independentReview, 'approved_codex_review')
    assert.equal(release.generationEvidence.path, evidencePath)
    assert.equal(release.generationEvidence.recordSha256, evidence.evidence.recordSha256)
    assert.equal(release.generationEvidence.acceptedProseSha256, evidence.evidence.acceptedProseSha256)
    assert.equal(release.generationEvidence.containsProviderProse, false)
    assert.equal(release.gates.providerOutputEvaluation, 'pass_37_of_37')
    assert.equal('generationEvidenceReason' in release, false)
  })
})
