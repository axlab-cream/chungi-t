# 오늘운 결과 화면·평생운 CTA 통합 — 2026-09-22

## Observation

- 저장된 오늘운은 공용 `/r/:id` 리더와 `/cmdg/?reportId=:id#todayResult` 전용 화면에서 서로 다른 디자인·하단 CTA로 표시됐다.
- 전용 화면은 결과 ID로 같은 계정의 저장 결과를 다시 읽는 API를 이미 사용한다.
- 천명사주 티저는 주소 해시만으로 열 수 없고 인증된 사주 프로필과 분석 성공이 필요하다.

## Decision

- 저장 오늘운의 신규 주소와 보관함 열기 주소를 전용 화면으로 통일하고, 구형 `/r/:id` 및 `/today/free` 주소는 결과 ID를 보존해 그쪽으로 보낸다.
- CTA는 `평생운 확인`으로 통일한다. 별도 `entry=lifelong` 경로에서 현재 로그인 계정의 서버 사주 프로필만 사용한다. 생년월일은 링크에 싣지 않는다.
- 계정 인증·프로필 누락·조회 실패 시 분석을 시작하지 않고 입력/오류 안내를 제공한다.

## Artifact

- `사주/js/umsh-report-access.js`, `사주/사주/index.html`, `src/server/service-directory.ts`, `src/server/app.ts`
- `tests/unit/lifelong-teaser-entry.test.ts`, `tests/unit/report-access-frontend.test.ts`, `tests/unit/report-api-access.test.ts`, `tests/unit/today-portal-view.test.ts`, `tests/unit/vault-saved-reading-route.test.ts`

## QA result

- 저장 결과 경로·CTA·프로필 예외 집중 테스트 104/104 PASS, 전체 단위 테스트 1497/1497 PASS, TypeScript PASS.
- 배포 사전 검사는 미정리 작업 트리를 차단했다. 운영 배포·실제 계정 클릭 검증은 미실시다.

## Lesson

- 동일한 저장 ID에 여러 화면이 연결되어 있으면 버튼 문구만 수정해도 UX가 갈라진다. 저장 주소 생성, 보관함, 과거 링크의 리다이렉트와 CTA를 함께 검증해야 한다.
