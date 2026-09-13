# Tone V2 comparative nextCriterion diagnosis plan

## Goal

저장된 `pass-angle-support-vs-drag` 두 번째 응답을 새 provider 호출 없이 재평가하여, `nextCriterion` 실패가 출력 결함인지 판별기 경계 결함인지 증거로 구분한다.

## Constraints

- Read only the ignored isolated record; do not mutate or migrate it.
- Do not copy raw prose into tracked evidence. Record only bounded structural excerpts or hashes when necessary.
- Do not change recognizer, gate, prompt, model, retry count, or any Production surface.
- If an implementation change is justified, create a separate inactive Task rather than changing code here.

## Diagnostic steps

- [x] Verify the saved attempt identity/hash and replay the existing full review.
- [x] Extract sentence boundaries and trace every nextCriterion subcondition: temporal/order marker, concrete target, safe action, negation/past/abandonment guards, same/adjacent sentence window.
- [x] Compare the stored wording against existing positive and negative fixtures and CreamWIKI rules.
- [x] Classify the root cause as output defect, recognizer defect, or insufficient evidence.
- [x] Define positive/negative counterexamples and the smallest follow-up Task, if needed.
- [x] Run no-mutation/hash verification and task-relevant tests.
- [x] Complete independent review, ProjectOps evidence, and CreamWIKI writeback.
