import type { Request as ExpressRequest, Response as ExpressResponse } from 'express'
import { createHash, randomBytes } from 'node:crypto'
import { opsBase, opsHeaders } from '../admin/ops-queue.js'
import type { KakaoBirthDraft } from './chat-store.js'

/**
 * 카카오 챗봇 손님 ↔ 운명상회 회원 연결(2026-10-16).
 *
 * - 방법 1(직접): 결과 카드의 [보관함에 저장하기] → umsh.kr/kakao/link#t=일회용토큰 → 로그인 → POST /api/kakao/link.
 * - 방법 2(카카오 자동): 스킬 요청의 appUserId(카카오 로그인 회원 번호)로 회원을 찾고, 천명이 먼저 묻고 [남겨 줘]일 때만 잇는다.
 * 손님은 user_key(botUserKey 의 sha256)로만 가리킨다. 원본 botUserKey·appUserId·토큰 원문은 저장하지 않는다.
 * 표 구조는 supabase/migrations/20261016120000_kakao_member_links.sql.
 */

export const LINK_TOKEN_TTL_MS = 10 * 60 * 1000
export const AUTO_LINK_DECLINE_MS = 30 * 24 * 60 * 60 * 1000

/** 연결 직후 보관함에 남길, 손님이 카톡에서 마지막으로 본 결과. */
export interface KakaoLastResult { kind: 'cmdg' | 'today'; birth: KakaoBirthDraft; at: number }
export interface KakaoLinkMeta { autoLinkAskedAt: number | null; autoLinkDeclinedAt: number | null; lastResult: KakaoLastResult | null }

export interface KakaoLinkStore {
  linkedMember(userKey: string): Promise<string | null>
  memberByAppUser(appUserId: string): Promise<string | null>
  link(userKey: string, userId: string, via: 'link' | 'kakao_auto'): Promise<void>
  /** 이어져 있었으면 true. */
  unlink(userKey: string): Promise<boolean>
  createToken(userKey: string, tokenHash: string, expiresAt: Date): Promise<void>
  /** 만료·재사용이면 null, 아니면 손님 user_key. 사용 표시와 연결을 한 번에 한다. */
  consumeToken(tokenHash: string, userId: string, now: Date): Promise<string | null>
  meta(userKey: string): Promise<KakaoLinkMeta>
  setMeta(userKey: string, patch: Partial<KakaoLinkMeta>): Promise<void>
}

/** 사이트가 저장할 때 쓰는 경로(천명사주 미리보기·오늘의 운)로 회원 보관함에 넣는다. app.ts 가 주입한다. */
export type KakaoVaultSaver = (userId: string, result: KakaoLastResult) => Promise<void>

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export function newLinkToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url')
  return { token, hash: sha256Hex(token) }
}

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

/* ─────────────────────────── 저장소 ─────────────────────────── */

const EMPTY_META: KakaoLinkMeta = { autoLinkAskedAt: null, autoLinkDeclinedAt: null, lastResult: null }

export function memoryKakaoLinkStore(members: Record<string, string> = {}) {
  const links = new Map<string, { userId: string; via: 'link' | 'kakao_auto' }>()
  const tokens = new Map<string, { userKey: string; expiresAt: number; usedAt: number | null }>()
  const metas = new Map<string, KakaoLinkMeta>()
  const store: KakaoLinkStore = {
    async linkedMember(userKey) { return links.get(userKey)?.userId ?? null },
    async memberByAppUser(appUserId) { return members[appUserId] ?? null },
    async link(userKey, userId, via) { links.set(userKey, { userId, via }) },
    async unlink(userKey) { return links.delete(userKey) },
    async createToken(userKey, tokenHash, expiresAt) { tokens.set(tokenHash, { userKey, expiresAt: expiresAt.getTime(), usedAt: null }) },
    async consumeToken(tokenHash, userId, now) {
      const found = tokens.get(tokenHash)
      if (!found || found.usedAt !== null || found.expiresAt <= now.getTime()) return null
      found.usedAt = now.getTime()
      links.set(found.userKey, { userId, via: 'link' })
      return found.userKey
    },
    async meta(userKey) { return structuredClone(metas.get(userKey) ?? EMPTY_META) },
    async setMeta(userKey, patch) { metas.set(userKey, { ...(metas.get(userKey) ?? EMPTY_META), ...structuredClone(patch) }) },
  }
  return { ...store, links, tokens, metas }
}

export function restKakaoLinkStore(provider: () => string = () => 'kakao'): KakaoLinkStore {
  async function call(path: string, init: RequestInit = {}): Promise<Response> {
    const response = await fetch(`${opsBase()}/rest/v1/${path}`, {
      ...init,
      headers: { ...opsHeaders(), ...(init.headers as Record<string, string> | undefined) },
      signal: AbortSignal.timeout(5_000),
    })
    if (!response.ok) throw new Error('KAKAO_LINK_STORE_UNAVAILABLE')
    return response
  }
  const key = (userKey: string) => encodeURIComponent(userKey)
  const uuidOrNull = (value: unknown) => (typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value) ? value : null)
  const ms = (value: unknown) => (typeof value === 'string' && Number.isFinite(Date.parse(value)) ? Date.parse(value) : null)
  const iso = (value: number | null | undefined) => (typeof value === 'number' ? new Date(value).toISOString() : null)
  return {
    async linkedMember(userKey) {
      const rows = await (await call(`kakao_member_links?user_key=eq.${key(userKey)}&select=user_id`)).json() as Array<{ user_id?: unknown }>
      return uuidOrNull(rows[0]?.user_id)
    },
    async memberByAppUser(appUserId) {
      const response = await call('rpc/kakao_member_by_app_user', { method: 'POST', body: JSON.stringify({ p_provider: provider(), p_app_user_id: appUserId }) })
      return uuidOrNull(await response.json())
    },
    async link(userKey, userId, via) {
      await call('kakao_member_links?on_conflict=user_key', {
        method: 'POST',
        headers: { prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ user_key: userKey, user_id: userId, linked_via: via, created_at: new Date().toISOString() }),
      })
    },
    async unlink(userKey) {
      const rows = await (await call(`kakao_member_links?user_key=eq.${key(userKey)}`, { method: 'DELETE', headers: { prefer: 'return=representation' } })).json() as unknown[]
      return rows.length > 0
    },
    async createToken(userKey, tokenHash, expiresAt) {
      await call('kakao_link_tokens', { method: 'POST', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ token_hash: tokenHash, user_key: userKey, expires_at: expiresAt.toISOString() }) })
    },
    async consumeToken(tokenHash, userId) {
      const value = await (await call('rpc/kakao_link_consume', { method: 'POST', body: JSON.stringify({ p_token_hash: tokenHash, p_user_id: userId }) })).json() as unknown
      return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value) ? value : null
    },
    async meta(userKey) {
      const rows = await (await call(`kakao_chat_sessions?user_key=eq.${key(userKey)}&select=auto_link_asked_at,auto_link_declined_at,last_result`)).json() as Array<Record<string, unknown>>
      const row = rows[0]
      if (!row) return { ...EMPTY_META }
      return { autoLinkAskedAt: ms(row.auto_link_asked_at), autoLinkDeclinedAt: ms(row.auto_link_declined_at), lastResult: isLastResult(row.last_result) ? row.last_result : null }
    },
    async setMeta(userKey, patch) {
      const body: Record<string, unknown> = { user_key: userKey, updated_at: new Date().toISOString() }
      if ('autoLinkAskedAt' in patch) body.auto_link_asked_at = iso(patch.autoLinkAskedAt)
      if ('autoLinkDeclinedAt' in patch) body.auto_link_declined_at = iso(patch.autoLinkDeclinedAt)
      if ('lastResult' in patch) body.last_result = patch.lastResult ?? null
      // 보낸 열만 바뀐다(merge-duplicates). 대화 기록·하루 횟수 열은 건드리지 않는다.
      await call('kakao_chat_sessions?on_conflict=user_key', { method: 'POST', headers: { prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(body) })
    },
  }
}

function isLastResult(value: unknown): value is KakaoLastResult {
  const found = value as KakaoLastResult
  return !!found && (found.kind === 'cmdg' || found.kind === 'today') && typeof found.at === 'number'
    && !!found.birth && typeof found.birth.year === 'number' && typeof found.birth.month === 'number' && typeof found.birth.day === 'number'
}

/* ─────────────────────────── 연결 API ─────────────────────────── */

export interface KakaoLinkApiDeps {
  links: KakaoLinkStore
  vault: KakaoVaultSaver
  /** SNS 로그인 회원만 통과시킨다(비회원·비로그인은 여기서 401 응답을 보내고 null). app.ts requireMemberUser. */
  member: (req: ExpressRequest, res: ExpressResponse) => Promise<{ id: string } | null>
  now?: () => Date
}

/** POST /api/kakao/link { token } — 로그인한 회원과 카톡 손님을 잇고, 카톡에서 마지막으로 본 결과를 보관함에 남긴다. */
export function kakaoLinkHandler(deps: KakaoLinkApiDeps) {
  const now = deps.now ?? (() => new Date())
  return async (req: ExpressRequest, res: ExpressResponse) => {
    res.setHeader('Cache-Control', 'no-store')
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : ''
    if (!TOKEN_PATTERN.test(token)) { res.status(400).json({ code: 'LINK_INVALID', error: '연결 주소가 올바르지 않습니다. 카카오톡에서 버튼을 다시 눌러 주세요.' }); return }
    const owner = await deps.member(req, res)
    if (!owner) return
    let userKey: string | null
    try {
      userKey = await deps.links.consumeToken(sha256Hex(token), owner.id, now())
    } catch {
      res.status(503).json({ code: 'LINK_UNAVAILABLE', error: '지금은 연결할 수 없습니다. 잠시 뒤 다시 시도해 주세요.' })
      return
    }
    if (!userKey) { res.status(410).json({ code: 'LINK_EXPIRED', error: '연결 주소가 만료됐거나 이미 사용됐습니다. 카카오톡에서 버튼을 다시 눌러 주세요.' }); return }
    let saved = false
    try {
      const meta = await deps.links.meta(userKey)
      if (meta.lastResult) { await deps.vault(owner.id, meta.lastResult); saved = true }
      // 직접 연결했으니 자동 연결 질문 기록은 지운다.
      await deps.links.setMeta(userKey, { autoLinkAskedAt: null, autoLinkDeclinedAt: null })
    } catch {
      console.warn('[kakao-link]', JSON.stringify({ vault: 'save_failed' }))
    }
    res.json({ ok: true, saved })
  }
}
