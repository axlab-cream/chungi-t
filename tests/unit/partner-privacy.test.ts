import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import { publicPartnerContext, publicReportContext } from '../../src/report/public-context.js'
import { groundedReportFeatures } from '../../src/report/report-generator.js'
import { buildLoveAgainContext, parseLoveAgainRequest } from '../../src/love/again-service.js'
import { buildLoveMindContext, parseLoveMindRequest } from '../../src/love/mind-service.js'
import { buildLoveSignalContext, parseLoveSignalRequest } from '../../src/love/signal-service.js'
import { buildCoupleMatchContext, parseCoupleMatchRequest } from '../../src/match/couple-service.js'
import { buildMarryMatchContext, parseMarryMatchRequest } from '../../src/match/marry-service.js'
import { buildWeddingContext, parseWeddingRequest } from '../../src/day/wedding-service.js'
import type { BirthInput, SajuReportContext } from '../../src/types/index.js'

const OWNER_BIRTH: BirthInput = {
  year: 1975, month: 9, day: 26, hour: 5, minute: 0,
  gender: 'male', calendar: 'solar', isLeapMonth: false,
}
/** 상대의 생년월일시. 이 값의 흔적이 문맥에 남으면 안 된다. */
const PARTNER = { year: 1994, month: 9, day: 15, hour: 14, minute: 30 }
const PARTNER_TEXT = '19940915'

/** 상대 생년월일시가 직렬화된 문맥에 남았는지 본다. */
function partnerTraces(context: SajuReportContext): string[] {
  const serialized = JSON.stringify(context)
  return [
    ['생년', String(PARTNER.year)],
    ['생월', `"month":${PARTNER.month}`],
    ['생일', `"day":${PARTNER.day}`],
    ['생시', `"hour":${PARTNER.hour}`],
  ].filter(([, needle]) => serialized.includes(needle)).map(([label]) => label)
}

describe('[TASK] 상대의 생년월일시는 리포트 문맥에 남지 않는다', () => {
  // 상대는 이 서비스의 사용자가 아니다. 동의 절차도 삭제 요청 창구도 없다.
  // 문맥은 리포트 payload 로 저장되고 응답·프롬프트로도 나가므로 원본을 담지 않는다.
  const partnerAnalysis = analyzeSaju({ ...OWNER_BIRTH, ...PARTNER, gender: 'female' })

  const cases: Array<[string, () => SajuReportContext]> = [
    ['다시 만날까', () => buildLoveAgainContext('홍길동', parseLoveAgainRequest({
      relationshipStage: '헤어짐', breakupReason: '연락 문제', currentSignal: '다시 만나자는 말이 있어요',
      breakupPeriod: '3~6개월', partnerBirthText: PARTNER_TEXT, partnerBirthTime: '14:30',
      partnerBirth: { gender: 'female', calendar: 'solar' },
    }), partnerAnalysis)],
    ['그 사람 마음', () => buildLoveMindContext('홍길동', parseLoveMindRequest({
      relationshipStage: '썸', contactPattern: '먼저 연락이 와요', recentSignal: '읽고 늦게 답해요',
      partnerBirthText: PARTNER_TEXT, partnerBirthTime: '14:30',
      partnerBirth: { gender: 'female', calendar: 'solar' },
    }), partnerAnalysis)],
    ['연애 신호', () => buildLoveSignalContext('홍길동', parseLoveSignalRequest({
      relationshipStage: '연애 3개월', signalFocus: '연락 빈도', concern: '식은 걸까요',
      partnerBirthText: PARTNER_TEXT, partnerBirthTime: '14:30',
      partnerBirth: { gender: 'female', calendar: 'solar' },
    }), partnerAnalysis)],
    ['궁합', () => buildCoupleMatchContext('홍길동', parseCoupleMatchRequest({
      relationshipStage: '연애 1년', conflictPattern: '같은 일로 다퉈요', concern: '오래 갈까요',
      partnerBirthText: PARTNER_TEXT, partnerBirthTime: '14:30',
      partnerBirth: { gender: 'female', calendar: 'solar' },
    }), partnerAnalysis)],
    ['결혼 궁합', () => buildMarryMatchContext('홍길동', parseMarryMatchRequest({
      relationshipStage: '결혼 준비', decisionPoint: '시기를 못 정했어요', concern: '확신이 필요해요',
      partnerBirthText: PARTNER_TEXT, partnerBirthTime: '14:30',
      partnerBirth: { gender: 'female', calendar: 'solar' },
    }), partnerAnalysis)],
    ['결혼 택일', () => buildWeddingContext('홍길동', parseWeddingRequest({
      candidateDate1: '2027-05-15', partnerBirth: '1994-09-15', partnerTime: '14:30',
    }), analyzeSaju(OWNER_BIRTH))],
  ]

  describe('정상 동작', () => {
    for (const [label, build] of cases) {
      it(`${label}: 원본은 없고 계산 결과는 남는다`, () => {
        const context = build()
        assert.equal(context.partner?.mode, 'known', `${label}: 상대 블록이 서지 않았다`)
        assert.equal(context.partner?.birth, undefined, `${label}: 상대 생년월일시 원본이 남았다`)
        assert.deepEqual(partnerTraces(context), [], `${label}: 상대 생년월일시 흔적이 남았다`)
        // 본문 생성에 필요한 계산 결과는 그대로 있어야 한다.
        assert.equal(Object.keys(context.partner?.pillars ?? {}).length, 4, `${label}: 명식이 비었다`)
        assert.match(String(context.partner?.dayMaster), /\(.\)$/, `${label}: 일간 표기가 없다`)
      })
    }
  })
})

describe('[TASK] 응답·프롬프트용 문맥 정리', () => {
  // 2026-09-10 이전에 저장된 레코드에는 원본이 남아 있다(소급 삭제는 하지 않는다).
  // 읽기 경로에서 가려야 과거 기록까지 덮인다.
  const stored: SajuReportContext = {
    serviceKey: 'love_this_year',
    name: '홍길동',
    savedChat: { parentId: 'r-1' },
    partner: {
      mode: 'known', name: '김하나', relationship: '연애 상대', birthTimeKnown: true,
      birth: { ...OWNER_BIRTH, ...PARTNER, gender: 'female' },
      pillars: { year: '甲戌', month: '癸酉', day: '丙申', hour: '乙未' },
      dayMaster: '병(丙)',
    },
  } as SajuReportContext

  describe('정상 동작', () => {
    it('과거 기록의 상대 생년월일시를 가리고 계산 결과는 남긴다', () => {
      const publicContext = publicReportContext(stored)
      assert.equal(publicContext.partner?.birth, undefined)
      assert.deepEqual(partnerTraces(publicContext), [])
      assert.equal(publicContext.partner?.pillars?.year, '甲戌')
      assert.equal(publicContext.partner?.dayMaster, '병(丙)')
      assert.equal(publicContext.partner?.name, '김하나')
      assert.equal(publicContext.partner?.birthTimeKnown, true)
    })

    it('내부 저장 구조인 savedChat 은 응답에 넣지 않는다', () => {
      assert.ok('savedChat' in stored, '픽스처가 savedChat 을 갖고 있어야 검사가 성립한다')
      assert.equal('savedChat' in publicReportContext(stored), false)
    })

    it('원본 문맥을 변형하지 않는다', () => {
      publicReportContext(stored)
      assert.equal(stored.partner?.birth?.year, PARTNER.year, '입력 객체가 변형됐다')
      assert.ok('savedChat' in stored)
    })
  })

  describe('경계값', () => {
    it('상대 블록이 없으면 그대로 둔다', () => {
      const context = { serviceKey: 'wedding_day', name: '홍길동' } as SajuReportContext
      assert.deepEqual(publicReportContext(context), context)
    })

    it('원본이 애초에 없으면 같은 객체를 돌려준다', () => {
      const partner = { mode: 'known' as const, pillars: { year: '甲戌', month: '癸酉', day: '丙申', hour: '乙未' } }
      assert.equal(publicPartnerContext(partner), partner)
    })

    it('상대 블록이 undefined 여도 깨지지 않는다', () => {
      assert.equal(publicPartnerContext(undefined), undefined)
    })
  })
})

describe('[TASK] 모델 프롬프트에 실리는 featureJson', () => {
  // featureJson 은 문맥을 `userContext` 로 통째로 실어 모델에 보낸다. 프롬프트의
  // `context` 필드만 가려도 이쪽으로 새어 나간다 (2026-09-10 Codex 리뷰 Critical).
  const analysis = analyzeSaju(OWNER_BIRTH)
  const legacy = {
    serviceKey: 'love_this_year',
    savedChat: { parentId: 'r-1' },
    partner: {
      mode: 'known' as const, name: '김하나', birthTimeKnown: true,
      birth: { ...OWNER_BIRTH, ...PARTNER, gender: 'female' as const },
      pillars: { year: '甲戌', month: '癸酉', day: '丙申', hour: '乙未' },
    },
  } as SajuReportContext

  describe('보안', () => {
    it('과거 문맥을 받아도 상대 생년월일시를 모델 입력에 담지 않는다', () => {
      const serialized = JSON.stringify(groundedReportFeatures(analysis, legacy))
      for (const needle of [`"year":${PARTNER.year}`, `"day":${PARTNER.day}`, `"hour":${PARTNER.hour}`, `"minute":${PARTNER.minute}`]) {
        assert.ok(!serialized.includes(needle), `featureJson 에 상대 생년월일시가 남았다: ${needle}`)
      }
      // 계산 결과와 내부 구조 처리도 함께 확인한다.
      assert.ok(serialized.includes('甲戌'), '상대 명식이 사라졌다')
      assert.ok(!serialized.includes('savedChat'), '내부 저장 구조가 모델 입력에 남았다')
    })
  })
})
