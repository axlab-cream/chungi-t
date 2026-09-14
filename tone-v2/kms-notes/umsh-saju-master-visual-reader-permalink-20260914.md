# 운명상회 saju_master 시각 리더·고유 링크 검증

- task: `task-tone-v2-p04-saju-master-visual-render-evidence-20260914`
- routes: `08 Components`, `12 QA/Eval`, `14 Memory/KMS`
- result: PASS for the isolated 37-section `saju_master` candidate; aggregate release remains `NO_GO`.

## Reusable success pattern

1. Reuse one immutable complete synthetic record through a loopback-only, read-only server.
2. Verify the production reader on desktop, exact 390px mobile, direct-section navigation, keyboard focus and complete print.
3. Keep screenshots, PDF and model prose out of tracked evidence; store only counts, hashes and outcomes.
4. For generic `/r/{resultId}` readers, derive the immutable locator from the path before authentication and obtain the service identity only from the authorized server response.
5. Expand every disclosure on `beforeprint`, restore its prior state on `afterprint`, then render and inspect the first, middle and final PDF pages.

## Failure prevention

- Do not require a service route key before booting a generic permalink; that leaves a valid stored result on a loading shell.
- Do not treat fixed utility controls outside the centered reader as content overflow. Check content elements and horizontal scroll separately.
- Do not commit screenshots or printable provider prose. The reusable evidence boundary is hashes, dimensions, counts and pass/fail results.

## Verification

- 37/37 disclosures on desktop and exact 390px mobile; no horizontal overflow.
- Direct final section and Enter close/reopen with a visible 2px focus outline pass.
- Generic permalink loads 37/37 after the path-locator fix.
- Print contains 37 answer blocks across 38 non-empty pages; representative pages pass visual inspection.
- Focused 64/64 and permalink-focused 50/50; full repository 952/952 across 123 suites; typecheck and Vercel build pass.

No credential, customer data, provider prose or production record is stored in this note.
