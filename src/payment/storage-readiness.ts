/**
 * 저장소가 운영에 쓸 수 있는 상태인지 판정한다.
 *
 * `report-store` 에는 이 판정이 있었지만 **주문·프로필 저장소에는 없었다**(U20).
 * 그 상태에서 환경변수가 빠지면 `storageMode()` 가 조용히 `memory` 로 떨어지고,
 * 주문이 프로세스 메모리에만 쌓인다. 서버리스에서 그것은 **다음 요청에서 사라진다** —
 * 결제는 받았는데 주문 기록이 없는 상태가 된다.
 *
 * 그래서 판정은 두 가지를 한다.
 *  1. 상태를 보고할 수 있게 만든다 (`/api/health?storage=1`)
 *  2. **운영에서 비영속 모드면 쓰기를 거부한다** — 조용히 잃는 것보다 시끄럽게 막는 편이
 *     낫다. 이 상태에서는 이미 데이터를 잃고 있으므로 실패가 새 손해를 만들지 않는다
 */

export type StorageDurability = 'postgres' | 'supabase' | 'memory' | 'file'

export interface StorageReadiness {
  mode: StorageDurability
  /** 재시작·다음 요청 뒤에도 남는가. */
  durable: boolean
  /** 운영에서 이 모드로 쓰기를 허용해도 되는가. */
  ok: boolean
  errorCode?: string
}

/**
 * 운영 배포인지. Vercel 은 `VERCEL_ENV` 에 `production`·`preview`·`development` 를 준다.
 * Preview 는 운영이 아니므로 메모리 저장소를 막지 않는다 — 거기서 막으면 검수가 불가능하다.
 */
export function isProductionRuntime(): boolean {
  const vercelEnv = String(process.env.VERCEL_ENV ?? '').trim()
  if (vercelEnv) return vercelEnv === 'production'
  return process.env.NODE_ENV === 'production'
}

export function storageReadiness(mode: StorageDurability, keyMissing = false): StorageReadiness {
  const durable = mode !== 'memory'
  if (!durable) {
    return { mode, durable, ok: !isProductionRuntime(), errorCode: 'STORAGE_NOT_DURABLE' }
  }
  if (keyMissing) return { mode, durable, ok: false, errorCode: 'STORAGE_KEY_MISSING' }
  return { mode, durable, ok: true }
}

/**
 * 쓰기 직전 게이트. 운영에서 비영속 모드면 던진다.
 *
 * 메시지에 환경변수 **이름**도 담지 않는다. 이 오류는 고객 응답까지 올라갈 수 있다.
 */
export function assertDurableStorage(label: string, readiness: StorageReadiness): void {
  if (readiness.ok) return
  throw new Error(`${label} 저장소를 사용할 수 없습니다. 운영 담당자에게 문의해 주세요.`)
}
