import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getCorpusSnapshot } from './rag/corpus-registry.js'

/**
 * 서비스 릴리스 버전.
 *
 * 해석은 세 가지가 함께 정해질 때만 같은 결과를 낸다 — 코드, 프롬프트 규격, 코퍼스.
 * 셋 중 하나만 예전 것으로 돌아가도 이미 판 해석과 다른 글이 나온다. 그래서 버전을
 * 코드에 적고, 그때 무엇을 쓰고 있었는지 함께 박아 둔다.
 *
 * 올릴 때 규칙은 하나다 — **내려가지 않는다.** 테스트가 그것을 지킨다.
 * 프롬프트나 코퍼스를 바꾸면 이 파일의 버전도 같이 올린다.
 */
export const SERVICE_VERSION = '1.01'

/** 이 버전이 묶어 둔 규격. 런타임 값과 어긋나면 테스트가 막는다. */
export const SERVICE_RELEASE_PINS = {
  /** tone-v2 규격 산출물의 버전(`tone-v2/generated/manifest.json`). */
  promptSpec: 'tone-v2.20260910.1',
  /** 활성 코퍼스 레지스트리 버전(`getCorpusSnapshot().registryVersion`). */
  corpusRegistry: 'tone-v2.2.0.20',
} as const

const here = dirname(fileURLToPath(import.meta.url))

function promptSpecVersion(): string {
  try {
    const manifest = JSON.parse(readFileSync(join(here, '..', 'tone-v2', 'generated', 'manifest.json'), 'utf8')) as { version?: string }
    return manifest.version ?? ''
  } catch {
    // 서버리스 번들에 tone-v2 산출물이 없을 수 있다. 버전을 모른다고 기동을 막지는 않는다.
    return ''
  }
}

export interface ServiceReleaseInfo {
  version: string
  promptSpec: string
  corpusRegistry: string
  corpusFingerprint: string
  /** 코드에 박아 둔 규격과 지금 올라온 규격이 같은지. */
  pinned: boolean
}

/**
 * 지금 서버가 실제로 쓰고 있는 규격과 함께 버전을 돌려준다.
 *
 * `pinned: false` 는 코퍼스나 프롬프트가 버전을 올리지 않은 채 바뀌었다는 뜻이다 —
 * 이미 판 해석과 다른 글이 나올 수 있는 상태라 운영자가 알아야 한다.
 */
export function serviceRelease(): ServiceReleaseInfo {
  const corpus = getCorpusSnapshot()
  const promptSpec = promptSpecVersion()
  const corpusRegistry = corpus.registryVersion ?? ''
  return {
    version: SERVICE_VERSION,
    promptSpec,
    corpusRegistry,
    corpusFingerprint: corpus.fingerprint ?? '',
    pinned: (promptSpec === '' || promptSpec === SERVICE_RELEASE_PINS.promptSpec)
      && corpusRegistry === SERVICE_RELEASE_PINS.corpusRegistry,
  }
}
