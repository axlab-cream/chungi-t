import { loadToneCommon, loadToneService } from './tone-v2.js'

export const SERVICE_KEY_ALIASES: Record<string, string> = {
  cmdg: 'saju_master', love_thisyear: 'love_this_year', home_pungsu: 'home_fit',
  home: 'home_fit', love_signal: 'couple_signal', today: 'today_fortune',
}
export const KNOWN_SERVICE_KEYS = [
  'today_fortune', 'lucky_color', 'saju_master', 'love_this_year', 'job_choice',
  'quit_fortune', 'money_save', 'cat_compatibility', 'match_couple', 'marry_match',
  'wedding_day', 'couple_signal', 'pass_angle', 'work_move', 'work_job',
  'love_mind', 'love_again', 'love_spouse', 'home_fit', 'newyear_flow',
] as const
export type KnownServiceKey = (typeof KNOWN_SERVICE_KEYS)[number]
const cache = new Map<string, string>()

export function normalizeServiceKey(key?: string | null): string {
  const normalized = String(key ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  return SERVICE_KEY_ALIASES[normalized] ?? (normalized || 'saju_master')
}
export function loadCommonSystemPrompt(): string { return loadToneCommon() }
export function loadServiceBlock(key: string): string { return loadToneService(normalizeServiceKey(key)) }
export function assertServicePromptCoverage(): void {
  for (const key of KNOWN_SERVICE_KEYS) loadToneService(key)
}
export function loadServiceSystemPrompt(serviceKey?: string | null): string {
  const key = normalizeServiceKey(serviceKey)
  const cached = cache.get(key)
  if (cached !== undefined) return cached
  const combined = `${loadToneCommon()}\n\n${loadToneService(key)}`
  cache.set(key, combined)
  return combined
}
export function clearServiceSystemPromptCache(): void { cache.clear() }
