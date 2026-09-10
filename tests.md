# Tests

## Verification Matrix

| ID | Task | Type | Command | Expected | Last Result | Date |
| --- | --- | --- | --- | --- | --- | --- |
| V-001 | TASK-002 | typecheck | `npm run typecheck` | 오류 0건 | PASS (오류 0건) | 2026-09-10 |
| V-002 | TASK-002 | unit | `npm test` | 실패 0건 | PASS (373/373, 29 suites) | 2026-09-10 |
| V-003 | TASK-002 | integration (production) | `node scripts/check-integrations.mjs` | 결제 외 전 항목 PASS | PARTIAL (8 PASS / 2 FAIL — Inicis MID·SignKey, checkout enabled) | 2026-09-10 |
| V-004 | TASK-002 | integration (github) | `CreamAI/scripts/remember-integration.ps1 -Service github -Action ensure -Verify` | `configured` | PASS (configured) | 2026-09-10 |
| V-005 | TASK-002 | integration (vercel) | `CreamAI/scripts/remember-integration.ps1 -Service vercel -Action ensure -Verify` | `configured` | PASS (configured) | 2026-09-10 |
| V-006 | TASK-002 | integration (supabase cli) | `CreamAI/scripts/remember-integration.ps1 -Service supabase -Action ensure -Verify` | `configured` | FAIL (`missing_cli` — CLI 미설치) | 2026-09-10 |
| V-007 | TASK-002 | integration (supabase rest) | Supabase REST `GET /rest/v1/<table>?limit=1` (anon key) | 3개 테이블 도달 가능 | PASS (3개 모두 HTTP 401 = RLS 거부, 테이블 존재 확인) | 2026-09-10 |
| V-008 | TASK-002 | integration (supabase auth) | Supabase `GET /auth/v1/settings` | HTTP 200 | PASS (google, kakao, email 활성) | 2026-09-10 |
| V-009 | TASK-003 | integration (local) | `node scripts/check-integrations.mjs --base http://localhost:8790` | 결제 외 전 항목 PASS | NOT_RUN | - |
| V-010 | TASK-004 | schema | `supabase migration list` | baseline이 remote applied로 표시 | NOT_RUN | - |
| V-011 | TASK-004 | schema (dry) | `supabase db push --dry-run` | 적용 대상 0건 | NOT_RUN | - |
| V-012 | TASK-005 | ci | GitHub Actions `ci` 워크플로 | typecheck + test 통과 | NOT_RUN | - |
| V-013 | TASK-006 | deploy | Preview 배포 후 `/api/health` | `ok: true` + supabase 저장 경로 정상 | NOT_RUN | - |
| V-014 | TASK-007 | payment | `node scripts/check-integrations.mjs` | `checkout enabled` PASS | BLOCKED (PG 콘솔 자격 필요) | - |
| V-015 | task-t01 | integrity | `MANIFEST.json` SHA-256 대조 | 21개 문서 전부 일치 | PASS (ALL OK, 21 files) | 2026-09-10 |
| V-016 | task-t01 | git | `git rev-list --left-right --count origin/main...HEAD` | 분기 상태 기록 | PASS (20 behind / 10 ahead 기록) | 2026-09-10 |
| V-017 | task-t01 | route audit | `src/server/app.ts` 라우트 전수 추출 (배열 등록 포함) | 등록 수와 `/api` 수 확정 | PASS (등록문 145 / 경로엔트리 286 / `/api` 39). 초판 165·37은 배열 등록 누락 오류로 정정 | 2026-09-10 |
| V-018 | task-t01 | runtime | 로컬 `GET /api/payment/config` | 저장 모드·checkout 상태 실측 | PASS (storage=memory, checkoutEnabled=false, testMode=false) | 2026-09-10 |
| V-019 | task-t01 | regression baseline | `npm run typecheck` + `npm test` | 기존 실패 구분 | PASS (0 오류 / 373-373) | 2026-09-10 |
| V-020 | task-t01 | integration (local) | `node scripts/check-integrations.mjs --base http://localhost:8790` | 기존 실패 기록 | PARTIAL (7 PASS / 3 FAIL — Inicis 2건 + storage memory) | 2026-09-10 |
| V-021 | task-t01 | review | Codex 리뷰 (`run-reviewer.ps1`) | Critical 0, Major 반영 | PASS (Critical 0 / Major 5 / Minor 4 — 전부 수용·반영, 반려 0) | 2026-09-10 |
| V-022 | task-t02 | mapping | 20종 canonical/payment/prompt/route 정합성 검사 | 누락·alias 충돌 0, hidden 자동 공개 없음 | PARTIAL (누락 0건 PASS / hidden 자동공개 없음 PASS / **alias 충돌 2건 검출** — `cmdg↔saju_master` 브리지 부재, `home` 방향 역전) | 2026-09-10 |
| V-024 | task-t02 | contract | `npm run check:service-contracts` | 20종 계약 QA 통과 | PASS (20개 서비스 계약/프롬프트/코퍼스 도메인 확인) | 2026-09-10 |
| V-025 | task-t02 | runtime | `listServiceDirectory()` 반환 건수 | hidden 4종 제외 = 15건 | PASS (15건) | 2026-09-10 |
| V-026 | task-t02 | runtime (실패 케이스) | `loadServiceSystemPrompt('cmdg')` | 예외 발생 확인 | PASS (THROW `서비스 프롬프트가 없습니다: cmdg`) | 2026-09-10 |
| V-027 | task-t02 | 노출≠판매 | `PUBLICLY_DISABLED_PRODUCT_KEYS` 내용 | 정책과 일치 | **FAIL 판정 보류** — 빈 Set이라 discovery 15 / 판매 19 불일치. 정책 미확정(U10) | 2026-09-10 |
| V-028 | U1/U7 | production identity | 라이브 마커 3종 vs HEAD/origin-main 대조 | 운영 소스 확정 | PASS (robots.txt 200, sitemap.xml 200, `/privacy` title·css 모두 HEAD 일치 → 운영 = HEAD) | 2026-09-10 |
| V-029 | U13 | merge dry-run | `git merge-tree --write-tree --name-only HEAD origin/main` | 충돌 규모 파악 | PASS (exit 1, 충돌 24파일. `wedding_day` add/add) | 2026-09-10 |
| V-030 | U13 | merge 실행 | `origin/main` 병합 후 typecheck + 테스트 전수 | 회귀 0건 | **PASS** (typecheck 0 / `npm test` 415-415 / 커밋 `659ba7f`) | 2026-09-10 |
| V-054 | task-009 | merge 후 가드 | `check:*` 15개 전수 | 전부 PASS | **PASS** (15 PASS / 0 FAIL — 병합 전 4/11) | 2026-09-10 |
| V-055 | U23 | cat retrieval | `check:cat` + `retrieveCategoryOwnChunks` 존재 | PASS | **PASS** (2건 확보, `check:cat` exit 0) | 2026-09-10 |
| V-056 | U25 | stale guard | 11개 가드 실패 해소 | 전부 PASS | **PASS** | 2026-09-10 |
| V-057 | task-009 | qa | `npm run qa:all-services` | 20종 통과 | **PASS** | 2026-09-10 |
| V-058 | TASK-015 | 배포 | 병합분 운영 반영 후 `/api/payment/config` 문구 확인 | 환경변수 미노출 | NOT_RUN (배포 미수행, 사용자 승인 필요) | - |
| V-059 | task-009 | review | Codex 병합 리뷰 | Critical 0 | **Critical 1 검출 → 수정 완료** (`67b4d7b`). Major 4 중 2건 수정, 2건 출시 게이트 등록 | 2026-09-10 |
| V-060 | task-009 | 회귀 (라우트) | 출생시각 미상 프로필의 판정 반영 + 티저 사실 | 응답에 반영 | **PASS** — 배선 제거 시 실패함을 확인해 가드 유효성 검증 | 2026-09-10 |
| V-061 | task-009 | 회귀 (시각) | `9:30` / `09:30` / `24:00` / 미입력의 확인 여부 | 앞 둘 true, 뒤 둘 false | **PASS** | 2026-09-10 |
| V-062 | task-009 | 병합 후 전수 | typecheck + `npm test` + `check:*` 15 + qa | 전부 통과 | **PASS** (0 오류 / 417-417 / 15-15 / PASS) | 2026-09-10 |
| V-063 | G6 | Play 토큰 재사용 | 같은 Play 토큰 동시 검증 | 하나의 주문만 열림 | **NOT_RUN — 현재 구조로 미충족** (check-then-write, `tid` unique 없음) | - |
| V-064 | G8 | App Links | `assetlinks.json` 서명 지문 검증 | Android가 도메인 연결 확인 | **NOT_RUN — placeholder 상태** | - |
| V-065 | TASK-015 | 배포 복구 | 배포 후 `/robots.txt` `/sitemap.xml` `/about` `/faq` | 전부 200 | **PASS** (배포 전 전부 404 → 후 전부 200) | 2026-09-10 |
| V-066 | TASK-015 | 배포 복구 | 운영 `/api/services` 건수 | 15종·집풍수 포함 | **PASS** (14종 → 15종, `home_pungsu` 포함) | 2026-09-10 |
| V-067 | TASK-015 | 개선 유지 | 운영 `setupMessage` + `assetlinks.json` | 환경변수 미노출 + 200 | **PASS** (15:11 배포의 개선이 유지됨) | 2026-09-10 |
| V-068 | TASK-015 | 배포 후 통합 | `node scripts/check-integrations.mjs` | 결제 외 전 항목 PASS | **PARTIAL** (8 PASS / 2 FAIL — Inicis 계열, 기존 항목) | 2026-09-10 |
| V-069 | task-018 | 배포 경로 | `vercel project inspect` Git 섹션 존재 여부 | 연동 상태 확정 | **무효 — 이 검사로는 판정할 수 없다.** CLI 출력에 Git 섹션이 없어도 연동은 존재한다. 유효한 검사는 V-072 | 2026-09-10 |
| V-070 | task-018 | 브랜치 관계 | `git merge-base --is-ancestor origin/main HEAD` | fast-forward 가능 여부 | **PASS** (조상 확인, 0 behind / 16 ahead) | 2026-09-10 |
| V-071 | task-018 | README 정정 | `verify-seo-foundation.mjs` | PASS 유지 | **PASS** (robots, 19 sitemap URLs, 126 FAQ) | 2026-09-10 |
| V-072 | D4 | Git 연동 | `main` push 후 Production 배포 자동 생성 여부 | 자동 생성 | **PASS (관측 시점 한정, 2회 재현)** — `dpl_42Ckhx…`(16:19), `dpl_Ekm6XB…`(16:39) 둘 다 Ready + alias `chungi-t-git-main-…`. 과거 배포의 연동 상태·경로는 판정 대상 아님 | 2026-09-10 |
| V-073 | D6 | 운영 회귀 복구 | `umsh.kr` SEO·FAQ·about·assetlinks HTTP 코드 | 전부 200 | **PASS** — `/robots.txt` `/sitemap.xml` `/about` `/faq` `/my` `/.well-known/assetlinks.json` 모두 200 | 2026-09-10 |
| V-074 | D6 | 운영 서비스 목록 | `GET /api/services` 개수·`home_pungsu` 포함 | 15종, 포함 | **PASS** — 15종, `home_pungsu` 포함 (14종 회귀 복구) | 2026-09-10 |
| V-075 | D6 | 결제 문구 노출 | `GET /api/payment/config` 응답에 환경변수 이름 | 노출 없음 | **PASS** — `INICIS_MID`/`INICIS_SIGNKEY`/`SUPABASE_SERVICE`/`GOOGLE_PLAY` 0건, catalog 19종 | 2026-09-10 |
| V-076 | task-013 | RAG 배선 | `buildWeddingReport` 본문에 `[참고 기준]` 존재 | 3개 이상 섹션 | **PASS** — 6/21 섹션. 배선 제거 시 이 테스트만 실패함을 확인 | 2026-09-10 |
| V-077 | task-013 | 근거 중복 | 대분류별 배정 청크가 서로 다른가 | 6건 모두 다름 | **PASS** — 이전에는 3개 대분류가 같은 청크를 받았다 | 2026-09-10 |
| V-078 | task-013 | 근거 출처 | 본문의 근거가 `buildCorpusIndex()`에 있는가 | 전건 일치 | **PASS** — 고정 문구를 박아 두는 방식으로는 통과 못 한다 | 2026-09-10 |
| V-079 | task-013 | 개인정보 | 문맥에 상대 생년월일시가 실리는가 | 없어야 함 | **PASS** — `partner.birth` 제거. 직렬화에 `1988`·`"day":11`·`14:30` 흔적 0건 | 2026-09-10 |
| V-080 | task-013 | 문맥 사실 | `concern`에 후보일 판정·요일·조건 수·절기 달 | 전부 포함 | **PASS** — 병합 때 삭제됐던 테스트 복구 | 2026-09-10 |
| V-081 | task-013 | 상대 미입력 | 상대 사주 없을 때 비교 금지 고지 | 문맥에 존재 | **PASS** | 2026-09-10 |
| V-082 | task-013 | 출생시각 불확실 | 상대 시각 미상 시 `partner.birthTimeKnown` | `false` | **PASS** — 채운 정오를 사실로 넘기지 않는다 | 2026-09-10 |
| V-083 | task-013 | 절단 규칙 | 코퍼스 전수: 말줄임표·한도·문장 끝 | 위반 0 | **PASS** — 363청크, 출력 최대 170자, 초과 0건. `mr-001`(원문에 마침표 없음)이 최초 불변식을 반증해 단정을 "잘린 경우"로 좁혔다 | 2026-09-10 |
| V-084 | task-013 | 공용 헬퍼 | `compactChunkText` 정상/경계/에러/보안 | 6건 통과 | **PASS** — 신년·결혼 공용 | 2026-09-10 |
| V-049 | task-009 | merge 안전성 | 미추적 파일 vs incoming 충돌 검사 | 충돌 0건 | PASS (미추적 29 / incoming 216 / 충돌 0. 수정 tracked 2건도 incoming에 없음) | 2026-09-10 |
| V-050 | task-009 | merge 복원 | `git merge --abort` 후 상태 대조 | HEAD·dirty 불변 | PASS (HEAD `dac3835` 불변, 충돌 0, dirty 31 = 시도 전과 동일, 작업물 전부 보존) | 2026-09-10 |
| V-051 | task-009 | 충돌 분석 | 24건 파일별 해소 방침 확정 | 전건 방침 결정 | PASS (그룹 A~D 분류. 결정 필요 1건만 남김) | 2026-09-10 |
| V-052 | task-009 | registry 동일성 | 양쪽 `data/corpus/registry.json` pack id 집합 대조 | 차이 파악 | PASS (양쪽 28개 id 완전 동일 — 텍스트 차이뿐) | 2026-09-10 |
| V-053 | TASK-012 | 정보 노출 | 운영 `GET /api/payment/config`의 `setupMessage` | 내부 변수명 미노출 | **FAIL** (무인증 호출에 `INICIS_MID`, `INICIS_SIGNKEY` 노출. `origin/main` `aca0bf3`이 해소) | 2026-09-10 |
| V-023 | task-t05 | rbac | 비직원 API 403 / 회수 후 즉시 차단 (A01~A04) | 전부 차단 | NOT_RUN | - |
| V-031 | task-t03 | schema | `supabase-*.sql` vs 코드 `ensureDb()` 열 단위 대조 | 차이 전수 특정 | PASS (orders 6항목·reports 5항목 차이 확정) | 2026-09-10 |
| V-032 | task-t03 | schema | `owner_id` / `user_id` 타입 확정 | 08-DATA와 대조 | PASS (uuid+FK. 08-DATA "TEXT" 오류 검출) | 2026-09-10 |
| V-033 | task-t03 | fixture | 구형 payload 회귀 fixture 확보 | 위치 특정 | PASS (`tests/unit/report-persistence.test.ts:102`, `npm test`에 포함되어 통과) | 2026-09-10 |
| V-034 | task-t03 | concurrency | 주문 저장소 낙관적 동시성 존재 여부 | A09/A10 충족 판정 | **FAIL** (상태 가드만 존재. revision·멱등키·row lock 없음 — U17) | 2026-09-10 |
| V-035 | task-t03 | integrity | PG 승인 성공 후 저장 실패의 상태 표현 | 불확정 상태 보존 | **FAIL** (enum에 불확정 상태 없음. A12/A13 미충족 — U22) | 2026-09-10 |
| V-036 | task-t03 | schema (운영) | 운영 DB 실제 스키마·grant·RLS·분석열 null 집계 | 정본 SQL과 일치 | NOT_RUN (service_role 키 미보유 — U4) | - |
| V-037 | task-t03 | script | `verify-payment-db.sql` / `verify-report-db.sql` 실행 | 전 플래그 true / PASS | NOT_RUN (승인된 세션에서만 실행) | - |
| V-038 | task-t03 | review | Codex 리뷰 | Critical 0, Major 반영 | PASS (Critical 0 / Major 5 / Minor 3 — 전부 수용·반영) | 2026-09-10 |
| V-039 | task-t04 | unit baseline | `npm test` (npm 스크립트로) | 실패 0건 | PASS (373 tests / 29 suites / 373 pass / 0 fail, 2회 재현) | 2026-09-10 |
| V-040 | task-t04 | unit 재현성 | 동일 60개 파일을 명시 목록으로 `npx tsx --test` | `npm test`와 동일 결과 | **FAIL** (365 pass / 8 fail, 2회 재현 — 실행 형태 차이, 원인 미특정 U24) | 2026-09-10 |
| V-041 | task-t04 | static guards | `check:*` 16개 전수 실행 | 전부 통과 | **PARTIAL** (4 PASS / 12 FAIL — 11개 stale guard(U25), 1개 실제 차이(U23), production-source 정당) | 2026-09-10 |
| V-042 | task-t04 | qa | `npm run qa:all-services` | 20개 서비스 QA 통과 | PASS (정적 검사. `output/` 산출물 부작용 있음) | 2026-09-10 |
| V-043 | task-t04 | stale guard 근거 | 11개 가드의 옛/신 심볼과 우리 코드 존재 대조 | stale 분류 근거 확보 | PASS (11개 전수 검증. Codex 독립 검증 (a)~(e) PASS) | 2026-09-10 |
| V-044 | task-t04 | 재사용 테스트 | 16-ACCEPTANCE 지정 9개 파일 존재·통과 | 전부 존재·통과 | PASS (9/9) | 2026-09-10 |
| V-045 | task-t04 | acceptance 매핑 | A01~A40 기존 테스트 커버리지 분류 | 40개 전수 분류 | PASS (덮임 2 / 부분 17 / 없음 21 = 40) | 2026-09-10 |
| V-046 | task-t04 | deploy preflight | `npm run check:production-source` | exit 0 | **FAIL** (exit 1 — 작업트리 비청결 + HEAD가 origin/main 미포함) | 2026-09-10 |
| V-047 | task-t04 | review | Codex 리뷰 | Critical 0, Major 반영 | PASS (Critical 0 / Major 4 / Minor 3 — 전부 수용·반영) | 2026-09-10 |
| V-048 | U23 | cat retrieval | 고양이 궁합 검색 결과를 형제 서비스와 대조하는 결정적 assertion | 동일 단계 수행 확인 | NOT_RUN (테스트 미작성 — U23 해소 시 추가) | - |

## 회귀 오라클 조건 (T04에서 고정)

이 표의 PASS/FAIL은 아래 조건에서만 비교 가능하다.

- 명령: 표에 적힌 문자열 그대로. `npm test`는 **반드시 npm 스크립트로** 실행
- 환경: Node v24.13.1 / tsx v4.23.12 / cwd = 저장소 루트 / Windows 11
- 대상 파일: `tests/unit/*.test.ts`
- **병합 전 기준 (HEAD `dac3835`)**: 60개 파일 / 373 tests / 경로 sha256 `202b69511bda7f40`
- **병합 후 기준 (HEAD `67b4d7b`)**: **417 tests / 34 suites / 417 pass**
  (`659ba7f` 시점 415 + 리뷰 반영 회귀 테스트 2건).
  병합으로 대상 파일이 늘었으므로 병합 전 해시는 무효다. 새 baseline은 `67b4d7b` 기준이다.

조건이 다르면 U24를 먼저 확인하고 같은 조건으로 재실행해 대조한다.
상세: `docs/admin-ops/T04-regression-baseline.md` §8

## Rules

- 실행하지 않은 검증은 `NOT_RUN` 또는 `BLOCKED`으로 표기하고 절대 PASS로 기록하지 않는다.
- 테스트가 실패하면 테스트를 수정하지 않고 구현 코드를 고친다.
- 비밀값은 명령/결과 기록에 포함하지 않고 변수 이름만 남긴다.
