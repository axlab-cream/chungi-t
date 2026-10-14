/**
 * 운영 관리자 대시보드(2026-10 개편 6단계, docs/admin-ia.md §5-3 `GET /dashboard`).
 *
 * 오늘 지표는 "오늘 0시(KST)부터 지금까지"를 "어제 0시부터 어제 이 시각까지"와 비교한다 — 하루가 다 지나지 않은
 * 오늘을 어제 하루 전체와 비교하면 오전 내내 떨어진 것처럼 보이기 때문이다.
 * 처리 필요는 운영자가 지금 손대야 하는 것만 센다. 숫자마다 처리 화면 링크를 같이 준다.
 * 저장소마다 따로 받아서, 한 곳이 실패해도 나머지는 보여 주고 실패한 이름만 errors 에 싣는다.
 */
import type { PaymentOrder } from '../payment/order-store.js'
import type { RefundRequest } from '../payment/refund-store.js'
import type { SupportCase } from './support-store.js'
import type { PushNotificationRecord } from '../push/contracts.js'

export interface DashboardDeps {
  countMembersCreated(from: Date, to: Date): Promise<number>
  /** 2026-10-14 사주만 입력한 비회원(익명 계정). 없으면 비회원 칸을 싣지 않는다. */
  countGuestsCreated?(from: Date, to: Date): Promise<number>
  countReportsCreated(from: Date, to: Date): Promise<number>
  /** 결제 시각(createdAt)이 from 이후일 수 있는 주문. 갱신 시각 기준으로 넉넉히 가져와도 된다. */
  listOrdersSince(from: Date): Promise<PaymentOrder[]>
  /** 결제사 승인 기록은 있는데 정산이 안 끝난 주문 수. */
  countUnsettledOrders(): Promise<number>
  listRefunds(): Promise<RefundRequest[]>
  listSupportCases(): Promise<SupportCase[]>
  countFailedReports(): Promise<number>
  listRecentPushes(): Promise<PushNotificationRecord[]>
  /** 기간을 고른 경우: 비교 기간 시작~끝 사이에 만들어진 환불·문의. 없으면 위 최근 목록으로 센다. */
  listRefundsCreated?(): Promise<RefundRequest[]>
  listSupportCreated?(): Promise<SupportCase[]>
}

export type DashboardKpi = { key: string; label: string; today: number; yesterday: number; unit: '명' | '건' | '원'; href: string }
export type DashboardTodo = { key: string; label: string; count: number; hint: string; href: string; tone: 'error' | 'warn' | 'info' }
export type Dashboard = { kpis: DashboardKpi[]; todo: DashboardTodo[]; errors: string[]; windows: { todayFrom: string; now: string; yesterdayFrom: string; yesterdayTo: string; custom?: boolean } }

const DAY = 86_400_000
const KST = 9 * 3_600_000

export function kstDayStart(now: Date): Date {
  const shifted = now.getTime() + KST
  return new Date(shifted - (shifted % DAY) - KST)
}

const SETTLED = new Set(['paid', 'viewed'])
const OPEN_SUPPORT = new Set(['received', 'triaged', 'assigned', 'investigating', 'reopened'])

/**
 * range 를 주면(2026-10-14 날짜 검색) "고른 기간"과 "바로 앞 같은 길이 기간"을 비교한다.
 * 필드 이름(today/yesterday)은 화면 호환을 위해 그대로 두고, windows 에 실제 경계를 싣는다.
 */
export async function buildDashboard(deps: DashboardDeps, now = new Date(), range?: { from: string; to: string }): Promise<Dashboard> {
  const todayFrom = range ? new Date(range.from) : kstDayStart(now)
  const until = range ? new Date(range.to) : now
  const span = until.getTime() - todayFrom.getTime()
  const yesterdayFrom = range ? new Date(todayFrom.getTime() - span) : new Date(todayFrom.getTime() - DAY)
  const yesterdayTo = range ? todayFrom : new Date(now.getTime() - DAY)
  const errors: string[] = []
  async function part<T>(name: string, run: () => Promise<T>, fallback: T): Promise<T> {
    try { return await run() } catch { errors.push(name); return fallback }
  }
  const [membersToday, membersYesterday, reportsToday, reportsYesterday, orders, unsettled, refunds, support, failedReports, pushes] = await Promise.all([
    part('members', () => deps.countMembersCreated(todayFrom, until), -1),
    part('members', () => deps.countMembersCreated(yesterdayFrom, yesterdayTo), -1),
    part('reports', () => deps.countReportsCreated(todayFrom, until), -1),
    part('reports', () => deps.countReportsCreated(yesterdayFrom, yesterdayTo), -1),
    part('payments', () => deps.listOrdersSince(yesterdayFrom), null as PaymentOrder[] | null),
    part('payments', () => deps.countUnsettledOrders(), -1),
    part('refunds', () => deps.listRefunds(), null as RefundRequest[] | null),
    part('support', () => deps.listSupportCases(), null as SupportCase[] | null),
    part('reports', () => deps.countFailedReports(), -1),
    part('messages', () => deps.listRecentPushes(), null as PushNotificationRecord[] | null),
  ])
  const [guestsToday, guestsYesterday] = deps.countGuestsCreated
    ? await Promise.all([
      part('guests', () => deps.countGuestsCreated!(todayFrom, until), -1),
      part('guests', () => deps.countGuestsCreated!(yesterdayFrom, yesterdayTo), -1),
    ])
    : [null, null]
  const [refundsCreated, supportCreated] = await Promise.all([
    deps.listRefundsCreated ? part('refunds', () => deps.listRefundsCreated!(), null as RefundRequest[] | null) : Promise.resolve(refunds),
    deps.listSupportCreated ? part('support', () => deps.listSupportCreated!(), null as SupportCase[] | null) : Promise.resolve(support),
  ])
  const inWindow = (iso: string, from: Date, to: Date) => { const at = Date.parse(iso); return Number.isFinite(at) && at >= from.getTime() && at < to.getTime() }
  const paid = (from: Date, to: Date) => (orders ?? []).filter((order) => SETTLED.has(order.status) && inWindow(order.createdAt, from, to))
  const paidToday = paid(todayFrom, until)
  const paidYesterday = paid(yesterdayFrom, yesterdayTo)
  const sum = (list: PaymentOrder[]) => list.reduce((total, order) => total + order.amount, 0)
  const payers = (list: PaymentOrder[]) => new Set(list.map((order) => order.ownerId)).size
  const count = <T>(list: T[] | null, pick: (item: T) => string, from: Date, to: Date) => list ? list.filter((item) => inWindow(pick(item), from, to)).length : -1

  const kpis: DashboardKpi[] = [
    { key: 'members', label: '신규 회원', today: membersToday, yesterday: membersYesterday, unit: '명', href: '/members?kind=member' },
    ...(guestsToday === null ? [] : [{ key: 'guests', label: '신규 비회원', today: guestsToday, yesterday: guestsYesterday as number, unit: '명' as const, href: '/members?kind=guest' }]),
    { key: 'payers', label: '결제 회원', today: orders ? payers(paidToday) : -1, yesterday: orders ? payers(paidYesterday) : -1, unit: '명', href: '/payments' },
    { key: 'revenue', label: '결제액', today: orders ? sum(paidToday) : -1, yesterday: orders ? sum(paidYesterday) : -1, unit: '원', href: '/payments/revenue' },
    { key: 'reports', label: '리포트 생성', today: reportsToday, yesterday: reportsYesterday, unit: '건', href: '/reports' },
    { key: 'refunds', label: '환불 요청', today: count(refundsCreated, (item) => item.createdAt, todayFrom, until), yesterday: count(refundsCreated, (item) => item.createdAt, yesterdayFrom, yesterdayTo), unit: '건', href: '/payments/refunds' },
    { key: 'support', label: '문의', today: count(supportCreated, (item) => item.createdAt, todayFrom, until), yesterday: count(supportCreated, (item) => item.createdAt, yesterdayFrom, yesterdayTo), unit: '건', href: '/support' },
  ]

  const openSupport = (support ?? []).filter((item) => OPEN_SUPPORT.has(item.status))
  const urgentSupport = openSupport.filter((item) => item.priority === 'urgent' || item.priority === 'high').length
  const failedPushes = (pushes ?? []).filter((item) => inWindow(item.createdAt, new Date(now.getTime() - 7 * DAY), now) && (item.status === 'failed' || (item.status === 'sent' && item.failureCount > 0 && item.failureCount >= item.successCount)))
  const todo: DashboardTodo[] = [
    { key: 'refund-approval', label: '환불 승인 대기', count: refunds ? refunds.filter((item) => item.state === 'requested').length : -1, hint: '요청한 사람이 아닌 다른 관리자가 승인해야 합니다.', href: '/payments/refunds?state=requested', tone: 'warn' },
    { key: 'refund-check', label: '결제사 확인이 필요한 환불', count: refunds ? refunds.filter((item) => item.state === 'unknown' || item.state === 'failed').length : -1, hint: '결제사 환불 결과가 실패이거나 확인되지 않았습니다.', href: '/payments/refunds?state=failed', tone: 'error' },
    { key: 'unsettled', label: '정산 확인 필요 결제', count: unsettled, hint: '결제사 승인은 됐는데 우리 쪽 기록이 끝나지 않았습니다.', href: '/payments', tone: 'error' },
    { key: 'failed-reports', label: '멈춘 리포트', count: failedReports, hint: '실패한 항목이 있는 리포트입니다. 상세에서 다시 생성할 수 있습니다.', href: '/reports?status=failed', tone: 'error' },
    { key: 'support-open', label: '답변 안 한 문의', count: support ? openSupport.length : -1, hint: urgentSupport ? `그중 급함·높음 ${urgentSupport}건` : '해결·종료 전 문의입니다.', href: '/support', tone: urgentSupport ? 'error' : 'info' },
    { key: 'push-failed', label: '실패한 메시지(7일)', count: pushes ? failedPushes.length : -1, hint: '전부 실패했거나 절반 넘게 실패한 발송입니다.', href: '/messages', tone: 'warn' },
  ]
  return { kpis, todo, errors: [...new Set(errors)], windows: { todayFrom: todayFrom.toISOString(), now: until.toISOString(), yesterdayFrom: yesterdayFrom.toISOString(), yesterdayTo: yesterdayTo.toISOString(), ...(range ? { custom: true } : {}) } }
}
