# 천명사주 검토본 대운 흐름 위치 변경 이력 — 2026-09-22

## observation

- 대운 흐름 지도를 전체 요약 앞으로 이동했으나, 사용자가 기존 위치로 되돌리도록 요청했다.

## decision

- 격리 검토 페이지의 `나의 대운 흐름`을 `한눈에 보기` 전체 요약 다음의 기존 위치로 복원한다.
- 대운의 실제 계산값 범위·표현 방식은 바꾸지 않고, 위치와 읽기 순서만 복원한다.

## artifact

- `design-workspace/actual-service-pages/review/cmdg-longform-review.js`
- `tests/unit/cmdg-longform-review.test.ts`

## qa

- 집중 테스트 8/8, JavaScript 구문 검사, TypeScript, diff 공백 검사 PASS.
- 로컬 브라우저 접근성 트리에서 전체 요약 뒤에 대운 흐름이 오는 것을 확인했다.

## limits

- 운영 페이지·원격 저장값·배포는 변경하지 않았다.
