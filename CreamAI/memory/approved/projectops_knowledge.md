# ProjectOps Approved Knowledge


---

<!-- promoted_at: 2026-09-13T05:28:23.5357278+09:00 source: task-tone-v2-p04-quit-fortune-full-outline-generate_memory.md -->

# ProjectOps Memory Candidate

task_id: task-tone-v2-p04-quit-fortune-full-outline-generate
date: 2026-09-13
case_type: success_case
failure_type: long-outline generation gate mismatch and partial-checkpoint false success
success_pattern: immutable synthetic checkpoint plus deterministic replay and executable fail-closed completion invariant
problem: A 48-section provider run needed safe continuation across rejected attempts without mutating customer data, and retry/recovery could appear successful before the requested prefix was complete.
solution: Generate one exact ordered section at a time in isolated storage, stop at the first unresolved failure, add focused RED fixtures for each legitimate output form, recover only immutable saved attempts that pass current production review, and assert full requested-prefix completion on every no-failure invocation.
root_cause: The deterministic Korean wording guards were narrower than legitimate provider morphology, while the harness completion assertion excluded retry/recovery modes.
why_it_worked: Each gate change was bounded by positive and negative fixtures, all accepted sections were replayed through the production-equivalent review, and an independent reviewer found the remaining postcondition gap before closure.
reuse_condition: Use for long paid-report outlines generated section-by-section with immutable attempts, deterministic acceptance gates, and resumable checkpoints.
do_not_use_when: Do not use this evidence as semantic or predictive accuracy proof, and do not apply it to operating customer records without separate production authorization and privacy review.
related_files: scripts/check-quit-fortune-outline-live.ts; scripts/reading-live-invariants.ts; src/report/tone-v2-review.ts; src/report/interpretation-validation.ts; tone-v2/evaluations/P04-quit-fortune-full-outline-generation-20260913.json
recommended_prompt: Generate the exact requested outline sequentially in synthetic isolated storage; stop at the first unresolved review failure; preserve immutable attempts; close only after every requested section passes replay.
recommended_command: npx tsx scripts/check-quit-fortune-outline-live.ts --version=<unique> --generate --fresh
revalidation_command: npx tsx --test tests/unit/reading-live-harness.test.ts tests/unit/report-content-guards.test.ts tests/unit/tone-v2-generation.test.ts tests/unit/report-persistence.test.ts tests/unit/work-quit-service.test.ts tests/unit/quit-fortune-outline.test.ts
expires_at: 2027-09-13
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: focused 103/103; full 719/719 across 101 suites; typecheck/build PASS
- review: Approved with comments after re-review; Critical/Major/Minor 0; both first-review findings resolved
- commands: exact 48-section saved replay PASS; ProjectOps preflight/implementation/test/review/rag/release PASS

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true

---

<!-- promoted_at: 2026-09-13T05:48:52.7426775+09:00 source: task-tone-v2-p05-quit-fortune-corpus-rag-release-candidate_memory.md -->

# ProjectOps Memory Candidate

task_id: task-tone-v2-p05-quit-fortune-corpus-rag-release-candidate
date: 2026-09-13
case_type: success
failure_type: stored_snapshot_not_used_by_runtime_retrieval
success_pattern: versioned_corpus_plus_snapshot_pinned_rag_and_hash_verification
problem: Report records stored a corpus snapshot, but later section generation and saved-attempt review retrieved from the active global registry, allowing one report to mix corpus versions after a registry switch.
solution: Accept the stored CorpusSnapshot throughout registry lookup, corpus loading, retrieval, generation and review; skip current vector ranks for non-current snapshots; verify every snapshot file hash; release the reviewed corpus at a separate versioned path.
root_cause: The snapshot was persisted as metadata but was not threaded through the runtime retrieval call chain.
why_it_worked: Executable tests compare active and old snapshot content in the same process and assert generation prompt, saved-attempt review, vector isolation and hash mismatch behavior.
reuse_condition: Any RAG-backed immutable result that persists a corpus or prompt version and continues generation later.
do_not_use_when: Content is intentionally mutable for all readers and no historical result identity is promised.
related_files: src/rag/corpus-registry.ts, src/rag/retriever.ts, src/report/report-generator.ts, src/report/report-queue.ts, tests/unit/quit-fortune-corpus-release.test.ts
recommended_prompt: Trace the persisted version object through every later retrieval, generation, repair and review call before changing the active registry.
recommended_command: npx tsx --test tests/unit/quit-fortune-corpus-release.test.ts
revalidation_command: npm test; npm run vercel-build
expires_at:
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: task-specific 8/8; related RAG 41/41; full 727/727 across 102 suites.
- review: CreamAI/logs/review/task-tone-v2-p05-quit-fortune-corpus-rag-release-candidate_closure-review.md
- commands: node tone-v2/build-quit-fortune-corpus-release.mjs; npm test; npm run vercel-build

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true

---

<!-- promoted_at: 2026-09-13T06:02:23.7204536+09:00 source: task-tone-v2-p05-money-save-corpus-rag-release-candidate_memory.md -->

# ProjectOps Memory Candidate

task_id: task-tone-v2-p05-money-save-corpus-rag-release-candidate
date: 2026-09-13
case_type: corpus-versioning
failure_type: unreviewed-semantic-prescription
success_pattern: preserve the old corpus, create an explicit reviewed version, pin report retrieval to the stored snapshot, and use a registry-only rollback
problem: the active money-save corpus mixed symbolic claims with unsupported financial habit facts and arbitrary periods or counts
solution: rewrite all twelve blocks with input/calculation/symbol/hypothetical boundaries, activate a separate 2.1.0 file, and assert old/new snapshot isolation through retrieval, prompts and saved-attempt review
root_cause: a global migration suffix did not semantically validate each financial block and the service had no release-specific proof
why_it_worked: executable content assertions and content-hash-checked snapshots make semantic and attachment claims independently reproducible
reuse_condition: a service corpus is replaced for new reports while immutable reports must retain their original retrieval basis
do_not_use_when: existing customer records must be rewritten or provider-output quality is being claimed without an actual provider evaluation
related_files: data/tone-v2/corpus/releases/money-save-service-2.1.0.json; tests/unit/money-save-corpus-release.test.ts; tone-v2/releases/money-save-2.1.0.json
recommended_prompt: Review every corpus block for input, calculated value, symbolic hypothesis, hypothetical example, numeric provenance and deterministic outcome boundaries before activation.
recommended_command: node --import tsx --test tests/unit/money-save-corpus-release.test.ts
revalidation_command: node tone-v2/build-money-save-corpus-release.mjs && npm test && npm run vercel-build
expires_at: revalidate whenever the corpus registry, report snapshot schema or money_save prompt contract changes
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: 8/8 task-specific; 74/74 related; full root suite evidence in the Task evaluation
- review: CreamAI/logs/review/task-tone-v2-p05-money-save-corpus-rag-release-candidate_closure-review.md
- commands: deterministic builder, focused/related/full tests, typecheck, vercel-build, credential boundary scan

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true

---

<!-- promoted_at: 2026-09-13T06:09:55.0699040+09:00 source: task-tone-v2-p05-match-couple-corpus-rag-release-candidate_memory.md -->

# ProjectOps Memory Candidate

task_id: task-tone-v2-p05-match-couple-corpus-rag-release-candidate
date: 2026-09-13
case_type: corpus-versioning
failure_type: relationship-inference-and-deterministic-outcome
success_pattern: preserve old corpus, explicitly review every relationship block, pin retrieval to the stored snapshot and use registry-only rollback
problem: eighteen legacy blocks mixed symbolic compatibility values with unprovided scenes, partner emotions and universal relationship prescriptions
solution: rewrite all blocks with two-person input, calculation, symbol, hypothetical-example, partner-mind and safety boundaries, then activate a separate 2.1.0 file
root_cause: a shared migration suffix did not validate each relationship claim or safety context
why_it_worked: executable semantic assertions and content-hash-checked snapshot tests cover both the corpus artifact and every runtime consumer
reuse_condition: a relationship corpus changes for new reports while old reports must retain their original grounding
do_not_use_when: provider-output quality or abuse-risk assessment is being claimed without separate evidence and qualified support
related_files: data/tone-v2/corpus/releases/match-couple-service-2.1.0.json; tests/unit/match-couple-corpus-release.test.ts; tone-v2/releases/match-couple-2.1.0.json
recommended_prompt: Review each relationship block for partner-mind inference, deterministic outcomes, symbolic boundaries, hypothetical labeling and threat/control/violence safety routing.
recommended_command: node --import tsx --test tests/unit/match-couple-corpus-release.test.ts
revalidation_command: node tone-v2/build-match-couple-corpus-release.mjs && npm test && npm run vercel-build
expires_at: revalidate whenever the corpus registry, report snapshot schema or match_couple contract changes
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: 8/8 task-specific; 74/74 related; full root suite evidence in Task evaluation
- review: CreamAI/logs/review/task-tone-v2-p05-match-couple-corpus-rag-release-candidate_closure-review.md
- commands: deterministic builder, focused/related/full tests, typecheck, vercel-build, credential scan

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true

---

<!-- promoted_at: 2026-09-13T06:21:18.2323127+09:00 source: task-tone-v2-p05-marry-match-corpus-rag-release-candidate_memory.md -->

# ProjectOps Memory Candidate

task_id: task-tone-v2-p05-marry-match-corpus-rag-release-candidate
date: 2026-09-13
case_type: corpus-versioning
failure_type: marriage-inference-and-deterministic-outcome
success_pattern: preserve old corpus, explicitly review every marriage block, pin retrieval to the stored snapshot and use registry-only rollback
problem: twenty legacy blocks mixed symbolic compatibility values with unprovided marriage timing, partner or family reactions and universal prescriptions
solution: rewrite all blocks with input, calculation, symbol, hypothetical-example, autonomy and safety boundaries, then activate a separate 2.1.0 file
root_cause: a shared migration suffix did not validate each marriage, family, housing, finance or reproductive claim
why_it_worked: executable semantic assertions and content-hash-checked snapshot tests cover both the corpus artifact and every runtime consumer
reuse_condition: a marriage corpus changes for new reports while old reports must retain their original grounding
do_not_use_when: provider-output quality, marriage probability, partner intent or abuse-risk assessment is being claimed without separate evidence
related_files: data/tone-v2/corpus/releases/marry-match-service-2.1.0.json; tests/unit/marry-match-corpus-release.test.ts; tone-v2/releases/marry-match-2.1.0.json
recommended_prompt: Review each marriage block for partner and family mind inference, deterministic outcomes, reproductive autonomy, symbolic boundaries, hypothetical labeling and threat/control/violence safety routing.
recommended_command: node --import tsx --test tests/unit/marry-match-corpus-release.test.ts
revalidation_command: node tone-v2/build-marry-match-corpus-release.mjs && npm test && npm run vercel-build
expires_at: revalidate whenever the corpus registry, report snapshot schema or marry_match contract changes
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: 8/8 task-specific; 74/74 related; 751/751 full repository
- review: CreamAI/logs/review/task-tone-v2-p05-marry-match-corpus-rag-release-candidate_closure-review.md
- commands: deterministic builder, focused/related/full tests, typecheck, vercel-build, ProjectOps and credential scan

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true

---

<!-- promoted_at: 2026-09-13T06:29:28.4738354+09:00 source: task-tone-v2-p05-today-fortune-corpus-rag-release-candidate_memory.md -->

# ProjectOps Memory Candidate

task_id: task-tone-v2-p05-today-fortune-corpus-rag-release-candidate
date: 2026-09-13
case_type: corpus-versioning
failure_type: unlabeled-daily-scenarios-and-prophecy-boundary
success_pattern: preserve old corpus, review the daily block, pin RAG consumers to the stored snapshot and leave the deterministic renderer unchanged
problem: the legacy daily block mixed migration boilerplate with unlabeled behavior scenes and did not cleanly distinguish calculated symbols from actual schedules
solution: rewrite the block around server-calculated date pillars, user-confirmed schedule facts, symbolic questions and labeled hypothetical examples, then activate a separate 2.1.0 file
root_cause: automated migration appended policy text but did not semantically review the single service block
why_it_worked: executable semantic assertions and content-hash-checked snapshot tests cover all RAG consumers while dedicated daily tests prove the renderer stayed stable
reuse_condition: a service has both RAG grounding and a separate deterministic output path that must not be conflated
do_not_use_when: claiming that changing the RAG corpus changed or evaluated the deterministic renderer or provider output
related_files: data/tone-v2/corpus/releases/today-fortune-service-2.1.0.json; tests/unit/today-fortune-corpus-release.test.ts; tone-v2/releases/today-fortune-2.1.0.json
recommended_prompt: Review the daily corpus for calculation versus observation, labeled hypothetical examples, arbitrary time or count prescriptions, event certainty and other-person reaction inference.
recommended_command: node --import tsx --test tests/unit/today-fortune-corpus-release.test.ts
revalidation_command: node tone-v2/build-today-fortune-corpus-release.mjs && npm test && npm run vercel-build
expires_at: revalidate whenever the corpus registry, report snapshot schema, today_fortune contract or deterministic daily renderer changes
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: 8/8 task-specific; 82/82 related; 759/759 full repository
- review: CreamAI/logs/review/task-tone-v2-p05-today-fortune-corpus-rag-release-candidate_closure-review.md
- commands: deterministic builder, focused/related/full tests, typecheck, vercel-build, ProjectOps and credential scan

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true

---

<!-- promoted_at: 2026-09-13T06:37:44.9962921+09:00 source: task-tone-v2-p05-saju-master-corpus-rag-release-candidate_memory.md -->

# ProjectOps Memory Candidate

task_id: task-tone-v2-p05-saju-master-corpus-rag-release-candidate
date: 2026-09-13
case_type: corpus-versioning
failure_type: migration-boilerplate-and-symbolic-fact-mixing
success_pattern: preserve old corpus, separate evidence layers, pin all RAG consumers to stored snapshots, and publish only a reversible local candidate
problem: the legacy saju-master block mixed duplicated migration policy, unlabeled scenarios and symbolic chart interpretation without explicit fact boundaries
solution: rewrite the block around user-confirmed facts, server-calculated chart values, symbolic questions and labeled hypothetical examples, then activate a separate 2.1.0 file
root_cause: automated migration appended generic safety text but did not semantically review the service block
why_it_worked: executable content assertions and content-hash-checked snapshot tests cover retrieval, prompts, saved review and rollback
reuse_condition: a symbolic-domain corpus is versioned while stored outputs must remain reproducible
do_not_use_when: claiming chart symbols empirically prove personality, health, career, wealth, relationships, future events or professional decisions
related_files: data/tone-v2/corpus/releases/saju-master-service-2.1.0.json; tests/unit/saju-master-corpus-release.test.ts; tone-v2/releases/saju-master-2.1.0.json
recommended_prompt: Review each symbolic corpus block for user-fact, calculated-value, interpretation and hypothetical-example boundaries, then test stored-snapshot isolation.
recommended_command: node --import tsx --test tests/unit/saju-master-corpus-release.test.ts
revalidation_command: node tone-v2/build-saju-master-corpus-release.mjs && npm test && npm run vercel-build
expires_at: revalidate whenever the corpus registry, report snapshot schema or saju_master contract changes
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: 8/8 task-specific; 98/98 related; 767/767 full repository
- review: CreamAI/logs/review/task-tone-v2-p05-saju-master-corpus-rag-release-candidate_closure-review.md
- commands: deterministic builder, focused/related/full tests, typecheck, vercel-build, ProjectOps and credential scan

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true

---

<!-- promoted_at: 2026-09-13T06:44:36.0374360+09:00 source: task-tone-v2-p05-work-job-corpus-rag-release-candidate_memory.md -->

# ProjectOps Memory Candidate

task_id: task-tone-v2-p05-work-job-corpus-rag-release-candidate
date: 2026-09-13
case_type: corpus-versioning
failure_type: unlabeled-work-scenes-and-symbolic-fact-mixing
success_pattern: preserve old corpus, separate work evidence layers, pin RAG consumers to stored snapshots and publish a reversible local candidate
problem: the legacy work-job block mixed migration boilerplate, unlabeled scenes and calculated symbols with implied work facts
solution: rewrite around user-confirmed work records, server calculations, symbolic questions and labeled hypothetical examples, then activate a separate 2.1.0 file
root_cause: automated migration did not perform service-level semantic review
why_it_worked: executable content assertions, runtime-typed fixtures and content-hash snapshot tests cover all consumers
reuse_condition: career or aptitude corpus changes while stored outputs must remain reproducible
do_not_use_when: asserting a destined job, hiring, promotion, income, performance, resignation result or colleague intent
related_files: data/tone-v2/corpus/releases/work-job-service-2.1.0.json; tests/unit/work-job-corpus-release.test.ts; tone-v2/releases/work-job-2.1.0.json
recommended_prompt: Separate observed work history from calculated symbols and hypothetical examples, then test every stored-snapshot consumer.
recommended_command: node --import tsx --test tests/unit/work-job-corpus-release.test.ts
revalidation_command: node tone-v2/build-work-job-corpus-release.mjs && npm test && npm run vercel-build
expires_at: revalidate whenever the corpus registry, report snapshot schema or work_job contract changes
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: 8/8 task-specific; 100/100 related; 775/775 full repository
- review: CreamAI/logs/review/task-tone-v2-p05-work-job-corpus-rag-release-candidate_closure-review.md
- commands: deterministic builder, focused/related/full tests, typecheck, vercel-build, ProjectOps and credential scan

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true

---

<!-- promoted_at: 2026-09-13T06:50:45.1643371+09:00 source: task-tone-v2-p05-love-mind-corpus-rag-release-candidate_memory.md -->

# ProjectOps Memory Candidate

task_id: task-tone-v2-p05-love-mind-corpus-rag-release-candidate
date: 2026-09-13
case_type: corpus-versioning
failure_type: unlabeled-relationship-scenes-and-mind-inference-risk
success_pattern: separate observed behavior from private mental state, preserve refusal and safety boundaries, and pin stored snapshots
problem: migration boilerplate and unlabeled contact scenes obscured the line between observed behavior and inferred feeling
solution: version a reviewed block that treats contact as evidence only of contact, preserves unknowns, respects refusal and routes danger to safety
root_cause: automated migration did not perform relationship-domain semantic review
why_it_worked: executable assertions cover mind inference, refusal, danger signals and every snapshot consumer
reuse_condition: a relationship corpus discusses another person's feelings, intent or future behavior
do_not_use_when: turning silence, ambiguity, refusal, coercion or violence into romantic evidence
related_files: data/tone-v2/corpus/releases/love-mind-service-2.1.0.json; tests/unit/love-mind-corpus-release.test.ts; tone-v2/releases/love-mind-2.1.0.json
recommended_prompt: Separate observed actions, direct statements, unknown mental states and safety signals; then prove snapshot isolation.
recommended_command: node --import tsx --test tests/unit/love-mind-corpus-release.test.ts
revalidation_command: node tone-v2/build-love-mind-corpus-release.mjs && npm test && npm run vercel-build
expires_at: revalidate when registry, snapshot schema or love_mind contract changes
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: focused 8/8; related 88/88; full 783/783
- review: CreamAI/logs/review/task-tone-v2-p05-love-mind-corpus-rag-release-candidate_closure-review.md
- commands: deterministic builder, tests, typecheck, build, ProjectOps, credential scan

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true

---

<!-- promoted_at: 2026-09-13T06:58:49.2995700+09:00 source: task-tone-v2-p05-love-again-corpus-rag-release-candidate_memory.md -->

# ProjectOps Memory Candidate

task_id: task-tone-v2-p05-love-again-corpus-rag-release-candidate
date: 2026-09-13
case_type: corpus-versioning
failure_type: reunion-intent-inference-and-unlabeled-scenario-risk
success_pattern: separate confirmed relationship events from reunion intent, honor refusal and danger signals, and pin stored snapshots
problem: migration boilerplate and unlabeled scenarios blurred confirmed contact with longing, consent and future reunion
solution: version a reviewed block that limits facts to user-confirmed events and direct expressions, keeps reunion intent unknown without agreement, and routes refusal or danger to boundaries and safety
root_cause: automated migration did not perform reunion-domain semantic and safety review
why_it_worked: executable assertions cover history, reunion inference, refusal, contact-stop, danger signals and every stored-snapshot consumer
reuse_condition: a relationship corpus discusses reconciliation, renewed contact or another person's future intent
do_not_use_when: converting contact, silence, ambiguity, refusal, coercion, stalking or violence into evidence of reunion
related_files: data/tone-v2/corpus/releases/love-again-service-2.1.0.json; tests/unit/love-again-corpus-release.test.ts; tone-v2/releases/love-again-2.1.0.json
recommended_prompt: Separate confirmed events, direct statements, unknown reunion intent, consent boundaries and danger signals; then prove snapshot isolation.
recommended_command: node --import tsx --test tests/unit/love-again-corpus-release.test.ts
revalidation_command: node tone-v2/build-love-again-corpus-release.mjs && npm test && npm run vercel-build
expires_at: revalidate when registry, snapshot schema or love_again contract changes
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: focused 8/8; related 88/88; full 791/791
- review: CreamAI/logs/review/task-tone-v2-p05-love-again-corpus-rag-release-candidate_closure-review.md
- commands: deterministic builder, tests, typecheck, build, ProjectOps, credential scan

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true

---

<!-- promoted_at: 2026-09-13T07:05:54.9527563+09:00 source: task-tone-v2-p05-love-spouse-corpus-rag-release-candidate_memory.md -->

# ProjectOps Memory Candidate

task_id: task-tone-v2-p05-love-spouse-corpus-rag-release-candidate
date: 2026-09-13
case_type: corpus-versioning
failure_type: future-spouse-identity-timing-and-unlabeled-scenario-risk
success_pattern: separate user-stated relationship conditions from future-person prediction, enforce autonomy and safety, and pin stored snapshots
problem: migration boilerplate and unlabeled scenes blurred user preferences and observed behavior with future spouse identity, attributes and timing
solution: version a reviewed block that treats only user-stated conditions and observed actions as facts, uses chart values as symbolic questions, and rejects identity, timing, mind and outcome predictions
root_cause: automated migration did not perform future-spouse-domain semantic, autonomy and safety review
why_it_worked: executable assertions cover input facts, identity, attributes, timing, autonomy, safety and every stored-snapshot consumer
reuse_condition: a corpus discusses an unknown future person, partner attributes, meeting timing or marriage outcomes
do_not_use_when: identifying a person, prescribing gender roles or converting refusal, coercion, control, stalking or violence into compatibility
related_files: data/tone-v2/corpus/releases/love-spouse-service-2.1.0.json; tests/unit/love-spouse-corpus-release.test.ts; tone-v2/releases/love-spouse-2.1.0.json
recommended_prompt: Separate user-stated preferences and observed behavior from calculated symbols and unknown future-person claims; then prove snapshot isolation.
recommended_command: node --import tsx --test tests/unit/love-spouse-corpus-release.test.ts
revalidation_command: node tone-v2/build-love-spouse-corpus-release.mjs && npm test && npm run vercel-build
expires_at: revalidate when registry, snapshot schema or love_spouse contract changes
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: focused 8/8; related 88/88; full 799/799
- review: CreamAI/logs/review/task-tone-v2-p05-love-spouse-corpus-rag-release-candidate_closure-review.md
- commands: deterministic builder, tests, typecheck, build, ProjectOps, credential scan

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true

---

<!-- promoted_at: 2026-09-13T07:15:41.0803153+09:00 source: task-tone-v2-p05-home-fit-corpus-rag-release-candidate_memory.md -->

# ProjectOps Memory Candidate

task_id: task-tone-v2-p05-home-fit-corpus-rag-release-candidate
date: 2026-09-13
case_type: corpus-versioning
failure_type: missing-measurement-substitution-and-dedicated-snapshot-bypass
success_pattern: keep observations, measurements, unknowns and symbols separate, and pass stored snapshots through every dedicated corpus consumer
problem: migrated home corpus blurred missing measurements with analogous patterns, while a dedicated home reader bypassed stored corpus snapshots
solution: version all 12 blocks with explicit evidence boundaries, prohibit deterministic physical and property claims, label hypothetical scenes, and thread CorpusSnapshot through home prompt and saved-review consumers
root_cause: migration boilerplate lacked home-domain semantic review and snapshot coverage focused on the generic RAG path only
why_it_worked: executable assertions cover all 12 blocks plus active/stored retrieval, dedicated prompt generation, saved prose review and hash mismatch fail-closed behavior
reuse_condition: a domain-specific corpus helper bypasses the generic retriever or discusses unavailable environmental measurements
do_not_use_when: substituting symbolic readings for inspections, measurements, medical advice, financial evidence, structural review or contract review
related_files: data/tone-v2/corpus/releases/home-fit-service-2.1.0.json; src/report/home-reading-corpus.ts; src/report/report-generator.ts; tests/unit/home-fit-corpus-release.test.ts
recommended_prompt: Keep user observations, server measurements, missing values and symbols distinct, then prove every generic and dedicated consumer uses the stored snapshot.
recommended_command: node --import tsx --test tests/unit/home-fit-corpus-release.test.ts
revalidation_command: node tone-v2/build-home-fit-corpus-release.mjs && npm test && npm run vercel-build
expires_at: revalidate when registry, snapshot schema, home reading helper or home_fit contract changes
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: focused 8/8; related 107/107; full 807/807
- review: CreamAI/logs/review/task-tone-v2-p05-home-fit-corpus-rag-release-candidate_closure-review.md
- commands: deterministic builder, tests, typecheck, build, ProjectOps and credential scan

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true

---

<!-- promoted_at: 2026-09-13T07:23:16.5486291+09:00 source: task-tone-v2-p05-work-move-corpus-rag-release-candidate_memory.md -->

# ProjectOps Memory Candidate

task_id: task-tone-v2-p05-work-move-corpus-rag-release-candidate
date: 2026-09-13
case_type: corpus-versioning
failure_type: verbal-promise-and-symbolic-career-outcome-boundary
success_pattern: distinguish confirmed work facts and written terms from reported promises, unknown company conditions and symbolic chart questions
problem: migration boilerplate and unlabeled scenes could blur current observations, verbal promises, written terms and predicted hiring or resignation outcomes
solution: version all 10 blocks with explicit fact/document/unknown/symbol layers, professional boundaries and stored-snapshot isolation
root_cause: automated migration did not perform career-document, unknown-company, hiring, salary, timing, health and contract semantic review
why_it_worked: executable assertions cover every block plus active/stored retrieval, prompt generation, saved prose review and hash mismatch fail-closed behavior
reuse_condition: a career corpus discusses offers, verbal promises, company conditions, compensation, resignation or hiring timing
do_not_use_when: treating astrology as hiring evidence, replacing contract review, inferring company secrets or another person's intent, or prescribing an unsupported resignation date
related_files: data/tone-v2/corpus/releases/work-move-service-2.1.0.json; tests/unit/work-move-corpus-release.test.ts; tone-v2/releases/work-move-2.1.0.json
recommended_prompt: Separate user-confirmed facts and written terms from reported promises, unknown company conditions and symbolic calculations; then prove stored snapshot isolation.
recommended_command: node --import tsx --test tests/unit/work-move-corpus-release.test.ts
revalidation_command: node tone-v2/build-work-move-corpus-release.mjs && npm test && npm run vercel-build
expires_at: revalidate when registry, snapshot schema or work_move contract changes
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: focused 8/8; related 153/153; full 815/815
- review: CreamAI/logs/review/task-tone-v2-p05-work-move-corpus-rag-release-candidate_closure-review.md
- commands: deterministic builder, tests, typecheck, build, ProjectOps and credential scan

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true

---

<!-- promoted_at: 2026-09-13T07:31:23.9125088+09:00 source: task-tone-v2-p05-pass-angle-corpus-rag-release-candidate_memory.md -->

# ProjectOps Memory Candidate

task_id: task-tone-v2-p05-pass-angle-corpus-rag-release-candidate
date: 2026-09-13
case_type: corpus-versioning
failure_type: symbolic-study-traits-and-unsupported-schedule-prescriptions
success_pattern: ground exam guidance in official dates and actual study records while keeping chart values symbolic and old generated records pinned
problem: migrated blocks described calculated symbols as learning traits and embedded unsupported fixed study periods and D-day stages
solution: version all 8 blocks with exam-fact, official-document, study-record, calculation, symbol, numeric and health boundaries
root_cause: automated migration did not perform exam-domain semantic or numeric provenance review
why_it_worked: executable assertions cover all blocks plus active/stored retrieval, prompt generation, saved prose review, hash mismatch and truthful prior-output handling
reuse_condition: an exam corpus discusses intelligence, study style, pass timing, D-day routines, burnout or completed outputs generated under an older corpus
do_not_use_when: predicting pass/fail, diagnosing health, inventing study periods, or relabeling old provider output as evidence for a new corpus
related_files: data/tone-v2/corpus/releases/pass-angle-service-2.1.0.json; tests/unit/pass-angle-corpus-release.test.ts; tone-v2/releases/pass-angle-2.1.0.json
recommended_prompt: Use confirmed exam facts, official instructions and actual study records; keep calculated symbols separate and preserve every old snapshot and completed identity.
recommended_command: node --import tsx --test tests/unit/pass-angle-corpus-release.test.ts
revalidation_command: node tone-v2/build-pass-angle-corpus-release.mjs && npm test && npm run vercel-build
expires_at: revalidate when registry, snapshot schema, pass_angle contract or completed-record schema changes
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: focused 8/8; related 143/143; full 823/823
- review: CreamAI/logs/review/task-tone-v2-p05-pass-angle-corpus-rag-release-candidate_closure-review.md
- commands: deterministic builder, tests, typecheck, build, ProjectOps and credential scan

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true

---

<!-- promoted_at: 2026-09-13T07:43:06.6924918+09:00 source: task-tone-v2-p05-cat-compatibility-corpus-rag-release-candidate_memory.md -->

# ProjectOps Memory Candidate

task_id: task-tone-v2-p05-cat-compatibility-corpus-rag-release-candidate
date: 2026-09-13
case_type: corpus-versioning
failure_type: guardian-chart pet inference and unsupported behavior prescription
success_pattern: preserve the old corpus, distinguish animal observations from guardian symbols, pin stored snapshots and publish only a reversible local candidate
problem: thirty-eight migrated blocks mixed guardian chart language with unverified cat behavior, private-state implications, fixed observation periods and deterministic care outcomes
solution: rewrite every block around user observations, unknown cat state, symbolic guardian calculations, labeled hypothetical scenes, welfare escalation and sourced numeric boundaries
root_cause: automated migration appended generic policy text but did not perform animal-welfare, veterinary, household-applicability or numeric semantic review
why_it_worked: executable assertions cover all 38 blocks plus active/stored retrieval, prompt construction, saved-prose review, hash mismatch and truthful release state
reuse_condition: a pet-oriented symbolic corpus changes while old reports must retain their original grounding
do_not_use_when: diagnosing an animal, predicting behavior or compatibility, overriding veterinary guidance, or claiming provider-output quality without provider evidence
related_files: data/tone-v2/corpus/releases/cat-compatibility-service-2.1.0.json; tests/unit/cat-compatibility-corpus-release.test.ts; tone-v2/releases/cat-compatibility-2.1.0.json
recommended_prompt: Use only user-entered observations as animal facts; keep guardian calculations symbolic, label examples, protect welfare and prove stored-snapshot isolation.
recommended_command: node --import tsx --test tests/unit/cat-compatibility-corpus-release.test.ts
revalidation_command: node tone-v2/build-cat-compatibility-corpus-release.mjs && npm test && npm run vercel-build
expires_at: revalidate when registry, snapshot schema, cat service, veterinary sources or cat_compatibility contract changes
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: focused 8/8; related 139/139; full 831/831; typecheck/build PASS
- review: CreamAI/logs/review/task-tone-v2-p05-cat-compatibility-corpus-rag-release-candidate_closure-review.md
- commands: deterministic builder, focused/related/full tests, typecheck, Vercel build, ProjectOps and credential boundary scan

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true

---

<!-- promoted_at: 2026-09-13T07:52:30.5076085+09:00 source: task-tone-v2-p05-couple-signal-corpus-rag-release-candidate_memory.md -->

# ProjectOps Memory Candidate

task_id: task-tone-v2-p05-couple-signal-corpus-rag-release-candidate
date: 2026-09-13
case_type: corpus-versioning
failure_type: partner-mind and fidelity inference plus unsafe confirmation guidance
success_pattern: preserve the old corpus, distinguish confirmed relationship facts from symbols and unknown private state, pin stored snapshots and publish only a reversible local candidate
problem: twelve migrated blocks mixed observed communication with inferred affection, fidelity, causes, unsupported periods or counts and generic migration boilerplate
solution: rewrite every block around confirmed actions and words, separate server calculations as symbolic questions, label hypothetical scenes, prohibit monitoring and route refusal or danger signals to boundaries and safety support
root_cause: automated migration appended generic policy text but did not perform relationship evidence, consent, monitoring, fidelity or safety review
why_it_worked: executable assertions cover all 12 blocks plus active/stored retrieval, prompt construction, saved-prose review, hash mismatch and truthful release state
reuse_condition: a relationship-oriented symbolic corpus changes while old reports must retain their original grounding
do_not_use_when: inferring another person's mind or fidelity, determining abuse risk, overriding contact refusal, or claiming provider-output quality without provider evidence
related_files: data/tone-v2/corpus/releases/couple-signal-service-2.1.0.json; tests/unit/couple-signal-corpus-release.test.ts; tone-v2/releases/couple-signal-2.1.0.json
recommended_prompt: Use only confirmed actions and directly heard words as relationship facts; keep chart calculations symbolic, unknown private state unknown, label examples and prioritize consent and safety.
recommended_command: node --import tsx --test tests/unit/couple-signal-corpus-release.test.ts
revalidation_command: node tone-v2/build-couple-signal-corpus-release.mjs && npm test && npm run vercel-build
expires_at: revalidate when registry, snapshot schema, relationship services or couple_signal contract changes
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: focused 8/8; related 147/147; full 839/839; typecheck/build PASS
- review: CreamAI/logs/review/task-tone-v2-p05-couple-signal-corpus-rag-release-candidate_closure-review.md
- commands: deterministic builder, focused/related/full tests, typecheck, Vercel build, ProjectOps and credential boundary scan

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true

---

<!-- promoted_at: 2026-09-13T08:02:56.7303627+09:00 source: task-tone-v2-p05-lucky-color-corpus-rag-release-candidate_memory.md -->

# ProjectOps Memory Candidate

task_id: task-tone-v2-p05-lucky-color-corpus-rag-release-candidate
date: 2026-09-13
case_type: corpus-versioning
failure_type: symbolic color efficacy claims plus invented environment, routine and numeric prescriptions
success_pattern: preserve the old corpus, separate calculations and symbols from confirmed reality, keep missing environment unknown, and publish only a reversible local candidate
problem: twenty-four migrated blocks mixed symbolic color, material and direction associations with invented rooms, clothing, food, sleep, reactions and unsupported counts or durations
solution: rewrite every block around server-calculated chart values and user-confirmed choices, label hypothetical scenes, reject efficacy and outcome claims, and keep health, food, sleep and financial decisions outside symbolic guidance
root_cause: automated migration appended generic policy text but did not perform item-level evidence, efficacy, environmental-fact, health or numeric review
why_it_worked: executable assertions cover all 24 blocks plus active/stored retrieval, prompt construction, saved-prose review, hash mismatch and truthful release state
reuse_condition: a symbolic recommendation corpus changes while old reports must retain their original grounding
do_not_use_when: claiming physical or psychological efficacy, medical or nutritional benefit, financial outcome, or provider-output quality without evidence
related_files: data/tone-v2/corpus/releases/lucky-color-service-2.1.0.json; tests/unit/lucky-color-corpus-release.test.ts; tone-v2/releases/lucky-color-2.1.0.json
recommended_prompt: Treat calculated elements as chart values and colors, materials or directions as symbolic questions only; use confirmed user context, keep missing reality unknown, and make no efficacy or outcome claim.
recommended_command: node --import tsx --test tests/unit/lucky-color-corpus-release.test.ts
revalidation_command: node tone-v2/build-lucky-color-corpus-release.mjs && npm test && npm run vercel-build
expires_at: revalidate when registry, snapshot schema, lucky_color service or symbolic recommendation policy changes
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: focused 8/8; related 147/147; full 847/847; typecheck/build PASS
- review: CreamAI/logs/review/task-tone-v2-p05-lucky-color-corpus-rag-release-candidate_closure-review.md
- commands: deterministic builder, focused/related/full tests, typecheck, Vercel build, ProjectOps and credential boundary scan

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true

---

<!-- promoted_at: 2026-09-13T08:19:41.0761754+09:00 source: task-tone-v2-p05-newyear-flow-corpus-rag-release-candidate_memory.md -->

# ProjectOps Memory Candidate

task_id: task-tone-v2-p05-newyear-flow-corpus-rag-release-candidate
date: 2026-09-13
case_type: corpus-versioning
failure_type: annual symbolic calculations mixed with future events, personal states and arbitrary numeric prescriptions
success_pattern: preserve the old corpus, treat calculated cycles as questions, use only confirmed reality, keep the future unknown, and publish a reversible local candidate
problem: ten migrated blocks mixed year and cycle calculations with invented work, money, relationship, health and routine scenes plus unsupported periods and counts
solution: rewrite every block and topic around server calculations and user-confirmed facts, label hypothetical scenes, reject future and personal-state claims, and retain old snapshot retrieval by version and hash
root_cause: automated migration appended generic policy text without item-level evidence review and left predictive titles in the retrieval surface
why_it_worked: executable assertions cover all ten blocks and topics plus active/stored retrieval, prompt construction, saved-prose review, hash mismatch and truthful release state
reuse_condition: a time-cycle corpus changes while old reports must retain their original grounding
do_not_use_when: claiming future-event accuracy, personal state, medical, legal, financial or provider-output quality without evidence
related_files: data/tone-v2/corpus/releases/newyear-service-2.1.0.json; tests/unit/newyear-flow-corpus-release.test.ts; tone-v2/releases/newyear-flow-2.1.0.json
recommended_prompt: Treat year, solar-term, monthly and ten-year-cycle calculations as symbolic questions only; use confirmed user facts and leave future events, outcomes and personal states unknown.
recommended_command: node --import tsx --test tests/unit/newyear-flow-corpus-release.test.ts
revalidation_command: node tone-v2/build-newyear-flow-corpus-release.mjs && npm test && npm run vercel-build
expires_at: revalidate when registry, snapshot schema, newyear_flow service or future-claim policy changes
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: focused 8/8; related 218/218; full 855/855; typecheck/build PASS
- review: CreamAI/logs/review/task-tone-v2-p05-newyear-flow-corpus-rag-release-candidate_closure-review.md
- commands: deterministic builder, focused/related/full tests, typecheck, Vercel build, ProjectOps and credential boundary scan

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true

---

<!-- promoted_at: 2026-09-13T08:29:07.7036057+09:00 source: task-tone-v2-p05-wedding-day-corpus-rag-release-candidate_memory.md -->

# ProjectOps Memory Candidate

task_id: task-tone-v2-p05-wedding-day-corpus-rag-release-candidate
date: 2026-09-13
case_type: corpus-versioning
failure_type: candidate-date calculations mixed with invented partner, family, contract, condition and post-wedding facts
success_pattern: preserve the old corpus, compare only submitted dates, keep missing partner and time inputs unknown, and publish a reversible local candidate
problem: six migrated blocks mixed calculated date relations with invented venue constraints, family feelings, wedding-day condition, post-wedding rhythm and unsupported counts or periods
solution: rewrite every block around submitted candidate dates, server calculations and confirmed constraints, label hypothetical scenes, keep partner privacy and unknown-time limits explicit, and retain old snapshot retrieval by version and hash
root_cause: automated migration appended generic policy text without item-level date-input, privacy, reality, professional or numeric review
why_it_worked: executable assertions cover all six blocks plus active/stored retrieval, prompt construction, saved-prose review, hash mismatch and truthful release state; a related customer-prose test also caught a negated internal term
reuse_condition: a date-selection corpus changes while old reports must retain their original grounding
do_not_use_when: claiming marriage outcomes, favorable-date accuracy, partner or family states, or provider-output quality without evidence
related_files: data/tone-v2/corpus/releases/wedding-day-service-2.1.0.json; tests/unit/wedding-day-corpus-release.test.ts; tone-v2/releases/wedding-day-2.1.0.json
recommended_prompt: Compare only submitted candidate dates and server-calculated relations; use confirmed schedule and contract constraints, keep missing partner or time-dependent facts unknown, and make no marriage-outcome claim.
recommended_command: node --import tsx --test tests/unit/wedding-day-corpus-release.test.ts
revalidation_command: node tone-v2/build-wedding-day-corpus-release.mjs && npm test && npm run vercel-build
expires_at: revalidate when registry, snapshot schema, wedding_day service or date-selection policy changes
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: focused 8/8; related 232/232; full 863/863; typecheck/build PASS
- review: CreamAI/logs/review/task-tone-v2-p05-wedding-day-corpus-rag-release-candidate_closure-review.md
- commands: deterministic builder, focused/related/full tests, typecheck, Vercel build, ProjectOps and credential boundary scan

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true

---

<!-- promoted_at: 2026-09-13T08:45:39.8148280+09:00 source: task-tone-v2-p05-job-choice-corpus-rag-release-candidate_memory.md -->

# ProjectOps Memory Candidate

task_id: task-tone-v2-p05-job-choice-corpus-rag-release-candidate
date: 2026-09-13
case_type: corpus-versioning
failure_type: invented-offer-company-and-symbolic-career-outcome-boundary
success_pattern: distinguish confirmed offer documents and work facts from calculated values, unknown company reality, employer intent and symbolic comparison questions
problem: migration boilerplate and unlabeled scenes blurred user questions with invented role, organization, compensation, commute, contact, health and negotiation conditions
solution: version all 12 blocks with explicit document/calculation/user-fact/unknown-company/symbol layers, Ziwei-viewpoint disclaimers, professional boundaries and stored-snapshot isolation
root_cause: automated migration did not perform offer-document, company-reality, employer-intent, numeric, health, contract, labor and financial semantic review
why_it_worked: executable assertions cover every block plus active/stored retrieval, prompt generation, saved prose review and hash mismatch fail-closed behavior
reuse_condition: a career corpus compares offers, roles, compensation, company conditions or symbolic job-choice viewpoints
do_not_use_when: treating astrology as hiring evidence, inferring employer intent or hidden company facts, replacing contract review, or prescribing unsupported dates and counts
related_files: data/tone-v2/corpus/releases/job-choice-service-2.1.0.json; tests/unit/job-choice-corpus-release.test.ts; tone-v2/releases/job-choice-2.1.0.json
recommended_prompt: Separate confirmed offer documents and server calculations from unknown company reality and symbolic viewpoints; then prove stored snapshot isolation.
recommended_command: node --import tsx --test tests/unit/job-choice-corpus-release.test.ts
revalidation_command: node tone-v2/build-job-choice-corpus-release.mjs && npm test && npm run vercel-build
expires_at: revalidate when registry, snapshot schema or job_choice contract changes
privacy_level: internal
should_promote_to_rag: true

## Evidence

- tests: focused 8/8; related 217/217; full 871/871
- review: CreamAI/logs/review/task-tone-v2-p05-job-choice-corpus-rag-release-candidate_closure-review.md
- commands: deterministic builder, tests, typecheck, build, ProjectOps and credential scan

## Redaction Check

- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true

---

<!-- promoted_at: 2026-09-13T08:55:18.0515832+09:00 source: task-tone-v2-p05-love-this-year-corpus-rag-release-candidate_memory.md -->

# ProjectOps Memory Candidate

task_id: task-tone-v2-p05-love-this-year-corpus-rag-release-candidate
date: 2026-09-13
case_type: corpus-versioning
failure_type: invented-yearly-romance-event-partner-mind-and-contact-prescription-boundary
success_pattern: separate confirmed relationship facts and consent from calculated symbols, unknown partner reality and future outcomes while preserving route invariants
problem: migration boilerplate and unlabeled scenes blurred calculated year/month symbols with invented introductions, contact, schedules, feelings, relationship results and unsupported action counts
solution: version all 10 blocks with explicit fact/calculation/symbol/unknown-partner layers, privacy, consent, refusal and danger boundaries, stored-snapshot isolation and route-invariant assertions
root_cause: automated migration did not perform relationship-event, partner-mind, consent, privacy, safety, numeric and routing semantic review
why_it_worked: executable assertions cover every block, route invariants, active/stored retrieval, prompt generation, saved prose review and hash mismatch fail-closed behavior
reuse_condition: a relationship corpus discusses yearly timing, introductions, contact, another person's feelings, compatibility or next actions
do_not_use_when: converting astrology into event or mind evidence, overriding refusal, exposing partner birth data, encouraging contact under danger, or prescribing unsupported months and counts
related_files: data/tone-v2/corpus/releases/love-this-year-service-2.1.0.json; tests/unit/love-this-year-corpus-release.test.ts; tone-v2/releases/love-this-year-2.1.0.json
recommended_prompt: Separate confirmed relationship facts, consent and server calculations from symbolic questions, unknown partner reality and future outcomes; then prove snapshot and route invariants.
recommended_command: node --import tsx --test tests/unit/love-this-year-corpus-release.test.ts
revalidation_command: node tone-v2/build-love-this-year-corpus-release.mjs && npm test && npm run vercel-build
expires_at: revalidate when registry, snapshot schema, routes or love_this_year contract changes
privacy_level: internal
should_promote_to_rag: true

## Evidence

- tests: focused 9/9; related 238/238; full 880/880
- review: CreamAI/logs/review/task-tone-v2-p05-love-this-year-corpus-rag-release-candidate_closure-review.md
- commands: deterministic builder, tests, typecheck, build, ProjectOps and credential scan

## Redaction Check

- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true

---

<!-- promoted_at: 2026-09-13T09:06:16.1827634+09:00 source: task-tone-v2-p05-all-service-corpus-release-evaluation_memory.md -->

# ProjectOps Memory Candidate

task_id: task-tone-v2-p05-all-service-corpus-release-evaluation
date: 2026-09-13
case_type: release-readiness-audit
failure_type: incomplete-cross-service-evidence
success_pattern: deterministic-fail-closed-aggregate
problem: Individually reviewed service artifacts can appear release-ready even when provider output, full-outline human review and visual evidence are incomplete.
solution: Build one deterministic aggregate directly from the runtime service manifest, corpus registry, release manifests, semantic reviews, prompt/persona files and rollback sources; separate corpus-layer readiness from complete release readiness and emit explicit coverage counts plus blockers.
root_cause: Per-service candidate checks prove local corpus integrity but do not prove the complete cross-service release contract.
why_it_worked: File hashes and exact service-set equality make the audit reproducible, while explicit zero or partial evidence counts prevent deterministic tests from being relabeled as provider or visual evidence.
reuse_condition: Use when multiple separately reviewed versioned candidates must be evaluated for one release without changing Production.
do_not_use_when: Do not use the aggregate as a substitute for actual provider prose review, full-outline human review, browser/render/mobile/print QA or an approved Production rollback drill.
related_files: tone-v2/build-all-service-corpus-release-evaluation.mjs; tone-v2/releases/all-service-corpus-2.1.0.json; tests/unit/all-service-corpus-release-evaluation.test.ts
recommended_prompt: Audit every candidate from actual files, distinguish each evidence layer and fail the release gate closed when any mandatory layer is incomplete.
recommended_command: node tone-v2/build-all-service-corpus-release-evaluation.mjs
revalidation_command: npx tsx --test tests/unit/all-service-corpus-release-evaluation.test.ts
expires_at: 2027-09-13
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: focused 7/7; related 279/279; full 887/887 across 122 suites
- review: Approved with comments; Critical/Major/Minor 0
- commands: deterministic builder twice, repository tests, Vercel build and task-scoped credential scan

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true

---

<!-- promoted_at: 2026-09-13T10:06:30.1902936+09:00 source: task-tone-v2-p04-lucky-color-full-outline-evidence_memory.md -->

# ProjectOps Memory Candidate

task_id: task-tone-v2-p04-lucky-color-full-outline-evidence
date: 2026-09-13
case_type: provider-backed-full-outline-evidence
failure_type: validator-false-positive-and-latest-raw-recovery
success_pattern: immutable-source-plus-isolated-sequential-generation
problem: A full service outline needs real provider evidence without copying source examples, leaking provider prose, touching customers, or allowing a validator false positive to halt or falsely approve the sequence.
solution: Freeze exact source hashes and ordered headings, create a unique synthetic result in ignored isolated storage, generate strictly in order, replay each accepted section through the production review, retain every attempt, and publish only hashes and aggregate metrics.
root_cause: Generic Korean recognizers missed valid service-specific scenes/actions and recovery inspected only the final attempt even when an earlier failed attempt retained the usable raw response.
why_it_worked: Narrow regression examples expanded only proven vocabulary boundaries, and reverse-searching attempts selects the latest failed attempt with raw evidence while preserving fail-closed review.
reuse_condition: Use for the next service pilot when exact source files, isolated synthetic inputs, a unique version, production-equivalent replay, and immutable attempt history are available.
do_not_use_when: Do not treat deterministic replay or hash-only evidence as Production attachment, customer evaluation, visual QA, or permission to deploy.
related_files: scripts/check-lucky-color-outline-live.ts; tests/unit/lucky-color-outline.test.ts; src/report/tone-v2-review.ts; src/report/report-queue.ts; tone-v2/evaluations/P04-lucky-color-full-outline-generation-20260913.json
recommended_prompt: Generate one exact full outline in isolated synthetic storage, stop at the first unresolved item, preserve attempts, replay every accepted section, and record only sanitized provenance and hashes.
recommended_command: npx tsx scripts/check-lucky-color-outline-live.ts --version=<unique-version> --generate --fresh
revalidation_command: npx tsx --test tests/unit/lucky-color-outline.test.ts tests/unit/tone-v2-generation.test.ts tests/unit/report-persistence.test.ts
expires_at: 2027-09-13
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: focused 97/97; full 894/894 across 122 suites; typecheck and Vercel build PASS
- review: direct Codex review Approved with comments; Critical/Major/Minor 0
- commands: isolated provider generation, production-equivalent replay, release builders, repository tests and task-scoped credential scan

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true

---

<!-- promoted_at: 2026-09-13T11:32:30.4021422+09:00 source: task-tone-v2-p04-wedding-day-full-outline-evidence_memory.md -->

# Memory candidate — wedding_day full-outline evidence

task_id: task-tone-v2-p04-wedding-day-full-outline-evidence
reuse_condition: A specialized service has a supplied long-outline contract and provider outputs use concrete domain scenes or polite Korean action endings.
do_not_use_when: The source hashes or heading marker are absent, the record contains customer data, or Production mutation is requested.
should_promote_to_rag: true
revalidation_command: node --import tsx --test tests/unit/wedding-day-outline.test.ts tests/unit/tone-v2-generation.test.ts

Freeze only source hashes and headings, never supplied sample prose. Domain-specific observable scenes must be recognized narrowly with a paired negative test. Korean action morphology should include valid polite forms such as `적으세요` without accepting targetless advice. Preserve expired/interrupted generation attempts as separate evidence rather than deleting them or counting them as provider responses.

---

<!-- promoted_at: 2026-09-13T11:52:47.4196088+09:00 source: task-tone-v2-p04-wedding-day-visual-render-evidence_memory.md -->

# Memory candidate — actual saved-result visual QA

task_id: task-tone-v2-p04-wedding-day-visual-render-evidence
reuse_condition: A complete isolated report must be verified through the real saved-result HTML reader without exposing generated prose in tracked evidence.
do_not_use_when: The record is incomplete, contains customer data, requires Production access, or the UI cannot be served read-only.
should_promote_to_rag: true
revalidation_command: node --import tsx --test tests/unit/wedding-visual-contract.test.ts tests/unit/report-access-frontend.test.ts

Serve the immutable record from a local fail-closed endpoint, iterate every stable section identity at desktop and exact mobile viewport widths, then exercise real navigation rather than relying only on DOM assertions. Print every section and inspect both extracted structure and representative rendered pages. Keep screenshots and PDFs in ignored local storage; track only counts, findings and hashes. Recheck print after hiding fixed interactive controls because a screen-safe floating control can overlap prose on paper.

---

<!-- promoted_at: 2026-09-13T12:14:38.3737286+09:00 source: task-tone-v2-p04-newyear-flow-visual-render-evidence_memory.md -->

# Memory candidate — complete accordion reader print verification

task_id: task-tone-v2-p04-newyear-flow-visual-render-evidence
date: 2026-09-13
case_type: success_case
success_pattern: Verify an immutable complete report through the real reader at desktop and exact mobile widths, then expand closed disclosures only for print and restore their state afterward.
problem: Browser print styles cannot force a closed native details element to expose its body reliably, so a visually acceptable screen can still produce an incomplete document.
solution: Open only closed reader details in beforeprint, record them, hide fixed chrome in print CSS, and close only the recorded details in afterprint. Validate the PDF structurally and visually.
root_cause: Native closed disclosure rendering takes precedence over descendant display rules during print.
why_it_worked: The print lifecycle changes the actual disclosure state before layout while preserving the user's screen state after printing.
reuse_condition: A report uses native details elements and must print every section from an immutable isolated record.
do_not_use_when: Printing only the currently selected section is intentional, the record is incomplete, or the source contains customer data.
related_files: scripts/qa-newyear-live-reader.ts; 사주/js/umsh-report-access.js; 사주/css/umsh-verified-reader.css; tests/unit/newyear-visual-contract.test.ts
recommended_command: node --import tsx --test tests/unit/newyear-visual-contract.test.ts tests/unit/report-access-frontend.test.ts
revalidation_command: npm test; npm run typecheck; npm run vercel-build
privacy_level: internal
should_promote_to_rag: true

## Evidence

- desktop and exact 390px mobile: 36/36, zero overflow or missing-content failures
- print: 36 pages, zero blanks, 36 answers and 36 actions
- full regression: 910/910
- review: Approved with comments, Critical/Major/Minor 0 after path-containment fix

## Redaction Check

- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true
- provider_prose_removed: true

---

<!-- promoted_at: 2026-09-13T12:36:07.2720458+09:00 source: task-tone-v2-p04-lucky-color-visual-render-evidence_memory.md -->

# ProjectOps Memory Candidate

task_id: task-tone-v2-p04-lucky-color-visual-render-evidence
date: 2026-09-13
case_type: visual_acceptance
failure_type: missing_release_evidence
success_pattern: immutable actual-result reader plus desktop, exact-mobile and complete-print verification
problem: A complete generated report had no evidence that customers could read all sections on desktop, mobile and paper.
solution: Serve the exact isolated record through a loopback-only read-only fixture, inspect every native disclosure, verify exact 390px reflow and keyboard/navigation behavior, then structurally and visually inspect the complete print.
root_cause: Generation and semantic review do not prove presentation completeness.
why_it_worked: The fixture reused production rendering while path containment, exact service/count assertions and no mutation routes kept the evidence isolated and reproducible.
reuse_condition: A complete immutable synthetic result exists and its production reader can be served without external or customer access.
do_not_use_when: The source result is incomplete, belongs to a customer, requires Production access, or the renderer differs from the production reader.
related_files: scripts/qa-lucky-color-live-reader.ts; tone-v2/evaluations/P04-lucky-color-visual-render-evidence-20260913.json; 사주/js/umsh-report-access.js; 사주/css/umsh-verified-reader.css
recommended_prompt: Verify one immutable completed report through its real saved-result reader at desktop, exact 390px mobile and complete print, retaining only sanitized counts and hashes.
recommended_command: node --import tsx --test tests/unit/lucky-color-visual-contract.test.ts
revalidation_command: node --import tsx --test tests/unit/lucky-color-visual-contract.test.ts tests/unit/lucky-color-corpus-release.test.ts tests/unit/all-service-corpus-release-evaluation.test.ts
expires_at: 2027-09-13
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: focused 18/18; related 78/78; repository 913/913
- review: approved_with_comments; Critical/Major/Minor 0
- commands: typecheck PASS; vercel-build PASS; five deterministic release rebuilds PASS

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true

---

<!-- promoted_at: 2026-09-13T12:51:27.1163233+09:00 source: task-tone-v2-p04-quit-fortune-visual-render-evidence_memory.md -->

# ProjectOps Memory Candidate

task_id: task-tone-v2-p04-quit-fortune-visual-render-evidence
date: 2026-09-13
case_type: visual_acceptance
failure_type: missing_release_evidence
success_pattern: immutable actual-result reader plus exhaustive desktop, exact-mobile and complete-print verification
problem: A complete 48-section generated report had no release evidence that every section remained readable on customer surfaces.
solution: Serve the exact isolated record through a loopback-only read-only fixture, inspect every native disclosure on desktop and 390px mobile, verify keyboard and immutable navigation, and structurally plus visually inspect the complete print.
root_cause: Generation and semantic review prove prose and boundaries but not presentation completeness.
why_it_worked: Identity, path, service, status and count checks kept the fixture fail-closed while production rendering exposed the real responsive and print behavior.
reuse_condition: A complete immutable synthetic result exists and the production saved-result reader can render it without external services.
do_not_use_when: The source is incomplete, customer-owned, requires Production access, or the fixture would not use the production reader.
related_files: scripts/qa-quit-fortune-live-reader.ts; tone-v2/evaluations/P04-quit-fortune-visual-render-evidence-20260913.json; 사주/js/umsh-report-access.js; 사주/css/umsh-verified-reader.css
recommended_prompt: Verify one immutable completed report through its real reader at desktop, exact 390px mobile and complete print, retaining only sanitized counts and hashes.
recommended_command: node --import tsx --test tests/unit/quit-fortune-visual-contract.test.ts
revalidation_command: node --import tsx --test tests/unit/quit-fortune-visual-contract.test.ts tests/unit/quit-fortune-corpus-release.test.ts tests/unit/all-service-corpus-release-evaluation.test.ts
expires_at: 2027-09-13
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: focused 18/18; related 72/72; repository 916/916
- review: approved_with_comments; Critical/Major/Minor 0
- commands: typecheck PASS; vercel-build PASS; five deterministic release rebuilds PASS

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true

---

<!-- promoted_at: 2026-09-13T14:56:13.7560104+09:00 source: task-tone-v2-p04-pass-angle-visual-render-evidence_memory.md -->

# ProjectOps Memory Candidate

task_id: task-tone-v2-p04-pass-angle-visual-render-evidence
date: 2026-09-13
case_type: visual_acceptance
failure_type: missing_release_evidence
success_pattern: immutable real-reader verification with measured targets and exhaustive print review
problem: A complete 52-section generated Pass Angle report lacked proof that every section remained readable and operable on customer surfaces.
solution: Serve the exact isolated record through a loopback-only read-only fixture, inspect desktop and exact 390px mobile, measure rendered controls, exercise direct and keyboard navigation, and inspect every complete-print page.
root_cause: Generation and semantic review prove content boundaries but not responsive, interaction or print presentation.
why_it_worked: Fail-closed source identity checks and the production reader exposed two real shared-reader defects before sanitized evidence attachment.
reuse_condition: A complete immutable synthetic record exists and the real saved-result reader can render it without Production services.
do_not_use_when: The source is incomplete, customer-owned, requires Production access, or the fixture substitutes a mock reader.
related_files: scripts/qa-pass-angle-live-reader.ts; scripts/verify-pass-angle-print.py; tone-v2/evaluations/P04-pass-angle-visual-render-evidence-20260913.json; 사주/css/umsh-verified-reader.css
recommended_prompt: Verify one immutable complete report through its real reader at desktop, exact 390px mobile and complete print, retaining only sanitized counts and hashes.
recommended_command: npx tsx --test tests/unit/pass-angle-visual-contract.test.ts
revalidation_command: npx tsx --test tests/unit/pass-angle-visual-contract.test.ts tests/unit/pass-angle-corpus-release.test.ts tests/unit/all-service-corpus-release-evaluation.test.ts
expires_at: 2027-09-13
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: focused 19/19; repository 934/934
- review: approved after fixes; Critical/Major/Minor 0
- commands: typecheck PASS; vercel-build PASS; deterministic release rebuild PASS

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true

---

<!-- promoted_at: 2026-09-13T15:37:13.4843439+09:00 source: task-tone-v2-p04-today-fortune-full-outline-evidence_memory.md -->

# ProjectOps Memory Candidate

task_id: task-tone-v2-p04-today-fortune-full-outline-evidence
date: 2026-09-13
case_type: deterministic_output_acceptance
failure_type: persona_contract_drift_and_impossible_provider_metric
success_pattern: real isolated saved-output verification with exhaustive deterministic branch coverage
problem: Today Fortune had no full-output evidence, its deterministic copy violated the final no-address informal persona, and the aggregate provider metric required storing provider prose while privacy rules prohibited it.
solution: Save and recall one synthetic daily result through the real persistence path, review all seven fields, exercise all five relations and twelve zodiac branches, fix only the customer copy, and count provider evidence by actual calls plus approved review over the 19 provider-backed services.
root_cause: Prompt persona checks were not applied to rules-based templates, and the aggregate conflated proof of provider use with retention of provider prose.
why_it_worked: Executable tone checks exposed every deterministic copy drift while immutable hashes and independent review preserved privacy without erasing provenance.
reuse_condition: A service is rules-based or has sanitized provider provenance and a complete output can be exercised in isolated storage.
do_not_use_when: The evaluator uses customer data, bypasses the real persistence path, or labels a provider-backed service deterministic merely to avoid generation.
related_files: src/saju/today-fortune.ts; scripts/evaluate-today-fortune-full-outline.ts; tone-v2/build-all-service-corpus-release-evaluation.mjs; tone-v2/evaluations/P04-today-fortune-full-outline-evidence-20260913.json
recommended_prompt: Verify the real output architecture first; do not add a model call to a deterministic service or require raw provider prose as proof.
recommended_command: npx tsx scripts/evaluate-today-fortune-full-outline.ts
revalidation_command: npx tsx --test tests/unit/today-fortune.test.ts tests/unit/today-fortune-full-outline-evidence.test.ts tests/unit/all-service-corpus-release-evaluation.test.ts
expires_at: 2027-09-13
privacy_level: internal
should_promote_to_rag: true

## Evidence
- tests: focused 22/22; related 176/176; repository 936/936
- review: approved after three fixes; Critical/Major/Minor 0
- commands: typecheck PASS; vercel-build PASS; deterministic release rebuild PASS

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true
