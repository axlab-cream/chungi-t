import { config } from 'dotenv'

const isNodeTest = process.env.NODE_ENV === 'test'
  || process.env.npm_lifecycle_event === 'test'
  || process.argv.includes('--test')

if (!isNodeTest) {
  config()
  config({ path: '.env.local', override: true })
}

/**
 * Values copied straight out of `.env.example` (`your-inicis-mid`,
 * `postgresql://postgres.your-project-ref:...`) must not count as configured.
 * Treating them as real once flipped the paid gate on with fake credentials and
 * locked every reading behind a checkout that could not complete.
 */
export function configuredEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  if (/^your-/i.test(trimmed)) return undefined
  if (/your-project-ref|your-db-password|example\.com/i.test(trimmed)) return undefined
  return trimmed
}
