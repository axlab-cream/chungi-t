import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { formatServiceVoiceContract } from './service-voice-contracts.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROMPTS_ROOT = join(__dirname, '../../prompts')

/** Legacy / alternate URL keys → canonical prompt filenames (without .md). */
export const SERVICE_KEY_ALIASES: Record<string, string> = {
  cmdg: 'saju_master',
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
  'wedding_day',
  'couple_signal',
  'pass_angle',
  'work_move',
  'work_job',
  'love_mind',
  'love_again',
  'love_spouse',
  'home_fit',
  'newyear_flow',
] as const

/** Required vocabulary from prompt_guides_18.md. Keeping this in the runtime
 * prompt makes the attached guide enforceable even when a service prompt is
 * edited independently. */
const SERVICE_TERM_GUIDANCE: Record<string, string> = {
  today_fortune: '필수 용어: 일진(日辰, 오늘의 기운), 일간(日干, 나의 중심 기운), 관성(官星, 책임과 규칙).',
  lucky_color: '필수 용어: 용신(用神, 필요한 기운), 기신(忌神, 부담이 되는 기운), 오행(五行, 다섯 상징).',
  saju_master: '필수 용어: 사주(四柱, 네 기둥), 원국(原局, 타고난 명식), 대운(大運, 긴 흐름), 십신(十神, 관계 코드).',
  love_this_year: '필수 용어: 세운(歲運, 올해 흐름), 도화(桃花, 주목과 매력), 배우자성(配偶者星, 관계 신호).',
  job_choice: '필수 용어: 관성(官星, 조직과 책임), 식상(食傷, 실무 표현), 재성(財星, 보상과 성과).',
  quit_fortune: '필수 용어: 충(沖, 부딪힘과 변화), 관성(官星, 직장 책임), 비겁(比劫, 주체성과 경쟁).',
  money_save: '필수 용어: 재성(財星, 재물과 자산), 비겁(比劫, 분배와 경쟁), 식상(食傷, 만들어 내는 결과).',
  cat_compatibility: '필수 용어: 일지(日支, 가까운 생활 자리), 오행(五行, 다섯 상징).',
  match_couple: '필수 용어: 합(合, 어우러짐), 충(沖, 마찰과 변화), 일간(日干, 각자의 중심 기운).',
  marry_match: '필수 용어: 배우자궁(配偶者宮, 동반자 생활 자리), 대운(大運, 긴 흐름).',
  wedding_day: '필수 용어: 일주(日柱, 그 날의 기둥), 합(合, 어우러짐), 충(沖, 부딪힘), 파(破, 어긋남), 해(害, 서로 깎임), 용신(用神, 필요한 기운), 절기(節氣, 계절의 경계). 후보일 판정은 서버가 전달한 계산값만 쓰고 손 없는 날 같은 통념은 상징으로 구분합니다.',
  couple_signal: '필수 용어: 식상(食傷, 표현 방식), 관성(官星, 책임과 거리 조절).',
  pass_angle: '필수 용어: 인성(印星, 학습 수용), 관성(官星, 시험 규칙과 책임).',
  work_move: '필수 용어: 재성(財星, 보상 구조), 식상(食傷, 실행과 산출), 관성(官星, 조직 책임).',
  work_job: '필수 용어: 월주(月柱, 사회적 무대), 적성(適性, 맞는 업무 방식).',
  love_mind: '필수 용어: 십신(十神, 관계 반응 코드), 변곡점(變曲點, 변화가 드러나는 순간).',
  love_again: '필수 용어: 충(沖, 관계의 마찰과 변화), 합(合, 다시 맞춰 가는 흐름).',
  love_spouse: '필수 용어: 배우자궁(配偶者宮, 동반자 관계의 자리), 자미두수(紫微斗數, 별자리 해석 체계).',
  home_fit: '현재 항목과 관련된 생활 조건만 설명합니다. 오행은 관련될 때만 쉬운 뜻을 붙입니다. 모든 공간이나 같은 명리 소개를 매 항목에 필수로 넣지 않습니다.',
  newyear_flow: '필수 용어: 세운(歲運, 한 해의 흐름), 월운(月運, 한 달의 흐름), 입춘(立春, 해의 경계를 보는 절기), 교운(交運, 대운 전환). 기준 연도는 context.newyear의 2027년 계산이며 일반 currentYear와 혼동하지 않습니다.',
}

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
 * File coverage is checked by loadServiceBlock; missing service prompts fail
 * explicitly instead of silently using another service's persona.
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
  throw new Error(`서비스 프롬프트가 없습니다: ${key}. prompts/services/${key}.md를 추가하세요.`)
}

/** Startup/CI guard: every public service must have its own persona prompt. */
export function assertServicePromptCoverage(): void {
  const missing = KNOWN_SERVICE_KEYS.filter((key) => !existsSync(join(PROMPTS_ROOT, 'services', `${key}.md`)))
  if (missing.length > 0) throw new Error(`서비스 프롬프트 누락: ${missing.join(', ')}`)
}

export function loadServiceSystemPrompt(serviceKey?: string | null): string {
  assertServicePromptCoverage()
  const key = normalizeServiceKey(serviceKey) as KnownServiceKey
  const cacheKey = `full:${key}`
  const hit = cache.get(cacheKey)
  if (hit !== undefined) return hit
  const combined = `${loadCommonSystemPrompt()}\n\n${loadServiceBlock(key)}\n\n${formatServiceVoiceContract(key)}\n\n${SERVICE_TERM_GUIDANCE[key] ?? ''}`
  cache.set(cacheKey, combined)
  return combined
}

/** Test helper — clears the in-memory prompt cache. */
export function clearServiceSystemPromptCache(): void {
  cache.clear()
}
