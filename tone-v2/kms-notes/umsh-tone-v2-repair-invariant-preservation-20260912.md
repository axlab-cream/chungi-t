# 운명상회 Tone V2 재시도 품질 불변식 보존

## Observation

LLM 재시도 메시지가 현재 실패만 강조하면 이전 시도에서 통과한 규칙이 새 출력에서 회귀할 수 있다. 실제 `pass_angle` 첫 항목에서 첫 시도는 문단 구조만 실패했지만, 전체 불변식 체크리스트를 받은 두 번째 시도는 문단을 고친 대신 다음 판단 기준을 놓쳤다.

## Decision

repair 메시지는 중복 제거한 현재 실패 목록과 함께 직접 답, 근거 층, 가상 사례 표지, 생활 장면, 다음 판단 기준, 한자·문단 구조, 서비스 말투, 안전, 수치 근거, 내부 필드·코퍼스 복사·형제 중복 금지를 매번 재고지한다. 거부된 원문은 복사하지 않고 모델·재시도·검수 gate도 바꾸지 않는다.

## QA result

결정적 계약은 RED 9/10에서 GREEN 10/10, related 48/48, 전체 682/682로 통과했다. 실제 provider는 0/52로 실패했으며 후속·제한 밖 호출은 0건이다.

## Lesson

긴 체크리스트는 필요한 안전망이지만 실출력 보존의 충분조건은 아니다. 특정 규칙이 계속 회귀하면 다음 Task에서 그 출력 위치와 자기검사 계약을 좁게 고정해야 하며, recognizer나 gate를 먼저 완화하면 안 된다.

## Relation

- `personal/carrotcap/notes/umsh-tone-v2-live-repair-guidance-20260912.md`
- `personal/carrotcap/notes/umsh-tone-v2-pass-angle-first-section-quality-20260912.md`
