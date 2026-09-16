import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const read = name => readFileSync(new URL(name, import.meta.url), 'utf8').replace(/^\uFEFF/, '');
const index = JSON.parse(read('./task-index.json'));

test('all ZIP files have one task and verified source hashes', () => {
  const verified = JSON.parse(read('./source-verification.json'));
  assert.equal(index.files.length, 82);
  assert.equal(verified.passed, 82);
  assert.deepEqual(verified.unexpectedFiles, []);
  assert.equal(new Set(index.files.map(f => f.source)).size, 82);
  for (const file of index.files) {
    assert.ok(existsSync(new URL(`./tasks/${file.id}.md`, import.meta.url)));
    assert.ok(verified.files.some(v => v.path === file.source && v.archiveSha256 === file.sha256));
  }
});

test('every nonblank specification line is preserved in exactly one detail task', () => {
  for (const file of index.files.filter(f => f.role === 'policy')) {
    const lines = read(`./source/${file.source}`).replace(/\r\n/g, '\n').split('\n');
    const children = index.details.filter(d => d.parent === file.id);
    for (const [i, line] of lines.entries()) {
      if (!line.trim()) continue;
      const matching = children.filter(d => d.line <= i + 1 && d.endLine >= i + 1);
      assert.equal(matching.length, 1, `${file.source}:${i + 1}`);
      assert.equal(matching[0].text.split('\n')[i + 1 - matching[0].line], line);
    }
    assert.deepEqual(file.childTasks, children.map(d => d.id));
  }
  assert.equal(new Set(index.details.map(d => d.id)).size, index.details.length);
});

test('source coverage is never promoted to implementation acceptance', () => {
  for (const task of [...index.files, ...index.details].filter(t => t.status === 'PASS')) assert.ok(task.evidence.length > 0);
  for (const file of index.files.filter(f => f.status === 'PASS')) assert.ok(index.details.filter(d => d.parent === file.id).every(d => d.status === 'PASS'));
  assert.ok(index.details.some(d => d.classification === 'NEEDS_REVIEW' && d.status !== 'PASS'));
  assert.equal(index.details.find(d => d.id === 'ZIP-003-009').status, 'IN_PROGRESS');
});
