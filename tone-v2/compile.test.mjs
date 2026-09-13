import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const read = name => readFileSync(new URL(`./generated/${name}`, import.meta.url), 'utf8');
test('all 20 personas have 13 fields, 18 identities and final voice assignments', () => {
  const values = Object.values(JSON.parse(read('personas.json')));
  assert.equal(values.length, 20);
  assert.equal(new Set(values.map(v => v.characterId)).size, 18);
  for (const value of values) {
    assert.equal(Object.keys(value.fields).length, 13);
    assert.ok(Object.values(value.fields).every(Boolean));
    assert.ok(value.promise);
  }
  const informal = values.filter(v => v.fields['말투'].startsWith('반말체')).map(v => v.key).sort();
  assert.deepEqual(informal, ['pass_angle', 'today_fortune']);
  assert.deepEqual(values.filter(v => v.fields['말투'].startsWith('격식체')).map(v => v.key).sort(), ['job_choice', 'saju_master']);
});
test('runtime policy preserves lexical bans and excludes internal reference characters', () => {
  const policy = read('common.md');
  assert.match(policy, /기인하다/);
  assert.match(policy, /되도록/);
  assert.match(policy, /캐릭터의 나이, 출신, 자격, 초능력, 과거를 새로 만들지 않는다/);
  assert.match(policy, /같은 종결어미를 모든 문장에 반복하지 않는다/);
  assert.doesNotMatch(policy, /히키가야|마키마|하이바라|리바이|30%/);
});

test('multiline persona fields and service-local lexical assignments are preserved', () => {
  const personas = JSON.parse(read('personas.json'));
  assert.match(personas.saju_master.fields['재미 장치'], /예언이 아니라 관찰/);
  assert.equal(Object.values(personas).filter(p => p.lexicon.grade === '적극').length, 8);
  assert.equal(Object.values(personas).filter(p => p.lexicon.grade === '제한').length, 9);
  assert.equal(Object.values(personas).filter(p => p.lexicon.grade === '금지').length, 3);
  assert.deepEqual(personas.work_move.lexicon.allowed, ['환승이직']);
  assert.equal(personas.wedding_day.rhythm.nominalTarget, '40%');
  assert.doesNotMatch(read('services/work_move.md'), /텅장|그린라이트|개냥이|미정 \(별도 트랙\)/);
});
test('source inventory and generation are deterministic', () => {
  const before = read('manifest.json');
  execFileSync(process.execPath, [new URL('./compile.mjs', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')]);
  assert.equal(read('manifest.json'), before);
  assert.equal(JSON.parse(before).sourceFiles.length, 82);
  assert.equal(JSON.parse(before).releaseReady, false);
});
