import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizeServiceKey, SERVICE_KEY_ALIASES } from '../prompt/service-system.js'

export interface HighlightTopic {
  title: string
  shape: string
  paragraphs?: number
}

interface LongformServiceBlock {
  highlights?: Array<{ title?: unknown; shape?: unknown; paragraphs?: unknown }>
}

interface LongformBlocksFile {
  services?: Record<string, LongformServiceBlock>
}

const BLOCKS_PATH = join(dirname(fileURLToPath(import.meta.url)), '../../사주/data/longform-blocks.json')

let cached: LongformBlocksFile | undefined

function loadBlocks(): LongformBlocksFile {
  if (cached) return cached
  const raw = readFileSync(BLOCKS_PATH, 'utf8').replace(/^\uFEFF/, '')
  cached = JSON.parse(raw) as LongformBlocksFile
  return cached
}

function lookupKey(serviceKey?: string | null): string | undefined {
  const services = loadBlocks().services
  if (!services) return undefined
  const raw = String(serviceKey ?? '').trim()
  if (!raw) return undefined
  if (services[raw]?.highlights?.length) return raw
  const canonical = normalizeServiceKey(raw)
  if (services[canonical]?.highlights?.length) return canonical
  for (const [alias, target] of Object.entries(SERVICE_KEY_ALIASES)) {
    if (target === canonical && services[alias]?.highlights?.length) return alias
  }
  return undefined
}

/**
 * Highlight topics come from the shared block config.
 * Missing service → undefined (do not write an empty array onto the report).
 */
export function loadHighlightTopics(serviceKey?: string | null): HighlightTopic[] | undefined {
  const key = lookupKey(serviceKey)
  if (!key) return undefined
  const items = loadBlocks().services?.[key]?.highlights ?? []
  const topics: HighlightTopic[] = []
  for (const item of items) {
    const title = typeof item.title === 'string' ? item.title.trim() : ''
    const shape = typeof item.shape === 'string' ? item.shape.trim() : ''
    if (!title || !shape) continue
    const topic: HighlightTopic = { title, shape }
    if (typeof item.paragraphs === 'number' && Number.isInteger(item.paragraphs) && item.paragraphs > 0) {
      topic.paragraphs = item.paragraphs
    }
    topics.push(topic)
  }
  return topics.length ? topics : undefined
}

export function clearLongformBlocksCache(): void {
  cached = undefined
}
