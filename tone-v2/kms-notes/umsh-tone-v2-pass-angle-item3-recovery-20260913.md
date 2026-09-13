# 운명상회 Tone V2 저장 실패 항목 멱등 복구

## Observation

과거 결정적 판별기의 false negative로 실패 저장된 `pass_angle` 3번 항목은 수정된 동일 production review에서 통과했다. 새 모델 호출 대신 저장된 마지막 attempt 원문을 재사용할 수 있지만, 원문·시도 이력과 완료된 형제 항목을 바꾸면 감사 가능성과 결과 불변성이 깨진다.

## Decision

- 저장된 마지막 failed attempt에 raw가 있을 때만 복구한다.
- live 생성과 같은 JSON 파서 및 전체 review 함수를 저장된 birth/context/analysis와 완료 형제로 실행한다.
- 선행 항목 미완료, active/malformed lease, 잘못된 ID, 불완전 JSON, 품질 실패, pending 항목은 fail closed 한다.
- CAS 변경에서 검증된 hook/body와 attempt의 model/token/time 메타만 section에 투영하고 attempt 배열 자체는 수정하지 않는다.
- 이미 complete면 no-op으로 끝내 동시 2회와 반복 1회 호출도 revision을 한 번만 올린다.

## Result

격리 합성 레코드는 2/52 failed(revision 18)에서 3/52 generating(revision 19)으로 한 번만 전환됐다. item 1~2, 두 attempt와 raw SHA-256, 모든 식별자·입력·계산, item 4~52 해시는 유지됐고 이후 attempt는 0건이다. 복구 후 완료 3항목 모두 production review PASS다. Provider 설정을 제거한 하네스를 사용해 새 호출은 0건이다. Focused 13/13, related 53/53, compiler/task 7/7, full 690/690(101 suites), typecheck와 Vercel build가 PASS했다. 독립 리뷰는 Approved with comments였고 Critical/Major 이슈는 없었다. ProjectOps implementation의 광범위 토큰 패턴은 `task-tone` 식별자를 오탐했지만 task-scoped boundary-aware credential scan은 0건이다.
