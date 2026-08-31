import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import { buildTemplateSajuReport } from '../../src/report/report-generator.js'
import { REPORT_CHAPTERS } from '../../src/report/report-chapters.js'
import { createOrGetReportRecord, createReportId, toClientReport } from '../../src/report/report-store.js'
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
    assert.equal(report.chapters?.length, 20)
    assert.deepEqual(report.chapters?.map((chapter) => chapter.title), REPORT_CHAPTERS.map((chapter) => chapter.title))
    assert.equal(report.chapters?.[0]?.title, '너라는 사람부터 까보자')
    assert.equal(report.chapters?.[16]?.title, '네가 설레는 사람과 결국 남는 사람은 다르다')
    assert.equal(report.chapters?.[16]?.cta?.type, 'destiny-partner-sketch')
    assert.ok(report.chapters?.some((chapter) => chapter.points.some((point) => point.type === 'table')))
    assert.ok(report.chapters?.some((chapter) => chapter.points.some((point) => point.type === 'image')))
    assert.ok(report.chapters?.some((chapter) => chapter.points.some((point) => point.type === 'graph')))
    assert.ok(report.chapters?.some((chapter) => chapter.points.some((point) => point.type === 'formula')))
    assert.ok(report.chapters?.some((chapter) => chapter.points.some((point) => point.type === 'comparison')))
    const mappedSectionIds = report.chapters?.flatMap((chapter) => chapter.sectionIds) ?? []
    assert.equal(mappedSectionIds.length, report.sections.length)
    assert.equal(new Set(mappedSectionIds).size, report.sections.length)
    assert.deepEqual(
      mappedSectionIds.slice().sort(),
      report.sections.map((section) => section.id).sort(),
    )
    assert.ok(report.sections.some((section) => (
      section.interpretation.includes('주의할')
      || section.interpretation.includes('미리 봐야 할 위험 신호')
      || section.interpretation.includes('미리 막아야 할')
    )))
    assert.ok(report.quality)
    assert.ok(report.quality.overallPercent >= 95)
    assert.ok(report.quality.ragUsagePercent >= 80)
    assert.ok(report.quality.categories.some((category) => category.id === 'useful-god'))
    assert.ok(report.quality.categories.some((category) => category.id === 'rag-precision'))
    assert.ok(report.quality.categories.some((category) => category.id === 'paid-narrative-density'))
    assert.ok(report.quality.categories.some((category) => category.id === 'personal-scene-specificity'))
    assert.ok(report.quality.categories.some((category) => category.id === 'anti-repetition'))
    assert.ok(report.quality.categories.every((category) => category.completenessPercent > 0))
    assert.ok(report.sections.some((section) => /회의|카톡|월급|계좌|퇴근|소개/.test(section.interpretation)))
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
})
