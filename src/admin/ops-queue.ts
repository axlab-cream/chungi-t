import { configuredEnv } from '../env/load.js'

/**
 * 영속 작업 큐의 전송 계층.
 *
 * `ops-worker` 가 작업을 꺼내 쓰고, 작업을 넣는 쪽(결제 완료 등)은 여기만 본다. 워커가
 * 넣기까지 들고 있으면 처리기 모듈이 워커를 다시 import 해 순환이 생긴다.
 */
const base = configuredEnv(process.env.SUPABASE_URL)?.replace(/\/$/, '')
const key = configuredEnv(process.env.SUPABASE_SERVICE_ROLE_KEY)

export function opsStoreAvailable(): boolean {
  return Boolean(base && key)
}

export function opsHeaders(): Record<string, string> {
  if (!base || !key) throw new Error('OPS_STORE_UNAVAILABLE')
  const result: Record<string, string> = { apikey: key, 'content-type': 'application/json' }
  if (!key.startsWith('sb_secret_') && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)) {
    result.authorization = `Bearer ${key}`
  }
  return result
}

export function opsBase(): string {
  if (!base) throw new Error('OPS_STORE_UNAVAILABLE')
  return base
}

export interface EnqueueOpsJobParams {
  kind: string
  targetId: string
  /** 같은 키로 두 번 넣어도 한 건만 남는다. 결제 재시도와 새로고침이 작업을 복제하지 않는다. */
  idempotencyKey: string
  payload?: Record<string, unknown>
  maxAttempts?: number
}

export type EnqueueOpsJobResult = 'queued' | 'duplicate' | 'requeued' | 'unavailable'

/**
 * 멱등키는 한 번 쓰이면 계속 남는다. 그래서 dead-letter 로 빠진 작업이 있으면 같은 키로는
 * 다시 넣을 수 없고, 그 리포트는 영원히 큐 밖에 남는다 — 멱등성이 복구를 막는 꼴이다.
 *
 * 이미 있는 작업이 끝나지 않은 상태(dead·retry)면 시각을 지금으로 되돌려 다시 태운다.
 * succeeded·running·queued 는 건드리지 않는다. 각각 이미 끝났거나 지금 도는 중이다.
 */
async function reviveStalledJob(idempotencyKey: string): Promise<boolean> {
  try {
    const url = new URL(`${opsBase()}/rest/v1/ops_jobs`)
    url.searchParams.set('idempotency_key', `eq.${idempotencyKey}`)
    url.searchParams.set('state', 'in.(dead,retry)')
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { ...opsHeaders(), prefer: 'return=representation' },
      body: JSON.stringify({
        state: 'queued', attempts: 0, lease_until: null,
        next_run_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }),
    })
    if (!response.ok) return false
    return ((await response.json()) as unknown[]).length > 0
  } catch { return false }
}

/**
 * 결제 흐름에서 부른다. 큐가 없거나 실패해도 **던지지 않는다** — 작업을 못 넣은 것이
 * 결제를 되돌릴 이유는 아니고, 사용자는 화면에서 생성이 시작되는 것을 이미 본다.
 * 큐는 사용자가 나갔을 때를 위한 보험이다.
 */
export async function enqueueOpsJob(params: EnqueueOpsJobParams): Promise<EnqueueOpsJobResult> {
  if (!opsStoreAvailable()) return 'unavailable'
  try {
    const response = await fetch(`${opsBase()}/rest/v1/ops_jobs`, {
      method: 'POST',
      headers: { ...opsHeaders(), prefer: 'return=minimal' },
      body: JSON.stringify({
        kind: params.kind,
        target_id: params.targetId,
        idempotency_key: params.idempotencyKey,
        payload: params.payload ?? {},
        ...(params.maxAttempts ? { max_attempts: params.maxAttempts } : {}),
      }),
    })
    if (response.ok) return 'queued'
    // 23505 = unique_violation. 같은 키의 작업이 이미 있다는 뜻이다. 그게 끝나지 않은 채
    // 멈춰 있으면(dead·retry) 다시 태우고, 아니면 그대로 둔다.
    if (response.status === 409) return await reviveStalledJob(params.idempotencyKey) ? 'requeued' : 'duplicate'
    return 'unavailable'
  } catch {
    return 'unavailable'
  }
}

/** 대상(리포트)이 지워졌을 때 그 작업 행을 함께 지운다. 큐가 없거나 실패해도 던지지 않는다. */
export async function deleteOpsJobsForTarget(targetId: string): Promise<number> {
  if (!opsStoreAvailable() || !/^[a-zA-Z0-9_-]{1,160}$/.test(targetId)) return 0
  try {
    const url = new URL(`${opsBase()}/rest/v1/ops_jobs`)
    url.searchParams.set('target_id', `eq.${targetId}`)
    const response = await fetch(url, { method: 'DELETE', headers: { ...opsHeaders(), prefer: 'return=representation' } })
    if (!response.ok) return 0
    return ((await response.json().catch(() => [])) as unknown[]).length
  } catch {
    return 0
  }
}

export interface OpsQueueReadiness {
  ok: boolean
  configured: boolean
  table?: 'ready' | 'missing' | 'denied' | 'error'
  claimRpc?: 'ready' | 'missing' | 'denied' | 'error'
  queued?: number
  /** 최근 100건의 상태 분포. dead 가 쌓이는지, running 이 비는지 여기서 보인다. */
  states?: Record<string, number>
  /**
   * 최근 100건에 남은 실패 코드와 횟수. 우리 코드가 남긴 대문자 코드만 싣고(예:
   * REPORT_SECTION_FAILED), 그 밖의 문장은 `OTHER` 로 묶는다 — 저장소 오류 문구가 밖으로 나가지 않게.
   */
  recentErrors?: Record<string, number>
  errorCode?: string
}

/** 상태 분포와 실패 코드. 한 번의 조회로 끝나며 값은 숫자와 고정 코드뿐이다. */
async function summarizeOpsJobs(): Promise<Pick<OpsQueueReadiness, 'states' | 'recentErrors'>> {
  try {
    const url = new URL(`${opsBase()}/rest/v1/ops_jobs`)
    url.searchParams.set('select', 'state,last_error')
    url.searchParams.set('order', 'updated_at.desc')
    url.searchParams.set('limit', '100')
    const response = await fetch(url, { headers: opsHeaders() })
    if (!response.ok) return {}
    const rows = await response.json() as Array<{ state?: string; last_error?: string | null }>
    const states: Record<string, number> = {}
    const recentErrors: Record<string, number> = {}
    for (const row of rows) {
      const state = String(row.state ?? 'unknown')
      states[state] = (states[state] ?? 0) + 1
      if (!row.last_error) continue
      const code = /^[A-Z][A-Z0-9_]{2,60}$/.test(row.last_error) ? row.last_error : 'OTHER'
      recentErrors[code] = (recentErrors[code] ?? 0) + 1
    }
    return { states, recentErrors }
  } catch {
    return {}
  }
}

/**
 * 큐가 실제로 살아 있는지 확인한다.
 *
 * 작업을 넣는 쪽은 실패해도 던지지 않게 해 두었다 — 결제를 막지 않기 위해서다. 그래서
 * 테이블이나 RPC 가 없으면 **아무 소리 없이 아무 일도 일어나지 않는다.** 2026-09-17 에
 * 운영에서 정확히 그 상태였다: 리포트 12건이 멈춰 있는데 어디가 막혔는지 볼 수가 없었다.
 *
 * 비밀은 담지 않는다. 테이블이 응답하는지와 대기 건수만 돌려준다.
 */
export async function checkOpsQueueReadiness(): Promise<OpsQueueReadiness> {
  if (!opsStoreAvailable()) return { ok: false, configured: false, errorCode: 'OPS_STORE_UNAVAILABLE' }
  const classify = (status: number) =>
    status === 404 ? 'missing' as const
      : status === 401 || status === 403 ? 'denied' as const
        : 'error' as const
  let table: OpsQueueReadiness['table']
  let queued: number | undefined
  try {
    const url = new URL(`${opsBase()}/rest/v1/ops_jobs`)
    url.searchParams.set('select', 'id')
    url.searchParams.set('state', 'eq.queued')
    const response = await fetch(url, { headers: { ...opsHeaders(), prefer: 'count=exact', range: '0-0' } })
    if (response.ok) {
      table = 'ready'
      const range = response.headers.get('content-range') ?? ''
      const total = Number(range.split('/')[1])
      if (Number.isFinite(total)) queued = total
    } else table = classify(response.status)
  } catch { table = 'error' }

  let claimRpc: OpsQueueReadiness['claimRpc']
  try {
    // p_limit 0 이면 아무것도 집지 않는다. 존재 여부만 본다.
    const response = await fetch(`${opsBase()}/rest/v1/rpc/claim_ops_jobs`, {
      method: 'POST', headers: opsHeaders(), body: JSON.stringify({ p_limit: 0, p_lease_seconds: 1 }),
    })
    claimRpc = response.ok ? 'ready' : classify(response.status)
  } catch { claimRpc = 'error' }

  const ok = table === 'ready' && claimRpc === 'ready'
  const summary = table === 'ready' ? await summarizeOpsJobs() : {}
  return {
    ok, configured: true, table, claimRpc, queued, ...summary,
    ...(ok ? {} : { errorCode: table !== 'ready' ? `OPS_TABLE_${String(table).toUpperCase()}` : `OPS_RPC_${String(claimRpc).toUpperCase()}` }),
  }
}
