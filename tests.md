# Tests

## Verification Matrix

- 2026-09-13 lucky_color visual acceptance: RED 2/3 → GREEN 3/3; focused 18/18; related 78/78; full 913/913 across 122 suites; real reader 6 categories/24 sections, exact 390px zero overflow, 21-page complete print, typecheck/build/five deterministic rebuilds PASS; provider/Production/customer mutation NOT_RUN.

- 2026-09-13 cat_compatibility corpus release candidate: RED 1/8 → GREEN 8/8; related 139/139; full 831/831 across 115 suites; 38 unique interpretations, 76 unique labeled hypothetical scenes, stored-snapshot/hash isolation, typecheck/build/deterministic builder PASS; provider/Production NOT_RUN.
- 2026-09-13 pass_angle corpus release candidate: RED 1/8 → GREEN 8/8; related 143/143; full 823/823 across 114 suites; existing 52-item order/storage/generation regressions, typecheck/build/deterministic builder PASS; 2.1.0 provider/Production NOT_RUN.

- 2026-09-13 work_move corpus release candidate: RED 1/8 → GREEN 8/8; related 153/153; full 815/815 across 113 suites; typecheck/build/deterministic builder PASS; provider/Production NOT_RUN.

- 2026-09-13 home_fit corpus release candidate: RED 1/8 → GREEN 8/8; related 107/107; full 807/807 across 112 suites; typecheck/build/deterministic builder PASS; dedicated home-reader stored-snapshot regression fixed; provider/Production NOT_RUN.

- 2026-09-13 love_mind corpus release candidate: RED 1/8 → GREEN 8/8; related 88/88; full 783/783 across 109 suites; typecheck/build/deterministic builder PASS; provider/Production NOT_RUN.

- 2026-09-13 work_job corpus release candidate: RED 1/8 → GREEN 8/8; related 100/100; serial full 775/775 across 108 suites; typecheck initially caught an invalid test field and passed after correction; Vercel build, deterministic builder and credential scan PASS; provider/Production NOT_RUN.

- 2026-09-13 saju_master corpus release candidate: RED 1/8 → GREEN 8/8; related 98/98; serial full 767/767 across 107 suites; typecheck and Vercel build PASS; deterministic builder and task-boundary credential scan PASS; provider/Production NOT_RUN.

Tone V2 (2026-09-12): fresh `pass_angle` provider E2E rerun executed and business acceptance is FAIL. Both responses passed scene; attempt 2 failed only nextCriterion and attempt 1 also failed the paragraph rule. Focused related 59/59, compiler/task coverage 7/7, full regression 674/674, typecheck, vercel-build, saved-record replay, and git diff --check PASS. All-service/live full-report/visual acceptance remains NOT_RUN.

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
| V-085 | task-019 | 상대 개인정보 | 6개 서비스 문맥에 상대 생년월일시 흔적 | 0건 | **PASS** — 다시만날까·그사람마음·연애신호·궁합·결혼궁합·결혼택일 | 2026-09-10 |
| V-086 | task-019 | 계산 결과 보존 | 원본 제거 후에도 명식 4주·일간 표기 | 유지 | **PASS** — 6개 서비스 전부 | 2026-09-10 |
| V-087 | task-019 | 과거 기록 응답 | `/api/report/:id`(결제 완료) 응답에 상대 생년월일시 | 0건 | **PASS** — 저장소에는 남아 있고 응답에서만 가림 | 2026-09-10 |
| V-088 | task-019 | 유입구 차단 | `/api/saju/analyze` + `serviceKey=love_this_year` + partner | 400 INPUT_REQUIRED | **PASS** — dead path 고정 | 2026-09-10 |
| V-089 | task-019 | 모델 프롬프트 | `groundedReportFeatures` 직렬화에 상대 생년월일시 | 0건 | **PASS** — Codex Critical 1. `featureJson.userContext` 로 새고 있었다 | 2026-09-10 |
| V-090 | task-019 | 저장된 상담 | 과거 부모로 `/api/chat` → 자녀 레코드 문맥·저장된 프롬프트 | 0건 | **PASS** — Codex Critical 2. 저장·전송 양쪽 확인 | 2026-09-10 |
| V-091 | task-019 | sanitize 무해성 | `publicReportContext`가 입력 객체를 변형하는가 | 변형 없음 | **PASS** — 얕은 복사 후 delete | 2026-09-10 |
| V-092 | task-019 | 음성 대조 | 3개 경로의 sanitize 를 각각 되돌림 | 해당 테스트만 실패 | **PASS** — 궁합 서비스 / `/api/report/:id` / 저장된 상담 | 2026-09-10 |
| V-093 | task-011 | 브랜드 표기 | 재귀 수집한 HTML 의 노출 텍스트에 `UMSH` | 0건 | **PASS** — 92개 페이지. `script`·`style`·주석 제외 | 2026-09-10 |
| V-094 | task-011 | 구조화 데이터 | Organization `name`/`alternateName` | 운명상회 / UMSH | **PASS** — about·portal | 2026-09-10 |
| V-095 | task-011 | 프롬프트 노출 | `PROMPT.md` 15개 요청 | 404 | **PASS** — 운영에서 200 이었다 | 2026-09-10 |
| V-096 | task-011 | 스크립트 노출 | `*.py` 요청 | 404 | **PASS** — 스크래핑·검증 스크립트 7개 | 2026-09-10 |
| V-097 | task-011 | 생성 산출물 | `*-RESULT.json` 요청 | 404 | **PASS** | 2026-09-10 |
| V-098 | task-011 | 스크랩 HTML | `사주/사주/extracted_decoded.html`(121KB) | 404 | **PASS** — Codex Critical. 확장자 목록이 놓쳤다 | 2026-09-10 |
| V-099 | task-011 | 중복 URL | `/사주/index.html` | 404 | **PASS** — 두 번째 URL 공간을 닫음 | 2026-09-10 |
| V-100 | task-011 | 우회 차단 | 9변형(`%2Emd`·`.md/`·`//`·`.`·`%20`·`%2F`·대문자·이중인코딩·경로순회) | 전부 비200 | **PASS** — `PROMPT.md/` 는 원문 4017B 를 반환하고 있었다 | 2026-09-10 |
| V-101 | task-011 | 과잉 차단 방지 | `robots.txt`·`sitemap.xml`·`assetlinks.json`·`/privacy`·`/css/policy.css` | 200 | **PASS** | 2026-09-10 |
| V-102 | task-011 | 음성 대조 | 가드 무력화 | 8건 실패 | **PASS** — 복원 확인 | 2026-09-10 |
| V-103 | task-011 | 배포 라우팅 | `vercel.json` 이 캐치올 `routes` 인가 | `rewrites` 부재 | **PASS** — `rewrites` 는 파일시스템 우선이라 정적 노출이 열린다 | 2026-09-10 |
| V-104 | task-011 | 운영 노출 | 저장소 경로 7종(`/사주/**/PROMPT.md`·`*.py`·스크랩 html·`/data/runtime-config.json`·`/prompts/README.md`·중복 URL) | 전부 404 | **PASS** — Express 가드 배포 후에도 200 이었다 | 2026-09-10 |
| V-105 | task-011 | 운영 정상성 | 페이지·API·정적 자산 13종 | 전부 200 | **PASS** — `/` `/faq` `/about` `/privacy` `/robots.txt` `/sitemap.xml` `assetlinks.json` `policy.css` `faq-knowledge.js` `brand-logo.png` `favicon.ico` `wedding 01` | 2026-09-10 |
| V-106 | task-020 | 기본 거부 | 허용 목록 밖 6형식(`.csv`·`.yaml`·`.env`·`.js.map`·`.rtf`·`.sqlite`) | 404 + 가드 본문 | **PASS** — 다른 곳에서 404 된 것과 구분 | 2026-09-10 |
| V-107 | task-020 | 허용 형식 | png·webp·jpg·woff2·ttf·css·js·ico | 전부 200 | **PASS** — 허용 목록 누락 감지 | 2026-09-10 |
| V-108 | task-020 | 전제 고정 | 트리에 확장자 없는 파일 | 0개 | **PASS** — 확장자 없는 요청을 통과시키는 근거 | 2026-09-10 |
| V-109 | task-020 | 백슬래시 우회 | `%5C` 계열 9변형 | 비200 + 원문 미포함 | **PASS** — Codex 가 200/원문 반환을 검증했던 경로 | 2026-09-10 |
| V-110 | task-020 | 산출물 도달성 | 내부 산출물 이름 + 웹 확장자 조합 | 모든 URL 공간에서 404 | **PASS** — `/extracted_decoded.html` 이 116KB 반환하고 있었다 | 2026-09-10 |
| V-111 | task-020 | 참조 자산 크롤 | HTML·CSS 가 참조하는 로컬 자산 URL 전수 | 전부 200 | **PASS** — 형식 누락이 조용히 깨지지 않게 | 2026-09-10 |
| V-112 | task-020 | 음성 대조 | 허용목록→거부목록 / 백슬래시 정규화 제거 / 중첩 마운트 복원 | 각각 6·6·1건 실패 | **PASS** — 전부 복원 확인 | 2026-09-10 |
| V-113 | task-020 | 운영 실측 | 차단 7종 / 정상 15종 | 404 / 200 | **PASS** — 배포 후 확인 | 2026-09-10 |
| V-114 | task-005 | CI 배포 금지 | 워크플로에 배포 단계·배포 액션 | 0건 | **PASS** — 정규식. `npx vercel@latest --prod` 주입 시 실패 확인 | 2026-09-10 |
| V-115 | task-005 | CI 권한 최소 | 최상위 `permissions` 1개 · 내용 정확히 `contents: read` | 일치 | **PASS** — 권한 승격·job 수준 승격 주입 시 실패 확인 | 2026-09-10 |
| V-116 | task-005 | CI 게이트 존재 | `npm ci`·typecheck·test·SEO·QA·`vercel-build`·`git diff` | 전부 존재 | **PASS** — QA 게이트 삭제 시 실패 확인 | 2026-09-10 |
| V-117 | task-005 | 제외 이유 | 모든 `check:*` 가 CI 에 있거나 제외 이유가 적혀 있음 | 충족 | **PASS** — `integrations`·`production-source` 2건 제외 + 이유 | 2026-09-10 |
| V-118 | task-005 | Node 단일 출처 | `.nvmrc` = Vercel `nodeVersion` | 24 = 24.x | **PASS** — 드리프트 없음 | 2026-09-10 |
| V-119 | task-005 | 자격증명 없이 실행 | 모든 credential unset 후 `npm test` | 통과 | **PASS** — 테스트는 `.env` 를 읽지 않는다 | 2026-09-10 |
| V-120 | task-005 | GitHub 실제 실행 | 워크플로 실행 결과 | success | **PASS** — 4회 (브랜치 3 + main 1), 10단계 녹색 | 2026-09-10 |
| V-121 | task-005 | 중복 배포 없음 | `main` push 후 배포 건수 | 1건 | **PASS** — CI 1회 + Production 1회 실측 | 2026-09-10 |
| V-122 | task-005 | 배포 빌드 검증 | `vercel-build` 후 `git diff --exit-code` | 변경 0건 | **PASS** — 생성물이 커밋과 일치 | 2026-09-10 |
| V-123 | task-021 | 자산 캐시 | 자산 응답의 `s-maxage` | 존재 | **PASS** — 헤더 제거 시 6건 실패 | 2026-09-10 |
| V-124 | task-021 | 브라우저 캐시 | 자산 `max-age` ≤ 3600 · `immutable` 부재 | 충족 | **PASS** — 참조 79%가 버전 없음 | 2026-09-10 |
| V-125 | task-021 | HTML 즉시 반영 | HTML 응답에 긴 엣지 캐시 | 없음 | **PASS** | 2026-09-10 |
| V-126 | task-021 | 엣지 캐시 실동작 | 배포 후 같은 자산 2회 요청 | `HIT` | **PASS** — `/css/policy.css`·`brand-logo.png` | 2026-09-10 |
| V-127 | task-t07 | 셸 소스 은닉 | `/admin-ui/index.html` 등 3변형 | 404 | **PASS** — 정적 루트 밖(ADR-0002 D1) | 2026-09-10 |
| V-128 | task-t07 | 셸 데이터 부재 | 셸에 설정값·키·이메일 | 0건 | **PASS** — D2-5 | 2026-09-10 |
| V-129 | task-t07 | 색인 차단 | `/admin` 계열 `X-Robots-Tag`·`no-store`·robots.txt | 충족 | **PASS** | 2026-09-10 |
| V-130 | task-t07 | 권한 경계 (A02) | **레거시 unlock 이메일**로 관리자 API 접근 | 403 | **PASS** — 초판은 200 이었다(Codex Critical) | 2026-09-10 |
| V-131 | task-t07 | 상태 구분 (A35) | 미인증 401 / 권한없음 403 / 토큰거부 401 | 구분됨 | **PASS** | 2026-09-10 |
| V-132 | task-t07 | 딥링크 | `/admin/*` 5경로가 셸로 응답 | 200 | **PASS** — 정적 탐색으로 흐르지 않는다(D2-4) | 2026-09-10 |
| V-133 | task-t07 | 디자인 준수 | 레퍼런스 토큰·색상값·CDN 부재 + 의미 기반 토큰 존재 | 충족 | **PASS** — D3 | 2026-09-10 |
| V-134 | task-t07 | 음성 대조 | 관리자 판정 제거 / noindex 제거 / 미인증 차단 제거 | 각 1건 실패 | **PASS** — 복원 확인 | 2026-09-10 |
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
| V-135 | U17 | 승인 보호 | `paid` → `failed` 전이 | 거부 | **PASS** — 승인 뒤 오류 시 catch 가 덮던 경로 | 2026-09-11 |
| V-136 | U17 | 동시 갱신 | 서로 다른 필드 동시 쓰기 2건 | 둘 다 반영(revision 2) | **PASS** | 2026-09-11 |
| V-137 | U17 | 직렬화 | 동시 승인 5건 | 모두 직렬화(revision 5) | **PASS** | 2026-09-11 |
| V-138 | U17 | REST CAS | PATCH 가 `revision=eq.N` 으로 필터 | 계약 고정 | **PASS** — 빈 결과 = 낡은 판 | 2026-09-11 |
| V-139 | U17 | 환불 경로 | `paid`·`viewed` → `cancelled` | 허용 | **PASS** — 처음 과하게 막았고 기존 테스트가 잡았다 | 2026-09-11 |
| V-140 | U22 | 불확정 보호 | `approving` + `tid` → `failed` | 거부 | **PASS** — 과금된 주문이 실패로 기록되던 경로 | 2026-09-11 |
| V-141 | U22 | 증거 범위 | 같은 쓰기가 `tid` + `failed` 를 함께 넣는 경우 | 거부 | **PASS** — 현재분만 보면 우회된다 | 2026-09-11 |
| V-142 | U22 | 정상 실패 | 증거 없는 `approving` → `failed` | 허용 | **PASS** — 승인 거부는 사실이다 | 2026-09-11 |
| V-143 | U22 | 음성 대조 | 증거 가드 제거 / 증거 범위 축소 | 3건·1건 실패 | **PASS** — 복원 확인 | 2026-09-11 |
| V-144 | staff | 관리자 권한 | `UMSH_ADMIN_SUPER_EMAILS` 설정 계정만 200 | 충족 | **PASS** — 빈 설정이면 아무도 없음, 대소문자 무시 | 2026-09-11 |
| V-145 | staff | 자격증명 | 셸이 비밀번호를 보관·전송하는가 | 안 함 | **PASS** — Supabase Auth 직접 호출, 폼 즉시 비움 | 2026-09-11 |
| V-146 | task-t18 | 환불 조회·UI | refund store/list API/운영 셸 | 26 tests, typecheck, vercel build | **PARTIAL** — 단위/API/셸 검증은 PASS. Production `/api/admin/v1/refunds`는 503으로 원인 확인 필요 | 2026-09-11 |

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

## Tone V2 Current Verification

- 2026-09-12 P01 `pass_angle` fresh E2E rerun: pre-existing record false; new record and two actual provider attempts persisted; record/report/result/attempt/model/token/raw/prose hashes replay PASS. Both attempts passed scene. Attempt 2 failed only nextCriterion; attempt 1 additionally failed the 2-4-sentence paragraph rule. Business acceptance FAIL. Focused 59/59, compiler/task 7/7, full regression 674/674, typecheck, Vercel build, and diff check PASS. No production mutation.

- 2026-09-12 P01 `pass_angle` representative E2E: saved-record replay PASS (record hash, attempt IDs, resolved model and raw hashes); harness credential-isolation RED then 1/1 PASS; focused 58/58 PASS; compiler/task 7/7 PASS; full regression 673/673 PASS preserved in `tone-v2/latest-regression.log`; typecheck PASS; Vercel build PASS; `git diff --check` PASS with line-ending warnings only. The business acceptance itself is FAIL because the section persisted `failed` after two provider attempts.

- 2026-09-12 P01 safety-claims gate: initial focused RED failed because `reviewSafetyClaims` did not exist; final §10 generation 5/5 PASS, related tone/love/report/home 58/58 PASS, compiler/task 7/7 PASS, regenerated task-index 3/3 PASS.
- 2026-09-12 P01 teaser trust gate: RED cycles covered missing export, a scene-fixture mistake, 15 integration failures from reviewing the redacted pending report, the wedding non-fortune boundary regression, and unsafe old-preview read-through. Final §9 prompt 1/1 PASS, teaser review 3/3 PASS, related preview/persistence/workflow integration 69/69 PASS, compiler/task 7/7 PASS, regenerated task-index 3/3 PASS.
- 2026-09-12 P01 score/visual evidence gate: initial RED failed on missing `reviewScoreVisuals`; the first GREEN attempt exposed a test-fixture wiring error; final §8 focused 3/3 PASS, generation/persistence/persona 32/32 PASS, compiler/task 7/7 PASS, regenerated task-index 3/3 PASS.
- 2026-09-12 P01 technical-term gate: RED 1 failed on missing `reviewTechnicalTerms`; RED 2 reproduced 합격/충분 false positives; final §7 focused 3/3 PASS, generation/persistence/persona 29/29 PASS, compiler/task 7/7 PASS, regenerated task-index 3/3 PASS.
- 2026-09-12 P01 voice/character gate: initial focused run exposed 2 missing behaviors; final `tests/unit/tone-v2-generation.test.ts` 16/16 PASS and persistence/persona focused 10/10 PASS; compiler/task 7/7 PASS; regenerated task-index 3/3 PASS.
- 2026-09-12 P01 section uniqueness gate: initial focused RED failed because `reviewSectionUniqueness` did not exist; GREEN generation 13/13 PASS and persistence 8/8 PASS; compiler/task 7/7 PASS; regenerated task-index 3/3 PASS; full regression 644 tests / 100 suites / 644 PASS / 0 FAIL.
- 2026-09-12 P01 paid density gate: initial focused RED failed because `reviewPaidSectionDensity` did not exist; GREEN `tests/unit/tone-v2-generation.test.ts` 11/11 PASS; persistence generation integration PASS; compiler/task 7/7 PASS; regenerated task-index 3/3 PASS; full regression 642 tests / 100 suites / 642 PASS / 0 FAIL.
- 2026-09-12 P01 service RAG/corpus-copy boundary: RED `39/42 PASS, 3 FAIL`; GREEN focused `93/93 PASS`; all 20 service domains appear within top two retrieved chunks; exact long corpus sentence is rejected and a rewritten sentence accepted.
- 2026-09-12 P01 evidence-layer boundary: initial RED `6/7 PASS, 1 FAIL`; final generation+persistence+privacy+service focused `58/58 PASS`; compiler/task coverage `7/7 PASS`; regenerated task-index `3/3 PASS`.
- 2026-09-12 P01 persona/opening/internal gate: RED `6/8 PASS, 2 FAIL`; GREEN `tests/unit/tone-v2.test.ts` + `tone-v2-generation.test.ts` 8/8 PASS; persistence-inclusive focused 16/16 PASS; compiler/task 7/7 PASS; regenerated task-index 3/3 PASS.
- 2026-09-12 P01 numeric prescription/arithmetic gate: `tests/unit/tone-v2-generation.test.ts` 5/5 PASS before the certainty slice.
- 2026-09-12 P01 certainty/private-fact gate: `tests/unit/tone-v2-generation.test.ts` 6/6 PASS; `tests/unit/report-persistence.test.ts` 포함 focused 14/14 PASS; `node --test tone-v2/compile.test.mjs tone-v2/task-index.test.mjs` 7/7 PASS; `node --test tone-v2/task-index.test.mjs` 3/3 PASS after task-index regeneration.
- Full regression after safety-claims gate: `npm test` 662 tests / 100 suites / 662 PASS / 0 FAIL (116.5s).
- Build/static checks: `npm run typecheck` PASS, `npm run vercel-build` PASS, `git diff --check` PASS with CRLF warnings only.
## Tone V2 §11 readability and saved-reader cards — 2026-09-12

- RED: 5 expected failures for hook punctuation, paragraph/slash rules, semantic blocks, legacy fallback, and preview CTA.
- Focused frontend: 44/44 PASS.
- Focused report persistence: 8/8 PASS after updating the old five-sentence fixture to the new 2–4 sentence contract.
- Typecheck: PASS.
- Vercel build: PASS.
- Compiler/task coverage: 7/7 PASS after task-index regeneration.
- Full regression: first run 666/667 exposed one old five-sentence fixture; final run 667/667 PASS.
- Diff check: PASS (line-ending warnings only).
- Browser: local real reader shell loaded; synthetic styled private-result inspection NOT_RUN due browser URL policy.
## Tone V2 §11 revision-note audit — ZIP-003-100~102

- Required behavior already covered by the §11 focused fixtures: nominal hook verdict without period fails, `지금은 보류.` passes, and rendered `돈 · 지금의 선택` omits the classification period.
- No production code changed in this audit-only Task. Focused generation/frontend tests 73/73 PASS; regenerated task-index 3/3 PASS; diff check PASS.

## Tone V2 관리자 코퍼스·프롬프트 원천 연결 — 2026-09-12

- RED: `tests/unit/admin-shell.test.ts`에서 두 로더 부재와 `/api/admin/v1/corpus`, `/api/admin/v1/prompts` 404를 재현했다.
- GREEN: 관리자 셸·정적 노출 focused 84/84 PASS. 미로그인은 두 API 모두 401이며, 권한 있는 요청은 실제 레지스트리·생성 번들·20개 퍼소나·가이드 파일 메타데이터를 반환한다.
- 보안: 프롬프트 본문과 `content` 필드는 응답하지 않는다. 배포 포함 파일은 함수 번들에만 들어가며 정적 공개 경로는 기존 기본 거부를 유지한다.
- 전체 회귀: `npm test` 668 tests / 100 suites / 668 PASS / 0 FAIL.
- 빌드: `npm run vercel-build` PASS. `git diff --check` PASS (CRLF 경고만 있음).
- 브라우저: 별도 포트 8791에서 셸 로드 PASS. 이 포크의 로컬 관리자 계정 저장소에는 제공된 두 계정이 없어 인증 후 화면 시각 검수는 NOT_RUN. 인증 우회는 하지 않았다.
- 커밋·push·배포·Production 확인: NOT_RUN (승인 전).

## Tone V2 P01 첫머리·내부 필드 실제 출력 평가 — 2026-09-12

- 정적 계약 baseline: `npx tsx --test tests/unit/tone-v2-generation.test.ts` 29/29 PASS.
- 실제 모델: 합성 입력 3서비스 × 2시도, `gpt-5.5-2026-04-23` 응답 6건 확보.
- ZIP-003-008 직접 답변 6/6 PASS, ZIP-003-009 제작 안내형 첫머리 0/6 PASS, ZIP-003-032 내부 필드 노출 0/6 PASS.
- 전체 생성 완료는 0/6이다. 범위 밖 한자 설명·밀도·안전 검수 실패를 이번 세 규칙의 성공과 분리했다.
- 운영 고객 데이터·DB·결제·인증·Production 사용/변경 없음. 20개 서비스 전량 평가는 NOT_RUN.
- 독립 리뷰: Critical 0, Major 1. ignored 원문 캐시만으로는 장기 재현성이 부족하다는 Major를 수용해 평가 JSON에 원문·prose SHA-256, 첫 3개 가시 문장, 모델·토큰·종료 사유와 결정적 스캔 결과를 추가했다. 저장 해시 재계산 6/6 PASS.
- 독립 조사: Antigravity 실행이 빈 프롬프트 오류로 실패했고 Claude fallback도 결과 없이 정지해 중단했다. `NOT_RUN (degraded)`으로 기록하며 독립 조사 PASS를 주장하지 않는다.
- 최종 검증: focused generation 29/29 PASS, generation+persistence 37/37 PASS, compiler/task 7/7 PASS, regenerated task-index 3/3 PASS, 전체 `npm test` 668 tests / 100 suites / 668 PASS / 0 FAIL, `npm run typecheck` PASS, `npm run vercel-build` PASS, `git diff --check` PASS(CRLF 경고만 있음).
- ProjectOps: preflight/test/rag/release harness 실행 완료. test harness의 `package.json has no test script` 경고는 실제 `npm test` 668/668 결과와 다르므로 수동 검증 결과를 기준으로 삼는다.
- CreamWIKI: `personal/carrotcap/notes/umsh-tone-v2-opening-live-evaluation-20260912.md` put/get/search PASS. 서버 reindex는 클라이언트 명령 부재로 NOT_RUN.

## Tone V2 P01 실제 재시도 교정 안내 — 2026-09-12

- RED 1: 기존 평문 재시도 메시지에서 구조화 한자·문단 안내와 거부 원문 비복사 계약이 실패했다(8/9 PASS, 1 FAIL).
- 실제 run v1: 첫 실패 규칙만 반복하면 재시도에서 새 전문용어·문단 위반이 생김을 확인했다. 목표 규칙 중 전문용어 2/3, 복수 한자 3/3, 문단 2/3 PASS; 전체 완료 1/3이었다.
- RED 2: 한 종류만 실패한 경우에도 두 읽기 불변식을 함께 재고지해야 한다는 계약이 실패했다(8/9 PASS, 1 FAIL).
- 실제 run v2: 최종 재시도에서 전문용어 3/3, 복수 한자 3/3, 문단 3/3 PASS. 전체 완료는 별도 다음 판단 기준 실패로 2/3이다.
- 독립 리뷰: Critical 0. 사용자 수동 재시도 첫 호출 안내 누락을 수정·테스트했다. 기존 paid-density 길이 하한 지적은 이번 slice 이전 구현이므로 변경하지 않았다. 수정 후 독립 재리뷰는 NOT_RUN이다.
- 최종: focused 55/55, compiler/task 7/7, 전체 회귀 670/670, raw+prose 해시 12/12, typecheck 및 Vercel build PASS.
- ProjectOps implementation harness의 broad `sk-...` 정규식은 `task-tone...` 파일명을 비밀로 오탐해 FAIL을 기록했다. 별도 task-file token scan은 실제 credential 0건이었다. test harness는 `CreamAI` 하위에 package script가 없어 WARN이며 저장소 루트의 실행 가능한 결과는 위 670/670이다.
- CreamWIKI `personal/carrotcap/notes/umsh-tone-v2-live-repair-guidance-20260912.md` put/get/search PASS. 서버 reindex는 NOT_RUN이다.

## Tone V2 P01 pass_angle 다음 판단 기준 — 2026-09-12

- RED: `다음 시험 전날 오답 루틴으로 다시 세워봐`가 nextCriterion false로 재현됐다. 독립 리뷰 후 두 번째 RED에서 원본 표현 `오늘 버릴 공부를 정해`, `다음에는 남길 공부 순서를 매겨` 누락과 `시험을 버려`, `공부를 끊어` 오탐을 함께 고정했다.
- GREEN: 미래·순서 표지 + 조사 표시 대상 + 안전한 계획 동사만 인정한다. `다음에는 잘해봐`와 시험/공부 포기성 문장은 false다.
- 이전 저장 원문 재평가: density 4요소 전체 PASS. 신규 실제 모델 두 번째 시도: nextCriterion PASS, grounding FAIL. 전체 section은 failed로 정직하게 유지한다.
- 독립 리뷰: Critical 0, Major 2, Minor 2. 네 지적 모두 반영했다. 수정 후 독립 재리뷰는 NOT_RUN이다.
- 검증: focused 56/56, compiler/task 7/7, 전체 회귀 671/671, raw+prose 해시 6/6, typecheck, Vercel build, diff check PASS.
- CreamWIKI `personal/carrotcap/notes/umsh-tone-v2-pass-angle-next-criterion-20260912.md` put/get/search PASS. 서버 reindex는 NOT_RUN이다.
- ProjectOps implementation secret scan은 `task-tone...` 파일명을 `sk-...` 토큰으로 오탐해 FAIL, test mode는 CreamAI 하위 package script 부재로 WARN이다. 경계 인식 task-file scan은 실제 credential 0건이며 저장소 루트 `npm test` 671/671을 기준으로 삼는다.

## Tone V2 P01 컨텍스트 근거 판별 — 2026-09-12

- RED: 캡처형 `연습 점수 + 목표 수준` 재사용이 grounding false로 재현됐다.
- GREEN/반례: 같은 사실의 복수 구체 토큰은 true, 단일 일반론·필드 간 합산·context 없음·name/savedChat 일치는 false다.
- 캡처 원문 재평가: raw/prose SHA-256 및 문장 일치 PASS, density 4/4 PASS, 역사적 저장 상태 `failed` 유지.
- 검증: focused 57/57, compiler/task 7/7, full regression 672/672, typecheck, Vercel build, diff check PASS(CRLF 경고만 있음).
- 독립 리뷰: Critical 0, Major 3 모두 반영. 독립 재리뷰는 NOT_RUN.
- ProjectOps: implementation은 `task-tone...` 파일명 secret 오탐으로 FAIL, test는 `CreamAI` 하위 package 경로 문제로 WARN. Task 파일 경계 인식 credential scan 0건, rag/release PASS.
- CreamWIKI: `personal/carrotcap/notes/umsh-tone-v2-context-grounding-20260912.md` put/get/search PASS. 서버 reindex는 NOT_RUN.

## Tone V2 P01 인접 nextCriterion 판별 — 2026-09-12

- RED: 실제 attempt 2의 인접 계획/행동 구조 실패와 후행 부정 오탐을 재현했다.
- 리뷰 반례: 대상 없는 같은 문장 행동, 선행·후행 부정, 과거완료, 양쪽 문장의 포기 표현, 안전한 포기 금지, `시험장 버스`·`응시 접수`·`버티는`·`끊김` 동형 문자열을 검증했다.
- 최종 focused 33/33, 관련 generation/persistence/content/live 60/60 PASS.
- 저장 재생: attempt `5f438f74-beb8-4bb1-9089-b7e656145a1d` density 4/4 PASS; report는 `failed` 유지; record SHA-256 불변.
- compiler/task 7/7, 전체 675/675(101 suites), typecheck, Vercel build, diff check PASS.
- 독립 승인 리뷰: Approved, Critical 0 / Major 0 / Minor 0.

## Tone V2 P04 pass_angle 단일 항목 completion E2E — 2026-09-12

- preflight: 고유 version `not-generated` PASS. 새 합성 레코드 생성 후 실제 provider 2회 중 첫 시도 nextCriterion FAIL, 두 번째 전 결정적 검수 PASS.
- 저장 결과: report/section `complete`, 공개 hook 23자, 본문 304자, record SHA-256 재생 일치.
- 하네스: `--fresh` 기존 version 거부 PASS; production과 saved replay가 동일한 `reviewGeneratedSajuReportSection` 사용.
- focused harness+generation 35/35 PASS; related 61/61 PASS; compiler/task 7/7 PASS.
- 전체 회귀 676/676, 101 suites, typecheck, Vercel build, diff check PASS.
- 독립 재리뷰: Approved with comments; Critical 0 / Major 0 / Minor 0. 전체 목차·20개 서비스·Production은 NOT_RUN.
- ProjectOps: implementation의 광범위 `sk-...` 패턴은 `task-tone...` 식별자를 오탐해 FAIL. Task 경계 인식 credential scan 0건 PASS. test는 CreamAI 하위 package script 부재로 WARN이며 저장소 루트 676/676이 권위 결과다. RAG/release PASS.
- CreamWIKI: `personal/carrotcap/notes/umsh-tone-v2-pass-angle-completion-e2e-20260912.md` put/get/search PASS. 서버 reindex는 NOT_RUN.

## Tone V2 P04 pass_angle 52항목 전체 목차 — 2026-09-12

- source parser/hash/order, 52-item template/progress, bounded sibling prompt, sequential failure stop, isolated harness 및 persistence focused 53/53 PASS.
- 전체 회귀 `npm test`: 681/681 PASS, 101 suites.
- `node --test tone-v2/compile.test.mjs tone-v2/task-index.test.mjs`: 7/7 PASS.
- `npm run typecheck`, `npm run vercel-build`, `git diff --check`: PASS(CRLF 경고만 있음).
- 실제 provider: 고유 version 사전 `not-generated` PASS; 첫 항목 2회 실패; complete 0/52; 실패 뒤 호출 0건. 전체 실제 출력 acceptance FAIL.
- 독립 리뷰 Major 1건(52항목 전체 본문 누적)을 bounded carry로 수정. 정적 고객 자료의 7항목 표기는 P06 추적 항목이다.
- closure re-review: Approved, Critical/Major/Minor 0.
- ProjectOps preflight/rag/release PASS, test WARN(하위 package), implementation FAIL(`task-tone...` token 오탐). 배포·Production은 NOT_RUN.

## 2026-09-12 — P04 repair next-criterion retention

- 수동 TDD RED: `tests/unit/report-persistence.test.ts` 9/10 PASS, 새 마지막 단락 계약 assertion 1건 예상 실패.
- GREEN: 동일 파일 10/10 PASS. 실패 목록 중복 제거·거부 원문 비복사·기존 전체 불변식과 함께 마지막 2~4문장 단락, 대상/행동 문장 역할, 모호한 반례, 반환 전 내부 자기검사를 확인했다.
- 관련 회귀: tone-v2 generation + live harness + persistence 48/48 PASS.
- 전체 회귀: 682/682 PASS, 101 suites, 125249.7948ms.
- compiler/task 7/7, typecheck, Vercel build, diff check PASS.
- 실제 provider: 고유 version 사전 `not-generated`; 합성 첫 항목이 attempt 1에서 complete/replay PASS, 1/52. 후속·limit 밖 호출 0건. repair 경로는 발생하지 않아 NOT_RUN이다.
- ProjectOps: preflight/rag/release PASS; implementation의 `task-tone` 식별자 오탐은 task-scoped boundary scan 0건으로 보완; test mode의 CreamAI 하위 package 경고는 저장소 루트 결과로 보완했다.
- closure re-review: Approved with comments, Critical 0 / Major 0. 이전 52항목 실패 기록이 이 섹션에 섞였다는 Minor는 원래 섹션으로 이동해 해소했다.

## Tone V2 P04 pass_angle 첫 항목 품질 교정 — 2026-09-12

- RED→GREEN: 첫 `pass-angle-verdict`만 정확한 상징 경계·장면·다음 기준·한자 분리 계약을 받으며 후속 항목에는 누출되지 않는다.
- 격리 live 하네스: `--limit=1` 범위를 검증하고 제한 밖/최초 실패 뒤 호출을 0건으로 강제한다.
- focused generation/harness/persistence 48/48 PASS; 전체 `npm test` 682/682, 101 suites PASS.
- compiler/task index 7/7, typecheck, Vercel build, diff check PASS(CRLF 경고만 있음).
- actual provider: 고유 version 사전 `not-generated`; 첫 항목 2회 실패; complete 0/52; `attemptedAfterFailure=0`; `attemptedOutsideLimit=0`.
- business acceptance FAIL: 시도 2가 시도 1에서 통과한 다음 기준·한자 분리 불변식을 보존하지 못했다. 추가 live 호출은 다음 승인 Task로 분리했다.

## Tone V2 P04 repair 불변식 보존 — 2026-09-12

- RED: 기존 repair 메시지는 문단·한자 규칙만 포함해 9/10 PASS, 새 전체 불변식 assertion 1건 FAIL.
- GREEN: 현재 실패 목록과 함께 직접 답·근거 경계·가상 장면·다음 기준·말투·안전·수치·내부 필드·코퍼스·형제 고유성을 재고지한다. 거부 원문 marker는 메시지에 포함되지 않는다.
- focused report persistence 10/10, related generation/harness/persistence 48/48 PASS.
- 전체 `npm test` 682/682, 101 suites; compiler/task 7/7; typecheck, Vercel build, diff check PASS.
- actual provider: 고유 version 사전 `not-generated`; attempt 1 paragraph-only FAIL; attempt 2 nextCriterion-only FAIL; complete 0/52; 후속·제한 밖 호출 0.
- business acceptance FAIL: 체크리스트만으로는 이전 통과 nextCriterion 보존이 실출력에서 보장되지 않았다. gate·모델·재시도는 변경하지 않았다.
# 2026-09-12 — task-tone-v2-p04-pass-angle-full-outline-continuation

- Saved replay PASS: 2/52 persisted; item 1 preserved, item 2 complete/replay PASS, first failure order 3, items 4–52 attempts 0.
- Live continuation: business acceptance FAIL at 2/52; item 3 second attempt failed `nextCriterion`; attempted after failure 0 and outside limit 0.
- Focused 48/48 PASS; compiler/task 7/7 PASS; full 682/682 PASS across 101 suites (117317.5782ms).
- Typecheck, Vercel build, diff check PASS; boundary-aware secret scan 0 hits.
- ProjectOps nested-package test mode WARN is superseded by the repository-root full test. CreamWIKI put/get/exact-title search PASS.

## 2026-09-13 — task-tone-v2-p04-comparative-next-criterion-diagnosis

- Planned: immutable record/hash check, stored attempt full-review replay, sentence-level nextCriterion trace, existing positive/negative fixture comparison, focused tests, no provider calls, no product mutation.
- Result: stored exact false reproduced; standard-action-only false; object-particle-only false; both standardized true; targetless/vague/negated false.
- Focused `tone-v2-generation` 35/35 PASS; compiler/task 7/7 PASS; record SHA-256 unchanged; provider calls 0; product-code changes 0.

## 2026-09-13 — task-tone-v2-p04-comparative-next-criterion-recognition

- Planned RED A: standard object target + safe comparison `해봐` morphology must fail before implementation.
- Planned RED B: subject-marked observable target clause + currently recognized action must fail before implementation.
- Planned negative controls: targetless, vague, negated, past/perfect, and unsafe exam/study abandonment remain false.
- Planned immutable replay: saved item-3 attempt 2 becomes nextCriterion PASS while record SHA-256 and historical failed state remain unchanged.
- RED observed: 35 PASS / 3 expected FAIL, independently covering action morphology, subject target grammar, and the combined positive path.
- 첫 독립 리뷰 RED: 시간·기점 표현 대상화와 띄어 쓴 과거/완료 보조용언 오탐을 38 PASS / 2 FAIL로 재현했다.
- 최종 GREEN: focused 40/40, related Tone V2 45/45, compiler/task 7/7, full 687/687 across 101 suites, typecheck/Vercel build PASS.
- 저장 재생 4/4 PASS 및 raw-file SHA-256 불변. 독립 closure re-review Approved, Critical/Major/Minor 0. ProjectOps review PASS.

## Planned — pass_angle item 3 recovery (2026-09-13)

- RED: valid saved failed attempt is not currently promotable without a new generation call.
- Controls: missing/malformed/wrong-id raw, failed full review, incomplete predecessor, active lease, non-failed section, and repeated/concurrent recovery fail closed or no-op.
- Isolated record: item 3 only becomes complete; item 1–2, all attempts/raw hashes, item 4–52, identities, and provider-call count remain unchanged.
- Final: focused/related/compiler/task/full/typecheck/build/diff/credential checks and independent review.

## 2026-09-13 — task-tone-v2-p04-pass-angle-item3-recovery

- RED: recovery export absent, 0/1 as expected. Initial GREEN 12/12; reviewer-requested malformed and expired lease coverage produced final focused 13/13 and related 53/53.
- Isolated recovery: revision 18→19 exactly once across two concurrent and one repeated call; progress 2/52 failed→3/52 generating; provider calls 0.
- Immutable proof: identities, item 1–2, attempt array/raw hashes, and item 4–52 hashes unchanged; later attempt count 0.
- Final: compiler/task 7/7, full 690/690 across 101 suites, typecheck, Vercel build, standard 3/52 production-review replay PASS.
- ProjectOps nested-package test WARN is superseded by the repository-root suite. Independent review Approved with comments, Critical/Major 0.

## Planned — pass_angle resume from item 4 (2026-09-13)

- Precondition: exact existing record is `generating`, progress 3/52, items 1–3 replay PASS, items 4–52 pending with zero attempts.
- Immutable boundary: record/result IDs and full item 1–3 section hashes must remain unchanged.
- Live continuation: first attempted section is order 4; sections are attempted only in order; first unresolved failure stops all later calls.
- Evidence: provider calls/tokens, attempt hashes, completed/failed state, production replay, and no post-failure/out-of-range attempts without storing raw prose or secrets.
- Final: relevant focused tests, compiler/task, full suite, typecheck, Vercel build, diff, credential scan, and independent review.
- Immutable replay: density 4/4 PASS; record/section remain `failed`, attempts remain 2, raw-file SHA-256 unchanged.

## 2026-09-13 — pass_angle 52-item completion

- Live isolated record: exact orders 4–52 completed through stop/diagnose/fix/recover checkpoints; final status 52/52 complete and production-equivalent replay 52/52 PASS.
- Immutable proof: report/result IDs and item 1–3 prose hashes unchanged; no attempt occurred after an unresolved failure.
- Closure-review RED/GREEN: marker-only examples fail scene recognition; saved recovery uses predecessors only and rejects changed successors; no-failure checker requires the complete requested prefix; `아침부터 확인해` 같은 시간 기점은 행동 대상으로 인정하지 않는다.
- Final focused generation/persistence 68/68; serial full repository 705/705 across 101 suites; typecheck and Vercel build PASS. A parallel run's one Windows temp cleanup EPERM was non-functional: the file passed 10/10 alone and the serial full rerun passed 705/705.
- Independent closure r9: Approved, Critical/Major/Minor 0.
- Tracked evidence contains hashes/status/usage only, with no provider prose or secret. Commit/push/deploy/Production NOT_RUN.

## 2026-09-13 — quit_fortune 48-item outline

- RED: supplied source contract was 48 items while runtime and stored skeleton exposed 30; direct-reading coverage also reported 41 missing titles.
- GREEN: exact source split 10/10/9/9/10, total 48, exact order and unique runtime IDs PASS. All 48 titles own direct grounded readings and 48 distinct scene paragraphs.
- Persistence: a fresh paid record exposes 48 immutable pending sections with empty hook/body and generation IDs; no provider prose is prefilled.
- Final focused: 9/9 PASS. Full repository: 708/708 across 101 suites. Vercel build/typecheck PASS.
- Independent review: Approved with comments, Critical/Major 0. Sole Minor stale-title disclaimer was fixed and covered by a regression assertion.
- Provider/Production/deployment: NOT_RUN by Task boundary.

## 2026-09-13 — quit_fortune 48-item provider generation

- Actual configured provider, synthetic isolated record: exact 48/48 complete; production-equivalent replay 48/48 PASS; first unresolved failure after-call count 0; outside-limit attempt count 0.
- Evidence is sanitized to hashes/status/statistics; provider prose, secrets, and personal data are absent.
- Post-review RED/GREEN: retry/recovery with an incomplete requested prefix throws; complete prefix passes; an unresolved failure remains a diagnostic fail-closed state. Ordinary `고도화` passes while actual terrain label `고도` is rejected.
- Focused suite: 103/103 PASS. Full repository: 719/719 PASS across 101 suites (137984.4121ms).
- `npm run typecheck` PASS. `npm run vercel-build` PASS (126 FAQs, 19 sitemap URLs, SEO check PASS).
- Independent re-review: Approved with comments; Critical/Major/Minor 0. ProjectOps preflight/implementation/test/review/rag/release harnesses PASS.
- Deployment, Production, and operating customer-data mutation: NOT_RUN.

## 2026-09-13 — quit_fortune corpus/RAG release candidate

- RED: active registry still selected 2.0.0; semantic review and release artifacts were absent; active/stored snapshot retrieval and prompts were not version-separated; invalid snapshot hashes were accepted.
- GREEN: active 2.1.0 and rollback 2.0.0 selection, 12/12 semantic boundaries, active/old retrieval separation, section prompt pinning, saved-attempt review pinning, vector isolation, hash mismatch fail-closed and candidate manifest all pass.
- Task-specific: 8/8 PASS.
- Related RAG: 41/41 PASS.
- Full repository: 727/727 PASS across 102 suites (`npm test`).
- Typecheck and Vercel build: PASS (`npm run vercel-build`).
- Codex closure review: Approved with comments; Critical/Major/Minor 0.
- ProjectOps: preflight/review/rag/release PASS. Nested `CreamAI` test harness WARN is superseded by root 727/727; implementation scan FAIL is the known `task-tone-*` identifier false positive, with no credential stored in task artifacts.
- 2026-09-13 money-save corpus release candidate: RED 1/8→GREEN 8/8; related RAG/report persistence/content guards 74/74; serial full 735/735 across 103 suites; `npm run typecheck` PASS; `npm run vercel-build` PASS; deterministic corpus/review/manifest hashes PASS; task-boundary credential scan 0 findings. Provider-output evaluation NOT_RUN by scope.
- 2026-09-13 match-couple corpus release candidate: RED→GREEN 8/8; related RAG/report persistence/content guards 74/74; serial full 743/743 across 104 suites; typecheck and Vercel build PASS; deterministic corpus/review/manifest hashes PASS; task-boundary credential scan 0 findings. Provider-output evaluation NOT_RUN by scope.
- 2026-09-13 marry-match corpus release candidate: RED 5/8→7/8→GREEN 8/8; related RAG/report persistence/content guards 74/74; serial full 751/751 across 105 suites; typecheck and Vercel build PASS; deterministic corpus/review/manifest hashes PASS; task-boundary credential scan 0 findings. Provider-output evaluation NOT_RUN by scope.
- 2026-09-13 today-fortune corpus release candidate: RED 1/8→6/8→7/8→GREEN 8/8; related RAG/report persistence/content guards plus deterministic daily tests 82/82; serial full 759/759 across 106 suites; typecheck and Vercel build PASS; deterministic corpus/review/manifest hashes PASS; task-boundary credential scan 0 findings. Daily renderer unchanged and provider-output evaluation NOT_RUN.
- 2026-09-13 love-again corpus release candidate: RED 1/8→GREEN 8/8; related RAG/report persistence/content guards 88/88; serial full 791/791 across 110 suites; typecheck and Vercel build PASS; deterministic corpus/review/manifest hashes PASS; task-boundary credential scan 0 findings. Provider-output evaluation and Production NOT_RUN by scope.
- 2026-09-13 love-spouse corpus release candidate: RED 1/8→GREEN 8/8; related RAG/report persistence/content guards 88/88; serial full 799/799 across 111 suites; typecheck and Vercel build PASS; deterministic corpus/review/manifest hashes PASS. Provider-output evaluation and Production NOT_RUN by scope.

## 2026-09-13 — couple_signal corpus 2.1.0

- RED: 1/8 pass, 7/8 fail before candidate artifacts and registry activation.
- GREEN: focused 8/8; related relationship/RAG/persistence 147/147.
- Regression: 839/839 across 116 suites; typecheck PASS; Vercel build PASS (126 FAQs, 19 sitemap URLs, SEO checks).
- Deterministic builder: candidate and semantic-review hashes identical across two runs.
- Provider/Production/customer-data checks: NOT_RUN by scope.
## 2026-09-13 — lucky_color corpus 2.1.0 verification

- Semantic review: 24/24 PASS.
- Focused TDD: RED 1/8, GREEN 8/8.
- Related RAG/report/content suite: 147/147 PASS across 13 suites.
- Full repository: 847/847 PASS across 117 suites.
- `npm run typecheck`: PASS.
- `npm run vercel-build`: PASS; 126 FAQs, 19 sitemap URLs and SEO checks.
- Deterministic replay: candidate and review hashes identical across two runs.
- Candidate SHA-256: `ad21c843643ed77301d15fe1e48c544fa0e86f89a40cc8de5ab0774d245b51f6`.

## 2026-09-13 — newyear_flow corpus 2.1.0 verification

- Semantic review: 10/10 PASS, including retrieval-topic review.
- Focused TDD: RED 1/8, GREEN 8/8.
- Related RAG/newyear/API/frontend/report suite: 218/218 PASS across 15 suites.
- Full repository: 855/855 PASS across 118 suites.
- `npm run typecheck`: PASS.
- `npm run vercel-build`: PASS; 126 FAQs, 19 sitemap URLs and SEO checks.
- Deterministic replay: candidate and review hashes identical across two runs.
- Candidate SHA-256: `af2de895d527ba666c0fea5508ad7cf69f298a4f13647e425b77e348e83a3419`.

## 2026-09-13 — wedding_day corpus 2.1.0 verification

- Semantic review: 6/6 PASS.
- Focused TDD: RED 1/8, GREEN 8/8.
- First related run: 231/232; customer prose exposed a negated internal date-selection term.
- Fixed terminology and reran related RAG/wedding/API/privacy/report suite: 232/232 PASS across 23 suites.
- Full repository: 863/863 PASS across 119 suites.
- `npm run typecheck`: PASS.
- `npm run vercel-build`: PASS; 126 FAQs, 19 sitemap URLs and SEO checks.
- Deterministic replay: candidate and review hashes identical across two runs.
- Candidate SHA-256: `bf49f10f68abf3aef33040de73ebc8297339dcd47e2f80a054747ef4d82044f4`.
- 2026-09-13 job_choice corpus/RAG candidate: RED 1/8 → GREEN 8/8; related 217/217 across 16 suites; full 871/871 across 120 suites; typecheck, Vercel build and deterministic SHA-256 PASS.
- 2026-09-13 love_this_year corpus/RAG candidate: RED 2/9 → GREEN 9/9; related 238/238 across 28 suites; full 880/880 across 121 suites; typecheck, Vercel build and deterministic SHA-256 PASS.

## 2026-09-13 — all-service corpus release evaluation verification

- Focused TDD: RED 0/7 because aggregate artifacts did not exist; GREEN 7/7.
- Related corpus/RAG/prompt/persona/snapshot suite: 279/279 PASS across 33 reported suites.
- Full repository: 887/887 PASS across 122 suites.
- `npm run vercel-build`: PASS; 126 FAQs, 19 sitemap URLs, SEO checks and typecheck PASS.
- Deterministic replay: aggregate manifest SHA-256 `2474ddf6ef112cc643234b703752f831951f0b45228b08627dac0ab0f805a4fc`; assessment SHA-256 `ca2658521ae3caf45ce96f13e788c2c2228b5ce44d9c977a672ed7054d91f266`, unchanged across two runs.
- Decision contract: corpus 20/20; provider prose 0/20; full-outline independent review 1/20; visual/render/mobile/print 0/20; release `NO_GO`.

## 2026-09-13 — lucky_color full-outline provider evidence verification

- Source contract: 3 supplied files, exact SHA-256 values, six groups and 24 ordered items PASS.
- Fresh isolated synthetic generation: 24/24 complete; 42 attempts; production-equivalent replay 24/24; first unresolved failure none; calls after failure/outside limit 0.
- Focused and related verification: 97/97 PASS.
- Full repository: 894/894 PASS across 122 suites.
- `npm run typecheck`: PASS.
- `npm run vercel-build`: PASS; 126 FAQs, 19 sitemap URLs and SEO checks.
- Credential boundary: task-scoped scan 0 findings.
- Aggregate: full-outline independent review 2/20; release remains `NO_GO`.

## task-tone-v2-p04-newyear-flow-full-outline-evidence — 2026-09-13

- Source/runtime/harness focused contract: PASS (8/8).
- Candidate plus aggregate focused suite: PASS (23/23 after expected coverage changed from 2/20 to 3/20).
- Full repository tests: PASS (897/897, 122 suites).
- TypeScript: PASS (`npm run typecheck`).
- Vercel build: PASS (`npm run vercel-build`; 126 FAQs, 19 sitemap URLs, SEO checks).
- Provider result/replay: PASS (36/36); tracked evidence contains no provider prose.

## task-tone-v2-p04-wedding-day-full-outline-evidence — 2026-09-13

- Source/runtime/harness contract: RED 0/3 → GREEN 6/6 including Wedding scene and polite-action regression cases.
- Focused and related verification: 132/132 PASS.
- Fresh isolated provider result: 20/20 complete; stored-snapshot replay 20/20 PASS.
- Full repository: 903/903 PASS across 122 suites.
- `npm run typecheck`: PASS.
- `npm run vercel-build`: PASS; 126 FAQs, 19 sitemap URLs and SEO checks.
- Aggregate: full-outline independent review 4/20; release remains `NO_GO`.

## task-tone-v2-p04-wedding-day-visual-render-evidence — 2026-09-13

- RED visual contract: 0/3 before the count, local actual-record QA server and print/reflow contract were implemented.
- Related release, RAG, reader and visual contract suite: 71/71 PASS.
- Real-reader iteration: desktop 20/20 and exact 390px mobile 20/20 PASS; navigation 5/5 PASS.
- Print: 20/20 documents structurally valid and six representative pages visually accepted after hiding fixed report controls in print.
- Full repository: 906/906 PASS across 122 suites.
- `npm run typecheck`: PASS.
- `npm run vercel-build`: PASS; 126 FAQs, 19 sitemap URLs and SEO checks.
- Deterministic replay: tracked evidence, Wedding candidate, aggregate manifest and assessment hashes unchanged across rebuild.
- Aggregate: visual/render/mobile/print evidence 1/20; release remains `NO_GO`.

## task-tone-v2-p04-newyear-flow-visual-render-evidence — 2026-09-13

- RED visual contract: 1/3 passed and 2/3 failed before the read-only QA server and print/mobile contract were implemented.
- Related release, reader, outline and visual suite: 75/75 PASS.
- Real-reader iteration: desktop 36/36 and exact 390px mobile 36/36 PASS; 10 category groups, 6–9 rendered paragraphs per section, zero content or overflow failures.
- Navigation/accessibility: all disclosures opened by click; direct section and immutable link passed; keyboard Enter/focus outline passed; 52 visible controls and zero controls below 24px.
- Print: one 36-page document, 36/36 titles, answers and actions, zero blank pages, no fixed flag or app navigation; pages 1, 18 and 36 visually accepted.
- Deterministic outputs: candidate corpus, semantic review, New Year release, aggregate release and assessment hashes reproduced exactly.
- Full repository: 910/910 PASS across 122 suites.
- `npm run typecheck`: PASS.
- `npm run vercel-build`: PASS; 126 FAQs, 19 sitemap URLs and SEO checks.
- Aggregate: visual/render/mobile/print evidence advanced from 1/20 to 2/20; release remains `NO_GO`.

## task-tone-v2-p04-quit-fortune-visual-render-evidence — 2026-09-13

- RED visual contract: 2/3 passed before the loopback-only actual-record QA server was implemented; GREEN 3/3.
- Focused candidate/aggregate/visual suite: 18/18 PASS.
- Related Quit Fortune, reader and release suite: 72/72 PASS.
- Real-reader iteration: desktop 48/48 and exact 390px mobile 48/48 PASS; 10 groups, 5–7 rendered paragraphs per section and zero content or horizontal-overflow failures.
- Navigation/accessibility: all disclosures, direct section, immutable address and keyboard Enter passed; zero visible controls below 24px.
- Print: one 48-page document, 48/48 titles and one-line answers, zero blank pages and no fixed flag or home navigation; pages 1, 24 and 48 passed visual review.
- Deterministic replay: Quit Fortune candidate, aggregate manifest and assessment hashes were byte-identical across five rebuilds.
- Full repository: 916/916 PASS across 122 suites; `npm run typecheck` and `npm run vercel-build` PASS.
- Aggregate visual/render/mobile/print evidence advanced from 3/20 to 4/20; release remains `NO_GO`.

## task-tone-v2-p04-pass-angle-2-1-full-outline-generation — 2026-09-13

- Fresh isolated provider result: 52/52 complete in source order; 112 attempts, 12 recovered sections, no unresolved failure and no attempt outside the requested limit.
- Stored corpus: `pass-angle-service` 2.1.0, SHA-256 `44ab5c364540b7a943ca7739bd7f176fd45758973e3804b39ac481c8c2c0d96f`; production-equivalent stored-snapshot replay 52/52 PASS.
- Integrity: final record SHA-256 `5fc40af448836d7084919d3fc9afba7199cbe47a3d88f656115370845633e7fa`; ordered accepted-prose SHA-256 `a25f7afd69e0417350600cbced7d60c1ee015bd276a3dc8f758e12488e9c007e`.
- Focused generation/release/aggregate verification: 92/92 PASS; release-focused subset 18/18 PASS.
- Full repository: 930/930 PASS across 122 suites.
- `npm run typecheck`: PASS.
- `npm run vercel-build`: PASS; 126 FAQs, 19 sitemap URLs and SEO checks.
- Deterministic candidate/review/release/aggregate rebuild: PASS.
- Aggregate full-outline independent review advanced from 4/20 to 5/20; visual evidence remains 4/20 and release remains `NO_GO`.

## task-tone-v2-p04-pass-angle-visual-render-evidence — 2026-09-13

- Visual contract: RED 2/3 before the loopback QA server, then GREEN 3/3; two discovered UI defects were fixed with regression assertions.
- Focused candidate/aggregate/visual suite: 19/19 PASS.
- Desktop and exact 390px mobile: 52/52 unique, non-empty sections; zero horizontal overflow; zero rendered controls below 44px; keyboard focus outline 2px.
- Print: 28 nonblank Letter pages; 52/52 section titles and one-line answers; no fixed chrome; all pages reviewed as a contact sheet with pages 1, 14 and 28 at full size.
- Full repository: 934/934 PASS across 122 suites.
- Typecheck, Vercel build and deterministic candidate/aggregate rebuild: PASS.
- Aggregate visual/render/mobile/print evidence advanced from 4/20 to 5/20; release remains `NO_GO`.

## task-tone-v2-p04-today-fortune-full-outline-evidence — 2026-09-13

- RED contract: 0/2 before evidence and release attachment; GREEN 2/2.
- Actual isolated deterministic record: 7/7 customer fields complete; same-KST-day identity and saved-body replay PASS.
- Branch coverage: 5/5 element relations and 12/12 birth-year zodiac branches PASS.
- Persona review: all title/summary/zodiac/work/money/relationship/caution/action text passes `today_fortune` tone review after fixing name honorific, polite endings and one unsupported fixed count.
- Focused release/evidence suite: 22/22 PASS; related persistence/reader/tone suite: 176/176 PASS.
- Full repository: 936/936 PASS across 122 suites.
- `npm run typecheck`: PASS.
- `npm run vercel-build`: PASS; 126 FAQs, 19 sitemap URLs and SEO checks.
- Deterministic candidate/review/release/aggregate rebuild: PASS.
- Aggregate: verified provider-output provenance 5/19, full-outline independent review 6/20, visual evidence 5/20; release remains `NO_GO`.
# Active verification — task-tone-v2-production-commit-deploy-20260913

- [x] Staged diff check and credential boundary scan — real-key formats 0; known submitted passwords 0
- [x] Full serial unit suite — 936/936, 122 suites
- [x] TypeScript typecheck — PASS
- [x] Vercel production build — PASS
- [ ] Vercel deployment readiness inspection
- [ ] `umsh.kr` production route smoke verification
- [x] RED: `vercel build --prod` rejects array-valued `functions.api/index.ts.includeFiles`
- [x] GREEN: string-glob contract passes focused test 60/60 and production build
