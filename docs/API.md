# API

Document public APIs, internal contracts, events, and schemas.

## Endpoints

| Method | Path | Purpose | Auth | Notes |
| --- | --- | --- | --- | --- |
| GET | `/admin`, `/admin/*` | 운영 관리자 셸(HTML). 직원 로그인 폼을 포함한다 | 없음 | 데이터 없는 셸. `noindex` + `no-store`. 정적 경로로는 열리지 않는다(ADR-0002 D1) |
| GET | `/api/admin/v1/me` | 호출자의 운영 관리자 권한 판정 | `Authorization: Bearer` | `no-store` + `Vary: Authorization` 자동 적용 |

### `GET /api/admin/v1/me`

권한 판정의 **유일한** 근거는 `src/auth/staff.ts` 이고, 그 근거는 배포 설정
`UMSH_ADMIN_SUPER_EMAILS` 하나다. 코드에 권한을 박지 않으며, 설정에서 이메일을 지우면
코드 변경 없이 권한이 회수된다. 설정이 비어 있으면 아무에게도 권한이 없다.

`UMSH_ADMIN_EMAILS`(`isAdminEmail`/`isAdminOwner`)는 **결제 없이 유료 리포트를 여는
레거시 unlock 목록**이며 운영 권한 판정에 절대 쓰지 않는다.

| 상태 | 조건 | 본문 |
| --- | --- | --- |
| 200 | 직원 membership 있음 | `{ email, role, scopes[], environment }` |
| 401 | 토큰 없음 / 만료 / 회수 | `{ code: "AUTH_REQUIRED", error }` |
| 403 | 인증됐으나 직원 아님 | `{ code: "STAFF_MEMBERSHIP_REQUIRED", error }` |

401 과 403 은 서로 다른 UI 상태로 다뤄야 한다(A35). 403 응답에는 `email`·`scopes` 를
넣지 않는다 — 권한 근거가 없는 호출자에게 알려 줄 것이 없다.

`role` 은 현재 `super_admin` 하나이고 `scopes` 는 조회 권한만 담는다
(`orders:read`, `members:read`, `reports:read`, `settings:read`). 감사·멱등 명령 기반
(T06)이 없는 동안 쓰기 scope 를 만들지 않는다.

**하위 호환**: T05 가 영속 membership 저장소를 만들 때 이 응답 형태를 유지한 채 판정만
교체한다. `scopes` 는 추가만 하고, 기존 값의 의미를 바꾸지 않는다.

## Schemas

Add request and response schema notes here.
