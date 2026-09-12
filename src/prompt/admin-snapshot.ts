import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')

interface PromptManifest {
  commonChars: number
  services: Array<{ key: string, chars: number }>
}

function fileMetadata(path: string) {
  const value = readFileSync(join(PROJECT_ROOT, path))
  return {
    path,
    bytes: value.byteLength,
    contentHash: createHash('sha256').update(value).digest('hex').slice(0, 16),
  }
}

export function getPromptFilesSnapshot() {
  const manifest = JSON.parse(readFileSync(join(PROJECT_ROOT, 'prompts/services-manifest.json'), 'utf8')) as PromptManifest
  const guides = [
    { ...fileMetadata('prompts/README.md'), role: '운영 가이드' },
    { ...fileMetadata('prompts/common-system.md'), role: '공통 시스템 규칙', chars: manifest.commonChars },
    { ...fileMetadata('prompts/system-prompt.md'), role: '레거시 안전 폴백' },
    { ...fileMetadata('prompts/services-manifest.json'), role: '서비스 목록' },
  ]
  const services = manifest.services.map((service) => {
    const path = `prompts/services/${service.key}.md`
    return { key: service.key, chars: service.chars, ...fileMetadata(path), status: 'active' as const }
  })
  const fingerprint = createHash('sha256').update(JSON.stringify({
    guides: guides.map(({ path, contentHash }) => ({ path, contentHash })),
    services: services.map(({ key, contentHash }) => ({ key, contentHash })),
  })).digest('hex').slice(0, 28)

  return { fingerprint, guides, services, asOf: new Date().toISOString() }
}
