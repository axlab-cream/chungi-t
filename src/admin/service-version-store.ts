import { configuredEnv } from '../env/load.js'
import { listAdminServiceDirectory } from '../server/service-directory.js'

type Row = Record<string, unknown>

export type AdminServiceVersionSummary = {
  canonicalKey: string
  title: string
  category: string
  amount: number
  discoveryVisible: boolean
  saleAvailable: boolean
  landingPath: string
  publishedVersion: number | null
  draftVersion: number | null
  revision: number | null
  updatedAt: string | null
}

export type AdminServiceVersionSnapshot = {
  services: AdminServiceVersionSummary[]
  versionStore: 'ready' | 'unavailable'
  asOf: string
}

const supabaseUrl = configuredEnv(process.env.SUPABASE_URL)?.replace(/\/$/, '')
const serviceRoleKey = configuredEnv(process.env.SUPABASE_SERVICE_ROLE_KEY)

function headers(): Record<string, string> {
  if (!serviceRoleKey) throw new Error('SERVICE_VERSION_STORE_UNAVAILABLE')
  const result: Record<string, string> = { apikey: serviceRoleKey }
  if (!serviceRoleKey.startsWith('sb_secret_') && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(serviceRoleKey)) {
    result.authorization = `Bearer ${serviceRoleKey}`
  }
  return result
}

function storeUrl(): string {
  if (!supabaseUrl || !serviceRoleKey) throw new Error('SERVICE_VERSION_STORE_UNAVAILABLE')
  return `${supabaseUrl}/rest/v1/service_config_versions`
}

export function serviceVersionStoreAvailable(): boolean {
  return Boolean(supabaseUrl && serviceRoleKey)
}

function validVersion(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

function latestByState(rows: Row[], state: 'draft' | 'published'): Map<string, Row> {
  const result = new Map<string, Row>()
  for (const row of rows) {
    if (row.state !== state || typeof row.service_key !== 'string' || validVersion(row.version) === null) continue
    const existing = result.get(row.service_key)
    if (!existing || Number(row.version) > Number(existing.version)) result.set(row.service_key, row)
  }
  return result
}

async function loadVersionRows(): Promise<Row[]> {
  const request = new URL(storeUrl())
  request.searchParams.set('select', 'service_key,version,state,revision,updated_at')
  request.searchParams.set('state', 'in.(draft,published)')
  request.searchParams.set('order', 'service_key.asc,version.desc')
  request.searchParams.set('limit', '1000')
  const response = await fetch(request, { headers: headers() })
  if (!response.ok) throw new Error('SERVICE_VERSION_LOOKUP_FAILED')
  return await response.json() as Row[]
}

export async function getAdminServiceVersionSnapshot(): Promise<AdminServiceVersionSnapshot> {
  let versionStore: AdminServiceVersionSnapshot['versionStore'] = 'unavailable'
  let rows: Row[] = []
  if (serviceVersionStoreAvailable()) {
    rows = await loadVersionRows()
    versionStore = 'ready'
  }
  const drafts = latestByState(rows, 'draft')
  const published = latestByState(rows, 'published')
  const services = listAdminServiceDirectory().map((service) => {
    const draft = drafts.get(service.key)
    const live = published.get(service.key)
    const current = draft ?? live
    return {
      canonicalKey: service.key,
      title: service.title,
      category: service.category,
      amount: service.amount,
      discoveryVisible: service.discoveryVisible,
      saleAvailable: true,
      landingPath: service.href,
      publishedVersion: validVersion(live?.version),
      draftVersion: validVersion(draft?.version),
      revision: current && Number.isSafeInteger(Number(current.revision)) ? Number(current.revision) : null,
      updatedAt: typeof current?.updated_at === 'string' ? current.updated_at : null,
    }
  })
  return { services, versionStore, asOf: new Date().toISOString() }
}
