import type { SajuReportContext } from '../types/index.js'

const REQUEST_TIMEOUT_MS = 8_000

type TerrainHomeEvidence = NonNullable<NonNullable<SajuReportContext['home']>['terrainEvidence']>

function apiBase(): string | undefined {
  const value = process.env.PUNGSU_DATASET_API_BASE?.trim()
  if (!value || !/^https:\/\//i.test(value)) return undefined
  return value.replace(/\/$/, '')
}

function apiKey(): string | undefined {
  return process.env.PUNGSU_API_KEY?.trim() || process.env.PUNGSU_DATASET_API_KEY?.trim() || undefined
}

function text(value: unknown, limit = 240): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, limit) : undefined
}

function number(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function percent(value: unknown): number | undefined {
  const numeric = number(value)
  if (numeric === undefined) return undefined
  if (numeric >= 0 && numeric <= 1) return Math.round(numeric * 100)
  if (numeric >= 0 && numeric <= 100) return Math.round(numeric)
  return undefined
}

/** Retrieves deterministic terrain/RAG evidence without exposing the address or key to the browser. */
export async function fetchPungsuTerrainEvidence(address: string): Promise<TerrainHomeEvidence | undefined> {
  const base = apiBase()
  const key = apiKey()
  if (!base || !key || !address.trim()) return undefined

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(`${base}/terrain/interpret`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key },
      body: JSON.stringify({ address: address.trim(), kind: 'site', top: 3 }),
      signal: controller.signal,
    })
    if (!response.ok) return undefined

    const payload = await response.json() as Record<string, unknown>
    const terrain = (payload.terrain ?? {}) as Record<string, unknown>
    const axes = (payload.axes ?? {}) as Record<string, unknown>
    const similarity = (payload.similarity ?? payload.site_similarity ?? terrain.similarity ?? {}) as Record<string, unknown>
    const interpretation = (payload.interpretation ?? {}) as Record<string, unknown>
    const reading = (interpretation.user_reading ?? {}) as Record<string, unknown>
    const quality = (interpretation.quality_check ?? {}) as Record<string, unknown>
    const similarCasesRaw = similarity.cases ?? reading.similar_cases
    const knownNow = Array.isArray(reading.known_now)
      ? reading.known_now.map((item) => text(item, 180)).filter((item): item is string => Boolean(item)).slice(0, 3)
      : []
    const summary = text(reading.plain_summary, 500) ?? text(reading.headline, 240)
    if (!summary && !Object.keys(terrain).length) return undefined
    return {
      provider: 'pungsu-assi', status: text(quality.status, 40) ?? 'available', summary,
      headline: text(reading.headline, 240), knownNow,
      slopeDeg: number(terrain.slope ?? terrain.slope_deg),
      aspectDownhillDeg: number(terrain.aspect ?? terrain.aspect_downhill_deg),
      front: text(axes.front, 40), back: text(axes.back, 40),
      confidence: text((payload.confidence as Record<string, unknown> | undefined)?.level, 40),
      siteSimilarityScore: percent(similarity.score ?? similarity.percent ?? similarity.site_score ?? reading.site_similarity_score),
      siteSimilarityLabel: text(similarity.label ?? similarity.type ?? reading.site_similarity_label, 80),
      siteArchetype: text(similarity.archetype ?? similarity.site_archetype ?? reading.site_archetype, 80),
      similarCases: Array.isArray(similarCasesRaw)
        ? similarCasesRaw.map((item: unknown) => text(item, 140)).filter((item): item is string => Boolean(item)).slice(0, 3)
        : undefined,
    }
  } catch {
    return undefined
  } finally {
    clearTimeout(timeout)
  }
}
