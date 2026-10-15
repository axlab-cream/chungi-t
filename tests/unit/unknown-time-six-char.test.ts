import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { analyzeSaju, sixCharAnalysis } from '../../src/saju/analyzer.js'
import { analysisForReading, markBirthTimeReading, unknownBirthTimeReading } from '../../src/saju/unknown-time-reading.js'
import { projectUnknownBirthTime } from '../../src/saju/birth-time-certainty.js'
import { buildTemplateSajuReport, groundedReportFeatures, sectionPrompt } from '../../src/report/report-generator.js'
import { standardReading } from '../../src/report/standard-reading.js'
import { retrieveRagChunks } from '../../src/rag/retriever.js'
import type { BirthInput, SajuAnalysis, SajuReportContext } from '../../src/types/index.js'

// 3단계(2026-10-15): 출생 시각을 모르면 시주를 빼고 연·월·일 6글자로 확정 풀이한다. 천명사주부터 켠다.
// 새로 만드는 리포트에는 6글자 표시가 붙는다(markBirthTimeReading). 표시 없는 예전 리포트는 보류 그대로.
const unknown: SajuReportContext = markBirthTimeReading({ serviceKey: 'saju_master', name: '테스트', birthTimeKnown: false, concern: '일을 바꿀까' })
const birthAt = (hour: number, base: Omit<BirthInput, 'hour'> = { year: 1991, month: 4, day: 12, gender: 'female', calendar: 'solar' }): BirthInput => ({ ...base, hour, minute: 0 })

/** 시각과 무관해야 하는 값만 모은다. 시주와 출생 시각, 대운(시작 나이)은 시각에 따라 달라지는 게 맞다. */
function hourIndependentView(analysis: SajuAnalysis) {
  const { fourPillars, fortune: _fortune, manseryeok, ...rest } = analysis
  const { resolvedBirth: _resolved, ...meta } = manseryeok!
  return { pillars: [fourPillars.year, fourPillars.month, fourPillars.day], ...rest, meta }
}

test('switch: 새로 만든 리포트만 6글자 모드, 예전 리포트·켜지 않은 서비스·표시 없음은 보류', () => {
  assert.equal(unknown.birthTimeReading, 'six_char')
  assert.equal(unknownBirthTimeReading(unknown), 'six_char')
  assert.equal(unknownBirthTimeReading(markBirthTimeReading({ serviceKey: 'cmdg', birthTimeKnown: false })), 'six_char')
  // 예전 리포트(표시 없음)는 만들어진 방식 그대로 보류한다.
  assert.equal(unknownBirthTimeReading({ serviceKey: 'saju_master', birthTimeKnown: false }), 'withhold')
  // 천명사주 경로는 서비스 키를 비워 둔다. 키가 없으면 천명사주로 보는 관례대로 표시가 붙는다.
  assert.equal(markBirthTimeReading({ birthTimeKnown: false }).birthTimeReading, 'six_char')
  assert.equal(unknownBirthTimeReading({ birthTimeKnown: false, birthTimeReading: 'six_char' }), 'six_char')
  // 표시가 없으면 키가 없어도 보류다(표시는 리포트를 새로 만드는 곳에서만 붙는다).
  assert.equal(unknownBirthTimeReading({ birthTimeKnown: false }), 'withhold')
  // 아직 켜지 않은 서비스(판매 중지된 행운색)는 표시도 안 붙고 보류다. 이직운 등은 10/15부터 켜졌다.
  assert.equal(markBirthTimeReading({ serviceKey: 'lucky_color', birthTimeKnown: false }).birthTimeReading, undefined)
  assert.equal(unknownBirthTimeReading({ serviceKey: 'lucky_color', birthTimeKnown: false, birthTimeReading: 'six_char' }), 'withhold')
  assert.equal(unknownBirthTimeReading(markBirthTimeReading({ serviceKey: 'work_move', birthTimeKnown: false })), 'six_char')
  assert.equal(markBirthTimeReading({ serviceKey: 'saju_master', birthTimeKnown: true }).birthTimeReading, undefined)
  assert.equal(unknownBirthTimeReading({ serviceKey: 'saju_master', birthTimeKnown: true }), 'known')
  assert.equal(unknownBirthTimeReading({ serviceKey: 'saju_master' }), 'known')
  const analysis = analyzeSaju(birthAt(12))
  assert.equal(analysisForReading(analysis, { serviceKey: 'work_move', birthTimeKnown: false }), analysis)
  assert.equal(analysisForReading(analysis, { serviceKey: 'saju_master', birthTimeKnown: true }), analysis)
})

test('6글자 계산은 0~23시 어느 시각을 넣어도 같다', () => {
  const dates: Array<Omit<BirthInput, 'hour'>> = [
    { year: 1991, month: 4, day: 12, gender: 'female', calendar: 'solar' },
    { year: 1975, month: 11, day: 20, gender: 'male', calendar: 'solar' },
    { year: 2003, month: 8, day: 15, gender: 'female', calendar: 'lunar' },
  ]
  for (const base of dates) {
    const first = JSON.stringify(hourIndependentView(sixCharAnalysis(analyzeSaju(birthAt(0, base)))))
    for (let hour = 1; hour <= 23; hour++) {
      assert.equal(JSON.stringify(hourIndependentView(sixCharAnalysis(analyzeSaju(birthAt(hour, base))))), first, `${JSON.stringify(base)} ${hour}시`)
    }
  }
})

test('참고 풀이 사례(정묘·병오·경인)의 "토·물 없음"을 재현한다', () => {
  const analysis = analyzeSaju(birthAt(12, { year: 1987, month: 6, day: 10, gender: 'female', calendar: 'solar' }))
  const p = analysis.fourPillars
  assert.deepEqual([p.year, p.month, p.day].map((x) => x.stem + x.branch), ['丁卯', '丙午', '庚寅'])
  const six = sixCharAnalysis(analysis)
  assert.equal(six.elementCount.earth, 0)
  assert.equal(six.elementCount.water, 0)
  assert.deepEqual(six.elementCount, { wood: 2, fire: 3, earth: 0, metal: 1, water: 0 })
  assert.equal(six.manseryeok?.hourPillarExcluded, true)
  assert.ok(six.manseryeok!.tenGodPlacements.every((item) => item.pillar !== 'hour'))
  assert.ok(six.manseryeok!.interactions.every((item) => !item.pillars.includes('시주')))
  assert.match(six.summary, /시주 제외 6글자/)
  assert.doesNotMatch(six.summary, /12:00|대운/)
  // 두 번 적용해도 같은 값이다.
  assert.equal(sixCharAnalysis(six), six)
})

test('천명사주 AI 재료: 시주·출생 시각은 없고, 6글자 오행·강약·용신은 확정값으로 넘긴다', () => {
  const features = groundedReportFeatures(analyzeSaju(birthAt(12)), unknown) as any
  assert.deepEqual(Object.keys(features.calculation.pillars).sort(), ['day', 'month', 'year'])
  assert.ok(features.calculation.dayMasterForce)
  assert.ok(features.balance.elementCount)
  assert.ok(features.balance.usefulElement)
  assert.ok(features.relationshipSignals.placements.every((item: { pillar: string }) => item.pillar !== 'hour'))
  assert.match(features.uncertainty, /6글자/)
  assert.equal(features.timing.currentDaewoon, undefined)
  // 10/15 결정: 참고 PDF처럼 대운 시작 나이를 단정한다('약 ○세 무렵' 표시 없음).
  assert.ok(features.timing.daewoonList.every((row: Record<string, unknown>) => 'ageStart' in row && !('approxAgeStart' in row)))
  assert.doesNotMatch(features.uncertainty, /약 ○세|무렵"으로/)
  // 몇 시를 넣었든 AI 가 받는 계산값은 같다(대운 시작 나이처럼 근사로 표시한 값 제외).
  const strip = (value: any) => ({ ...value, timing: undefined })
  for (const hour of [0, 6, 18, 23]) assert.deepEqual(strip(groundedReportFeatures(analyzeSaju(birthAt(hour)), unknown)), strip(features))
  const prompt = JSON.parse(sectionPrompt(analyzeSaju(birthAt(12)), birthAt(12), unknown, buildTemplateSajuReport(analyzeSaju(birthAt(12)), birthAt(12), unknown).sections[0])[1].content)
  assert.equal(prompt.evidenceLayers.userFacts.birth.hour, undefined)
  assert.equal(prompt.evidenceLayers.verifiedCalculations.calculation.pillars.hour, undefined)
  assert.doesNotMatch(prompt.section.classification, /출생 시간 미상/)
})

test('천명사주: 몇 시를 넣었든 기본 풀이·AI 프롬프트가 같고, 대운은 실제 간지로 단정한다', () => {
  const view = (hour: number) => {
    const report = buildTemplateSajuReport(analyzeSaju(birthAt(hour)), birthAt(hour), unknown)
    return { subtitle: report.subtitle, sections: report.sections.map((s) => ({ id: s.id, classification: s.classification, hook: s.hook, interpretation: s.interpretation, keys: s.patternKeys, topics: s.ragTopics })) }
  }
  const first = JSON.stringify(view(0))
  for (const hour of [6, 12, 18, 23]) assert.equal(JSON.stringify(view(hour)), first)
  const promptAt = (hour: number) => {
    const analysis = analyzeSaju(birthAt(hour))
    const [section] = buildTemplateSajuReport(analysis, birthAt(hour), unknown).sections.filter((s) => s.id === 'future-flow')
    const payload = JSON.parse(sectionPrompt(analysis, birthAt(hour), unknown, section)[1].content)
    // 대운 시작 나이는 임시 시각 기준이라 넣은 시각에 따라 1세 달라질 수 있어 비교에서 뺀다.
    payload.evidenceLayers.verifiedCalculations.timing = undefined
    return JSON.stringify(payload)
  }
  assert.equal(promptAt(0), promptAt(12))
  assert.equal(promptAt(23), promptAt(12))
  // 10/15 결정: 시간을 몰라도 대운은 참고 PDF처럼 단정한다. '지금 대운' 같은 가림 문구 대신 실제 간지를 쓴다.
  const future = buildTemplateSajuReport(analyzeSaju(birthAt(12)), birthAt(12), unknown).sections.find((s) => s.id === 'future-flow')!
  assert.match(future.classification, /^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥] · /)
  assert.doesNotMatch(JSON.stringify(view(12)), /지금 대운 대운|지금 대운\(지금 대운\)/)
})

test('천명사주 기본 풀이: 오행 장은 6글자 개수로 쓰고, 시주 장만 보류한다', () => {
  const analysis = analyzeSaju(birthAt(12))
  const report = buildTemplateSajuReport(analysis, birthAt(12), unknown)
  assert.ok(report.sections.every((s) => s.patternKeys.includes('birthTime:six_char')))
  assert.ok(report.sections.every((s) => !s.patternKeys.some((k) => /^(birth|hourPillar):/.test(k))))
  assert.doesNotMatch(report.subtitle, /보류/)
  const six = sixCharAnalysis(analysis)
  const balance = standardReading('weak-element', '오행', six, unknown)
  assert.match(balance, new RegExp(`${six.elementCount[six.weakElement]}개로 표시`))
  assert.match(standardReading('hour-pillar', '시주', six, unknown), /시주와 시주에 의존하는 세부 결론은 보류/)
})

test('참고서 검색: 6글자 계산이면 시간을 아는 것처럼 개인화하고, 임시 명식이면 개인화하지 않는다', () => {
  const six = sixCharAnalysis(analyzeSaju(birthAt(12)))
  for (const query of ['오행 강약 용신', '일과 관계의 균형']) {
    assert.deepEqual(
      retrieveRagChunks(query, six, 7, unknown).map((c) => c.id),
      retrieveRagChunks(query, six, 7, { ...unknown, birthTimeKnown: true }).map((c) => c.id),
    )
  }
  const forbidden = new Proxy(analyzeSaju(birthAt(12)), { get(target, key) { if (key === 'manseryeok') return target.manseryeok; throw new Error('provisional analysis read') } })
  assert.ok(retrieveRagChunks('오행 강약 용신', forbidden, 7, unknown).length > 0)
})

test('화면 공개값: 6글자 모드는 시주·출생 시각·대운 시점만 빼고 오행·강약·용신을 보여 준다', () => {
  const payload = { birth: { year: 1991, hour: 12, minute: 0 }, pillars: { year: 'y', month: 'm', day: 'd', hour: 'h' }, dayMaster: { strength: 'weak' }, elements: { wood: 1 }, usefulGod: '수', tenGods: ['정관'], fortune: { currentYear: 2026, yearPillar: '丙午', daewoon: [{ age: '1' }] }, summary: '대운 12:00' }
  const shown = projectUnknownBirthTime(payload, false, true) as any
  assert.equal(shown.birth.hour, undefined)
  assert.equal(shown.pillars.hour, undefined)
  assert.deepEqual(shown.elements, { wood: 1 })
  assert.equal(shown.dayMaster.strength, 'weak')
  assert.equal(shown.usefulGod, '수')
  assert.equal(shown.fortune.daewoon, undefined)
  assert.equal(shown.summary, undefined)
  assert.equal(shown.uncertainty.mode, 'six_char')
  const withheld = projectUnknownBirthTime(payload, false) as any
  assert.equal(withheld.elements, undefined)
  assert.equal(withheld.dayMaster.strength, undefined)
})

test('맛보기 화면: 6글자 모드면 시간을 몰라도 오행 개수를 보여 주고 시주는 숨긴다', () => {
  const source = readFileSync('사주/js/cmdg-master-teaser.js', 'utf8')
  const render = (state: object) => { const ctx: any = {}; vm.createContext(ctx); vm.runInContext(source, ctx); return ctx.UmshMasterTeaser.render(state) as string }
  const analysis = { dayMaster: { ko: '경', element: '금' }, pillars: { year: { ko: '정묘' }, month: { ko: '병오' }, day: { ko: '경인', hanja: '庚寅' } }, elements: { wood: 2, fire: 3, earth: 0, metal: 1, water: 0 }, fortune: { currentYear: 2026, yearPillar: '丙午' }, birthTimeKnown: false }
  const six = render({ name: '테스트', birthTimeKnown: false, analysis: { ...analysis, uncertainty: { mode: 'six_char' } } })
  assert.match(six, /불 기운이 3개로 가장 많아/)
  assert.match(six, /흙·물 기운은 0개/)
  assert.equal((six.match(/<ol class="intro-pillars"[\s\S]*?<\/ol>/) || [''])[0].match(/<li>/g)?.length, 3)
  const withheld = render({ name: '테스트', birthTimeKnown: false, analysis })
  assert.doesNotMatch(withheld, /기운이 \d+개로 가장 많아/)
})
