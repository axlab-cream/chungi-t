import { getPublishedServiceFields } from '../admin/service-version-store.js'
import { listAdminServiceDirectory, listServiceDirectory, type ServiceDirectoryEntry } from './service-directory.js'

export type PublicServiceDirectorySnapshot = {
  services: ServiceDirectoryEntry[]
  source: 'published' | 'code-fallback'
}

/**
 * Overlay only reviewed, non-payment copy on the code-owned catalog. A published
 * payload can hide an already-public service, but cannot expose a code-hidden
 * route until the separate catalog-release decision has been made.
 */
export async function getPublicServiceDirectorySnapshot(): Promise<PublicServiceDirectorySnapshot> {
  try {
    const published = await getPublishedServiceFields()
    const services = listAdminServiceDirectory().flatMap((base): ServiceDirectoryEntry[] => {
      if (!base.discoveryVisible) return []
      const fields = published.get(base.key)
      if (fields?.discoveryVisible === false) return []
      if (!fields) return [{
        key: base.key,
        title: base.title,
        tagline: base.tagline,
        category: base.category,
        href: base.href,
        image: base.image,
        amount: base.amount,
        summary: base.summary,
      }]
      return [{
        key: base.key,
        title: fields.title,
        tagline: fields.tagline,
        category: fields.category,
        href: base.href,
        image: base.image,
        amount: base.amount,
        summary: fields.summary,
      }]
    })
    return { services, source: 'published' }
  } catch {
    return { services: listServiceDirectory(), source: 'code-fallback' }
  }
}
