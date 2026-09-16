# ProjectOps Approved Memory — Pass Angle corpus-bound full-outline generation

- Always bind provider evidence to the exact stored corpus path, semantic version, full SHA-256 and content hash before the first call.
- A completed result from an older corpus is historical evidence, not proof for a new candidate.
- Preserve every rejected attempt. Repair deterministic Korean recognizers only with bounded positive and negative fixtures; never weaken a safety gate merely to finish generation.
- Stop at the first unresolved section, and replay every accepted section against the record's stored snapshot after completion.
- Read the complete accepted outline directly before release attachment; record editorial observations separately from release-blocking findings.
- Release builders should fail closed on service, corpus hash, exact section count, replay result, privacy flags and independent review approval.
- Track only hashes, counts and findings. Keep provider prose, secrets and personal data in ignored isolated storage.
