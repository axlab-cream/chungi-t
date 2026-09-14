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
const oldPath = 'tone-v2/corpus/marry-match-service.json'
const newPath = 'tone-v2/corpus/releases/marry-match-service-2.1.0.json'
const oldMarker = '둘 다 주도하는 쪽이면 속도와 주도권에서 부딪히고, 한쪽이 받쳐 주는 쪽이면 역할이 굳어 한쪽이 지친다'
const newMarker = '일간 강약은 자원과 반응을 살피는 전통적 축이다'
const birth: BirthInput = { year: 1985, month: 3, day: 20, hour: 9, gender: 'male', calendar: 'solar' }
const context: SajuReportContext = { serviceKey: 'marry_match', concern: '결혼을 현실적으로 준비할 조건을 확인하고 싶어요.' }
const hashFile = (path: string) => createHash('sha256').update(readFileSync(join(root, 'data', path), 'utf8')).digest('hex')
function oldSnapshot(): CorpusSnapshot {
  const current = getCorpusSnapshot()
  return { ...current, registryVersion: 'tone-v2.2.0.3', fingerprint: 'test-old-marry-match-snapshot', activePacks: current.activePacks.map((pack) => pack.id === 'marry-match-service' ? { ...pack, path: oldPath, version: '2.0.0', contentHash: hashFile(oldPath).slice(0, 16) } : pack) }
}

describe('[TASK P05] marry_match corpus/RAG release candidate', () => {
  it('activates reviewed 2.1.0 and retains 2.0.0 for rollback', () => {
    const pack = getCorpusSnapshot().activePacks.find((item) => item.id === 'marry-match-service')
    assert.equal(pack?.version, '2.1.0'); assert.equal(pack?.path, newPath)
    assert.doesNotThrow(() => readFileSync(join(root, 'data', oldPath), 'utf8'))
    assert.equal(pack?.contentHash, hashFile(newPath).slice(0, 16))
  })

  it('records 20 explicit semantic-review passes without sample output', () => {
    const review = JSON.parse(readFileSync(join(root, 'tone-v2/corpus-review/marry-match-2.1.0.json'), 'utf8'))
    assert.equal(review.status, 'approved'); assert.equal(review.sourcePath, `data/${newPath}`)
    assert.equal(review.sourceSha256, hashFile(newPath)); assert.equal(review.sampleOutputsIngested, false)
    assert.deepEqual(review.blocks.map((item: any) => item.id), Array.from({ length: 20 }, (_, i) => `mar-${String(i + 1).padStart(3, '0')}`))
    assert.ok(review.blocks.every((block: any) => block.status === 'pass' && Object.values(block.checks).every(Boolean)))
  })

  it('enforces marriage evidence, safety and hypothetical boundaries', () => {
    const pack = JSON.parse(readFileSync(join(root, 'data', newPath), 'utf8'))
    const text = pack.knowledgeBlocks.map((block: any) => [block.condition, block.interpretation, ...block.real_world_pattern, block.advice, block.forbidden_generalization].join(' ')).join('\n')
    assert.equal(pack.release.sampleOutputsIngested, false); assert.equal(pack.knowledgeBlocks.length, 20)
    assert.ok(pack.knowledgeBlocks.every((block: any) => block.real_world_pattern.every((item: string) => item.startsWith('가상 사례:'))))
    assert.ok(pack.knowledgeBlocks.every((block: any) => /사용자|입력|계산된|마무리/.test(block.condition)))
    assert.ok(pack.knowledgeBlocks.every((block: any) => /않|금지/.test(block.forbidden_generalization)))
    assert.doesNotMatch(text, /\d+\s*(?:분|시간|일|주|개월|년|가지|개|번|줄|비율)\b/)
    assert.doesNotMatch(text, /결혼하면 안 된다|결혼해도 된다|시기는 따라온다|상대가 대답을 미룬다|가족.*흔들리지|실제로 도움을 받/)
    assert.match(text, /위협|통제|폭력/); assert.match(text, /안전|전문/)
  })

  it('selects active corpus for new reports and stored corpus for old reports', () => {
    const analysis = analyzeSaju(birth)
    const active = retrieveRagChunks('결혼 일간 강약 역할 주도권', analysis, 20, context)
    const old = retrieveRagChunks('결혼 일간 강약 역할 주도권', analysis, 20, context, oldSnapshot())
    const activeText = active.map((item) => item.content).join('\n'); const oldText = old.map((item) => item.content).join('\n')
    assert.ok(active.some((item) => item.domain === 'marry_match_service')); assert.ok(old.some((item) => item.domain === 'marry_match_service'))
    assert.match(activeText, new RegExp(newMarker)); assert.doesNotMatch(activeText, new RegExp(oldMarker))
    assert.match(oldText, new RegExp(oldMarker)); assert.doesNotMatch(oldText, new RegExp(newMarker))
  })

  it('fails closed on stored corpus hash mismatch', () => {
    const snapshot = oldSnapshot(); snapshot.activePacks = snapshot.activePacks.map((pack) => pack.id === 'marry-match-service' ? { ...pack, contentHash: '0000000000000000' } : pack)
    assert.throws(() => retrieveRagChunks('결혼 궁합', analyzeSaju(birth), 20, context, snapshot), /Corpus snapshot hash mismatch: marry-match-service/)
  })

  it('builds section prompts from the report corpus snapshot', () => {
    const analysis = analyzeSaju(birth); const section = buildTemplateSajuReport(analysis, birth, context).sections[0]; assert.ok(section)
    const active = sectionPrompt(analysis, birth, context, section).map((item) => item.content).join('\n')
    const old = sectionPrompt(analysis, birth, context, section, [], oldSnapshot()).map((item) => item.content).join('\n')
    assert.match(active, new RegExp(newMarker)); assert.doesNotMatch(active, new RegExp(oldMarker))
    assert.match(old, new RegExp(oldMarker)); assert.doesNotMatch(old, new RegExp(newMarker))
  })

  it('reviews saved prose against the stored corpus snapshot', () => {
    const analysis = analyzeSaju(birth); const section = buildTemplateSajuReport(analysis, birth, context).sections[0]; assert.ok(section)
    const common = { analysis, birth, context, section, hook: '결혼 조건은 두 사람이 확인한 사실로 판단해요.', interpretation: `${oldMarker}. 어느 조합이든 미리 알면 대비할 수 있다.` }
    const issue = '코퍼스 문장을 복사하지 말고 현재 질문과 근거에 맞는 새 문장으로 다시 쓰세요.'
    assert.ok(!reviewGeneratedSajuReportSection(common).issues.includes(issue)); assert.ok(reviewGeneratedSajuReportSection({ ...common, corpusSnapshot: oldSnapshot() }).issues.includes(issue))
  })

  it('binds a truthful local candidate and registry-only rollback', () => {
    const manifest = JSON.parse(readFileSync(join(root, 'tone-v2/releases/marry-match-2.1.0.json'), 'utf8'))
    assert.equal(manifest.state, 'candidate'); assert.equal(manifest.deployed, false); assert.equal(manifest.serviceKey, 'marry_match'); assert.equal(manifest.generationEvidence, null)
    assert.deepEqual(manifest.corpus.candidate, { path: `data/${newPath}`, version: '2.1.0', sha256: hashFile(newPath) })
    assert.deepEqual(manifest.corpus.previous, { path: `data/${oldPath}`, version: '2.0.0', sha256: hashFile(oldPath) })
    assert.equal(manifest.attachment.newReportsOnly, true); assert.equal(manifest.attachment.storedSnapshotRequired, true)
    assert.equal(manifest.rollback.strategy, 'registry_only'); assert.equal(manifest.rollback.customerRecordRewrite, false)
    assert.equal(manifest.verificationEvidence, 'tone-v2/evaluations/P05-marry-match-corpus-rag-release-candidate-20260913.json')
    assert.ok(Object.values(manifest.gates).every((value) => value !== 'pending'))
  })
})
