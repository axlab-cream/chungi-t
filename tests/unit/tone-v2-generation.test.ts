import { test } from 'node:test'
import assert from 'node:assert/strict'
import { numericEvidenceFrom, reviewPaidSectionDensity, reviewSafetyClaims, reviewScoreVisuals, reviewSectionUniqueness, reviewTechnicalTerms, reviewToneCopy, toneWritingInstruction } from '../../src/report/tone-v2-review.js'
import { reviewGeneratedSajuReportSection, sectionPrompt } from '../../src/report/report-generator.js'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import type { BirthInput, RagChunk, SajuReportContext, SajuReportSection } from '../../src/types/index.js'

test('review enforces assigned speech while allowing quoted customer words and neutral labels', () => {
  assert.equal(reviewToneCopy('오답부터 다시 봐. “괜찮아요”라고 넘기지 마.', 'pass_angle').passed, true)
  assert.equal(reviewToneCopy('오답부터 다시 보세요.', 'pass_angle').passed, false)
  assert.equal(reviewToneCopy('기준부터 확인합니다.', 'saju_master').passed, true)
  assert.equal(reviewToneCopy('자네부터 보게.', 'saju_master').passed, false)
  assert.equal(reviewToneCopy('지금은 보류. 조건을 먼저 확인해요.', 'quit_fortune').passed, true)
  assert.equal(reviewToneCopy('먼저 확인합니다.', 'quit_fortune').passed, false)
  assert.equal(reviewToneCopy('RAG 근거입니다.', 'saju_master').passed, false)
})
test('generation never ingests old template copy and carries only completed siblings', () => {
  const birth: BirthInput = { year: 1994, month: 3, day: 11, hour: 9, gender: 'female', calendar: 'solar' }
  const section: SajuReportSection = { id: 'item', order: 1, imageKey: '', imageSrc: '', imageAlt: '', category: '공부 순서', categoryEn: '', classification: '무엇부터 공부할까?', hook: 'OLD_HOOK', interpretation: 'OLD_BODY', patternKeys: [], ragTopics: [] }
  const messages = sectionPrompt(analyzeSaju(birth), birth, { serviceKey: 'pass_angle' }, section, [
    { ...section, id: 'previous', status: 'complete', interpretation: '검수된 이전 본문' },
    { ...section, id: 'pending', status: 'pending', interpretation: 'PENDING_BODY' },
  ])
  const payload = JSON.parse(messages[1].content)
  assert.equal(payload.section.interpretation, undefined)
  assert.equal(payload.section.hook, undefined)
  assert.deepEqual(payload.otherSections.map((item: { id: string }) => item.id), ['previous'])
  assert.equal(payload.otherSections[0].interpretation, '검수된 이전 본문')
  assert.equal(messages[1].content.includes('OLD_BODY'), false)
  assert.equal(messages[1].content.includes('PENDING_BODY'), false)
})

test('52-item generation keeps every completed sibling summary but bounds full prose carry', () => {
  const birth: BirthInput = { year: 1994, month: 3, day: 11, hour: 9, gender: 'female', calendar: 'solar' }
  const section: SajuReportSection = { id: 'item-52', order: 52, imageKey: '', imageSrc: '', imageAlt: '', category: '마지막 항목', categoryEn: '', classification: '마지막 질문', hook: '', interpretation: '', patternKeys: [], ragTopics: [] }
  const siblings: SajuReportSection[] = Array.from({ length: 51 }, (_, index) => ({
    ...section,
    id: `item-${index + 1}`,
    order: index + 1,
    classification: `질문-${index + 1}`,
    hook: `요약-${index + 1}-${'가'.repeat(300)}`,
    interpretation: `본문-${index + 1}-${'나'.repeat(5_000)}`,
    status: 'complete',
  }))

  const messages = sectionPrompt(analyzeSaju(birth), birth, { serviceKey: 'pass_angle' }, section, siblings)
  const payload = JSON.parse(messages[1].content)
  assert.equal(payload.otherSections.length, 51)
  assert.deepEqual(payload.otherSections.map((item: { id: string }) => item.id), siblings.map(item => item.id))
  assert.equal(payload.otherSections.filter((item: { interpretation?: string }) => item.interpretation).length, 4)
  assert.equal(payload.otherSections[46].interpretation, undefined)
  assert.match(payload.otherSections[47].interpretation, /^본문-48-/)
  assert.ok(payload.otherSections.every((item: { summary: string }) => item.summary.length <= 160))
  assert.ok(payload.otherSections.filter((item: { interpretation?: string }) => item.interpretation)
    .every((item: { interpretation: string }) => item.interpretation.length <= 1_200))
  assert.ok(messages[1].content.length < 30_000, `prompt payload grew to ${messages[1].content.length} characters`)
})

test('pass_angle opening verdict receives its exact quality repair contract without leaking it to later items', () => {
  const birth: BirthInput = { year: 1994, month: 3, day: 11, hour: 9, gender: 'female', calendar: 'solar' }
  const base: SajuReportSection = { id: 'pass-angle-verdict', order: 1, imageKey: '', imageSrc: '', imageAlt: '', category: '나, 붙을 각이야?', categoryEn: '', classification: '전체 흐름 판정', hook: '', interpretation: '', patternKeys: [], ragTopics: [] }
  const context: SajuReportContext = { serviceKey: 'pass_angle', concern: '현재 점수를 유지하면서 오답 복기를 계속하고 싶어요.' }
  const opening = JSON.parse(sectionPrompt(analyzeSaju(birth), birth, context, base)[1].content)
  const later = JSON.parse(sectionPrompt(analyzeSaju(birth), birth, context, { ...base, id: 'pass-angle-current-window', order: 2, classification: '지금이 붙는 구간인지' })[1].content)

  assert.match(opening.instruction, /첫 전체 흐름 판정 전용/)
  assert.match(opening.instruction, /상징.*현실의 정답·결정·명령·증명·보장·확정/)
  assert.match(opening.instruction, /장소 또는 도구.*관찰 행동/)
  assert.match(opening.instruction, /구체 대상.*기록·비교·확인/)
  assert.match(opening.instruction, /한자 묶음은 문장당 하나/)
  assert.doesNotMatch(later.instruction, /첫 전체 흐름 판정 전용/)
})

test('quit_fortune opening verdict receives a failure-specific safety contract without leaking it to later items', () => {
  const birth: BirthInput = { year: 1991, month: 7, day: 18, hour: 12, gender: 'female', calendar: 'solar' }
  const base: SajuReportSection = { id: 'flow-1', order: 1, imageKey: '', imageSrc: '', imageAlt: '', category: '지금 나와도 되는 흐름?', categoryEn: '', classification: '전체 판정', hook: '', interpretation: '', patternKeys: [], ragTopics: [] }
  const context: SajuReportContext = { serviceKey: 'quit_fortune', concern: '남을 조건과 옮길 조건을 실제 정보로 비교하고 싶어요.' }
  const opening = JSON.parse(sectionPrompt(analyzeSaju(birth), birth, context, base)[1].content)
  const later = JSON.parse(sectionPrompt(analyzeSaju(birth), birth, context, { ...base, id: 'flow-2', order: 2, classification: '나가고 싶은 이유의 진짜 정체' })[1].content)
  const advisers = JSON.parse(sectionPrompt(analyzeSaju(birth), birth, context, { ...base, id: 'mental-people-5', order: 43, classification: '다섯 스승의 서로 다른 조언' })[1].content)

  assert.match(opening.instruction, /퇴사운 전체 판정 전용/)
  assert.match(opening.instruction, /퇴사·이직.*조건 표현/)
  assert.match(opening.instruction, /충\(沖,.*쉬운 뜻/)
  assert.match(opening.instruction, /마지막 의미 단락.*확인 대상.*기록·비교·확인/)
  assert.doesNotMatch(later.instruction, /퇴사운 전체 판정 전용/)
  assert.match(later.instruction, /퇴사운 전 항목 공통/)
  assert.match(later.instruction, /미래.*조건부 표현/)
  assert.match(later.instruction, /각 의미 단락.*2~4개/)
  assert.match(later.instruction, /한자 설명.*문장당 하나/)
  assert.match(advisers.instruction, /다섯 관점 전용/)
  assert.match(advisers.instruction, /직접 인용.*하지/)
  assert.match(advisers.instruction, /하게체/)
  assert.match(advisers.instruction, /마지막 의미 단락.*확인할 대상/)
})

test('ZIP common 1 and 2 separate user facts, calculations, symbols and fictional examples', () => {
  const birth: BirthInput = { year: 1994, month: 3, day: 11, hour: 9, gender: 'female', calendar: 'solar' }
  const section: SajuReportSection = { id: 'layers', order: 4, imageKey: '', imageSrc: '', imageAlt: '', category: '관계 기준', categoryEn: '', classification: '지금 관계를 어떻게 볼까?', hook: '', interpretation: '', patternKeys: [], ragTopics: [] }
  const messages = sectionPrompt(analyzeSaju(birth), birth, { serviceKey: 'love_mind', concern: '연락 간격이 달라졌어요.' }, section)
  const payload = JSON.parse(messages[1].content)

  assert.equal(payload.birth, undefined)
  assert.equal(payload.context, undefined)
  assert.equal(payload.featureJson, undefined)
  assert.equal(payload.rag, undefined)
  assert.deepEqual(Object.keys(payload.evidenceLayers), [
    'userFacts', 'verifiedCalculations', 'traditionalInterpretationCandidates', 'fictionalExamplePolicy',
  ])
  assert.equal(payload.evidenceLayers.userFacts.birth.year, 1994)
  assert.equal(payload.evidenceLayers.userFacts.context.concern, '연락 간격이 달라졌어요.')
  assert.ok(payload.evidenceLayers.verifiedCalculations.calculation)
  assert.match(payload.evidenceLayers.fictionalExamplePolicy, /예를 들어|만약/)
  assert.equal(payload.section.order, 4)
  assert.match(payload.instruction, /생년월일.*주소.*고민.*선택지.*반복/)
})

test('ZIP common 1 and 3 reject authoring openings and bare internal fields', () => {
  for (const text of [
    '현재 입력은 안정적인 상태예요.',
    '[현재 기준] 이 항목에서는 관계를 봐요.',
    '단정하기 어렵지만 조건을 봐요.',
    '이 리포트에서는 관계의 흐름을 살펴봐요.',
    '아래 내용을 바탕으로 선택을 정리해요.',
    '제공된 정보를 분석해보겠습니다.',
  ]) {
    assert.equal(reviewToneCopy(text, 'love_mind').passed, false, text)
  }
  for (const word of [
    'concept', 'condition', 'interpretation', 'serviceKey', 'confidence', '검색 점수', '내부 프롬프트',
    'reportFeatures', 'groundedReportFeatures', 'scoring', 'debug', 'metadata', 'outputShape', 'tokenUsage', 'ragTopK',
  ]) {
    assert.equal(reviewToneCopy(`${word}를 근거로 선택해요.`, 'love_mind').passed, false, word)
  }
  assert.equal(reviewToneCopy('약속이 지켜졌는지부터 봐요. “현재 입력은”이라는 말로 설명을 시작하지 않아요.', 'love_mind').passed, true)
  assert.equal(reviewToneCopy('업무 조건이 달라졌는지 확인해요.', 'work_move').passed, true)
})

test('ZIP common 2-1 rejects unsupported prescription numbers but allows input numbers', () => {
  assert.equal(reviewToneCopy('침대를 30cm 떼세요.', 'home_fit', { numericEvidence: [] }).passed, false)
  assert.equal(reviewToneCopy('통화 15분 잡아보세요.', 'love_mind', { numericEvidence: [] }).passed, false)
  const examEvidence = numericEvidenceFrom({ exam: { worry: '최근 58점 문제부터 다시 보려고 해요.' } })
  assert.equal(reviewToneCopy('최근 58점 문제부터 오답노트에 써.', 'pass_angle', { numericEvidence: examEvidence }).passed, true)
  assert.equal(reviewToneCopy('최근 60점 문제부터 오답노트에 써.', 'pass_angle', { numericEvidence: examEvidence }).passed, false)
  const homeEvidence = numericEvidenceFrom({ home: { extraNote: '침대와 벽 사이를 30cm로 재봤어요.' } })
  assert.equal(reviewToneCopy('침대와 벽 사이 30cm를 다시 확인해요.', 'home_fit', { numericEvidence: homeEvidence }).passed, true)
})

test('ZIP common 2-1 verifies arithmetic numbers from grounded inputs', () => {
  const moneyEvidence = numericEvidenceFrom({ money: { memo: '현금 320만원, 고정지출 210만원' } })
  assert.equal(reviewToneCopy('320만원 - 210만원 = 110만원을 기준으로 확인해요.', 'money_save', { numericEvidence: moneyEvidence }).passed, true)
  assert.equal(reviewToneCopy('320만원 - 210만원 = 130만원을 기준으로 확인해요.', 'money_save', { numericEvidence: moneyEvidence }).passed, false)
  assert.equal(reviewToneCopy('320만원 - 200만원 = 120만원을 기준으로 확인해요.', 'money_save', { numericEvidence: moneyEvidence }).passed, false)
  assert.equal(reviewToneCopy('320만원 - 2개월 = 318만원을 기준으로 확인해요.', 'money_save', { numericEvidence: moneyEvidence }).passed, false)
})

test('birth-time-unknown review does not treat the hidden placeholder hour as numeric evidence', () => {
  const birth: BirthInput = { year: 1994, month: 4, day: 15, hour: 12, gender: 'female', calendar: 'solar' }
  const section: SajuReportSection = { id: 'hidden-hour', order: 1, imageKey: '', imageSrc: '', imageAlt: '', category: '공부', categoryEn: '', classification: '무엇을 유지할까?', hook: '', interpretation: '', patternKeys: [], ragTopics: [] }
  const review = (birthTimeKnown: boolean) => reviewGeneratedSajuReportSection({
    analysis: analyzeSaju(birth), birth, context: { serviceKey: 'pass_angle', birthTimeKnown }, section,
    hook: '오답노트를 유지해.', interpretation: '12시에 공부해.',
  }).issues

  assert.ok(review(false).some(issue => /근거 없는 처방 숫자.*12시/.test(issue)))
  assert.ok(review(true).every(issue => !/근거 없는 처방 숫자.*12시/.test(issue)))
})

test('ZIP common 1 and 2 reject ungrounded future, mind and private facts', () => {
  assert.equal(reviewToneCopy('상대는 이미 마음이 떠났어요.', 'love_mind').passed, false)
  assert.equal(reviewToneCopy('상대의 마음은 답장 간격 하나로 확정하지 않아요.', 'love_mind').passed, true)
  assert.equal(reviewToneCopy('올해 결혼해요.', 'love_spouse').passed, false)
  assert.equal(reviewToneCopy('올해 결혼할 수 있어요. 다만 실제 약속과 일정이 기준이에요.', 'love_spouse').passed, true)
  assert.equal(reviewToneCopy('회사는 곧 구조조정해요.', 'work_move').passed, false)
  assert.equal(reviewToneCopy('회사 문화가 보수적이라면 문서 조건을 먼저 봐요.', 'work_move').passed, true)
  assert.equal(reviewToneCopy('고양이가 외로워서 문제 행동을 해요.', 'cat_compatibility').passed, false)
  assert.equal(reviewToneCopy('고양이 행동은 보호자의 관찰 기록으로 확인해요.', 'cat_compatibility').passed, true)
})

test('ZIP common 10 rejects certain human outcomes and symbolic authority', () => {
  assert.equal(reviewSafetyClaims({ text: '상대는 외도하고 있습니다.' }).passed, false)
  assert.equal(reviewSafetyClaims({ text: '수명이 짧습니다.' }).passed, false)
  assert.equal(reviewSafetyClaims({ text: '사주가 이 선택이 정답임을 증명합니다.' }).passed, false)
  assert.equal(reviewSafetyClaims({ text: '합격 여부는 실제 성적과 전형 결과로 확인해야 합니다.' }).passed, true)
  assert.equal(reviewSafetyClaims({ text: '지금 볼 건 합격 후기 피드가 아니라 같은 선지 착각이야.' }).passed, true)
  assert.equal(reviewSafetyClaims({ text: '출생 시각 미상이라 합격 흐름은 여기서 판정에서 제외해.' }).passed, true)
  assert.equal(reviewSafetyClaims({ text: '사주 해석은 선택의 정답을 증명하지 않습니다.' }).passed, true)
  assert.equal(reviewSafetyClaims({ text: '회사는 곧 구조조정해요, 그러니 공고를 확인해요.' }).passed, false)
  assert.equal(reviewSafetyClaims({ text: '상대는 아직 미련이 남아 있어요, 메시지로 확인해요.' }).passed, false)
 assert.equal(reviewSafetyClaims({ text: '가족 갈등이 원인이에요, 대화로 확인해요.' }).passed, false)
  assert.equal(reviewSafetyClaims({ text: '입력 기준 올해 합격합니다.' }).passed, false)
  assert.equal(reviewSafetyClaims({ text: '그 사람이 말했다고 했으니 상대는 미련이 남아 있어요.' }).passed, false)
 assert.equal(reviewSafetyClaims({ text: '불편함을 느낀 회사는 곧 구조조정해요.' }).passed, false)
  assert.equal(reviewSafetyClaims({ text: '올해 합격할 거야.' }).passed, false)
  assert.equal(reviewSafetyClaims({ text: '반드시 이별할 거야.' }).passed, false)
  assert.equal(reviewSafetyClaims({ text: '상대는 돌아올 거야.' }).passed, false)
  assert.equal(reviewSafetyClaims({ text: '올해 합격입니다.' }).passed, false)
  assert.equal(reviewSafetyClaims({ text: '올해 합격이에요.' }).passed, false)
  assert.equal(reviewSafetyClaims({ text: '올해 합격해.' }).passed, false)
  assert.equal(reviewSafetyClaims({ text: '이번 시험은 불합격해.' }).passed, false)
  assert.equal(reviewSafetyClaims({ text: '올해 붙어.' }).passed, false)
  assert.equal(reviewSafetyClaims({ text: '올해 붙을 거야.' }).passed, false)
  assert.equal(reviewSafetyClaims({ text: '운이 나빠 떨어져.' }).passed, false)
  assert.equal(reviewSafetyClaims({ text: '이번에는 떨어질 거야.' }).passed, false)
  assert.equal(reviewSafetyClaims({ text: '실버 금속처럼 차갑고 단정한 물건이 붙어요.' }).passed, true)
  assert.equal(reviewSafetyClaims({ text: '이 기운에는 작고 차가운 표면이 더 잘 붙어요.' }).passed, true)
  assert.equal(reviewSafetyClaims({ text: '오퍼와 생활 조건이 서로 맞으면 퇴사 검토의 근거예요.' }).passed, true)
  assert.equal(reviewSafetyClaims({ text: '오퍼와 생활 조건이 맞고 내년에 퇴사해요.' }).passed, false)
  assert.equal(reviewSafetyClaims({ text: '이직 조건이 맞는지 확인하는 기준선이에요.' }).passed, true)
  assert.equal(reviewSafetyClaims({ text: '재직 중 이직 탐색을 이어가는 기준이에요.' }).passed, true)
  assert.equal(reviewSafetyClaims({ text: '이직 계획은 검토 중이지만 내년에는 이직해요.' }).passed, false)
  assert.equal(reviewSafetyClaims({ text: '쉬고 난 뒤 판단이 돌아오는지 기록하는 기준이에요.' }).passed, true)
  assert.equal(reviewSafetyClaims({ text: '퇴사 생각의 크기보다 쉬어도 판단이 돌아오지 않는 기록을 봐요.' }).passed, true)
  assert.equal(reviewSafetyClaims({ text: '퇴사 생각이 들었으니 내년에 퇴사해요.' }).passed, false)
  assert.equal(reviewSafetyClaims({ text: '그 달은 퇴사 결과가 정해지는 달이 아니라 조건을 확인하는 점검월이에요.' }).passed, true)
  assert.equal(reviewSafetyClaims({ text: '그 달은 퇴사 결과가 정해지는 달이에요.' }).passed, false)
  assert.equal(reviewSafetyClaims({ text: '퇴사 뒤 연락 범위를 정하는 기준이에요.' }).passed, true)
  assert.equal(reviewSafetyClaims({ text: '퇴사 뒤 사고가 나요.' }).passed, false)
  assert.equal(reviewSafetyClaims({ text: '상대는 결국 돌아올 거예요.' }).passed, false)
  assert.equal(reviewSafetyClaims({ text: '회사는 곧 구조조정한다고 관찰돼요.' }).passed, false)
  assert.equal(reviewSafetyClaims({ text: '상대 마음은 이미 떠났다고 관찰돼요.' }).passed, false)
  assert.equal(reviewSafetyClaims({ text: '사주로 미래를 알 수 있어.' }).passed, false)
  assert.equal(reviewSafetyClaims({ text: '명식으로 합격 여부를 알 수 있어.' }).passed, false)
  assert.equal(reviewSafetyClaims({ text: '운세로 상대 마음을 알 수 있어.' }).passed, false)
  assert.equal(reviewSafetyClaims({ text: '사주로 미래를 알 수 있다고 단정할 수 없습니다.' }).passed, true)
  assert.equal(reviewSafetyClaims({ text: '의사가 아니어도 이 약은 끊으세요.' }).passed, false)
  assert.equal(reviewSafetyClaims({ text: '변호사가 아니어도 이 조항은 법적으로 유효합니다.' }).passed, false)
  assert.equal(reviewSafetyClaims({ text: '의료진에게 확인하고 약을 끊으세요.' }).passed, false)
  assert.equal(reviewSafetyClaims({ text: '변호사에게 검토받고 이 계약은 법적으로 유효합니다.' }).passed, false)
})

test('ZIP common 10 puts safety and consent before contact or reconciliation', () => {
  const boundary = { serviceKey: 'love_again', concern: '상대가 차단했고 연락하지 말라고 했어요.' }
  const unsafe = { serviceKey: 'love_again', concern: '상대가 만남을 강요하고 협박했어요.' }
  assert.equal(reviewSafetyClaims({ text: '오늘 먼저 메시지를 보내고 재회를 시도하세요.', context: boundary }).passed, false)
  assert.equal(reviewSafetyClaims({ text: '직접 만나서 화해를 추진하세요.', context: unsafe }).passed, false)
  assert.equal(reviewSafetyClaims({ text: '재접촉하지 말고 상대의 거부와 자신의 안전을 우선하세요.', context: boundary }).passed, true)
})

test('ZIP common 10 does not replace medical legal investment or contract judgment', () => {
  for (const text of [
    '이 증상은 질병입니다.',
    '복용하던 약을 끊으세요.',
    '이 계약은 법적으로 유효합니다.',
    '이 종목에 투자하면 수익이 보장됩니다.',
  ]) {
    assert.equal(reviewSafetyClaims({ text }).passed, false, text)
  }
  assert.equal(reviewSafetyClaims({ text: '증상이 계속되면 의료진에게 확인하세요.' }).passed, true)
  assert.equal(reviewSafetyClaims({ text: '계약 효력은 변호사 등 자격 있는 전문가에게 확인하세요.' }).passed, true)
})

test('ZIP common 10 rejects guardian-chart pet causation and unmeasured feng-shui harm', () => {
  assert.equal(reviewSafetyClaims({
    text: '보호자의 약한 수 기운 때문에 고양이가 공격적입니다.',
    context: { serviceKey: 'cat_compatibility' },
  }).passed, false)
  assert.equal(reviewSafetyClaims({
    text: '고양이 행동은 보호자 사주로 확정할 수 없고 관찰 기록과 수의사 확인이 기준입니다.',
    context: { serviceKey: 'cat_compatibility' },
  }).passed, true)
  assert.equal(reviewSafetyClaims({
    text: '측정하지 않았지만 북동향이라 흉지이며 사고와 집값 하락이 생깁니다.',
    context: { serviceKey: 'home_fit', home: {} },
  }).passed, false)
  assert.equal(reviewSafetyClaims({
    text: '방위와 지형을 측정하지 않았으므로 흉지나 재산 가치를 판단할 수 없습니다.',
    context: { serviceKey: 'home_fit', home: {} },
  }).passed, true)
})

test('ZIP common 10 gives generation every safety boundary before review', () => {
  const instruction = toneWritingInstruction('love_again')
  assert.match(instruction, /외도·질병·수명·합격·채용·수익·결혼·이별/)
  assert.match(instruction, /차단·접촉 거부·위협·강요/)
  assert.match(instruction, /건강·법률·투자·계약/)
  assert.match(instruction, /고양이 행동.*보호자의 사주 결함/)
  assert.match(instruction, /측정하지 않은 방위·지형.*재산 가치/)
})

test('ZIP common 2-1 and 3 require an action target and reject corpus sentence copying', () => {
  const corpus: RagChunk[] = [{
    id: 'love-test', topic: '관계 행동', keywords: ['답장'], domain: 'love_mind_service', content: '',
    knowledge: {
      id: 'love-test', topic: '관계 행동', keywords: ['답장'], concept: '행동 관찰', condition: '답장이 달라졌을 때',
      interpretation: '답장이 늦어졌다면 행동의 일관성을 먼저 확인해요.', real_world_pattern: [],
      risk: '마음을 단정하는 것', opportunity: '약속 이행 확인', advice: '답장보다 약속을 봐요.',
      confidence: 'medium', forbidden_generalization: '마음을 확정하지 않음',
    },
  }]

  assert.equal(reviewToneCopy('확인해요.', 'love_mind', { corpusEvidence: corpus }).passed, false)
  assert.equal(reviewToneCopy('약속이 실제로 지켜졌는지 확인해요.', 'love_mind', { corpusEvidence: corpus }).passed, true)
  assert.equal(reviewToneCopy('답장이 늦어졌다면 행동의 일관성을 먼저 확인해요.', 'love_mind', { corpusEvidence: corpus }).passed, false)
  assert.equal(reviewToneCopy('답장 속도보다 약속을 지키는지 먼저 봐요.', 'love_mind', { corpusEvidence: corpus }).passed, true)
})

test('ZIP common 3 tells generation to use real conditions instead of inventing missing data', () => {
  const birth: BirthInput = { year: 1994, month: 3, day: 11, hour: 9, gender: 'female', calendar: 'solar' }
  const section: SajuReportSection = { id: 'missing', order: 2, imageKey: '', imageSrc: '', imageAlt: '', category: '관계 기준', categoryEn: '', classification: '정보가 없을 때 무엇을 볼까?', hook: '', interpretation: '', patternKeys: [], ragTopics: [] }
  const payload = JSON.parse(sectionPrompt(analyzeSaju(birth), birth, { serviceKey: 'love_mind' }, section)[1].content)

  assert.match(payload.instruction, /자료가 없는 빈칸.*소설.*현실 조건/)
})

test('ZIP common 4 requires a direct answer, grounding, a recognizable scene and a next criterion', () => {
  const base = {
    hook: '지금은 관계를 바꿀 때가 아니라 편안한 방식을 유지할 때예요.',
    question: '지금 관계를 바꿔야 할까?',
    interpretation: [
      '특별한 문제 없이 지낸다고 적었으니 숨은 갈등보다 지금 잘 작동하는 조건을 근거로 봐요.',
      '예를 들어 연락 횟수가 적어도 약속한 시간에 답하고 둘 다 편안한 장면이라면 부족하다고 단정할 이유가 없어요.',
      '다음 변화가 생기면 연락 횟수보다 약속이 계속 지켜지는지를 비교해요.',
    ].join('\n\n'),
    context: { serviceKey: 'love_mind', concern: '특별한 문제 없이 잘 지내고 있어요.' },
  }
  const complete = reviewPaidSectionDensity(base)
  assert.equal(complete.passed, true, JSON.stringify(complete))
  assert.deepEqual(complete.elements, { directAnswer: true, grounding: true, scene: true, nextCriterion: true })

 assert.equal(reviewPaidSectionDensity({ ...base, hook: '지금 관계를 바꿔야 할까?' }).elements.directAnswer, false)
  assert.equal(reviewPaidSectionDensity({ ...base, hook: '지금 관계를 바꿔야 할까? 지금 방식 유지예요.' }).elements.directAnswer, false)
  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: '관계의 흐름을 살펴봐요. 예를 들어 약속 장소에서 기다리는 장면을 떠올려요. 다음에는 약속 시간을 비교해요.' }).elements.grounding, false)
  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: '특별한 문제 없이 지낸다고 적었으니 현재 방식을 유지해요. 다음 변화가 생기면 약속 이행을 비교해요.' }).elements.scene, false)
  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: '특별한 문제 없이 지낸다고 적었으니 현재 방식을 유지해요. 예를 들어. 다음 변화가 생기면 약속 이행을 비교해요.' }).elements.scene, false)
  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: '특별한 문제 없이 지낸다고 적었으니 현재 방식을 유지해요. 만약 그렇다면 달라질 수 있어요. 다음 변화가 생기면 약속 이행을 비교해요.' }).elements.scene, false)
  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: '특별한 문제 없이 지낸다고 적었으니 현재 방식을 유지해요. 예를 들어 독서실에서 실모 인증을 보면 오답노트를 펴봐요. 다음 변화가 생기면 약속 이행을 비교해요.' }).elements.scene, true)
  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: '특별한 문제 없이 지낸다고 적었으니 현재 방식을 유지해요. 예를 들어 서점 앱 장바구니 앞에서는 새 문제집보다 오답노트가 먼저예요. 다음 변화가 생기면 약속 이행을 비교해요.' }).elements.scene, true)
  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: '특별한 문제 없이 지낸다고 적었으니 현재 방식이 기준이에요. 예를 들어 약속 시간에 답하고 둘 다 편안한 장면이 이에 해당해요.' }).elements.nextCriterion, false)
})

test('ZIP common 4 recognizes a concrete lucky_color dressing scene', () => {
  const review = reviewPaidSectionDensity({
    hook: '불은 앞에 있고, 나무는 비어 있어요.',
    question: '넘치는 기운 모자란 기운',
    interpretation: [
      '오행 계산에서 나무는 가장 낮고 불은 이미 올라와 있어 이 차이를 근거로 봐요.',
      '예를 들어 옷장 앞에서 빨간 립, 주황 니트, 골드 액세서리가 같이 보이면 그중 하나를 빼고 흰색이나 실버 하나만 남겨요.',
      '오늘 입고 나갈 옷에서 빨강과 주황이 한꺼번에 올라왔는지 확인해요.',
    ].join('\n\n'),
    context: { serviceKey: 'lucky_color', concern: '채울 색과 덜어낼 색을 알고 싶어요.' },
  })

  assert.equal(review.elements.scene, true, JSON.stringify(review))
  assert.equal(review.elements.grounding, true, JSON.stringify(review))
})

test('ZIP common 4 recognizes choosing an existing lucky_color item as a next action', () => {
  const review = reviewPaidSectionDensity({
    hook: '빈칸은 나무지만, 오늘 앞에 둘 건 실버예요.',
    question: '채워야 할 기운 한 줄',
    interpretation: [
      '오행 계산에서 나무는 가장 낮고 금속이 도움이 되는 기운으로 잡혀 있어 이 차이를 근거로 봐요.',
      '옷장 앞에서 초록 니트와 골드 귀걸이가 같이 보이면 골드를 실버로 바꿔요.',
      '오늘 확인할 대상은 얼굴 가까이에 오는 색과 손에 오래 닿는 물건이에요. 남길 후보는 실버, 흰색, 회색 중 이미 있는 물건으로 골라둬보세요.',
    ].join('\n\n'),
    context: { serviceKey: 'lucky_color', concern: '채울 색과 덜어낼 색을 알고 싶어요.' },
  })

  assert.equal(review.elements.nextCriterion, true, JSON.stringify(review))
})

test('ZIP common 4 recognizes a concrete lucky_color menu scene and choice', () => {
  const review = reviewPaidSectionDensity({
    hook: '오늘 붙일 음식은 흰색·검은색 바탕에 초록을 얹은 쪽이에요.',
    question: '뭘 먹으면 붙어?',
    interpretation: [
      '오행 계산에서 금속과 물은 도움 되는 후보이고 불은 더 얹지 않는 후보라 이 차이를 근거로 봐요.',
      '점심 메뉴판 앞에서 빨간 찌개와 흰밥, 김, 초록 반찬이 있는 구성이 갈리면 후자부터 봐요.',
      '오늘 확인할 대상은 점심 메뉴판의 빨간 양념과 초록 곁들임이에요. 매운 소스가 앞에 나오면 덜어내고 흰색 바탕에 초록을 얹는 구성을 골라요.',
    ].join('\n\n'),
    context: { serviceKey: 'lucky_color', concern: '생활 리듬에 적용할 색을 알고 싶어요.' },
  })

  assert.equal(review.elements.scene, true, JSON.stringify(review))
  assert.equal(review.elements.nextCriterion, true, JSON.stringify(review))
})

test('ZIP common 4 recognizes a targeted pass_angle next action but rejects vague encouragement', () => {
  const base = {
    hook: '새 자료보다 하던 루틴을 남길 때야.',
    question: '남은 시간에 무엇을 유지할까?',
    interpretation: '평소 연습 점수가 목표 수준이라고 적었으니 지금 루틴을 근거로 봐. 예를 들어 시험 전날 책상에서 새 자료를 펼치는 장면은 버릴 변수야. 다음 시험 전날 오답 루틴으로 다시 세워봐.',
    context: { serviceKey: 'pass_angle', concern: '남은 하루에 무엇을 유지할지 궁금해요.' },
  }

  const concrete = reviewPaidSectionDensity(base)
  assert.equal(concrete.elements.nextCriterion, true, JSON.stringify(concrete))
  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: base.interpretation.replace('다음 시험 전날 오답 루틴으로 다시 세워봐.', '다음에는 잘해봐.') }).elements.nextCriterion, false)
  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: base.interpretation.replace('다음 시험 전날 오답 루틴으로 다시 세워봐.', '다음에는 확인해.') }).elements.nextCriterion, false)
  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: base.interpretation.replace('다음 시험 전날 오답 루틴으로 다시 세워봐.', '오늘 버릴 새 자료를 정해.') }).elements.nextCriterion, true)
  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: base.interpretation.replace('다음 시험 전날 오답 루틴으로 다시 세워봐.', '오늘 버릴 공부를 정해.') }).elements.nextCriterion, false)
  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: base.interpretation.replace('다음 시험 전날 오답 루틴으로 다시 세워봐.', '오늘 포기할 시험을 정해.') }).elements.nextCriterion, false)
  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: base.interpretation.replace('다음 시험 전날 오답 루틴으로 다시 세워봐.', '오늘 끊을 수험 준비를 정해.') }).elements.nextCriterion, false)
  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: base.interpretation.replace('다음 시험 전날 오답 루틴으로 다시 세워봐.', '오늘 포기해야 할 공부를 정해.') }).elements.nextCriterion, false)
  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: base.interpretation.replace('다음 시험 전날 오답 루틴으로 다시 세워봐.', '다음에는 남길 공부 순서를 매겨.') }).elements.nextCriterion, true)
  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: base.interpretation.replace('다음 시험 전날 오답 루틴으로 다시 세워봐.', '오늘 준비물만 기록해 보지 마.') }).elements.nextCriterion, false)
  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: base.interpretation.replace('다음 시험 전날 오답 루틴으로 다시 세워봐.', '오늘 준비물을 기록해 볼 생각은 없어.') }).elements.nextCriterion, false)
  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: base.interpretation.replace('다음 시험 전날 오답 루틴으로 다시 세워봐.', '오늘 준비물을 확인해 볼 계획도 없어.') }).elements.nextCriterion, false)
  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: base.interpretation.replace('다음 시험 전날 오답 루틴으로 다시 세워봐.', '오늘 준비물을 기록할 의사조차 없어.') }).elements.nextCriterion, false)
  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: base.interpretation.replace('다음 시험 전날 오답 루틴으로 다시 세워봐.', '오늘 준비물을 비교해 볼 의사는 없어.') }).elements.nextCriterion, false)
  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: base.interpretation.replace('다음 시험 전날 오답 루틴으로 다시 세워봐.', '오늘 준비물을 확인해 볼 계획은 없어.') }).elements.nextCriterion, false)
  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: base.interpretation.replace('다음 시험 전날 오답 루틴으로 다시 세워봐.', '오늘 준비물을 확인하기 싫어.') }).elements.nextCriterion, false)
  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: base.interpretation.replace('다음 시험 전날 오답 루틴으로 다시 세워봐.', '오늘 공부를 포기할 이유를 확인해.') }).elements.nextCriterion, false)
  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: base.interpretation.replace('다음 시험 전날 오답 루틴으로 다시 세워봐.', '오늘 공부를 버릴 이유를 확인해.') }).elements.nextCriterion, false)
  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: base.interpretation.replace('다음 시험 전날 오답 루틴으로 다시 세워봐.', '오늘 공부를 끊을 이유를 확인해.') }).elements.nextCriterion, false)
  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: base.interpretation.replace('다음 시험 전날 오답 루틴으로 다시 세워봐.', '오늘 공부를 포기하지 말고 준비물만 기록해.') }).elements.nextCriterion, true)
  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: base.interpretation.replace('다음 시험 전날 오답 루틴으로 다시 세워봐.', '오늘 공부를 포기하지는 말고 준비물만 기록해.') }).elements.nextCriterion, true)
  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: base.interpretation.replace('다음 시험 전날 오답 루틴으로 다시 세워봐.', '오늘 수험 준비를 포기할 이유를 확인해.') }).elements.nextCriterion, false)
  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: base.interpretation.replace('다음 시험 전날 오답 루틴으로 다시 세워봐.', '오늘 수험 준비를 포기하지 말고 준비물만 기록해.') }).elements.nextCriterion, true)
  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: base.interpretation.replace('다음 시험 전날 오답 루틴으로 다시 세워봐.', '오늘 시험장 버스 시간을 확인해.') }).elements.nextCriterion, true)
  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: base.interpretation.replace('다음 시험 전날 오답 루틴으로 다시 세워봐.', '오늘 응시 접수 번호를 확인해.') }).elements.nextCriterion, true)
  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: base.interpretation.replace('다음 시험 전날 오답 루틴으로 다시 세워봐.', '오늘 공부를 버티는 시간을 확인해.') }).elements.nextCriterion, true)
  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: base.interpretation.replace('다음 시험 전날 오답 루틴으로 다시 세워봐.', '오늘 공부를 끊김 없이 이어갈 순서를 기록해.') }).elements.nextCriterion, true)
  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: base.interpretation.replace('다음 시험 전날 오답 루틴으로 다시 세워봐.', '오늘 준비물을 기록해 둔 게 기준이야.') }).elements.nextCriterion, false)
  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: base.interpretation.replace('다음 시험 전날 오답 루틴으로 다시 세워봐.', '다음 시험 전날 시험을 버려.') }).elements.nextCriterion, false)
  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: base.interpretation.replace('다음 시험 전날 오답 루틴으로 다시 세워봐.', '다음 시험 전날 공부를 끊어.') }).elements.nextCriterion, false)
})

test('ZIP common 4 recognizes a polite targeted marking proposal but rejects a targetless proposal', () => {
  const base = {
    hook: '지금은 두 선택의 조건을 나란히 보는 단계예요.',
    question: '전체 판정',
    context: { serviceKey: 'quit_fortune', concern: '남을 조건과 옮길 조건을 비교하고 싶어요.' },
  }
  const grounded = '확인된 이유와 현재 계획을 근거로 판단해요. 예를 들어 책상에서 역할표와 채용공고를 함께 펼쳐 보는 경우가 있어요. 먼저 확인할 대상은 현재 역할과 후보 역할이에요. 두 역할의 겹치는 업무를 표시하시겠어요?'
  const targetless = grounded.replace('두 역할의 겹치는 업무를 표시하시겠어요?', '먼저 표시하시겠어요?')

  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: grounded }).elements.nextCriterion, true)
  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: targetless }).elements.nextCriterion, false)
})

test('ZIP common 4 carries a concrete next judgment target into the adjacent action sentence', () => {
  const base = {
    hook: '지금은 후보 역할의 조건을 먼저 대조할 단계예요.',
    question: '이유의 정체',
    context: { serviceKey: 'quit_fortune', concern: '현재 역할과 성장 방향을 검토하고 싶어요.' },
  }
  const grounded = '입력한 고민을 근거로 판단해요. 예를 들어 책상에서 역할표와 채용공고를 함께 펼쳐 보는 경우가 있어요. 다음 판단 대상은 현재 역할표와 지원 공고예요. 역할표에는 맡은 업무를 적고, 공고에는 필요한 기술을 따로 표시하시겠어요?'
  const targetless = grounded.replace('역할표에는 맡은 업무를 적고, 공고에는 필요한 기술을 따로 표시하시겠어요?', '먼저 표시하시겠어요?')

  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: grounded }).elements.nextCriterion, true)
  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: targetless }).elements.nextCriterion, false)
})

test('ZIP common 4 recognizes a polite targeted recording proposal but not a targetless one', () => {
  const base = {
    hook: '지금은 실제 결과물을 문서로 남길 단계예요.',
    question: '인정 욕구의 영향',
    context: { serviceKey: 'quit_fortune', concern: '성장 방향을 검토하고 싶어요.' },
  }
  const grounded = '입력한 고민을 근거로 판단해요. 예를 들어 퇴근 뒤 책상에서 업무 목록을 펼쳐 보는 경우가 있어요. 확인할 대상은 최근 업무와 산출물이에요. 업무 목록에 실제 남긴 결과물을 기록하시겠어요?'
  const targetless = grounded.replace('업무 목록에 실제 남긴 결과물을 기록하시겠어요?', '기록하시겠어요?')

  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: grounded }).elements.nextCriterion, true)
  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: targetless }).elements.nextCriterion, false)
})

test('ZIP common 4 recognizes a targeted note-and-separate action without accepting a bare connector', () => {
  const base = {
    hook: '몸의 신호와 업무 조건을 분리해서 볼 단계예요.',
    question: '번아웃인지',
    context: { serviceKey: 'quit_fortune', concern: '현재 역할과 성장 방향을 검토하고 싶어요.' },
  }
  const grounded = '입력한 고민을 근거로 판단해요. 예를 들어 퇴근 뒤 책상에서 상태표를 펼쳐 보는 경우가 있어요. 다음 기록 대상은 회복감과 업무 조건이에요. 업무 조건을 따로 적고 몸의 신호와 섞지 마시겠어요?'
  const targetless = grounded.replace('업무 조건을 따로 적고 몸의 신호와 섞지 마시겠어요?', '다음에는 적고 끝내요.')

  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: grounded }).elements.nextCriterion, true)
  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: targetless }).elements.nextCriterion, false)
})

test('ZIP common 4 carries a named keep-contact target into an adjacent recording proposal', () => {
  const base = {
    hook: '다시 연락할 근거가 있는 관계만 남길 단계예요.',
    question: '다시 만날 인연',
    context: { serviceKey: 'quit_fortune', concern: '현재 역할과 성장 방향을 검토하고 싶어요.' },
  }
  const grounded = '입력한 고민을 근거로 판단해요. 예를 들어 마지막 업무 메일을 쓰는 장면이 있어요. 남길 대상은 함께 결과물을 만든 동료와 문서 담당자예요. 각 대상에게 남길 업무 문장을 기록하시겠어요?'
  const targetless = grounded.replace('각 대상에게 남길 업무 문장을 기록하시겠어요?', '기록하시겠어요?')

  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: grounded }).elements.nextCriterion, true)
  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: targetless }).elements.nextCriterion, false)
})

test('ZIP common 4 does not confuse the noun 말로 with a negative command', () => {
  const base = {
    hook: '확인된 조건과 말로만 남은 조건을 나눌 단계예요.',
    question: '다섯 관점',
    context: { serviceKey: 'quit_fortune', concern: '조건을 검토하고 싶어요.' },
  }
  const grounded = '입력한 고민을 근거로 판단해요. 예를 들어 책상에서 업무 문서를 펼쳐 보는 경우가 있어요. 확인할 대상은 업무 조건과 생활 조건이에요. 문서에 적고, 확인된 것과 말로만 남은 것을 나눠 기록하시겠어요?'
  const negated = grounded.replace('나눠 기록하시겠어요?', '기록하지 말아요.')

  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: grounded }).elements.nextCriterion, true)
  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: negated }).elements.nextCriterion, false)
})

test('ZIP common 4 recognizes a per-item concrete recording action', () => {
  assert.equal(comparativeNextCriterion('확인 대상은 가채점표와 오답노트야. 틀린 문제마다 기존 오답 이름인지 새 실수인지 기록해.'), true)
  assert.equal(comparativeNextCriterion('확인 대상은 공식 컷과 성적표의 틀린 영역이야. 오답노트에 실제 오답과 기억 오답을 따로 기록해봐.'), true)
  assert.equal(comparativeNextCriterion('확인 대상은 문제야. 항목마다 기록해.'), false)
})

const comparativeNextCriterion = (criterion: string) => reviewPaidSectionDensity({
  hook: '같은 실수의 반복 여부를 다음 기준으로 봐.',
  question: '무엇을 다음 판단 기준으로 삼을까?',
  context: { serviceKey: 'pass_angle', concern: '같은 실수를 반복하는지 확인하고 싶어요.' },
  interpretation: `같은 실수를 반복한다고 적었으니 그 이유를 근거로 봐. 예를 들어 실모 복기에서 오답 이유를 분류하는 장면이 기준이야. ${criterion}`,
}).elements.nextCriterion

test('ZIP common 4 recognizes safe comparison try-action morphology', () => {
  assert.equal(comparativeNextCriterion('다음 실모 뒤 같은 이유를 비교해봐.'), true)
})

test('ZIP common 4 recognizes a subject-marked observable target with an existing action', () => {
  assert.equal(comparativeNextCriterion('다음 실모 뒤 같은 이유가 남는지 비교해.'), true)
})

test('ZIP common 4 recognizes an observable conditional result with a concrete nominal decision', () => {
  assert.equal(comparativeNextCriterion('다음 풀이에서 같은 표시가 줄면 지금 방식 유지야.'), true)
  assert.equal(comparativeNextCriterion('다음 실모 뒤 같은 표시가 남으면 같이 설명하고, 줄면 혼자 유지해.'), true)
  assert.equal(comparativeNextCriterion('다음 풀이에서 같은 표시가 줄면 좋아.'), false)
  assert.equal(comparativeNextCriterion('같은 표시가 줄면 지금 방식 유지야.'), false)
  assert.equal(comparativeNextCriterion('다음 풀이에서 같은 표시가 줄었으니 지금 방식 유지야.'), false)
  assert.equal(comparativeNextCriterion('다음 풀이에서 같은 표시가 줄면 시험 포기야.'), false)
})

test('ZIP common 4 recognizes a conditional review action with a concrete target', () => {
  assert.equal(comparativeNextCriterion('다음 풀이에서 같은 이름이 남으면 그 부분만 복기해.'), true)
  assert.equal(comparativeNextCriterion('다음 풀이에서 남으면 복기해.'), false)
  assert.equal(comparativeNextCriterion('다음 풀이에서 같은 이름이 남으면 그 부분만 복기해 보지 마.'), false)
})

test('ZIP common 4 recognizes a conditional observable 유지각 decision', () => {
  assert.equal(comparativeNextCriterion('다음 연습 문제지에서 같은 이름이 줄면 현재 방법 유지각이야.'), true)
  assert.equal(comparativeNextCriterion('실모 뒤 책상에서 첫 손이 간 대상을 적고 같은 오답 이름이 줄면 유지각이야.'), true)
  assert.equal(comparativeNextCriterion('다음 연습 문제지에서 줄면 유지각이야.'), false)
  assert.equal(comparativeNextCriterion('책상에서 같은 오답 이름이 줄면 유지각이야.'), false)
  assert.equal(comparativeNextCriterion('같은 이름이 줄면 현재 방법 유지각이야.'), false)
})

test('quoted predicates do not become a false customer address after quote stripping', () => {
  assert.equal(reviewToneCopy('지금 버릴 말은 “더 풀어”야.', 'pass_angle', { contentRole: 'hook' }).passed, true)
  assert.equal(reviewToneCopy('야, 지금 새 자료를 열어.', 'pass_angle', { contentRole: 'hook' }).passed, false)
})

test('ZIP common 4 recognizes a completed observable check before a comparison action', () => {
  assert.equal(comparativeNextCriterion('다음 실모에서 같은 이름이 남았는지 비교해.'), true)
  assert.equal(comparativeNextCriterion('다음 실모에서 같은 이유가 다시 찍혔는지 비교해봐.'), true)
  assert.equal(comparativeNextCriterion('다음 예행에서 그 순서가 실모 때와 맞는지 비교해봐.'), true)
  assert.equal(comparativeNextCriterion('다음 실모에서 남았는지 비교해.'), false)
  assert.equal(comparativeNextCriterion('다음 실모에서 다시 찍혔는지 비교해봐.'), false)
  assert.equal(comparativeNextCriterion('다음 예행에서 맞는지 비교해봐.'), false)
  assert.equal(comparativeNextCriterion('같은 이름이 남았는지 비교해.'), false)
})

test('ZIP common 4 recognizes a month-by-month conditional decision', () => {
  assert.equal(comparativeNextCriterion('달별로 같은 이름이 줄면 유지각, 늘면 새 자료는 나중이야.'), true)
  assert.equal(comparativeNextCriterion('달별로 줄면 유지각이야.'), false)
  assert.equal(comparativeNextCriterion('달별로 같은 이름이 줄면 좋아.'), false)
})

test('ZIP common 4 recognizes a concrete conditional postponement decision', () => {
  assert.equal(comparativeNextCriterion('다음 실모 뒤에도 같은 이름이 남으면 새 자료는 나중이야.'), true)
  assert.equal(comparativeNextCriterion('다음 실모 뒤에도 남으면 나중이야.'), false)
  assert.equal(comparativeNextCriterion('같은 이름이 남으면 새 자료는 나중이야.'), false)
})

test('ZIP common 4 keeps comparative subject-target negatives narrow', () => {
  // Combined production-shaped positives.
  assert.equal(comparativeNextCriterion('다음 실모 뒤 같은 이유가 남는지 비교해봐.'), true)
  assert.equal(comparativeNextCriterion('다음 실모 뒤 같은 실수가 줄었는지 확인해봐.'), true)

  assert.equal(comparativeNextCriterion('다음 실모 뒤 비교해봐.'), false)
  assert.equal(comparativeNextCriterion('다음에는 잘해봐.'), false)
  assert.equal(comparativeNextCriterion('다음 실모 뒤 같은 이유가 남는지 비교해봐 말아.'), false)
  assert.equal(comparativeNextCriterion('다음 실모 뒤 같은 이유가 남는지 비교해봐 둔 게 기준이야.'), false)
  assert.equal(comparativeNextCriterion('다음 실모 뒤 시험을 버릴지 비교해봐.'), false)
})

test('ZIP common 4 does not treat temporal origins as comparison targets', () => {
  assert.equal(comparativeNextCriterion('앞으로 비교해봐.'), false)
  assert.equal(comparativeNextCriterion('앞으로 잘 확인해봐.'), false)
  assert.equal(comparativeNextCriterion('다음 실모부터 확인해봐.'), false)
  assert.equal(comparativeNextCriterion('다음 시험부터 비교해봐.'), false)
  assert.equal(comparativeNextCriterion('다음에는 아침부터 확인해.'), false)
  assert.equal(comparativeNextCriterion('다음에는 오전부터 비교해봐.'), false)
  assert.equal(comparativeNextCriterion('다음에는 저녁부터 기록해.'), false)
  assert.equal(comparativeNextCriterion('오늘만 확인해.'), false)
  assert.equal(comparativeNextCriterion('다음만 기록해.'), false)
  assert.equal(comparativeNextCriterion('다음과 비교해봐.'), false)
  assert.equal(comparativeNextCriterion('오늘 준비물만 확인해.'), true)
})

test('ZIP common 4 rejects spaced past and perfect comparison auxiliaries', () => {
  assert.equal(comparativeNextCriterion('다음 실모 뒤 같은 이유를 비교해 봤어.'), false)
  assert.equal(comparativeNextCriterion('다음 실모 뒤 같은 이유를 비교해 본 게 기준이야.'), false)
  assert.equal(comparativeNextCriterion('다음 실모 뒤 같은 이유를 확인해 보았어.'), false)
})

test('ZIP common 4 connects an adjacent plan setting only to a concrete safe next action', () => {
  const input = {
    hook: '새 자료보다 평소 루틴 유지가 먼저야.',
    question: '남은 시간에 무엇을 유지할까?',
    interpretation: [
      '입력된 시험일은 이미 지난 날짜야. 그래서 다음 실전의 당일 루틴으로 다시 볼게.',
      '판정은 유지각이야. 연습 점수가 목표 수준이고 큰 불안이 없다고 했으니, 남은 하루에 새 범위를 여는 건 나중이야.',
      '객관식은 새 지식보다 실수 차단이 커. 예를 들어 시험장 앞에서 새 요약본을 열면, 아는 문제까지 손이 늦어져.',
      '오늘 남길 건 오답노트야. 준비물, 이동 경로, 첫 과목 시작 전 볼 표시 문제만 기록해. 새 실모는 버려봐.',
    ].join('\n\n'),
    context: {
      serviceKey: 'pass_angle',
      concern: '평소 연습 점수는 목표 수준이고 큰 불안은 없어요.',
      exam: { examName: '합성 필기 시험', examDate: '2026-09-08', examType: 'objective', worry: '남은 하루에 무엇을 유지할지 궁금해요' },
    },
  }

  const captured = reviewPaidSectionDensity(input)
  assert.equal(captured.elements.directAnswer, true)
  assert.equal(captured.elements.grounding, true)
  assert.equal(captured.elements.scene, true)
  assert.equal(captured.elements.nextCriterion, true, JSON.stringify(captured))

  const replaceClosing = (closing: string) => input.interpretation.replace(
    '오늘 남길 건 오답노트야. 준비물, 이동 경로, 첫 과목 시작 전 볼 표시 문제만 기록해. 새 실모는 버려봐.',
    closing,
  )
  assert.equal(reviewPaidSectionDensity({ ...input, interpretation: replaceClosing('오늘 남길 건 오답노트야. 다음에는 잘해봐.') }).elements.nextCriterion, false)
  assert.equal(reviewPaidSectionDensity({ ...input, interpretation: replaceClosing('오늘 남길 건 오답노트야. 기록해.') }).elements.nextCriterion, false)
  assert.equal(reviewPaidSectionDensity({ ...input, interpretation: replaceClosing('오늘 남길 건 오답노트야. 준비물을 기록했어.') }).elements.nextCriterion, false)
  assert.equal(reviewPaidSectionDensity({ ...input, interpretation: replaceClosing('오늘 남길 건 오답노트야. 준비물을 기록해 둔 게 기준이야.') }).elements.nextCriterion, false)
  assert.equal(reviewPaidSectionDensity({ ...input, interpretation: replaceClosing('오늘 남길 건 오답노트야. 준비물만 기록해 보지 마.') }).elements.nextCriterion, false)
  assert.equal(reviewPaidSectionDensity({ ...input, interpretation: replaceClosing('오늘 남길 건 오답노트야. 준비물만 기록해 보지는 마.') }).elements.nextCriterion, false)
  assert.equal(reviewPaidSectionDensity({ ...input, interpretation: replaceClosing('오늘 남길 건 오답노트야. 준비물만 안 기록해.') }).elements.nextCriterion, false)
  assert.equal(reviewPaidSectionDensity({ ...input, interpretation: replaceClosing('오늘 시험을 버릴 기준이야. 준비물을 확인해.') }).elements.nextCriterion, false)
  assert.equal(reviewPaidSectionDensity({ ...input, interpretation: replaceClosing('오늘 남길 건 오답노트야. 시험을 버려.') }).elements.nextCriterion, false)
  assert.equal(reviewPaidSectionDensity({ ...input, interpretation: replaceClosing('오늘 남길 건 오답노트야. 공부를 끊어.') }).elements.nextCriterion, false)
  assert.equal(reviewPaidSectionDensity({ ...input, interpretation: replaceClosing('오늘 남길 건 오답노트야. 숨을 한번 고르면 돼. 준비물만 기록해.') }).elements.nextCriterion, false)
})

test('ZIP common 4 connects a named target for the next day to its adjacent action', () => {
  assert.equal(comparativeNextCriterion('확인할 대상은 자는 시각과 다음 날 첫 문제 반응이야. 오답노트 위에 자는 시각, 졸림, 멍함을 적어봐.'), true)
  assert.equal(comparativeNextCriterion('확인할 대상은 다음 날 반응이야. 적어봐.'), false)
  assert.equal(comparativeNextCriterion('확인할 대상은 자는 시각과 첫 문제 반응이야. 오답노트에 적어봐.'), false)
})

test('ZIP common 4 connects an explicit check target to an adjacent concrete note action', () => {
  assert.equal(comparativeNextCriterion('확인할 대상은 실모 전후의 배고픔, 더부룩함, 졸림이야. 오답노트 맨 아래에 그날 먹은 것과 몸 반응을 같이 적어.'), true)
  assert.equal(comparativeNextCriterion('확인 대상은 채점 직후 첫 대화와 펼친 도구야. 그날 누가 같은 오답 이름을 물었는지 적어봐.'), true)
  assert.equal(comparativeNextCriterion('확인 대상은 예행 날 아침 첫 도구야. 수험표, 필기구, 오답노트 중 손이 먼저 간 걸 기록해. 그 순서가 실모 때와 맞는지 비교해봐.'), true)
  assert.equal(comparativeNextCriterion('확인 대상은 예행 날 아침 첫 변수야. 책상 위 변수를 기록해. 실모 때 반복 실수가 줄던 날의 루틴과 비교해봐.'), true)
  assert.equal(comparativeNextCriterion('확인 대상은 예행 날 아침 첫 변수야. 책상 위에 새 자료가 끼었어. 실모 때 반복 실수가 줄던 날의 루틴과 비교해봐.'), true)
  assert.equal(comparativeNextCriterion('확인할 대상은 몸 상태야. 적어.'), false)
  assert.equal(comparativeNextCriterion('몸 상태가 중요해. 오답노트에 적어.'), false)
  assert.equal(comparativeNextCriterion('확인 대상은 변수야. 비교해봐.'), false)
})

test('ZIP common 4 recognizes multiple specific user facts as grounding without accepting generic overlap', () => {
  const input = {
    hook: '새 자료보다 하던 루틴을 유지할 때야.',
    question: '시험 전날 무엇을 유지할까?',
    interpretation: '연습 점수가 목표 수준이고 객관식이라, 전날 책상 기준은 새 프린트보다 반복 실수 차단이야. 예를 들어 시험 전날 책상에서 오답을 다시 보는 장면이 맞아. 다음 시험에는 오답 루틴을 기준으로 정해.',
    context: {
      serviceKey: 'pass_angle',
      concern: '평소 연습 점수는 목표 수준이고 큰 불안은 없어요.',
      exam: { examType: 'objective' },
    },
  }

  assert.equal(reviewPaidSectionDensity(input).elements.grounding, true)
  assert.equal(reviewPaidSectionDensity({ ...input, interpretation: '목표권 연습 점수와 객관식 시험이면, 책상 자리는 실수 추적용이야. 책상에 앉으면 채점표와 오답노트만 보이게 해. 다음 실모 뒤 같은 오답 이름이 줄면 그 자리 유지각이야.' }).elements.grounding, true)
  assert.equal(reviewPaidSectionDensity({ ...input, interpretation: '객관식은 반복이 중요해. 예를 들어 시험 전날 책상에서 오답을 다시 봐. 다음 시험에는 오답 루틴을 기준으로 정해.' }).elements.grounding, false)
  assert.equal(reviewPaidSectionDensity({ ...input, context: undefined }).elements.grounding, false)

  const sharedAcrossFields = {
    serviceKey: 'pass_angle', concern: '불안', exam: { priority: '루틴', worry: '자료' },
  }
  assert.equal(reviewPaidSectionDensity({
    ...input,
    interpretation: '불안은 루틴과 자료로 정리해. 예를 들어 시험 전날 책상에서 오답을 다시 봐. 다음 시험에는 오답 루틴을 기준으로 정해.',
    context: sharedAcrossFields,
  }).elements.grounding, false)

  const privateOnly = {
    serviceKey: 'pass_angle', name: '당근모자', savedChat: { summary: '오답 루틴 기록' },
  } as SajuReportContext
  assert.equal(reviewPaidSectionDensity({
    ...input,
    interpretation: '당근모자 오답 루틴 기록이야. 예를 들어 시험 전날 책상에서 다시 봐. 다음 시험에는 오답 루틴을 기준으로 정해.',
    context: privateOnly,
  }).elements.grounding, false)
})

test('ZIP common 4 recognizes sitting down at a desk as a concrete scene', () => {
  const base = {
    hook: '책상은 실수 추적용으로 둬.',
    question: '책상은 어디에 둘까?',
    context: { serviceKey: 'pass_angle', concern: '평소 연습 점수는 목표 수준이고 큰 불안은 없어요.', exam: { examType: 'objective' as const } },
  }
  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: '목표권 연습 점수와 객관식 시험이면 실수 추적이 먼저야. 책상에 앉으면 채점표, 오답노트, 오늘 풀 문제만 바로 보이게 해. 다음 실모 뒤 같은 오답 이름이 줄면 그 자리 유지각이야.' }).elements.scene, true)
  assert.equal(reviewPaidSectionDensity({ ...base, interpretation: '책상이 중요해. 채점표와 오답노트를 준비해. 다음 실모 뒤 같은 오답 이름이 줄면 그 자리 유지각이야.' }).elements.scene, false)
})

test('ZIP common 4 recognizes a concrete review session without treating review words as a scene', () => {
  const input = {
    hook: '당일 처방보다 다음 응시 루틴 유지각이야.',
    question: '시험 다음에는 무엇을 유지할까?',
    interpretation: [
      '시험일은 이미 지나서, 다음엔 시험장 표시 규칙과 넘길 문제 기준만 고정해봐. 연습 점수가 목표 수준이고 큰 불안이 없었다면, 바꿀 건 공부량이 아니라 당일 변수야.',
      '태어난 날의 중심 기운은 금속이야. 전통 해석에선 금속을 잘게 가르고 맞틀을 확인하는 흐름으로 봐. 객관식에는 새 지식보다 선택지 제거와 마킹 순서가 맞는 축이야.',
      '다음 복기에서 기억나는 문제를 맞힌 것과 찍은 것으로 나눠봐. 찍은 문제는 오답노트에 지식 부족, 표시 실수, 시간 밀림 중 무엇이었는지만 기록해. 새 회독은 그다음이야.',
    ].join('\n\n'),
    context: {
      serviceKey: 'pass_angle',
      concern: '평소 연습 점수는 목표 수준이고 큰 불안은 없어요.',
      exam: { examType: 'objective' },
    },
  }

  assert.equal(reviewPaidSectionDensity(input).elements.scene, true)

  const beforeReview = input.interpretation.split('\n\n').slice(0, 2).join('\n\n')
  assert.equal(reviewPaidSectionDensity({ ...input, interpretation: `${beforeReview}\n\n오답노트가 중요해. 다음에는 복기해.` }).elements.scene, false)
  assert.equal(reviewPaidSectionDensity({ ...input, interpretation: `${beforeReview}\n\n다음 복기에서 잘해봐.` }).elements.scene, false)
  assert.equal(reviewPaidSectionDensity({ ...input, interpretation: `${beforeReview}\n\n찍은 문제의 원인을 분류하고 기록해.` }).elements.scene, false)
  assert.equal(reviewPaidSectionDensity({ ...input, interpretation: `${beforeReview}\n\n찍은 문제를 분류하면 다음 기준이 보여.` }).elements.scene, false)
  assert.equal(reviewPaidSectionDensity({ ...input, interpretation: `${beforeReview}\n\n틀린 문제에서 지식 부족만 확인해.` }).elements.scene, false)
  assert.equal(reviewPaidSectionDensity({ ...input, interpretation: `${beforeReview}\n\n다음 복기에서 기록하지 말고 쉬어.` }).elements.scene, false)
  assert.equal(reviewPaidSectionDensity({ ...input, interpretation: `${beforeReview}\n\n다음 복기에서 기록은 하지 말고 쉬어.` }).elements.scene, false)
  assert.equal(reviewPaidSectionDensity({ ...input, interpretation: `${beforeReview}\n\n다음 복기에서 나누지 말고 쉬어.` }).elements.scene, false)
  assert.equal(reviewPaidSectionDensity({ ...input, interpretation: `${beforeReview}\n\n복기 때 기록 기준이 중요해.` }).elements.scene, false)
  assert.equal(reviewPaidSectionDensity({ ...input, interpretation: `${beforeReview}\n\n다음 복기에서 기록하기가 중요해.` }).elements.scene, false)
  assert.equal(reviewPaidSectionDensity({ ...input, interpretation: `${beforeReview}\n\n다음 복기에서 잘해봐, 시험장 위치를 확인해.` }).elements.scene, false)
  assert.equal(reviewPaidSectionDensity({ ...input, interpretation: `${beforeReview}\n\n다음 복기에서 기록해, 문제는 잊어.` }).elements.scene, false)
  assert.equal(reviewPaidSectionDensity({ ...input, interpretation: `${beforeReview}\n\n다음 복기에서 확인해, 찍은 문제는 넘어가.` }).elements.scene, false)
  assert.equal(reviewPaidSectionDensity({ ...input, interpretation: `${beforeReview}\n\n다음 복기에서 찍은 문제를 분류하고 싶지 않아.` }).elements.scene, false)
  assert.equal(reviewPaidSectionDensity({ ...input, interpretation: `${beforeReview}\n\n오답노트를 열고 찍은 문제의 원인을 기록해.` }).elements.scene, true)
  assert.equal(reviewPaidSectionDensity({ ...input, interpretation: `${beforeReview}\n\n오답노트에 지식 부족을 기록해.` }).elements.scene, true)
  assert.equal(reviewPaidSectionDensity({ ...input, interpretation: `${beforeReview}\n\n오답 노트에 지식 부족을 기록해.` }).elements.scene, true)
  assert.equal(reviewPaidSectionDensity({ ...input, interpretation: `${beforeReview}\n\n오답노트에서 지식 부족을 기록해.` }).elements.scene, true)
  assert.equal(reviewPaidSectionDensity({ ...input, interpretation: `${beforeReview}\n\n오답노트에선 지식 부족을 기록해.` }).elements.scene, true)
  assert.equal(reviewPaidSectionDensity({ ...input, interpretation: `${beforeReview}\n\n복기 때 찍은 이유를 기록해.` }).elements.scene, true)
  assert.equal(reviewPaidSectionDensity({ ...input, interpretation: `${beforeReview}\n\n복기하면서 찍은 이유를 기록해.` }).elements.scene, true)
  assert.equal(reviewPaidSectionDensity({ ...input, interpretation: `${beforeReview}\n\n마킹 검토를 하면서 표시 실수를 확인해.` }).elements.scene, true)
  assert.equal(reviewPaidSectionDensity({ ...input, interpretation: `${beforeReview}\n\n마킹 검토에서 표시 실수를 확인해.` }).elements.scene, true)
  assert.equal(reviewPaidSectionDensity({ ...input, interpretation: `${beforeReview}\n\n마킹 검토할 때 표시 실수를 확인해.` }).elements.scene, true)
  assert.equal(reviewPaidSectionDensity({ ...input, interpretation: `${beforeReview}\n\n다음 복기에서 기록하지 말고, 찍은 이유만 나눠봐.` }).elements.scene, true)
  assert.equal(reviewPaidSectionDensity({ ...input, interpretation: `${beforeReview}\n\n다음 복기에서 찍은 이유를 기록하자.` }).elements.scene, true)
  assert.equal(reviewPaidSectionDensity({ ...input, interpretation: `${beforeReview}\n\n오답을 오답노트에 기록해.` }).elements.scene, true)
  assert.equal(reviewPaidSectionDensity({ ...input, interpretation: `${beforeReview}\n\n표시 실수는 마킹 검토에서 확인해.` }).elements.scene, true)
  assert.equal(reviewPaidSectionDensity({ ...input, interpretation: `${beforeReview}\n\n찍은 이유는 복기 때 기록해.` }).elements.scene, true)
})

test('ZIP common 4 recognizes the concrete moment immediately after grading a mock exam', () => {
  const review = reviewPaidSectionDensity({
    question: '올해 GO/HOLD 시그널은 무엇인가요?',
    hook: '올해는 유지 GO, 새 자료 HOLD야.',
    interpretation: '점수는 이미 목표선에 닿았고 남은 기준은 반복 실수야. 예를 들어, 실모 채점 직후 새 책보다 같은 표시가 또 남았는지 봐. 같은 표시가 남으면 HOLD, 줄면 유지 GO야.\n\n계산값으로는 일간(日干, 태어난 날 기준)이 辛이야. 2026년의 기둥은 병오(丙午)로 확인돼. 전통 해석에서 금은 덜어내고, 불은 압박 속 재현력을 묻는 상징이야. 이건 합격 보장이 아니라 공부 순서 판단용이야.\n\n확인 대상은 오답노트의 반복 실수 표시야. 틀린 이유를 보기 착각, 개념 빈칸, 시간 밀림으로 기록해. 이전 문제지와 다음 문제지의 표시를 비교해. 같은 표시가 남으면 새 자료는 HOLD야.',
  })

  assert.equal(review.elements.scene, true, JSON.stringify(review))
})

test('ZIP common 4 recognizes explicitly entered exam format as personal grounding', () => {
  const review = reviewPaidSectionDensity({
    question: '실기·기술형 시험이 맞나요?',
    hook: '실기형으로 넓히지 말고, 객관식 절차 훈련만 남겨.',
    interpretation: '실기·기술형은 주력 아님. 입력된 시험은 객관식이고, 목표는 새 자료 추가보다 반복 실수 컷이야.\n\n일간(日干, 태어난 날 기준 기운)은 신금이야. 전통 해석에서 신금은 손기술보다 틀린 조각을 잘라내는 상징으로 봐.\n\n확인 대상은 실모 채점 뒤 남는 절차 실수야. 오답노트에 계산 착각, 보기 오독, 조건 누락을 따로 기록해. 다음 실모에서 같은 표시가 줄면 지금 방식 유지해. 남으면 새 자료 말고 그 절차만 다시 봐.',
  })

  assert.equal(review.elements.grounding, true, JSON.stringify(review))
})

test('ZIP common 4 recognizes an explicit missing calculation as a grounding boundary', () => {
  const review = reviewPaidSectionDensity({
    question: '유리한 달은 언제인가요?',
    hook: '달 이름보다 오답이 줄어드는 달이 유리각이야.',
    interpretation: '월운(月運, 그달 흐름) 값 없음. 독서실 책상 채점표에서 같은 표시가 줄면 그 달 유지각이야.\n\n일간(日干, 태어난 날 기준 기운)은 신금이야. 전통 해석에서 신금은 새로 모으기보다 틀린 조각을 자르는 상징이야.\n\n확인 대상은 월별 실모 채점표의 반복 표시야. 오답노트에 보기 오독, 조건 누락, 계산 메모 누락을 적어봐. 다음 달 채점표와 비교해 같은 표시가 줄면 유리한 달로 봐. 늘면 새 자료 말고 그 표시만 다시 봐.',
  })

  assert.equal(review.elements.grounding, true, JSON.stringify(review))
})

test('ZIP common 4 recognizes opening an online application screen as a concrete scene', () => {
  const review = reviewPaidSectionDensity({
    question: '원서 접수 타이밍은 언제인가요?',
    hook: '공고가 뜨면 바로 넣고, 공부는 새로 늘리지 마.',
    interpretation: '접수는 빠른 쪽이야. 목표 점수는 이미 맞고, 시험은 객관식이라 접수 뒤엔 오답노트 고정이 기준이야. 예를 들어, 노트북으로 접수 화면을 열 때 새 문제집 주문창은 닫아봐.\n\n태어난 날 기준 기운은 신금이야. 전통 해석에선 금을 더 모으기보다 틀린 조각을 자르는 상징으로 봐. 2026년 해 기호는 병오야. 이건 합격 예언이 아니라, 접수 뒤 공부를 좁히라는 참고 신호야.\n\n확인 대상은 공식 공고의 접수 시작일, 마감일, 시험장 선택란. 공고 캡처를 저장하고 달력에 그대로 옮겨 적어봐. 접수 뒤엔 최근 실모 오답 표시와 당일 루틴만 비교해. 같은 실수가 줄면 유지각, 남으면 그 유형만 다시 봐.',
  })

  assert.equal(review.elements.scene, true, JSON.stringify(review))
})

test('ZIP common 4 recognizes opening mock-exam review materials on a desk', () => {
  const review = reviewPaidSectionDensity({
    question: '아침 세팅은 어떻게 하나요?',
    hook: '아침은 새 계획 말고 어제 오답으로 열어.',
    interpretation: '목표 수준 점수와 큰 불안 없음이면 아침 세팅은 늘리는 시간이 아니야. 예를 들어, 책상에 실모 채점표와 오답노트를 먼저 펴고 보기 오독이나 조건 누락만 봐. 새 자료는 어제 틀린 이름을 줄일 때만 열어봐.\n\n확인 대상은 아침에 처음 여는 자료, 어제 오답 이름, 채점 뒤 반복 실수야. 오답노트 맨 위에 오늘 다시 볼 실수 이름을 적고, 새 자료가 그 실수와 이어지는지 비교해.',
  })

  assert.equal(review.elements.scene, true, JSON.stringify(review))
})

test('ZIP common 4 recognizes recording condition factors beside a grading sheet', () => {
  const review = reviewPaidSectionDensity({
    question: '밥과 컨디션을 어떻게 관리하나요?',
    hook: '밥은 새로 실험하지 말고, 평소 먹던 쪽으로 유지해.',
    interpretation: '목표 수준 점수와 큰 불안 없음이 근거라, 독서실 책상에선 새 메뉴보다 오답 흔들림을 먼저 봐.\n\n확인 대상은 실모 전후 메뉴, 속 상태, 채점 뒤 오답 이름이야. 채점표 옆에 셋을 같이 적어봐. 같은 메뉴에서 실수가 줄면 유지하고, 낯선 메뉴 뒤에 보기 오독이 늘면 빼봐.',
  })

  assert.equal(review.elements.scene, true, JSON.stringify(review))
})

test('ZIP common 4 recognizes a concrete desk layout', () => {
  const review = reviewPaidSectionDensity({
    question: '잘 되는 방향은 어디인가요?',
    hook: '방향은 방위가 아니라 오답노트가 먼저 보이는 쪽이야.',
    interpretation: '목표 수준 점수와 큰 불안 없음이면 환경은 새 자료 진열보다 반복 실수 노출이 먼저야. 예를 들어, 책상 정면엔 실모 채점표, 손 닿는 곳엔 오답노트를 두고 새 자료는 시야 밖에 둬봐. 일간(日干, 태어난 날 기준 기운) 신금은 전통 해석에서 덜어내는 상징이니, 앉자마자 처음 보는 종이가 오늘 남길 공부인지 버릴 공부인지 비교해.',
  })

  assert.equal(review.elements.scene, true, JSON.stringify(review))
})

test('ZIP common 4 recognizes a family conversation scene at the dining table', () => {
  const review = reviewPaidSectionDensity({
    question: '가족 기대를 어떻게 다루나요?',
    hook: '가족 기대는 컷 밖이고, 오답만 안이야.',
    interpretation: '목표 점수가 나오니, 확인 대상은 가족 말 뒤에 손이 간 자료야. 예를 들어 식탁에서 새 책 얘기가 나오면, 채점표에 같은 오답만 적어봐. 신금(辛金, 다듬고 자르는 금 기운)은 전통 해석에서 더 쌓기보다 자르는 상징이니, 객관식 준비는 다음 연습의 같은 오답 감소로 비교해봐.',
  })

  assert.equal(review.elements.scene, true, JSON.stringify(review))
})

test('ZIP common 4 recognizes a library setup and keeping the proven combination', () => {
  const review = reviewPaidSectionDensity({
    question: '시험 날 좋은 조건은 무엇인가요?',
    hook: '새 길일보다 평소 점수가 다시 나오는 세팅이 우선이야.',
    interpretation: '시험일은 이미 정해졌고, 고를 건 당일 조건이야. 목표 점수가 나오는 상태라 새 자료보다 같은 오답이 줄어든 세팅이 맞아. 예를 들어 도서관 같은 자리에서 같은 펜, 채점표, 오답노트를 놓고 첫 문제 전 손이 어디로 가는지 봐.\n\n확인 대상은 연습일의 시작 자료와 채점 직후 표시한 같은 오답이야. 연습한 날마다 첫 자료가 새 프린트였는지 오답노트였는지 적어봐. 다음 실모에서 같은 오답이 줄어든 조합만 시험날 조건으로 남겨봐.',
  })

  assert.equal(review.elements.scene, true, JSON.stringify(review))
  assert.equal(review.elements.nextCriterion, true, JSON.stringify(review))
})

test('ZIP common 4 recognizes countdown milestones as future decision markers', () => {
  const review = reviewPaidSectionDensity({
    question: 'D-100·D-30·D-7 계획은 무엇인가요?',
    hook: '새 자료는 뒤로 두고, 남은 기간은 오답 복기 순서로 잘라야 해.',
    interpretation: '순서는 D-100 오답 묶기, D-30 실모 유지, D-7 새 자료 차단이야. 목표권 연습 점수와 낮은 불안이 사용자 근거야. 예를 들어 책상에서 실모 채점표 옆에 오답노트를 펴고, 같은 실수만 표시해봐.\n\n확인 대상은 같은 오답과 새 자료를 펼친 순간이야. 오답노트에 실모 이름, 틀린 이유, 다시 틀린 문제를 기록해봐. D-30에는 같은 오답이 줄었는지 비교하고, D-7에는 새 자료가 늘었는지 확인해봐.',
  })

  assert.equal(review.elements.nextCriterion, true, JSON.stringify(review))
})

test('ZIP common 4 recognizes concrete error labels inside an answer-note review scene', () => {
  const base = {
    hook: '오답 이름을 기준으로 봐.',
    question: '어느 달이 유리할까?',
    context: { serviceKey: 'pass_angle', concern: '반복 실수를 줄이고 싶어요.' },
  }
  const concrete = reviewPaidSectionDensity({
    ...base,
    interpretation: '반복 실수를 줄이고 싶다고 적었으니 오답 이름을 근거로 봐. 오답노트에 조건 착각, 보기 함정, 개념 빈칸을 적어. 달별로 같은 이름이 줄면 유지각, 늘면 조정해.',
  })
  assert.equal(concrete.elements.scene, true, JSON.stringify(concrete))
  assert.equal(reviewPaidSectionDensity({
    ...base,
    interpretation: '반복 실수를 줄이고 싶다고 적었으니 오답 이름을 근거로 봐. 오답노트에 내용을 적어. 달별로 같은 이름이 줄면 유지각, 늘면 조정해.',
  }).elements.scene, false)
})

test('ZIP common 4 rejects repeated editorial frames and invented crisis for a calm user', () => {
  const framed = [
    '결론: 지금 방식이 적절해요.',
    '근거: 특별한 문제가 없다고 적었어요.',
    '놓친 것: 예를 들어 약속 장소에서 기다리는 장면을 떠올려요.',
    '권고: 다음에는 약속 이행을 비교해요.',
  ].join('\n')
  const sibling: SajuReportSection = {
    id: 'prior', order: 1, imageKey: '', imageSrc: '', imageAlt: '', category: '', categoryEn: '',
    classification: '이전 질문', hook: '이전 답', interpretation: framed, patternKeys: [], ragTopics: [], status: 'complete',
  }
  const repeated = reviewPaidSectionDensity({
    hook: '지금 방식을 유지해요.', question: '관계를 바꿔야 할까?', interpretation: framed,
    context: { serviceKey: 'love_mind' }, siblings: [sibling],
  })
  assert.equal(repeated.passed, false)
  assert.match(repeated.issues.join(' '), /같은 편집 틀/)

  const crisis = reviewPaidSectionDensity({
    hook: '관계가 큰 위기에 들어섰어요.', question: '지금 관계는 어떨까?',
    interpretation: '특별한 문제 없이 지낸다고 적었지만 실제로는 숨은 갈등이 무너질 위기를 만들어요. 예를 들어 답장이 늦는 장면이 그 증거예요. 다음에는 연락 횟수를 확인해요.',
    context: { serviceKey: 'love_mind', concern: '특별한 문제 없이 편안하게 잘 지내고 있어요.' },
  })
  assert.equal(crisis.passed, false)
  assert.match(crisis.issues.join(' '), /억지 위기/)
})

test('ZIP common 5 rejects a reused answer and two near-duplicate long paragraphs', () => {
  const first = '월급 다음 주에는 자동이체가 빠진 뒤 남은 금액을 확인해요. 실제 명세를 기준으로 고정비와 선택 지출을 나누면 이번 질문에서 볼 돈의 이동이 분명해져요. 아직 쓰지 않은 금액을 수입처럼 세지 않는 것이 중요해요.'
  const second = '예를 들어 주말 약속을 잡기 전에 이번 주 선택 지출 합계를 보는 장면을 떠올려요. 계획보다 많이 썼다면 약속을 취소하라는 뜻이 아니라 다음 결제 전에 남은 한도를 비교하라는 기준이에요. 실제 기록이 없으면 금액을 지어내지 않아요.'
  const sibling: SajuReportSection = {
    id: 'prior-money', order: 1, imageKey: '', imageSrc: '', imageAlt: '', category: '지출', categoryEn: '',
    classification: '이번 달 지출은 어떨까?', hook: '자동이체 뒤 남은 금액부터 확인해요.',
    interpretation: `${first}\n\n${second}`, patternKeys: [], ragTopics: [], status: 'complete',
  }
  const duplicate = reviewSectionUniqueness({
    hook: sibling.hook,
    question: '월급 다음 주에 새는 돈은?',
    interpretation: `${first.replace('이번 질문', '이번 항목')}\n\n${second.replace('주말 약속', '주말 일정')}`,
    siblings: [sibling],
  })
  assert.equal(duplicate.passed, false)
  assert.match(duplicate.issues.join(' '), /같은 답|긴 문단/)

  const oneSharedParagraph = reviewSectionUniqueness({
    hook: '선택 지출의 목적부터 나눠 봐요.',
    question: '월급 다음 주에 새는 돈은?',
    interpretation: `${first.replace('이번 질문', '이번 항목')}\n\n월급을 받은 다음 주에는 선택 지출의 목적과 실제 결제일을 따로 기록해요.`,
    siblings: [sibling],
  })
  assert.equal(oneSharedParagraph.passed, true, JSON.stringify(oneSharedParagraph))
})

test('ZIP common 5 rejects generic interchangeable copy and production headings', () => {
  const generic = reviewSectionUniqueness({
    hook: '전체적인 흐름을 천천히 살펴봐요.',
    question: '월급 다음 주에 새는 돈은?',
    interpretation: '상황마다 흐름은 다르게 나타나요. 마음을 편히 가지면 좋은 방향을 찾을 수 있어요. 앞으로도 자신에게 맞는 선택을 이어가면 충분해요.',
  })
  assert.equal(generic.passed, false)
  assert.match(generic.issues.join(' '), /다른 제목/)

  for (const heading of ['풀이 5', '상세 풀이', '확인한 기준', '이 풀이에 반영한 정보', '겁주기보다 확인 방법']) {
    const result = reviewSectionUniqueness({
      hook: '자동이체 뒤 남은 금액부터 확인해요.',
      question: '월급 다음 주에 새는 돈은?',
      interpretation: `## ${heading}\n월급 다음 주에는 자동이체와 선택 지출을 나눠 확인해요.`,
    })
    assert.equal(result.passed, false, heading)
  }
  assert.equal(reviewSectionUniqueness({
    hook: '자동이체 뒤 남은 금액부터 확인해요.',
    question: '월급 다음 주에 새는 돈은?',
    interpretation: '## 월급 다음 주에 새는 돈\n자동이체가 빠진 뒤 남은 금액과 선택 지출을 비교해요.',
  }).passed, true)
})

test('ZIP common 6 keeps the final service voice assignments and allows nominal verdicts', () => {
  assert.equal(reviewToneCopy('조건을 확인합니다.', 'saju_master').passed, true)
  assert.equal(reviewToneCopy('조건을 확인합니다.', 'job_choice').passed, true)
  assert.equal(reviewToneCopy('조건을 확인합니다.', 'love_mind').passed, false)
  assert.equal(reviewToneCopy('조건을 확인하네.', 'saju_master').passed, false)
  assert.equal(reviewToneCopy('지금은 보류. 실제 약속이 지켜졌는지 확인해요.', 'love_mind').passed, true)
  assert.equal(reviewToneCopy('지금은 보류. 실제 약속이 지켜졌는지 확인합니다.', 'love_mind').passed, false)
})

test('ZIP common 6 varies repeated endings without rejecting short copy', () => {
  const varied = '약속이 지켜졌는지 확인해요. 답장 간격도 살펴보세요. 둘 다 편안한 쪽이에요.'
  const repeated = '약속이 지켜졌는지 확인해요. 답장 간격을 비교해요. 불편했던 장면을 기록해요.'
  assert.equal(reviewToneCopy(varied, 'love_mind').passed, true)
  assert.equal(reviewToneCopy(repeated, 'love_mind').passed, false)
  assert.match(reviewToneCopy(repeated, 'love_mind').issues.join(' '), /종결어미/)
  assert.equal(reviewToneCopy('약속을 확인해요. 답장을 비교해요.', 'love_mind').passed, true)
})

test('ZIP common 6 rejects invented character lore and hostile theatrical fun', () => {
  for (const text of [
    '나는 30년 경력의 역술가예요. 약속이 지켜졌는지 확인해요.',
    '나는 제주 출신의 유명한 상담가예요. 실제 행동을 비교해요.',
    '명리학 자격증을 가진 도사라서 미래가 보여요. 선택 조건을 기록해요.',
    '신령님이 내게 상대의 속마음을 알려줬어요. 연락을 기다려요.',
    '이런 선택을 하다니 참 한심하네요. 지출 내역을 확인해요.',
    '상대의 마음이 훤히 보여요. 답장을 더 기다려요.',
  ]) {
    assert.equal(reviewToneCopy(text, 'love_mind').passed, false, text)
  }
  assert.equal(reviewToneCopy('약속이 달라질 때 신호등처럼 멈춰 실제 행동을 확인해요.', 'love_mind').passed, true)
  assert.equal(reviewToneCopy('“나는 30년 경력의 역술가예요”라는 소개는 확인된 사실이 아니에요.', 'love_mind').passed, true)
})

const introducedTerms: SajuReportSection = {
  id: 'introduced-terms', order: 1, imageKey: '', imageSrc: '', imageAlt: '', category: '', categoryEn: '',
  classification: '용어 소개', hook: '오행(五行, 다섯 기운)을 먼저 봐요.',
  interpretation: [
    '용신(用神, 균형에 필요한 기운)은 별도 판단이에요.',
    '신강(身强, 일간의 힘이 상대적으로 강한 상태)은 사람의 등급이 아니에요.',
    '신약(身弱, 일간의 힘이 상대적으로 약한 상태)도 마찬가지예요.',
    '합(合, 기운이 결합하는 관계)은 사건을 확정하지 않아요.',
    '충(沖, 기운이 부딪히는 관계)도 사건을 확정하지 않아요.',
  ].join(' '), patternKeys: [], ragTopics: [], status: 'complete',
}

test('ZIP common 7 explains a technical term on first report use and permits later Korean-only use', () => {
  const missing = reviewTechnicalTerms({ hook: '오행을 먼저 봐요.', interpretation: '분포를 확인해요.' })
  assert.equal(missing.passed, false)
  assert.match(missing.issues.join(' '), /처음.*오행/)

  const explained = reviewTechnicalTerms({ hook: '오행(五行, 다섯 기운)을 먼저 봐요.', interpretation: '분포를 확인해요.' })
  assert.equal(explained.passed, true, JSON.stringify(explained))

  const later = reviewTechnicalTerms({ hook: '오행 분포를 다시 봐요.', interpretation: '용신과는 다른 판단이에요.', siblings: [introducedTerms] })
  assert.equal(later.passed, true, JSON.stringify(later))

  const ordinaryWords = reviewTechnicalTerms({ hook: '합격 가능성을 보려면 조건을 확인해요.', interpretation: '준비가 충분한지 기록해요.' })
  assert.equal(ordinaryWords.passed, true, JSON.stringify(ordinaryWords))
  const ordinaryCombination = reviewTechnicalTerms({ hook: '색을 덜어내요.', interpretation: '이 조합은 이미 충분하니 하나만 남겨요.' })
  assert.equal(ordinaryCombination.passed, true, JSON.stringify(ordinaryCombination))
})

test('ZIP common 7 rejects crowded Hanja and nested parentheses', () => {
  const crowded = reviewTechnicalTerms({
    hook: '균형을 확인해요.',
    interpretation: '오행(五行, 다섯 기운)과 용신(用神, 균형에 필요한 기운)을 한 번에 봐요.',
  })
  assert.equal(crowded.passed, false)
  assert.match(crowded.issues.join(' '), /한 문장.*한자|괄호/)

  const nested = reviewTechnicalTerms({ hook: '균형을 확인해요.', interpretation: '오행(五行, 다섯 기운(목·화·토·금·수))을 봐요.' })
  assert.equal(nested.passed, false)
  assert.match(nested.issues.join(' '), /괄호/)
})

test('ZIP common 7 permits one explained term with one calculated single-Hanja value', () => {
  const review = reviewTechnicalTerms({
    hook: '판단 기준을 확인해요.',
    interpretation: '일간(日干, 태어난 날의 기준 기운)은 辛으로 계산됐어요.',
  })
  assert.equal(review.passed, true, JSON.stringify(review))

  const crowded = reviewTechnicalTerms({
    hook: '판단 기준을 확인해요.',
    interpretation: '오행(五行, 다섯 기운)과 용신(用神, 균형 후보)을 함께 설명해요.',
  })
  assert.equal(crowded.passed, false)
})

test('ZIP common 7 keeps technical judgments distinct from human grades and certain events', () => {
  for (const text of [
    '오행이 두 개뿐이라서 목이 용신이에요.',
    '신강이면 체력과 의지가 강한 사람이에요.',
    '신약이면 인격이 약한 사람이에요.',
    '합이 있으면 무조건 재결합해요.',
    '충이 있으면 반드시 이별해요.',
  ]) {
    assert.equal(reviewTechnicalTerms({ hook: '판단을 구분해요.', interpretation: text, siblings: [introducedTerms] }).passed, false, text)
  }

  const bounded = reviewTechnicalTerms({
    hook: '판단을 구분해요.',
    interpretation: '오행 개수와 용신은 같은 판단이 아니에요. 신강과 신약은 체력이나 인격의 등급이 아니에요. 합과 충은 관계 변화의 상징이지 재결합이나 이별을 확정하지 않아요.',
    siblings: [introducedTerms],
  })
  assert.equal(bounded.passed, true, JSON.stringify(bounded))
})

test('ZIP common 8 permits only server-evidenced score, date and chart values', () => {
  const validInput = {
    hook: '현재 주의도를 확인해요.',
    interpretation: '주의도 72점이에요. 산정 축은 약속 이행이고, 높을수록 점검이 더 필요하며 낮을수록 현재 방식을 유지해요.',
    numericEvidence: ['72점'],
  }
  const valid = reviewScoreVisuals(validInput)
  assert.equal(valid.passed, true, JSON.stringify(valid))

  assert.equal(reviewScoreVisuals({ ...validInput, numericEvidence: [] }).passed, false)
  assert.equal(reviewScoreVisuals({ hook: '날짜를 확인해요.', interpretation: '2028년 4월 2일에 변화가 생겨요.', numericEvidence: [] }).passed, false)
  assert.equal(reviewScoreVisuals({ hook: '날짜를 확인해요.', interpretation: '2028-04-02에 변화 기준을 봐요.', numericEvidence: [] }).passed, false)
  assert.equal(reviewScoreVisuals({ hook: '날짜를 확인해요.', interpretation: '2028.04.02에 변화 기준을 봐요.', numericEvidence: [] }).passed, false)
  assert.equal(reviewScoreVisuals({ hook: '날짜를 확인해요.', interpretation: '2028/04/02에 변화 기준을 봐요.', numericEvidence: [] }).passed, false)
  const evidencedDate = reviewScoreVisuals({ hook: '날짜를 확인해요.', interpretation: '2028-04-02에 입력한 시험을 봐요.', numericEvidence: ['2028-04-02'] })
  assert.equal(evidencedDate.passed, true, JSON.stringify(evidencedDate))
  const localizedEvidencedDate = reviewScoreVisuals({ hook: '날짜를 확인해요.', interpretation: '2026년 12월 1일에 입력한 시험을 봐요.', numericEvidence: ['2026-12-01'] })
  assert.equal(localizedEvidencedDate.passed, true, JSON.stringify(localizedEvidencedDate))
  assert.equal(reviewScoreVisuals({ hook: '날짜를 확인해요.', interpretation: '2026년 12월 2일에 변화 기준을 봐요.', numericEvidence: ['2026-12-01'] }).passed, false)
  assert.equal(reviewScoreVisuals({ hook: '흐름을 봐요.', interpretation: '개인 운의 그래프는 ▁▃▅▇ 모양이에요.', numericEvidence: [] }).passed, false)
})

test('ZIP common 8 labels interpretation scores with an axis and high-low meaning, never event probability', () => {
  const eventProbability = reviewScoreVisuals({
    hook: '결과를 단정해요.', interpretation: '합격 확률은 72%예요.', numericEvidence: ['72%'],
  })
  assert.equal(eventProbability.passed, false)
  assert.match(eventProbability.issues.join(' '), /사건 발생 확률/)

  const unexplained = reviewScoreVisuals({
    hook: '점수를 확인해요.', interpretation: '현재 점수는 72점이에요.', numericEvidence: ['72점'],
  })
  assert.equal(unexplained.passed, false)
  assert.match(unexplained.issues.join(' '), /적합도|주의도|우선순위|산정 축/)
})

test('ZIP common 8 requires a comparison target and avoids decorative or duplicated visuals', () => {
  const missingTarget = reviewScoreVisuals({
    hook: '비교 결과를 봐요.',
    interpretation: '두 사람 비교 적합도는 72점이에요. 산정 축은 약속 이행이고, 높을수록 리듬이 가깝고 낮을수록 차이를 확인해요.',
    numericEvidence: ['72점'], hasComparisonTarget: false,
  })
  assert.equal(missingTarget.passed, false)
  assert.match(missingTarget.issues.join(' '), /비교 대상/)

  assert.equal(reviewScoreVisuals({ hook: '차트를 넣어요.', interpretation: '보기 좋게 장식용 차트를 넣어요.' }).passed, false)

  const duplicate = reviewScoreVisuals({
    hook: '주의도 변화를 확인해요.',
    interpretation: [
      '| 월 | 주의도 |', '| --- | --- |', '| 3월 | 72점 |',
      '주의도 변화 차트: 3월 72점. 산정 축은 약속 이행이고, 높을수록 점검하며 낮을수록 유지해요.',
    ].join('\n'),
    numericEvidence: ['3월', '72점'],
  })
  assert.equal(duplicate.passed, false)
  assert.match(duplicate.issues.join(' '), /표.*차트|중복/)

  const usefulChart = reviewScoreVisuals({
    hook: '주의도 변화를 확인해요.',
    interpretation: '주의도 변화 차트는 월별 차이를 비교해 다음 점검 시점을 판단해요. 3월 주의도는 72점이며 산정 축은 약속 이행이에요. 높을수록 점검하고 낮을수록 현재 방식을 유지해요.',
    numericEvidence: ['3월', '72점'],
  })
  assert.equal(usefulChart.passed, true, JSON.stringify(usefulChart))
})

test('ZIP common 9 makes the first generated item usable as an evidence-based teaser', () => {
  const instruction = toneWritingInstruction('work_move')
  assert.match(instruction, /티저로 사용될 첫 항목/)
  assert.match(instruction, /대표 근거 1~2개/)
  assert.match(instruction, /로그인·결제 상태|서버 권한/)
  assert.match(instruction, /가짜 인용|손실 회피/)
})

test('ZIP common 11 keeps verdict punctuation and readable paragraph rules explicit', () => {
  assert.equal(reviewToneCopy('지금은 보류', 'money_save', { contentRole: 'hook' }).passed, false)
  assert.match(reviewToneCopy('지금은 보류', 'money_save', { contentRole: 'hook' }).issues.join(' '), /마침표/)
  assert.equal(reviewToneCopy('지금은 보류.', 'money_save', { contentRole: 'hook' }).passed, true)

  const instruction = toneWritingInstruction('money_save')
  assert.match(instruction, /한 문장에는 하나의 중심 생각/)
  assert.match(instruction, /2~4개의 완성 문장/)
  assert.match(instruction, /마지막 의미 단락.*행동/)
  assert.match(instruction, /슬래시/)
  assert.match(instruction, /읽겠요.*편재이.*결를/)
  assert.match(instruction, /판정 문장.*마침표/)
  assert.match(instruction, /카드 라벨.*가운뎃점/)
})
