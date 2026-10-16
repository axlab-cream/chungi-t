import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import { LOVE_TARGET_RULE, loveTargetOrientation, needsPartnerGenderRule } from '../../src/report/partner-gender.js'
import { CMDG_READING_CONTRACT } from '../../src/report/cmdg-reading-contract.js'
import { buildTemplateSajuReport, sectionPrompt } from '../../src/report/report-generator.js'
import { buildLoveAgainContext, parseLoveAgainRequest } from '../../src/love/again-service.js'
import { buildLoveMindContext, parseLoveMindRequest } from '../../src/love/mind-service.js'
import { buildLoveSignalContext, parseLoveSignalRequest } from '../../src/love/signal-service.js'
import { buildLoveSpouseContext, parseLoveSpouseRequest } from '../../src/love/spouse-service.js'
import { buildCoupleMatchContext, parseCoupleMatchRequest } from '../../src/match/couple-service.js'
import { buildMarryMatchContext, parseMarryMatchRequest } from '../../src/match/marry-service.js'
import type { BirthInput, SajuReportContext } from '../../src/types/index.js'

/**
 * 상대 정보 배선: 천명사주가 쓰는 "연애 상대" 기준(관계 기준 문자열 + AI 지시 문장)을 다른 서비스도 그대로 쓴다.
 * 입력값은 같고 서비스마다 다른 건 화면 문구뿐이다.
 */
const OWNER: BirthInput = { year: 1990, month: 3, day: 8, hour: 9, minute: 0, gender: 'male', calendar: 'solar' }
const partnerBirth = (gender: 'male' | 'female') => ({ gender, calendar: 'solar' })
const partnerAnalysis = (gender: 'male' | 'female') => analyzeSaju({ ...OWNER, year: 1992, month: 7, day: 21, gender })
const targetOf = (gender: 'male' | 'female') => (gender === 'male' ? '남자' : '여자')

const mindRequest = (gender: 'male' | 'female') => parseLoveMindRequest({
  relationshipStage: '썸', contactPattern: '먼저 연락이 와요', recentSignal: '읽고 늦게 답해요',
  partnerBirthText: '19920721', partnerBirth: partnerBirth(gender),
})
const marryRequest = (gender: 'male' | 'female') => parseMarryMatchRequest({
  relationshipStage: '결혼 준비', decisionPoint: '시기를 못 정했어요', concern: '확신이 필요해요',
  partnerBirthText: '19920721', partnerBirth: partnerBirth(gender),
})
const spouseBody = { relationshipStatus: 'single', marriagePriority: '성격', meetingRoute: '소개' }

describe('loveTargetOrientation (천명사주 orientationFromLoveTarget 과 같은 문자열)', () => {
  it('두 성별로 정하고, 본인 성별을 모르면 관계 패턴 중심', () => {
    assert.equal(loveTargetOrientation('male', 'female'), '이성 관계 중심 · 연애 상대 여자')
    assert.equal(loveTargetOrientation('female', 'male'), '이성 관계 중심 · 연애 상대 남자')
    assert.equal(loveTargetOrientation('male', 'male'), '동성 관계 중심 · 연애 상대 남자')
    assert.equal(loveTargetOrientation('female', 'female'), '동성 관계 중심 · 연애 상대 여자')
    assert.equal(loveTargetOrientation(undefined, 'female'), '관계 패턴 중심 · 연애 상대 여자')
  })
  it('상대 성별을 모르면 아무것도 지어내지 않고 서비스 고유 기준만 둔다', () => {
    assert.equal(loveTargetOrientation('male', undefined, '궁합 + 관계 흐름'), '궁합 + 관계 흐름')
    assert.equal(loveTargetOrientation('male', 'other'), '')
    assert.equal(loveTargetOrientation('male', 'female', '궁합 + 관계 흐름'), '궁합 + 관계 흐름 · 이성 관계 중심 · 연애 상대 여자')
  })
})

describe('상대 성별이 관계 기준에 실린다', () => {
  const cases: Array<[string, (g: 'male' | 'female') => SajuReportContext]> = [
    ['상대방 마음', g => buildLoveMindContext('홍길동', mindRequest(g), partnerAnalysis(g), 'male')],
    ['재회운', g => buildLoveAgainContext('홍길동', parseLoveAgainRequest({
      relationshipStage: '헤어짐', breakupReason: '연락 문제', currentSignal: '다시 만나자는 말이 있어요', breakupPeriod: '3~6개월',
      partnerBirthText: '19920721', partnerBirth: partnerBirth(g),
    }), partnerAnalysis(g), 'male')],
    ['관계 신호', g => buildLoveSignalContext('홍길동', parseLoveSignalRequest({
      relationshipStage: '연애 3개월', signalFocus: '연락 빈도', concern: '식은 걸까요',
      partnerBirthText: '19920721', partnerBirth: partnerBirth(g),
    }), partnerAnalysis(g), 'male')],
    ['궁합', g => buildCoupleMatchContext('홍길동', parseCoupleMatchRequest({
      relationshipStage: '연애 1년', conflictPattern: '같은 일로 다퉈요', concern: '오래 갈까요',
      partnerBirthText: '19920721', partnerBirth: partnerBirth(g),
    }), partnerAnalysis(g), undefined, 'male')],
    ['결혼 궁합', g => buildMarryMatchContext('홍길동', marryRequest(g), partnerAnalysis(g), undefined, 'male')],
  ]
  for (const [label, build] of cases) {
    it(`${label}: 입력한 상대 성별이 천명사주와 같은 문장으로 들어가고 생년월일 원본은 없다`, () => {
      for (const g of ['male', 'female'] as const) {
        const context = build(g)
        assert.match(context.orientation ?? '', new RegExp(`${g === 'male' ? '동성' : '이성'} 관계 중심 · 연애 상대 ${targetOf(g)}$`))
        assert.ok(needsPartnerGenderRule(context))
        assert.equal(context.partner?.birth, undefined)
      }
    })
  }

  it('본인 성별을 넘기지 않아도 상대 성별은 전달된다', () => {
    const context = buildLoveMindContext('홍길동', mindRequest('female'), partnerAnalysis('female'))
    assert.match(context.orientation ?? '', /궁합 \+ 관계 흐름 · 관계 패턴 중심 · 연애 상대 여자$/)
  })
})

describe('결혼 궁합 관계 방향', () => {
  it('"이성 관계 중심" 고정이 아니라 두 사람 성별로 정한다', () => {
    assert.equal(buildMarryMatchContext('홍길동', marryRequest('female'), partnerAnalysis('female'), undefined, 'male').orientation, '이성 관계 중심 · 연애 상대 여자')
    assert.equal(buildMarryMatchContext('홍길동', marryRequest('male'), partnerAnalysis('male'), undefined, 'male').orientation, '동성 관계 중심 · 연애 상대 남자')
  })
})

describe('관계 신호는 상대 성별을 짐작하지 않는다', () => {
  const body = { relationshipStage: '연애 3개월', signalFocus: '연락 빈도', concern: '식은 걸까요', partnerBirthText: '19920721' }
  it('성별이 없거나 이상한 값이면 막는다', () => {
    assert.throws(() => parseLoveSignalRequest({ ...body, partnerBirth: { calendar: 'solar' } }), /상대 성별/)
    assert.throws(() => parseLoveSignalRequest({ ...body, partnerBirth: { gender: 'other', calendar: 'solar' } }), /상대 성별/)
    assert.equal(parseLoveSignalRequest({ ...body, partnerBirth: partnerBirth('female') }).partnerBirth.gender, 'female')
  })
})

describe('배우자운 연애 상대(천명사주와 같은 질문·값)', () => {
  it('선택하지 않으면 막고, 고른 값이 고민에 실린다', () => {
    assert.throws(() => parseLoveSpouseRequest(spouseBody), /연애 상대/)
    assert.throws(() => parseLoveSpouseRequest({ ...spouseBody, loveTarget: '기타' }), /연애 상대/)
    const context = buildLoveSpouseContext('홍길동', parseLoveSpouseRequest({ ...spouseBody, loveTarget: '둘 다·상관없음' }))
    assert.match(context.concern ?? '', /^연애 상대 둘 다·상관없음/)
  })
})

describe('AI 지시 문장은 천명사주 것 하나뿐', () => {
  const original = '연애 상대의 성별은 입력된 관계 기준에 적힌 "연애 상대 남자/여자"를 따르세요. "성별 무관"이거나 입력이 없으면 상대를 성별 없이 그 사람·상대로 쓰고, 본인 성별로 상대 성별을 짐작하지 마세요.'
  // 프롬프트에서는 JSON 이라 따옴표가 이스케이프된다. 따옴표 앞 문장으로 센다.
  const head = original.slice(0, original.indexOf('"연애 상대 남자/여자"'))
  const countIn = (context: SajuReportContext) => {
    const analysis = analyzeSaju(OWNER)
    return buildTemplateSajuReport(analysis, OWNER, context).sections.map(section =>
      sectionPrompt(analysis, OWNER, context, section).map(item => item.content).join('\n').split(head).length - 1)
  }

  it('천명사주 문장이 원본이고 천명 읽기 규약이 그 문장을 쓴다', () => {
    assert.equal(LOVE_TARGET_RULE, original)
    assert.equal(CMDG_READING_CONTRACT.split(original).length - 1, 1)
  })
  it('천명 프롬프트에는 겹쳐 들어가지 않는다', () => {
    const cmdg: SajuReportContext = { serviceKey: 'saju_master', orientation: '이성 관계 중심 · 연애 상대 여자', concern: '연애운' }
    assert.ok(!needsPartnerGenderRule(cmdg))
    const counts = countIn(cmdg)
    assert.ok(counts.every(count => count === 1), `천명 프롬프트: ${counts.join(',')}`)
  })
  it('상대가 있는 다른 서비스에도 같은 문장이 한 번 들어간다', () => {
    const mind = buildLoveMindContext('홍길동', mindRequest('female'), partnerAnalysis('female'), 'male')
    assert.ok(countIn(mind).every(count => count === 1))
    const spouse = buildLoveSpouseContext('홍길동', parseLoveSpouseRequest({ ...spouseBody, loveTarget: '남자' }))
    assert.ok(needsPartnerGenderRule(spouse))
    assert.ok(countIn(spouse).every(count => count === 1))
  })
  it('상대가 없는 서비스에는 들어가지 않는다', () => {
    const job: SajuReportContext = { serviceKey: 'work_job', concern: '이직 고민' }
    assert.ok(!needsPartnerGenderRule(job))
    assert.ok(countIn(job).every(count => count === 0))
  })
})
