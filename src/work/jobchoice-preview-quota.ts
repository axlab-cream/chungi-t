import { Pool } from 'pg'
import { configuredEnv } from '../env/load.js'

export interface JobChoicePreviewQuota {
  used: number
  limit: 5
  allowed: boolean
}

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? ''
const serviceKey = configuredEnv(process.env.SUPABASE_SERVICE_ROLE_KEY)
const connectionString = configuredEnv(process.env.DATABASE_URL)
const pool = connectionString ? new Pool({
  connectionString,
  ssl: /localhost|127\.0\.0\.1/i.test(connectionString) ? false : { rejectUnauthorized: false },
}) : null
const testClaims = new Map<string, Set<string>>()
const isTest = process.env.NODE_ENV === 'test' || process.env.npm_lifecycle_event === 'test'

function validateQuota(value: unknown): JobChoicePreviewQuota {
  const result = value as Partial<JobChoicePreviewQuota> | null
  if (!result || !Number.isInteger(result.used) || result.used! < 0 || result.used! > 5 || result.limit !== 5 || typeof result.allowed !== 'boolean') {
    throw new Error('직장 선택 무료 조회 횟수를 확인하지 못했습니다.')
  }
  return result as JobChoicePreviewQuota
}

async function callQuota(name: 'claim_job_choice_free_preview' | 'job_choice_free_preview_status', input: Record<string, string>): Promise<JobChoicePreviewQuota> {
  if (isTest) {
    const claims = testClaims.get(input.p_user_id) ?? new Set<string>()
    if (name === 'claim_job_choice_free_preview' && input.p_lineage_id && (claims.has(input.p_lineage_id) || claims.size < 5)) {
      claims.add(input.p_lineage_id)
      testClaims.set(input.p_user_id, claims)
    }
    const used = claims.size
    return { used, limit: 5, allowed: name === 'claim_job_choice_free_preview' ? claims.has(input.p_lineage_id) : used < 5 }
  }
  if (pool) {
    const query = name === 'claim_job_choice_free_preview'
      ? 'select public.claim_job_choice_free_preview($1, $2) as quota'
      : 'select public.job_choice_free_preview_status($1) as quota'
    const values = name === 'claim_job_choice_free_preview' ? [input.p_user_id, input.p_lineage_id] : [input.p_user_id]
    const result = await pool.query<{ quota: unknown }>(query, values)
    return validateQuota(result.rows[0]?.quota)
  }
  if (!supabaseUrl || !serviceKey) throw new Error('직장 선택 무료 조회 저장소가 설정되지 않았습니다.')
  const headers: Record<string, string> = { apikey: serviceKey, 'content-type': 'application/json' }
  if (!serviceKey.startsWith('sb_secret_') && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(serviceKey)) {
    headers.authorization = `Bearer ${serviceKey}`
  }
  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/${name}`, {
    method: 'POST', headers, body: JSON.stringify(input),
  })
  if (!response.ok) throw new Error('직장 선택 무료 조회 횟수를 저장하지 못했습니다.')
  return validateQuota(await response.json())
}

export function claimJobChoicePreview(ownerId: string, lineageId: string): Promise<JobChoicePreviewQuota> {
  if (!ownerId || !lineageId) throw new Error('직장 선택 무료 조회 계정과 입력 식별자가 필요합니다.')
  return callQuota('claim_job_choice_free_preview', { p_user_id: ownerId, p_lineage_id: lineageId })
}

export function jobChoicePreviewStatus(ownerId: string): Promise<JobChoicePreviewQuota> {
  if (!ownerId) throw new Error('직장 선택 무료 조회 계정이 필요합니다.')
  return callQuota('job_choice_free_preview_status', { p_user_id: ownerId })
}
