# 운명상회 작업 트래커

최종 갱신: 2026-09-14 · 갱신 주체: Cowork 세션 · 현재 트랙: **T-5**
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

## 다음 트랙 (하나씩)

### ▶ T-5. Tone V2 남은 서비스 — 풀 아웃라인 / 시각 증거 — **지금 할 것**


### T-6. 관리자 T18/T22 — 환불 UI 원인, 콘텐츠 버전 저장

### T-7. 실결제 스모크 — 운영자 승인 후 이니시스 1건

---

## Claude Code 목록과의 대조

| Claude Code 후보 | 실제 상태 |
|---|---|
| 1. Cowork 미커밋 마무리 (티저 in-place + cmdg 가드) | ✅ 완료 (T-1) |
| 2. 나머지 서비스 슬롯 부착 | ✅ 04·06·05 완료 (T-2) |
| 3. Tone V2 다음 서비스 | 렌더러는 완료, 콘텐츠 생성이 남음 → T-5 |
| 4. 관리자 T18/T22 | 미착수 → T-6 |
| 5. 실결제 스모크 | 미착수 → T-7 |

> 1·2·3(렌더러)·T-4 는 끝났다. 남은 것은 T-5 → T-6 → T-7.

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
