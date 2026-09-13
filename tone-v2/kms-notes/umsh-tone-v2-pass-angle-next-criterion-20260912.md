# 운명상회 Tone V2 pass_angle 다음 판단 기준 판별

## Observation

`다음 시험 전날 오답 루틴으로 다시 세워봐`는 시점, 대상, 행동이 있는 구체적인 다음 기준이지만 기존 판별기는 유지·비교·확인 계열만 찾아 실패했다. 처음 확장한 동사 목록은 반대로 `시험을 버려`, `공부를 끊어`까지 인정할 수 있었다.

## Decision

- 미래 또는 순서 표지가 있는 문장에서 조사로 표시된 대상을 요구한다.
- 새 분기는 `고정·세워·정해·매겨`처럼 계획을 만드는 좁은 동사만 인정한다.
- `버리·끊`은 새 분기에서 제외한다. `다음에는 잘해봐` 같은 대상 없는 격려도 계속 거부한다.
- 기존 유지·비교·대화·확인 규칙과 나머지 density 요소는 변경하지 않는다.

## Artifact

- `src/report/tone-v2-review.ts`
- `tests/unit/tone-v2-generation.test.ts`
- `scripts/check-reading-live.ts`
- `tone-v2/evaluations/P01-pass-angle-next-criterion-20260912.json`

## QA result

- 이전 실제 저장 원문 재평가: directAnswer, grounding, scene, nextCriterion 전체 PASS.
- 신규 합성 실제 출력 두 번째 시도: nextCriterion PASS, 별도 grounding FAIL.
- RED → GREEN, focused 56/56, compiler/task 7/7, full 671/671, hashes 6/6, typecheck/build/diff PASS.

## Lesson

한국어 행동 판별은 동사만 넓히면 위험하다. 미래·순서 표지, 조사로 표시된 대상, 안전한 행위 동사를 함께 묶고 서비스 금기와 반대되는 목적어·동사를 반드시 반례로 둬야 한다.

## Relation

- `personal/carrotcap/notes/umsh-tone-v2-paid-density-gate-20260912.md`
- `personal/carrotcap/notes/umsh-tone-v2-live-repair-guidance-20260912.md`

## Next patch

신규 실제 출력의 `연습 점수가 목표 수준이고 객관식이라`를 놓친 grounding 판별을 별도 작은 Task에서 정상·오탐 fixture와 함께 다룬다.
