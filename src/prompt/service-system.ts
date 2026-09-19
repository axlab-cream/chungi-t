import { formatServiceVoiceContract } from './service-voice-contracts.js'
import { getPromptOverrideBody, refreshPromptOverridesIfStale } from './prompt-overrides.js'
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

export function normalizeServiceKey(key?: string | null): string {
  const normalized = String(key ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  return SERVICE_KEY_ALIASES[normalized] ?? (normalized || 'saju_master')
}
/**
 * 관리자가 발행한 개정이 있으면 그것을, 없으면 배포된 파일을 쓴다(T30). 오버레이는
 * 최근 새로고침 결과일 뿐이라 항상 동기로 즉시 읽을 수 있다 — 없으면 파일로 접는다.
 */
export function loadCommonSystemPrompt(): string {
  refreshPromptOverridesIfStale()
  return getPromptOverrideBody('common', 'common') ?? loadToneCommon()
}
export function loadServiceBlock(key: string): string {
  const normalized = normalizeServiceKey(key)
  refreshPromptOverridesIfStale()
  return getPromptOverrideBody('service', normalized) ?? loadToneService(normalized)
}
export function assertServicePromptCoverage(): void {
  for (const key of KNOWN_SERVICE_KEYS) loadToneService(key)
}
/**
 * 조합 결과는 캐시하지 않는다 — 개정이 즉시 반영돼야 하는데, 서버리스 인스턴스 안의
 * 캐시는 이 프로세스가 살아 있는 한 영원히 지워지지 않는다(무효화 훅이 없었다).
 * 파일 읽기·문자열 결합은 가벼우니 매번 새로 만드는 편이 안전하다.
 */
export function loadServiceSystemPrompt(serviceKey?: string | null): string {
  const key = normalizeServiceKey(serviceKey)
  const combined = `${loadCommonSystemPrompt()}\n\n${loadServiceBlock(key)}`
  return (KNOWN_SERVICE_KEYS as readonly string[]).includes(key)
    ? `${combined}\n\n${formatServiceVoiceContract(key as KnownServiceKey)}`
    : combined
}
/** 더 이상 캐시가 없다. 기존 호출부(테스트)가 깨지지 않도록 이름만 남긴다. */
export function clearServiceSystemPromptCache(): void { /* no-op: T30 이후 캐시 없음 */ }
