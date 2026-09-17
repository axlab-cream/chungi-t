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
const HANDLERS: Partial<Record<string, (job: Job) => Promise<boolean>>> = {
  [REPORT_COMPLETION_JOB_KIND]: async (job) => (await runReportCompletionJob(job.target_id)).done,
}
export async function listOpsJobs() {
  if (!base) throw new Error('OPS_STORE_UNAVAILABLE')
  const response = await fetch(`${base}/rest/v1/ops_jobs?select=id,kind,target_id,state,attempts,max_attempts,next_run_at,last_error,created_at,updated_at&order=updated_at.desc&limit=100`, { headers: headers() })
  if (!response.ok) throw new Error('OPS_LIST_FAILED'); return response.json()
}
export async function runOpsWorker(): Promise<{ claimed: number; retried: number; dead: number; succeeded: number }> {
  if (!base) throw new Error('OPS_STORE_UNAVAILABLE')
  const claimed = await fetch(`${base}/rest/v1/rpc/claim_ops_jobs`, { method: 'POST', headers: headers(), body: JSON.stringify({ p_limit: 10, p_lease_seconds: 240 }) })
  if (!claimed.ok) throw new Error('OPS_CLAIM_FAILED')
  const jobs = await claimed.json() as Job[]; let retried = 0; let dead = 0; let succeeded = 0
  for (const job of jobs) {
    const handler = HANDLERS[job.kind]
    // 처리기가 없으면 성공으로 닫지 않는다. 아무도 하지 않은 일이 끝난 것처럼 보인다.
    let error = handler ? '' : 'NO_OPS_HANDLER'
    let finished = false
    if (handler) {
      try { finished = await handler(job) }
      catch (cause) { error = cause instanceof Error ? cause.message.slice(0, 200) : 'OPS_HANDLER_FAILED' }
    }
    // 끝났으면 닫는다. 남았으면(진행은 했지만 미완) 재시도 — 다음 실행이 이어받는다.
    const state = finished ? 'succeeded' : job.attempts >= job.max_attempts ? 'dead' : 'retry'
    const now = new Date().toISOString()
    const body: Record<string, unknown> = { state, lease_until: null, updated_at: now, last_error: error || null }
    if (state === 'retry') {
      // 처리기가 일을 하고 남긴 경우엔 곧 이어간다. 실패한 경우에만 물러선다.
      const backoff = error ? 60_000 * Math.pow(2, Math.min(job.attempts, 6)) : 5_000
      body.next_run_at = new Date(Date.now() + backoff).toISOString()
    }
    const response = await fetch(`${base}/rest/v1/ops_jobs?id=eq.${encodeURIComponent(job.id)}&state=eq.running`, { method: 'PATCH', headers: { ...headers(), prefer: 'return=minimal' }, body: JSON.stringify(body) })
    if (!response.ok) throw new Error('OPS_JOB_FINALIZE_FAILED')
    if (state === 'succeeded') succeeded++; else if (state === 'dead') dead++; else retried++
  }
  return { claimed: jobs.length, retried, dead, succeeded }
}
