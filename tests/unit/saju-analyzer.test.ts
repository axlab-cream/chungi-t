import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSaju, calculateFourPillars } from '../../src/saju/analyzer.js'
import type { BirthInput } from '../../src/types/index.js'

const sampleBirth: BirthInput = {
  year: 1990,
  month: 5,
  day: 15,
  hour: 14,
  gender: 'female',
  calendar: 'solar',
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
  })

  describe('에러 처리', () => {
    it('분석 결과 오행 합계는 8', () => {
      const analysis = analyzeSaju(sampleBirth)
      const total = Object.values(analysis.elementCount).reduce((a, b) => a + b, 0)
      assert.equal(total, 8)
    })
  })
})
