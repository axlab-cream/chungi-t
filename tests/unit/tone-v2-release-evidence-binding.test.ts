import { strict as assert } from 'node:assert'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

/**
 * 릴리스 파일과 증거 파일의 결합 검사.
 *
 * 2026-09-14 점검에서 두 건이 어긋나 있었다.
 *   - lucky-color: 실호출 증거(24/24 pass)가 붙어 있는데 게이트는 `not_run_for_2.1.0`
 *   - quit-fortune: 증거(48/48 pass)가 붙어 있는데 `providerOutputEvaluation` 키 자체가 없음
 *
 * 릴리스 게이트는 사람이 손으로 적는 값이라 증거와 조용히 어긋난다. 어긋나면
 * "이 서비스는 아직 검증 안 됐다"고 잘못 판단해 **이미 통과한 실호출 평가를 다시 돌리거나**,
 * 반대로 안 돌린 서비스를 통과한 걸로 착각한다. 둘 다 비싸다.
 *
 * 그래서 게이트 문자열을 손으로 믿지 않고 증거 파일에서 계산해 맞춘다.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')
const RELEASE_DIR = join(ROOT, 'tone-v2/releases')

interface Release {
  serviceKey?: string
  generationEvidence?: { path: string; recordSha256: string; acceptedProseSha256: string; containsProviderProse?: boolean }
  generationEvidenceReason?: string
  visualEvidence?: { path: string; sha256: string; containsProviderProse?: boolean }
  gates?: Record<string, string>
}

function releases(): Array<{ file: string; release: Release }> {
  return readdirSync(RELEASE_DIR)
    .filter((name) => name.endsWith('-2.1.0.json') && !name.startsWith('all-service'))
    .sort()
    .map((file) => ({ file, release: JSON.parse(readFileSync(join(RELEASE_DIR, file), 'utf8')) as Release }))
}

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(ROOT, path), 'utf8')) as Record<string, unknown>
}

test('1. 실호출 증거가 있으면 게이트도 그 결과를 그대로 말한다', () => {
  const mismatches: string[] = []

  for (const { file, release } of releases()) {
    const evidenceRef = release.generationEvidence
    if (!evidenceRef) continue

    assert.ok(existsSync(join(ROOT, evidenceRef.path)), `${file}: 증거 파일이 없다 — ${evidenceRef.path}`)
    const evidence = readJson(evidenceRef.path) as {
      status?: string
      serviceKey?: string
      completion?: { completedSections?: number; expectedSections?: number }
      evidence?: { recordSha256?: string; acceptedProseSha256?: string }
    }

    assert.equal(evidence.status, 'pass', `${file}: 증거가 pass 가 아닌데 릴리스에 붙어 있다`)
    assert.equal(evidence.serviceKey, release.serviceKey, `${file}: 증거의 서비스가 다르다`)
    assert.equal(evidenceRef.recordSha256, evidence.evidence?.recordSha256, `${file}: recordSha256 불일치`)
    assert.equal(evidenceRef.acceptedProseSha256, evidence.evidence?.acceptedProseSha256, `${file}: acceptedProseSha256 불일치`)

    const done = evidence.completion?.completedSections
    const want = evidence.completion?.expectedSections
    const gate = release.gates?.providerOutputEvaluation
    const expected = `pass_${done}_of_${want}`

    // 결정형 서비스는 실호출 평가 대상이 아니다. 그 경우만 예외로 둔다.
    if (gate && gate.startsWith('not_applicable')) continue
    if (gate !== expected) mismatches.push(`${file}: 게이트 "${gate ?? '(없음)'}" ≠ 증거 "${expected}"`)
  }

  assert.deepEqual(
    mismatches, [],
    '릴리스 게이트가 증거와 어긋난다. 통과한 평가를 다시 돌리거나, 안 돌린 걸 통과로 착각하게 된다.',
  )
})

test('2. 증거가 없으면 없다고 적혀 있고, 게이트도 미실행이다', () => {
  for (const { file, release } of releases()) {
    if (release.generationEvidence) {
      assert.equal(
        'generationEvidenceReason' in release, false,
        `${file}: 증거와 "증거 없음 사유"가 함께 있다. 어느 쪽이 참인지 알 수 없다.`,
      )
      continue
    }
    assert.ok(
      release.generationEvidenceReason,
      `${file}: 증거도 없고 사유도 없다. 안 돌린 것인지 빠뜨린 것인지 구분되지 않는다.`,
    )
    const gate = release.gates?.providerOutputEvaluation ?? ''
    assert.ok(
      gate.startsWith('not_run') || gate.startsWith('not_applicable'),
      `${file}: 증거가 없는데 게이트가 "${gate}" 다.`,
    )
  }
})

test('3. 시각 증거는 파일 해시까지 릴리스와 일치한다', () => {
  for (const { file, release } of releases()) {
    const ref = release.visualEvidence
    if (!ref) continue

    assert.ok(existsSync(join(ROOT, ref.path)), `${file}: 시각 증거 파일이 없다 — ${ref.path}`)

    // 이 저장소의 파일은 CRLF 로 저장되지만 릴리스에 적힌 해시는 LF 기준으로 계산됐다.
    // 원본 바이트로 재면 6개 전부 불일치로 나온다. 체크아웃 설정에 따라 흔들리지 않도록 줄끝을 맞춘다.
    const normalized = readFileSync(join(ROOT, ref.path), 'utf8').replace(/\r\n/g, '\n')
    const actual = createHash('sha256').update(normalized).digest('hex')
    assert.equal(actual, ref.sha256, `${file}: 시각 증거 파일이 릴리스에 적힌 해시와 다르다`)

    const evidence = readJson(ref.path) as { status?: string; serviceKey?: string }
    assert.equal(evidence.status, 'pass', `${file}: 시각 증거가 pass 가 아니다`)
    assert.equal(evidence.serviceKey, release.serviceKey, `${file}: 시각 증거의 서비스가 다르다`)
  }
})

test('4. 고객 글이 증거 파일로 새지 않는다', () => {
  for (const { file, release } of releases()) {
    if (release.generationEvidence) {
      assert.equal(release.generationEvidence.containsProviderProse, false, `${file}: 생성 증거에 모델 산문이 들어 있다고 적혀 있다`)
    }
    if (release.visualEvidence) {
      assert.equal(release.visualEvidence.containsProviderProse, false, `${file}: 시각 증거에 모델 산문이 들어 있다고 적혀 있다`)
    }
  }
})

test('5. 실호출 검증이 끝난 서비스 수를 기록으로 고정한다', () => {
  const verified = releases()
    .filter(({ release }) => Boolean(release.generationEvidence))
    .map(({ release }) => release.serviceKey)
    .sort()

  // 여기가 늘어나면 좋은 일이다. 줄어들면 증거가 끊겼다는 뜻이므로 반드시 멈춰 세운다.
  const known = ['lucky_color', 'newyear_flow', 'pass_angle', 'quit_fortune', 'saju_master', 'today_fortune', 'wedding_day']
  for (const service of known) {
    assert.ok(verified.includes(service), `${service} 의 실호출 증거 연결이 끊겼다`)
  }
})
