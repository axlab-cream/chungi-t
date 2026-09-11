import { configuredEnv } from '../env/load.js'
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

export type InicisSandboxTransport = (request: {
  url: string
  init: RequestInit
}) => Promise<Response>

export interface InicisInquiryResult {
  success: boolean
  status: 'approved' | 'cancelled' | 'not_found' | 'pending' | 'unknown'
  resultCode: string
  resultMessage: string
  tid?: string
  orderId?: string
  amount?: number
  raw: Record<string, string>
}

export interface InicisCancelResult {
  success: boolean
  duplicate: boolean
  terminal: boolean
  resultCode: string
  resultMessage: string
  cancelledAt?: string
  raw: Record<string, string>
}

export interface InicisSandboxAdapter {
  inquire(params: { tid?: string, oid?: string, timeoutMs?: number }): Promise<InicisInquiryResult>
  cancel(params: { tid: string, reason: string, timeoutMs?: number }): Promise<InicisCancelResult>
}

const INICIS_SANDBOX_API_BASE_URL = 'https://stginiapi.inicis.com'
const INICIS_SANDBOX_INQUIRY_URL = `${INICIS_SANDBOX_API_BASE_URL}/v2/pg/inquiry`
const INICIS_SANDBOX_REFUND_URL = `${INICIS_SANDBOX_API_BASE_URL}/v2/pg/refund`

function envValue(value: string | undefined, fallback: string): string {
  return value?.trim() || fallback
}

function config(): InicisConfig {
  const publicBaseUrl = envValue(process.env.PUBLIC_BASE_URL, 'https://umsh.kr').replace(/\/$/, '')
  const mid = configuredEnv(process.env.INICIS_MID) ?? ''
  const signKey = configuredEnv(process.env.INICIS_SIGNKEY) ?? ''
  return { mid, signKey, publicBaseUrl, enabled: Boolean(mid && signKey) }
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

function sha512(value: string): string {
  return createHash('sha512').update(value, 'utf8').digest('hex')
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

function requiredInicisApiField(value: string | undefined, label: string, limit: number): string {
  const normalized = value?.trim() ?? ''
  if (!normalized) throw new Error(`${label}이 필요합니다.`)
  if (normalized.length > limit) throw new Error(`${label} 길이가 허용 범위를 초과했습니다.`)
  return normalized
}

function boundedTimeout(value: number | undefined): number {
  if (value === undefined) return 8000
  if (!Number.isInteger(value) || value < 100 || value > 30000) {
    throw new Error('sandbox 요청 timeout은 100ms 이상 30000ms 이하여야 합니다.')
  }
  return value
}

export function formatInicisApiTimestamp(value: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value)
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${byType.year}${byType.month}${byType.day}${byType.hour}${byType.minute}${byType.second}`
}

function queryStatus(value: string | undefined): InicisInquiryResult['status'] {
  switch (value) {
    case '0':
    case 'Y':
      return 'approved'
    case '1':
    case 'C':
      return 'cancelled'
    case '9':
      return 'not_found'
    case 'N':
      return 'pending'
    default:
      return 'unknown'
  }
}

function resultIsSuccess(value: string): boolean {
  return value === 'SUCCESS' || value === '00'
}

function cancelledAt(raw: Record<string, string>): string | undefined {
  const date = raw.cancelDate
  const time = raw.cancelTime
  if (!/^\d{8}$/.test(date ?? '') || !/^\d{6}$/.test(time ?? '')) return undefined
  return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T${time.slice(0, 2)}:${time.slice(2, 4)}:${time.slice(4, 6)}+09:00`
}

async function sendSandboxRequest(params: {
  url: string
  body: Record<string, unknown>
  timeoutMs: number
  transport: InicisSandboxTransport
}): Promise<Record<string, string>> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error('INICIS_SANDBOX_TIMEOUT')), params.timeoutMs)
  })
  try {
    const response = await Promise.race([
      params.transport({
        url: params.url,
        init: {
          method: 'POST',
          headers: { 'content-type': 'application/json; charset=UTF-8' },
          body: JSON.stringify(params.body),
        },
      }),
      timeout,
    ])
    const raw = await readInicisResponse(response)
    if (!response.ok && !raw.resultCode) {
      raw.resultCode = `HTTP_${response.status}`
      raw.resultMsg = raw.resultMsg || 'INIAPI sandbox 응답이 성공 상태가 아닙니다.'
    }
    return raw
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/**
 * INIAPI v2 contract adapter used only with a caller-injected sandbox transport.
 * This boundary neither uses global fetch nor persists/refunds an order. T17 owns
 * live execution after durable refund intent and independent approval exist.
 */
export function createInicisSandboxAdapter(params: {
  mid: string
  iniApiKey: string
  clientIp: string
  transport: InicisSandboxTransport
  now?: () => Date
}): InicisSandboxAdapter {
  const mid = requiredInicisApiField(params.mid, '이니시스 MID', 10)
  const iniApiKey = requiredInicisApiField(params.iniApiKey, 'INIAPI Key', 256)
  const clientIp = requiredInicisApiField(params.clientIp, '가맹점 서버 IP', 45)
  const now = params.now ?? (() => new Date())

  function createRequest(type: 'inquiry' | 'refund', data: Record<string, string>) {
    const timestamp = formatInicisApiTimestamp(now())
    const serializedData = JSON.stringify(data)
    return {
      mid,
      type,
      timestamp,
      clientIp,
      hashData: sha512(`${iniApiKey}${mid}${type}${timestamp}${serializedData}`),
      data,
    }
  }

  return {
    async inquire(input): Promise<InicisInquiryResult> {
      const tid = input.tid?.trim()
      const oid = input.oid?.trim()
      if (Boolean(tid) === Boolean(oid)) throw new Error('거래 조회에는 TID 또는 주문번호를 정확히 하나 입력해야 합니다.')
      const data: Record<string, string> = tid
        ? { tid: requiredInicisApiField(tid, 'TID', 40) }
        : { oid: requiredInicisApiField(oid, '주문번호', 80) }
      const raw = await sendSandboxRequest({
        url: INICIS_SANDBOX_INQUIRY_URL,
        body: createRequest('inquiry', data),
        timeoutMs: boundedTimeout(input.timeoutMs),
        transport: params.transport,
      })
      const amount = Number(raw.price)
      return {
        success: resultIsSuccess(raw.resultCode ?? ''),
        status: queryStatus(raw.status),
        resultCode: raw.resultCode ?? '',
        resultMessage: raw.resultMsg ?? '거래 조회 결과를 확인하지 못했습니다.',
        tid: raw.tid || undefined,
        orderId: raw.oid || undefined,
        amount: Number.isFinite(amount) && amount >= 0 ? amount : undefined,
        raw,
      }
    },

    async cancel(input): Promise<InicisCancelResult> {
      const data = {
        tid: requiredInicisApiField(input.tid, 'TID', 40),
        msg: requiredInicisApiField(input.reason, '취소 사유', 80),
      }
      const raw = await sendSandboxRequest({
        url: INICIS_SANDBOX_REFUND_URL,
        body: createRequest('refund', data),
        timeoutMs: boundedTimeout(input.timeoutMs),
        transport: params.transport,
      })
      const duplicate = raw.resultCode === '500626' || raw.detailResultCode === '500626'
      const success = resultIsSuccess(raw.resultCode ?? '')
      return {
        success,
        duplicate,
        terminal: success || duplicate,
        resultCode: raw.resultCode ?? '',
        resultMessage: raw.resultMsg ?? '취소 결과를 확인하지 못했습니다.',
        cancelledAt: cancelledAt(raw),
        raw,
      }
    },
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
