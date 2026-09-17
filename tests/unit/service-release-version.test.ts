import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { SERVICE_RELEASE_PINS, SERVICE_VERSION, serviceRelease } from '../../src/release.js'

/**
 * 2026-09-17 v1.01 고정.
 *
 * 해석은 코드·프롬프트 규격·코퍼스 셋이 함께 정해질 때만 같은 결과를 낸다. 셋 중 하나만
 * 예전 것으로 돌아가도 이미 판 해석과 다른 글이 나온다.
 *
 * 이 파일이 지키는 것 두 가지 —
 *  1. 버전은 내려가지 않는다(회귀 금지)
 *  2. 프롬프트·코퍼스를 바꾸면 버전도 같이 올린다(몰래 바뀌지 않는다)
 */

/** 여기 적힌 값보다 낮은 버전으로는 배포하지 않는다. 올릴 때 이 값도 같이 올린다. */
const RELEASE_FLOOR = '1.01'

function toParts(version: string): number[] {
  const parts = version.split('.').map((piece) => Number(piece))
  assert.ok(parts.every((piece) => Number.isFinite(piece)), `버전 형식이 아닙니다: ${version}`)
  return parts
}

function compare(a: string, b: string): number {
  const left = toParts(a)
  const right = toParts(b)
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0)
    if (diff !== 0) return diff > 0 ? 1 : -1
  }
  return 0
}

test('서비스 버전은 바닥값 아래로 내려가지 않는다', () => {
  assert.ok(
    compare(SERVICE_VERSION, RELEASE_FLOOR) >= 0,
    `버전이 뒤로 갔습니다: ${SERVICE_VERSION} < ${RELEASE_FLOOR}. 되돌리려면 이 테스트의 바닥값도 함께 내려야 하고, 그건 의도한 회귀일 때만 합니다.`,
  )
})

test('버전 형식은 숫자와 점으로만 쓴다', () => {
  assert.match(SERVICE_VERSION, /^\d+\.\d+(\.\d+)?$/)
})

test('프롬프트 규격과 코퍼스가 버전이 묶어 둔 것과 같다', () => {
  const release = serviceRelease()
  // 규격이 바뀌었는데 버전이 그대로면 이미 판 해석과 다른 글이 나온다.
  assert.equal(
    release.corpusRegistry, SERVICE_RELEASE_PINS.corpusRegistry,
    '코퍼스 레지스트리가 바뀌었습니다. src/release.ts 의 SERVICE_VERSION 과 SERVICE_RELEASE_PINS 를 함께 올리세요.',
  )
  if (release.promptSpec) {
    assert.equal(
      release.promptSpec, SERVICE_RELEASE_PINS.promptSpec,
      '프롬프트 규격이 바뀌었습니다. src/release.ts 의 SERVICE_VERSION 과 SERVICE_RELEASE_PINS 를 함께 올리세요.',
    )
  }
  assert.equal(release.pinned, true)
})

test('릴리스 정보는 지문까지 함께 알려준다', () => {
  const release = serviceRelease()
  assert.equal(release.version, SERVICE_VERSION)
  assert.ok(release.corpusFingerprint.length > 0, '코퍼스 지문이 없으면 무엇이 떠 있는지 대조할 수 없다')
})
