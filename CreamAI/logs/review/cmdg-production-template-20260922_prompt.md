# Review request: CMDG production report template

Review the scoped changes for the user request: make every 천명사주 saved report use the same long-form template structure as the approved local review, while keeping only member-specific values member-specific.  The shared 16 public thumbnail images must render for newly generated and already saved reports.

## Focus areas

- No personal reading prose, identity values, or private context is copied into another member's report.
- Existing saved reports receive only the shared image mapping, without mutation of stored reports.
- The server calculates Samjae using the report's pillar year; the browser only renders it.
- New report generation and legacy saved report display both use the same 16 public thumbnail paths.
- All image files are in the actual static-build source directory, not merely a local-review folder.
- Non-천명사주 services retain their current image behavior.
- Client rendering escapes all server-provided text.

## Files in scope

- `src/report/report-generator.ts`
- `src/saju/fortune-cycle.ts`
- `src/types/index.ts`
- `사주/js/umsh-report-access.js`
- `사주/css/umsh-verified-reader.css`
- `사주/사주/assets/cmdg-review/*`
- `tests/unit/saju-analyzer.test.ts`
- `tests/unit/report-access-frontend.test.ts`
- `tests/unit/saju-master-visual-contract.test.ts`

Return findings sorted by severity, with exact file/line references, then test gaps and a concise verdict. Do not suggest a deployment action.
