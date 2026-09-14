import { createHash, randomUUID } from 'node:crypto'
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


/* ── T22 쓰기 경로 ───────────────────────────────────────────────────────────
 *
 * 여기까지는 읽기만 있었다. 운영자가 서비스 문안을 고칠 방법이 없었고, 고칠 수 있게 되는
 * 순간부터는 **검증된 published 개정만** 새 고객 세션에 닿아야 한다.
 *
 * 지키는 것 세 가지.
 *   1. 정식 키(canonical key)는 바꿀 수 없다. 카탈로그에 없는 서비스는 만들 수 없다.
 *      — 없는 서비스를 지어내지 않기 위해서다.
 *   2. draft 저장과 publish 모두 revision CAS 를 건다. 두 운영자가 같은 화면을 보고
 *      고치면 나중 저장이 앞선 저장을 조용히 덮는다.
 *   3. publish 는 호출자가 보낸 checksum 이 저장된 draft 의 checksum 과 같을 때만 된다.
 *      검토한 내용과 실제로 게시되는 내용이 다를 수 없게 한다.
 *
 * 가격은 여기서 고객에게 반영되지 않는다. 유료 가격 변경은 결제 게이트를 거치는 별도
 * 경로(T29)이고, 이미 만들어진 주문은 어떤 경우에도 바뀌지 않는다. 그래서 payload 의
 * amount 는 값이 올바른지만 검증해 보관한다.
 */

export interface ServiceConfigPayload {
  title: string
  tagline: string
  summary: string
  category: string
  discoveryVisible: boolean
  /** 보관만 한다. 고객 노출 가격의 권한은 T29 전까지 카탈로그에 있다. */
  amount?: number
}

export interface ServiceConfigVersion {
  id: string
  serviceKey: string
  version: number
  payload: ServiceConfigPayload
  checksum: string
  state: 'draft' | 'published' | 'archived'
  authorEmail: string
  revision: number
  createdAt: string
  updatedAt: string
  publishedAt?: string
}

/** 새 draft 를 만들 때 쓰는 expectedRevision. 기존 draft 를 고치는 경우와 구분한다. */
export const NEW_SERVICE_DRAFT_REVISION = -1

const testVersions = new Map<string, ServiceConfigVersion>()
let versionTestMode = false

function canUseVersionTestStore(): boolean { return process.env.NODE_ENV === 'test' || versionTestMode }

export function resetServiceVersionStoreForTests(): void { versionTestMode = true; testVersions.clear() }

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b))
    return `{${entries.map(([itemKey, item]) => `${JSON.stringify(itemKey)}:${stableJson(item)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

/** 게시 대상 내용의 지문. 검토한 것과 게시되는 것이 같은지 이 값으로 맞춘다. */
export function serviceConfigChecksum(payload: ServiceConfigPayload): string {
  return createHash('sha256').update(stableJson(payload)).digest('hex')
}

function knownServiceKey(serviceKey: string): boolean {
  return listAdminServiceDirectory().some((service) => service.key === serviceKey)
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length >= 1 && trimmed.length <= max ? trimmed : null
}

/**
 * 운영자가 보낸 값을 정규화한다. 정식 키는 경로에서만 오고 payload 에서는 무시한다 —
 * payload 로 키를 바꿀 수 있으면 한 서비스의 문안이 다른 서비스로 게시될 수 있다.
 */
export function normalizeServiceConfigPayload(serviceKey: string, input: unknown): ServiceConfigPayload {
  if (!knownServiceKey(serviceKey)) throw new Error('SERVICE_VERSION_UNKNOWN_SERVICE')
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : null
  if (!source) throw new Error('SERVICE_VERSION_PAYLOAD_INVALID')

  const title = text(source.title, 60)
  const tagline = text(source.tagline, 120)
  const summary = text(source.summary, 400)
  const category = text(source.category, 20)
  if (!title || !tagline || !summary || !category) throw new Error('SERVICE_VERSION_PAYLOAD_INVALID')
  if (typeof source.discoveryVisible !== 'boolean') throw new Error('SERVICE_VERSION_PAYLOAD_INVALID')

  const payload: ServiceConfigPayload = { title, tagline, summary, category, discoveryVisible: source.discoveryVisible }
  if (source.amount !== undefined && source.amount !== null) {
    const amount = Number(source.amount)
    if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('SERVICE_VERSION_PRICE_INVALID')
    payload.amount = amount
  }
  return payload
}

function versionFromRow(row: Row): ServiceConfigVersion {
  return {
    id: String(row.id),
    serviceKey: String(row.service_key),
    version: Number(row.version),
    payload: row.payload as ServiceConfigPayload,
    checksum: String(row.checksum),
    state: String(row.state) as ServiceConfigVersion['state'],
    authorEmail: String(row.author_email),
    revision: Number(row.revision),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    publishedAt: row.published_at ? String(row.published_at) : undefined,
  }
}

/** PostgREST 오류 본문을 그대로 흘리지 않는다. 우리가 정의한 코드만 꺼낸다. */
function versionFailure(body: string, fallback: string): Error {
  try {
    const parsed = JSON.parse(body) as { message?: unknown }
    const message = typeof parsed.message === 'string' ? parsed.message.trim() : ''
    if (/^SERVICE_VERSION_[A-Z_]+$/.test(message)) return new Error(message)
  } catch { /* JSON 이 아니면 기본값 */ }
  return new Error(fallback)
}

async function callRpc(name: string, body: Record<string, unknown>, fallback: string): Promise<ServiceConfigVersion> {
  if (!supabaseUrl || !serviceRoleKey) throw new Error('SERVICE_VERSION_STORE_UNAVAILABLE')
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { ...headers(), 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw versionFailure(await response.text(), fallback)
  return versionFromRow(await response.json() as Row)
}

export async function saveServiceConfigDraft(input: {
  serviceKey: string
  payload: unknown
  authorEmail: string
  expectedRevision: number
}): Promise<ServiceConfigVersion> {
  const payload = normalizeServiceConfigPayload(input.serviceKey, input.payload)
  const checksum = serviceConfigChecksum(payload)
  const authorEmail = input.authorEmail.trim().toLowerCase()
  if (!/^\S+@\S+\.\S+$/.test(authorEmail)) throw new Error('SERVICE_VERSION_PAYLOAD_INVALID')
  if (!Number.isInteger(input.expectedRevision) || input.expectedRevision < NEW_SERVICE_DRAFT_REVISION) throw new Error('SERVICE_VERSION_PAYLOAD_INVALID')

  if (serviceVersionStoreAvailable()) {
    return callRpc('save_service_config_draft', {
      p_service_key: input.serviceKey, p_payload: payload, p_checksum: checksum,
      p_author_email: authorEmail, p_expected_revision: input.expectedRevision,
    }, 'SERVICE_VERSION_DRAFT_FAILED')
  }
  if (!canUseVersionTestStore()) throw new Error('SERVICE_VERSION_STORE_UNAVAILABLE')

  const now = new Date().toISOString()
  const existing = Array.from(testVersions.values()).find((item) => item.serviceKey === input.serviceKey && item.state === 'draft')
  if (existing) {
    if (input.expectedRevision === NEW_SERVICE_DRAFT_REVISION) throw new Error('SERVICE_VERSION_DRAFT_EXISTS')
    if (existing.revision !== input.expectedRevision) throw new Error('SERVICE_VERSION_REVISION_CONFLICT')
    const next: ServiceConfigVersion = { ...existing, payload, checksum, authorEmail, revision: existing.revision + 1, updatedAt: now }
    testVersions.set(next.id, next)
    return { ...next }
  }
  if (input.expectedRevision !== NEW_SERVICE_DRAFT_REVISION) throw new Error('SERVICE_VERSION_NOT_FOUND')
  const highest = Array.from(testVersions.values()).filter((item) => item.serviceKey === input.serviceKey).reduce((max, item) => Math.max(max, item.version), 0)
  const created: ServiceConfigVersion = {
    id: `test-${randomUUID()}`, serviceKey: input.serviceKey, version: highest + 1, payload, checksum,
    state: 'draft', authorEmail, revision: 0, createdAt: now, updatedAt: now,
  }
  testVersions.set(created.id, created)
  return { ...created }
}

export async function publishServiceConfigVersion(input: {
  serviceKey: string
  version: number
  checksum: string
  authorEmail: string
  expectedRevision: number
}): Promise<ServiceConfigVersion> {
  const authorEmail = input.authorEmail.trim().toLowerCase()
  if (!knownServiceKey(input.serviceKey)) throw new Error('SERVICE_VERSION_UNKNOWN_SERVICE')
  if (!Number.isSafeInteger(input.version) || input.version <= 0) throw new Error('SERVICE_VERSION_PAYLOAD_INVALID')
  if (!/^[a-f0-9]{64}$/.test(input.checksum)) throw new Error('SERVICE_VERSION_PAYLOAD_INVALID')
  if (!/^\S+@\S+\.\S+$/.test(authorEmail)) throw new Error('SERVICE_VERSION_PAYLOAD_INVALID')
  if (!Number.isInteger(input.expectedRevision) || input.expectedRevision < 0) throw new Error('SERVICE_VERSION_PAYLOAD_INVALID')

  if (serviceVersionStoreAvailable()) {
    return callRpc('publish_service_config_version', {
      p_service_key: input.serviceKey, p_version: input.version, p_checksum: input.checksum,
      p_author_email: authorEmail, p_expected_revision: input.expectedRevision,
    }, 'SERVICE_VERSION_PUBLISH_FAILED')
  }
  if (!canUseVersionTestStore()) throw new Error('SERVICE_VERSION_STORE_UNAVAILABLE')

  const target = Array.from(testVersions.values()).find((item) => item.serviceKey === input.serviceKey && item.version === input.version)
  if (!target) throw new Error('SERVICE_VERSION_NOT_FOUND')
  if (target.state !== 'draft') throw new Error('SERVICE_VERSION_NOT_DRAFT')
  if (target.revision !== input.expectedRevision) throw new Error('SERVICE_VERSION_REVISION_CONFLICT')
  // 검토한 내용과 게시되는 내용이 달라지지 않게 한다.
  if (target.checksum !== input.checksum) throw new Error('SERVICE_VERSION_CHECKSUM_MISMATCH')

  const now = new Date().toISOString()
  for (const item of Array.from(testVersions.values())) {
    if (item.serviceKey === input.serviceKey && item.state === 'published') {
      testVersions.set(item.id, { ...item, state: 'archived', revision: item.revision + 1, updatedAt: now })
    }
  }
  const published: ServiceConfigVersion = { ...target, state: 'published', authorEmail, revision: target.revision + 1, updatedAt: now, publishedAt: now }
  testVersions.set(published.id, published)
  return { ...published }
}

/** 게시된 개정만 돌려준다. 없으면 null — 임의의 대체 내용을 만들지 않는다. */
export async function getPublishedServiceConfig(serviceKey: string): Promise<ServiceConfigVersion | null> {
  if (!knownServiceKey(serviceKey)) return null
  if (serviceVersionStoreAvailable()) {
    const request = new URL(storeUrl())
    request.searchParams.set('select', 'id,service_key,version,payload,checksum,state,author_email,revision,created_at,updated_at,published_at')
    request.searchParams.set('service_key', `eq.${serviceKey}`)
    request.searchParams.set('state', 'eq.published')
    request.searchParams.set('limit', '1')
    const response = await fetch(request, { headers: headers() })
    if (!response.ok) throw versionFailure(await response.text(), 'SERVICE_VERSION_LOOKUP_FAILED')
    const rows = await response.json() as Row[]
    return rows.length ? versionFromRow(rows[0]) : null
  }
  if (!canUseVersionTestStore()) throw new Error('SERVICE_VERSION_STORE_UNAVAILABLE')
  const found = Array.from(testVersions.values()).find((item) => item.serviceKey === serviceKey && item.state === 'published')
  return found ? { ...found } : null
}
