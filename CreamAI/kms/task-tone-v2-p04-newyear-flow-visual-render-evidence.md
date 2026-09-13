# KMS note — complete native-disclosure report printing

- Use a complete immutable synthetic record and the production reader, not a mock component, for visual acceptance.
- Exact mobile evidence should use a fixed-width frame because desktop headless browsers may clamp a requested narrow window width.
- CSS descendant display rules alone do not reliably print closed native `details` bodies.
- In `beforeprint`, record and open only closed report disclosures; in `afterprint`, close only the recorded set so the prior screen state is restored.
- Hide fixed report controls and shared app chrome in print to prevent overlap and non-content noise.
- Accept print only after structural checks for all section titles/bodies and visual review of representative first, middle and final pages.
- Keep screenshots and PDFs in ignored local storage; track only sanitized counts, findings and SHA-256 hashes.
