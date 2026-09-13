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
const oldPath = 'tone-v2/corpus/money-save-service.json'
const newPath = 'tone-v2/corpus/releases/money-save-service-2.1.0.json'
const oldMarker = '변동 수입은 평균이 아니라 최저 달을 기준으로 생활비를 잡아야 남는다'
const newMarker = '입력된 수입의 날짜와 금액을 나란히 놓으면 변동 범위를 확인할 수 있다'
const birth: BirthInput = { year: 1985, month: 3, day: 20, hour: 9, gender: 'male', calendar: 'solar' }
const context: SajuReportContext = { serviceKey: 'money_save', concern: '수입과 지출 흐름을 실제 내역으로 점검하고 싶어요.' }

function hashFile(path: string): string {
  return createHash('sha256').update(readFileSync(join(root, 'data', path), 'utf8')).digest('hex')
}

function oldSnapshot(): CorpusSnapshot {
  const current = getCorpusSnapshot()
  return {
    ...current,
    registryVersion: 'tone-v2.2.0.1',
    fingerprint: 'test-old-money-save-snapshot',
    activePacks: current.activePacks.map((pack) => pack.id === 'money-save-service'
      ? { ...pack, path: oldPath, version: '2.0.0', contentHash: hashFile(oldPath).slice(0, 16) }
      : pack),
  }
}

describe('[TASK P05] money_save corpus/RAG release candidate', () => {
  it('activates the reviewed 2.1.0 pack and retains 2.0.0 for rollback', () => {
    const pack = getCorpusSnapshot().activePacks.find((item) => item.id === 'money-save-service')
    assert.equal(pack?.version, '2.1.0')
    assert.equal(pack?.path, newPath)
    assert.doesNotThrow(() => readFileSync(join(root, 'data', oldPath), 'utf8'))
    assert.equal(pack?.contentHash, hashFile(newPath).slice(0, 16))
  })

  it('records 12 explicit semantic-review passes without sample-output ingestion', () => {
    const review = JSON.parse(readFileSync(join(root, 'tone-v2/corpus-review/money-save-2.1.0.json'), 'utf8')) as {
      status: string; sourcePath: string; sourceSha256: string; sampleOutputsIngested: boolean
      blocks: Array<{ id: string; status: string; checks: Record<string, boolean> }>
    }
    assert.equal(review.status, 'approved')
    assert.equal(review.sourcePath, `data/${newPath}`)
    assert.equal(review.sourceSha256, hashFile(newPath))
    assert.equal(review.sampleOutputsIngested, false)
    assert.deepEqual(review.blocks.map((item) => item.id), Array.from({ length: 12 }, (_, i) => `sav-${String(i + 1).padStart(3, '0')}`))
    assert.ok(review.blocks.every((block) => block.status === 'pass' && Object.values(block.checks).every(Boolean)))
  })

  it('enforces financial evidence and hypothetical-example boundaries in every block', () => {
    const pack = JSON.parse(readFileSync(join(root, 'data', newPath), 'utf8')) as {
      release: { sampleOutputsIngested: boolean }
      knowledgeBlocks: Array<{ condition: string; interpretation: string; real_world_pattern: string[]; advice: string; forbidden_generalization: string }>
    }
    const text = pack.knowledgeBlocks.map((block) => [block.condition, block.interpretation, ...block.real_world_pattern, block.advice, block.forbidden_generalization].join(' ')).join('\n')
    assert.equal(pack.release.sampleOutputsIngested, false)
    assert.equal(pack.knowledgeBlocks.length, 12)
    assert.ok(pack.knowledgeBlocks.every((block) => block.real_world_pattern.every((item) => item.startsWith('가상 사례:'))))
    assert.ok(pack.knowledgeBlocks.every((block) => /사용자|입력|계산된|마무리/.test(block.condition)))
    assert.ok(pack.knowledgeBlocks.every((block) => /않|금지/.test(block.forbidden_generalization)))
    assert.doesNotMatch(text, /\d+\s*(?:원|만원|%|퍼센트|일|주|개월|년|가지|개|칸)\b/)
    assert.doesNotMatch(text, /최저 달을 기준|입금 다음 날|분기당 하나|한 달치|두세 개|두 달 유지|세 칸/)
    assert.doesNotMatch(text, /부자가 된다|손해가 없다|회복이 빠르다|저절로 모인다/)
  })

  it('selects active corpus for new reports and stored corpus for old reports', () => {
    const analysis = analyzeSaju(birth)
    const active = retrieveRagChunks('돈 수입 주기 지출 저축 관리', analysis, 12, context)
    const old = retrieveRagChunks('돈 수입 주기 지출 저축 관리', analysis, 12, context, oldSnapshot())
    const activeText = active.map((item) => item.content).join('\n')
    const oldText = old.map((item) => item.content).join('\n')
    assert.ok(active.some((item) => item.domain === 'money_save_service'))
    assert.ok(old.some((item) => item.domain === 'money_save_service'))
    assert.match(activeText, new RegExp(newMarker))
    assert.doesNotMatch(activeText, new RegExp(oldMarker))
    assert.match(oldText, new RegExp(oldMarker))
    assert.doesNotMatch(oldText, new RegExp(newMarker))
  })

  it('fails closed on a stored money-save corpus hash mismatch', () => {
    const snapshot = oldSnapshot()
    snapshot.activePacks = snapshot.activePacks.map((pack) => pack.id === 'money-save-service' ? { ...pack, contentHash: '0000000000000000' } : pack)
    assert.throws(() => retrieveRagChunks('돈 수입 관리', analyzeSaju(birth), 12, context, snapshot), /Corpus snapshot hash mismatch: money-save-service/)
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
    const common = { analysis, birth, context, section, hook: '수입과 지출은 확인한 내역으로 판단해요.', interpretation: `${oldMarker}. 좋은 달 기준으로 생활비가 굳어 비수기에 무너진다.` }
    const copyIssue = '코퍼스 문장을 복사하지 말고 현재 질문과 근거에 맞는 새 문장으로 다시 쓰세요.'
    assert.ok(!reviewGeneratedSajuReportSection(common).issues.includes(copyIssue))
    assert.ok(reviewGeneratedSajuReportSection({ ...common, corpusSnapshot: oldSnapshot() }).issues.includes(copyIssue))
  })

  it('binds a truthful local candidate and registry-only rollback', () => {
    const manifest = JSON.parse(readFileSync(join(root, 'tone-v2/releases/money-save-2.1.0.json'), 'utf8')) as any
    assert.equal(manifest.state, 'candidate')
    assert.equal(manifest.deployed, false)
    assert.equal(manifest.serviceKey, 'money_save')
    assert.equal(manifest.generationEvidence, null)
    assert.deepEqual(manifest.corpus.candidate, { path: `data/${newPath}`, version: '2.1.0', sha256: hashFile(newPath) })
    assert.deepEqual(manifest.corpus.previous, { path: `data/${oldPath}`, version: '2.0.0', sha256: hashFile(oldPath) })
    assert.equal(manifest.attachment.newReportsOnly, true)
    assert.equal(manifest.attachment.storedSnapshotRequired, true)
    assert.equal(manifest.rollback.strategy, 'registry_only')
    assert.equal(manifest.rollback.customerRecordRewrite, false)
    assert.equal(manifest.verificationEvidence, 'tone-v2/evaluations/P05-money-save-corpus-rag-release-candidate-20260913.json')
    assert.ok(Object.values(manifest.gates).every((value) => value !== 'pending'))
  })
})
