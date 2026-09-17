import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

import type { PaymentOrder } from '../../src/payment/order-store.js'
import type { ReportRecord } from '../../src/report/report-store.js'
import { selectAdminVaultReadings, selectPurchasedReadings } from '../../src/report/vault-list.js'

/**
 * 2026-09-14 회귀 방지: 보관함이 "구매한 순"도 아니었고 "구매한 것"도 아니었다.
 *
 *   - 목록은 `listReportRecords` 를 그대로 내려줬다. 결제 여부를 보지 않아 무료 티저만
 *     본 기록까지 남았고, 같은 서비스·같은 생년월일 행이 수십 개 쌓였다.
 *   - 순서는 `updated_at` 내림차순이었다. 그건 마지막으로 **건드린** 순서다. 섹션이
 *     나중에 채워지면 오래된 구매가 최신 구매 위로 올라온다.
 *
 * 아래는 그 두 가지를 순수 함수 수준에서 고정한다.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

/**
 * `lineageId` 를 명시한다. 생년월일·맥락이 같으면 계보가 같아지고, 같은 계보는 결제를
 * 서로 물려받는다(T-4). 그 승계는 6번에서 따로 검사하므로 나머지 검사는 서로 다른
 * 계보로 둬야 정렬·거르기만 본다.
 */
/**
 * 같은 서비스·같은 사주는 한 줄로 합쳐진다(14번). 정렬·거르기만 보는 검사는 생일을
 * 달리 줘서 합쳐지지 않게 한다.
 */
function record(reportId: string, over: Partial<ReportRecord> = {}, day = 26): ReportRecord {
  return {
    reportId,
    lineageId: `lineage-${reportId}`,
    birth: { year: 1975, month: 9, day, hour: 12, minute: 0, calendar: 'solar' },
    context: { serviceKey: 'cmdg' },
    report: { sections: [] },
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...over,
  } as unknown as ReportRecord
}

function order(reportId: string | undefined, createdAt: string, over: Partial<PaymentOrder> = {}): PaymentOrder {
  return {
    orderId: `o-${reportId ?? 'none'}-${createdAt}`,
    ownerId: 'u1',
    buyerEmail: 'a@b.c',
    buyerTel: '000',
    productKey: 'cmdg',
    productTitle: '천명사주',
    amount: 9900,
    status: 'paid',
    reportId,
    createdAt,
    updatedAt: createdAt,
    ...over,
  } as PaymentOrder
}

test('1. 결제 주문이 없는 해석은 보관함에 남지 않는다', () => {
  const picked = selectPurchasedReadings(
    [record('paid-1'), record('free-1'), record('free-2')],
    [order('paid-1', '2026-09-10T01:00:00.000Z')],
  )
  assert.deepEqual(picked.map((item) => item.record.reportId), ['paid-1'])
})

test('2. 정렬은 구매 시각 내림차순이다 — 나중에 건드린 순이 아니다', () => {
  // 오래전에 산 해석의 섹션이 오늘 채워져 updatedAt 이 가장 최신인 상황.
  const old = record('old', { createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-14T23:59:00.000Z' })
  const fresh = record('fresh', { createdAt: '2026-09-13T00:00:00.000Z', updatedAt: '2026-09-13T00:10:00.000Z' }, 27)
  const picked = selectPurchasedReadings(
    [old, fresh],
    [order('old', '2026-09-01T00:05:00.000Z'), order('fresh', '2026-09-13T00:05:00.000Z')],
  )
  assert.deepEqual(picked.map((item) => item.record.reportId), ['fresh', 'old'])
  assert.equal(picked[0].purchasedAt, '2026-09-13T00:05:00.000Z')
})

test('2b. 구매 시각은 주문이 만들어진 시각이다 — 주문이 나중에 갱신돼도 흔들리지 않는다', () => {
  // 주문 행은 상태 전이·대사·환불 의도 기록으로 나중에도 갱신된다. updatedAt 을 쓰면
  // 오래전 구매가 "방금 산 것"이 된다. 정렬 기준은 주문이 생긴 시각이어야 한다.
  const picked = selectPurchasedReadings(
    [record('old'), record('fresh', {}, 27)],
    [
      order('old', '2026-09-01T00:00:00.000Z', { updatedAt: '2026-09-14T23:59:00.000Z' }),
      order('fresh', '2026-09-13T00:00:00.000Z'),
    ],
  )
  assert.deepEqual(picked.map((item) => item.record.reportId), ['fresh', 'old'])
  assert.equal(picked[1].purchasedAt, '2026-09-01T00:00:00.000Z')
})

test('3. 같은 해석에 결제가 여러 건이면 가장 이른 것이 구매 시각이다', () => {
  const picked = selectPurchasedReadings(
    [record('r1')],
    [order('r1', '2026-09-12T00:00:00.000Z'), order('r1', '2026-09-05T00:00:00.000Z')],
  )
  assert.equal(picked[0].purchasedAt, '2026-09-05T00:00:00.000Z')
})

test('4. 승인되지 않은 주문은 구매로 치지 않는다', () => {
  for (const status of ['ready', 'approving', 'failed', 'cancelled'] as const) {
    const picked = selectPurchasedReadings([record('r1')], [order('r1', '2026-09-10T00:00:00.000Z', { status })])
    assert.deepEqual(picked, [], `${status} 주문이 구매로 통과했다`)
  }
})

test('4b. 풀이를 열어 viewed 가 된 결제도 보관함에 남는다', () => {
  const picked = selectPurchasedReadings(
    [record('r1')],
    [order('r1', '2026-09-10T00:00:00.000Z', { status: 'viewed' })],
  )
  assert.equal(picked[0]?.record.reportId, 'r1')
  assert.equal(picked[0]?.purchasedAt, '2026-09-10T00:00:00.000Z')
})

test('5. 리포트에 묶이지 않은 주문은 아무 해석도 열지 않는다', () => {
  // reportId 가 비어 있으면 무엇을 산 것인지 알 수 없다. 추측하면 남의 해석이 열린다.
  assert.deepEqual(selectPurchasedReadings([record('r1')], [order(undefined, '2026-09-10T00:00:00.000Z')]), [])
  assert.deepEqual(selectPurchasedReadings([record('r1')], [order('other', '2026-09-10T00:00:00.000Z')]), [])
})

test('6. 코퍼스 세대가 바뀌어도 예전 주문이 새 해석을 연다 (계보 승계)', () => {
  // T-4 의 계보 승계. 같은 생년월일·같은 맥락이면 리포트 ID 가 달라도 계보는 같다.
  // 같은 사주이므로 화면에는 한 줄만 남되, 예전 주문의 구매 시각을 물려받는다.
  const previous = record('epoch-1', { lineageId: 'same-lineage' })
  const current = record('epoch-2', { lineageId: 'same-lineage' })
  const picked = selectPurchasedReadings([current, previous], [order('epoch-1', '2026-09-02T00:00:00.000Z')])
  assert.equal(picked.length, 1)
  assert.equal(picked[0].purchasedAt, '2026-09-02T00:00:00.000Z')
})

test('7. 저장된 상담 기록은 보관함에 섞이지 않는다', () => {
  const chat = record('chat-1', { context: { serviceKey: 'cmdg', savedChat: { question: 'q' } } as never })
  // 상담 기록은 걸러지므로, 그 주문이 남아 있어도 아무것도 열지 못한다.
  const picked = selectPurchasedReadings(
    [chat, record('r1')],
    [order('chat-1', '2026-09-14T00:00:00.000Z'), order('r1', '2026-09-10T00:00:00.000Z')],
  )
  assert.deepEqual(picked.map((item) => item.record.reportId), ['r1'])
})

test('8. 같은 시각 구매는 리포트 ID 로 순서가 고정된다', () => {
  const at = '2026-09-14T00:00:00.000Z'
  const forward = selectPurchasedReadings([record('a'), record('b', {}, 27)], [order('a', at), order('b', at)])
  const reversed = selectPurchasedReadings([record('b', {}, 27), record('a')], [order('b', at), order('a', at)])
  assert.equal(forward.length, 2)
  assert.deepEqual(forward.map((i) => i.record.reportId), reversed.map((i) => i.record.reportId))
})

test('14. 같은 사주·같은 서비스는 한 줄만 남고, 완성된 것이 최신 실패 stub 을 이긴다', () => {
  // 운영 보관함: 천명사주 8줄이 전부 같은 사람. 최신은 0/37 실패, 예전 것이 37/37 완성.
  const complete = record('done', { status: 'complete', report: { status: 'complete', sections: [{ id: 'a', status: 'complete' }] } } as never)
  const stub = record('stub', { report: { sections: [{ id: 'a', status: 'failed' }] }, status: 'failed' } as never)
  const other = record('other-person', {}, 27)
  const picked = selectPurchasedReadings(
    [stub, complete, other],
    [order('stub', '2026-09-17T00:00:00.000Z'), order('done', '2026-09-07T00:00:00.000Z'), order('other-person', '2026-09-10T00:00:00.000Z')],
  )
  assert.deepEqual(picked.map((item) => item.record.reportId), ['other-person', 'done'])
})

test('14b. 둘 다 미완성이면 더 최근 구매가 남는다', () => {
  const picked = selectPurchasedReadings(
    [record('older'), record('newer')],
    [order('older', '2026-09-01T00:00:00.000Z'), order('newer', '2026-09-15T00:00:00.000Z')],
  )
  assert.deepEqual(picked.map((item) => item.record.reportId), ['newer'])
})

test('15. 오늘운은 날짜가 같으면 한 줄, 다르면 각각 남는다', () => {
  const today = (id: string, date: string, updatedAt: string) => record(id, {
    context: { serviceKey: 'today', concern: date } as never,
    status: 'complete',
    updatedAt,
  })
  const picked = selectAdminVaultReadings([
    today('sep7-a', '2026-09-07', '2026-09-07T06:56:00.000Z'),
    today('sep7-b', '2026-09-07', '2026-09-07T07:22:00.000Z'),
    today('sep8', '2026-09-08', '2026-09-08T06:00:00.000Z'),
  ], [
    order('sep7-a', '2026-09-07T06:56:00.000Z', { productKey: 'today' }),
    order('sep7-b', '2026-09-07T07:22:00.000Z', { productKey: 'today' }),
    order('sep8', '2026-09-08T06:00:00.000Z', { productKey: 'today' }),
  ])
  assert.deepEqual(picked.map((item) => item.record.reportId), ['sep8', 'sep7-b'])
})

test('9. 라우트는 거른 뒤 자르고, 주문 조회가 죽으면 목록을 비우지 않는다', () => {
  const source = readFileSync(join(root, 'src', 'server', 'app.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '')
  // 같은 호출이 파일 곳곳에 있다. 보관함 핸들러 안만 잘라서 본다 — 전체를 훑으면
  // 다른 곳의 `listReportRecords(owner, 100)` 이 이 검사를 대신 통과시킨다.
  const start = source.indexOf("app.get('/api/user/reports'")
  assert.notEqual(start, -1, '보관함 라우트를 찾지 못했다')
  const app = source.slice(start, source.indexOf('app.get(', start + 1))
  assert.ok(app.length > 0 && app.length < 4000, '핸들러 구간을 잘못 잘랐다')
  assert.ok(/listReportRecords\(owner, 100, \{ light: true, includeAnalysis: !slim \}\)/.test(app), '요청한 수만큼만 읽으면 걸러진 만큼 목록이 짧아진다 / 목록은 본문 없는 경량 행을 읽는다')
  assert.ok(/selectPurchasedReadings\(records, orders\)/.test(app), '일반 계정은 구매 목록을 쓴다')
  assert.ok(/selectAdminVaultReadings\(records, orders\)/.test(app), '관리자 우회가 없다')
  assert.ok(/isAdminOwner\(owner\)/.test(app), '관리자 판정이 핸들러에 없다')
  assert.ok(
    /\.filter\(\(item\) => isCustomerFacingReport\(item\.record\)\)\s*\n\s*\.slice\(0, limit\)/.test(app),
    '거르기 전에 자르고 있다',
  )
  // 구간 측정(.then) 이 끼어도 실패는 null 로 구분되어야 한다.
  assert.ok(/listPaymentOrders\(owner\.id, 100\)[\s\S]{0,200}?\.catch\(\(\) => null\)/.test(app), '주문 조회 실패를 구분하지 않는다')
  assert.ok(
    /purchasedOnly: false,\n\s*reports: records\.filter\(isCustomerFacingReport\)\.map\(\(record\) => historyEntryFromRecord\(record, \{ slim \}\)\)/.test(app),
    '주문 조회가 죽으면 보관함이 빈다',
  )
  assert.ok(/purchasedAt: item\.purchasedAt/.test(app), '구매 시각이 화면으로 나가지 않는다')
})

test('11. 관리자 우회는 결제 없이 연 해석을 구매처럼 쌓고 티저는 넣지 않는다', () => {
  const teaser = record('save-teaser', {
    status: 'pending',
    context: { serviceKey: 'money_save' } as never,
    createdAt: '2026-09-17T03:00:00.000Z',
    updatedAt: '2026-09-17T03:00:00.000Z',
  })
  // 같은 사주면 한 줄로 합쳐지므로(14번) 다른 사람의 저축 풀이로 둔다.
  const saveA = record('save-a', {
    status: 'generating',
    context: { serviceKey: 'money_save' } as never,
    createdAt: '2026-09-16T00:00:00.000Z',
    updatedAt: '2026-09-16T00:00:00.000Z',
  }, 27)
  const saveB = record('save-b', {
    status: 'complete',
    context: { serviceKey: 'money_save' } as never,
    createdAt: '2026-09-17T00:00:00.000Z',
    updatedAt: '2026-09-17T00:00:00.000Z',
  })
  const quit = record('quit-1', {
    status: 'generating',
    context: { serviceKey: 'quit_fortune' } as never,
    createdAt: '2026-09-17T01:00:00.000Z',
    updatedAt: '2026-09-17T01:00:00.000Z',
  })
  const picked = selectAdminVaultReadings([teaser, saveA, saveB, quit], [])
  assert.deepEqual(picked.map((item) => item.record.reportId), ['quit-1', 'save-b', 'save-a'])
})

test('12. 관리자 우회는 실제 결제를 남기고 같은 서비스의 미결제 티저는 넣지 않는다', () => {
  const paidCmdg = record('paid-1', { context: { serviceKey: 'cmdg' } as never, status: 'complete' })
  const unpaidCmdg = record('cmdg-teaser', {
    context: { serviceKey: 'cmdg' } as never,
    status: 'pending',
    updatedAt: '2026-09-17T03:00:00.000Z',
  })
  const move = record('move-1', {
    context: { serviceKey: 'work_move' } as never,
    status: 'generating',
    createdAt: '2026-09-17T02:00:00.000Z',
    updatedAt: '2026-09-17T02:00:00.000Z',
  })
  const picked = selectAdminVaultReadings(
    [paidCmdg, unpaidCmdg, move],
    [order('paid-1', '2026-09-10T01:00:00.000Z')],
  )
  assert.deepEqual(picked.map((item) => item.record.reportId), ['move-1', 'paid-1'])
})

test('14. 관리자가 결제를 건너뛴 시각이 있으면 그 시각이 구매 시각이다', () => {
  const reading = record('admin-1', {
    status: 'pending',
    adminAcquiredAt: '2026-09-17T12:00:00.000Z',
    createdAt: '2026-09-01T00:00:00.000Z',
  })
  const picked = selectAdminVaultReadings([reading], [])
  assert.equal(picked[0]?.record.reportId, 'admin-1')
  assert.equal(picked[0]?.purchasedAt, '2026-09-17T12:00:00.000Z')
})

test('15. 관리자가 유료 본문을 열면 보관함 적립과 생성 큐를 건다', () => {
  const source = readFileSync(join(root, 'src', 'server', 'app.ts'), 'utf8')
  const start = source.indexOf('async function ensurePaidServiceAccess')
  assert.notEqual(start, -1, '유료 관문을 찾지 못했다')
  const gate = source.slice(start, source.indexOf('\nasync function', start + 1))
  assert.ok(/rememberAdminPaidEquivalent/.test(gate), '관리자 유료 관문이 보관함에 적립하지 않는다')
  assert.ok(/rememberAdminPaidEquivalent/.test(source), '관리자 본문 조회가 보관함에 적립하지 않는다')
  assert.ok(/adminAcquiredAt/.test(source), '결제 우회 시각을 남기지 않는다')
})

test('13. 관리자 우회도 상담 기록은 보관함에 넣지 않는다', () => {
  const chat = record('chat-1', {
    status: 'complete',
    context: { serviceKey: 'cmdg', savedChat: { question: 'q' } } as never,
  })
  const reading = record('r1', { status: 'generating', context: { serviceKey: 'job_choice' } as never })
  const picked = selectAdminVaultReadings([chat, reading], [])
  assert.deepEqual(picked.map((item) => item.record.reportId), ['r1'])
})

test('10. 보관함 화면은 구매 시각과 고민 문구로 행을 구분한다', () => {
  const vault = readFileSync(join(root, '사주', 'vault.html'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '')
  assert.ok(/stamp\(report\.purchasedAt \|\| report\.savedAt\)/.test(vault), '구매 시각보다 저장 시각을 먼저 본다')
  assert.ok(/report\.initialConcern/.test(vault), '부제가 다시 이름·생년월일로 돌아갔다')
  assert.ok(/at\.time/.test(vault), '시각이 사라져 같은 날 구매를 구분할 수 없다')
})
