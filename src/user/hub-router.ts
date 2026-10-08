import { Router, type Request, type Response } from 'express'
import { listMemberNotices } from '../admin/content-store.js'
import type { ReportOwner } from '../report/report-store.js'
import {
  HubError,
  INQUIRY_CATEGORIES,
  createInquiry,
  getNotificationPrefs,
  listInquiries,
  parseInquiry,
  updateNotificationPrefs,
} from './hub-store.js'

/** 마이페이지 회원 기능 API(2026-10). 저장 규칙은 hub-store.ts. */

const MESSAGES: Record<string, string> = {
  HUB_NOT_READY: '이 기능은 준비 중입니다. 곧 열립니다.',
  HUB_STORE_UNAVAILABLE: '지금은 이 기능을 쓸 수 없습니다. 잠시 뒤 다시 시도해 주세요.',
  HUB_STORE_FAILED: '저장소와 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.',
  INQUIRY_CATEGORY_REQUIRED: '문의 종류를 골라 주세요.',
  INQUIRY_TEXT_INVALID: '문의 내용을 10자 이상 2,000자 이하로 적어 주세요.',
  INQUIRY_LIMIT: '확인 중인 문의가 많습니다. 답변을 받은 뒤 다시 문의해 주세요.',
}

export function hubFailure(res: Response, error: unknown): void {
  if (error instanceof HubError) {
    res.status(error.status).json({ code: error.code, error: MESSAGES[error.code] ?? '요청을 처리하지 못했습니다.' })
    return
  }
  // 지원 저장소(support-store)는 자기 오류 이름을 던진다. 회원에게는 같은 안내로 보인다.
  if (error instanceof Error && /^SUPPORT_/.test(error.message)) {
    res.status(503).json({ code: 'HUB_STORE_FAILED', error: MESSAGES.HUB_STORE_FAILED })
    return
  }
  res.status(500).json({ error: '요청을 처리하지 못했습니다.' })
}

export function memberHubRouter(deps: { authenticate: (req: Request, res: Response) => Promise<ReportOwner | null> }): Router {
  const router = Router()

  router.get('/user/notification-prefs', async (req, res) => {
    const owner = await deps.authenticate(req, res); if (!owner) return
    try { res.json({ prefs: await getNotificationPrefs(owner.id) }) } catch (error) { hubFailure(res, error) }
  })

  router.put('/user/notification-prefs', async (req, res) => {
    const owner = await deps.authenticate(req, res); if (!owner) return
    try { res.json({ prefs: await updateNotificationPrefs(owner.id, req.body) }) } catch (error) { hubFailure(res, error) }
  })

  router.get('/user/inquiries', async (req, res) => {
    const owner = await deps.authenticate(req, res); if (!owner) return
    try { res.json({ inquiries: await listInquiries(owner.id), categories: INQUIRY_CATEGORIES }) } catch (error) { hubFailure(res, error) }
  })

  router.post('/user/inquiries', async (req, res) => {
    const owner = await deps.authenticate(req, res); if (!owner) return
    try {
      await createInquiry({ id: owner.id, email: owner.email }, parseInquiry(req.body))
      res.status(201).json({ inquiries: await listInquiries(owner.id) })
    } catch (error) { hubFailure(res, error) }
  })

  // 공지는 로그인 없이 본다.
  router.get('/notices', async (_req, res) => {
    try { res.json({ notices: await listMemberNotices() }) } catch { res.json({ notices: [] }) }
  })

  return router
}
