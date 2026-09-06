import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROMPTS_ROOT = join(__dirname, '../../prompts')

/** Legacy / alternate URL keys → canonical prompt filenames (without .md). */
export const SERVICE_KEY_ALIASES: Record<string, string> = {
  love_thisyear: 'love_this_year',
  home_pungsu: 'home_fit',
  home: 'home_fit',
  love_signal: 'couple_signal',
  today: 'today_fortune',
}

/** Canonical keys matching prompts/services/*.md (also listed in services-manifest.json). */
export const KNOWN_SERVICE_KEYS = [
  'today_fortune',
  'lucky_color',
  'saju_master',
  'love_this_year',
  'job_choice',
  'quit_fortune',
  'money_save',
  'cat_compatibility',
  'match_couple',
  'marry_match',
  'couple_signal',
  'pass_angle',
  'work_move',
  'work_job',
  'love_mind',
  'love_again',
  'love_spouse',
  'home_fit',
] as const

export type KnownServiceKey = (typeof KNOWN_SERVICE_KEYS)[number]

const DEFAULT_SERVICE_KEY = 'saju_master'

const cache = new Map<string, string>()

function readCached(cacheKey: string, absolutePath: string): string {
  const hit = cache.get(cacheKey)
  if (hit !== undefined) return hit
  const text = readFileSync(absolutePath, 'utf-8')
  cache.set(cacheKey, text)
  return text
}

/**
 * Trim, apply aliases, default to saju_master when empty.
 * Does not validate against the known list — unknown keys fall through to
 * loadServiceBlock's saju_master.md fallback when the file is missing.
 */
export function normalizeServiceKey(key?: string | null): string {
  if (key == null) return DEFAULT_SERVICE_KEY
  const trimmed = String(key).trim()
  if (!trimmed) return DEFAULT_SERVICE_KEY
  const normalized = trimmed.toLowerCase().replace(/[\s-]+/g, '_')
  return SERVICE_KEY_ALIASES[normalized] ?? normalized
}

export function loadCommonSystemPrompt(): string {
  const commonPath = join(PROMPTS_ROOT, 'common-system.md')
  if (existsSync(commonPath)) {
    return readCached('common-system', commonPath)
  }
  // Legacy fallback when the new common pack is absent.
  return readCached('system-prompt', join(PROMPTS_ROOT, 'system-prompt.md'))
}

export function loadServiceBlock(serviceKey: string): string {
  const key = normalizeServiceKey(serviceKey)
  const preferred = join(PROMPTS_ROOT, 'services', `${key}.md`)
  if (existsSync(preferred)) {
    return readCached(`service:${key}`, preferred)
  }
  const fallbackKey = DEFAULT_SERVICE_KEY
  return readCached(`service:${fallbackKey}`, join(PROMPTS_ROOT, 'services', `${fallbackKey}.md`))
}

export function loadServiceSystemPrompt(serviceKey?: string | null): string {
  const key = normalizeServiceKey(serviceKey)
  const cacheKey = `full:${key}`
  const hit = cache.get(cacheKey)
  if (hit !== undefined) return hit
  const combined = `${loadCommonSystemPrompt()}\n\n${loadServiceBlock(key)}`
  cache.set(cacheKey, combined)
  return combined
}

/** Test helper — clears the in-memory prompt cache. */
export function clearServiceSystemPromptCache(): void {
  cache.clear()
}
