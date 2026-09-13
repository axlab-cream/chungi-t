# task-tone-v2-p04-comparative-next-criterion-diagnosis

- status: DONE
- active: false
- result: recognizer false negative; safe action morphology and subject-marked observable target clause are both missed.
- next: inactive `task-tone-v2-p04-comparative-next-criterion-recognition`.
- user outcome: 3번 비교형 항목의 저장된 두 번째 응답이 왜 `nextCriterion`만 실패했는지 원문 의미와 결정적 recognizer 결과를 대조해 정확히 진단한다.
- source: `P04-pass-angle-full-outline-continuation-20260912.json`의 order 3 attempt 2.
- scope: 새 provider 호출 없이 저장 원문 재평가, 구체 대상·행동·시간/순서 연결 구조와 recognizer trace 확인, 최소 후속 이슈 결정.
- acceptance: 실제 출력 결함과 recognizer 결함을 구분하고 양성/음성 반례를 제시한다. 구현이 필요하면 별도 Task로 분리한다.
- out of scope: 즉시 recognizer/gate/prompt/model/retry 변경, order 4~52 생성, 운영 데이터, DB/auth/payment/admin, corpus/release, commit/push/deploy/Production.
