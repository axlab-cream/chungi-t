import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import {
  buildLoveThisYearContext,
  buildLoveThisYearReport,
  createLoveThisYearReportId,
  LOVE_THISYEAR_TOC,
  parseLoveThisYearRequest,
} from '../../src/love/thisyear-service.js'
import type { BirthInput } from '../../src/types/index.js'

const birth: BirthInput = {
  year: 1994,
  month: 3,
  day: 11,
  hour: 9,
  minute: 0,
  gender: 'female',
  calendar: 'solar',
}

test('올해 연애운 builds a dedicated this-year report', () => {
  const input = parseLoveThisYearRequest({
    relationship_status: 'some',
    partner_star_basis: 'gender_auto',
    gender: 'female',
    display_name: '민지',
    concern: '연락은 오는데 만나자는 말이 없어요.',
  })
  const analysis = analyzeSaju(birth)
  const context = buildLoveThisYearContext('민지', input)
  const reportId = createLoveThisYearReportId('user-1', birth, input)
  const report = buildLoveThisYearReport(analysis, birth, context, input, reportId)

  assert.equal(report.reportId, reportId)
  assert.equal(report.title, '올해 연애운 해석문')
  assert.equal(report.sections.length, 48)
  assert.equal(new Set(report.sections.map((section) => section.category)).size, 8)

  // 05 목차 and 06 상세 route on the design's own section ids.
  assert.equal(report.sections[0].id, 'overall-love-mode-on')
  LOVE_THISYEAR_TOC.forEach((group) => {
    const owned = report.sections.filter((section) => group.items.some((item) => item.id === section.id))
    assert.equal(owned.length, group.items.length, `${group.id} 의 중분류 수가 목차와 다릅니다`)

    // Items inside one 대분류 must read differently, or the 05 목차 and 06 상세 would
    // show the same paragraph several times in a row.
    const bodies = owned.map((section) => section.interpretation.split('\n\n')[1])
    assert.equal(new Set(bodies).size, owned.length, `${group.id} 의 항목들이 서로 다르게 읽혀야 합니다`)
  })

  // 06 상세 lays six authored blocks over six paragraphs; a shorter reading would leave
  // one of those blocks holding the design's sample copy.
  report.sections.forEach((section) => {
    assert.ok(section.interpretation.split('\n\n').length >= 6, `${section.id} 문단이 6개보다 적습니다`)
  })

  // The reading has to reach the reader's own saju and input, not a generic template.
  const opening = report.sections[0].interpretation
  assert.match(opening, /도화/)
  assert.match(opening, /세운|대운/)
  assert.match(opening, /애인성|관성|재성/)
  assert.match(opening, /썸/)
  assert.match(opening, /연락은 오는데 만나자는 말이 없어요/)

  // Korean particles: a 지지 or 오행 label must never be followed by the wrong 조사.
  report.sections.forEach((section) => {
    assert.doesNotMatch(section.interpretation, /\)라 /, `${section.id} 조사 오류`)
  })

  // Corpus scaffolding must never reach the page.
  report.sections.forEach((section) => {
    assert.doesNotMatch(section.interpretation, /concept:|condition:|Feature JSON|출력하지|사용자/)
  })
})

test('올해 연애운 reads a different 대분류 from a different angle', () => {
  const input = parseLoveThisYearRequest({ relationship_status: 'solo', partner_star_basis: 'official_star' })
  const analysis = analyzeSaju(birth)
  const context = buildLoveThisYearContext('민지', input)
  const report = buildLoveThisYearReport(analysis, birth, context, input, 'angle-check')

  // 총평 opens on 도화, 궁합 opens on 배우자성; if both opened the same way the whole
  // report would read as one repeated paragraph.
  const overall = report.sections.find((section) => section.category === '올해 연애 가능성 총평')
  const compatibility = report.sections.find((section) => section.category === '상대/궁합 풀이')
  assert.ok(overall && compatibility)
  assert.match(overall.interpretation.split('\n\n')[1], /도화/)
  assert.match(compatibility.interpretation.split('\n\n')[1], /애인성/)
})

test('올해 연애운 request validates its required answers', () => {
  assert.throws(() => parseLoveThisYearRequest({}), /관계 상태/)
  assert.throws(() => parseLoveThisYearRequest({ relationship_status: 'solo' }), /애인성 기준/)
  assert.throws(
    () => parseLoveThisYearRequest({ relationship_status: 'solo', partner_star_basis: 'gender_auto' }),
    /성별/,
  )
  const input = parseLoveThisYearRequest({ relationship_status: 'dating', partner_star_basis: 'wealth_star' })
  assert.equal(input.relationshipStatus, '연애 중')
  assert.equal(input.partnerStarBasis, 'wealth_star')
})
