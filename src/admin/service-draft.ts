import { listAdminServiceDirectory } from '../server/service-directory.js'

export type ServiceDraftFields = {
  title: string
  tagline: string
  summary: string
  category: string
  discoveryVisible: boolean
  landingPath: string
}

const FIELD_NAMES = new Set(['title', 'tagline', 'summary', 'category', 'discoveryVisible', 'landingPath'])

function requiredText(value: unknown, max: number, code: string): string {
  if (typeof value !== 'string') throw new Error(code)
  const text = value.trim()
  if (!text || text.length > max) throw new Error(code)
  return text
}

export function parseServiceDraftFields(canonicalKey: string, value: unknown): ServiceDraftFields {
  const service = listAdminServiceDirectory().find((item) => item.key === canonicalKey)
  if (!service) throw new Error('SERVICE_KEY_INVALID')
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('SERVICE_DRAFT_FIELDS_INVALID')
  const input = value as Record<string, unknown>
  if (Object.keys(input).some((key) => !FIELD_NAMES.has(key)) || Object.keys(input).length !== FIELD_NAMES.size) {
    throw new Error('SERVICE_DRAFT_FIELDS_INVALID')
  }
  const landingPath = requiredText(input.landingPath, 240, 'SERVICE_LANDING_PATH_INVALID')
  if (landingPath !== service.href) throw new Error('SERVICE_LANDING_PATH_INVALID')
  if (typeof input.discoveryVisible !== 'boolean') throw new Error('SERVICE_DISCOVERY_INVALID')
  return {
    title: requiredText(input.title, 100, 'SERVICE_TITLE_INVALID'),
    tagline: requiredText(input.tagline, 180, 'SERVICE_TAGLINE_INVALID'),
    summary: requiredText(input.summary, 1000, 'SERVICE_SUMMARY_INVALID'),
    category: requiredText(input.category, 40, 'SERVICE_CATEGORY_INVALID'),
    discoveryVisible: input.discoveryVisible,
    landingPath,
  }
}

export function safeServiceDraftFields(canonicalKey: string, value: unknown): ServiceDraftFields | null {
  try { return parseServiceDraftFields(canonicalKey, value) } catch { return null }
}
