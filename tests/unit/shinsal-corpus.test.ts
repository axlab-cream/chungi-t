import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { capShinsalChunks, keepAssignedShinsalChunks, retrieveRagChunks, SHINSAL_DOMAIN } from '../../src/rag/retriever.js'
import { buildTemplateSajuReport } from '../../src/report/report-generator.js'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import type { BirthInput, RagChunk, SajuReportContext } from '../../src/types/index.js'

/**
 * 신살 해석 자료(2026-10-15): 계산된 신살에만, 질문과 맞을 때만, 한 칸만 쓰인다.
 */
const root = process.cwd()
const pack = JSON.parse(readFileSync(join(root, 'data/tone-v2/corpus/shinsal-interpretation.json'), 'utf8')) as {
  knowledgeBlocks: Array<Record<string, unknown> & { id: string; keywords: string[]; real_world_pattern: string[]; forbidden_generalization: string }>
}
const FIELDS = ['id', 'topic', 'keywords', 'concept', 'condition', 'interpretation', 'real_world_pattern', 'risk', 'opportunity', 'advice', 'confidence', 'forbidden_generalization']
// 1987-06-10 21:00(서머타임) → 丁卯 丙午 庚寅 丙戌. 지살·천살·화개·홍염·망신이 무겁게 계산된다.
const PDF_BIRTH: BirthInput = { year: 1987, month: 6, day: 10, hour: 21, minute: 0, gender: 'female', calendar: 'solar' }
const heavyNames = (birth: BirthInput) => new Set(analyzeSaju(birth).manseryeok!.shinsal!.items
  .filter((item) => item.weight !== 'light' && item.voidEffect !== 'weakened')
  .map((item) => item.name.replace(/\(.*\)$/, '')))

describe('신살 해석 자료', () => {
  it('블록마다 12개 항목, 가상 사례 표시, 단정 금지 문장이 있다', () => {
    assert.equal(pack.knowledgeBlocks.length, 25)
    for (const block of pack.knowledgeBlocks) {
      assert.deepEqual(Object.keys(block).sort(), [...FIELDS].sort(), block.id)
      assert.ok(block.real_world_pattern.every((line) => line.startsWith('가상 사례:')), block.id)
      assert.match(block.forbidden_generalization, /(단정|예고|보장)하지 않는다/, block.id)
    }
  })

  it('검토 기록이 지금 자료 파일과 같은 내용을 가리킨다(사람 검토 전이라 candidate)', () => {
    const review = JSON.parse(readFileSync(join(root, 'tone-v2/corpus-review/shinsal-interpretation-1.0.0.json'), 'utf8'))
    const sha = createHash('sha256').update(readFileSync(join(root, 'data/tone-v2/corpus/shinsal-interpretation.json'))).digest('hex')
    assert.equal(review.sourceSha256, sha, '자료를 고쳤으면 검토 기록도 다시 만드세요')
    assert.equal(review.status, 'candidate')
    assert.deepEqual(review.blocks.map((b: { id: string }) => b.id), pack.knowledgeBlocks.map((b) => b.id))
  })

  it('계산되지 않은 신살(백호·고신·과숙 등) 블록은 없다: 블록 이름은 모두 엔진이 실제로 계산하는 이름이다', () => {
    assert.doesNotMatch(JSON.stringify(pack), /백호|고신살|과숙살|급각살/)
    const computed = new Set<string>()
    for (let i = 0; i < 600; i += 1) {
      const birth: BirthInput = { year: 1950 + (i % 60), month: 1 + (i * 7) % 12, day: 1 + (i * 11) % 28, hour: (i * 5) % 24, minute: 0, gender: i % 2 ? 'male' : 'female', calendar: 'solar' }
      for (const item of analyzeSaju(birth).manseryeok!.shinsal!.items) computed.add(item.name.replace(/\(.*\)$/, ''))
    }
    // 읽는 법(신살)과 공망은 신살 이름이 아니라 공통 규칙 블록이다.
    const missing = pack.knowledgeBlocks.map((block) => block.keywords[0]).filter((name) => !['신살', '공망'].includes(name) && !computed.has(name))
    assert.deepEqual(missing, [])
  })

  it('그 사람에게 무겁게 계산된 신살 블록만, 질문과 맞을 때 한 칸 들어간다', () => {
    const analysis = analyzeSaju(PDF_BIRTH)
    const names = heavyNames(PDF_BIRTH)
    const context: SajuReportContext = { serviceKey: 'job_choice', birthTimeKnown: true }
    const chunks = retrieveRagChunks('직장 이직 출발 이동 새 환경 시작', analysis, 12, context)
    const shinsal = chunks.filter((chunk) => chunk.domain === SHINSAL_DOMAIN)
    assert.equal(shinsal.length, 1)
    assert.ok(shinsal[0].keywords.some((keyword) => names.has(keyword)), '계산된 신살의 블록')
    // 계산되지 않은 신살(이 원국엔 역마가 없다)을 직접 물어도 그 블록은 나오지 않는다.
    assert.ok(!names.has('역마'))
    const asked = retrieveRagChunks('역마 이동 변화 활동', analysis, 12, context)
    assert.ok(!asked.some((chunk) => chunk.domain === SHINSAL_DOMAIN && chunk.keywords.includes('역마')))
  })

  it('연인 신호 서비스에는 신살 자료를 쓰지 않는다(도화·홍염으로 외도·성격을 판정하지 않는 규칙)', () => {
    const chunks = retrieveRagChunks('관계 신호 연애 도화 홍염 매력 끌림', analyzeSaju(PDF_BIRTH), 40, { serviceKey: 'couple_signal', birthTimeKnown: true })
    assert.ok(!chunks.some((chunk) => chunk.domain === SHINSAL_DOMAIN))
  })

  it('여러 장 리포트: 같은 블록은 한 번, 모두 합쳐 두 장까지만', () => {
    const block = (id: string): RagChunk => ({ id, topic: id, keywords: [], content: '', domain: SHINSAL_DOMAIN })
    const other = (id: string): RagChunk => ({ id, topic: id, keywords: [], content: '', domain: 'deep_saju_interpretation' })
    const used = new Set<string>()
    assert.deepEqual(capShinsalChunks([block('s1'), other('a'), other('b')], used, 2).map((c) => c.id), ['s1', 'a'])
    assert.deepEqual(capShinsalChunks([block('s1'), other('a'), other('b')], used, 2).map((c) => c.id), ['a', 'b'], '같은 블록 두 번째는 뺀다')
    assert.deepEqual(capShinsalChunks([block('s2'), other('a')], used, 2).map((c) => c.id), ['s2', 'a'])
    assert.deepEqual(capShinsalChunks([block('s3'), other('a')], used, 2).map((c) => c.id), ['a'], '세 번째 장부터는 뺀다')
    assert.deepEqual(keepAssignedShinsalChunks([block('s1'), block('s2'), other('a')], ['s2'], 2).map((c) => c.id), ['s2', 'a'])
  })

  it('이직 리포트에서 같은 신살 블록이 모든 장을 차지하지 않는다', () => {
    const analysis = analyzeSaju(PDF_BIRTH)
    const sections = buildTemplateSajuReport(analysis, PDF_BIRTH, { serviceKey: 'work_move', birthTimeKnown: true }).sections
    const shinsalTopics = new Set(pack.knowledgeBlocks.map((block) => String(block.topic)))
    const withShinsal = sections.filter((section) => section.ragTopics.some((topic) => shinsalTopics.has(topic)))
    assert.ok(withShinsal.length <= 2, `신살 블록이 든 장 ${withShinsal.length}개`)
  })
})

describe('고객 글의 신살 이름 규칙(2026-10-15)', () => {
  it('많이 알려진 이름만, 한 문장에 하나, 한 항목에 세 개까지', async () => {
    const { reviewShinsalNameUse } = await import('../../src/report/report-generator.js')
    assert.deepEqual(reviewShinsalNameUse('홍염(감정을 드러내는 매력)이 있어서, 솔직하게 드러낼 때 매력이 살아나요. 화개(혼자 깊이 몰입하는 기운)도 있어요.'), [])
    assert.ok(reviewShinsalNameUse('월덕귀인이 있어서 도움을 받아요.').some((issue) => issue.includes('잘 알려지지 않은 신살 이름(월덕귀인)')))
    assert.ok(reviewShinsalNameUse('홍염과 도화가 함께 있어요.').includes('한 문장에는 신살 이름을 하나만 쓰세요.'))
    assert.ok(reviewShinsalNameUse('도화가 있어요. 역마도 있어요. 화개도 있어요. 홍염도 있어요.').some((issue) => issue.includes('3개까지만')))
    // 일상어(망신을 당하다, 장성한 자녀)는 신살 이름으로 보지 않는다.
    assert.deepEqual(reviewShinsalNameUse('망신을 당할까 걱정했고 장성한 자녀가 있어요.'), [])
  })

  it('AI가 짧은 뜻을 빠뜨려도 처음 나오는 많이 알려진 이름에는 뜻이 붙는다', async () => {
    const { explainFirstTerms } = await import('../../src/report/copy-guide.js')
    assert.equal(explainFirstTerms('홍염이 있어서 솔직할 때 매력이 살아나요.'), '홍염(감정을 드러내는 매력)이 있어서 솔직할 때 매력이 살아나요.')
    assert.equal(explainFirstTerms('홍염(감정을 드러내는 매력)이 있어요.'), '홍염(감정을 드러내는 매력)이 있어요.', '이미 붙어 있으면 그대로')
  })
})
