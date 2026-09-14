import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const root = process.cwd()
const releaseDir = join(root, 'tone-v2/releases')
const aggregateRelativePath = 'tone-v2/releases/all-service-corpus-2.1.0.json'
const assessmentRelativePath = 'tone-v2/releases/all-service-corpus-2.1.0-evaluation.md'

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(root, relativePath), 'utf8'))
}

function hash(relativePath) {
  return createHash('sha256').update(readFileSync(join(root, relativePath))).digest('hex')
}

function normalize(relativePath) {
  return relativePath.split(sep).join('/')
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const source = readJson('tone-v2/generated/manifest.json')
const registry = readJson('data/tone-v2/corpus/registry.json')
const expectedKeys = [...source.services].sort()
assert(expectedKeys.length === 20 && new Set(expectedKeys).size === 20, 'Source manifest must define exactly 20 unique services')

const releaseFiles = readdirSync(releaseDir)
  .filter((name) => name.endsWith('-2.1.0.json') && name !== 'all-service-corpus-2.1.0.json')
  .sort()
const releases = releaseFiles.map((name) => ({
  path: normalize(relative(root, join(releaseDir, name))),
  value: readJson(normalize(relative(root, join(releaseDir, name)))),
}))
assert(releases.length === 20, `Expected 20 service release manifests, found ${releases.length}`)

const registryByService = new Map(
  registry.packs.filter((pack) => pack.serviceKey).map((pack) => [pack.serviceKey, pack]),
)
assert(registryByService.size === 20, `Expected 20 service registry packs, found ${registryByService.size}`)

const services = expectedKeys.map((serviceKey) => {
  const releaseRecord = releases.find((entry) => entry.value.serviceKey === serviceKey)
  assert(releaseRecord, `Missing release manifest for ${serviceKey}`)
  const release = releaseRecord.value
  const registryPack = registryByService.get(serviceKey)
  assert(registryPack, `Missing registry pack for ${serviceKey}`)
  assert(release.state === 'candidate' && release.deployed === false, `${serviceKey} is not a local candidate`)
  assert(registryPack.version === '2.1.0', `${serviceKey} registry version is not 2.1.0`)
  assert(`data/${registryPack.path}` === release.corpus.candidate.path, `${serviceKey} registry path does not match its candidate`)
  assert(hash(release.corpus.candidate.path) === release.corpus.candidate.sha256, `${serviceKey} candidate hash mismatch`)
  assert(hash(release.corpus.previous.path) === release.corpus.previous.sha256, `${serviceKey} rollback hash mismatch`)

  const review = readJson(release.corpus.semanticReview)
  assert(review.status === 'approved', `${serviceKey} review is not approved`)
  assert(review.sourcePath === release.corpus.candidate.path, `${serviceKey} review source mismatch`)
  assert(review.sourceSha256 === release.corpus.candidate.sha256, `${serviceKey} review hash mismatch`)
  assert(review.sampleOutputsIngested === false, `${serviceKey} copied sample output into corpus`)
  const passedBlockCount = review.blocks.filter((block) => block.status === 'pass').length
  const allChecksPassed = review.blocks.every((block) => Object.values(block.checks).every(Boolean))
  assert(passedBlockCount === review.blocks.length && allChecksPassed, `${serviceKey} review has an incomplete block`)

  const promptPath = `tone-v2/generated/services/${serviceKey}.md`
  assert(existsSync(join(root, promptPath)), `${serviceKey} prompt/persona source is missing`)
  const generation = release.generationEvidence ?? null
  const generationRecord = generation === null ? null : readJson(generation.path)
  if (generation !== null) {
    assert(generationRecord?.serviceKey === serviceKey && generationRecord?.status === 'pass', `${serviceKey} generation evidence is not approved`)
    assert(generation.containsProviderProse === false && generationRecord?.evidence?.containsProviderProse === false, `${serviceKey} tracked generation evidence contains provider prose`)
    assert(generationRecord?.evidence?.containsSecrets === false && generationRecord?.evidence?.containsPersonalData === false, `${serviceKey} tracked generation evidence is not sanitized`)
  }
  const visual = release.visualEvidence ?? null
  const visualRecord = visual === null ? null : readJson(visual.path)
  if (visual !== null) {
    assert(hash(visual.path) === visual.sha256, `${serviceKey} visual evidence hash mismatch`)
    assert(visualRecord?.serviceKey === serviceKey && visualRecord?.status === 'pass', `${serviceKey} visual evidence is not approved`)
    assert(visual.containsProviderProse === false && visualRecord?.privacy?.containsProviderProse === false, `${serviceKey} tracked visual evidence contains provider prose`)
  }

  return {
    serviceKey,
    releaseManifest: { path: releaseRecord.path, sha256: hash(releaseRecord.path) },
    prompt: {
      serviceKey,
      bundleVersion: release.promptBundle.version,
      sourceFingerprint: release.promptBundle.sourceFingerprint,
      sourcePath: promptPath,
      sha256: hash(promptPath),
    },
    corpus: release.corpus,
    review: {
      path: release.corpus.semanticReview,
      sha256: hash(release.corpus.semanticReview),
      sourceSha256: review.sourceSha256,
      status: review.status,
      sampleOutputsIngested: review.sampleOutputsIngested,
      blockCount: review.blocks.length,
      passedBlockCount,
      allChecksPassed,
    },
    generation: generation === null ? {
      evidencePath: null,
      providerRequired: serviceKey !== 'today_fortune',
      actualProviderCalls: false,
      containsProviderProse: false,
      fullOutlineHumanReview: false,
      reason: release.generationEvidenceReason ?? 'No generation evidence is attached to this corpus release candidate.',
    } : {
      evidencePath: generation.path,
      evidenceSha256: hash(generation.path),
      providerRequired: serviceKey !== 'today_fortune',
      actualProviderCalls: generationRecord?.provider?.actualCalls === true,
      containsProviderProse: generation.containsProviderProse === true,
      fullOutlineHumanReview: /^approved/.test(generationRecord?.verification?.independentReview ?? ''),
      acceptedProseSha256: generation.acceptedProseSha256 ?? null,
    },
    visual: visual === null ? {
      evidencePath: null,
      evidenceSha256: null,
      desktop: false,
      mobile: false,
      print: false,
      passed: false,
    } : {
      evidencePath: visual.path,
      evidenceSha256: visual.sha256,
      desktop: visualRecord.render.desktop.passed === true,
      mobile: visualRecord.render.mobile.passed === true,
      print: visualRecord.print.passed === true,
      passed: [visualRecord.render.desktop.passed, visualRecord.render.mobile.passed, visualRecord.print.passed].every(Boolean),
    },
    attachment: release.attachment,
    rollback: release.rollback,
  }
})

const providerRequiredCount = services.filter((service) => service.generation.providerRequired).length
const providerOutputCount = services.filter((service) => service.generation.providerRequired && service.generation.actualProviderCalls && service.generation.fullOutlineHumanReview).length
const fullOutlineHumanReviewCount = services.filter((service) => service.generation.fullOutlineHumanReview).length
const visualEvidenceCount = services.filter((service) => service.visual.passed).length
const evidenceCoverage = {
  corpusReview: { passed: services.length, required: 20 },
  promptPersona: { passed: services.length, required: 20 },
  providerOutput: { passed: providerOutputCount, required: providerRequiredCount },
  fullOutlineHumanReview: { passed: fullOutlineHumanReviewCount, required: 20 },
  visualRenderMobilePrint: { passed: visualEvidenceCount, required: 20 },
}
const blockers = [
  {
    id: 'provider_output_coverage',
    status: 'blocked',
    evidence: `${providerOutputCount}/${providerRequiredCount} generative service candidates have verified provider-output provenance and full-outline review. The deterministic today_fortune service is not provider-backed.`,
    requiredAction: 'Generate fresh provider output for every remaining generative service and retain immutable hashed provenance without ingesting prose into corpus.',
  },
  {
    id: 'full_outline_human_review',
    status: 'blocked',
    evidence: `${fullOutlineHumanReviewCount}/20 service candidates have an attached full-outline independent human interpretation review.`,
    requiredAction: 'Evaluate every complete service outline for grounding, persona, tone, duplication, safety, and cross-section continuity.',
  },
  {
    id: 'visual_render_mobile_print',
    status: 'blocked',
    evidence: `${visualEvidenceCount}/20 service candidates have aggregate HTML/image/render/mobile/print evidence.`,
    requiredAction: 'Render actual reports and record desktop, mobile, image, and print QA evidence.',
  },
  {
    id: 'production_attachment',
    status: 'blocked',
    evidence: 'Production attachment was not attempted and remains outside this Task.',
    requiredAction: 'After every prior gate passes, obtain explicit approval for a new-report-only Production attachment and rollback drill.',
  },
]

const assessment = `# All-service corpus 2.1.0 release assessment\n\n` +
  `Decision: **NO-GO**\n\n` +
  `The local corpus layer is internally consistent: 20/20 service candidates match their registry entries, content hashes, approved semantic reviews, prompt/persona files, and versioned rollback sources. No sample output was ingested and no customer record was changed.\n\n` +
  `The complete service release is not ready. Verified provider-output evidence covers ${providerOutputCount}/${providerRequiredCount} generative services; attached full-outline human review covers ${fullOutlineHumanReviewCount}/20; aggregate HTML/image/render/mobile/print evidence covers ${visualEvidenceCount}/20. Production attachment was not attempted.\n\n` +
  `## Blocking sequence\n\n` + blockers.map((blocker, index) =>
    `${index + 1}. **${blocker.id}** — ${blocker.evidence} ${blocker.requiredAction}`,
  ).join('\n') + '\n\n' +
  `This assessment authorizes no deployment, provider call, customer mutation, or Production attachment.\n`
writeFileSync(join(root, assessmentRelativePath), assessment, 'utf8')

const aggregate = {
  schemaVersion: '1.0.0',
  releaseId: 'all-service-corpus-2.1.0',
  state: 'evaluated_candidate',
  decision: 'NO_GO',
  corpusLayerReady: true,
  releaseReady: false,
  deployed: false,
  promptBundle: {
    version: source.version,
    sourceFingerprint: source.sourceFingerprint,
    releaseReadyAtSource: source.releaseReady,
  },
  corpusRegistry: {
    path: 'data/tone-v2/corpus/registry.json',
    version: registry.version,
    sha256: hash('data/tone-v2/corpus/registry.json'),
  },
  evidenceCoverage,
  blockers,
  productionAttachment: {
    attempted: false,
    newReportsOnly: true,
    customerRecordMutation: false,
  },
  assessment: {
    path: assessmentRelativePath,
    sha256: hash(assessmentRelativePath),
  },
  services,
}
writeFileSync(join(root, aggregateRelativePath), `${JSON.stringify(aggregate, null, 2)}\n`, 'utf8')

console.log(JSON.stringify({
  output: aggregateRelativePath,
  assessment: assessmentRelativePath,
  services: services.length,
  corpusReviewPassed: evidenceCoverage.corpusReview.passed,
  providerOutputPassed: evidenceCoverage.providerOutput.passed,
  decision: aggregate.decision,
}, null, 2))
