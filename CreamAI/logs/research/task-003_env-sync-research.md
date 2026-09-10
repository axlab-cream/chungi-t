<!-- role-fallback: claude substituted for antigravity at 2026-09-10T04:18:18Z -->
# Research Report - Vercel env pull behavior for local .env completion (task-003)

## 1. Scope
- Task id: task-003
- Topic: Why `SUPABASE_SERVICE_ROLE_KEY` is absent from a Vercel production env pull; `vercel env pull` overwrite semantics; injected `VERCEL_*` system variables; `.env` + `.env.local` layering guidance.
- Research time: 2026-09-10T04:18:18Z (web research performed against official Vercel documentation; two additional fetches — a Vercel KB guide and the `vercel/vercel` CLI source on raw.githubusercontent.com — were blocked by the sandbox permission layer, so CLI-source-level claims below are marked UNVERIFIED).

## 2. Key Findings

### Q1 — Sensitive Environment Variables

- Finding: Sensitive Environment Variables are a distinct, documented Vercel feature, and they are the most likely cause.
- Evidence: "Sensitive environment variables are environment variables whose values are non-readable once created." — `/docs/environment-variables/sensitive-environment-variables`. And, from the CLI reference: "Sensitive values are stored securely by Vercel and cannot be viewed later in the dashboard or with `vercel env ls`. Sensitive values are still available to builds run within the Vercel build container and at runtime." — `/docs/cli/env`.
- Impact: A value that cannot be decrypted server-side cannot be materialized into a pulled file. This exactly reproduces the symptom: the key IS set in Production, works at build/runtime on Vercel, and is missing locally.
- **Strong aggravating factor**: current CLI defaults make this the norm, not the exception. Per `/docs/cli/env`: "When you add an Environment Variable with `vercel env add`, Vercel defaults to `sensitive` for production, preview, and custom environments." The documented table gives Production → default type `sensitive`, Preview → `sensitive`, Development → `encrypted` ("Sensitive is not allowed. `--sensitive` returns an error").
- UNVERIFIED: whether `vercel env pull` **omits the key entirely** or writes it with an **empty value**. Official docs do not state the file-level rendering; the CLI source could not be fetched. The PM's observation ("does NOT contain SUPABASE_SERVICE_ROLE_KEY") is itself the best available evidence and points to **omitted entirely** for this CLI version. Do not assume the empty-value form when writing any validation logic — check for "key absent OR key empty".

Other mechanisms that produce the same symptom (ranked by plausibility here):

| # | Mechanism | Evidence / note |
|---|---|---|
| 1 | Sensitive var (above) | Documented; CLI default for Production. Leading hypothesis. |
| 2 | Integration/Marketplace-managed credential | Vercel documents Supabase-integration secret rotation and a "Production-only access" model for Marketplace credentials. If this key was provisioned by the Supabase integration rather than added by hand, it may be managed/scoped in a way that excludes it from export. **UNVERIFIED** — could not fetch the Marketplace-credentials page. |
| 3 | Stale pulled file | `.vercel/.env.production.local` is a cache. "When environment variables or project settings are updated on Vercel, remember to use `vercel pull` again" — `/docs/cli/pull`. If the key was added after that pull, it simply isn't there. Cheapest thing to rule out: re-pull. |
| 4 | Shared (team-level) variable not linked | "A Shared Environment Variable is activated once it is linked to at least one project." — `/docs/environment-variables/shared-environment-variables`. Note also: "When a project-level and a Shared Environment Variable share the same key and environment, the project-level environment variable always overrides the Shared Environment Variable." Shared vars can themselves be marked sensitive. |
| 5 | Custom environment / branch scoping | The key may live on a custom environment (`vercel target list`) or, for preview, on a specific `--git-branch`. Not applicable to a Production pull unless the value you expect actually lives elsewhere. |
| 6 | Role permissions | Plausible but **UNVERIFIED** — no official doc found stating that a non-owner role silently drops variables from a pull. Treat as a last resort, not a working hypothesis. |
| 7 | Team policy "Enforce Sensitive Environment Variables" | Documented owner-level toggle: "all newly created environment variables in the Production and/or Preview environments will be sensitive." If your team has this on, #1 is guaranteed, not merely likely. |

**Diagnostic that discriminates #1 from #3/#4 without exposing any value**: run `vercel env ls production`. If the key is listed (it will be, with its value hidden if sensitive), #3 is excluded and #1 is confirmed by the type/tag column.

### Q2 — Overwrite behavior of `vercel env pull`

- Finding: It **prompts for confirmation** before overwriting an existing target file; `--yes` bypasses that prompt.
- Evidence: `/docs/cli/env` → *Unique Options → Yes*: "The `--yes` option can be used to bypass the confirmation prompt when overwriting an environment file, removing an environment variable, or updating an environment variable." The doc's own example is literally `vercel env pull --yes` with the caption "…to overwrite an existing environment file."
- Impact: It never silently refuses, and it does not silently clobber in an interactive terminal. It also **rewrites the file wholesale** — it is not a merge. Any hand-added line you put into `.env.local` is lost on the next pull. This is the single most important operational consequence for the layering question in Q4.
- UNVERIFIED (v50 specifics): (a) whether the CLI prints a key-level diff alongside the prompt — believed yes from observed CLI behavior, but not documented and CLI source could not be fetched; (b) exact behavior under the `--non-interactive` global option without `--yes` (documented as a global option for `vercel env`, but its interaction with the overwrite prompt is not spelled out). In CI, always pass `--yes` explicitly rather than relying on TTY detection.

### Q3 — Non-user-defined variables injected into the pulled file

- Finding: The only system variable **documented** as landing in a locally pulled file is `VERCEL_OIDC_TOKEN`.
- Evidence: `/docs/oidc` → *In Local Development*: "You can download the `VERCEL_OIDC_TOKEN` straight to your local development environment using the CLI command `vercel env pull`… This writes the `VERCEL_OIDC_TOKEN` environment variable and other environment variables targeted to `development` to the `.env.local` file of your project folder." Correspondingly, `/docs/environment-variables/system-environment-variables` lists `VERCEL_OIDC_TOKEN` as **build-time**, with the note that at runtime it arrives as the `x-vercel-oidc-token` request header instead.
- The broader `VERCEL_*` family (`VERCEL=1`, `CI=1`, `VERCEL_ENV`, `VERCEL_TARGET_ENV`, `VERCEL_URL`, `VERCEL_BRANCH_URL`, `VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_REGION`, `VERCEL_DEPLOYMENT_ID`, `VERCEL_PROJECT_ID`, `VERCEL_SKEW_PROTECTION_ENABLED`, `VERCEL_AUTOMATION_BYPASS_SECRET`, `VERCEL_HASH_SALT`, `VERCEL_GIT_*`) is documented as "automatically populated by the system" **on deployments**, gated behind the project setting "Enable access to System Environment Variables". Whether a given CLI version materializes any of these into a pulled file is **UNVERIFIED from official docs**. Note the two commands differ in purpose: `vercel pull` writes `.vercel/.env.$target.local` as "a local cache… for offline use of `vercel build` and `vercel dev`" (`/docs/cli/pull`), which is exactly the kind of file that would carry deployment-shaped system values; `vercel env pull [file]` is the one aimed at "local tools (like `next dev`)".
- Build-cache variables: no such documented category was found beyond `VERCEL_HASH_SALT` (build-time, "a salt to rotate the filenames of framework-generated content-addressed output"). Treat "build-cache variables" as not a distinct thing to strip.

**Should they be stripped from a local `.env.local` run under plain `node`/`tsx`? Yes — strip everything except what you deliberately need.** Concretely:

- `VERCEL=1` — documented meaning: "An indicator to show that system environment variables have been exposed to your project's Deployments." Many frameworks, SDKs and libraries branch on `process.env.VERCEL`. Setting it on a laptop asserts something false about the runtime. **This can change application behavior** and is the highest-value thing to remove.
- `VERCEL_ENV=production` — "The environment that the app is deployed and running on." A locally-loaded `production` value will steer any code doing `VERCEL_ENV === 'production'` (analytics on, debug off, strict cookie flags, real payment keys). Remove.
- `CI=1` — Vercel's own docs flag the downstream hazard: "some React warnings, such as those in a `create-react-app`, will display as build errors. See How do I resolve a `process.env.CI = true` error?" It also flips many tools into non-interactive mode. Remove.
- `VERCEL_URL` / `VERCEL_BRANCH_URL` / `VERCEL_PROJECT_PRODUCTION_URL` — these are hostnames without a scheme, and are a very common input to absolute-URL construction (OG images, auth callback URLs, webhooks). Locally they point your app's self-references at production. Remove.
- `VERCEL_GIT_*` — inert for behavior in most apps, but they will be stale immediately and are misleading in logs/telemetry. Remove for hygiene.
- `VERCEL_OIDC_TOKEN` — **short-lived by design and will go stale.** Docs on function tokens: "Vercel does not generate a fresh OIDC token for each execution. It reuses a token for up to 90 minutes. Function tokens have a Time to Live (TTL) of two hours." The TTL of the specific token written by `vercel env pull` for local dev is **UNVERIFIED**, but it is unambiguously a short-lived credential. Behavioral effect: **only if your code actually exchanges it** (AWS/GCP/Azure federation or the Vercel OIDC helper libraries). In that case a stale token yields confusing auth failures against your cloud provider, and the fix is to re-run `vercel env pull`, not to debug the credential. If you do not use OIDC federation at all, a stale token is inert — but it is still a bearer credential sitting on disk, so drop it.
- Treat any pulled file as secret-bearing: `VERCEL_AUTOMATION_BYPASS_SECRET`, if present, is a Deployment Protection bypass. Note Vercel "always redacts `VERCEL_AUTOMATION_BYPASS_SECRET` and `VERCEL_OIDC_TOKEN` … from build logs, regardless of value length" — mirror that posture in your own logging.

### Q4 — Two-file layering: hand-maintained `.env` + pulled `.env.local`

- Finding: The layering **matches Vercel's documented intent**, and the precedence direction (`.env.local` wins) is the conventional one — but the guidance is framed around pulling the **Development** environment, not Production.
- Evidence: `/docs/cli/env` — "To leverage environment variables in local tools (like `next dev` or `gatsby dev`) that want them in a file (like `.env`), run `vercel env pull <file>`." The section is titled "Exporting **Development** Environment Variables", and the note steers `vercel build`/`vercel dev` users to `vercel pull` instead. `/docs/oidc` confirms the default write target is `.env.local`. Your `src/env/load.ts` (`.env` then `.env.local` with `override: true`) reproduces the Next.js-style precedence that Vercel's tooling assumes.
- Impact / **the failure mode you flagged is real and is the main risk**: because the pulled file wins and is rewritten wholesale, any key present in **both** files is silently decided by whatever Vercel holds. If you pull with `--environment=production`, a production `PUBLIC_BASE_URL` (e.g. the live domain) or `PORT` overrides your locally-correct `.env` value, and nothing warns you. Symptoms are indirect — auth redirects to production, CORS/callback mismatches, a dev server that binds an unexpected port, OG/canonical URLs pointing at prod. There is a worse variant: local traffic hitting production data because a pulled production `DATABASE_URL`/Supabase URL won the override.
- Recommended layering rules:
  1. **Pull only the Development environment into `.env.local`.** `vercel env pull` already defaults to Development; do not pass `--environment=production` for the file the app loads. Put dev-appropriate values (`PUBLIC_BASE_URL=http://localhost:...`) in Vercel's **Development** target so the pulled file is correct by construction — this is the cleanest fix because it removes the collision entirely.
  2. **Enforce disjoint key sets.** `.env` holds only keys Vercel does not hold; `.env.local` holds only pulled keys. Add a startup assertion in the loader that fails loudly on any key defined in both. Given the pull is a full-file rewrite, this check is your only durable guard.
  3. **Never hand-edit `.env.local`.** The next pull erases it. Anything hand-maintained belongs in `.env`.
  4. **Prefer not writing secrets to disk at all** where feasible: `vercel env run -e <env> -- <command>` "runs any command with environment variables from your linked Vercel project, without writing them to a file. This is useful when you want to avoid storing secrets on disk" (`/docs/cli/env`).
  5. **Keep `.vercel/.env.production.local` out of the app's load path.** Per `/docs/cli/pull`, that file exists for `vercel build`/`vercel dev` — "If you aren't using those commands, you don't need to run `vercel pull`." It is also the file most likely to carry deployment-shaped `VERCEL_*` values. Consider deleting it if those two commands are not in use.

## 3. Project Impact
- Affected files or modules: `src/env/load.ts` (precedence and a same-key collision guard); `.env` / `.env.local` (key partitioning); `.vercel/.env.production.local` (stale artifact, candidate for removal); `.gitignore` (already correct — covers `.env`, `.env.local`, `.env*.local`, `.env.production`, `.vercel`); any developer-facing setup doc describing the pull step.
- Risk level: **Medium overall, with one High-severity tail risk.** Medium: the missing service-role key is a workflow blocker, not a security defect. High tail risk: a production-targeted pull silently overriding a local URL/DB/port value and pointing a dev process at production resources — a silent, hard-to-notice failure.
- Recommended direction: Stop pulling Production into the app's load path. Populate the **Development** target on Vercel with dev-safe values (including `SUPABASE_SERVICE_ROLE_KEY`, which Development permits because sensitive is disallowed there), then use the default `vercel env pull` → `.env.local`. Keep `.env` for keys Vercel does not hold, and add a hard collision check in the loader.

## 4. Implementation Notes For Claude
- Concrete advice:
  1. Confirm the hypothesis first, cheaply and without touching any value: `vercel env ls production` and check whether `SUPABASE_SERVICE_ROLE_KEY` is listed and tagged sensitive. If listed → sensitive (or integration-managed); if absent → shared-var-not-linked, custom environment, or wrong scope.
  2. Recovery path for a sensitive value: it cannot be read back from Vercel by design. Retrieve the service role key from its **source of truth** (the Supabase project dashboard) and add it to Vercel's **Development** target — `vercel env add SUPABASE_SERVICE_ROLE_KEY development`. Development is stored as `encrypted`, not `sensitive` ("the Vercel API does not allow sensitive Environment Variables in development"), so it will pull cleanly thereafter. Do not attempt to un-sensitive the Production entry.
  3. Note the documented constraint when scripting this: "If you select development with production or preview in the same command, `vercel env add` returns an error. Add development variables in a separate command."
  4. Standardize the local step as bare `vercel env pull` (Development default → `.env.local`), with `--yes` only in non-interactive contexts.
  5. Add a `VERCEL_*` strip/deny-list step or loader-side filter, and a loud startup error for keys present in both `.env` and `.env.local`.
- Constraints:
  - Sensitive values are irrecoverable from Vercel — no CLI flag, no REST field, no role elevation changes this. Any plan premised on "pull the production secret down" is dead on arrival.
  - Development targets cannot be sensitive; accept that a dev-target service role key is stored encrypted-but-readable, and scope it to a non-production Supabase project if one exists.
  - `vercel env pull` rewrites the whole file; no merge strategy is available.
  - Do not commit any pulled file; `.gitignore` already covers these paths — verify before any commit that adds a new filename outside those patterns.
- Pitfalls:
  - Assuming the missing key would appear as `KEY=` (empty). It did not here. Validate on "absent OR empty".
  - Using `--environment=production` for the file the app loads — this is the `PUBLIC_BASE_URL` / `PORT` override trap, and it can silently connect local code to production data.
  - Confusing `vercel pull` (`.vercel/.env.$target.local`, a build cache) with `vercel env pull [file]` (a real `.env` file for local tooling). The existing `.vercel/.env.production.local` is the former and should not be treated as the expected source of local values.
  - Letting `VERCEL_OIDC_TOKEN` persist: it expires, and if the code path exchanges it, the resulting cloud-provider auth error will look like a permissions bug rather than an expiry.
  - Trusting a previously pulled file after any dashboard change — re-pull, per the explicit doc reminder.

## 5. References
- Source: https://vercel.com/docs/environment-variables/sensitive-environment-variables — Why it matters: defines the feature and the non-readable-once-created property; documents the team-wide "Enforce Sensitive Environment Variables" policy and build-log redaction.
- Source: https://vercel.com/docs/cli/env — Why it matters: the primary reference for `vercel env pull`; documents `--yes` as the overwrite-prompt bypass, the sensitive-by-default table for Production/Preview, the Development `encrypted` restriction, and `vercel env run` as the no-disk alternative.
- Source: https://vercel.com/docs/environment-variables/system-environment-variables — Why it matters: authoritative list and semantics of every `VERCEL_*` variable, including which are build-time vs runtime, plus the `CI=1` hazard note.
- Source: https://vercel.com/docs/oidc — Why it matters: the only official statement that `vercel env pull` writes `VERCEL_OIDC_TOKEN` (plus development-targeted vars) to `.env.local`; gives token TTL/reuse figures for functions.
- Source: https://vercel.com/docs/cli/pull — Why it matters: establishes that `.vercel/.env.$target.local` is a build cache for `vercel build`/`vercel dev` only, and that it goes stale on any remote change.
- Source: https://vercel.com/docs/environment-variables/shared-environment-variables — Why it matters: link-activation requirement and project-over-shared precedence, both of which can produce a "set but missing" symptom.
- Source: https://vercel.com/docs/environment-variables/manage-across-environments — Why it matters: Vercel's own audit/verify command sequence (`vercel target list`, `vercel env ls <env>`, pull, verify), usable as the diagnostic runbook.

## 6. Open Questions
- Question: Does `vercel env pull` omit a sensitive key entirely, or emit it with an empty value?
  Why it remains uncertain: not stated in any official doc; the CLI source fetch (`vercel/vercel` `packages/cli/src/commands/env/pull.ts`) was blocked by the sandbox permission layer. The PM's observed file supports "omitted", but that is one CLI version and one project.
- Question: Which `VERCEL_*` variables, if any, does CLI v50 write into a file produced by `vercel env pull` (as opposed to `vercel pull`)?
  Why it remains uncertain: only `VERCEL_OIDC_TOKEN` is documented for the local-pull path; the rest are documented as deployment-populated. Resolvable locally in seconds by listing the **key names** in the existing pulled file — no values needed.
- Question: Was `SUPABASE_SERVICE_ROLE_KEY` created by hand or provisioned by the Supabase Marketplace integration?
  Why it remains uncertain: the Marketplace-credentials KB page could not be fetched, and Vercel has shipped a "Production-only access" model for Marketplace credentials whose export semantics I could not confirm. This changes the remediation: an integration-managed key should be rotated/read from Supabase, not re-added by hand in a way that fights the integration.
- Question: Does the team have "Enforce Sensitive Environment Variables" enabled?
  Why it remains uncertain: team-level setting, not visible from the repository. If enabled, every future Production/Preview variable will exhibit this same symptom, which makes the Development-target workflow mandatory rather than merely recommended.
- Question: Exact TTL of the `VERCEL_OIDC_TOKEN` written for local development.
  Why it remains uncertain: docs give the 2-hour TTL / 90-minute reuse figures for **function** tokens specifically and are silent on the locally pulled token.