import assert from 'node:assert/strict'
import test from 'node:test'
import { buildDashboard, kstDayStart, type DashboardDeps } from '../../src/admin/dashboard.js'

// 2026-10-06 15:00 KST(= 06:00Z). 오늘 창은 10-06 00:00 KST(=10-05 15:00Z)부터, 어제 창은 10-05 00:00 KST 부터 10-05 15:00 KST 까지.
const NOW = new Date('2026-10-06T06:00:00.000Z')
const order = (overrides: Record<string, unknown>) => ({ orderId: 'o', ownerId: 'u1', productKey: 'p', productTitle: 'P', amount: 10000, status: 'paid', createdAt: '2026-10-06T01:00:00.000Z', updatedAt: '2026-10-06T01:00:00.000Z', ...overrides }) as never

function deps(overrides: Partial<DashboardDeps> = {}): DashboardDeps {
  return {
    countMembersCreated: async (from) => from.toISOString() === '2026-10-05T15:00:00.000Z' ? 7 : 4,
    countReportsCreated: async () => 3,
    listOrdersSince: async () => [
      order({ orderId: 'a', ownerId: 'u1', amount: 10000 }),
      order({ orderId: 'b', ownerId: 'u1', amount: 5000 }),
      order({ orderId: 'c', ownerId: 'u2', amount: 7000, status: 'ready' }),
      // 어제 오후 4시 KST — 어제 "이 시각(오후 3시)" 이후라 비교에서 빠진다
      order({ orderId: 'd', ownerId: 'u3', amount: 9000, createdAt: '2026-10-05T07:00:00.000Z' }),
      // 어제 오전 9시 KST — 비교 창 안
      order({ orderId: 'e', ownerId: 'u4', amount: 20000, status: 'viewed', createdAt: '2026-10-05T00:00:00.000Z' }),
    ],
    countUnsettledOrders: async () => 1,
    listRefunds: async () => [
      { id: 'r1', state: 'requested', createdAt: '2026-10-06T02:00:00.000Z' },
      { id: 'r2', state: 'unknown', createdAt: '2026-10-01T02:00:00.000Z' },
    ] as never,
    listSupportCases: async () => [
      { id: 's1', status: 'received', priority: 'urgent', createdAt: '2026-10-06T03:00:00.000Z' },
      { id: 's2', status: 'resolved', priority: 'normal', createdAt: '2026-10-06T03:00:00.000Z' },
    ] as never,
    countFailedReports: async () => 2,
    listRecentPushes: async () => [
      { id: 'p1', status: 'failed', failureCount: 10, successCount: 0, createdAt: '2026-10-05T00:00:00.000Z' },
      { id: 'p2', status: 'sent', failureCount: 1, successCount: 50, createdAt: '2026-10-05T00:00:00.000Z' },
    ] as never,
    ...overrides,
  }
}

test('KST 자정은 UTC 전날 15시다', () => {
  assert.equal(kstDayStart(NOW).toISOString(), '2026-10-05T15:00:00.000Z')
  assert.equal(kstDayStart(new Date('2026-10-05T14:59:59.000Z')).toISOString(), '2026-10-04T15:00:00.000Z')
})

test('오늘 지표는 어제 같은 시각까지와 비교하고, 결제는 완료된 것만 센다', async () => {
  const board = await buildDashboard(deps(), NOW)
  const kpi = Object.fromEntries(board.kpis.map((item) => [item.key, item]))
  assert.deepEqual([kpi.revenue.today, kpi.revenue.yesterday], [15000, 20000])
  assert.deepEqual([kpi.payers.today, kpi.payers.yesterday], [1, 1])
  assert.deepEqual([kpi.members.today, kpi.members.yesterday], [7, 4])
  assert.deepEqual([kpi.refunds.today, kpi.support.today], [1, 2])
  assert.equal(board.windows.yesterdayTo, '2026-10-05T06:00:00.000Z')
  assert.deepEqual(board.errors, [])
})

test('처리 필요는 지금 손댈 것만 세고 처리 화면 링크를 준다', async () => {
  const todo = Object.fromEntries((await buildDashboard(deps(), NOW)).todo.map((item) => [item.key, item]))
  assert.equal(todo['refund-approval'].count, 1)
  assert.equal(todo['refund-approval'].href, '/payments/refunds?state=requested')
  assert.equal(todo['refund-check'].count, 1)
  assert.equal(todo['support-open'].count, 1)
  assert.equal(todo['support-open'].tone, 'error', '급한 문의가 있으면 빨간색')
  assert.equal(todo['failed-reports'].count, 2)
  assert.equal(todo['push-failed'].count, 1, '일부만 실패한 발송은 넣지 않는다')
})

test('한 저장소가 실패해도 나머지는 보여 주고, 실패한 부분은 -1 과 errors 로 알린다', async () => {
  const board = await buildDashboard(deps({ listRefunds: async () => { throw new Error('down') } }), NOW)
  assert.deepEqual(board.errors, ['refunds'])
  assert.equal(board.kpis.find((item) => item.key === 'refunds')?.today, -1)
  assert.equal(board.todo.find((item) => item.key === 'refund-approval')?.count, -1)
  assert.equal(board.kpis.find((item) => item.key === 'revenue')?.today, 15000)
})
