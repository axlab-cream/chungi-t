// Usage: npx tsx scripts/tune-solo-nara.ts <in.json> <out.json>
// Nudges character vectors only (never question scores or copy) until the exhaustive
// distribution meets SOLO_CRITERIA while every design rule still holds.
import { readFileSync, writeFileSync } from 'node:fs'
import { SOLO_AXES, SOLO_CRITERIA, designIssues, distributionIssues, simulate, type SoloGender, type SoloSpec } from '../src/play/solo-nara.js'

const [input, output] = process.argv.slice(2)
if (!input || !output) { console.error('usage: tune-solo-nara.ts <in.json> <out.json>'); process.exit(2) }
const original = JSON.parse(readFileSync(input, 'utf8')) as SoloSpec
const spec = structuredClone(original)

// Mean user vector over every combination equals the per-question mean contribution, normalized.
const mean = Object.fromEntries(SOLO_AXES.map(axis => {
  const raw = spec.questions.reduce((s, q) => s + q.answers.reduce((t, a) => t + a.scores[axis], 0) / 4, 0)
  const { min, max } = spec.axisRange[axis]
  return [axis, (raw - min) / (max - min) * 100]
}))

const cost = (shares: Record<string, number>, tieRate: number) =>
  Object.values(shares).reduce((s, x) => s + Math.abs(x - 1 / 7), 0) + Math.max(0, tieRate - SOLO_CRITERIA.maxTieRate) * 4

for (const gender of ['female', 'male'] as SoloGender[]) {
  let result = simulate(spec, gender)
  let best = cost(result.shares, result.tieRate)
  for (let iter = 0; iter < 40 && distributionIssues(spec, gender, result).length; iter++) {
    let improved = false
    for (const [id, share] of Object.entries(result.shares).sort((a, b) => Math.abs(b[1] - 1 / 7) - Math.abs(a[1] - 1 / 7))) {
      const c = spec.characters.find(x => x.typeId === id)!
      const before = { ...c.vector }
      const toward = share < 1 / 7 ? 1 : -1
      const step = Math.max(2, Math.round(Math.abs(share - 1 / 7) * 40))
      for (const axis of SOLO_AXES) {
        const dir = Math.sign(mean[axis] - c.vector[axis]) * toward
        c.vector[axis] = Math.min(80, Math.max(20, c.vector[axis] + dir * step))
      }
      const trial = designIssues(spec).length ? null : simulate(spec, gender)
      if (trial && cost(trial.shares, trial.tieRate) < best) { result = trial; best = cost(trial.shares, trial.tieRate); improved = true; break }
      c.vector = before
    }
    if (!improved) break
  }
  console.log(`[${gender}] ${distributionIssues(spec, gender, result).length ? 'still failing' : 'pass'}`)
}

console.log('\nchanged vectors (direct, express, stability, independence):')
for (const c of spec.characters) {
  const o = original.characters.find(x => x.typeId === c.typeId)!
  const a = SOLO_AXES.map(x => o.vector[x]).join(','), b = SOLO_AXES.map(x => c.vector[x]).join(',')
  if (a !== b) console.log(`  ${c.name}: ${a} -> ${b}`)
}
writeFileSync(output, JSON.stringify(spec, null, 2) + '\n')
console.log(`\nwrote ${output}. Run check-solo-nara.ts on it to confirm.`)
