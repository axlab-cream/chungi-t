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
