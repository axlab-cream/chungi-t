import { test } from 'node:test'
import assert from 'node:assert/strict'
import { KNOWN_SERVICE_KEYS } from '../../src/prompt/service-system.js'
import { SERVICE_VOICE_CONTRACTS } from '../../src/prompt/service-voice-contracts.js'
import { reviewPaidSectionDensity, reviewToneCopy } from '../../src/report/tone-v2-review.js'
import { sectionPrompt } from '../../src/report/report-generator.js'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import { buildCatCompatContext, buildCatCompatReport, type CatCompatRequest } from '../../src/pet/cat-service.js'
import type { BirthInput, SajuReportSection } from '../../src/types/index.js'

/**
 * 2026-09-18: 고양이 궁합 리포트가 20/20 미완성으로 멈춰 있었다. 크레딧이 돌아온 뒤 1번 항목을
 * 여덟 번 생성했는데 모두 검수에서 되돌아왔다 — "입력에 없는 회사·가족·집·반려묘 사실",
 * "구체적인 장면을 넣으세요". 프롬프트는 계약서의 필수 장면(밥 달라는 시간·숨는 행동)을 쓰라고
 * 하고, 검수기는 사람 생활 사전(출근·회의·식탁)만 알아 그 장면을 퇴짜 놓았다. 전수 점검에서
 * 20개 서비스 중 17개가 같은 어긋남을 보였다. 프롬프트와 검수기는 같은 계약서를 읽어야 한다.
 */
const birth: BirthInput = { year: 1990, month: 5, day: 21, hour: 14, gender: 'male', calendar: 'solar' }
const analysis = analyzeSaju(birth)
const inventedFactIssues = (text: string, serviceKey: string, concern?: string) =>
  reviewToneCopy(text, serviceKey, { context: { serviceKey, ...(concern ? { concern } : {}) }, contentRole: 'body' }).issues
    .filter((issue) => issue.includes('입력에 없는'))

test('프롬프트가 요구하는 필수 장면을 검수기가 장면으로 알아본다 — 20개 서비스 전부', () => {
  for (const key of KNOWN_SERVICE_KEYS) {
    for (const scene of SERVICE_VOICE_CONTRACTS[key].requiredScenes) {
      const review = reviewPaidSectionDensity({
        hook: '직접 답을 먼저 써요.',
        question: '질문?',
        interpretation: `${scene} 상황에서 반응이 갈리면 그 순서를 기록해요.`,
        context: { serviceKey: key },
      })
      assert.equal(review.elements.scene, true, `${key}: 계약서의 필수 장면 "${scene}" 을 검수기가 장면으로 보지 않는다`)
    }
  }
})

test('고양이 궁합의 집 안 장면도 장면이다', () => {
  const review = reviewPaidSectionDensity({
    hook: '직접 답을 먼저 써요.',
    question: '숨숨집 자리?',
    interpretation: '숨숨집 앞에서 한참 망설이는 모습이 보이면 그 시간대를 적어요.',
    context: { serviceKey: 'cat_compatibility' },
  })
  assert.equal(review.elements.scene, true)
})

test('서비스가 다루는 주제는 "입력에 없는 사실"로 막지 않는다', () => {
  for (const text of ['고양이는 아침에 밥을 달라고 해요.', '고양이가 낮에는 혼자 쉬는 편입니다.']) {
    assert.deepEqual(inventedFactIssues(text, 'cat_compatibility', '고양이: 모모 · 가정: 1묘 가정'), [], text)
  }
  assert.deepEqual(inventedFactIssues('회사 분위기가 조용한 편이에요.', 'work_move'), [])
  assert.deepEqual(inventedFactIssues('집 구조가 아침 동선을 갈라요.', 'home_fit'), [])
})

test('다른 서비스에서는 여전히 막고, 질병은 어디서도 예외가 없다', () => {
  assert.ok(inventedFactIssues('고양이가 낮에는 혼자 쉬는 편입니다.', 'saju_master').length, '천명사주가 고양이 사실을 만들었는데 통과했다')
  assert.ok(inventedFactIssues('회사 분위기가 조용한 편이에요.', 'love_this_year').length, '연애운이 회사 사실을 만들었는데 통과했다')
  assert.ok(inventedFactIssues('질병이 이 시기에 생겨요.', 'cat_compatibility').length, '고양이 궁합에서 질병 단정이 통과했다')
})

const catInput: CatCompatRequest = {
  catName: '모모', household: 'single_cat', ageBand: 'unknown', behaviorTags: ['예민'], touchStyle: 'short',
  playEnergy: 'medium', routineFlags: [], focusArea: 'distance', upcomingEvent: 'none',
}

test('고양이 목차 규칙은 집사의 기둥에 묶고 고양이 사실을 입력으로 제한한다', () => {
  const context = buildCatCompatContext('테스트', catInput)
  const report = buildCatCompatReport(analysis, birth, context, catInput, 'test')
  const payload = JSON.parse(sectionPrompt(analysis, birth, context, report.sections[0])[1].content) as {
    instruction: string
    evidenceLayers: { verifiedCalculations: unknown }
  }
  assert.match(payload.instruction, /고양이 궁합 전 항목 공통/)
  assert.match(payload.instruction, /일간.*오행 분포.*십성/)
  assert.match(payload.instruction, /고양이의 명식.*만들지 마세요/)
  assert.match(payload.instruction, /입력된 것.*만 쓰세요/)
  assert.match(payload.instruction, /수의사/)
  // 기둥 자체는 계산층에 실려 있어야 규칙이 뜻이 있다.
  const calc = JSON.stringify(payload.evidenceLayers.verifiedCalculations)
  assert.match(calc, /"pillars":\{"year":"[^"]+","month":"[^"]+","day":"[^"]+"/)
  assert.match(calc, /"dayMaster":"[^"]+"/)
})

test('항목별 규칙이 없던 서비스도 기둥 인용과 필수 장면 규칙을 받는다', () => {
  const section: SajuReportSection = {
    id: 'meet-1', order: 1, imageKey: '', imageSrc: '', imageAlt: '', category: '만남', categoryEn: 'Meeting',
    classification: '새 만남', hook: '', interpretation: '', patternKeys: [], ragTopics: [],
  }
  const payload = JSON.parse(sectionPrompt(analysis, birth, { serviceKey: 'love_this_year' }, section)[1].content) as { instruction: string }
  assert.match(payload.instruction, /전 항목 공통:/)
  assert.match(payload.instruction, /기둥을 한 번도 부르지 않은 일반론/)
  assert.match(payload.instruction, /필수 장면\(새 만남/)
})
