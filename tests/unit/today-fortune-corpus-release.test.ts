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
const oldPath = 'tone-v2/corpus/today-fortune-service.json'
const newPath = 'tone-v2/corpus/releases/today-fortune-service-2.1.0.json'
const oldMarker = '오늘운은 사건을 확정하는 예언이 아니라 일진과 일간의 상호작용을 오늘 할 일의 순서로 바꾸는 안내다'
const newMarker = '계산된 일진과 원국의 관계는 오늘의 사건을 예고하는 사실이 아니라 행동 우선순위를 검토하는 상징적 질문이다'
const birth: BirthInput = { year: 1985, month: 3, day: 20, hour: 9, gender: 'male', calendar: 'solar' }
const context: SajuReportContext = { serviceKey: 'today_fortune', concern: '오늘 마감과 약속 중 무엇을 먼저 확인할지 정하고 싶어요.' }
const hashFile = (path: string) => createHash('sha256').update(readFileSync(join(root, 'data', path), 'utf8')).digest('hex')

function oldSnapshot(): CorpusSnapshot {
  const current = getCorpusSnapshot()
  return { ...current, registryVersion: 'tone-v2.2.0.4', fingerprint: 'test-old-today-fortune-snapshot', activePacks: current.activePacks.map((pack) => pack.id === 'today-fortune-service' ? { ...pack, path: oldPath, version: '2.0.0', contentHash: hashFile(oldPath).slice(0, 16) } : pack) }
}

describe('[TASK P05] today_fortune corpus/RAG release candidate', () => {
  it('activates reviewed 2.1.0 and retains 2.0.0 for rollback', () => {
    const pack = getCorpusSnapshot().activePacks.find((item) => item.id === 'today-fortune-service')
    assert.equal(pack?.version, '2.1.0'); assert.equal(pack?.path, newPath)
    assert.doesNotThrow(() => readFileSync(join(root, 'data', oldPath), 'utf8'))
    assert.equal(pack?.contentHash, hashFile(newPath).slice(0, 16))
  })

  it('records an explicit semantic-review pass without sample output', () => {
    const review = JSON.parse(readFileSync(join(root, 'tone-v2/corpus-review/today-fortune-2.1.0.json'), 'utf8'))
    assert.equal(review.status, 'approved'); assert.equal(review.sourcePath, `data/${newPath}`)
    assert.equal(review.sourceSha256, hashFile(newPath)); assert.equal(review.sampleOutputsIngested, false)
    assert.deepEqual(review.blocks.map((item: any) => item.id), ['today-001'])
    assert.ok(review.blocks.every((block: any) => block.status === 'pass' && Object.values(block.checks).every(Boolean)))
  })

  it('enforces daily evidence, symbolic and hypothetical boundaries', () => {
    const pack = JSON.parse(readFileSync(join(root, 'data', newPath), 'utf8'))
    const block = pack.knowledgeBlocks[0]
    const text = [block.condition, block.interpretation, ...block.real_world_pattern, block.risk, block.opportunity, block.advice, block.forbidden_generalization].join(' ')
    const customerGuidance = [block.interpretation, ...block.real_world_pattern, block.opportunity, block.advice].join(' ')
    assert.equal(pack.release.sampleOutputsIngested, false); assert.equal(pack.knowledgeBlocks.length, 1); assert.equal(block.id, 'today-001')
    assert.ok(block.real_world_pattern.every((item: string) => item.startsWith('가상 사례:')))
    assert.match(block.condition, /serviceKey.*서버가 계산한 기준일/)
    assert.match(text, /실제 일정|마감/); assert.match(text, /되돌리기/)
    assert.match(block.forbidden_generalization, /일진만으로/)
    assert.doesNotMatch(text, /\d+\s*(?:분|시간|일|주|개월|번|가지|개)\b/)
    assert.doesNotMatch(customerGuidance, /길한 시각|반드시 좋은 일|반드시 나쁜 일|연락.*올 것이다|성과.*난다/)
  })

  it('selects active corpus for new reports and stored corpus for old reports', () => {
    const analysis = analyzeSaju(birth)
    const active = retrieveRagChunks('오늘 일진 일간 행동 우선순위', analysis, 20, context)
    const old = retrieveRagChunks('오늘 일진 일간 행동 우선순위', analysis, 20, context, oldSnapshot())
    const activeText = active.map((item) => item.content).join('\n'); const oldText = old.map((item) => item.content).join('\n')
    assert.ok(active.some((item) => item.domain === 'today_fortune_service')); assert.ok(old.some((item) => item.domain === 'today_fortune_service'))
    assert.match(activeText, new RegExp(newMarker)); assert.doesNotMatch(activeText, new RegExp(oldMarker))
    assert.match(oldText, new RegExp(oldMarker)); assert.doesNotMatch(oldText, new RegExp(newMarker))
  })

  it('fails closed on stored corpus hash mismatch', () => {
    const snapshot = oldSnapshot(); snapshot.activePacks = snapshot.activePacks.map((pack) => pack.id === 'today-fortune-service' ? { ...pack, contentHash: '0000000000000000' } : pack)
    assert.throws(() => retrieveRagChunks('오늘 일진', analyzeSaju(birth), 20, context, snapshot), /Corpus snapshot hash mismatch: today-fortune-service/)
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
    const common = { analysis, birth, context, section, hook: '오늘의 우선순위는 실제 일정으로 정해요.', interpretation: `${oldMarker}.` }
    const issue = '코퍼스 문장을 복사하지 말고 현재 질문과 근거에 맞는 새 문장으로 다시 쓰세요.'
    assert.ok(!reviewGeneratedSajuReportSection(common).issues.includes(issue)); assert.ok(reviewGeneratedSajuReportSection({ ...common, corpusSnapshot: oldSnapshot() }).issues.includes(issue))
  })

  it('binds a truthful local candidate and registry-only rollback', () => {
    const manifest = JSON.parse(readFileSync(join(root, 'tone-v2/releases/today-fortune-2.1.0.json'), 'utf8'))
    assert.equal(manifest.state, 'candidate'); assert.equal(manifest.deployed, false); assert.equal(manifest.serviceKey, 'today_fortune'); assert.equal(manifest.generationEvidence.path, 'tone-v2/evaluations/P04-today-fortune-full-outline-evidence-20260913.json')
    assert.deepEqual(manifest.corpus.candidate, { path: `data/${newPath}`, version: '2.1.0', sha256: hashFile(newPath) })
    assert.deepEqual(manifest.corpus.previous, { path: `data/${oldPath}`, version: '2.0.0', sha256: hashFile(oldPath) })
    assert.equal(manifest.attachment.newReportsOnly, true); assert.equal(manifest.attachment.storedSnapshotRequired, true); assert.equal(manifest.attachment.deterministicDailyRendererChanged, true)
    assert.equal(manifest.rollback.strategy, 'registry_only'); assert.equal(manifest.rollback.customerRecordRewrite, false)
    assert.equal(manifest.verificationEvidence, 'tone-v2/evaluations/P05-today-fortune-corpus-rag-release-candidate-20260913.json')
    assert.ok(Object.values(manifest.gates).every((value) => value !== 'pending'))
  })
})
