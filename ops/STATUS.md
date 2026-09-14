# 운명상회 작업 트래커

최종 갱신: 2026-09-14 · 갱신 주체: Cowork 세션 · 현재 트랙: **T-7 (운영자 실행 대기)**
규칙: **한 번에 한 트랙.** 완료분은 체크만 하고 다음 트랙으로 넘어간다.

---

## 완료 (이번 세션)

### T-A. 등록 디자인 복원 — in-place 렌더 ✅

원인: `umsh-report-access.js` 가 `boot()` 시점에 `panel()` 을 불러 body 자식을 전부
`display:none` 처리하고 자체 마크업으로 교체. 21개 서비스 전부 해당.

- [x] in-place 렌더 모드 — `<html data-umsh-verified-inplace>` 옵트인, 미부착 서비스는 기존 동작 유지
- [x] 슬롯 해석 3단계 — 명시적 `data-umsh-slot` → 알려진 id/data속성 폴백 → 없으면 생성
- [x] `boot()` 의 선제 `panel()` 호출 제거 (이것이 실패 10건의 원인이었다)
- [x] `사주/css/umsh-verified-inplace.css` 신규
- [x] 04·06 슬롯 부착 — **14개 서비스 / 26개 파일**
- [x] `love/this-year` 04·06 은 수동 슬롯으로 정밀 매핑

검증: 헤드리스 33/33 + 자동 호스트 21/21

### T-B. 톤 v2 콘텐츠 렌더러 ✅

기존 렌더러가 `hook + 문단`만 그려 `SectionStorytelling` 의 대부분을 버리고 있었다.

- [x] 섹션 이미지 `imageSrc`/`imageAlt`
- [x] `feel` · `softBridge` · `scene` · `actions[]`
- [x] 마크다운 표 파서 (`tableMd`/`tableCaption`) — 구분선 제거, 전 셀 이스케이프, 좁은 화면 표만 스크롤
- [x] 차트 (`chartPoints`/`chartCaption`) — 단일 계열 수평 막대, 값·설명 직접 표기
- [x] 근거 칩 (`patternKeys` + `ragTopics`, 중복 제거)
- [x] `storytelling` 없으면 기존 렌더로 폴백 (톤 v1 호환)

차트 색 `#c98500` — 브랜드 골드 `#e8c76f` 는 다크 표면 기준 L=0.84로 밴드 이탈. 검증기로 확정.

검증: 20/20 (표 파싱·막대 실측폭·적용색·ARIA·390px 오버플로)

### T-C. 6-1 진행률 ✅

`umsh-progressive-report.js` 는 `report-view.html` 한 곳에만 포함돼 있었고,
기존 `.interpret-progress` 는 진행률이 아닌 무한 스캔 애니메이션이었다.

- [x] 확정형 진행률 — `report.progress {complete,total}` → 퍼센트
- [x] `role="progressbar"` + `aria-valuenow/max/valuetext`
- [x] 섹션별 상태 배지 `is-ready`/`is-generating`/`is-pending`/`is-failed`
- [x] 자리가 없는 디자인에는 진행률 패널 생성 삽입
- [x] `prefers-reduced-motion` 대응

### T-D. cmdg 해석 시작 ✅ (배포 완료 · 라이브 검증 완료)

겹친 원인 4가지를 전부 확정하고 수정.

- [x] `renderConcern()` 이 캐시에서 프로필을 복구하지 않던 문제
- [x] `saveCurrentUserProfile()` 이 검증 전에 캐시를 덮어써 **실패가 영구화**되던 문제
- [x] `window.UMSHReportAccess.firstInsight` 미가드 호출 → `renderResult` TypeError
- [x] 그 TypeError 가 `analyzeBirth().catch` 로 흘러가 **"분석 실패"로 둔갑**하던 구조
- [x] `showNudge` 가 `.panel` 없을 때 **오류 문구를 통째로 버리던** 문제

라이브 검증 (2026-09-14):

```
0.0s concern  칩: 정재용 · 양력 19750926
2.3s PUT  /api/user/profile  200   (이전 400)
8.1s POST /api/saju/analyze  200   (이전 미호출)
8.4s → result                      (이전 즉시 반송)
```

### T-E. 회귀 방지 ✅

- [x] `tests/unit/cmdg-render-guards.test.ts` — 6 tests
- [x] 뮤테이션 테스트 7/7 — 버그를 되돌려 넣어 전부 FAIL 감지 확인
- [x] `UMSHReportAccess` 미가드 접근 제거 — wedding·work-move·home-reading **8곳**
- [x] 테스트 오탐 보정 — 감싸는 `if` 블록, 모듈 진입 `throw` 가드 인식

### T-F. 로딩 통일 (A안) ✅ — **배포 대기**

- [x] 공용 로더를 cmdg 오브 비주얼로 재작성, `.interpret-*` 의존 제거
- [x] 서비스명 자동 주입 — 페이지의 `data-service` 를 읽음
- [x] `umsh-chrome.js`(26) + `service-shell.js`(4) 에서 주입 → **HTML 70개 미수정**
- [x] `UmshLoading` / `UMSHLoading` 철자 불일치로 **로딩 호출 9곳이 무음**이던 버그
- [x] 기존 `{title, subtitle}` 호출 호환, HTML 주입 차단, 모션 축소 대응

검증: 로더 16/16 + 주입 경로 14/14

---

## 완료 (이어서)

### T-1. 로딩 통일 배포 ✅

- [x] 공용 로더 배포 (`umsh-loading.js` / `umsh-loading.css`)
- [x] 서비스명 중복 문구 수정 — `pillFor()` 가 "…해석" 으로 끝나는 이름에 "준비 중" 을 붙인다
- [x] `#umsh-verified-layout` 의 `data-service="저장된 해석"` 오검출 제외

### T-2. 05 챗/목록 페이지 슬롯 ✅

- [x] `slotNode()` id 폴백 맵에 05 컨테이너 추가 (HTML 일괄 치환 없이)
- [x] 05 페이지 14개에 `data-umsh-verified-inplace` 옵트인
- [x] `#chatLog` 오탐 보정 — this-year 의 `#chatLog` 는 대화 기록이 아니라 페이지 스크롤 영역

### T-3. 결과 화면 CTA ✅

라이브 측정: 결과 article 15,324px / 뷰포트 912px = **16.8화면**. 유일한 CTA 가
15,084px(맨 끝)에 있었고 `.sticky-story-cta` 는 이름과 달리 `position: relative` 였다.
(앞선 "CTA 0개" 보고는 내 오검색이었다 — 실제 클래스는 `next-cta` 가 아니라 `primary-cta`.)

- [x] `.sticky-story-cta` → `position: sticky; bottom: 0`
- [x] 상단 페이드 그라디언트 + `env(safe-area-inset-bottom)` 여백
- [x] 하단 고정 내비와 겹치지 않음 — `.stage` 가 이미 `--umsh-chrome-bottom-h: 74px` 를 뺀다

검증: 실제 규칙을 추출한 최소 재현 페이지로 헤드리스 **14/14**
(sticky 적용 · 15,596px 문서 · 0/25/50/75% 지점 전부 뷰포트 안 · 내비 비겹침 · 최하단에서 푸터가 밀어올림)

---

### T-4. 코퍼스 개정 시 캐시 무효화 정책 ✅

진단 결과 경로마다 정반대였다. 종합 해석은 **코퍼스 1글자 수정에 전량 재생성 + 결제 권한 상실**,
특화 서비스 15개는 코퍼스를 아예 참조하지 않아 **영원히 갱신 안 됨**.

- [x] `registry.json` 에 `cacheEpoch` 도입 — 무효화는 이 값 하나로만 일어난다
- [x] 기준 세대(`""`)에서 **기존 리포트 ID 가 한 건도 바뀌지 않음** (배포 무영향)
- [x] 계보 키 `lineageId` — 코퍼스 비의존. 캐시 승계 + 결제 권한 승계
- [x] `withCorpusEpoch()` 로 특화 서비스 15개도 세대 상향 시 갱신되게
- [x] `findUnlockingOrder` 가 지난 세대의 주문을 계보로 되짚음
- [x] 운영 문서 `docs/admin-ops/corpus-cache-policy.md` — 올릴 때 / 두는 때 기준

검증: 타입체크 통과 · 신규 8/8 · 뮤테이션 9/9 감지 · 기존 6개 스위트 기준선과 동일

---

### T-5. Tone V2 증거 현황 정리 ✅ (실호출 13개는 미착수 — 아래 참고)

릴리스 파일을 실측한 결과 **장부가 증거와 어긋난 게 2건** 있었다.

| 서비스 | 릴리스 게이트 | 실제 증거 |
|---|---|---|
| lucky_color | `not_run_for_2.1.0` | pass, 24/24, replay 24/0 |
| quit_fortune | 키 자체가 없음 | pass, 48/48, replay 48/0 |

두 증거 모두 `actualCalls: true` 이고 sha256 이 릴리스와 일치한다. 그대로 뒀다면
**이미 통과한 평가를 356만 토큰어치 다시 돌릴 뻔했다.**

- [x] 증거 파일에서 계산해 게이트 정정 (새로 돌리거나 지어낸 값 아님)
- [x] `tests/unit/tone-v2-release-evidence-binding.test.ts` — 게이트↔증거 결합 고정
- [x] 시각 증거 해시 검사 — 릴리스 해시는 **LF 기준**, 파일은 CRLF (원본 바이트로 재면 6건 전부 오탐)
- [x] 현황·비용 문서 `docs/admin-ops/tone-v2-evidence-gap.md`

검증: 신규 5/5 · 뮤테이션 7/7 감지

**검증 완료 7개**: pass_angle 52 · quit_fortune 48 · saju_master 37 · newyear_flow 36 ·
lucky_color 24 · wedding_day 20 · today_fortune(결정형)

---

### T-6. 관리자 T18 — 환불 승인 실패 원인 구분 ✅

환불 UI·API 는 이미 만들어져 있었다. 문제는 **승인 실패가 원인과 상관없이 같은 문장**으로
보인다는 것이었고, 원인이 셋이었다.

- [x] 승인 함수가 `revision` 을 `requested_by_email` 보다 먼저 봤다 → 요청자가 낡은
      revision 으로 자기 요청을 승인하면 "그사이 변경됨"(409)이 떴다. 화면은 "새로고침 후
      다시"로 안내하므로 **성공할 수 없는 동작을 재시도**하게 된다. TS 스토어와 SQL 함수
      양쪽에 같은 순서로 들어 있었다 → 둘 다 신원 검사를 앞으로
- [x] 라우트가 모든 실패를 한 문장으로 응답했다. 구분은 `code` 에만 있었는데 화면은
      `error` 만 읽는다 → `REFUND_FAILURES` 표로 사유별 상태 코드·문장 분리 (UI 수정 불필요)
- [x] `code` 에 PostgREST 오류 본문이 통째로 실려 DB 내부가 브라우저까지 흘렀고, 상태
      코드는 그 문자열에 "CONFLICT" 가 있는지로 골랐다 → `refundFailure()` 로 정규화
- [x] 마이그레이션 `20260914150000_refund_self_approval_precedence.sql` (함수 본문 순서만)

검증: 타입체크 통과 · 신규 6/6 · 뮤테이션 8/8 감지 · refund-store 4/4 · admin-orders 18/18 ·
admin-shell 기준선과 동일

---

### T-6b. 관리자 T22 — 콘텐츠 버전 쓰기 경로 ✅

스키마·권한·읽기 스토어는 이미 있었고 **쓰기 경로가 전혀 없었다.** draft 저장과 publish 를
붙이면서 세 가지를 막았다.

- [x] **없는 서비스를 만들거나 키를 바꾸는 것** — 정식 키는 경로에서만 오고 payload 의
      `serviceKey`·`key` 는 정규화에서 버린다. 카탈로그에 없는 키는 404
- [x] **나중 저장이 앞선 저장을 덮는 것** — draft·publish 모두 revision CAS
- [x] **검토한 것과 다른 게 게시되는 것** — publish 는 호출자가 보낸 checksum 이 저장된
      draft 와 같을 때만 통과
- [x] 게시는 **가격을 건드리지 않는다** — `getPaymentProduct`·서비스 목록 불변을 테스트로 고정
- [x] 행을 지우지 않는다 — 이전 게시본은 `archived` 로 남고, 서비스당 published 는 하나
- [x] RPC 2개 (`security definer` + 고정 `search_path`, service_role 전용)
- [x] 라우트 2개 — `services:write` / `services:publish`, 감사 명령·멱등 키 경유
- [x] 사유별 실패 문장 9종 (T18 에서 만든 방식 그대로)

검증: 타입체크 통과 · 신규 9/9 · 뮤테이션 12/12 감지 · admin-shell 기준선 동일
(scope 목록을 고정한 기존 테스트는 새 scope 2개를 반영해 갱신)

### T-6c. 관리자 T22 — 고객 읽기 어댑터 ✅

`GET /api/services`(검색 목록)가 게시된 개정을 반영한다.

- [x] 제목·한 줄 소개·설명·노출 여부만 반영. **가격은 언제나 배포된 카탈로그**
- [x] 저장소 없음·조회 실패·게시본 없음 → 배포된 카탈로그 그대로. 빈 목록이 되는 경로 없음
- [x] 라우트에도 폴백 한 겹 더 (목록이 비면 검색 화면이 통째로 빈다)
- [x] 노출을 꺼도 `serviceHrefForKey` 는 남는다 — 이미 만든 해석의 재진입 경로 보존
- [x] 형태가 깨진 게시 행은 무시하고 카탈로그 값을 쓴다 (`publishedServiceOverride`)

검증: 타입체크 통과 · 13/13 · 뮤테이션 8/8 감지

편집 UI 는 T24 로 범위 밖.

---

## 다음 트랙 (하나씩)

### ▶ T-7. 실결제 스모크 — **사전 점검 완료 · 실행은 운영자**

런북: `docs/admin-ops/payment-smoke-runbook.md`

실측 (`GET /api/payment/config`, 2026-09-14):
`configured: true · checkoutEnabled: true · testMode: false · storage: supabase`
→ **결제는 이미 열려 있고, 승인하면 실제로 청구된다.**

대상: **lucky_color 4,900원** (카탈로그 19개 중 최저가)

- [x] 운영 결제 설정 실측
- [x] 승인·망취소·금융 증거 경로 코드 확인
- [x] 확인 항목·대사 질의·실패 분기표 작성
- [ ] **결제 1건 실행** — 카드와 이니시스 콘솔 접근이 필요해 Cowork 에서 대신 할 수 없다

> ⚠ **이 결제는 시스템에서 환불되지 않는다.** 관리자 환불은 의도만 저장하고(`pgCalled: false`),
> 실제 취소 API 를 가진 `createInicisSandboxAdapter` 는 어디에서도 호출되지 않는다.
> 자동 취소는 망취소 하나뿐이고 "승인은 됐는데 우리 저장이 실패한" 경우에만 돈다.
> 정상 결제된 4,900원은 **이니시스 가맹점 콘솔에서 직접 취소**하거나 실매출로 남는다.
> 시작 전에 콘솔 접근 권한부터 확인할 것.

### T-5b. 남은 13개 서비스 실호출 증거 (운영자 실행 필요)

512섹션 / 약 **2,570만 토큰**. `OPENAI_API_KEY` 와 비용이 필요해 Cowork 에서 대신 돌릴 수 없다.
권장 순서는 작은 것부터 — work_move(10) → home_fit(12) → love_*·work_job(각 21) →
money_save(41) → love_this_year(48) → cat_compatibility(50) → job_choice(57) →
couple_signal·marry_match·match_couple(각 70). 상세는 위 문서.

---

## Claude Code 목록과의 대조

| Claude Code 후보 | 실제 상태 |
|---|---|
| 1. Cowork 미커밋 마무리 (티저 in-place + cmdg 가드) | ✅ 완료 (T-1) |
| 2. 나머지 서비스 슬롯 부착 | ✅ 04·06·05 완료 (T-2) |
| 3. Tone V2 다음 서비스 | 렌더러·장부 정리 완료. 실호출 13개가 남음 → T-5b |
| 4. 관리자 T18/T22 | ✅ 완료 (T-6 · T-6b). T22 고객 읽기 어댑터만 남음 |
| 5. 실결제 스모크 | 미착수 → T-7 |

> 1~4 는 끝났다. 남은 것은 T-7, 그리고 운영자 실행이 필요한 T-5b.

---

## 미커밋 일괄 정리 — **지금 해야 할 것**

이번 세션의 변경이 PC 저장소에 쌓여 있다. 배포 전에 한 번에 검증한다.

```powershell
cd C:\Users\USER\.aios\projects\umsh\repo
npm run typecheck
npx tsx --test --test-concurrency=1 tests/unit/*.test.ts
supabase db push          # 마이그레이션 2건
git add -A
git status                # 아래 목록과 맞는지 눈으로 확인
git commit -m "feat: 캐시 세대·해석 계보, 환불 실패 구분, 서비스 콘텐츠 버전, 결과 CTA 스티키"
vercel --prod
```

바뀐 파일 (이번 세션 전체):

| 영역 | 파일 |
|---|---|
| 결과 화면 CTA | `사주/사주/index.html` |
| 로딩 통일 | `사주/js/umsh-loading.js` |
| 캐시 세대 | `data/tone-v2/corpus/registry.json` · `src/types/index.ts` · `src/rag/corpus-registry.ts` · `src/report/report-store.ts` · `src/report/specialized-progressive.ts` |
| 릴리스 장부 | `tone-v2/releases/lucky-color-2.1.0.json` · `tone-v2/releases/quit-fortune-2.1.0.json` |
| 환불 | `src/payment/refund-store.ts` |
| 콘텐츠 버전 | `src/admin/service-version-store.ts` · `src/auth/staff.ts` |
| 공통 | `src/server/app.ts` |
| 마이그레이션 | `supabase/migrations/20260914150000_refund_self_approval_precedence.sql` · `20260914160000_service_config_version_commands.sql` |
| 테스트 | `corpus-cache-epoch` · `tone-v2-release-evidence-binding` · `refund-approval-precedence` · `service-content-versioning` · `admin-shell`(scope 목록 갱신) |
| 문서 | `docs/admin-ops/corpus-cache-policy.md` · `tone-v2-evidence-gap.md` · `payment-smoke-runbook.md` · `ops/STATUS.md` |

배포 후 확인: `/cmdg/` 결과 화면 스크롤 중 CTA 고정 · `/api/services` 가 `source: "catalog"` 로 응답(게시본이 아직 없으므로) · 기존 해석이 재생성되지 않음.

---

## 참고 · 되풀이되는 함정

- **이 저장소 HTML은 CRLF다.** 스크립트로 재작성하면 LF로 바뀌어 git diff 가 파일 전체 변경으로 뜬다.
- **06 상세의 본문 컨테이너 id가 서비스마다 다르다.** this-year `#detail-stack`, signal `#detail-root`,
  couple `#detail-body`, job-choice `#detailStage`. 일괄 치환 금지.
- **`wedding-section` 은 `<select>` 다.** 본문 타깃으로 잡으면 아무것도 렌더되지 않는다.
- **DB 캐싱은 이미 구현되어 있다.** `cheongi_reports` + `createOrGetReportRecord()`.
- **코퍼스를 고쳐도 재생성은 일어나지 않는다.** 다시 뽑아야 하면 `registry.json` 의 `cacheEpoch` 를 올린다.
  판단 기준은 `docs/admin-ops/corpus-cache-policy.md`.
- **특화 서비스 ID 생성기는 코퍼스를 보지 않는다.** 세대를 거치는 `epochScopedIds()` 를 반드시 통과시킬 것.
- **tone-v2 증거 해시는 LF 기준이다.** 파일은 CRLF 라 원본 바이트로 재면 전부 불일치로 나온다.
- **릴리스 게이트를 눈으로 믿지 말 것.** 2건이 실제 증거와 어긋나 있었다. 결합 테스트가 이제 막는다.
- **신원 검사는 동시성 검사보다 먼저.** 순서가 뒤집히면 권한 차단이 재시도 실패처럼 보인다.
- **PostgREST 오류 본문을 그대로 Error 로 던지지 말 것.** 함수 이름·hint 가 브라우저까지 간다.
