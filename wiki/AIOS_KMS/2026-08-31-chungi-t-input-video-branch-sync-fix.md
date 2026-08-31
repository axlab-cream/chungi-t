# 2026-08-31 Chungi-T Input Video Background Regression Fix

## Context
- Production deployment from `codex/report-title-flow-20` missed the input video background work that existed on `origin/main`.
- The visible symptom was the saju input form returning to a static hero image instead of the previously approved video-backed, transparent-input design.
- The Kakao OAuth scope fix itself only added the Kakao scope override, but deploying the branch without the input video commits made the design look reverted.

## Root Cause
- Branch divergence: `origin/main` had `8438cf4`, `908b545`, and `5f57ced`.
- The working branch contained RAG/report/social-auth work but did not contain those input UI commits.
- Full merge from `origin/main` was unsafe because it would remove active RAG/report files from the working branch.

## Fix
- Restored `사주/사주/assets/chungi-concern-loop.mp4`.
- Restored input-scene video background layers and shade overlay.
- Restored transparent input panel and field styling for all input scenes.
- Restored name and birth-date validation messages from the input UI branch.
- Added OAuth error-return handling so stale `invalid_scope=account_email` URLs reopen the auth gate with a clear message instead of leaving the user on a confusing input hash.

## Verification
- `npm run typecheck` passed.
- `npm test` passed: 46 tests.
- Local browser check at `http://localhost:8791/#name` confirmed:
  - `data-scene="input"`
  - video opacity `1`
  - static hero opacity `0`
  - panel background `rgba(7, 4, 4, 0.08)`
  - input background `rgba(15, 10, 10, 0.18)`
