import { configuredEnv } from '../env/load.js'

export type AdminAccount = {
  id: string
  email: string
  passwordHash: string
  isActive: boolean
  role: 'super_admin'
  revision: number
  createdAt: string
  updatedAt: string
}

export type AdminAccountSummary = Omit<AdminAccount, 'passwordHash'>

const supabaseUrl = configuredEnv(process.env.SUPABASE_URL)?.replace(/\/$/, '')
const serviceRoleKey = configuredEnv(process.env.SUPABASE_SERVICE_ROLE_KEY)
const tableUrl = supabaseUrl ? `${supabaseUrl}/rest/v1/umsh_admin_accounts` : ''

function normalizedEmail(email: string): string {
  return email.trim().toLowerCase()
}

function headers(): Record<string, string> {
  if (!serviceRoleKey) throw new Error('ADMIN_ACCOUNT_STORE_UNAVAILABLE')
  const result: Record<string, string> = { apikey: serviceRoleKey }
  if (!serviceRoleKey.startsWith('sb_secret_') && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(serviceRoleKey)) {
    result.authorization = `Bearer ${serviceRoleKey}`
  }
  return result
}

function fromRow(row: Record<string, unknown>): AdminAccount {
  return {
    id: String(row.id),
    email: normalizedEmail(String(row.email)),
    passwordHash: String(row.password_hash),
    isActive: row.is_active === true,
    role: 'super_admin',
    revision: Number(row.revision) || 0,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

export function adminAccountStoreEnabled(): boolean {
  return String(process.env.UMSH_ADMIN_ACCOUNT_STORE ?? '').toLowerCase() === 'enabled'
}

export function adminAccountStoreAvailable(): boolean {
  return Boolean(tableUrl && serviceRoleKey)
}

export async function findAdminAccountByEmail(email: string): Promise<AdminAccount | null> {
  if (!tableUrl) throw new Error('ADMIN_ACCOUNT_STORE_UNAVAILABLE')
  const url = new URL(tableUrl)
  url.searchParams.set('email', `eq.${normalizedEmail(email)}`)
  url.searchParams.set('select', '*')
  url.searchParams.set('limit', '1')
  const response = await fetch(url, { headers: headers() })
  if (!response.ok) throw new Error('ADMIN_ACCOUNT_LOOKUP_FAILED')
  const rows = await response.json() as Array<Record<string, unknown>>
  return rows[0] ? fromRow(rows[0]) : null
}

export async function adminAccountCount(): Promise<number> {
  if (!tableUrl) throw new Error('ADMIN_ACCOUNT_STORE_UNAVAILABLE')
  const response = await fetch(`${tableUrl}?select=id`, { headers: { ...headers(), prefer: 'count=exact' } })
  if (!response.ok) throw new Error('ADMIN_ACCOUNT_LOOKUP_FAILED')
  const range = response.headers.get('content-range')
  const total = range?.split('/')[1]
  return total && /^\d+$/.test(total) ? Number(total) : (await response.json() as unknown[]).length
}

export async function listAdminAccounts(): Promise<AdminAccountSummary[]> {
  if (!tableUrl) throw new Error('ADMIN_ACCOUNT_STORE_UNAVAILABLE')
  const url = new URL(tableUrl)
  url.searchParams.set('select', 'id,email,is_active,role,revision,created_at,updated_at')
  url.searchParams.set('order', 'created_at.asc')
  const response = await fetch(url, { headers: headers() })
  if (!response.ok) throw new Error('ADMIN_ACCOUNT_LOOKUP_FAILED')
  return (await response.json() as Array<Record<string, unknown>>).map((row) => {
    const account = fromRow({ ...row, password_hash: '' })
    const { passwordHash: _passwordHash, ...summary } = account
    return summary
  })
}

export async function createAdminAccount(input: { email: string; passwordHash: string }): Promise<AdminAccount> {
  if (!tableUrl) throw new Error('ADMIN_ACCOUNT_STORE_UNAVAILABLE')
  const response = await fetch(tableUrl, {
    method: 'POST',
    headers: { ...headers(), 'content-type': 'application/json', prefer: 'return=representation' },
    body: JSON.stringify({ email: normalizedEmail(input.email), password_hash: input.passwordHash, role: 'super_admin' }),
  })
  if (!response.ok) throw new Error('ADMIN_ACCOUNT_CREATE_FAILED')
  const rows = await response.json() as Array<Record<string, unknown>>
  if (!rows[0]) throw new Error('ADMIN_ACCOUNT_CREATE_FAILED')
  return fromRow(rows[0])
}
