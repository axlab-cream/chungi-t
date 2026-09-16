import { strict as assert } from 'node:assert'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

import { approveRefundRequest, createRefundRequest, resetRefundStoreForTests } from '../../src/payment/refund-store.js'

/**
 * T18 이중통제 — 승인 실패 사유가 구분되어야 한다.
 *
 * 증상: 관리자 화면의 환불 승인 실패가 원인과 상관없이 같은 문장으로 보였다.
 *
 * 겹친 원인이 셋이었다.
 *   1. 승인 함수가 `revision` 을 `requested_by_email` 보다 먼저 봤다. 그래서 요청자가
 *      낡은 revision 으로 자기 요청을 승인하면 REFUND_REVISION_CONFLICT 가 나왔다.
 *      화면은 "새로고침 후 다시"로 안내하고, 운영자는 성공할 수 없는 동작을 재시도했다.
 *      TypeScript 스토어와 SQL 함수 양쪽에 같은 순서로 들어 있었다.
 *   2. 라우트가 모든 실패를 한 문장으로 응답했다. 구분은 `code` 에만 있었는데
 *      화면은 `error` 만 읽는다.
 *   3. `code` 에 PostgREST 오류 본문이 통째로 실려 DB 내부가 브라우저까지 흘렀고,
 *      상태 코드는 그 문자열에 "CONFLICT" 가 들어 있는지로 골랐다.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')
const base = {
  orderId: 'ORDER-T18', reason: '중복 결제', actorEmail: 'requester@example.com',
  idempotencyKey: 'refund-key-t18', orderAmount: 19900, orderRevision: 3,
}

test.beforeEach(() => { resetRefundStoreForTests() })

test('1. 요청자는 revision 이 낡아도 "자기승인 금지"를 듣는다', async () => {
  const requested = await createRefundRequest({ ...base, amount: 9900 })

  await assert.rejects(
    approveRefundRequest({ refundId: requested.id, actorEmail: base.actorEmail, expectedRevision: 99 }),
    /REFUND_SELF_APPROVAL_FORBIDDEN/,
    '낡은 revision 이 자기승인 금지를 가렸다. 운영자는 새로고침 후 재시도하게 된다.',
  )
})

test('2. 요청자는 이미 승인된 뒤에도 "자기승인 금지"를 듣는다', async () => {
  const requested = await createRefundRequest({ ...base, amount: 9900 })
  const approved = await approveRefundRequest({ refundId: requested.id, actorEmail: 'approver@example.com', expectedRevision: 0 })
  assert.equal(approved.state, 'approved')

  await assert.rejects(
    approveRefundRequest({ refundId: requested.id, actorEmail: base.actorEmail, expectedRevision: approved.revision }),
    /REFUND_SELF_APPROVAL_FORBIDDEN/,
    '누가 승인하려 하는지는 상태보다 먼저 판정해야 한다.',
  )
})

test('3. 다른 관리자에게는 동시 수정이 그대로 보인다', async () => {
  const requested = await createRefundRequest({ ...base, amount: 9900 })

  await assert.rejects(
    approveRefundRequest({ refundId: requested.id, actorEmail: 'approver@example.com', expectedRevision: 99 }),
    /REFUND_REVISION_CONFLICT/,
    '자기승인 검사를 앞으로 옮기면서 낙관적 동시성 검사를 없애면 안 된다.',
  )
  const approved = await approveRefundRequest({ refundId: requested.id, actorEmail: 'approver@example.com', expectedRevision: 0 })
  assert.equal(approved.state, 'approved')
  assert.equal(approved.approvedByEmail, 'approver@example.com')
})

test('4. SQL 함수도 같은 순서다', () => {
  const dir = join(ROOT, 'supabase/migrations')
  const latest = readdirSync(dir)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .filter((name) => readFileSync(join(dir, name), 'utf8').includes('function public.approve_refund_request'))
    .pop()
  assert.ok(latest, 'approve_refund_request 를 정의하는 마이그레이션을 찾지 못했다')

  // 주석은 계약이 아니다. 설명문에 적힌 코드 이름에 걸리지 않게 걷어낸다.
  const sql = readFileSync(join(dir, latest), 'utf8').replace(/^[ \t]*--.*$/gm, '')
  const self = sql.indexOf('REFUND_SELF_APPROVAL_FORBIDDEN')
  const revision = sql.indexOf('REFUND_REVISION_CONFLICT')
  const state = sql.indexOf('REFUND_NOT_REQUESTED')
  assert.ok(self !== -1 && revision !== -1 && state !== -1, '세 검사가 모두 있어야 한다')
  assert.ok(
    self < revision,
    `${latest}: SQL 도 자기승인을 revision 보다 먼저 봐야 한다. 실서비스는 이 함수를 탄다.`,
  )
  assert.ok(self < state, `${latest}: 자기승인은 상태 검사보다 먼저여야 한다`)
})

test('5. 실패 사유마다 다른 문장과 상태 코드로 응답한다', () => {
  const source = readFileSync(join(ROOT, 'src/server/app.ts'), 'utf8')

  const table = source.slice(source.indexOf('const REFUND_FAILURES'), source.indexOf('function respondRefundFailure'))
  assert.ok(table.length > 0, 'REFUND_FAILURES 표를 찾지 못했다')

  for (const [code, status] of [
    ['REFUND_SELF_APPROVAL_FORBIDDEN', 403],
    ['REFUND_REVISION_CONFLICT', 409],
    ['REFUND_NOT_REQUESTED', 409],
    ['REFUND_NOT_FOUND', 404],
    ['REFUND_AMOUNT_EXCEEDS_REMAINING', 409],
    ['REFUND_STORE_UNAVAILABLE', 503],
  ] as Array<[string, number]>) {
    const entry = new RegExp(`${code}: \\{ status: ${status}, error: '([^']{10,})' \\}`)
    assert.match(table, entry, `${code} 에 고유한 ${status} 응답 문장이 있어야 한다`)
  }

  // 같은 문장을 여러 사유가 나눠 쓰면 화면에서 구분되지 않는다. 멱등 키 충돌 한 쌍만 예외다.
  const sentences = Array.from(table.matchAll(/error: '([^']+)'/g)).map((match) => match[1])
  const duplicated = sentences.filter((sentence, index) => sentences.indexOf(sentence) !== index)
  assert.deepEqual(
    Array.from(new Set(duplicated)).filter((sentence) => !sentence.includes('멱등 키')),
    [],
    '서로 다른 실패가 같은 문장을 쓰고 있다. 운영자가 원인을 구분할 수 없다.',
  )

  // 문자열 포함 검사로 상태 코드를 고르던 옛 방식이 남아 있으면 안 된다.
  assert.ok(!source.includes("code.includes('SELF')"), '문자열 포함 검사로 상태 코드를 고르면 안 된다')
  assert.ok(!source.includes("code.includes('EXCEEDS')"), '문자열 포함 검사로 상태 코드를 고르면 안 된다')
})

test('6. PostgREST 오류 본문이 그대로 새어 나가지 않는다', () => {
  const store = readFileSync(join(ROOT, 'src/payment/refund-store.ts'), 'utf8')
  assert.ok(
    !/throw new Error\(await response\.text\(\)/.test(store),
    '오류 응답 본문을 그대로 Error 로 던지면 DB 함수 이름·hint 가 관리자 브라우저까지 흘러간다.',
  )
  assert.match(store, /function refundFailure\(/, '오류 본문에서 우리가 정의한 코드만 꺼내는 경로가 있어야 한다')
  assert.match(store, /\/\^REFUND_\[A-Z_\]\+\$\//, '허용하는 코드 형태를 고정해야 한다')
})

test('7. 결제 권한 조회가 지난 ID 마다 따로 묻지 않는다', () => {
  const source = readFileSync(join(ROOT, 'src/server/app.ts'), 'utf8')
  const fn = source.slice(source.indexOf('async function findUnlockingOrder'), source.indexOf('interface PaidAccess'))
  assert.ok(fn.length > 0, 'findUnlockingOrder 를 찾지 못했다')

  // 주문 조회는 두 번(정확히 묶인 것 + 전체)이면 충분하다. 지난 ID 수만큼 늘면
  // 열람 한 번에 왕복이 그만큼 붙는다.
  const orderQueries = fn.match(/listPaymentOrders\(/g) ?? []
  assert.equal(orderQueries.length, 2, `주문 조회가 ${orderQueries.length}회다. 목록을 한 번 받아 메모리에서 골라야 한다.`)
  assert.ok(!/for\s*\([^)]*\)\s*\{[^}]*listPaymentOrders\(/.test(fn), '반복문 안에서 주문을 조회하면 안 된다')

  // 리포트 목록 조회는 후보 주문이 실제로 있을 때만. 결제한 적 없는 사용자의
  // 무료 티저 경로에 왕복을 더하면 안 된다.
  const lineageAt = fn.indexOf('reportIdsInLineage(')
  const guardAt = fn.indexOf('boundElsewhere')
  assert.ok(guardAt !== -1, '리포트 목록 조회 앞에 후보 주문 가드가 있어야 한다')
  assert.ok(guardAt < lineageAt, '가드가 조회보다 먼저여야 한다')

  // 느슨한 폴백(주문에 리포트 ID 가 없던 시절 아무 주문이나 집어오던 경로)은 task-022 에서
  // 제거했다. 그 폴백은 cmdg 주문 1건으로 이후 모든 풀이를 무한 개방했다. 순서를 확인하는
  // 대신 폴백 자체가 돌아오지 않는지 본다.
  assert.ok(!fn.includes('unlocking[0]'), '느슨한 미결속 주문 폴백이 돌아왔다 (task-022 회귀)')
})
