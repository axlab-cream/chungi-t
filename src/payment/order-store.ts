import '../env/load.js'
import { Pool } from 'pg'

export type PaymentOrderStatus = 'ready' | 'approving' | 'paid' | 'viewed' | 'cancelled' | 'failed'

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
  tid?: string
  payMethod?: string
  approvalCode?: string
  message?: string
  createdAt: string
  updatedAt: string
}

type PaymentStorageMode = 'postgres' | 'supabase' | 'memory'

const connectionString = process.env.DATABASE_URL
const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: /localhost|127\.0\.0\.1/i.test(connectionString) ? false : { rejectUnauthorized: false },
    })
  : null
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
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
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `).then(() => undefined)
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
    created_at: order.createdAt,
    updated_at: order.updatedAt,
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
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

function supabaseHeaders(): Record<string, string> {
  return {
    apikey: supabaseServiceRoleKey,
    authorization: `Bearer ${supabaseServiceRoleKey}`,
  }
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

export async function listPaymentOrders(ownerId: string, limit = 50): Promise<PaymentOrder[]> {
  const safeLimit = Math.min(Math.max(Number.isInteger(limit) ? limit : 50, 1), 100)
  if (storageMode() === 'memory') {
    return Array.from(memoryOrders.values())
      .filter((order) => order.ownerId === ownerId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, safeLimit)
      .map(cloneOrder)
  }

  if (storageMode() === 'supabase') {
    const url = new URL(supabaseRestUrl)
    url.searchParams.set('owner_id', `eq.${ownerId}`)
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
    'SELECT * FROM cheongi_payment_orders WHERE owner_id = $1 ORDER BY updated_at DESC LIMIT $2',
    [ownerId, safeLimit],
  )
  return result.rows.map(fromRow)
}

export async function savePaymentOrder(order: PaymentOrder): Promise<PaymentOrder> {
  const stored = cloneOrder({ ...order, updatedAt: nowIso() })
  if (storageMode() === 'memory') {
    memoryOrders.set(stored.orderId, stored)
    return cloneOrder(stored)
  }

  if (storageMode() === 'supabase') {
    const response = await fetch(supabaseRestUrl, {
      method: 'POST',
      headers: { ...supabaseHeaders(), 'content-type': 'application/json', prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(toRow(stored)),
    })
    if (!response.ok) throw new Error('결제 주문 저장에 실패했습니다.')
    const rows = await response.json() as Array<Record<string, unknown>>
    return rows[0] ? fromRow(rows[0]) : stored
  }

  if (!pool) throw new Error('결제 주문 저장소가 설정되지 않았습니다.')
  await ensureDb()
  const row = toRow(stored)
  await pool.query(
    `
      INSERT INTO cheongi_payment_orders (
        order_id, owner_id, owner_email, buyer_email, buyer_tel, product_key, product_title,
        amount, status, tid, pay_method, approval_code, message, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
      ON CONFLICT (order_id) DO UPDATE SET
        status = EXCLUDED.status,
        tid = EXCLUDED.tid,
        pay_method = EXCLUDED.pay_method,
        approval_code = EXCLUDED.approval_code,
        message = EXCLUDED.message,
        updated_at = NOW()
    `,
    [row.order_id, row.owner_id, row.owner_email, row.buyer_email, row.buyer_tel, row.product_key, row.product_title, row.amount, row.status, row.tid, row.pay_method, row.approval_code, row.message, row.created_at],
  )
  return stored
}

export async function updatePaymentOrder(orderId: string, patch: Partial<Omit<PaymentOrder, 'orderId' | 'ownerId' | 'createdAt'>>): Promise<PaymentOrder | null> {
  const current = await getPaymentOrder(orderId)
  if (!current) return null
  return savePaymentOrder({ ...current, ...patch, orderId, ownerId: current.ownerId, createdAt: current.createdAt, updatedAt: nowIso() })
}

export function getPaymentStorageMode(): PaymentStorageMode {
  return storageMode()
}
