import { randomUUID } from 'node:crypto'
import { opsBase, opsHeaders, opsStoreAvailable } from '../admin/ops-queue.js'
import {
  PushError, isUuid, targetFilter, targetLabel,
  type PushDeviceInput, type PushDraftInput, type PushNotificationRecord, type PushStatus, type PushTarget, type PushTargetType,
} from './contracts.js'

/**
 * 푸시 저장소. 운영은 Supabase REST(service role), 테스트는 메모리 구현을 쓴다.
 * 표 구조는 supabase/migrations/20261002170000_push_notifications.sql.
 */

export interface TargetDevice { id: string; userId: string | null }
export interface PendingDelivery { id: string; deviceId: string | null; userId: string | null; attempts: number; token: string | null; active: boolean }
export interface DeliveryUpdate { status: 'pending' | 'sent' | 'failed'; attempts: number; errorCode?: string | null; errorMessage?: string | null; sentAt?: string | null }
export interface PushUserMatch { userId: string; name: string; createdAt: string; deviceCount: number }

export interface PushStore {
  upsertDevice(input: PushDeviceInput): Promise<{ id: string }>
  deactivateDevice(deviceId: string, reason: string): Promise<void>
  createNotification(input: PushDraftInput, createdBy: string, now?: Date): Promise<PushNotificationRecord>
  listNotifications(limit: number, offset: number): Promise<{ items: PushNotificationRecord[]; total: number }>
  getNotification(id: string): Promise<PushNotificationRecord | null>
  cancelNotification(id: string, actor: string): Promise<PushNotificationRecord | null>
  claimNotification(leaseSeconds: number): Promise<PushNotificationRecord | null>
  extendLease(id: string, leaseSeconds: number): Promise<void>
  selectTargetDevices(target: PushTarget, limit: number): Promise<TargetDevice[]>
  countTargetDevices(target: PushTarget): Promise<number>
  insertDeliveries(notificationId: string, devices: TargetDevice[]): Promise<void>
  markPrepared(id: string): Promise<void>
  nextPendingDeliveries(notificationId: string, limit: number): Promise<PendingDelivery[]>
  updateDelivery(id: string, update: DeliveryUpdate): Promise<void>
  refreshCounts(id: string): Promise<void>
  finishNotification(id: string, status: Extract<PushStatus, 'sent' | 'failed'>, lastError: string | null): Promise<void>
  noteError(id: string, lastError: string, leaseSeconds: number): Promise<void>
  failureSummary(id: string): Promise<Record<string, number>>
  recordOpen(notificationId: string, deliveryId: string): Promise<boolean>
  searchUsers(query: string): Promise<PushUserMatch[]>
  pruneDeliveries(before: Date): Promise<void>
  /**
   * 실패분 재발송. 아직 살아 있는(is_active) 기기의 실패 기록만 대기로 되돌리고, 발송 건을 지금 시각
   * 예약으로 다시 연다. 앱을 지워 비활성화된 기기는 다시 보내도 실패하므로 건드리지 않는다.
   * 되돌린 기기 수를 돌려준다(0 이면 발송 건도 다시 열지 않는다).
   */
  reopenFailedDeliveries(id: string): Promise<number>
}

type Row = Record<string, unknown>
const str = (value: unknown): string | null => typeof value === 'string' && value ? value : null
const num = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : Number(value) || 0)

function toRecord(row: Row): PushNotificationRecord {
  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    body: String(row.body ?? ''),
    deepLink: String(row.deep_link ?? '/'),
    targetType: String(row.target_type) as PushTargetType,
    targetFilter: (row.target_filter && typeof row.target_filter === 'object' ? row.target_filter : {}) as Record<string, unknown>,
    targetLabel: str(row.target_label),
    status: String(row.status) as PushStatus,
    scheduledAt: str(row.scheduled_at),
    startedAt: str(row.started_at),
    sentAt: str(row.sent_at),
    preparedAt: str(row.prepared_at),
    totalCount: num(row.total_count),
    successCount: num(row.success_count),
    failureCount: num(row.failure_count),
    clickCount: num(row.click_count),
    lastError: str(row.last_error),
    createdBy: String(row.created_by ?? ''),
    cancelledBy: str(row.cancelled_by),
    cancelledAt: str(row.cancelled_at),
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  }
}

function initialStatus(input: PushDraftInput, now: Date): { status: PushStatus; scheduledAt: string | null } {
  const schedule = input.schedule
  if (schedule.mode === 'scheduled') return { status: 'scheduled', scheduledAt: schedule.at }
  if (schedule.mode === 'now') return { status: 'scheduled', scheduledAt: now.toISOString() }
  return { status: 'draft', scheduledAt: null }
}

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString()

/** PostgREST 의 or/in/ilike 값 안에서 의미가 있는 문자를 지운다. 이름 검색에만 쓴다. */
function safeSearchText(value: string): string {
  return value.replace(/[%*,.()"\\:]/g, ' ').replace(/\s+/g, ' ').trim()
}

const MAX_TARGET_DEVICES = 20_000
const PAGE = 1000

/* ─────────────────────────── Supabase REST ─────────────────────────── */

export function restPushStore(): PushStore {
  const table = (name: string) => new URL(`${opsBase()}/rest/v1/${name}`)
  async function call(url: URL | string, init: RequestInit = {}): Promise<Response> {
    const response = await fetch(url, { ...init, headers: { ...opsHeaders(), ...(init.headers as Record<string, string> | undefined) }, signal: AbortSignal.timeout(10_000) })
    if (!response.ok) throw new PushError('PUSH_STORE_UNAVAILABLE', 503)
    return response
  }
  const rows = async (url: URL | string, init?: RequestInit) => await (await call(url, init)).json() as Row[]
  const totalFrom = (response: Response) => {
    const range = response.headers.get('content-range') ?? ''
    const total = range.split('/')[1]
    return total && /^\d+$/.test(total) ? Number(total) : 0
  }

  async function signupUserIds(days: number): Promise<string[]> {
    const ids: string[] = []
    for (let offset = 0; offset < MAX_TARGET_DEVICES; offset += PAGE) {
      const url = table('cheongi_user_profiles')
      url.searchParams.set('select', 'user_id'); url.searchParams.set('created_at', `gte.${daysAgo(days)}`)
      url.searchParams.set('order', 'user_id'); url.searchParams.set('limit', String(PAGE)); url.searchParams.set('offset', String(offset))
      const page = await rows(url)
      ids.push(...page.map((row) => String(row.user_id)).filter(isUuid))
      if (page.length < PAGE) break
    }
    return ids
  }

  function deviceQuery(target: Exclude<PushTarget, { type: 'signup_days' }> | { type: 'users'; userIds: string[] }): URL {
    const url = table('push_devices')
    url.searchParams.set('is_active', 'eq.true')
    if (target.type === 'logged_in') url.searchParams.set('user_id', 'not.is.null')
    if (target.type === 'guests') url.searchParams.set('user_id', 'is.null')
    if (target.type === 'active_days') url.searchParams.set('last_active_at', `gte.${daysAgo(target.days)}`)
    if (target.type === 'users') url.searchParams.set('user_id', `in.(${target.userIds.join(',')})`)
    return url
  }

  async function devicesFor(target: PushTarget, limit: number): Promise<TargetDevice[]> {
    if (target.type === 'signup_days') {
      const ids = await signupUserIds(target.days)
      const found: TargetDevice[] = []
      for (let i = 0; i < ids.length && found.length < limit; i += 100) {
        found.push(...await devicesFor({ type: 'users', userIds: ids.slice(i, i + 100) }, limit - found.length))
      }
      return found
    }
    const found: TargetDevice[] = []
    for (let offset = 0; offset < limit; offset += PAGE) {
      const url = deviceQuery(target)
      url.searchParams.set('select', 'id,user_id'); url.searchParams.set('order', 'id')
      url.searchParams.set('limit', String(Math.min(PAGE, limit - offset))); url.searchParams.set('offset', String(offset))
      const page = await rows(url)
      found.push(...page.map((row) => ({ id: String(row.id), userId: str(row.user_id) })))
      if (page.length < PAGE) break
    }
    return found
  }

  return {
    async upsertDevice(input) {
      const url = table('push_devices'); url.searchParams.set('on_conflict', 'device_token'); url.searchParams.set('select', 'id')
      const now = new Date().toISOString()
      const result = await rows(url, {
        method: 'POST',
        headers: { prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({
          device_token: input.token, user_id: input.userId, platform: input.platform,
          app_version: input.appVersion, device_name: input.deviceName,
          is_active: true, deactivated_reason: null, updated_at: now, last_active_at: now,
        }),
      })
      if (!result[0]?.id) throw new PushError('PUSH_STORE_UNAVAILABLE', 503)
      return { id: String(result[0].id) }
    },
    async deactivateDevice(deviceId, reason) {
      const url = table('push_devices'); url.searchParams.set('id', `eq.${deviceId}`)
      await call(url, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ is_active: false, deactivated_reason: reason.slice(0, 80), updated_at: new Date().toISOString() }) })
    },
    async createNotification(input, createdBy, now = new Date()) {
      const { status, scheduledAt } = initialStatus(input, now)
      const url = table('push_notifications'); url.searchParams.set('select', '*')
      const result = await rows(url, {
        method: 'POST', headers: { prefer: 'return=representation' },
        body: JSON.stringify({
          title: input.title, body: input.body, deep_link: input.deepLink,
          target_type: input.target.type, target_filter: targetFilter(input.target), target_label: targetLabel(input.target),
          status, scheduled_at: scheduledAt, created_by: createdBy,
        }),
      })
      if (!result[0]) throw new PushError('PUSH_STORE_UNAVAILABLE', 503)
      return toRecord(result[0])
    },
    async listNotifications(limit, offset) {
      const url = table('push_notifications')
      url.searchParams.set('select', '*'); url.searchParams.set('order', 'created_at.desc')
      url.searchParams.set('limit', String(limit)); url.searchParams.set('offset', String(offset))
      const response = await call(url, { headers: { prefer: 'count=exact' } })
      return { items: (await response.json() as Row[]).map(toRecord), total: totalFrom(response) }
    },
    async getNotification(id) {
      if (!isUuid(id)) return null
      const url = table('push_notifications'); url.searchParams.set('id', `eq.${id}`); url.searchParams.set('select', '*')
      const found = await rows(url)
      return found[0] ? toRecord(found[0]) : null
    },
    async cancelNotification(id, actor) {
      if (!isUuid(id)) return null
      const url = table('push_notifications'); url.searchParams.set('id', `eq.${id}`)
      url.searchParams.set('status', 'in.(draft,scheduled,sending)'); url.searchParams.set('select', '*')
      const now = new Date().toISOString()
      const found = await rows(url, { method: 'PATCH', headers: { prefer: 'return=representation' }, body: JSON.stringify({ status: 'cancelled', cancelled_by: actor, cancelled_at: now, lease_until: null, updated_at: now }) })
      return found[0] ? toRecord(found[0]) : null
    },
    async claimNotification(leaseSeconds) {
      const found = await rows(`${opsBase()}/rest/v1/rpc/push_claim_notification`, { method: 'POST', body: JSON.stringify({ p_lease_seconds: leaseSeconds }) })
      return found[0] ? toRecord(found[0]) : null
    },
    async extendLease(id, leaseSeconds) {
      const url = table('push_notifications'); url.searchParams.set('id', `eq.${id}`); url.searchParams.set('status', 'eq.sending')
      await call(url, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ lease_until: new Date(Date.now() + leaseSeconds * 1000).toISOString() }) })
    },
    selectTargetDevices: (target, limit) => devicesFor(target, Math.min(limit, MAX_TARGET_DEVICES)),
    async countTargetDevices(target) {
      if (target.type === 'signup_days') return (await devicesFor(target, MAX_TARGET_DEVICES)).length
      const url = deviceQuery(target); url.searchParams.set('select', 'id'); url.searchParams.set('limit', '1')
      return totalFrom(await call(url, { headers: { prefer: 'count=exact' } }))
    },
    async insertDeliveries(notificationId, devices) {
      for (let i = 0; i < devices.length; i += 500) {
        const url = table('push_delivery_logs'); url.searchParams.set('on_conflict', 'push_notification_id,device_id')
        await call(url, {
          method: 'POST', headers: { prefer: 'resolution=ignore-duplicates,return=minimal' },
          body: JSON.stringify(devices.slice(i, i + 500).map((device) => ({ push_notification_id: notificationId, device_id: device.id, user_id: device.userId }))),
        })
      }
    },
    async markPrepared(id) {
      const url = table('push_notifications'); url.searchParams.set('id', `eq.${id}`)
      await call(url, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ prepared_at: new Date().toISOString() }) })
    },
    async nextPendingDeliveries(notificationId, limit) {
      const url = table('push_delivery_logs')
      url.searchParams.set('push_notification_id', `eq.${notificationId}`); url.searchParams.set('status', 'eq.pending')
      url.searchParams.set('order', 'id'); url.searchParams.set('limit', String(limit))
      url.searchParams.set('select', 'id,device_id,user_id,attempts,push_devices(device_token,is_active)')
      return (await rows(url)).map((row) => {
        const device = (row.push_devices && typeof row.push_devices === 'object' ? row.push_devices : null) as Row | null
        return { id: String(row.id), deviceId: str(row.device_id), userId: str(row.user_id), attempts: num(row.attempts), token: str(device?.device_token), active: device?.is_active === true }
      })
    },
    async updateDelivery(id, update) {
      const url = table('push_delivery_logs'); url.searchParams.set('id', `eq.${id}`)
      await call(url, {
        method: 'PATCH', headers: { prefer: 'return=minimal' },
        body: JSON.stringify({ status: update.status, attempts: update.attempts, error_code: update.errorCode ?? null, error_message: update.errorMessage?.slice(0, 300) ?? null, sent_at: update.sentAt ?? null }),
      })
    },
    async refreshCounts(id) {
      await call(`${opsBase()}/rest/v1/rpc/push_refresh_counts`, { method: 'POST', body: JSON.stringify({ p_notification: id }) })
    },
    async finishNotification(id, status, lastError) {
      const url = table('push_notifications'); url.searchParams.set('id', `eq.${id}`); url.searchParams.set('status', 'eq.sending')
      const now = new Date().toISOString()
      await call(url, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ status, sent_at: now, lease_until: null, last_error: lastError?.slice(0, 300) ?? null, updated_at: now }) })
    },
    async noteError(id, lastError, leaseSeconds) {
      const url = table('push_notifications'); url.searchParams.set('id', `eq.${id}`); url.searchParams.set('status', 'eq.sending')
      await call(url, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ last_error: lastError.slice(0, 300), lease_until: new Date(Date.now() + leaseSeconds * 1000).toISOString(), updated_at: new Date().toISOString() }) })
    },
    async failureSummary(id) {
      const url = table('push_delivery_logs')
      url.searchParams.set('push_notification_id', `eq.${id}`); url.searchParams.set('status', 'eq.failed')
      url.searchParams.set('select', 'error_code'); url.searchParams.set('limit', '5000')
      const summary: Record<string, number> = {}
      for (const row of await rows(url)) { const code = str(row.error_code) ?? 'UNKNOWN'; summary[code] = (summary[code] ?? 0) + 1 }
      return summary
    },
    async recordOpen(notificationId, deliveryId) {
      if (!isUuid(notificationId) || !/^\d{1,18}$/.test(deliveryId)) return false
      const response = await call(`${opsBase()}/rest/v1/rpc/push_record_open`, { method: 'POST', body: JSON.stringify({ p_notification: notificationId, p_delivery: Number(deliveryId) }) })
      return await response.json() === true
    },
    async searchUsers(query) {
      const text = query.trim()
      const url = table('cheongi_user_profiles')
      url.searchParams.set('select', 'user_id,name,created_at'); url.searchParams.set('limit', '20'); url.searchParams.set('order', 'updated_at.desc')
      if (isUuid(text)) url.searchParams.set('user_id', `eq.${text.toLowerCase()}`)
      else {
        const name = safeSearchText(text)
        if (name.length < 2) throw new PushError('PUSH_SEARCH_INVALID')
        url.searchParams.set('name', `ilike.*${name}*`)
      }
      const profiles = await rows(url)
      const ids = profiles.map((row) => String(row.user_id)).filter(isUuid)
      const counts: Record<string, number> = {}
      if (ids.length) {
        const devices = table('push_devices')
        devices.searchParams.set('select', 'user_id'); devices.searchParams.set('is_active', 'eq.true'); devices.searchParams.set('user_id', `in.(${ids.join(',')})`)
        for (const row of await rows(devices)) { const id = String(row.user_id); counts[id] = (counts[id] ?? 0) + 1 }
      }
      return profiles.filter((row) => isUuid(row.user_id)).map((row) => ({
        userId: String(row.user_id), name: str(row.name) ?? '이름 미등록', createdAt: String(row.created_at ?? ''), deviceCount: counts[String(row.user_id)] ?? 0,
      }))
    },
    async pruneDeliveries(before) {
      const url = table('push_delivery_logs'); url.searchParams.set('created_at', `lt.${before.toISOString()}`)
      await call(url, { method: 'DELETE', headers: { prefer: 'return=minimal' } })
    },
    async reopenFailedDeliveries(id) {
      if (!isUuid(id)) return 0
      const failed = table('push_delivery_logs')
      failed.searchParams.set('push_notification_id', `eq.${id}`); failed.searchParams.set('status', 'eq.failed')
      failed.searchParams.set('select', 'id,push_devices!inner(is_active)'); failed.searchParams.set('push_devices.is_active', 'eq.true')
      failed.searchParams.set('limit', '20000')
      const ids = (await rows(failed)).map((row) => String(row.id))
      if (!ids.length) return 0
      for (let i = 0; i < ids.length; i += 200) {
        const url = table('push_delivery_logs'); url.searchParams.set('id', `in.(${ids.slice(i, i + 200).join(',')})`)
        await call(url, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ status: 'pending', attempts: 0, error_code: null, error_message: null, sent_at: null }) })
      }
      const now = new Date().toISOString()
      const note = table('push_notifications'); note.searchParams.set('id', `eq.${id}`); note.searchParams.set('status', 'in.(sent,failed)')
      await call(note, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ status: 'scheduled', scheduled_at: now, sent_at: null, lease_until: null, last_error: null, updated_at: now }) })
      return ids.length
    },
  }
}

/* ─────────────────────────── 테스트용 메모리 ─────────────────────────── */

export interface MemoryPushState {
  devices: Array<{ id: string; token: string; userId: string | null; platform: string; isActive: boolean; reason: string | null; lastActiveAt: string; createdAt: string }>
  notifications: Array<PushNotificationRecord & { leaseUntil: number | null }>
  deliveries: Array<{ id: string; notificationId: string; deviceId: string | null; userId: string | null; status: 'pending' | 'sent' | 'failed'; attempts: number; errorCode: string | null; errorMessage: string | null; sentAt: string | null; clickedAt: string | null; createdAt: string }>
  profiles: Array<{ userId: string; name: string; createdAt: string }>
}

export function createMemoryPushStore(state: MemoryPushState = { devices: [], notifications: [], deliveries: [], profiles: [] }): PushStore & { state: MemoryPushState } {
  let nextDelivery = 1
  const matches = (target: PushTarget, device: MemoryPushState['devices'][number]): boolean => {
    if (!device.isActive) return false
    switch (target.type) {
      case 'all': return true
      case 'logged_in': return device.userId !== null
      case 'guests': return device.userId === null
      case 'active_days': return device.lastActiveAt >= daysAgo(target.days)
      case 'users': return device.userId !== null && target.userIds.includes(device.userId)
      case 'signup_days': {
        const since = daysAgo(target.days)
        return device.userId !== null && state.profiles.some((profile) => profile.userId === device.userId && profile.createdAt >= since)
      }
    }
  }
  const find = (id: string) => state.notifications.find((item) => item.id === id)
  const strip = (item: MemoryPushState['notifications'][number]): PushNotificationRecord => { const { leaseUntil: _lease, ...record } = item; return structuredClone(record) }
  return {
    state,
    async upsertDevice(input) {
      const now = new Date().toISOString()
      const existing = state.devices.find((device) => device.token === input.token)
      if (existing) { Object.assign(existing, { userId: input.userId, platform: input.platform, isActive: true, reason: null, lastActiveAt: now }); return { id: existing.id } }
      const device = { id: randomUUID(), token: input.token, userId: input.userId, platform: input.platform, isActive: true, reason: null, lastActiveAt: now, createdAt: now }
      state.devices.push(device); return { id: device.id }
    },
    async deactivateDevice(deviceId, reason) { const device = state.devices.find((item) => item.id === deviceId); if (device) { device.isActive = false; device.reason = reason } },
    async createNotification(input, createdBy, now = new Date()) {
      const { status, scheduledAt } = initialStatus(input, now)
      const record = {
        id: randomUUID(), title: input.title, body: input.body, deepLink: input.deepLink,
        targetType: input.target.type, targetFilter: targetFilter(input.target), targetLabel: targetLabel(input.target),
        status, scheduledAt, startedAt: null, sentAt: null, preparedAt: null,
        totalCount: 0, successCount: 0, failureCount: 0, clickCount: 0, lastError: null,
        createdBy, cancelledBy: null, cancelledAt: null, createdAt: now.toISOString(), updatedAt: now.toISOString(), leaseUntil: null,
      }
      state.notifications.push(record); return strip(record)
    },
    async listNotifications(limit, offset) {
      const sorted = [...state.notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      return { items: sorted.slice(offset, offset + limit).map(strip), total: sorted.length }
    },
    async getNotification(id) { const item = find(id); return item ? strip(item) : null },
    async cancelNotification(id, actor) {
      const item = find(id)
      if (!item || !['draft', 'scheduled', 'sending'].includes(item.status)) return null
      Object.assign(item, { status: 'cancelled', cancelledBy: actor, cancelledAt: new Date().toISOString(), leaseUntil: null }); return strip(item)
    },
    async claimNotification(leaseSeconds) {
      const now = Date.now()
      const item = state.notifications
        .filter((n) => (n.status === 'scheduled' && n.scheduledAt !== null && Date.parse(n.scheduledAt) <= now) || (n.status === 'sending' && (n.leaseUntil === null || n.leaseUntil < now)))
        .sort((a, b) => String(a.scheduledAt).localeCompare(String(b.scheduledAt)))[0]
      if (!item) return null
      item.status = 'sending'; item.startedAt ??= new Date().toISOString(); item.leaseUntil = now + leaseSeconds * 1000
      return strip(item)
    },
    async extendLease(id, leaseSeconds) { const item = find(id); if (item?.status === 'sending') item.leaseUntil = Date.now() + leaseSeconds * 1000 },
    async selectTargetDevices(target, limit) { return state.devices.filter((device) => matches(target, device)).slice(0, limit).map((device) => ({ id: device.id, userId: device.userId })) },
    async countTargetDevices(target) { return state.devices.filter((device) => matches(target, device)).length },
    async insertDeliveries(notificationId, devices) {
      for (const device of devices) {
        if (state.deliveries.some((row) => row.notificationId === notificationId && row.deviceId === device.id)) continue
        state.deliveries.push({ id: String(nextDelivery++), notificationId, deviceId: device.id, userId: device.userId, status: 'pending', attempts: 0, errorCode: null, errorMessage: null, sentAt: null, clickedAt: null, createdAt: new Date().toISOString() })
      }
    },
    async markPrepared(id) { const item = find(id); if (item) item.preparedAt = new Date().toISOString() },
    async nextPendingDeliveries(notificationId, limit) {
      return state.deliveries.filter((row) => row.notificationId === notificationId && row.status === 'pending').slice(0, limit).map((row) => {
        const device = state.devices.find((item) => item.id === row.deviceId)
        return { id: row.id, deviceId: row.deviceId, userId: row.userId, attempts: row.attempts, token: device?.token ?? null, active: device?.isActive === true }
      })
    },
    async updateDelivery(id, update) {
      const row = state.deliveries.find((item) => item.id === id)
      if (row) Object.assign(row, { status: update.status, attempts: update.attempts, errorCode: update.errorCode ?? null, errorMessage: update.errorMessage ?? null, sentAt: update.sentAt ?? null })
    },
    async refreshCounts(id) {
      const item = find(id); if (!item) return
      const rows = state.deliveries.filter((row) => row.notificationId === id)
      item.totalCount = rows.length; item.successCount = rows.filter((row) => row.status === 'sent').length
      item.failureCount = rows.filter((row) => row.status === 'failed').length; item.clickCount = rows.filter((row) => row.clickedAt).length
    },
    async finishNotification(id, status, lastError) {
      const item = find(id); if (item?.status !== 'sending') return
      Object.assign(item, { status, sentAt: new Date().toISOString(), leaseUntil: null, lastError })
    },
    async noteError(id, lastError, leaseSeconds) { const item = find(id); if (item?.status === 'sending') Object.assign(item, { lastError, leaseUntil: Date.now() + leaseSeconds * 1000 }) },
    async failureSummary(id) {
      const summary: Record<string, number> = {}
      for (const row of state.deliveries.filter((item) => item.notificationId === id && item.status === 'failed')) summary[row.errorCode ?? 'UNKNOWN'] = (summary[row.errorCode ?? 'UNKNOWN'] ?? 0) + 1
      return summary
    },
    async recordOpen(notificationId, deliveryId) {
      const row = state.deliveries.find((item) => item.id === deliveryId && item.notificationId === notificationId)
      if (!row || row.clickedAt) return false
      row.clickedAt = new Date().toISOString(); const item = find(notificationId); if (item) item.clickCount += 1
      return true
    },
    async searchUsers(query) {
      const text = query.trim()
      if (!isUuid(text) && safeSearchText(text).length < 2) throw new PushError('PUSH_SEARCH_INVALID')
      return state.profiles
        .filter((profile) => isUuid(text) ? profile.userId === text.toLowerCase() : profile.name.includes(safeSearchText(text)))
        .slice(0, 20)
        .map((profile) => ({ ...profile, deviceCount: state.devices.filter((device) => device.isActive && device.userId === profile.userId).length }))
    },
    async pruneDeliveries(before) { state.deliveries = state.deliveries.filter((row) => row.createdAt >= before.toISOString()) },
    async reopenFailedDeliveries(id) {
      const item = find(id)
      if (!item || !['sent', 'failed'].includes(item.status)) return 0
      const rows = state.deliveries.filter((row) => row.notificationId === id && row.status === 'failed' && state.devices.some((device) => device.id === row.deviceId && device.isActive))
      rows.forEach((row) => Object.assign(row, { status: 'pending', attempts: 0, errorCode: null, errorMessage: null, sentAt: null }))
      if (rows.length) Object.assign(item, { status: 'scheduled', scheduledAt: new Date().toISOString(), sentAt: null, leaseUntil: null, lastError: null })
      return rows.length
    },
  }
}

let override: PushStore | null = null
export function configurePushStoreForTests(store: PushStore | null): void {
  if (process.env.NODE_ENV !== 'test') throw new PushError('PUSH_TEST_STORE_FORBIDDEN', 503)
  override = store
}
export function pushStore(): PushStore {
  if (override) return override
  if (!opsStoreAvailable()) throw new PushError('PUSH_STORE_UNAVAILABLE', 503)
  return restPushStore()
}
export const pushStoreAvailable = (): boolean => Boolean(override) || opsStoreAvailable()
