import { randomUUID, createHash } from 'node:crypto'
import { Pool } from 'pg'
import { getPaymentProduct } from '../payment/catalog.js'
import { CouponError, type CouponCampaign, type CreateCampaignInput, type WalletCoupon } from './contracts.js'
export { CouponError } from './contracts.js'
export type { CouponCampaign, Campaign, CreateCampaignInput, WalletCoupon, CouponKind } from './contracts.js'

interface Audit { action: 'create' | 'disable'; campaignId: string; actor: string; at: string; requestKey?: string; hash?: string }
export interface CouponState { campaigns: CouponCampaign[]; wallets: WalletCoupon[]; audit: Audit[] }
export interface CouponStorage {
  read(): Promise<{ revision: number; data: CouponState }>
  compareAndSet(revision: number, data: CouponState): Promise<boolean>
}
const empty = (): CouponState => ({ campaigns: [], wallets: [], audit: [] })
const fail = (code: string, status = 409): never => { throw new CouponError(code, status) }
const identifier = (v: unknown): v is string => typeof v === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(v)
const actorValid = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= 254 && !/[\u0000-\u001f\u007f]/.test(v)
let testStorage: CouponStorage | null = null
export function createMemoryCouponStorageForTests(): CouponStorage {
  if (process.env.NODE_ENV !== 'test') return fail('COUPON_TEST_STORAGE_FORBIDDEN', 503)
  let revision = 0; let data = empty()
  return { async read() { return { revision, data: structuredClone(data) } }, async compareAndSet(expected, next) {
    if (revision !== expected) return false
    data = structuredClone(next); revision++; return true
  } }
}
export function configureCouponStorageForTests(adapter: CouponStorage | null) {
  if (process.env.NODE_ENV !== 'test') return fail('COUPON_TEST_STORAGE_FORBIDDEN', 503)
  testStorage = adapter
}
let pool: Pool | undefined
function storage(): CouponStorage {
  if (process.env.NODE_ENV === 'test') return testStorage ??= createMemoryCouponStorageForTests()
  if (process.env.DATABASE_URL) {
    pool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 3, connectionTimeoutMillis: 10000, query_timeout: 10000 })
    return {
      async read() { const r = await pool!.query('SELECT revision, data FROM public.coupon_state WHERE id = 1'); if (!r.rows[0]) return fail('COUPON_STORAGE_UNAVAILABLE', 503); return { revision: Number(r.rows[0].revision), data: r.rows[0].data } },
      async compareAndSet(revision, data) { return (await pool!.query('UPDATE public.coupon_state SET revision = revision + 1, data = $2::jsonb WHERE id = 1 AND revision = $1 RETURNING id', [revision, JSON.stringify(data)])).rowCount === 1 },
    }
  }
  const base = process.env.SUPABASE_URL?.replace(/\/$/, '')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!base || !key) return fail('COUPON_STORAGE_UNAVAILABLE', 503)
  async function request(path: string, init?: RequestInit) {
    const r = await fetch(`${base}/rest/v1/${path}`, { ...init, headers: { apikey: key!, ...(key!.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {}), 'Content-Type': 'application/json', ...init?.headers }, signal: AbortSignal.timeout(10000) })
    if (!r.ok) return fail('COUPON_STORAGE_UNAVAILABLE', 503)
    return r.json()
  }
  return {
    async read() { const rows = await request('coupon_state?id=eq.1&select=revision,data'); if (!rows[0]) return fail('COUPON_STORAGE_UNAVAILABLE', 503); return { revision: Number(rows[0].revision), data: rows[0].data } },
    async compareAndSet(revision, data) { return await request('rpc/coupon_state_cas', { method: 'POST', body: JSON.stringify({ expected_revision: revision, next_data: data }) }) === true },
  }
}
async function read(adapter = storage()) {
  try {
    const row = await adapter.read()
    if (!Number.isSafeInteger(row.revision) || !Array.isArray(row.data?.campaigns) || !Array.isArray(row.data?.wallets) || !Array.isArray(row.data?.audit)) return fail('COUPON_STORAGE_INVALID', 503)
    return row
  } catch (e) { if (e instanceof CouponError) throw e; return fail('COUPON_STORAGE_UNAVAILABLE', 503) }
}
async function mutate<T>(fn: (s: CouponState) => T): Promise<T> {
  const adapter = storage()
  for (let attempt = 0; attempt < 24; attempt++) {
    const row = await read(adapter)
    const result = fn(row.data)
    if (row.data.campaigns.length > 2000 || row.data.wallets.length > 20000 || row.data.audit.length > 10000 || Buffer.byteLength(JSON.stringify(row.data)) > 12000000) return fail('COUPON_STORAGE_CAPACITY', 503)
    try { if (await adapter.compareAndSet(row.revision, row.data)) return structuredClone(result) }
    catch (e) { if (e instanceof CouponError) throw e; return fail('COUPON_STORAGE_UNAVAILABLE', 503) }
  }
  return fail('COUPON_BUSY', 409)
}
function validate(input: CreateCampaignInput): CreateCampaignInput {
  if (!input || typeof input !== 'object' || typeof input.code !== 'string' || !/^[A-Za-z0-9_-]{8,40}$/.test(input.code.trim()) || typeof input.title !== 'string' || !input.title.trim() || input.title.trim().length > 100 || /[<>\u0000-\u001f]/.test(input.title) || !['service_free', 'consultation_questions', 'amount_off', 'percent_off'].includes(input.kind) || !getPaymentProduct(input.productKey) || !Number.isInteger(input.value) || input.value < 1 || input.value > 10000000 || !Number.isInteger(input.maxClaims) || input.maxClaims < 1 || input.maxClaims > 20000 || typeof input.startsAt !== 'string' || typeof input.expiresAt !== 'string' || !Number.isFinite(Date.parse(input.startsAt)) || !Number.isFinite(Date.parse(input.expiresAt)) || Date.parse(input.startsAt) >= Date.parse(input.expiresAt)) return fail('COUPON_INPUT_INVALID', 400)
  const productKey = getPaymentProduct(input.productKey)!.key
  if ((input.kind === 'percent_off' || input.kind === 'consultation_questions') && input.value > 100) return fail('COUPON_INPUT_INVALID', 400)
  if (input.kind === 'service_free' && (input.value !== 1 || productKey === 'cheonmyeong_consultation')) return fail('COUPON_INPUT_INVALID', 400)
  if (input.kind === 'consultation_questions' && productKey !== 'cheonmyeong_consultation') return fail('COUPON_INPUT_INVALID', 400)
  return { code: input.code.trim().toUpperCase(), title: input.title.trim(), kind: input.kind, productKey, value: input.value, maxClaims: input.maxClaims, startsAt: new Date(input.startsAt).toISOString(), expiresAt: new Date(input.expiresAt).toISOString() }
}
function active(c: CouponCampaign | undefined) { return !!c?.enabled && Date.parse(c.startsAt) <= Date.now() && Date.parse(c.expiresAt) > Date.now() }
function wallet(s: CouponState, ownerId: string, id: string) { const w = s.wallets.find(w => w.id === id && w.ownerId === ownerId); if (!w) return fail('COUPON_NOT_FOUND', 404); return w }
function usable(s: CouponState, w: WalletCoupon) { if (!active(s.campaigns.find(c => c.id === w.campaignId))) return fail('COUPON_INACTIVE'); }
function project(s: CouponState, w: WalletCoupon) { return { ...w, enabled: Boolean(s.campaigns.find(c => c.id === w.campaignId)?.enabled) } }
export async function createCampaign(input: CreateCampaignInput, actor: string, idempotencyKey: string): Promise<CouponCampaign> {
  const normalized = validate(input)
  if (!actorValid(actor) || !identifier(idempotencyKey)) return fail('COUPON_INPUT_INVALID', 400)
  const hash = createHash('sha256').update(JSON.stringify(normalized)).digest('hex')
  return mutate(s => {
    const replay = s.audit.find(a => a.action === 'create' && a.actor === actor && a.requestKey === idempotencyKey)
    if (replay) { if (replay.hash !== hash) return fail('COUPON_REQUEST_CONFLICT'); return s.campaigns.find(c => c.id === replay.campaignId)! }
    if (s.campaigns.some(c => c.code === normalized.code)) return fail('COUPON_CODE_EXISTS')
    const c = { ...normalized, id: randomUUID(), enabled: true, createdAt: new Date().toISOString(), actor }
    s.campaigns.push(c); s.audit.push({ action: 'create', campaignId: c.id, actor, at: c.createdAt, requestKey: idempotencyKey, hash }); return c
  })
}
export async function listCampaigns() {
  const s = (await read()).data
  return s.campaigns.map(c => {
    const wallets = s.wallets.filter(w => w.campaignId === c.id)
    return { ...c, claimCount: wallets.length, usedCount: wallets.filter(w => !!w.reportId).length, reservedCount: wallets.filter(w => !!w.orderId).length }
  })
}
export async function disableCampaign(id: string, actor: string): Promise<CouponCampaign> {
  if (!actorValid(actor)) return fail('COUPON_INPUT_INVALID', 400)
  return mutate(s => { const c = s.campaigns.find(c => c.id === id); if (!c) return fail('COUPON_NOT_FOUND', 404); if (c.enabled) { c.enabled = false; s.audit.push({ action: 'disable', campaignId: c.id, actor, at: new Date().toISOString() }) } return c })
}
export async function claimCoupon(ownerId: string, code: string): Promise<WalletCoupon> {
  if (!identifier(ownerId) || typeof code !== 'string' || !/^[a-zA-Z0-9_-]{3,40}$/.test(code.trim())) return fail('COUPON_INPUT_INVALID', 400)
  return mutate(s => {
    const c = s.campaigns.find(c => c.code === code.trim().toUpperCase()); if (!c) return fail('COUPON_NOT_FOUND', 404)
    const existing = s.wallets.find(w => w.ownerId === ownerId && w.campaignId === c.id); if (existing) return project(s, existing)
    if (!active(c)) return fail('COUPON_INACTIVE')
    if (s.wallets.filter(w => w.campaignId === c.id).length >= c.maxClaims) return fail('COUPON_EXHAUSTED')
    const w: WalletCoupon = { id: randomUUID(), ownerId, campaignId: c.id, title: c.title, kind: c.kind, productKey: c.productKey, value: c.value, expiresAt: c.expiresAt, enabled: c.enabled, claimedAt: new Date().toISOString() }
    s.wallets.push(w); return w
  })
}
export async function listWallet(ownerId: string): Promise<WalletCoupon[]> { const s = (await read()).data; return s.wallets.filter(w => w.ownerId === ownerId).map(w => project(s, w)) }
export async function bindFreeCoupon(ownerId: string, walletId: string, productKey: string, reportId: string): Promise<WalletCoupon> {
  if (typeof reportId !== 'string' || !/^[a-zA-Z0-9_.:-]{1,200}$/.test(reportId)) return fail('COUPON_INPUT_INVALID', 400)
  return mutate(s => { const w = wallet(s, ownerId, walletId); if (w.kind !== 'service_free' || w.productKey !== productKey) return fail('COUPON_PRODUCT_MISMATCH', 400); if (w.reportId) { if (w.reportId !== reportId) return fail('COUPON_ALREADY_USED'); return project(s, w) } if (s.wallets.some(other => other.ownerId === ownerId && other.productKey === productKey && other.reportId === reportId)) return fail('COUPON_REPORT_ALREADY_UNLOCKED'); usable(s, w); w.reportId = reportId; return project(s, w) })
}
export async function hasCouponReportAccess(ownerId: string, productKey: string, reportId: string): Promise<boolean> { return (await listWallet(ownerId)).some(w => w.kind === 'service_free' && w.productKey === productKey && !!w.reportId && w.reportId === reportId) }
export async function reserveDiscount(ownerId: string, walletId: string, productKey: string, originalAmount: number, proposedOrderId: string): Promise<WalletCoupon> {
  if (!identifier(proposedOrderId) || !Number.isSafeInteger(originalAmount) || originalAmount < 2 || originalAmount !== getPaymentProduct(productKey)?.amount) return fail('COUPON_ORDER_CONFLICT', 400)
  return mutate(s => {
    const w = wallet(s, ownerId, walletId)
    if (!['amount_off', 'percent_off'].includes(w.kind) || w.productKey !== productKey) return fail('COUPON_PRODUCT_MISMATCH', 400)
    if (w.orderId) { if (w.originalAmount !== originalAmount) return fail('COUPON_ORDER_CONFLICT'); return project(s, w) }
    usable(s, w)
    if (s.wallets.some(other => other.orderId === proposedOrderId)) return fail('COUPON_ORDER_CONFLICT')
    const discount = w.kind === 'amount_off' ? w.value : Math.floor(originalAmount * w.value / 100)
    w.orderId = proposedOrderId; w.originalAmount = originalAmount; w.payableAmount = Math.max(1, originalAmount - discount)
    return project(s, w)
  })
}
export async function getDiscountForOrder(ownerId: string, orderId: string): Promise<WalletCoupon | null> { return (await listWallet(ownerId)).find(w => w.orderId === orderId && ['amount_off', 'percent_off'].includes(w.kind)) ?? null }
export async function listConsultationCoupons(ownerId: string): Promise<WalletCoupon[]> { const s = (await read()).data; return s.wallets.filter(w => w.ownerId === ownerId && w.kind === 'consultation_questions' && active(s.campaigns.find(c => c.id === w.campaignId))).map(w => project(s, w)) }
