import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import {
  buildWorkQuitContext,
  buildWorkQuitReport,
  createWorkQuitReportId,
  parseWorkQuitRequest,
  WORK_QUIT_TOC,
} from '../../src/work/quit-service.js'
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

test('work quit service builds a dedicated resignation report', () => {
  const input = parseWorkQuitRequest({
    reason: '사람',
    tenure: '오래 버틴 상태',
    candidateDate: '다음 평가 이후',
    nextPlan: '이직 준비 중',
    concern: '나가면 후련할 것 같은데 막상 말하려니 죄책감이 올라와요.',
  })
  const analysis = analyzeSaju(birth)
  const context = buildWorkQuitContext('민지', input)
  const reportId = createWorkQuitReportId('user-1', birth, input)
  const report = buildWorkQuitReport(analysis, birth, context, input, reportId)

  assert.equal(report.reportId, reportId)
  assert.equal(report.title, '퇴사운 해석문')
  assert.equal(report.sections.length, 48)
  assert.deepEqual(Array.from(new Set(report.sections.map((section) => section.category))), [
    '지금 나와도 되는 흐름?',
    '왜 이렇게 힘든가',
    '번아웃 체크',
    '돈 시뮬레이션',
    '나가면 뭐 할 사람인가',
    '퇴사 타이밍',
    '나가는 방식',
    '남는다면',
    '멘탈과 주변',
    '현실 액션 플랜',
  ])

  // 05 목차 links on `?section=<group id>`, and 06 상세 renders that group's three points.
  assert.equal(report.sections[0].id, 'flow-1')
  assert.equal(report.sections.at(-1)!.id, 'action-plan-5')
  assert.match(report.sections.at(-1)!.interpretation, /퇴사 여부를 결정하는 명령이 아니에요/)
  WORK_QUIT_TOC.forEach((group) => {
    const owned = report.sections.filter((section) => section.id.startsWith(`${group.id}-`))
    assert.equal(owned.length, group.items.length, `${group.id} 는 제공된 리딩 포인트를 모두 가져야 합니다`)
  })

  // The reading has to reach the reader's own input and their saju, not a generic template.
  assert.match(report.sections[0].interpretation, /관성|식상|대운|퇴사/)
  assert.match(report.sections.map((section) => section.interpretation).join('\n'), /사람/)
  assert.match(report.sections.map((section) => section.interpretation).join('\n'), /이직 준비 중/)

  // Each 대분류 opens on its own angle, so the 05 목차 never shows ten copies of one line.
  const firstOfEachGroup = WORK_QUIT_TOC.map((group) => report.sections.find((section) => section.category === group.title)!)
  assert.equal(new Set(firstOfEachGroup.map((section) => section.interpretation.split('\n\n')[0])).size, 10)

  // The points under one 리딩 must read differently, or the 06 상세 화면 shows
  // the same paragraph several times in a row.
  WORK_QUIT_TOC.forEach((group) => {
    const owned = report.sections.filter((section) => section.id.startsWith(`${group.id}-`))
    const bodies = owned.map((section) => section.interpretation.split('\n\n').find((paragraph) => paragraph.startsWith('[확인할 장면]')))
    assert.equal(new Set(bodies).size, group.items.length, `${group.id} 의 포인트는 서로 다르게 읽혀야 합니다`)
  })

  // Corpus scaffolding must never reach the page.
  report.sections.forEach((section) => {
    assert.doesNotMatch(section.interpretation, /concept:|condition:|Feature JSON|출력하지|사용자/)
  })
})

test('work quit request requires a reason', () => {
  assert.throws(() => parseWorkQuitRequest({ reason: '' }), /이유를 선택/)
  assert.throws(() => parseWorkQuitRequest({ reason: '돈' }), /2자 이상/)
})
