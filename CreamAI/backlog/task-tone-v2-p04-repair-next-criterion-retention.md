# task-tone-v2-p04-repair-next-criterion-retention

- status: DONE
- active: false
- user outcome: `pass_angle` 첫 항목 repair 시도가 문단 구조를 고치면서도 이전 시도에서 통과한 구체 다음 판단 기준을 최종 원고에 유지한다.
- source: `tone-v2/evaluations/P04-repair-invariant-preservation-20260912.json`의 attempt 1 paragraph-only FAIL과 attempt 2 nextCriterion-only FAIL.
- scope: repair 응답의 마지막 의미 단락 또는 명시적 자기검사에서 구체 대상 + 기록·비교·확인 행동을 보존하는 계약 하나; RED fixture와 반례.
- acceptance: repair 메시지의 전체 불변식은 유지되고 nextCriterion 출력 계약이 구조적으로 우선되며, 모호한 격려·대상 없는 행동은 계속 거부된다. 실제 provider는 새 사용자 승인 후 고유 첫 항목 version으로 검증한다.
- out of scope: 검수 완화, nextCriterion recognizer 확장, 모델·재시도 횟수 변경, 2~52항목, 운영 데이터, DB/auth/payment/admin, commit, push, deploy, Production.
- KMS evidence: `umsh-tone-v2-repair-invariant-preservation-20260912`, `umsh-tone-v2-adjacent-next-criterion-20260912`, `umsh-tone-v2-pass-angle-next-criterion-20260912`의 좁은 대상·행동 경계와 gate 비완화 규칙을 재사용한다.
- skill status: 프로젝트 지정 local planning/debugging/TDD/verification skill 파일이 없어 수동 RED→GREEN→회귀 검증으로 대체한다.
- result: implementation PASS / provider first item PASS / live repair path NOT_RUN. 첫 항목이 attempt 1에서 complete되어 불필요한 repair 호출은 강제하지 않았다.
- verification: RED 9/10→GREEN 10/10; focused 48/48; full 682/682 across 101 suites; compiler/task 7/7; typecheck, Vercel build, diff check PASS. provider 1/52, 후속·제한 밖 호출 0건.
- review: closure re-review Approved with comments, Critical 0 / Major 0. `tests.md` 배치 Minor는 이전 52항목 기록을 원래 섹션으로 이동해 해소했다.
- next task: `task-tone-v2-p04-pass-angle-full-outline-continuation` (승인 전 PLANNED).
