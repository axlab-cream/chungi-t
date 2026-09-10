# ProjectOps Memory Candidate

task_id: task-011
date: 2026-09-10
case_type: failure (security_risk) + success (quality_gate)
failure_type: security_risk
success_pattern: quality_gate
problem: |
  브랜드 표기를 통일하려고 SEO 표면을 훑다가 **더 큰 것을 발견했다.**
  `express.static` 이 정적 트리를 통째로 내보내고 있어서, 그 트리에 섞여 있던 내부
  산출물이 운영에서 공개되고 있었다.

  - `GET /me/pass-angle/01-step-1-story/PROMPT.md` → **200** (서비스 생성 프롬프트 원문 15개)
  - `GET /사주/extract_mhtml.py` → **200** (스크래핑 스크립트 7개)
  - `GET /사주/extracted_decoded.html` → **200** (외부 사이트 스크래핑 결과 121KB)
  - `*-RESULT.json` 18개, 앱 페이지 중복 URL

  프롬프트 원문 공개는 이 프로젝트 규칙과 정면으로 어긋난다(ProjectOps §8.4).
solution: |
  **확장자 deny-list 로 막고, 가드가 실제로 막는지 매트릭스로 확인한다.**
  그런데 이 방식은 두 번 뚫렸고 **두 번 다 테스트가 잡았다.**

  1. `req.path` 는 **디코딩되지 않는다.** 그런데 `express.static` 은 디코딩한 경로로
     파일을 찾는다 → `PROMPT%2Emd` 로 통과
  2. `send` 는 경로 끝의 **슬래시·점을 무시**하고 파일을 찾는다 → `PROMPT.md/` 가
     원문 4017바이트를 그대로 반환

  → 원본·디코딩본·끝문자 제거본을 **모두** 검사한다(`staticPathCandidates`).

  그리고 **확장자만으로는 부족하다.** 스크래핑 결과가 `.html` 로 저장돼 있어서
  목록을 지나갔다(Codex Critical). 그 폴더가 만드는 **URL 공간 자체를 닫는** 편이
  확실하다 — 링크하는 곳이 없음을 HTML·JS 전수로 먼저 확인했다.
root_cause: |
  정적 서버는 "폴더 안의 것을 전부 준다". 그 폴더에 개발 산출물을 두는 순간
  그것은 공개 자산이 된다. 확장자로 걸러내는 것은 사후 방어이고, 새로운 산출물
  형식이 생기면 다시 열린다.
why_it_worked: |
  가드를 만들고 **적대적 매트릭스**를 돌렸다 — 인코딩, 트레일링 슬래시·점·공백,
  대소문자, 이중 인코딩, 경로 순회. 그 매트릭스가 내 가드의 구멍 두 개를 찾았다.
  "차단됐다"를 코드 리뷰로 판단하지 않고 **요청을 보내서** 판단했다.
reuse_condition: |
  정적 파일 서버가 개발 산출물과 웹 자산을 같은 트리에 두고 있을 때.
  또는 경로 기반 접근 가드를 새로 만들 때.
do_not_use_when: |
  공개 자산 전용 디렉터리가 이미 분리돼 있을 때. 그때는 가드가 아니라 구조가 답이다.
related_files:
  - src/server/app.ts
  - tests/unit/static-exposure.test.ts
recommended_prompt: |
  "정적 루트에 웹 자산이 아닌 파일이 있는지 확장자로 세고, 대표 경로를 실제로 요청해
   상태 코드를 확인하라. 가드를 만들면 인코딩·트레일링 문자·대소문자·이중 인코딩·
   경로 순회 매트릭스로 우회를 시도하라. `req.path` 는 디코딩되지 않고 `send` 는
   경로 끝의 슬래시와 점을 무시한다는 것을 전제하라."
recommended_command: |
  # 노출 후보 세기
  for ext in md py json txt mhtml sh ps1; do find <static-root> -name "*.$ext" | wc -l; done
  # 운영/로컬에서 실제 요청 (코드 리뷰로 판단하지 않는다)
  curl -s -o /dev/null -w '%{http_code}' https://<host>/<path>/PROMPT.md
  # 우회 매트릭스
  #   PROMPT%2Emd  PROMPT.md/  PROMPT.md//  PROMPT.md.  PROMPT.md%20  PROMPT.md%2F
  #   PROMPT.MD  PROMPT%2520md  ../ 경로 순회
revalidation_command: |
  npm test → `tests/unit/static-exposure.test.ts` 25건이 이 지식의 오라클이다.
  가드를 무력화하면 8건이 실패한다.
expires_at: 2026-12-31
privacy_level: internal
should_promote_to_rag: true

## 브랜드 정본은 코드가 이미 답하고 있었다

"고객 노출에서 `UMSH` 를 뗄지"는 취향 문제처럼 보였지만 근거가 코드에 있었다.
`og:site_name`, schema.org `Organization.name`·`WebSite.name`, `<title>` 19개가
모두 `운명상회` 였고 `UMSH 운명상회` 는 정책 페이지 4개에만 있었다.
→ **선언된 이름과 페이지 제목이 어긋나면 검색엔진에 브랜드 신호가 갈린다.**
도메인이 `umsh.kr` 이므로 토큰은 `Organization.alternateName` 으로 남겼다.

**판단이 필요해 보이는 것도 먼저 코드에 근거가 있는지 찾아본다.**
561건의 `UMSH` 중 대부분은 코드 식별자(`UMSHReportAccess` 등)여서 대상이 아니었다.
검사 범위를 "노출 텍스트"로 좁히는 것이 규칙을 정하는 것보다 중요했다.

## 내가 만든 사고 둘 (같은 원인)

1. **파일을 잘라먹었다.** `alternateName` 을 넣으려고 파이썬 문자열 슬라이싱
   (`s[:m.end()] + ...`)을 썼다가 `about.html`·`portal.html` **527줄을 지웠다.**
   `git diff --stat` 으로 발견해 `git checkout` 으로 복원했다.
2. **정규식에 제어문자가 박혔다.** 편집 과정에서 `\b` 가 실제 백스페이스(0x08)로
   변환돼 `<script\b` 가 `<script<0x08>` 이 됐다. 눈으로는 안 보였고 `cat -A` 로 확인했다.

**둘 다 "문자열을 조립해서 파일을 만든" 결과다.**
→ 유일 매칭을 확인한 **문자열 치환만** 쓰고, 편집 직후 `git diff --stat` 으로
줄 수 변화를 본다. 정규식·특수문자를 편집할 때는 `cat -A` 로 실물을 확인한다.

## Evidence
- `npm test` 446 → **471 pass / 0 fail**, typecheck 0 오류
- 신규 25건: 차단 10경로 + 우회 9변형 + 예외 3경로 + 웹 자산 3경로 + 브랜드 2건
- 음성 대조: 가드 무력화 시 8건 실패 → 복원
- 실측: 우회 8변형 전부 404, 예외·웹 자산 200
- `check:*` 15/15, `verify-seo-foundation` PASS, `qa:all-services` 20/20
- Codex: Critical 1 / Major 1 / Minor 2 → Critical·Minor 반영, Major 는 U31 승격
  (`CreamAI/logs/review/task-011_brand-and-static-exposure.md`)

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true
