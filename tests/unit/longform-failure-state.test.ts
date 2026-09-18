import { after, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import OpenAI from 'openai'
import { randomUUID } from 'node:crypto'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import { ensureReportLongform } from '../../src/report/report-queue.js'
import { createOrGetReportRecord, getReportRecord, mutateReportRecord } from '../../src/report/report-store.js'
import type { BirthInput, SajuReport, SajuReportSection } from '../../src/types/index.js'

/**
 * 2026-09-18: 크레딧이 떨어진 동안 화면이 "타고난 그릇과 쓰는 법 항목을 준비하고 있어요" 골격을
 * 영원히 보여 줬다. 목업처럼 보이는 이유가 이것이다. 요약은 failed 로 남았는데 하이라이트는
 * 레코드에 아예 안 남아(undefined) 화면이 "준비 중"으로 읽었다. 실패는 실패로 남아야 화면이
 * 접을 수 있다.
 */
const birth: BirthInput = { year: 1994, month: 3, day: 11, hour: 9, gender: 'female', calendar: 'solar' }
const analysis = analyzeSaju(birth)
const context = { serviceKey: 'quit_fortune', name: '실패 상태 점검', concern: '팀 분위기가 걱정됩니다.' }
const owner = { id: 'longform-failure-test-owner' }
const section = (id: string): SajuReportSection => ({ id, order: 1, imageKey: '', imageSrc: '', imageAlt: '', category: '판단', categoryEn: 'Decision', classification: '지금 나갈 자리인가', hook: '', interpretation: '', patternKeys: [], ragTopics: [] })
const template = (ids: string[]): SajuReport => ({ title: '테스트', subtitle: '', model: 'template', generatedBy: 'template', sections: ids.map(section) })

const sdkCreate = OpenAI.Chat.Completions.prototype.create
const previousKey = process.env.OPENAI_API_KEY
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'sk-test-longform-failure'
after(() => { OpenAI.Chat.Completions.prototype.create = sdkCreate; if (previousKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = previousKey })

describe('생성이 막히면 골격 대신 실패로 남는다', { concurrency: false }, () => {
  it('크레딧이 없으면 요약과 하이라이트가 모두 failed 로 저장된다', async () => {
    const reportId = randomUUID()
    await createOrGetReportRecord({ reportId, birth, context, analysis, templateReport: template(['one']), owner })
    await mutateReportRecord(reportId, owner, (draft) => {
      draft.report.sections[0].hook = '완료'
      draft.report.sections[0].interpretation = '완료된 본문'
      draft.report.sections[0].status = 'complete'
      draft.status = draft.report.status = 'complete'
    })
    OpenAI.Chat.Completions.prototype.create = (async () => {
      throw Object.assign(new Error('429 You have no credits remaining.'), { status: 429 })
    }) as unknown as typeof sdkCreate

    await ensureReportLongform({ reportId, owner })
    const saved = await getReportRecord(reportId, owner)
    assert.equal(saved?.report.summary?.status, 'failed', '요약이 실패로 남지 않았다')
    assert.ok(Array.isArray(saved?.report.highlights), `하이라이트가 기록되지 않아 화면이 영원히 "준비 중"으로 읽는다: ${JSON.stringify(saved?.report.highlights)}`)
    assert.equal(saved?.report.highlights?.length, 3)
    assert.deepEqual(saved?.report.highlights?.map((item) => item.status), ['failed', 'failed', 'failed'])
    // 완료된 목차 본문은 그대로여야 한다.
    assert.equal(saved?.report.sections[0].interpretation, '완료된 본문')
  })
})

/**
 * 천명사주 레코드는 `context.serviceKey` 가 비어 있다(옛 기록). 화면은 `report.serviceKey`
 * (기본 saju_master)로 설정을 찾아 카드 세 장을 그리는데, 서버만 undefined 로 읽으면 주제를
 * 못 찾아 아무것도 저장하지 못한다 — 카드가 영영 "준비하고 있어요" 골격으로 남았다.
 */
describe('서비스 키가 비어 있어도 화면과 같은 기준으로 주제를 찾는다', { concurrency: false }, () => {
  it('context.serviceKey 가 없으면 report.serviceKey 로 찾는다', async () => {
    const reportId = randomUUID()
    await createOrGetReportRecord({
      reportId, birth, analysis, owner,
      context: { name: '키 없는 옛 기록' },
      templateReport: template(['one']),
    })
    await mutateReportRecord(reportId, owner, (draft) => {
      delete (draft.context as { serviceKey?: string }).serviceKey
      draft.report.serviceKey = 'saju_master'
      draft.report.sections[0].hook = '완료'
      draft.report.sections[0].interpretation = '완료된 본문'
      draft.report.sections[0].status = 'complete'
      draft.status = draft.report.status = 'complete'
    })
    OpenAI.Chat.Completions.prototype.create = (async () => {
      throw Object.assign(new Error('429 You have no credits remaining.'), { status: 429 })
    }) as unknown as typeof sdkCreate

    await ensureReportLongform({ reportId, owner })
    const saved = await getReportRecord(reportId, owner)
    assert.ok(Array.isArray(saved?.report.highlights), '주제를 못 찾아 카드가 골격으로 남는다')
    assert.equal(saved?.report.highlights?.length, 3)
  })
})
