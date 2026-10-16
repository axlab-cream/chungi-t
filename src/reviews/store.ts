import { randomUUID } from 'node:crypto'

/**
 * 상품 후기("다녀간 손님들의 말") 저장소. 2026-10-15.
 * - 결제 주문 1건당 후기 1개(order_id UNIQUE).
 * - 표시용 이름은 저장할 때 이미 성 + "**" 로 가린다. 실명은 저장하지 않는다.
 * - 고객은 이 테이블을 직접 읽지 않는다. 서버가 service_role 로만 읽고 쓴다.
 */
export type ReviewStatus = 'published' | 'hidden'
export interface ProductReview {
  id: string
  ownerId: string
  orderId: string
  reportId: string
  productKey: string
  body: string
  displayName: string
  ilju: string | null
  status: ReviewStatus
  rewardWalletId: string | null
  createdAt: string
}
export type NewProductReview = Omit<ProductReview, 'id' | 'status' | 'rewardWalletId' | 'createdAt'>
export interface ReviewStorage {
  listPublished(productKey: string, limit: number, offset: number): Promise<{ total: number; items: ProductReview[] }>
  findByOrder(orderId: string): Promise<ProductReview | null>
  insert(review: ProductReview): Promise<ProductReview>
  setReward(id: string, walletId: string): Promise<void>
}

export class ReviewError extends Error {
  constructor(public code: string, public status = 400) { super(code); this.name = 'ReviewError' }
}
const fail = (code: string, status = 400): never => { throw new ReviewError(code, status) }

export const REVIEW_BODY_MIN = 20
export const REVIEW_BODY_MAX = 300
const TABLE = 'cheongi_product_reviews'

/** 줄바꿈·공백을 한 칸으로 줄인다. 글자 수는 한글 기준(코드포인트)으로 센다. */
export function normalizeReviewBody(value: unknown): string {
  if (typeof value !== 'string') return fail('REVIEW_BODY_INVALID')
  const body = value.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim()
  const length = Array.from(body).length
  if (length < REVIEW_BODY_MIN) return fail('REVIEW_BODY_TOO_SHORT')
  if (length > REVIEW_BODY_MAX) return fail('REVIEW_BODY_TOO_LONG')
  // 다른 손님에게 그대로 보이는 글이다. 연락처·메일·링크는 받지 않는다.
  if (/01[016789][\s.-]?\d{3,4}[\s.-]?\d{4}/.test(body)) return fail('REVIEW_PERSONAL_INFO')
  if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(body)) return fail('REVIEW_PERSONAL_INFO')
  if (/https?:\/\/|www\./i.test(body)) return fail('REVIEW_LINK_NOT_ALLOWED')
  return body
}

/** 성만 남긴다: "박지현" → "박**". 이름이 없으면 "손님". */
export function maskDisplayName(name: unknown): string {
  const first = typeof name === 'string' ? Array.from(name.trim())[0] : undefined
  if (!first || !/[\p{L}]/u.test(first)) return '손님'
  return `${first}**`
}

let testStorage: ReviewStorage | null = null
export function createMemoryReviewStorageForTests(): ReviewStorage {
  if (process.env.NODE_ENV !== 'test') return fail('REVIEW_TEST_STORAGE_FORBIDDEN', 503)
  const rows: ProductReview[] = []
  return {
    async listPublished(productKey, limit, offset) {
      const matched = rows.filter((r) => r.productKey === productKey && r.status === 'published')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      return { total: matched.length, items: structuredClone(matched.slice(offset, offset + limit)) }
    },
    async findByOrder(orderId) { return structuredClone(rows.find((r) => r.orderId === orderId) ?? null) },
    async insert(review) {
      if (rows.some((r) => r.orderId === review.orderId)) return fail('REVIEW_ALREADY_EXISTS', 409)
      rows.push(structuredClone(review)); return structuredClone(review)
    },
    async setReward(id, walletId) { const row = rows.find((r) => r.id === id); if (row) row.rewardWalletId = walletId },
  }
}
export function configureReviewStorageForTests(adapter: ReviewStorage | null) {
  if (process.env.NODE_ENV !== 'test') return fail('REVIEW_TEST_STORAGE_FORBIDDEN', 503)
  testStorage = adapter
}

type Row = {
  id: string; owner_id: string; order_id: string; report_id: string; product_key: string; body: string
  display_name: string; ilju: string | null; status: ReviewStatus; reward_wallet_id: string | null; created_at: string
}
const fromRow = (r: Row): ProductReview => ({
  id: r.id, ownerId: r.owner_id, orderId: r.order_id, reportId: r.report_id, productKey: r.product_key, body: r.body,
  displayName: r.display_name, ilju: r.ilju, status: r.status, rewardWalletId: r.reward_wallet_id, createdAt: r.created_at,
})
const COLUMNS = 'id,owner_id,order_id,report_id,product_key,body,display_name,ilju,status,reward_wallet_id,created_at'

function restStorage(): ReviewStorage {
  const base = process.env.SUPABASE_URL?.replace(/\/$/, '')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!base || !key) return fail('REVIEW_STORAGE_UNAVAILABLE', 503)
  const headers = (extra: Record<string, string> = {}) => ({
    apikey: key, ...(key.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {}), 'Content-Type': 'application/json', ...extra,
  })
  async function request(path: string, init: RequestInit = {}, extra: Record<string, string> = {}) {
    let response: Response
    try {
      response = await fetch(`${base}/rest/v1/${path}`, { ...init, headers: headers(extra), signal: AbortSignal.timeout(10000) })
    } catch { return fail('REVIEW_STORAGE_UNAVAILABLE', 503) }
    if (response.status === 409) return fail('REVIEW_ALREADY_EXISTS', 409)
    if (!response.ok) return fail('REVIEW_STORAGE_UNAVAILABLE', 503)
    return response
  }
  return {
    async listPublished(productKey, limit, offset) {
      const query = new URLSearchParams({ select: COLUMNS, product_key: `eq.${productKey}`, status: 'eq.published', order: 'created_at.desc', limit: String(limit), offset: String(offset) })
      const response = await request(`${TABLE}?${query}`, {}, { Prefer: 'count=exact' })
      const rows = await response.json() as Row[]
      const total = Number((response.headers.get('content-range') || '').split('/')[1])
      return { total: Number.isFinite(total) ? total : rows.length, items: rows.map(fromRow) }
    },
    async findByOrder(orderId) {
      const query = new URLSearchParams({ select: COLUMNS, order_id: `eq.${orderId}`, limit: '1' })
      const rows = await (await request(`${TABLE}?${query}`)).json() as Row[]
      return rows[0] ? fromRow(rows[0]) : null
    },
    async insert(review) {
      const row = {
        id: review.id, owner_id: review.ownerId, order_id: review.orderId, report_id: review.reportId, product_key: review.productKey,
        body: review.body, display_name: review.displayName, ilju: review.ilju, status: review.status, created_at: review.createdAt,
      }
      const rows = await (await request(TABLE, { method: 'POST', body: JSON.stringify(row) }, { Prefer: 'return=representation' })).json() as Row[]
      return rows[0] ? fromRow(rows[0]) : review
    },
    async setReward(id, walletId) {
      const query = new URLSearchParams({ id: `eq.${id}` })
      await request(`${TABLE}?${query}`, { method: 'PATCH', body: JSON.stringify({ reward_wallet_id: walletId, updated_at: new Date().toISOString() }) })
    },
  }
}
function storage(): ReviewStorage {
  if (process.env.NODE_ENV === 'test') return testStorage ??= createMemoryReviewStorageForTests()
  return restStorage()
}

export async function listPublishedReviews(productKey: string, limit = 20, offset = 0) {
  return storage().listPublished(productKey, Math.min(Math.max(1, limit), 50), Math.max(0, offset))
}
export async function findReviewByOrder(orderId: string) { return storage().findByOrder(orderId) }
export async function createReview(input: NewProductReview): Promise<ProductReview> {
  const review: ProductReview = { ...input, id: randomUUID(), status: 'published', rewardWalletId: null, createdAt: new Date().toISOString() }
  return storage().insert(review)
}
export async function attachReviewReward(id: string, walletId: string) { return storage().setReward(id, walletId) }
