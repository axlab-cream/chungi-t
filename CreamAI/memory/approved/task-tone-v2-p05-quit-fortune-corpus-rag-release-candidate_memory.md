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
