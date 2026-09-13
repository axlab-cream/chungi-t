# Recovering a saved failed generated section without another provider call

- Parse saved raw output with the same parser used by live generation, then run the complete production review with stored birth, context, analysis, and completed siblings.
- Recover only a `failed` section whose latest attempt is also failed and has raw output; require every predecessor to be complete and reject active or malformed leases.
- Use the existing compare-and-swap record mutation so concurrent recoveries produce exactly one revision.
- Preserve the entire attempt array, raw hashes, IDs, stored inputs, completed predecessors, and all later sections. Copy only the validated hook/body and attempt metadata into the section status projection.
- Repeated recovery of an already complete section is a no-op. Missing/malformed/wrong-ID/rejected raw and pending sections fail closed.
- Disable provider configuration in the recovery harness and prove later-attempt count remains zero.
