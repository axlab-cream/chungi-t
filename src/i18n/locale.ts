export const SUPPORTED_LOCALES = Object.freeze(['ko', 'en', 'ja'] as const)
export type Locale = typeof SUPPORTED_LOCALES[number]
export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && SUPPORTED_LOCALES.some(locale => locale === value)
}
/** For untrusted URL/body/settings input. Never accepts regions or coerces values. */
export function requireLocale(value: unknown): Locale {
  if (!isLocale(value)) throw new RangeError('Unsupported locale')
  return value
}
/** Browser language hints only, not a validator for persisted/explicit locales. */
export function normalizeBrowserLanguage(value: unknown): Locale | null {
  if (typeof value !== 'string' || value.length > 128 || !/^[a-z]{2,3}(?:-[a-z0-9]{1,8})*$/i.test(value)) return null
  try {
    const canonical = Intl.getCanonicalLocales(value)[0]
    const primary = canonical.split('-')[0]
    return isLocale(primary) ? primary : null
  } catch { return null }
}
/** RFC-style q values, stable header-order ties; q=0 beats wildcard. No match = null. */
export function negotiateAcceptLanguage(header: unknown): Locale | null {
  if (typeof header !== 'string' || header.length > 8192) return 'ko'
  const entries: {locale: Locale | '*'; q: number; index: number}[] = []
  header.split(',').forEach((part, index) => {
    const match = /^\s*([a-z]{2,3}(?:-[a-z0-9]{1,8})*|\*)\s*(?:;\s*q\s*=\s*(0(?:\.\d{0,3})?|1(?:\.0{0,3})?))?\s*$/i.exec(part)
    if (!match) return
    const locale = match[1] === '*' ? '*' : normalizeBrowserLanguage(match[1])
    if (locale) entries.push({locale, q: match[2] === undefined ? 1 : Number(match[2]), index})
  })
  if (!entries.length) return 'ko'
  const candidates = SUPPORTED_LOCALES.flatMap((locale, order) => {
    const explicit = entries.filter(entry => entry.locale === locale)
    const available = explicit.length ? explicit : entries.filter(entry => entry.locale === '*')
    const best = available.sort((a,b) => b.q-a.q || a.index-b.index)[0]
    return best && best.q > 0 ? [{locale, q:best.q, index:best.index, order}] : []
  })
  return candidates.sort((a,b) => b.q-a.q || a.index-b.index || a.order-b.order)[0]?.locale ?? null
}
export interface LocalePreferences {
  /** Use parseLocalePath(path).locale for an actual public URL, including root ko. */
  urlLocale?: unknown
  selectedLocale?: unknown
  accountLocale?: unknown
  browserLanguages?: readonly unknown[]
  acceptLanguage?: unknown
}
export function resolveLocale(input: LocalePreferences = {}): {
  locale: Locale; source: 'url' | 'selected' | 'account' | 'browser' | 'default'; redirect: false
} {
  if (input.urlLocale !== undefined && input.urlLocale !== null) return {locale: requireLocale(input.urlLocale), source:'url', redirect:false}
  if (isLocale(input.selectedLocale)) return {locale:input.selectedLocale, source:'selected', redirect:false}
  if (isLocale(input.accountLocale)) return {locale:input.accountLocale, source:'account', redirect:false}
  for (const hint of input.browserLanguages ?? []) {
    const locale = normalizeBrowserLanguage(hint)
    if (locale) return {locale, source:'browser', redirect:false}
  }
  if (typeof input.acceptLanguage === 'string') {
    const locale = negotiateAcceptLanguage(input.acceptLanguage)
    if (locale) return {locale, source:'browser', redirect:false}
  }
  return {locale:'ko', source:'default', redirect:false}
}
