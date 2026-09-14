# Cowork → Claude Code 작업 인계서

작성: 2026-09-14 · 작성자: Claude (Cowork 세션) · 대상 저장소: `C:\Users\USER\.aios\projects\umsh\repo`

## 왜 인계하는가

Cowork 원격 셸(`device_bash`)이 2026-09-08 Windows 업데이트 이후 연결 폴더를 마운트하지 못한다.
그래서 이 세션에서는 `npm run typecheck`, `vercel dev`, `node --test` 를 **한 번도 실행하지 못했다.**
파일 읽기/쓰기만 가능해 코드 수정은 했으나, 아래 "검증 안 된 것" 항목은 실제 실행으로 확인해야 한다.

Claude Code 는 이 이슈의 영향을 받지 않는다.

---

## 1. 이미 수정해서 저장소에 반영한 것

### 1-A. 티저·해석 페이지에 등록 디자인이 적용되지 않던 문제

**원인 (라이브 DOM 확인 완료)**

`사주/js/umsh-report-access.js` 가 로드 직후 등록 디자인을 통째로 숨기고 자체 마크업으로 교체하고 있었다.

```js
// line 304 — CSS 가드
'html[data-umsh-report-check] body > :not(#umsh-verified-layout)…{display:none!important}'

// line 90 — panel(): body 자식 전부 은폐
document.body.children.forEach(item => { item.hidden = true;
  item.style.setProperty('display','none','important') })

// line 439 — boot(): 권한 확인 시작과 동시에 panel() 호출 → 이 시점에 디자인이 사라짐
```

발동 조건 `isOutputPage()` = `04-step|05-step|06-step|/r/:id|?reportId=` 이고 `ROUTES` 에 21개 서비스가 전부 있어 **전 서비스 동일 증상**이었다.

운영 페이지 실측: `#step-4-report.phone` 이 `hidden=true`, 그 안 `04-free-hero.webp` 는 `naturalWidth=941` 인데 `offsetParent=null`. 파일은 수신됐는데 조상이 `display:none`.

**안전성 근거** — 디자인 껍데기에는 유료 본문이 없다. 본문은 전부 `<script type="application/json">` 안에 있다.

| 페이지 | 파일 크기 | 렌더 텍스트 | 본문 위치 |
|---|---|---|---|
| 04 티저 (this-year) | 39KB | 1,246자 (무료 티저 카피) | `#TEASER_DATA` |
| 05 목록 | 70KB | 370자 (라벨만) | `#REPORT_INDEX_DATA` |
| 06 상세 | 346KB | **186자** (라벨만) | `#DETAIL_DATA` 등 script 325KB |

**수정 내용**

| 파일 | 상태 | 내용 |
|---|---|---|
| `사주/js/umsh-report-access.js` | 수정 | in-place 렌더 모드 추가 |
| `사주/css/umsh-verified-inplace.css` | **신규** | 진행률 바·근거 카드·스켈레톤 |
| `사주/love/this-year/04-step-4-report/index.html` | 수정 | 슬롯 5개 (12줄) |
| `사주/love/this-year/06-step-6_1-report-detail/index.html` | 수정 | 슬롯 5개 + 진행률 패널 (11줄) |

**설계**

- 옵트인: `<html data-umsh-verified-inplace>` 가 있는 페이지만 새 모드. 없으면 기존 전면 은폐 유지 → 슬롯 미부착 서비스가 조용히 깨지지 않는다.
- 슬롯: `data-umsh-slot="headline|summary|insights|paid-value|state|title|subtitle|sections|progress|checkout"`
- 검증 전 가드: `[data-umsh-slot]:not([data-umsh-filled]){visibility:hidden}` — 정적 HTML에 박힌 **샘플 문구는 모든 사용자에게 동일**하므로 내 결과처럼 보이면 안 된다.
- `revealAncestors()` — `#detail-content` 처럼 `hidden` 으로 접힌 래퍼를 슬롯 채울 때 연다.
- `boot()` 의 선제 `panel()` 호출을 `statusInPlace()` 로 대체 (이게 실패 10건의 원인이었다).
- 공개 API에 `UMSHReportAccess.inPlace()`, `.renderProgress(report)` 추가.

**검증 완료** — 헤드리스 크로미움 33/33 통과. 디자인 유지, 이미지·영상 표시, 슬롯 주입, 진행률 40%(실측 144.8/362.0px), ARIA, 완료 전환, 옵트인 제거 시 폴백.

### 1-B. 6-1 진행률 UI

`umsh-progressive-report.js` 에 부품은 있었으나 **포함된 파일이 `report-view.html` 하나뿐**이었다 (등록 디자인 04·05·06 은 0건). 또한 기존 `.interpret-progress` 는 무한 스캔 애니메이션이라 진행률이 아니었다.

`renderProgress()` 를 새로 구현했다. 서버의 `report.progress {complete,total}` 을 퍼센트로 그리고, `role="progressbar"` + `aria-valuenow/max/valuetext`, 섹션별 `is-ready/is-generating/is-pending/is-failed` 배지, `prefers-reduced-motion` 대응.

### 1-C. 천명사주(cmdg) "해석 시작"이 넘어가지 않던 문제

**원인 (운영 페이지에서 요청 본문까지 확보)**

```
PUT /api/user/profile → 400
요청: {"name":"", "birth":{"year":2000,"month":1,"day":1,...}, "birthTimeKnown":false}
응답: {"error":"이름은 한글 2자 이상 20자 이하로 입력해 주세요."}
```

`analyzeBirth()` 첫 줄의 `saveCurrentUserProfile()` 이 400 → throw → `showNudge()` + `go("concern")`.
**`/api/saju/analyze` 는 호출조차 되지 않는다.** 토스트가 잠깐 떴다 사라져 "아무 일도 안 일어남"으로 보인다.

`state` 가 비어 있는데(`상단 칩이 "이름 · 양력 생년월일" 플레이스홀더`), `localStorage.cheongi_user_birth_profile_v1` 에는 정상 프로필이 남아 있었다. `renderMy()` 는 캐시에서 복구하는데 `renderConcern()` 은 하지 않는 것이 차이.

**수정 내용** — `사주/사주/index.html` 5곳

| 추가/변경 | 내용 |
|---|---|
| `isUsableProfileName()` | 서버 `isValidProfileName` 과 동일 규칙 `/^[가-힣]{2,20}$/` |
| `hasUsableProfileState()` | 이름 + 생년월일 동시 확인 |
| `hydrateProfileFromCache()` | localStorage 캐시에서 상태 복구 |
| `renderConcern()` | 진입 시 캐시 복구 추가 |
| `beginAnalysisAfterAuth()` | 캐시 → 서버 순 복구, 이름 형식까지 검사 |
| `saveCurrentUserProfile()` | 무효 상태면 PUT 하지 않고 `needsProfile` 에러 throw |
| `analyzeBirth().catch` | `needsProfile` 이면 `go("name")` |

**검증 완료** — 가드 함수 단위 테스트 20/20 (빈 값·1자·영문·한영혼용·21자 거부, 20자 허용, trim, 캐시 복구, 이미 유효하면 미덮어씀).

**다른 서비스 조사 결과 — 이 문제는 cmdg 단독**

| 서비스 | `/api/user/profile` | 차단 위험 |
|---|---|---|
| cmdg | **PUT (분석 전 저장)** | 있음 → 수정함 |
| this-year, signal, jobchoice, quit, save, cat, lucky, newyear, wedding, couple | GET 만 | 없음 |
| marry | POST 하나 `!self.name` 가드 + `.catch()` | 없음 |
| portal, work-move | GET 만 | 없음 |

---

## 2. 검증 안 된 것 (Claude Code에서 반드시 확인)

```powershell
cd C:\Users\USER\.aios\projects\umsh\repo
npm run typecheck
node --test --test-concurrency=1 tests/unit/*.test.ts
vercel dev
```

1. **`tests/unit/static-exposure.test.ts`** — 정적 노출 가드 회귀. 새 CSS 파일 추가가 영향 없는지.
2. **`scripts/qa-all-services.ts`** (`npm run qa:all-services`) — 전 서비스 회귀.
3. **`/cmdg/#concern`** — 칩에 `정재용 · 양력 19750926` 이 뜨는가. `해석 시작` 이 로딩을 지나 결과까지 가는가. 프로필 없는 계정에서는 고민 화면이 아니라 **이름 입력 화면**으로 가는가.
4. **`/love/this-year/04-step-4-report/index.html?reportId=…`** — 히어로 이미지·시그널 카드·결제 패널 영상이 보이면서 본문이 검증값으로 채워지는가.
5. **`/love/this-year/06-step-6_1-report-detail/index.html?reportId=…`** — 진행률 바가 `n/total` 로 뜨는가.

> Cowork 세션에서 이미지 자산을 클라우드로 가져올 수 없었다(연결 폴더 기준 8단계 깊이, 스테이징 한계 7단계). 헤드리스 캡처의 이미지는 동일 치수 플레이스홀더였다. 실물 확인은 로컬에서 해야 한다.

---

## 3. 남은 작업

### 3-1. 나머지 19개 서비스에 슬롯 부착 (최우선)

`love/this-year` 04/06 이 기준 구현이다. 같은 패턴을 아래에 적용한다.

대상: `signal`, `jobchoice`, `quit`, `save`, `cat`, `lucky`, `newyear`, `wedding`, `couple`, `marry`, `pass-angle`, `work-move`, `home`, `mind`, `again`, `spouse`, `today/free`, `work/job`, `cmdg`

각 서비스 `04-step-4-report/index.html`, `05-step-5-chat/chat.html`, `06-step-6_1-report-detail/index.html` 에서:

1. `<html lang="ko">` → `<html lang="ko" data-umsh-verified-inplace>`
2. 04: 헤드라인 `h1` → `data-umsh-slot="headline"`, 요약 `p` → `summary`, 신호 목록 컨테이너 → `insights`, 유료 범위 설명 `p` → `paid-value`, 상태 `p` → `state`
3. 06: 제목 `h1` → `title`, 리드 `p` → `subtitle`, 본문 컨테이너 → `sections`, 상태 패널 → `state`, 그리고 스크롤 영역 최상단에 진행률 패널 삽입
   ```html
   <section class="umsh-progress-panel" data-umsh-slot="progress" aria-label="해석 준비 진행률" hidden></section>
   ```

**주의: 컨테이너 id가 서비스마다 다르다.** this-year 06 은 `#detail-stack`/`#detail-content`, signal 06 은 `#detail-root` 다. 파일마다 실제 구조를 확인하고 붙일 것. 일괄 치환 금지.

**주의: 이 저장소의 HTML은 CRLF다.** 파이썬 등으로 재작성하면 LF로 바뀌어 git diff 가 파일 전체 변경으로 뜬다. 반드시 CRLF를 유지할 것. (이번 세션에서 한 번 발생시켰고 되돌렸다.)

### 3-2. step 1~3 로딩을 `/cmdg/#loading` 공통 UI로 통일

서비스별 식별자(서비스명·도메인)를 주입해 공통 UI라도 통일감을 유지한다. 아직 착수하지 않았다.

### 3-3. 코퍼스 개정 시 캐시 무효화 정책

`createReportId()` = `sha256(birth + context + corpusFingerprint + ownerId).slice(0,28)`.
**`corpusFingerprint` 가 캐시 키에 들어가므로, 톤 v2 코퍼스나 프롬프트를 고치면 기존 사용자 해석이 전부 재생성(LLM 재호출)된다.** 의도된 무효화이긴 하나 운영 정책이 필요하다.

참고: DB 캐싱 자체는 이미 구현되어 있다. `cheongi_reports` 테이블(PK `report_id`, `payload jsonb`, `public_id`, `progress_complete/total`, `status`)에 저장되고 `createOrGetReportRecord()` 가 기존 레코드가 있으면 그대로 반환한다. 새로 만들 것 없음.

---

## 4. 참고 — 아키텍처 메모

- 등록 디자인 HTML은 `사주/` 아래에 있고 `vercel.json` 의 `includeFiles` 로 함수 번들에 포함된다.
- `prepare-vercel-public.mjs` 는 **허용 목록 방식**으로 `public/` 을 매 빌드 재생성한다. `사주/사주/index.html` → `public/cmdg/index.html`.
- `handle: filesystem` 은 `public/` 만 노출하고 나머지는 전부 함수로 간다.
- `app.use(cachedStatic(SAJU_ROOT, { index: false }))` 가 `사주/` 트리를 확장자 허용 목록으로 필터링해 서빙한다. 따라서 `사주/love/this-year/assets/**` 는 정상 접근 가능하다.
