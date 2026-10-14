import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { parseAdminRange, applyRange, inRange } from '../../src/admin/date-range.js'
import { buildDashboard } from '../../src/admin/dashboard.js'

/**
 * 2026-10-14 관리자 전 화면 날짜 검색. 서버는 같은 규칙(시작 포함·끝 미포함, 최대 일수)으로 기간을 읽고,
 * 화면은 날짜가 있는 메뉴마다 같은 자리에 같은 기간 막대를 둔다.
 */
const read = (p: string) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8')

test('range parser accepts a proper window and rejects half, reversed or too long ones', () => {
  assert.equal(parseAdminRange({}), null)
  assert.deepEqual(parseAdminRange({ from: '2026-10-01T00:00:00+09:00', to: '2026-10-08T00:00:00+09:00' }), { from: '2026-09-30T15:00:00.000Z', to: '2026-10-07T15:00:00.000Z' })
  assert.equal(parseAdminRange({ from: '2026-10-01T00:00:00Z' }), 'invalid')
  assert.equal(parseAdminRange({ from: '2026-10-08T00:00:00Z', to: '2026-10-01T00:00:00Z' }), 'invalid')
  assert.equal(parseAdminRange({ from: '2026-01-01T00:00:00Z', to: '2026-06-01T00:00:00Z' }, 92), 'invalid')
  assert.equal(parseAdminRange({ from: 'nope', to: '2026-10-01T00:00:00Z' }), 'invalid')
})

test('PostgREST filter is start-inclusive, end-exclusive, and in-memory check matches it', () => {
  const range = { from: '2026-10-01T00:00:00.000Z', to: '2026-10-02T00:00:00.000Z' }
  const url = applyRange(new URL('https://x.test/rest/v1/t'), 'created_at', range)
  assert.deepEqual(url.searchParams.getAll('created_at'), ['gte.2026-10-01T00:00:00.000Z', 'lt.2026-10-02T00:00:00.000Z'])
  assert.equal(inRange('2026-10-01T00:00:00.000Z', range), true)
  assert.equal(inRange('2026-10-02T00:00:00.000Z', range), false)
  assert.equal(inRange('2026-09-30T23:59:59.999Z', range), false)
  assert.equal(inRange('anything', null), true)
})

test('dashboard compares the chosen window with the window right before it', async () => {
  const calls: Array<[string, string]> = []
  const order = (createdAt: string, amount: number) => ({ orderId: createdAt, ownerId: 'o' + amount, status: 'paid', amount, createdAt, updatedAt: createdAt }) as any
  const dashboard = await buildDashboard({
    async countMembersCreated(from, to) { calls.push([from.toISOString(), to.toISOString()]); return 1 },
    async countReportsCreated() { return 0 },
    async listOrdersSince() { return [order('2026-10-05T00:00:00.000Z', 1000), order('2026-10-02T00:00:00.000Z', 500), order('2026-09-20T00:00:00.000Z', 9)] },
    async countUnsettledOrders() { return 0 },
    async listRefunds() { return [] },
    async listSupportCases() { return [] },
    async listRefundsCreated() { return [] },
    async listSupportCreated() { return [{ createdAt: '2026-10-06T00:00:00.000Z', status: 'received', priority: 'normal' } as any] },
    async countFailedReports() { return 0 },
    async listRecentPushes() { return [] },
  }, new Date('2026-10-14T00:00:00Z'), { from: '2026-10-04T00:00:00.000Z', to: '2026-10-07T00:00:00.000Z' })
  assert.deepEqual(calls, [['2026-10-04T00:00:00.000Z', '2026-10-07T00:00:00.000Z'], ['2026-10-01T00:00:00.000Z', '2026-10-04T00:00:00.000Z']])
  const revenue = dashboard.kpis.find((item) => item.key === 'revenue')!
  assert.deepEqual([revenue.today, revenue.yesterday], [1000, 500])
  const support = dashboard.kpis.find((item) => item.key === 'support')!
  assert.deepEqual([support.today, support.yesterday], [1, 0])
  assert.equal(dashboard.windows.custom, true)
})

test('every dated admin screen gets the shared date bar, and old per-screen date inputs are gone', () => {
  const admin = read('admin-ui/index.html')
  for (const label of ['가입일', '접수일', '결제일', '요청일', '만든 날', '시도 시각', '마지막 처리', '최근 변경', '노출 기간', '사용 기간', '기록 시각', '발생 기록']) {
    assert.ok(admin.includes(`dates: { label: '${label}'`), label)
  }
  assert.ok(admin.includes("{ path: '', label: '운영 현황', dates: { label: '기간', maxDays: 92"))
  assert.ok(admin.includes('mount(panel, def.tabs[route.tabIndex].load);'))
  // 방문·전환도 같은 막대(기본 최근 7일, 최대 92일)를 쓰고, 콘텐츠 관리는 최근 변경으로 거른다.
  assert.ok(admin.includes("label: '방문 · 전환', dates: { label: '방문 시각', fallback: '7d', maxDays: 92"))
  assert.ok(admin.includes("var query = adminRangeQuery('');"))
  assert.doesNotMatch(admin, /admin-funnel-period|data-funnel-range/)
  assert.ok(admin.includes("dates: { label: '최근 변경', tip: '최근 변경 시각 기준으로, 불러온 콘텐츠"))
  assert.doesNotMatch(admin, /type = 'date'/)
  for (const call of ["'/api/admin/v1/support' + adminRangeQuery('?')", "'/api/admin/v1/jobs' + adminRangeQuery('?')", "'/api/admin/v1/incidents' + adminRangeQuery('?')", "pushRequest('?limit=100' + adminRangeQuery('&'))", "'/api/admin/v1/dashboard' + adminRangeQuery('?')", "'/api/admin/v1/payments/revenue' + adminRangeQuery('?')"]) {
    assert.ok(admin.includes(call), call)
  }
})

test('server routes read the shared range and the order list filters on payment time', () => {
  const app = read('src/server/app.ts')
  assert.ok(app.includes('listSupportCases(range)') && app.includes('listOpsJobs(range)') && app.includes('listIncidents(100, range)'))
  assert.ok(app.includes("windowField: 'created',"))
  assert.match(read('src/push/router.ts'), /listNotifications\(limit, offset, range\)/)
})
