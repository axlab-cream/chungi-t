import { Router, type Request, type Response } from 'express'
import { PUSH_ERROR_MESSAGES, PushError, isUuid, normalizeDeepLink, parseDevice, parseDraft, parseTarget, targetLabel } from './contracts.js'
import { runPushDispatcher } from './dispatcher.js'
import { pushStore, type PushStore } from './store.js'

type Staff = { email: string }
interface Deps {
  /** 로그인 사용자면 id, 아니면 null. 응답을 쓰지 않는다 — 비로그인도 기기를 등록한다. */
  optionalUser(req: Request): Promise<{ id: string } | null>
  staff(req: Request, res: Response, scope: string): Promise<Staff | null | undefined>
  /** admin_audit_events 에 남긴다. 실패해도 발송을 되돌리지 않는다. */
  audit?(actor: string, action: string, targetId: string): Promise<void>
  store?: () => PushStore
  /** "지금 발송"에서 응답 전에 보내 보는 시간. 남은 기기는 매분 cron 이 잇는다. */
  immediateBudgetMs?: number
}

export function pushFailure(res: Response, error: unknown): void {
  const code = error instanceof PushError ? error.code : 'PUSH_STORE_UNAVAILABLE'
  const status = error instanceof PushError ? error.status : 503
  res.status(status).json({ code, error: PUSH_ERROR_MESSAGES[code] ?? '푸시를 처리하지 못했습니다.' })
}

/** 앱(umsh-push.js)과 셸(MainActivity)이 부르는 공개 경로. */
export function pushRouter(deps: Deps): Router {
  const router = Router()
  const store = deps.store ?? pushStore

  // 앱이 열릴 때마다 부른다. 같은 토큰은 한 행만 남고 last_active_at 이 갱신된다.
  // 로그인 상태가 아니면 user_id 를 비운다 — 로그아웃한 기기로 개인 알림이 가지 않게.
  router.post('/devices', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    try {
      const user = await deps.optionalUser(req).catch(() => null)
      const device = parseDevice(req.body, user?.id ?? null)
      const saved = await store().upsertDevice(device)
      res.json({ deviceId: saved.id, linked: Boolean(user) })
    } catch (error) { pushFailure(res, error) }
  })

  /*
   * 알림을 누르면 셸이 이 주소를 연다. 클릭을 기록하고 목적지로 보낸다. 기록이 실패해도
   * 사용자는 목적지로 가야 한다. 목적지는 다시 검증한다 — 셸을 거치지 않고 이 주소를
   * 직접 열어 외부로 튕기는 통로(open redirect)가 되면 안 된다.
   */
  router.get('/open', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    const target = normalizeDeepLink(typeof req.query.to === 'string' ? req.query.to : '/') ?? '/'
    const notificationId = typeof req.query.n === 'string' ? req.query.n : ''
    const deliveryId = typeof req.query.d === 'string' ? req.query.d : ''
    if (isUuid(notificationId) && /^\d{1,18}$/.test(deliveryId)) {
      await store().recordOpen(notificationId, deliveryId).catch(() => false)
    }
    res.redirect(302, target)
  })

  return router
}

/** /api/admin/v1/push. 조회는 content:read, 발송·예약·취소는 content:publish(팝업 게시와 같은 권한). */
export function adminPushRouter(deps: Deps): Router {
  const router = Router()
  const store = deps.store ?? pushStore
  const audit = async (actor: string, action: string, targetId: string) => {
    await deps.audit?.(actor, action, targetId).catch(() => undefined)
  }

  router.get('/', async (req, res) => {
    if (!await deps.staff(req, res, 'content:read')) return
    const limit = Math.min(Math.max(Number(req.query.limit ?? 20) || 20, 1), 100)
    const offset = Math.max(Number(req.query.offset ?? 0) || 0, 0)
    try { res.json({ ...await store().listNotifications(limit, offset), limit, offset, asOf: new Date().toISOString() }) }
    catch (error) { pushFailure(res, error) }
  })

  router.post('/audience', async (req, res) => {
    if (!await deps.staff(req, res, 'content:read')) return
    try {
      const target = parseTarget((req.body as { target?: unknown })?.target)
      res.json({ count: await store().countTargetDevices(target), label: targetLabel(target) })
    } catch (error) { pushFailure(res, error) }
  })

  router.get('/users', async (req, res) => {
    if (!await deps.staff(req, res, 'members:read')) return
    try { res.json({ users: await store().searchUsers(typeof req.query.q === 'string' ? req.query.q : '') }) }
    catch (error) { pushFailure(res, error) }
  })

  router.get('/:id', async (req, res) => {
    if (!await deps.staff(req, res, 'content:read')) return
    try {
      const item = await store().getNotification(req.params.id)
      if (!item) throw new PushError('PUSH_NOT_FOUND', 404)
      res.json({ item, failures: item.failureCount ? await store().failureSummary(item.id) : {} })
    } catch (error) { pushFailure(res, error) }
  })

  router.post('/', async (req, res) => {
    const staff = await deps.staff(req, res, 'content:publish')
    if (!staff) return
    try {
      const draft = parseDraft(req.body)
      const created = await store().createNotification(draft, staff.email)
      await audit(staff.email, `push.${draft.schedule.mode}`, created.id)
      if (draft.schedule.mode === 'now') {
        // 대상이 적으면 응답 전에 끝난다. 남으면 매분 cron 이 이어 보낸다.
        await runPushDispatcher({ store: store() }, deps.immediateBudgetMs ?? 20_000).catch(() => undefined)
      }
      res.status(201).json({ item: await store().getNotification(created.id) ?? created })
    } catch (error) { pushFailure(res, error) }
  })

  router.post('/:id/cancel', async (req, res) => {
    const staff = await deps.staff(req, res, 'content:publish')
    if (!staff) return
    try {
      const item = await store().cancelNotification(req.params.id, staff.email)
      if (!item) throw new PushError('PUSH_NOT_CANCELLABLE', 409)
      await audit(staff.email, 'push.cancel', item.id)
      res.json({ item })
    } catch (error) { pushFailure(res, error) }
  })

  return router
}
