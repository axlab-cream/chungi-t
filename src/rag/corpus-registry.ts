import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { CorpusPackSnapshot, CorpusSnapshot } from '../types/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_ROOT = join(__dirname, '../../data')

type CorpusPackKind = 'chunks' | 'structured' | 'templates'
type CorpusPackStatus = 'active' | 'paused' | 'deprecated'

export interface CorpusPack {
  id: string
  path: string
  kind: CorpusPackKind
  domain: string
  serviceKey?: string
  status: CorpusPackStatus
  role: string
  version: string
  retrievalBoost?: number
}

interface CorpusRegistry {
  version: string
  policy: string
  packs: CorpusPack[]
}

let cachedRegistry: CorpusRegistry | null = null
let cachedSnapshot: CorpusSnapshot | null = null

export function getCorpusRegistry(): CorpusRegistry {
  if (cachedRegistry) return cachedRegistry
  const raw = readFileSync(join(DATA_ROOT, 'tone-v2/corpus/registry.json'), 'utf-8')
  cachedRegistry = JSON.parse(raw) as CorpusRegistry
  return cachedRegistry
}

type CorpusPackReference = CorpusPack | CorpusPackSnapshot

export function getActiveCorpusPacks(kind?: CorpusPackKind, snapshot?: CorpusSnapshot): CorpusPackReference[] {
  const packs = snapshot?.activePacks ?? getCorpusRegistry().packs
  return packs.filter((pack) => (
    pack.status === 'active' && (!kind || pack.kind === kind)
  ))
}

export function getChunkCorpusFiles(snapshot?: CorpusSnapshot): string[] {
  return getActiveCorpusPacks('chunks', snapshot).map((pack) => pack.path)
}

export function getCorpusDomainBoost(domain: string | undefined, snapshot?: CorpusSnapshot): number {
  if (!domain) return 0
  const pack = getActiveCorpusPacks(undefined, snapshot).find((item) => item.domain === domain)
  return pack?.retrievalBoost ?? 0
}

export function getServiceCorpusDomain(serviceKey: string | undefined, snapshot?: CorpusSnapshot): string | undefined {
  if (!serviceKey) return undefined
  const matches = getActiveCorpusPacks('chunks', snapshot).filter((pack) => pack.serviceKey === serviceKey)
  if (matches.length > 1) throw new Error(`Duplicate corpus packs for service: ${serviceKey}`)
  return matches[0]?.domain
}

function hashText(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function corpusFileHash(path: string): string {
  return hashText(readFileSync(join(DATA_ROOT, path), 'utf-8')).slice(0, 16)
}

export function getCorpusSnapshot(): CorpusSnapshot {
  if (cachedSnapshot) return cachedSnapshot
  const registry = getCorpusRegistry()
  const activePacks = getActiveCorpusPacks().map((pack) => ({
    ...pack,
    contentHash: corpusFileHash(pack.path),
  }))
  const fingerprint = hashText(JSON.stringify({
    registryVersion: registry.version,
    activePacks: activePacks.map((pack) => ({
      id: pack.id,
      serviceKey: pack.serviceKey,
      version: pack.version,
      contentHash: pack.contentHash,
      retrievalBoost: pack.retrievalBoost ?? 0,
    })),
  })).slice(0, 28)

  cachedSnapshot = {
    registryVersion: registry.version,
    fingerprint,
    policy: registry.policy,
    activePacks,
  }
  return cachedSnapshot
}

export function clearCorpusRegistryCache(): void {
  cachedRegistry = null
  cachedSnapshot = null
}
