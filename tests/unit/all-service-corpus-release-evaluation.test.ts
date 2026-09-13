import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { KNOWN_SERVICE_KEYS } from '../../src/prompt/service-system.js'

const root = process.cwd()
const aggregatePath = 'tone-v2/releases/all-service-corpus-2.1.0.json'
const assessmentPath = 'tone-v2/releases/all-service-corpus-2.1.0-evaluation.md'

function readJson(relativePath: string): any {
  return JSON.parse(readFileSync(join(root, relativePath), 'utf8'))
}

function hash(relativePath: string): string {
  return createHash('sha256').update(readFileSync(join(root, relativePath))).digest('hex')
}

describe('[TASK P05] all-service corpus release evaluation', () => {
  it('covers the same exact 20 services in runtime prompts, source manifest, registry, and aggregate', () => {
    const source = readJson('tone-v2/generated/manifest.json')
    const registry = readJson('data/tone-v2/corpus/registry.json')
    const aggregate = readJson(aggregatePath)
    const expected = [...KNOWN_SERVICE_KEYS].sort()
    const registryKeys = registry.packs.filter((pack: any) => pack.serviceKey).map((pack: any) => pack.serviceKey).sort()

    assert.equal(expected.length, 20)
    assert.deepEqual([...source.services].sort(), expected)
    assert.deepEqual(registryKeys, expected)
    assert.deepEqual(aggregate.services.map((service: any) => service.serviceKey), expected)
  })

  it('pins every reviewed 2.1.0 candidate to its actual content hash', () => {
    const aggregate = readJson(aggregatePath)
    for (const service of aggregate.services) {
      assert.equal(service.corpus.candidate.version, '2.1.0')
      assert.equal(service.corpus.candidate.sha256, hash(service.corpus.candidate.path))
      assert.equal(service.review.sourceSha256, service.corpus.candidate.sha256)
      assert.equal(service.review.status, 'approved')
      assert.equal(service.review.sampleOutputsIngested, false)
      assert.ok(service.review.blockCount >= 1)
      assert.equal(service.review.passedBlockCount, service.review.blockCount)
      assert.equal(service.review.allChecksPassed, true)
    }
  })

  it('pins a real rollback source and prohibits customer rewrites for every service', () => {
    const aggregate = readJson(aggregatePath)
    for (const service of aggregate.services) {
      assert.equal(service.corpus.previous.version, '2.0.0')
      assert.equal(service.corpus.previous.sha256, hash(service.corpus.previous.path))
      assert.equal(service.attachment.newReportsOnly, true)
      assert.equal(service.attachment.storedSnapshotRequired, true)
      assert.equal(service.attachment.customerRecordMutation, false)
      assert.equal(service.rollback.strategy, 'registry_only')
      assert.equal(service.rollback.customerRecordRewrite, false)
    }
  })

  it('keeps persona and service prompt evidence explicit for all services', () => {
    const aggregate = readJson(aggregatePath)
    for (const service of aggregate.services) {
      assert.equal(service.prompt.serviceKey, service.serviceKey)
      assert.equal(service.prompt.sourcePath, `tone-v2/generated/services/${service.serviceKey}.md`)
      assert.equal(service.prompt.sha256, hash(service.prompt.sourcePath))
      assert.equal(existsSync(join(root, service.prompt.sourcePath)), true)
    }
  })

  it('reports actual evidence coverage without treating deterministic prose as provider prose', () => {
    const aggregate = readJson(aggregatePath)
    assert.deepEqual(aggregate.evidenceCoverage.corpusReview, { passed: 20, required: 20 })
    assert.deepEqual(aggregate.evidenceCoverage.promptPersona, { passed: 20, required: 20 })
    assert.deepEqual(aggregate.evidenceCoverage.providerOutput, { passed: 5, required: 19 })
    assert.deepEqual(aggregate.evidenceCoverage.fullOutlineHumanReview, { passed: 6, required: 20 })
    assert.deepEqual(aggregate.evidenceCoverage.visualRenderMobilePrint, { passed: 5, required: 20 })
    const passAngle = aggregate.services.find((service: any) => service.serviceKey === 'pass_angle')
    assert.equal(passAngle.generation.evidencePath, 'tone-v2/evaluations/P04-pass-angle-2-1-full-outline-generation-20260913.json')
    assert.equal(passAngle.generation.evidenceSha256, hash(passAngle.generation.evidencePath))
    assert.equal(passAngle.generation.actualProviderCalls, true)
    assert.equal(passAngle.generation.containsProviderProse, false)
    assert.equal(passAngle.generation.fullOutlineHumanReview, true)
    assert.equal(passAngle.visual.evidencePath, 'tone-v2/evaluations/P04-pass-angle-visual-render-evidence-20260913.json')
    assert.equal(passAngle.visual.evidenceSha256, hash(passAngle.visual.evidencePath))
    assert.equal(passAngle.visual.desktop, true)
    assert.equal(passAngle.visual.mobile, true)
    assert.equal(passAngle.visual.print, true)
    assert.equal(passAngle.visual.passed, true)
    const quitFortune = aggregate.services.find((service: any) => service.serviceKey === 'quit_fortune')
    assert.equal(quitFortune.generation.actualProviderCalls, true)
    assert.equal(quitFortune.generation.containsProviderProse, false)
    assert.equal(quitFortune.generation.fullOutlineHumanReview, true)
    assert.equal(quitFortune.visual.evidencePath, 'tone-v2/evaluations/P04-quit-fortune-visual-render-evidence-20260913.json')
    assert.equal(quitFortune.visual.evidenceSha256, hash(quitFortune.visual.evidencePath))
    assert.equal(quitFortune.visual.desktop, true)
    assert.equal(quitFortune.visual.mobile, true)
    assert.equal(quitFortune.visual.print, true)
    assert.equal(quitFortune.visual.passed, true)
    const luckyColor = aggregate.services.find((service: any) => service.serviceKey === 'lucky_color')
    assert.equal(luckyColor.generation.actualProviderCalls, true)
    assert.equal(luckyColor.generation.containsProviderProse, false)
    assert.equal(luckyColor.generation.fullOutlineHumanReview, true)
    assert.equal(luckyColor.visual.evidencePath, 'tone-v2/evaluations/P04-lucky-color-visual-render-evidence-20260913.json')
    assert.equal(luckyColor.visual.evidenceSha256, hash(luckyColor.visual.evidencePath))
    assert.equal(luckyColor.visual.desktop, true)
    assert.equal(luckyColor.visual.mobile, true)
    assert.equal(luckyColor.visual.print, true)
    assert.equal(luckyColor.visual.passed, true)
    const newyearFlow = aggregate.services.find((service: any) => service.serviceKey === 'newyear_flow')
    assert.equal(newyearFlow.generation.actualProviderCalls, true)
    assert.equal(newyearFlow.generation.containsProviderProse, false)
    assert.equal(newyearFlow.generation.fullOutlineHumanReview, true)
    assert.equal(newyearFlow.visual.evidencePath, 'tone-v2/evaluations/P04-newyear-flow-visual-render-evidence-20260913.json')
    assert.equal(newyearFlow.visual.evidenceSha256, hash(newyearFlow.visual.evidencePath))
    assert.equal(newyearFlow.visual.desktop, true)
    assert.equal(newyearFlow.visual.mobile, true)
    assert.equal(newyearFlow.visual.print, true)
    assert.equal(newyearFlow.visual.passed, true)
    const weddingDay = aggregate.services.find((service: any) => service.serviceKey === 'wedding_day')
    assert.equal(weddingDay.generation.actualProviderCalls, true)
    assert.equal(weddingDay.generation.containsProviderProse, false)
    assert.equal(weddingDay.generation.fullOutlineHumanReview, true)
    assert.equal(weddingDay.visual.evidencePath, 'tone-v2/evaluations/P04-wedding-day-visual-render-evidence-20260913.json')
    assert.equal(weddingDay.visual.evidenceSha256, hash(weddingDay.visual.evidencePath))
    assert.equal(weddingDay.visual.desktop, true)
    assert.equal(weddingDay.visual.mobile, true)
    assert.equal(weddingDay.visual.print, true)
    assert.equal(weddingDay.visual.passed, true)
    const todayFortune = aggregate.services.find((service: any) => service.serviceKey === 'today_fortune')
    assert.equal(todayFortune.generation.providerRequired, false)
    assert.equal(todayFortune.generation.actualProviderCalls, false)
    assert.equal(todayFortune.generation.containsProviderProse, false)
    assert.equal(todayFortune.generation.fullOutlineHumanReview, true)
  })

  it('fails the release gate closed with concrete blockers and no deployment claim', () => {
    const aggregate = readJson(aggregatePath)
    assert.equal(aggregate.state, 'evaluated_candidate')
    assert.equal(aggregate.decision, 'NO_GO')
    assert.equal(aggregate.corpusLayerReady, true)
    assert.equal(aggregate.releaseReady, false)
    assert.equal(aggregate.deployed, false)
    assert.equal(aggregate.productionAttachment.attempted, false)
    assert.equal(aggregate.productionAttachment.customerRecordMutation, false)
    assert.deepEqual(aggregate.blockers.map((blocker: any) => blocker.id), [
      'provider_output_coverage',
      'full_outline_human_review',
      'visual_render_mobile_print',
      'production_attachment',
    ])
  })

  it('publishes a human-readable assessment that cannot be mistaken for a GO', () => {
    const aggregate = readJson(aggregatePath)
    const assessment = readFileSync(join(root, assessmentPath), 'utf8')
    assert.equal(aggregate.assessment.path, assessmentPath)
    assert.equal(aggregate.assessment.sha256, hash(assessmentPath))
    assert.match(assessment, /NO-GO/)
    assert.match(assessment, /20\/20/)
    assert.match(assessment, /5\/19/)
    assert.match(assessment, /6\/20/)
    assert.match(assessment, /Production attachment was not attempted/)
  })
})
