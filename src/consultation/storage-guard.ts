import { Pool } from 'pg'
import { getReportStorageMode } from '../report/report-store.js'
import { ConsultationError } from './provider.js'

let pool: Pool | undefined
/** The credit ledger cannot live in rows the customer can update via Data API. */
export async function assertConsultationLedgerProtection(): Promise<void> {
  const mode = getReportStorageMode()
  if (process.env.NODE_ENV === 'test' || (mode === 'file' && !process.env.VERCEL && process.env.NODE_ENV !== 'production')) return
  try {
    if (mode === 'postgres') {
      pool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 10000, query_timeout: 10000 })
      const result = await pool.query('SELECT public.consultation_ledger_protection_ready() AS ready')
      if (result.rows[0]?.ready === true) return
    } else if (mode === 'supabase') {
      const base = (process.env.SUPABASE_URL || '').replace(/\/$/, '')
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!base || !key) throw new Error('unconfigured')
      const headers: Record<string, string> = { apikey: key, 'content-type': 'application/json' }
      if (!key.startsWith('sb_secret_')) headers.authorization = `Bearer ${key}`
      const response = await fetch(`${base}/rest/v1/rpc/consultation_ledger_protection_ready`, { method: 'POST', headers, body: '{}', signal: AbortSignal.timeout(10000) })
      if (response.ok && await response.json() === true) return
    }
  } catch { /* Missing migration and unavailable protection checks both fail closed. */ }
  throw new ConsultationError('CONSULTATION_STORAGE_PROTECTION_REQUIRED')
}
