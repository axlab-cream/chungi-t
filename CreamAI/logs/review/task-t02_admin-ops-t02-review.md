# Review Report - task-t02

## 1. Scope

- Task id: task-t02
- Reviewed files: `docs/admin-ops/T02-service-mapping.md`, `docs/admin-ops/production-source-of-truth.md`, `docs/admin-ops/T01-baseline.md`, `CreamAI/backlog/task-t02.md`, relevant source and pack specifications
- Review time: 2026-09-10T05:24:07Z

## 2. Verdict

- Changes requested
- Summary: The local mapping findings are largely accurate, including the `cmdg` bridge defect, hidden-vs-sale split, and order-price snapshot. However, the evidence does not establish that production is exactly local `HEAD`; U1/U7 are prematurely marked resolved. The S02 field inventory is also numerically wrong.

## 3. Critical Issues

- None.

## 4. Major Issues

- [docs/admin-ops/production-source-of-truth.md:5-6, 43-52, 155-156; docs/admin-ops/T02-service-mapping.md:7-12] Issue: The document promotes marker agreement to “production == local HEAD” and clears U1/U7.
  - Risk: A third source tree or an earlier/local artifact can share `robots.txt`, `sitemap.xml`, and `/privacy` markers while differing in the service, payment, or API code audited by T02. The full production-current mapping is therefore not established.
  - Recommendation: Restore the “local HEAD basis; production parity unverified” qualification. To make the assertion airtight, obtain an authoritative deployment source/artifact hash, Vercel deployment source metadata, or a build-time SHA/version marker served by production and tied to the exact commit.

- [docs/admin-ops/production-source-of-truth.md:28-30, 64-65, 156, 163] Issue: Absence of Git metadata in `vercel inspect` is treated as evidence that this was a CLI deployment.
  - Risk: Missing metadata is compatible with a CLI deployment, but does not prove it; metadata can be absent for other Vercel/project configuration reasons.
  - Recommendation: State “deployment method unverified; CLI deployment is a hypothesis,” and retain U14 until deployment history/configuration supplies affirmative evidence.

- [docs/admin-ops/T02-service-mapping.md:226-248] Issue: The claim “17 fields: 12 code constants / 5 nonexistent” is incorrect. The displayed table itself identifies 10 code-backed fields (`title`, `tagline`, `summary`, `category`, `order`, `posterAssetId`, `landingPath`, `availability`, `discoveryVisibility`, price) and 7 absent fields (`videoAssetId`, `alt`, `effectiveAt`, `revision`, release version, quality status, modified time).
  - Risk: T22 scope and storage-model planning would be based on an understated set of new fields.
  - Recommendation: Correct the summary to 10 code-backed and 7 absent fields, or explicitly redefine the counted field set and reconcile the table.

## 5. Minor Issues

- [docs/admin-ops/production-source-of-truth.md:101-105, 177] Issue: `git merge-tree --write-tree` is described as a read-only dry run.
  - Risk: `--write-tree` writes a tree object into `.git`; it does not alter the worktree, branch, or commit history, but is not literally read-only.
  - Recommendation: Describe it as a non-worktree/non-commit merge simulation, or use wording that distinguishes Git-object writes from destructive repository changes.

- [docs/admin-ops/production-source-of-truth.md:123-125] Issue: Add/add conflicts prove that both branches added the named files after their merge base, but alone do not prove the two implementations are functionally independent.
  - Risk: U15 is stated more strongly than the evidence supports.
  - Recommendation: Say “parallel additions requiring implementation comparison,” then compare behavior/tests before concluding the implementations are independently authored or semantically divergent.

## 6. Verification Gaps

- Gap: Production HTTP results and `vercel inspect` could not be independently re-run in this review environment because outbound network access is blocked. Repository-side marker differences are confirmed: `사주/robots.txt` and `사주/sitemap.xml` exist at `HEAD` and not at `origin/main`; the respective `/privacy` title and stylesheet markers also differ as documented.
  - Suggested check: Re-run and preserve sanitized headers/body hashes for production `robots.txt`, `sitemap.xml`, and `/privacy`, plus authoritative deployment provenance.

- Gap: U1/U7 evidence assessment:
  - (a) PASS for the local-vs-`origin/main` marker premise; live HTTP 200/byte-count remains unindependently verified here.
  - (b) PASS for the repository marker comparison; the live response remains unindependently verified here.
  - (c) PASS that the documented timestamps are 23 seconds apart; timing correlation is not source provenance.
  - (d) WRONG as support for “CLI deploy”; absence of metadata is inconclusive.

- Gap: The reported 24 merge conflicts could not be reproduced in the read-only sandbox because `git merge-tree --write-tree` requires writing Git objects. The three named files are confirmed add/add candidates: each is added on both sides relative to the merge base.
  - Suggested check: Run the documented merge-tree command in a disposable writable clone/worktree and retain the complete conflict-name output. Deferring the merge is sound while admin-ops remains a separately scoped investigation, but it must remain a tracked integration task; it is not evidence that the production source issue is resolved.

- Gap: T02 factual checks:
  - (a) PASS — manifest, `KNOWN_SERVICE_KEYS`, and `prompts/services/*.md` each contain the same 20 keys.
  - (b) PASS — `PaymentProductKey` declares 19 values (`src/payment/catalog.ts:1-20`).
  - (c) PASS — 19 seeds, the specified four hidden keys, and 15 list entries (`src/server/service-directory.ts:32-72`).
  - (d) PASS — no `cmdg → saju_master` alias; prompt loading `cmdg` throws (`src/prompt/service-system.ts:10-16, 87-92, 104-127`).
  - (e) PASS — code-path reasoning is valid: the app-local normalizer returns `undefined` for `cmdg`, then `/api/saju/analyze` returns 400 before the prompt loader (`src/server/app.ts:699-707, 2335-2348`). It is correctly labeled as code analysis, not HTTP evidence.
  - (f) PASS — the disabled set is empty; config returns all 19 and the order gate does not reject the four hidden products (`src/server/app.ts:188-189, 1209-1226, 1427-1445`). Actual order creation still requires checkout configuration, authentication, and profile validation.
  - (g) PASS — eight products use distinct Step-04 return paths (`src/payment/catalog.ts:88-158`).
  - (h) PASS — `HOME_FIT_PUBLICLY_ENABLED` is hardcoded `true`; the reviewed runtime config contains chat/report settings, not service visibility.
  - (i) WRONG — the 12/5 S02 count is inconsistent with the table, as noted above.
  - (j) PASS — order creation snapshots `product.amount` into the persisted order object (`src/server/app.ts:1463-1478`).

- Gap: Scope extension to prompt/app visibility gates is justified for T02’s acceptance criteria. Production provenance investigation is useful but should remain a separate evidence record and must not pre-commit T03’s production conclusions.

- Gap: U10, U11, and U12 are correctly scoped. U13 should remain an integration/debt item; U14 must be downgraded from a conclusion to a hypothesis; U15 requires behavior comparison. Before T03, explicitly retain the production-provenance blocker and define whether T03 is a local-code/storage investigation or authorized production-schema investigation.

- Gap: No secret value appears in the reviewed documents. The Vercel deployment ID and public URLs are identifiers for public deployment resources, not credentials; redaction is not required. The recorded absence of commit/push/deploy/merge/rebase/checkout/schema/DB/transaction activity is consistent with the materials reviewed. `git fetch origin` is safe and non-destructive to project content, though it updates Git’s remote-tracking metadata.

## 7. Final Recommendation

- Next action: Correct the production-source inference and S02 field counts before approving task-t02. T03 may start only as a local-source investigation with the production-parity qualification retained; do not treat U1/U7 as resolved or represent T03 findings as verified production state.