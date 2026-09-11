import { configuredEnv } from '../env/load.js'
import { assertDurableStorage, storageReadiness, type StorageReadiness } from './storage-readiness.js'
import { Pool } from 'pg'

/** 열거 가능한 형태로도 둔다. API 가 조회 인자를 검증할 때 쓴다. */
export const PAYMENT_ORDER_STATUSES = ['ready', 'approving', 'paid', 'viewed', 'cancelled', 'failed'] as const

export type PaymentOrderStatus = typeof PAYMENT_ORDER_STATUSES[number]

export interface PaymentOrder {
  orderId: string
  ownerId: string
  ownerEmail?: string
  buyerEmail: string
  buyerTel: string
  productKey: string
  productTitle: string
  amount: number
  status: PaymentOrderStatus
  /** Report this order unlocks. Empty for orders created before a report existed. */
  reportId?: string
  tid?: string
  payMethod?: string
  approvalCode?: string
  message?: string
  createdAt: string
  updatedAt: string
  /**
   * 낙관적 동시성 제어용 수정 횟수. 쓰기는 자기가 읽은 판(revision)에만 적용된다.
   *
   * 없으면 읽고-고쳐-쓰기가 서로를 덮는다. 결제에서 그것은 돈 문제가 된다 —
   * 승인 콜백과 조회 폴링이 겹치면 나중 쓰기가 앞선 상태를 지운다.
   */
  revision?: number
}

export type PaymentStorageMode = 'postgres' | 'supabase' | 'memory'

/**
 * 허용된 상태 전이. **뒤로 가는 전이를 막는 것이 핵심이다.**
 *
 * 특히 `paid`·`viewed` 에서 `failed` 로 가지 못하게 한다. 이니시스 승인 흐름
 * (`src/server/app.ts` 결제 콜백)은 승인 **뒤에** 오류가 나면 catch 에서 주문을
 * `failed` 로 적는다. 가드가 없으면 **실제로 돈이 빠져나간 주문이 실패로 기록된다.**
 *
 * 같은 상태를 다시 적는 것은 허용한다. 콜백은 재전송되며 그때 오류를 낼 이유가 없다.
 */
const ALLOWED_NEXT_STATUS: Record<PaymentOrderStatus, readonly PaymentOrderStatus[]> = {
  ready: ['ready', 'approving', 'paid', 'cancelled', 'failed'],
  // 승인 시도 중 응답을 잃으면 실제 과금 여부를 알 수 없다. 그 판정은 U22 소관이며
  // 여기서는 `failed` 로 적는 경로 자체는 막지 않는다.
  approving: ['approving', 'paid', 'cancelled', 'failed'],
  // 환불·취소는 결제 **뒤에** 일어나는 정상 전이다. 막아야 하는 것은 `failed` 로
  // 가는 경로다 — 그것은 "승인되지 않았다"는 뜻이고, 이미 승인된 주문에는 거짓이다.
  paid: ['paid', 'viewed', 'cancelled'],
  viewed: ['viewed', 'cancelled'],
  cancelled: ['cancelled'],
  failed: ['failed'],
}

/** 허용되지 않은 전이. 호출부가 구분해 처리할 수 있도록 별도 타입으로 던진다. */
export class PaymentOrderTransitionError extends Error {
  constructor(readonly orderId: string, readonly from: PaymentOrderStatus, readonly to: PaymentOrderStatus) {
    super(`주문 상태를 ${from} 에서 ${to} 로 바꿀 수 없습니다.`)
    this.name = 'PaymentOrderTransitionError'
  }
}

/** 다른 쓰기가 먼저 반영돼 내가 읽은 판이 낡았다. 다시 읽고 시도한다. */
export class PaymentOrderConflictError extends Error {
  constructor(readonly orderId: string) {
    super('주문이 다른 요청으로 먼저 바뀌었습니다.')
    this.name = 'PaymentOrderConflictError'
  }
}

/**
 * 결제사가 승인을 돌려준 증거. `tid` 나 승인번호가 있으면 **돈이 움직였다**는 뜻이다.
 *
 * 승인은 성공했는데 그 결과를 저장하는 쓰기가 실패할 수 있다. 그 순간 주문은
 * `approving` 에 남고, 예전 코드는 catch 에서 그것을 `failed` 로 적었다 —
 * **과금된 주문이 실패로 기록된다.** enum 에 불확정 상태가 없어서 생긴 구멍이다(U22).
 *
 * 그래서 승인 증거를 최종 상태보다 **먼저** 저장한다(`src/server/app.ts` 승인 흐름).
 * 그러면 `approving` + 증거 = "승인됐으나 정산 기록이 끝나지 않음"으로 식별된다.
 */
export function hasApprovalEvidence(order: Pick<PaymentOrder, 'tid' | 'approvalCode'>): boolean {
  return Boolean(order.tid?.trim() || order.approvalCode?.trim())
}

/**
 * 생성 뒤 바뀌면 안 되는 값들. **특히 `amount` 다.**
 *
 * 이전 구현은 갱신에도 행 전체를 보냈고, REST 는 `resolution=merge-duplicates` 로
 * upsert 했다. 그래서 금액이 갱신 본문에 실려 매번 덮어써졌다 — 값이 같았던 것은
 * 관례였을 뿐 규칙이 아니었다(U21). 결제 금액이 승인 뒤에 바뀌면 대사가 불가능해진다.
 */
/**
 * 갱신에서 **거부**하는 값. 조용히 무시하면 호출부는 바꿨다고 믿는다.
 *
 * `orderId`·`ownerId`·`createdAt` 은 여기 없다. 그 셋은 `mutatePaymentOrder` 가 현재
 * 값으로 **강제 덮어쓰기**해서 구조적으로 고정되고, REST 계약 테스트가 그 동작을
 * 문서화하고 있다. 여기서 다루는 것은 그런 보호가 없던 값들이다.
 */
export const IMMUTABLE_ORDER_FIELDS = ['productKey', 'amount'] as const

export class PaymentOrderImmutableFieldError extends Error {
  constructor(readonly orderId: string, readonly field: string) {
    super(`주문의 ${field} 는 생성 뒤 바꿀 수 없습니다.`)
    this.name = 'PaymentOrderImmutableFieldError'
  }
}

/** 바뀐 불변 필드가 있으면 그 이름을 준다. */
function changedImmutableField(current: PaymentOrder, next: Partial<PaymentOrder>): string | undefined {
  return IMMUTABLE_ORDER_FIELDS.find((field) => next[field] !== undefined && next[field] !== current[field])
}

export function canTransitionPaymentOrder(
  from: PaymentOrderStatus,
  to: PaymentOrderStatus,
  evidence?: Pick<PaymentOrder, 'tid' | 'approvalCode'>,
): boolean {
  if (!ALLOWED_NEXT_STATUS[from].includes(to)) return false
  // 승인 증거가 있는 주문을 실패로 적지 않는다. 그 기록은 사실이 아니고,
  // 한번 적히면 대사에서 "결제되지 않은 주문"으로 분류돼 고객이 돈만 잃는다.
  if (to === 'failed' && evidence && hasApprovalEvidence(evidence)) return false
  return true
}

const connectionString = configuredEnv(process.env.DATABASE_URL)
const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: /localhost|127\.0\.0\.1/i.test(connectionString) ? false : { rejectUnauthorized: false },
    })
  : null
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? ''
const supabaseServiceRoleKey = configuredEnv(process.env.SUPABASE_SERVICE_ROLE_KEY) ?? ''
const supabaseRestUrl = supabaseUrl
  ? `${supabaseUrl.replace(/\/$/, '')}/rest/v1/cheongi_payment_orders`
  : ''

const memoryOrders = new Map<string, PaymentOrder>()
let dbReady: Promise<void> | null = null

function storageMode(): PaymentStorageMode {
  if (pool) return 'postgres'
  if (supabaseRestUrl && supabaseServiceRoleKey) return 'supabase'
  return 'memory'
}

function nowIso(): string {
  return new Date().toISOString()
}

function cloneOrder(order: PaymentOrder): PaymentOrder {
  return JSON.parse(JSON.stringify(order)) as PaymentOrder
}

async function ensureDb(): Promise<void> {
  if (!pool) return
  if (!dbReady) {
    dbReady = pool.query(`
      CREATE TABLE IF NOT EXISTS cheongi_payment_orders (
        order_id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        owner_email TEXT,
        buyer_email TEXT NOT NULL,
        buyer_tel TEXT NOT NULL,
        product_key TEXT NOT NULL,
        product_title TEXT NOT NULL,
        amount INTEGER NOT NULL CHECK (amount > 0),
        status TEXT NOT NULL,
        tid TEXT,
        pay_method TEXT,
        approval_code TEXT,
        message TEXT,
        report_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
      .then(() => pool.query('ALTER TABLE cheongi_payment_orders ADD COLUMN IF NOT EXISTS report_id TEXT'))
      .then(() => pool.query('ALTER TABLE cheongi_payment_orders ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 0'))
      .then(() => undefined)
  }
  await dbReady
}

function toRow(order: PaymentOrder) {
  return {
    order_id: order.orderId,
    owner_id: order.ownerId,
    owner_email: order.ownerEmail ?? null,
    buyer_email: order.buyerEmail,
    buyer_tel: order.buyerTel,
    product_key: order.productKey,
    product_title: order.productTitle,
    amount: order.amount,
    status: order.status,
    tid: order.tid ?? null,
    pay_method: order.payMethod ?? null,
    approval_code: order.approvalCode ?? null,
    message: order.message ?? null,
    report_id: order.reportId ?? null,
    created_at: order.createdAt,
    updated_at: order.updatedAt,
    revision: order.revision ?? 0,
  }
}

/**
 * 갱신에 보낼 컬럼만. `owner_id`·`product_key`·`amount`·`created_at` 은 아예 보내지
 * 않는다(U21). **보내지 않으면 덮어쓸 수 없다** — 값이 같기를 기대하는 것보다 확실하다.
 */
function toUpdateRow(order: PaymentOrder) {
  return {
    status: order.status,
    tid: order.tid ?? null,
    pay_method: order.payMethod ?? null,
    approval_code: order.approvalCode ?? null,
    message: order.message ?? null,
    report_id: order.reportId ?? null,
    owner_email: order.ownerEmail ?? null,
    buyer_email: order.buyerEmail,
    buyer_tel: order.buyerTel,
    product_title: order.productTitle,
    updated_at: order.updatedAt,
    revision: order.revision ?? 0,
  }
}

function fromRow(row: Record<string, unknown>): PaymentOrder {
  return {
    orderId: String(row.order_id),
    ownerId: String(row.owner_id),
    ownerEmail: row.owner_email ? String(row.owner_email) : undefined,
    buyerEmail: String(row.buyer_email),
    buyerTel: String(row.buyer_tel),
    productKey: String(row.product_key),
    productTitle: String(row.product_title),
    amount: Number(row.amount),
    status: String(row.status) as PaymentOrderStatus,
    tid: row.tid ? String(row.tid) : undefined,
    payMethod: row.pay_method ? String(row.pay_method) : undefined,
    approvalCode: row.approval_code ? String(row.approval_code) : undefined,
    message: row.message ? String(row.message) : undefined,
    reportId: row.report_id ? String(row.report_id) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    // 열이 아직 없는 저장소(마이그레이션 전)는 0 으로 읽는다.
    revision: Number.isFinite(Number(row.revision)) ? Number(row.revision) : 0,
  }
}

function supabaseHeaders(): Record<string, string> {
  const headers: Record<string, string> = { apikey: supabaseServiceRoleKey }
  // Hosted secret keys are opaque API keys, not JWTs. Only legacy JWT service
  // keys belong in Authorization; never substitute a customer's session token.
  if (!supabaseServiceRoleKey.startsWith('sb_secret_') && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(supabaseServiceRoleKey)) {
    headers.authorization = `Bearer ${supabaseServiceRoleKey}`
  }
  return headers
}

export async function getPaymentOrder(orderId: string): Promise<PaymentOrder | null> {
  if (storageMode() === 'memory') {
    const order = memoryOrders.get(orderId)
    return order ? cloneOrder(order) : null
  }

  if (storageMode() === 'supabase') {
    const url = `${supabaseRestUrl}?order_id=eq.${encodeURIComponent(orderId)}&select=*`
    const response = await fetch(url, { headers: supabaseHeaders() })
    if (!response.ok) throw new Error('결제 주문 조회에 실패했습니다.')
    const rows = await response.json() as Array<Record<string, unknown>>
    return rows[0] ? fromRow(rows[0]) : null
  }

  if (!pool) return null
  await ensureDb()
  const result = await pool.query<Record<string, unknown>>('SELECT * FROM cheongi_payment_orders WHERE order_id = $1', [orderId])
  return result.rows[0] ? fromRow(result.rows[0]) : null
}

/**
 * 결제사 거래번호로 주문을 찾는다.
 *
 * 구글플레이 결제 토큰은 한 주문만 열어야 한다. 같은 토큰을 다른 주문에 다시 들고
 * 오는 경로를 막으려면 토큰이 이미 쓰였는지 저장소에 물어봐야 한다.
 */
export async function findPaymentOrderByTid(tid: string): Promise<PaymentOrder | null> {
  const key = tid.trim()
  if (!key) return null

  if (storageMode() === 'memory') {
    for (const order of memoryOrders.values()) {
      if (order.tid === key) return cloneOrder(order)
    }
    return null
  }

  if (storageMode() === 'supabase') {
    const url = new URL(supabaseRestUrl)
    url.searchParams.set('tid', `eq.${key}`)
    url.searchParams.set('select', '*')
    url.searchParams.set('limit', '1')
    const response = await fetch(url, { headers: supabaseHeaders() })
    if (!response.ok) throw new Error('결제 주문 조회에 실패했습니다.')
    const rows = await response.json() as Array<Record<string, unknown>>
    return rows[0] ? fromRow(rows[0]) : null
  }

  if (!pool) return null
  await ensureDb()
  const result = await pool.query<Record<string, unknown>>('SELECT * FROM cheongi_payment_orders WHERE tid = $1 LIMIT 1', [key])
  return result.rows[0] ? fromRow(result.rows[0]) : null
}

export interface PaymentOrderPage {
  orders: PaymentOrder[]
  /** 다음 페이지 요청에 그대로 실어 보낸다. 없으면 마지막 페이지다. */
  nextCursor?: string
}

export interface PaymentOrderQuery {
  limit?: number
  cursor?: string
  status?: PaymentOrderStatus
  /** ISO 문자열. 경계는 `from` 포함, `to` 제외다. */
  from?: string
  to?: string
}

/**
 * cursor 는 `updated_at|order_id` 다.
 *
 * `updated_at` 하나로 페이지를 넘기면 같은 시각에 만들어진 주문이 건너뛰거나 중복된다.
 * 결제는 초 단위로 몰리므로 실제로 일어난다. 주문번호를 2차 키로 붙여 순서를 고정한다.
 */
function encodeOrderCursor(order: PaymentOrder): string {
  return Buffer.from(`${order.updatedAt}|${order.orderId}`, 'utf8').toString('base64url')
}

function decodeOrderCursor(cursor: string): { updatedAt: string; orderId: string } | undefined {
  try {
    const [updatedAt, orderId] = Buffer.from(cursor, 'base64url').toString('utf8').split('|')
    if (!updatedAt || !orderId) return undefined
    return { updatedAt, orderId }
  } catch {
    return undefined
  }
}

/** 정렬 기준: 최신 먼저, 같은 시각이면 주문번호 내림차순. 모든 저장소가 이 순서를 쓴다. */
function compareOrdersDesc(a: PaymentOrder, b: PaymentOrder): number {
  return b.updatedAt.localeCompare(a.updatedAt) || b.orderId.localeCompare(a.orderId)
}

/**
 * 관리자 주문 목록. **소유자 전체**를 본다 — `listPaymentOrders` 는 한 회원의 것만 본다.
 *
 * 이 함수는 서버(`service_role`)에서만 불린다. 라우트가 직원 권한을 확인한 뒤 호출한다.
 */
export async function listAllPaymentOrders(query: PaymentOrderQuery = {}): Promise<PaymentOrderPage> {
  const limit = Math.min(Math.max(Number.isInteger(query.limit) ? Number(query.limit) : 20, 1), 100)
  const after = query.cursor ? decodeOrderCursor(query.cursor) : undefined
  if (query.cursor && !after) throw new Error('조회 위치를 읽지 못했습니다.')

  const withinWindow = (order: PaymentOrder): boolean => {
    if (query.status && order.status !== query.status) return false
    // 경계: `from` 포함, `to` 제외. 하루 단위 조회가 자정에 겹치지 않게 한다.
    if (query.from && order.updatedAt < query.from) return false
    if (query.to && order.updatedAt >= query.to) return false
    return true
  }

  const afterCursor = (order: PaymentOrder): boolean => {
    if (!after) return true
    if (order.updatedAt !== after.updatedAt) return order.updatedAt < after.updatedAt
    return order.orderId < after.orderId
  }

  const pageOf = (rows: PaymentOrder[]): PaymentOrderPage => {
    const orders = rows.slice(0, limit)
    return {
      orders,
      // 가져온 것이 limit 를 넘었을 때만 다음 페이지가 있다.
      ...(rows.length > limit && orders.length > 0 ? { nextCursor: encodeOrderCursor(orders[orders.length - 1]) } : {}),
    }
  }

  if (storageMode() === 'memory') {
    const rows = Array.from(memoryOrders.values())
      .filter((order) => withinWindow(order) && afterCursor(order))
      .sort(compareOrdersDesc)
      .slice(0, limit + 1)
      .map(cloneOrder)
    return pageOf(rows)
  }

  if (storageMode() === 'supabase') {
    const url = new URL(supabaseRestUrl)
    url.searchParams.set('select', '*')
    url.searchParams.set('order', 'updated_at.desc,order_id.desc')
    url.searchParams.set('limit', String(limit + 1))
    if (query.status) url.searchParams.set('status', `eq.${query.status}`)
    if (query.from) url.searchParams.append('updated_at', `gte.${query.from}`)
    if (query.to) url.searchParams.append('updated_at', `lt.${query.to}`)
    if (after) {
      // `(updated_at, order_id)` 튜플 비교. PostgREST 의 or 문법으로 표현한다.
      url.searchParams.set(
        'or',
        `(updated_at.lt.${after.updatedAt},and(updated_at.eq.${after.updatedAt},order_id.lt.${after.orderId}))`,
      )
    }
    const response = await fetch(url, { headers: supabaseHeaders() })
    if (!response.ok) throw new Error('결제 내역 조회에 실패했습니다.')
    const rows = (await response.json() as Array<Record<string, unknown>>).map(fromRow)
    return pageOf(rows)
  }

  if (!pool) return { orders: [] }
  await ensureDb()
  const result = await pool.query<Record<string, unknown>>(
    `
      SELECT * FROM cheongi_payment_orders
      WHERE ($2::text IS NULL OR status = $2)
        AND ($3::timestamptz IS NULL OR updated_at >= $3)
        AND ($4::timestamptz IS NULL OR updated_at < $4)
        AND ($5::text IS NULL OR (updated_at, order_id) < ($5::timestamptz, $6))
      ORDER BY updated_at DESC, order_id DESC
      LIMIT $1
    `,
    [limit + 1, query.status ?? null, query.from ?? null, query.to ?? null, after?.updatedAt ?? null, after?.orderId ?? null],
  )
  return pageOf(result.rows.map(fromRow))
}

export async function listPaymentOrders(ownerId: string, limit = 50, reportId?: string): Promise<PaymentOrder[]> {
  const safeLimit = Math.min(Math.max(Number.isInteger(limit) ? limit : 50, 1), 100)
  if (storageMode() === 'memory') {
    return Array.from(memoryOrders.values())
      .filter((order) => order.ownerId === ownerId && (!reportId || order.reportId === reportId))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, safeLimit)
      .map(cloneOrder)
  }

  if (storageMode() === 'supabase') {
    const url = new URL(supabaseRestUrl)
    url.searchParams.set('owner_id', `eq.${ownerId}`)
    if (reportId) url.searchParams.set('report_id', `eq.${reportId}`)
    url.searchParams.set('select', '*')
    url.searchParams.set('order', 'updated_at.desc')
    url.searchParams.set('limit', String(safeLimit))
    const response = await fetch(url, { headers: supabaseHeaders() })
    if (!response.ok) throw new Error('결제 내역 조회에 실패했습니다.')
    const rows = await response.json() as Array<Record<string, unknown>>
    return rows.map(fromRow)
  }

  if (!pool) return []
  await ensureDb()
  const result = await pool.query<Record<string, unknown>>(
    'SELECT * FROM cheongi_payment_orders WHERE owner_id = $1 AND ($3::text IS NULL OR report_id = $3) ORDER BY updated_at DESC LIMIT $2',
    [ownerId, safeLimit, reportId ?? null],
  )
  return result.rows.map(fromRow)
}

/**
 * 주문을 새로 만들거나 통째로 덮는다. **동시성 보호가 없다.**
 *
 * 생성과 픽스처 적재에만 쓴다. 상태를 바꾸는 갱신은 `updatePaymentOrder` 나
 * `mutatePaymentOrder` 를 써야 한다 — 그쪽이 전이 가드와 CAS 를 건다.
 */
export async function savePaymentOrder(order: PaymentOrder): Promise<PaymentOrder> {
  return writePaymentOrder(order)
}

/**
 * 실제 쓰기. `expectedRevision` 이 주어지면 그 판일 때만 반영한다(CAS).
 *
 * 주어지지 않으면 최초 생성이다. 생성 경로까지 CAS 로 묶으면 정상적인 재시도가 막힌다.
 */
async function writePaymentOrder(order: PaymentOrder, expectedRevision?: number): Promise<PaymentOrder> {
  // 운영에서 비영속 모드면 여기서 멈춘다. 메모리에 쓰면 다음 요청에서 사라지고,
  // 결제는 받았는데 주문 기록이 없는 상태가 된다(U20).
  assertDurableStorage('결제 주문', checkPaymentStorageReadiness())
  const stored = cloneOrder({ ...order, updatedAt: nowIso() })

  if (storageMode() === 'memory') {
    if (expectedRevision !== undefined) {
      const current = memoryOrders.get(stored.orderId)
      if ((current?.revision ?? 0) !== expectedRevision) throw new PaymentOrderConflictError(stored.orderId)
    }
    memoryOrders.set(stored.orderId, stored)
    return cloneOrder(stored)
  }

  if (storageMode() === 'supabase') {
    if (expectedRevision !== undefined) {
      // PostgREST 는 필터가 맞는 행에만 PATCH 를 적용한다. 맞는 행이 없으면 빈 배열이
      // 돌아오고, 그것이 곧 "내가 읽은 판이 낡았다"는 뜻이다.
      const url = `${supabaseRestUrl}?order_id=eq.${encodeURIComponent(stored.orderId)}&revision=eq.${expectedRevision}`
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { ...supabaseHeaders(), 'content-type': 'application/json', prefer: 'return=representation' },
        body: JSON.stringify(toUpdateRow(stored)),
      })
      if (!response.ok) throw new Error('결제 주문 저장에 실패했습니다.')
      const rows = await response.json() as Array<Record<string, unknown>>
      if (rows.length === 0) throw new PaymentOrderConflictError(stored.orderId)
      // 응답은 **부분 행**이다. 갱신에 보내지 않은 불변 컬럼(`owner_id`·`product_key`·
      // `amount`·`created_at`)이 빠져 있으므로, 보낸 행 위에 응답을 덮어 읽는다.
      return fromRow({ ...toRow(stored), ...rows[0] })
    }
    const response = await fetch(supabaseRestUrl, {
      method: 'POST',
      headers: { ...supabaseHeaders(), 'content-type': 'application/json', prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(toRow(stored)),
    })
    if (!response.ok) throw new Error('결제 주문 저장에 실패했습니다.')
    const rows = await response.json() as Array<Record<string, unknown>>
    return rows[0] ? fromRow(rows[0]) : stored
  }

  if (expectedRevision !== undefined) {
    if (!pool) throw new Error('결제 주문 저장소가 설정되지 않았습니다.')
    await ensureDb()
    const row = toRow(stored)
    // `amount`·`owner_id`·`product_key`·`created_at` 은 SET 에 넣지 않는다(U21).
    const result = await pool.query(
      `
        UPDATE cheongi_payment_orders SET
          status = $2, tid = $3, pay_method = $4, approval_code = $5, message = $6,
          report_id = COALESCE($7, report_id), owner_email = $8, buyer_email = $9, buyer_tel = $10,
          product_title = $11, revision = $12, updated_at = NOW()
        WHERE order_id = $1 AND revision = $13
      `,
      [
        row.order_id, row.status, row.tid, row.pay_method, row.approval_code, row.message,
        row.report_id, row.owner_email, row.buyer_email, row.buyer_tel,
        row.product_title, row.revision, expectedRevision,
      ],
    )
    if (result.rowCount === 0) throw new PaymentOrderConflictError(stored.orderId)
    return stored
  }

  if (!pool) throw new Error('결제 주문 저장소가 설정되지 않았습니다.')
  await ensureDb()
  const row = toRow(stored)
  await pool.query(
    `
      INSERT INTO cheongi_payment_orders (
        order_id, owner_id, owner_email, buyer_email, buyer_tel, product_key, product_title,
        amount, status, tid, pay_method, approval_code, message, report_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
      ON CONFLICT (order_id) DO UPDATE SET
        status = EXCLUDED.status,
        tid = EXCLUDED.tid,
        pay_method = EXCLUDED.pay_method,
        approval_code = EXCLUDED.approval_code,
        message = EXCLUDED.message,
        report_id = COALESCE(EXCLUDED.report_id, cheongi_payment_orders.report_id),
        updated_at = NOW()
    `,
    [row.order_id, row.owner_id, row.owner_email, row.buyer_email, row.buyer_tel, row.product_key, row.product_title, row.amount, row.status, row.tid, row.pay_method, row.approval_code, row.message, row.report_id, row.created_at],
  )
  return stored
}

/**
 * 읽은 판에만 쓰기를 적용한다. 다른 요청이 먼저 바꿨으면 다시 읽고 다시 시도한다.
 *
 * 이전 구현은 읽고-고쳐-쓰기였다. 승인 콜백과 조회가 겹치면 나중 쓰기가 앞선 상태를
 * 통째로 덮었다(U17). 결제에서 그것은 돈 기록이 사라지는 문제다.
 *
 * 재시도는 **상태 전이 거부에는 적용하지 않는다.** 거부는 경합이 아니라 규칙 위반이므로
 * 다시 읽어도 결과가 같다.
 */
/**
 * 동시에 N 개가 쓰면 마지막 하나는 최대 N 번 시도한다. 이 주문 하나에 겹칠 수 있는
 * 쓰기는 결제사 콜백·클라이언트 폴링·재전송 정도이므로 8 이면 충분하다.
 * 그보다 많이 겹치면 경합이 아니라 다른 문제이므로 호출부에 알린다.
 */
const PAYMENT_WRITE_ATTEMPTS = 8

export async function mutatePaymentOrder(
  orderId: string,
  mutate: (current: PaymentOrder) => Partial<Omit<PaymentOrder, 'orderId' | 'ownerId' | 'createdAt' | 'revision'>>,
): Promise<PaymentOrder | null> {
  for (let attempt = 0; attempt < PAYMENT_WRITE_ATTEMPTS; attempt += 1) {
    const current = await getPaymentOrder(orderId)
    if (!current) return null

    const patch = mutate(current)
    const nextStatus = patch.status ?? current.status
    // 증거는 **현재 저장된 것과 이번에 쓰려는 것**을 함께 본다. 같은 쓰기가 증거와
    // 상태를 동시에 넣는 경우가 있기 때문이다.
    const evidence = {
      tid: patch.tid ?? current.tid,
      approvalCode: patch.approvalCode ?? current.approvalCode,
    }
    if (!canTransitionPaymentOrder(current.status, nextStatus, evidence)) {
      throw new PaymentOrderTransitionError(orderId, current.status, nextStatus)
    }
    // 불변 필드 변경을 조용히 무시하지 않고 거부한다. 무시하면 호출부는 바꿨다고 믿는다.
    const immutable = changedImmutableField(current, patch as Partial<PaymentOrder>)
    if (immutable) throw new PaymentOrderImmutableFieldError(orderId, immutable)

    const expectedRevision = current.revision ?? 0
    const next: PaymentOrder = {
      ...current,
      ...patch,
      orderId,
      ownerId: current.ownerId,
      createdAt: current.createdAt,
      updatedAt: nowIso(),
      revision: expectedRevision + 1,
    }

    try {
      return await writePaymentOrder(next, expectedRevision)
    } catch (error) {
      if (!(error instanceof PaymentOrderConflictError)) throw error
      // 다른 쓰기가 먼저 반영됐다. 그 결과 위에서 다시 판단한다.
    }
  }
  throw new PaymentOrderConflictError(orderId)
}

export async function updatePaymentOrder(orderId: string, patch: Partial<Omit<PaymentOrder, 'orderId' | 'ownerId' | 'createdAt'>>): Promise<PaymentOrder | null> {
  return mutatePaymentOrder(orderId, () => patch)
}

export function getPaymentStorageMode(): PaymentStorageMode {
  return storageMode()
}

/**
 * 주문 저장소가 운영에 쓸 수 있는 상태인지. `report-store` 에만 있던 판정을 여기에도 둔다(U20).
 *
 * 네트워크 프로브는 하지 않는다. 여기서 막아야 하는 것은 "설정이 빠져 메모리로 떨어진
 * 상태"이고, 그것은 설정만 보고 판정된다. 연결 실패는 쓰기 시점에 그대로 드러난다.
 */
export function checkPaymentStorageReadiness(): StorageReadiness {
  const mode = storageMode()
  return storageReadiness(mode, mode === 'supabase' && !supabaseServiceRoleKey)
}
