import { after, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import OpenAI from 'openai'
import { randomUUID } from 'node:crypto'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import { OpenAiTruncatedError } from '../../src/llm/openai-adapter.js'
import { generateReportSectionNow } from '../../src/report/report-queue.js'
import { createOrGetReportRecord, mutateReportRecord } from '../../src/report/report-store.js'
import { loadHighlightTopics } from '../../src/report/longform-blocks.js'
import type { BirthInput, SajuReport, SajuReportSection } from '../../src/types/index.js'

/**
 * 2026-09-17: 빈 응답(rawChars 0, finish_reason 이 'length' 도 'content_filter' 도 아님)이
 * 일반 Error 로 던져져 재시도 대상에서 빠졌다. love_mind 의 한 항목이 사흘 동안 10분
 * 간격의 외부 재시도(cron backfill)만 반복하며 결국 dead-letter 로 빠졌다 — 실제로는
 * gpt-5 계열이 추론 토큰으로 예산을 다 쓰고 finish_reason='stop' 인 채 본문을 못 낸
 * 경우였다. OpenAiTruncatedError 로 던지면 같은 실행 안에서(초 단위로) 재시도되고,
 * 예산도 한 단계씩 키워 같은 이유로 또 비지 않게 한다.
 */
const birth: BirthInput = { year: 1994, month: 3, day: 11, hour: 9, gender: 'female', calendar: 'solar' }
const analysis = analyzeSaju(birth)
const context = { serviceKey: 'love_this_year', name: '빈 응답 점검', concern: '특별한 문제 없이 잘 지내고 있습니다.' }
const owner = { id: 'empty-response-retry-test-owner' }
const section = (id: string): SajuReportSection => ({ id, order: 1, imageKey: '', imageSrc: '', imageAlt: '', category: '관계', categoryEn: 'Love', classification: '현재 관계를 유지할 기준', hook: '', interpretation: '', patternKeys: [], ragTopics: [] })
const template = (ids: string[]): SajuReport => ({ title: '테스트', subtitle: '', model: 'template', generatedBy: 'template', sections: ids.map(section) })
// 검수(reviewGeneratedSajuReportSection)를 실제로 통과하는 문장. 직접 답·근거·장면·다음 기준을 갖춘다.
const passingReading = '현재 입력에서 관계를 바꿀 이유는 확인되지 않아요. 특별한 문제 없이 지낸다고 적었으니 숨은 갈등을 전제하지 않아요.\n\n예를 들어 약속 간격이 달라도 서로 불편하지 않다면 연락 횟수를 늘릴 이유가 없어요. 지금 그런 약속을 지키고 있다는 뜻은 아니에요.\n\n먼저 현재 방식에서 편한 점을 확인해 보세요. 새로운 걱정을 만들기보다 실제 불편이 생겼을 때 그 장면부터 이야기해요.'

// 2026-09-18: 항목 생성 앞에 총평·요약·하이라이트 호출이 붙었다. 이 검사는 항목 호출만 세므로 그 셋은 미리 채워 둔다.
async function seedLongformBlocks(reportId: string) {
  const topics = loadHighlightTopics(context.serviceKey)
  await mutateReportRecord(reportId, owner, (draft) => {
    draft.report.verdict = { statement: '지금 방식을 유지해도 괜찮아요.', decidedAt: new Date().toISOString() }
    draft.report.summary = { text: '요약', status: 'complete' }
    if (topics) draft.report.highlights = topics.map((topic) => ({ title: topic.title, text: '하이라이트', status: 'complete' }))
  })
}

const sdkCreate = OpenAI.Chat.Completions.prototype.create
const previousKey = process.env.OPENAI_API_KEY
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'sk-test-empty-response'
after(() => { OpenAI.Chat.Completions.prototype.create = sdkCreate; if (previousKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = previousKey })

function emptyContentResponse(requestedMaxTokens: number) {
  return {
    id: 'resp', model: 'gpt-5.5',
    choices: [{ message: { content: '' }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 500, completion_tokens: requestedMaxTokens, total_tokens: 500 + requestedMaxTokens },
  }
}

describe('빈 응답은 잘림과 같은 경로로 즉시 재시도된다', { concurrency: false }, () => {
  it('OpenAI 가 빈 문자열 + finish_reason stop 을 돌려주면 OpenAiTruncatedError 를 던진다', async () => {
    OpenAI.Chat.Completions.prototype.create = (async (request: { max_completion_tokens?: number }) => emptyContentResponse(request.max_completion_tokens ?? 0)) as unknown as typeof sdkCreate
    const { chatWithOpenAI } = await import('../../src/llm/openai-adapter.js')
    await assert.rejects(
      chatWithOpenAI([{ role: 'user', content: '점검' }], { model: 'gpt-5.5', maxTokens: 9000 }),
      (error: unknown) => error instanceof OpenAiTruncatedError,
    )
  })

  it('실제 생성 경로: 빈 응답이 이어져도 같은 실행 안에서 계속 재시도하고, 예산을 단계적으로 키운다', async () => {
    const reportId = randomUUID()
    await createOrGetReportRecord({ reportId, birth, context, analysis, templateReport: template(['one']), owner })
    await seedLongformBlocks(reportId)
    const seenBudgets: number[] = []
    let calls = 0
    OpenAI.Chat.Completions.prototype.create = (async (request: { max_completion_tokens?: number }) => {
      calls += 1
      seenBudgets.push(request.max_completion_tokens ?? 0)
      // 마지막 시도(SECTION_ATTEMPT_LIMIT 번째)에만 정상 응답을 준다.
      if (calls < 4) return emptyContentResponse(request.max_completion_tokens ?? 0)
      return {
        id: 'resp', model: 'gpt-5.5',
        choices: [{ message: { content: JSON.stringify({ id: 'one', hook: '지금 방식을 유지해도 괜찮아요.', interpretation: passingReading }) }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 500, completion_tokens: 400, total_tokens: 900 },
      }
    }) as unknown as typeof sdkCreate

    const result = await generateReportSectionNow({ reportId, birth, analysis, context, sectionId: 'one', owner })

    assert.equal(calls, 4, '한 실행 안에서 SECTION_ATTEMPT_LIMIT 만큼 곧바로 재시도해야 한다 — 외부(cron) 재시도를 기다리면 안 된다')
    assert.equal(result.status, 'complete')
    // 예산이 실패할 때마다 늘어야 같은 이유로 또 비는 것을 줄인다(상한 18,000토큰 도달 후엔 유지).
    for (let i = 1; i < seenBudgets.length; i += 1) assert.ok(seenBudgets[i] >= seenBudgets[i - 1], `budgets ${seenBudgets.join(',')}`)
    assert.ok(seenBudgets[1] > seenBudgets[0], `첫 실패 뒤에는 예산이 늘어야 한다: ${seenBudgets.join(',')}`)
    assert.ok(seenBudgets.every((value) => value <= 18_000), `budgets ${seenBudgets.join(',')}`)
    // 실패로 남은 시도 기록에 '해석 생성 또는 저장이 완료되지 않았습니다' 같은 뭉뚱그린 사유가 아니라
    // 길이 제한 사유가 남아야 다음에 볼 사람이 원인을 구분할 수 있다.
    assert.ok(result.attempts?.some((attempt) => attempt.status === 'failed' && attempt.error?.includes('길이 제한')))
  })
})
