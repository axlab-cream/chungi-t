import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import {
  buildWorkMoveContext,
  buildWorkMoveReport,
  createWorkMoveReportId,
  parseWorkMoveRequest,
} from '../../src/work/move-service.js'
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

test('work move service builds a dedicated career transition report', () => {
  const input = parseWorkMoveRequest({
    currentRole: '마케팅 대리',
    targetRole: '스타트업 PM',
    timing: '3개월 안',
    pressure: '성장 정체',
    concern: '지금 나가도 되는지 모르겠습니다.',
  })
  const analysis = analyzeSaju(birth)
  const context = buildWorkMoveContext('홍길동', input)
  const reportId = createWorkMoveReportId('user-1', birth, input)
  const report = buildWorkMoveReport(analysis, birth, context, input, reportId)

  assert.equal(report.reportId, reportId)
  assert.equal(report.title, '이직운 해석문')
  assert.equal(report.sections.length, 21)
  assert.deepEqual(Array.from(new Set(report.sections.map((section) => section.category))), [
    '지금, 옮길 신호가 온 것인가',
    '내 사주가 버티는 조직과 떠나는 조직',
    '대운과 세운이 말하는 이직 타이밍',
    '연봉보다 먼저 봐야 할 돈의 구조',
    '옮긴다면 이렇게, 남는다면 이렇게',
  ])
  assert.match(report.sections[0].interpretation, /대운|세운|관성|이직/)
  assert.match(report.sections[0].interpretation, /마케팅 대리/)
})

test('work move request requires current role', () => {
  assert.throws(() => parseWorkMoveRequest({ currentRole: '' }), /현재 하는 일/)
  assert.throws(() => parseWorkMoveRequest({ currentRole: '일' }), /2자 이상/)
})
