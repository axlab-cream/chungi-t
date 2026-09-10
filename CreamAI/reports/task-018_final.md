# 결론

배포 경로를 정상화했고, **그 과정에서 내 U14 판단이 틀렸음을 확인해 정정했다.**

- `main`을 병합본 `0556e49`로 fast-forward했고, 그 push가 **자동 Production 배포**를 만들었다.
- 그 배포로 09-10 15:11 회귀가 **복구**됐다 — 공개 SEO·FAQ·about이 404에서 200으로,
  서비스 목록이 14종에서 15종(`home_pungsu` 포함)으로 돌아왔다.
  반대편 개선(Android App Links, 결제 문구 환경변수 노출 해소)은 그대로 유지된다.
- **U14("Vercel Git 연동이 없다")는 틀렸다.** 16:25 시점에 연동이 존재하고 자동 배포가 동작한다.
  진짜 문제는 **`vercel deploy --prod`가 연동 배포를 우회한다**는 것이다.

# 근거

## 실행 결과 (D1~D6)

| 단계 | 결과 |
| --- | --- |
| D1 `git push origin fix/umsh-qa-ux` | `dac3835..0556e49` (exit 0) |
| D2 `git push origin HEAD:main` | `f825d26..0556e49` **fast-forward** (exit 0) |
| D3 분기 확인 | `origin/main...HEAD` = `0  0`, `merge-base --is-ancestor` 성공 |
| D4 `vercel git connect --yes` | **`already connected to your project`** ← U14 정정의 근거 |
| D5 라우팅 관측 | 관측한 `main` push→Production, 브랜치 push→Preview. **설정값 자체는 미확인** |
| D6 연동 배포 검증 | `dpl_42CkhxK2KC4CAKbPEwMQVQDAVXs1` Ready 46s, alias `chungi-t-git-main-ax-lab-cream.vercel.app`, `umsh.kr` 이동 |

## 운영 실측 (배포 후)

| 검증 | 결과 |
| --- | --- |
| `/robots.txt` `/sitemap.xml` `/about` `/faq` `/my` | **전부 200** (404에서 복구) |
| `/.well-known/assetlinks.json` | **200** (반대편 개선 유지) |
| `GET /api/services` | **15종, `home_pungsu` 포함** (14종에서 복구) |
| `GET /api/payment/config` | 환경변수 이름 노출 **0건**, catalog 19종, 문구 정상 |
| `/privacy` 마커 | `UMSH 운명상회` / `v=20260909-logo` |

## 회귀 기준

`npm run typecheck` 오류 0 · `npm test` **417/417** · MANIFEST SHA-256 ALL OK (21 files)

# 리스크

1. **CLI 배포 금지에 자동 강제 수단이 없다.** `check:production-source`가 스스로
   "Manual preflight only … does not intercept other deploys or verify a remote deployment
   artifact"라고 밝힌다(`scripts/check-production-source.mjs:5`).
   누구든 `vercel deploy --prod`로 게이트를 통과하지 않고 운영을 덮을 수 있다.
   → 이것은 **기술적 통제가 아니라 운영 절차 규칙**이며, 문서에 그 한계를 명시했다.
2. **미확정으로 남은 것들** (Codex 리뷰 Major 반영):
   - 이전 배포 3건 당시의 연동 상태
   - 그 3건의 배포 경로 (메타데이터 부재는 CLI 배포와 양립하나 단독 증거 아님)
   - Production Branch 설정값 (대시보드/API 미확인 — 관측된 라우팅만 근거)
   - alias 형식이 모든 연동 배포에 붙는지 (관측 1건)
   - 15:11 배포에서 preflight 실행 여부 (명령·CI 기록 없음)
3. **문서 갱신이 게이트를 다시 dirty로 만든다.** 이번에도 그랬다.
   배포 직전에 문서를 커밋하고 게이트를 재실행하는 순서를 유지해야 한다(task-008 지식).
4. GitHub Actions에 `vercel deploy`를 넣으면 push 1회에 배포 2회 → TASK-005 범위 제약.

# 다음 행동

1. 이 문서 갱신분을 커밋하고 `check:production-source`를 재실행해 PASS 확인.
2. `main`에 push (docs-only). 자동 배포가 한 번 더 돌지만 콘텐츠 영향은 없다.
3. 다음 Task 후보: **TASK-011**(브랜드 표기 `UMSH 운명상회` vs `운명상회` 통일),
   **TASK-013**(origin/main의 결혼택일 RAG 렌더링 이식 + 삭제된 테스트 3건 대체),
   **TASK-005**(GitHub Actions CI 전용 — 배포 단계 없음).
   admin-ops M1(T05~T13)은 여전히 U2/U3/U4/U17/U24에 막혀 있다.

# 인사이트

**부재를 도구 출력의 침묵으로 증명하려 했다.** CLI는 자기가 표시하지 않는 것을
"없다"고 말해주지 않는다. `vercel project inspect`에 Git 섹션이 없는 것은 연동 부재의
증거가 아니었고, git 메타데이터 부재도 아니었다.

더 나쁜 것은 **한 번 하향한 판단이 재상승했다는 점**이다. Codex가 T02 리뷰에서
"메타데이터 부재는 CLI 배포의 증거가 아니다"라고 정확히 지적해 가설로 낮췄는데,
다음 Task에서 근거를 다시 확인하지 않고 단정으로 복원했다. 세션이 길어지면
"확정된 사실" 목록이 근거와 분리되어 스스로 굳는다.

그리고 **정정하면서 반대 방향으로 또 과잉 주장했다.** "Git 연동은 처음부터 있었다",
"그 3건은 실제로 CLI 배포였다" — 증거는 관측 시점의 상태만 증명한다.
Codex가 이것도 잡아냈다(Major 1). 부재 주장을 뒤집을 때는 문장에 **시점을 박는다**.

한편 이번 정정이 가능했던 이유는 **제안서로 끝내지 않고 D4를 실제로 실행했기 때문**이다.
승인 대기로 남겨뒀다면 틀린 전제가 문서에 그대로 남았다.
**설정 상태는 부재 관측이 아니라 행위로 검증한다** — push해서 배포가 도는지 본다.

## ProjectOps 기록
- task_id: task-018
- tests: `npm run typecheck` 0 오류 / `npm test` 417 pass 0 fail / `check:production-source` (커밋 후 재실행 예정)
- review: `CreamAI/logs/review/task-018_deploy-path-correction.md` — Critical 0 / Major 5 / Minor 3, **Major 5건 전부 반영해 하향**
- memory_candidate: `CreamAI/memory/candidates/task-018_memory.md`
- reusable_rule: 도구 출력의 섹션 부재는 기능 부재의 단독 증거가 아니다. 설정 상태는 긍정 증거와 행위 관측을 함께 써서 판정하고, 행위 관측은 **관측 시점의 효과만** 증명한다. 부재 주장을 뒤집을 때 반대 방향으로 과잉 주장하지 않는다.
- repeated_failure_prevented: 없음 — **오히려 반복했다.** Codex가 T02에서 지적한 동일 오류(단일 신호로 배포 경로 단정)를 재발시켰고, 정정 초안에서 반대 방향으로 또 했다. 이 사례를 memory candidate로 승격해 다음 Task 컨텍스트에 주입한다.
