# Plan

한 번에 하나의 Task만 실행한다. 사용자가 `다음`, `진행`, `Continue`를 입력할 때까지
다음 Task를 시작하지 않는다.

현재 주 작업 흐름은 `admin-ops-execution-pack`(운명상회 운영 관리자 구축)이다.
코드 리뷰는 Codex가 담당한다.

## A. 환경/기반 Task

| ID | Task | Purpose | Priority | Expected Files | Dependencies | Done Criteria | Verification | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TASK-001 | Define task | 사용자 요청을 검증 가능한 Task로 변환 | P0 | `goal.md`, `ROADMAP.md`, `plan.md` | User request | 범위·완료 기준·승인 게이트 확정 | Document review | DONE |
| TASK-002 | 프로젝트 분석 + 3서비스 연동 베이스라인 진단 | Git/Vercel/Supabase 상태를 근거와 함께 확정 | P0 | `CreamAI/reports/task-002_analysis.md` 외 | - | 세 서비스 판정 + 누락 항목 특정 | typecheck / test / check-integrations | DONE |
| TASK-003 | 로컬 `.env` 완결화 | Vercel 변수와 로컬 정합화, 누락 서버 키 보완 | P0 | `.env`(비커밋), `.env.example`, `README.md` | TASK-002 | 로컬에서 결제·유료 리포트 경로 재현 가능 | `check-integrations --base http://localhost:8790` | PAUSED |
| TASK-004 | Supabase CLI + migrations baseline | 루트 SQL을 migrations 히스토리로 편입 | P1 | `supabase/**` | TASK-003 + 안전 게이트 G1~G5 | baseline이 원격 히스토리에 applied | `supabase migration list` | BLOCKED |
| TASK-005 | GitHub Actions CI | push/PR에서 typecheck + test 자동 실행 | P1 | `.github/workflows/ci.yml` | TASK-002 | PR에서 CI 통과/실패 보고 | Actions run | TODO |
| TASK-006 | Vercel 환경별 변수 공백 보완 | Preview/Development 서버 키 정책 확정 | P2 | Vercel 설정, `docs/WORKFLOW.md` | TASK-003 | Preview에서 서비스 롤 경로 동작 | Preview `/api/health` | TODO |
| TASK-007 | 결제(Inicis) SignKey 설정 | `check-integrations` 결제 2건 FAIL 해소 | P2 | Vercel env(Production) | 사용자 자격 **+ U22 선행 해소** | `checkout enabled` PASS | check-integrations | BLOCKED |
| TASK-008 | 미커밋 산출물 정리 | 미추적 26항목 분류·커밋 | P2 | `.gitignore`, 커밋 `f9bcd17` | TASK-009 | 분류 완료·배포 게이트 통과 | `check:production-source` PASS | **DONE** |

### TASK-003 PAUSED 사유
`.env` 직접 쓰기가 글로벌 규칙(`.env*` 수정 금지 영역)으로 자동 차단되었고,
사용자 승인 확인 중에 작업 방향이 admin-ops로 전환되었다.
완료된 부분: `.env` 백업(스크래치패드), Vercel Development/Production pull 진단,
`.env.example` 보강, `README.md` 동기화 절차 문서화.
남은 부분: `.env`에 `UMSH_ADMIN_EMAILS` / `PAYMENT_TEST_MODE` / `PUBLIC_BASE_URL` 반영 (승인 대기).
이 잔여 항목은 admin-ops U2와 직접 연결된다.

### TASK-004 실행 전 안전 게이트 (Codex 리뷰 Major 반영, 필수)

원격 Supabase 스키마는 **이미 라이브**다. 아래 5개를 모두 충족하기 전에는
`supabase link` 이후의 어떤 원격 쓰기(`db pull`의 히스토리 기록, `migration repair`,
`db push`)도 실행하지 않는다.

- [ ] G1. 복구 가능성 확인: 검증된 백업 또는 PITR 복구 지점이 존재하고, 복구 담당자가 지정되어 있다.
- [ ] G2. 대상 확인: 링크된 프로젝트 ref와 환경이 `wdyzollywccgaepjeynu`(운영)임을 읽기 전용 명령으로 확인했다.
- [ ] G3. baseline 검토: 생성된 baseline 마이그레이션 SQL과 스키마 diff를 사람이 읽고 의도 외 변경이 없음을 확인했다.
- [ ] G4. dry-run 무변경: `supabase db push --dry-run`의 적용 대상이 0건이다.
- [ ] G5. 명시적 승인: 사용자가 원격 히스토리 쓰기에 대해 명시적으로 승인했다.

금지: `supabase db reset`(특히 `--linked`), dry-run 없는 `db push`,
검토되지 않은 `db diff` 결과를 마이그레이션으로 저장하는 행위.

### Android / Google Play 출시 게이트 (Codex 리뷰 Major 반영, 필수)

병합으로 두 번째 결제 경로(`/api/payment/google/verify`)와 Android 앱 셸이 들어왔다.
아래를 충족하기 전에는 **Play 결제 활성화와 Android 출시를 하지 않는다.**
(Express 라우트 자체는 정적 미들웨어보다 앞에 등록되어 도달 가능하다 — Codex 확인.)

- [ ] G6. **Play 토큰 재사용 차단.** 현재 검증은 check-then-write이고 `tid` unique 제약도
      트랜잭션도 없다. 같은 토큰을 동시에 검증하면 두 주문이 모두 읽기를 통과해
      **한 번의 구매로 두 주문이 열릴 수 있다.**
- [ ] G7. **불확정 상태 설계 (U22).** Play 경로도 acknowledge 성공 후 주문 저장이 실패하면
      결제 완료가 `ready`로 남는다. `status` enum에 불확정 상태가 없다는 T03의 결론이
      두 경로 모두에 걸린다.
- [ ] G8. **서명 지문 채우기.** `사주/.well-known/assetlinks.json`이 placeholder 상태여서
      App Links 검증이 불가능하다.
- [ ] G9. **기기·내부트랙 검증.** `android/app-shell/README.md`가 Android 빌드도
      기기/결제 복구 테스트도 수행되지 않았다고 스스로 밝힌다.

## B. 운영 관리자 구축 Task (admin-ops-execution-pack)

명세: `admin-ops-execution-pack/` (21문서, MANIFEST SHA-256 전부 일치 검증됨).
디자인 방향: `C:\Users\user\Desktop\preview.html` (SK매직몰 UI 레퍼런스) — `docs/adr/ADR-0002.md`.
상태 흐름: `todo → ready → in_progress → review → done`. 모의 데이터만 있는 API는 done 금지.

| pack | CreamAI id | 단계 | 우선 | 선행 | 작업 | 상태 |
| --- | --- | --- | --- | --- | --- | --- |
| T01 | task-t01 | M0 | P0 | - | 기준 소스·운영 차이 기록 | **DONE** (Codex 리뷰 반영 완료) |
| T02 | task-t02 | M0 | P0 | T01 | 20종 키·노출 매핑 | **DONE** |
| T03 | task-t03 | M0 | P0 | T01 | 저장소 스키마·권한 조사 | **DONE** |
| T04 | task-t04 | M0 | P0 | T01 | 기존 회귀 기준 수집 | **DONE** |
| T05 | task-t05 | M1 | P0 | T03,T04 | 직원 membership 및 RBAC | BLOCKED (U2 영속 저장소, U4 운영 스키마) |
| T06 | task-t06 | M1 | P0 | T05 | 감사 및 멱등 명령 기반 | BLOCKED (U17 — 주문 직렬화 설계) |
| T07 | task-t07 | M1 | P0 | T05 | 관리자 셸·라우터 | BLOCKED (U3 = ADR-0002 승인 대기) |
| T08 | task-t08 | M1 | P0 | T03,T05 | 주문 조회 adapter | TODO |
| T09 | task-t09 | M1 | P0 | T07,T08 | 주문 화면·교차 탐색 | TODO |
| T10 | task-t10 | M1 | P0 | T03,T05,T06 | 회원·리포트 조회 adapter | BLOCKED (U4, U18 분석열, U19 profiles SQL) |
| T11 | task-t11 | M1 | P0 | T07,T10 | 회원·리포트 상세 UI | TODO |
| T12 | task-t12 | M1 | P0 | T06,T07,T10 | CS 케이스 관리 | TODO |
| T13 | task-t13 | M1 | P0 | T06,T08,T10 | 통합 검색·읽기 홈 | TODO |
| T14~T21 | - | M2 | P0 | (pack) | 거래·복구 (outbox, 환불, 대사, 재시도, incident) | BLOCKED (U20, U21, U22) |
| T22~T30 | - | M3 | P1 | (pack) | 편집·지식 (CMS, 미디어, 코퍼스, 평가, release, 롤백) | TODO |
| T31~T35 | - | M4 | P1 | (pack) | 분석·개인정보 | TODO |
| T36~T38 | - | M5 | P0 | (pack) | 통합 안정화·인수·인계 | TODO |

### 기준 소스 확정 (U1/U7 해소, 2026-09-10)

**운영 = 로컬 HEAD `dac3835` (`fix/umsh-qa-ux`).** 실측 근거:
`docs/admin-ops/production-source-of-truth.md`.
운영 배포 `dpl_8GJ6WMBmoaBZeQy4YFQtcwZ8JeKZ`의 라이브 콘텐츠가 이 HEAD와 일치하며,
`vercel inspect`에 git 메타데이터가 없다(CLI 로컬 배포 — 2026-09-10 16:25 확정).

따라서 admin-ops는 **이 브랜치를 기준으로 진행한다.** T02·T03의 "운영 대조 미완료"
라벨 조건은 해제되었다. `README.md`의 "main push가 Production을 트리거한다"는 서술은
**사실이다**(16:25 시점 확인). 다만 CLI 배포가 그 경로를 우회할 수 있다는 점이
빠져 있었고, 그것을 보강했다(U14 정정 — TASK-018 §0).

`origin/main`의 20 커밋은 운영·로컬 모두에 없다. 병합은 **별도 Task**로 분리한다
(dry-run 충돌 24개, `wedding_day` add/add — U13/U15).

### 미확인 항목 (T01 산출)

| ID | 미확인 | 영향 | 해제 조건 |
| --- | --- | --- | --- |
| ~~U1~~ | ~~관리자 구현 기준 브랜치~~ | — | **해소** — 운영 = 로컬 HEAD 실측 확인 |
| U2 | 개발·Preview용 영속 주문 저장소 부재 (로컬 memory 실측, Dev/Preview 미검증) | T05, T08, T14 (A17) | 운영과 **격리된** 영속 저장소 + 접근 정책 검증 |
| U3 | 관리자 UI 위치·정적 자산 인증 순서 | T07 | ADR-0002 승인 |
| U4 | 운영 DB 실제 스키마·grant·RLS | T03, T05, T06 | T03 + TASK-004 안전 게이트 |
| U5 | 직원 인증 provider MFA/재인증 지원 | T05 | Supabase Auth 설정 확인 |
| U6 | PG 취소 API 지원·서명 규격 | T16~T19 | 이니시스 콘솔 확인 |
| ~~U7~~ | ~~운영 배포 현재 커밋 SHA~~ | — | **해소** — `dpl_8GJ6…`, 콘텐츠가 HEAD와 일치 |
| ~~U8~~ | ~~20종 canonical/payment/prompt/route 정합성~~ | — | **해소** — T02 완료. 누락 0건, alias 충돌 2건 검출 |
| **U17** | 주문 저장소에 직렬화·멱등키 없음 (상태 가드만 존재) | **T06**, T15, T17 (A09/A10) | `revision` 열 또는 `payment_operations` unique 설계 |
| **U18** | `cheongi_reports` 관리자 분석 열 8개를 앱이 기록하지 않음 | **T10**, T11 (S07) | 운영 null 집계 측정 + 쓰기 경로 연결/backfill 또는 별도 read model 결정 |
| **U19** | `cheongi_user_profiles` 정본 SQL 부재 | T10, TASK-004 | 스키마 파일 작성 또는 운영에서 추출 |
| **U20** | 주문·프로필 저장소에 운영 memory 차단 장치 없음 (reports만 있음) | **T14** (A17) | readiness 게이트 구현 |
| **U21** | REST upsert가 `amount`를 전체 row로 덮어씀 (관례 의존) | T15, T17 | upsert 본문에서 금액 제외 또는 전용 PATCH |
| **U22** | PG 승인 성공 후 저장 실패를 담을 불확정 상태가 enum에 없음 | **T15, T17, T19 (A12/A13)** 그리고 **TASK-007보다 선행** | enum 확장 또는 `payment_operations`/`financial_events` 분리 |
| **U23** | `src/pet/cat-service.ts`에 `retrieveCategoryOwnChunks` 없음. 형제 5개·`origin/main`에는 있음 | **병합/출시 차단**. 판매 중인 고양이 궁합의 동작 차이 | `origin/main` 병합 또는 단계 이식 + `check:cat` 통과 + 결정적 assertion |
| **U24** | unit 결과가 실행 형태에 따라 갈린다 (373/0 vs 365/8). 원인 미특정 | R06 baseline 신뢰성, T10 | 8개 테스트 격리 후 원인 특정 |
| **U25** | `check:*` 11개 가드가 stale. 수정본이 `origin/main`에만 있음 | 회귀 판별, CI 도입(TASK-005) | `origin/main` 병합 (U13) |
| ~~U9~~ | `developmentReportAccess` | — | **부분 해소** (T03 §6) — 술어는 소스 확정. Supabase URL·공개키 설정 환경에서 false. 설정 누락 런타임에서는 열린다 |
| U10 | **hidden 4종의 신규 판매를 허용하는가?** 현재 discovery 15 / 판매 19 | T22, 06-SCREENS S02 `availability` | 운영 정책 결정 |
| U11 | 관리자 단일 서비스 식별자를 `canonicalKey`로 할지 | T22, 09-API `/services/:key` | ADR |
| U12 | `serviceHrefForKey('saju_master')`=undefined의 실제 영향 | T10, T11 | **U4로 이관** — 저장된 `context.serviceKey` 분포는 운영 DB 조회 필요 |
| U13 | `origin/main` 20커밋(결혼택일·공용 GNB·브랜드 통일·모바일 정합) 운영 미반영 | 저장소 정합성, 고객 화면 | 병합 Task (충돌 24개) |
| ~~U14~~ | **해소(정정)**. 16:25 시점에 Git 연동 존재. 실제 위험은 `vercel deploy --prod`가 연동을 우회하는 것 | 배포 재현성·감사 | 규칙: 기본 경로는 `main` push, CLI Production 배포는 승인된 긴급 예외. **자동 강제 수단 없음** |
| U15 | 결혼택일이 양쪽 브랜치에 독립 구현 (add/add) | U13 병합 | 구현 비교 후 판정 |

### 구현 규칙 (pack 01-LLM-EXECUTION 준수)
- Express 라우터 + TypeScript 서비스·저장소 경계 확장. Next.js 전환 없음.
- 관리자 UI는 실제 API 연결. 빈 데이터(0)와 연결 실패(오류)를 구분.
- 권한 검사는 서버에서. 기존 이메일 unlock을 운영 권한으로 재사용 금지.
- 신규 스키마는 버전 관리 migration + 복구 계획 동반. 기존 테이블 파괴 금지.
- 외부 부작용은 idempotency·재시도·불확정 대사 구현 후 활성화.
- 관리자 UI 소스는 정적 루트(`사주/`, `public/`) **밖**의 `admin-ui/`에 두고 인증 라우트로만 서빙한다.
  `express.static`(683~684행)은 경로에 실제 파일이 있으면 인증 없이 서빙하므로,
  관리자 자산을 정적 루트에 두면 권한 검사를 우회한다 (ADR-0002 D1/D2).
- 관리자 권한 판정에 `isAdminEmail`·`isAdminOwner`(레거시 unlock)를 절대 사용하지 않는다.

## C. origin/main 병합 Task (신규, U13)

| ID | Task | 내용 | 상태 |
| --- | --- | --- | --- |
| TASK-009 | `origin/main` 통합 | 실제 21커밋 통합. 충돌 24건 해소. 결혼택일은 우리 구현 정본 | **DONE** — 커밋 `659ba7f`, 미푸시. 415/415 테스트, 가드 15/15 |
| TASK-011 | 브랜드 표기 통일 + 정적 노출 차단 | 정책 페이지 4개를 `운명상회`로 통일 + `alternateName: UMSH`. **그리고 정적 루트에서 서비스되던 프롬프트 원문·스크래핑 산출물·생성 JSON 차단** | **DONE** — 474 pass. Codex Critical 1 반영 |
| TASK-020 | 정적 제공을 허용 목록으로 (U31) | 기본 거부 전환, `%5C` 우회 차단, 중첩 폴더 전체 마운트 제거(스크랩 116KB 노출), 산출물 도달성·참조 자산 크롤 게이트 | **DONE** — 498 pass. Codex Critical 1 · Major 1 반영 |
| TASK-012 | 결제 설정 문구 정보 노출 제거 | `/api/payment/config`의 `setupMessage`가 내부 환경변수 이름을 노출 | **DONE** (TASK-009 병합으로 해소). 단 **운영 배포 전까지 노출은 계속된다** |
| TASK-013 | 결혼택일 RAG 렌더링·문맥 이식 | RAG 근거를 본문에 실음(`_chunk` 소멸), 청크 중복 배정 제거, 후보일 판정·상대 명식 문맥 이식, 한자 독음, 삭제된 테스트 3건 복구 + 신규 7건 | **DONE** — 430 pass. Codex Critical 2건(상대 개인정보) 반영 |
| TASK-019 | 상대 개인정보 전 서비스 정리 (U26) | 6개 서비스 문맥에서 상대 생년월일시 제거, 응답·프롬프트·저장된 상담 경로 sanitize | **DONE** — 446 pass. Codex Critical 2건(featureJson·저장된 상담) 반영 |
| TASK-014 | Android 앱 셸 인수 | 병합으로 유입된 `android/`(Capacitor) + Play 결제 + App Links 상태 파악 | **BLOCKED — 출시 게이트 G6~G9** |
| TASK-015 | 병합 결과 배포 | 운영에 병합분 반영 | **DONE** — `chungi-387wmilw8`, `umsh.kr` 별칭 이동. SEO·FAQ·about·집풍수 복구 확인 |
| TASK-017 | `git push` | 커밋 스택이 로컬에만 있다. 원격 미보존이 이번 사고의 근본 원인 | **BLOCKED** (push 권한 차단) — 사용자 조치 필요 |
| TASK-018 | 배포 경로 정상화 | U14 정정(Git 연동 존재), `README.md` 재정정, `main` fast-forward, 연동 배포 검증 | **완료** — `docs/admin-ops/TASK-018-deploy-path.md` §0 |
| TASK-016 | Google Play 결제 활성화 | Play 영수증 검증 경로를 실제로 켜기 | **BLOCKED — 출시 게이트 G6~G8** |
| TASK-010 | 배포 경로 정상화 | TASK-018과 동일 사안 | **TASK-018로 통합 종료** |

TASK-009는 admin-ops와 **병행하지 않는다.** 회귀 원인을 분리할 수 없기 때문이다.
수행 시 병합 직후 `npm run typecheck` + `npm test` 373건 전수 + `check:*` 스크립트 재검증이 필수다.

## D. 배포 경로 전환 순서 (TASK-018 — 순서 위반 시 사고 재발)

`origin/main`은 우리 HEAD의 조상이므로 fast-forward가 가능하다.
그러나 **`origin/main`에는 아직 우리 16커밋이 없다.** 연동을 먼저 켜면
불완전한 main이 자동 배포되어 2026-09-10 15:11 회귀가 재발한다.

- [x] D1. `git push origin fix/umsh-qa-ux` — `dac3835..0556e49`
- [x] D2. `git push origin HEAD:main` — `f825d26..0556e49` fast-forward
- [x] D3. `git rev-list --left-right --count origin/main...HEAD` → `0  0`
- [x] D4. `vercel git connect …` → **이미 연결되어 있었다** (U14 정정의 근거)
- [x] D5. 라우팅 관측 — 관측한 `main` push는 Production을, 관측한 브랜치 push는 Preview를
      만들었다. **Production Branch 설정값 자체는 대시보드/API로 확인하지 않았다**
- [x] D6. `main` push → 자동 배포 확인. `dpl_42CkhxK2KC4CAKbPEwMQVQDAVXs1` (Ready, 46s),
      alias `chungi-t-git-main-ax-lab-cream.vercel.app`, `umsh.kr` 이동.
      **관측 1건이므로 alias 형식을 배포 경로의 단독 판정자로 쓰지 않는다**

되돌리기: `git push origin f825d269:main --force-with-lease`

**연동 후 제약:** GitHub Actions에 `vercel deploy`를 넣지 않는다.
push 한 번에 배포가 2회 돈다(T02 리서치 F9). Actions는 CI 전용.

## Next Actions

- **M0의 T01~T04 4개 Task 전부 DONE.** 그러나 M0 종료 게이트("코드·WIKI 차이 해결")는
  U13·U23·U25가 남아 **미완결**이다. Codex 리뷰도 "M0 완료 선언 불가"로 동일 판정했다.
- **U13(`origin/main` 병합)이 병목이다.** 병합 하나로 U23·U25가 함께 수렴한다:
  - U25: stale guard 11개 실패 해소 예상
  - U23: 고양이 궁합의 자기 코퍼스 우선 검색 단계 확보
  - 그 외: 공용 GNB·하단 메뉴, 브랜드 통일, 모바일 프레임 정합이 운영에 반영됨
  병합 후 `check:*` 16개 + `npm test` baseline 전수 재실행이 필수다.
- **T05 착수 전 필요한 것** (Codex 최종 판정 기준):
  1. U13 병합 결정과 검증
  2. U23 해소·검증 (판매 중 서비스이므로 차단 항목)
  3. U25 가드 복구
  4. U24 재현 가능한 unit baseline manifest 확립
  5. 기존 선행: U2(개발용 영속 저장소), U4(운영 스키마·grant), U17(주문 직렬화), U3(ADR-0002 승인)
- 사용자 결정 필요: U10(hidden 판매 정책), U13(병합 시점), ADR-0002 승인,
  **U22(결제 활성화 전 불확정 상태 설계 — TASK-007보다 선행)**.
- 운영 자격 필요: U4(service_role 읽기 전용 접근으로 운영 스키마·grant·분석열 집계 확인).
