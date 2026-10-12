# Specialized birthplace-zone propagation

## Scope

Backend-only changes; no live model, DB, deployment or UI operation.

- `src/saju/birth-location.ts`: explicit IANA zone and optional repeated-clock `earlier`/`later` validation. Invalid values are `InputError` (400). No inference from locale, country, browser or language.
- `src/match/couple-service.ts`, `src/match/marry-service.ts`: nested self/partner birth fields and report IDs.
- `src/love/again-service.ts`, `src/love/mind-service.ts`: optional nested partner birth and report IDs; nested `birthTimeKnown` is preserved.
- `src/love/signal-service.ts`: nested self/partner birth and report ID; partner date supports the existing text or numeric nested date.
- `src/love/thisyear-service.ts`: self birth fields and report ID.
- `src/love/spouse-service.ts`, `src/money/save-service.ts`, `src/flow/newyear-service.ts`: report identity whitelists.
- `src/day/wedding-service.ts`: report identity; legacy ISO-date partner input can specify `partnerBirthTimeZone` and `partnerBirthTimeDisambiguation`, or callers can provide a nested `partnerBirth` object.

## Identity contract

Absent zone and explicit `Asia/Seoul` preserve historical Korean fingerprint properties and values. `birthTimeDisambiguation` is ignored in the Seoul identity because the retained Korean calculation path has no DST fold. Non-Seoul zone and optional fold choice partition the fingerprint. Full-object partner/request fingerprints are normalized too, so an explicit Seoul field does not unexpectedly invalidate a legacy report.

Existing original results, ownership, entitlements and payment records are never rewritten by these helpers. Conversion and DST gap/fold rejection remain in the parent's `civil-time.ts` integration; parsers only preserve/validate explicit location metadata.

## Verification

PowerShell, repository root:

`node node_modules/tsx/dist/cli.mjs --test tests/unit/specialized-birth-location.test.ts`

Initial result: 24 PASS, 0 FAIL. Covers explicit-only fields, malformed zone/choice errors, all self/partner parsers, optional partner absence, wedding compatibility, omitted/named-Seoul equality, non-Seoul/fold separation, partner fingerprint isolation and legacy again fingerprint bytes.

`node node_modules/typescript/bin/tsc --noEmit`

Result: PASS. Combined specialized-zone and existing couple/marry/again/mind/signal/spouse/money/newyear/wedding service suite: 75 PASS, 0 FAIL. This does not verify localized forms, production HTTP routes, live database round trips, or actual provider output.
