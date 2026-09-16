# 운명상회 작업 트래커

최종 갱신: 2026-09-14 · 갱신 주체: Cowork 세션
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

## 다음 트랙 (하나씩)

### ▶ T-1. 로딩 통일 배포 검증 — **지금 할 것**

커밋·배포 후 다른 서비스에서 같은 로딩이 뜨는지 확인한다.

```powershell
cd C:\Users\USER\.aios\projects\umsh\repo
npm run typecheck
npx tsx --test tests/unit/cmdg-render-guards.test.ts
git add -A
git commit -m "feat: 공용 로딩 통일 + 톤 v2 렌더러 + 04/06 슬롯 14개 서비스"
vercel --prod
```

확인 경로: `/love/this-year`, `/place/home`, `/work/move` — 로딩 화면이 같은 모양이고
서비스명만 바뀌는지.

### T-2. 05 챗/목록 페이지 슬롯

04·06 은 끝났고 05 가 남았다. 서비스마다 DOM이 다르므로 일괄 치환 금지.
`slotNode()` 의 id 폴백 맵에 05 컨테이너를 추가하는 방식이 HTML 수정보다 안전하다.

### T-3. 결과 화면 CTA 부재 확인

라이브 `#result` 에서 `button.next-cta`/`a.next-cta` 가 **0개**였다.
결제·전체 해석 동선이 이 화면에 없는 것인지, 스크롤 아래에 있는 것인지 확인 필요.

### T-4. 코퍼스 개정 시 캐시 무효화 정책

`createReportId()` = `sha256(birth + context + corpusFingerprint + ownerId)`.
**톤 v2 코퍼스나 프롬프트를 고치면 기존 사용자 해석이 전부 재생성(LLM 재호출)된다.**
의도된 무효화이나 운영 정책이 필요하다.

### T-5. Tone V2 남은 서비스 — 풀 아웃라인 / 시각 증거

### T-6. 관리자 T18/T22 — 환불 UI 원인, 콘텐츠 버전 저장

### T-7. 실결제 스모크 — 운영자 승인 후 이니시스 1건

---

## Claude Code 목록과의 대조

| Claude Code 후보 | 실제 상태 |
|---|---|
| 1. Cowork 미커밋 마무리 (티저 in-place + cmdg 가드) | **cmdg 는 배포·검증 완료.** 로딩 통일분만 미커밋 → T-1 |
| 2. 나머지 19개 서비스 슬롯 부착 | **04·06 은 14개 서비스 완료.** 남은 건 05 → T-2 |
| 3. Tone V2 다음 서비스 | 렌더러는 완료, 콘텐츠 생성이 남음 → T-5 |
| 4. 관리자 T18/T22 | 미착수 → T-6 |
| 5. 실결제 스모크 | 미착수 → T-7 |

> 1·2번을 그대로 착수하면 중복 작업이 된다. T-1 → T-2 순서로 진행할 것.

---

## 참고 · 되풀이되는 함정

- **이 저장소 HTML은 CRLF다.** 스크립트로 재작성하면 LF로 바뀌어 git diff 가 파일 전체 변경으로 뜬다.
- **06 상세의 본문 컨테이너 id가 서비스마다 다르다.** this-year `#detail-stack`, signal `#detail-root`,
  couple `#detail-body`, job-choice `#detailStage`. 일괄 치환 금지.
- **`wedding-section` 은 `<select>` 다.** 본문 타깃으로 잡으면 아무것도 렌더되지 않는다.
- **DB 캐싱은 이미 구현되어 있다.** `cheongi_reports` + `createOrGetReportRecord()`.
  LLM 재호출 방지는 신규 개발 불필요.
