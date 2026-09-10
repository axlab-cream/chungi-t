# ProjectOps Memory Candidate

task_id: task-018
date: 2026-09-10
case_type: failure (재발) + success (복구)
failure_type: requirement_miss
success_pattern: quality_gate
problem: |
  "이 Vercel 프로젝트는 Git 연동이 없다(U14)"고 확정하고, 그 전제로 사고 원인 분석·
  README 정정·전환 제안서를 모두 작성했다. **전제가 틀렸다.** 연동은 존재했고,
  `main` push는 즉시 Production 배포를 만들었다.

  근거로 삼은 두 관측은 이것이었다.
  1. `vercel project inspect` 출력에 Git 섹션이 없다
  2. Production 배포 3건에 git 메타데이터가 없다

  둘 다 **연동 여부를 판정할 수 없는 신호**였다. Codex가 T02 리뷰에서 2번을 정확히
  지적("메타데이터 부재는 CLI 배포의 증거가 아니다")해서 한 번 가설로 낮췄는데,
  다음 Task에서 다시 단정으로 올렸다. **하향한 판단이 재상승했다.**
solution: |
  **설정 상태는 부재 관측으로 판정하지 않는다. 행위로 검증한다.**

  - 틀린 검사: `vercel project inspect`에 Git 섹션이 있는지 본다
  - 맞는 검사: **`main`에 push해서 Production 배포가 자동으로 생기는지 본다**
  - 확정 명령: `vercel git connect <repo> --yes --scope <scope>`
    → 이미 연결되어 있으면 `already connected to your project`를 반환한다
    (연결을 새로 만들지 않고 상태를 알려주므로 사실상 조회 수단이 된다.
     `vercel git ls`는 존재하지 않는다)

  그리고 **정정할 때 반대 방향으로 과잉 주장하지 않는다.** 이 Task에서 실제로 그 실수를
  했다: "Git 연동은 처음부터 있었다", "그 3건은 실제로 CLI 배포였다"고 적었는데,
  증거는 **관측 시점의** 연결 상태와 라우팅만 증명한다. Codex가 다시 잡아냈다.
  → 문장에 **시점을 박는다**: "2026-09-10 16:25 시점에 연동이 존재한다."
root_cause: |
  부재 증명(proving a negative)을 도구 출력의 침묵으로 대체했다.
  CLI는 자기가 모르는/표시하지 않는 것을 "없다"고 말해주지 않는다.
  그리고 한 번 하향한 판단을 다음 Task에서 재검증 없이 복원했다 —
  세션이 길어지면 "이미 확정된 사실" 목록이 근거와 분리되어 스스로 굳는다.
why_it_worked: |
  D1~D6을 순서대로 실행하면서 각 단계의 **실제 출력**을 근거로 남겼기 때문에
  D4에서 전제가 무너진 순간 즉시 감지됐다. 만약 D4를 "승인 대기"로 남겨두고
  제안서만 제출했다면 틀린 전제가 문서에 그대로 남았다.
  → **제안서로 끝내지 말고 실행해서 전제를 깨보는 것**이 검증이다.
reuse_condition: |
  외부 SaaS(Vercel/Supabase/GitHub 등)의 설정 상태를 판정할 때.
  특히 "연동/기능이 없다"는 결론을 문서나 후속 Task의 전제로 쓰려 할 때.
do_not_use_when: |
  행위 검증이 부작용을 남기는 경우(예: 배포가 실제 트래픽을 받는 환경).
  그때는 Preview/브랜치 push처럼 되돌릴 수 있는 경로로 검증한다.
  이 Task에서는 `main` push 자체가 의도된 복구 배포였기 때문에 안전했다.
related_files:
  - docs/admin-ops/TASK-018-deploy-path.md
  - docs/admin-ops/production-state-20260910-1511.md
  - scripts/check-production-source.mjs
  - CreamAI/logs/review/task-018_deploy-path-correction.md
recommended_prompt: |
  "설정 상태를 '없다'고 결론하기 전에, 그 결론을 깨뜨릴 행위 검증을 먼저 실행하라.
   도구 출력에 섹션이 없다는 것은 부재의 단독 증거가 아니다.
   그리고 부재 주장을 뒤집을 때 반대 방향으로 과잉 주장하지 말고 문장에 관측 시점을 박아라."
recommended_command: |
  # Vercel Git 연동 상태 (조회 전용 서브커맨드가 없으므로 connect 로 상태를 확인)
  vercel git connect <repo-url> --yes --scope <scope>
  # → "already connected to your project" 면 연동 존재

  # 행위 검증 — 이것이 유효한 검사다
  git push origin HEAD:main
  vercel ls --scope <scope>          # Production/Preview 배포가 자동 생성되는지
  vercel inspect <url> --scope <scope>
  # Aliases 에 <project>-git-<branch>-<scope>.vercel.app 가 있으면 연동 배포의 단서
  # (단독 판정자로 쓰지 않는다 — target/메타데이터/생성시각/push 기록을 함께 대조)
revalidation_command: |
  git push origin HEAD:main && vercel ls --scope ax-lab-cream
  → Production 배포가 자동 생성되면 연동 유효.
expires_at: 2026-12-31
privacy_level: internal
should_promote_to_rag: true

## 파생 지식 1 — 배포 게이트의 실제 사정거리

`scripts/check-production-source.mjs`는 스스로 한계를 출력한다.

```
Manual preflight only: this command does not intercept other deploys or verify a
remote deployment artifact.
```

즉 **`vercel deploy --prod`를 막지 못하고 원격 배포 산출물도 검사하지 않는다.**
"CLI 배포 금지"는 기술적 통제가 아니라 **운영 절차 규칙**이다.
문서에 규칙을 쓸 때 **강제 수단이 있는지 없는지를 같이 적는다.** 없으면 "없다"고 적는다.
그렇지 않으면 읽는 사람이 자동으로 막힌다고 오해한다.

## 파생 지식 2 — Git 연동이 있어도 소스가 갈라진다

연동이 있어도 `vercel deploy --prod`는 Git 상태와 무관하게 로컬 작업 트리를 올린다.
따라서 **"연동이 있다"가 "운영 소스 = main"을 보장하지 않는다.**
2026-09-10에 서로 다른 두 로컬 소스가 각각 운영에 올라가 공개 SEO·FAQ·about이 404가 됐다.

운영 소스를 확인할 때 단일 신호를 쓰지 않는다.
배포 target + git 메타데이터 + alias + 생성 시각을 **저장소 push 기록과 함께** 대조한다.

## 복구 결과 (성공 사례)

`main`을 병합본(`0556e49`)으로 fast-forward → 자동 배포 → `umsh.kr` 이동.

| 검증 | 결과 |
| --- | --- |
| `/robots.txt` `/sitemap.xml` `/about` `/faq` `/my` | 404 → **전부 200** |
| `/.well-known/assetlinks.json` | **200** (반대편 개선 유지) |
| `GET /api/services` | 14종 → **15종, `home_pungsu` 포함** |
| `GET /api/payment/config` | 환경변수 이름 노출 **0건**, catalog 19종 |

→ **한쪽 회귀를 복구하면서 다른 쪽 개선을 유지했다.** 두 소스가 갈라진 상태를
"어느 한쪽 선택"이 아니라 **병합**으로 풀었기 때문에 가능했다(TASK-009).

## Evidence
- push: `dac3835..0556e49` (브랜치), `f825d26..0556e49` fast-forward (main)
- 분기: `git rev-list --left-right --count origin/main...HEAD` → `0  0`
- 연동 배포: `dpl_42CkhxK2KC4CAKbPEwMQVQDAVXs1` Ready 46s,
  alias `chungi-t-git-main-ax-lab-cream.vercel.app`
- Codex 리뷰: Critical 0 / Major 5 / Minor 3 — **5건 전부 반영해 하향**
  (`CreamAI/logs/review/task-018_deploy-path-correction.md`)
- typecheck 오류 0

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true
