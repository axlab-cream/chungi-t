# task-tone-v2-p04-comparative-next-criterion-recognition

- status: DONE
- active: false
- review: closure re-review Approved; Critical/Major/Minor 0.
- user outcome: `다음 실모 뒤 같은 이유가 남는지 비교해봐`처럼 시점·관찰 대상·비교 행동·후속 판단이 명확한 문장을 nextCriterion으로 인정한다.
- source: `P04-comparative-next-criterion-diagnosis-20260913.json`의 이중 false-negative 진단.
- scope: 비교/확인 계열의 안전한 `해봐` 활용형과 주격 관찰절 대상을 최소 범위로 인식하고, 저장 attempt 2를 읽기 전용 재평가한다.
- positive examples: `다음 실모 뒤 같은 이유가 남는지 비교해봐.`, `다음 실모 뒤 같은 실수가 줄었는지 확인해봐.`
- negative examples: 대상 없는 `다음 실모 뒤 비교해봐.`, 모호한 `다음에는 잘해봐.`, 부정형, 과거완료형, 시험·공부 포기 행동.
- acceptance: 각 결함을 독립 RED로 재현하고 최소 구현 후 두 양성은 PASS, 모든 음성은 FAIL, 저장 attempt 2는 nextCriterion PASS로 재평가되며 저장 상태와 SHA-256은 바뀌지 않는다. 통제 변형은 원문 전체를 복사하지 않는 안전한 fixture 문자열 또는 SHA-256으로 자동화 증거에 남긴다.
- out of scope: gate 완화, 일반 `해봐` 전면 허용, prompt/model/retry 변경, 새 provider 호출, item 4~52 생성, 운영 데이터, DB/auth/payment/admin, corpus/release, commit/push/deploy/Production.
- result: 첫 구현 뒤 발견된 시간·기점 대상화와 띄어 쓴 과거/완료 오탐까지 수정했다. focused 40/40, related 45/45, full 687/687, 저장 재생 4/4 PASS, 기록 해시 불변, provider 호출 0.
- next: inactive `task-tone-v2-p04-pass-angle-item3-recovery`.
