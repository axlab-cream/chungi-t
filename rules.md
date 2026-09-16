# Rules

## 1. Core Documents

Tone V2: apply the user's common workflow at `C:/Users/user/.codex/workflows/aios-small-slice-workflow.md`: requirements -> PRD -> one vertical slice -> tests -> review -> KMS -> next issue. Keep supplied examples distinct from actual inputs. Do not mark partial checks as full release acceptance.

This project is managed through:

- `goal.md`
- `ROADMAP.md`
- `rules.md`
- `plan.md`
- `tests.md`
- `status.md`

If a file is missing, create it. If it exists, preserve it and update only the relevant parts. `status.md` is append-only.

## 2. Execution Rules

- Understand first, plan second, implement third.
- Do not implement without a goal.
- Do not skip the `ROADMAP.md` one-Task approval gate.
- Do not make broad changes without a plan.
- Do not declare completion without verification.
- Do not claim unrun tests passed.
- Do not delete user work unless explicitly requested.

## 3. Task States

- `TODO`
- `IN_PROGRESS`
- `DONE`
- `BLOCKED`
- `NEEDS_REVIEW`

## 4. Test States

- `PASS`
- `FAIL`
- `NOT_RUN`
- `BLOCKED`
- `NEEDS_REVIEW`

## 5. Safety Rules

- Do not store secrets, tokens, cookies, private keys, passwords, or raw secret-bearing logs.
- Mask sensitive data before writing logs or memory candidates.
- Ask before destructive or irreversible actions.

## 6. AIOps Rules

- Review `goal.md`, `ROADMAP.md`, `rules.md`, `plan.md`, `tests.md`, and `status.md` before substantial work.
- Before implementation, compare the selected project folder/project root with
  the terminal work instruction. If the selected folder appears to be project A
  but the instruction names project B, stop and ask:
  `프로젝트가 다릅니다. 그대로 진행하시겠습니까?`
- Follow `ROADMAP.md`: finish one Task, report the result, then wait for `다음`, `진행`, or `Continue` before starting the next Task.
- Every Task completion or blocked handoff must print the checkbox terminal
  brief from `CreamAI/workflows/task-completion-brief.md` before asking for
  next-step approval.
- Improve incomplete work instructions before implementation.
- If an initial PRD, planning document, roadmap, feature brief, screen brief,
  IA, Page Brief, wireframe, or PRD-derived TASK is present, run the mandatory
  PRD Screen Planning gate before implementation:
  `.claude/skills/prd-screen-planning/SKILL.md` and
  `.claude/skills/prd-screen-planning/references/prd-screen-planning-master.md`.
  Compare the source against the planning checklist and convert gaps into
  explicit `보완 필요`, assumptions, blockers, acceptance criteria, or
  Definition of Done items. Do not implement directly from a thin PRD.
- Record blockers, degraded modes, and unverified work in `status.md`.
- Claude hook commands in `.claude/settings.json` must use project-relative
  forward-slash paths such as `.claude/hooks/validate-bash.ps1`. Do not write
  absolute Windows paths like `C:\...` or escaped backslash paths into hook
  commands because Claude Code may strip the separators and call `C:Users...`.

## 7. CreamWIKI KMS Rules

- If the user invokes CreamWIKI, KMS, RAG, AIOS/KMS, or reusable success cases, follow `CreamAI/workflows/creamwiki-kms.md`.
- Normalize imported references to incorrect company/wiki names as `CreamWIKI`.
- Use only the user-designated global CreamWIKI root from `CREAMWIKI_ROOT`; do not infer it from the selected project folder.
- Search prior success/failure knowledge before implementation.
- Save verified reusable knowledge as a sanitized Markdown work-log.
- If CreamWIKI scripts are unavailable, use ProjectOps memory and repository search as a degraded fallback and record the limitation.
- Never mark missing CreamWIKI indexing as `PASS`; use `NOT_RUN` or `BLOCKED`.
- Remote access is the working path on this PC: the SSH tunnel
  `C:/Users/user/bin/creamwiki-tunnel.ps1` exposes the wiki API at
  `http://127.0.0.1:18765`, and `~/creamwiki/kms_cli.py` queries it. The public
  HTTPS API returns `302` and must not be used as the base URL.
- The wiki token belongs to the groupware account `carrotcap`; the SSH account
  `creamax` is transport only. Write only under `personal/carrotcap/`.
## 지식 기록 위치 (2026-09-11 사용자 결정: 위키 우선)

결정·오류·수정·검증·재발 방지 지식은 **CreamWIKI Personal KMS 에 먼저 쓴다.**
저장소에는 코드와 최소 링크만 둔다.

- 기록 경로: `notes/<주제>-<날짜>.md` → 서버의 `personal/carrotcap/notes/...`
- 문서 계약: `operations/aios-standards/14-memory-kms/AIOS-MEM-ROOT-memory-kms.md`
  (observation · decision · artifact · QA result · lesson · relation · next_patch)
- 작업 전 조회: `python ~/creamwiki/kms_cli.py search "<검색어>" --limit 5`
- API 는 SSH 터널 `http://127.0.0.1:18765` 만 쓴다. 공개 HTTPS 는 302 를 돌려준다
- **인증 명령(`login`)은 실행하지 않는다.** 토큰이 만료되면 사용자에게 일반 터미널에서
  인증을 요청한다. 비밀번호·토큰은 문서·코드·Git·로그 어디에도 남기지 않는다

저장소에 계속 남기는 것은 **검증 증거**다 — 테스트, CI 결과, 커밋 메시지.
그것들은 코드와 같은 커밋에 묶여 있어야 "언제 무엇으로 확인했는가"가 유지된다.

### 기록한 문서
| 경로 | 주제 |
| --- | --- |
| `notes/umsh-payment-storage-integrity-20260911.md` | 주문 상태 직렬화(U17)·불확정 승인(U22)·영속성 게이트(U20) |
| `notes/static-exposure-guard-20260911.md` | 정적 서버 내부 산출물 노출, 가드가 여섯 번 뚫린 기록 |
## Comparative nextCriterion recognition guard (2026-09-13)

- Accept `해봐` only for the existing safe comparison/check action family, never as a generic encouragement wildcard.
- A subject-marked target must be an observable outcome clause and remain bound to a concrete safe action.
- Preserve negation, past/perfect, targetless, vague, and exam/study abandonment rejections.
- Historical failed records are immutable evidence; a corrected replay must not rewrite their status or hash.
