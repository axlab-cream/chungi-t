import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import {
  buildJobChoiceContext,
  buildJobChoiceReport,
  createJobChoiceReportId,
  JOB_CHOICE_TOC,
  parseJobChoiceRequest,
} from '../../src/work/jobchoice-service.js'
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

const offer = {
  companyName: 'A회사 최종 오퍼',
  roleName: '콘텐츠 기획',
  workMode: 'hybrid',
  commute: '왕복 90분, 주 2회 재택',
  salaryFeeling: 'low',
  decisionDate: '2026-09-20',
  concernPoint: '상사 스타일이 강해 보이고 역할 범위가 애매합니다.',
}

test('직장 선택 builds a dedicated job-choice report', () => {
  const input = parseJobChoiceRequest({ ...offer })
  const analysis = analyzeSaju(birth)
  const context = buildJobChoiceContext('지민', input)
  const reportId = createJobChoiceReportId('user-1', birth, input)
  const report = buildJobChoiceReport(analysis, birth, context, input, reportId)

  assert.equal(report.reportId, reportId)
  assert.equal(report.title, '직장 선택 해석문')
  assert.equal(report.sections.length, 57)
  assert.equal(new Set(report.sections.map((section) => section.category)).size, 10)

  // 05 목차 and 06 상세 route on the design's own section ids.
  assert.equal(report.sections[0].id, 'company-fit-01')
  JOB_CHOICE_TOC.forEach((group) => {
    const owned = report.sections.filter((section) => group.items.some((item) => item.id === section.id))
    assert.equal(owned.length, group.items.length, `${group.id} 의 중분류 수가 목차와 다릅니다`)

    // Items inside one 대분류 must read differently, or the 05 목차 and 06 상세 would
    // show the same paragraph several times in a row.
    const bodies = owned.map((section) => section.interpretation.split('\n\n').find((paragraph) => paragraph.startsWith('[확인할 장면]')))
    assert.equal(new Set(bodies).size, owned.length, `${group.id} 의 항목들이 서로 다르게 읽혀야 합니다`)
  })

  // 06 상세 lays three authored blocks plus an action and a caution over the reading;
  // a shorter one would leave the design's sample copy in place.
  report.sections.forEach((section) => {
    assert.ok(section.interpretation.split('\n\n').length >= 6, `${section.id} 문단이 6개보다 적습니다`)
  })

  // The reading has to reach the reader's own 원국 and this offer, not a generic template.
  const opening = report.sections[0].interpretation
  assert.match(opening, /관성\(官星, 조직의 역할과 책임/)
  assert.match(opening, /A회사 최종 오퍼/)
  assert.match(opening, /콘텐츠 기획/)
  assert.match(opening, /상사 스타일이 강해 보이고 역할 범위가 애매합니다/)

  // A verified Ziwei chart was not supplied; never substitute saju signals for palaces.
  report.sections.forEach((section) => {
    assert.doesNotMatch(section.interpretation, /궁이 보는 자리를 원국|대한에 해당하는|당신이 조직 안에서 책임을 지는 방식이 여기서 정해/)
  })

  // Korean particles: a label must never be followed by the wrong 조사.
  report.sections.forEach((section) => {
    assert.doesNotMatch(section.interpretation, /\)라 |수준라|오퍼 오퍼/, `${section.id} 조사 오류`)
  })

  // Corpus scaffolding must never reach the page.
  report.sections.forEach((section) => {
    assert.doesNotMatch(section.interpretation, /concept:|condition:|Feature JSON|출력하지|사용자/)
  })
})

test('직장 선택 compares actual offer conditions without inventing palaces', () => {
  const input = parseJobChoiceRequest({ ...offer })
  const analysis = analyzeSaju(birth)
  const context = buildJobChoiceContext('지민', input)
  const report = buildJobChoiceReport(analysis, birth, context, input, 'palace-check')

  const money = report.sections.find((section) => section.category === '돈값 하는 회사인가')
  const environment = report.sections.find((section) => section.category === '업무 환경')
  const mental = report.sections.find((section) => section.category === '멘탈·워라밸')
  assert.ok(money && environment && mental)
  assert.match(money.interpretation, /성과급|고정급|보상/)
  assert.match(environment.interpretation, /왕복 90분/)
  assert.match(mental.interpretation, /생활|시간/)
})

test('직장 선택 request validates its required answers', () => {
  assert.throws(() => parseJobChoiceRequest({}), /회사 또는 오퍼명/)
  assert.throws(() => parseJobChoiceRequest({ companyName: 'A회사' }), /직무/)
  assert.throws(() => parseJobChoiceRequest({ companyName: 'A회사', roleName: 'PM' }), /근무 형태/)
  assert.throws(
    () => parseJobChoiceRequest({ companyName: 'A회사', roleName: 'PM', workMode: 'hybrid' }),
    /출퇴근/,
  )
  assert.throws(
    () => parseJobChoiceRequest({ companyName: 'A회사', roleName: 'PM', workMode: 'hybrid', commute: '30분' }),
    /조건 체감/,
  )
  assert.equal(parseJobChoiceRequest({ companyName: 'A회사', roleName: 'PM', workMode: 'hybrid', commute: '30분', salaryFeeling: 'high' }).concernPoint, '별도 우려 미입력')

  const parsed = parseJobChoiceRequest({ ...offer })
  assert.equal(parsed.workMode, 'hybrid')
  assert.equal(parsed.decisionDate, '2026-09-20')
})
