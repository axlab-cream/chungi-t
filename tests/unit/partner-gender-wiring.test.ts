import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import { PARTNER_GENDER_RULE, needsPartnerGenderRule, relationOrientation } from '../../src/report/partner-gender.js'
import { publicPartnerContext } from '../../src/report/public-context.js'
import { buildTemplateSajuReport, sectionPrompt } from '../../src/report/report-generator.js'
import { buildLoveAgainContext, parseLoveAgainRequest } from '../../src/love/again-service.js'
import { buildLoveMindContext, parseLoveMindRequest } from '../../src/love/mind-service.js'
import { buildLoveSignalContext, parseLoveSignalRequest } from '../../src/love/signal-service.js'
import { buildLoveSpouseContext, parseLoveSpouseRequest } from '../../src/love/spouse-service.js'
import { buildCoupleMatchContext, parseCoupleMatchRequest } from '../../src/match/couple-service.js'
import { buildMarryMatchContext, parseMarryMatchRequest } from '../../src/match/marry-service.js'
import type { BirthInput, SajuReportContext } from '../../src/types/index.js'

/**
 * 상대 정보 배선: 입력한 상대 성별이 AI 에게 닿고, 입력이 없으면 짐작하지 않는다.
 * 천명사주의 "연애 상대 남자/여자/상관없음" 규칙을 공통 모듈(partner-gender.ts)로 공유한다.
 */
const OWNER: BirthInput = { year: 1990, month: 3, day: 8, hour: 9, minute: 0, gender: 'male', calendar: 'solar' }
const partnerBirth = (gender: 'male' | 'female') => ({ gender, calendar: 'solar' })
const partnerAnalysis = (gender: 'male' | 'female') => analyzeSaju({ ...OWNER, year: 1992, month: 7, day: 21, gender })

const mindRequest = (gender: 'male' | 'female') => parseLoveMindRequest({
  relationshipStage: '썸', contactPattern: '먼저 연락이 와요', recentSignal: '읽고 늦게 답해요',
  partnerBirthText: '19920721', partnerBirth: partnerBirth(gender),
})
const marryRequest = (gender: 'male' | 'female') => parseMarryMatchRequest({
  relationshipStage: '결혼 준비', decisionPoint: '시기를 못 정했어요', concern: '확신이 필요해요',
  partnerBirthText: '19920721', partnerBirth: partnerBirth(gender),
})
const spouseBody = { relationshipStatus: 'single', marriagePriority: '성격', meetingRoute: '소개' }

describe('relationOrientation', () => {
  it('두 성별로 정하고, 하나라도 없으면 관계 패턴 중심', () => {
    assert.equal(relationOrientation('male', 'female'), '이성 관계 중심')
    assert.equal(relationOrientation('female', 'male'), '이성 관계 중심')
    assert.equal(relationOrientation('male', 'male'), '동성 관계 중심')
    assert.equal(relationOrientation('female', 'female'), '동성 관계 중심')
    assert.equal(relationOrientation(undefined, 'female'), '관계 패턴 중심')
    assert.equal(relationOrientation('male', 'other'), '관계 패턴 중심')
  })
})

describe('상대 성별이 문맥에 실린다', () => {
  const cases: Array<[string, (g: 'male' | 'female') => SajuReportContext]> = [
    ['상대방 마음', g => buildLoveMindContext('홍길동', mindRequest(g), partnerAnalysis(g))],
    ['재회운', g => buildLoveAgainContext('홍길동', parseLoveAgainRequest({
      relationshipStage: '헤어짐', breakupReason: '연락 문제', currentSignal: '다시 만나자는 말이 있어요', breakupPeriod: '3~6개월',
      partnerBirthText: '19920721', partnerBirth: partnerBirth(g),
    }), partnerAnalysis(g))],
    ['관계 신호', g => buildLoveSignalContext('홍길동', parseLoveSignalRequest({
      relationshipStage: '연애 3개월', signalFocus: '연락 빈도', concern: '식은 걸까요',
      partnerBirthText: '19920721', partnerBirth: partnerBirth(g),
    }), partnerAnalysis(g))],
    ['궁합', g => buildCoupleMatchContext('홍길동', parseCoupleMatchRequest({
      relationshipStage: '연애 1년', conflictPattern: '같은 일로 다퉈요', concern: '오래 갈까요',
      partnerBirthText: '19920721', partnerBirth: partnerBirth(g),
    }), partnerAnalysis(g))],
    ['결혼 궁합', g => buildMarryMatchContext('홍길동', marryRequest(g), partnerAnalysis(g))],
  ]
  for (const [label, build] of cases) {
    it(`${label}: 남성·여성 값이 그대로 들어가고 생년월일 원본은 없다`, () => {
      for (const g of ['male', 'female'] as const) {
        const context = build(g)
        assert.equal(context.partner?.gender, g)
        assert.equal(context.partner?.birth, undefined)
      }
    })
  }

  it('공개용 문맥으로 바꿔도 성별은 남고 생년월일 원본은 빠진다', () => {
    const context = buildLoveMindContext('홍길동', mindRequest('female'), partnerAnalysis('female'))
    const withBirth = { ...context.partner!, birth: { year: 1992, month: 7, day: 21, hour: 0, minute: 0, gender: 'female' as const, calendar: 'solar' as const } }
    const publicPartner = publicPartnerContext(withBirth)
    assert.equal(publicPartner?.gender, 'female')
    assert.equal(publicPartner?.birth, undefined)
  })
})

describe('결혼 궁합 관계 방향', () => {
  it('두 사람 성별로 정한다', () => {
    assert.equal(buildMarryMatchContext('홍길동', marryRequest('female'), partnerAnalysis('female'), undefined, 'male').orientation, '이성 관계 중심')
    assert.equal(buildMarryMatchContext('홍길동', marryRequest('male'), partnerAnalysis('male'), undefined, 'male').orientation, '동성 관계 중심')
    assert.equal(buildMarryMatchContext('홍길동', marryRequest('female'), partnerAnalysis('female')).orientation, '관계 패턴 중심')
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

describe('배우자운 연애 상대', () => {
  it('선택하지 않으면 막고, 고른 값이 고민에 실린다', () => {
    assert.throws(() => parseLoveSpouseRequest(spouseBody), /연애 상대/)
    assert.throws(() => parseLoveSpouseRequest({ ...spouseBody, loveTarget: '기타' }), /연애 상대/)
    const context = buildLoveSpouseContext('홍길동', parseLoveSpouseRequest({ ...spouseBody, loveTarget: '둘 다·상관없음' }))
    assert.match(context.concern ?? '', /^연애 상대 둘 다·상관없음/)
  })
})

describe('AI 지침', () => {
  const promptFor = (context: SajuReportContext) => {
    const analysis = analyzeSaju(OWNER)
    const section = buildTemplateSajuReport(analysis, OWNER, context).sections[0]!
    return sectionPrompt(analysis, OWNER, context, section).map(item => item.content).join('\n')
  }
  it('상대가 있는 서비스에는 성별 규칙이 들어간다', () => {
    const mind = buildLoveMindContext('홍길동', mindRequest('female'), partnerAnalysis('female'))
    assert.ok(needsPartnerGenderRule(mind))
    assert.ok(promptFor(mind).includes(PARTNER_GENDER_RULE))
    const spouse = buildLoveSpouseContext('홍길동', parseLoveSpouseRequest({ ...spouseBody, loveTarget: '남자' }))
    assert.ok(needsPartnerGenderRule(spouse))
    assert.ok(promptFor(spouse).includes(PARTNER_GENDER_RULE))
  })
  it('상대가 없는 서비스에는 들어가지 않는다', () => {
    const job: SajuReportContext = { serviceKey: 'work_job', concern: '이직 고민' }
    assert.ok(!needsPartnerGenderRule(job))
    assert.ok(!promptFor(job).includes(PARTNER_GENDER_RULE))
  })
})
