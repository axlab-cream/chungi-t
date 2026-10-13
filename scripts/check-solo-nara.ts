// Usage: npx tsx scripts/check-solo-nara.ts [spec.json]
// Validates the solo-nara spec and enumerates every answer combination.
import { readFileSync } from 'node:fs'
import { simulate, structureErrors, type SoloSpec } from '../src/play/solo-nara.js'

const path = process.argv[2] ?? 'data/solo-nara-spec.json'
const spec = JSON.parse(readFileSync(path, 'utf8')) as SoloSpec
const errors = structureErrors(spec)
if (errors.length) {
  console.log(`STRUCTURE FAIL (${errors.length})`)
  errors.forEach(e => console.log(`  - ${e}`))
  process.exit(1)
}
console.log(`spec ${spec.version}: structure OK`)
const result = simulate(spec)
console.log(`\n${result.total} combinations (random answers)`)
for (const t of spec.types) console.log(`  ${t.name.padEnd(12)} ${(result.shares[t.typeId] * 100).toFixed(1).padStart(5)}%`)
const missing = spec.types.filter(t => !result.counts[t.typeId])
console.log(missing.length ? `\nFAIL: unreachable ${missing.map(t => t.name).join(', ')}` : '\nALL CHECKS PASS')
process.exit(missing.length ? 1 : 0)
