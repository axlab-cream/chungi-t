import { readFileSync } from 'node:fs';
const manifest = JSON.parse(readFileSync(new URL('./generated/manifest.json', import.meta.url), 'utf8'));
if (!manifest.releaseReady) {
  console.error('NOT READY: complete source-outline, corpus, generation and visual acceptance evidence is required. See tone-v2/STATUS.md.');
  process.exitCode = 1;
}
