import { configuredEnv } from '../env/load.js'
const base = configuredEnv(process.env.SUPABASE_URL)?.replace(/\/$/, '')
const key = configuredEnv(process.env.SUPABASE_SERVICE_ROLE_KEY)
function headers() {
  if (!base || !key) throw new Error('OPS_STORE_UNAVAILABLE')
  const result: Record<string, string> = { apikey: key, 'content-type': 'application/json' }
  if (!key.startsWith('sb_secret_') && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)) result.authorization = `Bearer ${key}`
  return result
}
type Job = { id: string; kind: string; target_id: string; attempts: number; max_attempts: number }
export async function listOpsJobs() {
  if (!base) throw new Error('OPS_STORE_UNAVAILABLE')
  const response = await fetch(`${base}/rest/v1/ops_jobs?select=id,kind,target_id,state,attempts,max_attempts,next_run_at,last_error,created_at,updated_at&order=updated_at.desc&limit=100`, { headers: headers() })
  if (!response.ok) throw new Error('OPS_LIST_FAILED'); return response.json()
}
export async function runOpsWorker(): Promise<{ claimed: number; retried: number; dead: number }> {
  if (!base) throw new Error('OPS_STORE_UNAVAILABLE')
  const claimed = await fetch(`${base}/rest/v1/rpc/claim_ops_jobs`, { method: 'POST', headers: headers(), body: JSON.stringify({ p_limit: 10, p_lease_seconds: 240 }) })
  if (!claimed.ok) throw new Error('OPS_CLAIM_FAILED')
  const jobs = await claimed.json() as Job[]; let retried = 0; let dead = 0
  for (const job of jobs) {
    // T14 creates the durable transport, not a fake delivery adapter. A job can
    // only become succeeded after a later Task installs its concrete handler.
    const state = job.attempts >= job.max_attempts ? 'dead' : 'retry'
    const body = state === 'retry'
      ? { state, next_run_at: new Date(Date.now() + 60_000 * Math.pow(2, Math.min(job.attempts, 6))).toISOString(), last_error: 'NO_OPS_HANDLER', lease_until: null, updated_at: new Date().toISOString() }
      : { state, last_error: 'NO_OPS_HANDLER', lease_until: null, updated_at: new Date().toISOString() }
    const response = await fetch(`${base}/rest/v1/ops_jobs?id=eq.${encodeURIComponent(job.id)}&state=eq.running`, { method: 'PATCH', headers: { ...headers(), prefer: 'return=minimal' }, body: JSON.stringify(body) })
    if (!response.ok) throw new Error('OPS_JOB_FINALIZE_FAILED')
    if (state === 'dead') dead++; else retried++
  }
  return { claimed: jobs.length, retried, dead }
}
