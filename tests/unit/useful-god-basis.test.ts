import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSaju, sixCharAnalysis, buildSajuFeatureJson } from '../../src/saju/analyzer.js'
import type { BirthInput, Element } from '../../src/types/index.js'

/**
 * 용신 고르는 순서(2026-10-15): 강약이 분명하면 억부, 한여름·한겨울에 억부가 계절의 과한 기운을 키우면 조후,
 * 중화면 통관 → 조후. 이전에는 통관·조후가 항상 먼저 정해져 강약이 용신에 반영되지 않았다(무작위 3,000명 중 54%가 바뀜).
 */
const GENERATES: Record<Element, Element> = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' }
const GENERATED_BY: Record<Element, Element> = { fire: 'wood', earth: 'fire', metal: 'earth', water: 'metal', wood: 'water' }

let seed = 20261015
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)
const births: BirthInput[] = Array.from({ length: 150 }, () => {
  const t = new Date(Date.UTC(1950, 0, 1) + Math.floor(rnd() * 60 * 365.25) * 86_400_000)
  return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate(), hour: Math.floor(rnd() * 24), minute: Math.floor(rnd() * 60), gender: rnd() < 0.5 ? 'male' : 'female', calendar: 'solar' }
})
// 시간 앎(8글자)과 시간 모름(6글자) 둘 다 같은 규칙을 따라야 한다. 계산이 무거워 한 번만 만든다.
const analyses = births.map((birth) => {
  const full = analyzeSaju(birth)
  return { birth, full, six: sixCharAnalysis(full) }
})

describe('용신: 억부 우선, 조후 보조', () => {
  it('강약이 분명하면 억부로 고른다 — 신강은 식상(내가 생하는 기운), 신약은 인성(나를 생하는 기운)', () => {
    const wrong: string[] = []
    for (const { birth, full, six } of analyses) {
      for (const a of [full, six]) {
        const basis = a.manseryeok?.usefulGodBasis
        if (a.dayMasterStrength === 'balanced') {
          if (basis === '억부') wrong.push(`${birth.year}-${birth.month}-${birth.day} 중화인데 억부`)
          continue
        }
        if (basis === '억부') {
          const expected = a.dayMasterStrength === 'strong' ? GENERATES[a.dayMasterElement] : GENERATED_BY[a.dayMasterElement]
          if (a.usefulGod !== expected) wrong.push(`${birth.year}-${birth.month}-${birth.day} ${a.dayMasterStrength} 용신 ${a.usefulGod}`)
        } else if (basis === '조후') {
          const season = a.manseryeok?.climate.season
          if (season !== 'summer' && season !== 'winter') wrong.push(`${birth.year}-${birth.month}-${birth.day} ${season}인데 조후가 억부를 덮음`)
        } else {
          wrong.push(`${birth.year}-${birth.month}-${birth.day} 강약이 분명한데 근거 ${basis}`)
        }
      }
    }
    assert.deepEqual(wrong, [])
  })

  it('강약은 비겁만이 아니라 인성까지 돕는 힘으로 센다 — 신강·중화·신약이 한쪽으로 쏠리지 않는다', () => {
    const tally = { strong: 0, balanced: 0, weak: 0 }
    for (const { full } of analyses) tally[full.dayMasterStrength]++
    // 3,000명 측정값 35/25/40%(이전 비겁만 셀 때는 44/37/19%). 150명 표본이라 ±10%p 안에서 확인한다.
    const expected = { strong: 0.35, balanced: 0.25, weak: 0.4 }
    for (const [k, share] of Object.entries(expected)) {
      const v = tally[k as keyof typeof tally] / births.length
      assert.ok(Math.abs(v - share) <= 0.1, `${k} ${(v * 100).toFixed(0)}%`)
    }
  })

  it('한겨울 신약 목은 억부(수) 대신 조후(화)를 쓴다 — 한목향양', () => {
    const a = analyzeSaju({ year: 1990, month: 1, day: 10, hour: 10, minute: 0, gender: 'male', calendar: 'solar' })
    assert.equal(a.dayMasterElement, 'wood')
    assert.equal(a.dayMasterStrength, 'weak')
    assert.equal(a.usefulGod, 'fire')
    assert.equal(a.manseryeok?.usefulGodBasis, '조후')
  })

  it('근거가 요약과 AI 재료에 함께 실린다', () => {
    const a = analyzeSaju({ year: 1987, month: 6, day: 10, hour: 20, minute: 0, gender: 'female', calendar: 'solar' })
    assert.equal(a.usefulGod, 'earth')
    assert.equal(a.manseryeok?.usefulGodBasis, '억부')
    assert.match(a.summary, /용신\(用神\) 추정: 토\(土\) \(근거: 억부\)/)
    assert.equal(buildSajuFeatureJson(a).balance.usefulElementBasis, '억부')
  })
})
