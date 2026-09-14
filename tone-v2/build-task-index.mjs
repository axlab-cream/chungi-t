import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = dirname(fileURLToPath(import.meta.url));
const readJson = path => JSON.parse(readFileSync(join(root, path), 'utf8').replace(/^\uFEFF/, ''));
const manifest = readJson('generated/manifest.json');
const verification = readJson('source-verification.json');
const progress = readJson('task-progress.json');
const usedProgress = new Set();
function withProgress(task) {
  const saved = progress.tasks[task.id];
  if (!saved) return task;
  if (!['NOT_STARTED', 'IN_PROGRESS', 'PASS', 'FAIL', 'BLOCKED'].includes(saved.status)) throw new Error(`Invalid task status: ${task.id}`);
  if (saved.status === 'PASS' && !saved.evidence?.length) throw new Error(`Missing acceptance evidence: ${task.id}`);
  usedProgress.add(task.id);
  return { ...task, status: saved.status, evidence: saved.evidence ?? [], ...(saved.classification ? { classification: saved.classification } : {}), ...(saved.implementation ? { implementation: saved.implementation } : {}) };
}
if (verification.total !== manifest.sourceFiles.length || verification.passed !== verification.total || verification.unexpectedFiles.length) throw new Error('Source archive verification required');
const hash = value => createHash('sha256').update(value).digest('hex');
const roles = {
  policy: { label: '규격·인계', target: 'tone-v2/compile.mjs; src/prompt/tone-v2.ts; src/report/tone-v2-review.ts', outcome: '본문의 각 세부 항목을 유효 규칙·개정으로 대체된 규칙·예시·과거 검증 기록으로 분류하고 유효 규칙마다 구현과 검수 증거 연결', checks: 'node --test tone-v2/compile.test.mjs; npx tsx --test tests/unit/tone-v2*.test.ts', phase: 'P01' },
  tool: { label: '검사·생성 도구', target: 'tone-v2/source/도구 (원본 보존); tone-v2/qa (필요한 호환 구현)', outcome: '입출력 계약·실행 의존성·구형 말투표를 점검하고 정상/위반/오탐 fixture로 검사 동작 확인. 원본 도구의 과거 통과값을 현재 서비스의 통과값으로 사용하지 않음', checks: '도구별 실제 호출 인자와 정상·위반·오탐 fixture 결과를 evidence에 기록; 자동 실행 금지', phase: 'P02' },
  prompt: { label: '참고 프롬프트', target: 'tone-v2/generated/services; src/report/report-generator.ts', outcome: '해당 서비스의 약속·퍼소나·금지선을 최신 규격과 대조. 가상 입력과 완성 예문은 운영 프롬프트에 유입하지 않고 현재 입력·계산·RAG로 치환', checks: 'npx tsx --test tests/unit/tone-v2-generation.test.ts; 해당 서비스 실제 생성 결과 검수', phase: 'P03' },
  sample: { label: '2항목 검증 샘플', target: 'tone-v2/qa; 서비스별 격리 검수 결과', outcome: '문체·구조 비교 fixture로만 사용. 샘플의 개인 사실·수치·문장을 납품 원고로 복사하지 않는지 대조', checks: '샘플 문장 복사·골격 전파 검사와 새 출력 비교. 샘플 자체의 품질은 신규 출력 점수에서 제외', phase: 'P04' },
  long: { label: '긴 목차 검증 샘플', target: 'tone-v2/qa; src/report/report-queue.ts', outcome: '파트별 제목·항목·중복·말버릇을 대조하고 배치 경계 검수 fixture로 사용. 사용자 승인 목차와 새 전체 출력은 별도 대조', checks: 'npx tsx --test tests/unit/report-persistence.test.ts tests/unit/tone-v2-batch.test.ts; 전체 목차 누락/중복 검사', phase: 'P04' },
};
const roleFor = path => path.startsWith('규격/') || path === 'README.md' ? 'policy' : path.startsWith('도구/') ? 'tool' : path.startsWith('프롬프트/') ? 'prompt' : path.startsWith('산출물-실전/') ? 'long' : path.startsWith('산출물-샘플/') ? 'sample' : null;

// Preserve every non-empty source line, including history and examples, for review.
// This is a review backlog, not an automatically inferred set of binding rules.
function segments(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const result = [];
  let current = null;
  let fenced = false;
  let heading = '';
  const flush = () => { if (current) { result.push(current); current = null; } };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() && !fenced) { flush(); continue; }
    if (/^#{1,6} /.test(line) && !fenced) { flush(); heading = line.replace(/^#+ /, ''); }
    if (!fenced && /^(?:#{1,6} |\| |[-*] |\d+\. |>{1,} |```)/.test(line)) flush();
    current ??= { line: i + 1, endLine: i + 1, heading, text: '' };
    current.text += (current.text ? '\n' : '') + line;
    current.endLine = i + 1;
    if (/^```/.test(line)) { fenced = !fenced; if (!fenced) flush(); }
  }
  flush();
  return result;
}

mkdirSync(join(root, 'tasks'), { recursive: true });
const details = [];
const files = manifest.sourceFiles.map((file, i) => {
  const id = `ZIP-${String(i + 1).padStart(3, '0')}`;
  const role = roleFor(file.path);
  if (!role) throw new Error(`Unclassified source: ${file.path}`);
  const bytes = readFileSync(join(root, 'source', file.path));
  if (hash(bytes) !== file.sha256 || !verification.files.some(v => v.path === file.path && v.archiveSha256 === file.sha256)) throw new Error(`Changed source: ${file.path}`);
  const spec = roles[role];
  const children = role === 'policy' ? segments(bytes.toString('utf8')).map((part, n) => withProgress({
    id: `${id}-${String(n + 1).padStart(3, '0')}`, parent: id, source: file.path, ...part,
    classification: 'NEEDS_REVIEW', status: 'NOT_STARTED', implementation: [], evidence: [],
    acceptance: '원문 맥락·개정 우선순위 판독 후 유효 규칙이면 구현+반례+출력 검수 증거 필요. 예시/이력/대체 규칙이면 제외 근거와 대체 조항 ID 필요.',
  })) : [];
  details.push(...children);
  const task = withProgress({ id, source: file.path, sha256: file.sha256, bytes: file.bytes, role, phase: spec.phase, status: 'NOT_STARTED', sourceVerified: true, outcome: spec.outcome, targets: spec.target.split('; '), checks: spec.checks, childTasks: children.map(c => c.id), evidence: [] });
  if (task.status === 'PASS' && children.some(c => c.status !== 'PASS')) throw new Error(`Unfinished detail tasks: ${id}`);
  const sourceLink = `../source/${file.path}`;
  writeFileSync(join(root, 'tasks', `${id}.md`), [
    `# ${id}: ${file.path}`, '', `- 상태: ${task.status} (원본 보존 확인과 적용 완료는 별개)`,
    `- 종류: ${spec.label}`, `- 실행 단계: ${spec.phase}`, `- 원본: [${file.path}](${sourceLink})`, `- SHA-256: ${file.sha256}`,
    `- 사용자 결과: ${spec.outcome}`, `- 적용 후보: ${spec.target}`, `- 검수: ${spec.checks}`, '',
    '## 실행 순서', '- [ ] 원문 전체와 연결된 세부 TASK 판독', '- [ ] 유효 규칙·예시·과거 이력·대체 조항 구분',
    '- [ ] 관련 구현 경로 확인 및 실패 테스트 재현', '- [ ] 해당 범위만 구현', '- [ ] 정상·예외·회귀 검수와 코드리뷰',
    '- [ ] 증거 기록 및 CreamWIKI 저장·재조회', '', '## 완료 조건',
    '연결 세부 TASK가 모두 근거 있는 PASS 또는 사유 있는 SUPERSEDED/REFERENCE로 판정되어야 한다. 파일 존재나 프롬프트 포함만으로 완료 처리하지 않는다.', '',
    '## 증거', ...task.evidence.map(e => `- ${e}`), '',
    '## 세부 TASK', ...children.map(c => `- ${c.id}: 원문 ${c.line}~${c.endLine}행 / ${c.heading || '서문'} / ${c.classification} / ${c.status}`), '',
  ].join('\n'));
  return task;
});
const counts = Object.fromEntries(Object.keys(roles).map(role => [role, files.filter(f => f.role === role).length]));
for (const id of Object.keys(progress.tasks)) if (!usedProgress.has(id)) throw new Error(`Unknown progress task: ${id}`);
writeFileSync(join(root, 'task-index.json'), JSON.stringify({ schemaVersion: 1, archiveSha256: verification.archiveSha256, sourceFingerprint: manifest.sourceFingerprint, sourceCount: files.length, detailCount: details.length, counts, files, details }, null, 2) + '\n');
writeFileSync(join(root, 'TASKS.md'), [
  '# ZIP 전수 작업 목록', '',
  `원본 ${files.length}개 = 파일 TASK ${files.length}개. 규격·인계의 비어 있지 않은 본문은 세부 검토 TASK ${details.length}개로 추가 분해했다.`,
  '세부 TASK 수는 확정 규칙 수가 아니다. 예시·과거 기록·개정 조항을 포함한 누락 방지용 검토 단위이며, 분류 검수가 필요하다.',
  '원본 보존 확인은 100%이나 적용 완료율은 별도다. 기존 구현도 새 TASK별 증거를 연결하기 전 자동 완료 처리하지 않는다.', '',
  '| TASK | 원본 파일 | 종류 | 단계 | 상태 |', '|---|---|---|---|---|',
  ...files.map(f => `| [${f.id}](tasks/${f.id}.md) | ${f.source} | ${roles[f.role].label} | ${f.phase} | ${f.status} |`), '',
  '전체 원문·행 번호·부모/자식 연결은 task-index.json에 보존한다. 실행 순서는 EXECUTION-PLAN.md를 따른다. 진행 증거는 task-progress.json에서 관리하므로 목록 재생성으로 지워지지 않는다.', '',
].join('\n'));
console.log(JSON.stringify({ sourceFiles: files.length, detailTasks: details.length, counts }));
