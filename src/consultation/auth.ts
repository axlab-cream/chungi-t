import type { Request, Response } from 'express'
import type { ReportOwner } from '../report/report-store.js'

/** Same Supabase identity as 운명상회; AI Talk POC anonymous accounts are not members. */
export async function authenticateConsultation(req: Request, res: Response): Promise<ReportOwner | null> {
  const token = /^Bearer\s+(\S+)$/i.exec(req.header('authorization') || '')?.[1]
  if (!token) { res.status(401).json({ code: 'AUTH_REQUIRED', error: '회원가입 또는 로그인 후 상담할 수 있습니다.' }); return null }
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
  if (!url || !key) { res.status(503).json({ code: 'AUTH_UNAVAILABLE', error: '회원 인증 설정을 확인하고 있습니다.' }); return null }
  try {
    const response = await fetch(`${url.replace(/\/$/, '')}/auth/v1/user`, {
      headers: { apikey: key, authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) {
      res.status(response.status >= 500 ? 503 : 401).json({ code: 'AUTH_REQUIRED', error: '회원 인증을 다시 확인해 주세요.' }); return null
    }
    const user = await response.json() as { id?: string; is_anonymous?: boolean }
    if (!user.id || user.is_anonymous === true) { res.status(401).json({ code: 'MEMBER_REQUIRED', error: '가입한 회원 계정으로 로그인해 주세요.' }); return null }
    return { id: user.id, accessToken: token }
  } catch { res.status(503).json({ code: 'AUTH_UNAVAILABLE', error: '회원 인증에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.' }); return null }
}
