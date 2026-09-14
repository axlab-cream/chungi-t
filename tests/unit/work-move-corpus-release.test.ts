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
const oldPath = 'tone-v2/corpus/work-move-service.json'
const newPath = 'tone-v2/corpus/releases/work-move-service-2.1.0.json'
const oldMarker = '이직운의 첫 결론은 합격/퇴사 확정이 아니라 현재 상태가 움직임, 유지, 준비, 보류, 조건부 전환 중 어디에 가까운지 가르는 것이다'
const newMarker = '이동 판단은 사용자가 확인한 현재 조건과 문서화된 대안의 차이를 비교하는 절차다'
const birth: BirthInput = { year: 1985, month: 3, day: 20, hour: 9, gender: 'male', calendar: 'solar' }
const context: SajuReportContext = { serviceKey: 'work_move', concern: '서면 오퍼 조건과 현재 역할을 비교하고 싶어요.' }
const hashFile = (path: string) => createHash('sha256').update(readFileSync(join(root, 'data', path), 'utf8')).digest('hex')

function oldSnapshot(): CorpusSnapshot {
  const current = getCorpusSnapshot()
  return { ...current, registryVersion: 'tone-v2.2.0.11', fingerprint: 'old-work-move', activePacks: current.activePacks.map((pack) => pack.id === 'work-move-service' ? { ...pack, path: oldPath, version: '2.0.0', contentHash: hashFile(oldPath).slice(0, 16) } : pack) }
}

describe('[TASK P05] work_move corpus/RAG release candidate', () => {
  it('activates reviewed 2.1.0 and retains 2.0.0', () => {
    const pack = getCorpusSnapshot().activePacks.find((item) => item.id === 'work-move-service')
    assert.equal(pack?.version, '2.1.0'); assert.equal(pack?.path, newPath)
    assert.doesNotThrow(() => readFileSync(join(root, 'data', oldPath), 'utf8'))
    assert.equal(pack?.contentHash, hashFile(newPath).slice(0, 16))
  })

  it('records ten semantic-review passes', () => {
    const review = JSON.parse(readFileSync(join(root, 'tone-v2/corpus-review/work-move-2.1.0.json'), 'utf8'))
    assert.equal(review.status, 'approved'); assert.equal(review.sourcePath, `data/${newPath}`)
    assert.equal(review.sourceSha256, hashFile(newPath)); assert.equal(review.sampleOutputsIngested, false)
    assert.equal(review.blocks.length, 10)
    assert.deepEqual(review.blocks.map((item: any) => item.id), Array.from({ length: 10 }, (_, index) => `wmov-${String(index + 1).padStart(3, '0')}`))
    assert.ok(review.blocks.every((block: any) => block.status === 'pass' && Object.values(block.checks).every(Boolean)))
  })

  it('enforces work fact, document, unknown, symbolic and professional boundaries', () => {
    const pack = JSON.parse(readFileSync(join(root, 'data', newPath), 'utf8')); const blocks = pack.knowledgeBlocks
    const text = blocks.map((block: any) => [block.condition, block.interpretation, ...block.real_world_pattern, block.risk, block.opportunity, block.advice, block.forbidden_generalization].join(' ')).join(' ')
    const guidance = blocks.map((block: any) => [block.interpretation, ...block.real_world_pattern, block.opportunity, block.advice].join(' ')).join(' ')
    assert.equal(blocks.length, 10); assert.ok(blocks.every((block: any) => block.real_world_pattern.every((item: string) => item.startsWith('가상 사례:'))))
    assert.ok(blocks.every((block: any) => /사용자가 확인한 사실과 실제 문서/.test(block.condition) && /서버 계산값은 상징적 질문/.test(block.condition) && /확인되지 않은 조건은 알 수 없음/.test(block.condition)))
    assert.doesNotMatch(text, /현재 항목과 계산값이 직접 연결될 때만 사용한다/)
    assert.match(text, /구두 약속/); assert.match(text, /회사 문화|기밀/); assert.match(text, /합격|채용/); assert.match(text, /연봉/); assert.match(text, /건강/); assert.match(text, /근로계약|노무|법률/)
    assert.doesNotMatch(guidance, /반드시 합격|연봉이 오른다|올해 퇴사하면 성공|회사는 곧 구조조정|상사는.*생각/)
    assert.doesNotMatch(guidance, /\d+\s*(?:분|시간|일|주|개월|년|번|가지|개)\b/)
  })

  it('separates active and stored retrieval', () => {
    const analysis = analyzeSaju(birth)
    const active = retrieveRagChunks('이직 오퍼 현재 조건 문서 비교', analysis, 20, context)
    const old = retrieveRagChunks('이직 오퍼 현재 조건 문서 비교', analysis, 20, context, oldSnapshot())
    const activeText = active.map((item) => item.content).join('\n'); const oldText = old.map((item) => item.content).join('\n')
    assert.ok(active.some((item) => item.domain === 'work_move_service')); assert.ok(old.some((item) => item.domain === 'work_move_service'))
    assert.match(activeText, new RegExp(newMarker)); assert.doesNotMatch(activeText, new RegExp(oldMarker))
    assert.match(oldText, new RegExp(oldMarker)); assert.doesNotMatch(oldText, new RegExp(newMarker))
  })

  it('fails closed on stored hash mismatch', () => {
    const snapshot = oldSnapshot(); snapshot.activePacks = snapshot.activePacks.map((pack) => pack.id === 'work-move-service' ? { ...pack, contentHash: '0000000000000000' } : pack)
    assert.throws(() => retrieveRagChunks('이직 오퍼', analyzeSaju(birth), 20, context, snapshot), /Corpus snapshot hash mismatch: work-move-service/)
  })

  it('builds prompts from stored snapshot', () => {
    const analysis = analyzeSaju(birth); const section = buildTemplateSajuReport(analysis, birth, context).sections.find((item) => item.id === 'work-move-decision'); assert.ok(section)
    const active = sectionPrompt(analysis, birth, context, section).map((item) => item.content).join('\n')
    const old = sectionPrompt(analysis, birth, context, section, [], oldSnapshot()).map((item) => item.content).join('\n')
    assert.match(active, new RegExp(newMarker)); assert.doesNotMatch(active, new RegExp(oldMarker)); assert.match(old, new RegExp(oldMarker)); assert.doesNotMatch(old, new RegExp(newMarker))
  })

  it('reviews saved prose against stored snapshot', () => {
    const analysis = analyzeSaju(birth); const section = buildTemplateSajuReport(analysis, birth, context).sections.find((item) => item.id === 'work-move-decision'); assert.ok(section)
    const common = { analysis, birth, context, section, hook: '현재 조건과 서면 조건을 나눠 봐요.', interpretation: `${oldMarker}.` }
    const issue = '코퍼스 문장을 복사하지 말고 현재 질문과 근거에 맞는 새 문장으로 다시 쓰세요.'
    assert.ok(!reviewGeneratedSajuReportSection(common).issues.includes(issue)); assert.ok(reviewGeneratedSajuReportSection({ ...common, corpusSnapshot: oldSnapshot() }).issues.includes(issue))
  })

  it('binds truthful candidate and rollback', () => {
    const manifest = JSON.parse(readFileSync(join(root, 'tone-v2/releases/work-move-2.1.0.json'), 'utf8'))
    assert.equal(manifest.state, 'candidate'); assert.equal(manifest.deployed, false); assert.equal(manifest.serviceKey, 'work_move'); assert.equal(manifest.generationEvidence, null)
    assert.deepEqual(manifest.corpus.candidate, { path: `data/${newPath}`, version: '2.1.0', sha256: hashFile(newPath) }); assert.deepEqual(manifest.corpus.previous, { path: `data/${oldPath}`, version: '2.0.0', sha256: hashFile(oldPath) })
    assert.equal(manifest.attachment.newReportsOnly, true); assert.equal(manifest.rollback.strategy, 'registry_only'); assert.equal(manifest.verificationEvidence, 'tone-v2/evaluations/P05-work-move-corpus-rag-release-candidate-20260913.json'); assert.ok(Object.values(manifest.gates).every((value) => value !== 'pending'))
  })
})
