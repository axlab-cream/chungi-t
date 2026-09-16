/**
 * Who may open a paid reading.
 *
 * These rules decide money, so they live apart from the server routes and are covered by
 * `tests/unit/paid-entitlement.test.ts`. Two of them exist because of real incidents:
 * an unbound legacy order used to open every later reading of the same product, and staff
 * comp access made the live checkout impossible to exercise in production QA.
 */

import { mutatePaymentOrder, type PaymentOrder } from './order-store.js'

export interface EntitlementOwner {
  id: string
  email?: string | null
}

/** Orders settled before checkout bound an order to one reading (binding deploy 2026-09-03). */
export const DEFAULT_LEGACY_ORDER_CUTOFF = '2026-09-04T00:00:00+09:00'

export function legacyOrderCutoffMs(cutoff = process.env.UMSH_LEGACY_ORDER_CUTOFF): number {
  const parsed = Date.parse(String(cutoff ?? ''))
  return Number.isNaN(parsed) ? Date.parse(DEFAULT_LEGACY_ORDER_CUTOFF) : parsed
}

export function isSettledOrder(order: PaymentOrder, owner: EntitlementOwner, productKey: string): boolean {
  if (order.ownerId !== owner.id || order.productKey !== productKey) return false
  return order.status === 'paid' || order.status === 'viewed'
}

/** A settled order bound to a reading opens that reading and nothing else. */
export function orderBinds(
  order: PaymentOrder,
  owner: EntitlementOwner,
  productKey: string,
  reportId: string,
): boolean {
  if (!isSettledOrder(order, owner, productKey)) return false
  if (!order.reportId) return false
  return !reportId || order.reportId === reportId
}

/**
 * Legacy orders carry no report id. Honouring them for every later reading turned one
 * purchase into unlimited readings of the same product, so they now only open readings that
 * already existed when binding landed — past buyers keep exactly what they bought.
 */
export function legacyOrderCovers(order: PaymentOrder, reportCreatedAt?: string): boolean {
  const cutoff = legacyOrderCutoffMs()
  const orderedAt = Date.parse(order.createdAt ?? '')
  if (Number.isNaN(orderedAt) || orderedAt >= cutoff) return false
  const createdAt = Date.parse(reportCreatedAt ?? '')
  if (Number.isNaN(createdAt)) return false
  return createdAt < cutoff
}

/**
 * An order settled after the cutoff but never bound to a reading — checkout entered from a
 * page that had no reading yet. It opens the first reading it is used for and is bound to it
 * from then on (see `claimUnboundOrder`), so it can never open a second one. Denying these
 * outright would lock out someone who just paid.
 */
export function unboundOrderIsClaimable(order: PaymentOrder, reportId: string): boolean {
  if (order.reportId || !reportId) return false
  const orderedAt = Date.parse(order.createdAt ?? '')
  return !Number.isNaN(orderedAt) && orderedAt >= legacyOrderCutoffMs()
}

/**
 * A settled order unlocks a report when it belongs to the caller, was bought for the same
 * product, and is bound to that report — or is an unbound order that either predates the
 * binding cutoff (legacy) or is claimable by this reading.
 */
export function orderUnlocks(
  order: PaymentOrder,
  owner: EntitlementOwner,
  productKey: string,
  reportId: string,
  reportCreatedAt?: string,
): boolean {
  if (!isSettledOrder(order, owner, productKey)) return false
  if (order.reportId) return !reportId || order.reportId === reportId
  return legacyOrderCovers(order, reportCreatedAt) || unboundOrderIsClaimable(order, reportId)
}

class OrderBoundElsewhereError extends Error {
  constructor(orderId: string) {
    super(`주문 ${orderId} 는 이미 다른 풀이에 연결되어 있습니다.`)
    this.name = 'OrderBoundElsewhereError'
  }
}

/**
 * Binds an unbound order to the reading it just opened, so one purchase cannot open a second.
 *
 * The check runs inside the store's compare-and-set loop, so a concurrent open of a different
 * reading is seen on retry and refused here rather than granted twice. A claim that cannot be
 * written refuses this open: handing out a reading while the order stays reusable is how one
 * payment becomes unlimited readings, and the reader can retry once the store recovers.
 */
export async function claimUnboundOrder(order: PaymentOrder, reportId: string): Promise<PaymentOrder | null> {
  if (!reportId) return null
  try {
    return await mutatePaymentOrder(order.orderId, (current) => {
      if (current.reportId && current.reportId !== reportId) throw new OrderBoundElsewhereError(current.orderId)
      return { reportId }
    })
  } catch (error) {
    if (!(error instanceof OrderBoundElsewhereError)) {
      console.warn(`[payment] order ${order.orderId} claim failed; refusing this reading`, error)
    }
    return null
  }
}

/**
 * The order that entitles this owner to this reading, or null. An unbound order settled after the
 * binding cutoff only entitles once it has actually been bound here — every entitlement path goes
 * through this function so an explicit order id cannot skip the binding.
 */
export async function settleOrderAccess(
  order: PaymentOrder,
  owner: EntitlementOwner,
  productKey: string,
  reportId: string,
  reportCreatedAt?: string,
): Promise<PaymentOrder | null> {
  if (!orderUnlocks(order, owner, productKey, reportId, reportCreatedAt)) return null
  if (!order.reportId && unboundOrderIsClaimable(order, reportId)) return await claimUnboundOrder(order, reportId)
  return order
}

/**
 * Staff comp access makes the live checkout unreachable in production QA, so an explicit flag
 * drops it for the request. The flag only ever REMOVES the admin unlock — it can never grant
 * entitlement — so a non-admin sending it gains nothing.
 */
export function checkoutQaRequested(source: { query?: unknown; body?: unknown }): boolean {
  return readQaFlag(source.query) || readQaFlag(source.body)
}

function readQaFlag(bag: unknown): boolean {
  if (!bag || typeof bag !== 'object') return false
  const value = (bag as Record<string, unknown>).qa
  return typeof value === 'string' && value.trim() === 'pay'
}
