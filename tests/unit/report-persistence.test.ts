import { after, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import OpenAI from 'openai'
import { randomUUID } from 'node:crypto'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import { buildOpenAiSajuReportSection } from '../../src/report/report-generator.js'
import { generateReportSectionNow, preGenerateReport, recoverReportSectionFromLatestAttempt } from '../../src/report/report-queue.js'
import { createOrGetReportRecord, findReportRecord, getReportRecord, mutateReportRecord, saveReportRecord, toClientReport, updateReportSection, type ReportRecord } from '../../src/report/report-store.js'
import { reviewInterpretation } from '../../src/report/interpretation-validation.js'
import type { BirthInput, SajuReport, SajuReportSection } from '../../src/types/index.js'

const birth: BirthInput = { year: 1994, month: 3, day: 11, hour: 9, gender: 'female', calendar: 'solar' }
const analysis = analyzeSaju(birth)
const context = { serviceKey: 'love_this_year', name: '품질점검', concern: '특별한 문제 없이 잘 지내고 있습니다.' }
const owner = { id: 'persistence-test-owner' }
const section = (id: string): SajuReportSection => ({ id, order: 1, imageKey: '', imageSrc: '', imageAlt: '', category: '관계', categoryEn: 'Love', classification: '현재 관계를 유지할 기준', hook: '안정된 관계를 유지하는 기준', patternKeys: [], ragTopics: [], interpretation: '검수 전 초안입니다.' })
function template(ids = ['specialized-only-id']): SajuReport { return { title: '테스트', subtitle: '', model: 'template', generatedBy: 'template', sections: ids.map(section) } }

const paragraphs = [
  '지금 적어 주신 내용에서는 특별한 갈등이나 관계 변화가 확인되지 않습니다. 좋은 관계를 유지하는 데 도움이 된 행동을 먼저 알아보는 것이 이번 해석의 출발점입니다. 안정된 상태를 숨겨진 문제로 바꿔 읽을 필요는 없습니다. 서로 편안하게 지켜온 약속이 무엇인지 구체적으로 떠올려 보세요.',
  '전통적인 상징 해석은 서로 어떤 방식으로 반응하는지 살펴보는 참고 언어입니다. 생년 정보 하나로 실제 마음이나 경험을 알아낼 수는 없습니다. 이 풀이에서 중요한 것은 추측을 사실과 구분하고 현실에서 확인할 수 있는 조건으로 돌아오는 과정입니다. 실제 행동과 맞지 않는 설명이 있다면 본인의 특징으로 받아들이지 않아도 됩니다.',
  '예를 들어 연락 횟수가 적어도 약속한 시간에 답하고 서로 불편함이 없다면 횟수를 늘리는 것이 개선이라고 보기는 어렵습니다. 반대로 연락이 많더라도 중요한 요청을 계속 무시한다면 그 행동을 따로 살펴볼 필요가 있습니다. 두 장면을 구별하면 숫자보다 실제 반응이 중요하다는 것을 알 수 있습니다. 지금 그런 어려움이 없다고 했으므로 이 사례는 문제가 있다는 판단이 아니라 앞으로 사용할 비교 기준입니다.',
  '현재 상태를 유지할 때는 잘 작동하는 방법을 불필요하게 바꾸지 않는 것도 선택입니다. 자주 확인해서 더 편안해지는지 아니면 자유롭게 시간을 보내고 돌아올 때 더 편안한지는 사람마다 다릅니다. 이미 서로 만족하는 방식이 있다면 그것을 유지하는 이유를 알아두세요. 다른 커플의 방식이 좋아 보인다는 이유만으로 지금 관계를 부족하게 평가할 필요는 없습니다.',
  '앞으로 작은 변화가 생기더라도 한 번의 장면으로 마음이 달라졌다고 결론 내리지 마세요. 변화가 반복되는지, 상황을 설명했는지, 서로 조정하려는 반응이 있는지를 나누어 볼 수 있습니다. 질문할 일이 생기면 상대의 의도를 단정하는 말보다 실제 있었던 일을 말하는 편이 확인하기 쉽습니다. 이번 입력에서는 그런 변화가 확인되지 않았으므로 지금 당장 의심하거나 답을 요구할 이유는 없습니다.',
  '오늘 할 수 있는 작은 정리는 관계가 편안했던 장면 하나를 고르는 것입니다. 그때 서로 어떤 약속을 지켰고 무엇을 배려했는지 떠올려 보세요. 문제를 찾는 목록을 만드는 대신 계속 유지하고 싶은 행동을 한 가지 적으면 충분합니다. 이후 새로운 상황이 생기면 그 행동이 여전히 서로에게 도움이 되는지 다시 살펴볼 수 있습니다.',
]
const fullReading = paragraphs.join('\n\n')
const newToneReading = '현재 입력에서 관계를 바꿀 이유는 확인되지 않아요. 특별한 문제 없이 지낸다고 적었으니 숨은 갈등을 전제하지 않아요.\n\n예를 들어 약속 간격이 달라도 서로 불편하지 않다면 연락 횟수를 늘릴 이유가 없어요. 지금 그런 약속을 지키고 있다는 뜻은 아니에요.\n\n먼저 현재 방식에서 편한 점을 확인해 보세요. 새로운 걱정을 만들기보다 실제 불편이 생겼을 때 그 장면부터 이야기해요.'
const sdkCreate = OpenAI.Chat.Completions.prototype.create
const previousKey = process.env.OPENAI_API_KEY
after(() => { OpenAI.Chat.Completions.prototype.create = sdkCreate; if (previousKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = previousKey })

describe('immutable result identity and generation pipeline', { concurrency: false }, () => {
  it('allocates result and section IDs before generation; concurrent creates keep the first snapshot', async () => {
    const reportId = randomUUID()
    const input = { reportId, birth, context, analysis, templateReport: template(), owner }
    const [first, second] = await Promise.all([createOrGetReportRecord(input), createOrGetReportRecord(input)])
    assert.equal(first.record.resultId, second.record.resultId)
    assert.ok(first.record.report.sections[0].generationId)
    assert.notEqual(first.record.resultId, first.record.report.sections[0].generationId)
    const byResult = await findReportRecord(first.record.resultId!, owner)
    assert.deepEqual(byResult?.report, first.record.report)
    await assert.rejects(findReportRecord(reportId, { id: 'different-owner' }), /REPORT_ACCESS_DENIED/)
  })

  it('new pending results retain the outline but do not expose legacy interpretation copy', async () => {
    const reportId = randomUUID()
    const input = template()
    input.sections[0].storytelling = { feel: 'old-feel', scene: 'old-scene', actions: ['old-action'], imagePrompt: {} as never }
    const { record } = await createOrGetReportRecord({ reportId, birth, context, templateReport: input, owner })
    const result = toClientReport(record)
    assert.equal(result.sections[0].id, input.sections[0].id)
    assert.equal(result.sections[0].classification, input.sections[0].classification)
    assert.equal(result.sections[0].interpretation, '')
    assert.equal(result.sections[0].hook, '')
    assert.equal(result.sections[0].storytelling, undefined)
    assert.equal(result.quality, undefined)
    assert.equal(input.sections[0].interpretation, '검수 전 초안입니다.')
  })

  it('merges simultaneous changes without losing a section', async () => {
    const reportId = randomUUID()
    await createOrGetReportRecord({ reportId, birth, context, templateReport: template(['one', 'two']), owner })
    await Promise.all(['one', 'two'].map((id) => updateReportSection(reportId, { ...section(id), interpretation: `saved-${id}` }, { generatedBy: 'openai', model: 'test' }, owner)))
    const record = await findReportRecord(reportId, owner)
    assert.deepEqual(record?.report.sections.map((item) => item.interpretation), ['saved-one', 'saved-two'])
    assert.equal(record?.status, 'complete')
    await updateReportSection(reportId, { ...section('one'), interpretation: 'overwrite attempt' }, { generatedBy: 'openai', model: 'test' }, owner)
    assert.equal((await findReportRecord(reportId, owner))?.report.sections[0].interpretation, 'saved-one')
  })

  it('rejects unknown section IDs, five-character responses and unlabeled Hanja', async () => {
    await assert.rejects(buildOpenAiSajuReportSection(analysis, birth, 'nonexistent', context), /찾지 못/)
    assert.equal(reviewInterpretation('짧습니다.', context).passed, false)
    assert.equal(reviewInterpretation(fullReading + '\n\n辛亥', context).passed, false)
    assert.equal(reviewInterpretation(fullReading, context).passed, true)
  })

  it('uses the exact specialized section, persists response/usage, and does not regenerate on recall', async () => {
    process.env.OPENAI_API_KEY = 'test-key-no-network'
    let calls = 0
    OpenAI.Chat.Completions.prototype.create = (async (request: { messages: Array<{ content: string }> }) => {
      calls += 1
      const payload = JSON.parse(request.messages[1].content)
      assert.equal(payload.section.id, 'specialized-only-id')
      await new Promise((resolve) => setTimeout(resolve, 15))
      assert.equal(payload.section.interpretation, undefined)
      return { model: 'mock-model', choices: [{ message: { content: JSON.stringify({ id: payload.section.id, hook: '현재 방식에서 편한 점을 확인해요.', interpretation: newToneReading }) }, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 } }
    }) as unknown as typeof sdkCreate
    const reportId = randomUUID()
    const created = await createOrGetReportRecord({ reportId, birth, context, analysis, templateReport: template(), owner })
    const params = { reportId, birth, analysis, context, sectionId: 'specialized-only-id', owner }
    await Promise.all([generateReportSectionNow(params), generateReportSectionNow(params)])
    const saved = await findReportRecord(created.record.resultId!, owner)
    assert.equal(calls, 1)
    assert.equal(saved?.status, 'complete')
    assert.equal(saved?.report.sections[0].attempts?.[0].status, 'complete')
    assert.equal(saved?.report.sections[0].tokenUsage?.totalTokens, 30)
    const result = toClientReport(saved!)
    assert.equal(result.sections[0].attempts, undefined)
    const again = await generateReportSectionNow({ ...params, birth: { ...birth, year: 2000 }, retry: true })
    assert.equal(again.interpretation, result.sections[0].interpretation)
    assert.equal(calls, 1)
  })

  it('retains rejected output but never labels a bad fallback complete', async () => {
    process.env.OPENAI_API_KEY = 'test-key-no-network'
    let repairMessage = ''
    const messageCounts: number[] = []
    OpenAI.Chat.Completions.prototype.create = (async (request: { messages: Array<{ content: string }> }) => {
      messageCounts.push(request.messages.length)
      if (request.messages[2]) repairMessage = request.messages[2].content
      return { model: 'mock', choices: [{ message: { content: JSON.stringify({ id: 'specialized-only-id', interpretation: '짧습니다.' }) }, finish_reason: 'stop' }] }
    }) as unknown as typeof sdkCreate
    const reportId = randomUUID()
    await createOrGetReportRecord({ reportId, birth, context, analysis, templateReport: template(), owner })
    const result = await generateReportSectionNow({ reportId, birth, analysis, context, sectionId: 'specialized-only-id', owner })
    assert.equal(result.status, 'failed')
    assert.equal(result.attempts?.length, 2)
    assert.ok(result.attempts?.every((item) => item.raw?.includes('짧습니다.')))
    assert.match(repairMessage, /한자 설명은 문장당 하나/)
    assert.match(repairMessage, /빈 줄로 나눈 각 의미 단락은 2~4개/)
    assert.equal((await getReportRecord(reportId))?.status, 'failed')
    const retried = await generateReportSectionNow({ reportId, birth, analysis, context, sectionId: 'specialized-only-id', owner, retry: true })
    assert.equal(retried.status, 'failed')
    assert.equal(messageCounts[2], 3, '사용자가 다시 시도한 첫 요청부터 수정 안내가 있어야 합니다.')
    await assert.rejects(mutateReportRecord(reportId, { id: 'other' }, () => {}), /REPORT_ACCESS_DENIED/)
  })

  it('gives the second attempt structured Hanja and paragraph repair guidance without rejected prose', async () => {
    process.env.OPENAI_API_KEY = 'test-key-no-network'
    const firstInterpretation = [
      '현재 관계는 유지할 수 있어요. 일간(日干, 나를 보는 자리)과 오행(五行, 다섯 기운)은 판단 기준이에요.',
      '예를 들어 약속 시간에 답하는 장면을 확인해요. CUSTOMER_PRIVATE_MARKER_4404는 거부 원문 확인용 표식이에요.',
      '다음에는 실제 약속 이행을 비교해요.',
    ].join('\n\n')
    let calls = 0
    let repairMessage = ''
    OpenAI.Chat.Completions.prototype.create = (async (request: { messages: Array<{ content: string }> }) => {
      calls += 1
      const payload = JSON.parse(request.messages[1].content)
      if (calls === 1) {
        return { model: 'mock-model', choices: [{ message: { content: JSON.stringify({ id: payload.section.id, hook: '현재 관계는 유지할 수 있어요.', interpretation: firstInterpretation }) }, finish_reason: 'stop' }] }
      }
      repairMessage = request.messages[2]?.content ?? ''
      return { model: 'mock-model', choices: [{ message: { content: JSON.stringify({ id: payload.section.id, hook: '현재 방식에서 편한 점을 확인해요.', interpretation: newToneReading }) }, finish_reason: 'stop' }] }
    }) as unknown as typeof sdkCreate

    const reportId = randomUUID()
    await createOrGetReportRecord({ reportId, birth, context, analysis, templateReport: template(), owner })
    const result = await generateReportSectionNow({ reportId, birth, analysis, context, sectionId: 'specialized-only-id', owner })

    assert.equal(result.status, 'complete')
    assert.equal(calls, 2)
    assert.match(repairMessage, /1\. .*각 의미 단락은 2~4개/)
    assert.match(repairMessage, /2\. .*한 문장에는 여러 한자 설명/)
    assert.match(repairMessage, /한자 설명은 문장당 하나/)
    assert.match(repairMessage, /빈 줄로 나눈 각 의미 단락은 2~4개/)
    assert.match(repairMessage, /현재 실패만 고치고 끝내지 말고.*원래 요청의 모든 품질 불변식/)
    assert.match(repairMessage, /직접 답.*사용자 사실과 검증된 계산.*전통적 상징/)
    assert.match(repairMessage, /실제 경험이 아니면.*예를 들어.*장소 또는 도구.*관찰 행동/)
    assert.match(repairMessage, /구체적인 다음 판단 기준.*대상.*기록·비교·확인/)
    assert.match(repairMessage, /마지막 의미 단락을 반드시 2~4개의 완성 문장으로 예약/)
    assert.match(repairMessage, /첫 문장.*구체적인 확인 대상.*이어지는 문장.*기록·비교·확인/)
    assert.match(repairMessage, /JSON 반환 전.*내부 자기검사.*다음 판단 기준.*체크리스트는 출력하지/)
    assert.match(repairMessage, /“다음에는 잘해봐”.*“확인해”.*대상 없는 행동.*다음 판단 기준으로 세지/)
    assert.match(repairMessage, /서비스 말투.*확정 예언.*상징을 현실의 정답/)
    assert.match(repairMessage, /근거 없는 수치.*내부 필드.*코퍼스 문장.*형제 항목/)
    assert.doesNotMatch(repairMessage, /일간\(日干|오행\(五行|약속 시간|CUSTOMER_PRIVATE_MARKER_4404/)
  })

  it('deduplicates repeated failure labels in repair guidance', async () => {
    process.env.OPENAI_API_KEY = 'test-key-no-network'
    let repairMessage = ''
    OpenAI.Chat.Completions.prototype.create = (async (request: { messages: Array<{ content: string }> }) => {
      repairMessage = request.messages[2]?.content ?? ''
      return { model: 'mock-model', choices: [{ message: { content: JSON.stringify({ id: 'specialized-only-id', hook: '현재 방식에서 편한 점을 확인해요.', interpretation: newToneReading }) }, finish_reason: 'stop' }] }
    }) as unknown as typeof sdkCreate

    await buildOpenAiSajuReportSection(analysis, birth, 'specialized-only-id', context, section('specialized-only-id'), {
      repairIssues: ['중복된 검수 사유입니다.', '중복된 검수 사유입니다.'],
    })

    assert.equal(repairMessage.match(/중복된 검수 사유입니다\./g)?.length, 1)
  })

  it('blocks later items until predecessors pass and stops after a failed item', async () => {
    const reportId = randomUUID()
    await createOrGetReportRecord({ reportId, birth, context, analysis, templateReport: template(['one', 'two']), owner })
    const args = { reportId, birth, context, analysis, owner }
    const later = await generateReportSectionNow({ ...args, sectionId: 'two' })
    assert.equal(later.status, 'pending')
    assert.equal(later.attempts, undefined)
    await mutateReportRecord(reportId, owner, record => { record.report.sections[0].status = 'failed'; record.status = record.report.status = 'failed' })
    const resumed = await preGenerateReport(args)
    assert.equal(resumed?.report.sections[1].status, 'pending')
    assert.equal(resumed?.report.sections[1].attempts, undefined)
  })

  it('recovers one failed section from its last saved attempt without another model call', async () => {
    const reportId = randomUUID()
    await createOrGetReportRecord({ reportId, birth, context, analysis, templateReport: template(['one', 'two', 'three']), owner })
    const raw = JSON.stringify({ id: 'two', hook: '현재 방식에서 편한 점을 확인해요.', interpretation: newToneReading })
    await mutateReportRecord(reportId, owner, record => {
      const [first, failed] = record.report.sections
      Object.assign(first, { status: 'complete', hook: '첫 항목은 그대로 유지해요.', interpretation: fullReading, generatedBy: 'openai', model: 'saved-model' })
      failed.status = 'failed'
      failed.error = '이전 검수에서 실패했습니다.'
      failed.attempts = [
        { id: 'saved-attempt', startedAt: '2026-09-12T00:00:00.000Z', finishedAt: '2026-09-12T00:01:00.000Z', model: 'saved-model', status: 'failed', raw, error: '이전 nextCriterion 판별 실패', tokenUsage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 } },
        { id: 'later-timeout', startedAt: '2026-09-12T00:02:00.000Z', finishedAt: '2026-09-12T00:03:00.000Z', model: 'fallback-model', status: 'failed', error: '응답이 완료되지 않았습니다.' },
      ]
      record.status = record.report.status = 'failed'
      record.report.progress = { complete: 1, total: 3 }
    })
    const before = (await getReportRecord(reportId, owner))!
    const firstBefore = structuredClone(before.report.sections[0])
    const attemptsBefore = structuredClone(before.report.sections[1].attempts)
    const laterBefore = structuredClone(before.report.sections[2])
    let calls = 0
    OpenAI.Chat.Completions.prototype.create = (async () => { calls += 1; throw new Error('Recovery must not call a model') }) as unknown as typeof sdkCreate

    const [recovered, concurrent] = await Promise.all([
      recoverReportSectionFromLatestAttempt({ reportId, sectionId: 'two', owner }),
      recoverReportSectionFromLatestAttempt({ reportId, sectionId: 'two', owner }),
    ])
    assert.equal(recovered.status, 'complete')
    assert.equal(concurrent.status, 'complete')
    const once = (await getReportRecord(reportId, owner))!
    const again = await recoverReportSectionFromLatestAttempt({ reportId, sectionId: 'two', owner })
    const after = (await getReportRecord(reportId, owner))!

    assert.equal(again.status, 'complete')
    assert.deepEqual(after, once, 'Repeated recovery must not increment revision or rewrite the snapshot')
    assert.deepEqual(after.report.sections[0], firstBefore)
    assert.deepEqual(after.report.sections[1].attempts, attemptsBefore)
    assert.deepEqual(after.report.sections[2], laterBefore)
    assert.equal(after.report.sections[1].hook, '현재 방식에서 편한 점을 확인해요.')
    assert.equal(after.report.sections[1].interpretation, newToneReading)
    assert.equal(after.report.sections[1].model, 'saved-model')
    assert.deepEqual(after.report.sections[1].tokenUsage, { promptTokens: 10, completionTokens: 20, totalTokens: 30 })
    assert.equal(after.status, 'generating')
    assert.equal(after.report.status, 'generating')
    assert.deepEqual(after.report.progress, { complete: 2, total: 3 })
    assert.equal(calls, 0)
  })

  it('fails closed when a saved section is not safely recoverable', async () => {
    const seed = async (options: { raw?: string; predecessor?: 'pending' | 'complete'; sectionStatus?: 'pending' | 'failed'; leaseExpiresAt?: string }) => {
      const reportId = randomUUID()
      await createOrGetReportRecord({ reportId, birth, context, analysis, templateReport: template(['one', 'two']), owner })
      await mutateReportRecord(reportId, owner, record => {
        record.report.sections[0].status = options.predecessor ?? 'complete'
        const target = record.report.sections[1]
        target.status = options.sectionStatus ?? 'failed'
        if (target.status === 'failed') target.attempts = [{ id: 'saved-attempt', startedAt: '2026-09-12T00:00:00.000Z', finishedAt: '2026-09-12T00:01:00.000Z', model: 'saved-model', status: 'failed', raw: options.raw }]
        if (options.leaseExpiresAt) target.generationLease = { id: 'saved-lease', expiresAt: options.leaseExpiresAt }
        record.status = record.report.status = target.status === 'failed' ? 'failed' : 'generating'
      })
      return reportId
    }
    const validRaw = JSON.stringify({ id: 'two', hook: '현재 방식에서 편한 점을 확인해요.', interpretation: newToneReading })
    const cases = [
      { reportId: await seed({}), error: /저장 원문/ },
      { reportId: await seed({ raw: '{broken' }), error: /Unexpected|JSON/ },
      { reportId: await seed({ raw: JSON.stringify({ id: 'wrong', hook: '현재 방식에서 편한 점을 확인해요.', interpretation: newToneReading }) }), error: /항목 ID/ },
      { reportId: await seed({ raw: JSON.stringify({ id: 'two', hook: '', interpretation: '짧아요.' }) }), error: /InterpretationQualityError|질문의 답/ },
      { reportId: await seed({ raw: validRaw, predecessor: 'pending' }), error: /선행 항목/ },
      { reportId: await seed({ raw: validRaw, leaseExpiresAt: new Date(Date.now() + 60_000).toISOString() }), error: /생성 중/ },
      { reportId: await seed({ raw: validRaw, leaseExpiresAt: 'not-a-timestamp' }), error: /생성 중/ },
      { reportId: await seed({ raw: validRaw, sectionStatus: 'pending' }), error: /실패 항목/ },
    ]
    for (const item of cases) {
      const before = await getReportRecord(item.reportId, owner)
      await assert.rejects(recoverReportSectionFromLatestAttempt({ reportId: item.reportId, sectionId: 'two', owner }), item.error)
      assert.deepEqual(await getReportRecord(item.reportId, owner), before)
    }
  })

  it('does not recover an earlier failure after a later section has changed from pristine pending state', async () => {
    const seed = async (changeLater: (later: SajuReportSection) => void) => {
      const reportId = randomUUID()
      await createOrGetReportRecord({ reportId, birth, context, analysis, templateReport: template(['one', 'two', 'three']), owner })
      await mutateReportRecord(reportId, owner, record => {
        record.report.sections[0].status = 'complete'
        const target = record.report.sections[1]
        target.status = 'failed'
        target.attempts = [{ id: 'saved-attempt', startedAt: '2026-09-12T00:00:00.000Z', finishedAt: '2026-09-12T00:01:00.000Z', model: 'saved-model', status: 'failed', raw: JSON.stringify({ id: 'two', hook: '현재 방식에서 편한 점을 확인해요.', interpretation: newToneReading }) }]
        changeLater(record.report.sections[2])
        record.status = record.report.status = 'failed'
      })
      return reportId
    }
    const attempted = await seed(later => { later.attempts = [{ id: 'later-attempt', startedAt: '2026-09-12T00:02:00.000Z', model: 'saved-model', status: 'failed' }] })
    const completed = await seed(later => { later.status = 'complete'; later.hook = '뒤 항목'; later.interpretation = fullReading })

    await assert.rejects(recoverReportSectionFromLatestAttempt({ reportId: attempted, sectionId: 'two', owner }), /후속 항목/)
    await assert.rejects(recoverReportSectionFromLatestAttempt({ reportId: completed, sectionId: 'two', owner }), /후속 항목/)
  })

  it('does not retry an earlier failure after a later section has changed from pristine pending state', async () => {
    const reportId = randomUUID()
    await createOrGetReportRecord({ reportId, birth, context, analysis, templateReport: template(['one', 'two', 'three']), owner })
    await mutateReportRecord(reportId, owner, record => {
      record.report.sections[0].status = 'complete'
      record.report.sections[1].status = 'failed'
      record.report.sections[1].attempts = [{ id: 'failed-attempt', startedAt: '2026-09-12T00:00:00.000Z', model: 'saved-model', status: 'failed' }]
      record.report.sections[2].attempts = [{ id: 'later-attempt', startedAt: '2026-09-12T00:01:00.000Z', model: 'saved-model', status: 'failed' }]
      record.status = record.report.status = 'failed'
    })
    const before = (await getReportRecord(reportId, owner))!
    let calls = 0
    OpenAI.Chat.Completions.prototype.create = (async () => { calls += 1; throw new Error('Retry must not call a model') }) as unknown as typeof sdkCreate

    const result = await generateReportSectionNow({ reportId, birth, analysis, context, sectionId: 'two', owner, retry: true })

    assert.equal(result.status, 'failed')
    assert.equal(calls, 0)
    assert.deepEqual(await getReportRecord(reportId, owner), before)
  })

  it('allows recovery after a saved generation lease has expired', async () => {
    const reportId = randomUUID()
    await createOrGetReportRecord({ reportId, birth, context, analysis, templateReport: template(['one', 'two']), owner })
    const raw = JSON.stringify({ id: 'two', hook: '현재 방식에서 편한 점을 확인해요.', interpretation: newToneReading })
    await mutateReportRecord(reportId, owner, record => {
      record.report.sections[0].status = 'complete'
      const target = record.report.sections[1]
      target.status = 'failed'
      target.generationLease = { id: 'expired-lease', expiresAt: '2025-01-01T00:00:00.000Z' }
      target.attempts = [{ id: 'saved-attempt', startedAt: '2026-09-12T00:00:00.000Z', finishedAt: '2026-09-12T00:01:00.000Z', model: 'saved-model', status: 'failed', raw }]
      record.status = record.report.status = 'failed'
    })

    const recovered = await recoverReportSectionFromLatestAttempt({ reportId, sectionId: 'two', owner })
    assert.equal(recovered.status, 'complete')
    assert.equal(recovered.generationLease, undefined)
  })

  it('reopens completed legacy records without metadata migration or regeneration on retry', async () => {
    const reportId = randomUUID()
    const legacy: ReportRecord = {
      reportId, birth, context, analysis, owner, status: 'complete',
      createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z',
      report: { ...template(), generatedBy: 'openai', model: 'legacy-saved-model', sections: [{ ...section('specialized-only-id'), interpretation: fullReading }] },
    }
    assert.equal(legacy.resultId, undefined)
    assert.equal(legacy.report.sections[0].status, undefined)
    assert.equal(legacy.report.sections[0].generationId, undefined)
    await saveReportRecord(legacy)
    const stored = await getReportRecord(reportId)
    assert.ok(stored)
    const first = toClientReport(stored)
    const second = toClientReport((await findReportRecord(reportId, owner))!)
    assert.equal(first.status, 'complete')
    assert.deepEqual(first.progress, { complete: 1, total: 1 })
    assert.equal(first.sections[0].status, 'complete')
    assert.equal(first.sections[0].interpretation, fullReading)
    assert.equal(first.resultId, reportId)
    assert.equal(first.publicUrl, `/r/${reportId}`)
    assert.match(first.sections[0].generationId!, /^legacy_[a-f0-9]{28}$/)
    assert.equal(second.sections[0].generationId, first.sections[0].generationId)

    const previousCreate = OpenAI.Chat.Completions.prototype.create
    const previousApiKey = process.env.OPENAI_API_KEY
    let calls = 0
    process.env.OPENAI_API_KEY = 'test-key-no-network'
    OpenAI.Chat.Completions.prototype.create = (async () => {
      calls += 1
      throw new Error('A completed legacy interpretation must never invoke an LLM')
    }) as unknown as typeof sdkCreate
    try {
      const params = { reportId, birth, analysis, context, owner, sectionId: 'specialized-only-id', retry: true }
      const recalled = await generateReportSectionNow(params)
      const recalledAgain = await generateReportSectionNow({ ...params, birth: { ...birth, year: 2000 } })
      assert.equal(recalled.interpretation, fullReading)
      assert.equal(recalledAgain.interpretation, fullReading)
      assert.equal(calls, 0)
      const after = await getReportRecord(reportId)
      assert.deepEqual(after, stored, 'opening and retrying must not rewrite the legacy snapshot')
      const client = toClientReport(after!)
      assert.equal(client.sections[0].status, 'complete')
      assert.equal(client.sections[0].generationId, first.sections[0].generationId)
      assert.equal(client.sections[0].interpretation, fullReading)
    } finally {
      OpenAI.Chat.Completions.prototype.create = previousCreate
      if (previousApiKey === undefined) delete process.env.OPENAI_API_KEY
      else process.env.OPENAI_API_KEY = previousApiKey
    }
  })
})
