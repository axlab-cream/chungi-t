import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..', '..')
const admin = readFileSync(join(ROOT, 'admin-ui/index.html'), 'utf8')
const app = readFileSync(join(ROOT, 'src/server/app.ts'), 'utf8')

// 2026-10-16 비회원 결제·수동 합치기(docs/auth/guest-member-plan.md 8절).
test('비회원 관리: 결제함 필터와 행을 누르면 열리는 상세(회원에게 합치기)', () => {
  assert.match(admin, /\['paid', '결제함'\]/)
  assert.match(admin, /function \(item\) \{ openGuestDetail\(item\.id, refresh\); \}/)
  assert.match(admin, /url: '\/api\/admin\/v1\/guests\/' \+ encodeURIComponent\(g\.id\) \+ '\/merge'/)
  assert.match(admin, /같은 이름·생년월일로 다른 기기에서 본 비회원이/)
})

test('결제 상세는 주문 옮기기, 회원 상세는 회원 → 회원 옮기기를 같은 창으로 연다', () => {
  assert.match(admin, /'\/api\/admin\/v1\/payments\/' \+ encodeURIComponent\(order\.orderId\) \+ '\/transfer'/)
  assert.match(admin, /'\/api\/admin\/v1\/members\/' \+ encodeURIComponent\(member\.userId\) \+ '\/transfer'/)
  const dialog = admin.slice(admin.indexOf('function openRecordTransferDialog('), admin.indexOf('async function anonymizeGuestsFlow('))
  assert.match(dialog, /kind: 'member'/, '받는 쪽은 SNS 회원만 찾는다')
  assert.match(dialog, /'Idempotency-Key': crypto\.randomUUID\(\)/)
  assert.match(dialog, /confirm: true/)
  assert.match(dialog, /adminConfirm\(/, '옮기기 전에 한 번 더 묻는다')
})

test('비회원 상세 API는 읽기 권한, 옮기기 API는 쓰기 권한과 감사 기록', () => {
  const detail = app.slice(app.indexOf("app.get('/api/admin/v1/guests/:id'"), app.indexOf("app.post('/api/admin/v1/guests/:id/merge'"))
  assert.match(detail, /requireStaff\(req, res, 'members:read'\)/)
  for (const [route, action] of [['guests/:id/merge', 'member.guest.merge'], ['payments/:orderId/transfer', 'payment.order.transfer'], ['members/:id/transfer', 'member.records.transfer']]) {
    const at = app.indexOf(`app.post('/api/admin/v1/${route}'`)
    assert.ok(at > 0, route)
    const body = app.slice(at, at + 1600)
    assert.match(body, /requireStaff\(req, res, 'members:write'\)/, route)
    assert.match(body, new RegExp(`action: '${action.replace(/\./g, '\.')}'`), route)
  }
})
