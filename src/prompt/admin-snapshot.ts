import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadTonePersona } from './tone-v2.js'

const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')
const TONE_ROOT = join(PROJECT_ROOT, 'tone-v2')

interface PromptManifest {
  commonChars: number
  services: Array<{ key: string, chars: number }>
}

interface ToneManifest {
  version: string
  sourceFingerprint: string
  services: string[]
  releaseReady: boolean
}

const GUIDE_PATHS = [
  'tone-v2/PRD.md',
  'tone-v2/PLAN.md',
  'tone-v2/HANDOFF-PROMPT-20260912.md',
  'tone-v2/source/규격/00-인계-README.md',
  'tone-v2/source/규격/01-공통-프롬프트-규칙.md',
  'tone-v2/source/규격/02-핵심약속-개사안.md',
  'tone-v2/source/규격/03-말투-배정안.md',
  'tone-v2/source/규격/04-페르소나-상세규정.md',
  'tone-v2/source/규격/05-서비스-편집-결정표.md',
  'tone-v2/source/규격/07-캐릭터-말투-대조표.md',
] as const

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

export function getToneV2AdminSnapshot() {
  const manifest = JSON.parse(readFileSync(join(TONE_ROOT, 'generated/manifest.json'), 'utf8')) as ToneManifest
  const common = fileMetadata('tone-v2/generated/common.md')
  const personas = manifest.services.map((key) => {
    const persona = loadTonePersona(key)
    const sourcePath = `tone-v2/generated/services/${key}.md`
    return {
      key: persona.key,
      title: persona.title,
      displayName: persona.displayName,
      characterId: persona.characterId,
      definitionStatus: persona.definitionStatus,
      displayNameStatus: persona.displayNameStatus,
      voice: persona.fields['말투'],
      promise: persona.promise,
      sourcePath,
      contentHash: fileMetadata(sourcePath).contentHash,
    }
  })

  return {
    bundle: {
      version: manifest.version,
      sourceFingerprint: manifest.sourceFingerprint,
      releaseReady: manifest.releaseReady,
      commonPath: common.path,
      commonHash: common.contentHash,
      commonBytes: common.bytes,
    },
    sources: GUIDE_PATHS.map(fileMetadata),
    personas,
    asOf: new Date().toISOString(),
  }
}
