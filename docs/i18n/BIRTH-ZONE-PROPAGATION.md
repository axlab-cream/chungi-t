# Birthplace civil-clock propagation

- New EN/JA CMDG forms require an explicit birthplace IANA region. No browser language or timezone inference. All zones supported by the runtime are offered, with explicit Korea/Seoul and Japan/Tokyo labels.
- Date and time remain the recorded local civil clock. A separate optional earlier/later field identifies repeated fall-back DST hours. The parent-owned civil-time calculator performs conversion and rejects gaps/ambiguous timestamps.
- State, auth-return snapshots, cached profiles, saved-reading state and API birth payloads carry `birthTimeZone` and `birthTimeDisambiguation`.
- Existing profiles/readings lacking a zone restore explicitly to `Asia/Seoul`, preserving historic Korean semantics instead of assigning a guessed foreign birthplace.
- Existing `cheongi_user_profiles.profile_payload` JSONB stores `birth_time_zone` and `birth_time_disambiguation`. No schema migration, production DB call or actual customer write was performed.
- Report and lineage cache keys add the zone and optional fold choice only for non-Seoul births. Omitted/named-Seoul IDs remain identical to existing Korean IDs.
- Self-profile gender and calendar state now use canonical `male/female` and `solar/lunar`. Localized labels are display-only. Known older EN/JA/Korean labels normalize on auth/profile/history restoration and API building, preventing female or lunar profiles from reopening as male/solar.

## Verification

`node node_modules/tsx/dist/cli.mjs --test tests/unit/birth-zone-propagation.test.ts`

Tests use an isolated synthetic Supabase URL with a mocked transport, not production. They cover profile builder/write/reload, old profile defaults, report/lineage key separation, inline JS syntax and EN/JA primary API payload fields.

## Parent integration still required

The general/profile API parsers, actionable 400 responses, DST conversion and all specialized service/partner parsers and cache whitelists are outside this patch's ownership. This patch alone does not establish every service's E2E foreign-birth support.
