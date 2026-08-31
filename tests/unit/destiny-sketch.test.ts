import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import {
  buildDestinyPartnerSketchDescription,
  buildDestinyPartnerSketchPrompt,
  normalizeDestinySketchStyle,
} from '../../src/report/destiny-sketch.js'
import type { BirthInput, SajuReportContext } from '../../src/types/index.js'

const birth: BirthInput = {
  year: 1996,
  month: 8,
  day: 14,
  hour: 15,
  gender: 'female',
  calendar: 'solar',
}

const context: SajuReportContext = {
  name: '테스트',
  target: '본인',
  concern: '연애 고민',
  relationship: '솔로예요',
  orientation: '이성 관계 중심',
  work: '직장 다녀요',
}

describe('[TASK] 운명의 상대 스케치 프롬프트', () => {
  it('지원하지 않는 스타일은 연필 스케치로 보정한다', () => {
    assert.equal(normalizeDestinySketchStyle('없는 스타일'), '연필 스케치')
    assert.equal(normalizeDestinySketchStyle('잉크 라인'), '잉크 라인')
  })

  it('실존 인물 예측이 아닌 상징 스케치로 프롬프트를 만든다', () => {
    const analysis = analyzeSaju(birth)
    const prompt = buildDestinyPartnerSketchPrompt(analysis, birth, context, '연필 스케치')
    const description = buildDestinyPartnerSketchDescription(analysis, context)

    assert.match(prompt, /sketch/i)
    assert.match(prompt, /No celebrity resemblance/i)
    assert.match(prompt, /no identifiable real person/i)
    assert.match(prompt, /adult man/i)
    assert.match(prompt, /office/i)
    assert.match(description, /실제 인물 예측이 아니라/)
  })
})
