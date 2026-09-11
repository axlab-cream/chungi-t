import { createHash } from 'node:crypto'

export type CommandTarget = { type: string; id: string }
export type CommandReceipt = { requestDigest: string; state: 'processing' | 'completed'; result?: unknown }

export type AdminCommandStore = {
  findReceipt(input: Pick<AdminCommandInput, 'actorEmail' | 'action' | 'idempotencyKey'>): Promise<CommandReceipt | null>
  reserveReceipt(input: Pick<AdminCommandInput, 'actorEmail' | 'action' | 'idempotencyKey'> & { requestDigest: string }): Promise<void>
  completeReceipt(input: Pick<AdminCommandInput, 'actorEmail' | 'action' | 'idempotencyKey'> & { result: unknown }): Promise<void>
  appendAuditEvent(input: { actorEmail: string; action: string; target: CommandTarget; result: 'started' | 'succeeded' }): Promise<void>
}

export type AdminCommandInput = {
  actorEmail: string
  action: string
  idempotencyKey: string
  body: unknown
  target: CommandTarget
}

export class AdminCommandConflict extends Error {
  constructor(message = 'IDEMPOTENCY_CONFLICT') { super(message) }
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function digest(value: unknown): string {
  return createHash('sha256').update(stableJson(value)).digest('hex')
}

export async function executeAdminCommand<T>(store: AdminCommandStore, input: AdminCommandInput, mutate: () => Promise<T>): Promise<{ result: T; replayed: boolean }> {
  const requestDigest = digest(input.body)
  const receiptInput = { actorEmail: input.actorEmail, action: input.action, idempotencyKey: input.idempotencyKey }
  const existing = await store.findReceipt(receiptInput)
  if (existing) {
    if (existing.requestDigest !== requestDigest) throw new AdminCommandConflict()
    if (existing.state !== 'completed') throw new AdminCommandConflict('IDEMPOTENCY_IN_PROGRESS')
    return { result: existing.result as T, replayed: true }
  }
  await store.reserveReceipt({ ...receiptInput, requestDigest })
  // This append is deliberately before the mutation. A blind change is worse
  // than a rejected change, so an unavailable audit store blocks the callback.
  await store.appendAuditEvent({ actorEmail: input.actorEmail, action: input.action, target: input.target, result: 'started' })
  const result = await mutate()
  await store.completeReceipt({ ...receiptInput, result })
  await store.appendAuditEvent({ actorEmail: input.actorEmail, action: input.action, target: input.target, result: 'succeeded' })
  return { result, replayed: false }
}
