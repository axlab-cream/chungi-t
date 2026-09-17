import type { PaymentOrder } from '../payment/order-store.js'
import { reportBirthKey, reportLineageId, reportProgressOf, type ReportRecord } from './report-store.js'

/**
 * 보관함 목록을 고르고 정렬한다.
 *
 * 두 가지가 틀려 있었다.
 *
 * 1. **무엇을 남기나** — 저장된 해석을 전부 내려주고 있었다. 무료 티저만 본 기록까지
 *    남으니 같은 서비스·같은 생년월일 행이 수십 개 쌓여 구매한 해석을 찾을 수 없다.
 *    화면 문구도 "구매해서 열어 본 풀이"다. 결제 주문이 붙은 것만 남긴다.
 * 2. **무슨 순서로** — `updated_at` 내림차순이었다. 그건 마지막으로 **건드린** 순서다.
 *    섹션이 나중에 채워지거나 실패 섹션을 재시도하면 오래된 구매가 위로 떠오른다.
 *    주문이 만들어진 시각, 즉 구매 시각으로 정렬한다.
 *
 * 순수 함수로 둔 것은 이 판단을 테스트에서 직접 고정하기 위해서다. 라우트 안에 두면
 * 정렬이 뒤집혀도 통합 경로를 다 태우기 전에는 드러나지 않는다.
 */

export interface VaultListing<T> {
  record: T
  /** 이 해석을 연 결제의 시각. 같은 계보에 결제가 여러 건이면 가장 이른 것. */
  purchasedAt: string
}

/** 저장된 상담 기록은 같은 표를 쓰지만 해석이 아니다. 보관함에 섞이면 안 된다. */
function isReading(record: ReportRecord): boolean {
  return !(record.context as { savedChat?: unknown } | undefined)?.savedChat
}

function serviceKeyOf(record: ReportRecord): string {
  return String(record.context?.serviceKey || 'cmdg')
}

/**
 * 결제 주문을 **계보** 단위로 모은다.
 *
 * 코퍼스 세대를 올리면 같은 사람·같은 조건이라도 리포트 ID 가 새로 생긴다(T-4). 주문은
 * 예전 ID 에 묶여 있으므로 ID 로만 맞추면 방금 갱신된 해석이 "결제 안 한 것"이 된다.
 * 계보로 묶으면 그 승계가 목록에도 그대로 이어진다.
 */
function purchaseTimeByLineage(records: ReportRecord[], orders: PaymentOrder[]): Map<string, string> {
  const lineageOf = new Map<string, string>()
  for (const record of records) lineageOf.set(record.reportId, reportLineageId(record))

  const earliest = new Map<string, string>()
  for (const order of orders) {
    // Opening the reading marks the order `viewed`. That is still a settled
    // purchase — the same statuses that unlock the report and enqueue generation.
    if (order.status !== 'paid' && order.status !== 'viewed') continue
    const lineage = order.reportId ? lineageOf.get(order.reportId) : undefined
    // 리포트에 묶이지 않은 주문은 무엇을 열어 주는지 알 수 없다. 추측하지 않는다.
    if (!lineage) continue
    const at = order.createdAt || order.updatedAt
    if (!at) continue
    const known = earliest.get(lineage)
    if (!known || at < known) earliest.set(lineage, at)
  }
  return earliest
}

/**
 * 같은 사주·같은 서비스는 한 줄만 남긴다.
 *
 * 저장소에는 같은 사람의 같은 서비스가 여러 행으로 쌓인다 — 코퍼스 세대가 바뀌어 ID 가
 * 새로 생겼거나, 고민 문구를 바꿔 다시 열었거나, 관리자 QA 로 여러 번 돌렸거나. 화면에는
 * "같은 사주는 한 건"이어야 한다(운영 보관함에 천명사주 8줄·오늘운 8줄이 같은 제목으로
 * 늘어서 있었다, 2026-09-18). 오늘운은 날짜(`context.concern`)가 다르면 다른 풀이다.
 *
 * 남기는 순서: 완성된 것 > 더 최근 구매 > 리포트 ID. 최신이 0/37 실패 stub 이고 옛것이
 * 37/37 완성이면 완성을 보여야 한다 — 사용자가 산 것은 그 내용이다.
 */
function dedupeSameReading(listings: VaultListing<ReportRecord>[]): VaultListing<ReportRecord>[] {
  const keyOf = (record: ReportRecord) => {
    const service = serviceKeyOf(record)
    const date = service === 'today' ? String(record.context?.concern ?? '') : ''
    return `${service}|${reportBirthKey(record)}|${date}`
  }
  const isComplete = (record: ReportRecord) => reportProgressOf(record).status === 'complete'
  const better = (a: VaultListing<ReportRecord>, b: VaultListing<ReportRecord>) => {
    const completeGap = Number(isComplete(a.record)) - Number(isComplete(b.record))
    if (completeGap !== 0) return completeGap > 0
    return a.purchasedAt.localeCompare(b.purchasedAt) > 0
      || (a.purchasedAt === b.purchasedAt && a.record.reportId.localeCompare(b.record.reportId) > 0)
  }
  const kept = new Map<string, VaultListing<ReportRecord>>()
  for (const listing of listings) {
    const key = keyOf(listing.record)
    const current = kept.get(key)
    if (!current || better(listing, current)) kept.set(key, listing)
  }
  return listings.filter((listing) => kept.get(keyOf(listing.record)) === listing)
}

/** 구매한 해석만, 구매 시각 내림차순으로. 같은 시각이면 리포트 ID 로 순서를 고정한다. */
export function selectPurchasedReadings(
  records: ReportRecord[],
  orders: PaymentOrder[],
): VaultListing<ReportRecord>[] {
  const readings = records.filter(isReading)
  const purchasedAt = purchaseTimeByLineage(readings, orders)

  return dedupeSameReading(readings
    .flatMap((record) => {
      const at = purchasedAt.get(reportLineageId(record))
      return at ? [{ record, purchasedAt: at }] : []
    })
    .sort((a, b) => (
      b.purchasedAt.localeCompare(a.purchasedAt)
      || b.record.reportId.localeCompare(a.record.reportId)
    )))
}

/**
 * Super-admin vault rows without a paid order. Preview-only teasers stay out;
 * once the paid reading is opened (stamp) or generation starts, each lineage
 * stacks like a post-payment purchase. Fake payment orders are not created.
 */
export function isAdminVaultEligible(record: ReportRecord): boolean {
  if (!isReading(record)) return false
  if (record.adminAcquiredAt) return true
  if (record.status === 'generating' || record.status === 'complete' || record.status === 'failed') return true
  return (record.report?.sections ?? []).some((section) => (
    section.status === 'generating' || section.status === 'complete' || section.status === 'failed'
  ))
}

export function selectAdminVaultReadings(
  records: ReportRecord[],
  orders: PaymentOrder[],
): VaultListing<ReportRecord>[] {
  const purchased = selectPurchasedReadings(records, orders)
  const taken = new Set(purchased.map((item) => item.record.reportId))
  const extras = records.flatMap((record) => {
    if (taken.has(record.reportId) || !isAdminVaultEligible(record)) return []
    return [{ record, purchasedAt: record.adminAcquiredAt || record.createdAt }]
  })
  // 관리자 QA 는 같은 사주를 여러 번 돌린다. 여기서도 같은 사주·같은 서비스는 한 줄이다.
  return dedupeSameReading([...purchased, ...extras].sort((a, b) => (
    b.purchasedAt.localeCompare(a.purchasedAt)
    || b.record.reportId.localeCompare(a.record.reportId)
  )))
}
