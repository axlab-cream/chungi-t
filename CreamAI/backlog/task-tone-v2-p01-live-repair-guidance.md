# task-tone-v2-p01-live-repair-guidance

- status: DONE
- user outcome: 검수 실패 후 재시도가 한자 설명 분리와 읽기 쉬운 문단 구조를 실제로 교정한다.
- source rules: ZIP-003-066, ZIP-003-068, ZIP-003-094
- root cause hypothesis: 여러 품질 사유를 한 줄로 이어 붙인 현재 재시도 메시지는 수정 우선순위와 정확한 출력 형태가 없어 복잡한 사주 항목에서 같은 위반을 반복한다.
- data source: synthetic-only isolated generation; no production customer data
- scope: retry guidance, deterministic test, representative live rerun
- out of scope: retry count/model change, gate relaxation, all 20 services, UI, DB, deployment
- evidence: `tone-v2/evaluations/P01-live-repair-guidance-20260912.json`
- verification: focused RED/GREEN, representative live outputs, full regression, typecheck, Vercel build, diff check
- result: 실제 최종 재시도에서 전문용어 형식·문장당 한자 설명·문단 문장 수가 각각 3/3 PASS했다. 전체 항목 완료는 별도 다음 판단 기준 게이트 때문에 2/3이며 이를 성공으로 과장하지 않는다.
- reviewer disposition: Critical 0. 사용자 수동 재시도의 첫 호출에 안내가 빠지는 Major는 최신 실패 사유를 seed하도록 수정하고 회귀 테스트를 추가했다. 기존 paid-density 길이 하한 지적은 현재 slice 이전 코드이며 이번 변경 범위 밖이다.
- final verification: focused 55/55, compiler/task 7/7, full regression 670/670, raw+prose hashes 12/12, typecheck, Vercel build PASS
- knowledge: CreamWIKI `personal/carrotcap/notes/umsh-tone-v2-live-repair-guidance-20260912.md` put/get/search PASS
- harness note: implementation mode's broad `sk-...` pattern misread `task-tone...` filenames as secrets, while the task-file token scan found no actual credential. test mode runs inside `CreamAI` and therefore warned that its local package has no test script; repository `npm test` 670/670 is the executable result.
