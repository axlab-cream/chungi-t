import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import type { BirthInput } from '../../src/types/index.js'
import { buildMoneySaveContext, buildMoneySaveReport, parseMoneySaveRequest } from '../../src/money/save-service.js'
import { buildWorkQuitContext, buildWorkQuitReport, parseWorkQuitRequest } from '../../src/work/quit-service.js'
import { buildWorkJobContext, buildWorkJobReport, parseWorkJobRequest } from '../../src/work/job-service.js'
import { buildJobChoiceContext, buildJobChoiceReport, parseJobChoiceRequest } from '../../src/work/jobchoice-service.js'
import { buildCatCompatContext, buildCatCompatReport, parseCatCompatRequest } from '../../src/pet/cat-service.js'
import { buildLuckyColorContext, buildLuckyColorReport, parseLuckyColorRequest } from '../../src/body/lucky-service.js'

const birth: BirthInput = { year: 1990, month: 5, day: 15, hour: 12, gender: 'female', calendar: 'solar' }
const analysis = analyzeSaju(birth)

test('normal saving and settled work are not rewritten as hidden failures', () => {
  const money = parseMoneySaveRequest({ moneyHabit: '월급의 절반을 자동저축하고 예산대로 지출합니다', incomePattern: '매월 고정 급여', leakPoint: '없음', relationSpending: '각자 정산', concern: '문제 없고 현재 방식을 잘 유지합니다' })
  const quit = parseWorkQuitRequest({ reason: '현재 만족하며 장기 계획을 검토합니다', tenure: '4년', nextPlan: '현재 자리 유지', concern: '소진 없고 관계도 좋음' })
  const job = parseWorkJobRequest({ currentJob: '기획자', mainStress: '없음', wantedDirection: '현재 만족을 유지', concern: '회복과 성과가 좋음' })
  const reports = [
    buildMoneySaveReport(analysis, birth, buildMoneySaveContext('검증', money), money),
    buildWorkQuitReport(analysis, birth, buildWorkQuitContext('검증', quit), quit),
    buildWorkJobReport(analysis, birth, buildWorkJobContext('검증', job), job),
  ]
  for (const report of reports) {
    const text = report.sections.map((section) => section.interpretation).join('\n')
    assert.match(text, /현재 만족|정상적인 저축/)
    assert.doesNotMatch(text, /눌린 표현이 퇴사 욕구|기운이 비어 있으니|기획자.이 |찾겠요|보았요|적었요|concept:|condition:|main_purpose|desk_position/)
    const scenes = report.sections.map((section) => section.interpretation.split('\n\n').find((p) => p.startsWith('[확인할 장면]')))
    assert.equal(new Set(scenes).size, report.sections.length)
  }
})

test('a positive offer may omit a concern and never receives a fabricated Ziwei placement', () => {
  const input = parseJobChoiceRequest({ companyName: '검증 회사', roleName: '기획', workMode: 'onsite', commute: '30분', salaryFeeling: 'high' })
  const report = buildJobChoiceReport(analysis, birth, buildJobChoiceContext('검증', input), input)
  const text = report.sections.map((section) => section.interpretation).join('\n')
  assert.match(text, /별도 우려 미입력/)
  assert.match(text, /검증된 자미두수 명반이 없/)
  assert.doesNotMatch(text, /궁이 보는 자리를 원국|대한에 해당하는|전면 출근로|쉬는 방식을 미리 정해 두지 않으면 소모가 빨리/)
})

test('cat routines marked none remain settled and single-cat homes do not acquire multi-cat conflict', () => {
  const input = parseCatCompatRequest({ catName: '나비', household: 'single_cat', ageBand: 'unknown', touchStyle: 'loves_touch', playEnergy: 'medium', routineFlags: ['none'], focusArea: 'today_action', upcomingEvent: 'none', note: '잘 지내며 특별한 문제 없음' })
  const report = buildCatCompatReport(analysis, birth, buildCatCompatContext('검증', input), input)
  assert.match(report.sections.find((section) => section.id === 'multi-cat-jealousy')!.interpretation, /현재 상황에 해당한다고 해석하지 않아요/)
  assert.match(report.sections[0].interpretation, /나이를 모르는 상태/)
  report.sections.forEach((section) => assert.doesNotMatch(section.interpretation, /식상이 얇아 마음이 있어도|인성이 얇아|당신 일간이 여린 편|돌봄.*부족해서/))
})

test('lucky reading distinguishes a small element count from absence and withholds personal body-rhythm claims', () => {
  const counts = { wood: 1, fire: 2, earth: 2, metal: 2, water: 1 }
  const modified = { ...analysis, elementCount: counts, weakElement: 'wood' as const, usefulGod: null }
  const input = parseLuckyColorRequest({})
  const report = buildLuckyColorReport(modified, birth, buildLuckyColorContext('검증', input), input)
  assert.match(report.sections[0].interpretation, /목\(木\)도 1개/)
  const text = report.sections.map((section) => section.interpretation).join('\n')
  assert.doesNotMatch(text, /원국에 아예 비어|몸이 먼저 열립니다|그 시간대의 리듬이 특히|반드시 .*방향/)
  assert.match(text, /용신.*확정되지 않았/)
  assert.match(text, /생체리듬을 알 수는 없/)
})
