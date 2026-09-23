# 천명사주 검토본 데이터 연결 상태 정리

- observation: 삼재는 실제 계산으로 전환됐지만 접힌 원자료 레일에 `계산값 미연결` 상태가 잔존했다. 핵심 계산값과 기간 카드에도 이전의 값 없음 문구가 남아, 계산 가능한 정보와 현실에서만 알 수 있는 정보를 구별하기 어려웠다.
- decision: 계산값은 사주 구성·대운·2026년 참고·삼재로 명시해 연결 완료 상태를 보여 준다. 직장·보상·관계·계획은 리포트 원문에서 만들 수 없으므로, 기존 최소 다섯 문장 입력으로만 보강하고 임의 예측을 만들지 않는다.
- artifact: `design-workspace/actual-service-pages/review/cmdg-longform.html`, `design-workspace/actual-service-pages/review/cmdg-longform-review.js`, `design-workspace/actual-service-pages/review/cmdg-longform.css`, `tests/unit/cmdg-longform-review.test.ts`, `tests.md`, `status.md`.
- qa_result: 집중 테스트 8/8, JavaScript 구문 검사, TypeScript, diff 공백 검사 통과. 로컬 검토본에서 연결 상태 블록, 실제 삼재 기간, 핵심 계산값 표기를 시각·접근성 트리로 확인했다. 이후 대운·세운·삼재 근거를 검토자가 바로 읽도록 `만세력 원자료 보기`는 기본 펼침으로 전환했다. 해석 카드는 닫힘 `펼치기 +`와 열림 `접기 −` 배지를 계산 스타일로 확인했다.
- lesson: 파생 계산값을 새로 연결한 뒤에는 화면의 접힌 원자료·보조 캡션까지 함께 검색해야 이전 미연결 상태가 남지 않는다. 원문이 갖지 않는 현재 생활 사실은 계산값처럼 보이지 않게 입력 출처를 분리한다. 분야별 그래프는 상단의 입력 완성도 막대를 반복하지 말고 관련 해석 카드에 배치하며, 대운 흐름의 생활 판단 보조 표현임을 명시한다.
- relation: `personal/carrotcap/notes/cmdg-life-flow-map-20260922.md`, `personal/carrotcap/notes/cmdg-compact-context-input-20260922.md`.
- next_patch: 운영 반영 단계에서는 인증된 회원 프로필의 동의·보존 정책과 서버 검증을 별도 계약으로 적용한다.
