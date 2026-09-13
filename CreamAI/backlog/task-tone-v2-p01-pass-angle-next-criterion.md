# task-tone-v2-p01-pass-angle-next-criterion

- status: DONE
- user outcome: `pass_angle`의 구체적인 다음 행동이 실제로 있는데도 누락으로 거부되지 않는다.
- source rules: ZIP common §4, `tone-v2/source/프롬프트/pass_angle.md` §12 instruction
- root cause hypothesis: next-criterion recognizer accepts 유지·비교·확인 계열만 보고 짧은 반말 행동인 `루틴을 세워봐/고정해`를 놓친다.
- acceptance: concrete future cue + target + action passes; `다음에는 잘해봐` remains rejected; other gates unchanged.
- data source: synthetic-only isolated generation; no production customer data
- out of scope: model/retry change, gate removal, all services, UI, DB, auth, payment, deployment
- plan: `docs/superpowers/plans/2026-09-12-tone-v2-pass-angle-next-criterion.md`
- review: Critical 0, Major 2 and Minor 2 accepted. Unsafe discard/quit verbs were removed, source-native 정해/매겨 fixtures were added, unknown service filters fail closed, and attempt parsing is tolerant.
- result: 이전 저장 원문 재평가에서 density 4요소 전체 PASS. 신규 실제 출력 두 번째 시도에서 nextCriterion PASS; 전체 항목은 별도 grounding 판별 실패로 미완료.
- verification: RED reproduced the omitted source-native verbs; focused 56/56, compiler/task 7/7, full regression 671/671, evidence hashes 6/6, typecheck, Vercel build, diff check PASS.
- knowledge: CreamWIKI `personal/carrotcap/notes/umsh-tone-v2-pass-angle-next-criterion-20260912.md` put/get/search PASS.
- harness note: ProjectOps implementation mode's broad `sk-...` pattern misread `task-tone...` filenames as secrets; a boundary-aware scan of this Task's files found no actual credential. test mode runs inside `CreamAI` and warned that its local package has no test script; repository `npm test` 671/671 is the executable result.
