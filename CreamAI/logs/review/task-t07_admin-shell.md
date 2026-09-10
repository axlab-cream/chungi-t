# Review Report - T07 관리자 셸·라우터

## 1. Scope

- Task id: task-t07
- Reviewed files: `src/server/app.ts`, `src/auth/admin.ts`, `admin-ui/index.html`, `vercel.json`, `사주/robots.txt`, `tests/unit/admin-shell.test.ts`, `tests/unit/static-exposure.test.ts`, `docs/adr/ADR-0002.md`, relevant admin-ops specifications
- Review time: 2026-09-10T11:34:53Z

## 2. Verdict

- Changes requested
- Summary: 정적 노출 차단, 라우트 우선순위, no-store/noindex 헤더, 데이터 없는 셸이라는 구현은 확인되었고 대체로 안전합니다. 그러나 관리자 API 권한에 레거시 결제 unlock 이메일 판정을 재사용해 명시된 권한 경계와 T05 선행조건을 위반합니다. 이 상태로는 최소 관리자 조회 기능을 안전하게 확장할 수 없습니다.

## 3. Critical Issues

- [`src/server/app.ts:1619`] Issue: `/api/admin/v1/me`가 `isAdminOwner(owner)`로 운영 관리자 권한을 부여합니다.
- Risk: `isAdminOwner`는 `src/auth/admin.ts:18-20`에서 이메일 allowlist만 검사하며, 그 목록은 결제 없이 유료 리포트를 여는 레거시 unlock입니다. 따라서 직원 membership 없이 기본 이메일 또는 `UMSH_ADMIN_EMAILS`의 계정이 운영 관리자 API에서 `admin:read` 권한을 얻습니다. 이는 `admin-ops-execution-pack/13-SECURITY.md:2`, `plan.md:141`, `docs/admin-ops/T01-baseline.md:239-240`의 “운영 권한으로 재사용 금지” 요구와 A02/A03을 위반합니다.
- Recommendation: T05의 별도 직원 membership/RBAC middleware가 준비될 때까지 관리자 API에 레거시 allowlist를 사용하지 마십시오. T07을 셸 배치만으로 한정하거나, T05 완료 후 별도 관리자 권한 판정 모듈 및 회수 가능한 membership 기반 검사를 연결하십시오.

- [`src/server/app.ts:1619-1627`] Issue: 응답이 `rbac: 'email-allowlist'`와 고정 `scopes: ['admin:read']`를 반환해, RBAC가 없는 상태를 관리자 RBAC로 표방합니다.
- Risk: 향후 T08~T10의 주문·회원·리포트 API가 이 판정을 재사용하면 실제 직원 역할·scope·권한회수 없이 개인정보와 주문 데이터가 노출될 수 있습니다.
- Recommendation: T05가 unblock되고 membership·scope 원본이 존재할 때만 이 API를 활성화하십시오. 그 전에는 실제 관리자 권한을 성공 응답으로 표현하지 않거나 T07 완료 상태를 보류하십시오.

## 4. Major Issues

- [`admin-ops-execution-pack/15-TASKS.md:101-106`, `plan.md:74-76`] Issue: T07의 명시적 선행조건은 T05인데, T05는 U2/U4로 BLOCKED 상태입니다. ADR-0002 승인으로 U3만 해소되었으며 T05 의존성은 해소되지 않았습니다.
- Risk: T07의 “직접 URL 접근 차단” 수용조건과 13-SECURITY의 직원 권한 경계를 셸 단계에서 충족했다고 오인할 수 있습니다.
- Recommendation: T07 상태와 실행 근거를 수정하여 T05 완료 전에는 인증된 관리자 기능 완료로 선언하지 마십시오. U4 확인 및 T05 membership/RBAC 구현 후 관리자 API 검증을 다시 수행해야 합니다.

- [`src/server/app.ts:798-805`] Issue: HTML 진입점과 모든 `/admin/*` deep link는 미인증 상태에서도 200으로 셸을 반환합니다. 이는 ADR-0002 D2-3의 “관리자 정적 자산은 인증 middleware 뒤에서만 서빙” 요구와 다릅니다.
- Risk: 데이터·키는 포함하지 않아 A01의 “관리자 API에서 데이터 없음”은 충족하지만, 관리자 경로·메뉴 구조·운영 기능 범위는 익명 사용자에게 노출됩니다. 또한 T07 수용조건의 “직접 URL 접근 차단”을 HTML 수준에서 충족하지 못합니다.
- Recommendation: 이탈을 T07의 미해결 수용조건으로 명확히 유지하십시오. 서버 세션 쿠키 또는 인증 가능한 전용 진입 흐름(U36)을 도입한 뒤 HTML도 인증 뒤로 이동하십시오. 데이터 조회 API는 그 전까지 절대 이 셸의 공개성에 의존하지 말고 독립적으로 membership/RBAC를 검사해야 합니다.

## 5. Minor Issues

- [`tests/unit/admin-shell.test.ts:32-33, 130-137`] Issue: 테스트가 `UMSH_ADMIN_EMAILS`에 넣은 이메일을 관리자 정상 사례로 고정합니다.
- Risk: 레거시 이메일 allowlist를 운영 권한으로 사용하는 현재의 잘못된 경계를 테스트가 정상 동작으로 강화합니다.
- Recommendation: T05 이후에는 별도 membership fixture로 정상 사례를 구성하고, 기본 unlock 이메일 및 `UMSH_ADMIN_EMAILS`만 가진 계정이 관리자 API에서 403인지 A02 테스트를 추가하십시오.

- [`plan.md:76, 109-110`] Issue: ADR 승인과 T07 변경 후에도 T07은 BLOCKED, U3은 미해결로 남아 있습니다.
- Risk: ProjectOps 상태와 구현 상태가 불일치해 다음 작업의 승인·의존성 판단이 왜곡될 수 있습니다.
- Recommendation: U3만 해소되었고 T05/U4 때문에 T07의 인증 기능은 아직 진행 불가하다는 상태를 정확히 기록하십시오.

## 6. Verification Gaps

- Gap: 기본 레거시 unlock 이메일과 `UMSH_ADMIN_EMAILS` 계정이 직원 membership 없이 403이어야 하는 A02, 그리고 membership 회수 뒤 즉시 403이어야 하는 A03이 검증되지 않았습니다.
- Suggested check: T05 완료 후 별도 직원 membership fixture로 200, 일반회원·기본 unlock·환경 allowlist 계정으로 403, membership 회수 후 동일 Bearer token으로 403을 검증하십시오.

- Gap: 390px 및 1280px 화면에서 긴 한국어 문구, 키보드 탐색, 실제 로그인 세션 흐름이 검증되지 않았습니다.
- Suggested check: 브라우저 기반 responsive/keyboard QA와 실제 Supabase 세션으로 `/admin`, deep link, 401/403/200 상태를 확인하십시오.

- Gap: 공개 셸과 CDN 캐시 정책의 배포 환경 응답이 URL 변형까지 포함해 재검증되지 않았습니다.
- Suggested check: 배포 후 `/admin`, `/ADMIN`, `/admin/orders`, `/admin-ui/index.html`, 인코딩·정규화 변형에 대해 200/404와 `Cache-Control: private, no-store`, `X-Robots-Tag`를 확인하십시오. 현재 `s-maxage=31536000`은 `src/server/app.ts:819-847`의 정적 자산 mount에만 적용되며 `/admin` 셸에는 적용되지 않는 것은 확인했습니다.

## 7. Final Recommendation

- Next action: T07의 정적 셸 배치·노출 방지 부분은 유지하되, `isAdminOwner` 기반 관리자 API를 제거 또는 비활성화하고 T05/U4를 먼저 해결하십시오. T05의 별도 membership/RBAC가 준비된 뒤에만 `/api/admin/v1/me` 및 T08~T10의 읽기 API를 연결하십시오.