# task-tone-v2-p04-pass-angle-item3-recovery

- status: DONE
- active: false
- user outcome: 수정된 결정적 판별기로 이미 저장된 3번 항목의 두 번째 시도를 안전하게 복구해, 다음 전체 목차 생성이 3/52 상태에서 이어질 수 있게 한다.
- source: `task-tone-v2-p04-comparative-next-criterion-recognition`의 immutable replay density 4/4 PASS.
- scope: 격리 합성 레코드의 저장된 item 3 attempt 2를 동일 production review 경로로 재검증하고, 원문·시도 이력을 바꾸지 않는 명시적 복구 경로와 회귀 테스트를 만든다.
- acceptance: 모든 attempt raw 해시·시도 횟수 보존, item 3만 complete 전환, item 1~2 불변, item 4~52 호출·변경 0, 재실행 멱등성, 전체 회귀와 독립 리뷰 PASS. 상태 전이 때문에 전체 record/file 해시는 바뀌는 것이 정상이다.
- out of scope: 새 provider 호출, item 4~52 생성, gate 완화, prompt/model/retry 변경, 운영 고객 데이터, DB/auth/payment/admin, corpus/release, commit/push/deploy/Production.
- result: 저장 attempt 2를 production review로 재검증해 item 3만 complete로 승격했다. 2/52 failed(revision 18)에서 3/52 generating(revision 19)으로 정확히 한 번 전환됐고 provider 호출 및 item 4~52 attempt는 0건이다.
- verification: focused 13/13, related 53/53, compiler/task 7/7, full 690/690(101 suites), typecheck, Vercel build, saved replay PASS. 독립 리뷰 Approved with comments, Critical/Major 0.
- next: `task-tone-v2-p04-pass-angle-full-outline-resume-from-item4`는 inactive이며 새 사용자 `다음` 전에는 시작하지 않는다.
