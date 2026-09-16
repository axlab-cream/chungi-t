# task-tone-v2-p01-adjacent-next-criterion

- status: DONE
- user outcome: 실제 `pass_angle` 출력에서 시간·유지 기준 문장 바로 다음의 구체적 기록 행동을 nextCriterion으로 인식한다.
- root cause: 기존 판별은 시간/순서 표지와 행동을 같은 문장 안에서만 요구해 인접 문장 구조를 놓친다.
- acceptance: fresh attempt 2 원문 nextCriterion PASS; directAnswer/grounding/scene 유지; vague encouragement, targetless action, past report, abandonment remain FAIL.
- source rules: ZIP-003-041; `tone-v2/evaluations/P01-pass-angle-e2e-rerun-20260912.json`
- out of scope: attempt 1 paragraph rule, prompt/provider/model/retry, new provider call, UI, DB, auth, payment, commit, deploy, Production
- plan: `docs/superpowers/plans/2026-09-12-tone-v2-adjacent-next-criterion.md`
- evidence: `tone-v2/evaluations/P01-adjacent-next-criterion-20260912.json`; focused 33/33; related 60/60; compiler/task 7/7; full 675/675; typecheck/build/diff PASS.
- review: Approved; Critical 0 / Major 0 / Minor 0 (`CreamAI/logs/review/task-tone-v2-p01-adjacent-next-criterion_approval-review.md`).
- knowledge: CreamWIKI `personal/carrotcap/notes/umsh-tone-v2-adjacent-next-criterion-20260912.md` put/get/search PASS; server reindex NOT_RUN because the client workflow exposes no reindex command.
