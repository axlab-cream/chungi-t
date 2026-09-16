import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

// The order store refuses to write to the in-memory store when the process looks like
// production, and the repo's env files set VERCEL_ENV=production. Clear that before the store
// is imported, the same way `web-payment-qa-gates.test.ts` does. Each test file runs in its own
// process, so this does not leak into other suites.
const previousEnv = { ...process.env }
process.env.NODE_ENV = 'test'
for (const name of Object.keys(process.env)) {
  if (/DATABASE|SUPABASE|VERCEL|PAYMENT|REPORT_STORAGE/.test(name)) delete process.env[name]
}

const { getPaymentOrder, getPaymentStorageMode, savePaymentOrder } = await import('../../src/payment/order-store.js')
const { claimUnboundOrder, settleOrderAccess } = await import('../../src/payment/entitlement.js')
type PaymentOrder = Awaited<ReturnType<typeof savePaymentOrder>>

const OWNER = { id: 'owner-1', email: 'buyer@example.com' }
const PRODUCT = 'cmdg'
const BEFORE_CUTOFF = '2026-09-01T00:00:00Z'
const AFTER_CUTOFF = '2026-09-16T00:00:00Z'

let seq = 0

/** 결제는 끝났지만 어떤 풀이에도 연결되지 않은 주문. reportId 없이 /payment 로 들어온 경우다. */
async function seedUnbound(createdAt = AFTER_CUTOFF): Promise<PaymentOrder> {
  seq += 1
  assert.equal(getPaymentStorageMode(), 'memory', '이 스위트는 메모리 저장소에서만 의미가 있다')
  return savePaymentOrder({
    orderId: `claim-${seq}`,
    ownerId: OWNER.id,
    buyerEmail: 'buyer@example.com',
    buyerTel: '01000000000',
    productKey: PRODUCT,
    productTitle: '천명사주',
    amount: 49900,
    status: 'paid',
    createdAt,
    updatedAt: createdAt,
  })
}

describe('결제 자격 판정 — 미결속 주문 claim', { concurrency: false }, () => {
  it('미결속 주문은 처음 여는 풀이에 결속되고, 두 번째 풀이는 열지 못한다', async () => {
    const seeded = await seedUnbound()
    const first = await settleOrderAccess(seeded, OWNER, PRODUCT, 'report-a')
    assert.ok(first, '방금 결제한 사람은 이 풀이를 열어야 한다')
    assert.equal(first?.reportId, 'report-a', '주문이 그 풀이에 결속되어야 한다')

    const stored = await getPaymentOrder(seeded.orderId)
    assert.equal(stored?.reportId, 'report-a')
    assert.equal(await settleOrderAccess(stored!, OWNER, PRODUCT, 'report-b'), null, '같은 주문으로 다른 풀이를 열 수 없다')
  })

  it('주문 ID 를 직접 대도 다른 풀이로 재사용되지 않는다', async () => {
    const seeded = await seedUnbound()
    assert.ok(await settleOrderAccess(seeded, OWNER, PRODUCT, 'report-a'))
    const replayed = await getPaymentOrder(seeded.orderId)
    assert.equal(await settleOrderAccess(replayed!, OWNER, PRODUCT, 'report-c'), null)
  })

  it('서로 다른 풀이를 동시에 열면 한쪽만 통과한다', async () => {
    const seeded = await seedUnbound()
    const settled = await Promise.all([
      settleOrderAccess(seeded, OWNER, PRODUCT, 'race-a'),
      settleOrderAccess(seeded, OWNER, PRODUCT, 'race-b'),
    ])
    const granted = settled.filter(Boolean)
    assert.equal(granted.length, 1, `동시 요청 중 하나만 통과해야 한다 (통과 ${granted.length})`)
    const stored = await getPaymentOrder(seeded.orderId)
    assert.equal(stored?.reportId, granted[0]?.reportId, '저장된 결속이 통과한 쪽과 같아야 한다')
  })

  it('claim 할 풀이가 없으면 통과시키지 않는다', async () => {
    const seeded = await seedUnbound()
    assert.equal(await claimUnboundOrder(seeded, ''), null)
    const stored = await getPaymentOrder(seeded.orderId)
    assert.equal(stored?.reportId, undefined, '실패한 claim 이 주문을 바꾸지 않는다')
  })

  it('컷오프 이전 레거시 주문은 claim 없이 통과하고 결속되지 않는다', async () => {
    const seeded = await seedUnbound(BEFORE_CUTOFF)
    assert.ok(await settleOrderAccess(seeded, OWNER, PRODUCT, 'report-old', BEFORE_CUTOFF), '레거시 구매자는 그대로 열려야 한다')
    const stored = await getPaymentOrder(seeded.orderId)
    assert.equal(stored?.reportId, undefined, '레거시 주문은 결속하지 않는다')
  })

  it('다른 계정은 남의 미결속 주문으로 열 수 없다', async () => {
    const seeded = await seedUnbound()
    assert.equal(await settleOrderAccess(seeded, { id: 'owner-2' }, PRODUCT, 'report-a'), null)
    const stored = await getPaymentOrder(seeded.orderId)
    assert.equal(stored?.reportId, undefined, '거부된 요청이 주문을 결속하지 않는다')
  })
})

process.on('exit', () => {
  for (const name of Object.keys(process.env)) if (!(name in previousEnv)) delete process.env[name]
  Object.assign(process.env, previousEnv)
})
