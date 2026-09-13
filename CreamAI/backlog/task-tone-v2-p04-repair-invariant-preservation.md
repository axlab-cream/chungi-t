# task-tone-v2-p04-repair-invariant-preservation

- status: DONE
- active: false
- user outcome: `pass_angle` 첫 항목의 두 번째 생성 시도가 현재 실패 규칙을 고치면서 이전 시도에서 통과한 품질 규칙도 보존한다.
- source: `tone-v2/evaluations/P04-pass-angle-first-section-quality-20260912.json`의 상호 보완적인 두 실패 시도.
- scope: repair instruction에 현재 실패와 함께 전체 품질 불변식을 보존하는 계약을 추가하고 결정적 회귀 fixture로 검증한다.
- acceptance: 재시도 prompt가 실패 규칙과 이전 통과 규칙을 모두 명시하며, positive/counterexample 테스트가 통과한다. 실제 provider 실행은 별도 사용자 승인 후 고유 version으로 첫 항목만 수행한다.
- out of scope: gate 완화, 모델·재시도 횟수 변경, 2~52항목 호출, 운영 데이터, DB/auth/payment/admin, commit, push, deploy, Production.
- credential: 실제 provider 재검증이 승인될 때만 ignored `.env.local`의 기존 키를 사용하며 값을 출력·저장하지 않는다.
- KMS evidence: `umsh-tone-v2-live-repair-guidance-20260912`의 번호형 실패 목록·원문 비복사 규칙과 `umsh-tone-v2-pass-angle-first-section-quality-20260912`의 통과 조건 회귀 진단을 재사용한다.
- skill status: 프로젝트가 지정한 local systematic-debugging/TDD/planning/verification skill 파일은 이 포크에 없어 수동 RED→GREEN→회귀 검증으로 대체한다.
- result: implementation PASS / business acceptance FAIL. 공용 repair 메시지는 모든 품질 불변식을 재고지하고 거부 원문을 복사하지 않지만, 실제 두 번째 시도는 첫 시도에서 통과한 nextCriterion을 다시 놓쳤다.
- verification: RED 9/10→GREEN 10/10; focused 48/48; full 682/682 across 101 suites; compiler/task 7/7; typecheck, Vercel build, diff check PASS. provider는 0/52, 후속·제한 밖 호출 0건.
- next task: `task-tone-v2-p04-repair-next-criterion-retention` (승인 전 PLANNED).
