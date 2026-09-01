import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import { buildTemplateSajuReport } from '../../src/report/report-generator.js'
import { createOrGetReportRecord, createReportId, deleteReportRecord, listReportRecords, saveReportRecord, toClientReport } from '../../src/report/report-store.js'
import { getCorpusSnapshot } from '../../src/rag/corpus-registry.js'
import type { BirthInput, SajuReportContext } from '../../src/types/index.js'

const sampleBirth: BirthInput = {
  year: 1975,
  month: 9,
  day: 26,
  hour: 12,
  gender: 'male',
  calendar: 'solar',
}

const sampleContext: SajuReportContext = {
  name: '정재용',
  target: '본인',
  concern: '직장 고민',
  relationship: '혼자',
  work: '직장 다녀요',
}

describe('[TASK] 사주 리포트 생성 테스트 하네스', () => {
  it('사주 기둥 기반 목차 섹션을 생성한다', () => {
    const analysis = analyzeSaju(sampleBirth)
    const report = buildTemplateSajuReport(analysis, sampleBirth, sampleContext)

    assert.ok(report.sections.length >= 30)
    assert.ok(report.sections[0].patternKeys.some((key) => key.startsWith('dayPillar:')))
    assert.ok(report.sections[0].patternKeys.some((key) => key.startsWith('dayMaster:')))
    assert.ok(report.sections[0].patternKeys.includes('target:본인'))
    assert.ok(report.sections[0].patternKeys.includes('relationship:혼자'))
    assert.ok(report.sections[0].patternKeys.includes('work:직장 다녀요'))
    assert.ok(report.sections[0].classification.includes('일간'))
    assert.ok(report.sections[0].interpretation.includes('정재용'))
    assert.ok(report.sections.some((section) => section.id === 'relationship-orientation'))
    assert.ok(report.sections.some((section) => section.id === 'work-context'))
    assert.ok(report.sections.some((section) => section.ragTopics.some((topic) => topic.includes('직장'))))
    assert.ok(report.sections.some((section) => (
      section.interpretation.includes('주의할')
      || section.interpretation.includes('미리 봐야 할 위험 신호')
      || section.interpretation.includes('미리 막아야 할')
    )))
    assert.ok(report.quality)
    assert.ok(report.quality.overallPercent >= 80)
    assert.ok(report.quality.ragUsagePercent >= 80)
    assert.ok(report.quality.categories.some((category) => category.id === 'useful-god'))
    assert.ok(report.quality.categories.some((category) => category.id === 'rag-precision'))
    assert.ok(report.quality.categories.every((category) => category.completenessPercent > 0))
  })

  it('올해 연애운 단일 상품은 상대 사주 문맥을 가진 10개 전용 섹션을 만든다', () => {
    const analysis = analyzeSaju(sampleBirth)
    const loveContext: SajuReportContext = {
      name: '정재용',
      target: '본인',
      serviceKey: 'love_this_year',
      concern: '올해 새로운 연애가 들어오는 시기와 놓치기 쉬운 타이밍이 궁금해요.',
      relationship: '마음에 둔 사람이 있어요',
      orientation: '이성 관계 중심',
      work: '일상 흐름',
      partner: {
        mode: 'known',
        name: '상대',
        relationship: '썸/관심 상대',
        birthTimeKnown: false,
        birth: {
          year: 1991,
          month: 4,
          day: 12,
          hour: 12,
          minute: 0,
          gender: 'female',
          calendar: 'solar',
        },
      },
    }
    const report = buildTemplateSajuReport(analysis, sampleBirth, loveContext)

    assert.equal(report.sections.length, 10)
    assert.deepEqual(report.sections.map((section) => section.id), [
      'love-year-possibility',
      'love-attraction-pattern',
      'love-dohwa-months',
      'love-spouse-star',
      'love-monthly-flow',
      'love-progress-timing',
      'love-missed-signals',
      'love-partner-compatibility',
      'love-emotion-temperature',
      'love-action-strategy',
    ])
    assert.ok(report.title.includes('올해 연애운'))
    assert.ok(report.sections[0].patternKeys.includes('service:love_this_year'))
    assert.ok(report.sections[7].storytelling)
    assert.ok(
      report.sections[7].interpretation.includes('상대')
      || report.sections[7].interpretation.includes('궁합'),
    )
    assert.ok(report.sections.every((section) => section.storytelling?.imagePrompt.ko))
    assert.ok(report.sections.some((section) => section.ragTopics.some((topic) => topic.includes('연애') || topic.includes('궁합'))))
    assert.ok(report.sections[0].hook !== report.sections[0].category)
    assert.notEqual(createReportId(sampleBirth, sampleContext), createReportId(sampleBirth, loveContext))
  })

  it('같은 사주와 맥락은 같은 reportId로 저장된다', async () => {
    const analysis = analyzeSaju(sampleBirth)
    const templateReport = buildTemplateSajuReport(analysis, sampleBirth, sampleContext)
    const corpus = getCorpusSnapshot()
    const reportId = createReportId(sampleBirth, sampleContext)

    const first = await createOrGetReportRecord({
      reportId,
      birth: sampleBirth,
      context: sampleContext,
      templateReport,
    })
    const second = await createOrGetReportRecord({
      reportId,
      birth: sampleBirth,
      context: sampleContext,
      templateReport,
    })

    assert.equal(first.record.reportId, second.record.reportId)
    assert.equal(second.created, false)
    assert.equal(toClientReport(second.record).reportId, reportId)
    assert.equal(toClientReport(second.record).corpus?.fingerprint, corpus.fingerprint)
  })

  it('코퍼스 지문이 바뀌면 같은 입력도 새 reportId를 만든다', () => {
    const oldCorpusId = createReportId(sampleBirth, sampleContext, 'corpus-v1')
    const newCorpusId = createReportId(sampleBirth, sampleContext, 'corpus-v2')

    assert.notEqual(oldCorpusId, newCorpusId)
  })

  it('저장된 리포트 목록은 계정 고유 ID로 분리된다', async () => {
    const analysis = analyzeSaju(sampleBirth)
    const report = buildTemplateSajuReport(analysis, sampleBirth, sampleContext)
    const timestamp = new Date().toISOString()
    const ownerA = { id: 'user-history-a', email: 'a@example.com', provider: 'google' }
    const ownerB = { id: 'user-history-b', email: 'b@example.com', provider: 'kakao' }

    await saveReportRecord({
      reportId: 'history-owner-a',
      birth: sampleBirth,
      context: sampleContext,
      owner: ownerA,
      report,
      status: 'complete',
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    await saveReportRecord({
      reportId: 'history-owner-b',
      birth: sampleBirth,
      context: sampleContext,
      owner: ownerB,
      report,
      status: 'complete',
      createdAt: timestamp,
      updatedAt: timestamp,
    })

    const records = await listReportRecords(ownerA)
    const reportIds = records.map((record) => record.reportId)

    assert.ok(reportIds.includes('history-owner-a'))
    assert.ok(!reportIds.includes('history-owner-b'))

    assert.equal(await deleteReportRecord('history-owner-b', ownerA), false)
    assert.equal(await deleteReportRecord('history-owner-a', ownerA), true)
  })
})
