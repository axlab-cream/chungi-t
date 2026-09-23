# 천명사주 검토본 최소 추가 정보 입력

- observation: 현실 조건이 부족한 해석을 보완하려면 입력은 필요하지만, 역할·보상·소진을 칸별로 나누면 카드별 입력 부담이 커진다.
- decision: 격리 검토본에서 제안·관계·계획은 각각 실제 조건 한 문장, 일·직장은 현재 자리와 새 선택 두 문장만 받는다. 총 데이터 정의 입력칸은 15개에서 5개로 줄였다.
- artifact: `design-workspace/actual-service-pages/review/cmdg-longform-review.js`, 추가 정보 및 인생 흐름 지도 PRD, 단위 테스트, `tests.md`.
- qa_result: 로컬 브라우저에서 직장 카드 2칸, 비교표 `직접 확인 → 입력값 → 직접 확인`, 흐름 지도 `0/2 → 2/2 → 0/2`, 새로고침 후 `0/2`, 375px 가로 넘침 없음 확인. `npx tsx --test tests/unit/cmdg-longform-review.test.ts` 8/8, `node --check`, `npm run typecheck`, `git diff --check` 통과; 금지된 브라우저 저장소·전송 API 검색 결과 없음.
- lesson: 현실 정보를 세분화된 질문으로 모두 수집하지 말고, 판단에 필요한 주제를 한 문장으로 묶되 결과 예측과 저장·전송을 분리한다. 진행 막대의 분모는 입력칸 수를 동적으로 읽어야 UI와 계약이 함께 축소된다.
- relation: `personal/carrotcap/notes/cmdg-additional-context-input-20260922.md`, `personal/carrotcap/notes/cmdg-life-flow-map-20260922.md`.
- next_patch: 운영 적용 전에는 사용자 동의, 저장 위치·보존 기간, 접근 권한, 서버 검증과 실제 사주 계산 원자료 계약을 별도 설계한다.
