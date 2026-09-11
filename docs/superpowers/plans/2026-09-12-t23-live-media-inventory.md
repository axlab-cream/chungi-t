# T23 Live Media Inventory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Execute this plan inline, one test cycle at a time. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 현재 Production에 배포되는 실제 `/assets` 파일을 검사한 매니페스트로 만들고, 권한이 있는 운영자가 `/admin/media`에서 사용처와 미리보기를 확인하게 한다.

**Architecture:** 빌드 시 `사주/사주/assets` 허용 루트만 스캔해 MIME 시그니처, 크기, 이미지 치수, SHA-256, 코드 참조를 결정적 JSON으로 생성한다. 서버는 번들에 포함된 JSON을 검증해 `media:read` 관리자 API로만 반환하고, 관리자 셸은 기존 표 컴포넌트로 실제 목록을 렌더한다.

**Tech Stack:** Node.js ESM, TypeScript, Express, 정적 HTML/CSS/JavaScript, Node test runner

## Global Constraints

- 실제 저장소 파일만 표시하고 샘플·목업 행을 만들지 않는다.
- 파일 내용은 `/assets` 기존 공개 경로로만 미리보고 내부 절대 경로를 API에 노출하지 않는다.
- 이 Slice는 읽기 전용이다. 업로드·대체·삭제·Storage 버킷 생성은 하지 않는다.
- 이미지 10MB·영상 100MB 기준을 검사 상태로 표시하되 기존 자산을 자동 삭제하거나 변경하지 않는다.
- 인증은 `src/auth/staff.ts`의 명시적 `media:read` scope와 서버 검사를 통과해야 한다.

---

## PRD Gap Audit

| Gap | Impact | Safe decision for this Slice | Follow-up |
| --- | --- | --- | --- |
| Supabase Storage 버킷·공개 정책 미정 | 잘못된 공개 범위 또는 service key 의존 | 기존 배포 자산을 읽기 전용 정본으로 사용 | T23 Slice 2에서 private staging/public release 경계 결정 |
| 저작권 승인 담당자·증빙 형식 미정 | 미확인 자산을 승인으로 오표기할 수 있음 | 모든 자산을 `unverified`로 표시 | 권리 증빙 필드와 승인 워크플로 결정 |
| 영상 poster 연결 규칙 미정 | 모바일 미리보기·발행 검사 불완전 | poster 미연결을 실제 결함으로 집계 | T23 Slice 2에서 posterAssetId 연결 |
| 삭제 정책 미정 | 참조 중 자산 손실 가능 | 삭제 API/CTA를 만들지 않음 | 참조 잠금 저장소 뒤 삭제 명령 추가 |

## Page Brief

- Page: `/admin/media`
- Purpose: 현재 배포 자산의 실제 파일 상태와 사용처를 한 화면에서 확인한다.
- Primary user: 콘텐츠·서비스 운영 관리자
- User situation: 콘텐츠 변경 전 어떤 자산이 존재하고 어디에서 쓰이는지 확인해야 한다.
- Core message: “현재 배포 파일을 기준으로 검사했습니다.”
- Primary CTA: 자산별 `새 탭 미리보기`
- Secondary CTA: 없음(쓰기 기능은 다음 Slice)
- Key content blocks: 전체/참조 중/권리 미확인/영상 poster 미연결 요약, 자산 표
- Data source: 빌드가 생성한 `data/admin-media-inventory.json`
- Admin-controlled fields: 이번 Slice 없음
- Required states: loading, real empty, validation failure, permission denied, success
- Alerts: 매니페스트 불가 시 실제 원천을 불러오지 못했다는 오류, 파일 제한 위반 상태
- SEO/AEO/GEO: 관리자 noindex 화면이므로 해당 없음
- Analytics events: 이번 Slice는 읽기 전용이며 관리자 조회 이벤트 저장은 제외
- Legal/privacy notes: 공개 자산만 다루며 권리 상태를 추정하지 않는다.
- QA checks: 375/768/1024/1440 너비, 표 가로 스크롤, 키보드 링크 포커스, 깨진 URL, 콘솔 오류

## Design Plan

- Tokens: 기존 `#ffffff` surface, `#f6f6f8` background, `#1b1b1f` text, `#5b5b63` muted, `#1f4fd8` focus, `#dfdfe4` divider
- Typography: 기존 시스템 산세리프; 파일 크기·치수는 tabular numerals
- Layout: 요약 4칸 + 실제 자산 표, 좁은 화면은 2칸 요약과 표 컨테이너 가로 스크롤
- Signature element: 이미지 자산의 작은 실제 썸네일과 참조 파일 수를 같은 행에 표시
- Avoid: 가짜 업로드 CTA, 반복 카드 갤러리, 권리 승인 추정, 무거운 영상 자동재생

---

### Task 1: Deterministic media manifest

**Files:**
- Create: `scripts/build-admin-media-inventory.mjs`
- Create: `data/admin-media-inventory.json`
- Modify: `scripts/prepare-vercel-public.mjs`
- Test: `tests/unit/admin-media-inventory.test.ts`

**Interfaces:**
- Produces: `{ schemaVersion: 1, assets: AdminMediaAsset[] }`
- Each asset: `id`, `name`, `kind`, `mime`, `bytes`, `width`, `height`, `checksum`, `publicUrl`, `references`, `rightsStatus`, `validation`

- [ ] Write a failing test that requires real assets, validated checksums/public URLs, MIME signatures, and non-placeholder references.
- [ ] Run the targeted test and confirm failure because the manifest and adapter do not exist.
- [ ] Implement the allowlisted scanner and generate the deterministic manifest.
- [ ] Re-run the targeted test and confirm manifest tests pass.

### Task 2: Authenticated API and admin screen

**Files:**
- Create: `src/admin/media-inventory.ts`
- Modify: `src/auth/staff.ts`
- Modify: `src/server/app.ts`
- Modify: `admin-ui/index.html`
- Modify: `tests/unit/admin-shell.test.ts`

**Interfaces:**
- Produces: `GET /api/admin/v1/media` guarded by `media:read`
- Consumes: `listAdminMediaAssets()` validated DTOs

- [ ] Add failing API and shell tests tests for 401/200, real list rendering, empty/error states, and safe previews.
- [ ] Implement the validated adapter and authenticated route.
- [ ] Implement `loadLiveMedia()` with summary metrics, escaped DOM construction, lazy image thumbnail, and external preview link.
- [ ] Run targeted tests, full `npm test`, typecheck, and Vercel build.
- [ ] Verify Preview then Production at `/admin/media`; record browser/console/log evidence.

### Task 3: ProjectOps and knowledge writeback

**Files:**
- Modify: `plan.md`
- Modify: `tests.md`
- Modify: `status.md`
- Create: `CreamAI/memory/candidates/task-t23-live-media-inventory-20260912.md`

- [ ] Record T23 as IN_PROGRESS with Slice 1 evidence and explicit Slice 2 boundaries.
- [ ] Save the sanitized verified pattern to CreamWIKI and confirm get/search.
