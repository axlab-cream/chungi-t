import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSaju, calculateFourPillars } from '../../src/saju/analyzer.js'
import { getSolarTermUtcMs } from '../../src/saju/calculator.js'
import type { BirthInput } from '../../src/types/index.js'

const sampleBirth: BirthInput = {
  year: 1990,
  month: 5,
  day: 15,
  hour: 14,
  gender: 'female',
  calendar: 'solar',
}

function label(pillars: ReturnType<typeof calculateFourPillars>, key: keyof ReturnType<typeof calculateFourPillars>): string {
  const p = pillars[key]
  return `${p.stem}${p.branch}`
}

describe('[TASK] 사주 분석 테스트 하네스', () => {
  describe('정상 동작', () => {
    it('생년월일시 → 사주팔자 4주 생성', () => {
      const pillars = calculateFourPillars(sampleBirth)
      assert.ok(pillars.year.stem)
      assert.ok(pillars.month.branch)
      assert.ok(pillars.day.stem)
      assert.ok(pillars.hour.branch)
    })

    it('사주 분석 → 일간·오행·십신 포함', () => {
      const analysis = analyzeSaju(sampleBirth)
      assert.ok(analysis.dayMaster)
      assert.ok(analysis.summary.includes('일간'))
      assert.ok(analysis.tenGods.length >= 1)
      assert.ok(analysis.dayMasterAdvice.length > 0)
    })

    it('간략풀이 preview는 천기 선생님 샘플 말투를 유지', () => {
      const analysis = analyzeSaju(sampleBirth)
      assert.ok(analysis.preview?.personality.includes('흥미롭네요'))
      assert.ok(analysis.preview?.elementBalance.includes('기운이 먼저 보이고'))
      assert.ok(analysis.preview?.wealthFortune.includes('흐름이 보입니다'))
    })

    it('검산 샘플 → 절기 기반 사주팔자 표준값을 유지', () => {
      const pillars = calculateFourPillars(sampleBirth)
      assert.equal(label(pillars, 'year'), '庚午')
      assert.equal(label(pillars, 'month'), '辛巳')
      assert.equal(label(pillars, 'day'), '庚辰')
      assert.equal(label(pillars, 'hour'), '癸未')
    })

    it('만세력 메타 → 지장간·십신 위치·대운 정보를 포함', () => {
      const analysis = analyzeSaju(sampleBirth)
      assert.equal(analysis.manseryeok?.hiddenStems.length, 4)
      assert.ok((analysis.manseryeok?.tenGodPlacements.length ?? 0) >= 2)
      assert.ok(Array.isArray(analysis.manseryeok?.interactions))
      assert.ok(analysis.summary.includes('지장간'))
      assert.equal(analysis.fortune?.direction, 'backward')
      assert.ok((analysis.fortune?.startAge ?? 0) >= 1)
      assert.ok(analysis.fortune?.startAgeText?.startsWith('약 '))
      assert.equal(analysis.fortune?.daewoon.length, 10)
    })
  })

  describe('경계 조건', () => {
    it('자정(0시) 출생 처리', () => {
      const birth: BirthInput = { ...sampleBirth, hour: 0 }
      const pillars = calculateFourPillars(birth)
      assert.ok(pillars.hour)
    })

    it('23시 출생 처리', () => {
      const birth: BirthInput = { ...sampleBirth, hour: 23 }
      const pillars = calculateFourPillars(birth)
      assert.ok(pillars.hour)
    })

    it('입춘 경계 전후로 년주와 월주가 갈린다', () => {
      const before = calculateFourPillars({
        year: 2024,
        month: 2,
        day: 4,
        hour: 17,
        minute: 0,
        gender: 'male',
        calendar: 'solar',
      })
      const after = calculateFourPillars({
        year: 2024,
        month: 2,
        day: 4,
        hour: 17,
        minute: 30,
        gender: 'male',
        calendar: 'solar',
      })

      assert.equal(label(before, 'year'), '癸卯')
      assert.equal(label(before, 'month'), '乙丑')
      assert.equal(label(after, 'year'), '甲辰')
      assert.equal(label(after, 'month'), '丙寅')
    })

    it('절기 테이블은 KST 입춘 시각을 분 단위로 반영', () => {
      const ipchun = getSolarTermUtcMs(2024, '입춘')
      const kst = new Date(ipchun + 9 * 60 * 60 * 1000)

      assert.equal(kst.getUTCFullYear(), 2024)
      assert.equal(kst.getUTCMonth() + 1, 2)
      assert.equal(kst.getUTCDate(), 4)
      assert.equal(kst.getUTCHours(), 17)
      assert.equal(kst.getUTCMinutes(), 27)
    })

    it('음력 입력은 한국 음력 기준 양력일로 변환한 뒤 팔자를 계산', () => {
      const analysis = analyzeSaju({
        year: 1956,
        month: 1,
        day: 21,
        hour: 12,
        gender: 'male',
        calendar: 'lunar',
      })

      assert.equal(analysis.manseryeok?.resolvedBirth.solarYear, 1956)
      assert.equal(analysis.manseryeok?.resolvedBirth.solarMonth, 3)
      assert.equal(analysis.manseryeok?.resolvedBirth.solarDay, 3)
      assert.equal(label(analysis.fourPillars, 'year'), '丙申')
      assert.equal(label(analysis.fourPillars, 'month'), '庚寅')
    })
  })

  describe('에러 처리', () => {
    it('분석 결과 오행 합계는 8', () => {
      const analysis = analyzeSaju(sampleBirth)
      const total = Object.values(analysis.elementCount).reduce((a, b) => a + b, 0)
      assert.equal(total, 8)
    })
  })
})
