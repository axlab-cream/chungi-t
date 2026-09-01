import '../env/load.js'
import { createHash } from 'node:crypto'
import type { PaymentOrder } from './order-store.js'

export const INICIS_SCRIPT_URL = 'https://stdpay.inicis.com/stdjs/INIStdPay.js'

interface InicisConfig {
  mid: string
  signKey: string
  publicBaseUrl: string
  enabled: boolean
}

export interface InicisPaymentFields {
  version: '1.0'
  gopaymethod: ''
  mid: string
  oid: string
  price: string
  timestamp: string
  use_chkfake: 'Y'
  signature: string
  verification: string
  mKey: string
  currency: 'WON'
  goodname: string
  buyername: string
  buyertel: string
  buyeremail: string
  returnUrl: string
  closeUrl: string
  charset: 'UTF-8'
  merchantData: string
}

export interface InicisApprovalResult {
  resultCode: string
  resultMessage: string
  tid?: string
  payMethod?: string
  approvalCode?: string
  raw: Record<string, string>
}

function envValue(value: string | undefined, fallback: string): string {
  return value?.trim() || fallback
}

function config(): InicisConfig {
  const publicBaseUrl = envValue(process.env.PUBLIC_BASE_URL, 'https://umsh.kr').replace(/\/$/, '')
  const mid = process.env.INICIS_MID?.trim() ?? ''
  const signKey = process.env.INICIS_SIGNKEY?.trim() ?? ''
  return { mid, signKey, publicBaseUrl, enabled: Boolean(mid && signKey) }
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

function truncate(value: string, length: number): string {
  return value.slice(0, length)
}

function safeOrderId(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40)
}

export function createPaymentOrderId(now = Date.now(), random = Math.random().toString(36).slice(2, 10)): string {
  return `UMSH${now}${random}`.replace(/[^A-Za-z0-9]/g, '').slice(0, 40)
}

export function isInicisConfigured(): boolean {
  return config().enabled
}

export function publicInicisConfig() {
  const current = config()
  return {
    enabled: current.enabled,
    provider: 'inicis-standard',
    scriptUrl: INICIS_SCRIPT_URL,
    returnUrl: `${current.publicBaseUrl}/api/payment/inicis/return`,
    closeUrl: `${current.publicBaseUrl}/payment/close`,
  }
}

export function createInicisPaymentFields(params: {
  order: PaymentOrder
  buyerName: string
}): InicisPaymentFields {
  const current = config()
  if (!current.enabled) throw new Error('이니시스 MID와 SignKey 설정이 필요합니다.')
  const timestamp = String(Date.now())
  const oid = safeOrderId(params.order.orderId)
  const price = String(params.order.amount)
  return {
    version: '1.0',
    gopaymethod: '',
    mid: current.mid,
    oid,
    price,
    timestamp,
    use_chkfake: 'Y',
    signature: sha256(`${oid}${price}${timestamp}`),
    verification: sha256(`${oid}${price}${current.signKey}${timestamp}`),
    mKey: sha256(current.signKey),
    currency: 'WON',
    goodname: truncate(params.order.productTitle, 40),
    buyername: truncate(params.buyerName, 30),
    buyertel: truncate(params.order.buyerTel, 20),
    buyeremail: truncate(params.order.buyerEmail, 60),
    returnUrl: `${current.publicBaseUrl}/api/payment/inicis/return`,
    closeUrl: `${current.publicBaseUrl}/payment/close`,
    charset: 'UTF-8',
    merchantData: params.order.orderId,
  }
}

function isAllowedInicisUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && /^(?:stg|fc|ks)stdpay\.inicis\.com$/i.test(url.hostname)
  } catch (_error) {
    return false
  }
}

function parseNvp(value: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(value).entries())
}

async function readInicisResponse(response: Response): Promise<Record<string, string>> {
  const text = await response.text()
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>
    return Object.fromEntries(Object.entries(parsed).map(([key, item]) => [key, String(item ?? '')]))
  } catch (_error) {
    return parseNvp(text)
  }
}

export async function approveInicisPayment(params: {
  order: PaymentOrder
  authToken: string
  authUrl: string
}): Promise<InicisApprovalResult> {
  const current = config()
  if (!current.enabled) throw new Error('이니시스 결제 설정이 없습니다.')
  if (!isAllowedInicisUrl(params.authUrl)) throw new Error('허용되지 않은 이니시스 승인 URL입니다.')
  const timestamp = String(Date.now())
  const body = new URLSearchParams({
    mid: current.mid,
    authToken: params.authToken,
    timestamp,
    signature: sha256(`${params.authToken}${timestamp}`),
    verification: sha256(`${params.authToken}${current.signKey}${timestamp}`),
    charset: 'UTF-8',
    format: 'JSON',
    price: String(params.order.amount),
  })
  const response = await fetch(params.authUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    body,
  })
  const raw = await readInicisResponse(response)
  const resultCode = raw.resultCode || raw.P_STATUS || ''
  const resultMessage = raw.resultMsg || raw.P_RMESG1 || '승인 결과를 확인하지 못했습니다.'
  const returnedOrder = raw.MOID || raw.orderNumber || raw.P_OID || ''
  const returnedAmount = raw.TotPrice || raw.P_AMT || raw.price || ''
  if (!response.ok || resultCode !== '0000' || (returnedOrder && returnedOrder !== params.order.orderId) || (returnedAmount && Number(returnedAmount) !== params.order.amount)) {
    throw new Error(resultMessage)
  }
  return {
    resultCode,
    resultMessage,
    tid: raw.tid || raw.P_APPL_TID || raw.P_TID,
    payMethod: raw.payMethod || raw.P_TYPE,
    approvalCode: raw.applNum || raw.P_AUTH_NO,
    raw,
  }
}

export function inicisResultIsSuccess(value: unknown): boolean {
  return String(value ?? '') === '0000'
}
