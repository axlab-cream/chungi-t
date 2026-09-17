import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ToneReview } from './tone-v2-review.js'

export type LengthBudgetRole = 'summary' | 'highlightCard' | 'sectionOpening' | 'sectionHighlight' | 'sectionStandard'

export interface LengthBudget {
  min: number
  max: number
}

export interface LengthBudgetReview extends ToneReview {
  regenerate: boolean
  characters: number
  budget: LengthBudget
}

interface ReportBudgetFile {
  formula: { minMultiplier: number; maxMultiplier: number }
  sourceBands: Record<string, [number, number]>
  roles: Record<LengthBudgetRole, LengthBudget>
}

const BUDGET_PATH = join(dirname(fileURLToPath(import.meta.url)), '../../tone-v2/report-budget.json')

let cached: ReportBudgetFile | undefined

function loadBudgetFile(): ReportBudgetFile {
  if (cached) return cached
  cached = JSON.parse(readFileSync(BUDGET_PATH, 'utf8').replace(/^\uFEFF/, '')) as ReportBudgetFile
  return cached
}

export function twoPassBudget(a: number, b: number): LengthBudget {
  const file = loadBudgetFile()
  const lo = Math.min(a, b)
  const hi = Math.max(a, b)
  return {
    min: Math.round(lo * file.formula.minMultiplier),
    max: Math.round(hi * file.formula.maxMultiplier),
  }
}

export function lengthBudgetForRole(role: LengthBudgetRole): LengthBudget {
  return loadBudgetFile().roles[role]
}

export function lengthBudgetRoleForSection(weight: 'opening' | 'highlight' | 'standard'): LengthBudgetRole {
  if (weight === 'opening') return 'sectionOpening'
  if (weight === 'highlight') return 'sectionHighlight'
  return 'sectionStandard'
}

/** Out of range is a regenerate signal, not a hard fail on the first pass. */
export function reviewLengthBudget(text: string, role: LengthBudgetRole): LengthBudgetReview {
  const budget = lengthBudgetForRole(role)
  const characters = text.trim().length
  if (characters >= budget.min && characters <= budget.max) {
    return { passed: true, issues: [], regenerate: false, characters, budget }
  }
  const side = characters < budget.min ? '미달' : '초과'
  return {
    passed: true,
    issues: [`분량 예산 ${side}: ${characters}자 (허용 ${budget.min}~${budget.max}자).`],
    regenerate: true,
    characters,
    budget,
  }
}

const ENGINE_LABEL_PATTERN = /(?:돈|일|사랑|연애|관계|건강|관록|재성|관성|인성|식상|비겁|편재|정재|편관|정관|정인|편인)\s*(?:낮음|높음|중간|강함|약함)/
const STRENGTH_GRADE_PATTERN = /(?:일간|신강|신약)\s*(?:낮음|높음|강함|약함|등급)|dayMasterStrength/

export function reviewEngineLabelExposure(text: string): ToneReview {
  const issues: string[] = []
  if (ENGINE_LABEL_PATTERN.test(text) || STRENGTH_GRADE_PATTERN.test(text)) {
    issues.push('등급 라벨 날것(돈 낮음 류)을 본문에 쓰지 말고 뜻으로 바꾸세요.')
  }
  return { passed: issues.length === 0, issues }
}

export function strengthMeaning(strength: 'strong' | 'balanced' | 'weak'): string {
  if (strength === 'strong') return '힘을 많이 실리는 쪽'
  if (strength === 'weak') return '힘을 덜 받는 쪽'
  return '한쪽으로 치우치지 않는 쪽'
}

export function clearReportBudgetCache(): void {
  cached = undefined
}
