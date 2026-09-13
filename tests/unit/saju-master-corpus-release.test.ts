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
const oldPath = 'tone-v2/corpus/saju-master-service.json'
const newPath = 'tone-v2/corpus/releases/saju-master-service-2.1.0.json'
const oldMarker = '천명사주는 원국의 구조와 대운의 방향을 함께 놓고 반복되는 선택의 조건을 살피는 긴 해석이다'
const newMarker = '계산된 원국과 대운은 삶의 결과를 확정하는 사실이 아니라 반복되는 선택 조건을 검토하는 상징적 질문이다'
const birth: BirthInput = { year: 1985, month: 3, day: 20, hour: 9, gender: 'male', calendar: 'solar' }
const context: SajuReportContext = { serviceKey: 'saju_master', concern: '일과 돈, 관계에서 반복되는 선택 기준을 확인하고 싶습니다.' }
const hashFile = (path: string) => createHash('sha256').update(readFileSync(join(root, 'data', path), 'utf8')).digest('hex')

function oldSnapshot(): CorpusSnapshot {
  const current = getCorpusSnapshot()
  return { ...current, registryVersion: 'tone-v2.2.0.5', fingerprint: 'test-old-saju-master-snapshot', activePacks: current.activePacks.map((pack) => pack.id === 'saju-master-service' ? { ...pack, path: oldPath, version: '2.0.0', contentHash: hashFile(oldPath).slice(0, 16) } : pack) }
}

describe('[TASK P05] saju_master corpus/RAG release candidate', () => {
  it('activates reviewed 2.1.0 and retains 2.0.0 for rollback', () => {
    const pack = getCorpusSnapshot().activePacks.find((item) => item.id === 'saju-master-service')
    assert.equal(pack?.version, '2.1.0'); assert.equal(pack?.path, newPath)
    assert.doesNotThrow(() => readFileSync(join(root, 'data', oldPath), 'utf8'))
    assert.equal(pack?.contentHash, hashFile(newPath).slice(0, 16))
  })

  it('records an explicit semantic-review pass without sample output', () => {
    const review = JSON.parse(readFileSync(join(root, 'tone-v2/corpus-review/saju-master-2.1.0.json'), 'utf8'))
    assert.equal(review.status, 'approved'); assert.equal(review.sourcePath, `data/${newPath}`)
    assert.equal(review.sourceSha256, hashFile(newPath)); assert.equal(review.sampleOutputsIngested, false)
    assert.deepEqual(review.blocks.map((item: any) => item.id), ['master-001'])
    assert.ok(review.blocks.every((block: any) => block.status === 'pass' && Object.values(block.checks).every(Boolean)))
  })

  it('enforces calculated, symbolic, hypothetical and professional boundaries', () => {
    const pack = JSON.parse(readFileSync(join(root, 'data', newPath), 'utf8'))
    const block = pack.knowledgeBlocks[0]
    const text = [block.condition, block.interpretation, ...block.real_world_pattern, block.risk, block.opportunity, block.advice, block.forbidden_generalization].join(' ')
    const guidance = [block.interpretation, ...block.real_world_pattern, block.opportunity, block.advice].join(' ')
    assert.equal(pack.release.sampleOutputsIngested, false); assert.equal(pack.knowledgeBlocks.length, 1); assert.equal(block.id, 'master-001')
    assert.ok(block.real_world_pattern.every((item: string) => item.startsWith('가상 사례:')))
    assert.match(block.condition, /serviceKey.*서버가 계산한 원국.*대운/)
    assert.match(text, /사용자가 입력하거나 확인한 사실/); assert.match(block.forbidden_generalization, /원국이나 대운만으로/)
    assert.match(text, /의료|법률|투자|계약/)
    assert.doesNotMatch(text, /\d+\s*(?:분|시간|일|주|개월|년|번|가지|개)\b/)
    assert.doesNotMatch(guidance, /성격은 반드시|직업은 반드시|부자가 된다|질병이 생긴다|결혼한다|미래에.*발생/)
  })

  it('selects active corpus for new reports and stored corpus for old reports', () => {
    const analysis = analyzeSaju(birth)
    const active = retrieveRagChunks('천명사주 원국 대운 십신 선택 기준', analysis, 20, context)
    const old = retrieveRagChunks('천명사주 원국 대운 십신 선택 기준', analysis, 20, context, oldSnapshot())
    const activeText = active.map((item) => item.content).join('\n'); const oldText = old.map((item) => item.content).join('\n')
    assert.ok(active.some((item) => item.domain === 'saju_master_service')); assert.ok(old.some((item) => item.domain === 'saju_master_service'))
    assert.match(activeText, new RegExp(newMarker)); assert.doesNotMatch(activeText, new RegExp(oldMarker))
    assert.match(oldText, new RegExp(oldMarker)); assert.doesNotMatch(oldText, new RegExp(newMarker))
  })

  it('fails closed on stored corpus hash mismatch', () => {
    const snapshot = oldSnapshot(); snapshot.activePacks = snapshot.activePacks.map((pack) => pack.id === 'saju-master-service' ? { ...pack, contentHash: '0000000000000000' } : pack)
    assert.throws(() => retrieveRagChunks('천명사주 원국 대운', analyzeSaju(birth), 20, context, snapshot), /Corpus snapshot hash mismatch: saju-master-service/)
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
    const common = { analysis, birth, context, section, hook: '반복된 선택은 실제 기록에서 확인해요.', interpretation: `${oldMarker}.` }
    const issue = '코퍼스 문장을 복사하지 말고 현재 질문과 근거에 맞는 새 문장으로 다시 쓰세요.'
    assert.ok(!reviewGeneratedSajuReportSection(common).issues.includes(issue)); assert.ok(reviewGeneratedSajuReportSection({ ...common, corpusSnapshot: oldSnapshot() }).issues.includes(issue))
  })

  it('binds a truthful local candidate and registry-only rollback', () => {
    const manifest = JSON.parse(readFileSync(join(root, 'tone-v2/releases/saju-master-2.1.0.json'), 'utf8'))
    assert.equal(manifest.state, 'candidate'); assert.equal(manifest.deployed, false); assert.equal(manifest.serviceKey, 'saju_master'); assert.equal(manifest.generationEvidence, null)
    assert.deepEqual(manifest.corpus.candidate, { path: `data/${newPath}`, version: '2.1.0', sha256: hashFile(newPath) })
    assert.deepEqual(manifest.corpus.previous, { path: `data/${oldPath}`, version: '2.0.0', sha256: hashFile(oldPath) })
    assert.equal(manifest.attachment.newReportsOnly, true); assert.equal(manifest.attachment.storedSnapshotRequired, true); assert.equal(manifest.attachment.customerRecordMutation, false)
    assert.equal(manifest.rollback.strategy, 'registry_only'); assert.equal(manifest.rollback.customerRecordRewrite, false)
    assert.equal(manifest.verificationEvidence, 'tone-v2/evaluations/P05-saju-master-corpus-rag-release-candidate-20260913.json')
    assert.ok(Object.values(manifest.gates).every((value) => value !== 'pending'))
  })
})
