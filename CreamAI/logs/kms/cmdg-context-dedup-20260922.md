# 천명사주 검토본 추가 정보 중복 제거

- observation: 같은 `relationship` 맥락을 공유하는 여러 해석 카드가 동일한 입력 패널을 각각 렌더해, 이미 표에서 확인한 조건을 다시 보이게 했다.
- decision: 추가 정보 입력은 맥락별로 첫 관련 카드에 한 번만 렌더하고, 그 카드의 반영 표를 해당 맥락의 유일한 표시로 사용한다.
- artifact: `design-workspace/actual-service-pages/review/cmdg-longform-review.js`, `tests/unit/cmdg-longform-review.test.ts`, `status.md`.
- qa_result: 집중 테스트 8/8, JavaScript 구문 검사와 diff 공백 검사 통과. 로컬 브라우저에서 context form `offer`, `workDecision`, `relationship`, `planning` 각 1개 및 관계 조건 표 1개 확인.
- lesson: 공유 상태를 표시하는 입력 패널은 카드 단위가 아니라 맥락 단위로 한 번만 렌더해야, 입력량과 시각적 반복을 함께 줄일 수 있다.
- relation: `personal/carrotcap/notes/cmdg-compact-context-input-20260922.md`.
- next_patch: 운영 적용 시에도 같은 실제 조건을 여러 해석 블록에 반복하지 않도록 리포트 렌더 계약에 맥락별 표시 위치를 명시한다.
