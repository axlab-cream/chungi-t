import { test } from 'node:test'
import assert from 'node:assert/strict'
import { reviewPaidSectionDensity } from '../../src/report/tone-v2-review.js'
import { reviewInterpretation } from '../../src/report/interpretation-validation.js'
import { sectionPrompt } from '../../src/report/report-generator.js'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import type { BirthInput, SajuReportContext, SajuReportSection } from '../../src/types/index.js'

/**
 * 2026-09-18 운영 진단: 결혼궁합 1차 시도 20회 중 16회가 "유지·비교·대화·행동 중 하나를 다음 판단
 * 기준으로 제시하세요" 한 가지에 떨어졌고, 저축운 1차 실패의 4할이 "제작용 제목·운영 상태·권한/결제
 * 안내" 오탐이었다. 게이트 어휘가 서비스의 자연스러운 문장과 어긋나면 한 항목에 네 번씩 모델을
 * 태우고도 실패로 남는다 — 품질이 아니라 비용과 레이턴시 문제다.
 */

const marryBase = {
  hook: '생활비 분담부터 맞춰 보면 결혼을 생각해도 괜찮아요.',
  question: '이 사람과 결혼까지 생각해도 괜찮을까?',
  context: { serviceKey: 'marry_match', name: '테스트', concern: '결혼 이야기가 나오고 있어요.' } as SajuReportContext,
}
const marryBody = (closing: string) =>
  `결혼 이야기가 나오고 있다고 적었으니 설렘보다 생활 구조를 먼저 봐요. 일간이 서로 다른 속도를 가진 조합이라 돈 관리 대화에서 온도차가 드러나기 쉬워요.\n\n예를 들어 양가 일정을 같이 펼쳐 놓는 장면을 떠올려요. 한쪽은 미리 정하고 한쪽은 그때 가서 맞추는 편이면 그 차이가 첫 갈등이 돼요.\n\n${closing} 그 결과가 한 달 뒤에도 같은 방향이면 다음 단계를 이야기해도 늦지 않아요.`

test('관계·결혼 상담의 자연스러운 마무리 동사가 다음 판단 기준으로 통과한다', () => {
  const closings = [
    '다음에는 양가 일정을 먼저 맞춰 보세요.',
    '먼저 생활비 분담을 상의해요.',
    '앞으로 집안일 분담을 나눠 보세요.',
    '다음에는 상대의 저축 습관을 물어보세요.',
    '이후 한 달 지출 합계를 체크해요.',
    '먼저 결혼 뒤 거처 후보를 정리해요.',
    '다음에는 데이트 비용 분담을 따져 봐요.',
    '오늘 서로의 고정 지출을 메모해요.',
  ]
  for (const closing of closings) {
    const review = reviewPaidSectionDensity({ ...marryBase, interpretation: marryBody(closing) })
    assert.equal(review.elements.nextCriterion, true, `다음 판단 기준으로 인정되어야 한다: ${closing}`)
  }
})

test('구조 요건은 그대로다 — 대상 없는 격려·과거형·부정형은 여전히 떨어진다', () => {
  for (const closing of ['다음에는 잘 맞춰 봐요.', '어제 양가 일정을 맞춰 봤어요.', '다음에는 양가 일정을 맞춰 보지 마세요.']) {
    const review = reviewPaidSectionDensity({ ...marryBase, interpretation: marryBody(closing) })
    assert.equal(review.elements.nextCriterion, false, `다음 판단 기준으로 인정되면 안 된다: ${closing}`)
  }
})

test('1차 지시문이 넓힌 서술어를 함께 알려 준다 — 게이트와 프롬프트가 같은 사전을 쓴다', () => {
  const birth: BirthInput = { year: 1992, month: 5, day: 14, hour: 10, gender: 'female', calendar: 'solar' }
  const section: SajuReportSection = {
    id: 'marry-money', order: 1, imageKey: '', imageSrc: '', imageAlt: '', category: '돈', categoryEn: 'money',
    classification: '돈 관리 방식은 맞을까?', hook: '', interpretation: '', patternKeys: [], ragTopics: [],
  }
  const prompt = JSON.stringify(sectionPrompt(analyzeSaju(birth), birth, marryBase.context, section))
  for (const verb of ['상의', '맞춰 보기', '나눠 보기', '물어보기', '체크', '정리']) assert.match(prompt, new RegExp(verb), `지시문에 ${verb} 가 없다`)
})

test('저축운의 "결제 전"·"진행 중"은 고객 문장이면 운영 문구가 아니다', () => {
  const context: SajuReportContext = { serviceKey: 'money_save', name: '테스트', concern: '월급이 어디로 새는지 모르겠어요.' }
  const customer = '자동이체 뒤에 남는 금액이 판단 기준이에요. 적금 진행 중이라면 그 금액은 수입처럼 세지 않아요.\n\n예를 들어 주말 약속을 잡기 전에 이번 주 선택 지출 합계를 보는 장면을 떠올려요. 다음 결제 전에 남은 한도와 비교해요.\n\n앞으로 카드 명세서에서 반복 지출 항목을 기록해요. 세 번 반복되면 고정비로 옮겨요.'
  const review = reviewInterpretation(customer, context)
  assert.doesNotMatch(review.issues.join(' '), /제작용 제목·운영 상태/, review.issues.join(' | '))
})

test('운영 맥락의 결제·생성 상태 문구는 여전히 걸린다', () => {
  const context: SajuReportContext = { serviceKey: 'money_save', name: '테스트', concern: '월급이 어디로 새는지 모르겠어요.' }
  for (const leak of [
    '결제 전에는 볼 수 없는 항목이에요. 결제 뒤에 전체 해석이 열려요. 잠시 기다려 주세요.',
    '해석 생성 진행 중입니다. 완료되면 이 자리에 표시돼요. 새로고침하지 않아도 돼요.',
  ]) {
    const review = reviewInterpretation(`${leak}\n\n예를 들어 주말 약속을 잡기 전에 지출 합계를 보는 장면을 떠올려요. 다음에는 카드 명세서를 기록해요. 세 번 반복되면 고정비로 옮겨요.`, context)
    assert.match(review.issues.join(' '), /제작용 제목·운영 상태/, `운영 문구가 걸려야 한다: ${leak}`)
  }
})
