import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { AdminCommandConflict, executeAdminCommand, type AdminCommandStore } from '../../src/admin/admin-command.js'

function memoryStore(): AdminCommandStore & { events: Array<{ result: string }> } {
  const receipts = new Map<string, { digest: string; state: 'processing' | 'completed'; result?: { id: string } }>()
  const events: Array<{ result: string }> = []
  return {
    events,
    async findReceipt(input) { const row = receipts.get(`${input.actorEmail}:${input.action}:${input.idempotencyKey}`); return row ? { requestDigest: row.digest, state: row.state, result: row.result } : null },
    async reserveReceipt(input) { receipts.set(`${input.actorEmail}:${input.action}:${input.idempotencyKey}`, { digest: input.requestDigest, state: 'processing' }) },
    async completeReceipt(input) { const row = receipts.get(`${input.actorEmail}:${input.action}:${input.idempotencyKey}`); if (row) { row.state = 'completed'; row.result = input.result as { id: string } } },
    async appendAuditEvent(input) { events.push({ result: input.result }) },
  }
}

describe('관리자 멱등 명령', () => {
  it('같은 키와 같은 본문은 실행 결과를 재생하지 않는다', async () => {
    const store = memoryStore(); let calls = 0
    const input = { actorEmail: 'admin@synthetic.invalid', action: 'admin.account.create', idempotencyKey: 'same-request-key', body: { email: 'new@synthetic.invalid' }, target: { type: 'admin_account', id: 'new@synthetic.invalid' } }
    const first = await executeAdminCommand(store, input, async () => ({ id: String(++calls) }))
    const replay = await executeAdminCommand(store, input, async () => ({ id: String(++calls) }))
    assert.deepEqual(first, { result: { id: '1' }, replayed: false })
    assert.deepEqual(replay, { result: { id: '1' }, replayed: true })
    assert.equal(calls, 1)
  })

  it('같은 키에 다른 본문을 쓰면 409 성격의 충돌을 낸다', async () => {
    const store = memoryStore(); const base = { actorEmail: 'admin@synthetic.invalid', action: 'admin.account.create', idempotencyKey: 'conflict-key', target: { type: 'admin_account', id: 'x' } }
    await executeAdminCommand(store, { ...base, body: { role: 'reader' } }, async () => ({ id: '1' }))
    await assert.rejects(() => executeAdminCommand(store, { ...base, body: { role: 'super_admin' } }, async () => ({ id: '2' })), AdminCommandConflict)
  })

  it('감사 시작 기록에 실패하면 실제 변경 콜백을 실행하지 않는다', async () => {
    const store = memoryStore(); store.appendAuditEvent = async () => { throw new Error('AUDIT_UNAVAILABLE') }
    let called = false
    await assert.rejects(() => executeAdminCommand(store, { actorEmail: 'admin@synthetic.invalid', action: 'admin.account.create', idempotencyKey: 'audit-failure-key', body: {}, target: { type: 'admin_account', id: 'x' } }, async () => { called = true; return { id: '1' } }))
    assert.equal(called, false)
  })
})
