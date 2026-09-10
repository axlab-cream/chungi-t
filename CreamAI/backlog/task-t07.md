---
task_id: task-t07
status: partial
active: false
owner: claude-pm
created: 2026-09-10
priority: P0
depends_on: [task-t05]
resolves: [U3]
---
# T07 — 관리자 셸·라우터

## 상태: 셸·라우터 완료 / 인증된 관리자 기능은 T05 대기

사용자가 지시한 순서 (1) ADR-0002 승인 후 T07 → (2) 최소 관리자(읽기 전용 조회)
→ (3) U4 중 **(1)** 이다.

## 배경
관리자 화면이 **없었다.** `/admin` 404, `app.ts` 에 `/admin*` 라우트 0건, 정적 관리자
페이지 0개. 기존 "관리자"는 권한 플래그 하나(`isAdminOwner`)로 결제 게이트를 열어 주는
용도였다.

## ADR-0002 승인 (U3 해소)
Status: Proposed → **Accepted (2026-09-10, 사용자 승인)**. 초안 전제 두 가지를 갱신했다.
1. `rewrites` → 레거시 `routes` 캐치올(TASK-011). **모든 요청이 함수를 지난다**
2. D1 의 경고("정적 루트에 두면 인증 우회")가 **실측으로 확인됐다** — TASK-011·020 에서
   서비스 생성 프롬프트 원문 15개와 외부 사이트 스크랩 116KB 가 인증 없이 서비스됐다

## 구현
| 항목 | 내용 |
| --- | --- |
| 셸 소스 | `admin-ui/index.html` — 정적 루트 **밖**(D1). 단일 파일, 인라인 CSS/JS, 새 CDN 없음 |
| 라우트 | `/admin`·`/admin/`·`/admin/index.html` + `/^\/admin\/.+/`(딥링크, D2-4). **정적 마운트 위**(D2-2) |
| 헤더 | `X-Robots-Tag: noindex, nofollow, noarchive` + `Cache-Control: private, no-store` |
| API | `GET /api/admin/v1/me` — `/api` 접두어 안이라 no-store + Vary 자동(D2-1) |
| 번들 | `includeFiles: "{admin-ui,data,prompts,사주}/**"` |
| robots | `Disallow: /admin` |
| 디자인 | 의미 기반 토큰 독립 정의(D3), 상태는 색 + 텍스트 라벨(D4), 금액 `tabular-nums` |

## Codex Critical — 내가 스스로 기록한 규칙을 위반했다
초판은 `/api/admin/v1/me` 에서 **`isAdminOwner` 로 관리자 권한을 부여했다.**

`plan.md` 와 `docs/admin-ops/T01-baseline.md` 에 이미 적어 둔 규칙이 있다:
> 관리자 권한 판정에 `isAdminEmail`·`isAdminOwner`(레거시 unlock)를 **절대 사용하지 않는다.**

`isAdminOwner` 는 **결제 없이 유료 리포트를 여는 레거시 unlock 이메일 목록**이다.
그것을 운영 권한으로 재사용하면 직원 membership 없이 관리자 API 가 열리고,
회수·감사 경로가 없는 "코드에 박힌 권한"이 된다(13-SECURITY, A02/A03 위반).

→ **지금은 누구에게도 권한을 주지 않는다.** 인증된 회원에게도 403
`STAFF_MEMBERSHIP_REQUIRED` 를 주고 셸이 그 이유를 표시한다.
T05 가 회수 가능한 membership 원본을 만들면 그때 판정을 교체한다.
A02 테스트로 고정했다 — unlock 이메일이 403 인지 직접 확인한다.

## 명시한 이탈 (U36)
D2-3 은 "관리자 정적 자산은 인증 미들웨어 뒤에서만 서빙한다"고 정했다.
**HTML 진입점에는 적용하지 못했다.** 이 프로젝트의 인증은 `Authorization: Bearer` 하나이고
(`verifySupabaseUser`) 브라우저 주소창 이동에는 그 헤더가 실리지 않는다. 서버 세션 쿠키가 없다.
→ **데이터가 없는 셸**을 응답한다. 목록·설정값·키가 하나도 없고 모든 데이터는 인증된
API 로만 온다. Codex 판정: A01("관리자 API 에서 데이터 없음")은 충족되나
**관리자 경로·메뉴 구조는 익명에게 노출**되며 T07 수용조건의 "직접 URL 접근 차단"을
HTML 수준에서는 충족하지 못한다 → **미해결 수용조건으로 남긴다(U36).**

## Success Criteria
- [x] 셸 소스가 정적 루트 밖에 있고 정적 경로로 열리지 않는다 (`/admin-ui/index.html` 404)
- [x] 라우트가 정적 마운트 위에 등록된다
- [x] 딥링크가 정적 탐색으로 흐르지 않는다
- [x] 셸에 설정값·키·목록이 없다
- [x] `noindex` + `no-store` + `robots.txt` 차단
- [x] 미로그인 401 / 권한 없음 403 을 구분한다
- [x] **레거시 unlock 이메일로 권한이 열리지 않는다 (A02)**
- [x] `npm test` **524 pass / 0 fail** (511 → 524)
- [ ] **인증된 관리자 기능** — T05(직원 membership·RBAC) 대기
- [ ] **HTML 진입점 인증** — U36(서버 세션 쿠키) 대기

## 배포 후 운영 실측
| 경로 | 결과 |
| --- | --- |
| `/admin` `/admin/` `/admin/orders` `/ADMIN` | **200** + `X-Robots-Tag: noindex…` + `Cache-Control: private, no-store` |
| `/admin-ui/index.html` | **404** |
| `/api/admin/v1/me` (미인증) | **401** `AUTH_REQUIRED` |
| 자산 캐시(task-021 확인) | `/css/policy.css`·`/assets/umsh-brand-logo.png` → **`X-Vercel-Cache: HIT`** |

`s-maxage` 는 클라이언트 응답에서 사라진다 — Vercel CDN 이 그 지시자를 소비하고 제거하는
정상 동작이며, `HIT` 으로 실제 캐시를 확인했다.

## 다음
- **(2) 최소 관리자(읽기 전용 주문·리포트 조회)** — Codex 지적대로 T05 없이 데이터 API 를
  열면 A02/A03 위반이다. T05(직원 membership) 없이 진행하려면 **무엇을 권한 근거로 쓸지**
  먼저 정해야 한다
- **(3) U4** — 운영 DB 스키마·grant·RLS 확인. 운영 접근이라 별도 승인 필요
