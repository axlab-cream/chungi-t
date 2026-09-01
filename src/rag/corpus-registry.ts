import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { CorpusSnapshot } from '../types/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_ROOT = join(__dirname, '../../data')

type CorpusPackKind = 'chunks' | 'structured' | 'templates'
type CorpusPackStatus = 'active' | 'paused' | 'deprecated'

export interface CorpusPack {
  id: string
  path: string
  kind: CorpusPackKind
  domain: string
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
  const raw = readFileSync(join(DATA_ROOT, 'corpus/registry.json'), 'utf-8')
  cachedRegistry = JSON.parse(raw) as CorpusRegistry
  return cachedRegistry
}

export function getActiveCorpusPacks(kind?: CorpusPackKind): CorpusPack[] {
  return getCorpusRegistry().packs.filter((pack) => (
    pack.status === 'active' && (!kind || pack.kind === kind)
  ))
}

export function getChunkCorpusFiles(): string[] {
  return getActiveCorpusPacks('chunks').map((pack) => pack.path)
}

export function getCorpusDomainBoost(domain: string | undefined): number {
  if (!domain) return 0
  const pack = getActiveCorpusPacks().find((item) => item.domain === domain)
  return pack?.retrievalBoost ?? 0
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
