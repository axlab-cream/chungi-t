관리자 셸 경로 이전(`/admin` → `/ops/constellation-7f3c`)만 읽기 전용으로 대조합니다. 변경된 라우트, 기존 경로 응답, API 인가가 맞는지 확인한 뒤 리뷰 보고서만 작성합니다.라우트 이전의 서버 분기, 기존 `/admin` 응답, API 인가가 테스트와 맞는지 소스에서 확인합니다.# Review Report - administrator shell route migration (`/admin` → `/ops/constellation-7f3c`)

## 1. Scope
- Task id: admin-route-hardening-20260922
- Reviewed files: `src/server/app.ts`, `admin-ui/index.html`, `tests/unit/admin-shell.test.ts`, `사주/portal.html`, `사주/robots.txt`
- Review time: 2026-09-22T05:39:30Z

## 2. Verdict
- Changes requested
- Summary: 서버는 이전 `/admin` 브라우저 경로를 `Location` 없이 404로 닫고, `/ops/constellation-7f3c` 루트와 그 아래 GET은 셸 HTML을 준다. `/api/admin/v1/*` 인가 경로는 그대로다. 경로가 한 단계 늘어난 뒤 셸의 상위 경로 계산이 그대로라, 섹션 아래 딥링크는 해당 화면이 아니라 개요로 열린다.

## 3. Critical Issues
- None.

## 4. Major Issues
- [admin-ui/index.html:573] Issue: `currentAdminRoute()`가 정확한 경로가 아니면 `path.split('/').slice(0, 3)`만 상위 경로로 쓴다. `/admin/<section>/<id>`에서는 세 조각이 `/admin/<section>`이었다. 지금은 `/ops/constellation-7f3c/members/deep/link`가 `['', 'ops', 'constellation-7f3c']`로 잘려 `/ops/constellation-7f3c`(개요)와 일치한다. 이 키는 `adminRoutes`에 있으므로 회원 화면으로 내려가지 않는다. `markCurrentRoute()`(577행)와 `checkAuthority()`(1907–1909행)가 이 결과를 그대로 쓰고, 개요가 아니면 `renderWorkspace()`가 그 화면의 데이터를 불러온다.
- Risk: 서버는 이 주소를 셸로 응답한다(`src/server/app.ts:945`, `tests/unit/admin-shell.test.ts:210`). 로그인된 운영자가 `/ops/constellation-7f3c/members/<id>`, `/ops/constellation-7f3c/orders/<id>`처럼 섹션 아래 주소를 열거나 새로고침하면 회원·주문 화면 대신 개요가 열린다. LNB의 정확한 한 단계 주소는 `adminRoutes[path]`에 걸려 영향이 없다.
- Recommendation: 상위 경로를 `slice(0, 4)`로 잘라 `/ops/constellation-7f3c/<section>`이 되게 한다. `/ops/constellation-7f3c/members/deep/link`가 `members`를 고르고 개요를 고르지 않는 테스트를 추가한다. 기존 셸 테스트는 본문에 `운영 관리자`만 봐서 이 오선택을 통과시킨다.

## 5. Minor Issues
- None.

## 6. Verification Gaps
- Gap: 이 리뷰에서 `tests/unit/admin-shell.test.ts`를 실행하지 않았다. 소스와 테스트가 맞춰 둔 항목은 `/admin`, `/admin/`, `/admin/orders`의 404와 빈 `Location`(`src/server/app.ts:923`, `938–940`, 테스트 97–103행), 새 루트·`/orders`·`/members/deep/link`의 셸 응답(`942–945`, 테스트 208–214행), `/api/admin/v1/me`의 401/403이다. `LEGACY_ADMIN_PATH`는 `^/admin(?:/.*)?$`라 `/api/admin/v1/*`와 겹치지 않는다.
- Suggested check: 중첩 경로의 클라이언트 화면 키를 테스트로 고정한 뒤 `tests/unit/admin-shell.test.ts`를 실행한다. 서버 테스트만으로는 개요로 떨어지는 회귀가 잡히지 않는다.

## 7. Final Recommendation
- Next action: `currentAdminRoute()`의 상위 구간을 네 조각으로 고치고, 섹션 아래 딥링크가 해당 `route.key`를 선택하는 테스트를 넣은 다음 셸 테스트를 다시 실행한다. API 경로는 바꾸지 않는다.
- Residual risk: 셸 HTML은 이전과 같이 미로그인에도 나가며, 데이터는 `/api/admin/v1/*` 직원 검사에 남는다(`src/server/app.ts:932–935`). `사주/robots.txt:6`의 `Disallow`는 새 진입 경로를 공개하지만, 같은 파일은 robots.txt를 접근 통제로 쓰지 않는다고 적혀 있고 응답에는 `X-Robots-Tag: noindex`가 붙는다. 복구 메일의 루트 이동은 `사주/portal.html:121`에서 새 경로로 이어지며 `/admin`으로 리다이렉트하지 않는다.