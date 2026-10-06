// Usage: npx tsx scripts/check-solo-nara.ts [spec.json]
// Validates the solo-nara spec and enumerates every answer combination per gender.
import { readFileSync } from 'node:fs'
import { SOLO_AXES, SOLO_CRITERIA, computeAxisRange, designIssues, distributionIssues, simulate, structureErrors, type SoloSpec } from '../src/play/solo-nara.js'

const path = process.argv[2] ?? 'data/solo-nara-spec.json'
const spec = JSON.parse(readFileSync(path, 'utf8')) as SoloSpec
const pct = (n: number) => `${(n * 100).toFixed(1)}%`

const errors = structureErrors(spec)
if (errors.length) {
  console.log(`STRUCTURE FAIL (${errors.length})`)
  errors.forEach(e => console.log(`  - ${e}`))
  process.exit(1)
}
console.log(`spec ${spec.version}: structure OK`)

const range = computeAxisRange(spec.questions)
console.log('\naxis raw range: ' + SOLO_AXES.map(a => `${a} ${range[a].min}~${range[a].max}`).join(' | '))

const design = designIssues(spec)
console.log(`\nDESIGN RULES ${design.length ? `FAIL (${design.length})` : 'PASS'}`)
design.forEach(e => console.log(`  - ${e}`))

const failures = [...design]
for (const gender of ['female', 'male'] as const) {
  const result = simulate(spec, gender)
  console.log(`\n[${gender}] ${result.total} combinations · tie ${pct(result.tieRate)} (limit ${pct(SOLO_CRITERIA.maxTieRate)})`)
  for (const [id, share] of Object.entries(result.shares).sort((a, b) => b[1] - a[1])) {
    const c = spec.characters.find(x => x.typeId === id)!
    const flag = share < SOLO_CRITERIA.minShare || share > SOLO_CRITERIA.maxShare ? '  <-- out of range' : ''
    console.log(`  ${c.name} ${pct(share).padStart(6)} ${'#'.repeat(Math.round(share * 100))}${flag}`)
  }
  console.log('  strongest single answers:')
  for (const d of result.dominance.slice(0, 3)) console.log(`    ${d.questionId}=${d.answer} -> ${spec.characters.find(c => c.typeId === d.typeId)!.name} ${pct(d.share)}`)
  failures.push(...distributionIssues(spec, gender, result))
}

console.log(`\n${failures.length ? `FAIL: ${failures.length} issue(s)` : 'ALL CHECKS PASS'}`)
process.exit(failures.length ? 1 : 0)
