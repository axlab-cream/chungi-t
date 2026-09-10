# RUN TEAM Workflow

## Purpose

RUN TEAM is a three-agent project workflow. Claude is the PM and implementer,
Antigravity is the researcher, and Codex is the reviewer. Pressing AIOps must start
this workflow automatically; Claude must not silently finish substantial work
alone.


## Activation Rule

RUNNING is for executing an explicit project task, not for environment setup.
Before creating prompts or dispatching Antigravity/Codex, identify an active task from either:

- the current user request, or
- a backlog file under `CreamAI/backlog/` that clearly has `status: active` and `active: true`.

If there is no active task, do not invent one, do not execute placeholder smoke tests, and do not dispatch Antigravity or Codex. Output only `AIOps READY` and stop. Do not explain next actions unless the user explicitly asks.
Ignore draft/template/stale backlog files, including `task-001`, unless they are explicitly marked active.
## Mandatory Progress Contract

- 0%: Confirm project root, current request, success criteria, available CLIs,
  and the state of `goal.md`, `ROADMAP.md`, `rules.md`, `plan.md`, `tests.md`,
  and `status.md`.
- Before creating or executing a task, compare the selected project root with
  the terminal work instruction. If the root appears to be one project but the
  instruction names another project/service/context, stop and ask:
  `프로젝트가 다릅니다. 그대로 진행하시겠습니까?`
- 25%: Run ProjectOps preflight, search memory, then split the work into
  `CreamAI/backlog/task-XXX.md` files. Update `goal.md`, `ROADMAP.md`,
  `plan.md`, and `tests.md` if the task instructions are incomplete.
- Before implementation decisions, read `CreamAI/skills/default-cream-cli-skills.md`
  and `.claude/skills/cream-cli-default-skills/SKILL.md`, then route the task to
  the matching specialized skills.
- If a PRD, planning document, roadmap, feature brief, screen brief, IA, Page
  Brief, wireframe, or PRD-derived TASK is present, read
  `.claude/skills/prd-screen-planning/SKILL.md` and its master reference before
  implementation decisions. Convert gaps into explicit TASK requirements,
  assumptions, blockers, or acceptance criteria.
- If the user invokes CreamWIKI/KMS or asks to reuse success cases, run the
  `CreamAI/workflows/creamwiki-kms.md` search-first routine before implementation
  decisions.
- If the task involves web design, frontend UI, landing pages, dashboards,
  app screens, redesign, design-system work, or visual QA, run
  `CreamAI/workflows/web-design-skills.md` before implementation decisions.
- 50%: Dispatch Antigravity through `CreamAI/scripts/run-researcher.ps1`, then read the newest
  report under `CreamAI/logs/research/` before implementation decisions.
- 75%: Implement or inspect the work, then dispatch Codex through
  `CreamAI/scripts/run-reviewer.ps1`, then read the newest report under `CreamAI/logs/review/`.
- 100%: Apply necessary review feedback, run ProjectOps test/rag/release
  harnesses, verify, and report changed files, research/review log paths,
  memory candidate status, core document updates, remaining risks, and next actions.
- At every Task completion or blocked handoff, print the checkbox terminal brief
  from `CreamAI/workflows/task-completion-brief.md` before asking for
  `다음`, `진행`, or `Continue`.

## ProjectOps Core Documents

Every RUN TEAM session must inspect these files before substantial work:

- `goal.md`
- `ROADMAP.md`
- `rules.md`
- `plan.md`
- `tests.md`
- `status.md`

If any file is missing, create it from the ProjectOps template. If it exists,
preserve it and improve only the relevant parts. `status.md` is append-only.
`ROADMAP.md` is the approval gate: perform only one Task, report it, then wait
for `다음`, `진행`, or `Continue` before starting the next Task.
If verification cannot be performed, record `NOT_RUN` or `BLOCKED`; never report
an unrun test as passed.

## CreamWIKI KMS Evidence Loop

When CreamWIKI/KMS is active, RUN TEAM adds this loop:

1. Search CreamWIKI for prior success cases, failure preventions, route rules,
   and related implementation evidence.
2. If CreamWIKI scripts are unavailable, use ProjectOps memory and `rg` as a
   degraded fallback, then record the limitation.
3. Apply only summarized operational evidence to the plan and implementation.
4. After verification, save a sanitized work-log using
   `CreamAI/workflows/creamwiki-work-log-template.md`.
5. Run available CreamWIKI indexing commands and verify the new knowledge can be
   queried. Missing scripts are `NOT_RUN` or `BLOCKED`, not `PASS`.

## Web Design Skills Gate

When a task touches web/frontend design, RUN TEAM adds this mandatory gate:

1. Read `CreamAI/workflows/web-design-skills.md`.
2. Read `.claude/skills/white-editorial-canvas/SKILL.md` first when no stronger
   visual direction is provided.
3. Read `.claude/skills/design-skill-snapshots/SKILL.md`.
4. Read `.claude/skills/frontend-design/SKILL.md`.
5. Read `.claude/skills/ui-ux-pro-max/SKILL.md`.
6. Create a design plan before coding: subject, audience, single page job,
   palette, typography, layout, signature element, and anti-patterns.
7. For multi-screen work, create or update `design-system/MASTER.md`.
8. Verify responsive behavior, contrast, focus states, hover/disabled states,
   reduced motion, text fit, and visual fit to the domain.
9. Record the design decision and verification status in `status.md`.

If this gate cannot run, mark the task `BLOCKED` or `NEEDS_REVIEW`; do not
call the design work complete.

## PRD Screen Planning Gate

When an initial PRD or planning document is present, RUN TEAM adds this mandatory
gate before implementation:

1. Read `.claude/skills/prd-screen-planning/SKILL.md`.
2. Read `.claude/skills/prd-screen-planning/references/prd-screen-planning-master.md`.
3. Audit gaps in service purpose, roles, Front IA, Admin IA, user flow, Page
   Brief, copy, CTA, wireframe, auth, legal/privacy, FAQ, banner, admin-front
   sync, SEO/AEO/GEO, analytics, QA, and Definition of Done.
4. Convert gaps into explicit `보완 필요`, assumptions, blockers, or acceptance
   criteria before creating code tasks.
5. If the resulting task touches UI/design, run the Web Design Skills Gate next.

Do not use `prd-to-code` until this gate has produced a TASK brief.

## Required Team Calls

Claude must use these scripts during every RUN TEAM session unless the user
explicitly says to run Claude alone.

### Antigravity Research Dispatch

1. Create a prompt file such as `CreamAI/logs/research/_prompt_task-001.txt`.
2. Include the task, relevant files, known constraints, and the exact questions
   Antigravity should answer.
3. Run:

```powershell
.\CreamAI\scripts\run-researcher.ps1 -TaskId task-001 -Slug project-research -PromptFile .\CreamAI\logs\research\_prompt_task-001.txt
```

4. Read the saved `CreamAI/logs/research/task-001_project-research.md` report.
5. Adjust the implementation plan from the research findings.

### Codex Review Dispatch

1. After implementation or inspection, create a prompt file such as
   `CreamAI/logs/review/_prompt_task-001.txt`.
2. Include the task, changed files, verification performed, and focus areas.
3. Run:

```powershell
.\CreamAI\scripts\run-reviewer.ps1 -TaskId task-001 -Slug project-review -PromptFile .\CreamAI\logs\review\_prompt_task-001.txt
```

4. Read the saved `CreamAI/logs/review/task-001_project-review.md` report.
5. Fix any accepted issues before the final report.

### ProjectOps Harness

Run these around the task lifecycle:

```powershell
.\CreamAI\scripts\run-projectops-harness.ps1 -TaskId task-001 -Mode preflight
.\CreamAI\scripts\run-projectops-harness.ps1 -TaskId task-001 -Mode test
.\CreamAI\scripts\run-projectops-harness.ps1 -TaskId task-001 -Mode rag
.\CreamAI\scripts\run-projectops-harness.ps1 -TaskId task-001 -Mode release
```

### Integration Memory

Before asking the user to repeat a service login, project link, or setup flow,
check the remembered integration state:

```powershell
.\CreamAI\scripts\remember-integration.ps1 -Service supabase -Action ensure
.\CreamAI\scripts\remember-integration.ps1 -Service vercel -Action ensure
.\CreamAI\scripts\remember-integration.ps1 -Service github -Action ensure
.\CreamAI\scripts\remember-integration.ps1 -Service railway -Action ensure
```

If a service is already `configured`, skip setup and continue using the
service's existing CLI auth/project state. To force a live check, add `-Verify`.
To remember a custom service after a successful manual setup, use:

```powershell
.\CreamAI\scripts\remember-integration.ps1 -Service custom-service -Action mark -Notes "setup completed"
```

### Claude MCP Repair

If Claude Code shows `setup issue: MCP` or `/doctor` points to stale MCP
configuration, repair the local/project MCP state before running the team:

```powershell
.\CreamAI\scripts\repair-claude-mcp.ps1
```

For stale project-local servers or authentication-cache warnings:

```powershell
.\CreamAI\scripts\repair-claude-mcp.ps1 -ResetProjectLocalMcpServers -ResetAuthCache
```

The script backs up changed files under `~/.claude/backups/` and does not print
secret values.

Promote memory only after review:

```powershell
.\CreamAI\scripts\promote-memory.ps1 -Candidate task-001_memory.md -Approve
```

### Task Completion Brief

Before a Task is reported as complete, blocked, or ready for review, read:

```powershell
Get-Content .\CreamAI\workflows\task-completion-brief.md
```

Print the `Task 완료 브리핑` checklist in the terminal. Mark `[x]` only for
stages actually performed in the current Task. Keep unperformed stages as `[ ]`
and explain the reason and next handling.

## Rules

- Claude PM coordinates the run and owns final decisions.
- Claude runs in auto mode by default for non-destructive work.
- Antigravity writes research reports only. Antigravity must not implement code.
- Codex writes review reports only. Codex must not implement code.
- Raw logs must not be promoted directly into RAG. Use
  `CreamAI/memory/candidates/` first, then approved knowledge after sensitive data is
  removed and revalidation criteria are present.
- Never store Supabase, Vercel, GitHub, Railway, or other service tokens in
  CreamAI. `remember-integration.ps1` stores only sanitized status and logs.
- SETUP is scaffold-only and must not open three separate PowerShell panes.
- Destructive or irreversible actions still require explicit user approval.
- `ROADMAP.md` controls stage progression; do not prebuild the next Task.
- Every Task completion report must include the checkbox `Task 완료 브리핑`
  from `CreamAI/workflows/task-completion-brief.md` before asking for approval.
- Web/frontend design work must follow the Web Design Skills Gate before code
  implementation.
- Default Cream CLI skill routing must run before substantial implementation.
- Before implementation, confirm the selected project folder and requested work
  instruction describe the same project. If not, ask:
  `프로젝트가 다릅니다. 그대로 진행하시겠습니까?`
- PRD/planning-derived work must pass the PRD Screen Planning gap audit before
  code implementation.
- If Antigravity or Codex is not installed, not authenticated, or exits with an error,
  Claude must report that blocker clearly and continue only with the user's
  approval or with a documented degraded mode.
