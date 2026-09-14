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
const oldPath = 'tone-v2/corpus/wedding-day-service.json'
const newPath = 'tone-v2/corpus/releases/wedding-day-service-2.1.0.json'
const oldMarker = '판정은 등급이 아니라 유리한 조건과 걸리는 조건의 수로 나옵니다.'
const newMarker = '결혼 택일은 사용자가 제시한 후보일과 서버가 계산한 후보일 일주·월절·명식 관계를 비교 질문으로 번역할 뿐 결혼 결과나 사람의 상태를 증명하지 않는다'
const birth: BirthInput = { year: 1990, month: 4, day: 12, hour: 12, gender: 'female', calendar: 'solar' }
const context: SajuReportContext = { serviceKey: 'wedding_day', concern: '제시한 후보일의 계산 조건을 비교하고 싶고 예식장·양가·계약 상태는 아직 입력하지 않았어요.' }
const hashFile = (path: string) => createHash('sha256').update(readFileSync(join(root, 'data', path), 'utf8')).digest('hex')
function oldSnapshot(): CorpusSnapshot { const current = getCorpusSnapshot(); return { ...current, registryVersion: 'tone-v2.2.0.17', fingerprint: 'old-wedding-day', activePacks: current.activePacks.map((pack) => pack.id === 'wedding-day-service' ? { ...pack, path: oldPath, version: '2.0.0', contentHash: hashFile(oldPath).slice(0, 16) } : pack) } }

describe('[TASK P05] wedding_day corpus/RAG release candidate', () => {
  it('activates reviewed 2.1.0 and retains 2.0.0', () => { const pack = getCorpusSnapshot().activePacks.find((item) => item.id === 'wedding-day-service'); assert.equal(pack?.version, '2.1.0'); assert.equal(pack?.path, newPath); assert.doesNotThrow(() => readFileSync(join(root, 'data', oldPath))); assert.equal(pack?.contentHash, hashFile(newPath).slice(0, 16)) })
  it('records six semantic-review passes', () => { const review = JSON.parse(readFileSync(join(root, 'tone-v2/corpus-review/wedding-day-2.1.0.json'), 'utf8')); assert.equal(review.status, 'approved'); assert.equal(review.sourcePath, `data/${newPath}`); assert.equal(review.sourceSha256, hashFile(newPath)); assert.equal(review.sampleOutputsIngested, false); assert.equal(review.blocks.length, 6); assert.deepEqual(review.blocks.map((item: any) => item.id), Array.from({ length: 6 }, (_, index) => `wedding-${String(index + 1).padStart(3, '0')}`)); assert.ok(review.blocks.every((block: any) => block.status === 'pass' && Object.values(block.checks).every(Boolean))) })
  it('enforces candidate-date, calculation, privacy, future, numeric and professional boundaries', () => { const pack = JSON.parse(readFileSync(join(root, 'data', newPath), 'utf8')); const blocks = pack.knowledgeBlocks; const text = blocks.map((block: any) => [block.topic, block.concept, block.condition, block.interpretation, ...block.real_world_pattern, block.risk, block.opportunity, block.advice, block.forbidden_generalization, block.writing_guide].join(' ')).join(' '); const guidance = blocks.map((block: any) => [block.topic, block.concept, block.interpretation, ...block.real_world_pattern, block.opportunity, block.advice, block.writing_guide].join(' ')).join(' '); assert.equal(blocks.length, 6); assert.equal(new Set(blocks.map((block: any) => block.interpretation)).size, 6); assert.equal(new Set(blocks.map((block: any) => block.topic)).size, 6); assert.ok(blocks.every((block: any) => block.real_world_pattern.every((item: string) => item.startsWith('가상 사례:')))); assert.ok(blocks.every((block: any) => /사용자가 제시한/.test(block.condition) && /서버가 계산한/.test(block.condition) && /알 수 없음/.test(block.condition))); assert.doesNotMatch(text, /현재 항목과 계산값이 직접 연결될 때만 사용한다/); assert.match(text, new RegExp(newMarker)); assert.match(text, /상대.*미입력|상대 정보.*없/); assert.match(text, /출생 시각.*미상|출생 시각.*없/); assert.match(text, /법률|계약|재무|의료|전문/); assert.doesNotMatch(guidance, /두세 개|한 줄|하나 덜|첫 두세 달|첫 달|몇 달|비슷한 시점/); assert.doesNotMatch(guidance, /가장 흔하고|부담으로 남는다|판정이 달라진다|위약 문제가 생긴다|감정이 문제가 됩니다|서운함이 남는다|신혼 초에 부딪힌다|컨디션은.*정해집니다|표정이 굳는다|오히려 기억에 남았다|리듬이 한동안 이어집니다|신혼 첫 달을 다 쓴다|서로 서운해진다|두 사람 모두 지친다/) })
  it('separates active and stored retrieval', () => { const analysis = analyzeSaju(birth); const active = retrieveRagChunks('결혼 택일 후보일 판정 조건 비교', analysis, 40, context); const old = retrieveRagChunks('결혼 택일 후보일 판정 조건 비교', analysis, 40, context, oldSnapshot()); const activeText = active.map((item) => item.content).join('\n'); const oldText = old.map((item) => item.content).join('\n'); assert.ok(active.some((item) => item.domain === 'wedding_day_service')); assert.ok(old.some((item) => item.domain === 'wedding_day_service')); assert.match(activeText, new RegExp(newMarker)); assert.doesNotMatch(activeText, new RegExp(oldMarker)); assert.match(oldText, new RegExp(oldMarker)); assert.doesNotMatch(oldText, new RegExp(newMarker)) })
  it('fails closed on stored hash mismatch', () => { const snapshot = oldSnapshot(); snapshot.activePacks = snapshot.activePacks.map((pack) => pack.id === 'wedding-day-service' ? { ...pack, contentHash: '0000000000000000' } : pack); assert.throws(() => retrieveRagChunks('결혼 택일 후보일', analyzeSaju(birth), 40, context, snapshot), /Corpus snapshot hash mismatch: wedding-day-service/) })
  it('builds prompts from stored snapshot', () => { const analysis = analyzeSaju(birth); const section = buildTemplateSajuReport(analysis, birth, context).sections[0]; assert.ok(section); const active = sectionPrompt(analysis, birth, context, section).map((item) => item.content).join('\n'); const old = sectionPrompt(analysis, birth, context, section, [], oldSnapshot()).map((item) => item.content).join('\n'); assert.match(active, new RegExp(newMarker)); assert.doesNotMatch(active, new RegExp(oldMarker)); assert.match(old, new RegExp(oldMarker)); assert.doesNotMatch(old, new RegExp(newMarker)) })
  it('reviews saved prose against stored snapshot', () => { const analysis = analyzeSaju(birth); const section = buildTemplateSajuReport(analysis, birth, context).sections[0]; assert.ok(section); const common = { analysis, birth, context, section, hook: '제시된 후보일의 계산 조건만 비교해요.', interpretation: oldMarker }; const issue = '코퍼스 문장을 복사하지 말고 현재 질문과 근거에 맞는 새 문장으로 다시 쓰세요.'; assert.ok(!reviewGeneratedSajuReportSection(common).issues.includes(issue)); assert.ok(reviewGeneratedSajuReportSection({ ...common, corpusSnapshot: oldSnapshot() }).issues.includes(issue)) })
  it('binds a truthful reversible local candidate', () => {
    const manifest = JSON.parse(readFileSync(join(root, 'tone-v2/releases/wedding-day-2.1.0.json'), 'utf8'))
    assert.equal(manifest.state, 'candidate')
    assert.equal(manifest.deployed, false)
    assert.equal(manifest.serviceKey, 'wedding_day')
    assert.equal(manifest.generationEvidence.path, 'tone-v2/evaluations/P04-wedding-day-full-outline-generation-20260913.json')
    assert.equal(manifest.generationEvidence.containsProviderProse, false)
    assert.match(manifest.generationEvidence.recordSha256, /^[a-f0-9]{64}$/)
    assert.match(manifest.generationEvidence.acceptedProseSha256, /^[a-f0-9]{64}$/)
    assert.equal(manifest.visualEvidence.path, 'tone-v2/evaluations/P04-wedding-day-visual-render-evidence-20260913.json')
    assert.equal(manifest.visualEvidence.sha256, hashFile('../tone-v2/evaluations/P04-wedding-day-visual-render-evidence-20260913.json'))
    assert.equal(manifest.visualEvidence.desktop, 'pass_20_of_20')
    assert.equal(manifest.visualEvidence.mobile, 'pass_20_of_20')
    assert.equal(manifest.visualEvidence.print, 'pass_20_of_20')
    assert.equal(manifest.visualEvidence.containsProviderProse, false)
    assert.deepEqual(manifest.corpus.candidate, { path: `data/${newPath}`, version: '2.1.0', sha256: hashFile(newPath) })
    assert.deepEqual(manifest.corpus.previous, { path: `data/${oldPath}`, version: '2.0.0', sha256: hashFile(oldPath) })
    assert.equal(manifest.attachment.newReportsOnly, true)
    assert.equal(manifest.attachment.customerRecordMutation, false)
    assert.equal(manifest.rollback.strategy, 'registry_only')
    assert.equal(manifest.verificationEvidence, 'tone-v2/evaluations/P05-wedding-day-corpus-rag-release-candidate-20260913.json')
    assert.ok(Object.values(manifest.gates).every((value) => value !== 'pending'))
  })
})
