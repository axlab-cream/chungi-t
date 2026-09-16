import { randomUUID } from 'node:crypto'
import { configuredEnv } from '../env/load.js'
import { inspectMediaFile, type MediaInspection, type ValidMediaUploadInput } from './media-file-inspection.js'

const MEDIA_BUCKET = 'umsh-media'
type Fetch = typeof globalThis.fetch
type Row = Record<string, unknown>

export type ManagedMediaAsset = {
  id: string
  source: 'storage'
  name: string
  kind: 'image' | 'video'
  mime: string
  bytes: number
  width: number | null
  height: number | null
  durationSeconds: number | null
  checksum: string | null
  publicUrl: string | null
  references: string[]
  posterAssetId: string | null
  alt: string
  rightsStatus: 'recorded'
  rightsBasis: string
  rightsEvidence: string
  state: 'uploading' | 'inspecting' | 'approved' | 'rejected'
  rejectionCode: string | null
  deleteBlocked: boolean
  createdAt: string
  validation: { status: 'valid' | 'invalid', issues: string[] }
}

export class MediaStoreError extends Error {
  constructor(public readonly code: string) { super(code) }
}

type MediaStoreConfig = { supabaseUrl: string, serviceRoleKey: string, fetch?: Fetch }

function objectPath(id: string, fileName: string): string {
  return `uploads/${id}/${fileName.replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^-+|-+$/g, '') || 'asset'}`
}

function encodeStoragePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/')
}

function parseNumber(value: unknown): number | null {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : null
}

function rowToAsset(row: Row, references: string[] = [], previewUrl: string | null = null, posterUseCount = 0): ManagedMediaAsset {
  const state = String(row.state)
  if (!['uploading', 'inspecting', 'approved', 'rejected'].includes(state)) throw new MediaStoreError('MEDIA_ASSET_ROW_INVALID')
  return {
    id: String(row.id), source: 'storage', name: String(row.original_name),
    kind: row.kind === 'video' ? 'video' : 'image', mime: String(row.mime_type),
    bytes: parseNumber(row.byte_size) ?? parseNumber(row.declared_bytes) ?? 0,
    width: parseNumber(row.width), height: parseNumber(row.height), durationSeconds: parseNumber(row.duration_seconds),
    checksum: typeof row.checksum === 'string' ? row.checksum : null,
    publicUrl: previewUrl, references,
    posterAssetId: typeof row.poster_asset_id === 'string' ? row.poster_asset_id : null,
    alt: String(row.alt_text), rightsStatus: 'recorded', rightsBasis: String(row.rights_basis), rightsEvidence: String(row.rights_evidence),
    state: state as ManagedMediaAsset['state'], rejectionCode: typeof row.rejection_code === 'string' ? row.rejection_code : null,
    deleteBlocked: references.length > 0 || posterUseCount > 0,
    createdAt: String(row.created_at),
    validation: { status: state === 'approved' ? 'valid' : 'invalid', issues: state === 'rejected' && typeof row.rejection_code === 'string' ? [row.rejection_code] : [] },
  }
}

async function errorCode(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.clone().json() as Record<string, unknown>
    const message = String(body.message ?? body.code ?? '')
    const known = message.match(/MEDIA_[A-Z_]+/)?.[0]
    return known ?? fallback
  } catch { return fallback }
}

export function createMediaStore(config: MediaStoreConfig) {
  const supabaseUrl = config.supabaseUrl.replace(/\/$/, '')
  const serviceRoleKey = config.serviceRoleKey
  const fetcher = config.fetch ?? globalThis.fetch
  if (!supabaseUrl || !serviceRoleKey) throw new MediaStoreError('MEDIA_STORE_UNAVAILABLE')

  function serviceHeaders(extra: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = { apikey: serviceRoleKey, ...extra }
    if (!serviceRoleKey.startsWith('sb_secret_')) headers.authorization = `Bearer ${serviceRoleKey}`
    return headers
  }

  async function ensureBucket(): Promise<void> {
    const found = await fetcher(`${supabaseUrl}/storage/v1/bucket/${MEDIA_BUCKET}`, { headers: serviceHeaders(), signal: AbortSignal.timeout(5000) })
    if (found.ok) return
    if (found.status !== 404) throw new MediaStoreError('MEDIA_BUCKET_LOOKUP_FAILED')
    const created = await fetcher(`${supabaseUrl}/storage/v1/bucket`, {
      method: 'POST', headers: serviceHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify({ id: MEDIA_BUCKET, name: MEDIA_BUCKET, public: false, file_size_limit: 50 * 1024 * 1024, allowed_mime_types: ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4'] }),
      signal: AbortSignal.timeout(5000),
    })
    if (!created.ok && created.status !== 409) throw new MediaStoreError('MEDIA_BUCKET_CREATE_FAILED')
  }

  async function loadRow(id: string, states?: string[]): Promise<Row> {
    const request = new URL(`${supabaseUrl}/rest/v1/media_assets`)
    request.searchParams.set('select', '*'); request.searchParams.set('id', `eq.${id}`)
    if (states?.length) request.searchParams.set('state', `in.(${states.join(',')})`)
    const response = await fetcher(request, { headers: serviceHeaders(), signal: AbortSignal.timeout(5000) })
    if (!response.ok) throw new MediaStoreError('MEDIA_ASSET_LOOKUP_FAILED')
    const row = (await response.json() as Row[])[0]
    if (!row) throw new MediaStoreError('MEDIA_ASSET_NOT_FOUND')
    return row
  }

  async function patchRow(id: string, fields: Row): Promise<Row> {
    const request = new URL(`${supabaseUrl}/rest/v1/media_assets`)
    request.searchParams.set('id', `eq.${id}`); request.searchParams.set('select', '*')
    const response = await fetcher(request, {
      method: 'PATCH', headers: serviceHeaders({ 'content-type': 'application/json', prefer: 'return=representation' }),
      body: JSON.stringify({ ...fields, updated_at: new Date().toISOString() }), signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) throw new MediaStoreError('MEDIA_ASSET_UPDATE_FAILED')
    const row = (await response.json() as Row[])[0]
    if (!row) throw new MediaStoreError('MEDIA_ASSET_UPDATE_FAILED')
    return row
  }

  async function signedPreview(row: Row): Promise<string | null> {
    if (row.state !== 'approved') return null
    const response = await fetcher(`${supabaseUrl}/storage/v1/object/sign/${MEDIA_BUCKET}/${encodeStoragePath(String(row.object_path))}`, {
      method: 'POST', headers: serviceHeaders({ 'content-type': 'application/json' }), body: JSON.stringify({ expiresIn: 900 }), signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) return null
    const body = await response.json() as { signedURL?: string, signedUrl?: string }
    const relative = body.signedURL ?? body.signedUrl
    return relative ? `${supabaseUrl}/storage/v1${relative}` : null
  }

  async function removeObject(path: string): Promise<void> {
    const response = await fetcher(`${supabaseUrl}/storage/v1/object/${MEDIA_BUCKET}`, {
      method: 'DELETE', headers: serviceHeaders({ 'content-type': 'application/json' }), body: JSON.stringify({ prefixes: [path] }), signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) throw new MediaStoreError('MEDIA_STORAGE_DELETE_FAILED')
  }

  async function verifyPoster(id: string): Promise<void> {
    const row = await loadRow(id, ['approved'])
    if (row.kind !== 'image') throw new MediaStoreError('MEDIA_POSTER_INVALID')
  }

  async function beginUploadRecord(args: { id?: string, actorEmail: string, input: ValidMediaUploadInput }): Promise<ManagedMediaAsset> {
    const id = args.id ?? randomUUID()
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new MediaStoreError('MEDIA_ASSET_ID_INVALID')
    if (args.input.posterAssetId) await verifyPoster(args.input.posterAssetId)
    await ensureBucket()
    const path = objectPath(id, args.input.fileName)
    const response = await fetcher(`${supabaseUrl}/rest/v1/media_assets?select=*`, {
      method: 'POST', headers: serviceHeaders({ 'content-type': 'application/json', prefer: 'return=representation' }),
      body: JSON.stringify({
        id, bucket_id: MEDIA_BUCKET, object_path: path, original_name: args.input.fileName,
        kind: args.input.kind, mime_type: args.input.mime, declared_bytes: args.input.bytes,
        alt_text: args.input.alt, rights_basis: args.input.rightsBasis, rights_evidence: args.input.rightsEvidence,
        poster_asset_id: args.input.posterAssetId, state: 'uploading', created_by_email: args.actorEmail.toLowerCase(),
      }), signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) throw new MediaStoreError(await errorCode(response, 'MEDIA_ASSET_CREATE_FAILED'))
    const row = (await response.json() as Row[])[0]
    if (!row) throw new MediaStoreError('MEDIA_ASSET_CREATE_FAILED')
    return rowToAsset(row)
  }

  async function createUploadUrl(id: string): Promise<string> {
    const row = await loadRow(id, ['uploading'])
    const signed = await fetcher(`${supabaseUrl}/storage/v1/object/upload/sign/${MEDIA_BUCKET}/${encodeStoragePath(String(row.object_path))}`, {
      method: 'POST', headers: serviceHeaders({ 'content-type': 'application/json', 'x-upsert': 'false' }), body: '{}', signal: AbortSignal.timeout(5000),
    })
    if (!signed.ok) throw new MediaStoreError('MEDIA_UPLOAD_URL_FAILED')
    const data = await signed.json() as { url?: string }
    if (!data.url?.includes('token=')) throw new MediaStoreError('MEDIA_UPLOAD_URL_FAILED')
    return `${supabaseUrl}/storage/v1${data.url}`
  }

  async function beginUpload(args: { id?: string, actorEmail: string, input: ValidMediaUploadInput }): Promise<{ asset: ManagedMediaAsset, uploadUrl: string }> {
    const asset = await beginUploadRecord(args)
    return { asset, uploadUrl: await createUploadUrl(asset.id) }
  }

  async function finalizeUpload(args: { id: string, actorEmail: string }): Promise<ManagedMediaAsset> {
    const row = await loadRow(args.id, ['uploading', 'inspecting'])
    await patchRow(args.id, { state: 'inspecting', rejection_code: null })
    let inspection: MediaInspection
    try {
      const response = await fetcher(`${supabaseUrl}/storage/v1/object/authenticated/${MEDIA_BUCKET}/${encodeStoragePath(String(row.object_path))}`, {
        headers: serviceHeaders(), signal: AbortSignal.timeout(30000),
      })
      if (!response.ok) throw new MediaStoreError('MEDIA_STORAGE_OBJECT_MISSING')
      const bytes = Buffer.from(await response.arrayBuffer())
      inspection = inspectMediaFile(bytes, String(row.mime_type))
      if (inspection.bytes !== Number(row.declared_bytes)) throw new MediaStoreError('MEDIA_DECLARED_SIZE_MISMATCH')
    } catch (error) {
      const code = error instanceof MediaStoreError || error instanceof Error && 'code' in error ? String((error as { code?: string }).code ?? error.message) : 'MEDIA_INSPECTION_FAILED'
      await patchRow(args.id, { state: 'rejected', rejection_code: code }).catch(() => undefined)
      await removeObject(String(row.object_path)).catch(() => undefined)
      throw new MediaStoreError(code)
    }
    const approved = await patchRow(args.id, {
      state: 'approved', rejection_code: null, byte_size: inspection.bytes, width: inspection.width, height: inspection.height,
      duration_seconds: inspection.durationSeconds, checksum: inspection.checksum, approved_at: new Date().toISOString(),
    })
    return rowToAsset(approved)
  }

  async function listAssets(): Promise<ManagedMediaAsset[]> {
    const request = new URL(`${supabaseUrl}/rest/v1/media_assets`)
    request.searchParams.set('select', '*'); request.searchParams.set('state', 'in.(uploading,inspecting,approved,rejected)'); request.searchParams.set('order', 'created_at.desc'); request.searchParams.set('limit', '500')
    const response = await fetcher(request, { headers: serviceHeaders(), signal: AbortSignal.timeout(5000) })
    if (!response.ok) throw new MediaStoreError('MEDIA_ASSET_LIST_FAILED')
    const rows = await response.json() as Row[]
    const refsResponse = await fetcher(`${supabaseUrl}/rest/v1/media_asset_references?select=media_asset_id,reference_type,reference_key&limit=2000`, { headers: serviceHeaders(), signal: AbortSignal.timeout(5000) })
    if (!refsResponse.ok) throw new MediaStoreError('MEDIA_REFERENCE_LIST_FAILED')
    const refs = await refsResponse.json() as Row[]
    return Promise.all(rows.map(async (row) => {
      const id = String(row.id)
      const references = refs.filter((ref) => ref.media_asset_id === id).map((ref) => `${String(ref.reference_type)}:${String(ref.reference_key)}`)
      const posterUseCount = rows.filter((candidate) => candidate.poster_asset_id === id).length
      return rowToAsset(row, references, await signedPreview(row), posterUseCount)
    }))
  }

  async function deleteAsset(id: string): Promise<{ id: string, deleted: true }> {
    const response = await fetcher(`${supabaseUrl}/rest/v1/rpc/begin_media_asset_delete`, {
      method: 'POST', headers: serviceHeaders({ 'content-type': 'application/json' }), body: JSON.stringify({ p_asset_id: id }), signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) throw new MediaStoreError(await errorCode(response, 'MEDIA_ASSET_DELETE_BLOCKED'))
    const row = (await response.json() as Row[])[0]
    if (!row) throw new MediaStoreError('MEDIA_ASSET_NOT_FOUND')
    try {
      await removeObject(String(row.object_path))
      await patchRow(id, { state: 'deleted', deleted_at: new Date().toISOString() })
    } catch (error) {
      await patchRow(id, { state: 'approved' }).catch(() => undefined)
      throw error
    }
    return { id, deleted: true }
  }

  return { beginUpload, beginUploadRecord, createUploadUrl, finalizeUpload, listAssets, deleteAsset }
}

export function mediaStoreAvailable(): boolean {
  return Boolean(configuredEnv(process.env.SUPABASE_URL) && configuredEnv(process.env.SUPABASE_SERVICE_ROLE_KEY))
}

export function mediaStore() {
  const supabaseUrl = configuredEnv(process.env.SUPABASE_URL)
  const serviceRoleKey = configuredEnv(process.env.SUPABASE_SERVICE_ROLE_KEY)
  if (!supabaseUrl || !serviceRoleKey) throw new MediaStoreError('MEDIA_STORE_UNAVAILABLE')
  return createMediaStore({ supabaseUrl, serviceRoleKey })
}
