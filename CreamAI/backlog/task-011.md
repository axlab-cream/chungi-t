---
task_id: task-011
status: done
active: false
owner: claude-pm
created: 2026-09-10
priority: P1
depends_on: []
resolves: [U29, U30]
---
# task-011 — 브랜드 표기 통일과 정적 루트 노출 차단

## Purpose
고객 노출 문구에 브랜드가 두 가지로 섞여 있다. **어느 쪽이 정본인지는 이미 코드가
답하고 있다** — 구조화 데이터와 `og:site_name` 이 모두 `운명상회` 다.

그리고 브랜드/SEO 표면을 훑는 과정에서 **더 큰 문제를 발견했다.**
정적 루트에 섞여 있는 내부 산출물이 운영에서 그대로 서비스된다.

## A. 브랜드 표기 (U29)

### 정본 근거
| 신호 | 값 |
| --- | --- |
| `og:site_name` (`사주/index.html:10`, `faq.html`) | **운명상회** |
| schema.org `Organization.name` (`about.html`, `portal.html`) | **운명상회** |
| schema.org `WebSite.name` | **운명상회** |
| `<title>` 19개 | **운명상회** |
| `<title>` 4개 (정책 페이지) | UMSH 운명상회 ← **불일치** |

→ `UMSH 운명상회` 는 `privacy`·`refund`·`support`·`terms` 4개 파일에만 있다(15건).
구조화 데이터가 선언한 이름과 페이지 제목이 어긋나면 검색엔진에 브랜드 신호가 갈린다.

### `UMSH` 561건의 성격
대부분 **코드 식별자**다 (`UMSHReportAccess` 51, `UMSHPaymentBridge` 47,
`UMSHAuthSession` 34, `UMSHChrome` 28 …). 고객 노출 문구가 아니므로 손대지 않는다.
`UMSH의` 16건은 전부 내부 `PROMPT.md` 문서다.

## B. 정적 루트 노출 (U30) — 운영에서 실측 확인

`app.use(express.static(SAJU_UI))` / `app.use(express.static(SAJU_ROOT))`
(`src/server/app.ts:704-705`)가 정적 트리를 통째로 서비스한다. 그 트리에는 웹 자산이
아닌 내부 산출물이 섞여 있다.

| 노출 | 개수 | 운영 확인 |
| --- | --- | --- |
| `PROMPT.md` — 서비스 생성 프롬프트 원문 | 15 | `GET /me/pass-angle/01-step-1-story/PROMPT.md` → **200** |
| `*.py` — 스크래핑·검증 스크립트 | 7 | `GET /사주/extract_mhtml.py` → **200** |
| `*-RESULT.json` — 생성 결과 산출물 | 18 | 같은 경로 규칙으로 노출 |
| 스크랩 자료 (`extracted_content.md`, `teaser_korean_content.md`) | 2 | **200** |

**프롬프트 원문 공개는 이 프로젝트 규칙과 정면으로 어긋난다** —
ProjectOps §8.4 "로그에 원문 프롬프트를 저장하지 않는다",
`CLAUDE.md` "Do not store secrets in project memory, logs, prompts, or generated documents".
`robots.txt` 는 `Allow: /` 이고 이 경로들을 막지 않는다.

### 기능 의존 확인 (차단 안전성)
- HTML/JS 어디서도 `.md`·`.py`·`*-RESULT.json` 을 참조하지 않는다
- `detail-data.json` 은 `사주/js/cat-report-store.js` 가 **클라이언트에서 fetch 를 가로채**
  응답하며 서버에는 그 파일이 없다(현재도 404). 차단 영향 없음
- `robots.txt`·`sitemap.xml`·`.well-known/assetlinks.json` 은 예외로 유지해야 한다

## Scope
- Implement:
  - A: 정책 페이지 4개의 고객 노출 문구를 `운명상회` 로 통일
  - A: `Organization.alternateName: "UMSH"` 추가 — 도메인 토큰을 검색에 남기되 제목은 통일
  - B: 정적 마운트 앞에 확장자 가드 추가 (허용 목록 방식)
  - 회귀 테스트: 브랜드 표기, 가드 동작(차단/예외 양쪽)
- Do not implement:
  - 코드 식별자(`UMSH*` 네임스페이스) 변경
  - `PROMPT.md`·`*.py` 파일 **삭제** — 내부 자산이며 삭제는 사용자 판단
  - `사주/사주/` 폴더 이동 (`SAJU_UI` 로 실제 사용 중이다)

## Success Criteria
- [x] 고객 노출 HTML 에 `UMSH 운명상회` **0건** (재귀 수집 92개 페이지 검사)
- [x] 구조화 데이터에 `alternateName: UMSH` 존재 (about·portal)
- [x] `PROMPT.md`·`*.py`·`*-RESULT.json` 요청이 404
- [x] `robots.txt`·`sitemap.xml`·`assetlinks.json` 은 200 유지
- [x] `npm run typecheck` 0 오류, `npm test` **471 pass / 0 fail** (446 → 471)
- [x] `verify-seo-foundation` PASS
- [x] Codex 리뷰 **Critical 1 · Minor 2 반영**, Major 1 은 별건으로 승격

## 내가 만든 사고 하나 (기록)
`alternateName` 을 넣으려고 파이썬 문자열 슬라이싱을 썼다가 `about.html`·`portal.html`
**527줄을 잘라먹었다.** `git diff --stat` 으로 즉시 발견해 `git checkout` 으로 복원하고,
정확한 문자열 치환으로 다시 넣었다(diff +2/-1). Codex 가 두 파일의 잔존 손상 없음을 확인했다.
**교훈: 슬라이싱으로 파일을 조립하지 않는다. 유일 매칭을 확인한 문자열 치환만 쓴다.**

또 하나: 정규식에 **백스페이스 제어문자(0x08)** 가 섞여 들어가 `<script` 가
`<script<0x08>` 이 됐다. 테스트가 통과하지 않아서 발견했는데, 눈으로는 보이지 않았고
`cat -A` 로 확인했다. 변경 파일 전수에서 0x08 을 다시 검사했다.

## Codex 리뷰 (`CreamAI/logs/review/task-011_brand-and-static-exposure.md`)

### Critical — 확장자 목록이 `.html` 산출물을 놓쳤다
`사주/사주/extracted_decoded.html`(121KB, 외부 사이트 스크래핑 결과)이 여전히 200 이었다.
확장자로 막는 방식의 한계를 그대로 보여 준다.
→ **중첩 폴더가 만드는 두 번째 URL 공간(`/사주/...`) 자체를 닫았다.**
그 URL 공간에는 스크랩 산출물·수집 스크립트·앱 페이지 중복 URL 이 함께 들어 있었고,
링크하는 곳이 어디에도 없다(HTML·JS 전수 확인). 저장소 파일은 그대로 둔다 —
`check_ganji.py` 등이 로컬에서 상대 경로로 읽는다.

### Minor 2건 — 반영
- 인코딩 우회 4변형을 한 `it` 에 묶어 첫 실패에서 멈추던 것을 **9개 독립 케이스**로 분리
- 브랜드 검사가 최상위 HTML 만 보던 것을 **재귀 수집**으로 넓히고, 검사 대상을
  `script`·`style`·주석을 제거한 **실제 노출 텍스트**로 좁혔다

### Major (allow-list 구조 전환) — **U31 로 승격, 이 Task 에서 하지 않음**
"확장자 deny-list 는 미래의 산출물을 자동 보호하지 못한다"는 지적이 맞다.
근본 해법은 공개 자산 전용 디렉터리 분리 또는 서비스별 명시 마운트다.
그것은 정적 구조 재편이라 이 Task 범위를 넘고, 서비스 폴더 규약
(`00-SERVICE-GENERATION-CONTRACT.md` 의 경로 규칙)과 함께 설계해야 한다.

### 테스트가 스스로 잡은 우회 2건
1. `PROMPT%2Emd` — `req.path` 는 디코딩되지 않는데 `express.static` 은 디코딩한 경로로
   파일을 찾는다
2. `PROMPT.md/` — **원문 4017바이트를 그대로 반환했다.** `send` 가 경로 끝의
   슬래시·점을 무시한다
→ 원본·디코딩본·끝문자 제거본을 **모두** 검사하도록 고쳤다(`staticPathCandidates`).

## Risks
- **확장자 가드가 실제 자산을 막을 수 있다.** 허용 예외를 경로로 명시하고 테스트로 고정한다
- 가드를 정적 마운트보다 **앞**에 두면 이후 등록되는 API 라우트에도 걸린다 →
  `.json` 으로 끝나는 API 경로가 있는지 확인해야 한다 (`/.well-known/assetlinks.json` 하나)
- 브랜드 변경은 색인된 제목을 바꾼다. 검색 결과 제목이 갱신될 때까지 시간이 걸린다

## Verification Steps
- `npm test` **471 pass / 0 fail**, `npm run typecheck` 0 오류
- 신규 테스트 25건: 차단 10경로 + 우회 9변형 + 예외 3경로 + 웹 자산 3경로 + 브랜드 2건
- 음성 대조: 가드를 무력화하면 8건 실패 → 복원 확인
- 실측 매트릭스(로컬 서버): `PROMPT.md/`·`//`·`.`·`%20`·`%2F`·`%2Emd`,
  `extracted_decoded.html`·`%2Ehtml` **전부 404** /
  `robots.txt`·`sitemap.xml`·`assetlinks.json`·`/privacy`·`/css/policy.css` **200**
- `check:*` 15/15, `verify-seo-foundation` PASS, `qa:all-services` 20/20
- 배포 후 운영 재확인 필요

## 남긴 것
- **U31**: 정적 제공을 allow-list(공개 전용 디렉터리)로 전환 — Codex Major
- `PROMPT.md`·`*.py`·`*-RESULT.json` 파일은 **저장소에 그대로** 있다. 서빙만 막았다.
  배포 산출물에서 제외하는 것은 U31 과 함께 판단한다
