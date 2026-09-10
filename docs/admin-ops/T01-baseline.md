# T01 — 기준 소스·운영 차이 기록

- pack task: `admin-ops-execution-pack/15-TASKS.md` T01 (M0 / P0 / 선행 없음)
- CreamAI task: `task-t01`
- 요구 추적: R01
- 작성일: 2026-09-10
- 조사 범위: 로컬 작업 트리 + git 메타데이터 + `wiki/AIOS_KMS/`. **운영 DB·PG 거래·운영 배포 조회는 하지 않았다.**
- 비밀값: 미포함 (변수 이름과 존재 여부만 기록)

## 1. 기준 소스 식별

| 항목 | 값 | 근거 |
| --- | --- | --- |
| 저장소 루트 | `C:\Users\user\Desktop\chungi-t` | 요청 지정 |
| package name | `chungi_t` | `package.json` |
| 서버 엔트리 | `src/server/app.ts` (2,589줄) | 파일 확인 |
| 서버리스 엔트리 | `api/index.ts` (35줄) — `__umsh_path` 복원 후 Express 위임 | 파일 확인 |
| 패키지 무결성 | `admin-ops-execution-pack` 21개 파일 SHA-256 **전부 일치** | `MANIFEST.json` 검증 실행 |

패키지 00-START-HERE의 경고대로 `admin-ops-execution-pack/`을 앱 루트로 취급하지 않았다.
패키지 02-EVIDENCE의 조사 루트(`vercel-source-dpl_8GJ6WMBmoaBZeQy4YFQtcwZ8JeKZ`)는
이 저장소가 아닌 **배포 소스 사본**이다. 이 문서의 모든 경로는 위 저장소 루트 기준이다.

## 2. Git HEAD·dirty 상태

| 항목 | 값 |
| --- | --- |
| HEAD | `dac38355b5ef4bb5e91778fdcf458873fc63f29e` |
| 브랜치 | `fix/umsh-qa-ux` |
| origin | `https://github.com/axlab-cream/chungi-t.git` |
| upstream | `https://github.com/jaeyong-planner/chungi-t.git` (fetch only, push DISABLED) |
| dirty 총계 | 30건 (tracked modified 2건 + untracked 28건) |
| tracked modified | `.env.example`, `README.md` (task-003에서 변경, 미커밋) |

### 2.1 브랜치 분기 — 그리고 초판 결론의 정정

```
git rev-list --left-right --count origin/main...HEAD
20      10
git merge-base HEAD origin/main   ->  d4c4e1b (2026-09-07 17:14)
```

`fix/umsh-qa-ux`는 `origin/main` 대비 **10 커밋 앞, 20 커밋 뒤**다. (수치는 재확인됨)

> **초판 결론 정정 (2026-09-10).**
> 초판은 여기서 "`origin/main` push가 Production 배포를 트리거하므로(`README.md`)
> 현재 로컬 HEAD는 운영에 배포된 코드와 다르다"고 결론했다. **이 결론은 틀렸다.**
> 실측 결과 **운영은 로컬 HEAD로 배포되어 있다.**
> `README.md`의 "main push가 Production을 트리거한다"는 서술이 현재 사실과 달랐고,
> 초판은 그 서술을 검증 없이 전제로 사용했다.
> 근거와 상세: `docs/admin-ops/production-source-of-truth.md`

정정된 사실:

| 항목 | 값 |
| --- | --- |
| 운영 배포 | `dpl_8GJ6WMBmoaBZeQy4YFQtcwZ8JeKZ`, target production, 2026-09-09 17:06:57 KST |
| 운영 콘텐츠 | 로컬 HEAD `dac3835`와 일치 (robots.txt·sitemap.xml 존재, `/privacy` 마커 3종 일치) |
| 운영 배포의 git 메타데이터 | **없음** → CLI 로컬 배포로 추정 |
| `origin/main`의 20 커밋 | **운영에 반영된 적 없음** (결혼택일·공용 GNB·브랜드 통일·모바일 정합) |

영향 (정정 후):
- 로컬 검증 결과는 **운영 동작의 증거로 사용할 수 있다.** T02·T03의 라벨 조건이 해제된다.
- 대신 `origin/main`의 20 커밋이 고아 상태다. 병합 dry-run에서 **충돌 24개**가 확인됐고
  `wedding_day`는 양쪽이 독립 구현한 add/add 충돌이다 → **U13·U15, 별도 병합 Task**.

## 3. 라우트 실측 vs 패키지 기재

`src/server/app.ts`는 `app.get/post/put/patch/delete` 등록문 **145건**과 `app.use` **18건**을 가진다.
등록문 다수가 경로 배열(`app.get(['/a','/a/','/a.html'], ...)`)을 쓰므로 **경로 엔트리 수는 286건**이다.
그중 `/api` 접두어 경로 엔트리는 **39건**(등록문 38건 — 2398행이 경로 2개를 등록)이다.
나머지는 고객 정적 페이지와 static 마운트다.
E02(“API·고객 정적 페이지 라우트 집중”) → **확인됨**.

> **정정 이력 (Codex 리뷰 반영, 2026-09-10):**
> 초판은 단일 따옴표 문자열만 매칭하는 grep을 써서 **배열 형태 등록을 전부 놓쳤다**.
> 그 결과 (a) 총계를 165/37로 잘못 적었고, (b) `GET /api/report/:reportId`를
> “존재하지 않음”으로 잘못 판정했다. 아래 §3.1~§3.2는 배열 형태를 포함해 재추출한 결과다.

### 3.1 패키지 02-EVIDENCE에 없는 실제 API (23건)

산식: `/api` 경로 엔트리 39건 중
- 패키지 “현재 확인된 API” 목록 15개는 **전부 실재한다**(§3.2)
- `GET /api/reports/:reportId`는 목록에 있는 `GET /api/report/:reportId`의 **별칭**이다

39 − 15 − 1(별칭) = **23건**이 패키지에 기재되지 않은 실제 API다.

| 라우트 | 위치 | 관리자 설계 영향 |
| --- | --- | --- |
| `GET /api/health` | app.ts:1401 | readiness 판정 기준. 단독으로 출시 게이트로 쓰지 말 것(E14) |
| `GET /api/auth/config` | app.ts:1419 | 직원 세션 설계 시 고객 provider 설정과 분리 필요 |
| `GET /api/payment/config` | app.ts:1423 | `checkoutEnabled`, `storage`, `testMode`를 그대로 노출 — 관리자 설정 화면의 기존 소스 |
| `POST /api/payment/test/approve` | app.ts:1498 | **테스트 승인 경로.** 08-DATA의 “test/admin_unlock은 매출 집계 제외” 요구의 실제 대상 |
| `GET /api/user/destiny` | app.ts:1684 | 회원 상세 설계 시 추가 조회원 |
| `POST /api/report/chat-history` | app.ts:2449 | 리포트 상세 타임라인 소스 |
| `POST /api/today/fortune` | app.ts:1732 | 무료 서비스 전용 경로 (18-SERVICES의 today_fortune) |
| `POST /api/{서비스}/analyze` **16건** | app.ts:1839~2335 | 서비스별 생성 진입점. 생성 실패 진단(S07)의 실제 호출 지점 |

`analyze` 계열 16건 전체: `money/save`, `match/couple`, `work/job`, `work/quit`,
`work/job-choice`, `match/cat`, `day/wedding`, `flow/newyear`, `me/lucky`, `match/marry`,
`love/mind`, `love/signal`, `love/this-year`, `love/again`, `love/spouse`, `saju`.

합계 검산: 7(health·auth/config·payment/config·payment/test/approve·user/destiny·report/chat-history·today/fortune)
+ 16(analyze) = **23건**.

### 3.2 패키지 “현재 확인된 API” 목록 재검증 — 15개 전부 실재 (충돌 없음)

| 패키지 기재 | 실측 위치 | 판정 |
| --- | --- | --- |
| `POST /api/payment/orders` | 1427 | PASS |
| `POST /api/payment/inicis/return` | 1537 | PASS |
| `GET /api/payment/orders/:orderId` | 1591 | PASS |
| `POST /api/payment/orders/:orderId/viewed` | 1606 | PASS |
| `GET /api/user/orders` | 1626 | PASS |
| `GET /api/user/profile` | 1638 | PASS |
| `POST /api/user/profile` | 1661 | PASS |
| `PUT /api/user/profile` | 1662 | PASS |
| `GET /api/user/reports` | 1669 | PASS |
| `DELETE /api/user/reports/:reportId` | 1716 | PASS |
| `GET /api/services` | 1665 | PASS |
| `GET /api/report/:reportId` | **2398** | **PASS** (초판 오판 정정) |
| `POST /api/report/section` | 2479 | PASS |
| `POST /api/report/prewarm` | 2512 | PASS |
| `POST /api/chat` | 2531 | PASS |

`app.ts:2398`은 배열 등록이다:

```ts
app.get(['/api/report/:reportId', '/api/reports/:reportId'], async (req, res) => {
  const owner = await verifySupabaseUser(req)
  if (!authConfig().developmentReportAccess && !owner) { res.status(401)…; return }
  const record = await findReportRecord(reportId, owner)
```

관리자 설계에 필요한 사실:
- **별칭 `GET /api/reports/:reportId`가 존재한다.** 관리자 리포트 조회(T10/T11)를 설계할 때
  두 경로가 같은 핸들러라는 점을 고려한다.
- 이 핸들러는 `verifySupabaseUser(req)`로 **소유자 검증**을 하고, 미로그인은 401이다.
  단 `authConfig().developmentReportAccess`가 참이면 미로그인 접근이 허용된다.
  → 13-SECURITY의 “관리자 서버 접근은 기존 고객 소유권 검사를 대체하지 않는다”와
  **A33/A39 회귀 검증의 실제 대상 코드**다. `developmentReportAccess`의 환경별 값을
  T03에서 반드시 확인해야 한다(신규 미확인 항목 U9).
- `GET /r/:resultId` (app.ts:1799)는 정적 `report-view.html`을 서빙하는 **UI 진입점**이며
  위 API의 대체가 아니다. 둘은 역할이 다르다.

### 3.3 `/admin` 경로 충돌 없음

`src/server/app.ts`에 `'/admin` 문자열 등록은 **0건**. `/admin`, `/api/admin`은 신규로 안전하게 확보 가능하다.

### 3.4 라우트 등록 순서 제약 (신규 발견)

```
app.use('/api', no-store 미들웨어)        # app.ts:196
...
app.use(express.static(SAJU_UI,   {index:false}))   # app.ts:683
app.use(express.static(SAJU_ROOT, {index:false}))   # app.ts:684
```

- `/api` 응답에는 `Cache-Control: private, no-store` + `Vary: Authorization`이 이미 적용된다.
  09-API의 “no-store 적용” 요구는 `/api/admin/v1`이 이 미들웨어 아래 있으면 자동 충족된다.
- 두 static 마운트는 catch-all이지만 **마지막 등록문은 아니다.** 683~684행 이후에도
  `/api/*` 라우트(1401~2531행)가 계속 등록된다. `express.static`은 매칭 파일이 없으면
  `next()`로 통과시키므로, 뒤에 등록된 라우트가 “전부 가려진다”는 표현은 틀렸다.
  (초판 오기 — Codex 리뷰 반영 정정)
- 실제 위험은 다음 하나다: **경로에 해당하는 실제 파일이 존재하면 그 파일이 먼저 서빙된다.**
  즉 `사주/` 또는 `사주/사주/` 아래에 `admin/…` 파일을 두면,
  684행의 `express.static(SAJU_ROOT)`가 **인증 검사 없이** 그 파일을 그대로 내려준다.
  관리자 UI 배치에서 이것이 가장 중요한 제약이다 → ADR-0002 D1에서 다룬다.

## 4. 환경별 차이표

| 항목 | 로컬(`npm start`) | Vercel Development | Vercel Preview | Vercel Production |
| --- | --- | --- | --- | --- |
| 실행 형태 | tsx + Express :8790 | 서버리스 함수 | 서버리스 함수 | 서버리스 함수 |
| Node | 24.13.1 | 24.x | 24.x | 24.x |
| `OPENAI_API_KEY` | 설정됨 | Sensitive(값 비공개) | Sensitive | Sensitive |
| `SUPABASE_SERVICE_ROLE_KEY` | **없음** | **없음** | **없음** | 설정됨(Sensitive) |
| `DATABASE_URL` | **없음** | **없음** | **없음** | **없음** |
| 주문 저장 모드 | **memory** (실측) | **미검증** | **미검증** | supabase (실측) |
| `INICIS_MID` | **없음** | **없음** | **없음** | 설정됨(Sensitive) |
| `INICIS_SIGNKEY` | **없음** | **없음** | **없음** | **없음** |
| `PUNGSU_*` | **없음** | **없음** | **없음** | 설정됨(Sensitive) |
| `PUBLIC_BASE_URL` | `https://umsh.kr` | `https://umsh.kr` | 설정됨 | 설정됨 |
| checkout 활성 | false | 미검증 | 미검증 | **false** (실측) |

실측 근거:
- 로컬 `GET /api/payment/config` → `{"enabled":false,"configured":false,"checkoutEnabled":false,"testMode":false,"storage":"memory","storageReady":false}`
- 운영 `node scripts/check-integrations.mjs` → 8 PASS / 2 FAIL (`Inicis MID/SignKey`, `checkout enabled`), `payment order storage: supabase`

### 4.1 관리자 설계에 직접 영향

- 07-ARCHITECTURE / A17: “운영에서 memory fallback이면 관리자 쓰기를 차단하고 readiness 실패”.
  **로컬은 memory로 실측 확인됐다.** Development·Preview는 `SUPABASE_SERVICE_ROLE_KEY`와
  `DATABASE_URL`이 둘 다 없으므로 `storageMode()`의 코드 경로상 memory가 되어야 하지만,
  **런타임으로 확인하지 않았다**(초판은 “전부 memory”로 단정 — Codex 리뷰 반영 정정).
  확인 방법: 각 환경 배포의 `GET /api/payment/config`의 `storage` 값 조회.
  → 어느 쪽이든 관리자 쓰기 기능을 개발 단계에서 검증할 영속 저장소가 필요하다(U2).
  U2의 해제 조건은 “환경변수 1개 확보”가 아니라 **운영과 격리된 영속 저장소 + 접근 정책 검증**이다.
- `PUBLIC_BASE_URL`이 로컬에서도 운영 도메인이라 결제 return URL이 운영을 가리킨다
  (`returnUrl: https://umsh.kr/api/payment/inicis/return`). 관리자에서 결제 흐름을 로컬 검증할 때 함정.

## 5. 패키지 근거(E01~E16) 재검증

| ID | 패키지 주장 | 재검증 결과 | 비고 |
| --- | --- | --- | --- |
| E01 | Express 4, TS, tsx, pg, OpenAI | **확인됨** | express 4.21.2, typescript 5.7, tsx 4.19, pg 8.23, openai 4.77 |
| E02 | API·고객 정적 라우트 집중 | **확인됨** | 165 등록 중 /api 37건 |
| E03 | 이메일 목록 기반 유료 unlock | **확인됨 + 중대 보강** | 아래 5.1 |
| E04 | 주문 상태 enum | 미재검증 | T03 범위 |
| E05 | INICIS 설정·승인·return | **확인됨** | `src/payment/inicis.ts`, app.ts:1537 |
| E06 | Postgres/REST/memory 3경로 | **확인됨** | `order-store.ts` `storageMode()` |
| E07 | 생년월일·시간·맥락 프로필 저장 | 미재검증 | T03 범위 |
| E08 | revision·generationId·조건부 갱신 | 미재검증 | T03 범위 |
| E09 | 레지스트리·상태·fingerprint | 부분 확인됨 | `/api/health`가 28팩 + fingerprint 반환 |
| E10 | knowledgeBlocks/legacy chunks | 미재검증 | T25 범위 |
| E11 | 프롬프트 20키, catalog 19키 | **확인됨** | manifest 20, catalog 19 (실측) |
| E12 | directory hidden 4종 | **확인됨** | `hidden: true` 4건 (실측) |
| E13 | FAQ·runtime config 파일 | **확인됨** | `data/public-faq.json`, `data/runtime-config.json` |
| E14 | 9/7 운영 DB 검증 기록 | **확인됨(문서 존재)** | `wiki/AIOS_KMS/2026-09-07-production-deploy-db-verification.md` 30,795 bytes |
| E15 | 판단 블록 중심 RAG 원칙 | **확인됨(문서 존재)** | 동 폴더 2026-08-31 문서 1,678 bytes |
| E16 | 결과 UUID·완료 불변 | **확인됨(문서 존재)** | 동 폴더 2026-09-07 문서 13,163 bytes |

WIKI `wiki/AIOS_KMS/`에는 50개 문서가 있고 최신은 `2026-09-09-*` 5건이다.
패키지가 참조한 3개 문서는 모두 존재하지만 **가장 최신 기록은 9/9**이므로
패키지의 “9/7 기준”은 이미 2일치 뒤처져 있다(ADR-12 최신화 필요 → 유지).

### 5.1 E03 보강 — 관리자 이메일이 코드에 하드코딩되어 있다

`src/auth/admin.ts`는 `DEFAULT_ADMIN_EMAILS` 상수에 관리자 이메일 **2개를 하드코딩**하고,
`adminEmails()`는 `DEFAULT_ADMIN_EMAILS ∪ UMSH_ADMIN_EMAILS`를 반환한다.
(실제 주소는 이 문서에 옮기지 않는다. `src/auth/admin.ts`의 `DEFAULT_ADMIN_EMAILS`를 참조한다
— Codex 리뷰 반영으로 초판의 주소 인용을 삭제했다.)

- 환경변수는 **추가만** 할 수 있고 하드코딩된 2개를 **제거할 수 없다**.
- 따라서 이 경로를 그대로 운영 권한으로 재사용하면 16-ACCEPTANCE
  **A03(권한 회수 후 다음 요청 즉시 거절)** 을 충족할 수 없다 — 회수에 코드 변경·재배포가 필요하다.
- 13-SECURITY의 “현재 이메일 unlock은 운영 권한이 아니다”는 방향과 일치한다.
  **레거시 unlock을 T05의 직원 RBAC와 완전히 격리하면 별도 선행 차단 사유는 아니다.**
  단 T05의 구현 요구로 명시한다: 관리자 API/화면 권한 판정에 `isAdminEmail`·`isAdminOwner`를
  절대 사용하지 않고, 서버 관리 membership만 사용한다.
- 관리자 감사(R11) 설계 시 “코드에 박힌 권한”은 감사 불가 경로로 분류한다.

## 6. 관리자 UI 배치 제약 (신규 발견)

| 사실 | 근거 | 영향 |
| --- | --- | --- |
| 함수 번들에 `사주/**` 포함 | `vercel.json` `includeFiles: "{data,prompts,사주}/**"` | 관리자 정적 HTML을 `사주/admin/`에 두면 함수에서 서빙 가능 |
| 모든 경로가 함수로 rewrite | `vercel.json` `rewrites: /(.*) → /api/index` | `/admin`이 Express에 도달함 |
| `public/`는 별도 빌드 산출물 | `scripts/prepare-vercel-public.mjs` | `public/`에 있는 동일 경로가 rewrite보다 먼저 매칭될 수 있음 — 이중 소스 위험 |
| `.vercelignore`가 `사주/`를 제외하지 않음 | `.vercelignore` | 관리자 자산 배포 가능 |

→ ADR-11(관리자 UI 기술)의 “기존 정적 UI 우선”은 실행 가능하다.
단 `public/` 복사 대상과 `사주/` 원본 중 **어디를 관리자 UI의 단일 소스로 둘지** 결정이 필요하다(U3).

## 7. 미확인 항목 (해제 조건 포함)

| ID | 미확인 내용 | 영향 task | 해제 조건 |
| --- | --- | --- | --- |
| U1 | ~~관리자 구현의 기준 브랜치~~ | — | **해소 (2026-09-10)** — `docs/admin-ops/production-source-of-truth.md`. 운영 = 로컬 HEAD로 실측 확인. 기준 브랜치는 `fix/umsh-qa-ux` |
| U2 | 개발·Preview용 영속 주문 저장소 부재 (로컬 memory 실측, Dev/Preview 미검증) | T05, T08, T14 (A17) | 운영과 **격리된** 영속 저장소 확보 + 접근 정책 검증 |
| U3 | 관리자 UI 단일 소스 위치 및 정적 자산 인증 순서 | T07 | ADR-0002 승인 |
| U4 | 운영 DB 실제 스키마·grant·RLS | T03, T05, T06 | Supabase 대시보드 또는 CLI 접근 (TASK-004 안전 게이트) |
| U5 | 직원 인증 provider의 MFA/재인증 실제 지원 | T05 | Supabase Auth 설정 확인 |
| U6 | PG 취소 API 지원 여부·서명 규격 | T16~T19 | 이니시스 계약·콘솔 확인 |
| U7 | ~~운영 배포 커밋 SHA~~ | — | **해소 (2026-09-10)** — `dpl_8GJ6WMBmoaBZeQy4YFQtcwZ8JeKZ`, 콘텐츠가 로컬 HEAD `dac3835`와 일치. git 메타데이터 없음 |
| U8 | 20종 canonical/payment/prompt/route 정합성 상세 | T02 | T02 실행 |
| U9 | `authConfig().developmentReportAccess`의 환경별 값 | T03, T10, T11 (A33/A39) | 환경별 값 확인 — 참이면 미로그인 리포트 접근이 허용됨 |
| U13 | `origin/main`의 20 커밋(결혼택일·공용 GNB·브랜드 통일·모바일 정합)이 운영 미반영 | 저장소 정합성, 고객 화면 | 병합 Task (충돌 24개) |
| U14 | 운영 배포가 Git 연동이 아니라 CLI 로컬 배포로 이뤄지는 것으로 보임. `README.md` 서술과 불일치 | 배포 재현성·감사 | 배포 경로 정상화 결정 |
| U15 | 결혼택일(wedding_day)이 양쪽 브랜치에 독립 구현 (add/add 충돌) | U13 병합 | 구현 비교 후 판정 |

각 항목은 전체 중단 사유가 아니다(19-DECISIONS 규칙).

**U1 게이팅 이력 (2회 정정):**
- 초판: U1을 T05 이후만 차단한다고 적었다 → Codex 리뷰가 T02·T03도 대상이라고 지적, 수용.
- **최종 (2026-09-10): U1 자체가 해소되었다.** 실측 결과 **운영 = 로컬 HEAD**였고,
  "`origin/main`이 운영"이라는 전제(출처: `README.md`)가 사실이 아니었다.
  근거는 `docs/admin-ops/production-source-of-truth.md`.
  따라서 T02·T03의 "운영 대조 미완료" 라벨은 **해제**한다.
  대신 신규 U13(origin/main 20커밋 미반영)이 별도 병합 Task로 남는다.

## 8. 회귀 기준 (T04 선행 수집분)

| 검증 | 명령 | 결과 (2026-09-10, HEAD dac3835) |
| --- | --- | --- |
| 타입체크 | `npm run typecheck` | PASS — 오류 0건 |
| 유닛 | `npm test` | PASS — 373/373, 29 suites, 78.1s |
| 운영 통합 | `node scripts/check-integrations.mjs` | 8 PASS / 2 FAIL (결제 2건) |
| 로컬 통합 | `node scripts/check-integrations.mjs --base http://localhost:8790` | 7 PASS / 3 FAIL (결제 2건 + storage memory) |

기존 실패는 **결제(Inicis) 미설정** 계열 뿐이다. 관리자 구현 중 이 외의 실패가 나오면 신규 회귀다.

## 9. T01 수용 조건 대조

| 수용 조건 | 결과 |
| --- | --- |
| 로컬/운영 확인 범위 표시 | 충족 — §1 범위 명시, §4에 실측/추정 구분 |
| 비밀값 없이 기준표 작성 | 충족 — 변수 이름과 존재 여부만 기록 |
| HEAD·dirty·라우트·환경별 차이표 산출 | 충족 — §2, §3, §4 |

## 10. Codex 리뷰 반영 요약 (2026-09-10)

리뷰 보고서: `CreamAI/logs/review/task-t01_admin-ops-t01-review.md` — Critical 0 / Major 5 / Minor 4.
**전부 수용**, 반려 없음.

| # | 지적 | 반영 |
| --- | --- | --- |
| M1 | `GET /api/report/:reportId`는 존재함 (2398행 배열 등록) | §3.2 전면 재작성. 판정 충돌→PASS. 별칭·소유자검증·`developmentReportAccess` 추가 기록, U9 신설 |
| M2 | API 총계 불일치 (37/20 오기) | §3 총계를 등록문 145 / 경로엔트리 286 / `/api` 39로 정정. 23건 산식 명시 |
| M3 | static이 마지막 등록문이 아니며 fall-through함 | §3.4 정정. 실제 위험을 “파일이 존재하면 인증 없이 서빙”으로 재정의 |
| M4 | 패키지 `20-HANDOFF.md` 미갱신 | 사용자 결정 필요 항목으로 승격 (아래 §11) |
| M5 | U1을 T05만 차단한다고 본 것은 오류 | §7 게이팅 정정 — T02·T03도 대상 |
| m1 | Dev/Preview 저장 모드를 확인된 것처럼 서술 | §4·§4.1 미검증으로 정정, U2 해제 조건 강화 |
| m2 | backlog status와 plan/handoff 상태 불일치 | `task-t01.md` status를 done으로 일치화 |
| m3 | 하드코딩 이메일을 문서에 재인용 | §5.1에서 주소 삭제, 상수명만 인용. “격리 시 별도 차단 사유 아님”으로 완화 |
| m4 | ADR-0002 정적 자산 인증 순서·디자인 경계 미흡 | ADR-0002 D1·D3 재작성 |

## 11. 사용자 결정 필요 (Codex M4)

패키지 `01-LLM-EXECUTION.md`는 작업마다 `20-HANDOFF.md`를 갱신하라고 지시한다.
그러나 `MANIFEST.json`이 21개 문서의 SHA-256을 담고 있어 패키지 파일을 수정하면
무결성 검증이 깨진다. T01은 패키지를 불변 보존하고 `docs/admin-ops/HANDOFF.md`를
대체 인계 기록으로 만들었다. 그 결과 **패키지의 정본 인계 문서는 여전히 “T01~T38: todo”** 로 남아 있다.

선택지:
- (A) 패키지를 불변 명세로 확정하고 `docs/admin-ops/HANDOFF.md`를 정본으로 공식 지정 — 현재 상태
- (B) `20-HANDOFF.md`를 갱신하고 `MANIFEST.json`의 해당 해시를 함께 재계산

승인 전까지 (A)를 유지한다.

## 12. 다음 ready task

**T02 (20종 키·노출 매핑)** — 선행 T01 충족. 경계: `catalog.ts`, `service-directory.ts`, `services-manifest.json`.
단 §7의 U1 게이팅에 따라 산출물에 “로컬 HEAD `dac3835` 기준, 운영 대조 미완료” 라벨이 필요하다.
T03도 같은 조건이다. T04는 로컬 회귀 baseline 성격이므로 라벨만 붙이면 유효하다.
T05는 U1·U2 해소 전 blocked 유지.
