import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import { buildCorpusIndex, detectIntent, formatRagForPrompt, retrieveRagChunks } from '../../src/rag/retriever.js'
import { getActiveCorpusPacks, getChunkCorpusFiles, getCorpusDomainBoost } from '../../src/rag/corpus-registry.js'
import type { BirthInput } from '../../src/types/index.js'

const sampleBirth: BirthInput = {
  year: 1985,
  month: 3,
  day: 20,
  hour: 9,
  gender: 'male',
  calendar: 'solar',
}

describe('[TASK] RAG 검색 테스트 하네스', () => {
  describe('정상 동작', () => {
    it('코퍼스 인덱스 로드', () => {
      const corpus = buildCorpusIndex()
      assert.ok(corpus.length >= 90)
      assert.ok(corpus[0].content.length > 0)
    })

    it('코퍼스 registry가 활성 pack과 검색 가중치를 관리', () => {
      const packs = getActiveCorpusPacks()
      assert.ok(packs.some((pack) => pack.id === 'saju-95-quality-bundles'))
      assert.ok(packs.some((pack) => pack.id === 'saju-advanced-manseryeok-gbr'))
      assert.ok(packs.some((pack) => pack.id === 'paid-report-scene-corpus'))
      assert.ok(getChunkCorpusFiles().includes('corpus/saju-95-quality-bundles.json'))
      assert.ok(getChunkCorpusFiles().includes('corpus/saju-advanced-manseryeok-gbr.json'))
      assert.ok(getChunkCorpusFiles().includes('corpus/paid-report-scene-corpus.json'))
      assert.ok(getCorpusDomainBoost('saju_95_quality_bundles') >= 10)
      assert.ok(getCorpusDomainBoost('saju_advanced_manseryeok_gbr') >= 10)
      assert.ok(getCorpusDomainBoost('paid_report_scene_corpus') >= 15)
    })

    it('장문 리포트용 deep corpus도 인덱스에 포함', () => {
      const corpus = buildCorpusIndex()
      assert.ok(corpus.some((chunk) => chunk.id === 'ds-001'))
      assert.ok(corpus.some((chunk) => chunk.domain === 'deep_saju_interpretation'))
    })

    it('입력 선택지 맥락 corpus도 인덱스에 포함', () => {
      const corpus = buildCorpusIndex()
      assert.ok(corpus.some((chunk) => chunk.id === 'ic-001'))
      assert.ok(corpus.some((chunk) => chunk.domain === 'input_context_interpretation'))
    })

    it('95점 항목별 해석 번들이 모두 인덱스에 포함', () => {
      const corpus = buildCorpusIndex()
      const bundleIds = Array.from({ length: 16 }, (_, index) => `q95-${String(index + 1).padStart(3, '0')}`)

      for (const id of bundleIds) {
        assert.ok(corpus.some((chunk) => chunk.id === id), `${id} missing`)
      }
      assert.ok(corpus.some((chunk) => chunk.domain === 'saju_95_quality_bundles'))
      assert.ok(corpus.filter((chunk) => chunk.id.startsWith('q95-')).every((chunk) => chunk.knowledge))
    })

    it('고급 만세력/GBR 보강 pack도 인덱스에 포함', () => {
      const corpus = buildCorpusIndex()
      for (const id of ['adv-001', 'adv-002', 'adv-003', 'adv-004', 'adv-005', 'adv-006']) {
        assert.ok(corpus.some((chunk) => chunk.id === id), `${id} missing`)
      }
      assert.ok(corpus.some((chunk) => chunk.domain === 'saju_advanced_manseryeok_gbr'))
    })

    it('유료 리포트 장면성 보강 pack도 인덱스에 포함', () => {
      const corpus = buildCorpusIndex()
      for (const id of ['ps-001', 'ps-002', 'ps-003', 'ps-004', 'ps-005', 'ps-006', 'ps-007', 'ps-008']) {
        assert.ok(corpus.some((chunk) => chunk.id === id), `${id} missing`)
      }
      assert.ok(corpus.some((chunk) => chunk.domain === 'paid_report_scene_corpus'))
      assert.ok(corpus.filter((chunk) => chunk.id.startsWith('ps-')).every((chunk) => chunk.knowledge))
    })

    it('올해 연애운 상품 corpus도 지식 블록으로 인덱스에 포함', () => {
      const corpus = buildCorpusIndex()
      for (const id of ['lty-001', 'lty-003', 'lty-008', 'lty-010']) {
        assert.ok(corpus.some((chunk) => chunk.id === id && chunk.knowledge), `${id} missing`)
      }
    })

    it('RAG 프롬프트는 완성 답변이 아니라 내부 판단 블록으로 포맷', () => {
      const saju = analyzeSaju(sampleBirth)
      const chunks = retrieveRagChunks('재물운 돈구멍 정재 편재를 봐줘', saju, 5)
      const prompt = formatRagForPrompt(chunks)

      assert.ok(prompt.includes('mode="internal_knowledge_blocks"'))
      assert.ok(prompt.includes('copy_policy:'))
      assert.ok(prompt.includes('concept:'))
      assert.ok(prompt.includes('forbidden_generalization:'))
      assert.ok(!prompt.includes('정재는 반복 수입과 관리'))
      assert.ok(!prompt.includes('편재는 기회, 시장성'))
    })

    it('직업 질문 → career intent', () => {
      assert.equal(detectIntent('이직을 고민 중인데 직업운이 어떤가요?'), 'career')
    })

    it('직장고민 표현 → career intent', () => {
      assert.equal(detectIntent('직장고민이 있어요. 계속 버틸지 옮길지 모르겠어요.'), 'career')
    })

    it('일간 질문은 career로 오분류하지 않음', () => {
      assert.equal(detectIntent('일간 강약과 기본 기질이 궁금해요'), 'personality')
    })

    it('재물 질문 → wealth intent', () => {
      assert.equal(detectIntent('돈구멍과 재물운이 궁금해요'), 'wealth')
    })

    it('유료 리포트 장면 질문 → 장면성 코퍼스를 우선 회수', () => {
      const saju = analyzeSaju(sampleBirth)
      const chunks = retrieveRagChunks('돈을 내고 읽었다고 느끼는 개인 장면과 서사 밀도를 보강해줘', saju, 9, {
        target: '본인',
        relationship: '솔로예요',
        orientation: '이성 관계 중심',
        work: '직장 다녀요',
        concern: '직장 고민',
      })

      assert.ok(chunks.some((chunk) => chunk.id.startsWith('ps-')), chunks.map((chunk) => chunk.id).join(', '))
    })

    it('사주 + 질문 기반 RAG 검색', () => {
      const saju = analyzeSaju(sampleBirth)
      const chunks = retrieveRagChunks('올해 직업운과 재물운', saju, 3)
      assert.ok(chunks.length > 0)
      assert.ok(chunks.length <= 3)
    })

    it('GBR 재랭킹 → 격국·조후·통관 질문에서 고급 청크를 회수', () => {
      const saju = analyzeSaju(sampleBirth)
      const chunks = retrieveRagChunks('용신을 격국 조후 통관까지 연결해서 봐줘', saju, 6)
      const ids = chunks.map((chunk) => chunk.id)

      assert.ok(ids.includes('adv-002') || ids.includes('adv-003') || ids.includes('adv-004'))
    })

    it('GBR 재랭킹 → 23시 자시 질문에서 자시 옵션 청크를 회수', () => {
      const saju = analyzeSaju({ ...sampleBirth, hour: 23 })
      const chunks = retrieveRagChunks('23시 자시 야자시 조자시 일주 변경 기준이 궁금해요', saju, 5)

      assert.ok(chunks.some((chunk) => chunk.id === 'adv-001'))
    })

    it('대상 선택 본인 context → 본인 사주 청크 우선 검색', () => {
      const saju = analyzeSaju(sampleBirth)
      const chunks = retrieveRagChunks('현재 고민을 보고 싶어요', saju, 5, {
        target: '본인',
        relationship: '솔로예요',
        orientation: '이성 관계 중심',
        work: '직장 다녀요',
        concern: '직장 고민',
      })
      assert.ok(chunks.some((chunk) => chunk.id === 'ic-001'))
      assert.ok(chunks.some((chunk) => chunk.id === 'ic-015' || chunk.id === 'ds-054'))
    })

    it('동성 관계 중심 context → 동성 관계 청크 검색', () => {
      const saju = analyzeSaju(sampleBirth)
      const chunks = retrieveRagChunks('관계운을 봐주세요', saju, 5, {
        target: '친구',
        orientation: '동성 관계 중심',
        relationship: '마음에 둔 사람이 있어요',
        work: '프리랜서예요',
      })
      assert.ok(chunks.some((chunk) => chunk.id === 'ic-007'))
      assert.ok(chunks.some((chunk) => chunk.id === 'ic-004' || chunk.id === 'ic-009'))
    })

    it('감사표 15개 항목 질문 → 95점 번들 청크 검색', () => {
      const saju = analyzeSaju(sampleBirth)
      const cases = [
        ['일간 강약 기질을 자세히 봐줘', 'q95-001'],
        ['오행 균형과 부족한 오행 보완', 'q95-002'],
        ['십신 관계성을 위치별로 설명해줘', 'q95-003'],
        ['용신 희신 기신과 조후 통관을 봐줘', 'q95-004'],
        ['성격 기질 리포트를 길게 써줘', 'q95-005'],
        ['현재 고민과 선택지를 사주에 연결해줘', 'q95-006'],
        ['대운 세운 흐름을 봐줘', 'q95-007'],
        ['인생 전환 시기와 변곡점', 'q95-008'],
        ['재물운 돈구멍 정재 편재를 봐줘', 'q95-009'],
        ['일 직업 흐름과 이직 퇴사 고민', 'q95-010'],
        ['연애운과 배우자궁 도화를 봐줘', 'q95-011'],
        ['인연 운명의 상대 좋은 사람 기준', 'q95-012'],
        ['관계 반복 패턴과 거리감을 봐줘', 'q95-013'],
        ['시기와 장소 인연 장소 전환 장소', 'q95-014'],
        ['5만 자 장문 리포트 목차와 섹션', 'q95-015'],
        ['주의해야 할 것 위험한 것 미래 걱정을 미리 알아내는 것', 'q95-016'],
      ] as const

      for (const [query, expectedId] of cases) {
        const chunks = retrieveRagChunks(query, saju, 5)
        assert.ok(chunks.some((chunk) => chunk.id === expectedId), `${expectedId} not found for ${query}`)
      }
    })
  })

  describe('경계 조건', () => {
    it('일반 질문 → general intent', () => {
      assert.equal(detectIntent('안녕하세요'), 'general')
    })

    it('매칭 없어도 기본 청크 반환', () => {
      const saju = analyzeSaju(sampleBirth)
      const chunks = retrieveRagChunks('xyzabc', saju, 2)
      assert.ok(chunks.length > 0)
    })
  })

  describe('에러 처리', () => {
    it('연애 키워드 → love intent', () => {
      assert.equal(detectIntent('연애가 잘 안 돼요'), 'love')
    })
  })
})
