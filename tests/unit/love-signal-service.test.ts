import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import {
  buildLoveSignalContext,
  buildLoveSignalReport,
  createLoveSignalReportId,
  LOVE_SIGNAL_TOC,
  parseLoveSignalRequest,
} from '../../src/love/signal-service.js'
import type { BirthInput } from '../../src/types/index.js'

const birth: BirthInput = {
  year: 1992,
  month: 8,
  day: 20,
  hour: 12,
  minute: 0,
  gender: 'female',
  calendar: 'solar',
}

test('love signal service builds a dedicated relationship signal report', () => {
  const input = parseLoveSignalRequest({
    relationshipStage: '연애 중',
    signalFocus: '연락 온도차',
    partnerName: '김하나',
    partnerBirthText: '19940912',
    partnerBirth: { gender: 'male', calendar: 'solar' },
    concern: '요즘 답장이 느려져서 자꾸 신경이 쓰여요.',
  })
  const analysis = analyzeSaju(birth)
  const partnerAnalysis = analyzeSaju(input.partnerBirth)
  const context = buildLoveSignalContext('민지', input, partnerAnalysis)
  const reportId = createLoveSignalReportId('user-1', birth, input)
  const report = buildLoveSignalReport(analysis, partnerAnalysis, birth, context, input, reportId)

  assert.equal(report.reportId, reportId)
  assert.equal(report.title, '관계 신호 해석문')
  assert.equal(report.sections.length, 70)
  assert.equal(new Set(report.sections.map((section) => section.category)).size, 10)

  // 05 목차 and 06 상세 route on the design's own section ids.
  assert.equal(report.sections[0].id, 'relationship_temperature_true_love')
  LOVE_SIGNAL_TOC.forEach((group) => {
    const owned = report.sections.filter((section) => group.items.some((item) => item.id === section.id))
    assert.equal(owned.length, group.items.length, `${group.id} 의 중분류 수가 목차와 다릅니다`)

    // Items inside one 대분류 must read differently, or the 05 목차 and 06 상세 would
    // show the same paragraph several times in a row.
    const bodies = owned.map((section) => section.interpretation.split('\n\n')[1])
    assert.equal(new Set(bodies).size, owned.length, `${group.id} 의 항목들이 서로 다르게 읽혀야 합니다`)
  })

  // The reading has to reach the reader's own input and both saju, not a generic template.
  assert.match(report.sections[0].interpretation, /일지|오행|대운/)
  assert.match(report.sections[0].interpretation, /연애 중/)
  assert.match(report.sections[0].interpretation, /연락 온도차/)
  assert.match(report.sections[0].interpretation, /김하나/)

  // This service must never present itself as proof of anything.
  assert.match(report.sections[0].interpretation, /판정하는 자리가 아니라|확인/)

  // Corpus scaffolding must never reach the page.
  report.sections.forEach((section) => {
    assert.doesNotMatch(section.interpretation, /concept:|condition:|Feature JSON|출력하지|사용자/)
  })
})

test('love signal request validates its required answers', () => {
  assert.throws(() => parseLoveSignalRequest({ relationshipStage: '' }), /현재 관계/)
  assert.throws(() => parseLoveSignalRequest({ relationshipStage: '연애 중', signalFocus: '' }), /신호를 선택/)
  assert.throws(
    () => parseLoveSignalRequest({ relationshipStage: '연애 중', signalFocus: '연락 온도차', partnerBirthText: '1994091' }),
    /8자리/,
  )
})
