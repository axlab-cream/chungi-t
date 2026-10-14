import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import { groundedReportFeatures, buildTemplateSajuReport, sectionPrompt, summaryPrompt, verdictPrompt, highlightPrompt } from '../../src/report/report-generator.js'
import { standardReading } from '../../src/report/standard-reading.js'
import { elementEvidence } from '../../src/report/practical-service-copy.js'
import { retrieveRagChunks } from '../../src/rag/retriever.js'
import { buildMoneySaveReport, buildMoneySaveContext, moneySaveTeaserSection } from '../../src/money/save-service.js'
import { buildCatCompatReport, buildCatCompatContext, catCompatTeaserSection } from '../../src/pet/cat-service.js'
import { buildLuckyColorReport } from '../../src/body/lucky-service.js'
import { buildWorkJobReport } from '../../src/work/job-service.js'
import { buildWorkQuitReport, workQuitTeaserSection } from '../../src/work/quit-service.js'
import { buildJobChoiceReport } from '../../src/work/jobchoice-service.js'
import type { BirthInput, SajuReportContext, SajuAnalysis } from '../../src/types/index.js'

const birth: BirthInput = { year: 1991, month: 4, day: 12, hour: 12, gender: 'female', calendar: 'solar' }
const analysis = analyzeSaju(birth)
const changed: SajuAnalysis = { ...analysis, tenGods: ['편관'], dominantElement: 'water' as const, weakElement: 'fire' as const, dayMasterStrength: 'weak' as const, usefulGod: 'fire' as const, fortune: { ...analysis.fortune!, currentDaewoon: '임시대운_SENTINEL' } }
const unknown: SajuReportContext = { serviceKey: 'saju_master', name: '테스트', birthTimeKnown: false, concern: '현재 조건을 비교하고 싶어요' }

test('unknown verified calculations exclude provisional strength, full chart and personal timing', () => {
  const features = groundedReportFeatures(analysis, unknown) as any
  assert.deepEqual(Object.keys(features.calculation).sort(), ['dayMaster', 'dayMasterElement', 'pillars'])
  assert.deepEqual(Object.keys(features.calculation.pillars).sort(), ['day', 'month', 'year'])
  assert.deepEqual(groundedReportFeatures(changed, unknown), features)
  assert.equal((groundedReportFeatures(analysis, { ...unknown, birthTimeKnown: true }) as any).calculation.dayMasterForce !== undefined, true)
  assert.equal((groundedReportFeatures(analysis, {}) as any).calculation.dayMasterForce !== undefined, true)
})

test('unknown home evidence does not use provisional dominant element', () => {
  assert.equal(elementEvidence(analysis, false), elementEvidence(changed, false))
  assert.match(elementEvidence(analysis, false), /출생 시간/)
  assert.equal(elementEvidence(analysis, true), elementEvidence(analysis))
  const context = { ...unknown, serviceKey: 'home_fit', home: { extraNote: '소음 조건 확인' } }
  assert.equal(standardReading('home-fit-overall', '집', analysis, context), standardReading('home-fit-overall', '집', changed, context))
  assert.match(standardReading('home-fit-overall', '집', analysis, context), /출생 시간/)
})

test('unknown strength and timing chapters explain the withheld calculation', () => {
  for (const id of ['day-master-strength', 'future-flow', 'daewoon-detail', 'sewoon-detail', 'love-timing', 'wealth-timing']) {
    const copy = standardReading(id, '조건 확인', analysis, unknown)
    assert.match(copy, /출생 시간/)
    assert.doesNotMatch(copy, /임시대운_SENTINEL/)
  }
})

test('unknown template metadata stays independent of hour-dependent calculations', () => {
  for (const serviceKey of ['saju_master', 'work_move', 'pass_angle', 'love_this_year']) {
    const context = { ...unknown, serviceKey }
    const first = buildTemplateSajuReport(analysis, birth, context)
    const second = buildTemplateSajuReport(changed, birth, context)
    assert.deepEqual(first.sections.map(s => ({ id: s.id, classification: s.classification, hook: s.hook, interpretation: s.interpretation, keys: s.patternKeys, storytelling: s.storytelling })), second.sections.map(s => ({ id: s.id, classification: s.classification, hook: s.hook, interpretation: s.interpretation, keys: s.patternKeys, storytelling: s.storytelling })))
    assert.ok(first.sections.every(s => !s.patternKeys.some(k => /^(hourPillar|dayMasterStrength|dominantElement|weakElement|usefulGod|tenGod|gyeokguk|climate|flowBridge):/.test(k))))
    assert.deepEqual(first.sections.map(s => s.id), buildTemplateSajuReport(analysis, birth, { ...context, birthTimeKnown: true }).sections.map(s => s.id))
  }
})

const input = { companyName: '샘플회사', roleName: '기획', workMode: 'hybrid', commute: '편도 30분', salaryFeeling: 'better', concernPoint: '역할을 확인하고 싶어요' }
test('unknown job-choice opening and all fallback sections do not count provisional ten gods', () => {
  const first = buildJobChoiceReport({ ...analysis, tenGods: ['정관'] }, birth, { ...unknown, serviceKey: 'job_choice' }, input, 'same-report')
  const second = buildJobChoiceReport(changed, birth, { ...unknown, serviceKey: 'job_choice' }, input, 'same-report')
  assert.equal(first.reportId, 'same-report')
  assert.deepEqual(first.sections.map(s => s.interpretation), second.sections.map(s => s.interpretation))
  // 임시 십성을 근거로 쓰지 않는 것은 위 deepEqual 이 보장한다. 그 사실을 섹션마다 되풀이해 알리지는 않는다.
  assert.ok(first.sections.every(s => !/출생 시간을 모르므로/.test(s.interpretation)))
  const known = buildJobChoiceReport({ ...analysis, tenGods: ['정관'] }, birth, { ...unknown, birthTimeKnown: true, serviceKey: 'job_choice' }, input)
  assert.match(known.sections[0].interpretation, /정관/)
})

test('all offline prompt builders omit the provisional hour and force', () => {
  const section = buildTemplateSajuReport(analysis, birth, unknown).sections[0]
  const staleSection = { ...section, classification: '임시강약_SENTINEL', hook: '임시대운_SENTINEL', interpretation: '임시시주_SENTINEL', status: 'complete' as const }
  const detailed = sectionPrompt(analysis, birth, unknown, staleSection, [staleSection])
  assert.doesNotMatch(detailed[1].content, /임시강약_SENTINEL|임시대운_SENTINEL|임시시주_SENTINEL/)
  const prompts = [detailed, summaryPrompt(analysis, birth, unknown), verdictPrompt(analysis, birth, unknown), highlightPrompt(analysis, birth, unknown, { title: '조건', shape: '문단' } as any)]
  for (const prompt of prompts) {
    const payload = JSON.parse(prompt[1].content)
    assert.equal(payload.evidenceLayers.userFacts.birth.hour, undefined)
    assert.equal(payload.evidenceLayers.verifiedCalculations.calculation.dayMasterForce, undefined)
    assert.equal(payload.evidenceLayers.verifiedCalculations.calculation.pillars.hour, undefined)
  }
})

const changedAll: SajuAnalysis = { ...changed, elementCount: { wood: 91, fire: 92, earth: 93, metal: 94, water: 95 }, manseryeok: undefined, fourPillars: { ...analysis.fourPillars, hour: analysis.fourPillars.year } }

test('unknown retrieval never reads the provisional analysis, including vector/graph branches', () => {
  const forbidden = new Proxy(analysis, { get() { throw new Error('provisional analysis read') } })
  for (const query of ['직업 역할 계약', '오행 강약 용신 대운', '고양이 생활 반응']) {
    const context = { ...unknown, serviceKey: 'work_move' }
    const first = retrieveRagChunks(query, forbidden, 12, context)
    assert.ok(first.length > 0)
    assert.deepEqual(first.map(c => c.id), retrieveRagChunks(query, changedAll, 12, context).map(c => c.id))
  }
  assert.ok(retrieveRagChunks('직업 역할', forbidden, 12, undefined, undefined, false).length > 0)
  const partnerContext: SajuReportContext = { ...unknown, partner: { mode: 'known', dominantElement: 'fire', tenGods: ['정관'] } }
  const changedPartner: SajuReportContext = { ...partnerContext, partner: { ...partnerContext.partner!, dominantElement: 'water', tenGods: ['겁재'] } }
  assert.deepEqual(retrieveRagChunks('관계 조건 확인', forbidden, 12, partnerContext).map(c => c.id), retrieveRagChunks('관계 조건 확인', forbidden, 12, changedPartner).map(c => c.id))
  assert.deepEqual(retrieveRagChunks('직업 역할', analysis, 12, {}).map(c => c.id), retrieveRagChunks('직업 역할', analysis, 12, { birthTimeKnown: true }).map(c => c.id))
})

const moneyInput = { moneyHabit: '예산대로 씁니다', incomePattern: '월급', savingGoal: '여유자금', concern: '현재 습관 확인' }
const catInput = { catName: '샘플', household: 'single_cat', ageBand: 'adult', behaviorTags: ['shy'], touchStyle: 'short_touch', playEnergy: 'night', routineFlags: ['크게 없음'], focusArea: 'distance', upcomingEvent: 'none' }
const quitInput = { reason: '역할 확인', nextPlan: '조건 비교' }

test('all extended service builders mask unknown provisional facts and lucky balance recommendations', () => {
  const builders = [
    (a: SajuAnalysis) => buildMoneySaveReport(a, birth, { ...buildMoneySaveContext('샘플', moneyInput), birthTimeKnown: false }, moneyInput),
    (a: SajuAnalysis) => buildCatCompatReport(a, birth, { ...buildCatCompatContext('샘플', catInput), birthTimeKnown: false }, catInput),
    (a: SajuAnalysis) => buildLuckyColorReport(a, birth, { ...unknown, serviceKey: 'lucky_color' }, {}),
    (a: SajuAnalysis) => buildWorkJobReport(a, birth, { ...unknown, serviceKey: 'work_job' }, { currentJob: '기획', concern: '역할 확인' }),
    (a: SajuAnalysis) => buildWorkQuitReport(a, birth, { ...unknown, serviceKey: 'quit_fortune' }, quitInput),
  ]
  for (const build of builders) {
    const first = build(analysis), second = build(changedAll)
    const projection = (r: ReturnType<typeof build>) => ({ title: r.title, subtitle: r.subtitle, sections: r.sections.map(s => ({ id: s.id, copy: s.interpretation, topics: s.ragTopics, storytelling: s.storytelling })) })
    assert.deepEqual(projection(first), projection(second))
    assert.doesNotMatch(JSON.stringify(projection(first)), /임시대운_SENTINEL|91개|92개|93개|94개|95개/)
  }
  const lucky = builders[2](analysis)
  assert.ok(lucky.sections.every(s => /출생 시간/.test(s.interpretation)))
  assert.doesNotMatch(lucky.subtitle, /님의 (목|화|토|금|수) 상징/)
})

test('unknown teaser projections exclude current and stored provisional visual facts', () => {
  const stale = { ...buildTemplateSajuReport(analysis, birth, unknown).sections[0], storytelling: { feel: '', scene: '', actions: [], imagePrompt: { ko: '', en: '' }, chartPoints: [{ label: '임시시각', value: 99, note: '임시시각' }], tableMd: '임시시주_SENTINEL', chartCaption: '임시강약_SENTINEL' } }
  const contexts = [
    { ...buildMoneySaveContext('샘플', moneyInput), birthTimeKnown: false },
    { ...buildCatCompatContext('샘플', catInput), birthTimeKnown: false },
    { ...unknown, serviceKey: 'quit_fortune' },
  ]
  const adapters = [moneySaveTeaserSection, catCompatTeaserSection, workQuitTeaserSection]
  adapters.forEach((adapt, i) => {
    const first = adapt(stale, 1, analysis, contexts[i])
    const second = adapt(stale, 1, changedAll, contexts[i])
    assert.deepEqual(first, second)
    assert.equal(first.storytelling?.chartPoints?.length ?? 0, 0)
    assert.doesNotMatch(JSON.stringify(first.storytelling), /임시시주_SENTINEL|임시강약_SENTINEL/)
  })
})
