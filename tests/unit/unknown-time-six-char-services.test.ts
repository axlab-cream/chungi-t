import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSaju, sixCharAnalysis } from '../../src/saju/analyzer.js'
import { markBirthTimeReading, analysisForNewReport, partnerBirthTimeReading, UNKNOWN_HOUR_CELL, unknownBirthTimeReading, withholdsBirthTime } from '../../src/saju/unknown-time-reading.js'
import { buildRelationshipReading } from '../../src/love/reading-content.js'
import { partnerContextForAi, buildTemplateSajuReport } from '../../src/report/report-generator.js'
import { buildTodayFortune } from '../../src/saju/today-fortune.js'
import * as couple from '../../src/match/couple-service.js'
import * as marry from '../../src/match/marry-service.js'
import * as signal from '../../src/love/signal-service.js'
import * as money from '../../src/money/save-service.js'
import * as quit from '../../src/work/quit-service.js'
import * as job from '../../src/work/job-service.js'
import * as jobChoice from '../../src/work/jobchoice-service.js'
import { groundedReportFeatures } from '../../src/report/report-generator.js'
import { loveThisYearTeaserSection } from '../../src/love/thisyear-service.js'
import { workMoveTeaserSection } from '../../src/work/move-teaser.js'
import type { BirthInput, SajuReportContext, SajuReportSection } from '../../src/types/index.js'
import type { UserBirthProfile } from '../../src/user/profile-store.js'

// 10/15: 천명사주의 6글자 방식을 다른 서비스에 그대로 연결했다. 새로 만든 리포트(표시 있음)만 6글자, 예전 리포트는 보류.
const birth: BirthInput = { year: 1987, month: 6, day: 10, hour: 12, minute: 0, gender: 'female', calendar: 'solar' }
const raw = analyzeSaju(birth)
const six = sixCharAnalysis(raw)
const partnerBirth: BirthInput = { year: 1994, month: 9, day: 12, hour: 12, minute: 0, gender: 'male', calendar: 'solar' }
const chartSum = (sections: SajuReportSection[], from = 0, to?: number) =>
  sections.flatMap((s) => (s.storytelling?.chartPoints ?? []).slice(from, to)).reduce((sum, p) => sum + p.value, 0)
const tables = (sections: SajuReportSection[]) => sections.map((s) => s.storytelling?.tableMd ?? '').join('\n')

test('스위치: 상대만 시간을 몰라도 표시가 붙고, 상대 명식은 6글자로 만든다', () => {
  const context = markBirthTimeReading({ serviceKey: 'match_couple', birthTimeKnown: true, partner: { birthTimeKnown: false } })
  assert.equal(context.birthTimeReading, 'six_char')
  assert.equal(unknownBirthTimeReading(context), 'known')
  assert.equal(partnerBirthTimeReading(context), 'six_char')
  assert.equal(partnerBirthTimeReading({ serviceKey: 'match_couple', partner: { birthTimeKnown: false } }), 'withhold')
  assert.equal(analysisForNewReport(raw, 'match_couple', false).manseryeok?.hourPillarExcluded, true)
  assert.equal(analysisForNewReport(raw, 'match_couple', true), raw)
  assert.equal(analysisForNewReport(raw, 'lucky_color', false), raw)
  assert.equal(withholdsBirthTime({ serviceKey: 'money_save', birthTimeKnown: false }), true)
  assert.equal(withholdsBirthTime(markBirthTimeReading({ serviceKey: 'money_save', birthTimeKnown: false })), false)
})

test('커플 궁합: 둘 다 시간을 모르면 시간 칸은 입력하지 않음, 두 사람 그래프는 6글자 개수', () => {
  const input = couple.parseCoupleMatchRequest({ partnerName: '김하나', partnerBirthText: '19940912', partnerBirth: { gender: 'male', calendar: 'solar' }, relationshipStage: '연애 중', conflictPattern: '연락 속도와 빈도', concern: '같은 문제로 자꾸 다퉈요.' })
  const partner = analysisForNewReport(analyzeSaju(input.partnerBirth), 'match_couple', input.partnerBirthTimeKnown)
  const context = markBirthTimeReading({ ...couple.buildCoupleMatchContext('홍길동', input, partner, six), birthTimeKnown: false })
  const report = couple.buildCoupleMatchReport(six, partner, birth, context, input, 'r')
  const teaser = report.sections.slice(0, 2).map((section, index) => couple.coupleMatchTeaserSection(section, index, six, context))
  assert.match(tables(teaser), new RegExp(`태어난 시간 \\| ${UNKNOWN_HOUR_CELL} \\| ${UNKNOWN_HOUR_CELL}`))
  assert.equal(chartSum(teaser, 0, 5), 6)
  assert.equal(chartSum(teaser, 5), 6)
})

test('예전(보류) 커플 궁합: 시간 칸을 숨기고 그래프도 시간 기둥을 뺀 세 기둥 개수로 맞춘다', () => {
  const input = couple.parseCoupleMatchRequest({ partnerName: '김하나', partnerBirthText: '19940912', partnerBirth: { gender: 'male', calendar: 'solar' }, relationshipStage: '연애 중', conflictPattern: '연락 속도와 빈도', concern: '같은 문제로 자꾸 다퉈요.' })
  const partner = analyzeSaju(input.partnerBirth)
  // 표시 없는 예전 문맥 + 임시 8글자 명식
  const context = { ...couple.buildCoupleMatchContext('홍길동', input, partner, raw), birthTimeKnown: false }
  assert.equal(withholdsBirthTime(context), true)
  const report = couple.buildCoupleMatchReport(raw, partner, birth, context, input, 'r')
  const teaser = report.sections.slice(0, 2).map((section, index) => couple.coupleMatchTeaserSection(section, index, raw, context))
  assert.match(tables(teaser), new RegExp(`태어난 시간 \\| ${UNKNOWN_HOUR_CELL} \\| ${UNKNOWN_HOUR_CELL}`))
  assert.equal(chartSum(teaser, 0, 5), 6)
  assert.equal(chartSum(teaser, 5), 6)
})

test('결혼 궁합·관계 신호: 6글자 명식에서 시간 기둥을 한 번 더 빼지 않는다', () => {
  const marryInput = marry.parseMarryMatchRequest({ partnerName: '합성', partnerBirthText: '19940912', partnerBirth: { gender: 'male', calendar: 'solar' }, relationshipStage: '연애 중', marriagePlan: '아직', concern: '결혼 준비' })
  const marryPartner = analysisForNewReport(analyzeSaju(marryInput.partnerBirth), 'marry_match', marryInput.partnerBirthTimeKnown)
  const marryContext = markBirthTimeReading({ ...marry.buildMarryMatchContext('홍길동', marryInput, marryPartner, six), birthTimeKnown: false })
  const marryReport = marry.buildMarryMatchReport(six, marryPartner, birth, marryContext, marryInput, 'r')
  const marryTeaser = marryReport.sections.slice(0, 2).map((section, index) => marry.marryMatchTeaserSection(section, index, six, marryContext))
  assert.equal(chartSum(marryTeaser, 0, 5), 6)
  assert.equal(chartSum(marryTeaser, 5), 6)
  const signalInput = signal.parseLoveSignalRequest({ partnerName: '합성', partnerBirthText: '19940912', partnerBirth: { gender: 'male', calendar: 'solar' }, relationshipStage: '연애 중', signalFocus: '연락 방식', concern: '달라졌어요' })
  const signalPartner = analysisForNewReport(analyzeSaju(signalInput.partnerBirth), 'couple_signal', signalInput.partnerBirthTimeKnown)
  const signalContext = markBirthTimeReading({ ...signal.buildLoveSignalContext('홍길동', signalInput, signalPartner), birthTimeKnown: false })
  const signalReport = signal.buildLoveSignalReport(six, signalPartner, birth, signalContext, signalInput, 'r')
  const signalTeaser = signalReport.sections.slice(0, 2).map((section, index) => signal.loveSignalTeaserSection(section, index, six, signalContext))
  assert.equal(chartSum(signalTeaser, 0, 5), 6)
  assert.equal(chartSum(signalTeaser, 5), 6)
})

test('저축: 6글자 모드면 보류 문구 없이 6글자로 그리고, 시간 칸·시간 문장은 뺀다', () => {
  const input = money.parseMoneySaveRequest({ moneyHabit: '예산대로 씁니다', incomePattern: '월급', savingGoal: '여유자금', concern: '현재 습관 확인' })
  const context = markBirthTimeReading({ ...money.buildMoneySaveContext('홍길동', input), birthTimeKnown: false })
  const report = money.buildMoneySaveReport(six, birth, context, input, 'r')
  assert.doesNotMatch(report.subtitle, /출생 시간 미상/)
  const teaser = report.sections.slice(0, 2).map((section, index) => money.moneySaveTeaserSection(section, index, six, context))
  assert.match(tables(teaser), new RegExp(`태어난 시간 \\| ${UNKNOWN_HOUR_CELL}`))
  assert.doesNotMatch(teaser.map((s) => s.interpretation).join('\n'), /앞으로의 목표를 보는 태어난 시간은/)
  assert.equal(chartSum(teaser), 6)
  // 예전 리포트(표시 없음)는 그대로 보류한다.
  const old = money.buildMoneySaveReport(raw, birth, { ...money.buildMoneySaveContext('홍길동', input), birthTimeKnown: false }, input, 'r')
  assert.match(old.subtitle, /출생 시간 미상/)
})

test('퇴사: 6글자 모드면 보류 문구가 사라진다', () => {
  const input = { reason: '역할 확인', nextPlan: '조건 비교' }
  const context = markBirthTimeReading({ ...quit.buildWorkQuitContext('홍길동', input as never), birthTimeKnown: false })
  assert.doesNotMatch(quit.buildWorkQuitReport(six, birth, context, input as never, 'r').subtitle, /출생 시간 미상/)
})

test('올해 연애운·이직운 맛보기: 시간 칸은 입력하지 않음, 그래프는 6글자, 시간 기둥 문장 없음', () => {
  const love: SajuReportContext = markBirthTimeReading({ serviceKey: 'love_this_year', name: '테스트', birthTimeKnown: false, relationship: '솔로', concern: '올해 만남이 있을까' })
  const loveTeaser = buildTemplateSajuReport(raw, birth, love).sections.slice(0, 2).map((section, index) => loveThisYearTeaserSection(section, index, six, love))
  assert.match(tables(loveTeaser), new RegExp(`시간 기둥 \\| ${UNKNOWN_HOUR_CELL}`))
  assert.equal(chartSum(loveTeaser), 6)
  const move: SajuReportContext = markBirthTimeReading({ serviceKey: 'work_move', name: '민지', birthTimeKnown: false, workMove: { decisionMode: 'offer_review', currentCompanySignal: 'authority_blur', targetRole: 'AI Director' } })
  const moveTeaser = buildTemplateSajuReport(raw, birth, move).sections.slice(0, 2).map((section, index) => workMoveTeaserSection(section, index, six, move))
  assert.match(tables(moveTeaser), new RegExp(`태어난 시간 \\| ${UNKNOWN_HOUR_CELL}`))
  assert.doesNotMatch(JSON.stringify(moveTeaser), /앞으로 만들 커리어는/)
  assert.equal(chartSum(moveTeaser), 6)
})

test('연애·궁합 본문: 6글자 명식이면 대운은 실제 간지로 말하고 시간 기둥 십성은 근거에서 빠진다', () => {
  const timing = buildRelationshipReading({ serviceKey: 'love_mind', category: '흐름', title: '다시 가까워질 시기', analysis: six })
  assert.match(timing, new RegExp(raw.fortune!.currentDaewoon))
  assert.doesNotMatch(timing, /지금 대운\(/)
  assert.ok(six.manseryeok!.tenGodPlacements.every((p) => p.pillar !== 'hour'))
})

test('AI 상대 정보: 6글자 모드는 상대 6글자만 남기고, 보류 모드는 이름·관계만 넘긴다', () => {
  const partner = { mode: 'known' as const, name: '합성', relationship: '연인', birthTimeKnown: false, pillars: { year: '甲戌', month: '癸酉', day: '丙寅', hour: '甲午' }, pillarElements: { year: ['wood', 'earth'], month: ['water', 'metal'], day: ['fire', 'wood'], hour: ['wood', 'fire'] } as never, dominantElement: '목(木)' }
  const sixContext = partnerContextForAi({ serviceKey: 'match_couple', birthTimeReading: 'six_char', partner }) as { partner: Record<string, any> }
  assert.equal(sixContext.partner.pillars.hour, undefined)
  assert.equal(sixContext.partner.pillars.day, '丙寅')
  assert.equal(sixContext.partner.pillarElements.hour, undefined)
  assert.equal(sixContext.partner.dominantElement, '목(木)')
  const withheld = partnerContextForAi({ serviceKey: 'match_couple', partner }) as { partner: Record<string, any> }
  assert.deepEqual(Object.keys(withheld.partner).sort(), ['birthTimeKnown', 'mode', 'name', 'relationship'])
})

test('오늘의 운세: 시간을 모르면 몇 시를 넣었든 결과가 같다(임시 시지·임시 시각을 쓰지 않는다)', () => {
  const profile = (hour: number, birthTimeKnown: boolean): UserBirthProfile => ({ userId: '11111111-1111-4111-8111-111111111111', name: '테스트', birth: { ...partnerBirth, hour }, birthTimeKnown, context: { target: '본인' }, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' })
  // 응답의 profile 은 입력값을 되돌려 준 것이라 비교에서 뺀다(운세 내용만 본다).
  const reading = (hour: number, known: boolean, now: Date) => JSON.stringify({ ...buildTodayFortune(profile(hour, known), now), profile: undefined })
  let knownDiffers = 0
  for (let day = 0; day < 30; day++) {
    const now = new Date(Date.UTC(2026, 9, 1 + day, 3))
    const base = reading(12, false, now)
    for (const hour of [0, 6, 18, 23]) assert.equal(reading(hour, false, now), base)
    if (reading(0, true, now) !== reading(12, true, now)) knownDiffers++
  }
  // 시간을 알면 시각에 따라 달라진다(비교가 의미 있다는 확인).
  assert.ok(knownDiffers > 0)
})

test('직장 선택·직업운: 6글자 모드면 보류 문구가 사라지고, 예전 리포트는 그대로다', () => {
  const choiceInput = { companyName: '샘플회사', roleName: '기획', workMode: 'hybrid', commute: '편도 30분', salaryFeeling: 'better', concernPoint: '역할 확인' } as never
  const choice = jobChoice.buildJobChoiceReport(six, birth, markBirthTimeReading({ ...jobChoice.buildJobChoiceContext('홍길동', choiceInput), birthTimeKnown: false }), choiceInput, 'r')
  assert.doesNotMatch(choice.sections.map((s) => s.interpretation).join('\n'), /출생 시간을 모르므로|돌아보는 질문으로만 사용/)
  const jobInput = { currentJob: '기획', concern: '역할 확인' } as never
  const workJob = job.buildWorkJobReport(six, birth, markBirthTimeReading({ ...job.buildWorkJobContext('홍길동', jobInput), birthTimeKnown: false }), jobInput, 'r')
  assert.doesNotMatch(workJob.subtitle, /출생 시간 미상/)
  const oldJob = job.buildWorkJobReport(raw, birth, { ...job.buildWorkJobContext('홍길동', jobInput), birthTimeKnown: false }, jobInput, 'r')
  assert.match(oldJob.subtitle, /출생 시간 미상/)
})

test('AI 지시: 6글자에 없는 별은 없다고 확정하고 보이는 글자로 설명하라고 한다(10/15 결정)', () => {
  const features = groundedReportFeatures(raw, markBirthTimeReading({ serviceKey: 'money_save', birthTimeKnown: false })) as { uncertainty: string }
  assert.match(features.uncertainty, /"없다"고 확정/)
  assert.match(features.uncertainty, /6글자에 있는 글자로/)
})

test('대운 전환 직전 출생: 시간을 모르면 임시 12시 기준 대운 간지를 그대로 단정한다(10/15 결정)', () => {
  const transition: BirthInput = { year: 1960, month: 6, day: 18, hour: 12, minute: 0, gender: 'female', calendar: 'solar' }
  const analysis = analyzeSaju(transition)
  const context = markBirthTimeReading({ serviceKey: 'saju_master', birthTimeKnown: false })
  const future = buildTemplateSajuReport(analysis, transition, context).sections.find((s) => s.id === 'future-flow')!
  assert.ok(future.classification.startsWith(`${analysis.fortune!.currentDaewoon} · `))
})
