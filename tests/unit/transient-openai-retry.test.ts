import { after, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import OpenAI, { AuthenticationError, RateLimitError } from 'openai'
import { randomUUID } from 'node:crypto'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import { isOpenAiKeyRejected, isOpenAiQuotaExhausted, isTransientOpenAiFailure } from '../../src/llm/openai-adapter.js'
import { OPENAI_KEY_REJECTED_MESSAGE, countGenuineFailures, generateReportSectionNow, sectionHitProviderOutage } from '../../src/report/report-queue.js'
import { createOrGetReportRecord, mutateReportRecord } from '../../src/report/report-store.js'
import { loadHighlightTopics } from '../../src/report/longform-blocks.js'
import type { BirthInput, SajuReport, SajuReportSection } from '../../src/types/index.js'

/**
 * 2026-09-17: 워커 3차선 x 리포트 안 6병렬로 늘린 뒤 한 실행에서 최대 18개 동시 호출이
 * 나갈 수 있게 됐는데, OpenAI 가 429(RateLimitError)·5xx·연결 끊김으로 요청 자체를
 * 거절하는 경우가 일반 Error 로 던져져 재시도 대상에서 빠져 있었다. love_mind 의 항목이
 * 9e92c75(빈 응답 재시도) 배포 이후에도 여전히 옛 진단 문구로 멈춘 채 발견된 원인이
 * 바로 이것이다. isTransientOpenAiFailure 로 골라내 같은 실행 안에서(짧은 backoff 뒤)
 * 재시도한다.
 */
const birth: BirthInput = { year: 1994, month: 3, day: 11, hour: 9, gender: 'female', calendar: 'solar' }
const analysis = analyzeSaju(birth)
const context = { serviceKey: 'love_this_year', name: '일시적 거절 점검', concern: '특별한 문제 없이 잘 지내고 있습니다.' }
const owner = { id: 'transient-openai-retry-test-owner' }
const section = (id: string): SajuReportSection => ({ id, order: 1, imageKey: '', imageSrc: '', imageAlt: '', category: '관계', categoryEn: 'Love', classification: '현재 관계를 유지할 기준', hook: '', interpretation: '', patternKeys: [], ragTopics: [] })
const template = (ids: string[]): SajuReport => ({ title: '테스트', subtitle: '', model: 'template', generatedBy: 'template', sections: ids.map(section) })
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
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'sk-test-transient-openai'
after(() => { OpenAI.Chat.Completions.prototype.create = sdkCreate; if (previousKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = previousKey })

function rateLimitError() {
  return new RateLimitError(429, { message: '요청이 너무 많습니다.' }, '429 Too Many Requests', {})
}

describe('429·5xx 로 요청 자체가 거절되면 같은 실행 안에서 재시도한다', { concurrency: false }, () => {
  it('isTransientOpenAiFailure 는 429/5xx/연결 끊김만 골라내고 검수 오류는 지나친다', () => {
    assert.equal(isTransientOpenAiFailure(rateLimitError()), true)
    assert.equal(isTransientOpenAiFailure(new Error('일반 오류')), false)
    assert.equal(isTransientOpenAiFailure(undefined), false)
  })

  it('폐기된 키의 401 은 공급자 사정으로 남기고, 같은 실행 안에서 다시 보내지 않고, 리포트 상한에 세지 않는다', async () => {
    // 2026-09-18: 키 교체 뒤 프로덕션이 옛 키를 들고 있어 "401 Your API key has been invalidated" 가
    // 모든 항목에 찍혔다. 일반 실패로 세어져 1분마다 재시도하고 리포트 상한(12회)을 갉아먹었다.
    const revoked = new AuthenticationError(401, { message: 'Your API key has been invalidated.' }, '401 Your API key has been invalidated.', {})
    assert.equal(isOpenAiKeyRejected(revoked), true)
    assert.equal(isTransientOpenAiFailure(revoked), false)
    assert.equal(isOpenAiKeyRejected(rateLimitError()), false)

    const reportId = randomUUID()
    await createOrGetReportRecord({ reportId, birth, context, analysis, templateReport: template(['one']), owner })
    await seedLongformBlocks(reportId)
    let calls = 0
    OpenAI.Chat.Completions.prototype.create = (async () => { calls += 1; throw revoked }) as unknown as typeof sdkCreate
    const result = await generateReportSectionNow({ reportId, birth, analysis, context, sectionId: 'one', owner })
    assert.equal(calls, 1, '키 거절인데 같은 실행 안에서 다시 보냈다')
    assert.equal(result.status, 'failed')
    assert.equal(result.attempts?.at(-1)?.error, OPENAI_KEY_REJECTED_MESSAGE)
    assert.equal(sectionHitProviderOutage(result), 'key')
    assert.equal(countGenuineFailures(result), 0, '키 거절은 리포트를 포기할 근거가 아니다')
  })

  it('잔액 소진 429 는 일시 장애가 아니다 — 같은 실행 안에서 다시 보내지 않는다', async () => {
    // 2026-09-18: 고양이 궁합 20항목 80시도가 전부 "You have no credits remaining" 이었다.
    // 초 단위 재시도는 헛호출만 늘린다. 즉시 실패로 남기고 큐의 긴 백오프로 물러난다.
    const quota = new RateLimitError(429, { message: 'You have no credits remaining.', code: 'insufficient_quota' }, '429 You have no credits remaining. Add credits to continue using the API.', {})
    assert.equal(isOpenAiQuotaExhausted(quota), true)
    assert.equal(isTransientOpenAiFailure(quota), false)
    assert.equal(isOpenAiQuotaExhausted(rateLimitError()), false, '분당 한도는 잔액 소진이 아니다')

    const reportId = randomUUID()
    await createOrGetReportRecord({ reportId, birth, context, analysis, templateReport: template(['one']), owner })
    await seedLongformBlocks(reportId)
    let calls = 0
    OpenAI.Chat.Completions.prototype.create = (async () => { calls += 1; throw quota }) as unknown as typeof sdkCreate
    const result = await generateReportSectionNow({ reportId, birth, analysis, context, sectionId: 'one', owner })
    assert.equal(calls, 1, '잔액 소진인데 같은 실행 안에서 다시 보냈다')
    assert.equal(result.status, 'failed')
    assert.ok(result.attempts?.some((attempt) => attempt.error?.includes('잔액이 소진')), `진단에 잔액 소진이 없다: ${result.attempts?.map((a) => a.error).join(' | ')}`)
  })

  it('실제 생성 경로: 429 가 두 번 이어져도 같은 실행 안에서 재시도해 완료한다', async () => {
    const reportId = randomUUID()
    await createOrGetReportRecord({ reportId, birth, context, analysis, templateReport: template(['one']), owner })
    await seedLongformBlocks(reportId)
    let calls = 0
    OpenAI.Chat.Completions.prototype.create = (async () => {
      calls += 1
      if (calls < 3) throw rateLimitError()
      return {
        id: 'resp', model: 'gpt-5.5',
        choices: [{ message: { content: JSON.stringify({ id: 'one', hook: '지금 방식을 유지해도 괜찮아요.', interpretation: passingReading }) }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 500, completion_tokens: 400, total_tokens: 900 },
      }
    }) as unknown as typeof sdkCreate

    const result = await generateReportSectionNow({ reportId, birth, analysis, context, sectionId: 'one', owner })

    assert.equal(calls, 3, '429 가 걸린 시도까지 포함해 같은 실행 안에서 곧바로 재시도해야 한다')
    assert.equal(result.status, 'complete')
    assert.ok(result.attempts?.some((attempt) => attempt.status === 'failed' && attempt.error?.includes('일시적으로 거절')),
      '실패 기록에 트래픽 문제였다는 진단이 남아야 다음에 볼 사람이 콘텐츠 문제와 구분할 수 있다')
  })
})
