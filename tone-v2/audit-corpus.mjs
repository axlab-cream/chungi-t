import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = dirname(fileURLToPath(import.meta.url));
const data = join(root, '../data');
const registry = JSON.parse(readFileSync(join(data, 'corpus/registry.json'), 'utf8'));
const required = ['concept', 'condition', 'interpretation', 'real_world_pattern', 'risk', 'opportunity', 'advice', 'confidence', 'forbidden_generalization'];
const packs = registry.packs.map(pack => {
  const raw = readFileSync(join(data, pack.path), 'utf8');
  const content = JSON.parse(raw);
  const findings = [];
  for (const block of content.knowledgeBlocks ?? []) {
    const missing = required.filter(key => !block[key] || (Array.isArray(block[key]) && block[key].length === 0));
    if (missing.length) findings.push({ id: block.id, kind: 'missing_fields', fields: missing });
    const prose = [block.interpretation, block.advice, ...(block.real_world_pattern ?? [])].join(' ');
    if (/자네|일세|보게|하네/.test(prose)) findings.push({ id: block.id, kind: 'legacy_voice' });
    if (/\d+\s*(?:분|cm|시간|일|개월)/.test(prose)) findings.push({ id: block.id, kind: 'numeric_provenance_review' });
    if (/반드시|무조건|확정/.test(prose)) findings.push({ id: block.id, kind: 'contextual_claim_review' });
  }
  return { id: pack.id, source: pack.path, sourceHash: createHash('sha256').update(raw).digest('hex'), domain: pack.domain, blockCount: content.knowledgeBlocks?.length ?? 0, legacyCount: content.chunks?.length ?? 0, findings, status: 'needs_semantic_review' };
});
mkdirSync(join(root, 'corpus-review'), { recursive: true });
writeFileSync(join(root, 'corpus-review/audit.json'), JSON.stringify({ sourceVersion: registry.version, releaseReady: false, policy: 'Static flags are review candidates, not proof of violation or approval. No sample inputs or completed copy are ingested.', packs }, null, 2) + '\n');
console.log(JSON.stringify({ packs: packs.length, blocks: packs.reduce((n,p) => n+p.blockCount,0), flags: packs.reduce((n,p) => n+p.findings.length,0), releaseReady: false }));
