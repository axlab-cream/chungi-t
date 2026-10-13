# Saved-result locale copies: integration notes

Implemented files are isolated from `report-store.ts` and `app.ts`. No original report row is updated, no paid model call was made, and the optional SQL was **not executed**.

## Handler boundary

1. Authenticate the existing saved-report route, look up the original record, and check its owner using the existing server identity. Never trust body `ownerId`, `authorizedOwnerId`, scope, or payment flags.
2. Run the existing entitlement/payment check. Build a customer DTO using `toClientReport`, after existing paid/preview projection. `access: 'paid'` requires the original report's paid entitlement or existing explicit admin access. A locale copy grants **no entitlement**.
3. Require complete original and complete sections. If pending, return an explicit `pending-original` locale state without translation. Do not trigger original generation merely to translate.
4. Call `localizedStoredResult` with `ownerId` from original ownership, `authorizedOwnerId` from server-authenticated session, canonical original `reportId`, selected `en`/`ja`, scope, and durable copy store. Use `generate:false` on GET. A missing copy returns only `{state:'missing',sourceLocale:'ko',resultLocale}`; do not label a Korean response as translated.
5. Use a separate authenticated POST/job for `generate:true`; serialize/dedupe requests for each copy key and cap model concurrency/retries/budget. One invocation of `generateTranslate` performs one provider call without retries. This module does not implement cross-process job leases.
6. Return `result` for `state:'translated'`. A projected preview contains at most two sections, no verdict/summary/highlights, and explicitly has false paid flags. The caller must still use its existing preview filtering; the first-two cap is a fail-closed extra boundary, not the business entitlement policy.
7. On validation/provider errors report an explicit failed translation state, never replace original text. No source English/Japanese copy overwrites Korean body, IDs, cache epoch, owner/payment bindings, or source assets. Old hashes remain immutable and can be garbage-collected separately under retention policy.

## Provider injection

Import `StoredTranslationProvider`, `storedTranslationInstructions`, `createStoredTranslationRequest`, `generateTranslate` from `stored-result-translation.ts`.

Implement `translate(request,{signal})` using the configured **report** provider/model. Supply `storedTranslationInstructions(request.locale)` as trusted system/developer text and JSON.stringify(request) as untrusted data. Require JSON `{sourceHash,locale,fields:[{pointer,text}]}` with exactly the request pointers. Keep a hard output-token cap and timeout in the provider. Do not feed raw storage records, birth, owner, analysis, private context, conversation history, prompts, raw attempts, or corpus contents to the translator.

The validator checks exact pointer/identity set, numeric tokens+units, caller-protected quotes, source hash, scope, language script, and size limits. These are structural checks, **not semantic equivalence proof**. A real EN/JA sample review must additionally check uncertainty, causal claims, cultural naturalness, safety disclaimers, Markdown, and qualitative flow values. Language detection is a guard, not a quality score. Original customer quotations explicitly supplied via protectedQuotes may retain Korean.

`protectedQuotes` should be server-selected exact quotations already present in allowed prose, not arbitrary request text. Common translation mechanics do not rewrite customer-authored quoted testimony.

## Persistence

`MemoryLocaleCopyStore`: test/development only, durable=false.

`FileLocaleCopyStore(directory)`: writes only hashed `<copykey>.json` into a separate directory. Never use original report snapshot directory. Uses first-write-wins atomic hard link. Valid for persistent local volume; **not durable on Vercel/serverless ephemeral disk** despite being a filesystem-backed class.

`SupabaseLocaleCopyStore({url,serviceKey})`: server-only durable storage after provisioning `stored-result-locale-schema.sql`. Supports opaque Supabase secret keys without Bearer header, and legacy JWT service keys with Bearer. Never use a browser anon/user key. Uses row owner+original ID+hashed identity filter and repeats authorization in every read/write. Table RLS denies anon/authenticated direct access and only service-role SELECT+INSERT is granted; server verifies tenant identity before reaching the store.

Copy key includes owner ID, original canonical report ID, stable SHA-256 of **customer-projected scope**, locale, scope, translation version. Preview and paid copies never share a key. A content change makes old copies stale; unexposed private metadata/order of object keys does not. Source hash is computed from an explicitly whitelisted projection, avoiding private-field ingestion.

The optional SQL has no FK because deployment's report canonical ID/result ID storage differs by backend. It does not modify the original table. Confirm original record existence and owner in the server before copy creation. Apply a migration only after parent review; check table readiness before enabling routes. If table is absent, fail explicitly, do not silently fall back to ephemeral memory in production.

## Verification command

PowerShell in `C:/dev/cream/umsh/_build/chungi-t-deploy`:

`node node_modules/tsx/dist/cli.mjs --test tests/unit/stored-result-locale-copy.test.ts`

Mock providers only: no live model/database writes. Tests cover privacy whitelist, original immutability, technical identity preservation, preview cap, owner/scope/locale isolation, immutable snapshot hashes, numeric/quote validation, pointer/language errors, getter/prototype hazards, limits, file persistence, cancellation/no-write failure, and Supabase network authorization.
