# Status

## Initial Entry

- Status: `TODO`
- Created by: CreamAI ProjectOps SETUP
- Rule: append future progress entries below this section. Do not overwrite previous status history.

## Log

<!-- Append timestamped entries here. -->

## 2026-09-11 — T13 통합 검색·읽기 홈 완료

- Status: `DONE`
- API: `/api/admin/v1/search`가 주문·회원·리포트·지원 케이스의 정확 식별자만 권한별 read scope로 검색한다. 개인정보 원문·리포트 본문·결제 거래번호는 반환하지 않는다.
- UI: `/admin/search`에 대상 선택과 정확 식별자 폼을 연결했다. 부분 이름·이메일 검색은 개인정보 보호를 위해 제공하지 않는다.
- 배포·검증: Production `dpl_3SGaRp1LXYKCpPycHhJhJujXn4nu` Ready, 로그인된 관리자 화면에서 실제 검색 폼을 확인했다. typecheck PASS, focused admin tests 49/49 PASS.

## 2026-09-11 — T13 통합 검색·읽기 홈 시작

- Status: `IN_PROGRESS` → `DONE`
- 범위: 권한별 정확 ID 검색(주문·회원·리포트·지원 케이스)과 실제 운영 요약. 부분 이름·이메일 검색, 개인정보 원문, 브라우저 DB 직접 조회는 제외한다.

## 2026-09-11 — T12 CS 케이스 관리 완료

- Status: `DONE`
- DB: `support_cases`, `support_notes` additive migration을 Production에 적용했다. 두 테이블은 RLS=true이며 `anon`·`authenticated` 권한은 0건이다.
- API/UI: `support:read/write` 범위로 실제 케이스 접수·상태/담당자 변경·내부 메모·고객 답변 초안을 제공한다. 답변 초안은 어떤 고객 채널에도 자동 발송하지 않는다.
- 보호: 모든 쓰기는 T06 감사·멱등 명령, Idempotency-Key, revision 비교 갱신을 사용한다. 고객 원문·리포트 본문은 반환하지 않는다.
- 배포·UI 확인: Production `dpl_7ndiRAtb48aAaUyY4QdcCmFZdkhm` Ready 및 `/admin/support` 로그인 세션에서 실제 빈 상태와 접수 폼을 확인했다. 검증용 임의 케이스는 만들지 않았다.
- 검증: typecheck PASS, focused admin/support test 29/29 PASS.

## 2026-09-11 — T12 CS 케이스 관리 시작

- Status: `IN_PROGRESS` → `DONE`
- 원격 DB 점검: `public.support_cases`, `public.support_notes`는 아직 존재하지 않는다. 새 테이블을 additive migration으로 만들고, RLS와 브라우저 역할 권한 차단을 적용한다.
- 범위: 실제 케이스 접수·배정·내부 메모·고객 답변 초안·종료. 고객 연락 발송 채널은 구현하지 않는다.

## 2026-09-11 — T06A 관리자 계정 실제 변경 완료

- Status: `DONE`
- 실제 API: `POST /api/admin/v1/admin-accounts`, `PATCH /api/admin/v1/admin-accounts/:id/password`, `PATCH /api/admin/v1/admin-accounts/:id/status`를 `umsh_admin_accounts`에 연결했다. 비밀번호 평문은 저장·감사 기록·응답에 포함하지 않는다.
- 보호: `settings:write` 범위, 12자 이상 비밀번호, revision 비교 갱신, Idempotency-Key, 자기 계정 비활성화 차단을 적용했다. 모든 변경은 T06 감사 원장과 command receipt를 재사용한다.
- UI: `/admin/settings`에서 실제 관리자 목록, 관리자 추가, 비밀번호 변경, 활성/비활성 전환을 제공한다. 검증용 신규 운영 계정은 만들지 않았다.
- 배포·UI 확인: Production `dpl_AK8reynWaCWvDv5783spHDAwaZzh` Ready 및 `umsh.kr` 별칭을 확인했다. 로그인된 관리자 설정 화면에서 실제 계정 1건과 관리자 추가·비밀번호 변경·비활성화 제어가 표시되는 것을 확인했다. 검증용 계정 생성·비밀번호 변경은 수행하지 않았다.
- 검증: typecheck PASS, focused 관리자 단위 테스트 33/33 PASS.

## 2026-09-11 — T06A 관리자 계정 실제 변경 시작

- Status: `IN_PROGRESS`
- 범위: 실제 `umsh_admin_accounts` 계정 생성, 비활성화, 비밀번호 변경을 기존 audit/idempotency command 기반에 연결한다. 고객 데이터와 다른 도메인 테이블은 변경하지 않는다.

## 2026-09-11 — T06 감사·멱등 명령 기반 완료

- Status: `DONE`
- 원격 DB: `admin_audit_events`, `admin_command_receipts`를 additive migration으로 생성하고 RLS=true, `anon`·`authenticated` grant=0을 링크된 Production DB에서 검증했다.
- 서버: `executeAdminCommand`가 동일 요청 replay, 다른 본문 충돌, 감사 시작 실패 시 mutation 미실행을 보장한다. 감사 원장은 server-only service role로만 조회한다.
- UI: `/admin/audit`는 실제 감사 테이블의 행만 보여주며, 현재 원본 행이 0건이라 실제 빈 상태를 표시한다.
- 배포: `dpl_7Si8jCgfaDvAsGNMYW91uiLM4C3S` Ready 및 `umsh.kr` 별칭 확인. 브라우저 실검증에서 권한 있는 세션이 실제 빈 감사 원장을 렌더링했다.
- 검증: typecheck PASS, focused admin test 27/27 PASS. 초기 scope 누락은 커밋 `9277e28`에서 수정하고 재검증했다.

## 2026-09-11 — T06 감사·멱등 명령 기반 시작

- Status: `IN_PROGRESS`
- 범위: `admin_audit_events`와 command receipt 저장소를 실제 Supabase에 추가하고, 서버 전용 audit 조회 화면까지 연결한다. 이후 관리자 계정·CS·콘텐츠·정산 쓰기 작업은 이 기반을 재사용한다.
- 계획: `docs/superpowers/plans/2026-09-11-admin-audit-command-foundation.md`.
- 보안 결정: RLS 활성화, `anon`·`authenticated` 권한 회수, service role만 접근. 감사 기록에는 비밀번호·토큰·원문 개인정보를 넣지 않는다.

## 2026-09-11 — T10 실제 회원·리포트 운영 데이터 연결

- Status: `DONE` (읽기 전용 실제 데이터 범위)
- 원본: Production `cheongi_user_profiles`와 `cheongi_reports`를 서버 전용 서비스 키로 조회한다. 브라우저는 서버 API(`/api/admin/v1/members`, `/api/admin/v1/reports`, `/api/admin/v1/operations-snapshot`)를 통해서만 접근한다.
- 개인정보: 회원의 생년월일·성별·프로필 원문과 리포트의 본문·입력 데이터는 반환하지 않는다. 회원 식별자·이름·이메일은 마스킹하고, 운영 상태·서비스 키·시각만 내려준다.
- UI: 개요·회원·리포트·서비스 화면은 실제 데이터만 렌더링한다. 레거시 KPI/예시 행/`데이터 연동 대기` 템플릿을 삭제했다. 아직 원천 테이블이 없는 메뉴는 임의 데이터 대신 원천 미생성 상태만 표시한다.
- 배포: Production `dpl_AKmuNf3pjBfS6ATQkXWojYPSazqV` Ready, `umsh.kr` 별칭 반영 확인.
- 실브라우저 검증: 로그인된 관리자 세션에서 회원 6건, 리포트 68건, 공개 서비스 15개, 활성 코퍼스 팩 28개가 실제 값으로 렌더링됨을 확인했다.
- 검증: `npm run typecheck`, 관리자 관련 테스트 54/54 PASS, 목업 템플릿 문자열 스캔 PASS.
- 후속: 환불·정산·지원·콘텐츠·미디어·작업·감사 등은 해당 실제 원천 테이블/외부 시스템이 아직 없으므로, 테이블 설계·migration·감사 명령을 한 Task씩 추가해야 한다.

## 2026-09-11 — T05 관리자 계정 저장소 실제 연결

- Status: `IN_PROGRESS` (초기 관리자 등록 대기)
- 실제 DB: `public.umsh_admin_accounts`의 RLS 활성화, `anon`·`authenticated` grant 0건, `service_role` grant는 `SELECT`·`INSERT`·`UPDATE`만 남긴 것을 원격 쿼리로 재검증했다. `role='super_admin'` 제약을 추가했다.
- 이력: migration `20260911102420_umsh_admin_accounts_hardening`을 운영 DB에 적용하고 remote migration history에 `applied`로 기록했다.
- 코드: 서버 전용 PostgREST 관리자 계정 저장소, scrypt 비밀번호 해시 검증, 활성 계정 세션 판정, 실제 계정 목록 API, bootstrap 관리자 등록 API를 추가했다. 브라우저에는 해시·서비스 키·비밀번호가 전달되지 않는다.
- 배포: `UMSH_ADMIN_ACCOUNT_STORE=enabled` Production 설정 후 `dpl_FxHbcZicCR2aKwG7VEFR1Vhkncva` 배포 Ready 확인.
- UI 검증: `/admin/settings`에서 실제 `GET /api/admin/v1/admin-accounts` 결과(0개)와 초기 등록 CTA가 표시됨을 확인했다.
- 남은 단계: 로그인된 bootstrap 관리자가 설정 화면의 `현재 관리자 계정 등록`을 실행해 첫 실제 계정 레코드를 생성해야 한다. 이후 계정 추가·비활성화·비밀번호 변경은 감사 명령(T06)과 함께 활성화한다.

## 2026-09-11 — T05 관리자 membership 영속화 준비 점검

- Status: `BLOCKED` (원격 스키마 이력 승인 대기)
- 확인: Production에 `SUPABASE_SERVICE_ROLE_KEY`가 설정되어 있고, Supabase 프로젝트 ref는 `wdyzollywccgaepjeynu`로 연결되어 있다. 그러나 이 PC에는 Supabase CLI가 없으며, `public.umsh_admin_accounts`의 현재 원격 스키마·RLS·grant는 독립적으로 검증하지 못했다.
- 결정: 현재 환경변수 기반 로컬 관리자 로그인은 유지한다. 검증되지 않은 테이블을 권한의 유일한 근거로 전환하지 않으며, 브라우저·클라이언트에는 관리자 계정 테이블을 노출하지 않는다.
- 산출물: `docs/superpowers/plans/2026-09-11-admin-membership-storage.md`에 migration → server-only repository → password verification → audited UI → rollout 순서를 고정했다.
- 근거: Supabase RLS 공식 문서에 따라 exposed `public` 테이블은 RLS와 `anon`/`authenticated` grant 회수를 함께 검증해야 한다. 서버 `service_role`만 접근하는 구조를 계획에 명시했다.
- 다음 조건: 원격 migration history 쓰기와 Supabase CLI 설치 또는 인증된 DB 조회 경로에 대한 사용자 승인 후 T05 Task 1을 진행한다.

## 2026-09-11 — admin LNB 화면 셸 확장

- Status: `DONE` (화면 구조·탐색 범위)
- 범위: `/admin` 좌측 LNB의 운영 현황, 고객·콘텐츠, AI 운영, 시스템 경로를 화면별로 분리했다.
- 반영: 공용 `route-placeholder`를 제거하고, 각 경로에 업무별 제목·KPI 구조·목록 열·명시적 빈 상태·비활성 CTA를 제공했다. 데이터가 연결되지 않은 곳은 임의 수치 대신 `— / 데이터 연동 대기`로 표시한다.
- 경로: 검색, 주문, 환불, 정산, 회원, 고객 지원, 콘텐츠, 서비스, 미디어, 리포트, 작업 큐, 코퍼스, 프롬프트, 평가, 릴리스, 통계, 로그, 장애, 감사 기록, 설정.
- 디자인: `design-system/MASTER.md`에 운영 화면 토큰, LNB/표 규칙, 미연동 상태와 반응형 기준을 기록했다.
- 검증: `npm run typecheck` PASS; `npx tsx --test tests/unit/admin-shell.test.ts tests/unit/admin-orders.test.ts tests/unit/admin-local-auth.test.ts` PASS (47/47).
- 제한: 이번 반영은 페이지 구조와 안전한 빈 상태까지다. 콘텐츠·회원·AI 운영의 조회/저장 API 및 실제 변경 CTA는 별도 작업에서 권한·감사 로그와 함께 연결해야 한다.

## 2026-09-10 — task-002 프로젝트 분석 및 3서비스 연동 진단

- Status: `IN_PROGRESS` → `DONE` (분석/문서화 범위)
- Task: task-002 (`CreamAI/backlog/task-002.md`, status: active)
- 실행: 프로젝트 구조 분석, Git/Vercel/Supabase 연동 진단, 로컬 baseline 검증, 후속 Task 큐 정의
- 검증 결과:
  - `npm run typecheck` PASS (오류 0건)
  - `npm test` PASS (373/373, 29 suites)
  - `node scripts/check-integrations.mjs` PARTIAL (8 PASS / 2 FAIL — Inicis MID·SignKey, checkout enabled)
  - `remember-integration.ps1` github=configured, vercel=configured, supabase=missing_cli
  - Supabase REST 3개 테이블 도달(HTTP 401 = RLS 거부), Auth settings HTTP 200 (google/kakao/email)
- 판정: Git configured / Vercel configured / Supabase partial (CLI 미설치, migrations 없음)
- 산출물: `CreamAI/reports/task-002_analysis.md`, `goal.md`, `plan.md`, `tests.md` 갱신
- 발견: `run-projectops-harness.ps1`의 test 모드가 저장소 package.json을 못 찾아 실제 테스트를 실행하지 않음
- 변경하지 않은 것: CLI 설치/로그인, Vercel 환경변수, Supabase 스키마, git 커밋/푸시
- 다음: TASK-003 로컬 `.env` 완결화 (사용자 승인 대기)
- Codex 리뷰 반영: Critical 0 / Major 1 / Minor 2 — 전부 수용
  - Major: 라이브 스키마 마이그레이션 안전 게이트 부재 → `plan.md`에 G1~G5 추가, TASK-004를 BLOCKED로 변경
  - Minor: `check:*` 개수 16 → 17 정정, Task 상태(backlog/plan/status) 일치화
- 하네스: preflight/test/review/rag/release 5모드 실행 (test 모드는 하네스 결함으로 실제 테스트 미실행)
- Memory candidate: `CreamAI/memory/candidates/task-002_memory.md` (should_promote_to_rag: false)
- 최종 리포트: `CreamAI/reports/task-002_final.md`

## 2026-09-10 — task-003 PAUSED

- Status: `IN_PROGRESS` → `PAUSED`
- 완료: `.env` 백업(프로젝트 밖 스크래치패드), Vercel Development/Production `env pull` 진단,
  `.env.example` 보강(Sensitive 경고·REPORT_STORAGE_DIR·PUNGSU 별칭), `README.md` 동기화 절차 문서화
- 핵심 발견: Vercel의 모든 비밀값이 Sensitive로 설정되어 `env pull` 시 `KEY=""` 빈 값으로 내려온다.
  `.env.local`은 `override: true`로 이기기 때문에 pull 결과를 그대로 쓰면 정상 `OPENAI_API_KEY`가 비워진다.
  또한 `vercel env pull`은 병합이 아니라 파일 전체를 재작성한다.
- 미완료: `.env`에 `UMSH_ADMIN_EMAILS` / `PAYMENT_TEST_MODE` / `PUBLIC_BASE_URL` 반영
  (글로벌 규칙 `.env*` 수정 금지로 자동 차단, 사용자 승인 대기)
- 사유: 승인 확인 중 사용자가 admin-ops 구축으로 작업 방향 전환

## 2026-09-10 — task-t01 (admin-ops T01) 기준 소스·운영 차이 기록

- Status: `DONE` (조사 작업)
- 기준: HEAD `dac3835` / 브랜치 `fix/umsh-qa-ux` / dirty 30건
- 패키지 무결성: `admin-ops-execution-pack` 21문서 SHA-256 전부 일치
- 중대 발견:
  1. HEAD가 `origin/main` 대비 -20/+10 → **로컬 소스는 운영 배포 코드가 아니다** (U1)
  2. 패키지 "현재 확인된 API" 15개 **전부 실재** — 초판의 `GET /api/report/:reportId` 부재 판정은
     배열 형태 라우트 등록을 놓친 grep 오류였고 Codex 리뷰로 정정 (app.ts:2398, 별칭 `/api/reports/:reportId`)
  3. 패키지 02-EVIDENCE 미기재 실제 API 23건
  4. `src/auth/admin.ts`에 관리자 이메일 하드코딩 → 환경변수로 회수 불가 → A03 현 구조로 충족 불가
  5. 로컬 주문 저장 모드 `memory` 실측 (Dev/Preview는 미검증) → A17 대응 필요 (U2)
  6. `express.static`(683~684행)은 파일이 있으면 인증 없이 서빙 → 관리자 UI는 정적 루트 밖 `admin-ui/`에 배치 (ADR-0002 D1)
  7. `/admin`, `/api/admin` 경로 충돌 없음
- E01~E16 재검증: 확인됨 11건, 부분 확인됨 1건, 미재검증 4건(T03/T25 범위), 충돌 0건
- 회귀 기준: typecheck 0건, unit 373/373, check-integrations 운영 8P/2F · 로컬 7P/3F
- 산출물: `docs/admin-ops/T01-baseline.md`, `docs/admin-ops/HANDOFF.md`, `docs/adr/ADR-0002.md`,
  `CreamAI/backlog/task-t01.md`, `plan.md`(T01~T38 큐), `goal.md`(admin-ops 최우선 목표)
- 운영 반영: 없음 (커밋·푸시·배포·스키마 변경·운영 DB 조회·PG 거래 전부 미수행)
- Codex 리뷰: Critical 0 / Major 5 / Minor 4 — **전부 수용, 반려 0건**
  - M1 리포트 API 부재 오판 정정 (가장 중대), M2 라우트 총계 정정(145 등록문 / 286 경로 / `/api` 39)
  - M3 static 순서 설명 정정, M5 U1이 T02·T03도 게이팅
  - m3 문서에서 관리자 이메일 주소 삭제, m4 ADR-0002 D1·D3 재작성
- 미해결(사용자 결정): 패키지 `20-HANDOFF.md` 갱신 여부 (선택지 A 유지 중)
- 다음: T02 (20종 키·노출 매핑, "로컬 HEAD 기준" 라벨 조건) — 사용자 승인 대기

## 2026-09-10 — task-t02 (admin-ops T02) 20종 키·노출 매핑

- Status: `DONE` (조사 작업). 기준: 로컬 HEAD `dac3835` = **운영 소스와 일치**
- 20종 누락: **0건** (canonical 20 = manifest 20 = 프롬프트 파일 20)
- alias 충돌 **2건**:
  1. [중대] `cmdg ↔ saju_master` 브리지가 코드에 없음. `loadServiceSystemPrompt('cmdg')` THROW.
     현재는 `/api/saju/analyze`가 400으로 거절해 사용자 영향 없으나, 관리자가 paymentKey를
     프롬프트/코퍼스 조회에 넘기면 500이 된다
  2. `home` 정규화 방향 역전 (prompt: home_pungsu→home_fit / directory: home_fit→home_pungsu)
- hidden 자동 공개: **없음** (`listServiceDirectory()` 런타임 15건 확인)
- [신규] **노출 15종 ≠ 판매 19종** — `PUBLICLY_DISABLED_PRODUCT_KEYS`가 빈 Set이라
  discovery에서 숨긴 4종도 결제 catalog에 노출되고 신규 주문이 가능하다 (U10, 정책 결정 필요)
- [신규] 06-SCREENS S02 요구 17개 필드 중 **12개는 코드 상수, 5개는 부재 → 관리자 편집 가능 0개.**
  서비스 제목·가격·노출·판매를 바꾸려면 코드 수정 + 재배포가 필요하다 (T22 범위 정의)
- 18-SERVICES 표: 20행 중 19행 정확, 1행(`saju_master｜cmdg`)은 코드 미구현 매핑
- `npm run check:service-contracts` 통과 (기존 검증기는 결제 catalog·directory를 검사하지 않음)
- 산출물: `docs/admin-ops/T02-service-mapping.md`

## 2026-09-10 — U1/U7 해소: 운영 소스 정본 확인 (사용자 질문 계기)

- 사용자 질문: "운영에서 최신파일이 있다면 그것을 다운받아 로컬이 동기화 되어야 겠지?"
- **결과: 운영이 최신이 아니다. 운영 = 로컬 HEAD `dac3835`.**
  - 운영 배포 `dpl_8GJ6WMBmoaBZeQy4YFQtcwZ8JeKZ` (2026-09-09 17:06:57), git 메타데이터 없음
  - 이 배포 id는 admin-ops 패키지 02-EVIDENCE의 조사 루트와 **동일**
  - 라이브 마커 3종(robots.txt·sitemap.xml 존재, `/privacy` title·css 버전)이 모두 HEAD와 일치
  - HEAD 커밋 시각 17:06:34 → 배포 17:06:57 (+23초)
- **T01 초판 결론 정정**: "HEAD는 운영 소스가 아니다"는 `README.md`의 잘못된 전제
  ("main push가 Production 트리거")를 검증 없이 사용한 오류였다. U1/U7 해소, T02/T03 라벨 해제
- **신규 U13**: `origin/main`의 20 커밋(결혼택일·공용 GNB·브랜드 통일·모바일 프레임 정합)이
  운영·로컬 모두에 미반영. 병합 dry-run 충돌 **24개**, `wedding_day`는 양쪽 독립 구현(add/add)
- **신규 U14**: 운영 배포가 Git 연동이 아니라 CLI 로컬 배포로 보임. `README.md` 서술과 불일치
  (→ 2026-09-10 16:25 **정정·해소**: 연동은 있었고 CLI 배포가 그것을 우회한 것이다. 아래 참조)
- 권고: 병합은 별도 Task로 분리(선택지 C). admin-ops는 운영 소스 위에서 계속 진행
- 수행한 git 작업: `git fetch origin`, `merge-tree` dry-run만. merge/rebase/checkout 없음
- 산출물: `docs/admin-ops/production-source-of-truth.md`

## 2026-09-10 — task-t03 (admin-ops T03) 저장소 스키마·권한 조사

- Status: `DONE` (조사 작업). 운영 DB 쿼리 없음 (service_role 키 미보유)
- 수용 조건 충족:
  - `owner_id` 타입: **`uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT`**
    → **08-DATA의 "owner_id(TEXT)" 기재는 틀렸다**
  - 구형 payload fixture: `tests/unit/report-persistence.test.ts:102` 확보
- 정본 SQL vs 코드 `ensureDb()`가 **서로 다른 스키마를 만든다**
  (orders: uuid+FK+CHECK+RLS+grant+index vs TEXT만 / reports: 분석열 8 vs 1 / profiles: 정본 SQL 부재)
- 3개 스토어 접근 모델이 전부 다르다:
  orders·reports = service_role(RLS 우회) / **profiles = publishable키 + 고객 accessToken(RLS 통과)**
  → 관리자는 현재 함수로 고객 프로필을 조회할 수 없다 (T10에 별도 adapter 필요)
- 낙관적 동시성: reports는 4개 모드 전부 CAS(payload 내 `revision`) + 불변 필드 강제.
  orders는 **상태 가드만** 있고 revision·멱등키·row lock 없음 → A09/A10 미충족 (U17)
- [중대] `cheongi_reports`의 관리자 분석 열 8개(`service_key`, `status`, `public_id`,
  `progress_*`, `order_id`, `input_fingerprint`, `admin_status`)를 **애플리케이션이 기록하지 않는다.**
  그 위 인덱스 4개의 유용성이 불확실하다. 운영 실제 값은 미확인(쿼리 불가).
  안전한 결론: T10은 운영 측정·backfill 결정 없이 이 열에 의존할 수 없다 (U18)
- [중대] **PG 승인 성공 후 저장 실패를 불확정 상태로 남길 수 없다.** `catch`가 상태 확인 없이
  `failed`를 쓰려 시도하고, `status` enum에 불확정 상태가 아예 없다 → A12/A13 충족 불가 (U22).
  현재는 `checkoutEnabled=false`라 잠재적이나 **TASK-007(결제 활성화) 전에 해소 필요**
- U9 부분 해소: `developmentReportAccess` 술어는 소스로 확정. Supabase URL·공개키가 설정된
  환경에서 `false`이므로 현재 4개 환경은 안전하나, 설정 누락 런타임에서는 열린다
- U12 → U4로 이관 (저장된 `context.serviceKey` 분포는 운영 DB 조회 필요)
- 신규: U17(주문 직렬화), U18(분석열 미기입), U19(profiles 정본 SQL 부재),
  U20(주문·프로필 memory 차단 장치 없음), U21(REST upsert amount 덮어씀), U22(불확정 상태 부재)
- Codex 리뷰: Critical 0 / Major 5 / Minor 3 — **전부 수용, 반려 0건.** 지적 대부분이 증거 경계 초과였고,
  "미기입 단정" / "항상 false" / "verify 스크립트를 성공으로 표기" / "U22 최종 상태 단정"을 모두 하향 조정
- 산출물: `docs/admin-ops/T03-storage-schema.md`

## 2026-09-10 — task-t04 (admin-ops T04) 기존 회귀 기준 수집 — M0 마지막

- Status: `DONE` (조사 작업)
- baseline 고정: typecheck PASS(0), `npm test` **373/373 PASS**, `qa:all-services` PASS,
  `check:*` 16개 중 **4 PASS / 12 FAIL**
- [중대] **unit 결과가 실행 형태에 따라 결정적으로 갈린다.** 동일 60개 파일:
  `npm test`(glob) → 373/0 (2회 재현), 명시 파일 목록 → **365/8** (2회 재현).
  **원인은 특정하지 않았다**(U24). baseline은 명령·환경(Node v24.13.1/tsx v4.23.12)·
  파일 manifest 해시까지 고정해야 유효하다
  - 실패 8개는 `report-content-guards`(1) / `report-generator`(2) / `report-persistence`(5) 소속.
    T10이 `report-store.ts`를 건드릴 때 먼저 확인
- [중대] **`check:*` 실패 12개의 성격을 전수 규명했다.**
  - **11개는 stale guard** — 리팩터 커밋 `fdc80f2`(HEAD 조상)가 심볼을 옮겼고,
    가드 수정본은 `origin/main`에만 있다(`7a4ef1c`, `00453e0`, `f6402cd`).
    11개 가드 각각에 대해 옛 심볼/신 심볼/우리 코드 존재 여부를 표로 검증했다.
    **서비스 코드 유실이 아니다.** `origin/main` 병합 시 11개 전부 해소 (U25)
  - **1개는 실제 코드 차이** — `src/pet/cat-service.ts`에 `retrieveCategoryOwnChunks`
    (자기 코퍼스 우선 검색)가 없다. 형제 5개 서비스와 `origin/main`에는 있다.
    고양이 궁합만 RAG 근거 선택이 한 단 빠진 상태로 운영 중일 가능성 (U23)
- **`check:production-source`가 저장소의 수동 배포 preflight다.** 두 조건(작업트리 청결 +
  HEAD가 fetch한 `origin/main` 포함)을 요구하고 현재 **exit 1**.
  단 이 스크립트는 배포를 차단하지 않으므로 **과거 배포가 이를 무시했는지는 미확인**이다 (U14)
- 16-ACCEPTANCE 지정 재사용 테스트 9개: **전부 존재·전부 통과.**
  단 `admin.test.ts`가 하드코딩 관리자 이메일을 테스트로 고정하고 있어 T05에서 "고쳐서 통과" 금지
- A01~A40 매핑: **덮임 2 / 부분 17 / 없음 21.**
  덮임 2개(A33 소유권, A34 완료 불변)는 "관리자를 만들면서 절대 깨뜨리면 안 되는 것"이며
  이미 테스트로 보호된다. A32·A39는 핵심 동작은 보호되나 시나리오 전체는 미충족(부분)
- 정정: 초안이 `qa:all-services`를 "LLM 호출 추정 — 미실행"으로 적었으나 **정적 스크립트였다.**
  실행해 PASS 확인, baseline에 포함
- Codex 리뷰: Critical 0 / Major 4 / Minor 3 — **전부 수용, 반려 0건.**
  "순서 의존" 단정 하향, "배포 정책 위반" 주장 하향, A32·A39 덮임→부분 하향,
  `qa:all-services` 오분류 정정, check diff 11→12 정정
- **U23을 병합/출시 차단 항목으로 격상** (Codex 권고 — 판매 중인 서비스의 동작 차이)
- 산출물: `docs/admin-ops/T04-regression-baseline.md`
- **M0의 T01~T04 4개 Task 전부 DONE.** 단 M0 종료 게이트("코드·WIKI 차이 해결")는
  U13·U23·U25가 남아 **미완결**이며, 세 항목 모두 `origin/main` 병합으로 수렴한다.
  Codex도 "M0 완료 선언 불가"로 동일 판정

## 2026-09-10 — task-009 `origin/main` 병합 1차 시도 → abort (BLOCKED)

- Status: `BLOCKED` — 브랜드 표기 결정 1건 대기
- **저장소 안전:** HEAD `dac3835` 불변, MERGE_HEAD 없음, 충돌 0건, dirty 31건(시도 전과 동일).
  복구 지점 `backup/pre-merge-20260910` 생성. 미커밋 작업물 전부 보존.
  수행한 git 작업: `fetch`, `merge --no-commit`, `merge --abort`. **커밋·푸시·배포 없음**
- 사전 안전 확인: 미추적 29건 vs incoming 216건 충돌 **0건**,
  우리가 수정한 tracked 2건(`.env.example`, `README.md`)도 incoming에 없음
- 충돌 24건 전수 확인 후 **파일별 해소 방침 확정** → `docs/admin-ops/TASK-009-merge-plan.md`
  - `registry.json`: 양쪽 packs 28개 id 완전 동일 → 텍스트 차이뿐
  - `app.ts`: 우리 판매 게이트 필터 + 저쪽 고객 문구 = **양쪽 장점 결합**
  - 정책 페이지 5건: **우리 쪽 채택** (우리 nav가 `/about`·`/faq`를 가리키고 두 페이지는
    우리 브랜치에만 존재. 저쪽 채택 시 살아 있는 링크가 사라짐)
  - 결혼택일 11건: **THEIRS 기준 + 우리 `birthTimeKnown` 정확성 가드 이식**
    (THEIRS는 RAG 정제·카피 가독성·공용 verified reader 연결이 앞서고,
     OURS만 출생시간 미상 오판 방지 가드를 가진다 — 어느 쪽도 상위집합이 아니다)
  - `cat-service.ts`는 충돌 없음 → 저쪽 버전 유입으로 **U23 해소 예상**
  - `check-*.mjs` 11개 저쪽 갱신으로 **U25 해소 예상**
- **[별건 발견 / 즉시 조치 권고]** `GET /api/payment/config`(무인증)가 `setupMessage`로
  **내부 환경변수 이름을 고객에게 노출**한다:
  `"… 남은 설정: 이니시스 MID·SignKey (INICIS_MID, INICIS_SIGNKEY)."`
  `origin/main`의 `aca0bf3`이 이미 `PAYMENT_UNAVAILABLE_NOTICE`로 교체해 해소했다.
  비밀값이 아니라 변수 이름이므로 즉시 악용 가능한 취약점은 아니나 노출 이유가 없다.
  병합의 부수 효과로 해소된다
- abort 사유: 브랜드 표기(`UMSH 운명상회` vs `운명상회`)가 양쪽 브랜치의 **반대 결정**이고
  정책 페이지 5건의 해소 방향을 바꾼다. 병합 중 상태로 결정을 기다리는 것은 위험

## 2026-09-10 — task-009 `origin/main` 병합 완료 (DONE)

- 사용자 승인: 선택지 (C) — 브랜드 표기 현행 유지, 브랜드 통일은 TASK-011로 분리
- **병합 커밋 `659ba7f`** (부모 `dac3835` + `fb686b6`). **푸시하지 않았다.** 복구 지점 `backup/pre-merge-20260910`
- 실제 통합 커밋 수는 **21건**이었다. T04의 `check:production-source`가 `git fetch`를 수행해
  `origin/main`이 `f010f55` → `fb686b6`로 갱신되어 있었고, 여기에 **Android 하이브리드 앱 셸**이 포함됐다

### 검증 (병합 전 → 후)
| 검증 | 전 | 후 |
| --- | --- | --- |
| typecheck | 오류 0 | **오류 0** |
| `npm test` | 373/373 | **415/415** (+42) |
| `check:*` 15개 | 4 PASS / 11 FAIL | **15 PASS / 0 FAIL** |
| `qa:all-services` | PASS | **PASS** |

### 해소
- **U13** 21커밋 통합 / **U15** 결혼택일 우리 구현 정본 판정 / **U23** cat 자기 코퍼스 검색 확보 /
  **U25** stale guard 11개 전부 PASS

### 충돌 24건 해소 요지
- 정책 페이지 4건: **우리 쪽** (우리 nav가 `/about`·`/faq`를 가리키고 두 페이지는 우리 브랜치에만 존재)
- portal: 카드 링크·aria는 저쪽(가드 요구), **집 풍수 카드·풍수 칩은 우리 쪽** (`dc42c81` 재개 상태)
- **결혼택일 전부 우리 쪽 정본.** 저쪽은 절대위치 오버레이 레이아웃 + 2단락 본문(15/21)이라
  우리 readability QA(로컬 폰트·텍스트/이미지 분리·3단락 이상)를 통과하지 못한다.
  저쪽 프롬프트의 '손 없는 날·삼재 구분'과 확장된 금지 규칙은 채택
- `app.ts` 결제 설정: **판매 게이트(우리) 유지 + 고객 문구(저쪽) 교체**
- `app.ts` 라우트·상수, 테스트 2건: **합집합**
- `registry.json`: packs 28개 id 동일 → 텍스트 차이만 해소

### 병합 부작용 정리
- `services-manifest.json`·`KNOWN_SERVICE_KEYS`의 `wedding_day` **중복 제거** (add/add 산물)
- `SERVICE_TERM_GUIDANCE`의 `wedding_day` 중복 키 제거
- `service-directory.ts` `home_pungsu` hidden 해제

### 예상 못한 유입 (후속 Task 필요)
- **Android 하이브리드 앱 셸** (`android/`, Capacitor) + Google Play 결제 → TASK-014
- `/api/payment/google/verify` 구글플레이 영수증 검증 → **T15 금융 이벤트에 두 번째 결제 경로**
- `/.well-known/assetlinks.json` Android App Links
- 결제 문구 환경변수 노출 해소 → TASK-012 DONE (단 **배포 전까지 운영 노출은 계속**)

### 남은 상태
- `.env.example`(staged), `README.md`(unstaged)에 TASK-003 편집이 남아 있다. stash pop 충돌은
  양쪽 항목을 모두 살려 해소했다 (내 Sensitive 경고 + 저쪽 Google Play 변수)
- 배포는 하지 않았다 → TASK-015

## 2026-09-10 — task-009 Codex 리뷰 반영 (Critical 1건 수정)

- 리뷰: `CreamAI/logs/review/task-009_merge-resolution-review.md` — **Critical 1 / Major 4 / Minor 2**
- **[Critical] `/api/day/wedding/analyze`가 병합으로 두 번 등록되어 있었다.**
  앞쪽 핸들러가 항상 응답하고 `next()`를 부르지 않아 뒤쪽이 도달 불가였고,
  그 결과 `input.birthTimeKnown` 배선과 `buildWeddingTeaser` 조립이 **런타임에서 죽어 있었다.**
  즉 병합에서 지키려 했던 출생시각 미상 가드가 실제로는 동작하지 않았다
  → 커밋 `67b4d7b`로 핸들러 하나로 합쳐 수정
- [Major] `partnerBirthTimeKnown` 정규식이 두 자리 시각만 인정해 `9:30`을 미상으로 처리했다
  → `parseTime`이 `known`을 함께 반환하게 하고 확인 여부의 단일 출처로 삼았다
- 회귀 테스트 2건 추가. **배선을 임시로 제거해 테스트가 실제로 실패하는 것을 확인**했다
- [Major, 미수정 — 게이트로 등록] Play 토큰 재사용 차단 부재(check-then-write, `tid` unique 없음),
  U22 불확정 상태 부재가 Play 경로에도 적용, `assetlinks.json` 서명 지문 placeholder,
  Android 빌드·기기 검증 미수행 → `plan.md`의 **출시 게이트 G6~G9** 신설
- 재검증: typecheck 0 / `npm test` **417/417** / `check:*` 15개 전부 PASS / `qa:all-services` PASS
- Codex 독립 확인: 병합 커밋 부모 2개, `backup/pre-merge-20260910` = `dac3835`,
  원격 어느 브랜치도 병합을 포함하지 않음, 스키마 변경·DB 쿼리 없음,
  `.env.example` 비밀값 없음, 매니페스트 20개 유니크·BOM 없음, `wedding_day.md` BOM 유지

### 배포 게이트 현재 상태
`check:production-source` 차단 요인이 **2건 → 1건**으로 줄었다.
- ~~HEAD가 `origin/main`을 포함하지 않음~~ → **해소** (병합)
- 작업 트리 비청결 → **TASK-008(커밋 전략)** 이 유일한 남은 차단 요인

## 2026-09-10 — task-008 미커밋 산출물 정리 (DONE) — 배포 게이트 녹색

- 사용자 승인: "이 분류로 커밋"
- 커밋 `f9bcd17`, **219파일**. **push 미수행** (`ahead 24`)
- 커밋 전 안전 검사: 후보 261파일에서 JWT / `sb_secret_`·`sk-` / 비밀번호 포함 Postgres
  접속문자열 / `Bearer 토큰` / 이메일 / 전화번호 **전부 0건**.
  패턴은 양성 대조(`src/auth/admin.ts`, `.env.example`에서 이메일 검출)로 유효성 확인
- gitignore 추가 (커밋 안 함): `CLAUDE.local.md`(파일이 커밋 금지 명시),
  `output/`(39, QA 산출물), `CreamAI/logs/**/_prompt_*.txt`(8, ProjectOps §8.4 원문 프롬프트 미저장).
  `*.codex-stdout.log` 6건은 기존 `*.log` 규칙으로 이미 무시
- **배포 게이트가 처음으로 PASS로 바뀌었다:**
  `[production-source] PASS: clean source includes the current remote main.`
  차단 요인 2건(T04) → 1건(TASK-009 병합 후) → **0건**
- 작업 트리 dirty **0건**. 커밋 후 재검증: MANIFEST SHA-256 ALL OK(21), typecheck 0 오류

### 현재 커밋 스택 (전부 미푸시, ahead 24)
```
f9bcd17  chore(projectops): AIOps 워크스페이스·admin-ops 산출물 커밋
67b4d7b  fix(wedding): 병합이 남긴 중복 analyze 라우트 수정
659ba7f  merge: origin/main 21커밋 통합
```
복구 지점 `backup/pre-merge-20260910` = `dac3835`

## 2026-09-10 — TASK-015 운영 배포 (DONE) — SEO·FAQ·about 복구

### 배포 전 발견: 세션 중에 운영이 바뀌어 있었다
- 15:11 KST에 `origin/main` 계열이 Production에 배포되어(`dpl_GvzMisxCbojK93hZVYJ8f5W6LiMq`)
  `umsh.kr` 별칭을 가지고 있었다. **나는 그 배포를 실행하지 않았다.**
- 그 배포로 **우리 브랜치 10커밋의 공개 SEO·FAQ·about 작업이 서비스되지 않게 됐다**:
  `/robots.txt` `/sitemap.xml` `/about` `/faq` 전부 **404**, `/api/services` **15종 → 14종**
  (집 풍수가 목록에서 사라짐)
- 반대로 그 배포는 **결제 문구의 환경변수 노출을 해소**하고 Android App Links를 가져왔다
- ~~**U14 확정**: `vercel project inspect`에 Git 연동 섹션이 아예 없다. 배포는 CLI 전용이며
  `README.md`의 "main push가 Production을 트리거한다"는 사실이 아니다~~
  → **이 판단은 틀렸다(16:25 정정).** 연동은 있었고 `README.md` 서술은 사실이었다.
  실제 원인은 CLI 배포가 연동 배포를 우회한 것이다
- 기록: `docs/admin-ops/production-state-20260910-1511.md`

### 사용자 결정
"기존에 제작한 SEO 그건 복구해야해" + **병합본을 지금 배포**

### 배포 전 처리
- 게이트가 다시 BLOCKED로 바뀜 → 원인 2개 해소:
  (1) 문서 커밋 `569aef3`, (2) **`origin/main`이 또 갱신됨**(`fb686b6` → `f825d26`,
  Android Play 스토어 문서 4파일) → 병합 `006defe`
- 재검증: typecheck 0 오류, 로컬 서비스 15종, `check:production-source` **PASS**

### 배포
- `vercel deploy --prod` → `https://chungi-387wmilw8-ax-lab-cream.vercel.app`
- 빌드 로그: `Generated 126 FAQs in 11 categories`,
  `PASS SEO: robots, 19 sitemap URLs, consistent Organization/WebSite, 126 FAQ answers`
- **Aliased: https://umsh.kr**

### 복구 검증 (배포 전 → 후)
| 항목 | 전 | 후 |
| --- | --- | --- |
| `/robots.txt` | 404 | **200** |
| `/sitemap.xml` | 404 | **200** |
| `/about` | 404 | **200** |
| `/faq` | 404 | **200** |
| `/api/services` | 14종 (집 풍수 없음) | **15종 (집 풍수 포함)** |

### 15:11 배포의 개선도 유지됨
| 항목 | 현재 |
| --- | --- |
| `setupMessage` | `"지금은 결제를 열 수 없습니다…"` — 환경변수 미노출 유지 |
| `assetlinks.json` | HTTP 200 |
| 결제 catalog / storage | 19종 / supabase |

### 운영 통합 점검
8 PASS / 2 FAIL. 실패 2건은 **기존 항목**이며 이번 배포와 무관하다
(`INICIS_MID`·`INICIS_SIGNKEY` 미설정 → checkout 비활성. TASK-007 범위, U22 선행 필요).
`/api/health` ok:true, openai:true, corpus 28팩 / registry 1.9.0.

### 미수행
- **`git push` 차단됨** (권한). 커밋 스택이 로컬에만 있어 이번 사고의 근본 원인(원격 미보존)이
  아직 남아 있다. 사용자 조치 필요

## 2026-09-10 — task-018 배포 경로 정상화 (제안 완료, 적용 승인 대기)

- ~~**U14 해소.** Git 연동 부재를 도구 출력으로 확정: `vercel project inspect`에 Git 섹션
  부재, `vercel git ls`에 조회 서브커맨드 없음, Production 배포 3건 모두 git 메타데이터 없음
  → 배포는 CLI 전용. `git push`는 배포를 트리거하지 않는다~~
  → **이 결론은 틀렸다.** 아래 "2026-09-10 16:25 — task-018 완료 및 U14 정정" 절 참조
- `README.md` 배포 섹션 정정: 거짓 서술 제거, 실제 절차, 게이트 선행 이유,
  브랜치 기준(로컬 `main`을 쓰지 말 것) 명시
- 제안서: `docs/admin-ops/TASK-018-deploy-path.md`

### 전환 순서 — 바꾸면 사고 재발
`origin/main`은 우리 HEAD의 **조상**이다 (0 behind / 16 ahead, fast-forward 가능).
그러나 **`origin/main`에는 아직 우리 16커밋이 없다.**
연동을 먼저 켜고 누군가 `main`에 push하면 **불완전한 main이 자동 배포**되어
15:11 회귀가 재발한다.

```
1) git push origin fix/umsh-qa-ux      # 브랜치 보존
2) git push origin HEAD:main           # main fast-forward (강제 불필요)
3) 0 behind / 0 ahead 확인
4) vercel git connect …                # 그 다음에 연동
5) main 에 커밋 push 해 자동배포·git 메타데이터 확인
```
되돌리기: `git push origin f825d269:main --force-with-lease`

### 로컬 `main` 판정
`5269272`(09-02), `origin/main` 대비 150 behind / 28 ahead. 낡은 라인이다.
28커밋의 기능은 모두 현재 코드에 있고, `data/pungsu/**`·`src/pungsu/home-service.ts`(607줄)는
외부 풍수 API(`PUNGSU_DATASET_API_BASE`) 연동으로 대체되어 현재 코드에서 참조되지 않는다
(현재는 `src/pungsu/dataset-client.ts` 하나). 보관하되 배포 기준으로 쓰지 않는다.

### 중복 배포 주의 (TASK-005 범위 제약)
연동 후 GitHub Actions에 `vercel deploy`를 넣으면 push 한 번에 배포가 2회 돈다
(T02 리서치 F9). Actions는 **CI 전용**(typecheck + test + `check:*`)으로 제한한다.

### 승인 필요
1. `git push origin HEAD:main` — 현재 세션에서 push 권한이 차단되어 사용자 직접 실행
2. `vercel git connect` — Vercel 설정 변경
3. Production Branch를 `main`으로 둘지 확정
**1 → 2 순서 필수**


## 2026-09-10 16:25 — task-018 완료 및 U14 정정

### U14 판단이 틀렸다 — 16:25 시점에 Git 연동이 존재한다

`vercel git connect` 실행 결과:
```
> axlab-cream/chungi-t is already connected to your project.
```
그리고 `git push origin fix/umsh-qa-ux`와 `git push origin HEAD:main` 직후
Preview·Production 배포가 각각 자동으로 시작됐다.

**내가 왜 틀렸나.** 근거로 삼은 두 관측이 모두 연동 여부를 판정할 수 없는 신호였다.

| 관측 | 내 결론 | 실제 |
| --- | --- | --- |
| `vercel project inspect`에 Git 섹션 없음 | 연동 없음 | CLI 출력이 Git 섹션을 표시하지 않을 뿐 |
| Production 배포 3건에 git 메타데이터 없음 | CLI 배포뿐 → 연동 없음 | 메타데이터 부재는 CLI 배포와 **양립**하지만 배포 경로를 식별하지 못한다 |

관측은 맞았고 **해석이 틀렸다.** Codex가 T02 리뷰에서 "메타데이터 부재는 CLI 배포의
증거가 아니다"라고 지적해 한 번 가설로 낮췄는데, 이번에 다시 단정으로 올렸다. **같은 실수 반복.**

**그리고 정정 초안에서 같은 실수를 반대 방향으로 또 했다** (Codex task-018 리뷰 Major 1).
"Git 연동은 처음부터 있었다"·"그 3건은 실제로 CLI 배포였다"고 적었는데, 증거는
**관측 시점의** 연결 상태와 라우팅만 증명한다. 이전 배포 당시의 상태는 확정할 수 없다.
→ 전 문서에서 "16:25 시점에 연동이 존재한다"로 하향했다.

### 그래서 오늘 사고의 진짜 원인
연동 부재가 아니라 **CLI 배포가 연동 배포를 우회한다는 것**이다.
`vercel deploy --prod`는 Git 상태와 무관하게 로컬 작업 트리를 올리므로,
연동이 있어도 `main`에 없는 소스가 운영이 된다.
**규칙: `--prod` CLI 배포를 기본 경로로 쓰지 않는다. `main` push로만 배포한다.**

### 수행 결과 (D1~D6 전부 완료)
| 단계 | 결과 |
| --- | --- |
| D1 `git push origin fix/umsh-qa-ux` | `dac3835..0556e49` (exit 0) |
| D2 `git push origin HEAD:main` | `f825d26..0556e49` fast-forward (exit 0) |
| D3 분기 확인 | `origin/main...HEAD` = `0  0`, `merge-base --is-ancestor` 성공 |
| D4 `vercel git connect` | **이미 연결됨** — U14 정정의 근거 |
| D5 라우팅 관측 | 관측한 `main` push→**Production**, 브랜치 push→**Preview**. **2회 재현**(16:19, 16:39). 단 **Production Branch 설정값 자체는 대시보드/API로 확인하지 않았다** |
| D6 연동 배포 검증 | `dpl_42CkhxK2KC4CAKbPEwMQVQDAVXs1` Ready(46s), alias `chungi-t-git-main-ax-lab-cream.vercel.app`, `umsh.kr` 이동. **관측 1건이므로 alias 형식을 배포 경로의 단독 판정자로 쓰지 않는다** |

### 운영 회귀 복구 확인 (배포 후 실측)
| 검증 | 결과 |
| --- | --- |
| `/robots.txt` `/sitemap.xml` `/about` `/faq` `/my` | **전부 200** (404에서 복구) |
| `/.well-known/assetlinks.json` | **200** (origin/main 개선 유지) |
| `GET /api/services` | **15종, `home_pungsu` 포함** (14종에서 복구) |
| `GET /api/payment/config` | 환경변수 이름 노출 **0건**, catalog 19종, 문구 정상 |
| `/privacy` 마커 | `UMSH 운명상회` / `v=20260909-logo` |

→ **회귀 복구와 개선 유지를 동시에 달성.** 사용자 지시("기존에 제작한 SEO는 복구해야 한다") 이행 완료.

### 문서 정정 범위
`README.md`(배포 경로 2개 명시), `docs/admin-ops/TASK-018-deploy-path.md`(§0 신설),
`production-source-of-truth.md`, `production-state-20260910-1511.md`(§7 복구 결과 추가),
`T04-regression-baseline.md`, `plan.md`, `tests.md`(V-069 무효화, V-072~V-075 추가)

### 다른 저장소의 push
사용자 확인: 다른 곳에서 push되던 것은 **네이티브앱 폴더(별도 저장소)**이며 이 저장소와 무관하다.
→ 이 저장소의 `main`은 우리 브랜치와 동일하므로 제3자 push로 인한 회귀 위험은 현재 없다.

### 남은 제약
- GitHub Actions에 `vercel deploy`를 넣지 않는다 (push 1회에 배포 2회 — TASK-005 범위 제약)
- `check:production-source`는 유지한다. 연동이 있어도 **push 전 게이트**로 필요하다
- **CLI 배포 금지에는 자동 강제 수단이 없다.** 게이트 스크립트가 스스로
  "Manual preflight only … does not intercept other deploys"라고 밝힌다
  (`scripts/check-production-source.mjs:5`). 이것은 기술적 통제가 아니라 **운영 절차 규칙**이다
- 15:11 배포에서 preflight 실행 여부는 **기록으로 확인되지 않았다.** "게이트를 건너뛴
  결과"라고 단정하지 않는다
## 2026-09-10 17:05 — task-013 결혼택일 RAG 렌더링·문맥 이식 (완료)

### 고친 것 두 개
1. **RAG 검색 결과가 본문에 도달하지 않았다.** `sectionBody`가 배정된 청크를
   `_chunk`(미사용 매개변수)로 받았다. **검색 비용은 쓰고 결과는 버렸다.**
   → 각 대분류 마지막 문단에 `[참고 기준]`으로 근거를 싣는다.
2. **계산한 사실이 LLM 문맥에 없었다.** `buildWeddingContext`가 고정 문구뿐이라
   후보일 판정·요일·조건 수·절기 달·상대 명식이 전달되지 않았다.
   → 전부 문맥에 싣고, 병합 때 삭제됐던 테스트 3건을 복구했다.

### 부수 발견 — 배선을 살리자 숨은 품질 문제가 드러났다
같은 청크가 3개 대분류에 배정되어 **같은 근거 문단이 반복**됐다.
검색을 상위 2건 받아 `[0]`만 썼기 때문이다. 상위 4건 중 **미사용 청크를 먼저 고르도록**
바꾸자 6개 대분류가 서로 다른 근거를 받고, 각 근거가 그 주제에 맞아떨어졌다.

### 내가 만든 개인정보 노출을 Codex가 잡았다 (Critical 2건)
반대편 구현을 그대로 이식하면서 `context.partner.birth`에 **상대의 연·월·일·시·분·
성별·달력**을 실었다. 이 문맥은 리포트 payload 로 파일/DB/Supabase 에 저장되고
분석·조회 응답으로도 나간다. → **문맥에서 원본을 제거**했다(계산 결과만 남김).
sanitize 로 막는 대신 **애초에 담지 않는 쪽**을 골랐다.
회귀 테스트로 직렬화 문자열에 상대 생년월일시 흔적이 없음을 확인한다.

**이식은 복사가 아니다.** 같은 코드가 다른 저장·전송 경로에 놓이면 개인정보 등급이 달라진다.

### 리뷰 지적 하나는 근거를 갖춰 반박했다 (Major 1)
`partner.pillars`의 한자에 독음을 붙이라는 지적. 반영하지 않았다.
- 검수기(`interpretation-validation.ts:47`)의 한자 검사 대상은 **생성된 본문**이고 문맥이 아니다
- `partner.pillars`를 한자 그대로 두는 것은 6개 서비스 공통 규약이다
→ 위험은 인정하되 **U27**(전역 사안)으로 올렸다.

### 검증
| 항목 | 결과 |
| --- | --- |
| `npm test` | **430 pass / 0 fail** (417 → 430) |
| `npm run typecheck` | 0 오류 |
| 음성 대조 | 배선 제거 시 해당 테스트만 실패 → 복원 확인 |
| 코퍼스 전수 실측 | 363청크, 출력 최대 170자, 한도 초과 0건, `。` 0건 |
| `check:wedding` `check:newyear` `check:polish` `check:service-contracts` `check:prompt-guide` | PASS |
| `qa:all-services` | 20/20 |
| `check:integrations` | Inicis MID/SignKey 미설정 2건 FAIL — TASK-007/U22 소관, 이번 변경 무관 |

### 코퍼스가 내 규칙을 반증했다
처음 쓴 전수 불변식("모든 근거는 문장 끝에서 끝난다")이 `mr-001`에서 실패했다.
그 청크는 **원문 자체에 마침표가 없다** — 절단 문제가 아니다.
→ 단정을 "실제로 잘린 경우"로 좁혔다. **개별 케이스 테스트만 썼다면 이 사실을 못 보고
잘못된 규칙을 굳혔을 것이다.**

### 신규 미해결
- **U26**: `love_this_year`·`love_again` 등은 여전히 `context.partner.birth`에 상대
  생년월일시를 담아 저장·반환한다(`src/server/app.ts:873-877`,
  `src/report/report-generator.ts:2059`). 결혼택일만 고쳤다. 전 서비스 정리는 별건이다
- **U27**: `partner.pillars`를 한자 그대로 문맥에 넣는 규약 (6개 서비스 공통)
### 검증 도구 자신의 결함 — ProjectOps 테스트 하네스가 테스트를 돌리지 않았다
`run-projectops-harness.ps1`의 `$ProjectRoot`는 `CreamAI/`다. 그런데 `Get-PackageScripts`가
`$ProjectRoot/package.json`을 찾아서 **항상 없다고 판정**하고
`WARN: package.json has no test script`만 남긴 뒤 `failed: false`로 기록했다.
→ **`npm test`가 한 번도 실행되지 않았다.** 과거 `task-002_test.json`도 같은 상태다.

수정: `$RepoRoot`를 분리(`package.json`이 `$ProjectRoot`에 없으면 상위 폴더)하고
`Invoke-TrackedCommand`에 `-WorkingDirectory`를 추가해 npm 명령을 저장소 루트에서 돌린다.
재실행 결과: `PASS npm test exit_code=0`, tail 에 `fail 0` 기록됨.

**교훈: 하네스의 `failed: false`는 "검사가 통과했다"가 아니라 "검사가 실패를 보고하지
않았다"는 뜻일 수 있다. WARN 을 통과로 읽지 않는다.**
## 2026-09-10 17:55 — task-019 상대 개인정보 전 서비스 정리 (U26 해소)

### 무엇이 문제였나
리포트 문맥의 `context.partner.birth` 에 **상대의 생년월일시·성별**이 들어 있었다.
상대는 이 서비스의 사용자가 아니다 — 동의 절차도 삭제 요청 창구도 없다.
그 데이터가 저장소, API 응답, 그리고 **외부 모델 프롬프트**로 흘렀다. 6개 서비스 공통.

### 데이터가 나가는 경계를 세서 처리했다
| 경계 | 지점 수 | 처리 |
| --- | --- | --- |
| 쓰기(저장) | 6 | 5개 서비스 partner 블록에서 `birth` 제거 + `enrichReportContext` 계산 후 버림 |
| 응답 | 7 | `publicReportContext` 통과 |
| LLM 프롬프트 | 2 | `sectionPrompt` 의 `context` **와 `featureJson`** |
| 파생 저장 | 1 | 저장된 상담이 부모 문맥을 복사·저장·전송하던 경로 |

### Codex 가 잡은 것 — 내가 놓친 경계 2개
1. **`featureJson.userContext`**: `sectionPrompt` 의 `context` 만 가렸는데,
   같은 프롬프트의 `featureJson` 이 문맥을 통째로 싣는다(`analyzer.ts:488`).
   과거 레코드에서 섹션을 재생성하면 원본이 외부 모델로 나갔다.
   → 처음엔 호출자에서 막았는데 **테스트가 함수를 직접 호출하자 여전히 실패**했다.
   함수 자신이 걷어내도록 고쳤다. **호출자만 고치면 다음 호출자가 다시 샌다.**
2. **저장된 상담**: `saved-chat.ts:141` 이 부모 문맥을 복사해 시스템 메시지로 직렬화하고
   **새 레코드로 저장**했다. `/api/chat` 이 `parentReportId` 를 받으므로 과거 원본이 다시 퍼졌다.

### 사용자 결정
1. `love_this_year` 도 저장·응답에서 제거 (개인정보 우선) — 저장된 해석 재열람 시 상대
   입력 폼이 비는 것을 감수
2. 과거 레코드는 **삭제하지 않고 응답에서만 가림**

### 검증
| 항목 | 결과 |
| --- | --- |
| `npm test` | **446 pass / 0 fail** (430 → 446) |
| typecheck | 0 오류 |
| 음성 대조 3건 | 궁합 서비스 / `/api/report/:id` / 저장된 상담 — 각각 되돌려 해당 테스트만 실패 확인 후 복원 |
| `check:*` | 15/15 PASS |
| `qa:all-services` | 20/20 |

### dead path 판정
`parseOptionalPartnerContext` 는 `/api/saju/analyze` 에서만 도달하고, 그 라우트가
`love_this_year` 를 즉시 400 으로 막는다(`app.ts:2511-2513`).
→ **상대 정보 유입구는 현재 도달 불가**이며 과거 레코드에만 원본이 남아 있다. Codex 동의.
라이브 경로는 `사주/js/thisyear-service.js` → `/api/love/this-year/analyze` 이고
그 서비스는 partner 블록을 만들지 않는다.

### 신규 미해결
- **U28**: cmdg 의 레거시 love_this_year 분기. 정리된 레코드를 복원하면 `partnerMode='known'`
  인데 상대 칸이 공란이라 수정 없이 제출하면 검증 오류가 난다(런타임 오류 없음).
  그 제출 경로 자체가 이미 400 이라 프런트엔드를 바꾸지 않았다
- **과거 레코드 소급 정리**: 저장소에는 원본이 그대로 있다. 하려면 영향 레코드 수 집계가 선행
## 2026-09-10 18:40 — task-011 브랜드 통일 + 정적 노출 차단

### 브랜드 정본은 코드가 이미 답하고 있었다
`og:site_name`·schema.org `Organization.name`·`WebSite.name`·`<title>` 19개가 모두
`운명상회` 였고, `UMSH 운명상회` 는 정책 페이지 4개에만 있었다.
→ 그 4개를 `운명상회` 로 통일하고, 도메인 토큰은 `Organization.alternateName: "UMSH"` 로 남겼다.
`UMSH*` 561건 중 대부분은 코드 식별자여서 대상이 아니다.

### 그 작업 중에 발견한 것 — 운영에서 내부 산출물이 공개되고 있었다
| 노출 | 개수 | 조치 전 |
| --- | --- | --- |
| `PROMPT.md` (서비스 생성 프롬프트 **원문**) | 15 | **200** |
| `*.py` (스크래핑·검증 스크립트) | 7 | **200** |
| `*-RESULT.json` (생성 결과) | 18 | **200** |
| `extracted_decoded.html` (외부 사이트 스크래핑 121KB) | 1 | **200** |
| 앱 페이지 중복 URL (`/사주/index.html`) | 1 | **200** |

`express.static` 이 정적 트리를 통째로 내보내고 있었다. 정적 마운트 앞에 가드를 두어
비웹 확장자와 중첩 폴더의 두 번째 URL 공간(`/사주/...`)을 막았다.
**저장소 파일은 지우지 않았다** — 서비스 폴더 규약의 일부이고 로컬 스크립트가 읽는다.

### 테스트가 내 가드의 구멍 둘을 찾았다
1. `PROMPT%2Emd` — `req.path` 는 디코딩되지 않는데 `express.static` 은 디코딩한 경로로 찾는다
2. `PROMPT.md/` — **원문 4017바이트를 그대로 반환했다.** `send` 가 끝의 슬래시·점을 무시한다
→ 원본·디코딩본·끝문자 제거본을 모두 검사(`staticPathCandidates`).
**"차단됐다"를 코드 리뷰로 판단하지 않고 요청을 보내서 판단했다.**

### Codex Critical — 확장자 목록이 `.html` 산출물을 놓쳤다
스크래핑 결과가 `.html` 이라 목록을 지나갔다. → URL 공간 자체를 닫았다.
Major(allow-list 구조 전환)는 **U31** 로 승격 — 정적 구조 재편이라 이 Task 범위를 넘는다.

### 내가 만든 사고 둘 (같은 원인: 문자열 조립)
1. 파이썬 슬라이싱으로 `about.html`·`portal.html` **527줄을 지웠다.**
   `git diff --stat` 으로 즉시 발견 → `git checkout` 복원 → 정확한 치환으로 재작업(diff +2/-1)
2. 정규식 편집 중 **백스페이스 제어문자(0x08)** 가 박혀 `<script` 가 죽은 패턴이 됐다.
   눈으로는 안 보였고 `cat -A` 로 확인. 변경 파일 전수에서 0x08 재검사(0건)
→ **유일 매칭 문자열 치환만 쓰고, 편집 직후 `git diff --stat` 으로 줄 수를 본다.**

### 검증
| 항목 | 결과 |
| --- | --- |
| `npm test` | **471 pass / 0 fail** (446 → 471) |
| 우회 매트릭스 | 8변형 전부 404 |
| 과잉 차단 방지 | `robots.txt`·`sitemap.xml`·`assetlinks.json`·`/privacy`·`/css/policy.css` 200 |
| 음성 대조 | 가드 무력화 시 8건 실패 → 복원 |
| `check:*` / `verify-seo-foundation` / `qa:all-services` | 15/15 · PASS · 20/20 |

### 신규 미해결
- **U31**: 정적 제공을 allow-list(공개 전용 디렉터리)로 전환. 확장자 deny-list 는
  새 산출물 형식에 진다. 파일을 배포 산출물에서 제외하는 것도 함께 판단
### [2단계] Express 가드만으로는 부족했다 — Vercel 정적 레이어가 우회했다

가드를 배포한 뒤 운영을 재확인하니 **저장소 경로와 겹치는 URL 이 여전히 200**이었다.

| 경로 | 가드 배포 후 |
| --- | --- |
| `/사주/me/pass-angle/01-step-1-story/PROMPT.md` | **200** (프롬프트 원문) |
| `/사주/사주/extract_mhtml.py` | **200** |
| `/사주/사주/extracted_decoded.html` | **200** |
| `/data/runtime-config.json` | **200** (런타임 설정) |
| `/prompts/README.md` | **200** |

원인: `vercel.json` 의 `rewrites` 는 **파일시스템을 먼저 확인**한다. 저장소 경로와 겹치는
URL 은 함수를 거치지 않고 배포 산출물에서 그대로 나갔다. Express 가드는 볼 기회가 없었다.

조치: 레거시 `routes` 로 바꿨다. `handle: filesystem` 단계를 두지 않으면 파일시스템보다
먼저 적용되므로 **모든 요청이 함수로 간다.** 실질 변화는 작다 — 예쁜 URL 은 이미 함수를
거치고 있었고, 저장소 경로와 겹치는 URL 만 정적으로 나가고 있었다.

`vercel.json` 형태를 테스트로 고정했다 — 캐치올 route 존재, `rewrites` 부재
(되돌리면 구멍이 다시 열린다), `routes` 와 공존 불가한 키 부재, `includeFiles` 유지.

### 배포 후 운영 실측 (2026-09-10 19:0x)
| 검사 | 결과 |
| --- | --- |
| 노출 7경로 (프롬프트·스크립트·스크랩·runtime-config·README·중복 URL) | **전부 404** |
| `/` `/faq` `/about` `/privacy` `/robots.txt` `/sitemap.xml` `/.well-known/assetlinks.json` | **200** |
| `/css/policy.css` `/js/faq-knowledge.js` `/assets/umsh-brand-logo.png` `/favicon.ico` | **200** |
| `/day/wedding/01-step-1-story/index.html` | **200** |
| `/privacy` `/terms` 제목 | **· 운명상회** (브랜드 통일 반영) |
| `about` 구조화 데이터 | `"alternateName":"UMSH"` |
| `GET /api/services` / `/api/payment/config` | 15종 / catalog 19 |

**교훈: 가드는 "요청이 그 가드를 지나가는가"부터 확인해야 한다.**
Express 안에서 막았다고 끝이 아니었다. 배포 플랫폼의 라우팅 순서가 먼저다.
## 2026-09-10 19:40 — task-020 정적 제공을 허용 목록으로 (U31 해소)

### 기본값을 뒤집었다
거부 목록은 형식을 세는 방식이라 새 형식에 진다(Codex task-011 Major).
→ **허용 목록**으로 전환. 웹 형식만 통과하고 나머지는 기본 거부.
근거는 트리 실제 분포(webp 446 · html 127 · js 61 · mp4 56 · png 52 · css 21 · woff2 9 ·
ttf 3 · xml 1 · jpg 1 · ico 1). 소스맵은 넣지 않았다. 확장자 없는 파일 0개를 테스트로 고정.

### 살아 있는 유출 둘을 더 찾았다
| 유출 | 찾은 사람 | 내용 |
| --- | --- | --- |
| `GET …/PROMPT.md%5C` → **200** | Codex (응답 검증) | 프롬프트 원문 전체. Windows 는 백슬래시를 경로 구분자로 쓰는데 끝문자 제거가 `/`·`.`·공백만 처리했다 |
| `GET /extracted_decoded.html` → **200** | 내 확인 | 외부 사이트 스크랩 **116KB**. 중첩 폴더가 `/사주/` 말고 **루트에도** 통째로 마운트돼 있었다 |

두 번째는 마운트가 제공하던 것을 파일 단위로 세어 보고 제거했다 — 최상위 웹 확장자
파일은 `index.html`(라우트가 직접 보낸다)과 스크랩 산출물 둘뿐이고 `assets/` 는 이미
경로별로 명시 마운트돼 있었다. **그 마운트는 스크랩 산출물만 추가로 공개하고 있었다.**

### 같은 가드가 여섯 번 뚫렸다
`%2Emd`(내 테스트) → `PROMPT.md/`(내 테스트, 원문 4017B) → Vercel `rewrites` 가 가드 자체를
우회(배포 후 운영 재확인) → `.html` 산출물이 목록 통과(Codex) → `%5C`(Codex 응답 검증) →
중첩 폴더 루트 마운트(내 확인, 116KB).

**교훈: 보안 가드는 한 번에 완성되지 않는다.** 매번 "이제 됐다"고 느꼈고 매번 남아 있었다.
(1) 매트릭스를 테스트로 남긴다 (2) 배포 후 운영에서 다시 확인한다 (3) 음성 대조로 가드가
그 케이스를 실제로 막는지 확인한다 — 하나라도 빼면 다음 구멍을 못 본다.

### 검증
| 항목 | 결과 |
| --- | --- |
| `npm test` | **498 pass / 0 fail** (474 → 498) |
| 음성 대조 3건 | 허용목록→거부목록 6건 · 백슬래시 정규화 제거 6건 · 중첩 마운트 복원 1건 실패 → 복원 |
| 배포 후 운영 | 차단 7종 **404** / 정상 15종 **200** |
| `check:*` / `verify-seo` / `qa:all-services` | PASS · PASS · 20/20 |

### 신규 미해결
- **U32**: 공개 자산 전용 디렉터리로 옮기는 경로 기반 모델. `SAJU_ROOT` 전체 마운트가
  남아 있어, 웹 확장자로 내부 산출물이 새로 생기면 **테스트는 잡지만 런타임은 막지 못한다**
## 2026-09-10 20:10 — task-005 GitHub Actions CI (검사 전용)

### 문제
지난 여러 Task 의 게이트가 **내 로컬에서만** 돌고 있었다 — 정적 노출 매트릭스,
상대 개인정보, RAG 배선, 브랜드·검색 기반, 20개 서비스 QA.
`.github/workflows/` 는 **빈 폴더**였다. 다른 사람 push 는 게이트를 거치지 않는다.

### 구성 (배포 단계 없음)
checkout@v5 → setup-node@v5(`.nvmrc`=24) → `npm ci` → typecheck → test →
검수 15개 → 검색 기반(커밋 상태) → 20개 서비스 QA → **`vercel-build`(배포 빌드 검증)**
→ **`git diff --exit-code`(생성물 최신)**. 권한은 `contents: read` 하나.

제외 2개와 이유를 워크플로에 적었다 — `check:integrations`(실계정 필요),
`check:production-source`(배포 직전 preflight, main 보다 뒤처진 브랜치에서 정상 실패).

### 실측
| 항목 | 결과 |
| --- | --- |
| GitHub 실행 | **4회 모두 success** (1m53s · 2m15s · 2m20s · main), 10단계 녹색 |
| `main` push | CI 1회 + Vercel Production **1회** — 중복 배포 없음 |
| `npm test` | **503 pass / 0 fail** (498 → 503) |
| Node 정합 | `.nvmrc` 24 = Vercel `nodeVersion` **24.x** (드리프트 없음) |
| 음성 대조 5건 | 배포 주입 / 게이트 삭제 / 권한 승격 / job 권한 / `npx vercel@latest --prod` |

### Codex 가 잡은 것
1. **CI 가 Vercel 실제 빌드를 돌리지 않았다.** `vercel-build` 가 FAQ 126건·사이트맵 생성과
   `public/` 복사를 한다 → 복사 원본 누락은 **배포에서만** 깨진다. 게이트로 추가하고
   `git diff --exit-code` 로 생성물 최신성까지 확인
2. **권한 계약이 정책보다 약했다.** `contents: read` 가 **있는지만** 봐서 추가 권한이나
   job 수준 승격을 놓쳤다 → 블록 1개 · 내용 정확히 1줄로 강화
3. 배포 금지가 문자열 목록이라 `npx vercel@latest --prod` 를 놓쳤다 → 정규식으로

**교훈: "CI 가 로컬과 같은 것을 돌리는가"가 아니라 "CI 가 배포와 같은 것을 돌리는가".**
그리고 보안 계약은 "있는지"가 아니라 **"그것만인지"** 를 검사해야 한다.

### 알아 둘 것
- **CI 는 배포를 차단하지 못한다.** Vercel 연동 배포는 CI 와 병렬로 시작한다.
  차단이 필요하면 GitHub 브랜치 보호(required status check) 설정이 필요하다 — 사용자 판단
- `gh` 는 remote 가 여러 개면 `upstream` 을 골라 404 를 낸다. `--repo` 를 명시해야 한다

### 신규 미해결
- **U34**: 액션을 커밋 SHA 로 pin + Dependabot (지금은 공식 액션 mutable 태그)
- 브랜치 보호 규칙 도입 여부 (CI 를 배포 차단 게이트로 쓸지)
## 2026-09-10 20:40 — task-021 자산 엣지 캐시 + T07 관리자 셸

### task-021 — 자산이 매 요청 함수를 거치고 있었다
운영 실측: `Cache-Control: public, max-age=0` · `X-Vercel-Cache: MISS` ·
1.6MB PNG · 341KB webp. `express.static` 기본값으로는 Vercel CDN 이 응답을 보관하지 않는다.

`immutable` 은 쓸 수 없다 — `/css`·`/js` 참조 **789건 중 버전 쿼리가 붙은 것은 164건(21%)**
뿐이라 나머지는 배포 후 낡은 파일을 계속 쓴다.
→ **브라우저는 짧게(300s), 엣지는 길게(1년)**. Vercel 캐시는 배포 단위로 무효화되므로
자산이 바뀌는 유일한 계기에 자동 갱신된다. HTML 은 `max-age=0` 유지.

**배포 후 실측: `X-Vercel-Cache: HIT`.** `s-maxage` 는 클라이언트 응답에서 사라지는데,
Vercel CDN 이 그 지시자를 소비하고 제거하는 정상 동작이며 `HIT` 으로 캐시를 확인했다.

### T07 — 관리자 셸·라우터 (사용자 지시 1번)
ADR-0002 **Accepted (사용자 승인)**. U3 해소. 초안 전제 두 가지를 갱신했다 —
`routes` 캐치올로 모든 요청이 함수를 지난다는 점, 그리고 D1 의 경고가 **실측으로
확인됐다는 점**(TASK-011·020 에서 프롬프트 원문·스크랩이 인증 없이 서비스됐다).

| 항목 | 내용 |
| --- | --- |
| 셸 | `admin-ui/index.html` — 정적 루트 **밖**(D1), 인라인 CSS/JS, 새 CDN 없음 |
| 라우트 | `/admin` + 딥링크. **정적 마운트 위**(D2-2). `noindex` + `no-store` |
| API | `GET /api/admin/v1/me` (`/api` 안이라 no-store + Vary 자동) |
| 디자인 | 의미 기반 토큰 독립 정의(D3), 색 + 텍스트 라벨(D4), `tabular-nums` |

### Codex Critical — 내가 스스로 기록한 규칙을 위반했다
초판은 `/api/admin/v1/me` 에서 **`isAdminOwner` 로 관리자 권한을 부여했다.**
`plan.md` 와 `T01-baseline.md` 에 이미 이렇게 적어 두었다:
> 관리자 권한 판정에 `isAdminEmail`·`isAdminOwner`(레거시 unlock)를 **절대 사용하지 않는다.**

그 목록은 **결제 없이 유료 리포트를 여는 레거시 unlock** 이다. 운영 권한으로 재사용하면
직원 membership 없이 관리자 API 가 열리고 회수·감사 경로가 없는 "코드에 박힌 권한"이 된다.

→ **지금은 누구에게도 권한을 주지 않는다.** 인증된 회원에게도 403
`STAFF_MEMBERSHIP_REQUIRED`. A02 테스트로 고정했다(unlock 이메일 → 403).
T05 가 회수 가능한 membership 원본을 만들면 그때 판정을 교체한다.

**교훈: 내가 문서에 적어 둔 금지 규칙을 구현 단계에서 다시 읽지 않았다.**
Task 착수 시 `plan.md` 의 해당 영역 제약을 먼저 읽는 절차가 필요하다.

### 배포 후 운영 실측
| 경로 | 결과 |
| --- | --- |
| `/admin` `/admin/` `/admin/orders` `/ADMIN` | 200 + noindex + no-store |
| `/admin-ui/index.html` | **404** (정적 경로로 열리지 않는다) |
| `/api/admin/v1/me` 미인증 | **401** `AUTH_REQUIRED` |
| 자산 | `X-Vercel-Cache: HIT` |

### 신규 미해결
- **U36**: 관리자 HTML 진입점을 인증 뒤로 옮기려면 서버 세션 쿠키가 필요하다.
  지금은 데이터 없는 셸을 익명에게도 준다 → 관리자 경로·메뉴 구조가 노출된다
- **(2) 최소 관리자**를 붙이려면 T05 없이 무엇을 권한 근거로 쓸지 먼저 정해야 한다

## 2026-09-11 — 관리자 직원 로그인 + 권한 근거 (사용자 지시)

### 사용자가 본 것: "로그인 ID PW 넣는 곳이 나와야 하잖아"
맞는 지적이었다. 셸에 **입력 지점이 아예 없었다.** `data-admin-state="anonymous"` 패널이
`<a href="/login">` 로 보내는데 **`/login` 라우트는 존재하지 않는다**(app.ts 에 0건).
그리고 이 사이트의 회원 로그인은 `signInWithOAuth` 뿐 — 비밀번호 로그인 경로가 없었다.
즉 관리자는 "권한이 없어서" 못 들어간 게 아니라 **로그인할 방법 자체가 없었다.**

### 한 것
| 항목 | 내용 |
| --- | --- |
| 권한 근거 | `src/auth/staff.ts` 신규. `UMSH_ADMIN_SUPER_EMAILS` 하나만 본다 |
| `/api/admin/v1/me` | 403 고정 해제 → membership 있으면 200 `{email, role, scopes[], environment}` |
| 셸 | 이메일/비밀번호 폼 + 조직 계정(SSO) 경로. 끊어진 `/login` 링크 제거 |
| scope | 조회만 (`orders/members/reports/settings:read`). 감사 기반(T06) 없이 쓰기 안 만든다 |
| 문서 | `docs/API.md` 에 401/403/200 계약과 하위 호환 규칙 명시 |

**Codex Critical 재발 방지**: 권한 근거를 `isAdminEmail`/`isAdminOwner`(레거시 unlock)와
**완전히 분리된 모듈**에 두었다. 테스트가 두 목록의 분리를 코드로 고정한다 —
unlock 목록 계정에 `staffMembership()` 이 `undefined` 인지 직접 확인한다.
권한은 코드에 박히지 않고 배포 설정에서만 오므로 **설정을 비우면 코드 변경 없이 회수**된다.
그 회수 경로도 테스트로 고정했다(설정 삭제 → 403).

### 막힌 것 — 지시한 계정에 비밀번호가 없다
`axlab@crea-m.com` / 지시받은 비밀번호 2종 모두 `invalid_credentials`.
비밀번호가 틀린 게 아니라 **그 계정에 비밀번호 자격증명이 없다.** 근거:

| 확인 | 결과 |
| --- | --- |
| `/auth/v1/token?grant_type=password` × 2회 | 400 `invalid_credentials` |
| `/auth/v1/signup` (같은 이메일) | 200 + **빈 user 객체** = 중복 보호 응답 → **계정은 이미 있다** |
| `/auth/v1/settings` | `mailer_autoconfirm: false`, google·kakao 활성 |

계정이 Google 로그인으로 먼저 만들어져 password identity 가 없는 상태다.
로컬에 service role key 가 없어 관리자 API 로 비밀번호를 설정할 수 없다.
→ 비밀번호 설정은 Supabase 콘솔(사용자 작업)이 필요하다. 그 사이에도 들어올 수 있도록
**조직 계정(Google) 경로를 같은 화면에 붙였다.** 권한 판정은 경로와 무관하게 동일하다.

### 스스로 만든 사고 — 줄바꿈/BOM 전면 변경
Python 패치를 `newline=''` + `utf-8-sig` 로 쓰면서 대상 파일 **전체를 LF 로 바꾸고
BOM 을 새로 붙였다.** `.env.example` diff 가 8줄이어야 하는데 136줄로 부풀었다.
`.env` 계열에 BOM 이 붙으면 첫 키 파싱이 깨질 수 있어 위험하기도 했다.
HEAD 규약(CRLF, 파일별 BOM 유무)으로 되돌려 8줄로 복구했다.

**교훈: 파일을 문자열로 통째로 다시 쓰는 패치는 내용뿐 아니라 바이트 규약을 바꾼다.
쓰기 전에 원본의 줄바꿈·BOM 을 읽어 그대로 복원해야 한다.**

### 남은 것
- **운영 반영 전 필수**: Vercel 에 `UMSH_ADMIN_SUPER_EMAILS` 설정. 없으면 운영은 계속 403
- `axlab@crea-m.com` 비밀번호 설정(Supabase 콘솔) 또는 조직 계정 경로 사용
- SSO `redirectTo` (`/admin`) 가 Supabase redirect 허용목록에 없으면 홈으로 떨어진다
  (세션은 생기므로 `/admin` 재방문 시 로그인 상태) — 허용목록 확인 필요
- **U36 그대로**: 셸 HTML 은 여전히 익명에게 응답한다(서버 세션 쿠키 없음)
- T05 는 이 응답 형태를 유지한 채 판정 근거만 영속 저장소로 교체

## 2026-09-11 — 관리자 OAuth 복구 점검

- Supabase Authentication URL Configuration의 Site URL을 `https://umsh.kr`로 변경하고,
  Redirect URLs에 `https://umsh.kr/**`, `https://www.umsh.kr/**`를 추가했다.
- Production Vercel 프로젝트에 `UMSH_ADMIN_SUPER_EMAILS` 키가 존재하고, 현재
  `umsh.kr` 별칭은 Ready인 Production 배포를 가리키는 것을 확인했다. 값은 로그에
  기록하지 않았다.
- Google 조직 계정으로 새 OAuth 흐름을 재현했으나, Google 동의 뒤 Supabase callback에서
  `Unable to exchange external code`가 다시 발생했다. Redirect URL 문제가 아니라
  Supabase Google provider의 OAuth client secret과 Google Cloud OAuth client 설정의
  불일치 또는 무효화가 남은 차단점이다.
- Google Cloud Console은 선택된 조직 계정의 재인증 비밀번호를 요구했다. 비밀번호·OAuth
  client secret은 수집하거나 기록하지 않았으며, 해당 비밀값을 갱신하기 전에는 관리자
  세션과 화면을 검증할 수 없다.

## 2026-09-11 — Supabase 이메일 관리자 전환

- Supabase의 `axlab@crea-m.com` 사용자가 Email provider 계정임을 확인했다.
- Production `UMSH_ADMIN_SUPER_EMAILS`를 해당 이메일로 설정하고, 기존 운영 배포를
  재배포했다. `umsh.kr` 별칭이 새 Ready 배포를 가리키는 것을 확인했다.
- `/admin`의 이메일 로그인은 정상 노출된다. 다만 Supabase 사용자 상세의 `Confirmed at`이
  비어 있고 기존 비밀번호도 인증에 실패하므로, 사용자 본인이 확인 메일과 비밀번호 복구
  메일을 통해 계정을 활성화해야 한다.

## 2026-09-11 — 관리자 비밀번호 복구 화면

- 원인: Supabase Dashboard에서 보낸 복구 메일은 기본 Site URL(루트)로 돌아오지만,
  루트 화면에는 `type=recovery` 일회성 세션을 처리하는 비밀번호 설정 UI가 없었다.
- `admin-ui/index.html`에 recovery 세션 전용 새 비밀번호·확인 폼을 추가했다. 비밀번호는
  일치·최소 길이를 확인한 뒤 `auth.updateUser`로만 전송하고, 성공·실패 뒤 DOM에서 지운다.
- `사주/portal.html` 루트는 recovery fragment를 보존한 채 `/admin`으로 즉시 넘긴다.
  따라서 Dashboard 기본 링크도 관리자 설정 화면으로 도착한다.
- `npx tsx --test --test-concurrency=1 tests/unit/admin-shell.test.ts --test-name-pattern
  "(셸이 직원 로그인 폼을 갖고 있다|비밀번호 복구 링크는 관리자 설정 화면으로 이어진다)"`
  결과: 18 passed. Production 배포 `dpl_G3r1o2WZgkcGuvkaAV1PqfdaUu14` Ready 및
  `#type=recovery` → `/admin#type=recovery` 이동을 브라우저에서 확인했다.

## 2026-09-11 — 공개 주문 목록

- 사용자 요청에 따라 `/admin/orders` 목록 경로만 무인증으로 열었다. 목록 DTO의 이메일,
  전화번호, 거래 식별자 원문은 기존 마스킹 규칙을 계속 적용하며, 주문 상세와 나머지
  관리자 API는 `requireStaff` 인증을 유지한다.
- `npm run typecheck`와 관리자 셸·주문 테스트(42 passed)를 통과했고, Production 배포
  `dpl_7fUDBo1GiYyHc5sBnwFn43vRWwST`에서 로그인 없이 목록 화면이 열리는 것을 확인했다.

## 2026-09-11 — 관리자 자체 비밀번호 로그인

- `/admin` 로그인 폼을 Supabase `signInWithPassword` 호출에서 자체 관리자 로그인 API로 교체했다.
  운영에서는 `UMSH_LOCAL_ADMIN_EMAIL`, `UMSH_LOCAL_ADMIN_PASSWORD`,
  `UMSH_LOCAL_ADMIN_SESSION_SECRET`의 암호화 환경 변수만으로 인증한다. 비밀번호와 세션
  서명값은 소스·응답·이력에 기록하지 않는다.
- 성공 시 서버가 서명한 `HttpOnly`, `Secure`, `SameSite=Strict` 세션 쿠키를 발급한다.
  이후 `/api/admin/v1/me`와 인증된 관리자 상세 API는 이 쿠키만 검증하며, 자체 로그인이
  켜진 운영에서는 Supabase로 폴백하지 않는다. 로그아웃은 해당 쿠키를 즉시 만료한다.
- 회귀 검증: `npm run typecheck`, 관리자 자체 로그인·셸·주문 테스트 **45 passed**.
  Production 배포 `dpl_8jdgm1MCv96qiwBa45SdESfwVbJ1`(umsh.kr 별칭)에서 실제 계정으로
  로그인해 `super_admin` 권한, 관리자 메뉴, 주문 화면이 열리는 것을 브라우저로 확인했다.

## 2026-09-11 — 관리자 좌측 LNB 및 실행 명세 기준 확정

- 관리자 상단 메뉴를 좌측 LNB로 교체했다. 운영·관리·시스템 업무군에 개요, 주문,
  회원·리포트, 콘텐츠·서비스, 고객 지원, 환불·정산, 통계·로그, 설정 경로를 배치하고
  현재 경로를 강조한다. 768px 이하에서는 가로 스크롤 메뉴로 전환한다.
- 아직 데이터 기능이 없는 경로가 주문 화면을 잘못 재사용하지 않도록 독립 준비 상태로
  분리했다. Production `dpl_9gKrNpU2ZtQ4TH2XeBsEHshrjS2w`에서 `/admin/settings`의
  좌측 LNB와 설정 준비 화면을 브라우저로 확인했다.
- 이후 구현 기준은 `admin-ops-execution-pack/15-TASKS.md`로 확정했다. 현재 로그인·셸·주문의
  선행 구현은 해당 Task의 부분 산출물로 취급하고, 다음은 T06 감사·멱등 기반부터 수용 조건
  순서대로 진행한다.

## 2026-09-11 — 관리자 주문 목록 지연 완화

- 운영 실측에서 공개 주문 목록은 캐시 금지 상태로 첫·반복 요청 모두 약 0.98초였다.
  목록은 마스킹 DTO만 반환하므로 `s-maxage=10`, `stale-while-revalidate=30`의 짧은 edge
  cache를 허용했다. 주문 상세와 나머지 관리자 API의 no-store 정책은 변경하지 않았다.
- Production `dpl_JBgNjVEbaU1Hk6k4cacpWSzfTtTf`에서 첫 요청은 새 인스턴스 초기화로 2.52초였고,
  반복 요청은 0.27초, `X-Vercel-Cache: HIT`, `Age: 5`로 확인됐다. 관리자 함수 자체는
  여전히 295.74MB 단일 함수이므로 콜드 스타트 개선은 별도 구조 작업으로 남긴다.

## 2026-09-11 — T14 영속 작업·outbox 배포 검증

- `ops_jobs`·`ops_outbox` 및 lease 기반 `claim_ops_jobs` RPC는 운영 DB에 반영되어 있으며,
  RLS 활성화와 `anon`/`authenticated` 권한 제거를 유지한다.
- Vercel Production의 `CRON_SECRET`은 안전한 표준 입력으로 교체 등록했다. 값은 저장소·문서·로그에 기록하지 않았다.
- 처리기가 아직 없는 작업을 성공으로 표시하던 결함을 수정했다. 이제 `NO_OPS_HANDLER`로 지수 backoff 재시도 후 최대 시도에서 dead-letter로 이동한다.
- Production에서 `/admin/jobs`가 실제 작업 큐와 연결되어 빈 큐 상태를 표시하는 것을 브라우저로 확인했다.
- 검증: worker 단위 테스트 2/2 PASS, `npm run typecheck` PASS, `npm run vercel-build` PASS. 전체 `npm test`는 기존 대형 테스트 실행으로 단일 30초 실행 창을 넘겨 이 Task에서는 완료 확인하지 못했다.
- LNB 감사: 회원·리포트·서비스·지원·감사 기록은 실제 원천 연결, 미디어를 포함한 나머지 준비 화면은 후속 Task의 실제 테이블/API가 필요하다. 목업 데이터를 추가하지 않는다.
- 남은 검증: Vercel이 첫 예약 cron을 실행한 뒤의 worker 로그·응답 확인.
- KMS 기록: `personal/carrotcap/notes/umsh-ops-worker-20260911.md`.

## 2026-09-11 — T15 금융 이벤트·상태 투영

- 운영 DB에 `financial_events` append-only 원장을 생성했다. 승인 이벤트는 `provider + source_ref` 고유키로 중복을 차단하고, 주문 ID·승인 금액·발생 시각만 저장한다. 원시 PG 응답이나 고객 개인정보는 저장하지 않는다.
- RLS를 활성화했고 `anon`·`authenticated` 권한을 제거했다. 기존 기본 권한에서 `service_role` UPDATE/DELETE가 남는 것을 발견해, 별도 migration으로 INSERT/SELECT만 남겨 append-only 계약을 확인했다.
- 이니시스·Google Play·테스트 승인 경로는 금융 이벤트를 먼저 기록한 후에만 주문을 `paid`로 투영한다. 이니시스에서 증거 기록 뒤 상태 투영이 실패하면 `failed`로 덮지 않아 T19 대사로 회수할 수 있다.
- `viewed`는 금융 이벤트를 추가하지 않는다. 따라서 열람 재시도나 상태 갱신이 매출 이벤트를 중복 생성하지 않는다.
- 검증: 금융·결제 관련 50개 테스트 PASS, `npm run typecheck` PASS, `npm run vercel-build` PASS, 운영 DB RLS/고유키/권한 확인, Production `/admin/orders` LNB·주문 화면 확인.
- KMS 기록: `personal/carrotcap/notes/umsh-financial-events-20260911.md`.

## 2026-09-11 — T16 PG 조회·취소 sandbox adapter

- KG 이니시스의 공식 INIAPI v2 계약을 확인했다. 거래 조회는 sandbox `/v2/pg/inquiry`와 `type=inquiry`, 전액 취소는 `/v2/pg/refund`와 `type=refund`를 사용하며, 두 요청의 서명은 `INIAPIKey + mid + type + timestamp + data`의 SHA-512이다.
- `createInicisSandboxAdapter`는 호출자가 주입한 transport로만 통신하고 전역 `fetch`를 쓰지 않는다. 따라서 production PG 호출·취소, 주문 상태 변경, 금융 이벤트·환불 저장이 이 Task에서 발생하지 않는다.
- timeout은 `INICIS_SANDBOX_TIMEOUT`으로 구분하고, 공식 기취소 코드 `500626`은 재요청하지 않는 terminal duplicate로 반환한다. PG 성공 뒤 저장 실패는 adapter 레이어에서 성공을 실패로 바꾸지 않아 T17/T19의 영속 intent·대사 경계가 유지된다.
- 검증: sandbox 계약 테스트와 기존 결제 테스트 9/9 PASS, `npm run typecheck` PASS, `npm run vercel-build` PASS. 실 TID·INIAPI Key·실거래는 사용하지 않았다.
- 남은 조건: T17에서 INIAPI Key 계약·운영 egress, 환불 intent 영속화, 요청/승인자 분리, 금액 예약, unknown 대사 경로를 구현하기 전에는 live 취소를 연결하지 않는다.
- KMS 기록: `personal/carrotcap/notes/umsh-inicis-sandbox-adapter-20260911.md`.

## 2026-09-11 — T17 환불 요청·독립 승인·예약

- `refund_requests`와 service-role 전용 RPC를 운영 DB에 반영했다. 요청 RPC는 주문 행을 잠그고 활성 요청의 예약액을 합산하므로 동시에 요청해도 원 결제금액을 초과 예약할 수 없다.
- 요청자와 승인자가 같으면 DB에서 거부하며, 승인 전/후 어느 경로도 PG를 호출하지 않는다. 주문 상태, 고객 구매권한, 완료 리포트 본문도 변경하지 않는다.
- 검증: refund·INIAPI 테스트 9/9 PASS, typecheck/build PASS. 운영 DB에서 RLS=true, anon/authenticated SELECT=false, service_role RPC execute=true 확인.

## 2026-09-11 — T18 환불 운영 화면

- `/admin/refunds`를 실제 `refund_requests` 원천에 연결하는 화면·서버 경로를 구현했다. 빈 데이터베이스는 "아직 실제 환불 요청이 없습니다"로만 보이며 예시 행·임의 금액·목업 CTA는 표시하지 않는다.
- 관리자는 실제 주문을 먼저 조회한 뒤 요청 금액·사유·revision으로 환불 intent를 등록할 수 있다. 요청 후에도 PG 환불은 실행되지 않으며 별도 관리자의 승인만 가능하다.
- 승인 검토에는 요청/승인자·금액·사유·시각·PG 상태를 표시한다. `failed`와 `unknown`은 성공으로 표현하지 않고 PG 상태 확인·재조회를 우선하도록 안내한다. 요청자는 자기 요청을 승인할 수 없으며 API도 403으로 거부한다.
- 검증: 환불 store/API/관리자 셸 26개 테스트 PASS, `npm run typecheck` PASS, `npm run vercel-build` PASS. Production 배포(`dpl_3DvQf8yWZrTtHAtcxCsjZi4LxtXB`) 후 브라우저에서 목록 API가 503으로 실패하는 것을 확인했다. 테이블·service_role SELECT·PostgREST schema reload까지 확인했으나 원인은 아직 미확정이므로 T18은 NEEDS_REVIEW다.

## 2026-09-12 — 결제 트랙 보류·T22 착수

- 사용자 지시에 따라 결제·환불(T18~T21) 보완은 보류하고 비결제 운영 작업인 T22 서비스·콘텐츠 버전 저장을 착수했다.
- 현재 고객 서비스의 정본은 `src/server/service-directory.ts`와 `src/payment/catalog.ts`에 있으며, T22는 이 목록을 바꾸거나 예시 콘텐츠를 추가하지 않고 버전 저장·검증·서버 읽기 경계를 먼저 만든다.

## 2026-09-12 — AIOS 공통 소규모 기능 실행 워크플로우

- 사용자 제공 가이드를 `C:/Users/user/.codex/workflows/aios-small-slice-workflow.md`로 상세화하고 전역 및 프로젝트 AGENTS.md에서 참조하도록 등록했다. 경로 범위는 이 PC의 Codex 프로젝트이며 다른 도구/PC의 자동 적용을 의미하지 않는다.
- 요구사항 확인 → PRD → 사용자 결과별 vertical slice → 구현/검증/리뷰 → KMS 기록을 적용한다. 연속 승인된 작업은 형식적인 재승인 없이 순차 진행한다. 실제 데이터 원칙과 결제 보류는 유지한다.
- CreamWIKI 사전 검색에서 직접 적용할 기존 근거는 확보하지 못해 사용자 가이드를 정본으로 사용했다. `personal/carrotcap/notes/aios-small-slice-workflow-20260912.md` 저장, get 재조회, 검색 결과 1건 확인 PASS. 서버 전용 재인덱싱 명령은 로컬에 없어 NOT_RUN이며 검색 성공과 구분한다.
- 문서 작업만 수행했다. 앱 변경/배포/동작 테스트는 해당 없음. T22는 스키마 중간 산출물 상태로 계속 미완료이며 다음 기능 작업에서 서버/API/실제 사용자 흐름 검증을 이어간다.

## 2026-09-12 — T22 Slice 1 실제 서비스·버전 조회

- `/api/admin/v1/services`를 `services:read` 권한 뒤에 추가하고, 현재 운영 코드의 19개 결제 카탈로그(검색 노출 15, 숨김 4)에 `service_config_versions`의 최신 발행/초안 메타데이터를 결합했다.
- `/admin/services`는 공개 목록 API 대신 관리자 API를 사용하며 canonicalKey, 분류, 검색 노출, 판매 상태, 기준 가격, 발행/초안 버전, 고객 경로를 표시한다. 저장소가 불가하면 목록을 0건으로 속이지 않고 코드 정본과 버전 미확인을 구분한다.
- Supabase 기본 권한으로 남을 수 있는 `service_role` DELETE를 후속 migration에서 제거했다. 운영 조회 결과 두 버전 테이블 모두 service_role SELECT/INSERT/UPDATE만 있고 anon/authenticated 권한은 없다.
- 검증: 관련 25개 테스트 PASS, 전체 622개 테스트 PASS, typecheck PASS, vercel-build PASS. Vercel 배포 `dpl_E7vPCwMc7WoVSKfMfUG8SeTz9i4t` Ready 및 운영 승격 완료. 보호 배포에서 LNB와 새 서비스 로더를 확인했다.
- 운영 로그인 E2E는 기존 지정 관리자 자격증명이 현재 계정 저장소에서 거부되어 NEEDS_REVIEW다. 인증된 서비스 API의 운영 `versionStore=ready` 확인은 아직 NOT_RUN이며, Vercel 환경변수 이름 존재와 로컬 값 로드 여부를 혼동하지 않는다.
- T22는 계속 IN_PROGRESS다. 다음 slice는 구조화 draft 생성·revision 충돌·감사 기록 연결이다.

## 2026-09-12 — T22 Slice 2 실제 서비스 초안 생성·수정

- `/admin/services`에 실제 19개 카탈로그를 원본으로 채우는 구조화 초안 편집기를 추가했다. 제목·한줄 설명·요약·분류·검색 노출·고객 경로만 저장하며 canonicalKey, 가격, 판매 상태는 변경하지 않는다.
- 운영 DB에 서비스별 활성 초안 1개를 보장하는 partial unique index와 advisory lock 기반 `create_service_config_draft` RPC를 반영했다. 함수는 security invoker이고 실행 권한은 postgres/service_role만 가진다.
- 생성·수정 API는 `services:write`, 멱등 키, allowlist 입력 검증, SHA-256 checksum, revision CAS, started/succeeded 감사 기록을 통과한다. 초안은 공개 read에 연결하지 않아 고객 화면·기존 주문·완료 리포트는 변경되지 않는다.
- 검증: 관련 32개 및 전체 629개 테스트 PASS, typecheck/build PASS. Production 배포 `dpl_L2tQHcEPX6dimtgabSc8vxbXpTC5` Ready 및 `umsh.kr` 별칭 연결, 최근 error log 0건.
- 지정 관리자 계정으로 직접 로그인해 production LNB와 19개 실서비스를 확인했다. `cmdg`의 현재 정본 값으로 실제 draft v1을 생성하고 다시 저장해 revision 1 CAS와 create/update 감사 기록을 확인했다. 비밀번호·쿠키·토큰은 저장하지 않았다.
- CreamWIKI: `personal/carrotcap/notes/umsh-t22-service-draft-20260912.md` 저장/get/개인 검색 확인 PASS. 서버 전용 재색인 명령은 로컬에서 실행할 수 없어 NOT_RUN이며 검색 즉시 반영은 확인했다.
- T22는 계속 IN_PROGRESS다. 다음 slice는 명시적 publish 승인과 이전 발행본 보존, 신규 고객 세션에만 적용되는 공개 read 경계다.
