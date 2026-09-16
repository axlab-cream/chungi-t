import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { CorpusPackSnapshot, CorpusSnapshot } from '../types/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_ROOT = join(__dirname, '../../data')

type CorpusPackKind = 'chunks' | 'structured' | 'templates'
type CorpusPackStatus = 'active' | 'paused' | 'deprecated'

export interface CorpusPack {
  id: string
  path: string
  kind: CorpusPackKind
  domain: string
  serviceKey?: string
  status: CorpusPackStatus
  role: string
  version: string
  retrievalBoost?: number
}

interface CorpusRegistry {
  version: string
  policy: string
  /**
   * 해석 캐시 세대. **저장된 해석을 버릴지 말지를 이 값 하나가 결정한다.**
   *
   * 코퍼스 파일을 고쳐도 이 값을 그대로 두면 기존 해석은 그대로 쓰인다(LLM 재호출 없음).
   * 오타 수정·문장 다듬기처럼 이미 나간 해석을 다시 뽑을 이유가 없는 개정이 여기 해당한다.
   *
   * 해석을 다시 뽑아야 하는 개정(근거 규칙 변경, 섹션 구성 변경 등)일 때만 값을 올린다.
   * 빈 문자열은 도입 시점 그대로를 뜻하며, 이때 리포트 ID는 도입 전과 완전히 같다.
   * 다음 값은 "e2", 그 다음은 "e3" 처럼 단조 증가시킨다 — 되돌리면 과거 해석이 되살아난다.
   */
  cacheEpoch?: string
  packs: CorpusPack[]
}

let cachedRegistry: CorpusRegistry | null = null
let cachedSnapshot: CorpusSnapshot | null = null

export function getCorpusRegistry(): CorpusRegistry {
  if (cachedRegistry) return cachedRegistry
  const raw = readFileSync(join(DATA_ROOT, 'tone-v2/corpus/registry.json'), 'utf-8')
  cachedRegistry = JSON.parse(raw) as CorpusRegistry
  return cachedRegistry
}

type CorpusPackReference = CorpusPack | CorpusPackSnapshot

export function getActiveCorpusPacks(kind?: CorpusPackKind, snapshot?: CorpusSnapshot): CorpusPackReference[] {
  const packs = snapshot?.activePacks ?? getCorpusRegistry().packs
  return packs.filter((pack) => (
    pack.status === 'active' && (!kind || pack.kind === kind)
  ))
}

export function getChunkCorpusFiles(snapshot?: CorpusSnapshot): string[] {
  return getActiveCorpusPacks('chunks', snapshot).map((pack) => pack.path)
}

export function getCorpusDomainBoost(domain: string | undefined, snapshot?: CorpusSnapshot): number {
  if (!domain) return 0
  const pack = getActiveCorpusPacks(undefined, snapshot).find((item) => item.domain === domain)
  return pack?.retrievalBoost ?? 0
}

export function getServiceCorpusDomain(serviceKey: string | undefined, snapshot?: CorpusSnapshot): string | undefined {
  if (!serviceKey) return undefined
  const matches = getActiveCorpusPacks('chunks', snapshot).filter((pack) => pack.serviceKey === serviceKey)
  if (matches.length > 1) throw new Error(`Duplicate corpus packs for service: ${serviceKey}`)
  return matches[0]?.domain
}

/**
 * 캐시 세대 소금. 빈 값이면 리포트 ID 계산에서 통째로 빠지므로,
 * 도입 시점에는 기존에 저장된 해석이 한 건도 무효가 되지 않는다.
 */
export function corpusCacheSalt(): string {
  return String(getCorpusRegistry().cacheEpoch ?? '').trim()
}

/**
 * 서비스별 ID 생성기(createMoneySaveReportId 등)는 코퍼스를 전혀 참조하지 않는다.
 * 그 결과 코퍼스를 고쳐도 그 서비스들의 해석은 영원히 갱신되지 않았다.
 * 세대를 올렸을 때만 ID가 바뀌도록 여기서 한 겹 덧씌운다.
 */
export function withCorpusEpoch(reportId: string): string {
  const salt = corpusCacheSalt()
  if (!salt) return reportId
  return createHash('sha256').update(`${reportId}:corpus-epoch:${salt}`).digest('hex').slice(0, 28)
}

function hashText(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function corpusFileHash(path: string): string {
  return hashText(readFileSync(join(DATA_ROOT, path), 'utf-8')).slice(0, 16)
}

export function getCorpusSnapshot(): CorpusSnapshot {
  if (cachedSnapshot) return cachedSnapshot
  const registry = getCorpusRegistry()
  const activePacks = getActiveCorpusPacks().map((pack) => ({
    ...pack,
    contentHash: corpusFileHash(pack.path),
  }))
  const fingerprint = hashText(JSON.stringify({
    registryVersion: registry.version,
    activePacks: activePacks.map((pack) => ({
      id: pack.id,
      serviceKey: pack.serviceKey,
      version: pack.version,
      contentHash: pack.contentHash,
      retrievalBoost: pack.retrievalBoost ?? 0,
    })),
  })).slice(0, 28)

  cachedSnapshot = {
    registryVersion: registry.version,
    fingerprint,
    cacheEpoch: corpusCacheSalt(),
    policy: registry.policy,
    activePacks,
  }
  return cachedSnapshot
}

export function clearCorpusRegistryCache(): void {
  cachedRegistry = null
  cachedSnapshot = null
}
