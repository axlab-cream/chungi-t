import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import { buildCorpusIndex, detectIntent, retrieveRagChunks } from '../../src/rag/retriever.js'
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

    it('사주 + 질문 기반 RAG 검색', () => {
      const saju = analyzeSaju(sampleBirth)
      const chunks = retrieveRagChunks('올해 직업운과 재물운', saju, 3)
      assert.ok(chunks.length > 0)
      assert.ok(chunks.length <= 3)
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
