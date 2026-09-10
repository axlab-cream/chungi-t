# ProjectOps Memory Candidate

task_id: task-020
date: 2026-09-10
case_type: failure (security_risk) + success (quality_gate)
failure_type: security_risk
success_pattern: quality_gate
problem: |
  정적 노출을 **거부 목록**으로 막아 뒀는데(task-011) 그 방식이 형식을 세는 방식이라
  새 형식에 진다는 지적을 받았다. 기본값을 거부로 뒤집는 작업이었다.

  그런데 뒤집는 과정에서 **두 개의 살아 있는 유출을 더 찾았다.**
  1. `GET /me/pass-angle/…/PROMPT.md%5C` → 200, 프롬프트 원문 전체 (Codex 가 검증)
  2. `GET /extracted_decoded.html` → 200, 외부 사이트 스크랩 116KB (내가 발견)
solution: |
  **경로 가드를 만들면 "정적 서버가 열어 볼 수 있는 모든 표기"를 후보로 만들어야 한다.**
  이 프로젝트에서 필요한 후보는 네 가지였다.
   - 원본 `req.path` (디코딩 안 됨)
   - `decodeURIComponent` 결과 (`express.static` 이 쓰는 형태)
   - 백슬래시를 슬래시로 접은 형태 (**Windows 경로 구분자**)
   - 끝의 슬래시·점·공백을 떼어낸 형태 (`send` 가 무시한다)

  **그리고 확장자 허용 목록은 "형식"만 지킨다. "위치"는 지키지 못한다.**
  내부 산출물이 `.html` 로 저장돼 있으면 통과한다. 그래서 두 가지를 함께 했다.
   - 통째로 마운트한 폴더를 **줄인다** — 그 마운트가 실제로 제공하던 파일을 세어 보고,
     이미 다른 경로로 제공되는 것뿐이면 마운트를 없앤다
   - **도달성 테스트**로 고정한다 — 내부 산출물 이름 + 웹 확장자 조합이 모든 URL
     공간에서 404 인지 확인한다
root_cause: |
  정적 파일 서버는 "폴더 안의 것을 준다". 가드는 URL 문자열을 본다. 그 둘의 경로 해석이
  다르면 그 차이가 곧 우회다. 그리고 마운트를 하나 추가할 때 "무엇이 추가로 공개되는지"를
  세지 않으면, 필요 없는 파일이 함께 나간다.
why_it_worked: |
  **마운트가 실제로 제공하는 것을 세어 봤다.** `사주/사주` 최상위의 웹 확장자 파일은
  `index.html`(라우트가 직접 보낸다)과 `extracted_decoded.html`(스크랩) 둘뿐이었고
  `assets/` 는 이미 경로별로 마운트돼 있었다. 즉 그 마운트는 **스크랩 산출물만 추가로
  공개**하고 있었다. 세어 보지 않았다면 "혹시 필요할까" 하고 남겨 뒀을 것이다.

  그리고 **참조 자산 전수 크롤**을 테스트로 넣었다. 허용 목록에서 형식 하나를 빠뜨리면
  그 자산만 조용히 404 가 되는데, 이 테스트가 그것을 잡는다.
reuse_condition: |
  경로 기반 접근 가드를 만들거나 정적 마운트를 추가·제거할 때.
do_not_use_when: |
  공개 자산이 빌드 산출물 디렉터리로 이미 분리돼 있을 때. 그때는 가드가 필요 없다.
related_files:
  - src/server/app.ts
  - tests/unit/static-exposure.test.ts
recommended_prompt: |
  "정적 가드를 만들면 정적 서버가 열어 볼 수 있는 모든 경로 표기를 후보로 만들어라 —
   원본, 디코딩본, 백슬래시를 슬래시로 접은 것, 끝의 슬래시·점·공백을 떼어낸 것.
   확장자 허용 목록은 형식만 지킨다. 마운트를 추가하기 전에 그 마운트가 무엇을 추가로
   공개하는지 파일 단위로 세라. 그리고 참조된 자산이 전부 200 인지 크롤로 확인하라."
recommended_command: |
  # 마운트가 추가로 공개하는 것 세기
  find <mounted-dir> -maxdepth 1 -type f | ...      # 최상위 파일
  find <mounted-dir> -maxdepth 1 -type f \( -name "*.html" -o -name "*.js" ... \)
  # 우회 매트릭스 (전부 실제 요청으로)
  #   %2E  %5C  %5c  끝 /  끝 .  끝 %20  %2F%5C  %255C  대문자  ../
  # 참조 자산 크롤
  grep -rhoE '(href|src)="/[^"?#]+\.[a-z0-9]{2,8}' <pages> | sort -u
  grep -rhoE 'url\(["'"'"']?/[^)"'"'"']+\.[a-z0-9]{2,8}' <css> | sort -u
revalidation_command: |
  npm test → `tests/unit/static-exposure.test.ts` 52건이 오라클이다.
  음성 대조 3개: 허용목록→거부목록(6건 실패), 백슬래시 정규화 제거(6건 실패),
  중첩 마운트 복원(1건 실패).
expires_at: 2026-12-31
privacy_level: internal
should_promote_to_rag: true

## 세 번 연속 뚫린 기록 (같은 가드)

| 시도 | 뚫린 방식 | 누가 찾았나 |
| --- | --- | --- |
| 1차 (확장자 거부 목록) | `PROMPT%2Emd` — `req.path` 미디코딩 | 내 테스트 |
| 1차 | `PROMPT.md/` — `send` 가 끝문자 무시, 원문 4017B | 내 테스트 |
| 1차 | Vercel `rewrites` 가 파일시스템 우선 → 가드 자체를 우회 | 배포 후 운영 재확인 |
| 1차 | 스크랩 결과가 `.html` 이라 목록 통과 | Codex |
| 2차 (허용 목록) | `PROMPT.md%5C` — Windows 경로 구분자 | Codex (응답 검증) |
| 2차 | 중첩 폴더 루트 마운트 → `/extracted_decoded.html` 116KB | 내 확인 |

**교훈: 보안 가드는 한 번에 완성되지 않는다.** 매번 "이제 됐다"고 느꼈고 매번 남아 있었다.
그래서 (1) 매트릭스를 테스트로 남기고 (2) 배포 후 운영에서 다시 확인하고
(3) 음성 대조로 가드가 실제로 그 케이스를 막는지 확인한다. 세 가지 중 하나라도 빼면
다음 구멍을 못 본다.

## 남긴 한계 (정직하게)

`SAJU_ROOT` 전체 마운트는 여전히 남아 있다. 그 안에 웹 확장자로 내부 산출물이 새로
생기면 **테스트는 잡지만 런타임은 막지 못한다.** 근본 해법은 공개 자산 전용 디렉터리로
파일을 옮기는 것이고 그것은 서비스 폴더 규약과 함께 설계해야 한다 → **U32**.

## Evidence
- `npm test` 474 → **498 pass / 0 fail**, typecheck 0 오류
- 배포 후 운영 실측: 차단 7종 404 / 정상 15종 200
- 음성 대조 3건 전부 확인 후 복원
- Codex: Critical 1 / Major 1 / Minor 1 → 전부 반영
  (`CreamAI/logs/review/task-020_static-allowlist.md`)

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true
