# 운명상회 Tone V2 실제 재시도 교정 안내

## Observation

검수 사유를 한 문장으로 합친 재시도 안내는 모델이 이미 실패한 규칙만 고치게 만들었다. 그 과정에서 첫 시도에 없던 전문용어 형식 또는 한 문장 문단 위반이 새로 생겼다. 사용자 수동 재시도는 첫 모델 호출에 수정 안내 자체가 빠지는 별도 경로도 있었다.

## Decision

- 실패 사유는 중복을 제거한 번호 목록으로 전달한다.
- 모든 재시도에 문장당 한자 설명 하나와 빈 줄 문단당 2~4문장 규칙을 함께 재고지한다.
- 거부된 고객 원문은 수정 프롬프트에 복사하지 않는다.
- 사용자 수동 재시도는 최신 실패 attempt의 사유를 첫 호출부터 전달한다.
- 재시도 횟수, 모델, 품질 게이트는 바꾸거나 완화하지 않는다.

## Artifacts

- `src/report/report-generator.ts`
- `src/report/report-queue.ts`
- `tests/unit/report-persistence.test.ts`
- `tone-v2/evaluations/P01-live-repair-guidance-20260912.json`

## QA

- 실제 합성 출력 최종 재시도: 전문용어 형식 3/3, 복수 한자 설명 방지 3/3, 문단 문장 수 3/3 PASS.
- 전체 항목 완료: 2/3. 남은 `pass_angle` 실패는 별도 다음 판단 기준 규칙이다.
- focused 55/55, compiler/task 7/7, full 670/670, evidence hashes 12/12, typecheck/build/diff PASS.

## Reusable lesson

재시도 프롬프트는 과거 오류 목록만 반복하면 안 된다. 수정 과정에서 쉽게 회귀하는 인접 형식 불변식은 매번 함께 재고지하고, 자동 재시도와 사용자 재시도가 같은 계약을 공유하는지 별도로 검증해야 한다.

## Relation

- `personal/carrotcap/notes/umsh-tone-v2-technical-terms-gate-20260912.md`
- `personal/carrotcap/notes/umsh-tone-v2-paid-density-gate-20260912.md`

## Next patch

`pass_angle` 실제 출력에서 누락된 다음 판단 기준을 좁은 별도 Task로 다룬다. 이번 Task의 재시도 횟수·모델·게이트는 그대로 유지한다.
