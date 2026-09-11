import { createHash } from 'node:crypto'
import { configuredEnv } from '../env/load.js'
import { listAdminServiceDirectory } from '../server/service-directory.js'
import { safeServiceDraftFields, type ServiceDraftFields } from './service-draft.js'

type Row = Record<string, unknown>

export type AdminServiceVersionSummary = {
  canonicalKey: string
  title: string
  category: string
  amount: number
  discoveryVisible: boolean
  saleAvailable: boolean
  landingPath: string
  tagline: string
  summary: string
  publishedVersion: number | null
  draftVersion: number | null
  revision: number | null
  updatedAt: string | null
  draft: AdminServiceDraft | null
}

export type AdminServiceDraft = {
  id: string
  canonicalKey: string
  version: number
  revision: number
  fields: ServiceDraftFields
  updatedAt: string
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

function rpcUrl(name: string): string {
  if (!supabaseUrl || !serviceRoleKey) throw new Error('SERVICE_VERSION_STORE_UNAVAILABLE')
  return `${supabaseUrl}/rest/v1/rpc/${name}`
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
  request.searchParams.set('select', 'id,service_key,version,state,revision,payload,updated_at')
  request.searchParams.set('state', 'in.(draft,published)')
  request.searchParams.set('order', 'service_key.asc,version.desc')
  request.searchParams.set('limit', '1000')
  const response = await fetch(request, { headers: headers() })
  if (!response.ok) throw new Error('SERVICE_VERSION_LOOKUP_FAILED')
  return await response.json() as Row[]
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`
  return JSON.stringify(value)
}

function checksum(fields: ServiceDraftFields): string {
  return createHash('sha256').update(stableJson(fields)).digest('hex')
}

function draftFromRow(row: Row | undefined): AdminServiceDraft | null {
  if (!row || typeof row.id !== 'string' || typeof row.service_key !== 'string' || typeof row.updated_at !== 'string') return null
  const version = validVersion(row.version)
  const revision = Number(row.revision)
  const fields = safeServiceDraftFields(row.service_key, row.payload)
  if (version === null || !Number.isSafeInteger(revision) || revision < 0 || !fields) return null
  return { id: row.id, canonicalKey: row.service_key, version, revision, fields, updatedAt: row.updated_at }
}

async function parseDraftResponse(response: Response, failureCode: string): Promise<AdminServiceDraft> {
  if (!response.ok) throw new Error(failureCode)
  const row = (await response.json() as Row[])[0]
  const draft = draftFromRow(row)
  if (!draft) throw new Error(failureCode)
  return draft
}

export async function createAdminServiceDraft(input: { canonicalKey: string, fields: ServiceDraftFields, authorEmail: string }): Promise<AdminServiceDraft> {
  const response = await fetch(rpcUrl('create_service_config_draft'), {
    method: 'POST',
    headers: { ...headers(), 'content-type': 'application/json' },
    body: JSON.stringify({ p_service_key: input.canonicalKey, p_payload: input.fields, p_checksum: checksum(input.fields), p_author_email: input.authorEmail.toLowerCase() }),
  })
  return parseDraftResponse(response, response.status === 409 ? 'SERVICE_DRAFT_EXISTS' : 'SERVICE_DRAFT_CREATE_FAILED')
}

export async function updateAdminServiceDraft(input: { id: string, canonicalKey: string, expectedRevision: number, fields: ServiceDraftFields }): Promise<AdminServiceDraft | null> {
  const request = new URL(storeUrl())
  request.searchParams.set('id', `eq.${input.id}`)
  request.searchParams.set('service_key', `eq.${input.canonicalKey}`)
  request.searchParams.set('state', 'eq.draft')
  request.searchParams.set('revision', `eq.${input.expectedRevision}`)
  request.searchParams.set('select', 'id,service_key,version,state,revision,payload,updated_at')
  const response = await fetch(request, {
    method: 'PATCH',
    headers: { ...headers(), 'content-type': 'application/json', prefer: 'return=representation' },
    body: JSON.stringify({ payload: input.fields, checksum: checksum(input.fields), revision: input.expectedRevision + 1, updated_at: new Date().toISOString() }),
  })
  if (!response.ok) throw new Error('SERVICE_DRAFT_UPDATE_FAILED')
  const row = (await response.json() as Row[])[0]
  return row ? draftFromRow(row) : null
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
      tagline: service.tagline,
      summary: service.summary,
      publishedVersion: validVersion(live?.version),
      draftVersion: validVersion(draft?.version),
      revision: current && Number.isSafeInteger(Number(current.revision)) ? Number(current.revision) : null,
      updatedAt: typeof current?.updated_at === 'string' ? current.updated_at : null,
      draft: draftFromRow(draft),
    }
  })
  return { services, versionStore, asOf: new Date().toISOString() }
}
