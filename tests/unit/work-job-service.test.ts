import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import {
  buildWorkJobContext,
  buildWorkJobReport,
  createWorkJobReportId,
  parseWorkJobRequest,
} from '../../src/work/job-service.js'
import type { BirthInput } from '../../src/types/index.js'

const birth: BirthInput = {
  year: 1992,
  month: 8,
  day: 20,
  hour: 12,
  minute: 0,
  gender: 'male',
  calendar: 'solar',
}

test('work job service builds a dedicated job fit report', () => {
  const input = parseWorkJobRequest({
    currentJob: '브랜드 마케팅',
    workStyle: '기획과 표현이 많은 일',
    mainStress: '평가와 인정 부족',
    wantedDirection: '성과가 보이는 일',
    concern: '지금 일이 나랑 맞는지 모르겠습니다.',
  })
  const analysis = analyzeSaju(birth)
  const context = buildWorkJobContext('홍길동', input)
  const reportId = createWorkJobReportId('user-1', birth, input)
  const report = buildWorkJobReport(analysis, birth, context, input, reportId)

  assert.equal(report.reportId, reportId)
  assert.equal(report.title, '직업운 해석문')
  assert.equal(report.sections.length, 21)
  assert.deepEqual(Array.from(new Set(report.sections.map((section) => section.category))), [
    '지금 일이 내 명식과 맞는가',
    '관성과 식상이 말하는 일의 방식',
    '월주가 보여주는 사회적 무대',
    '돈보다 먼저 봐야 할 적성의 구조',
    '남을지 바꿀지 정하는 순서',
  ])
  assert.match(report.sections[0].interpretation, /관성|식상|적성|직업/)
  assert.match(report.sections[0].interpretation, /브랜드 마케팅/)
})

test('work job request requires current job', () => {
  assert.throws(() => parseWorkJobRequest({ currentJob: '' }), /현재 하는 일/)
  assert.throws(() => parseWorkJobRequest({ currentJob: '일' }), /2자 이상/)
})
