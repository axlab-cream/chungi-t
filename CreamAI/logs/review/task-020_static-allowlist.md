# Review Report - task-020

## 1. Scope

- Task id: task-020
- Reviewed files: `src/server/app.ts`, `tests/unit/static-exposure.test.ts`, `vercel.json`, static asset references under `사주/`
- Review time: 2026-09-10T10:22:47Z

## 2. Verdict

- Changes requested
- Summary: The allow-list and tests improve the prior deny-list design, but an encoded-backslash request still returns protected prompt content. The design also remains unable to protect future internal artifacts stored with an allowed web extension outside `/사주/`.

## 3. Critical Issues

- [src/server/app.ts:751-766] `%5C` is an active static-file bypass on Windows. A verified request to `/me/pass-angle/01-step-1-story/PROMPT.md%5C` returned `200` and the full `PROMPT.md` body. `decodeURIComponent` produces a trailing backslash, but line 754 trims only `/`, `.`, and whitespace; the candidate no longer matches `LOOKS_LIKE_FILE`, while `express.static` treats `\` as a path separator.
- Risk: Internal prompts are publicly readable again.
- Recommendation: Reject decoded or raw backslashes before reaching any static middleware, and normalize/truncate trailing Windows separators consistently with Express/send resolution. Add `%5C`, `%5c`, literal backslash where applicable, and combinations with trailing dots/slashes to the bypass test matrix.

## 4. Major Issues

- [src/server/app.ts:719, 784-785] The new allow-list still serves any file with an allowed extension from the broadly mounted `SAJU_ROOT`. A future internal artifact saved as `.html`, `.js`, `.json` if excepted, image, or another allowed web type outside `/사주/` will be exposed. Closing only `/사주/` fixes the currently known scraped HTML file, but does not resolve the general failure mode identified in task-011.
- Risk: A future generator or manual artifact can reintroduce public disclosure without changing this guard.
- Recommendation: Serve only explicit public paths/assets, or maintain a path-level allow-list for page and asset mounts. Do not treat an extension allow-list as protection for sensitive artifacts stored in a web format.

## 5. Minor Issues

- [tests/unit/static-exposure.test.ts:80-91] The bypass matrix covers encoded dots and trailing slashes/dots but not encoded Windows separators, which is the demonstrated bypass.
- Risk: A Windows-specific regression remains undetected.
- Recommendation: Add the verified `%5C` case and assert `404` plus the fixed guard body.

- [src/server/app.ts:760-770] The fixed 404 body differs from Express’s default 404 body. This distinguishes “guard rejected this file-like path” from an ordinary missing route, but does not reveal whether the requested forbidden file exists: existing and nonexistent denied extensions receive the same fixed response.
- Risk: Low; this is policy fingerprinting, not existence disclosure.
- Recommendation: OK as implemented if the fixed response is intentional; use a common application-level 404 only if response uniformity is required.

## 6. Verification Gaps

- Gap: Full `npm test` and `npm run typecheck` could not be independently run through the workspace command wrapper because it references missing `C:\Users\user\Desktop\_internal\invoke-aor.ps1`.
- Suggested check: Re-run both in the PM environment. The focused static suite was independently run directly through the local TS runner: 43 passed, 0 failed.

- Gap: The new extensionless-file test recursively checks `사주/`, which currently covers all configured static roots and correctly reports none. It will detect a future extensionless regular file in that tree, but it cannot protect one added after a failing test is ignored.
- Suggested check: Keep this test as a release gate and explicitly decide/mount any future extensionless public artifact (for example Apple’s app-site-association) before adding it.

- Gap: Asset-reference inspection found literal referenced static extensions limited to allowed types (`css`, `html`, `ico`, `js`, `mp4`, `png`, `ttf`, `webp`, `woff2`). CSS `url()` and `@font-face` references resolve to `.webp` and `.woff2`, both allowed. `detail-data.json` is referenced by the cat-detail page but is intercepted client-side by `cat-report-store.js`; it is not a required network static asset.
- Suggested check: Add an automated reference-to-response crawl for literal local asset URLs, including CSS `url()` targets, so future additions cannot silently require an omitted extension.

## 7. Final Recommendation

- Next action: Fix and test the encoded-backslash bypass before deployment. Then reassess U31 completion against a path-based public-serving model; the current extension allow-list alone does not protect future internal web-format artifacts.