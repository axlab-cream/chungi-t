import { after, test } from 'node:test'
import assert from 'node:assert/strict'
import OpenAI from 'openai'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import { buildOpenAiReportHighlight } from '../../src/report/report-generator.js'
import { loadHighlightTopics } from '../../src/report/longform-blocks.js'
import type { BirthInput } from '../../src/types/index.js'

/**
 * 2026-09-18: 고양이 궁합 하이라이트 셋이 865~916자로 매번 최소 990자에 조금씩 못 미쳐 세 장 모두
 * 빈 채로 남았다. 화면에는 하이라이트가 통째로 사라졌다. 92% 길이의 멀쩡한 글을 버리고 아무것도
 * 보여 주지 않는 쪽이 더 나쁘다. 안전·구조에 걸리지 않으면 건지고, 남은 지적은 운영자에게만 남긴다.
 */
const birth: BirthInput = { year: 1994, month: 3, day: 11, hour: 9, gender: 'female', calendar: 'solar' }
const analysis = analyzeSaju(birth)
const context = { serviceKey: 'cat_compatibility', concern: '고양이: 모모 · 가정: 1묘 가정' }

const sdkCreate = OpenAI.Chat.Completions.prototype.create
const previousKey = process.env.OPENAI_API_KEY
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'sk-test-highlight-salvage'
after(() => {
  OpenAI.Chat.Completions.prototype.create = sdkCreate
  if (previousKey === undefined) delete process.env.OPENAI_API_KEY
  else process.env.OPENAI_API_KEY = previousKey
})

function replyWith(text: string) {
  return {
    id: 'r', model: 'gpt-5.5',
    choices: [{ message: { content: JSON.stringify({ text }) }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
  }
}

const paragraph = '밥그릇 앞에서 기다리는 시간이 길어지면 그 시각을 적어요. 집사님의 불 기운이 강한 날에는 손길보다 거리를 먼저 맞춰요. 예를 들어 숨숨집 앞에서 망설이면 그 자리를 비워 두고 지켜봐요.'
const shortBody = Array.from({ length: 4 }, () => paragraph).join('\n\n')
const unsafeBody = `${shortBody}\n\n이 흐름이면 올해 안에 무조건 병이 생깁니다. 100% 그렇습니다.`

test('분량만 모자란 초안은 버리지 않고 건진다', async () => {
  const topics = loadHighlightTopics('cat_compatibility')
  assert.ok(topics?.[0])
  assert.ok(shortBody.length < 990, `길이 전제가 깨졌다: ${shortBody.length}`)
  let calls = 0
  OpenAI.Chat.Completions.prototype.create = (async () => { calls += 1; return replyWith(shortBody) }) as unknown as typeof sdkCreate

  const built = await buildOpenAiReportHighlight(analysis, birth, context, topics[0])

  assert.equal(built.status, 'complete', '분량만 모자란데 버렸다')
  assert.equal(built.text, shortBody)
  assert.equal(built.reviewMode, 'lenient')
  assert.ok(built.reviewNotes?.some((note) => note.includes('분량 예산')), `분량 지적이 남아야 한다: ${JSON.stringify(built.reviewNotes)}`)
  assert.ok(calls >= 3, `끝까지 다시 써 본 뒤에 건져야 한다: ${calls}`)
})

test('안전에 걸리는 초안은 건지지 않는다', async () => {
  const topics = loadHighlightTopics('cat_compatibility')
  assert.ok(topics?.[0])
  OpenAI.Chat.Completions.prototype.create = (async () => replyWith(unsafeBody)) as unknown as typeof sdkCreate

  await assert.rejects(
    buildOpenAiReportHighlight(analysis, birth, context, topics[0]),
    (error: unknown) => error instanceof Error && /확정 예언|질병|병/.test(error.message),
  )
})
