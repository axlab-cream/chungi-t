import { configuredEnv } from '../env/load.js'

/**
 * 2026-09-19 (T30): 관리자가 발행한 프롬프트 개정을 생성 파이프라인에 태운다.
 *
 * `loadServiceSystemPrompt` 등은 `sectionPrompt`/`verdictPrompt` 같은 동기 함수
 * 안에서 동기로 호출된다 — 이 파일 전체를 비동기로 바꾸면 report-generator.ts 의
 * 프롬프트 조립 함수들까지 전부 비동기로 번져, 바로 어제(2026-09-18) 코퍼스 스냅샷
 * 고정 장치에서 실제로 났던 사고(사흘간 리포트 반복 실패)와 같은 종류의 위험을
 * 생성 경로 전체에 새로 심게 된다.
 *
 * 그래서 여기는 읽기를 동기로 유지한다: 발행본을 메모리 오버레이에 미리 채워 두고,
 * 오래됐으면(REFRESH_INTERVAL_MS) 백그라운드에서 조용히 새로고침만 건다(fire-and-forget,
 * 절대 던지지 않는다). 실패하거나 아직 못 채웠으면 항상 파일 폴백으로 떨어진다 —
 * 오버레이는 있으면 쓰는 캐시일 뿐, 신뢰의 원천이 아니다.
 */

const supabaseUrl = configuredEnv(process.env.SUPABASE_URL)?.replace(/\/$/, '')
const serviceRoleKey = configuredEnv(process.env.SUPABASE_SERVICE_ROLE_KEY)

function storeAvailable(): boolean {
  return Boolean(supabaseUrl && serviceRoleKey)
}

function headers(): Record<string, string> {
  const result: Record<string, string> = { apikey: serviceRoleKey as string }
  if (!(serviceRoleKey as string).startsWith('sb_secret_') && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(serviceRoleKey as string)) {
    result.authorization = `Bearer ${serviceRoleKey}`
  }
  return result
}

const REFRESH_INTERVAL_MS = 30_000
let overlay = new Map<string, string>()
let lastRefreshAt = 0
let refreshInFlight: Promise<void> | null = null

function overlayKey(contentType: 'common' | 'service', contentKey: string): string {
  return `${contentType}:${contentKey}`
}

async function fetchPublishedOverrides(): Promise<Map<string, string>> {
  const url = new URL(`${supabaseUrl}/rest/v1/prompt_content_versions`)
  url.searchParams.set('select', 'content_type,content_key,body')
  url.searchParams.set('state', 'eq.published')
  url.searchParams.set('limit', '200')
  const response = await fetch(url, { headers: headers() })
  if (!response.ok) throw new Error('PROMPT_OVERRIDE_REFRESH_FAILED')
  const rows = await response.json() as Array<{ content_type?: unknown; content_key?: unknown; body?: unknown }>
  const next = new Map<string, string>()
  for (const row of rows) {
    if ((row.content_type !== 'common' && row.content_type !== 'service') || typeof row.content_key !== 'string' || typeof row.body !== 'string') continue
    next.set(overlayKey(row.content_type, row.content_key), row.body)
  }
  return next
}

/** 동기 진입점. 오래됐으면 백그라운드 새로고침만 걸고 즉시 반환한다 — 절대 기다리지 않는다. */
export function refreshPromptOverridesIfStale(): void {
  if (!storeAvailable()) return
  const now = Date.now()
  if (now - lastRefreshAt < REFRESH_INTERVAL_MS || refreshInFlight) return
  lastRefreshAt = now
  refreshInFlight = fetchPublishedOverrides()
    .then((next) => { overlay = next })
    .catch(() => { /* 조회 실패는 파일 폴백으로 흡수한다 — 생성 경로를 막지 않는다. */ })
    .finally(() => { refreshInFlight = null })
}

/**
 * 비동기 진입점. 워커처럼 이미 비동기인 곳에서 생성 **직전에** 한 번 기다린다 — 콜드 스타트
 * 직후 첫 항목이 새로고침이 끝나기 전에 옛 파일 내용으로 만들어지는 틈을 막는다.
 * 저장소가 없거나 실패하면 그냥 돌아온다(파일 폴백).
 */
export async function ensurePromptOverridesFresh(): Promise<void> {
  if (!storeAvailable()) return
  refreshPromptOverridesIfStale()
  if (refreshInFlight) await refreshInFlight
}

export function getPromptOverrideBody(contentType: 'common' | 'service', contentKey: string): string | undefined {
  return overlay.get(overlayKey(contentType, contentKey))
}

/** 테스트 전용. 오버레이와 새로고침 타이머를 초기 상태로 되돌린다. */
export function resetPromptOverlayForTests(): void {
  overlay = new Map()
  lastRefreshAt = 0
  refreshInFlight = null
}

/** 테스트 전용. 새로고침을 실제로 기다려야 하는 검증에 쓴다. */
export function forceRefreshPromptOverridesForTests(): Promise<void> {
  lastRefreshAt = 0
  refreshPromptOverridesIfStale()
  return refreshInFlight ?? Promise.resolve()
}
