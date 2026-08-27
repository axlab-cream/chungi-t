import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { prepareConversation } from '../../src/conversation/engine.js'
import type { BirthInput } from '../../src/types/index.js'

const sampleBirth: BirthInput = {
  year: 1992,
  month: 8,
  day: 8,
  hour: 18,
  gender: 'female',
  calendar: 'solar',
}

describe('[TASK] 대화 엔진 테스트 하네스', () => {
  describe('정상 동작', () => {
    it('개인 사주 + RAG + 시스템 프롬프트 조합', () => {
      const result = prepareConversation({
        birth: sampleBirth,
        message: '올해 연애운이 궁금해요',
      })

      assert.ok(result.messages.length >= 2)
      assert.ok(result.messages[0].role === 'system')
      assert.ok(result.messages[0].content.includes('<personal_saju>'))
      assert.ok(result.messages[0].content.includes('<rag_knowledge>'))
      assert.ok(result.messages[0].content.includes('천명대공(天命大公)'))
      assert.ok(result.messages[0].content.includes('사주의 결부터 하나씩 풀어드리겠습니다'))
      assert.equal(result.intent, 'love')
      assert.ok(result.sajuAnalysis.dayMaster)
    })

    it('대화 히스토리 포함', () => {
      const result = prepareConversation({
        birth: sampleBirth,
        message: '그럼 직업은요?',
        history: [
          { role: 'user', content: '연애운 알려주세요' },
          { role: 'assistant', content: '일지를 보면 따뜻한 인연이...' },
        ],
      })

      assert.ok(result.messages.some((m) => m.role === 'assistant'))
      assert.equal(result.messages.at(-1)?.content, '그럼 직업은요?')
    })
  })

  describe('경계 조건', () => {
    it('빈 히스토리 처리', () => {
      const result = prepareConversation({
        birth: sampleBirth,
        message: '요즘 고민이 많아요',
      })
      assert.equal(result.intent, 'general')
    })
  })

  describe('에러 처리', () => {
    it('retrievedChunks는 비어있지 않음', () => {
      const result = prepareConversation({
        birth: sampleBirth,
        message: '건강이 걱정돼요',
      })
      assert.ok(result.retrievedChunks.length > 0)
    })
  })
})
