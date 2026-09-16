import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import type { PaymentOrder, PaymentOrderStatus } from '../../src/payment/order-store.js'
import {
  checkoutQaRequested,
  legacyOrderCovers,
  orderBinds,
  orderUnlocks,
  unboundOrderIsClaimable,
} from '../../src/payment/entitlement.js'

const OWNER = { id: 'owner-1', email: 'buyer@example.com' }
const OTHER_OWNER = { id: 'owner-2', email: 'someone-else@example.com' }
const PRODUCT = 'cmdg'

/** 결제 게이트가 판정에 쓰는 필드만 채운 주문. 나머지는 판정에 관여하지 않는다. */
function order(overrides: Partial<PaymentOrder> = {}): PaymentOrder {
  return {
    orderId: 'ORD-1',
    ownerId: OWNER.id,
    buyerEmail: 'buyer@example.com',
    buyerTel: '01000000000',
    productKey: PRODUCT,
    productTitle: '천명사주',
    amount: 49900,
    status: 'paid' as PaymentOrderStatus,
    createdAt: '2026-09-10T00:00:00Z',
    updatedAt: '2026-09-10T00:00:00Z',
    ...overrides,
  }
}

const BEFORE_CUTOFF = '2026-09-01T00:00:00Z'
const AFTER_CUTOFF = '2026-09-16T00:00:00Z'

describe('결제 자격 판정 — 주문과 리포트 결속', { concurrency: false }, () => {
  it('리포트에 결속된 주문은 그 리포트를 연다', () => {
    const bound = order({ reportId: 'report-a' })
    assert.equal(orderBinds(bound, OWNER, PRODUCT, { reportId: 'report-a' }), true)
    assert.equal(orderUnlocks(bound, OWNER, PRODUCT, { reportId: 'report-a' }), true)
  })

  it('결속된 주문은 다른 리포트를 열지 못한다', () => {
    const bound = order({ reportId: 'report-a' })
    assert.equal(orderBinds(bound, OWNER, PRODUCT, { reportId: 'report-b' }), false)
    assert.equal(orderUnlocks(bound, OWNER, PRODUCT, { reportId: 'report-b' }), false)
  })

  it('컷오프 이전 레거시 주문은 컷오프 이전 리포트를 계속 연다 (기존 유료 고객 보호)', () => {
    const legacy = order({ reportId: undefined, createdAt: BEFORE_CUTOFF })
    assert.equal(legacyOrderCovers(legacy, BEFORE_CUTOFF), true)
    assert.equal(orderUnlocks(legacy, OWNER, PRODUCT, { reportId: 'report-old', createdAt: BEFORE_CUTOFF }), true)
  })

  it('레거시 주문 1건이 이후 새 리포트를 열지 못한다 (무한 무료 누수 차단)', () => {
    const legacy = order({ reportId: undefined, createdAt: BEFORE_CUTOFF })
    assert.equal(legacyOrderCovers(legacy, AFTER_CUTOFF), false)
    assert.equal(orderUnlocks(legacy, OWNER, PRODUCT, { reportId: 'report-new', createdAt: AFTER_CUTOFF }), false)
  })

  it('리포트 생성 시각을 모르면 레거시 규칙으로는 열지 않는다', () => {
    const legacy = order({ reportId: undefined, createdAt: BEFORE_CUTOFF })
    assert.equal(legacyOrderCovers(legacy, undefined), false)
    assert.equal(legacyOrderCovers(legacy, 'not-a-date'), false)
  })

  it('컷오프 이후 미결속 주문은 레거시가 아니라 claim 대상이다 (방금 결제한 사람 보호)', () => {
    const late = order({ reportId: undefined, createdAt: AFTER_CUTOFF })
    assert.equal(legacyOrderCovers(late, BEFORE_CUTOFF), false)
    assert.equal(unboundOrderIsClaimable(late, 'report-new'), true)
    assert.equal(orderUnlocks(late, OWNER, PRODUCT, { reportId: 'report-new' }), true)
  })

  it('claim 은 결속할 리포트가 있어야 하고, 이미 결속된 주문은 다시 claim 하지 않는다', () => {
    const late = order({ reportId: undefined, createdAt: AFTER_CUTOFF })
    assert.equal(unboundOrderIsClaimable(late, ''), false)
    assert.equal(unboundOrderIsClaimable(order({ reportId: 'report-a' }), 'report-b'), false)
  })

  it('컷오프 이전 미결속 주문은 claim 대상이 아니다 (레거시 규칙만 적용)', () => {
    const legacy = order({ reportId: undefined, createdAt: BEFORE_CUTOFF })
    assert.equal(unboundOrderIsClaimable(legacy, 'report-new'), false)
    assert.equal(orderUnlocks(legacy, OWNER, PRODUCT, { reportId: 'report-new', createdAt: AFTER_CUTOFF }), false)
  })

  it('결제가 끝나지 않은 주문은 어떤 리포트도 열지 못한다', () => {
    for (const status of ['ready', 'pending', 'failed', 'cancelled'] as PaymentOrderStatus[]) {
      const pending = order({ reportId: 'report-a', status })
      assert.equal(orderUnlocks(pending, OWNER, PRODUCT, { reportId: 'report-a' }), false, `status=${status}`)
    }
    const viewed = order({ reportId: 'report-a', status: 'viewed' as PaymentOrderStatus })
    assert.equal(orderUnlocks(viewed, OWNER, PRODUCT, { reportId: 'report-a' }), true)
  })

  it('코퍼스 세대가 바뀌어 ID 가 달라져도 같은 계보의 결속 주문은 계속 연다', () => {
    const bound = order({ reportId: 'report-epoch1' })
    const reading = { reportId: 'report-epoch2', lineage: ['report-epoch1'] }
    assert.equal(orderBinds(bound, OWNER, PRODUCT, reading), true)
    assert.equal(orderUnlocks(bound, OWNER, PRODUCT, reading), true)
    assert.equal(orderBinds(bound, OWNER, PRODUCT, { reportId: 'report-epoch2', lineage: [] }), false)
  })

  it('다른 계정이나 다른 상품의 주문은 열지 못한다', () => {
    const bound = order({ reportId: 'report-a' })
    assert.equal(orderUnlocks(bound, OTHER_OWNER, PRODUCT, { reportId: 'report-a' }), false)
    assert.equal(orderUnlocks(bound, OWNER, 'love_this_year', { reportId: 'report-a' }), false)
  })
})

describe('결제 자격 판정 — 관리자 QA 플래그', { concurrency: false }, () => {
  it('qa=pay 는 쿼리와 바디 양쪽에서 인식된다', () => {
    assert.equal(checkoutQaRequested({ query: { qa: 'pay' } }), true)
    assert.equal(checkoutQaRequested({ body: { qa: 'pay' } }), true)
    assert.equal(checkoutQaRequested({ query: { qa: ' pay ' } }), true)
  })

  it('플래그가 없거나 값이 다르면 켜지지 않는다', () => {
    assert.equal(checkoutQaRequested({}), false)
    assert.equal(checkoutQaRequested({ query: {} }), false)
    assert.equal(checkoutQaRequested({ query: { qa: '1' } }), false)
    assert.equal(checkoutQaRequested({ query: { qa: true } }), false)
    assert.equal(checkoutQaRequested({ query: null, body: undefined }), false)
  })
})

describe('결제 자격 판정 — 서버 QA 배선 가드', { concurrency: false }, () => {
  // checkoutQaRequested() 자체는 위에서 검증된다. 여기서 막는 것은 서버 게이트에서 그 호출이
  // 빠지는 회귀다 — 빠지면 관리자는 QA 플래그와 무관하게 결제를 건너뛴다.
  const server = readFileSync(new URL('../../src/server/app.ts', import.meta.url), 'utf8')

  it('resolvePaidAccess 의 관리자 면제는 QA 플래그를 확인한다', () => {
    assert.match(server, /if \(isAdminOwner\(owner\) && !checkoutQaRequested\(req\)\) return \{ entitled: true, reason: 'admin' \}/)
  })

  it('ensurePaidServiceAccess 의 관리자 면제도 QA 플래그를 확인한다', () => {
    assert.match(server, /if \(isAdminOwner\(owner\) && !checkoutQaRequested\(req\)\) return true/)
  })

  it('미결속 주문을 아무거나 집어오는 폴백이 돌아오지 않는다', () => {
    assert.doesNotMatch(server, /\?\?\s*unlocking\[0\]/)
  })

  it('주문 자격은 settleOrderAccess 한 곳만 통과한다', () => {
    // 직접 orderBinds/legacyOrderCovers 로 주문을 통과시키면 결속(claim)을 건너뛸 수 있다.
    assert.doesNotMatch(server, /return unlocking\[0\]/)
    const grants = server.match(/reason: 'order'/g) ?? []
    assert.ok(grants.length >= 1, 'order 자격 경로가 있어야 한다')
    assert.match(server, /const settled = await settleOrderAccess\(/)
  })
})

describe('천명사주 결과 CTA — 결제 경로 회귀 가드', { concurrency: false }, () => {
  const source = readFileSync(new URL('../../사주/사주/index.html', import.meta.url), 'utf8')

  it('관리자 무료 열람 지름길이 QA 모드에서 꺼진다', () => {
    assert.match(source, /const qaMode = isCheckoutQaMode\(\);\s*\n\s*if \(isAdminAccount && !qaMode\) return true;/)
  })

  it('미결제 리포트의 상담 CTA 는 결제 화면으로 간다', () => {
    assert.match(source, /if \(action === "open-chat"\)[\s\S]{0,800}go\("purchase"\);/)
  })

  it('결제 화면의 결제하기 버튼은 실제 체크아웃을 연다', () => {
    assert.match(source, /if \(action === "pay-demo"\)[\s\S]{0,200}startCheckout\(\);/)
    assert.match(source, /location\.assign\(`\/payment\?\$\{params\.toString\(\)\}`\)/)
  })

  it('QA 모드에서는 리포트 조회와 분석 요청이 플래그를 함께 보낸다', () => {
    assert.match(source, /\/api\/report\/\$\{encodeURIComponent\(trimmed\)\}\$\{isCheckoutQaMode\(\) \? "\?qa=pay" : ""\}/)
    assert.match(source, /isCheckoutQaMode\(\) \? \{ qa: "pay" \} : \{\}/)
  })

  it('QA 모드는 관리자 무료 해제와 로컬 결제 마커를 결제 상태로 인정하지 않는다', () => {
    assert.match(source, /if \(qaMode && report\.unlockReason === "admin"\) return false;/)
    assert.match(source, /const paidIds = qaMode \? \[\] : readPaidReportIds\(\);/)
  })

  it('QA 모드는 캐시된 풀이를 쓰지 않고 서버에 다시 묻는다', () => {
    assert.match(source, /options\.refresh \|\| isCheckoutQaMode\(\)\s*\n\s*\? null/)
  })

  it('로컬 결제 마커는 서버가 주문을 확인한 뒤에만 기록된다', () => {
    assert.match(source, /if \(confirmed\?\.ok\)[\s\S]{0,200}rememberPaidReport\(/)
    assert.doesNotMatch(source, /isPaidReturn && initialReportId\) rememberPaidReport/)
  })

  it('후속 유료 게이트 요청(section·prewarm·chat)도 QA 플래그를 함께 보낸다', () => {
    const qaBodyFlags = source.match(/isCheckoutQaMode\(\) \? \{ qa: "pay" \} : \{\}/g) ?? []
    assert.ok(qaBodyFlags.length >= 3, `expected analyze·section·prewarm, got ${qaBodyFlags.length}`)
    const chat = readFileSync(new URL('../../사주/js/chat.js', import.meta.url), 'utf8')
    // /api/chat plus both paid-gated /api/report/section calls (chat body and PDF preparation).
    const chatFlags = chat.match(/checkoutQaMode\(\) \? \{ qa: 'pay' \} : \{\}/g) ?? []
    assert.equal(chatFlags.length, 3, `chat.js 의 유료 게이트 호출 3곳 모두 필요, 현재 ${chatFlags.length}`)
    const sectionCalls = chat.match(/fetch\('\/api\/report\/section'/g) ?? []
    assert.equal(sectionCalls.length, 2, 'chat.js section 호출 수가 바뀌면 이 가드를 갱신할 것')
    assert.match(source, /chatParams\.set\("qa", "pay"\)/)
  })
})
