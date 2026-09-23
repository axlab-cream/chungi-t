# 운영 관리자 진입 경로 변경 — 2026-09-22

## 상황

운영 셸이 `/admin`에 있어 주소만으로 목적을 쉽게 추측할 수 있었다.

## 결정

- 셸 진입 및 딥링크 기준 주소를 `/ops/constellation-7f3c`로 이동한다.
- `/admin`과 하위 경로는 새 주소로 리다이렉트하지 않고 일반 404를 응답한다.
- 새 주소는 `X-Robots-Tag: noindex, nofollow, noarchive`, `Cache-Control: private, no-store`, `robots.txt` 차단을 유지한다.
- 관리자 API(`/api/admin/v1/*`) 경로와 직원 membership 인증은 변경하지 않는다. URL 은닉은 인증 대체 수단이 아니다.

## 검증

- `npx tsx --test tests/unit/admin-shell.test.ts` — 26 PASS
- `npm run typecheck` — PASS
- `git diff --check` — PASS

## 후속 보완

- 독립 리뷰가 새 접두어의 중첩 딥링크가 개요로 떨어지는 회귀를 발견했다. 상위 경로 계산을 4개 구간으로 수정하고, `/ops/constellation-7f3c/members/deep/link`가 `members` 화면을 선택하는 테스트를 추가했다.
- 수정 뒤 관리자 셸 테스트는 27 PASS다.
- 현재 로컬·운영 서버는 변경 전 프로세스를 실행 중이어서 새 주소는 아직 404다. 소스 반영에는 서버 재시작 또는 운영 배포가 필요하다.

## 관련 후속: 오늘운 레이어

- 2026-09-22에 `천명보살의 오늘운` 회원가입 레이어를 실사 연애 장면 기반 이미지로 교체했다. 새 자산은 `사주/사주/assets/signup-benefit-popup-love-2026-09-22.png`이며, 공용 크롬 캐시 버전도 함께 갱신했다.
