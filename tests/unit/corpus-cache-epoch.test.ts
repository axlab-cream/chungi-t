import { strict as assert } from 'node:assert'
import { createHash, randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

import { clearCorpusRegistryCache, corpusCacheSalt, getCorpusSnapshot, withCorpusEpoch } from '../../src/rag/corpus-registry.js'
import { createOrGetReportRecord, createReportId, createReportLineageId, findReportInLineage } from '../../src/report/report-store.js'
import { buildTemplateSajuReport } from '../../src/report/report-generator.js'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import type { BirthInput, SajuReportContext } from '../../src/types/index.js'

/**
 * 2026-09-14 캐시 무효화 정책.
 *
 * 이전에는 코퍼스 파일을 한 글자만 고쳐도 전역 지문이 바뀌었다. 그러면
 *   1) 종합 해석의 리포트 ID 가 바뀌어 저장분을 비켜가고 LLM 이 처음부터 다시 돌고,
 *   2) 그 ID 에 묶인 결제 주문이 열쇠를 잃어 이미 결제한 사람이 결제 화면으로 되돌아갔다.
 * 반대로 특화 서비스 15개의 ID 는 코퍼스를 아예 참조하지 않아 **영원히 갱신되지 않았다.**
 *
 * 정책: 무효화는 `registry.json` 의 `cacheEpoch` 하나로만 일어난다.
 *   - 내용 수정 → 세대 그대로 → 기존 해석을 이어 쓴다 (재생성 0건)
 *   - 세대 상향 → 전 서비스가 다시 생성되고, 결제 권한은 계보로 승계된다
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')
const REGISTRY = join(ROOT, 'data/tone-v2/corpus/registry.json')
const A_CORPUS_FILE = join(ROOT, 'data/tone-v2/corpus/myeongri-basics.json')

const BIRTH: BirthInput = { year: 1975, month: 9, day: 26, hour: 7, minute: 30, gender: 'male', calendar: 'solar' }
const CONTEXT: SajuReportContext = { name: '정재용', concern: '올해 일운' }

/** registry.json 을 잠시 바꿔 세대 상향을 재현한다. 반드시 원본으로 되돌린다. */
function withEpoch<T>(epoch: string, run: () => T): T {
  const original = readFileSync(REGISTRY, 'utf-8')
  try {
    const parsed = JSON.parse(original) as Record<string, unknown>
    parsed.cacheEpoch = epoch
    writeFileSync(REGISTRY, `${JSON.stringify(parsed, null, 2)}\n`, 'utf-8')
    clearCorpusRegistryCache()
    return run()
  } finally {
    writeFileSync(REGISTRY, original, 'utf-8')
    clearCorpusRegistryCache()
  }
}

/** 코퍼스 파일을 잠깐 고쳐 "오타 수정" 개정을 재현한다. 반드시 원본으로 되돌린다. */
function withEditedCorpus<T>(run: () => T): T {
  const original = readFileSync(A_CORPUS_FILE, 'utf-8')
  try {
    writeFileSync(A_CORPUS_FILE, `${original}\n`, 'utf-8')
    clearCorpusRegistryCache()
    return run()
  } finally {
    writeFileSync(A_CORPUS_FILE, original, 'utf-8')
    clearCorpusRegistryCache()
  }
}

test('1. 기준 세대에서는 기존 리포트 ID 가 한 건도 바뀌지 않는다', () => {
  assert.equal(corpusCacheSalt(), '', 'cacheEpoch 는 도입 시점에 빈 문자열이어야 한다')

  // 도입 이전 공식 그대로 계산한 값. 세대 소금이 비어 있으면 키 자체가 빠져야 한다.
  const legacy = createHash('sha256').update(JSON.stringify({
    birth: {
      calendar: BIRTH.calendar, day: BIRTH.day, gender: BIRTH.gender, hour: BIRTH.hour,
      isLeapMonth: false, minute: BIRTH.minute, month: BIRTH.month, year: BIRTH.year,
    },
    context: { concern: CONTEXT.concern, name: CONTEXT.name },
    corpusFingerprint: 'fixed-fingerprint',
    ownerId: 'owner-1',
  }).replace(/"([a-zA-Z]+)":/g, '"$1":')).digest('hex').slice(0, 28)

  assert.equal(
    createReportId(BIRTH, CONTEXT, 'fixed-fingerprint', 'owner-1'),
    legacy,
    '기준 세대의 리포트 ID 가 도입 이전 공식과 달라졌다. 배포 즉시 전량 재생성이 일어난다.',
  )

  // 반대로 세대를 올렸을 때는 반드시 바뀌어야 한다. 안 바뀌면 의도한 무효화가 동작하지 않는다.
  const bumped = withEpoch('e2', () => createReportId(BIRTH, CONTEXT, 'fixed-fingerprint', 'owner-1'))
  assert.notEqual(bumped, legacy, '세대를 올렸는데 종합 해석 ID 가 그대로다. 개정이 기존 사용자에게 반영되지 않는다.')
})

test('2. withCorpusEpoch 는 기준 세대에서 아무것도 하지 않는다', () => {
  assert.equal(withCorpusEpoch('money-save-abc'), 'money-save-abc')
  const bumped = withEpoch('e2', () => withCorpusEpoch('money-save-abc'))
  assert.notEqual(bumped, 'money-save-abc', '세대를 올렸는데 특화 서비스 ID 가 그대로다. 개정이 반영되지 않는다.')
})

test('3. 계보 키는 코퍼스 지문을 따라가지 않는다', () => {
  const lineage = createReportLineageId(BIRTH, CONTEXT, 'owner-1')

  // 같은 사람·같은 입력이면 코퍼스 지문이 무엇이든 계보는 하나다.
  assert.notEqual(
    createReportId(BIRTH, CONTEXT, 'corpus-a', 'owner-1'),
    createReportId(BIRTH, CONTEXT, 'corpus-b', 'owner-1'),
    '전제 확인: 리포트 ID 는 코퍼스 지문을 포함한다',
  )
  assert.equal(lineage, createReportLineageId(BIRTH, CONTEXT, 'owner-1'))
  assert.notEqual(lineage, createReportId(BIRTH, CONTEXT, 'corpus-a', 'owner-1'))

  // 사람이 다르면 계보도 다르다. 남의 결제로 열리면 안 된다.
  assert.notEqual(lineage, createReportLineageId(BIRTH, CONTEXT, 'owner-2'))
  assert.notEqual(lineage, createReportLineageId(BIRTH, { ...CONTEXT, concern: '이직' }, 'owner-1'))

  // 실제 코퍼스 파일을 고쳐 본다. 지문은 바뀌어야 하고, 계보는 그대로여야 한다.
  const before = getCorpusSnapshot().fingerprint
  const edited = withEditedCorpus(() => ({
    fingerprint: getCorpusSnapshot().fingerprint,
    lineage: createReportLineageId(BIRTH, CONTEXT, 'owner-1'),
  }))
  assert.notEqual(edited.fingerprint, before, '전제 확인: 코퍼스 파일을 고치면 전역 지문이 바뀐다')
  assert.equal(
    edited.lineage, lineage,
    '코퍼스를 고쳤더니 계보 키가 바뀌었다. 저장된 해석을 못 찾아 LLM 이 다시 돌고 결제 권한도 끊긴다.',
  )
  assert.equal(getCorpusSnapshot().fingerprint, before, '코퍼스 파일이 원본으로 복구되지 않았다')
})

test('4. 세대를 올리면 계보 키도 함께 바뀐다', () => {
  const base = createReportLineageId(BIRTH, CONTEXT, 'owner-1')
  const bumped = withEpoch('e2', () => createReportLineageId(BIRTH, CONTEXT, 'owner-1'))
  assert.notEqual(bumped, base, '세대를 올렸는데 계보가 그대로면 옛 해석이 영원히 승계되어 개정이 반영되지 않는다.')
  assert.equal(createReportLineageId(BIRTH, CONTEXT, 'owner-1'), base, 'registry.json 이 원본으로 복구되지 않았다')
})

test('5. 코퍼스가 바뀌어도 같은 계보의 해석을 이어 쓴다 (LLM 재호출 없음)', async () => {
  // 저장소가 파일 모드로 잡히면 레코드가 실행 사이에 남는다. 실행마다 새 소유자를 쓴다.
  const owner = { id: `owner-lineage-${randomUUID()}`, email: 'a@b.c', provider: 'test' }
  const analysis = analyzeSaju(BIRTH)
  const template = buildTemplateSajuReport(analysis, BIRTH, CONTEXT)
  const lineageId = createReportLineageId(BIRTH, CONTEXT, owner.id)

  const first = await createOrGetReportRecord({
    reportId: createReportId(BIRTH, CONTEXT, 'corpus-v1', owner.id),
    birth: BIRTH, context: CONTEXT, templateReport: template, analysis, owner, lineageId,
  })
  assert.equal(first.created, true)

  // 코퍼스를 고친 뒤와 같은 상황: 리포트 ID 는 달라졌지만 계보는 그대로다.
  const second = await createOrGetReportRecord({
    reportId: createReportId(BIRTH, CONTEXT, 'corpus-v2', owner.id),
    birth: BIRTH, context: CONTEXT, templateReport: template, analysis, owner, lineageId,
  })
  assert.equal(second.created, false, '새 레코드를 만들었다. 저장된 해석을 버리고 LLM 을 다시 호출하게 된다.')
  assert.equal(second.record.reportId, first.record.reportId, '기존 레코드를 그대로 이어 써야 한다')

  // 세대를 올린 상황: 계보가 달라지므로 승계하지 않고 새로 만든다.
  const third = await createOrGetReportRecord({
    reportId: createReportId(BIRTH, CONTEXT, 'corpus-v3', owner.id),
    birth: BIRTH, context: CONTEXT, templateReport: template, analysis, owner,
    lineageId: `${lineageId}-e2`,
  })
  assert.equal(third.created, true, '세대를 올렸는데도 옛 해석을 승계했다. 의도한 무효화가 동작하지 않는다.')
})

test('6. 계보 키 없이 만든 레코드는 승계 대상이 아니다', async () => {
  const owner = { id: `owner-lineage-${randomUUID()}`, email: 'a@b.c', provider: 'test' }
  const analysis = analyzeSaju(BIRTH)
  const template = buildTemplateSajuReport(analysis, BIRTH, CONTEXT)

  const first = await createOrGetReportRecord({
    reportId: createReportId(BIRTH, CONTEXT, 'corpus-v1', owner.id),
    birth: BIRTH, context: CONTEXT, templateReport: template, analysis, owner,
  })
  const second = await createOrGetReportRecord({
    reportId: createReportId(BIRTH, CONTEXT, 'corpus-v2', owner.id),
    birth: BIRTH, context: CONTEXT, templateReport: template, analysis, owner,
  })
  assert.equal(first.created, true)
  assert.equal(second.created, true, '계보 키를 주지 않은 경로는 기존 동작(정확 일치)을 유지해야 한다')
})

test('7. 특화 서비스 15개가 모두 세대와 계보를 통과시킨다', () => {
  const app = readFileSync(join(ROOT, 'src/server/app.ts'), 'utf-8')

  const scoped = app.match(/epochScopedIds\(/g) ?? []
  assert.ok(scoped.length >= 16, `epochScopedIds 적용이 ${scoped.length}곳뿐이다. 서비스 하나가 빠지면 그 서비스는 개정이 영원히 반영되지 않는다.`)

  const unguarded = app.match(/ensurePaidServiceAccess\(req, res, owner, '[a-z_]+', reportId\)/g) ?? []
  assert.deepEqual(
    unguarded, [],
    '결제 확인에 계보 키를 넘기지 않는 서비스가 있다. 세대를 올리면 그 서비스의 결제 사용자가 결제 화면으로 되돌아간다.',
  )

  const preview = app.match(/sendSpecializedPreview\(req, res, \{ reportId, birth/g) ?? []
  assert.deepEqual(preview, [], '티저 생성에 계보 키를 넘기지 않는 서비스가 있다.')

  assert.ok(
    getCorpusSnapshot().cacheEpoch !== undefined,
    '저장되는 코퍼스 스냅샷에 세대가 기록되어야 운영에서 어느 세대의 해석인지 알 수 있다.',
  )
})

test('8. 특화 서비스의 계보 키(역산 불가)도 레코드에 남는다', async () => {
  // 특화 서비스의 계보 키는 서비스별 ID 생성기가 만든 값이라 생년월일·맥락에서 역산할 수 없다.
  // 저장 시 기록해 두지 않으면 세대를 올린 뒤 그 서비스의 결제 주문을 영영 찾지 못한다.
  const owner = { id: `owner-specialized-${randomUUID()}`, email: 'a@b.c', provider: 'test' }
  const analysis = analyzeSaju(BIRTH)
  const template = buildTemplateSajuReport(analysis, BIRTH, CONTEXT)
  const lineageId = `money-save-base-${randomUUID()}`

  const created = await createOrGetReportRecord({
    reportId: `report-${randomUUID()}`.slice(0, 28),
    birth: BIRTH, context: CONTEXT, templateReport: template, analysis, owner, lineageId,
  })
  assert.equal(created.created, true)
  assert.equal(created.record.lineageId, lineageId, '계보 키가 레코드에 기록되지 않았다')

  const found = await findReportInLineage(lineageId, owner)
  assert.ok(found, '기록된 계보 키로 지난 해석을 찾지 못했다. 세대 상향 시 결제 권한이 끊긴다.')
  assert.equal(found?.reportId, created.record.reportId)
})
