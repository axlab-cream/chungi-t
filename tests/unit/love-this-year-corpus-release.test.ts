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
const oldPath = 'tone-v2/corpus/love-this-year-service.json'
const newPath = 'tone-v2/corpus/releases/love-this-year-service-2.1.0.json'
const oldMarker = '올해 연애 가능성은 좋다/나쁘다 판정이 아니라 관계가 반복 만남과 구체적 약속으로 이어질 힘을 보는 것이다.'
const newMarker = '올해 연애운은 사용자에게 확인된 관계 사실과 서버가 계산한 사주 값을 질문으로 번역할 뿐 만남·연락·상대 마음이나 관계 결과를 증명하지 않는다'
const birth: BirthInput = { year: 1992, month: 8, day: 20, hour: 12, gender: 'female', calendar: 'solar' }
const context: SajuReportContext = { serviceKey: 'love_this_year', relationship: '현재 연애 중이 아니며 확인된 특정 상대는 없음', concern: '올해 관계 흐름을 사실과 상징을 나눠 보고 싶어요.' }
const hashFile = (path: string) => createHash('sha256').update(readFileSync(join(root, 'data', path), 'utf8')).digest('hex')

function oldSnapshot(): CorpusSnapshot {
  const current = getCorpusSnapshot()
  return { ...current, registryVersion: 'tone-v2.2.0.19', fingerprint: 'old-love-this-year', activePacks: current.activePacks.map((pack) => pack.id === 'love-this-year-service' ? { ...pack, path: oldPath, version: '2.0.0', contentHash: hashFile(oldPath).slice(0, 16) } : pack) }
}

describe('[TASK P05] love_this_year corpus/RAG release candidate', () => {
  it('activates reviewed 2.1.0 and retains 2.0.0', () => {
    const pack = getCorpusSnapshot().activePacks.find((item) => item.id === 'love-this-year-service')
    assert.equal(pack?.version, '2.1.0')
    assert.equal(pack?.path, newPath)
    assert.doesNotThrow(() => readFileSync(join(root, 'data', oldPath)))
    assert.equal(pack?.contentHash, hashFile(newPath).slice(0, 16))
  })

  it('records ten semantic-review passes', () => {
    const review = JSON.parse(readFileSync(join(root, 'tone-v2/corpus-review/love-this-year-2.1.0.json'), 'utf8'))
    assert.equal(review.status, 'approved')
    assert.equal(review.sourcePath, `data/${newPath}`)
    assert.equal(review.sourceSha256, hashFile(newPath))
    assert.equal(review.sampleOutputsIngested, false)
    assert.equal(review.blocks.length, 10)
    assert.deepEqual(review.blocks.map((item: any) => item.id), Array.from({ length: 10 }, (_, index) => `lty-${String(index + 1).padStart(3, '0')}`))
    assert.ok(review.blocks.every((block: any) => block.status === 'pass' && Object.values(block.checks).every(Boolean)))
  })

  it('enforces relationship fact, partner privacy, consent, safety, numeric and future boundaries', () => {
    const pack = JSON.parse(readFileSync(join(root, 'data', newPath), 'utf8'))
    const blocks = pack.knowledgeBlocks
    const text = blocks.map((block: any) => [block.topic, block.concept, block.condition, block.interpretation, ...block.real_world_pattern, block.risk, block.opportunity, block.advice, block.forbidden_generalization].join(' ')).join(' ')
    const guidance = blocks.map((block: any) => [block.topic, block.concept, block.interpretation, ...block.real_world_pattern, block.opportunity, block.advice].join(' ')).join(' ')
    assert.equal(blocks.length, 10)
    assert.equal(new Set(blocks.map((block: any) => block.interpretation)).size, 10)
    assert.equal(new Set(blocks.map((block: any) => block.topic)).size, 10)
    assert.ok(blocks.every((block: any) => block.real_world_pattern.every((item: string) => item.startsWith('가상 사례:'))))
    assert.ok(blocks.every((block: any) => /사용자에게 확인된/.test(block.condition) && /서버가 계산한/.test(block.condition) && /알 수 없음/.test(block.condition)))
    assert.doesNotMatch(text, /현재 항목과 계산값이 직접 연결될 때만 사용한다/)
    assert.match(text, new RegExp(newMarker))
    assert.match(text, /원본 생년월일시|상대 마음|동의|거절|연락 중단/)
    assert.match(text, /위협|강압|스토킹|폭력|안전/)
    assert.doesNotMatch(guidance, /한 달 안에|세 개|하나를 만들|특정 달에|몇 월에 반드시|무조건 새 인연|반드시 연애|반드시 좋은 인연/)
    assert.doesNotMatch(guidance, /소개나 연락이 늘어남|실제 일정으로 잡힘|생활 반경.*바뀜|가까워질수록 불안|답장 속도.*흔들림|외부 일정.*많아짐|관계가 움직이는 신호|마음이 안정되는 사람|감정 온도 차이|연애운은.*현실화/)
  })

  it('separates active and stored retrieval', () => {
    const analysis = analyzeSaju(birth)
    const active = retrieveRagChunks('올해 연애운 세운 도화 만남 관계', analysis, 40, context)
    const old = retrieveRagChunks('올해 연애운 세운 도화 만남 관계', analysis, 40, context, oldSnapshot())
    const activeText = active.map((item) => item.content).join('\n')
    const oldText = old.map((item) => item.content).join('\n')
    assert.ok(active.some((item) => item.domain === 'love_this_year_service'))
    assert.ok(old.some((item) => item.domain === 'love_this_year_service'))
    assert.match(activeText, new RegExp(newMarker))
    assert.doesNotMatch(activeText, new RegExp(oldMarker))
    assert.match(oldText, new RegExp(oldMarker))
    assert.doesNotMatch(oldText, new RegExp(newMarker))
  })

  it('fails closed on stored hash mismatch', () => {
    const snapshot = oldSnapshot()
    snapshot.activePacks = snapshot.activePacks.map((pack) => pack.id === 'love-this-year-service' ? { ...pack, contentHash: '0000000000000000' } : pack)
    assert.throws(() => retrieveRagChunks('올해 연애운', analyzeSaju(birth), 40, context, snapshot), /Corpus snapshot hash mismatch: love-this-year-service/)
  })

  it('builds prompts from stored snapshot', () => {
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

  it('reviews saved prose against stored snapshot', () => {
    const analysis = analyzeSaju(birth)
    const section = buildTemplateSajuReport(analysis, birth, context).sections[0]
    assert.ok(section)
    const common = { analysis, birth, context, section, hook: '확인된 사실과 올해의 상징 질문을 분리해요.', interpretation: oldMarker }
    const issue = '코퍼스 문장을 복사하지 말고 현재 질문과 근거에 맞는 새 문장으로 다시 쓰세요.'
    assert.ok(!reviewGeneratedSajuReportSection(common).issues.includes(issue))
    assert.ok(reviewGeneratedSajuReportSection({ ...common, corpusSnapshot: oldSnapshot() }).issues.includes(issue))
  })

  it('preserves the dedicated route and keeps generic fallback blocked', () => {
    const app = readFileSync(join(root, 'src/server/app.ts'), 'utf8')
    assert.match(app, /app\.post\('\/api\/love\/this-year\/analyze'/)
    assert.match(app, /context\.serviceKey === LOVE_THIS_YEAR_SERVICE_KEY[\s\S]{0,180}INPUT_REQUIRED/)
  })

  it('binds a truthful reversible local candidate', () => {
    const manifest = JSON.parse(readFileSync(join(root, 'tone-v2/releases/love-this-year-2.1.0.json'), 'utf8'))
    assert.equal(manifest.state, 'candidate')
    assert.equal(manifest.deployed, false)
    assert.equal(manifest.serviceKey, 'love_this_year')
    assert.equal(manifest.generationEvidence, null)
    assert.match(manifest.generationEvidenceReason, /no provider evaluation/i)
    assert.deepEqual(manifest.corpus.candidate, { path: `data/${newPath}`, version: '2.1.0', sha256: hashFile(newPath) })
    assert.deepEqual(manifest.corpus.previous, { path: `data/${oldPath}`, version: '2.0.0', sha256: hashFile(oldPath) })
    assert.equal(manifest.attachment.newReportsOnly, true)
    assert.equal(manifest.attachment.customerRecordMutation, false)
    assert.equal(manifest.routing.dedicatedAnalyzeRoute, '/api/love/this-year/analyze')
    assert.equal(manifest.routing.genericAnalyzeFallback, 'blocked')
    assert.equal(manifest.rollback.strategy, 'registry_only')
    assert.equal(manifest.verificationEvidence, 'tone-v2/evaluations/P05-love-this-year-corpus-rag-release-candidate-20260913.json')
    assert.ok(Object.values(manifest.gates).every((value) => value !== 'pending'))
  })
})
