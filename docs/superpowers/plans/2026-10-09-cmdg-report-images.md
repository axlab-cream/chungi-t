# CMDG-IMAGES-20261009

User-authorized production replacement of 18 approved silver-haired character illustrations in the saju_master report.

Requirements: summary portrait, highlight banner, and 16 ordered section images. Existing saved reports and newly generated reports use identical mappings. Keep report text, data, permissions, homepage thumbnails and consultation unchanged.

Design: retain existing black/gold reader tokens, typography, 430px layout and image aspect ratios. Signature element is the approved consistent character; no layout redesign.

Slice: optimize originals to versioned WebP assets; update longform summary/highlight and server/client section mappings; refresh report entry script version; update affected existing contracts.

Acceptance: affected tests and production build pass, 18 assets present in public build, diff reviewed, main commit deployed to linked ax-lab-cream/chungi-t, live saved report images verified in Codex browser.

Rollback: revert this scoped commit and redeploy; previous image assets retained. No DB migrations.

Local QA: 89 affected tests PASS; strengthened mapping contract 5/5 PASS; npm run vercel-build PASS; all 18 built WebPs decode and match source byte-for-byte; staged diff whitespace check PASS.
