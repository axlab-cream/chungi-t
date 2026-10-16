import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ABSOLUTE_LINES, absoluteLinesEnabled, absoluteLinesFor, absoluteLinesPrompt, assertionLevel } from '../../src/prompt/absolute-lines.js'
import { CMDG_READING_CONTRACT } from '../../src/report/cmdg-reading-contract.js'
import { buildTemplateSajuReport, sectionPrompt } from '../../src/report/report-generator.js'
import { isBlockingIssue, reviewToneCopy } from '../../src/report/tone-v2-review.js'
import { KNOWN_SERVICE_KEYS } from '../../src/prompt/service-system.js'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import type { BirthInput, SajuReportContext } from '../../src/types/index.js'

/**
 * 단정 규칙 3층(2026-10-16, analysis/stage4-plan.html ①). 천명사주부터:
 * 지시문은 PDF 수준으로 풀고, 공통 절대 선을 넘는 단정은 검수에서 막는다.
 */
const birth: BirthInput = { year: 1987, month: 6, day: 10, hour: 20, minute: 0, gender: 'female', calendar: 'solar' }

describe('공통 절대 선과 단정 수준', () => {
  it('10개 절대 선, 천명사주는 고양이용(8번)만 빼고 모두', () => {
    assert.deepEqual(ABSOLUTE_LINES.map((line) => line.no), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    assert.deepEqual(absoluteLinesFor('saju_master').map((line) => line.no), [1, 2, 3, 4, 5, 6, 7, 9, 10])
    assert.equal(assertionLevel('saju_master'), 'pdf')
    assert.equal(assertionLevel(''), 'pdf', '실제 천명사주 경로는 서비스 키가 비어 있다')
    assert.equal(assertionLevel('love_mind'), 'reserved')
    assert.equal(absoluteLinesEnabled('love_mind'), false, '다른 서비스는 아직 켜지 않는다')
    assert.equal(absoluteLinesPrompt('love_mind'), '')
  })

  it('천명사주 장 프롬프트에만 절대 선과 PDF 수준 단정 지시가 붙는다', () => {
    const analysis = analyzeSaju(birth)
    const context: SajuReportContext = { serviceKey: 'saju_master', birthTimeKnown: true }
    const section = buildTemplateSajuReport(analysis, birth, context).sections[0]
    const system = sectionPrompt(analysis, birth, context, section)[0].content
    assert.match(system, /공통 절대 선/)
    assert.match(system, /딱 잘라 말한다/)
    assert.match(system, /10\. 성인 내용/)
    assert.doesNotMatch(system, /8\. 약자 보호/)
    const other = sectionPrompt(analysis, birth, { serviceKey: 'love_mind', birthTimeKnown: true }, { ...section, id: 'x' })[0].content
    assert.doesNotMatch(other, /공통 절대 선/)
  })

  it('천명사주 장 지시에서 성향 단정을 막던 보류 문구를 뺐다', () => {
    assert.doesNotMatch(CMDG_READING_CONTRACT, /미확인 감정을 사실처럼 단정하지 않는다/)
    assert.doesNotMatch(CMDG_READING_CONTRACT, /상대의 실제 외모·속마음·미래 사건은 사주로 확정하지 마세요/)
    assert.match(CMDG_READING_CONTRACT, /공통 절대 선 6번/)
  })
})

describe('절대 선 검수(천명사주)', () => {
  const issues = (text: string, serviceKey = 'saju_master') => reviewToneCopy(text, serviceKey, { contentRole: 'body' }).issues.filter((issue) => issue.startsWith('절대 선'))

  it('PDF 수준의 성향·흐름 단정은 통과한다', () => {
    for (const text of [
      '넌 한여름 한가운데 태어난 쇠야. 사방이 불이고, 그 불이 널 계속 달궈.',
      '네 차가움은 성격이 아니라 생존 방식이야.',
      '2028년은 없던 흙이 들어와서 기댈 데가 생기는 해야.',
      '2030년에 돈이 들어오는 길이 넓어져.',
      '사고방식이 굳어 있어.',
      '몸이 아프면 병원에 가 봐.',
      '큰돈을 벌어도 빚부터 갚아.',
      '재산을 지키는 기준이 된다.',
      '중년에는 수술 후 회복을 서두르지 마.',
      '네가 좋아하는 사람은 말이 분명한 사람이야.',
      '쉰 살에 암이 생기면 병원에 가.',
      '나이 들어 병이 생기면 미루지 말고 진료를 받아.',
      '쉰 살에 암이 생겨도 병원에 가.',
      '나이 들어 병이 생기는 경우에는 진료를 받아.',
      '중년에 병에 걸리더라도 진료를 받아.',
    ]) assert.deepEqual(issues(text), [], text)
  })

  it('건강·금액·실존 타인·구매 유도 단정은 막고, 3차에서도 채택하지 않는다', () => {
    const cases: Array<[string, RegExp]> = [
      ['넌 쉰 살에 큰 병이 와.', /건강/],
      ['마흔 살 이후 수술을 받게 돼.', /건강/],
      ['넌 마흔아홉에 큰돈을 번다.', /금융/],
      ['그 사람은 지금 너를 속이고 있어.', /실존 타인/],
      ['그 사람은 너를 좋아하고 있어.', /실존 타인/],
      ['쉰 살에 암이 생겨.', /건강/],
      ['마흔아홉에 연봉은 1억이야.', /금융/],
      ['그 사람은 너를 좋아해.', /실존 타인/],
      ['이 부적을 사야 해.', /구매 유도/],
      // 해요체·합니다체·한다체도 막는다(Codex 3차).
      ['쉰 살에 암이 생깁니다.', /건강/],
      ['마흔 살에 사고가 납니다.', /건강/],
      ['그 사람은 너를 좋아한다.', /실존 타인/],
      ['이 부적을 사야 합니다.', /구매 유도/],
      ['넌 마흔아홉에 큰돈을 법니다.', /금융/],
      // 과거형도(Codex 4차).
      ['쉰 살에 큰 병이 왔어.', /건강/],
      ['쉰 살에 암이 생겼습니다.', /건강/],
      ['마흔 살에 사고가 났어요.', /건강/],
      ['그 사람은 너를 사랑했어.', /실존 타인/],
      ['마흔아홉에 큰돈을 벌었어.', /금융/],
      ['넌 부자가 됐습니다.', /금융/],
      ['이 팔찌를 차면 돈이 들어와.', /구매 유도/],
    ]
    for (const [text, kind] of cases) {
      const found = issues(text)
      assert.ok(found.some((issue) => kind.test(issue)), `${text} → ${found.join(' / ')}`)
      assert.ok(found.every(isBlockingIssue), text)
    }
  })

  it('PDF 수준에서는 시점·확신 표현이 있을 때만 사건 확정으로 본다(규칙 안내문·하게체 오탐도 없앰)', () => {
    const review = (text: string, serviceKey = 'saju_master') => reviewToneCopy(text, serviceKey, { contentRole: 'body' }).issues
    for (const text of [
      '계약 전에는 역할과 비용, 수익 배분을 문장으로 기록해 두고, 친분 때문에 바뀐 조건이 있는지도 체크해.',
      '이별 직후에도 감정보다 해야 할 일을 앞세우기 쉽지만, 다음에는 책임과 내 욕구를 같은 것으로 묶지 마.',
      '실제 상대의 속마음이나 거짓말은 이 자료로 정할 수 없어.',
      '그 기준을 말로 꺼내는 과정이 늦어지면 일이 쌓인 뒤에야 정산 문제를 보게 돼.',
    ]) assert.ok(!review(text).some((issue) => /미래 사건|타인의 마음|하게체/.test(issue)), text)
    for (const text of ['2029년에 넌 결혼해.', '곧 이별해.']) assert.ok(review(text).some((issue) => /미래 사건/.test(issue)), text)
    // 다른 서비스(보류 수준)는 예전 그대로 시점 표현 없이도 막는다.
    assert.ok(review('수익 배분을 문장으로 기록해.', 'love_mind').some((issue) => /미래 사건/.test(issue)))
  })

  it('절대 선 검사(번호별 대표 문장)와 PDF 수준은 천명사주 말고 어느 서비스 키에도 켜지지 않는다', () => {
    const samples = ['넌 쉰 살에 큰 병이 와.', '넌 마흔아홉에 큰돈을 번다.', '그 사람은 너를 좋아해.', '이 부적을 사야 해.']
    for (const key of KNOWN_SERVICE_KEYS as readonly string[]) {
      const hits = samples.filter((text) => issues(text, key).length > 0)
      if (key === 'saju_master') assert.deepEqual(hits, samples)
      else assert.deepEqual(hits, [], key)
      assert.equal(assertionLevel(key) === 'pdf', key === 'saju_master', key)
    }
  })

  it('천명사주 실제 경로(서비스 키가 빈 값·없음)에서도 검사가 돈다', () => {
    for (const key of ['', undefined, null]) {
      const found = reviewToneCopy('넌 쉰 살에 큰 병이 와.', key, { contentRole: 'body' }).issues
      assert.ok(found.some((issue) => issue.startsWith('절대 선(건강)')), String(key))
    }
  })

  it('부정문·묻는 말은 막지 않고, 켜지 않은 서비스는 그대로다', () => {
    assert.deepEqual(issues('그 사람이 거짓말을 하는지 확인해 봐.'), [])
    for (const text of ['그 사람은 너를 좋아해?', '이 부적을 사야 해?', '쉰 살에 암이 생겨?']) assert.deepEqual(issues(text), [], text)
    assert.deepEqual(issues('큰돈을 번다는 뜻은 아니야.'), [])
    assert.deepEqual(issues('넌 쉰 살에 큰 병이 와.', 'love_mind'), [])
  })
})
