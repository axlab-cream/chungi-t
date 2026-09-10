# ProjectOps Memory Candidate

task_id: task-008
date: 2026-09-10
case_type: success (quality_gate)
failure_type: null
success_pattern: quality_gate
problem: |
  AIOps/ProjectOps 세션은 문서를 많이 만든다. 이 프로젝트는 미추적 항목이 26개(261파일)까지
  쌓였고, 그것이 저장소 자체 배포 preflight(`check:production-source`)의
  "작업 트리 청결" 조건을 막아 배포를 불가능하게 만들고 있었다.
  그런데 그 산출물에는 조사 로그·리뷰 보고서·프롬프트 원문이 섞여 있어
  "일단 전부 커밋"도 "일단 전부 무시"도 옳지 않았다.
solution: |
  커밋 전에 **세 단계**를 거친다. 순서가 중요하다.

  1. **규모 파악.** 항목별 파일 수를 세서 어디가 무거운지 먼저 본다.
     `git status --porcelain | grep '^??' | sed 's/^?? //' | while read p; do find "$p" -type f | wc -l; done`
  2. **비밀값·개인정보 스캔.** 커밋 후보 전체를 대상으로 JWT(`eyJ`), 벤더 키 접두어
     (`sb_secret_`, `sk-`), 비밀번호 포함 접속문자열(`postgres://user:pass@`),
     `Bearer <토큰>`, 이메일, 전화번호를 찾는다.
     **반드시 양성 대조를 함께 한다** — 이미 그 값이 있다고 아는 파일에 같은 패턴을 돌려
     검출되는지 확인한다. 그렇지 않으면 "0건"이 스캔이 깨진 것인지 실제로 없는 것인지 모른다.
  3. **분류 근거를 파일 자체에서 찾는다.** 추측하지 않는다.
     - 파일이 스스로 "커밋 금지"라고 적어두었는가 (`CLAUDE.local.md`)
     - 생성물인가 (`output/` ← `qa:all-services` 산출)
     - 프로젝트 규칙이 저장을 금지하는가 (ProjectOps §8.4 "로그에 원문 프롬프트 저장 금지"
       → `_prompt_*.txt`)
     - 기존 ignore 규칙이 이미 덮는가 (`*.log` → `*.codex-stdout.log`)

  그리고 **staged 목록에서 무시 규칙이 실제로 지켜졌는지 확인**한다.
  `.gitignore`에 넣었다고 끝이 아니다 — 이미 staged 되어 있으면 무시되지 않는다.
root_cause: |
  ProjectOps 산출물은 "작업 결과"이면서 동시에 "작업 부산물"이다. 둘을 구분하는 기준이
  사전에 정의되어 있지 않으면 매 세션 끝에 같은 고민을 반복하고, 그 사이 배포가 막힌다.
why_it_worked: |
  분류 기준을 취향이 아니라 **문서·규칙에 적힌 근거**에서 가져왔다. 그래서 사용자에게
  선택지를 제시할 때 각 항목에 "왜 이쪽인가"가 한 줄로 붙었고, 승인이 빨랐다.
  양성 대조를 넣은 덕에 "비밀값 0건"이 신뢰할 수 있는 진술이 되었다.
reuse_condition: |
  AIOps 세션이 끝나 산출물을 정리할 때. 또는 배포 게이트가 "작업 트리 비청결"로 막힐 때.
do_not_use_when: |
  커밋 후보가 순수 소스 코드뿐일 때. 그때는 분류 고민이 없다.
related_files:
  - .gitignore
  - CreamAI/backlog/task-008.md
  - scripts/check-production-source.mjs
recommended_prompt: |
  "커밋 전에 (1) 항목별 규모, (2) 비밀값·개인정보 스캔(양성 대조 포함),
   (3) 파일·규칙에 적힌 근거로 분류 — 세 단계를 거치고, staged 목록에서 무시 규칙이
   실제로 지켜졌는지 확인한 뒤 사용자 승인을 받아라."
recommended_command: |
  # 후보 목록
  git status --porcelain | grep '^??' | sed 's/^?? //' | while read -r p; do find "$p" -type f; done > /tmp/cand.txt
  # 스캔 (양성 대조 먼저)
  grep -loE "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|kr)" <known-file>   # 패턴 유효성
  grep -lE "eyJ[A-Za-z0-9_-]{10,}|sb_secret_|sk-[A-Za-z0-9]{20,}" $(cat /tmp/cand.txt)
  grep -lE "postgres(ql)?://[^ ]*:[^ @]+@|Bearer [A-Za-z0-9._-]{20,}" $(cat /tmp/cand.txt)
  # 분류 확인
  git check-ignore -q <path> && echo IGNORED || echo 커밋대상
  # staged 에서 무시 규칙 준수 확인
  git diff --cached --name-only | grep -cE '<ignore-pattern>'
revalidation_command: |
  node scripts/check-production-source.mjs  → exit 0 이면 게이트 유지.
  ProjectOps 문서를 갱신하면 다시 dirty 가 되므로 배포 직전에 커밋하고 재실행한다.
expires_at: 2026-12-31
privacy_level: internal
should_promote_to_rag: true

## 이 프로젝트의 분류 결정 (재사용)

| 대상 | 판정 | 근거 |
| --- | --- | --- |
| `CreamAI/` (logs·memory·reports 포함) | **커밋** | ProjectOps §8.3이 이 폴더 구조를 저장소의 일부로 규정 |
| `admin-ops-execution-pack/` | **커밋** | 구현의 명세 원본. MANIFEST SHA-256로 무결성 검증 가능 |
| `docs/admin-ops/`, `docs/adr/` | **커밋** | 조사 산출물과 결정 기록 |
| `goal/ROADMAP/rules/plan/tests/status.md` | **커밋** | ProjectOps 운영 코어 |
| `CLAUDE.local.md` | **ignore** | 파일 1행이 "git 커밋 금지"를 명시 |
| `output/` | **ignore** | `qa:all-services` 생성물 |
| `CreamAI/logs/**/_prompt_*.txt` | **ignore** | ProjectOps §8.4 "로그에 원문 프롬프트 저장 금지" |
| `*.codex-stdout.log` | 이미 ignore | 기존 `*.log` 규칙 |

## 배포 게이트가 녹색이 된 경로

이 프로젝트의 `check:production-source`는 두 조건을 요구한다.
차단 요인이 이렇게 줄었다.

```
T04 시점        2건  (작업 트리 비청결 + HEAD가 origin/main 미포함)
TASK-009 병합후  1건  (작업 트리 비청결)
TASK-008 커밋후  0건  → PASS
```

**교훈: 배포가 막혀 있을 때 그 원인이 "코드"가 아니라 "정리"일 수 있다.**
게이트 스크립트의 출력을 그대로 읽으면 무엇이 남았는지 정확히 알려준다.

또 하나: 이 게이트는 ProjectOps 문서를 갱신하는 순간 다시 빨간불이 된다.
스크립트 자신이 "Recheck immediately before promotion"이라고 밝히므로,
**배포 직전에 문서를 커밋하고 게이트를 다시 실행하는 순서**를 규칙으로 둔다.

## Evidence
- 커밋 `f9bcd17` (219파일) + `2d49b8d` (문서 갱신)
- 스캔: 후보 261파일에서 JWT/벤더키/접속문자열/Bearer/이메일/전화 **전부 0건**,
  양성 대조로 패턴 유효성 확인
- 게이트: `PASS: clean source includes the current remote main.` (exit 0)
- 커밋 후 재검증: MANIFEST SHA-256 ALL OK (21 files), typecheck 0 오류, dirty 0건

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true
