import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import { explainFirstTerms } from '../../src/report/copy-guide.js'
import { standardReading } from '../../src/report/standard-reading.js'
import { groundedReportFeatures } from '../../src/report/report-generator.js'
import { reportedState } from '../../src/report/practical-service-copy.js'
import { savedDailyFortune } from '../../src/report/daily-report.js'
import { createSavedPreview, guardPreview, reviewTeaser } from '../../src/report/report-preview.js'
import type { SajuReport } from '../../src/types/index.js'
import { reviewInterpretation } from '../../src/report/interpretation-validation.js'
import { findReportRecord, toClientReport, withReportBirthCertainty } from '../../src/report/report-store.js'
import type { UserBirthProfile } from '../../src/user/profile-store.js'

const birth = { year: 1994, month: 4, day: 15, hour: 12, gender: 'female' as const, calendar: 'solar' as const }
const analysis = analyzeSaju(birth)

describe('readability, uncertainty and daily snapshot regression', () => {
  it('does not mistake ordinary Korean ending in 두고도 for the terrain term 고도', () => {
    const review = reviewInterpretation('예를 들어 모니터 앞에서 메일을 열어 두고도 문장이 들어오지 않는다면 그 장면을 기록합니다.', { serviceKey: 'work_quit' })
    assert.equal(review.issues.some(issue => issue.includes('데이터 결손이나 내부 지형')), false)
  })

  it('distinguishes ordinary 고도화 wording from actual terrain labels', () => {
    const ordinary = reviewInterpretation('업무 자동화를 고도화하려면 먼저 반복 작업을 기록합니다. 그 기록을 비교합니다. 다음 기준도 남깁니다.', { serviceKey: 'work_quit' })
    assert.equal(ordinary.issues.some(issue => issue.includes('데이터 결손이나 내부 지형')), false)

    const terrain = reviewInterpretation('내부 자료의 고도를 그대로 표시합니다. 그 수치를 비교합니다. 다음 기준도 남깁니다.', { serviceKey: 'work_quit' })
    assert.equal(terrain.issues.some(issue => issue.includes('데이터 결손이나 내부 지형')), true)
  })

  it('accepts only a sourced teaser with one or two grounds, a scene and concrete paid scope', () => {
    const preview = {
      title: '이직 조건',
      headline: '지금은 제안 조건을 비교할 때입니다.',
      summary: '입력한 제안에서 역할 범위와 출근 조건이 함께 확인됐습니다.',
      insights: ['예를 들어 출근길에 이동 시간을 기록하면 조건 차이가 드러납니다.'],
      signals: ['예를 들어 출근길에 이동 시간을 기록하면 조건 차이가 드러납니다.'],
      paidValue: '전체 해석에서는 역할·보상·통근 조건 중 무엇부터 비교할지 3개 항목으로 확인합니다.',
    }
    assert.equal(reviewTeaser({ preview, sourceEvidence: preview.headline }).passed, true)

    const unsourced = reviewTeaser({ preview, sourceEvidence: '다른 판정만 저장되어 있습니다.' })
    assert.ok(unsourced.issues.some(issue => issue.includes('저장된 계산·해석 근거')))
    assert.equal(reviewTeaser({ preview: { ...preview, insights: [], signals: [] }, sourceEvidence: preview.headline }).passed, false)
    assert.equal(reviewTeaser({
      preview: { ...preview, insights: ['근거 하나입니다.', '근거 둘입니다.', '근거 셋입니다.'], signals: [] },
      sourceEvidence: preview.headline,
    }).passed, false)
    assert.equal(reviewTeaser({
      preview: { ...preview, summary: '두 조건이 함께 확인됐습니다.', insights: ['역할 범위도 확인됐습니다.'], signals: [] },
      sourceEvidence: preview.headline,
    }).passed, false)
    assert.equal(reviewTeaser({
      preview: { ...preview, paidValue: '전체 해석을 확인할 수 있습니다.' },
      sourceEvidence: preview.headline,
    }).passed, false)
  })

  it('rejects operations leakage, fake locked quotes, fear-loss pressure and unsupported prophecy', () => {
    const base = {
      title: '시험 흐름',
      headline: '오답을 다시 보는 순서가 먼저입니다.',
      summary: '최근 기록에서 같은 유형의 오답이 반복됐습니다.',
      insights: ['예를 들어 시험 전날에는 새 문제보다 오답 노트를 먼저 확인합니다.'],
      signals: ['예를 들어 시험 전날에는 새 문제보다 오답 노트를 먼저 확인합니다.'],
      paidValue: '전체 해석에서는 복습 순서와 시험 당일 판단 기준을 4개 항목으로 확인합니다.',
    }
    for (const paidValue of [
      '로그인 상태와 서버 권한을 확인한 뒤 전체 해석을 엽니다.',
      '잠긴 본문에는 “당신은 곧 합격한다”라는 답이 있습니다.',
      '지금 결제하지 않으면 기회를 놓치고 후회합니다.',
    ]) {
      const review = reviewTeaser({ preview: { ...base, paidValue }, sourceEvidence: base.headline })
      assert.equal(review.passed, false, paidValue)
    }
    assert.throws(
      () => guardPreview({ ...base, paidValue: '지금 결제하지 않으면 기회를 놓치고 후회합니다.' }, { serviceKey: 'pass_angle' }),
      /저장 티저 안전 검수/,
    )
    const prophecy = { ...base, headline: '올해 반드시 합격합니다.' }
    assert.equal(reviewTeaser({ preview: prophecy, sourceEvidence: prophecy.headline }).passed, false)
  })

  it('routes newly assembled saved previews through the teaser gate and keeps two grounds at most', () => {
    const sections = [
      ['지금은 제안 조건을 비교할 때입니다.', '입력한 제안에서 역할 범위와 출근 조건이 함께 확인됐습니다.'],
      ['이동 시간을 먼저 봅니다.', '예를 들어 출근길에 이동 시간을 기록하면 통근 조건의 차이가 드러납니다.'],
      ['역할 범위를 대조합니다.', '회의에서 맡게 될 결정 범위를 질문하면 직무 조건의 차이가 드러납니다.'],
      ['보상 조건을 확인합니다.', '계약서를 볼 때 고정 보상과 변동 보상을 나누어 확인합니다.'],
    ].map(([hook, interpretation], order) => ({
      id: `section-${order}`, order, imageKey: '', imageSrc: '', imageAlt: '', category: hook,
      categoryEn: '', classification: hook, hook, patternKeys: [], ragTopics: [], interpretation,
      generatedBy: 'template' as const, status: 'complete' as const,
    }))
    const report: SajuReport = { title: '이직 조건', subtitle: '', model: 'template', generatedBy: 'template', sections }
    const preview = createSavedPreview(report, { serviceKey: 'work_move' })
    assert.ok(preview.insights.length >= 1 && preview.insights.length <= 2)
    assert.equal(reviewTeaser({ preview, sourceEvidence: sections.flatMap(section => [section.hook, section.interpretation]).join('\n') }).passed, true)
  })

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

  it('keeps prose paragraphs to two through four sentences and avoids slash-packed lists', () => {
    const readable = reviewInterpretation(`지금은 지출을 늘리기보다 보류하는 편이 맞습니다. 자동이체 뒤에 남는 금액이 기준입니다.

이번 주에는 실제 결제 내역을 먼저 기록합니다. 다음 소비 전에 선택 지출 합계를 비교합니다.`, { serviceKey: 'money_save' })
    assert.equal(readable.passed, true, readable.issues.join(' '))

    const crowded = reviewInterpretation('첫째 조건을 확인합니다. 둘째 조건도 비교합니다. 셋째 조건을 기록합니다. 넷째 조건을 다시 봅니다. 다섯째 조건까지 한 문단에 넣습니다.', { serviceKey: 'money_save' })
    assert.match(crowded.issues.join(' '), /2~4/)

    const slashes = reviewInterpretation('약속/답장/일정/표정/속도를 한 번에 나열합니다. 실제로 지켜진 약속을 먼저 확인합니다. 다음에는 일정이 바뀐 이유를 비교합니다.', { serviceKey: 'love_mind' })
    assert.match(slashes.issues.join(' '), /슬래시/)

    const labeled = reviewInterpretation(`## 지금의 판단

지금은 지출을 늘리기보다 보류하는 편이 맞습니다. 자동이체 뒤에 남는 금액이 기준입니다.

이번 주에는 실제 사용액을 기록합니다. 다음 소비 전에 선택 지출 합계를 비교합니다.`, { serviceKey: 'money_save' })
    assert.equal(labeled.passed, true, labeled.issues.join(' '))
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
