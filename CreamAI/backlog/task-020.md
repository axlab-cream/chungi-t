---
task_id: task-020
status: active
active: true
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
- [ ] 허용 목록에 없는 확장자는 기본 거부 (`.csv`·`.yaml`·`.env`·`.map` 등)
- [ ] 기존 차단 대상(`PROMPT.md`·`*.py`·`*-RESULT.json`·스크랩 html·중첩 URL)은 계속 404
- [ ] 예외 3경로(`robots.txt`·`sitemap.xml`·`assetlinks.json`)는 200 유지
- [ ] 허용 형식(html·css·js·webp·png·jpg·ico·mp4·woff2·ttf·xml)은 200 유지
- [ ] 확장자 없는 파일이 트리에 없음을 테스트로 고정
- [ ] `npm run typecheck` 0 오류, `npm test` 전수 통과 (현재 474)
- [ ] Codex 리뷰 Critical/Major 반영

## Risks
- **허용 목록 누락이 자산을 막는다.** 트리의 확장자를 전수로 세어 근거를 만들고,
  형식별로 실제 200 을 확인하는 테스트를 둔다
- **확장자 없는 요청**은 통과시킨다(예쁜 URL 은 라우트가 처리하고, 정적은 `index:false`).
  트리에 확장자 없는 파일이 생기면 그 순간 노출되므로 테스트로 감지한다
- `.map`(소스맵)을 허용하지 않는다. 지금 없고, 있으면 소스가 나간다

## Verification Steps
- 확장자 전수 재집계 후 허용 목록과 대조
- 로컬 서버 매트릭스: 허용 형식 200 / 미허용 형식 404 / 예외 200
- `npm run typecheck` / `npm test` / `check:*` / `qa:all-services`
- 배포 후 운영에서 같은 매트릭스 재확인
