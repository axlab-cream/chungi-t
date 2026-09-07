import assert from 'node:assert/strict'
import test from 'node:test'
import { analyzeSaju, getTenGod } from '../../src/saju/analyzer.js'
import { buildRelationshipReading, relationshipState } from '../../src/love/reading-content.js'
import * as thisyear from '../../src/love/thisyear-service.js'
import * as mind from '../../src/love/mind-service.js'
import * as again from '../../src/love/again-service.js'
import * as spouse from '../../src/love/spouse-service.js'
import * as signal from '../../src/love/signal-service.js'
import * as couple from '../../src/match/couple-service.js'
import * as marry from '../../src/match/marry-service.js'
import type { BirthInput, HeavenlyStem, SajuReport } from '../../src/types/index.js'

const birth: BirthInput = { year: 1992, month: 8, day: 20, hour: 12, minute: 0, gender: 'male', calendar: 'solar' }
const partnerBirth: BirthInput = { year: 1994, month: 9, day: 12, hour: 12, minute: 0, gender: 'female', calendar: 'solar' }
const analysis = analyzeSaju(birth)
const partnerAnalysis = analyzeSaju(partnerBirth)
const base = {
  relationship_status: 'dating', partner_star_basis: 'wealth_star', relationshipStatus: '연애 중',
  relationshipStage: '연애 중', partnerName: '합성 상대', partnerBirthText: '19940912',
  partnerBirth, partnerBirthTimeKnown: true, conflictPattern: '일정 조율', marriagePlan: '아직 정하지 않았어요',
  signalFocus: '연락 방식', contactPattern: '서로 편한 때 연락해요', recentSignal: '약속을 함께 정해요',
  breakupReason: '일정 차이', currentSignal: '서로 안부만 나눠요', breakupPeriod: '3개월',
  marriagePriority: '생활과 책임감', meetingRoute: '소개와 지인 모임',
}

function inputs(concern: string) {
  const body = { ...base, concern }
  return {
    love_this_year: thisyear.parseLoveThisYearRequest(body), love_mind: mind.parseLoveMindRequest(body),
    love_again: again.parseLoveAgainRequest(body), love_spouse: spouse.parseLoveSpouseRequest(body),
    couple_signal: signal.parseLoveSignalRequest(body), match_couple: couple.parseCoupleMatchRequest(body),
    marry_match: marry.parseMarryMatchRequest(body),
  }
}

function reports(concern: string): Record<string, SajuReport> {
  const i = inputs(concern)
  return {
    love_this_year: thisyear.buildLoveThisYearReport(analysis, birth, thisyear.buildLoveThisYearContext('합성 본인', i.love_this_year), i.love_this_year),
    love_mind: mind.buildLoveMindReport(analysis, birth, mind.buildLoveMindContext('합성 본인', i.love_mind, partnerAnalysis), i.love_mind, partnerAnalysis),
    love_again: again.buildLoveAgainReport(analysis, birth, again.buildLoveAgainContext('합성 본인', i.love_again, partnerAnalysis), i.love_again, partnerAnalysis),
    love_spouse: spouse.buildLoveSpouseReport(analysis, birth, spouse.buildLoveSpouseContext('합성 본인', i.love_spouse), i.love_spouse),
    couple_signal: signal.buildLoveSignalReport(analysis, partnerAnalysis, birth, signal.buildLoveSignalContext('합성 본인', i.couple_signal, partnerAnalysis), i.couple_signal),
    match_couple: couple.buildCoupleMatchReport(analysis, partnerAnalysis, birth, couple.buildCoupleMatchContext('합성 본인', i.match_couple, partnerAnalysis), i.match_couple),
    marry_match: marry.buildMarryMatchReport(analysis, partnerAnalysis, birth, marry.buildMarryMatchContext('합성 본인', i.marry_match, partnerAnalysis), i.marry_match),
  }
}

test('relationship state distinguishes missing, calm, concern and explicit refusal in every input field', () => {
  assert.equal(relationshipState({}), 'uncertain')
  assert.equal(relationshipState({ concern: '모르겠어요' }), 'uncertain')
  assert.equal(relationshipState({ concern: '갈등이나 문제는 없어요. 잘 지내요.' }), 'stable')
  assert.equal(relationshipState({ concern: '차단 없음. 폭력 없음. 갈등 없음.' }), 'stable')
  assert.equal(relationshipState({ concern: '차단당할까 걱정돼요.' }), 'concern')
  assert.equal(relationshipState({ concern: '차단인지 모르겠어요.' }), 'concern')
  assert.equal(relationshipState({ concern: '차단한 적은 없어요. 잘 지내요.' }), 'stable')
  assert.equal(relationshipState({ concern: '상대가 원하지 않는 만남을 강요했어요.' }), 'unsafe')
  assert.equal(relationshipState({ concern: '요즘 약속이 자주 바뀌어요.' }), 'concern')
  assert.equal(relationshipState({ concern: '문제는 없지만 연락하지 말라고 했어요' }), 'boundary')
  assert.equal(relationshipState({ relationship: '차단된 상태', signals: { 현재: '모르겠어요' } }), 'boundary')
  assert.equal(relationshipState({ signals: { 현재: '연락을 원하지 않는다고 했어요' } }), 'boundary')
})

test('unsafe behaviour is not misrepresented as the other person refusing contact', () => {
  const text = buildRelationshipReading({ serviceKey: 'love_again', category: 'repair', title: '관계를 회복하는 대화 순서', analysis, concern: '원하지 않는 만남을 강요하고 협박했어요.' })
  assert.match(text, /자신의 안전과 선택권을 먼저/)
  assert.doesNotMatch(text, /상대가 연락이나 접촉을 원하지 않는다는 내용|그리움|화해를 제안/)
  assert.ok(text.split('\n\n').length >= 6)
})

test('all seven services answer their own questions without raw corpus or a three-paragraph repeated essay', (t) => {
  const all = reports('약속을 정할 때 서로 가능한 시간을 알고 싶어요.')
  for (const [key, report] of Object.entries(all)) {
    const bodies = report.sections.map((section) => section.interpretation)
    const openings = report.sections.map((section) => section.interpretation.split('\n\n')[0])
    // Even repeated couple labels have a different communication/care/today focus.
    assert.equal(new Set(openings).size, report.sections.length, `${key}: duplicated answers`)
    for (const section of report.sections) {
      const paragraphs = section.interpretation.split(/\n\s*\n/)
      assert.ok(paragraphs.length >= 6, `${key}/${section.id}: fewer than six content paragraphs`)
      assert.ok(section.interpretation.length >= 550, `${key}/${section.id}: insufficient fallback detail`)
      assert.doesNotMatch(section.interpretation, /concept:|condition:|shortParagraph|counselingQuestions|commonMistakes|Feature JSON|RAG|[“”](?:로|을) 알려/)
    }
    if (['love_mind', 'love_again', 'love_spouse'].includes(key)) {
      assert.equal(new Set(report.sections.map((section) => section.interpretation.split('\n\n')[3])).size, 21, `${key}: examples must answer 21 different questions`)
      assert.equal(new Set(report.sections.map((section) => section.interpretation.split('\n\n')[4])).size, 21, `${key}: decision tests must be item-specific`)
    }
    t.diagnostic(JSON.stringify({ service: key, sections: bodies.length, paragraphs: 6, min: Math.min(...bodies.map((v) => v.length)), max: Math.max(...bodies.map((v) => v.length)), uniqueAnswers: new Set(openings).size, uniqueBodies: new Set(bodies).size }))
  }
})

test('calm input stays calm across all seven services without invented current problems', () => {
  for (const [key, report] of Object.entries(reports('현재 서로 잘 지내고 특별한 갈등이나 문제는 없어요.'))) {
    for (const section of report.sections) {
      assert.match(section.interpretation, /특별한 갈등이나 불편이 확인되지 않아요/, `${key}/${section.id}`)
      assert.match(section.interpretation, /일부러 갈등이나 불편을 찾을 필요는 없어요/, `${key}/${section.id}`)
      assert.doesNotMatch(section.interpretation, /당신은 회피형|상대는 바람|이미 마음이 떠났|결국 헤어질/)
    }
  }
})

test('explicit refusal overrides every contact, reconciliation and timing section', (t) => {
  for (const [key, report] of Object.entries(reports('상대가 차단했고 더 이상 연락하지 말라고 분명히 말했어요.'))) {
    const bodies = report.sections.map((section) => section.interpretation)
    for (const section of report.sections) {
      assert.match(section.interpretation.split('\n\n')[0], /재접촉을 멈추고/)
      assert.match(section.interpretation, /차단을 우회하거나 만날 장소를 찾아가는 행동은 하지 않아요/)
      assert.doesNotMatch(section.interpretation, /(?:보내|연락해|제안해|물어보|전해)\s*보세요/)
      assert.ok(section.interpretation.split('\n\n').length >= 6)
    }
    t.diagnostic(JSON.stringify({ service: key, state: 'refusal', sections: bodies.length, min: Math.min(...bodies.map((v) => v.length)), max: Math.max(...bodies.map((v) => v.length)), uniqueBodies: new Set(bodies).size, safetyOverride: bodies.length }))
  }
})

test('missing inputs do not become partner facts and Ziwei absence stays explicit', () => {
  const missing = buildRelationshipReading({ serviceKey: 'love_mind', category: 'compatibility', title: '서로에게 끌리는 오행의 결', analysis })
  assert.match(missing, /실제 장면은 충분하지 않아요/)
  assert.match(missing, /상대 명식은 제공되지 않았으므로/)
  assert.doesNotMatch(missing, /상대의 일지는/)
  const missingZiwei = buildRelationshipReading({ serviceKey: 'love_spouse', category: 'ziwei', title: '사주와 자미두수 자료를 겹쳐 보는 기준', analysis })
  assert.match(missingZiwei, /검증된 계산값이 있어야/)
  assert.match(missingZiwei, /현재는 자미두수 명반이 없어/)
  assert.doesNotMatch(missingZiwei, /당신의 부부궁에는|배우자는.*연봉|자미두수.*확정/)
})

test('yearly ten-god cards distinguish the calculated year from comparison concepts', () => {
  const report = reports('연락 방식에 대해 궁금해요.').love_this_year
  const yearGod = getTenGod(analysis.dayMaster, analysis.fortune!.yearPillar[0] as HeavenlyStem)
  const cards = report.sections.filter((section) => section.category === '세운 십성별 연애 무드')
  assert.equal(cards.length, 10)
  const active = cards.filter((section) => section.interpretation.includes('이 항목은 그 계산에 해당하는 개념'))
  assert.equal(active.length, 1)
  assert.ok(active[0].classification.startsWith(`${yearGod}:`))
  assert.equal(cards.filter((section) => section.interpretation.includes('올해 본인에게 해당한다고 적용하지 않고')).length, 9)
  assert.equal(new Set(cards.map((section) => section.interpretation.split('\n\n')[3])).size, 10)
})

test('seven report identities retain zero-minute compatibility and separate actual birth minutes', () => {
  const i = inputs('합성 질문')
  const noMinute = { ...birth }
  delete noMinute.minute
  const ids = {
    love_this_year: (b: BirthInput) => thisyear.createLoveThisYearReportId('synthetic-owner', b, i.love_this_year),
    love_mind: (b: BirthInput) => mind.createLoveMindReportId('synthetic-owner', b, i.love_mind),
    love_again: (b: BirthInput) => again.createLoveAgainReportId('synthetic-owner', b, i.love_again),
    love_spouse: (b: BirthInput) => spouse.createLoveSpouseReportId('synthetic-owner', b, i.love_spouse),
    couple_signal: (b: BirthInput) => signal.createLoveSignalReportId('synthetic-owner', b, i.couple_signal),
    match_couple: (b: BirthInput) => couple.createCoupleMatchReportId('synthetic-owner', b, i.match_couple),
    marry_match: (b: BirthInput) => marry.createMarryMatchReportId('synthetic-owner', b, i.marry_match),
  }
  for (const [key, create] of Object.entries(ids)) {
    assert.equal(create(birth), create(birth), `${key}: repeat identity`)
    assert.equal(create(birth), create(noMinute), `${key}: preserve historical zero-minute identity`)
    assert.notEqual(create(birth), create({ ...birth, minute: 30 }), `${key}: separate actual minutes`)
  }
})

test('partner birth minutes and current observations also belong to relationship identities', () => {
  const i = inputs('합성 질문')
  const changedBirth = { ...partnerBirth, minute: 30 }
  assert.notEqual(mind.createLoveMindReportId('x', birth, i.love_mind), mind.createLoveMindReportId('x', birth, { ...i.love_mind, partnerBirth: changedBirth }))
  assert.notEqual(again.createLoveAgainReportId('x', birth, i.love_again), again.createLoveAgainReportId('x', birth, { ...i.love_again, partnerBirth: changedBirth }))
  assert.notEqual(signal.createLoveSignalReportId('x', birth, i.couple_signal), signal.createLoveSignalReportId('x', birth, { ...i.couple_signal, partnerBirth: changedBirth }))
  assert.notEqual(couple.createCoupleMatchReportId('x', birth, i.match_couple), couple.createCoupleMatchReportId('x', birth, { ...i.match_couple, partnerBirth: changedBirth }))
  assert.notEqual(marry.createMarryMatchReportId('x', birth, i.marry_match), marry.createMarryMatchReportId('x', birth, { ...i.marry_match, partnerBirth: changedBirth }))
  assert.notEqual(again.createLoveAgainReportId('x', birth, i.love_again), again.createLoveAgainReportId('x', birth, { ...i.love_again, currentSignal: '차단됨' }))
  assert.notEqual(mind.createLoveMindReportId('x', birth, i.love_mind), mind.createLoveMindReportId('x', birth, { ...i.love_mind, recentSignal: '차단됨' }))
})
