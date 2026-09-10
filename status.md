# Status

## Initial Entry

- Status: `TODO`
- Created by: CreamAI ProjectOps SETUP
- Rule: append future progress entries below this section. Do not overwrite previous status history.

## Log

<!-- Append timestamped entries here. -->

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
