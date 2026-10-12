> 최신 운영 상태: 외국어 상담은 의미 품질 미승인으로 기본 비활성화입니다. 아래 지원 내용은 구현·모의시험 범위이며 출시 합격을 뜻하지 않습니다.

# Consultation locale runtime

## Shipped code boundary

- `src/consultation/backend.ts` takes an explicit `locale` body value, otherwise `X-UMSH-Locale`. Exact `ko`, `en`, `ja` only. Missing selection uses the historical Korean behavior; locale is never inferred from browser language or birthplace.
- EN/JA real `provider.reply` calls receive `consultationLanguageSystem(originalSystem, locale)` at the trusted backend boundary. Existing Korean settings, actor identity, evidence and system content are preserved as source, with a targeted output-language appendix. No invented localized character name.
- `src/i18n/consultation-language.ts` exports `consultationLanguageSystem`, `validConsultationLanguage`, `consultationLocale` for bounded runtime samples as well.
- New EN/JA sessions carry locale. Old sessions without locale remain Korean. Request hashes add a locale partition only for EN/JA; old Korean hashes stay unchanged. A request ID cannot replay content from a different locale. Existing conversations cannot be relabeled; open a new conversation instead.
- Conversation lists filter by explicit locale. Read-by-ID rejects a different selected language and never rewrites old history. Locale-specific transcript speaker labels are display labels, not a renamed actor identity.
- Social replies, missing-partner clarification, router/auth failure text and synthesis failures have local literal strings. Code IDs and status codes stay technical. Birth/calendar/gender extraction keys and values stay canonical.
- Existing raw profile values, source settings and customer-authored history remain source data, not newly localized prose.

## Fail-closed output check

Before a successful assistant turn is saved or a question credit is used, EN/JA output is checked for Hangul, target script, selected explicit financial/relationship guarantees (including `completely achievable`, `easily`, `will definitely`), diagnoses and partner mind-reading. Failure uses `PROVIDER_RESPONSE_INVALID`, clears the failed lease, and does not save the rejected text or consume credits. The existing request-attempt daily rate limit still counts attempted generations.

The check is a **bounded heuristic**, not a proof of semantic equivalence, complete safety or naturalness. Its deliberately strict `easily` rule can reject benign uses too. Actual model sample review is still needed. It does not make the caller's numbers or a newly introduced personal fact true.

## Audio and Live boundary

- `ConsultationProvider.transcribe` and `reply` accept an optional locale, backwards-compatible with existing mocks.
- Recorded English/Japanese audio uses an appropriate transcription prompt. Korean uses exactly the old prompt. Transcription never changes technical extraction enums.
- Provider max output remains the existing 4,096 tokens, finite 45-second transport timeout, no provider retries. No speculative thinking configuration or model substitution was introduced here.
- The existing Gemini **Live token** system outside this patch is still Korean. EN/JA `/live-session` fails explicitly with 409 `CONSULTATION_LOCALE_UNSUPPORTED` rather than silently delivering Korean Live. Text and recorded-audio chat use localized replies. A separate Live locale integration is required to enable foreign-language realtime speech.

## Verification

PowerShell in the project root:

`node node_modules/tsx/dist/cli.mjs --test --test-concurrency=1 tests/unit/consultation-locale.test.ts tests/unit/consultation-backend.test.ts tests/unit/consultation-provider-diagnostics.test.ts`

- New locale tests: 10 PASS, 0 FAIL.
- Existing backend/provider diagnostics: 30 PASS, 0 FAIL.
- Full consultation suite including new locale tests: 98 PASS, 0 FAIL (`tests/unit/consultation*.test.ts`, test concurrency 1).
- Mock providers and isolated in-memory test ledger only. No live model calls, production API calls, customer data or DB writes.
- A concurrent whole-project typecheck reported parent-owned `stored-result-route.ts` translation-return typing and `app.ts` preview `.report` errors. No consultation errors were reported. This patch must still pass the parent's final combined typecheck before deployment.
