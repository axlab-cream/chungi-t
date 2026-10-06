// Usage: npx tsx scripts/tune-solo-nara.ts <in.json> <out.json>
// Nudges character vectors only (never question scores or copy) until the exhaustive
// distribution meets SOLO_CRITERIA while every design rule still holds.
// Local search: try moving one axis of one character by a few points, keep the move if it lowers the cost.
import { readFileSync, writeFileSync } from 'node:fs'
import { SOLO_AXES, SOLO_CRITERIA, designIssues, distributionIssues, simulate, type SoloGender, type SoloSpec } from '../src/play/solo-nara.js'

const [input, output] = process.argv.slice(2)
if (!input || !output) { console.error('usage: tune-solo-nara.ts <in.json> <out.json>'); process.exit(2) }
const original = JSON.parse(readFileSync(input, 'utf8')) as SoloSpec
const spec = structuredClone(original)

// Penalise shares outside the allowed band hardest, then ties, then distance from an even split.
function cost(gender: SoloGender) {
  const r = simulate(spec, gender, { dominance: false })
  const shares = Object.values(r.shares)
  const outside = shares.reduce((s, x) => s + Math.max(0, SOLO_CRITERIA.minShare - x) + Math.max(0, x - SOLO_CRITERIA.maxShare), 0)
  const even = shares.reduce((s, x) => s + Math.abs(x - 1 / shares.length), 0)
  return outside * 20 + Math.max(0, r.tieRate - SOLO_CRITERIA.maxTieRate) * 20 + even
}

const DELTAS = [-4, -2, -1, 1, 2, 4]
for (const gender of ['female', 'male'] as SoloGender[]) {
  let best = cost(gender)
  for (let round = 0; round < 30 && distributionIssues(spec, gender, simulate(spec, gender)).length; round++) {
    let improved = false
    for (const c of spec.characters.filter(x => x.gender === gender)) for (const axis of SOLO_AXES) for (const d of DELTAS) {
      const before = c.vector[axis], next = before + d
      if (next < 20 || next > 80) continue
      c.vector[axis] = next
      const trial = designIssues(spec).length ? Infinity : cost(gender)
      if (trial < best - 1e-9) { best = trial; improved = true } else c.vector[axis] = before
    }
    if (!improved) break
  }
  console.log(`[${gender}] ${distributionIssues(spec, gender).length ? 'still failing: ' + distributionIssues(spec, gender).join('; ') : 'pass'}`)
}

console.log('\nchanged vectors (direct, express, stability, independence):')
for (const c of spec.characters) {
  const o = original.characters.find(x => x.typeId === c.typeId)!
  const a = SOLO_AXES.map(x => o.vector[x]).join(','), b = SOLO_AXES.map(x => c.vector[x]).join(',')
  if (a !== b) console.log(`  ${c.name}: ${a} -> ${b}`)
}
writeFileSync(output, JSON.stringify(spec, null, 2) + '\n')
console.log(`\nwrote ${output}. Run check-solo-nara.ts on it to confirm.`)
