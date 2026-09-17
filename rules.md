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
- 승인/실행 정책은 §6을 따른다 (SSOT). 본 절에 중복 기술하지 않는다.
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

## §6. 실행 승인 모델 (SSOT)

본 절은 AIOS ProjectOps 승인/실행 정책의 단일 진실원천이다.
타 문서는 본 절을 참조만 하며 정책을 중복 기술하지 않는다.
충돌 시 본 절이 우선한다.

### 6.1 기본 모드 — 무중단 연속 실행
승인된 ROADMAP 이슈에 대해 supervisor는
구현 → 검증 → 리뷰 → 기록 → 다음 이슈 사이클을
승인 이슈가 소진될 때까지 사람의 개입 없이 연속 수행한다.
Task 경계 확인, 선택지 제시, 진행 여부 질의를 하지 않는다.

### 6.2 기본값 결정 규칙 (질문 대체)
판단이 갈릴 때 질문하지 않고 아래를 적용한다.

| 코드 | 상황 | 기본값 |
|------|------|--------|
| D1 | 구현 방식 복수 | 기존 컨벤션에 가까운 쪽 |
| D2 | 스펙 모호 | goal.md 최소 해석, 스코프 확장 금지 |
| D3 | 문서-코드 불일치 | 코드를 정본으로, 문서 갱신 |
| D4 | 테스트 실패 | 원인 수정. 삭제·skip 금지 |
| D5 | 미선언 의존성 | 추가하지 않고 [BLOCKED] 기록 후 다음 이슈 |
| D6 | 판단 불가 | [BLOCKED] 기록 후 다음 이슈 |
| D7 | 동일 원인 3회 실패 | [BLOCKED] 기록 후 다음 이슈 |
| D8 | 리뷰어 지적 사항 | 스코프 내면 즉시 반영, 밖이면 [DEFERRED] |

원칙: 막히면 멈추지 않고 건너뛴다.

### 6.3 하드 스톱 (해당 작업만 스킵, 실행은 계속)
| 코드 | 조건 |
|------|------|
| H1 | 원격 git push / force push / 브랜치 삭제 / PR 머지 |
| H2 | 배포 실행, DNS·TLS·nginx·systemd 변경, DB 마이그레이션 |
| H3 | 시크릿(.env, 키, 토큰) 외부 전송 |
| H4 | 세션 이전 파일의 비가역적 삭제 |
| H5 | 본 §6 자체의 변경 |

해당 작업은 수행하지 않고 status.md에 [GATE]로 기록한 뒤
다음 이슈로 진행한다. 전체 실행을 중단하지 않는다.

### 6.4 자율 판단 (묻지 않음)
구현 방식, 파일 분할, 테스트 추가, 리팩터링, 로컬 커밋,
문서 오탈자·경로 정합 수정, 린트 수정.

### 6.5 코어 문서 로딩
필수: goal.md, ROADMAP.md, status.md, rules.md §6, AGENTS.md
조건부: plan.md / tests.md 는 이슈 ID·모듈명 검색 구간만,
        run-team.md 는 멀티에이전트 분배 시에만.

### 6.6 코드 리뷰어
코드 리뷰어는 Grok이다. 호출 경로는 `CreamAI/scripts/run-reviewer.ps1 -Cli grok`.
Codex는 rate limit으로 기본 경로에서 제외한다. 검수(audit)는 `run-auditor.ps1`.

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
