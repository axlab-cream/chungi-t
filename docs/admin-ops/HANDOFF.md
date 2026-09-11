# 운영 관리자 구축 — 실행 상태·인계 (living document)

## 이 파일이 존재하는 이유

`admin-ops-execution-pack/01-LLM-EXECUTION.md`는 작업마다 `20-HANDOFF.md`를 갱신하라고 지시한다.
그러나 같은 패키지의 `MANIFEST.json`은 21개 문서의 SHA-256을 담고 있어, 패키지 파일을 수정하면
무결성 검증이 깨진다(T01에서 실제로 `ALL OK, 21 files`를 확인해 근거로 사용했다).

결정: **패키지는 불변 명세로 보존하고, 인계 기록은 이 파일에서 관리한다.**
양식은 `20-HANDOFF.md`의 "에이전트 인계 양식"을 그대로 따른다.
이 편차는 의도적이며, 패키지를 수정해야 한다는 지시가 다시 확인되면 그때 MANIFEST를 함께 갱신한다.

## 전체 상태

- 기준일: 2026-09-10
- **기준 소스: 로컬 HEAD `dac3835` (`fix/umsh-qa-ux`) = 운영 배포 소스** (U1/U7 해소)
- 완료: T01, T02, T03, T04 (**M0 4개 Task 전부**. 단 M0 종료 게이트는 U13·U23·U25로 미완결)
- ready: **없음** — 사용자 결정 대기 (TASK-009 브랜드 표기, U10, ADR-0002, U22)
- 진행 중: TASK-009 `origin/main` 병합 — 1차 시도 후 abort, 해소 방침 확정 (BLOCKED)
- blocked: T05 (U2, U4, **U13, U23, U24, U25**) / T06 (U17) / T07 (U3) / T10 (U4, U18, U19, U24) / T14 (U20) / T15·T17·T19 (U21, U22)
- 미착수: T05~T38
- 운영 변경: 없음. 실 PG 결제/환불: 없음. 고객 데이터 export: 없음. 스키마 변경: 없음.

---

## T01 — 기준 소스·운영 차이 기록

- 작업일: 2026-09-10
- 작업자: Claude PM (CreamAI supervisor)
- 저장소 HEAD: `dac38355b5ef4bb5e91778fdcf458873fc63f29e` / 브랜치 `fix/umsh-qa-ux`
- 실행한 task ID: T01 (CreamAI `task-t01`)

### 변경 파일

생성:
- `docs/admin-ops/T01-baseline.md` — T01 산출물 본문
- `docs/admin-ops/HANDOFF.md` — 이 파일
- `docs/adr/ADR-0002.md` — 관리자 UI 배치·디자인 방향
- `CreamAI/backlog/task-t01.md`

변경:
- `plan.md` — admin-ops T01~T38 큐 추가, TASK-003을 PAUSED로 표기

프로덕션 소스(`src/`, `api/`, `vercel.json`, `package.json`) 변경 **없음**. T01은 조사 작업이다.

### 확인된 사실과 근거

| 사실 | 근거 |
| --- | --- |
| 패키지 21개 문서 SHA-256 전부 일치 | `MANIFEST.json` 대조 실행 |
| HEAD가 `origin/main` 대비 -20/+10 커밋 | `git rev-list --left-right --count origin/main...HEAD` → `20  10` |
| app.ts 등록문 145건 / 경로엔트리 286건 / `/api` 경로엔트리 39건 | `src/server/app.ts` 배열 등록 포함 재추출 |
| 패키지 "현재 확인된 API" 15개 **전부 실재** | `GET /api/report/:reportId`는 app.ts:2398 배열 등록, 별칭 `/api/reports/:reportId`, `verifySupabaseUser` 소유자 검증 |
| 패키지 미기재 실제 API 23건 | `docs/admin-ops/T01-baseline.md` §3.1 |
| `/admin` 경로 충돌 없음 | `'/admin` 등록 0건 |
| `express.static`이 683~684행. 마지막 등록문 아니며 fall-through함 | app.ts. 위험은 "경로에 실제 파일이 있으면 인증 없이 서빙" |
| `/api` 응답에 no-store + Vary 이미 적용 | app.ts:196 |
| `src/auth/admin.ts`의 `DEFAULT_ADMIN_EMAILS` 하드코딩 | env는 추가만 가능, 제거 불가 (주소는 문서에 옮기지 않음) |
| 로컬 주문 저장 모드 `memory`, `checkoutEnabled:false`, `testMode:false` | 로컬 `GET /api/payment/config` 실측. Development/Preview는 **미검증** |
| 운영 주문 저장 모드 `supabase` | `node scripts/check-integrations.mjs` |
| prompt 20키 / catalog 19키 / hidden 4건 | manifest·catalog·directory 실측 (E11, E12 확인) |
| 패키지 참조 WIKI 3문서 모두 존재, 최신 WIKI는 9/9 | `wiki/AIOS_KMS/` 50문서 |

### 신규 제안·미확정

- U1 기준 브랜치 확정 필요 (HEAD ≠ 운영). **T02·T03의 결과를 운영 현재값으로 쓰려면 선행 해소 필요**
- U2 개발·Preview 영속 저장소 부재. 해제 조건은 운영과 격리된 영속 저장소 + 접근 정책 검증
- U3 관리자 UI 단일 소스 위치 → ADR-0002로 제안(승인 대기)
- U4 운영 DB 스키마·grant·RLS 미확인
- U5 직원 MFA/재인증 지원 미확인
- U6 PG 취소 API 지원 미확인
- U7 운영 배포 커밋 미확인
- U8 20종 매핑 상세 미확인 (T02)
- U9 `authConfig().developmentReportAccess` 환경별 값 미확인 — 참이면 미로그인 리포트 접근 허용 (A33/A39 영향)

### 테스트 명령·결과

| 명령 | 결과 |
| --- | --- |
| `npm run typecheck` | PASS — 오류 0건 |
| `npm test` | PASS — 373/373, 29 suites |
| `node scripts/check-integrations.mjs` (운영) | 8 PASS / 2 FAIL (Inicis MID/SignKey, checkout enabled) |
| `node scripts/check-integrations.mjs --base http://localhost:8790` | 7 PASS / 3 FAIL (위 2건 + storage memory) |
| MANIFEST SHA-256 대조 | ALL OK (21 files) |

기존 실패는 결제(Inicis) 미설정 계열뿐이다. 이후 이 외의 실패는 신규 회귀로 취급한다.

### UI 검증 화면·폭

해당 없음 — T01은 조사 작업이며 UI를 만들지 않았다. 검증 폭 기준(1440/1280/768/390)은 ADR-0002 D5에 기록.

### 스키마 변경·복구

없음.

### 운영 반영 여부

없음. 커밋·푸시·배포를 하지 않았다. 작업 트리에 미커밋 상태로 남아 있다.

### 미완료와 해제 조건

- T05 이후 전체: U1(기준 브랜치), U2(영속 저장소) 해소 필요
- T07: U3(ADR-0002) 승인 필요

### 다음 ready task

**T02 — 20종 키·노출 매핑.** 경계: `src/payment/catalog.ts`, `src/server/service-directory.ts`, `prompts/services-manifest.json`.
T03·T04도 ready. T05는 blocked 유지 권고.

### 갱신한 WIKI

없음 — 사용자 승인 후 `wiki/AIOS_KMS/`에 T01 기록을 등록할 예정.

### Codex 리뷰

- 보고서: `CreamAI/logs/review/task-t01_admin-ops-t01-review.md`
- 결과: Critical 0 / Major 5 / Minor 4 — 전부 수용, 반려 0건
- 반영 내역 표: `docs/admin-ops/T01-baseline.md` §10
- 사용자 결정 대기: 패키지 `20-HANDOFF.md` 갱신 여부 (§11 선택지 A/B)

### 실행 명령 기록 (sanitized)

```
git rev-parse HEAD                                  -> dac38355b5ef4bb5e91778fdcf458873fc63f29e
git rev-list --left-right --count origin/main...HEAD -> 20      10
npm run typecheck                                   -> exit 0, 0 errors
npm test                                            -> 373 pass / 0 fail / 29 suites
node scripts/check-integrations.mjs                 -> 8 PASS / 2 FAIL
node scripts/check-integrations.mjs --base http://localhost:8790 -> 7 PASS / 3 FAIL
curl -s localhost:8790/api/payment/config           -> storage=memory checkoutEnabled=false testMode=false
MANIFEST.json SHA-256 대조                           -> ALL OK (21 files)
```

### 결과 보고 구분

- 코드작성: 없음
- 로컬검증: 수행 (typecheck / unit / 로컬·운영 check-integrations / 라우트 실측 / payment config 실측)
- 스테이징검증: 미수행
- 운영반영: 미수행

---

## T02 — 20종 키·노출 매핑

- 작업일: 2026-09-10
- 작업자: Claude PM (CreamAI supervisor)
- 저장소 HEAD: `dac38355b5ef4bb5e91778fdcf458873fc63f29e` / 브랜치 `fix/umsh-qa-ux` (= **운영 소스**)
- 실행한 task ID: T02 (CreamAI `task-t02`)

### 변경 파일

생성:
- `docs/admin-ops/T02-service-mapping.md` — T02 산출물
- `docs/admin-ops/production-source-of-truth.md` — U1/U7 해소
- `CreamAI/backlog/task-t02.md`

변경:
- `docs/admin-ops/T01-baseline.md` §2.1·§7 (U1 결론 정정)
- `status.md`, `tests.md` (V-022, V-024~V-030)

프로덕션 소스 변경 **없음**. 조사 스크립트는 프로젝트 밖 스크래치패드에서 실행했다.

### 확인된 사실과 근거

| 사실 | 근거 |
| --- | --- |
| 20종 누락 0건 | canonical 20 = manifest 20 = `prompts/services/*.md` 20 |
| payment catalog 19 / directory seeds 19 / hidden 4 / visible 15 | 소스 파싱 + `listServiceDirectory()` 런타임 |
| `cmdg → saju_master` alias 부재, `loadServiceSystemPrompt('cmdg')` THROW | 런타임 실측 |
| `serviceHrefForKey('saju_master')` → undefined | 런타임 실측 |
| `home` 정규화 방향이 축마다 반대 | `service-system.ts` vs `service-directory.ts` |
| returnPath ≠ landing href 8건 | catalog·directory 대조 |
| `PUBLICLY_DISABLED_PRODUCT_KEYS`가 빈 Set → 판매 19종 | app.ts:189, 1223, 1442 |
| `HOME_FIT_PUBLICLY_ENABLED` 하드코딩 `true` | app.ts:188 |
| S02 요구 필드 중 관리자 편집 가능 0개 | 필드별 소유자 표 (T02 §7) |
| **운영 = 로컬 HEAD** | 라이브 마커 3종 일치 + 배포 시각 +23초 (`production-source-of-truth.md`) |
| `origin/main` 20커밋 운영 미반영, 병합 충돌 24개 | `git merge-tree` dry-run |

### 신규 제안·미확정

- U10 hidden 4종의 신규 판매 허용 여부 (정책)
- U11 관리자 단일 서비스 식별자를 `canonicalKey`로 할지 (ADR)
- U12 `serviceHrefForKey('saju_master')` undefined가 보관함 링크 유실을 일으키는지 (T03에서 확인)
- U13 `origin/main` 20커밋 미반영 (병합 Task)
- U14 운영 배포가 CLI 로컬 배포로 보임, `README.md` 서술과 불일치
- U15 결혼택일 양쪽 독립 구현 (add/add)

해소: U1, U7

### 테스트 명령·결과

| 명령 | 결과 |
| --- | --- |
| `npm run check:service-contracts` | PASS (20개 서비스 계약 QA) |
| `listServiceDirectory()` | 15건 |
| `loadServiceSystemPrompt('cmdg')` | THROW (의도된 실패 케이스 확보) |
| `git merge-tree --write-tree HEAD origin/main` | exit 1, 충돌 24파일 |
| `curl umsh.kr/robots.txt` | HTTP 200 (437 bytes) — HEAD 전용 파일 |
| `curl umsh.kr/privacy` | title·css 마커가 HEAD와 일치 |
| `vercel inspect <prod> --scope ax-lab-cream` | `dpl_8GJ6…`, git 메타데이터 없음 |

### UI 검증 화면·폭

해당 없음 — 조사 작업.

### 스키마 변경·복구

없음.

### 운영 반영 여부

없음. `git fetch origin`과 `merge-tree` dry-run만 수행. merge·rebase·checkout·commit·push·deploy 없음.

### 미완료와 해제 조건

- U10 정책 결정 전 T22의 `availability` 정의를 확정할 수 없다
- U13 병합은 별도 Task. 미수행 시 분기가 계속 벌어진다
- T05는 U2(영속 저장소)로 여전히 blocked

### 다음 ready task

**T03 — 저장소 스키마·권한 조사.** 경계: `order-store`, `report-store`, `profile-store`.
T02가 넘기는 확인 요청: U12(저장된 report의 `context.serviceKey` 실제 분포),
주문 row의 `amount` 스냅샷 여부, `authConfig().developmentReportAccess` 환경별 값(U9).
U1 라벨 조건은 해제되었으므로 T03은 운영 기준으로 진행할 수 있다.

### 결과 보고 구분

- 코드작성: 없음
- 로컬검증: 수행 (매핑 전수 추출, 런타임 호출, 기존 검증기 실행)
- 운영검증: 수행 (라이브 마커 대조 — 읽기 전용 GET만)
- 운영반영: 미수행

---

## T03 — 저장소 스키마·권한 조사

- 작업일: 2026-09-10 / 작업자: Claude PM
- 저장소 HEAD: `dac38355b5ef4bb5e91778fdcf458873fc63f29e` / `fix/umsh-qa-ux`
- 실행한 task ID: T03 (CreamAI `task-t03`)

### 변경 파일
생성: `docs/admin-ops/T03-storage-schema.md`, `CreamAI/backlog/task-t03.md`
변경: `status.md`, `tests.md`(V-031~V-038), 이 파일
프로덕션 소스 변경 **없음**. 운영 DB 쿼리 **없음**.

### 확인된 사실과 근거
| 사실 | 근거 |
| --- | --- |
| orders `owner_id` = **uuid + FK(auth.users) on delete restrict** | `supabase-payment-orders.sql` |
| reports `user_id` = **uuid + FK on delete cascade** | `supabase-reports.sql` |
| 코드 `ensureDb()`는 둘 다 **TEXT**로 만든다 | `order-store.ts`, `report-store.ts` |
| profiles 정본 SQL **부재** | 루트에 .sql 2개뿐 |
| profiles는 **고객 accessToken + publishable 키**로 RLS 통과 | `profile-store.ts` |
| orders·reports는 **service_role**로 RLS 우회 | 두 스토어의 `supabaseHeaders()` |
| reports는 4개 모드 전부 `revision` CAS + 불변 필드 강제 | `report-store.ts:626,635,639,648,659` |
| orders는 상태 가드만, 직렬화·멱등키 없음 | `app.ts:1550`, `order-store.ts` |
| reports 분석 열 8개를 앱이 기록하지 않음 | INSERT/select 목록 전수 검색 |
| PG 승인 후 저장 실패를 담을 불확정 상태 없음 | `status` CHECK 6값 + `app.ts:1583` catch |
| 구형 payload 폴백 3종 + fixture | `report-store.ts:186,196,648`, `report-persistence.test.ts:102` |
| `developmentReportAccess` 술어 | `app.ts:927` |

### 신규 제안·미확정
U17(주문 직렬화), U18(분석열 미기입), U19(profiles 정본 SQL 부재),
U20(주문·프로필 memory 차단 부재), U21(REST upsert amount), U22(불확정 상태 부재).
U9 부분 해소. U12는 U4로 이관. U4 유지·강화(profiles grant/RLS 필수 확인).

### 테스트 명령·결과
| 명령 | 결과 |
| --- | --- |
| `npm test` (T01에서 실행, 구형 레코드 케이스 포함) | 373/373 PASS |
| `verify-payment-db.sql` / `verify-report-db.sql` | **미실행** (커버리지만 검토) |
| 운영 DB 스키마·grant 쿼리 | **미실행** (service_role 키 미보유) |

### UI 검증 화면·폭
해당 없음 — 조사 작업.

### 스키마 변경·복구
없음.

### 운영 반영 여부
없음. 커밋·푸시·배포·스키마 변경·운영 DB 쿼리·PG 거래 전부 미수행.

### 미완료와 해제 조건
- U22는 **TASK-007(결제 활성화)보다 앞서 해소**해야 한다
- U4(운영 스키마·grant, 특히 profiles)는 T10 착수 전 필수
- U17·U20은 T06·T14 착수 전 설계 결정 필요

### 다음 ready task
**T04 — 기존 회귀 기준 수집.** T01 §8에서 typecheck·unit·통합 baseline을 이미 수집했으므로
16-ACCEPTANCE의 재사용 테스트 목록과 대조해 확정하는 작업이 된다. 어떤 U 항목에도 막히지 않는다.

### 결과 보고 구분
- 코드작성: 없음 / 로컬검증: 부분(선행 Task 결과 활용) / 운영검증: 없음 / 운영반영: 없음

---

## T04 — 기존 회귀 기준 수집 (M0 마지막)

- 작업일: 2026-09-10 / 작업자: Claude PM
- 저장소 HEAD: `dac38355b5ef4bb5e91778fdcf458873fc63f29e` / `fix/umsh-qa-ux`
- 실행한 task ID: T04 (CreamAI `task-t04`)

### 변경 파일
생성: `docs/admin-ops/T04-regression-baseline.md`, `CreamAI/backlog/task-t04.md`
변경: `status.md`, `tests.md`(V-039~V-048 + 회귀 오라클 조건), `plan.md`, 이 파일
프로덕션 소스 변경 **없음**. 부작용: `qa:all-services` 실행으로 `output/` 산출물 생성(미추적).

### 확인된 사실과 근거
| 사실 | 근거 |
| --- | --- |
| typecheck 0 오류 / `npm test` 373-373 (2회) | 직접 실행 |
| 같은 60개 파일을 명시 목록으로 실행하면 365/8 (2회) | 직접 실행. 원인 미특정 → U24 |
| 실패 8개 소속: `report-content-guards` 1 / `report-generator` 2 / `report-persistence` 5 | Codex 검증 |
| `check:*` 16개 → 4 PASS / 12 FAIL | 전수 실행 |
| 11개는 stale guard (리팩터 `fdc80f2` 후 심볼 변경, 수정본은 `origin/main`) | 가드별 옛/신 심볼 + 우리 코드 존재 표 (11개 전수) |
| `cat`만 실제 코드 차이 — `retrieveCategoryOwnChunks` HEAD 0 / origin/main 2 | grep 대조 |
| `check:*` diff는 12개 파일 (wedding 포함, 단 wedding은 통과) | `git diff --stat` |
| `qa:all-services`는 정적이며 PASS | import 목록 확인 + 실행 |
| `check:production-source` exit 1 (수동 preflight) | 실행 |
| 지정 재사용 테스트 9개 전부 존재·통과 | 파일 확인 + `it()` 제목 추출 |
| A01~A40: 덮임 2 / 부분 17 / 없음 21 | 매핑표 |

### 신규 제안·미확정
- **U23** `cat-service.ts`의 자기 코퍼스 우선 검색 부재 → **병합/출시 차단 항목**
- **U24** unit 결과의 실행 형태 의존 (원인 미특정)
- **U25** `check:*` 11개 stale guard (수정본은 `origin/main`)

### 테스트 명령·결과
`docs/admin-ops/T04-regression-baseline.md` §8의 고정 baseline 참조.
환경·manifest 해시까지 함께 고정했다.

### UI 검증 화면·폭
해당 없음 — 조사 작업.

### 스키마 변경·복구
없음.

### 운영 반영 여부
없음. `check:production-source`가 `git fetch`를 수행한 것 외에 git 변경 없음
(merge·rebase·checkout·commit·push·deploy 전부 미수행). Codex도 fetch는 수용 가능으로 판정.

### 미완료와 해제 조건
**M0 종료 게이트 미완결.** U13(병합)·U23(cat)·U25(stale guard)가 남아 있고
세 항목 모두 `origin/main` 병합으로 수렴한다. Codex도 "M0 완료 선언 불가"로 동일 판정.

### 다음 ready task
**없음.** T05는 U2·U4·U17·U3에 더해 T04가 추가한 U13·U23·U24·U25까지 선행이 필요하다.
다음 행동은 Task 실행이 아니라 **사용자 결정**이다 (U13 병합, U10 판매 정책, ADR-0002, U22 순서).

### 결과 보고 구분
- 코드작성: 없음 / 로컬검증: 전수 수행 / 운영검증: 없음 / 운영반영: 없음

---

## TASK-009 — `origin/main` 병합 1차 시도 (BLOCKED)

- 작업일: 2026-09-10 / 작업자: Claude PM
- 저장소 HEAD: `dac38355b5ef4bb5e91778fdcf458873fc63f29e` — **변경 없음**
- 실행한 task ID: TASK-009 (CreamAI `task-009`)

### 변경 파일
생성: `docs/admin-ops/TASK-009-merge-plan.md`, `CreamAI/backlog/task-009.md`
변경: `status.md`, `tests.md`(V-049~V-053), `plan.md`(TASK-011·TASK-012 신설), 이 파일
git: `backup/pre-merge-20260910` 브랜치 생성. **커밋·푸시·배포 없음.**
수행한 git 작업은 `fetch`, `merge --no-commit`, `merge --abort` 뿐이다.

### 확인된 사실과 근거
| 사실 | 근거 |
| --- | --- |
| 미추적 29건과 incoming 216건의 충돌 0건 | 교집합 검사 |
| 수정 tracked 2건(`.env.example`, `README.md`)이 incoming에 없음 | `git diff --name-only HEAD..origin/main` |
| 충돌 24건 구성 | 결혼택일 11 / 정책 5 / 테스트 3 / app.ts 1 / registry 1 / portal.js 1 / couple 02 1 / check-wedding 1 |
| `registry.json` 양쪽 packs 28개 id 완전 동일 | JSON 파싱 후 집합 비교 |
| 정책 페이지는 OURS가 기능 우위 (nav에 `/about`·`/faq`) | 두 버전 nav 비교. 두 페이지는 우리 브랜치에만 존재 |
| 결혼택일은 어느 쪽도 상위집합 아님 | 선언 목록 대조 (OURS 597줄 / THEIRS 727줄) |
| THEIRS만: `RAG_FIELD_LABEL`, `chunkMeaning`, `compact`, `RELATION_HANJA_KO`, `parseTime.known` | 동일 |
| OURS만: `birthTimeKnown`을 `sideView`·`judgeCandidate`까지 전달 | 동일 |
| `cat-service.ts`는 충돌 없음 → U23 해소 예상 | 충돌 목록 |
| 운영 `/api/payment/config`가 내부 환경변수 이름 노출 | `curl` 실측 |

### 신규 제안·미확정
- 브랜드 표기 결정 (사용자) → TASK-011로 분리 권고
- TASK-012: 결제 설정 문구 정보 노출 (병합으로 자동 해소)

### 테스트 명령·결과
병합을 완료하지 않았으므로 병합 후 검증은 **전부 NOT_RUN**이다.
병합 전 baseline은 T04 §8이 정본이다.

### UI 검증 화면·폭
해당 없음.

### 스키마 변경·복구
없음.

### 운영 반영 여부
없음.

### 미완료와 해제 조건
- 브랜드 표기 결정 (선택지 A/B/C — 권고 C)
- 결정 후 `docs/admin-ops/TASK-009-merge-plan.md` §5 순서로 한 번에 실행

### 다음 ready task
**없음.** 사용자 결정 대기.

### 결과 보고 구분
- 코드작성: 없음 / 로컬검증: 병합 안전성·충돌 분석만 / 운영검증: `/api/payment/config` 조회(GET) / 운영반영: 없음

---

## T16 — PG 조회·취소 sandbox adapter 조사·구현

- 작업일: 2026-09-11
- 작업자: Codex
- 실행한 task ID: T16

### 확인된 계약과 근거

| 기능 | INIAPI v2 sandbox URL | 요청 핵심 | 정상/중복 결과 |
| --- | --- | --- | --- |
| 거래 조회 | `https://stginiapi.inicis.com/v2/pg/inquiry` | `type=inquiry`, `data.tid` 또는 `data.oid`, `SHA-512(INIAPIKey + mid + type + timestamp + data)` | 조회 성공은 `SUCCESS`; 거래 상태는 `0/1/9` 등으로 전달 |
| 전액 취소 | `https://stginiapi.inicis.com/v2/pg/refund` | `type=refund`, `data={tid,msg}`, 같은 v2 SHA-512 형식 | 성공 `00`; 기취소는 `500626`으로 terminal duplicate |

근거는 KG 이니시스 공식 [거래조회 매뉴얼](https://manual.inicis.com/pay/etc-inquiry.html), [취소 매뉴얼](https://manual.inicis.com/inipaypro/cancel.html), [TLS 1.2 테스트 매뉴얼](https://manual.inicis.com/download/TLS12_test_manual.pdf)이다. INIAPI Key 값, 실제 TID, 고객 정보는 기록하지 않았다.

### 변경과 검증

- `src/payment/inicis.ts`에 `createInicisSandboxAdapter`를 추가했다. 이 adapter는 전역 `fetch`를 사용하지 않고 호출자가 주입한 transport만 쓴다. 따라서 이 Task에서 production PG 호출, 취소, 주문 상태 변경, 금융 원장/환불 저장은 발생하지 않는다.
- `tests/unit/inicis-adapter.test.ts`는 공식 v2 JSON body 및 SHA-512, KST timestamp, timeout, 기취소 중복, PG 성공 뒤 외부 저장 실패, 동시 `tid`/`oid` 입력 거부를 고정한다.
- `npx tsx --test --test-concurrency=1 tests/unit/inicis-adapter.test.ts tests/unit/payment.test.ts`: 9/9 PASS.
- `npm run typecheck`: PASS.
- KMS 기록: `personal/carrotcap/notes/umsh-inicis-sandbox-adapter-20260911.md`.

### 미완료와 해제 조건

- T17 전에는 실제 INIAPI Key 계약/운영 egress 허용 여부, 환불 intent 영속화, 요청·승인자 분리, 금액 예약, 결과 대사 경로가 없다. 이 상태에서 live cancel을 연결하거나 실행하면 안 된다.
- timeout은 `INICIS_SANDBOX_TIMEOUT`으로만 분리하며, 성공/실패 상태나 환불 완료로 임의 투영하지 않는다.

### 다음 ready task

**T17 — 환불 요청·승인·실행.** 이 Task의 sandbox evidence adapter를 사용하되, 실제 실행은 독립 승인·영속 intent·대사 설계가 먼저 완성된 뒤에만 검토한다.
