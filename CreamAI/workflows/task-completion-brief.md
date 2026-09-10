# Task Completion Brief Workflow

## Purpose

At the end of every Task, the active terminal must show a checkbox briefing so
the user can see which stages were completed, skipped, blocked, or left for the
next approved Task.

## Trigger

Use this workflow whenever a Task, Step, `/goal` stage, AIOps backlog item, or
ROADMAP stage is reported as complete, blocked, or ready for user review.

## Terminal Output Rule

Before asking the user to type `다음`, `진행`, or `Continue`, print this brief in
the terminal. Do not replace it with a vague summary.

```md
## Task 완료 브리핑

### Task
- Task ID:
- Task 이름:
- 상태: DONE | NEEDS_REVIEW | BLOCKED | NOT_RUN
- 기준 문서:

### 진행 단계 체크
- [ ] 1. 프로젝트 맥락 확인
- [ ] 2. 요구사항/PRD/ROADMAP 확인
- [ ] 3. 작업 계획 설명
- [ ] 4. 필요한 스킬/기획 게이트 확인
- [ ] 5. 구현 또는 문서 반영
- [ ] 6. 검증 실행
- [ ] 7. 산출물 정리
- [ ] 8. ProjectOps 문서 업데이트
- [ ] 9. Memory/Wiki 후보 기록
- [ ] 10. 다음 단계 영향 분석

### 산출물
- 생성 파일:
- 변경 파일:
- 실행 명령:
- 검증 결과:
- 남은 리스크:

### 미완료/미실행 항목
- [ ] 항목:
  - 사유:
  - 다음 처리:

### 다음 예정 작업
- 다음 Task:
- 승인 필요 여부:
```

## Status Rules

- Use `[x]` only when that stage actually happened in this Task.
- Keep `[ ]` for stages that did not happen, then explain why under
  `미완료/미실행 항목`.
- If a stage is irrelevant, leave it unchecked and write `해당 없음` as the
  reason.
- Never mark tests, review, memory, git commit, deployment, DB changes, or API
  changes as complete unless they actually ran or were explicitly approved.
- The brief must be printed once per completed Task, not only at the end of the
  whole project.
