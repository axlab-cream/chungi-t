import generatedManifest from '../../data/admin-media-inventory.json' with { type: 'json' }

export type AdminMediaAsset = {
  id: string
  name: string
  kind: 'image' | 'video' | 'font'
  mime: string
  bytes: number
  width: number | null
  height: number | null
  durationSeconds: number | null
  checksum: string
  publicUrl: string
  references: string[]
  posterUrl: string | null
  rightsStatus: 'unverified'
  validation: { status: 'valid' | 'invalid', issues: string[] }
}

type Manifest = { schemaVersion: number, assets: unknown[] }

let cache: AdminMediaAsset[] | undefined

function safeAsset(value: unknown): AdminMediaAsset | undefined {
  if (!value || typeof value !== 'object') return undefined
  const row = value as Record<string, unknown>
  const kind = row.kind
  const validation = row.validation as Record<string, unknown> | undefined
  if (typeof row.id !== 'string' || typeof row.name !== 'string' || !['image', 'video', 'font'].includes(String(kind))) return undefined
  if (typeof row.mime !== 'string' || !Number.isSafeInteger(row.bytes) || Number(row.bytes) <= 0) return undefined
  if (typeof row.checksum !== 'string' || !/^[a-f0-9]{64}$/.test(row.checksum)) return undefined
  if (typeof row.publicUrl !== 'string' || !row.publicUrl.startsWith('/assets/')) return undefined
  if (!Array.isArray(row.references) || !row.references.every((item) => typeof item === 'string')) return undefined
  if (!validation || !['valid', 'invalid'].includes(String(validation.status)) || !Array.isArray(validation.issues)) return undefined
  const width = row.width === null ? null : Number(row.width)
  const height = row.height === null ? null : Number(row.height)
  const durationSeconds = row.durationSeconds === null ? null : Number(row.durationSeconds)
  if ((width !== null && (!Number.isSafeInteger(width) || width <= 0)) || (height !== null && (!Number.isSafeInteger(height) || height <= 0))) return undefined
  if (durationSeconds !== null && (!Number.isFinite(durationSeconds) || durationSeconds <= 0)) return undefined
  return {
    id: row.id,
    name: row.name,
    kind: kind as AdminMediaAsset['kind'],
    mime: row.mime,
    bytes: Number(row.bytes),
    width,
    height,
    durationSeconds,
    checksum: row.checksum,
    publicUrl: row.publicUrl,
    references: [...row.references] as string[],
    posterUrl: typeof row.posterUrl === 'string' && row.posterUrl.startsWith('/assets/') ? row.posterUrl : null,
    rightsStatus: 'unverified',
    validation: {
      status: validation.status as 'valid' | 'invalid',
      issues: validation.issues.filter((item): item is string => typeof item === 'string'),
    },
  }
}

export function listAdminMediaAssets(): AdminMediaAsset[] {
  if (!cache) {
    const manifest = generatedManifest as Manifest
    if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.assets)) throw new Error('MEDIA_INVENTORY_INVALID')
    const parsed = manifest.assets.map(safeAsset).filter((asset): asset is AdminMediaAsset => Boolean(asset))
    if (parsed.length !== manifest.assets.length) throw new Error('MEDIA_INVENTORY_INVALID')
    cache = parsed
  }
  return cache.map((asset) => ({ ...asset, references: [...asset.references], validation: { ...asset.validation, issues: [...asset.validation.issues] } }))
}

export function mediaInventorySummary(assets: AdminMediaAsset[]) {
  return {
    total: assets.length,
    referenced: assets.filter((asset) => asset.references.length > 0).length,
    rightsUnverified: assets.filter((asset) => asset.rightsStatus === 'unverified').length,
    videoPosterMissing: assets.filter((asset) => asset.kind === 'video' && !asset.posterUrl).length,
    invalid: assets.filter((asset) => asset.validation.status === 'invalid').length,
  }
}
