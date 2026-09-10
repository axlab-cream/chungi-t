---
task_id: task-020
status: done
active: false
owner: claude-pm
created: 2026-09-10
priority: P1
depends_on: [task-011]
resolves: [U31]
---
# task-020 — 정적 제공을 거부 목록에서 허용 목록으로

## Purpose
TASK-011 은 정적 노출을 **거부 목록(deny-list)** 으로 막았다. Codex 가 그 한계를
지적했고(Major) 실제로 그 방식이 한 번 뚫렸다 — 외부 사이트 스크래핑 결과가 `.html` 로
저장돼 있어서 확장자 목록을 지나갔다.

**거부 목록은 형식을 세는 방식이라 새 형식에 진다.** 다음 생성 도구가 `.csv`,
`.yaml`, 확장자 없는 파일을 만들면 그 순간 공개된다. 기본값을 뒤집는다.

## 근거 — 트리의 실제 확장자 분포 (2026-09-10)
| 확장자 | 개수 | 성격 |
| --- | --- | --- |
| webp 446 · png 52 · jpg 1 · ico 1 | 500 | 이미지 |
| html 127 | | 페이지 |
| js 61 · css 21 | | 스크립트·스타일 |
| mp4 56 | | 영상 |
| woff2 9 · ttf 3 | | 웹폰트 |
| xml 1 (`sitemap.xml`) · txt 1 (`robots.txt`) | | SEO |
| **json 19** | | `assetlinks.json` 1개만 공개 대상, 나머지는 생성 산출물 |
| **md 17 · py 7** | | 내부 문서·스크립트 |

**확장자 없는 파일은 0개다.** 그래서 "확장자가 있고 허용 목록에 없으면 거부"가
현재 트리를 전부 덮는다. 이 전제는 테스트로 고정한다.

## Scope
- Implement:
  - `NON_WEB_STATIC_FILE`(거부) → `PUBLIC_STATIC_FILE`(허용)로 전환
  - 확장자 없는 파일이 트리에 생기면 실패하는 테스트 (전제 붕괴 감지)
  - 새 형식이 기본 거부되는지 확인하는 테스트 (`.csv`·`.yaml`·`.env`·`.map`)
  - 허용 형식이 실제로 서비스되는지 확인하는 테스트 (webp·mp4·woff2·ttf)
- Do not implement:
  - 공개 자산 전용 디렉터리로 **파일 이동** — 서비스 폴더 규약
    (`00-SERVICE-GENERATION-CONTRACT.md` 의 경로 규칙)과 함께 설계해야 한다.
    이번에는 기본값만 뒤집는다
  - `PROMPT.md`·`*.py` 파일 삭제

## Success Criteria
- [x] 허용 목록에 없는 확장자는 기본 거부 (`.csv`·`.yaml`·`.env`·`.js.map`·`.rtf`·`.sqlite`)
- [x] 기존 차단 대상은 계속 404
- [x] 예외 3경로는 200 유지
- [x] 허용 형식 8종 실측 200
- [x] 확장자 없는 파일이 트리에 없음을 테스트로 고정
- [x] `npm run typecheck` 0 오류, `npm test` **498 pass / 0 fail** (474 → 498)
- [x] Codex 리뷰 **Critical 1 · Major 1 · Minor 1 반영**

## Codex 리뷰 (`CreamAI/logs/review/task-020_static-allowlist.md`)

### Critical — `%5C` 백슬래시 우회 (Codex 가 실제 응답으로 검증)
`GET /me/pass-angle/01-step-1-story/PROMPT.md%5C` → **200, 프롬프트 원문 전체**.
`decodeURIComponent` 가 끝에 백슬래시를 남기는데 끝문자 제거는 `/`·`.`·공백만 처리했다.
Windows 는 백슬래시를 경로 구분자로 쓰므로 `express.static` 이 파일을 찾아 냈다.
→ 후보 경로를 만들 때 **백슬래시를 슬래시로 접어** 넣는다. 9개 변형을 매트릭스에 고정했다.

### Major — 허용 확장자로 저장된 내부 산출물은 여전히 나간다
Codex: "closing only `/사주/` fixes the currently known scraped HTML file, but does not
resolve the general failure mode." 확인하는 과정에서 **살아 있는 사례를 찾았다.**

`GET /extracted_decoded.html` → **200, 스크랩 원문 116KB.**
중첩 폴더가 `/사주/` 뿐 아니라 **루트 URL 공간에도** 통째로 마운트돼 있었다
(`app.use(express.static(SAJU_UI, { index: false }))`).

그 마운트가 실제로 제공하던 것을 세어 보니, 최상위 웹 확장자 파일은 `index.html`
(라우트가 `sendFile` 로 직접 보낸다)과 `extracted_decoded.html` 뿐이고 `assets/` 는
경로별로 이미 명시 마운트돼 있었다. → **그 마운트는 스크랩 산출물만 추가로 공개했다.**
제거하고 자산·페이지 14종을 전후 대조해 의존이 없음을 확인했다.

### Minor — 우회 매트릭스에 `%5C` 부재
반영. 더해서 우회 케이스가 **상태 코드만 보던 것을 본문 유출까지** 보도록 바꿨다.

### Codex 가 확인해 준 것 (OK)
- 참조 자산의 확장자는 전부 허용 목록 안에 있다. CSS `url()`·`@font-face` 도 `.webp`·`.woff2`
- `detail-data.json` 은 클라이언트에서 가로채므로 네트워크 자산이 아니다
- 고정 404 본문은 정책 지문일 뿐 존재 여부를 노출하지 않는다

## Risks
- **허용 목록 누락이 자산을 막는다.** 트리의 확장자를 전수로 세어 근거를 만들고,
  형식별로 실제 200 을 확인하는 테스트를 둔다
- **확장자 없는 요청**은 통과시킨다(예쁜 URL 은 라우트가 처리하고, 정적은 `index:false`).
  트리에 확장자 없는 파일이 생기면 그 순간 노출되므로 테스트로 감지한다
- `.map`(소스맵)을 허용하지 않는다. 지금 없고, 있으면 소스가 나간다

## Verification Steps
- `npm test` **498 pass / 0 fail**, typecheck 0 오류
- 신규 테스트: 허용 목록 밖 6형식 404(본문이 가드의 것인지까지) · 허용 형식 8종 200 ·
  확장자 없는 파일 0개 · 백슬래시 9변형 · **내부 산출물 이름 + 웹 확장자 조합의 도달 불가** ·
  **참조 자산 전수 200 크롤**
- 음성 대조 3건: 허용목록→거부목록(6건 실패) / 백슬래시 정규화 제거(6건 실패) /
  중첩 마운트 복원(1건 실패 — `/extracted_decoded.html` 200) — 전부 복원 확인
- **배포 후 운영 실측**: 차단 7종(`/extracted_decoded.html`·`/사주/…`·`PROMPT.md`·`%5C`·
  `PROMPT.md/`·`.csv`·`/data/runtime-config.json`) **전부 404** /
  정상 15종(`/` `/faq` `/about` `/privacy` `/terms` `robots.txt` `sitemap.xml`
  `assetlinks.json` `policy.css` `faq-knowledge.js` `brand-logo.png` `asset-one.webp`
  `MaruBuri-Bold.woff2` `favicon.ico` `/index.html`) **전부 200**

## 남긴 것
- **U32**: 공개 자산 전용 디렉터리로 파일을 옮기는 경로 기반 모델. 지금은 기본값을
  뒤집고 마운트를 줄였지만, `SAJU_ROOT` 전체 마운트는 남아 있다. 그 안에 웹 확장자로
  내부 산출물이 새로 생기면 **테스트가 잡되 런타임은 막지 못한다.**
  서비스 폴더 규약과 함께 설계해야 한다
