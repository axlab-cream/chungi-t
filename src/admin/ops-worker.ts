import { opsBase, opsHeaders, opsStoreAvailable } from './ops-queue.js'
import { REPORT_COMPLETION_JOB_KIND, runReportCompletionJob } from '../report/report-completion-job.js'
const base = opsStoreAvailable() ? opsBase() : undefined
const headers = opsHeaders
type Job = { id: string; kind: string; target_id: string; attempts: number; max_attempts: number }

/**
 * 종류별 처리기. 여기 없는 종류는 예전처럼 `NO_OPS_HANDLER` 로 되돌린다 — 처리기가 없는
 * 작업을 성공으로 닫으면 아무도 하지 않은 일이 끝난 것처럼 보인다.
 *
 * 처리기는 **끝났는지**를 돌려준다. 결제한 해석은 섹션이 열둘까지 가서 한 번의 lease 안에
 * 다 못 끝낼 수 있다. 남았으면 retry 로 되돌려 다음 실행이 이어받게 한다.
 */
interface HandlerContext {
  /** 이 시각 전에 돌아와야 한다. 함수 강제 종료(300초) 보다 넉넉히 앞이다. */
  deadlineAt: number
}

const HANDLERS: Partial<Record<string, (job: Job, ctx: HandlerContext) => Promise<boolean>>> = {
  [REPORT_COMPLETION_JOB_KIND]: async (job, ctx) => (await runReportCompletionJob(job.target_id, { deadlineAt: ctx.deadlineAt })).done,
}

/**
 * 한 번의 실행이 쓰는 시간. Vercel 함수 한도 300초, lease 240초보다 앞에서 돌아온다.
 * 그래야 강제 종료로 lease 만료를 기다리는 4분 공백이 생기지 않는다.
 */
const WORKER_BUDGET_MS = 200_000

/**
 * 동시에 다루는 리포트 수.
 *
 * 리포트 **안**의 항목은 앞 항목을 참고해야 해서 순차다(품질). 하지만 서로 다른 리포트는
 * 독립이라 나란히 만들 수 있다. 예전에는 잡 10개를 한 줄로 세워 48항목짜리 하나가 다른
 * 열두 개를 전부 기다리게 했다. 셋으로 잡은 이유는 모델 호출 한도와 함수 메모리다 —
 * 늘리려면 429 가 안 나는지 먼저 본다.
 */
const WORKER_CONCURRENCY = 3
export async function listOpsJobs() {
  if (!base) throw new Error('OPS_STORE_UNAVAILABLE')
  const response = await fetch(`${base}/rest/v1/ops_jobs?select=id,kind,target_id,state,attempts,max_attempts,next_run_at,last_error,created_at,updated_at&order=updated_at.desc&limit=100`, { headers: headers() })
  if (!response.ok) throw new Error('OPS_LIST_FAILED'); return response.json()
}
export interface OpsWorkerOutcome {
  claimed: number
  retried: number
  dead: number
  succeeded: number
  /** 한 실행이 동시에 다룰 수 있는 작업 수. 이보다 적게 집었으면 큐에 여유가 있었다는 뜻이다. */
  capacity: number
}

export async function runOpsWorker(): Promise<OpsWorkerOutcome> {
  if (!base) throw new Error('OPS_STORE_UNAVAILABLE')
  /*
   * 차선 수만큼만 집는다.
   *
   * 예전에는 10개를 집어 3차선에 줄을 세웠다. 뒤에 선 작업은 앞 작업이 예산(200초)을 거의
   * 다 쓴 뒤에야 차례가 와서, 한 칸도 못 만들고 `retry` 로 돌아갔다 — 그런데 claim 은 집을
   * 때마다 attempts 를 올리므로, 아무 일도 못 한 작업이 시도 횟수만 태우다 dead 로 빠졌다.
   * 퇴사운 32/48 이 7시간 반 동안 실제 생성은 20분, 나머지는 죽어서 기다린 시간이었다
   * (2026-09-17 운영). 집는 수를 차선 수에 맞추면 집은 작업마다 예산을 온전히 쓴다. 나머지는
   * 다음 분 실행이 집는다 — cron 이 매분 돌고 실행은 200초까지 겹치므로 처리량은 줄지 않는다.
   */
  const claimed = await fetch(`${base}/rest/v1/rpc/claim_ops_jobs`, { method: 'POST', headers: headers(), body: JSON.stringify({ p_limit: WORKER_CONCURRENCY, p_lease_seconds: 240 }) })
  if (!claimed.ok) throw new Error('OPS_CLAIM_FAILED')
  const jobs = await claimed.json() as Job[]; let retried = 0; let dead = 0; let succeeded = 0
  const ctx: HandlerContext = { deadlineAt: Date.now() + WORKER_BUDGET_MS }
  let finalizeFailed = false

  async function processJob(job: Job): Promise<void> {
    const handler = HANDLERS[job.kind]
    // 처리기가 없으면 성공으로 닫지 않는다. 아무도 하지 않은 일이 끝난 것처럼 보인다.
    let error = handler ? '' : 'NO_OPS_HANDLER'
    let finished = false
    if (handler) {
      try { finished = await handler(job, ctx) }
      catch (cause) { error = cause instanceof Error ? cause.message.slice(0, 200) : 'OPS_HANDLER_FAILED' }
    }
    // 끝났으면 닫는다. 남았으면(진행은 했지만 미완) 재시도 — 다음 실행이 이어받는다.
    // dead 판정은 **실패한** 실행에만 한다. 예전 실패로 attempts 가 이미 한도에 닿은 작업이
    // 이번엔 오류 없이 진행했는데 dead 로 빠지면, 살아난 작업이 첫 진행에서 다시 죽는다.
    const state = finished ? 'succeeded' : !error ? 'retry' : job.attempts >= job.max_attempts ? 'dead' : 'retry'
    const now = new Date().toISOString()
    const body: Record<string, unknown> = { state, lease_until: null, updated_at: now, last_error: error || null }
    if (state === 'retry') {
      /*
       * 처리기가 일을 하고 남긴 경우엔 곧 이어간다. 실패한 경우에만 물러선다.
       * 물러서는 폭은 1·2·4·8분까지다. 예전엔 64분까지 갔다 — 결제한 사람이 한 시간을
       * 기다릴 이유가 없고, 그 사이 다른 실행이 아무 일도 못 한다.
       */
      const backoff = error ? 60_000 * Math.pow(2, Math.min(job.attempts, 3)) : 5_000
      body.next_run_at = new Date(Date.now() + backoff).toISOString()
      /*
       * 진행은 실패가 아니다. claim 이 올린 attempts 를 되돌려, 시도 횟수는 **실패한 실행**만
       * 센다. 그렇지 않으면 항목 48개짜리 리포트는 열 번을 집어야 끝나는데 다섯 번째에
       * dead 로 빠진다 — 한 번도 실패하지 않았는데도.
       */
      if (!error) body.attempts = Math.max(0, job.attempts - 1)
    }
    const response = await fetch(`${base}/rest/v1/ops_jobs?id=eq.${encodeURIComponent(job.id)}&state=eq.running`, { method: 'PATCH', headers: { ...headers(), prefer: 'return=minimal' }, body: JSON.stringify(body) })
    // 한 잡의 마감 실패가 나머지 잡을 세우지 않게 한다. 기록만 하고 끝에 한 번 던진다.
    if (!response.ok) { finalizeFailed = true; return }
    if (state === 'succeeded') succeeded++; else if (state === 'dead') dead++; else retried++
  }

  // 서로 다른 리포트는 독립이라 나란히 돈다. 한 리포트 안의 순서는 processJob 안에서 지킨다.
  const queue = [...jobs]
  const lanes = Array.from({ length: Math.min(WORKER_CONCURRENCY, queue.length) }, async () => {
    for (let job = queue.shift(); job; job = queue.shift()) await processJob(job)
  })
  await Promise.all(lanes)
  if (finalizeFailed) throw new Error('OPS_JOB_FINALIZE_FAILED')
  return { claimed: jobs.length, retried, dead, succeeded, capacity: WORKER_CONCURRENCY }
}
