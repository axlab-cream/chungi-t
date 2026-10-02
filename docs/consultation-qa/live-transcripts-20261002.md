# Gemini consultation / Live transcripts — 2026-10-02

- Observation: text consultations already use Gemini generateContent. Prior production upstream response was HTTP400 API_KEY_INVALID; a key being present is not proof of validity. Recorded audio + Edge TTS was not Live.
- Decision: Google Live constrained ephemeral tokens, authenticated mint endpoint with durable per-owner limits; Live audio tool requests existing Gemini/RAG/CAS answer service. Permanent key never sent to browser. PC displays input/output transcription and saved canonical answers as safe text. Text submission ends the current voice connection to avoid simultaneous conflicting turns.
- Artifact: commit 9699e445; src/consultation/live.ts, backend.ts, credits.ts, consultation-live.js and UI. Mobile portrait tap + opening guide. Lifetime free allowance5, legacy one consumed counts as1.
- QA result: isolated consultation suite85/85; final frontend/transport23/23; backend29/29; build/typecheck/SEO PASS. Browser mobile390px portrait-only and click-to-chat PASS. PC1280x720 document720/form bottom602/nav646. Live actual Google speech, microphone barge-in and provider acceptance NOT_VERIFIED; mocks are not service activation proof.
- Review: scoped self-review performed. External Grok invoked but stalled after MCP connection failures; interrupted without a review result. No external approval claimed.
- Lesson: distinguish valid credentials, successful token mint, accepted WebSocket setup, transcript display, durable answer save and credit charge as separate verification gates. Never call a fixed greeting an actual generated consultation.
- Relation: prior notes/umsh-consultation-connection-20261002.md and desktop-fit note.
- Next_patch: verify with valid production Gemini key; confirm constrained-token protocol against live service, actual audio and transcript, then saved owner history and exactly-once credit in two real rounds.

## Production verification
- Runtime bb80a9cb promoted to umsh.kr: dpl_12Ze9eQYDQxFNvvYzf8Tun1QrFrf / https://chungi-m4ayyclwk-ax-lab-cream.vercel.app.
- First connected PC inspection found greeting squeezed by notices. Corrected composer grid and spacing; second production pass1280x720: page720, room483/content483, chat192/content192. Greeting, input and navigation visible together. Screenshot live-pc-production.png.
- Actual text question at11:31 KST returned upstream HTTP400 INVALID_ARGUMENT/API_KEY_INVALID. Fresh context after final deploy still reports free5; failed request did not spend a question. Actual substantive answer remains BLOCKED.
- Voice button entered connection state; browser microphone acquisition did not complete, so cancelled through UI. Actual Live token/setup/audio was NOT_VERIFIED. Cancellation restored text controls. No live audio success claimed.
- Remaining external action: securely replace production GEMINI_API_KEY with a valid Google Gemini key and redeploy, then real text/voice two-round QA. Do not paste credentials into chat/logs.
