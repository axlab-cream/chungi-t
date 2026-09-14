import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { getCorpusSnapshot } from '../../src/rag/corpus-registry.js'
import { retrieveRagChunks } from '../../src/rag/retriever.js'
import { buildTemplateSajuReport, reviewGeneratedSajuReportSection, sectionPrompt } from '../../src/report/report-generator.js'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import type { BirthInput, CorpusSnapshot, SajuReportContext } from '../../src/types/index.js'

const projectRoot = process.cwd()
const oldCorpusPath = 'tone-v2/corpus/quit-fortune-service.json'
const newCorpusPath = 'tone-v2/corpus/releases/quit-fortune-service-2.1.0.json'
const oldMarker = '흐름이 열린 해에도 잔고와 체력이 비어 있으면'
const newMarker = '운 흐름은 변화 압력을 해석하는 상징적 후보다'

const birth: BirthInput = {
  year: 1985,
  month: 3,
  day: 20,
  hour: 9,
  gender: 'male',
  calendar: 'solar',
}

const context: SajuReportContext = {
  serviceKey: 'quit_fortune',
  concern: '퇴사 판단에서 반복되는 조건과 준비 상태를 확인하고 싶어요.',
}

function hashFile(relativePath: string): string {
  return createHash('sha256')
    .update(readFileSync(join(projectRoot, 'data', relativePath), 'utf8'))
    .digest('hex')
}

function oldSnapshotFromCurrent(): CorpusSnapshot {
  const current = getCorpusSnapshot()
  return {
    ...current,
    registryVersion: 'tone-v2.2.0.0',
    fingerprint: 'test-old-quit-fortune-snapshot',
    activePacks: current.activePacks.map((pack) => pack.id === 'quit-fortune-service'
      ? {
          ...pack,
          path: oldCorpusPath,
          version: '2.0.0',
          contentHash: hashFile(oldCorpusPath).slice(0, 16),
        }
      : pack),
  }
}

describe('[TASK P05] quit_fortune corpus/RAG release candidate', () => {
  it('activates only the reviewed 2.1.0 pack while retaining 2.0.0 for rollback', () => {
    const snapshot = getCorpusSnapshot()
    const pack = snapshot.activePacks.find((item) => item.id === 'quit-fortune-service')

    assert.equal(pack?.version, '2.1.0')
    assert.equal(pack?.path, newCorpusPath)
    assert.doesNotThrow(() => readFileSync(join(projectRoot, 'data', oldCorpusPath), 'utf8'))
    assert.equal(pack?.contentHash, hashFile(newCorpusPath).slice(0, 16))
  })

  it('records an explicit PASS review for all 12 blocks without sample-output ingestion', () => {
    const review = JSON.parse(readFileSync(
      join(projectRoot, 'tone-v2/corpus-review/quit-fortune-2.1.0.json'),
      'utf8',
    )) as {
      status: string
      sourcePath: string
      sourceSha256: string
      sampleOutputsIngested: boolean
      blocks: Array<{ id: string; status: string; checks: Record<string, boolean> }>
    }

    assert.equal(review.status, 'approved')
    assert.equal(review.sourcePath, `data/${newCorpusPath}`)
    assert.equal(review.sourceSha256, hashFile(newCorpusPath))
    assert.equal(review.sampleOutputsIngested, false)
    assert.equal(review.blocks.length, 12)
    assert.deepEqual(review.blocks.map((item) => item.id),
      Array.from({ length: 12 }, (_, index) => `qui-${String(index + 1).padStart(3, '0')}`))
    for (const block of review.blocks) {
      assert.equal(block.status, 'pass')
      assert.ok(Object.keys(block.checks).length >= 5)
      assert.ok(Object.values(block.checks).every(Boolean), `${block.id} has an incomplete review check`)
    }
  })

  it('enforces semantic boundaries on the reviewed corpus content itself', () => {
    const pack = JSON.parse(readFileSync(join(projectRoot, 'data', newCorpusPath), 'utf8')) as {
      release: { sampleOutputsIngested: boolean }
      knowledgeBlocks: Array<{
        id: string
        condition: string
        interpretation: string
        real_world_pattern: string[]
        advice: string
        forbidden_generalization: string
      }>
    }
    const semanticText = pack.knowledgeBlocks.map((block) => [
      block.condition,
      block.interpretation,
      ...block.real_world_pattern,
      block.advice,
      block.forbidden_generalization,
    ].join(' ')).join('\n')

    assert.equal(pack.release.sampleOutputsIngested, false)
    assert.equal(pack.knowledgeBlocks.length, 12)
    assert.ok(pack.knowledgeBlocks.every((block) => block.real_world_pattern.every((item) => item.startsWith('가상 사례:'))))
    assert.ok(pack.knowledgeBlocks.every((block) => /사용자|입력|계산된|마무리 항목/.test(block.condition)))
    assert.ok(pack.knowledgeBlocks.every((block) => /않|금지/.test(block.forbidden_generalization)))
    assert.doesNotMatch(semanticText, /\d+\s*(?:분|시간|일|주|개월|년|가지|개)\b/)
    assert.doesNotMatch(semanticText, /사람이 문제면 자리를 옮기면 풀리고|결정은 확인이 쌓인 뒤에 저절로|일간이 약한 구간에는 결정을 미루/)
  })

  it('retrieves the active corpus for new reports but the stored corpus for old reports', () => {
    const analysis = analyzeSaju(birth)
    const activeChunks = retrieveRagChunks('퇴사 타이밍 날짜 준비 상태', analysis, 12, context)
    const oldChunks = retrieveRagChunks('퇴사 타이밍 날짜 준비 상태', analysis, 12, context, oldSnapshotFromCurrent())
    const activeText = activeChunks.map((item) => item.content).join('\n')
    const oldText = oldChunks.map((item) => item.content).join('\n')

    assert.ok(activeChunks.some((item) => item.domain === 'quit_fortune_service'))
    assert.ok(oldChunks.some((item) => item.domain === 'quit_fortune_service'))
    assert.match(activeText, new RegExp(newMarker))
    assert.doesNotMatch(activeText, new RegExp(oldMarker))
    assert.match(oldText, new RegExp(oldMarker))
    assert.doesNotMatch(oldText, new RegExp(newMarker))
  })

  it('fails closed when a stored snapshot hash no longer matches its corpus file', () => {
    const analysis = analyzeSaju(birth)
    const invalid = oldSnapshotFromCurrent()
    invalid.activePacks = invalid.activePacks.map((pack) => pack.id === 'quit-fortune-service'
      ? { ...pack, contentHash: '0000000000000000' }
      : pack)

    assert.throws(
      () => retrieveRagChunks('퇴사 타이밍 날짜 준비 상태', analysis, 12, context, invalid),
      /Corpus snapshot hash mismatch: quit-fortune-service/,
    )
  })

  it('builds section prompts from the report snapshot instead of the latest registry', () => {
    const analysis = analyzeSaju(birth)
    const section = buildTemplateSajuReport(analysis, birth, context).sections[0]
    assert.ok(section)

    const activePrompt = sectionPrompt(analysis, birth, context, section).map((item) => item.content).join('\n')
    const oldPrompt = sectionPrompt(analysis, birth, context, section, [], oldSnapshotFromCurrent())
      .map((item) => item.content).join('\n')

    assert.match(activePrompt, new RegExp(newMarker))
    assert.doesNotMatch(activePrompt, new RegExp(oldMarker))
    assert.match(oldPrompt, new RegExp(oldMarker))
    assert.doesNotMatch(oldPrompt, new RegExp(newMarker))
  })

  it('reviews a saved attempt against the same stored corpus snapshot', () => {
    const analysis = analyzeSaju(birth)
    const section = buildTemplateSajuReport(analysis, birth, context).sections[0]
    assert.ok(section)
    const copiedOldCorpus = `${oldMarker} 결정이 부담으로 남는다. 반대로 조용한 해에도 준비가 서 있으면 결정은 무리 없이 진행된다.`
    const common = {
      analysis,
      birth,
      context,
      section,
      hook: '퇴사 시점은 확인한 준비 조건으로 판단해요.',
      interpretation: copiedOldCorpus,
    }

    const activeReview = reviewGeneratedSajuReportSection(common)
    const oldReview = reviewGeneratedSajuReportSection({ ...common, corpusSnapshot: oldSnapshotFromCurrent() })
    const copyIssue = '코퍼스 문장을 복사하지 말고 현재 질문과 근거에 맞는 새 문장으로 다시 쓰세요.'

    assert.ok(!activeReview.issues.includes(copyIssue))
    assert.ok(oldReview.issues.includes(copyIssue))
  })

  it('binds prompt, corpus, evidence, new-report attachment, and rollback in a local candidate manifest', () => {
    const manifest = JSON.parse(readFileSync(
      join(projectRoot, 'tone-v2/releases/quit-fortune-2.1.0.json'),
      'utf8',
    )) as {
      state: string
      deployed: boolean
      serviceKey: string
      promptBundle: { version: string; sourceFingerprint: string }
      corpus: { candidate: { path: string; version: string; sha256: string }; previous: { path: string; version: string; sha256: string } }
      attachment: { newReportsOnly: boolean; storedSnapshotRequired: boolean }
      rollback: { strategy: string; customerRecordRewrite: boolean }
      verificationEvidence: string
      visualEvidence: { path: string; sha256: string; desktop: string; mobile: string; print: string; containsProviderProse: boolean }
      gates: Record<string, string>
    }

    assert.equal(manifest.state, 'candidate')
    assert.equal(manifest.deployed, false)
    assert.equal(manifest.serviceKey, 'quit_fortune')
    assert.equal(manifest.visualEvidence.path, 'tone-v2/evaluations/P04-quit-fortune-visual-render-evidence-20260913.json')
    assert.equal(manifest.visualEvidence.desktop, 'pass_48_of_48')
    assert.equal(manifest.visualEvidence.mobile, 'pass_48_of_48')
    assert.equal(manifest.visualEvidence.print, 'pass_all_48_sections')
    assert.equal(manifest.visualEvidence.containsProviderProse, false)
    assert.match(manifest.visualEvidence.sha256, /^[a-f0-9]{64}$/)
    assert.ok(manifest.promptBundle.version)
    assert.ok(manifest.promptBundle.sourceFingerprint)
    assert.deepEqual(manifest.corpus.candidate, {
      path: `data/${newCorpusPath}`,
      version: '2.1.0',
      sha256: hashFile(newCorpusPath),
    })
    assert.deepEqual(manifest.corpus.previous, {
      path: `data/${oldCorpusPath}`,
      version: '2.0.0',
      sha256: hashFile(oldCorpusPath),
    })
    assert.equal(manifest.attachment.newReportsOnly, true)
    assert.equal(manifest.attachment.storedSnapshotRequired, true)
    assert.equal(manifest.rollback.strategy, 'registry_only')
    assert.equal(manifest.rollback.customerRecordRewrite, false)
    assert.equal(manifest.verificationEvidence, 'tone-v2/evaluations/P05-quit-fortune-corpus-rag-release-candidate-20260913.json')
    assert.ok(Object.values(manifest.gates).every((value) => value !== 'pending'))
  })
})
