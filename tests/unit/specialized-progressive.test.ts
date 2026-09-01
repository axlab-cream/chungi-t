import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { beginSpecializedProgressiveReport } from '../../src/report/specialized-progressive.js'
import { createOrGetReportRecord, getReportByPublicId, getReportRecord, saveReportRecord } from '../../src/report/report-store.js'
import { buildWorkJobReport, createWorkJobReportId, buildWorkJobContext, parseWorkJobRequest } from '../../src/work/job-service.js'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import type { BirthInput } from '../../src/types/index.js'

const birth: BirthInput = {
  year: 1992,
  month: 5,
  day: 14,
  hour: 10,
  minute: 30,
  gender: 'male',
  calendar: 'solar',
}

describe('specialized progressive + persist', () => {
  it('returns TOC immediately with pending sections and stable publicId', async () => {
    const owner = { id: 'user-progressive-1', email: 'progressive@example.com', provider: 'test' }
    const input = parseWorkJobRequest({
      currentJob: '서비스 기획',
      workStyle: '혼자 깊게',
      mainStress: '평가 압력',
      wantedDirection: '전문성',
      concern: '이 일이 맞는지',
    })
    const context = buildWorkJobContext('테스트', input)
    const analysis = analyzeSaju(birth)
    const reportId = createWorkJobReportId(owner.id, birth, input)
    const templateReport = buildWorkJobReport(analysis, birth, context, input, reportId)

    const first = await beginSpecializedProgressiveReport({
      reportId,
      birth,
      context,
      templateReport,
      analysis,
      owner,
      orderId: 'order-test-1',
    })

    assert.ok(first.publicId)
    assert.equal(first.report.sections.length > 0, true)
    assert.equal(first.report.publicId, first.publicId)
    assert.equal(first.cached, false)

    const second = await beginSpecializedProgressiveReport({
      reportId,
      birth,
      context,
      templateReport,
      analysis,
      owner,
      orderId: 'order-test-1',
    })

    assert.equal(second.reportId, first.reportId)
    assert.equal(second.publicId, first.publicId)
    assert.equal(second.created, false)

    const byPublic = await getReportByPublicId(first.publicId)
    assert.ok(byPublic)
    assert.equal(byPublic?.reportId, first.reportId)

    const stored = await getReportRecord(reportId)
    assert.equal(stored?.orderId, 'order-test-1')
  })

  it('createOrGet keeps complete cache without resetting sections', async () => {
    const owner = { id: 'user-progressive-2', provider: 'test' }
    const input = parseWorkJobRequest({ currentJob: '개발', concern: '이직' })
    const context = buildWorkJobContext('보관', input)
    const analysis = analyzeSaju(birth)
    const reportId = createWorkJobReportId(owner.id, birth, input)
    const templateReport = buildWorkJobReport(analysis, birth, context, input, reportId)

    const created = await createOrGetReportRecord({
      reportId,
      birth,
      context,
      templateReport,
      owner,
    })
    assert.equal(created.created, true)
    assert.ok(created.record.publicId)

    created.record.status = 'complete'
    created.record.report.status = 'complete'
    created.record.report.sections = created.record.report.sections.map((section) => ({
      ...section,
      status: 'complete' as const,
      generatedBy: 'openai' as const,
    }))
    await saveReportRecord(created.record)

    const again = await beginSpecializedProgressiveReport({
      reportId,
      birth,
      context,
      templateReport,
      analysis,
      owner,
    })
    assert.equal(again.cached, true)
    assert.equal(again.report.status, 'complete')
    assert.equal(again.publicId, created.record.publicId)
  })
})
