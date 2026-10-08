import { deliveredText, msUntilMarketingWindow, targetFromRecord } from './contracts.js'
import { sendFcmMessage, type FcmMessage, type FcmResult } from './fcm.js'
import { fcmAccessToken, pushGoogleConfig } from './google-auth.js'
import type { PushStore } from './store.js'

/**
 * 예약 시각이 된 푸시를 보낸다.
 *
 * 매분 /api/cron/ops 가 부르고, 관리자의 "지금 발송"도 같은 함수를 짧은 예산으로 부른다.
 * 리포트 작업 큐(ops_jobs)와 일부러 나눴다 — 그 큐는 차선 3개와 "생성 일시정지"를 리포트와
 * 공유해서, 리포트를 멈추면 푸시도 멈추고 푸시가 리포트 차선을 차지한다.
 *
 * 순서: 잡기(lease) → 대상 기기를 발송 목록에 옮기기(한 번) → 목록을 묶음으로 보내기 →
 * 집계 갱신 → 남은 게 없으면 완료. 중간에 시간이 다 되면 lease 가 풀린 뒤 다음 실행이 잇는다.
 */

export interface DispatchDeps {
  store: PushStore
  send?: (message: FcmMessage) => Promise<FcmResult>
  accessToken?: () => Promise<string>
  now?: () => number
  /** 마이페이지에서 알림을 끈 회원. 그 회원의 기기는 발송 목록에 넣지 않는다. */
  optedOut?: (userIds: string[]) => Promise<Set<string>>
  /** 이벤트·혜택 알림에 동의한 회원. 광고성 푸시는 이 회원의 기기에만 간다. 없으면 아무에게도 안 간다. */
  marketingConsented?: (userIds: string[]) => Promise<Set<string>>
}

export interface DispatchOutcome { claimed: number; sent: number; failed: number; finished: number; error?: string }

const LEASE_SECONDS = 120
const BATCH = 100
const CONCURRENCY = 10
const MAX_ATTEMPTS = 3
/** 잡은 한 건에서 일시 오류가 이 비율을 넘으면 그 실행을 접고 다음 분에 다시 한다. */
const RETRYABLE_BAIL_RATIO = 0.5

let lastPruneAt = 0

export async function runPushDispatcher(deps: DispatchDeps, budgetMs: number): Promise<DispatchOutcome> {
  const now = deps.now ?? Date.now
  const deadline = now() + budgetMs
  const outcome: DispatchOutcome = { claimed: 0, sent: 0, failed: 0, finished: 0 }
  const store = deps.store
  let token: string | null = null
  const getToken = deps.accessToken ?? (() => fcmAccessToken())
  const projectId = pushGoogleConfig().projectId
  const send = deps.send ?? ((message: FcmMessage) => sendFcmMessage(message, { projectId, accessToken: token ?? '' }))

  // 90일 지난 기기별 기록은 지운다. 집계는 발송 행에 남는다. 한 인스턴스에서 시간당 한 번.
  if (now() - lastPruneAt > 3_600_000) {
    lastPruneAt = now()
    await store.pruneDeliveries(new Date(now() - 90 * 86_400_000)).catch(() => undefined)
  }

  while (now() < deadline - 5_000) {
    const notification = await store.claimNotification(LEASE_SECONDS)
    if (!notification) break
    outcome.claimed += 1

    // 광고성 푸시는 한국 시간 21시~8시에 보내지 않는다. 예약이 밀려 밤에 잡혔으면 아침 8시까지 미룬다.
    if (notification.isMarketing) {
      const wait = msUntilMarketingWindow(now())
      if (wait > 0) {
        await store.noteError(notification.id, 'MARKETING_QUIET_HOURS', Math.ceil(wait / 1000))
        continue
      }
    }

    if (!notification.preparedAt) {
      let devices = await store.selectTargetDevices(targetFromRecord(notification), 20_000)
      if (deps.optedOut) {
        const userIds = devices.map((device) => device.userId).filter((id): id is string => !!id)
        const off = userIds.length ? await deps.optedOut(userIds) : new Set<string>()
        if (off.size) devices = devices.filter((device) => !device.userId || !off.has(device.userId))
      }
      if (notification.isMarketing) {
        const userIds = devices.map((device) => device.userId).filter((id): id is string => !!id)
        const consented = deps.marketingConsented && userIds.length ? await deps.marketingConsented(userIds) : new Set<string>()
        devices = devices.filter((device) => !!device.userId && consented.has(device.userId))
      }
      await store.insertDeliveries(notification.id, devices)
      await store.markPrepared(notification.id)
      await store.refreshCounts(notification.id)
      if (!devices.length) {
        await store.finishNotification(notification.id, 'failed', 'NO_TARGET_DEVICES')
        outcome.finished += 1
        continue
      }
    }

    if (!token) {
      try { token = await getToken() }
      catch (cause) {
        // 인증이 안 되면 이 실행에서는 아무것도 못 보낸다. 사유를 남기고 1분 뒤 다시 잡게 둔다.
        const message = cause instanceof Error ? cause.message : 'PUSH_AUTH_FAILED'
        await store.noteError(notification.id, message, 60).catch(() => undefined)
        outcome.error = message
        return outcome
      }
    }

    let bailed = false
    let stopped = false
    while (now() < deadline - 5_000) {
      // 보내는 도중 관리자가 취소했으면 남은 기기에는 보내지 않는다.
      const current = await store.getNotification(notification.id)
      if (current?.status !== 'sending') { stopped = true; break }
      const pending = await store.nextPendingDeliveries(notification.id, BATCH)
      if (!pending.length) break
      let retryable = 0
      let authFailure: string | null = null
      for (let i = 0; i < pending.length; i += CONCURRENCY) {
        await Promise.all(pending.slice(i, i + CONCURRENCY).map(async (delivery) => {
          const attempts = delivery.attempts + 1
          if (!delivery.token || !delivery.active) {
            await store.updateDelivery(delivery.id, { status: 'failed', attempts, errorCode: 'DEVICE_INACTIVE' })
            outcome.failed += 1
            return
          }
          const text = deliveredText(notification)
          const result = await send({
            token: delivery.token, title: text.title, body: text.body, deepLink: notification.deepLink,
            notificationId: notification.id, deliveryId: delivery.id,
          })
          if (result.ok) {
            await store.updateDelivery(delivery.id, { status: 'sent', attempts, sentAt: new Date(now()).toISOString() })
            outcome.sent += 1
            return
          }
          if (result.kind === 'auth') { authFailure = result.code; return }
          if (result.kind === 'retryable' && attempts < MAX_ATTEMPTS) {
            retryable += 1
            await store.updateDelivery(delivery.id, { status: 'pending', attempts, errorCode: result.code, errorMessage: result.message })
            return
          }
          await store.updateDelivery(delivery.id, { status: 'failed', attempts, errorCode: result.code, errorMessage: result.message })
          if (result.kind === 'permanent' && delivery.deviceId) await store.deactivateDevice(delivery.deviceId, result.code)
          outcome.failed += 1
        }))
        if (authFailure) break
      }
      await store.refreshCounts(notification.id)
      if (authFailure) {
        // 토큰이 만료됐거나 권한이 빠졌다. 기기 탓이 아니므로 남은 목록은 그대로 둔다.
        token = null
        await store.noteError(notification.id, `FCM_AUTH_${authFailure}`, 60).catch(() => undefined)
        outcome.error = `FCM_AUTH_${authFailure}`
        return outcome
      }
      if (retryable > pending.length * RETRYABLE_BAIL_RATIO) {
        await store.noteError(notification.id, 'FCM_RETRYABLE_ERRORS', 60).catch(() => undefined)
        bailed = true
        break
      }
      await store.extendLease(notification.id, LEASE_SECONDS)
    }
    if (bailed) continue
    if (stopped) { outcome.finished += 1; continue }

    const left = await store.nextPendingDeliveries(notification.id, 1)
    if (left.length) continue // 시간이 다 됐다. lease 가 풀리면 다음 실행이 잇는다.
    const fresh = await store.getNotification(notification.id)
    const allFailed = fresh !== null && fresh.totalCount > 0 && fresh.successCount === 0
    await store.finishNotification(notification.id, allFailed ? 'failed' : 'sent', allFailed ? 'ALL_DELIVERIES_FAILED' : null)
    outcome.finished += 1
  }
  return outcome
}
