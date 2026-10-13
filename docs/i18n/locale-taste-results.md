# EN/JA bounded taste smoke
Observed: 2026-10-12T06:53:20.693Z
Models: report gpt-5.6-luna; consultation gemini-3.8-flash.
Mode: live_requested; requests: 0/4; retries: 0; maximum output tokens: 500 per call.
synthetic actual prompt-builder/provider transport smoke; NOT full API E2E, customer storage, entitlement, voice or report-queue validation

- reading/en: blocked (OPENAI_API_KEY_MISSING)
- consultation/en: blocked (GEMINI_API_KEY_MISSING)
- reading/ja: blocked (OPENAI_API_KEY_MISSING)
- consultation/ja: blocked (GEMINI_API_KEY_MISSING)

## Output review
No successful output means naturalness, numeric fidelity and safety are **not evaluated**. Automatic script and numeric-token checks never certify naturalness or semantic fidelity.

## Runtime integration still required
- Append the locale generation guide to sectionPrompt and verdictPrompt trusted systems (and longform/summary prompts), not only HTML; keep frozen original voice and evidence pins. Add locale to NEW generation/cache identity while preserving existing Korean IDs.
- In consultation backend, carry explicit validated locale through request/session and append at the system boundary. Default settings.speech explicitly requests Korean, so the targeted language appendix must take precedence for EN/JA. Localize socialReply/partnerQuestion/errors and transcription separately.
- Stored Korean results require a separate authorized copy/translation policy, not this new-output appendix.
- The smoke uses deployed model IDs unchanged, direct transport with hard spending limits, actual report sectionPrompt and default consultation policy/settings; it does not use published admin consultation overrides, extraction, history/credits, retries, queue or full API E2E.
- If credentials are missing or the configured model is unsupported, stop and report blocked. Never substitute a different model silently.
