import { strict as assert } from 'node:assert'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

import {
  NEW_SERVICE_DRAFT_REVISION,
  getPublishedServiceConfig,
  normalizeServiceConfigPayload,
  publishServiceConfigVersion,
  resetServiceVersionStoreForTests,
  saveServiceConfigDraft,
  serviceConfigChecksum,
} from '../../src/admin/service-version-store.js'
import { getPaymentProduct } from '../../src/payment/catalog.js'
import { listServiceDirectory } from '../../src/server/service-directory.js'

/**
 * T22 — 운영자가 고친 서비스 문안이 고객에게 닿는 경로.
 *
 * 이전에는 읽기만 있었다. 쓰기를 열면 위험이 셋 생긴다.
 *   1. 없는 서비스를 만들거나, payload 로 정식 키를 바꿔 다른 서비스에 게시하는 것
 *   2. 두 운영자가 같은 화면에서 고칠 때 나중 저장이 앞선 저장을 조용히 덮는 것
 *   3. 검토한 내용과 실제 게시되는 내용이 달라지는 것
 *
 * 그리고 게시는 **가격을 건드리지 않는다.** 유료 가격 변경은 결제 게이트를 거치는
 * 별도 경로이고, 이미 만들어진 주문은 어떤 경우에도 바뀌지 않는다.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')
const SERVICE = 'love_this_year'
const DRAFT = { title: '올해 연애운', tagline: '도화가 들어오는 달', summary: '올해의 연애 흐름을 달 단위로 봅니다.', category: '연애', discoveryVisible: true }

test.beforeEach(() => { resetServiceVersionStoreForTests() })

test('1. 카탈로그에 없는 서비스는 만들 수 없고, payload 로 키를 바꿀 수 없다', () => {
  assert.throws(() => normalizeServiceConfigPayload('made_up_service', DRAFT), /SERVICE_VERSION_UNKNOWN_SERVICE/)

  // payload 에 다른 serviceKey 를 실어도 결과에 남지 않는다. 남으면 한 서비스의 문안이
  // 다른 서비스로 게시될 수 있다.
  const normalized = normalizeServiceConfigPayload(SERVICE, { ...DRAFT, serviceKey: 'money_save', key: 'money_save' })
  assert.deepEqual(Object.keys(normalized).sort(), ['category', 'discoveryVisible', 'summary', 'tagline', 'title'])
})

test('2. 값이 비거나 가격이 잘못되면 거절한다', () => {
  for (const broken of [
    { ...DRAFT, title: '' },
    { ...DRAFT, tagline: '   ' },
    { ...DRAFT, summary: undefined },
    { ...DRAFT, discoveryVisible: 'true' },
    null,
    '문자열',
  ]) {
    assert.throws(() => normalizeServiceConfigPayload(SERVICE, broken), /SERVICE_VERSION_PAYLOAD_INVALID/)
  }
  for (const price of [0, -1, 1.5, Number.NaN]) {
    assert.throws(() => normalizeServiceConfigPayload(SERVICE, { ...DRAFT, amount: price }), /SERVICE_VERSION_PRICE_INVALID/)
  }
  assert.equal(normalizeServiceConfigPayload(SERVICE, { ...DRAFT, amount: 19900 }).amount, 19900)
})

test('3. 초안 저장은 revision 을 걸고, 뒤늦은 저장이 앞선 저장을 덮지 않는다', async () => {
  const created = await saveServiceConfigDraft({ serviceKey: SERVICE, payload: DRAFT, authorEmail: 'a@example.com', expectedRevision: NEW_SERVICE_DRAFT_REVISION })
  assert.equal(created.state, 'draft')
  assert.equal(created.version, 1)
  assert.equal(created.revision, 0)

  // 같은 화면을 보고 있던 두 사람. 먼저 저장한 쪽이 이긴다.
  const updated = await saveServiceConfigDraft({ serviceKey: SERVICE, payload: { ...DRAFT, title: '먼저 저장' }, authorEmail: 'a@example.com', expectedRevision: 0 })
  assert.equal(updated.revision, 1)
  await assert.rejects(
    saveServiceConfigDraft({ serviceKey: SERVICE, payload: { ...DRAFT, title: '나중 저장' }, authorEmail: 'b@example.com', expectedRevision: 0 }),
    /SERVICE_VERSION_REVISION_CONFLICT/,
  )
  assert.equal((await saveServiceConfigDraft({ serviceKey: SERVICE, payload: { ...DRAFT, title: '먼저 저장' }, authorEmail: 'a@example.com', expectedRevision: 1 })).payload.title, '먼저 저장')

  // 초안이 이미 있는데 "새 초안"으로 저장하면 기존 초안을 덮게 된다.
  await assert.rejects(
    saveServiceConfigDraft({ serviceKey: SERVICE, payload: DRAFT, authorEmail: 'b@example.com', expectedRevision: NEW_SERVICE_DRAFT_REVISION }),
    /SERVICE_VERSION_DRAFT_EXISTS/,
  )
})

test('4. 게시는 검토한 체크섬이 맞을 때만 된다', async () => {
  const draft = await saveServiceConfigDraft({ serviceKey: SERVICE, payload: DRAFT, authorEmail: 'a@example.com', expectedRevision: NEW_SERVICE_DRAFT_REVISION })
  assert.equal(draft.checksum, serviceConfigChecksum(normalizeServiceConfigPayload(SERVICE, DRAFT)))

  // 검토 이후 초안이 바뀌었다면 옛 체크섬으로는 게시되지 않는다.
  const reviewed = draft.checksum
  const changed = await saveServiceConfigDraft({ serviceKey: SERVICE, payload: { ...DRAFT, summary: '검토 뒤에 바뀐 설명입니다.' }, authorEmail: 'b@example.com', expectedRevision: draft.revision })
  assert.notEqual(changed.checksum, reviewed)
  await assert.rejects(
    publishServiceConfigVersion({ serviceKey: SERVICE, version: changed.version, checksum: reviewed, authorEmail: 'c@example.com', expectedRevision: changed.revision }),
    /SERVICE_VERSION_CHECKSUM_MISMATCH/,
  )

  await assert.rejects(
    publishServiceConfigVersion({ serviceKey: SERVICE, version: changed.version, checksum: changed.checksum, authorEmail: 'c@example.com', expectedRevision: 99 }),
    /SERVICE_VERSION_REVISION_CONFLICT/,
  )

  const published = await publishServiceConfigVersion({ serviceKey: SERVICE, version: changed.version, checksum: changed.checksum, authorEmail: 'c@example.com', expectedRevision: changed.revision })
  assert.equal(published.state, 'published')
  assert.ok(published.publishedAt)

  // 같은 개정을 다시 게시할 수는 없다.
  await assert.rejects(
    publishServiceConfigVersion({ serviceKey: SERVICE, version: published.version, checksum: published.checksum, authorEmail: 'c@example.com', expectedRevision: published.revision }),
    /SERVICE_VERSION_NOT_DRAFT/,
  )
})

test('5. 서비스당 게시본은 하나이고, 이전 것은 지워지지 않고 보관된다', async () => {
  const first = await saveServiceConfigDraft({ serviceKey: SERVICE, payload: DRAFT, authorEmail: 'a@example.com', expectedRevision: NEW_SERVICE_DRAFT_REVISION })
  const live = await publishServiceConfigVersion({ serviceKey: SERVICE, version: first.version, checksum: first.checksum, authorEmail: 'b@example.com', expectedRevision: first.revision })

  const second = await saveServiceConfigDraft({ serviceKey: SERVICE, payload: { ...DRAFT, title: '두 번째 판' }, authorEmail: 'a@example.com', expectedRevision: NEW_SERVICE_DRAFT_REVISION })
  assert.equal(second.version, live.version + 1, '새 초안은 새 버전 번호를 받는다')
  const republished = await publishServiceConfigVersion({ serviceKey: SERVICE, version: second.version, checksum: second.checksum, authorEmail: 'b@example.com', expectedRevision: second.revision })

  const current = await getPublishedServiceConfig(SERVICE)
  assert.equal(current?.version, republished.version)
  assert.equal(current?.payload.title, '두 번째 판')

  // 이전 판을 다시 게시하려 하면 draft 가 아니라고 막힌다 — 행이 지워지지 않았다는 뜻이다.
  await assert.rejects(
    publishServiceConfigVersion({ serviceKey: SERVICE, version: first.version, checksum: first.checksum, authorEmail: 'b@example.com', expectedRevision: 99 }),
    /SERVICE_VERSION_(NOT_DRAFT|REVISION_CONFLICT)/,
  )
})

test('6. 게시해도 고객 가격과 카탈로그는 바뀌지 않는다', async () => {
  const before = getPaymentProduct(SERVICE)?.amount
  const beforeList = listServiceDirectory().map((item) => `${item.key}:${item.amount}`)
  assert.ok(before && before > 0)

  const draft = await saveServiceConfigDraft({ serviceKey: SERVICE, payload: { ...DRAFT, amount: before + 5000 }, authorEmail: 'a@example.com', expectedRevision: NEW_SERVICE_DRAFT_REVISION })
  await publishServiceConfigVersion({ serviceKey: SERVICE, version: draft.version, checksum: draft.checksum, authorEmail: 'b@example.com', expectedRevision: draft.revision })

  assert.equal(getPaymentProduct(SERVICE)?.amount, before, '게시가 결제 금액을 바꾸면 안 된다. 가격 변경은 결제 게이트를 거치는 별도 경로다.')
  assert.deepEqual(listServiceDirectory().map((item) => `${item.key}:${item.amount}`), beforeList)
})

test('7. 게시본이 없으면 임의의 내용을 지어내지 않는다', async () => {
  assert.equal(await getPublishedServiceConfig(SERVICE), null)
  await saveServiceConfigDraft({ serviceKey: SERVICE, payload: DRAFT, authorEmail: 'a@example.com', expectedRevision: NEW_SERVICE_DRAFT_REVISION })
  assert.equal(await getPublishedServiceConfig(SERVICE), null, '초안은 고객에게 보이지 않는다')
  assert.equal(await getPublishedServiceConfig('made_up_service'), null)
})

test('8. SQL 함수도 같은 계약을 건다', () => {
  const dir = join(ROOT, 'supabase/migrations')
  const latest = readdirSync(dir).filter((name) => name.endsWith('.sql')).sort()
    .filter((name) => readFileSync(join(dir, name), 'utf8').includes('function public.publish_service_config_version'))
    .pop()
  assert.ok(latest, 'publish_service_config_version 마이그레이션을 찾지 못했다')
  const sql = readFileSync(join(dir, latest), 'utf8').replace(/^[ \t]*--.*$/gm, '')

  for (const guard of ['SERVICE_VERSION_NOT_FOUND', 'SERVICE_VERSION_NOT_DRAFT', 'SERVICE_VERSION_REVISION_CONFLICT', 'SERVICE_VERSION_CHECKSUM_MISMATCH']) {
    assert.ok(sql.includes(guard), `${latest}: ${guard} 검사가 있어야 한다`)
  }
  assert.ok(sql.includes("set state = 'archived'"), '이전 게시본은 보관 상태로 남아야 한다')
  assert.ok(!/delete\s+from/i.test(sql), '버전 행을 지우면 안 된다. 상태로만 내린다.')
  assert.ok(
    sql.indexOf("set state = 'archived'") < sql.indexOf("set state = 'published'"),
    '서비스당 published 는 하나라는 인덱스가 있다. 먼저 내린 뒤 올려야 한다.',
  )
  assert.ok(sql.includes('security definer') && sql.includes("set search_path = ''"), 'RPC 는 security definer + 고정 search_path 여야 한다')
  assert.ok(sql.includes('to service_role') && sql.includes('from public, anon, authenticated'), '브라우저 역할에 실행 권한이 가면 안 된다')
})

test('9. 라우트는 감사 명령을 거치고 실패 사유를 구분한다', () => {
  const source = readFileSync(join(ROOT, 'src/server/app.ts'), 'utf8')
  const draftRoute = source.slice(source.indexOf("app.post('/api/admin/v1/services/:serviceKey/draft'"), source.indexOf("app.post('/api/admin/v1/services/:serviceKey/publish'"))
  const publishRoute = source.slice(source.indexOf("app.post('/api/admin/v1/services/:serviceKey/publish'"))

  assert.match(draftRoute, /requireStaff\(req, res, 'services:write'\)/)
  assert.match(publishRoute.slice(0, 2000), /requireStaff\(req, res, 'services:publish'\)/)
  for (const route of [draftRoute, publishRoute.slice(0, 2500)]) {
    assert.match(route, /executeAdminCommand\(/, '쓰기는 감사 명령을 거쳐야 한다')
    assert.match(route, /adminCommandKey\(req\)/, '멱등 키 없이 쓰면 안 된다')
  }

  const table = source.slice(source.indexOf('const SERVICE_VERSION_FAILURES'), source.indexOf('function respondServiceVersionFailure'))
  const sentences = Array.from(table.matchAll(/error: '([^']+)'/g)).map((match) => match[1])
  assert.ok(sentences.length >= 8, '실패 사유마다 문장이 있어야 한다')
  assert.deepEqual(sentences.filter((item, index) => sentences.indexOf(item) !== index), [], '서로 다른 실패가 같은 문장을 쓰면 운영자가 구분할 수 없다')

  const staff = readFileSync(join(ROOT, 'src/auth/staff.ts'), 'utf8')
  assert.match(staff, /'services:write'/)
  assert.match(staff, /'services:publish'/)
})
