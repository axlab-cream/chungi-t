import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = dirname(fileURLToPath(import.meta.url));
const data = join(root, '../data');
const output = join(data, 'tone-v2/corpus');
const registry = JSON.parse(readFileSync(join(data, 'corpus/registry.json'), 'utf8'));
const fixes = JSON.parse(readFileSync(join(root, 'corpus-corrections.json'), 'utf8'));
const applied = new Set();
const policy = '현재 항목과 계산값이 직접 연결될 때만 사용한다. 생활 패턴은 사용자 사실이 아니며 가상 사례로 명시한다. 근거 없는 처방 숫자, 사건 확정, 타인의 마음 단정을 금지한다. 문장은 서비스 페르소나에 맞춰 새로 작성한다.';
mkdirSync(output, { recursive: true });
for (const pack of registry.packs) {
  const raw = readFileSync(join(data, pack.path), 'utf8');
  const payload = JSON.parse(raw);
  payload.version = '2.0.0';
  payload.migration = { policy, sourcePath: pack.path, sourceSha256: createHash('sha256').update(raw).digest('hex'), review: 'policy-and-targeted-corrections; not empirical validation of symbolic claims' };
  for (const block of payload.knowledgeBlocks ?? []) {
    if (fixes[block.id]) { Object.assign(block, fixes[block.id]); applied.add(block.id); }
    block.condition += ' ' + policy;
    block.forbidden_generalization += ' ' + policy;
  }
  for (const template of payload.templates ?? []) {
    if (template.id === 'ct-relationship-context') {
      template.promptHint = '사용자가 직접 입력한 관계 상태와 고민에 맞춰 관측과 해석을 구분한다. 성적 지향으로 표현 방식, 보호 욕구, 성격을 추정하지 않는다.';
    }
    template.promptHint += ' ' + policy;
  }
  writeFileSync(join(output, basename(pack.path)), JSON.stringify(payload, null, 2) + '\n');
  pack.path = `tone-v2/corpus/${basename(pack.path)}`;
  pack.version = '2.0.0';
}
if (applied.size !== Object.keys(fixes).length) throw new Error('Corpus correction references an unknown block');
registry.version = 'tone-v2.2.0.0';
registry.policy = policy;
writeFileSync(join(output, 'registry.json'), JSON.stringify(registry, null, 2) + '\n');
console.log(`Built independent ${registry.packs.length}-pack corpus with ${applied.size} targeted corrections`);
