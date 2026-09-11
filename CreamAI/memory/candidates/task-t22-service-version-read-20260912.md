# T22 Slice 1 — 실제 서비스·버전 조회

## Observation

- 운영 판매 정본은 코드 카탈로그 19개이며 검색 목록에는 15개만 노출되고 4개는 기존 결과 접근을 위해 경로와 상품을 유지한 채 숨김 상태다.
- `service_config_versions`와 `content_versions`는 운영 DB에 존재하지만 로컬 프로세스에는 service role 설정이 로드되지 않았다. 이 로컬 관측만으로 Vercel 런타임 설정 누락을 단정할 수 없다.
- Supabase public 테이블은 프로젝트 기본 권한에 따라 service_role DELETE가 남을 수 있어 명시적인 revoke가 필요했다.

## Decision

- 관리자 조회는 삭제된 것처럼 숨김 서비스를 누락하지 않고 `discoveryVisible=false`로 표시한다.
- 실제 코드 카탈로그와 버전 저장소 상태를 분리한다. 저장소 불가를 0건 또는 발행 버전 없음으로 표현하지 않는다.
- 브라우저 역할은 직접 테이블에 접근하지 않고 `services:read` 서버 API만 사용한다.

## Artifact

- `src/admin/service-version-store.ts`
- `src/server/service-directory.ts`
- `src/server/app.ts`
- `admin-ui/index.html`
- `supabase/migrations/20260911215407_tighten_service_content_grants.sql`

## QA result

- 관련 테스트: 25 PASS.
- 전체 테스트: 622 PASS.
- TypeScript typecheck: PASS.
- Vercel build: PASS.
- 운영 DB 권한 조회: 두 버전 테이블 모두 service_role SELECT/INSERT/UPDATE만 존재하고 anon/authenticated 권한 없음.
- 운영 애플리케이션 배포·로그인 E2E: 아직 NOT_RUN.

## Lesson

- RLS와 명시 grant가 있어도 default privilege가 남을 수 있으므로 `revoke all ... service_role` 뒤 최소 권한을 다시 grant하고 실제 권한 표를 조회한다.
- 운영 목록에서 숨김과 삭제를 구분해야 기존 고객 결과 접근 불변성을 지킬 수 있다.
- 로컬 CLI 환경 변수 관측은 원격 런타임 상태의 증거가 아니다.

## Relation

- `personal/carrotcap/notes/aios-small-slice-workflow-20260912.md`
- `docs/superpowers/plans/2026-09-12-service-content-versioning.md`

## next_patch

- T22 Slice 2: 구조화 draft 생성, payload 검증, checksum, expectedRevision 충돌, 감사·멱등 명령 연결.
