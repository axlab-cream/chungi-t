import { after, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import OpenAI from 'openai'
import { randomUUID } from 'node:crypto'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import { buildOpenAiSajuReportSection } from '../../src/report/report-generator.js'
import { generateReportSectionNow } from '../../src/report/report-queue.js'
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
  '지금 적어 주신 내용에서는 특별한 갈등이나 관계 변화가 확인되지 않습니다. 좋은 관계를 유지하는 데 도움이 된 행동을 먼저 알아보는 것이 이번 해석의 출발점입니다. 안정된 상태를 숨겨진 문제로 바꿔 읽을 필요는 없습니다. 서로 편안하게 지켜온 약속이 무엇인지 구체적으로 떠올려 보세요. 관계의 속도는 누구에게나 같아야 하는 기준이 아니라 두 사람이 함께 정하는 범위입니다.',
  '전통적인 상징 해석은 서로 어떤 방식으로 반응하는지 살펴보는 참고 언어입니다. 생년 정보 하나로 실제 마음이나 경험을 알아낼 수는 없습니다. 이 풀이에서 중요한 것은 추측을 사실과 구분하고 현실에서 확인할 수 있는 조건으로 돌아오는 과정입니다. 실제 행동과 맞지 않는 설명이 있다면 본인의 특징으로 받아들이지 않아도 됩니다. 이해를 돕는 비유와 이미 확인된 사실은 같은 정보가 아닙니다.',
  '예를 들어 연락 횟수가 적어도 약속한 시간에 답하고 서로 불편함이 없다면 횟수를 늘리는 것이 개선이라고 보기는 어렵습니다. 반대로 연락이 많더라도 중요한 요청을 계속 무시한다면 그 행동을 따로 살펴볼 필요가 있습니다. 두 장면을 구별하면 숫자보다 실제 반응이 중요하다는 것을 알 수 있습니다. 지금 그런 어려움이 없다고 했으므로 이 사례는 문제가 있다는 판단이 아니라 앞으로 사용할 비교 기준입니다.',
  '현재 상태를 유지할 때는 잘 작동하는 방법을 불필요하게 바꾸지 않는 것도 선택입니다. 자주 확인해서 더 편안해지는지 아니면 자유롭게 시간을 보내고 돌아올 때 더 편안한지는 사람마다 다릅니다. 이미 서로 만족하는 방식이 있다면 그것을 유지하는 이유를 알아두세요. 다른 커플의 방식이 좋아 보인다는 이유만으로 지금 관계를 부족하게 평가할 필요는 없습니다. 각자의 휴식과 함께하는 시간이 무리 없이 이어지는지를 살펴보면 됩니다.',
  '앞으로 작은 변화가 생기더라도 한 번의 장면으로 마음이 달라졌다고 결론 내리지 마세요. 변화가 반복되는지, 상황을 설명했는지, 서로 조정하려는 반응이 있는지를 나누어 볼 수 있습니다. 질문할 일이 생기면 상대의 의도를 단정하는 말보다 실제 있었던 일을 말하는 편이 확인하기 쉽습니다. 이번 입력에서는 그런 변화가 확인되지 않았으므로 지금 당장 의심하거나 답을 요구할 이유는 없습니다. 필요한 때 사용할 기준으로만 남겨 두세요.',
  '오늘 할 수 있는 작은 정리는 관계가 편안했던 장면 하나를 고르는 것입니다. 그때 서로 어떤 약속을 지켰고 무엇을 배려했는지 떠올려 보세요. 문제를 찾는 목록을 만드는 대신 계속 유지하고 싶은 행동을 한 가지 적으면 충분합니다. 이후 새로운 상황이 생기면 그 행동이 여전히 서로에게 도움이 되는지 다시 살펴볼 수 있습니다. 해석을 읽었다는 이유로 하지 않아도 되는 대화를 억지로 시작하거나 새로운 걱정을 만들 필요는 없습니다.',
]
const fullReading = paragraphs.join('\n\n')
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
      return { model: 'mock-model', choices: [{ message: { content: JSON.stringify({ id: payload.section.id, hook: '관계의 안정성을 유지하는 기준', interpretation: fullReading }) }, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 } }
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
    OpenAI.Chat.Completions.prototype.create = (async () => ({ model: 'mock', choices: [{ message: { content: JSON.stringify({ id: 'specialized-only-id', interpretation: '짧습니다.' }) }, finish_reason: 'stop' }] })) as unknown as typeof sdkCreate
    const reportId = randomUUID()
    await createOrGetReportRecord({ reportId, birth, context, analysis, templateReport: template(), owner })
    const result = await generateReportSectionNow({ reportId, birth, analysis, context, sectionId: 'specialized-only-id', owner })
    assert.equal(result.status, 'failed')
    assert.equal(result.attempts?.length, 2)
    assert.ok(result.attempts?.every((item) => item.raw?.includes('짧습니다.')))
    assert.equal((await getReportRecord(reportId))?.status, 'failed')
    await assert.rejects(mutateReportRecord(reportId, { id: 'other' }, () => {}), /REPORT_ACCESS_DENIED/)
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
