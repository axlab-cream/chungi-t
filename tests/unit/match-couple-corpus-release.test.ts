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

const root = process.cwd()
const oldPath = 'tone-v2/corpus/match-couple-service.json'
const newPath = 'tone-v2/corpus/releases/match-couple-service-2.1.0.json'
const oldMarker = '둘 다 주도하는 쪽이면 사소한 결정도 길어지고, 한쪽이 늘 맞추면 그 쪽이 조용히 지친다'
const newMarker = '계산된 일간 강약은 결정 방식에 관한 상징적 질문을 만들 뿐 실제 역할을 확정하지 않는다'
const birth: BirthInput = { year: 1985, month: 3, day: 20, hour: 9, gender: 'male', calendar: 'solar' }
const context: SajuReportContext = { serviceKey: 'match_couple', concern: '두 사람의 현재 관계와 대화 조건을 확인하고 싶어요.' }

function hashFile(path: string): string {
  return createHash('sha256').update(readFileSync(join(root, 'data', path), 'utf8')).digest('hex')
}

function oldSnapshot(): CorpusSnapshot {
  const current = getCorpusSnapshot()
  return {
    ...current,
    registryVersion: 'tone-v2.2.0.2',
    fingerprint: 'test-old-match-couple-snapshot',
    activePacks: current.activePacks.map((pack) => pack.id === 'match-couple-service'
      ? { ...pack, path: oldPath, version: '2.0.0', contentHash: hashFile(oldPath).slice(0, 16) }
      : pack),
  }
}

describe('[TASK P05] match_couple corpus/RAG release candidate', () => {
  it('activates the reviewed 2.1.0 pack and retains 2.0.0 for rollback', () => {
    const pack = getCorpusSnapshot().activePacks.find((item) => item.id === 'match-couple-service')
    assert.equal(pack?.version, '2.1.0')
    assert.equal(pack?.path, newPath)
    assert.doesNotThrow(() => readFileSync(join(root, 'data', oldPath), 'utf8'))
    assert.equal(pack?.contentHash, hashFile(newPath).slice(0, 16))
  })

  it('records 18 explicit semantic-review passes without sample-output ingestion', () => {
    const review = JSON.parse(readFileSync(join(root, 'tone-v2/corpus-review/match-couple-2.1.0.json'), 'utf8')) as {
      status: string; sourcePath: string; sourceSha256: string; sampleOutputsIngested: boolean
      blocks: Array<{ id: string; status: string; checks: Record<string, boolean> }>
    }
    assert.equal(review.status, 'approved')
    assert.equal(review.sourcePath, `data/${newPath}`)
    assert.equal(review.sourceSha256, hashFile(newPath))
    assert.equal(review.sampleOutputsIngested, false)
    assert.deepEqual(review.blocks.map((item) => item.id), Array.from({ length: 18 }, (_, i) => `cpl-${String(i + 1).padStart(3, '0')}`))
    assert.ok(review.blocks.every((block) => block.status === 'pass' && Object.values(block.checks).every(Boolean)))
  })

  it('enforces two-person evidence, safety and hypothetical-example boundaries', () => {
    const pack = JSON.parse(readFileSync(join(root, 'data', newPath), 'utf8')) as {
      release: { sampleOutputsIngested: boolean }
      knowledgeBlocks: Array<{ condition: string; interpretation: string; real_world_pattern: string[]; advice: string; forbidden_generalization: string }>
    }
    const text = pack.knowledgeBlocks.map((block) => [block.condition, block.interpretation, ...block.real_world_pattern, block.advice, block.forbidden_generalization].join(' ')).join('\n')
    assert.equal(pack.release.sampleOutputsIngested, false)
    assert.equal(pack.knowledgeBlocks.length, 18)
    assert.ok(pack.knowledgeBlocks.every((block) => block.real_world_pattern.every((item) => item.startsWith('가상 사례:'))))
    assert.ok(pack.knowledgeBlocks.every((block) => /사용자|입력|계산된|마무리/.test(block.condition)))
    assert.ok(pack.knowledgeBlocks.every((block) => /않|금지/.test(block.forbidden_generalization)))
    assert.doesNotMatch(text, /\d+\s*(?:분|시간|일|주|개월|년|가지|개|번|줄|묶음)\b/)
    assert.doesNotMatch(text, /마음이 식은|상대는 방어|오래 간다|헤어진다|반드시 흔들|실제 도움을 받/)
    assert.match(text, /위협|통제|폭력/)
    assert.match(text, /안전|전문/)
  })

  it('selects active corpus for new reports and stored corpus for old reports', () => {
    const analysis = analyzeSaju(birth)
    const active = retrieveRagChunks('궁합 일간 성향 결정 주도권', analysis, 18, context)
    const old = retrieveRagChunks('궁합 일간 성향 결정 주도권', analysis, 18, context, oldSnapshot())
    const activeText = active.map((item) => item.content).join('\n')
    const oldText = old.map((item) => item.content).join('\n')
    assert.ok(active.some((item) => item.domain === 'match_couple_service'))
    assert.ok(old.some((item) => item.domain === 'match_couple_service'))
    assert.match(activeText, new RegExp(newMarker))
    assert.doesNotMatch(activeText, new RegExp(oldMarker))
    assert.match(oldText, new RegExp(oldMarker))
    assert.doesNotMatch(oldText, new RegExp(newMarker))
  })

  it('fails closed on a stored match-couple corpus hash mismatch', () => {
    const snapshot = oldSnapshot()
    snapshot.activePacks = snapshot.activePacks.map((pack) => pack.id === 'match-couple-service' ? { ...pack, contentHash: '0000000000000000' } : pack)
    assert.throws(() => retrieveRagChunks('궁합 관계 총평', analyzeSaju(birth), 18, context, snapshot), /Corpus snapshot hash mismatch: match-couple-service/)
  })

  it('builds section prompts from the report corpus snapshot', () => {
    const analysis = analyzeSaju(birth)
    const section = buildTemplateSajuReport(analysis, birth, context).sections[0]
    assert.ok(section)
    const active = sectionPrompt(analysis, birth, context, section).map((item) => item.content).join('\n')
    const old = sectionPrompt(analysis, birth, context, section, [], oldSnapshot()).map((item) => item.content).join('\n')
    assert.match(active, new RegExp(newMarker))
    assert.doesNotMatch(active, new RegExp(oldMarker))
    assert.match(old, new RegExp(oldMarker))
    assert.doesNotMatch(old, new RegExp(newMarker))
  })

  it('reviews saved prose against the stored corpus snapshot', () => {
    const analysis = analyzeSaju(birth)
    const section = buildTemplateSajuReport(analysis, birth, context).sections[0]
    assert.ok(section)
    const common = { analysis, birth, context, section, hook: '관계 결론은 확인한 현재 조건으로 판단해요.', interpretation: `${oldMarker}. 조건이 바뀌면 총평도 바뀐다.` }
    const copyIssue = '코퍼스 문장을 복사하지 말고 현재 질문과 근거에 맞는 새 문장으로 다시 쓰세요.'
    assert.ok(!reviewGeneratedSajuReportSection(common).issues.includes(copyIssue))
    assert.ok(reviewGeneratedSajuReportSection({ ...common, corpusSnapshot: oldSnapshot() }).issues.includes(copyIssue))
  })

  it('binds a truthful local candidate and registry-only rollback', () => {
    const manifest = JSON.parse(readFileSync(join(root, 'tone-v2/releases/match-couple-2.1.0.json'), 'utf8')) as any
    assert.equal(manifest.state, 'candidate')
    assert.equal(manifest.deployed, false)
    assert.equal(manifest.serviceKey, 'match_couple')
    assert.equal(manifest.generationEvidence, null)
    assert.deepEqual(manifest.corpus.candidate, { path: `data/${newPath}`, version: '2.1.0', sha256: hashFile(newPath) })
    assert.deepEqual(manifest.corpus.previous, { path: `data/${oldPath}`, version: '2.0.0', sha256: hashFile(oldPath) })
    assert.equal(manifest.attachment.newReportsOnly, true)
    assert.equal(manifest.attachment.storedSnapshotRequired, true)
    assert.equal(manifest.rollback.strategy, 'registry_only')
    assert.equal(manifest.rollback.customerRecordRewrite, false)
    assert.equal(manifest.verificationEvidence, 'tone-v2/evaluations/P05-match-couple-corpus-rag-release-candidate-20260913.json')
    assert.ok(Object.values(manifest.gates).every((value) => value !== 'pending'))
  })
})
