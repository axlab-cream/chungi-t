# 천명사주 검토본 GNB 단일 라인 — 2026-09-22

## observation

- 공통 상단의 `.umsh-service-shell`과 내부 `.appbar`가 모두 하단 테두리를 그려 검토본 GNB 아래에 라인이 두 개 보였다.

## decision

- 검토 페이지 범위에서만 바깥 셸의 하단 테두리를 제거하고, 앱바의 한 줄을 공통 GNB 구분선으로 유지한다.

## artifact

- `design-workspace/actual-service-pages/review/cmdg-longform.css`
- `design-workspace/actual-service-pages/review/cmdg-longform.html`
- `tests/unit/cmdg-longform-review.test.ts`

## qa

- 집중 테스트 8/8, JavaScript 구문 검사, diff 공백 검사 PASS.
- 로컬 브라우저에서 GNB 아래 수평 구분선이 한 줄만 남은 것을 시각 확인했다.

## limits

- 공통 운영 셸과 운영 페이지는 변경하지 않았다.
