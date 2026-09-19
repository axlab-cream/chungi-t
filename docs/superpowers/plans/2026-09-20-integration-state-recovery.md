# Integration State Recovery Implementation Plan

> **For agentic workers:** Execute this plan inline, one independently verified slice at a time. Do not push, deploy, or mutate the remote database.

**Goal:** Preserve the existing local evidence, synchronize the working checkout with GitHub, restore a truthful green local CI contract, and leave Supabase migration drift with an auditable no-write reconciliation record.

**Architecture:** Keep pre-sync evidence on a dedicated local branch, fast-forward `main`, and fix only the stale marriage-report contract that is breaking CI. Treat runtime connectivity and migration history as separate states: runtime can be healthy while migration history remains gated from repair.

**Tech Stack:** Git, Node.js 24, TypeScript, GitHub Actions, Vercel CLI, Supabase CLI 2.117.0, PowerShell, CreamWIKI.

## Global Constraints

- Preserve all pre-existing local work and Playwright evidence.
- Do not push Git refs, create/merge a PR, deploy Vercel, or write/repair Supabase migration history.
- Do not expose credentials or customer data in logs, reports, commits, or CreamWIKI.
- Keep the approved 2026-09-17 `marry_match` 10-group/24-item runtime contract; do not restore the removed 70-item workload.

---

### Task 1: Preserve and synchronize the checkout

**Files:**
- Local Git branch: `codex/backup-pre-sync-20260920`
- Local-only ignore: `.git/info/exclude`

**Interfaces:**
- Consumes: dirty `main` at `a0c388b`, `origin/main` at `69d36fc`
- Produces: recoverable evidence commit plus a clean, fast-forwarded local `main`

- [x] Validate JSON/JSONL evidence and scan added lines for credential-shaped strings.
- [x] Commit the evidence on `codex/backup-pre-sync-20260920`.
- [x] Exclude `.playwright-mcp/` locally without deleting it.
- [x] Fast-forward `main` to `origin/main` and verify zero divergence.

### Task 2: Restore the marriage-service CI contract

**Files:**
- Modify: `scripts/check-marry.mjs`
- Modify: `src/match/marry-service.ts`
- Modify: `사주/about.html`
- Test: `npm run check:marry`
- Test: `npm test`

**Interfaces:**
- Consumes: `MARRY_MATCH_TOC` with 10 groups and 24 items
- Produces: a guard and customer-facing scope that both assert 10 groups and 24 items

- [x] Reproduce the current failure: actual 24, guard expects 70.
- [x] Change the stale guard/comment and customer-facing count from 70 to 24, then reconcile the same approved reductions for the other affected services.
- [x] Run `npm run check:marry` and focused contract tests.
- [x] Run the full CI-equivalent verification sequence.

### Task 3: Stabilize Git remote behavior and audit Supabase drift

**Files:**
- Local Git config: `.git/config`
- Create: `CreamAI/reports/integration-recovery-20260920.md`
- Modify: `CreamAI/integrations/state.json`
- Modify: `status.md`

**Interfaces:**
- Consumes: broken legacy `upstream`, linked Supabase project `wdyzollywccgaepjeynu`, local and remote migration inventories
- Produces: `git fetch --all` without the broken remote and an exact migration reconciliation report without database mutation

- [x] Preserve `upstream` but set `remote.upstream.skipDefaultUpdate=true`; verify `git fetch --all` succeeds.
- [x] Compare working-tree, `origin/main`, and remote migration versions and inspect migration SQL/name evidence read-only.
- [x] Record exact matched/local-only/remote-only versions and required gated repair steps.
- [x] Refresh sanitized integration state and append the outcome to `status.md`.
- [x] Write, re-read, and search the sanitized CreamWIKI note.

### Task 4: Final verification

**Files:**
- Review all changed files from `git diff`

**Interfaces:**
- Consumes: Tasks 1–3
- Produces: evidence-backed handoff with local/remote distinctions

- [x] Run `npm run typecheck`.
- [x] Run `npm test`.
- [x] Run every CI service check, SEO verification, all-service QA, and `npm run vercel-build` without deployment.
- [x] Run `git diff --check`, confirm no secret-shaped additions, and review final status/divergence.
- [x] Confirm Vercel Production and live integration status read-only.
