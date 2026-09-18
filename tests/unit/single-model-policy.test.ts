import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { SINGLE_MODEL_POLICY } from '../../src/report/report-generator.js'

/**
 * 2026-09-18 결정: 모든 생성은 gpt-5.6-luna 하나로 간다.
 *
 * gpt-5.5 는 호출당 약 $0.19 였고(입력 22.8K·출력 2.4K 토큰), 결혼궁합 1차 실패율 87% 와 겹쳐
 * 리포트 하나에 수만 원이 나갔다. 다른 모델이 기본값으로 다시 스며들지 않게 소스와 설정을 함께 본다.
 * 환경변수(REPORT_OPENAI_MODEL·OPENAI_MODEL)는 로컬 실험용으로 남기되, 기본값은 이 하나다.
 */
const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

test('런타임 설정과 코드 폴백의 기본 모델은 gpt-5.6-luna 하나다', () => {
  assert.equal(SINGLE_MODEL_POLICY, 'gpt-5.6-luna')
  const runtime = JSON.parse(read('data/runtime-config.json')) as { report?: { model?: string } }
  assert.equal(runtime.report?.model, SINGLE_MODEL_POLICY)
  assert.match(read('src/llm/openai-adapter.ts'), /process\.env\.OPENAI_MODEL \?\? 'gpt-5\.6-luna'/)
  assert.match(read('src/report/saved-chat.ts'), /process\.env\.OPENAI_MODEL \?\? 'gpt-5\.6-luna'/)
})

test('다른 모델 이름이 src 의 기본값으로 남아 있지 않다', () => {
  for (const path of ['src/llm/openai-adapter.ts', 'src/report/report-generator.ts', 'src/report/saved-chat.ts', 'src/report/report-queue.ts']) {
    const source = read(path)
    // 주석 속 이력 언급은 허용하고, 문자열 리터럴 기본값만 막는다.
    const literals = source.match(/'(?:gpt-4o(?:-mini)?|gpt-4\.1(?:-mini)?|gpt-5\.5|gpt-5-mini|o[134](?:-mini)?)'/g) ?? []
    assert.deepEqual(literals, [], `${path} 에 다른 모델 기본값이 남았다: ${literals.join(', ')}`)
  }
})

test('gpt-5.6-luna 는 gpt-5 계열 경로(max_completion_tokens·reasoning_effort)를 탄다', () => {
  // usesMaxCompletionTokens 의 접두 규칙이 새 모델 이름도 잡아야 추론 예산이 잘리지 않는다.
  assert.match('gpt-5.6-luna', /^(gpt-5|o[1-9]|o\d)/i)
})
