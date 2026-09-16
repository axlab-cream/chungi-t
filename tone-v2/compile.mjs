import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = dirname(fileURLToPath(import.meta.url));
const source = join(root, 'source');
const out = join(root, 'generated');
const read = name => readFileSync(join(source, '규격', name), 'utf8');
const hash = text => createHash('sha256').update(text).digest('hex');
const clean = text => text.replace(/\*\*/g, '').trim();
const persona = read('04-페르소나-상세규정.md');
const promises = read('02-핵심약속-개사안.md');
const common = read('01-공통-프롬프트-규칙.md');
const tableField = (block, field) => {
  const row = block.split('\n').find(line => line.startsWith(`| **${field}** |`));
  if (!row) throw new Error(`Missing persona field: ${field}`);
  return clean(row.split('|')[2]);
};
const lineField = (block, field) => {
  const rows = block.split('\n');
  const start = rows.findIndex(line => line.startsWith(`**${field}**`));
  if (start < 0) throw new Error(`Missing persona field: ${field}`);
  const value = [rows[start].slice(`**${field}**`.length)];
  for (const line of rows.slice(start + 1)) {
    if (/^\s*$|^\*\*|^```|^#|^---/.test(line)) break;
    value.push(line);
  }
  return clean(value.join('\n'));
};
const services = {};
for (const block of persona.split(/\n(?=## \d+\.)/)) {
  const match = block.match(/^## (\d+)\. (.*?) `([a-z_]+)`/);
  if (!match) continue;
  const [, , title, key] = match;
  const body = block.split(/\n#{1,2} (?!\d+\.)/)[0];
  const promiseRow = promises.split('\n').find(line => line.startsWith('|') && line.includes('`' + key + '`'));
  if (!promiseRow) throw new Error(`Missing promise: ${key}`);
  const fields = Object.fromEntries(['이름(초안)', '겉모습·연령대', '성격 세 단어', '결', '말투', '판정문', '강도', '고객과의 거리'].map(k => [k, tableField(body, k)]));
  for (const field of ['재미 장치', '종결어미', '말버릇', '금기']) fields[field] = lineField(body, field);
  fields['대표 문장'] = [...body.matchAll(/```\r?\n([\s\S]*?)```/g)].map(m => m[1].trim()).join('\n');
  if (!fields['대표 문장']) throw new Error(`Missing representative example: ${key}`);
  const displayName = fields['이름(초안)'].split(/\s+[—–-]\s+/)[0].trim();
  if (!displayName) throw new Error(`Missing persona display name: ${key}`);
  services[key] = {
    key,
    title,
    characterId: ['love_mind', 'love_again', 'love_spouse'].includes(key) ? 'yeonseo' : key,
    displayName,
    definitionStatus: 'specified',
    displayNameStatus: 'draft',
    promise: clean(promiseRow.split('|')[4]),
    fields,
  };
}
if (Object.keys(services).length !== 20) throw new Error('Expected 20 personas');

// Historical remarks and sample passages remain in the immutable source bundle.
const policyText = text => text.replace(/```\r?\n([\s\S]*?)```/g, (_, body) => /^(금지|□)/m.test(body) ? body : '').split('\n').filter(line => !line.startsWith('>')).join('\n');
let effectiveCommon = policyText(common);
effectiveCommon = effectiveCommon.replace(/### 15-1-2\.[\s\S]*?(?=### 15-2\.)/, '');
effectiveCommon = effectiveCommon.replace(/마키마형/g, '부드러운 확인형').replace(/마키마/g, '부드러운 확인형');
effectiveCommon = effectiveCommon.replace(/하게체 스승/g, '격식체 해설자');
effectiveCommon = effectiveCommon.replace(/30%/g, '50%').replace(/70%/g, '50%');
effectiveCommon = effectiveCommon.replace(/이 항목에 정면 부정이 하나 이상 있는가/g, '이 리포트에 근거 있는 정면 부정이 하나 이상 있는가');
effectiveCommon = effectiveCommon.replace(/^- `~하네\/.*$/m, '- 하게체는 전 서비스에서 폐지한다.');
effectiveCommon = effectiveCommon.replace(/^- `~입니다\/.*$/m, '- 격식체는 saju_master와 job_choice에 기본 적용한다. 안전·감정 인정·질문 재설정에도 해당 서비스의 기본 말투를 사용한다.');
const overrides = `# 적용 확정 규칙\n\n이 문서의 과거 예시보다 아래 최종 개정값과 서비스 페르소나가 우선한다.\n- 하게체 폐지. 격식체: saju_master, job_choice. 반말체: today_fortune, pass_angle. 나머지 16개는 해요체.\n- 일반형 체언 비율 상한은 50%. 체언 3문장 연속 금지. today_fortune/lucky_color 카탈로그는 두 제한 모두 제외. 나열형 항목은 연속 제한을 제외하되 마지막 두 문장은 서비스 말투.\n- 안전 영역에는 체언 판정 금지. 감정 인정과 질문 재설정도 각 서비스 말투를 따른다.\n- 무호칭. cat_compatibility의 집사님만 허용. 인물의 성별과 나이대를 고객 라벨에 쓰지 않는다.\n- 예문·샘플·가상 입력을 실제 고객 사실이나 완성 원고로 사용하지 않는다. 처방 숫자는 근거 없이 만들지 않는다.\n- 20개 서비스 전체를 적용한다. 숨김 서비스의 판매 노출 상태는 별개다.\n- 실제 제공된 전체 목차를 보존한다. 배치마다 이전 문장과 말버릇 사용 이력을 전달한다. 생성 실패는 성공으로 대체하지 않는다.\n`;
mkdirSync(join(out, 'services'), { recursive: true });
writeFileSync(join(out, 'common.md'), `${overrides}\n${effectiveCommon}\n${overrides}`);
const lexiconText = persona.slice(persona.indexOf('# 서비스별 어휘 배정'));
const lexicons = {};
let grade = '';
for (const line of lexiconText.split('\n')) {
  if (/^## (적극|제한|금지) 등급/.test(line)) grade = line.match(/^## (\S+)/)[1];
  const key = line.match(/^\| `([a-z_]+)`/)?.[1];
  if (!key) continue;
  const cells = line.split('|').slice(1, -1).map(clean);
  lexicons[key] = { grade, allowed: grade === '금지' ? [] : cells[1].split('·').map(clean).filter(v => v !== '—'), notes: grade === '적극' ? cells[2] : '' };
}
const rhythmRows = persona.slice(persona.indexOf('## 담백·차가움'), persona.indexOf('## 겹침은')).split('\n');
const rhythmKeys = { '05': 'job_choice', '14': 'work_job', '11': 'couple_signal', '15': 'love_mind', '18': 'home_fit', '19': 'newyear_flow', '20': 'wedding_day' };
const rhythms = {};
for (const row of rhythmRows) {
  const cells = row.split('|').slice(1, -1).map(clean);
  if (rhythmKeys[cells[0]]) rhythms[rhythmKeys[cells[0]]] = { axis: cells[3], rhythm: cells[4], nominalTarget: cells[5] };
}
for (const [key, service] of Object.entries(services)) {
  const lexicon = lexicons[key];
  if (!lexicon) throw new Error(`Missing lexicon: ${key}`);
  service.lexicon = lexicon;
  service.rhythm = rhythms[key] ?? null;
  const appendix = [
    `어휘 등급: ${lexicon.grade}. 배정 세대 어휘: ${lexicon.allowed.join(' · ') || '없음'}. 항목당 최대 2개이며 억지로 넣지 않는다.`,
    '일반 명사와 직무 어휘는 서비스 배정 대상이 아니다. 다른 서비스의 세대 어휘는 사용하지 않는다.',
    lexicon.notes ? `추가 어휘 금지: ${lexicon.notes}` : '',
    service.rhythm ? `판정 축: ${service.rhythm.axis}. 리듬: ${service.rhythm.rhythm}. 체언 목표: ${service.rhythm.nominalTarget} (정확한 할당량이나 상한이 아닌 목표치).` : '',
    '수치 선행이나 횟수를 세는 말버릇도 실제 입력·계산 근거가 있을 때만 사용한다. 근거가 없으면 숫자를 만들지 않는다.',
    '결·말투가 같아도 해당 인물의 리듬과 판정 축을 유지한다. 대표 문장과 말버릇을 사실 확인 없이 복제하지 않는다.',
  ].filter(Boolean).join('\n');
  const fields = Object.entries(service.fields).filter(([key]) => key !== '대표 문장');
  const prompt = `# ${service.title}\n\n서비스 약속: ${service.promise}\n\n${fields.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${appendix}\n\n현재 서비스는 ${key}. 다른 서비스 배정은 사용하지 않는다. 최종 말투: ${service.fields['말투']}. 금지선: ${service.fields['금기']}.\n`;
  const domain = {
    home_fit: '모든 공간이나 같은 명리 소개를 매 항목에 필수로 넣지 않습니다. 현재 항목과 직접 관련된 관측과 생활 조건만 사용합니다.',
    wedding_day: '택일 후보일은 제공된 일주(日柱, 그 날의 기둥)와 합·충·파·해 계산을 사용합니다. 손 없는 날을 추가하지 않으며 날짜를 길일·흉일로 단정하지 않습니다. 입력하지 않은 날을 탐색한 것처럼 말하지 않는다.',
    newyear_flow: 'context.newyear의 2027년 계산만 사용하며 2026년 값을 바꾸어 쓰지 않습니다. 출생 시각 미상일 때 시주나 정밀 시작 시점을 단정하지 않습니다. 문제·위험·해결 구조를 전 항목에 반복하지 않습니다. 세운(歲運, 한 해의 흐름)은 계산 근거에 맞춰 설명합니다.',
  }[key] ?? '';
  writeFileSync(join(out, 'services', `${key}.md`), `${prompt}\n${domain}\n`);
}
const inventory = [];
function walk(dir, prefix = '') {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = prefix + entry.name;
    if (entry.isDirectory()) walk(join(dir, entry.name), path + '/');
    else {
      const bytes = readFileSync(join(dir, entry.name));
      inventory.push({ path, sha256: hash(bytes), bytes: bytes.length });
    }
  }
}
walk(source);
const clauses = inventory.filter(f => f.path.startsWith('규격/')).flatMap(file => readFileSync(join(source, file.path), 'utf8').split('\n').flatMap((line, i) => /^#{1,4} /.test(line) ? [{ id: `TV-${file.path.slice(3, 5)}-${i + 1}`, source: file.path, line: i + 1, title: line.replace(/^#+ /, ''), verification: 'NEEDS_REVIEW' }] : []));
writeFileSync(join(out, 'personas.json'), JSON.stringify(services, null, 2) + '\n');
writeFileSync(join(out, 'requirements.json'), JSON.stringify(clauses, null, 2) + '\n');
writeFileSync(join(out, 'manifest.json'), JSON.stringify({ version: 'tone-v2.20260910.1', sourceFiles: inventory, sourceFingerprint: hash(JSON.stringify(inventory)), services: Object.keys(services), releaseReady: false }, null, 2) + '\n');
console.log(`Compiled ${Object.keys(services).length} personas; ${inventory.length} source files; ${clauses.length} source headings. Behavioral review remains required.`);
