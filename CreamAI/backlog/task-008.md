---
task_id: task-008
status: done
active: false
owner: claude-pm
created: 2026-09-10
priority: P2
depends_on: [task-009]
unblocks: [TASK-015]
---
# task-008 — 미커밋 산출물 정리 및 커밋 전략 확정

## Purpose
`check:production-source`(저장소 자체 배포 preflight)의 **마지막 남은 차단 요인**이
"작업 트리 비청결"이다. TASK-009 병합으로 `origin/main` 미포함 차단은 해소됐으므로,
이 Task를 끝내면 배포 게이트가 녹색이 된다.

미추적 26개 항목(261파일)을 커밋 / gitignore로 분류한다.

## Scope
- Implement:
  - 미추적 항목 전수 분류
  - 비밀값·개인정보 스캔 (커밋 전 필수)
  - `.gitignore` 갱신 (로컬 전용·생성물)
  - 커밋 (사용자 승인 후)
- Do not implement:
  - push (별도 승인)
  - 배포 (TASK-015)
  - 코드 변경

## 안전 검사 결과 (커밋 전 수행)
| 검사 | 결과 |
| --- | --- |
| JWT (`eyJ…`) | **0건** |
| `sb_secret_` / `sk-` 키 | **0건** |
| Postgres 접속문자열(비밀번호 포함) | **0건** |
| `Bearer <토큰>` | **0건** |
| 이메일 주소 | **0건** |
| 전화번호 | **0건** |

패턴 검사는 양성 대조로 유효성을 확인했다 (`src/auth/admin.ts`와 `.env.example`에서
이메일을 정상 검출). 후보 261파일에서는 0건이다.

## 분류

### gitignore 추가 (커밋하지 않음)
| 대상 | 파일 수 | 사유 |
| --- | --- | --- |
| `CLAUDE.local.md` | 1 | 파일 자체가 "git 커밋 금지"를 명시 |
| `output/` | 39 | `qa:all-services` 등이 생성하는 QA·디자인 검수 산출물 |
| `CreamAI/logs/**/_prompt_*.txt` | 7 | ProjectOps 규칙 §8.4 "로그에 원문 프롬프트를 저장하지 않는다" |

`CreamAI/logs/**/*.codex-stdout.log` 6건은 기존 `*.log` 규칙으로 이미 무시된다.

### 커밋 (216파일)
| 그룹 | 내용 |
| --- | --- |
| ProjectOps 운영 코어 | `goal.md`, `ROADMAP.md`, `rules.md`, `plan.md`, `tests.md`, `status.md`, `AGENTS.md`, `CLAUDE.md` |
| CreamAI 워크스페이스 | `CreamAI/` — agents, backlog, logs(events/harness/research/review), memory/candidates, reports, scripts, skills, workflows |
| admin-ops 명세 | `admin-ops-execution-pack/` 22파일 (MANIFEST SHA-256 검증됨) |
| admin-ops 산출물 | `docs/admin-ops/` 7파일 (T01~T04 + 운영 정본 + 병합 계획) |
| ADR | `docs/adr/` 2파일 |
| 제품 문서 | `docs/API.md`, `ARCHITECTURE.md`, `DESIGN_SKILLS.md`, `DESIGN_SYSTEM.md`, `PRD.md`, `WORKFLOW.md` |
| 기타 | `evals/`, `mcp/`, `.mcp.json`, `.worktreeinclude`, wiki 1건, 서비스 프롬프트 규칙 폴더 |
| TASK-003 잔여 | `.env.example`(Sensitive 경고·REPORT_STORAGE_DIR), `README.md`(환경변수 동기화 절차) |

## Success Criteria
- [x] 비밀값·개인정보 스캔 0건
- [x] `.gitignore` 갱신
- [x] 커밋 완료 — `f9bcd17`, 219파일 (사용자 승인: "이 분류로 커밋")
- [x] `check:production-source` **PASS (exit 0)** — "clean source includes the current remote main"
- [x] push 미수행 (`ahead 24`)

## Risks
- `CreamAI/logs/`를 커밋하면 조사·리뷰 이력이 저장소에 남는다. ProjectOps 설계상
  의도된 것이지만(§8.3 폴더 구조), 저장소 크기와 공개 범위를 사용자가 확인해야 한다
- `admin-ops-execution-pack/`은 22파일이며 MANIFEST 무결성이 검증된 상태다.
  커밋 후에도 해시가 유지되는지 확인해야 한다

## Verification Steps
- 비밀값·개인정보 패턴 스캔 (양성 대조 포함)
- `git check-ignore`로 분류 확인
- 커밋 후 `node scripts/check-production-source.mjs`
- 커밋 후 `admin-ops-execution-pack` MANIFEST 재검증

## 결과 (2026-09-10)
- 커밋 `f9bcd17`, **219파일**. push 미수행.
- **배포 게이트가 처음으로 녹색이 되었다:**
  ```
  [production-source] PASS: clean source includes the current remote main.
  ```
  차단 요인이 2건(T04 시점) → 1건(TASK-009 후) → **0건**이 되었다.
- 작업 트리 dirty **0건**.
- 커밋 후 재검증: `admin-ops-execution-pack` MANIFEST SHA-256 **ALL OK (21 files)**,
  `npm run typecheck` 오류 0.
- gitignore 추가분이 실제로 지켜졌음을 staged 목록에서 확인 (4개 패턴 전부 0건 매치).

## 이 Task가 푼 것
TASK-015(배포)의 유일한 선행 조건이었다. 이제 배포는 **사용자 승인만** 남았다.
