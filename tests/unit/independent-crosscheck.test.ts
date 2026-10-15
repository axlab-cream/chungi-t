import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getTenGod } from '../../src/saju/analyzer.js'
import { calculateShinsal } from '../../src/saju/shinsal.js'
import { buildPillar, HEAVENLY_STEMS, EARTHLY_BRANCHES } from '../../src/saju/calculator.js'
import { BRANCH_ELEMENT, HIDDEN_STEMS, STEM_ELEMENT } from '../../src/saju/analyzer-helpers.js'
import { groupRelations, pairRelations } from '../../src/saju/relations.js'
import type { EarthlyBranch, HeavenlyStem, Pillar } from '../../src/types/index.js'

/**
 * 우리 코드를 보지 않고 외부 표(나무위키·위키백과 등)로만 만든 독립 계산기의 정답 20명(2026-10-15).
 * 1,000명 전수 대조에서 모두 일치했고, 표를 옮겨 적다 생기는 오타를 다시 막기 위해 일부를 남긴다.
 * 출처와 형식은 tests/fixtures/independent-crosscheck.json 머리에 있다.
 */
type Case = {
  chart: string[]
  shinsal: string[]
  kongmang: { branches: string; pillars: string[] }
  tenGodsStems: Record<string, string>
  tenGodsBranchMain: Record<string, string>
  pairs: string[]
  daewoonFirst3: { male: string[]; female: string[] }
}
const fixture = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'independent-crosscheck.json'), 'utf8')) as { cases: Case[] }
const KEYS = ['year', 'month', 'day', 'hour'] as const

const pillar = (gz: string): Pillar => {
  const stem = gz[0] as HeavenlyStem
  const branch = gz[1] as EarthlyBranch
  return { ...buildPillar(HEAVENLY_STEMS.indexOf(stem), EARTHLY_BRANCHES.indexOf(branch)), stemElement: STEM_ELEMENT[stem], branchElement: BRANCH_ELEMENT[branch] }
}
const basisOf = (b: string) => b.startsWith('연지') ? '연지' : b.endsWith('짝') ? '일지짝' : b.startsWith('일지') ? '일지' : b.startsWith('일간') ? '일간' : b === '일주' ? '일주' : b.startsWith('월지') ? '월지' : '글자'

describe('독립 계산기 정답 대조(20명)', () => {
  it('신살·공망이 독립 계산과 같다', () => {
    for (const c of fixture.cases) {
      const r = calculateShinsal(KEYS.map((k, i) => [k, pillar(c.chart[i])] as [typeof k, Pillar]), true)
      const ours = r.items.map((s) => `${s.name}${s.variant ? '*' : ''}|${s.pillar}|${s.sign}|${basisOf(s.basis)}`).sort()
      assert.deepEqual(ours, [...c.shinsal].sort(), c.chart.join(' '))
      assert.deepEqual({ branches: r.kongmang.branches.join(''), pillars: r.kongmang.pillars }, c.kongmang, c.chart.join(' '))
    }
  })

  it('십성(천간·지지 본기)이 독립 계산과 같다', () => {
    for (const c of fixture.cases) {
      const st = c.chart.map((p) => p[0] as HeavenlyStem)
      const br = c.chart.map((p) => p[1] as EarthlyBranch)
      assert.deepEqual({ year: getTenGod(st[2], st[0]), month: getTenGod(st[2], st[1]), hour: getTenGod(st[2], st[3]) }, c.tenGodsStems, c.chart.join(' '))
      const main = Object.fromEntries(KEYS.map((k, i) => [k, getTenGod(st[2], [...HIDDEN_STEMS[br[i]]].sort((a, b) => b.weight - a.weight)[0].stem)]))
      assert.deepEqual(main, c.tenGodsBranchMain, c.chart.join(' '))
    }
  })

  it('합충형파해(천간합·천간충·육합·충·형·자형·파·해·반합·삼합·방합·삼형)가 독립 계산과 같다', () => {
    const sortChars = (e: string) => { const parts = e.split('|'); parts[parts.length - 1] = [...parts[parts.length - 1]].sort().join(''); return parts.join('|') }
    for (const c of fixture.cases) {
      const ps = c.chart.map((gz, i) => ({ label: KEYS[i], stem: gz[0] as HeavenlyStem, branch: gz[1] as EarthlyBranch }))
      const ours: string[] = []
      for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) for (const r of pairRelations(ps[i], ps[j])) ours.push(`${r.type}|${KEYS[i]}-${KEYS[j]}|${r.signs.join('')}`)
      for (const r of groupRelations(ps.map((p) => p.branch))) ours.push(`${r.type === '형' ? '삼형' : r.type}|${r.signs.join('')}`)
      assert.deepEqual(ours.map(sortChars).sort(), c.pairs.map(sortChars).sort(), c.chart.join(' '))
    }
  })
})
