# Review Report - task-018

## 1. Scope

- Task id: task-018
- Reviewed files: `README.md`; `docs/admin-ops/TASK-018-deploy-path.md`; `docs/admin-ops/production-source-of-truth.md`; `docs/admin-ops/production-state-20260910-1511.md`; `docs/admin-ops/T04-regression-baseline.md`; `CreamAI/backlog/task-018.md`; `plan.md`; `status.md`; `tests.md`; relevant guard script and tests.
- Review time: 2026-09-10T07:29:39Z

## 2. Verdict

- Changes requested
- Summary: The current Git integration and observed push routing are well supported. However, several documents repeat the same unsupported reverse inference: present-day connection/push behavior and absent deployment metadata do not prove that Git integration existed during earlier deployments, nor that those deployments were CLI deployments. The CLI-preflight rule is also documented as stronger than its actual technical enforcement.

## 3. Critical Issues

- None.

## 4. Major Issues

- [README.md:75-80; docs/admin-ops/TASK-018-deploy-path.md:25, 34, 44-46, 76-78, 175-177; production-source-of-truth.md:44-50; production-state-20260910-1511.md:23-32; CreamAI/backlog/task-018.md:15, 20, 44] Issue: The documents state “Git 연동은 처음부터 있었다” and that the earlier metadata-free deployments “실제로 CLI 배포였다.”
- Risk: `vercel git connect` proves the project was connected at the time of that command; observed pushes prove routing at that time. Neither establishes historical configuration state. Likewise, missing Git metadata is compatible with CLI deployment but does not identify the deployment method.
- Recommendation: Replace with: “2026-09-10 16:25 시점에 Git 연동이 존재했고, 관측한 `main`/브랜치 push는 각각 Production/Preview 배포를 만들었다. 이전 배포 당시의 연동 상태와 배포 경로는 현재 증거만으로 확정할 수 없다. git 메타데이터 부재는 CLI 배포와 양립하지만 단독 증거는 아니다.”

- [README.md:113-115; docs/admin-ops/TASK-018-deploy-path.md:175-177; backlog/task-018.md:99-107; plan.md:173-175; production-state-20260910-1511.md:115-117] Issue: “git 메타데이터가 있으면 `main` push,” “없으면 CLI,” and `chungi-t-git-<branch>-<scope>` alias as a universal Git-deployment identifier are asserted from one observed deployment.
- Risk: Metadata and generated aliases are deployment evidence to inspect, not a documented exclusive classifier. This recreates the same single-signal error being corrected.
- Recommendation: Use: “배포 target, Git 관련 메타데이터, alias, 생성 시각 및 push 기록을 함께 대조한다. 이 프로젝트에서 관측한 `dpl_42…`는 해당 alias를 가졌지만, alias 형식이나 메타데이터 유무만으로 모든 배포 경로를 판정하지 않는다.”

- [docs/admin-ops/TASK-018-deploy-path.md:172; plan.md:171-172; status.md:428; CreamAI/backlog/task-018.md:48] Issue: “Production Branch = `main` 확인” is written as a configured-setting confirmation despite no Vercel settings inspection.
- Risk: The observation proves tested routing behavior, not the persistent dashboard setting or all future routing conditions.
- Recommendation: Replace with: “관측한 `main` push는 Production 배포를, 관측한 브랜치 push는 Preview 배포를 만들었다. Production Branch 설정값 자체는 대시보드/API로 별도 확인하지 않았다.”

- [README.md:79-80, 102-105; docs/admin-ops/TASK-018-deploy-path.md:48-50, 193-197; CreamAI/backlog/task-018.md:91-92; docs/admin-ops/T04-regression-baseline.md:262-265] Issue: The rule says CLI production deployment is prohibited/prevented by the gate, but the actual guard explicitly states it is “Manual preflight only” and “does not intercept other deploys” (`scripts/check-production-source.mjs:5, 55-59`).
- Risk: A user can invoke `vercel deploy --prod` without ever running the gate. The README’s emergency CLI exception further conflicts with “`main` push로만 배포한다.”
- Recommendation: State explicitly: “`check:production-source`는 수동 push 전 점검일 뿐 `vercel deploy --prod`를 기술적으로 차단하거나 원격 산출물을 검증하지 않는다. CLI 금지는 운영 절차 규칙이며, 현재 자동 강제 수단은 없다.” Also describe the emergency exception as an exception requiring documented approval, rather than “one path only.”

- [docs/admin-ops/T04-regression-baseline.md:262-265] Issue: “과거 배포는 이 검사의 대상이 아니었다” exceeds the evidence.
- Risk: Current Git-triggered deployment behavior does not establish whether earlier deployments were CLI, whether a person ran the preflight, or whether another workflow invoked it.
- Recommendation: Replace with: “관측한 Git-triggered Vercel build가 이 로컬 명령을 자동 실행한다는 증거는 없다. 과거 배포가 이 검사를 실행했는지는 여전히 미확인이다.”

## 5. Minor Issues

- [README.md:68, 79-80] Issue: “배포 경로가 두 개 있습니다. 하나만 쓰세요” conflicts with “급하게 필요할 때만 [CLI를] 쓰고.”
- Risk: Operators may interpret the exception as routine discretion.
- Recommendation: Say: “기본 경로는 `main` push다. CLI Production 배포는 승인된 긴급 복구 예외로만 허용한다.”

- [CreamAI/backlog/task-018.md:103-107] Issue: The reusable rule says settings “행위로 검증한다” without a scope limit.
- Risk: Behavior proves an observed effect at a point in time, but may be produced by cached state, indirect automation, or a different configuration. It cannot prove historical state.
- Recommendation: Use: “도구 출력의 섹션 부재는 부재의 단독 증거가 아니다. 설정 상태는 해당 속성에 맞는 긍정 증거와 행위 관측을 함께 사용하며, 행위 관측은 관측 시점의 효과만 증명한다.”

- [docs/admin-ops/TASK-018-deploy-path.md:154; CreamAI/backlog/task-018.md:92] Issue: “오늘 사고는 `check:production-source`를 건너뛴 결과다” is not supported by the listed evidence.
- Risk: It assigns operational cause without a command log or CI record.
- Recommendation: Replace with: “해당 배포에서 preflight 실행 여부는 기록으로 확인되지 않았다. 다만 이 검사는 CLI 배포를 자동 차단하지 않는다.”

## 6. Verification Gaps

- Gap: Repository evidence contains the preflight harness only; it does not preserve sanitized command/deployment output for claims 1–8.
- Suggested check: Retain sanitized evidence for push SHA ranges, deployment ID/target/timestamp, alias list, and endpoint checks, without treating them as proof of earlier deployment method.

- Gap: Production Branch dashboard/API setting was not inspected.
- Suggested check: Record the setting separately if the claim must be “Production Branch = main”; otherwise retain the narrower observed-routing wording.

- Gap: No evidence establishes exclusive alias/metadata classification across CLI and Git deployment paths.
- Suggested check: Keep the observed alias as deployment-specific evidence only.

- OK: Given the supplied observations, the documents accurately record the successful pushes, `origin/main...HEAD = 0 0`, Ready deployment `dpl_42CkhxK2KC4CAKbPEwMQVQDAVXs1`, production endpoint recovery, 15 services including `home_pungsu`, payment-key-name non-exposure, catalog 19, and the `/privacy` marker.

- OK: `tests.md:51` properly invalidates V-069; this directly addresses the prior invalid CLI-output inference.

## 7. Final Recommendation

- Next action: Revise the historical-state, metadata/alias-classification, Production Branch, and manual-gate claims above before accepting task-018 documentation as complete.