import { randomUUID } from 'node:crypto'
import { Router, type Request, type Response } from 'express'
import { opsBase, opsHeaders, opsStoreAvailable } from '../admin/ops-queue.js'

/**
 * 카카오톡 채널 메시지 문구 보관함.
 *
 * 파트너센터 채널 메시지에는 공개 발송 API가 없다(2026-10-02 확인). 그래서 어드민은
 * 문구를 쓰고 미리 보고, "파트너센터에서 발송"을 누르면 문구를 복사하고 파트너센터를 연다.
 * 운영자가 거기서 보낸 뒤 "발송 완료"로 표시한다. 자동 발송을 하려면 딜러사 API(브랜드
 * 메시지, 유료)를 붙여야 하고, 그때는 send_mode='api' 로 같은 표를 쓴다.
 *
 * 표: supabase/migrations/20261002190000_kakao_channel_messages.sql
 */

export class KakaoChannelError extends Error {
  constructor(public readonly code: string, public readonly status = 422) { super(code) }
}

export const KAKAO_BODY_LIMIT = 1000
export const KAKAO_BUTTON_LABEL_LIMIT = 14
export type KakaoMessageStatus = 'draft' | 'opened' | 'sent' | 'archived'

export interface KakaoMessageInput { title: string; body: string; isAd: boolean; imageUrl: string | null; buttonLabel: string | null; buttonUrl: string | null }
export interface KakaoMessageRecord extends KakaoMessageInput {
  id: string; status: KakaoMessageStatus; sendMode: 'manual' | 'api'; sentCount: number | null
  openedAt: string | null; sentAt: string | null; createdBy: string; sentBy: string | null; createdAt: string; updatedAt: string
}
export interface KakaoChannelSettings { channelName: string | null; partnerCenterUrl: string | null; updatedAt: string | null }

export const KAKAO_ERROR_MESSAGES: Record<string, string> = {
  KAKAO_TITLE_REQUIRED: '목록에서 구분할 이름을 입력해 주세요.',
  KAKAO_BODY_REQUIRED: '메시지 본문을 입력해 주세요.',
  KAKAO_BODY_TOO_LONG: `본문은 ${KAKAO_BODY_LIMIT}자 이하로 써 주세요.`,
  KAKAO_IMAGE_INVALID: '이미지 주소는 https:// 로 시작해야 합니다.',
  KAKAO_BUTTON_INVALID: `버튼은 이름(${KAKAO_BUTTON_LABEL_LIMIT}자 이하)과 https:// 링크를 함께 넣어 주세요.`,
  KAKAO_SETTINGS_URL_INVALID: '파트너센터 주소는 https://...kakao.com/ 으로 시작해야 합니다.',
  KAKAO_COUNT_INVALID: '발송 수는 0 이상의 숫자로 넣어 주세요.',
  KAKAO_NOT_FOUND: '해당 메시지를 찾지 못했습니다.',
  KAKAO_STORE_UNAVAILABLE: '카카오 채널 저장소에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.',
}

const clean = (value: unknown, keepNewlines = false): string => {
  if (typeof value !== 'string') return ''
  return (keepNewlines ? value.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '') : value.replace(/[\u0000-\u001F\u007F]/g, ' ')).trim()
}
const httpsUrl = (value: unknown): string | null => {
  const text = clean(value)
  if (!text) return null
  try { const url = new URL(text); return url.protocol === 'https:' && text.length <= 500 ? url.toString() : '' } catch { return '' }
}

export function parseKakaoMessage(value: unknown): KakaoMessageInput {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const title = clean(raw.title).slice(0, 100)
  const body = clean(raw.body, true)
  if (!title) throw new KakaoChannelError('KAKAO_TITLE_REQUIRED')
  if (!body) throw new KakaoChannelError('KAKAO_BODY_REQUIRED')
  if (body.length > KAKAO_BODY_LIMIT) throw new KakaoChannelError('KAKAO_BODY_TOO_LONG')
  const imageUrl = httpsUrl(raw.imageUrl)
  if (imageUrl === '') throw new KakaoChannelError('KAKAO_IMAGE_INVALID')
  const buttonLabel = clean(raw.buttonLabel) || null
  const buttonUrl = httpsUrl(raw.buttonUrl)
  if (buttonUrl === '' || Boolean(buttonLabel) !== Boolean(buttonUrl) || (buttonLabel && buttonLabel.length > KAKAO_BUTTON_LABEL_LIMIT)) throw new KakaoChannelError('KAKAO_BUTTON_INVALID')
  return { title, body, isAd: raw.isAd !== false, imageUrl, buttonLabel, buttonUrl }
}

/** 파트너센터·카카오 비즈니스 도메인만 연다. 어드민이 엉뚱한 곳으로 문구를 들고 가지 않게. */
export function parsePartnerCenterUrl(value: unknown): string | null {
  const text = clean(value)
  if (!text) return null
  try {
    const url = new URL(text)
    if (url.protocol !== 'https:' || !/(^|\.)kakao\.com$/.test(url.hostname) || text.length > 500) throw new Error('bad')
    return url.toString()
  } catch { throw new KakaoChannelError('KAKAO_SETTINGS_URL_INVALID') }
}

/**
 * 파트너센터 붙여 넣기용 본문. 광고성이면 맨 앞에 (광고)를 붙인다. 파트너센터에서 "광고"를
 * 고르면 표기가 자동으로 붙기도 하지만, 복사본이 다른 곳에 쓰여도 법적 표기가 빠지지 않게
 * 여기서도 붙인다. 이미 붙어 있으면 두 번 붙이지 않는다.
 */
export function kakaoPasteText(message: Pick<KakaoMessageInput, 'body' | 'isAd'>): string {
  if (!message.isAd || /^\(광고\)/.test(message.body)) return message.body
  return `(광고) ${message.body}`
}

export interface KakaoStore {
  list(limit: number): Promise<KakaoMessageRecord[]>
  get(id: string): Promise<KakaoMessageRecord | null>
  create(input: KakaoMessageInput, actor: string): Promise<KakaoMessageRecord>
  update(id: string, patch: Partial<{ status: KakaoMessageStatus; sentCount: number | null; openedAt: string; sentAt: string; sentBy: string } & KakaoMessageInput>): Promise<KakaoMessageRecord | null>
  settings(): Promise<KakaoChannelSettings>
  saveSettings(settings: { channelName: string | null; partnerCenterUrl: string | null }, actor: string): Promise<KakaoChannelSettings>
}

type Row = Record<string, unknown>
const str = (value: unknown): string | null => (typeof value === 'string' && value ? value : null)
function toRecord(row: Row): KakaoMessageRecord {
  return {
    id: String(row.id), title: String(row.title ?? ''), body: String(row.body ?? ''), isAd: row.is_ad !== false,
    imageUrl: str(row.image_url), buttonLabel: str(row.button_label), buttonUrl: str(row.button_url),
    status: String(row.status) as KakaoMessageStatus, sendMode: row.send_mode === 'api' ? 'api' : 'manual',
    sentCount: typeof row.sent_count === 'number' ? row.sent_count : null,
    openedAt: str(row.opened_at), sentAt: str(row.sent_at), createdBy: String(row.created_by ?? ''), sentBy: str(row.sent_by),
    createdAt: String(row.created_at ?? ''), updatedAt: String(row.updated_at ?? ''),
  }
}
const toRow = (patch: Record<string, unknown>): Row => {
  const map: Record<string, string> = { title: 'title', body: 'body', isAd: 'is_ad', imageUrl: 'image_url', buttonLabel: 'button_label', buttonUrl: 'button_url', status: 'status', sentCount: 'sent_count', openedAt: 'opened_at', sentAt: 'sent_at', sentBy: 'sent_by' }
  const row: Row = { updated_at: new Date().toISOString() }
  for (const [key, value] of Object.entries(patch)) if (map[key] && value !== undefined) row[map[key]] = value
  return row
}

export function restKakaoStore(): KakaoStore {
  const table = (name: string) => new URL(`${opsBase()}/rest/v1/${name}`)
  async function rows(url: URL, init: RequestInit = {}): Promise<Row[]> {
    const response = await fetch(url, { ...init, headers: { ...opsHeaders(), ...(init.headers as Record<string, string> | undefined) }, signal: AbortSignal.timeout(10_000) })
    if (!response.ok) throw new KakaoChannelError('KAKAO_STORE_UNAVAILABLE', 503)
    return await response.json() as Row[]
  }
  const uuid = (id: string) => /^[0-9a-f-]{36}$/i.test(id)
  return {
    async list(limit) { const url = table('kakao_channel_messages'); url.searchParams.set('select', '*'); url.searchParams.set('status', 'neq.archived'); url.searchParams.set('order', 'created_at.desc'); url.searchParams.set('limit', String(limit)); return (await rows(url)).map(toRecord) },
    async get(id) { if (!uuid(id)) return null; const url = table('kakao_channel_messages'); url.searchParams.set('id', `eq.${id}`); url.searchParams.set('select', '*'); const found = await rows(url); return found[0] ? toRecord(found[0]) : null },
    async create(input, actor) {
      const url = table('kakao_channel_messages'); url.searchParams.set('select', '*')
      const found = await rows(url, { method: 'POST', headers: { prefer: 'return=representation' }, body: JSON.stringify({ ...toRow(input as unknown as Record<string, unknown>), created_by: actor }) })
      if (!found[0]) throw new KakaoChannelError('KAKAO_STORE_UNAVAILABLE', 503)
      return toRecord(found[0])
    },
    async update(id, patch) {
      if (!uuid(id)) return null
      const url = table('kakao_channel_messages'); url.searchParams.set('id', `eq.${id}`); url.searchParams.set('select', '*')
      const found = await rows(url, { method: 'PATCH', headers: { prefer: 'return=representation' }, body: JSON.stringify(toRow(patch as Record<string, unknown>)) })
      return found[0] ? toRecord(found[0]) : null
    },
    async settings() {
      const url = table('kakao_channel_settings'); url.searchParams.set('id', 'eq.1'); url.searchParams.set('select', 'channel_name,partner_center_url,updated_at')
      const row = (await rows(url))[0] ?? {}
      return { channelName: str(row.channel_name), partnerCenterUrl: str(row.partner_center_url), updatedAt: str(row.updated_at) }
    },
    async saveSettings(settings, actor) {
      const url = table('kakao_channel_settings'); url.searchParams.set('id', 'eq.1'); url.searchParams.set('select', 'channel_name,partner_center_url,updated_at')
      const row = (await rows(url, { method: 'PATCH', headers: { prefer: 'return=representation' }, body: JSON.stringify({ channel_name: settings.channelName, partner_center_url: settings.partnerCenterUrl, updated_by: actor, updated_at: new Date().toISOString() }) }))[0] ?? {}
      return { channelName: str(row.channel_name), partnerCenterUrl: str(row.partner_center_url), updatedAt: str(row.updated_at) }
    },
  }
}

export function createMemoryKakaoStore(): KakaoStore {
  const items: KakaoMessageRecord[] = []
  let settings: KakaoChannelSettings = { channelName: null, partnerCenterUrl: null, updatedAt: null }
  return {
    async list(limit) { return items.filter((item) => item.status !== 'archived').slice(0, limit).map((item) => ({ ...item })) },
    async get(id) { const item = items.find((entry) => entry.id === id); return item ? { ...item } : null },
    async create(input, actor) {
      const now = new Date().toISOString()
      const item: KakaoMessageRecord = { ...input, id: randomUUID(), status: 'draft', sendMode: 'manual', sentCount: null, openedAt: null, sentAt: null, createdBy: actor, sentBy: null, createdAt: now, updatedAt: now }
      items.unshift(item); return { ...item }
    },
    async update(id, patch) { const item = items.find((entry) => entry.id === id); if (!item) return null; Object.assign(item, Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)), { updatedAt: new Date().toISOString() }); return { ...item } },
    async settings() { return { ...settings } },
    async saveSettings(next) { settings = { ...next, updatedAt: new Date().toISOString() }; return { ...settings } },
  }
}

export function kakaoFailure(res: Response, error: unknown): void {
  const code = error instanceof KakaoChannelError ? error.code : 'KAKAO_STORE_UNAVAILABLE'
  res.status(error instanceof KakaoChannelError ? error.status : 503).json({ code, error: KAKAO_ERROR_MESSAGES[code] ?? '카카오 채널 메시지를 처리하지 못했습니다.' })
}

interface Deps {
  staff(req: Request, res: Response, scope: string): Promise<{ email: string } | null | undefined>
  audit?(actor: string, action: string, targetId: string): Promise<void>
  store?: () => KakaoStore
}

/** /api/admin/v1/kakao-channel. 조회 content:read, 작성·발송 표시·설정 content:publish(푸시·팝업과 같은 권한). */
export function adminKakaoChannelRouter(deps: Deps): Router {
  const router = Router()
  const store = deps.store ?? (() => { if (!opsStoreAvailable()) throw new KakaoChannelError('KAKAO_STORE_UNAVAILABLE', 503); return restKakaoStore() })
  const audit = (actor: string, action: string, id: string) => deps.audit?.(actor, action, id).catch(() => undefined)

  router.get('/', async (req, res) => {
    if (!await deps.staff(req, res, 'content:read')) return
    try { const [items, settings] = await Promise.all([store().list(50), store().settings()]); res.json({ items, settings }) } catch (error) { kakaoFailure(res, error) }
  })
  router.post('/settings', async (req, res) => {
    const staff = await deps.staff(req, res, 'content:publish'); if (!staff) return
    try {
      const body = (req.body ?? {}) as Record<string, unknown>
      const settings = await store().saveSettings({ channelName: clean(body.channelName).slice(0, 40) || null, partnerCenterUrl: parsePartnerCenterUrl(body.partnerCenterUrl) }, staff.email)
      await audit(staff.email, 'kakao_channel.settings', 'settings'); res.json({ settings })
    } catch (error) { kakaoFailure(res, error) }
  })
  router.post('/', async (req, res) => {
    const staff = await deps.staff(req, res, 'content:publish'); if (!staff) return
    try { const item = await store().create(parseKakaoMessage(req.body), staff.email); await audit(staff.email, 'kakao_channel.create', item.id); res.status(201).json({ item, pasteText: kakaoPasteText(item) }) }
    catch (error) { kakaoFailure(res, error) }
  })
  // 발송 버튼: 복사하고 파트너센터를 연 시각을 남긴다. 실제 발송은 파트너센터에서 일어난다.
  router.post('/:id/opened', async (req, res) => {
    const staff = await deps.staff(req, res, 'content:publish'); if (!staff) return
    try {
      const current = await store().get(req.params.id); if (!current) throw new KakaoChannelError('KAKAO_NOT_FOUND', 404)
      const item = current.status === 'sent' ? current : await store().update(current.id, { status: 'opened', openedAt: new Date().toISOString() })
      res.json({ item, pasteText: kakaoPasteText(current) })
    } catch (error) { kakaoFailure(res, error) }
  })
  router.post('/:id/sent', async (req, res) => {
    const staff = await deps.staff(req, res, 'content:publish'); if (!staff) return
    try {
      const raw = (req.body ?? {}) as Record<string, unknown>
      const count = raw.sentCount === '' || raw.sentCount === null || raw.sentCount === undefined ? null : Number(raw.sentCount)
      if (count !== null && (!Number.isInteger(count) || count < 0)) throw new KakaoChannelError('KAKAO_COUNT_INVALID')
      const item = await store().update(req.params.id, { status: 'sent', sentAt: new Date().toISOString(), sentBy: staff.email, sentCount: count })
      if (!item) throw new KakaoChannelError('KAKAO_NOT_FOUND', 404)
      await audit(staff.email, 'kakao_channel.sent', item.id); res.json({ item })
    } catch (error) { kakaoFailure(res, error) }
  })
  router.post('/:id/archive', async (req, res) => {
    const staff = await deps.staff(req, res, 'content:publish'); if (!staff) return
    try { const item = await store().update(req.params.id, { status: 'archived' }); if (!item) throw new KakaoChannelError('KAKAO_NOT_FOUND', 404); await audit(staff.email, 'kakao_channel.archive', item.id); res.json({ item }) }
    catch (error) { kakaoFailure(res, error) }
  })
  return router
}
