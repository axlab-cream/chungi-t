import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import {
  buildHomePungsuContext,
  buildHomePungsuReport,
  createHomePungsuReportId,
  parseHomePungsuRequest,
} from '../../src/pungsu/home-service.js'
import type { BirthInput } from '../../src/types/index.js'

const birth: BirthInput = {
  year: 1990,
  month: 5,
  day: 14,
  hour: 12,
  minute: 0,
  gender: 'female',
  calendar: 'solar',
}

test('home pungsu service builds grouped report sections from address and survey', () => {
  const input = parseHomePungsuRequest({
    address: '서울특별시 강남구 도산대로 12길',
    homeType: '아파트',
    purpose: '휴식과 안정',
    survey: {
      entry_front: 'open',
      bed_wall: '북',
      kitchen_line: 'no',
      windows: { value: '남', count: 3 },
      corridor: 'wide',
    },
  })
  const context = buildHomePungsuContext('홍길동', input)
  const reportId = createHomePungsuReportId('user-1', birth, input)
  const report = buildHomePungsuReport(analyzeSaju(birth), birth, context, input, reportId)

  assert.equal(report.reportId, reportId)
  assert.equal(report.title, '집 풍수 해석문')
  assert.equal(report.sections.length, 22)
  assert.deepEqual(Array.from(new Set(report.sections.map((section) => section.category))), [
    '이 집, 나를 살리는 집인가',
    '내 팔자와 이 집의 숨은 궁합',
    '현관·침실·창문, 운이 새는 자리',
    '돈이 머무는 집, 일이 풀리는 집',
    '오늘 바꾸면 운이 달라지는 곳',
  ])
  assert.match(report.sections[0].interpretation, /서울특별시 강남구 도산대로 12길|일반 집 풍수 RAG/)
  assert.match(report.sections[0].interpretation, /문답 근거/)
})

test('home pungsu request requires a usable address', () => {
  assert.throws(() => parseHomePungsuRequest({ address: '' }), /주소를 입력/)
  assert.throws(() => parseHomePungsuRequest({ address: '서울' }), /시·군·구/)
})
