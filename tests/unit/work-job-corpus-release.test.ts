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
const oldPath = 'tone-v2/corpus/work-job-service.json'
const newPath = 'tone-v2/corpus/releases/work-job-service-2.1.0.json'
const oldMarker = '월주와 십성은 특정 직업을 확정하는 공식이 아니라 어떤 업무 장면에서 강점이 쓰이고 어디서 소모되는지 보는 기준이다'
const newMarker = '계산된 월주와 십성은 직업 적성이나 성과를 확정하는 사실이 아니라 실제 업무 경험을 검토하는 상징적 질문이다'
const birth: BirthInput = { year: 1985, month: 3, day: 20, hour: 9, gender: 'male', calendar: 'solar' }
const context: SajuReportContext = { serviceKey: 'work_job', work: '기획 업무', concern: '현재 업무에서 집중과 소모가 갈리는 조건을 확인하고 싶습니다.' }
const hashFile = (path: string) => createHash('sha256').update(readFileSync(join(root, 'data', path), 'utf8')).digest('hex')

function oldSnapshot(): CorpusSnapshot {
  const current = getCorpusSnapshot()
  return { ...current, registryVersion: 'tone-v2.2.0.6', fingerprint: 'test-old-work-job-snapshot', activePacks: current.activePacks.map((pack) => pack.id === 'work-job-service' ? { ...pack, path: oldPath, version: '2.0.0', contentHash: hashFile(oldPath).slice(0, 16) } : pack) }
}

describe('[TASK P05] work_job corpus/RAG release candidate', () => {
  it('activates reviewed 2.1.0 and retains 2.0.0 for rollback', () => {
    const pack = getCorpusSnapshot().activePacks.find((item) => item.id === 'work-job-service')
    assert.equal(pack?.version, '2.1.0'); assert.equal(pack?.path, newPath)
    assert.doesNotThrow(() => readFileSync(join(root, 'data', oldPath), 'utf8'))
    assert.equal(pack?.contentHash, hashFile(newPath).slice(0, 16))
  })

  it('records one explicit semantic-review pass without sample output', () => {
    const review = JSON.parse(readFileSync(join(root, 'tone-v2/corpus-review/work-job-2.1.0.json'), 'utf8'))
    assert.equal(review.status, 'approved'); assert.equal(review.sourcePath, `data/${newPath}`)
    assert.equal(review.sourceSha256, hashFile(newPath)); assert.equal(review.sampleOutputsIngested, false)
    assert.deepEqual(review.blocks.map((item: any) => item.id), ['workjob-001'])
    assert.ok(review.blocks.every((block: any) => block.status === 'pass' && Object.values(block.checks).every(Boolean)))
  })

  it('enforces career fact, symbolic, hypothetical and professional boundaries', () => {
    const pack = JSON.parse(readFileSync(join(root, 'data', newPath), 'utf8')); const block = pack.knowledgeBlocks[0]
    const text = [block.condition, block.interpretation, ...block.real_world_pattern, block.risk, block.opportunity, block.advice, block.forbidden_generalization].join(' ')
    const guidance = [block.interpretation, ...block.real_world_pattern, block.opportunity, block.advice].join(' ')
    assert.equal(pack.release.sampleOutputsIngested, false); assert.equal(pack.knowledgeBlocks.length, 1); assert.equal(block.id, 'workjob-001')
    assert.ok(block.real_world_pattern.every((item: string) => item.startsWith('가상 사례:')))
    assert.match(block.condition, /serviceKey.*서버가 계산한 월주.*십성/)
    assert.match(text, /사용자가 입력하거나 확인한 사실/); assert.match(block.forbidden_generalization, /월주나 십성만으로/)
    assert.match(text, /근로계약|건강|재무/)
    assert.doesNotMatch(text, /\d+\s*(?:분|시간|일|주|개월|년|번|가지|개)\b/)
    assert.doesNotMatch(guidance, /천직이다|채용된다|승진한다|연봉이 오른다|퇴사해야 한다|동료는.*생각/)
  })

  it('selects active corpus for new reports and stored corpus for old reports', () => {
    const analysis = analyzeSaju(birth)
    const active = retrieveRagChunks('직업 적성 월주 십성 실제 업무 강점 소모', analysis, 20, context)
    const old = retrieveRagChunks('직업 적성 월주 십성 실제 업무 강점 소모', analysis, 20, context, oldSnapshot())
    const activeText = active.map((item) => item.content).join('\n'); const oldText = old.map((item) => item.content).join('\n')
    assert.ok(active.some((item) => item.domain === 'work_job_service')); assert.ok(old.some((item) => item.domain === 'work_job_service'))
    assert.match(activeText, new RegExp(newMarker)); assert.doesNotMatch(activeText, new RegExp(oldMarker))
    assert.match(oldText, new RegExp(oldMarker)); assert.doesNotMatch(oldText, new RegExp(newMarker))
  })

  it('fails closed on stored corpus hash mismatch', () => {
    const snapshot = oldSnapshot(); snapshot.activePacks = snapshot.activePacks.map((pack) => pack.id === 'work-job-service' ? { ...pack, contentHash: '0000000000000000' } : pack)
    assert.throws(() => retrieveRagChunks('직업 적성 월주', analyzeSaju(birth), 20, context, snapshot), /Corpus snapshot hash mismatch: work-job-service/)
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
    const common = { analysis, birth, context, section, hook: '업무 강점은 실제 기록에서 확인해요.', interpretation: `${oldMarker}.` }
    const issue = '코퍼스 문장을 복사하지 말고 현재 질문과 근거에 맞는 새 문장으로 다시 쓰세요.'
    assert.ok(!reviewGeneratedSajuReportSection(common).issues.includes(issue)); assert.ok(reviewGeneratedSajuReportSection({ ...common, corpusSnapshot: oldSnapshot() }).issues.includes(issue))
  })

  it('binds a truthful local candidate and registry-only rollback', () => {
    const manifest = JSON.parse(readFileSync(join(root, 'tone-v2/releases/work-job-2.1.0.json'), 'utf8'))
    assert.equal(manifest.state, 'candidate'); assert.equal(manifest.deployed, false); assert.equal(manifest.serviceKey, 'work_job'); assert.equal(manifest.generationEvidence, null)
    assert.deepEqual(manifest.corpus.candidate, { path: `data/${newPath}`, version: '2.1.0', sha256: hashFile(newPath) })
    assert.deepEqual(manifest.corpus.previous, { path: `data/${oldPath}`, version: '2.0.0', sha256: hashFile(oldPath) })
    assert.equal(manifest.attachment.newReportsOnly, true); assert.equal(manifest.attachment.storedSnapshotRequired, true); assert.equal(manifest.attachment.customerRecordMutation, false)
    assert.equal(manifest.rollback.strategy, 'registry_only'); assert.equal(manifest.rollback.customerRecordRewrite, false)
    assert.equal(manifest.verificationEvidence, 'tone-v2/evaluations/P05-work-job-corpus-rag-release-candidate-20260913.json')
    assert.ok(Object.values(manifest.gates).every((value) => value !== 'pending'))
  })
})
