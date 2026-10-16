import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { corpusCacheSalt } from '../../src/rag/corpus-registry.js'

/**
 * 업데이트가 기준(2026-10-15 결정): 사주 계산 엔진이 바뀌면, 그 뒤에 사는 사람은 반드시 새 계산으로 풀이를 받아야 한다.
 * 같은 사람·같은 입력의 예전 풀이를 다시 쓰는 장치(계보·리포트 ID)는 풀이 세대(cacheEpoch)를 올려야만 비켜간다.
 * 그래서 엔진 파일이 바뀌었는데 세대를 올리지 않으면 이 검사가 막는다.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const fixture = JSON.parse(readFileSync(join(root, 'tests', 'fixtures', 'engine-epoch.json'), 'utf8')) as {
  history: Array<{ cacheEpoch: string; engineHash: string }>
  /** 엔진은 그대로이고 참고서만 바뀌어 올린 세대(2026-10-16~). after = 직전 엔진 세대 */
  corpusOnly?: Array<{ cacheEpoch: string; after: string }>
}

function engineHash(): string {
  const dir = join(root, 'src', 'saju')
  const hash = createHash('sha256')
  for (const file of readdirSync(dir).filter((name) => name.endsWith('.ts')).sort()) {
    hash.update(file).update('\0')
    // 줄끝(CRLF/LF)만 다른 체크아웃은 같은 엔진으로 본다.
    hash.update(readFileSync(join(dir, file)).toString('utf8').replaceAll('\r\n', '\n')).update('\0')
  }
  return hash.digest('hex').slice(0, 16)
}

test('사주 계산 엔진이 바뀌면 풀이 세대(cacheEpoch)도 올라가 있다', () => {
  const latest = fixture.history.at(-1)!
  const current = engineHash()
  assert.equal(
    current,
    latest.engineHash,
    `사주 계산 엔진(src/saju)이 바뀌었습니다. 업데이트 뒤에 사는 사람이 새 계산을 받도록 data/tone-v2/corpus/registry.json 의 cacheEpoch 를 새 값으로 올리고, tests/fixtures/engine-epoch.json 의 history 끝에 { "cacheEpoch": "<새 값>", "engineHash": "${current}" } 를 더하세요.`,
  )
  // 마지막 엔진 세대 뒤에 참고서만 바꿔 올린 세대가 있으면 그것이 지금 세대다.
  const expected = (fixture.corpusOnly ?? []).filter((item) => item.after === latest.cacheEpoch).at(-1)?.cacheEpoch ?? latest.cacheEpoch
  assert.equal(corpusCacheSalt(), expected, 'registry.json 의 cacheEpoch 가 engine-epoch.json 의 마지막 세대(참고서 세대 포함)와 같아야 합니다.')
})

test('세대 기록은 엔진이 바뀔 때마다 새 세대를 쓴다(같은 세대를 다시 쓰지 않음)', () => {
  const epochs = [...fixture.history, ...(fixture.corpusOnly ?? [])].map((item) => item.cacheEpoch)
  const hashes = fixture.history.map((item) => item.engineHash)
  assert.equal(new Set(epochs).size, epochs.length, '같은 cacheEpoch 를 두 번 썼습니다. 엔진을 바꿨으면 새 세대로 올려야 합니다.')
  assert.equal(new Set(hashes).size, hashes.length)
  assert.ok(epochs.every(Boolean), '빈 세대는 쓸 수 없습니다.')
})
