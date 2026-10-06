// Usage: npx tsx scripts/build-solo-nara-content.ts
// Regenerates the browser copy from the validated spec. A unit test fails when they drift.
import { readFileSync, writeFileSync } from 'node:fs'
import { publicContentScript, structureErrors, type SoloSpec } from '../src/play/solo-nara.js'

const spec = JSON.parse(readFileSync('data/solo-nara-spec.json', 'utf8')) as SoloSpec
const errors = structureErrors(spec)
if (errors.length) { console.error(errors.join('\n')); process.exit(1) }
writeFileSync('사주/play/solo-nara/content.js', publicContentScript(spec))
console.log(`wrote 사주/play/solo-nara/content.js (${spec.version})`)
