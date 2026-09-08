import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import { explainFirstTerms } from '../../src/report/copy-guide.js'
import { standardReading } from '../../src/report/standard-reading.js'
import { groundedReportFeatures } from '../../src/report/report-generator.js'
import { reportedState } from '../../src/report/practical-service-copy.js'
import { savedDailyFortune } from '../../src/report/daily-report.js'
import { guardPreview } from '../../src/report/report-preview.js'
import { reviewInterpretation } from '../../src/report/interpretation-validation.js'
import { findReportRecord, toClientReport, withReportBirthCertainty } from '../../src/report/report-store.js'
import type { UserBirthProfile } from '../../src/user/profile-store.js'

const birth = { year: 1994, month: 4, day: 15, hour: 12, gender: 'female' as const, calendar: 'solar' as const }
const analysis = analyzeSaju(birth)

describe('readability, uncertainty and daily snapshot regression', () => {
  it('explains original terms once without nested definitions or ordinary 인성 expansion', () => {
    const text = explainFirstTerms('원국은 명식의 기본입니다. 십성은 관계를 봅니다. 일간(태어난 날의 첫 글자)은 기준입니다. 인성검사와 상사의 인성이 나쁘다는 판단은 다릅니다.')
    assert.doesNotMatch(text, /\([^)]*\(/)
    assert.match(text, /일간\(태어난 날의 첫 글자\)/)
    assert.match(text, /인성검사와 상사의 인성이/)
    assert.equal(explainFirstTerms(text), text)
  })
  it('does not rewrite quoted customer input', () => {
    assert.equal(explainFirstTerms('“일간신문을 읽어요. 상사의 인성이 불편해요”'), '“일간신문을 읽어요. 상사의 인성이 불편해요”')
  })
  it('does not read dissatisfaction and instability as a settled state', () => {
    for (const concern of ['불만족합니다', '불안정하고 갈등이 큽니다', '만족하지 못합니다']) {
      assert.doesNotMatch(standardReading('concern-loop', '현재 고민', analysis, { concern }), /잘 유지되는 상태를 확인/)
      assert.equal(reportedState(concern), 'concern')
    }
  })
  it('keeps missing housing information distinct from an explicit empty choice', () => {
    assert.match(standardReading('home-fit-overall', '집', analysis, { serviceKey: 'home_fit', home: {} }), /선택은 아직 확인되지/)
    assert.match(standardReading('home-fit-overall', '집', analysis, { serviceKey: 'home_fit', home: { painPoints: [] } }), /선택된 주거 불편 항목은 없습니다/)
  })
  it('translates career enums and reflects work already done', () => {
    const text = standardReading('ninety-day-action', '이동 준비', analysis, { serviceKey: 'work_move', workMove: { currentCompanySignal: 'role_blur', realityChecks: ['resume_ready', 'offer_terms_checked'] } })
    assert.doesNotMatch(text, /role_blur|resume_ready|offer_terms_checked/)
    assert.match(text, /이력서·포트폴리오 정리 · 제안·계약 조건 확인/)
  })
  it('removes provisional hour-dependent calculations from LLM evidence', () => {
    const features = groundedReportFeatures(analysis, { birthTimeKnown: false }) as Record<string, unknown>
    assert.equal(features.balance, undefined)
    assert.equal((features.calculation as { pillars: { hour?: unknown } }).pillars.hour, undefined)
    assert.notEqual(withReportBirthCertainty('old-id', false), 'old-id')
    assert.equal(withReportBirthCertainty('old-id', true), 'old-id')
  })
  it('makes both teaser headline and insight respect a stated refusal, including old previews', () => {
    const unsafe = { title: '관계', headline: '먼저 보내도 되는 한 문장', summary: '다음에 이야기하고 싶은데 언제가 편할까?', insights: ['메시지를 보내보세요'], signals: [], paidValue: '전체 풀이' }
    const safe = guardPreview(unsafe, { serviceKey: 'love_mind', concern: '상대가 차단하고 연락을 원하지 않는다고 했어요' })
    assert.match(safe.headline, /연락하지 않고/)
    assert.doesNotMatch(JSON.stringify(safe), /언제가 편할까|먼저 보내도|메시지를 보내보세요/)
    assert.deepEqual(guardPreview(unsafe, { serviceKey: 'love_mind', concern: '차단당할까 걱정이에요' }), unsafe)
  })
  it('rejects outcome-determining exam language found in live QA', () => {
    assert.equal(reviewInterpretation('변수를 크게 만들지 않는 사람이 이기는 시험이네.', { serviceKey: 'pass_angle' }).passed, false)
    assert.ok(reviewInterpretation('내일의 승부는 규칙을 지키는 장면에서 갈리네.', { serviceKey: 'pass_angle' }).issues.some((item) => item.includes('승패')))
  })
  it('blocks the certainty words the guide forbids outright', () => {
    for (const line of ['이 흐름이면 무조건 정리됩니다.', '올해 안에 100% 결정이 납니다.', '지금 나가면 망한다.', '이대로면 이혼한다.', '그 달에 사고가 난다.']) {
      const review = reviewInterpretation(line, { serviceKey: 'work_quit' })
      assert.ok(
        review.issues.some(issue => issue.includes('확정 예언')),
        `${line} — 확정 예언으로 걸리지 않았습니다`,
      )
    }
    // 조건과 가능성으로 쓴 문장은 통과해야 한다.
    const safe = reviewInterpretation('조건이 그대로면 정리가 늦어질 수 있습니다.', { serviceKey: 'work_quit' })
    assert.equal(safe.issues.some(issue => issue.includes('확정 예언')), false)
  })

  it('catches the same long sentence written twice, not just duplicate paragraphs', () => {
    // 문단 중복 검사만으로는 문단 안에서 반복된 문장을 놓친다. 가이드는 45자 기준이다.
    const sentence = '일이 커질 때 사람과 도구를 먼저 늘리는 습관이 있으면 수입이 들어오기 전에 나갈 돈부터 늘어날 수 있습니다.'
    assert.ok(sentence.replace(/\s+/g, '').length >= 45)
    const repeated = reviewInterpretation(`${sentence} 먼저 확인할 것을 정리합니다.

${sentence}`, { serviceKey: 'money_save' })
    assert.ok(repeated.issues.some(issue => issue.includes('같은 문장을 두 번')), '문장 반복이 걸리지 않았습니다')
    const once = reviewInterpretation(`${sentence} 먼저 확인할 것을 정리합니다.`, { serviceKey: 'money_save' })
    assert.equal(once.issues.some(issue => issue.includes('같은 문장을 두 번')), false)
  })

  it('does not let a missing birth time become a 시주 conclusion', () => {
    const asserted = reviewInterpretation('시주(時柱)가 강해서 밤 시간대의 결정이 유리합니다.', { serviceKey: 'saju_master', birthTimeKnown: false })
    assert.ok(asserted.issues.some(issue => issue.includes('시주를 근거로 단정')), '시주 단정이 걸리지 않았습니다')
    // 시간을 모른다고 밝히는 문장은 정상이다.
    const disclosed = reviewInterpretation('출생 시각이 없어 시주까지는 좁히기 어렵습니다. 대신 확인할 조건은 분명합니다.', { serviceKey: 'saju_master', birthTimeKnown: false })
    assert.equal(disclosed.issues.some(issue => issue.includes('시주를 근거로 단정')), false)
    // 시간을 받은 경우에는 같은 문장이 문제가 아니다.
    const known = reviewInterpretation('시주(時柱)가 강해서 밤 시간대의 결정이 유리합니다.', { serviceKey: 'saju_master', birthTimeKnown: true })
    assert.equal(known.issues.some(issue => issue.includes('시주를 근거로 단정')), false)
  })

  it('saves a daily result with IDs and recalls the old day rather than replacing it', async () => {
    const owner = { id: 'daily-snapshot-owner' }
    const profile: UserBirthProfile = { userId: owner.id, name: '합성 점검', birth, birthTimeKnown: true, context: {}, createdAt: '', updatedAt: '' }
    const first = await savedDailyFortune(profile, owner, new Date('2026-09-07T01:00:00Z'))
    const repeated = await savedDailyFortune(profile, owner, new Date('2026-09-07T14:00:00Z'))
    const nextDay = await savedDailyFortune(profile, owner, new Date('2026-09-08T01:00:00Z'))
    assert.equal(first.resultId, repeated.resultId)
    assert.notEqual(first.resultId, nextDay.resultId)
    const recalled = await findReportRecord(first.resultId!, owner)
    assert.deepEqual(recalled?.auxiliary?.todayFortune, first.auxiliary?.todayFortune)
    assert.equal(recalled?.auxiliary?.todayFortune?.date.iso, '2026-09-07')
    assert.equal(toClientReport(first).sections[0].status, 'complete')
    assert.match(toClientReport(first).sections[0].generationId!, /^[0-9a-f-]{36}$/)
    await assert.rejects(findReportRecord(first.resultId!, { id: 'different-owner' }), /REPORT_ACCESS_DENIED/)
  })
})
