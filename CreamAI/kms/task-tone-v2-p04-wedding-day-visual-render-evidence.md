# KMS note — Wedding Day real-reader visual verification

- Verified a complete 20-section isolated record using production reader HTML, JavaScript and CSS through a local read-only data endpoint.
- Use exact viewport evidence for mobile; browser window size alone can be clamped by desktop browser minimums.
- Combine automated overflow/content/navigation checks with visual inspection of accepted screenshots and rendered print pages.
- Interactive fixed controls must be explicitly hidden in `@media print` to prevent prose overlap.
- Preserve generated prose only in ignored QA artifacts and expose only sanitized hashes and aggregate metrics to tracked release evidence.
