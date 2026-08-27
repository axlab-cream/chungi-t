import { prepareConversation } from '../index.js'
import sample from '../../tests/fixtures/sample-saju.json' with { type: 'json' }
import type { BirthInput } from '../types/index.js'

const birth: BirthInput = {
  ...sample.birth,
  gender: sample.birth.gender as BirthInput['gender'],
  calendar: sample.birth.calendar as BirthInput['calendar'],
}

const result = prepareConversation({
  birth,
  message: sample.sampleQuestions[0],
})

console.log('=== 남부대공 대화 엔진 데모 ===\n')
console.log('【사주 분석】')
console.log(result.sajuAnalysis.summary)
console.log('\n【검색된 RAG】')
for (const chunk of result.retrievedChunks) {
  console.log(`- ${chunk.topic}`)
}
console.log('\n【LLM 메시지 구조】')
for (const msg of result.messages) {
  const preview = msg.content.slice(0, 120).replace(/\n/g, ' ')
  console.log(`[${msg.role}] ${preview}...`)
}
console.log('\n→ 위 messages를 LLM API에 전달하면 개인 사주 기반 답변이 생성됩니다.')
