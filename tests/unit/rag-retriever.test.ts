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
      assert.ok(corpus.length >= 5)
      assert.ok(corpus[0].content.length > 0)
    })

    it('직업 질문 → career intent', () => {
      assert.equal(detectIntent('이직을 고민 중인데 직업운이 어떤가요?'), 'career')
    })

    it('사주 + 질문 기반 RAG 검색', () => {
      const saju = analyzeSaju(sampleBirth)
      const chunks = retrieveRagChunks('올해 직업운과 재물운', saju, 3)
      assert.ok(chunks.length > 0)
      assert.ok(chunks.length <= 3)
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
