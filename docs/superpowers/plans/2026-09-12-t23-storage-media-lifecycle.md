# T23 Storage Media Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Execute this plan inline, one test cycle at a time. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 권한 있는 운영자가 실제 파일과 권리 근거를 Supabase Storage에 올리고, 서버 검사를 통과한 자산만 관리자 목록에서 미리보며, 참조 중인 자산은 삭제할 수 없게 한다.

**Architecture:** 브라우저는 서버가 발급한 2시간 제한 signed upload URL로 private `umsh-media` 버킷에 직접 업로드한다. 서버는 업로드 완료 요청에서 실제 Storage bytes를 다시 읽어 MIME 시그니처·크기·규격·checksum을 검사하고 `media_assets`에 승인 상태를 저장한다. 목록/미리보기/삭제는 모두 관리자 scope 뒤에서 처리하며 삭제는 DB의 참조 검사와 Storage API를 함께 거친다.

**Tech Stack:** Node.js ESM, TypeScript, Express, Supabase Postgres/Storage REST API, static HTML/CSS/JavaScript, Node test runner

## Global Constraints

- 샘플·목업 자산을 만들지 않고 운영자가 실제 선택한 파일만 저장한다.
- `SUPABASE_SERVICE_ROLE_KEY`와 signed upload token은 브라우저 저장소·DB·로그·감사 결과에 보존하지 않는다.
- 허용 MIME은 PNG/JPEG/WebP/GIF/MP4이며 이미지 10MB, 영상 50MB를 넘으면 업로드 시작과 서버 최종 검사에서 모두 거절한다. 운영 Supabase 프로젝트의 전역 50MB 상한과 일치시킨다.
- alt와 권리 근거 유형·증빙은 필수다. 영상 승인은 이미 승인된 이미지 poster가 연결돼야 한다.
- public bucket을 만들지 않는다. 미리보기는 짧은 signed read URL만 사용한다.
- 참조 테이블 또는 poster 연결이 있는 자산은 DB 원자 검사에서 삭제를 거절한다.
- 공개 고객 화면 연결은 T24/T29 범위이며 이번 Slice에서 임의 발행하지 않는다.

---

## PRD Gap Audit

| Gap | Impact | Safe decision for this Slice | Follow-up |
| --- | --- | --- | --- |
| 권리 승인 담당자/법무 형식 미정 | 법적 승인으로 오인 가능 | 운영자가 근거 유형과 증빙 문구를 등록한 `recorded` 상태만 표시 | 별도 법무 승인 단계는 T24 이후 정책 결정 |
| 고객 화면 공개 URL 계약 미정 | private URL을 콘텐츠에 잘못 저장할 수 있음 | 관리자 signed preview만 제공, 공개 발행 금지 | T29 release adapter에서 공개 copy/version 계약 확정 |
| 기존 정적 83개 자산의 권리 이관 자료 없음 | 정적 자산 자동 승인 위험 | 기존 자산은 계속 `unverified` 읽기 전용 | 근거 확보 후 별도 import Task |
| 대용량 영상 검사 실행 한도 | 50MB 전체 다운로드 비용 | 50MB 상한과 30초 timeout을 명시하고 실패 상태 유지 | 운영 실측 후 resumable/background 검사 분리 |

## Page Brief

- Page: `/admin/media`
- Purpose: 실제 운영 파일을 등록하고 검수 결과·사용 위치·삭제 가능 여부를 관리한다.
- Primary user: 콘텐츠·서비스 운영 관리자
- User situation: 고객 화면 콘텐츠에 연결할 자산을 올리기 전 규격과 권리 근거를 확인해야 한다.
- Core message: “Storage 원본을 서버가 검사한 결과만 승인 목록에 표시합니다.”
- Primary CTA: `파일 검사 후 등록`
- Secondary CTA: 미리보기, 미사용 자산 삭제
- Data source: `public.media_assets`, `public.media_asset_references`, private Storage bucket, 기존 정적 manifest
- Admin-controlled fields: 파일, alt, 권리 근거 유형, 권리 증빙, 영상 poster
- Required states: loading, real empty, uploading, inspecting, approved, rejected, permission denied, network failure, delete conflict, deleted
- Alerts: 손상·MIME 불일치·과대 파일·poster 누락·참조 중 삭제 차단
- SEO/AEO/GEO: 인증 관리자 noindex 화면이라 해당 없음
- Analytics: 감사 명령 `media.upload.begin`, `media.upload.finalize`, `media.delete`
- Legal/privacy: 개인정보 업로드 금지 안내, 권리 증빙은 비밀키가 아닌 출처/계약 식별 정보만 입력
- QA: 375/768/1024/1440, 키보드 focus, 진행/실패 문구, 표 내부 스크롤, 깨진 preview 0, 콘솔 오류 0

## Design Plan

- Tokens: 기존 관리자 `#fff`, `#f6f6f8`, `#1b1b1f`, `#5b5b63`, `#1f4fd8`, `#dfdfe4`
- Typography: 기존 운영 산세리프와 tabular numerals 유지
- Layout: 목록 위에 한 개의 compact upload form, 승인 자산과 정적 자산을 같은 표 계약으로 구분
- Signature: 상태 문구가 `업로드 → Storage 원본 검사 → 등록 완료`로 실제 흐름을 그대로 보여준다.
- Avoid: 가짜 progress, public bucket, 자동 발행, 법무 승인처럼 보이는 녹색 표현, 카드 갤러리 반복

### Task 1: Storage metadata and inspection contract

**Files:**
- Create: `supabase/migrations/<generated>_media_assets_storage_lifecycle.sql`
- Create: `src/admin/media-file-inspection.ts`
- Test: `tests/unit/admin-media-storage.test.ts`

**Interfaces:**
- Produces: `inspectMediaFile(buffer, declaredMime)` with signature, size, dimensions/duration and checksum validation.
- Produces: RLS-enabled `media_assets`, `media_asset_references`, and atomic `begin_media_asset_delete` RPC.

- [x] Write failing unit tests for valid PNG, MIME mismatch, damaged file, oversize image, and missing MP4 metadata.
- [x] Run the targeted test and confirm RED.
- [x] Implement the minimal parser and migration generated through the Supabase CLI.
- [x] Run the targeted test and confirm GREEN.

### Task 2: Real signed upload, finalize, list and delete API

**Files:**
- Create: `src/admin/media-store.ts`
- Modify: `src/auth/staff.ts`
- Modify: `src/server/app.ts`
- Test: `tests/unit/admin-media-storage.test.ts`
- Test: `tests/unit/admin-local-auth.test.ts`

**Interfaces:**
- Produces: `POST /api/admin/v1/media/uploads`, `POST /api/admin/v1/media/:id/finalize`, `DELETE /api/admin/v1/media/:id`.
- Extends: `GET /api/admin/v1/media` with `managed` assets and short signed preview URLs.

- [x] Add failing route/store contract tests for scope, validation, no secret leakage, finalize inspection and delete conflict.
- [x] Implement private bucket bootstrap, signed upload creation, server-side download inspection, metadata persistence and atomic delete preparation.
- [x] Add explicit `media:write` and `media:delete` scopes; keep unauthenticated requests at 401.
- [x] Run targeted tests and confirm GREEN.

### Task 3: Operator upload form and managed asset actions

**Files:**
- Modify: `admin-ui/index.html`
- Modify: `design-system/MASTER.md`
- Test: `tests/unit/admin-shell.test.ts`

**Interfaces:**
- Consumes: signed upload URL and managed asset DTOs.
- Produces: accessible actual-file form, poster select, progress/error states, preview and safe delete controls.

- [x] Add failing shell contract tests for required fields, direct signed upload, finalize, poster selection and delete conflict copy.
- [x] Implement compact form and managed rows without changing the existing LNB or static inventory behavior.
- [x] Verify responsive/focus/loading/error/empty states. Slice 1의 994px 실측과 이번 운영 데스크톱·접근성 트리 검증을 재사용했다.

### Task 4: Production apply and evidence

**Files:**
- Modify: `plan.md`
- Modify: `tests.md`
- Modify: `status.md`
- Create: `CreamAI/memory/candidates/task-t23-storage-media-lifecycle-20260912.md`

- [x] Run targeted tests, full `npm test`, typecheck and Vercel build.
- [x] Run Supabase lint/advisors, apply the additive migration, and verify table/RLS/grants/RPC. 원격에만 있는 과거 migration 6건 때문에 전체 dry-run은 실패해 현재 파일만 적용했다.
- [ ] Deploy Preview then Production and perform a reversible real image upload/preview/delete smoke test. Preview·Production 배포와 운영 UI는 PASS. 브라우저 파일 chooser 자동화 제한과 Production secret pull 차단으로 실파일 lifecycle smoke는 NOT_RUN이다.
- [x] Save sanitized reusable knowledge candidate; never store credentials or signed URLs. CreamWIKI 원격 쓰기는 인증 토큰 부재로 NOT_RUN이다.
