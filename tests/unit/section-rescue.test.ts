import { after, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import OpenAI from 'openai'
import { randomUUID } from 'node:crypto'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import { FAILED_RETRY_COOLDOWN_MS, SECTION_ATTEMPT_LIMIT, generateReportSectionNow } from '../../src/report/report-queue.js'
import { createOrGetReportRecord, getReportRecord, mutateReportRecord, toClientReport } from '../../src/report/report-store.js'
import { loadHighlightTopics } from '../../src/report/longform-blocks.js'
import { isSafetyIssue } from '../../src/report/tone-v2-review.js'
import type { BirthInput, SajuReport, SajuReportSection } from '../../src/types/index.js'

/**
 * 2026-09-18: 직장 선택 '지금 들어가도 되는 흐름' 항목이 1차 네 번을 매번 다른 지적(장면 →
 * 한자 설명 → 숫자)에 걸려 실패로 남았다. 큐가 되살려 또 네 번 새로 써도 같았다. 고객은
 * "미완성"만 봤다. 1차 미완성은 2차(편집 재생성)·3차(안전 검수 채택)로 끝을 내야 한다.
 */
const birth: BirthInput = { year: 1994, month: 3, day: 11, hour: 9, gender: 'female', calendar: 'solar' }
const analysis = analyzeSaju(birth)
const context = { serviceKey: 'love_this_year', name: '재검증 점검', concern: '특별한 문제 없이 잘 지내고 있습니다.' }
const owner = { id: 'section-rescue-test-owner' }
const section = (id: string): SajuReportSection => ({ id, order: 1, imageKey: '', imageSrc: '', imageAlt: '', category: '관계', categoryEn: 'Love', classification: '현재 관계를 유지할 기준', hook: '', interpretation: '', patternKeys: [], ragTopics: [] })
const template = (ids: string[]): SajuReport => ({ title: '테스트', subtitle: '', model: 'template', generatedBy: 'template', sections: ids.map(section) })
const hook = '지금 방식을 유지해도 괜찮아요.'
// 1차 엄격 검수를 실제로 통과하는 문장(empty-response-retry 와 같은 것).
const passingReading = '현재 입력에서 관계를 바꿀 이유는 확인되지 않아요. 특별한 문제 없이 지낸다고 적었으니 숨은 갈등을 전제하지 않아요.\n\n예를 들어 약속 간격이 달라도 서로 불편하지 않다면 연락 횟수를 늘릴 이유가 없어요. 지금 그런 약속을 지키고 있다는 뜻은 아니에요.\n\n먼저 현재 방식에서 편한 점을 확인해 보세요. 새로운 걱정을 만들기보다 실제 불편이 생겼을 때 그 장면부터 이야기해요.'
// 문체 지적만 걸리는 초안: 마지막에 다섯 문장짜리 단락(2~4문장 규칙 위반). 안전 지적은 없다.
const styleOnlyReading = `${passingReading}\n\n오늘은 약속 시간을 먼저 적어 두어요. 답장 간격을 하루 단위로 비교해요. 편한 쪽을 남겨요. 불편한 장면만 표시해요. 그다음 대화 순서를 정해요.`
// 안전 지적이 걸리는 초안: 확정 예언.
const unsafeReading = `${passingReading}\n\n이 흐름이면 올해 안에 무조건 결혼합니다. 그 사람은 100% 돌아옵니다.`

async function seedLongformBlocks(reportId: string) {
  const topics = loadHighlightTopics(context.serviceKey)
  await mutateReportRecord(reportId, owner, (draft) => {
    draft.report.verdict = { statement: hook, decidedAt: new Date().toISOString() }
    draft.report.summary = { text: '요약', status: 'complete' }
    if (topics) draft.report.highlights = topics.map((topic) => ({ title: topic.title, text: '하이라이트', status: 'complete' }))
  })
}

type ChatRequest = { messages: Array<{ role: string; content: string }> }
function reply(interpretation: string) {
  return {
    id: 'resp', model: 'gpt-5.5',
    choices: [{ message: { content: JSON.stringify({ id: 'one', hook, interpretation }) }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 500, completion_tokens: 400, total_tokens: 900 },
  }
}

const sdkCreate = OpenAI.Chat.Completions.prototype.create
const previousKey = process.env.OPENAI_API_KEY
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'sk-test-section-rescue'
after(() => { OpenAI.Chat.Completions.prototype.create = sdkCreate; if (previousKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = previousKey })

async function freshReport() {
  const reportId = randomUUID()
  await createOrGetReportRecord({ reportId, birth, context, analysis, templateReport: template(['one']), owner })
  await seedLongformBlocks(reportId)
  return reportId
}

describe('1차 미완성은 2·3차 재검증으로 완성된다', { concurrency: false }, () => {
  it('2차 편집 호출이 엄격 검수를 통과하면 repaired 로 완성된다', async () => {
    const reportId = await freshReport()
    const requests: ChatRequest[] = []
    OpenAI.Chat.Completions.prototype.create = (async (request: ChatRequest) => {
      requests.push(request)
      // 1차 네 번은 문체 지적 초안, 2차(다섯 번째)에서 고친 본문.
      return requests.length <= SECTION_ATTEMPT_LIMIT ? reply(styleOnlyReading) : reply(passingReading)
    }) as unknown as typeof sdkCreate

    const result = await generateReportSectionNow({ reportId, birth, analysis, context, sectionId: 'one', owner })

    assert.equal(requests.length, SECTION_ATTEMPT_LIMIT + 1, '1차 네 번 뒤 2차 편집 호출이 한 번 더 있어야 한다')
    assert.equal(result.status, 'complete')
    assert.equal(result.reviewMode, 'repaired')
    assert.equal(result.interpretation, passingReading)
    // 2차 호출은 초안을 assistant 메시지로 붙이고 "지적만 고치라"고 한다.
    const edit = requests[SECTION_ATTEMPT_LIMIT]
    assert.ok(edit.messages.some((message) => message.role === 'assistant' && message.content.includes(styleOnlyReading.slice(0, 40))), '편집 호출에 직전 초안이 없다')
    assert.match(edit.messages[edit.messages.length - 1].content, /지적된 부분만 고치고/)
    const saved = await getReportRecord(reportId, owner)
    assert.equal(saved?.status, 'complete')
  })

  it('2차도 실패하면 안전 지적이 없는 초안을 lenient 로 채택하고 문체 지적을 남긴다', async () => {
    const reportId = await freshReport()
    let calls = 0
    OpenAI.Chat.Completions.prototype.create = (async () => { calls += 1; return reply(styleOnlyReading) }) as unknown as typeof sdkCreate

    const result = await generateReportSectionNow({ reportId, birth, analysis, context, sectionId: 'one', owner })

    assert.equal(calls, SECTION_ATTEMPT_LIMIT + 1, '3차는 모델을 부르지 않고 저장된 초안으로 판정한다')
    assert.equal(result.status, 'complete', `미완성으로 남았다: ${result.error ?? ''}`)
    assert.equal(result.reviewMode, 'lenient')
    assert.equal(result.interpretation, styleOnlyReading)
    assert.ok(result.reviewNotes?.some((note) => note.includes('2~4개의 완성 문장')), `문체 지적이 남아야 한다: ${JSON.stringify(result.reviewNotes)}`)
    assert.ok(result.reviewNotes?.every((note) => !isSafetyIssue(note)), '안전 지적이 남은 초안이 채택됐다')
    const saved = await getReportRecord(reportId, owner)
    assert.equal(saved?.status, 'complete')
    // 고객 응답에는 검수 방식과 지적이 나가지 않는다.
    const client = toClientReport(saved!)
    assert.equal((client.sections[0] as { reviewMode?: string }).reviewMode, undefined)
    assert.equal((client.sections[0] as { reviewNotes?: string[] }).reviewNotes, undefined)
  })

  it('안전 지적이 남는 초안은 편집하지도, 채택하지도 않는다', async () => {
    const reportId = await freshReport()
    let calls = 0
    OpenAI.Chat.Completions.prototype.create = (async () => { calls += 1; return reply(unsafeReading) }) as unknown as typeof sdkCreate

    const result = await generateReportSectionNow({ reportId, birth, analysis, context, sectionId: 'one', owner })

    // 없는 사실·확정 예언은 편집으로 고칠 것이 아니다. 2차 호출 없이 실패로 남는다.
    assert.equal(calls, SECTION_ATTEMPT_LIMIT)
    assert.equal(result.status, 'failed')
    assert.equal(result.reviewMode, undefined)
  })

  it('글이 아닌 초안("짧습니다.")은 문체 지적만 있어도 채택하지 않는다', async () => {
    const reportId = await freshReport()
    let calls = 0
    OpenAI.Chat.Completions.prototype.create = (async () => { calls += 1; return reply('짧습니다.') }) as unknown as typeof sdkCreate

    const result = await generateReportSectionNow({ reportId, birth, analysis, context, sectionId: 'one', owner })

    assert.equal(calls, SECTION_ATTEMPT_LIMIT)
    assert.equal(result.status, 'failed')
  })
})

describe('안전 지적과 문체 지적을 가른다', () => {
  it('안전 지적', () => {
    for (const issue of [
      '입력에 없는 회사·가족·집·반려묘·지역·질병 사실을 만들지 마세요.',
      '미래 사건을 확인된 사실처럼 쓰지 말고 조건과 가능성의 말로 바꾸세요.',
      '확정 예언 표현을 조건과 가능성의 말로 바꾸세요.',
      '건강·질병·복약 판단을 서술자의 권위로 대신하지 말고 의료진 확인을 안내하세요.',
      '근거 없는 처방 숫자를 만들지 마세요: 3개월',
      '고정 결론의 1순위(HOLD)와 다른 선택(GO)을 1순위로 말하지 마세요.',
      '내부 근거 필드와 제작 용어를 고객 본문에 쓰지 마세요.',
      '명시적 연락 거부가 있으므로 재접촉을 제안하지 마세요.',
      '고객 문장에 한자를 쓰지 말고 쉬운 한국어로 바꾸세요.',
      '티저의 한 문장이 65자를 넘습니다. 한 문장에 한 생각만 남기세요.',
    ]) assert.equal(isSafetyIssue(issue), true, issue)
  })
  it('문체 지적', () => {
    for (const issue of [
      '독자가 자기 일상에서 알아볼 수 있는 구체적인 장면을 넣으세요.',
      '유지·비교·대화·행동 중 하나를 다음 판단 기준으로 제시하세요.',
      '각 의미 단락은 2~4개의 완성 문장으로 묶고 의미가 바뀌면 빈 줄을 두세요.',
      '다른 항목과 같은 편집 틀을 반복하지 말고 현재 질문에 맞는 결론 구조를 쓰세요.',
      '폐지된 하게체와 자네 호칭을 쓰지 마세요.',
    ]) assert.equal(isSafetyIssue(issue), false, issue)
  })
})

/**
 * 읽는 사람이 화면을 열 때마다 실패 칸에 재시작을 보내므로, 새로고침을 반복하면 같은 칸에
 * 모델을 네 번씩 태우게 된다. 결과는 같고 비용만 는다. 짧은 간격을 두되, 규칙을 고쳐 배포한
 * 뒤(그 창이 지난 뒤)에는 회복을 막지 않아야 한다.
 */
describe('실패한 칸의 재시도 간격', { concurrency: false }, () => {
  async function failedReport() {
    const reportId = await freshReport()
    OpenAI.Chat.Completions.prototype.create = (async () => reply(unsafeReading)) as unknown as typeof sdkCreate
    await generateReportSectionNow({ reportId, birth, analysis, context, sectionId: 'one', owner })
    const saved = await getReportRecord(reportId, owner)
    assert.equal(saved?.report.sections[0].status, 'failed')
    return reportId
  }

  it('막 실패한 칸은 곧바로 다시 세우지 않는다', async () => {
    const reportId = await failedReport()
    let calls = 0
    OpenAI.Chat.Completions.prototype.create = (async () => { calls += 1; return reply(passingReading) }) as unknown as typeof sdkCreate
    const again = await generateReportSectionNow({ reportId, birth, analysis, context, sectionId: 'one', owner, retry: true })
    assert.equal(calls, 0, '간격 안에서 모델을 다시 불렀다')
    assert.equal(again.status, 'failed')
  })

  it('간격이 지나면 다시 세우고 완성한다', async () => {
    const reportId = await failedReport()
    // 마지막 시도를 간격 밖으로 돌린다(배포 뒤 다시 여는 상황).
    const past = new Date(Date.now() - FAILED_RETRY_COOLDOWN_MS - 60_000).toISOString()
    await mutateReportRecord(reportId, owner, (draft) => {
      for (const attempt of draft.report.sections[0].attempts ?? []) attempt.finishedAt = past
    })
    let calls = 0
    OpenAI.Chat.Completions.prototype.create = (async () => { calls += 1; return reply(passingReading) }) as unknown as typeof sdkCreate
    const again = await generateReportSectionNow({ reportId, birth, analysis, context, sectionId: 'one', owner, retry: true })
    assert.ok(calls > 0, '간격이 지났는데도 다시 세우지 않았다')
    assert.equal(again.status, 'complete')
    assert.equal(again.interpretation, passingReading)
  })
})
