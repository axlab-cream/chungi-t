import { networkInterfaces } from 'node:os'
import { configuredEnv } from '../env/load.js'
import { INICIS_LIVE_API_BASE_URL, createInicisSandboxAdapter, type InicisSandboxAdapter } from './inicis.js'
import { updatePaymentOrder, type PaymentOrder } from './order-store.js'
import { finishRefundExecution, type RefundRequest } from './refund-store.js'

/**
 * 관리자 환불 → 이니시스 결제 취소(2026-10-14).
 *
 * 예전에는 환불 요청·승인이 기록만 남기고 결제사는 부르지 않았다(pgCalled: false). 이제 관리자가
 * 경고 팝업을 확인하면 INIAPI 전체취소(/v2/pg/refund)를 보낸다. 부분취소는 남은 금액 계산과
 * 재승인 방식(prtcType)까지 다뤄야 해서 아직 열지 않는다. 부분 환불은 이니시스 상점관리자에서 한다.
 */

/** 이니시스로 취소할 수 없는 결제. 구글 앱 결제는 Play Console 에서, 테스트 결제는 돈이 오가지 않았다. */
export function refundUnsupportedReason(order: PaymentOrder): string | null {
  const method = String(order.payMethod ?? '').toUpperCase()
  if (method === 'GOOGLE_PLAY') return 'REFUND_PROVIDER_UNSUPPORTED'
  if (method === 'TEST') return 'REFUND_PROVIDER_UNSUPPORTED'
  if (!order.tid?.trim()) return 'REFUND_TID_MISSING'
  return null
}

export function isInicisRefundConfigured(): boolean {
  return Boolean(configuredEnv(process.env.INICIS_MID) && configuredEnv(process.env.INICIS_INIAPI_KEY))
}

/**
 * INIAPI 의 clientIp 는 "가맹점 요청 서버IP(추후 거래 확인 등에 사용)"다. 허용 목록 검사는 매뉴얼에
 * 없다. Vercel 서버는 나가는 IP 가 고정되지 않으므로 설정값이 있으면 그것을, 없으면 이 서버의
 * 외부 IPv4 를 쓴다.
 */
function serverIp(): string {
  const configured = configuredEnv(process.env.INICIS_API_CLIENT_IP)
  if (configured) return configured
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === 'IPv4' && !entry.internal) return entry.address
    }
  }
  return '127.0.0.1'
}

function liveAdapter(): InicisSandboxAdapter {
  return createInicisSandboxAdapter({
    mid: configuredEnv(process.env.INICIS_MID) ?? '',
    iniApiKey: configuredEnv(process.env.INICIS_INIAPI_KEY) ?? '',
    clientIp: serverIp(),
    baseUrl: INICIS_LIVE_API_BASE_URL,
    transport: ({ url, init }) => fetch(url, init),
  })
}

export type RefundExecution = {
  refund: RefundRequest
  outcome: 'succeeded' | 'failed' | 'unknown'
  /** 관리자에게 보여 줄 결과 문장. 결제사 원문은 failed 일 때만 덧붙인다. */
  message: string
}

type Dependencies = {
  adapter: () => InicisSandboxAdapter
  finish: typeof finishRefundExecution
  updateOrder: typeof updatePaymentOrder
}

const runtime: Dependencies = { adapter: liveAdapter, finish: finishRefundExecution, updateOrder: updatePaymentOrder }

/**
 * processing 상태의 환불을 이니시스로 보낸다.
 *
 * - 성공, 또는 "이미 취소된 거래"(500626, 이니시스 상점관리자에서 먼저 취소한 경우): succeeded, 주문은 cancelled
 * - 이니시스가 거절: failed. 돈은 그대로다
 * - 응답 지연·통신 오류: unknown. 취소됐는지 모르므로 이니시스 상점관리자에서 확인해야 한다
 */
export async function executeInicisRefund(params: { refund: RefundRequest, order: PaymentOrder }, dependencies: Dependencies = runtime): Promise<RefundExecution> {
  const { refund, order } = params
  if (refund.state !== 'processing') throw new Error('REFUND_NOT_REQUESTED')
  let outcome: RefundExecution['outcome']
  let message: string
  try {
    const result = await dependencies.adapter().cancel({ tid: String(order.tid), reason: refund.reason.slice(0, 80) })
    if (result.success || result.duplicate) {
      outcome = 'succeeded'
      message = result.duplicate ? '이니시스에서 이미 취소된 결제입니다. 우리 기록도 취소로 맞췄습니다.' : '이니시스 결제를 취소했습니다.'
    } else {
      outcome = 'failed'
      message = `이니시스가 취소를 거절했습니다. 결제는 그대로입니다. (${result.resultCode} ${result.resultMessage})`
    }
  } catch (error) {
    // 시간 초과·통신 오류는 취소가 됐는지 모른다. 다시 보내면 이중 처리 위험이 있어 확인 대기로 둔다.
    console.error('REFUND_PG_UNCERTAIN', refund.id, error instanceof Error ? error.message : 'unknown')
    outcome = 'unknown'
    message = '이니시스 응답을 받지 못해 취소 여부를 모릅니다. 이니시스 상점관리자에서 이 결제를 확인해 주세요.'
  }
  const finished = await dependencies.finish({ refundId: refund.id, expectedRevision: refund.revision, state: outcome })
  if (outcome === 'succeeded') {
    const saved = await dependencies.updateOrder(order.orderId, { status: 'cancelled', message: '관리자 환불로 결제가 취소되었습니다.' })
    if (!saved) message += ' 다만 주문 상태를 바꾸지 못했습니다. 결제 내역을 새로고침해 확인해 주세요.'
  }
  return { refund: finished, outcome, message }
}
