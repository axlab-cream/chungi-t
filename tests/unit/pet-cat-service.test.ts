import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import {
  buildCatCompatContext,
  buildCatCompatReport,
  CAT_COMPAT_TOC,
  createCatCompatReportId,
  parseCatCompatRequest,
} from '../../src/pet/cat-service.js'
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

const answers = {
  cat_nickname: '나비',
  cat_household: 'single_cat',
  cat_age_band: 'adult',
  cat_behavior_tags: ['shy', 'sensitive', 'night_runner'],
  cat_touch_style: 'short_touch',
  cat_play_energy: 'night',
  routine_flags: ['sleep_conflict', 'food_rhythm'],
  focus_area: 'distance',
  upcoming_event: 'clinic',
  free_note: '밤에 자꾸 깨워서 잠을 못 자요.',
}

test('고양이 궁합 builds a dedicated cat report', () => {
  const input = parseCatCompatRequest({ ...answers })
  const analysis = analyzeSaju(birth)
  const context = buildCatCompatContext('지민', input)
  const reportId = createCatCompatReportId('user-1', birth, input)
  const report = buildCatCompatReport(analysis, birth, context, input, reportId)

  assert.equal(report.reportId, reportId)
  assert.equal(report.title, '반려묘 생활 궁합 해석문')
  assert.equal(report.sections.length, 50)
  assert.equal(new Set(report.sections.map((section) => section.category)).size, 10)

  // 05 목차 and 06 상세 route on the design's own section ids.
  assert.equal(report.sections[0].id, 'guardian-dna')
  CAT_COMPAT_TOC.forEach((group) => {
    const owned = report.sections.filter((section) => group.items.some((item) => item.id === section.id))
    assert.equal(owned.length, group.items.length, `${group.id} 의 중분류 수가 목차와 다릅니다`)

    // Items inside one 대분류 must read differently, or the 05 목차 and 06 상세 would
    // show the same paragraph several times in a row.
    const bodies = owned.map((section) => section.interpretation.split('\n\n')[1])
    assert.equal(new Set(bodies).size, owned.length, `${group.id} 의 항목들이 서로 다르게 읽혀야 합니다`)
  })

  // 06 상세 lays five authored blocks over the reading; a shorter one would leave the
  // design's own sample copy in place.
  report.sections.forEach((section) => {
    assert.ok(section.interpretation.split('\n\n').length >= 6, `${section.id} 문단이 6개보다 적습니다`)
  })

  // The reading has to reach the guardian's own 원국 and this cat, not a template.
  const opening = report.sections[0].interpretation
  assert.match(opening, /나비/)
  assert.match(opening, /1묘 가정/)
  assert.match(opening, /낯가림/)
  assert.match(opening, /밤에 자꾸 깨워서 잠을 못 자요/)

  // 건강·수명은 이 서비스가 답할 자리가 아니라는 고지가 매 항목에 있어야 한다.
  report.sections.forEach((section) => {
    assert.match(section.interpretation, /수의사/, `${section.id} 안전 고지 누락`)
  })

  // Korean particles: a label must never be followed by the wrong 조사.
  report.sections.forEach((section) => {
    assert.doesNotMatch(section.interpretation, /리듬라|\)라 |수준라/, `${section.id} 조사 오류`)
  })

  // Corpus scaffolding must never reach the page, and neither may advice written for a
  // different domain — the corpus has no 반려묘 material to quote.
  report.sections.forEach((section) => {
    assert.doesNotMatch(section.interpretation, /concept:|condition:|Feature JSON|출력하지|사용자/)
    assert.doesNotMatch(section.interpretation, /이직|퇴사|연봉|오퍼|배우자|합격/, `${section.id} 타 도메인 문장 유입`)
  })
})

test('고양이 궁합 reads each 대분류 from its own seat', () => {
  const input = parseCatCompatRequest({ ...answers })
  const analysis = analyzeSaju(birth)
  const context = buildCatCompatContext('지민', input)
  const report = buildCatCompatReport(analysis, birth, context, input, 'seat-check')

  const distance = report.sections.find((section) => section.category === '거리감 궁합')
  const elements = report.sections.find((section) => section.category === '오행 밸런스 케어')
  const burnout = report.sections.find((section) => section.category === '집사 번아웃 방지')
  assert.ok(distance && elements && burnout)
  assert.match(distance.interpretation.split('\n\n')[1], /일지/)
  assert.match(elements.interpretation.split('\n\n')[1], /오행/)
  assert.match(burnout.interpretation.split('\n\n')[1], /인성/)
})

test('고양이 궁합 request validates its required answers', () => {
  assert.throws(() => parseCatCompatRequest({}), /이름 또는 애칭/)
  assert.throws(() => parseCatCompatRequest({ cat_nickname: '나비' }), /가정 형태/)
  assert.throws(
    () => parseCatCompatRequest({ cat_nickname: '나비', cat_household: 'single_cat' }),
    /손길/,
  )
  assert.throws(
    () => parseCatCompatRequest({ cat_nickname: '나비', cat_household: 'single_cat', cat_touch_style: 'short_touch' }),
    /놀이 에너지/,
  )

  // 고양이 생일은 모를 수 있고, 그때는 행동 태그만으로 읽는다.
  const parsed = parseCatCompatRequest({ ...answers, cat_age_band: '' })
  assert.equal(parsed.ageBand, 'unknown')
  assert.deepEqual(parsed.behaviorTags, ['낯가림', '예민함', '밤 우다다'])
})
