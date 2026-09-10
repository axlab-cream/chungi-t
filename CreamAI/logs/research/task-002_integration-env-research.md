<!-- role-fallback: claude substituted for antigravity at 2026-09-10T02:33:47Z -->
# Research Report - Local development environment wiring (Supabase CLI + Vercel env + CI) for chungi-t

## 1. Scope

- Task id: task-002
- Topic: Local development environment wiring for a Node 24 / TypeScript 5.7 ESM project (Express at `src/server/app.ts`, Vercel serverless entry `api/index.ts`) with a Supabase backend reached over REST + Auth, deployed on Vercel (org `ax-lab-cream`, project `chungi-t`).
- Research time: 2026-09-10T02:33:47Z (dispatch timestamp; used as the sole 조사 시점).
- **Research-tooling limitation — read this before trusting any command string below.** In this session both `WebSearch` and `WebFetch` were denied by the permission layer, and the session is non-interactive so the grant could not be obtained. Shell access to the repository was also prohibited by the PM instructions, and the write to `CreamAI/logs/research/` was likewise denied, so this report exists only as this message. **No page in this report was fetched or re-read at 2026-09-10.** Every finding is derived from (a) the PM-supplied `[CONTEXT]` facts and (b) model knowledge with a May 2026 cutoff.
- Consequence for the reader: all commands, flags, filenames and version numbers are marked **UNVERIFIED** unless they are restatements of the PM's own verified facts. The canonical doc URL is given for each claim in §5 so Claude can confirm each one cheaply before executing it. Do not paste a command from this report into a terminal that touches the live Supabase project without first checking it against the linked doc or `--help`.

## 2. Key Findings

### F1 — Supabase CLI: global npm install is the one method to avoid; Scoop is the Windows path

- Finding: Supabase documents four practical install routes. For Windows 11 the documented first-class route is **Scoop** via Supabase's own bucket; the cross-platform route is **npm as a devDependency, invoked through `npx`**. Standalone binaries are published per release on GitHub. **Global `npm install -g supabase` is explicitly unsupported** — the CLI docs call this out and the npm package's install script is designed around local/dev-dependency use. **UNVERIFIED: winget.** I am not aware of a Supabase-maintained winget manifest; treat winget as unavailable until confirmed.
  - Scoop (UNVERIFIED command text):
    ```
    scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
    scoop install supabase
    scoop update supabase        # upgrade path
    ```
  - npm as devDependency (UNVERIFIED command text) — the route that fits this repo, because it pins the CLI version in `package.json` alongside `tsx`/`typescript`:
    ```
    npm install supabase --save-dev
    npx supabase --version
    ```
  - Throwaway/one-shot without adding a dependency:
    ```
    npx supabase@latest --version
    ```
  - Standalone binary: download the `windows_amd64` archive from the CLI releases page, extract `supabase.exe`, put it on `PATH`.
- Evidence: Supabase CLI "Getting started" page (§5 R1) documents the per-OS install matrix and the unsupported-global-install note; the releases page (§5 R2) is where the Windows archives live.
- Impact: For chungi-t the devDependency route is the better fit — it version-locks the CLI for every contributor and for CI, and it needs no new machine-level package manager on a Windows box that does not currently have Scoop. Cost: every invocation is `npx supabase …`, which is noisier in docs and scripts. Mitigate with npm scripts (`"db:push": "supabase db push"`), which resolve the local binary without the `npx` prefix.

### F2 — Docker Desktop is the real gate on this Windows machine, not the CLI install

- Finding: The Supabase CLI splits into commands that talk only to the Supabase Platform API / remote Postgres, and commands that need a **local containerised Postgres**. `login`, `link`, `migration new`, `migration list`, `migration repair`, and `db push` fall in the first group. `supabase start`, `supabase db reset`, `supabase db diff` (shadow database) and `supabase db pull` (diffs remote against a local shadow DB) fall in the second and therefore **require Docker Desktop running**. **UNVERIFIED** whether recent CLI versions have removed the Docker requirement from `db pull`/`db dump` specifically — this is the single most important thing to check before planning the migration baseline.
- Evidence: Supabase local-development overview and CLI reference (§5 R1, R3, R5) describe the local stack as Docker-based and describe `db diff` as shadow-database-driven.
- Impact: The PM's fact list does not say whether Docker Desktop is installed. If it is not, the baseline-capture step in §4 must use a non-Docker path (dashboard SQL editor export, or a direct `pg_dump` against the pooler/direct connection string) rather than `supabase db pull`. Plan for both branches; do not assume `db pull` will run.

### F3 — `supabase link` wants a database password, but can proceed without one

- Finding: `supabase link --project-ref <ref>` authenticates with the stored personal access token, downloads remote config, and **interactively prompts for the database password**. The prompt is skippable (empty input) — linking still succeeds and writes the project ref into `supabase/.temp/`. The password is only needed by commands that open a direct Postgres connection (`db push`, `db pull`, `db dump`, `migration repair`); those will prompt again at call time. Non-interactive alternatives: `SUPABASE_DB_PASSWORD` env var, or `-p/--password`. **UNVERIFIED: exact flag spelling and whether the prompt is skippable in the currently released CLI.**
- Evidence: `supabase link` CLI reference (§5 R4).
- Impact: A missing database password does **not** block getting linked, so `supabase link` is safe to run early. It *does* block schema push/pull. The project's `.env` is already missing `DATABASE_URL`, which suggests nobody on this machine holds the direct Postgres credential — that must be resolved (Dashboard → Project Settings → Database) before any migration work, and it must land in `.env` (already gitignored) not in a committed file.

### F4 — Credential storage on Windows: OS keyring first, plaintext fallback

- Finding: The CLI stores the personal access token in the operating-system credential store (Windows Credential Manager) through a Go keyring library, and falls back to a plaintext file under the user profile when no keyring is reachable (typical in CI, WSL without a session keyring, or headless shells). **UNVERIFIED: the exact fallback path.** My recollection is a `supabase` directory under the user profile (`%APPDATA%` or `~/.supabase/access-token`); this must be read off the current docs rather than guessed, because it determines what has to be excluded from backups and screen shares.
- Evidence: `supabase login` CLI reference (§5 R4).
- Impact: Two operational rules. (1) If the token ends up in the plaintext fallback, it is a secret sitting in the user profile — do not commit it, do not include it in any support bundle, and prefer `SUPABASE_ACCESS_TOKEN` injected per-shell for CI. (2) `supabase login --token <pat>` (PAT minted at Dashboard → Account → Access Tokens) is the non-interactive form and is what a CI job should use.

### F5 — The live remote schema is the hard constraint; `db pull` must come before `db push`

- Finding: The repo has two hand-written root-level SQL files (`supabase-payment-orders.sql`, `supabase-reports.sql`), no `supabase/` directory, and no migrations directory — while the remote schema is already live. The supported way to enter the migrations workflow from this state is to **snapshot the remote schema as migration #1 (the "baseline") and register it as already-applied**, then express all future change as new migration files. `supabase db pull` is designed for exactly this: it writes `supabase/migrations/<timestamp>_remote_schema.sql` *and* records that version in the remote `supabase_migrations.schema_migrations` table, so a subsequent `db push` does not try to re-execute the baseline against a database that already has those objects. **UNVERIFIED: that `db pull` still auto-inserts the migration-history row in the current CLI** — if it does not, `supabase migration repair --status applied <version>` is the explicit way to mark it applied without running it.
- Evidence: Supabase database-migrations guide and CLI reference for `db pull` / `migration repair` (§5 R3, R4, R5).
- Impact: This is the difference between a clean adoption and a broken one. Doing `supabase init` + `migration new` with the two root SQL files pasted in, and then `db push`, would attempt `CREATE TABLE` against tables that already exist — at best it errors out mid-transaction, at worst a partially-idempotent script mutates live data. Baseline first, always.

### F6 — Three Supabase CLI commands can destroy remote data; one of them looks harmless

- Finding, ranked by danger:
  1. **`supabase db reset --linked`** — resets the **remote linked** database: drops and re-applies from migrations. This is total data loss on production. The bare `supabase db reset` targets only the local container and is safe, which is precisely why the `--linked` variant is dangerous: one flag separates "reset my sandbox" from "wipe production". **UNVERIFIED: the exact flag name (`--linked`) and whether a confirmation prompt is required in the current CLI.** Treat as destructive until proven otherwise.
  2. **`supabase db push`** — applies pending migration files to the linked remote. Non-destructive only insofar as the migration bodies are non-destructive. Any `DROP TABLE` / `DROP COLUMN` / `ALTER … TYPE` in a migration executes against live data. Always run `supabase db push --dry-run` first. **UNVERIFIED: `--dry-run` availability/spelling.**
  3. **`supabase db diff`** — *itself* read-only, but its **output is a trap**. `db diff` emits the DDL needed to make one schema match another. If the local schema is behind the remote (which it is right now — local has nothing), a naively-directed diff produces `DROP` statements for every remote object. Saving that output as a migration and pushing it is how a live schema gets deleted by someone who believed they were running a read-only command.
  - Non-destructive to remote: `supabase init`, `supabase login`, `supabase link`, `supabase migration new`, `supabase migration list`, `supabase db pull` (reads remote; writes only local files plus one migration-history row).
- Evidence: CLI reference entries for `db reset`, `db push`, `db diff` (§5 R4).
- Impact: The migration adoption plan in §4 is ordered specifically to avoid ever needing `db diff` against an empty local schema. A repo-level guard is warranted: since `.claude/hooks/*.ps1` already exists in this project, a pre-Bash hook that blocks `db reset --linked` and any `db push` without a preceding `--dry-run` is cheap insurance.

### F7 — `vercel env pull` writes `.env.local`, defaults to Development, and prompts before overwriting

- Finding (all command text **UNVERIFIED**):
  - Syntax: `vercel env pull [file] [--environment=<env>] [--git-branch=<branch>] [--yes]`
  - Default output file: **`.env.local`**. Default environment: **`development`**.
  - Per-environment:
    ```
    vercel env pull .env.local --environment=development
    vercel env pull .env.preview.local --environment=preview
    vercel env pull .env.production.local --environment=production
    ```
  - Overwrite behaviour: it detects an existing target file and **prompts for confirmation**; `--yes` skips the prompt and overwrites. It replaces the file wholesale — it does not merge, so any local-only key that exists in `.env.local` but not in Vercel is lost on pull.
  - **Branch-scoped variables: only with `--git-branch`.** A plain `--environment=preview` pull returns the variables that apply to *all* preview branches; variables scoped to one git branch are included only when that branch is named: `vercel env pull .env.preview.local --environment=preview --git-branch=fix/umsh-qa-ux`.
  - Distinct sibling command: **`vercel pull`** (not `vercel env pull`) fetches project settings *and* env vars into `.vercel/.env.<environment>.local`, which is the input `vercel build` expects. Do not conflate the two.
- Evidence: Vercel CLI `env` and `pull` reference pages, and the environment-variables guide (§5 R6, R7, R8).
- Impact — **this is a concrete mismatch in chungi-t.** The repo's local file is `.env`, and `.gitignore` covers `.env`, `.env.production`, `.env*.local`. `vercel env pull` writes `.env.local`, not `.env`. So either:
  - (a) point the pull at the file the app actually loads — `vercel env pull .env --environment=development --yes` — which is gitignored and therefore safe, but **destroys any local-only values in `.env` on every pull** (and `.env` currently holds the only copy of several keys); or
  - (b) keep `.env.local` as the Vercel-owned, always-overwritable file and teach the loader to read `.env.local` with precedence over `.env`, leaving `.env` for machine-local values.

  (b) is the better shape: it gives a clean split between "owned by Vercel, safe to clobber" and "owned by this machine". (a) is a one-liner but sets up a data-loss footgun. Either way the eight missing keys must first exist *somewhere* — pulling from Development cannot materialise values that were never added to Vercel Development.

### F8 — Service-role key present only in Production is a recognised preview-deployment anti-pattern

- Finding: Vercel scopes each environment variable to an explicit set of environments (Production / Preview / Development); a variable added only to Production is simply **absent** at build and runtime in Preview and in `vercel dev`. So the PM-verified state — `SUPABASE_SERVICE_ROLE_KEY` in Production only, `INICIS_SIGNKEY` in none — means every preview deployment and every local `vercel dev` run reaches the service-role code path with an undefined key. The failure mode is a runtime 500 in previews only, i.e. it will not show up in production monitoring.
- The recommended practice is **not** "copy the production service-role key into Preview". Two reasons: preview deployments are publicly reachable by default unless Deployment Protection is on, and preview code is by definition unreviewed — so the production service-role key (which bypasses RLS entirely) would be exposed to both. The recommended practice is a **separate Supabase project for non-production**, with its own service-role/secret key added to Preview and Development, so a leak or a bad migration in a preview cannot touch production data. Vercel also offers **Sensitive Environment Variables** (write-only; value not readable back in the dashboard or via `env pull`) and **Shared Environment Variables** at team level for values that legitimately span projects. **UNVERIFIED: current names/availability of Sensitive and Shared env vars, and whether Sensitive vars are excluded from `vercel env pull`** — the latter matters a lot for the §4 plan and must be checked.
- Adding one variable to several environments in one command: **UNVERIFIED.** The documented signature is `vercel env add [name] [environment] [gitbranch]`, which reads as one environment per invocation; I cannot confirm from docs that multiple targets (`vercel env add NAME production preview development`) or a comma list are accepted. The reliable, version-independent approach is one invocation per environment with the value on stdin so it never lands in shell history:
  ```
  cat .secret-value | vercel env add SUPABASE_SERVICE_ROLE_KEY preview
  cat .secret-value | vercel env add SUPABASE_SERVICE_ROLE_KEY development
  ```
  The dashboard UI does support selecting multiple environments with checkboxes in a single save, and is the lower-risk path for a one-off backfill of eight keys.
- Evidence: Vercel environment-variables and environments docs, CLI `env` reference (§5 R6, R8, R9).
- Impact: `PAYMENT_TEST_MODE` in the missing-keys list is a strong hint that a test/live payment split is already intended. That is the natural seam: Preview/Development get the Inicis test MID/signkey and a non-production Supabase project; Production keeps the live pair. Encode the expectation in `.env.example` (names only, never values) so the gap is visible at checkout time instead of at preview-deploy time.

### F9 — Vercel's Git integration and a GitHub Actions deploy job do conflict; CI-only Actions do not

- Finding: With the Git integration connected (which it is — the project is linked and `.vercel/project.json` exists), **every push already triggers a Vercel build**. Adding a workflow that runs `vercel deploy` produces two deployments per push: duplicated build minutes, two sets of checks on the PR, and a race over which one the preview URL resolves to. There is no conflict if the workflow only runs **checks** (typecheck, tests, lint) and never deploys. If Actions-driven deployment is genuinely wanted, the Git integration must be turned off first — via `vercel.json` (`{"git": {"deploymentEnabled": false}}`, **UNVERIFIED** key path) or Project Settings → Git, and/or an Ignored Build Step. **Recommendation for chungi-t: keep the Git integration, make Actions CI-only.** It is strictly less machinery and the repo gains nothing from hand-rolled deploys.
- Minimal CI shape (**UNVERIFIED action versions** — see the caveat below):
  ```yaml
  name: CI
  on:
    push:
      branches: [main]
    pull_request:
  jobs:
    check:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v5
        - uses: actions/setup-node@v5
          with:
            node-version: 24
            cache: npm
        - run: npm ci
        - run: npx tsc --noEmit
        - run: node --test
  ```
- Action versions: the newest majors I can attest to from knowledge are **`actions/checkout@v5`** and **`actions/setup-node@v5`** (both 2025). Whether a v6 shipped between my cutoff and 2026-09-10 is **UNVERIFIED** — check the marketplace/release pages (§5 R11, R12) and pin to the current major. Do not use `@v3` or older; those run on retired runner images.
- Two Node-specific traps for this repo:
  - `node --test` on **`.ts` files** relies on Node's built-in type stripping. That is on by default in Node 24, but it only handles **erasable** TypeScript — `enum`, `namespace` with runtime output, and constructor parameter properties will throw. If the test suite uses any of those, CI must run `npx tsx --test` (the repo already depends on `tsx`) or test compiled output instead. **UNVERIFIED: exact Node 24 type-stripping limits.**
  - `npm ci` requires a lockfile committed at the root. The PM's fact list does not confirm one; if absent, CI must use `npm install` (and `cache: npm` will be less effective).
- Evidence: Vercel Git-integration docs, GitHub Actions Node starter workflow, Node test-runner docs (§5 R10–R13).
- Impact: A CI-only workflow is additive and reversible — it cannot break deployment because it does not touch it. It also gives the missing-env-var problem a place to be caught: a startup-time env schema check run in CI fails the PR the moment a required key is referenced but undocumented in `.env.example`.

### F10 — The largest live-migration risk in this stack is the Supabase API key model change

- Finding: Supabase introduced a new API-key model — **publishable keys (`sb_publishable_…`) and secret keys (`sb_secret_…`)** — as the replacement for the legacy JWT-based **`anon`** and **`service_role`** keys, alongside asymmetric JWT signing keys. Direction of travel: legacy `anon`/`service_role` are on a **deprecation path**, new projects default to the new keys, and existing projects can opt in and later disable the legacy pair. Migration guidance as I understand it: the publishable key is a **drop-in replacement for `anon`** in client initialisation, and the secret key replaces `service_role` server-side. The material differences are operational, not syntactic — secret keys are **individually revocable and rotatable** without invalidating everything else (legacy keys share the project's JWT secret, so rotating one rotates all), and secret keys are **not JWTs**, so code that decoded a service-role JWT offline to read claims will break.
- **UNVERIFIED and important:** the actual deprecation timeline, whether legacy keys are already disabled for new projects as of 2026-09-10, and whether any hard cutoff date has passed. My knowledge ends May 2026 and this is exactly the kind of thing that moved. **Check §5 R14 before writing any key-handling code.** The PM's fact list says this project uses "anon/publishable keys" — that ambiguity should be resolved by reading the actual key prefix in the dashboard: `eyJ…` means a legacy JWT key, `sb_publishable_…` means a new key.
- Other deprecations in the window, all **UNVERIFIED**: Supabase CLI dropped `supabase db remote commit` in favour of `db pull`, and moved Edge Functions to a Deno 2 / no-bundler path (removing `--legacy-bundle`); `config.toml` keys have shifted across minors, so a config written against an older CLI may warn or fail. Vercel CLI in the v50 era: Node 18 builds are retired (Node 18 hit EOL in 2025), and new projects default to a newer Node runtime — confirm the project's configured Node version matches the Node 24 local runtime (§5 R15). PostgREST v13 added aggregate functions and spread-embedded-resource syntax, which is additive. Whether a **`supabase-js` v3** has shipped is **UNVERIFIED**.
- Evidence: Supabase API-keys guide and the key-change announcement thread; Supabase CLI and Vercel CLI changelogs (§5 R14–R17).
- Impact: One of the eight missing local keys (`SUPABASE_SERVICE_ROLE_KEY`) sits directly on this seam. If this project is still on legacy keys, the env-var name will need to change (or at least gain an alias) during migration, and the rotation story is much worse until it does. Worth an ADR — `docs/adr/` already exists in this repo — recording which key model the project is on and when it migrates. Not worth blocking task-002 on.

## 3. Project Impact

- Affected files or modules:
  - **New:** `supabase/config.toml`, `supabase/migrations/<ts>_remote_schema.sql` (baseline), `supabase/.temp/` (must be gitignored), `.github/workflows/ci.yml`.
  - **Moved/retired:** root `supabase-payment-orders.sql`, `supabase-reports.sql` → folded into `supabase/migrations/` (see §4 for the reconciliation, which is not a plain `git mv`).
  - **Modified:** `.gitignore` (add `supabase/.temp/`; `.env.local` is already matched by `.env*.local`), `.env.example` (document all eight missing keys, names only), `package.json` (`supabase` devDependency + `db:*` scripts), and the env-loading code path if option (b) in F7 is taken.
  - **Reviewed, not changed:** `src/server/app.ts` and `api/index.ts` — worth a read to find where the service-role key is consumed, because that is the code that silently breaks in Preview today.
  - **Not touched:** the live Supabase schema. No task-002 step should alter remote DDL.
- Risk level: **Medium-high, concentrated in two places.** (i) Adopting migrations against an already-live schema — a wrong-order `db push` or a blindly-saved `db diff` can drop production tables (F5, F6). (ii) Secrets — eight keys are about to move between a dashboard, a local file and possibly CI; `vercel env pull` overwriting `.env` (F7) can also destroy the only local copy of values not yet in Vercel. The CI workflow and the CLI install are low-risk and reversible.
- Recommended direction, in dependency order:
  1. **Install the CLI as a devDependency** (F1) — no machine-level installs, version pinned for everyone. Confirm whether Docker Desktop is present, because it decides the baseline route (F2).
  2. **Back up `.env` outside the repo before any `vercel env pull`** (F7). Non-negotiable: it currently holds values that exist nowhere else.
  3. **Close the env-var gap in Vercel first, then pull** — the eight names into `.env.example`, real values into the right environments per F8, using a non-production Supabase project and Inicis test credentials for Preview/Development. Pulling before populating just yields an incomplete file.
  4. **Adopt migrations baseline-first** (§4), with `--dry-run` before any push and no `db diff` against an empty local schema.
  5. **Add the CI-only workflow** (F9). Leave Vercel's Git integration alone.
  6. **Record the API-key-model decision in `docs/adr/`** (F10) as follow-up, not as a blocker.

  Sequencing note: steps 2–3 and step 4 are independent and can run in parallel; step 5 depends on nothing.

## 4. Implementation Notes For Claude

**Concrete advice — migration adoption, safe order (every command UNVERIFIED; check `--help` first):**

1. `npm install supabase --save-dev` — then use `npx supabase` or npm scripts throughout.
2. `npx supabase init` — creates `supabase/config.toml`. Touches nothing remote. Add `supabase/.temp/` to `.gitignore` in the same commit.
3. `npx supabase login` (browser) or `npx supabase login --token <pat>` (non-interactive). Never inline a PAT in a committed script.
4. `npx supabase link --project-ref <ref>` — `<ref>` is the Supabase URL subdomain / dashboard URL segment. Password prompt is skippable (F3); skip it for now if the direct DB credential is not in hand.
5. **Baseline the live schema.** Preferred: `npx supabase db pull` → writes `supabase/migrations/<ts>_remote_schema.sql` and (expected) records the version as applied remotely. **Requires Docker Desktop (F2).** If Docker is unavailable, produce the same file out-of-band — dashboard schema export or `pg_dump --schema-only` against the direct connection string — then run `npx supabase migration list` to see whether the remote history table knows about it, and if not, `npx supabase migration repair --status applied <version>` to register it **without executing it**.
6. **Verify before proceeding:** `npx supabase migration list` must show the baseline as applied on **both** local and remote. If the remote column is blank, stop — a `db push` from that state will try to re-create live tables.
7. **Reconcile the two root SQL files.** Diff each against the baseline by reading them. Whatever they define that the baseline already contains is *already live* — that content belongs in the baseline, not in a new migration. Only genuinely new DDL goes into `npx supabase migration new <name>`. Do not paste either file wholesale into a new migration.
8. `npx supabase db push --dry-run`, read the output in full, then `npx supabase db push`.
9. Keep the root `.sql` files in git history but remove them from the root once their content is represented in `supabase/migrations/`, so there is exactly one source of truth for schema.

**Concrete advice — env wiring:**

- Copy `.env` to a location outside the repo first.
- Add the eight missing names to `.env.example` with empty values and a one-line comment each. This is the artefact that makes the gap reviewable.
- Populate Vercel per environment (F8), one `vercel env add` per environment with the value piped on stdin, or via the dashboard's multi-environment checkboxes for a bulk backfill.
- Then `vercel env pull .env.local --environment=development` and adopt option (b) from F7 (loader reads `.env.local` ahead of `.env`), so the Vercel-owned file is always safe to clobber.
- For preview work on a branch-scoped variable: `vercel env pull .env.preview.local --environment=preview --git-branch=<branch>` — without `--git-branch` you will not see branch-scoped values and will misdiagnose them as missing.
- Add a startup env schema check (fail fast, listing every missing key at once) and run it in CI. This converts "preview 500s at runtime" into "PR fails at check time".

**Constraints:**

- No production code in this report, per the task constraints; the snippets above are operational commands and a CI manifest, not application code.
- Never commit `.env`, `.env.local`, `supabase/.temp/`, or any PAT. Per project security rules, keep any new hook commands project-relative (`.claude/hooks/*.ps1`, forward slashes) — no absolute `C:\…` paths in `.claude/settings.json`.
- All files this task creates are text: UTF-8 **with** BOM for `.md`/`.sql`/`.ts`, UTF-8 **without** BOM for `.json`; `.yml` is not covered by the project's stated rule — **confirm with the user** rather than guessing, since a BOM breaks some YAML parsers.
- Ask before running anything that writes to the remote database. `db push` qualifies.

**Pitfalls, in order of how much damage they cause:**

1. `supabase db reset --linked` — wipes the remote. Do not type it. Consider a hook that blocks it.
2. Saving `db diff` output as a migration while the local schema is empty — generates `DROP` statements for the entire live schema.
3. `db push` before the baseline is registered as applied — errors against existing objects, potentially mid-transaction.
4. `vercel env pull .env --yes` — silently overwrites the only copy of the values currently in `.env`.
5. Copying the **production** service-role key into Preview — exposes an RLS-bypassing credential to publicly reachable, unreviewed deployments.
6. Adding a `vercel deploy` step to Actions while the Git integration is live — double deployments, duplicated build minutes, racing preview URLs.
7. `npm install -g supabase` — unsupported install path (F1).
8. `node --test` on `.ts` containing non-erasable syntax (`enum`, `namespace`, parameter properties) — CI-only failure; use `tsx --test`.
9. Assuming `vercel env pull` returns Sensitive-flagged variables — **UNVERIFIED**, and if it does not, the pulled file will be quietly incomplete.

## 5. References

All URLs below are the canonical documentation locations for the corresponding claims. **None was fetched during this session** (see §1) — they are cited so each claim can be confirmed cheaply, not as evidence that it was confirmed.

- R1 — https://supabase.com/docs/guides/local-development/cli/getting-started — Why it matters: the per-OS install matrix and the unsupported-global-npm-install note (F1); also whether winget is listed.
- R2 — https://github.com/supabase/cli/releases — Windows standalone archives and the changelog that reveals recent breaking changes (F1, F10).
- R3 — https://supabase.com/docs/guides/local-development/overview — Confirms which commands need Docker (F2).
- R4 — https://supabase.com/docs/reference/cli/introduction — Authoritative per-command flags for `login`, `link`, `db pull`, `db push`, `db diff`, `db reset`, `migration repair` (F3, F4, F6).
- R5 — https://supabase.com/docs/guides/deployment/database-migrations — The baseline-first workflow for an already-live schema (F5).
- R6 — https://vercel.com/docs/cli/env — `vercel env pull` / `env add` syntax, default filename, overwrite prompt, `--git-branch` (F7, F8).
- R7 — https://vercel.com/docs/cli/pull — The `vercel pull` sibling command and `.vercel/.env.<env>.local` (F7).
- R8 — https://vercel.com/docs/environment-variables — Environment scoping, Sensitive and Shared variables (F7, F8).
- R9 — https://vercel.com/docs/deployments/environments — Production / Preview / Development semantics; why Production-only means absent elsewhere (F8).
- R10 — https://vercel.com/docs/git — Git-integration behaviour and how to disable automatic deployments (F9).
- R11 — https://github.com/actions/checkout/releases — Current major of `actions/checkout` (F9).
- R12 — https://github.com/actions/setup-node/releases — Current major of `actions/setup-node` (F9).
- R13 — https://nodejs.org/api/test.html and https://nodejs.org/api/typescript.html — `node --test` behaviour and Node 24 type-stripping limits (F9).
- R14 — https://supabase.com/docs/guides/api/api-keys — publishable/secret vs `anon`/`service_role`, and the migration guidance and timeline (F10). **Highest-value page to read first.**
- R15 — https://vercel.com/docs/cli — Vercel CLI reference and version notes for the v50 era (F10).
- R16 — https://github.com/orgs/supabase/discussions — Supabase's announcement/discussion channel, where the API-key change and its deprecation dates were published (F10).
- R17 — https://docs.postgrest.org/en/stable/releases/ — PostgREST release notes behind the Supabase REST layer (F10).

## 6. Open Questions

- Question: What is the **actual deprecation status of `anon` / `service_role` keys** as of 2026-09-10, and has any hard cutoff passed?
  Why it remains uncertain: web access was denied this session and my knowledge stops at May 2026. This is the single item most likely to have moved, and it sits directly on `SUPABASE_SERVICE_ROLE_KEY`. Resolve via R14 before writing key-handling code.
- Question: Is **Docker Desktop installed** on this Windows 11 machine?
  Why it remains uncertain: not in the PM's fact list, and it determines whether `supabase db pull` can produce the baseline or whether an out-of-band `pg_dump`/dashboard export is required (F2, §4 step 5).
- Question: Does anyone hold the **direct Postgres credential** for the linked project (`DATABASE_URL` is absent locally)?
  Why it remains uncertain: `link` succeeds without it, but `db push`/`db pull` do not. If nobody has it, the migration work blocks at step 5 regardless of Docker.
- Question: Does `vercel env pull` include **Sensitive**-flagged variables?
  Why it remains uncertain: unverified, and the answer changes the env-sync design — if Sensitive values are excluded, the pulled file is incomplete by design and the local file must be populated another way (F7 pitfall 9).
- Question: Can a single `vercel env add` target **multiple environments**?
  Why it remains uncertain: the documented signature reads as one environment per call; I could not confirm multi-target support. The per-environment loop in F8 works either way.
- Question: Are `actions/checkout@v5` / `actions/setup-node@v5` still the current majors, or has v6 shipped?
  Why it remains uncertain: both are 2025-era releases relative to my cutoff; 15 months of drift is enough for a new major (F9, R11, R12).
- Question: Is there a **committed lockfile** at the repo root, and does the test suite use non-erasable TypeScript?
  Why it remains uncertain: repository inspection was prohibited for this task. The first decides `npm ci` vs `npm install`; the second decides `node --test` vs `tsx --test` (F9).
- Question: Which **Supabase project** should back Preview and Development?
  Why it remains uncertain: this is a product/ops decision, not a documentation lookup. The F8 recommendation (a separate non-production project) assumes one can be created; if not, the fallback is Preview with Deployment Protection enabled and RLS-only access — no service-role key in Preview at all.