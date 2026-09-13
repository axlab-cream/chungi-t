import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../tone-v2/generated')
export interface TonePersona {
  key: string
  title: string
  characterId: string
  displayName: string
  definitionStatus: 'specified'
  displayNameStatus: 'draft'
  promise: string
  fields: Record<string, string>
  lexicon: {
    grade: '적극' | '제한' | '금지'
    allowed: string[]
    notes: string
  }
  rhythm: {
    axis: string
    rhythm: string
    nominalTarget: string
  } | null
}

const REQUIRED_PERSONA_FIELDS = [
  '이름(초안)', '겉모습·연령대', '성격 세 단어', '결', '말투', '판정문', '강도',
  '고객과의 거리', '재미 장치', '종결어미', '말버릇', '금기', '대표 문장',
] as const
let personaCache: Record<string, TonePersona> | undefined

function readPersonas(): Record<string, TonePersona> {
  if (personaCache) return personaCache
  const parsed = JSON.parse(readFileSync(join(root, 'personas.json'), 'utf8')) as Record<string, TonePersona>
  if (Object.keys(parsed).length !== 20) throw new Error('Invalid tone-v2 personas: expected 20 services')
  for (const [key, persona] of Object.entries(parsed)) {
    if (persona.key !== key || !persona.title || !persona.characterId || !persona.displayName || persona.definitionStatus !== 'specified' || persona.displayNameStatus !== 'draft' || !persona.promise) {
      throw new Error(`Invalid tone-v2 persona contract: ${key}`)
    }
    if (!persona.lexicon || !['적극', '제한', '금지'].includes(persona.lexicon.grade) || !Array.isArray(persona.lexicon.allowed) || persona.rhythm === undefined) {
      throw new Error(`Invalid tone-v2 persona voice contract: ${key}`)
    }
    for (const field of REQUIRED_PERSONA_FIELDS) {
      if (!persona.fields?.[field]?.trim()) throw new Error(`Invalid tone-v2 persona field: ${key}.${field}`)
    }
  }
  personaCache = parsed
  return personaCache
}

export function loadTonePersona(key: string): TonePersona {
  const personas = readPersonas()
  if (!Object.hasOwn(personas, key)) throw new Error(`Unknown tone-v2 service: ${key}`)
  return personas[key]
}
export function loadToneCommon(): string {
  return readFileSync(join(root, 'common.md'), 'utf8')
}
export function loadToneService(key: string): string {
  loadTonePersona(key)
  return readFileSync(join(root, 'services', `${key}.md`), 'utf8')
}
